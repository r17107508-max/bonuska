import { HomeScenarios, type PartnerPreview } from "@/components/home-scenarios";
import { getCurrentUser, getUserHomePath } from "@/lib/auth";
import { getActivePartnerCompanies } from "@/lib/customer-app";
import { redirect } from "next/navigation";

export default async function Home() {
  const [currentUser, companies] = await Promise.all([
    getCurrentUser(),
    getActivePartnerCompanies(null, 12),
  ]);

  if (currentUser) {
    redirect(await getUserHomePath(currentUser));
  }

  const businessHref = "/company/register";
  const businessLoginHref = "/company/login";
  const clientHref = "/client/register";
  const clientLoginHref = "/client/login";
  const superadminHref = null;

  const partners: PartnerPreview[] = companies.map((company) => ({
    id: company.id,
    name: company.name,
    type: company.businessType,
    address: [company.city, company.address].filter(Boolean).join(", "),
    promo: company.loyaltyProgram?.rewardDescription || `${company.loyaltyProgram?.goalCount ?? 6} покупок - подарок`,
    href: `/c/${company.slug}`,
    icon: company.loyaltyProgram?.icon ?? company.icon,
  }));

  return (
    <HomeScenarios
      businessHref={businessHref}
      businessLoginHref={businessLoginHref}
      clientHref={clientHref}
      clientLoginHref={clientLoginHref}
      superadminHref={superadminHref}
      partners={partners}
    />
  );
}
