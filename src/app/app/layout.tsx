import { ClientBottomNav } from "@/components/client-bottom-nav";

export default function ClientAppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      {children}
      <ClientBottomNav />
    </>
  );
}
