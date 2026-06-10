import { redirect } from "next/navigation";

export default async function LegacyAdminClientPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/company/client/${id}`);
}
