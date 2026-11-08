import assert from "node:assert/strict";

/** Adversarial payment checks against the actual migration, not a payment mock. */
export async function verifyCoursePaymentBoundaries(db) {
  const id = (n) => `99999999-0000-4000-8000-${String(n).padStart(12, "0")}`;
  let checks = 0;
  const equal = (actual, expected) => {
    assert.deepEqual(actual, expected);
    checks++;
  };
  const fails = async (fn, expected) => {
    await assert.rejects(fn, expected);
    checks++;
  };
  const rpc = async (name, who, action, target = null, data = {}) => {
    const result = await db.query(`select public.${name}($1,$2,$3,$4,$5) as result`, [
      id(who), id(who + 100), action, target, data,
    ]);
    return result.rows[0].result;
  };
  const instructor = (who, action, target, data) => rpc("courses_instructor", who, action, target, data);
  const participant = (who, action, target, data) => rpc("courses_participant", who, action, target, data);
  const future = new Date(Date.now() + 90 * 86400000);
  const courseData = (patch = {}) => ({
    title: "Payment boundary verification", description: "A private test fixture",
    location: "Test arena", sport: "agility", level: "Klass 1", max_teams: 1,
    price_sek: 750, payment_instructions: "Betala direkt till instruktören. Referens: kurs och namn.",
    sessions: [{ starts_at: future.toISOString(), ends_at: new Date(future.getTime() + 3600000).toISOString() }],
    ...patch,
  });
  const dog = (name) => ({
    id: `dp_${name}`, name, sport: "agility", size: "M", agilityLevel: "Klass 1", hoopersLevel: "Startklass",
  });
  const registrationData = (course, name, patch = {}) => ({ course_id: course, dog: dog(name), consent: true, ...patch });
  await db.exec("reset role");
  await db.query("insert into public.planner_profiles(id,edit_token,name,email) values ($1,$2,$3,$4),($5,$6,$7,$8),($9,$10,$11,$12),($13,$14,$15,$16)", [
    id(1), id(101), "Payment instructor", "owner@payment.test",
    id(2), id(102), "Another instructor", "other@payment.test",
    id(3), id(103), "First participant", "first@payment.test",
    id(4), id(104), "Waiting participant", "waiting@payment.test",
  ]);
  await db.exec("set role anon");

  // The server derives manual mode and ownership. Client input cannot activate Stripe.
  let course = await instructor(1, "save", id(1000), courseData({ payment_mode: "stripe", profile_id: id(2) }));
  equal(course.payment_mode, "manual");
  equal(course.profile_id, id(1));
  course = await instructor(1, "publish", course.id, { revision: course.revision });
  let missingInstructions = await instructor(1, "save", id(1001), courseData({ payment_instructions: "" }));
  await fails(() => instructor(1, "publish", missingInstructions.id, { revision: missingInstructions.revision }), /betalningsinstruktioner/);
  await fails(() => instructor(1, "save", id(1002), courseData({ price_sek: -1 })), /pris/);
  await fails(() => instructor(1, "save", id(1002), courseData({ price_sek: 100001 })), /pris/);

  // Neither a participant's fake paid status nor a substituted contact/amount is trusted.
  let first = await participant(3, "register", id(2000), registrationData(course.id, "Fido", {
    price_sek: 0, payment_status: "paid", payment_instructions: "attacker", profile_id: id(1),
    participant_email: "attacker@payment.test", payment_recorded_by: id(2),
  }));
  equal(first.status, "confirmed");
  equal(first.price_sek, 750);
  equal(first.payment_status, "unpaid");
  equal(first.payment_instructions, course.payment_instructions);
  equal(first.participant_email, "first@payment.test");
  equal(first.profile_id, id(3));
  equal(first.payment_recorded_by, null);
  let waiting = await participant(4, "register", id(2001), registrationData(course.id, "Luna"));
  equal(waiting.status, "waitlisted");
  await fails(() => instructor(1, "set_payment", waiting.id, { course_id: course.id, revision: waiting.revision, payment_status: "paid" }), /bekräftad/);
  await fails(() => instructor(2, "set_payment", first.id, { course_id: course.id, revision: first.revision, payment_status: "paid" }), /behörighet/);
  await fails(() => participant(3, "set_payment", first.id, { course_id: course.id, revision: first.revision, payment_status: "paid" }), /Okänd/);
  await fails(() => instructor(1, "set_payment", first.id, { course_id: course.id, revision: first.revision + 1, payment_status: "paid" }), /ändrats/);
  await fails(() => instructor(1, "set_payment", first.id, { course_id: course.id, revision: first.revision, payment_status: "refunded", refund_confirmed: true }), /återbetalning|Återbetalning|bekräftad/);

  // The instructor's real action is attributed server-side, with stale writes rejected.
  first = await instructor(1, "set_payment", first.id, { course_id: course.id, revision: first.revision, payment_status: "paid", payment_recorded_by: id(2) });
  equal(first.payment_status, "paid");
  equal(first.payment_recorded_by, id(1));
  assert.ok(Number.isFinite(Date.parse(first.payment_recorded_at)));
  checks++;
  await fails(() => instructor(1, "set_payment", first.id, { course_id: course.id, revision: first.revision - 1, payment_status: "unpaid" }), /ändrats/);
  await fails(() => instructor(1, "save", course.id, courseData({ revision: course.revision, price_sek: 1 })), /låsta/);
  await fails(() => instructor(1, "save", course.id, courseData({ revision: course.revision, payment_instructions: "Different recipient" })), /låsta/);

  // Cancellation keeps the paid evidence and flags the external refund; no synthetic refund.
  first = await participant(3, "cancel", first.id, { course_id: course.id, revision: first.revision });
  equal(first.status, "cancelled");
  equal(first.payment_status, "paid");
  equal(first.refund_due, true);
  await fails(() => instructor(1, "set_payment", first.id, { course_id: course.id, revision: first.revision, payment_status: "paid" }), /bekräftad/);
  await fails(() => participant(3, "erase", first.id, { course_id: course.id, revision: first.revision }), /återbetalning/);
  await fails(() => instructor(1, "set_payment", first.id, { course_id: course.id, revision: first.revision, payment_status: "refunded" }), /återbetalning|Återbetalning|bekräfta|Bekräfta/);
  await fails(() => instructor(2, "set_payment", first.id, { course_id: course.id, revision: first.revision, payment_status: "refunded", refund_confirmed: true }), /behörighet/);
  first = await instructor(1, "set_payment", first.id, { course_id: course.id, revision: first.revision, payment_status: "refunded", refund_confirmed: true, payment_recorded_by: id(2) });
  equal(first.payment_status, "refunded");
  equal(first.payment_recorded_by, id(1));
  equal(first.refund_due, false);
  const erased = await participant(3, "erase", first.id, { course_id: course.id, revision: first.revision });
  equal(erased.profile_id, null);
  equal(erased.participant_email, "");
  equal(erased.payment_status, "refunded");
  const ownWaiting = await participant(4, "list");
  waiting = ownWaiting.find((entry) => entry.id === waiting.id);
  equal(waiting.status, "confirmed");
  equal(waiting.payment_status, "unpaid");
  equal(waiting.price_sek, 750);

  let free = await instructor(1, "save", id(1003), courseData({ price_sek: 0, payment_instructions: "" }));
  equal(free.payment_mode, "free");
  free = await instructor(1, "publish", free.id, { revision: free.revision });
  const freeRegistration = await participant(3, "register", id(2002), registrationData(free.id, "Free Fido", { price_sek: 750, payment_status: "paid" }));
  equal(freeRegistration.price_sek, 0);
  equal(freeRegistration.payment_status, "not_required");
  await fails(() => instructor(1, "set_payment", freeRegistration.id, { course_id: free.id, revision: freeRegistration.revision, payment_status: "paid" }), /bekräftad/);

  // Cancelling the whole course preserves the payment record, including its attribution.
  waiting = await instructor(1, "set_payment", waiting.id, { course_id: course.id, revision: waiting.revision, payment_status: "paid" });
  await instructor(1, "cancel", course.id, { revision: course.revision });
  const cancelled = await participant(4, "list");
  const cancelledRegistration = cancelled.find((entry) => entry.id === waiting.id);
  equal(cancelledRegistration.status, "cancelled");
  equal(cancelledRegistration.payment_status, "paid");
  equal(cancelledRegistration.payment_recorded_by, id(1));
  equal(cancelledRegistration.refund_due, true);
  return checks;
}
