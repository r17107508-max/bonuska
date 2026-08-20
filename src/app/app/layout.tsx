import { ClientBottomNav } from "@/components/client-bottom-nav";
import { requireUser } from "@/lib/auth";

export default async function ClientAppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  await requireUser("/client/login");

  return (
    <>
      {children}
      <ClientBottomNav />
    </>
  );
}
