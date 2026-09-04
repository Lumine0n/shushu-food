import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AppStoreProvider } from "@/lib/app-store";

export const metadata: Metadata = {
  title: { default: "鼠鼠吃饭", template: "%s · 鼠鼠吃饭" },
  description: "朋友共同维护的校园吃饭决策工具",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#f7f4ec" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-CN"><body><AppStoreProvider>{children}</AppStoreProvider></body></html>;
}
