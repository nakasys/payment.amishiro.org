import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "麻布十番網代会 町会費請求管理",
  description: "マンション・管理会社向け町会費の請求書と宛名ラベルを管理します。",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
