import type { Metadata } from "next";
import localFont from "next/font/local";
import Link from "next/link";
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "ShtëpiAL — Gjej shtëpinë tënde në Shqipëri",
  description:
    "Agregator i njoftimeve të pasurive të paluajtshme në Shqipëri. Kërko apartamente, shtëpi, vila dhe tokë nga të gjitha burimet në një vend.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="sq">
      <body className={`${geistSans.variable} font-sans antialiased`}>
        <header className="sticky top-0 z-40 border-b border-gray-200 bg-white">
          <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
            <Link href="/" className="text-xl font-bold text-blue-600">
              ShtëpiAL
            </Link>
            <nav className="flex items-center gap-4 text-sm">
              <Link
                href="/listings?transaction_type=sale"
                className="text-gray-600 hover:text-gray-900"
              >
                Shitje
              </Link>
              <Link
                href="/listings?transaction_type=rent"
                className="text-gray-600 hover:text-gray-900"
              >
                Qira
              </Link>
            </nav>
          </div>
        </header>
        <main>{children}</main>
      </body>
    </html>
  );
}
