import { describe, expect, it } from "vitest";
import { COURSE_BANK } from "./courseBank";
import {
  LEGACY_COURSE_ALIASES,
  PUBLIC_COURSE_CATALOG,
  getPublicCourseMeta,
  resolvePublicCourseId,
} from "./publicCourseCatalog.mjs";

describe("publik V2-bank", () => {
  it("har exakt samma 25 id:n i SEO-katalogen som i den riktiga V2-banken", () => {
    const bankIds = COURSE_BANK.map((course) => course.key).sort();
    const publicIds = PUBLIC_COURSE_CATALOG.map((course) => course.id).sort();

    expect(publicIds).toHaveLength(25);
    expect(publicIds).toEqual(bankIds);
  });

  it("har 24 svenska agilitykartor och en Hoopers-karta", () => {
    expect(PUBLIC_COURSE_CATALOG.filter((course) => !course.isHoopers)).toHaveLength(24);
    expect(PUBLIC_COURSE_CATALOG.filter((course) => course.isHoopers)).toHaveLength(1);
    expect(PUBLIC_COURSE_CATALOG.filter((course) => course.isNollklass)).toHaveLength(12);
  });

  it("alla gamla åtta bansidor löser till en befintlig V2-karta", () => {
    expect(Object.keys(LEGACY_COURSE_ALIASES)).toHaveLength(8);
    for (const [legacyId, targetId] of Object.entries(LEGACY_COURSE_ALIASES)) {
      expect(resolvePublicCourseId(legacyId)).toBe(targetId);
      expect(COURSE_BANK.some((course) => course.key === targetId)).toBe(true);
      expect(getPublicCourseMeta(legacyId)?.id).toBe(targetId);
    }
  });

  it("spegelvarianter pekar på sitt original", () => {
    const mirrors = PUBLIC_COURSE_CATALOG.filter((course) => course.isMirror);
    expect(mirrors).toHaveLength(12);
    for (const mirror of mirrors) {
      expect(mirror.sourceId).toBeTruthy();
      expect(PUBLIC_COURSE_CATALOG.some((course) => course.id === mirror.sourceId && !course.isMirror)).toBe(true);
    }
  });
});
