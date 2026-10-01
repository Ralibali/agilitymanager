import { describe, expect, it, vi } from "vitest";
import { createAccountDeletionHandler, type AccountDeletionBackend } from "./handler";

const USER = "00000000-0000-4000-8000-000000000001";
const SESSION = "00000000-0000-4000-8000-000000000002";
const OTHER = "00000000-0000-4000-8000-000000000003";
const jwt = (sub = USER, sessionId = SESSION) => `header.${btoa(JSON.stringify({ sub, session_id: sessionId }))}.signature`;
const backend = (): AccountDeletionBackend => ({
  getUser: vi.fn(async () => ({ id: USER })),
  preflight: vi.fn(async () => "ready"),
  revokeSessions: vi.fn(async () => true),
  deleteUser: vi.fn(async () => true),
  userIsDeleted: vi.fn(async () => true),
});
const request = (body: unknown = { confirmation: "RADERA" }, token: string | null = jwt()) => new Request("https://test.invalid", {
  method: "POST",
  headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  body: JSON.stringify(body),
});

describe("server-side account deletion", () => {
  it("deletes only the verified user after active-session and schema checks", async () => {
    const api = backend();
    const result = await createAccountDeletionHandler(api)(request());
    expect(result.status).toBe(200);
    expect(await result.json()).toEqual({ deleted: true });
    expect(api.preflight).toHaveBeenCalledWith(USER, SESSION);
    expect(api.deleteUser).toHaveBeenCalledWith(USER);
    const order = [api.getUser, api.preflight, api.revokeSessions, api.deleteUser, api.userIsDeleted]
      .map(fn => vi.mocked(fn).mock.invocationCallOrder[0]);
    expect(order).toEqual([...order].sort((a, b) => a - b));
  });
  it("does not authorize a user ID supplied by the client", async () => {
    const api = backend();
    const result = await createAccountDeletionHandler(api)(request({ confirmation: "RADERA", userId: OTHER }));
    expect(result.status).toBe(400);
    expect(api.deleteUser).not.toHaveBeenCalled();
  });
  it("rejects a token whose claims do not match the Auth-verified user", async () => {
    const api = backend();
    expect((await createAccountDeletionHandler(api)(request(undefined, jwt(OTHER)))).status).toBe(401);
    expect(api.preflight).not.toHaveBeenCalled();
  });
  it.each([null, "invalid.jwt", jwt(USER, "no-session")])("rejects an absent or malformed credential", async token => {
    const api = backend();
    expect((await createAccountDeletionHandler(api)(request(undefined, token))).status).toBe(401);
    expect(api.deleteUser).not.toHaveBeenCalled();
  });
  it("does not trust a valid JWT after its session has been removed", async () => {
    const api = backend();
    api.preflight = vi.fn(async () => "inactive_session");
    expect((await createAccountDeletionHandler(api)(request())).status).toBe(401);
    expect(api.revokeSessions).not.toHaveBeenCalled();
    expect(api.deleteUser).not.toHaveBeenCalled();
  });
  it("fails closed if schema or storage cleanup is not ready", async () => {
    const api = backend();
    api.preflight = vi.fn(async () => "not_ready");
    const response = await createAccountDeletionHandler(api)(request());
    expect(response.status).toBe(503);
    expect(api.revokeSessions).not.toHaveBeenCalled();
    expect(api.deleteUser).not.toHaveBeenCalled();
  });
  it("never deletes data if refresh-token revocation failed", async () => {
    const api = backend();
    api.revokeSessions = vi.fn(async () => false);
    expect((await createAccountDeletionHandler(api)(request())).status).toBe(503);
    expect(api.deleteUser).not.toHaveBeenCalled();
  });
  it("does not announce deletion when the backend cannot confirm it", async () => {
    const api = backend();
    api.userIsDeleted = vi.fn(async () => false);
    const result = await createAccountDeletionHandler(api)(request());
    expect(result.status).toBe(503);
    expect(await result.json()).toEqual({ error: "deletion_unconfirmed" });
  });
  it("caps streamed request bodies before authenticating", async () => {
    const api = backend();
    const result = await createAccountDeletionHandler(api)(request({ confirmation: "RADERA", padding: "x".repeat(1100) }));
    expect(result.status).toBe(413);
    expect(api.getUser).not.toHaveBeenCalled();
  });
  it("rejects unconfirmed, malformed JSON and unsupported methods", async () => {
    const api = backend();
    expect((await createAccountDeletionHandler(api)(request({ confirmation: "radera" }))).status).toBe(400);
    expect((await createAccountDeletionHandler(api)(new Request("https://test.invalid", { method: "GET" }))).status).toBe(405);
    expect((await createAccountDeletionHandler(api)(new Request("https://test.invalid", {
      method: "POST", headers: { Authorization: `Bearer ${jwt()}`, "Content-Type": "application/json" }, body: "broken",
    }))).status).toBe(400);
    expect(api.deleteUser).not.toHaveBeenCalled();
  });
  it("does not leak database or credential error details", async () => {
    const api = backend();
    api.preflight = vi.fn(async () => { throw new Error("secret credential"); });
    const result = await createAccountDeletionHandler(api)(request());
    expect(await result.json()).toEqual({ error: "deletion_unavailable" });
  });
});
