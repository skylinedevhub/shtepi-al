import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin", "latin-ext"],
  variable: "--font-sans",
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "ShtëpiAL Intel · Terminal",
  description: "Të dhëna proprietare të tregut të pasurive të paluajtshme në Shqipëri.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="sq" className={`dark ${inter.variable} ${jetbrains.variable}`}>
      <body className="bg-ink-900 text-fg min-h-screen antialiased">{children}</body>
    </html>
  );
}
