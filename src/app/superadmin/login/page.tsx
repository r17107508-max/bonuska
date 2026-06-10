import { redirect } from "next/navigation";

export default async function SuperadminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const query = params.error ? `?error=${encodeURIComponent(params.error)}` : "";
  redirect(`/company/login${query}`);
}
