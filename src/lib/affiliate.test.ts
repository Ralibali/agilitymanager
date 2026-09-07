import { describe, expect, it } from "vitest";
import { approvedPartners, AGILITY_CHANNEL_ID, type AffiliatePartner } from "./affiliate";

const partner: AffiliatePartner = {
  id: "test", name: "Test", channelId: AGILITY_CHANNEL_ID, programId: "test",
  status: "approved", verifiedAt: "2026-09-07", destination: "https://example.com",
  bannerUrl: `https://example.com/t/t?a=123&as=${AGILITY_CHANNEL_ID}&t=2&tk=1`, description: "Test",
};

describe("site-specific affiliate approval", () => {
  it("never advertises a pending application or another site's approval", () => {
    expect(approvedPartners([
      { ...partner, status: "pending" },
      { ...partner, channelId: "2056181186" },
      { ...partner, verifiedAt: "" },
      { ...partner, bannerUrl: "https://example.com/t/t?as=2056181186" },
    ])).toEqual([]);
  });
  it("rejects malformed and executable links", () => {
    expect(approvedPartners([
      { ...partner, bannerUrl: "javascript:alert(1)" },
      { ...partner, bannerUrl: "not a URL" },
      { ...partner, insuranceUrl: "javascript:alert(1)" },
    ])).toEqual([]);
  });
  it("preserves the verified link exactly", () => {
    expect(approvedPartners([partner])).toEqual([partner]);
  });
});
