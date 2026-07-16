import { Sidebar, MobileNav } from "@/components/app-shell/sidebar";
import { GlobalOverlays } from "@/components/app-shell/global-overlays";

export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <div className="flex min-h-svh flex-col md:flex-row">
        <Sidebar />
        <MobileNav />
        <main className="min-w-0 flex-1">{children}</main>
      </div>
      <GlobalOverlays />
    </>
  );
}
