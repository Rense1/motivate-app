import type { Metadata, Viewport } from "next";
import { Noto_Sans_JP } from "next/font/google";
import "./globals.css";
import { LanguageProvider } from "@/components/ui/LanguageProvider";
import { CapacitorInit } from "@/components/CapacitorInit";

const notoSansJP = Noto_Sans_JP({
  variable: "--font-noto-sans-jp",
  subsets: ["latin"],
  weight: ["400", "500", "700", "900"],
});

export const metadata: Metadata = {
  title: "REVIVE - 目標管理アプリ",
  description: "マイルストーンで夢を現実に",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#dc2626",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja" className={`${notoSansJP.variable} h-full`}>
      <body className="min-h-full bg-gray-100 font-[family-name:var(--font-noto-sans-jp)]">
        <CapacitorInit />
        <LanguageProvider>{children}</LanguageProvider>
      </body>
    </html>
  );
}
