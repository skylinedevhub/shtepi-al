import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ShtëpiAL Intel",
  description: "Të dhëna proprietare të tregut të pasurive të paluajtshme në Shqipëri.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="sq">
      <body className="bg-cream text-navy">{children}</body>
    </html>
  );
}
