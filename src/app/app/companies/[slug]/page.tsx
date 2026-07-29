import Link from "next/link";
import { CompanyStatus } from "@prisma/client";
import { notFound } from "next/navigation";
import { ArrowLeft, Globe2, MapPinned, Phone, QrCode, Star } from "lucide-react";
import { submitCompanyReview } from "@/app/actions";
import { SubmitButton } from "@/components/buttons";
import { ClientCard, ClientShell, LogoBox, ProgressBar, QuickQrButton, RouteButton, pluralPurchasesLeft } from "@/components/client-ui";
import { TextAreaField } from "@/components/form-field";
import { requireUser } from "@/lib/auth";
import { enforceCompanyRatingStatus, getCompanyRatingSummary } from "@/lib/company-reviews";
import { rewardGoal, rewardLeft } from "@/lib/customer-app";
import { getDb } from "@/lib/db";
import { formatDateTime } from "@/lib/format";

export default async function ClientCompanyPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ success?: string; error?: string }>;
}) {
  const [{ slug }, query, user] = await Promise.all([params, searchParams, requireUser("/client/login")]);
  const company = await getDb().company.findUnique({
    where: { slug },
    include: {
      loyaltyProgram: true,
      reviews: {
        include: { user: { select: { name: true } } },
        orderBy: { updatedAt: "desc" },
        take: 8,
      },
    },
  });

  if (!company || company.status === CompanyStatus.DELETED || !company.loyaltyProgram) {
    notFound();
  }

  await enforceCompanyRatingStatus(company.id);
  const [summary, membership, myReview] = await Promise.all([
    getCompanyRatingSummary(company.id),
    getDb().customerMembership.findFirst({
      where: { companyId: company.id, userId: user.id },
      include: {
        company: { include: { loyaltyProgram: true } },
        transactions: { orderBy: { createdAt: "desc" }, take: 5 },
      },
    }),
    getDb().companyReview.findUnique({
      where: { companyId_userId: { companyId: company.id, userId: user.id } },
      select: { rating: true, text: true },
    }),
  ]);

  const address = [company.city, company.address].filter(Boolean).join(", ");
  const phoneHref = company.ownerPhone ? `tel:${company.ownerPhone.replace(/[^\d+]/g, "")}` : "";
  const website = company.website?.trim();
  const isUnavailable = company.isBlocked || company.status === CompanyStatus.BLOCKED;
  const goal = membership ? rewardGoal(membership) : company.loyaltyProgram.goalCount;
  const left = membership ? rewardLeft(membership) : goal;
  const progress = membership ? (membership.rewardAvailable ? 100 : Math.round((membership.currentCount / Math.max(goal, 1)) * 100)) : 0;

  return (
    <ClientShell>
      <Link href="/app/partners" className="inline-flex min-h-11 items-center gap-2 rounded-2xl border border-[var(--border)] bg-white px-3 text-sm font-extrabold text-[var(--text)]">
        <ArrowLeft aria-hidden className="size-4" />
        Назад к карте
      </Link>

      <ClientCard className="overflow-hidden p-0">
        <div className="p-5" style={{ borderTop: `8px solid ${company.loyaltyProgram.themeColor}` }}>
          <div className="flex items-start gap-3">
            <LogoBox logoUrl={company.logoUrl} fallback={company.loyaltyProgram.icon || company.icon} name={company.name} color={company.loyaltyProgram.themeColor} className="size-14" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-[var(--text-muted)]">{company.businessType}</p>
              <h1 className="mt-1 text-3xl font-extrabold leading-tight text-[var(--text)]">{company.name}</h1>
              <p className="mt-2 text-sm leading-5 text-[var(--text-muted)]">{company.description || company.loyaltyProgram.rewardDescription}</p>
              {summary.reviewCount > 0 && (
                <p className="mt-3 inline-flex items-center gap-1 text-sm font-bold text-[#7a4b00]">
                  <Star aria-hidden className="size-4 fill-current" />
                  {summary.ratingAverage?.toFixed(1)} из 5 · {summary.reviewCount} отзывов
                </p>
              )}
            </div>
          </div>
        </div>
      </ClientCard>

      {isUnavailable && (
        <div className="rounded-2xl bg-red-50 p-3 text-sm font-semibold text-[var(--danger)]">
          Компания временно заблокирована. Сейчас здесь нельзя начислять покупки и получать подарки.
        </div>
      )}
      {query.success === "review" && <p className="rounded-2xl bg-emerald-50 p-3 text-sm font-semibold text-[var(--success)]">Отзыв сохранён.</p>}
      {query.error && <p className="rounded-2xl bg-red-50 p-3 text-sm font-semibold text-[var(--danger)]">{query.error}</p>}

      <ClientCard>
        <h2 className="text-xl font-extrabold text-[var(--text)]">Контакты</h2>
        <div className="mt-3 space-y-2 text-sm text-[var(--text-muted)]">
          {address && (
            <p className="flex gap-2">
              <MapPinned aria-hidden className="mt-0.5 size-4 shrink-0 text-[var(--brand-strong)]" />
              <span>{address}</span>
            </p>
          )}
          {company.ownerPhone && (
            <p className="flex gap-2">
              <Phone aria-hidden className="mt-0.5 size-4 shrink-0 text-[var(--brand-strong)]" />
              <span>{company.ownerPhone}</span>
            </p>
          )}
          {website && (
            <p className="flex gap-2">
              <Globe2 aria-hidden className="mt-0.5 size-4 shrink-0 text-[var(--brand-strong)]" />
              <span className="break-all">{website.replace(/^https?:\/\//i, "")}</span>
            </p>
          )}
        </div>
        <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
          {phoneHref && (
            <a href={phoneHref} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-[var(--brand-strong)] px-3 text-sm font-bold text-white">
              <Phone aria-hidden className="size-4" />
              Позвонить
            </a>
          )}
          {address && <RouteButton address={address} />}
          {website && (
            <a href={website} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-[var(--border)] bg-white px-3 text-sm font-bold text-[var(--text)]">
              <Globe2 aria-hidden className="size-4" />
              Сайт
            </a>
          )}
        </div>
      </ClientCard>

      <ClientCard>
        <h2 className="text-xl font-extrabold text-[var(--text)]">Награда</h2>
        <p className="mt-1 text-base font-bold text-[var(--text)]">{company.loyaltyProgram.rewardTitle}</p>
        <p className="mt-1 text-sm leading-5 text-[var(--text-muted)]">{company.loyaltyProgram.rewardDescription}</p>
        {membership ? (
          <>
            <div className="mt-4">
              <ProgressBar value={progress} tone={membership.rewardAvailable ? "warning" : "brand"} />
            </div>
            <p className="mt-2 text-sm font-bold text-[var(--text)]">
              {membership.rewardAvailable ? "Подарок доступен" : pluralPurchasesLeft(left)}
            </p>
            <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
              <QuickQrButton label="Показать мой QR" />
              <Link href={`/app/cards/${membership.id}`} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-[var(--border)] bg-white px-4 text-sm font-extrabold text-[var(--text)]">
                Открыть программу
              </Link>
            </div>
          </>
        ) : (
          <Link href={`/c/${company.slug}`} className="mt-4 inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-[var(--brand-strong)] px-4 text-sm font-extrabold text-white">
            <QrCode aria-hidden className="size-5" />
            Присоединиться к программе
          </Link>
        )}
      </ClientCard>

      {membership && (
        <ClientCard>
          <h2 className="text-xl font-extrabold text-[var(--text)]">Последние операции</h2>
          <div className="mt-3 space-y-2">
            {membership.transactions.map((transaction) => (
              <div key={transaction.id} className="rounded-2xl border border-[var(--border)] bg-white p-3">
                <div className="flex items-start justify-between gap-3">
                  <p className="font-bold text-[var(--text)]">{transaction.type === "PURCHASE" ? "Покупка начислена" : "Операция"}</p>
                  <time className="shrink-0 text-xs font-bold text-[var(--text-muted)]" dateTime={transaction.createdAt.toISOString()}>{formatDateTime(transaction.createdAt)}</time>
                </div>
                <p className="mt-1 text-sm text-[var(--text-muted)]">Прогресс: {transaction.countAfter} из {goal}</p>
              </div>
            ))}
            {membership.transactions.length === 0 && <p className="rounded-2xl border border-dashed border-[var(--border)] p-4 text-sm text-[var(--text-muted)]">Покупок у партнёра пока нет.</p>}
          </div>
        </ClientCard>
      )}

      <ClientCard>
        <h2 className="text-xl font-extrabold text-[var(--text)]">Оценка и отзыв</h2>
        {membership ? (
          <form action={submitCompanyReview} className="mt-3 space-y-3">
            <input type="hidden" name="slug" value={company.slug} />
            <label className="block">
              <span className="text-xs font-bold uppercase text-[var(--text-muted)]">Оценка</span>
              <select
                name="rating"
                defaultValue={myReview?.rating ?? 5}
                className="mt-1.5 min-h-11 w-full rounded-2xl border border-[var(--border)] bg-white px-3 text-sm font-semibold text-[var(--text)] outline-none transition focus:border-[var(--brand-strong)] focus:ring-4 focus:ring-[rgba(201,71,38,0.16)]"
              >
                <option value="5">5 звёзд</option>
                <option value="4">4 звезды</option>
                <option value="3">3 звезды</option>
                <option value="2">2 звезды</option>
                <option value="1">1 звезда</option>
              </select>
            </label>
            <TextAreaField label="Отзыв" name="text" defaultValue={myReview?.text} rows={3} placeholder="Что понравилось или что нужно улучшить" />
            <SubmitButton>{myReview ? "Обновить отзыв" : "Оставить отзыв"}</SubmitButton>
          </form>
        ) : (
          <p className="mt-2 text-sm leading-5 text-[var(--text-muted)]">Оставить отзыв можно после участия в программе партнёра.</p>
        )}
      </ClientCard>

      {company.reviews.length > 0 && (
        <section className="space-y-2.5">
          <h2 className="text-xl font-extrabold text-[var(--text)]">Отзывы клиентов</h2>
          {company.reviews.map((review) => (
            <article key={review.id} className="rounded-3xl border border-[var(--border)] bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <p className="font-bold text-[var(--text)]">{review.user.name}</p>
                <p className="flex items-center gap-1 text-sm font-bold text-[#7a4b00]">
                  <Star aria-hidden className="size-4 fill-current" />
                  {review.rating}
                </p>
              </div>
              {review.text && <p className="mt-2 text-sm leading-5 text-[var(--text-muted)]">{review.text}</p>}
            </article>
          ))}
        </section>
      )}
    </ClientShell>
  );
}
