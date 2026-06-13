import { GlobalRole } from "@prisma/client";
import { HomeScenarios, type PartnerPreview } from "@/components/home-scenarios";
import { getCurrentUser } from "@/lib/auth";
import { getActivePartnerCompanies } from "@/lib/customer-app";
import { getDb } from "@/lib/db";

export default async function Home() {
  const [currentUser, companies] = await Promise.all([
    getCurrentUser(),
    getActivePartnerCompanies(),
  ]);

  const companyUser = currentUser?.globalRole === GlobalRole.SUPERADMIN
    ? null
    : currentUser
      ? await getDb().companyUser.findFirst({
          where: { userId: currentUser.id, isActive: true },
          select: { id: true },
        })
      : null;

  const businessHref = currentUser
    ? currentUser.globalRole === GlobalRole.SUPERADMIN
      ? "/superadmin"
      : companyUser
        ? "/company"
        : "/company/register"
    : "/company/register";

  const businessLoginHref = currentUser
    ? currentUser.globalRole === GlobalRole.SUPERADMIN
      ? "/superadmin"
      : companyUser
        ? "/company"
        : "/company/login"
    : "/company/login";

  const clientHref = currentUser ? "/app" : "/client/register";
  const clientLoginHref = currentUser ? "/app" : "/client/login";
  const superadminHref = currentUser?.globalRole === GlobalRole.SUPERADMIN ? "/superadmin" : null;

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
