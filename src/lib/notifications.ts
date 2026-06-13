import { resolve4 } from "node:dns/promises";
import nodemailer from "nodemailer";
import type SMTPTransport from "nodemailer/lib/smtp-transport";
import { GlobalRole, type Company } from "@prisma/client";
import { getDb } from "@/lib/db";
import { getSettings } from "@/lib/settings";

type MailPayload = {
  to: string[];
  subject: string;
  text: string;
};

type MailResult =
  | { status: "sent"; recipients: string[] }
  | { status: "skipped"; recipients: string[]; reason: string }
  | { status: "failed"; recipients: string[]; reason: string };

function uniqueEmails(emails: Array<string | null | undefined>) {
  return Array.from(new Set(emails.map((email) => email?.trim()).filter((email): email is string => Boolean(email))));
}

async function resolveSmtpHost(host: string) {
  try {
    const [ipv4] = await resolve4(host);
    return ipv4 ? { host: ipv4, servername: host } : { host, servername: undefined };
  } catch {
    return { host, servername: undefined };
  }
}

export function getMailConfigStatus() {
  const missing = ["SMTP_HOST", "SMTP_USER", "SMTP_PASS"].filter((key) => !process.env[key]);
  return {
    ready: missing.length === 0,
    missing,
    host: process.env.SMTP_HOST ?? null,
    port: process.env.SMTP_PORT ?? null,
    user: process.env.SMTP_USER ?? null,
    from: process.env.SMTP_FROM ?? process.env.SMTP_USER ?? null,
  };
}

async function sendMail({ to, subject, text }: MailPayload): Promise<MailResult> {
  if (to.length === 0) {
    console.log(`[notification skipped] ${subject}\n${text}`);
    return { status: "skipped", recipients: [], reason: "Нет получателей" };
  }

  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    const reason = `SMTP не настроен. Не хватает: ${getMailConfigStatus().missing.join(", ")}`;
    console.log(`[email skipped] ${reason}. Получатели: ${to.join(", ")}. Тема: ${subject}\n${text}`);
    return { status: "skipped", recipients: to, reason };
  }

  const port = Number(process.env.SMTP_PORT ?? 587);
  const resolvedHost = await resolveSmtpHost(host);
  const transportOptions: SMTPTransport.Options = {
    host: resolvedHost.host,
    port,
    secure: process.env.SMTP_SECURE === "true" || port === 465,
    connectionTimeout: 15_000,
    greetingTimeout: 15_000,
    socketTimeout: 30_000,
    tls: resolvedHost.servername ? { servername: resolvedHost.servername } : undefined,
    auth: { user, pass },
  };
  const transporter = nodemailer.createTransport(transportOptions);

  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM ?? user,
      to,
      subject,
      text,
    });
    return { status: "sent", recipients: to };
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Неизвестная ошибка SMTP";
    console.error(`[email failed] Получатели: ${to.join(", ")}. Тема: ${subject}. Ошибка: ${reason}`);
    return { status: "failed", recipients: to, reason };
  }
}

async function writeEmailAudit(companyId: string, action: string, result: MailResult) {
  await getDb().auditLog.create({
    data: {
      companyId,
      action,
      entityType: "EmailNotification",
      metadataJson: JSON.stringify(result),
    },
  });
}

export async function notifySuperadminsAboutCompanyApplication(
  company: Pick<Company, "id" | "name" | "city" | "ownerName" | "ownerPhone" | "ownerEmail" | "createdAt">,
  origin: string,
) {
  const db = getDb();
  const [settings, admins] = await Promise.all([
    getSettings(),
    db.user.findMany({
      where: { globalRole: GlobalRole.SUPERADMIN },
      select: { email: true },
    }),
  ]);

  const result = await sendMail({
    to: uniqueEmails([settings.supportEmail, ...admins.map((admin) => admin.email)]),
    subject: `Новая заявка компании в ПроПлюшке: ${company.name}`,
    text: [
      `В ПроПлюшке зарегистрировалась новая компания и ждёт подтверждения.`,
      ``,
      `Компания: ${company.name}`,
      `Город: ${company.city || "не указан"}`,
      `Представитель: ${company.ownerName}`,
      `Телефон: ${company.ownerPhone}`,
      `Email: ${company.ownerEmail}`,
      `Дата заявки: ${company.createdAt.toLocaleString("ru-RU")}`,
      ``,
      `Откройте заявку: ${origin}/superadmin/companies/${company.id}`,
    ].join("\n"),
  });

  await writeEmailAudit(company.id, `EMAIL_SUPERADMIN_APPLICATION_${result.status.toUpperCase()}`, result);
}

export async function notifyCompanyApplicationReceived(company: Pick<Company, "id" | "name" | "ownerEmail">, origin: string) {
  const result = await sendMail({
    to: uniqueEmails([company.ownerEmail]),
    subject: `Заявка компании ${company.name} получена в Проплюшках`,
    text: [
      `Спасибо за регистрацию компании «${company.name}» в Проплюшках.`,
      ``,
      `Заявка отправлена на проверку. После подтверждения мы пришлём письмо на этот email, и вы сможете войти в кабинет компании.`,
      ``,
      `Страница входа: ${origin}/company/login`,
    ].join("\n"),
  });

  await writeEmailAudit(company.id, `EMAIL_COMPANY_APPLICATION_RECEIVED_${result.status.toUpperCase()}`, result);
}

export async function notifyCompanyApproved(company: Pick<Company, "id" | "name" | "ownerEmail" | "trialEndsAt">, origin: string) {
  const trialText = company.trialEndsAt ? company.trialEndsAt.toLocaleDateString("ru-RU") : "14 дней с момента подтверждения";

  const result = await sendMail({
    to: uniqueEmails([company.ownerEmail]),
    subject: `Компания ${company.name} одобрена в ПроПлюшке`,
    text: [
      `Ваша компания «${company.name}» одобрена в сервисе ПроПлюшка.`,
      ``,
      `Пробный период активен до: ${trialText}.`,
      `Теперь можно войти в кабинет компании, настроить программу лояльности и распечатать QR для регистрации клиентов.`,
      ``,
      `Вход: ${origin}/company/login`,
    ].join("\n"),
  });

  await writeEmailAudit(company.id, `EMAIL_COMPANY_APPROVED_${result.status.toUpperCase()}`, result);
}
