import partnerData from "../content/affiliate-partners.json";

export interface AffiliatePartner {
  id: string;
  name: string;
  channelId: string;
  programId: string;
  status: "approved" | "pending";
  verifiedAt: string;
  destination: string;
  bannerUrl: string;
  insuranceUrl?: string;
  description: string;
}

export const AGILITY_CHANNEL_ID = "2103592373";

/** Only links obtained for this site's approved channel may become ads. */
export function approvedPartners(partners: readonly AffiliatePartner[]): AffiliatePartner[] {
  return partners.filter((partner) => {
    if (partner.status !== "approved" || partner.channelId !== AGILITY_CHANNEL_ID || !partner.verifiedAt) return false;
    try {
      return [partner.bannerUrl, ...(partner.insuranceUrl ? [partner.insuranceUrl] : [])].every((value) => {
        const url = new URL(value);
        return url.protocol === "https:" && url.searchParams.get("as") === AGILITY_CHANNEL_ID;
      });
    } catch {
      return false;
    }
  });
}

export const AFFILIATE_PARTNERS = approvedPartners(partnerData as AffiliatePartner[]);

export function insuranceAffiliate(id: string) {
  return AFFILIATE_PARTNERS.find((partner) => partner.id === id && partner.insuranceUrl);
}
