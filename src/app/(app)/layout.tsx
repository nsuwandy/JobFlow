import { SessionProvider } from "@/components/ui/SessionProvider";
import { Navbar } from "@/components/ui/Navbar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <div className="min-h-screen flex flex-col bg-gray-50">
        <Navbar />
        <main className="flex-1">{children}</main>
      </div>
    </SessionProvider>
  );
}
