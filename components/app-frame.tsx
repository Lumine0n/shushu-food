import { BottomNav } from "@/components/bottom-nav";

export function AppFrame({ children }: { children: React.ReactNode }) {
  return <div className="app-shell">{children}<BottomNav /></div>;
}
