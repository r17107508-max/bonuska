import nodemailer from "nodemailer";
import { GlobalRole, type Company } from "@prisma/client";
import { getDb } from "@/lib/db";
import { getSettings } from "@/lib/settings";

type MailPayload = {
  to: string[];
  subject: string;
  text: string;
};

function uniqueEmails(emails: Array<string | null | undefined>) {
  return Array.from(new Set(emails.map((email) => email?.trim()).filter((email): email is string => Boolean(email))));
}

async function sendMail({ to, subject, text }: MailPayload) {
  if (to.length === 0) {
    console.log(`[notification stub] ${subject}\n${text}`);
    return;
  }

  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    console.log(`[email stub] SMTP не настроен. Получатели: ${to.join(", ")}. Тема: ${subject}\n${text}`);
    return;
  }

  const port = Number(process.env.SMTP_PORT ?? 587);
  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: process.env.SMTP_SECURE === "true" || port === 465,
    auth: { user, pass },
  });

  await transporter.sendMail({
    from: process.env.SMTP_FROM ?? user,
    to,
    subject,
    text,
  });
}

export async function notifySuperadminsAboutCompanyApplication(company: Pick<Company, "name" | "city" | "ownerName" | "ownerPhone" | "ownerEmail" | "createdAt">) {
  const db = getDb();
  const [settings, admins] = await Promise.all([
    getSettings(),
    db.user.findMany({
      where: { globalRole: GlobalRole.SUPERADMIN },
      select: { email: true },
    }),
  ]);

  await sendMail({
    to: uniqueEmails([settings.supportEmail, ...admins.map((admin) => admin.email)]),
    subject: `Новая заявка компании в ПроПлюшке: ${company.name}`,
    text: [
      `В ПроПлюшке зарегистрировалась новая компания и ждет подтверждения.`,
      ``,
      `Компания: ${company.name}`,
      `Город: ${company.city || "не указан"}`,
      `Представитель: ${company.ownerName}`,
      `Телефон: ${company.ownerPhone}`,
      `Email: ${company.ownerEmail}`,
      `Дата заявки: ${company.createdAt.toLocaleString("ru-RU")}`,
      ``,
      `Откройте суперадминку: /superadmin/companies`,
    ].join("\n"),
  });
}

export async function notifyCompanyApproved(company: Pick<Company, "name" | "ownerEmail" | "trialEndsAt">) {
  const trialText = company.trialEndsAt ? company.trialEndsAt.toLocaleDateString("ru-RU") : "14 дней с момента подтверждения";

  await sendMail({
    to: uniqueEmails([company.ownerEmail]),
    subject: `Компания ${company.name} одобрена в ПроПлюшке`,
    text: [
      `Ваша компания «${company.name}» одобрена в сервисе ПроПлюшка.`,
      ``,
      `Пробный период активен до: ${trialText}.`,
      `Теперь можно войти в кабинет компании, настроить программу лояльности и распечатать QR для регистрации клиентов.`,
      ``,
      `Вход: /company/login`,
    ].join("\n"),
  });
}
