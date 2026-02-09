import type { Metadata } from "next";
import localFont from "next/font/local";
import Link from "next/link";
import MobileMenu from "@/components/MobileMenu";
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

const QUICK_CITIES = ["Tiranë", "Durrës", "Vlorë", "Sarandë", "Shkodër", "Korçë"];

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="sq">
      <body className={`${geistSans.variable} font-sans antialiased`}>
        <a href="#main-content" className="skip-to-content">
          Kalo te përmbajtja
        </a>

        <header className="sticky top-0 z-40 border-b border-gray-200/80 bg-white/95 backdrop-blur-md">
          <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
            <Link href="/" className="text-xl font-bold tracking-tight text-primary">
              ShtëpiAL
            </Link>
            <nav className="hidden items-center gap-6 text-sm font-medium md:flex">
              <Link
                href="/listings"
                className="text-gray-600 transition hover:text-gray-900"
              >
                Të gjitha
              </Link>
              <Link
                href="/listings?transaction_type=sale"
                className="text-gray-600 transition hover:text-gray-900"
              >
                Shitje
              </Link>
              <Link
                href="/listings?transaction_type=rent"
                className="text-gray-600 transition hover:text-gray-900"
              >
                Qira
              </Link>
            </nav>
            <MobileMenu />
          </div>
        </header>

        <main id="main-content">{children}</main>

        <footer className="border-t border-gray-200 bg-gray-50">
          <div className="mx-auto max-w-7xl px-4 py-10">
            <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
              {/* About */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900">ShtëpiAL</h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-500">
                  Agregator i njoftimeve të pasurive të paluajtshme në Shqipëri.
                  Gjeni apartamente, shtëpi, vila dhe tokë nga burime të ndryshme, në një vend.
                </p>
              </div>

              {/* Sources */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900">Burimet</h3>
                <ul className="mt-2 space-y-1 text-sm text-gray-500">
                  <li>
                    <a href="https://merrjep.al" target="_blank" rel="noopener noreferrer" className="transition hover:text-primary">
                      merrjep.al
                    </a>
                  </li>
                  <li>
                    <a href="https://gazetacelesi.al" target="_blank" rel="noopener noreferrer" className="transition hover:text-primary">
                      gazetacelesi.al
                    </a>
                  </li>
                  <li>
                    <a href="https://mirlir.com" target="_blank" rel="noopener noreferrer" className="transition hover:text-primary">
                      mirlir.com
                    </a>
                  </li>
                  <li>
                    <a href="https://njoftime.com" target="_blank" rel="noopener noreferrer" className="transition hover:text-primary">
                      njoftime.com
                    </a>
                  </li>
                </ul>
              </div>

              {/* Quick cities */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900">Qytete</h3>
                <ul className="mt-2 space-y-1 text-sm text-gray-500">
                  {QUICK_CITIES.map((city) => (
                    <li key={city}>
                      <Link
                        href={`/listings?city=${encodeURIComponent(city)}`}
                        className="transition hover:text-primary"
                      >
                        {city}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="mt-8 border-t border-gray-200 pt-6 text-center text-xs text-gray-400">
              © {new Date().getFullYear()} ShtëpiAL. Të gjitha të drejtat e rezervuara.
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
