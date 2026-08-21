import { getDb } from "@/lib/db";
import serviceDocuments from "@/lib/service-documents.json";

const defaultOfferText = serviceDocuments.offerText;
const defaultPrivacyText = serviceDocuments.privacyText;
const defaultSubscriptionPrice = 4990;
const defaultTrialDays = 14;

function hasOutdatedCommercialTerms(offerText: string) {
  return (
    offerText.includes("499 рублей") ||
    offerText.includes("499 руб") ||
    offerText.includes("499 ₽") ||
    offerText.includes("3 месяца") ||
    offerText.includes("3 мес") ||
    offerText.includes("три месяца")
  );
}

export async function getSettings() {
  const db = getDb();
  const existing = await db.serviceSettings.findUnique({ where: { id: "default" } });

  if (existing) {
    const shouldRefreshOffer = hasOutdatedCommercialTerms(existing.offerText);
    const shouldRefreshTerms =
      existing.subscriptionPrice !== defaultSubscriptionPrice ||
      existing.trialDays !== defaultTrialDays ||
      shouldRefreshOffer;

    if (shouldRefreshTerms) {
      return db.serviceSettings.update({
        where: { id: "default" },
        data: {
          subscriptionPrice: defaultSubscriptionPrice,
          trialDays: defaultTrialDays,
          ...(shouldRefreshOffer
            ? {
                offerVersion: serviceDocuments.offerVersion,
                offerText: defaultOfferText,
              }
            : {}),
        },
      });
    }

    return existing;
  }

  return db.serviceSettings.create({
    data: {
      id: "default",
      subscriptionPrice: defaultSubscriptionPrice,
      trialDays: defaultTrialDays,
      offerVersion: serviceDocuments.offerVersion,
      offerText: defaultOfferText,
      privacyVersion: serviceDocuments.privacyVersion,
      privacyText: defaultPrivacyText,
      paymentRequisites: serviceDocuments.paymentRequisites,
      supportEmail: "rf173@bk.ru",
    },
  });
}
