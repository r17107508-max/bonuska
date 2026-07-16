import Link from "next/link";
import { CompanyStatus } from "@prisma/client";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink, Globe2, MapPinned, Phone, Star } from "lucide-react";
import { submitCompanyReview } from "@/app/actions";
import { SubmitButton } from "@/components/buttons";
import { TextAreaField } from "@/components/form-field";
import { requireUser } from "@/lib/auth";
import { enforceCompanyRatingStatus, getCompanyRatingSummary } from "@/lib/company-reviews";
import { getDb } from "@/lib/db";

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
      select: { id: true },
    }),
    getDb().companyReview.findUnique({
      where: { companyId_userId: { companyId: company.id, userId: user.id } },
      select: { rating: true, text: true },
    }),
  ]);

  const address = [company.city, company.address].filter(Boolean).join(", ");
  const routeHref = address ? `https://yandex.ru/maps/?text=${encodeURIComponent(address)}` : "";
  const phoneHref = company.ownerPhone ? `tel:${company.ownerPhone.replace(/[^\d+]/g, "")}` : "";
  const website = company.website?.trim();
  const isUnavailable = company.isBlocked || company.status === CompanyStatus.BLOCKED;

  return (
    <main className="min-h-screen bg-[var(--background)] px-4 pb-28 pt-4">
      <section className="mx-auto max-w-md space-y-4">
        <Link href="/app/partners" className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--text-muted)]">
          <ArrowLeft aria-hidden className="size-4" />
          Назад к карте
        </Link>

        <header className="warm-card overflow-hidden">
          {company.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={company.logoUrl} alt="" className="h-48 w-full object-cover" />
          ) : (
            <div className="flex h-40 items-center justify-center text-6xl" style={{ backgroundColor: company.loyaltyProgram.themeColor }}>
              {company.loyaltyProgram.icon}
            </div>
          )}
          <div className="p-4">
            <p className="text-xs font-semibold uppercase text-[var(--brand)]">{company.businessType}</p>
            <h1 className="mt-1 text-2xl font-semibold text-[var(--text)]">{company.name}</h1>
            <p className="mt-2 text-sm leading-5 text-[var(--text-muted)]">{company.description || company.loyaltyProgram.rewardDescription}</p>
            <div className="mt-3 flex items-center gap-2 text-sm font-bold text-[var(--brand)]">
              <Star aria-hidden className="size-4 fill-current" />
              {summary.reviewCount > 0 ? `${summary.ratingAverage?.toFixed(1)} из 5 · ${summary.reviewCount} отзывов` : "Пока нет отзывов"}
            </div>
          </div>
        </header>

        {isUnavailable && (
          <div className="rounded-lg bg-red-50 p-3 text-sm font-semibold text-red-800">
            Компания временно заблокирована. Для восстановления ей нужно связаться с администрацией ПроПлюшка.
          </div>
        )}
        {query.success === "review" && <p className="rounded-lg bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">Отзыв сохранён.</p>}
        {query.error && <p className="rounded-lg bg-red-50 p-3 text-sm font-semibold text-red-800">{query.error}</p>}

        <section className="panel p-4">
          <h2 className="text-lg font-semibold text-slate-950">Информация о точке</h2>
          <div className="mt-3 space-y-2 text-sm text-slate-700">
            {address && (
              <p className="flex gap-2">
                <MapPinned aria-hidden className="mt-0.5 size-4 shrink-0 text-[var(--brand)]" />
                <span>{address}</span>
              </p>
            )}
            {company.ownerPhone && (
              <p className="flex gap-2">
                <Phone aria-hidden className="mt-0.5 size-4 shrink-0 text-[var(--brand)]" />
                <span>{company.ownerPhone}</span>
              </p>
            )}
            {website && (
              <p className="flex gap-2">
                <Globe2 aria-hidden className="mt-0.5 size-4 shrink-0 text-[var(--brand)]" />
                <span className="break-all">{website.replace(/^https?:\/\//i, "")}</span>
              </p>
            )}
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            {phoneHref && (
              <a href={phoneHref} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-[var(--brand)] px-3 text-sm font-semibold text-white">
                <Phone aria-hidden className="size-4" />
                Позвонить
              </a>
            )}
            {website && (
              <a href={website} target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700">
                <Globe2 aria-hidden className="size-4" />
                Сайт
              </a>
            )}
            {routeHref && (
              <a href={routeHref} target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700">
                <MapPinned aria-hidden className="size-4" />
                Маршрут
              </a>
            )}
            <Link href={`/c/${company.slug}`} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700">
              <ExternalLink aria-hidden className="size-4" />
              Бонусная карта
            </Link>
          </div>
        </section>

        <section className="panel p-4">
          <h2 className="text-lg font-semibold text-slate-950">Оценка и отзыв</h2>
          {membership ? (
            <form action={submitCompanyReview} className="mt-3 space-y-3">
              <input type="hidden" name="slug" value={company.slug} />
              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-normal text-slate-600">Оценка</span>
                <select
                  name="rating"
                  defaultValue={myReview?.rating ?? 5}
                  className="mt-1.5 min-h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-950 outline-none transition focus:border-[var(--brand)] focus:ring-4 focus:ring-[rgba(255,106,61,0.15)]"
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
            <p className="mt-2 text-sm leading-5 text-slate-600">Оставить отзыв могут клиенты, подключённые к этой точке.</p>
          )}
        </section>

        <section className="space-y-2.5">
          <h2 className="text-lg font-semibold text-[var(--text)]">Отзывы клиентов</h2>
          {company.reviews.map((review) => (
            <article key={review.id} className="warm-card p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="font-semibold text-[var(--text)]">{review.user.name}</p>
                <p className="flex items-center gap-1 text-sm font-bold text-[var(--brand)]">
                  <Star aria-hidden className="size-4 fill-current" />
                  {review.rating}
                </p>
              </div>
              {review.text && <p className="mt-2 text-sm leading-5 text-[var(--text-muted)]">{review.text}</p>}
            </article>
          ))}
          {company.reviews.length === 0 && (
            <div className="warm-card p-4 text-sm leading-5 text-[var(--text-muted)]">Отзывов пока нет.</div>
          )}
        </section>
      </section>
    </main>
  );
}
