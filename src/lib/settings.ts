import { getDb } from "@/lib/db";
import serviceDocuments from "@/lib/service-documents.json";

const defaultOfferText = serviceDocuments.offerText;
const defaultPrivacyText = serviceDocuments.privacyText;

export async function getSettings() {
  const db = getDb();
  const existing = await db.serviceSettings.findUnique({ where: { id: "default" } });

  if (existing) {
    return existing;
  }

  return db.serviceSettings.create({
    data: {
      id: "default",
      subscriptionPrice: 499,
      trialDays: 14,
      offerVersion: serviceDocuments.offerVersion,
      offerText: defaultOfferText,
      privacyVersion: serviceDocuments.privacyVersion,
      privacyText: defaultPrivacyText,
      paymentRequisites: serviceDocuments.paymentRequisites,
      supportEmail: "rf173@bk.ru",
    },
  });
}
