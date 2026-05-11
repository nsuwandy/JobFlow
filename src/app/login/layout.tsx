import { SessionProvider } from "@/components/ui/SessionProvider";

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}
