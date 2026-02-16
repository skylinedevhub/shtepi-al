import type { Metadata } from "next";
import { Playfair_Display, DM_Sans } from "next/font/google";
import Link from "next/link";
import MobileMenu from "@/components/MobileMenu";
import AuthButton from "@/components/AuthButton";
import Providers from "@/components/Providers";
import { cityToSlug } from "@/lib/seo/slugs";
import "./globals.css";

const playfair = Playfair_Display({
  subsets: ["latin", "latin-ext"],
  variable: "--font-playfair",
  display: "swap",
});

const dmSans = DM_Sans({
  subsets: ["latin", "latin-ext"],
  variable: "--font-dm-sans",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://shtepial.al"),
  title: {
    template: "%s | ShtëpiAL",
    default: "ShtëpiAL — Gjej shtëpinë tënde në Shqipëri",
  },
  description:
    "Agregator i njoftimeve të pasurive të paluajtshme në Shqipëri. Kërko apartamente, shtëpi, vila dhe tokë nga të gjitha burimet në një vend.",
  openGraph: {
    siteName: "ShtëpiAL",
    locale: "sq_AL",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
  },
  alternates: {
    canonical: "/",
  },
};

const QUICK_CITIES = ["Tiranë", "Durrës", "Vlorë", "Sarandë", "Shkodër", "Korçë"];

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="sq">
      <body className={`${playfair.variable} ${dmSans.variable} font-sans antialiased`}>
        <Providers>
        <a href="#main-content" className="skip-to-content">
          Kalo te përmbajtja
        </a>

        <header className="sticky top-0 z-40 border-b border-navy-light/30 bg-navy/95 backdrop-blur-md">
          <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
            <Link href="/" className="font-display text-xl font-bold tracking-tight text-cream">
              <span className="text-gold">Shtëpi</span>AL
            </Link>
            <nav className="hidden items-center gap-6 text-sm font-medium md:flex">
              <Link
                href="/listings"
                className="text-cream/70 transition hover:text-cream"
              >
                Të gjitha
              </Link>
              <Link
                href="/listings?transaction_type=sale"
                className="text-cream/70 transition hover:text-cream"
              >
                Shitje
              </Link>
              <Link
                href="/listings?transaction_type=rent"
                className="text-cream/70 transition hover:text-cream"
              >
                Qira
              </Link>
            </nav>
            <div className="flex items-center gap-4">
              <AuthButton />
              <MobileMenu />
            </div>
          </div>
        </header>

        <main id="main-content">{children}</main>

        <footer className="border-t border-navy-light/30 bg-navy">
          <div className="mx-auto max-w-7xl px-4 py-10">
            <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
              {/* About */}
              <div>
                <h3 className="font-display text-sm font-semibold text-gold">ShtëpiAL</h3>
                <p className="mt-2 text-sm leading-relaxed text-cream/50">
                  Agregator i njoftimeve të pasurive të paluajtshme në Shqipëri.
                  Gjeni apartamente, shtëpi, vila dhe tokë nga burime të ndryshme, në një vend.
                </p>
              </div>

              {/* Sources */}
              <div>
                <h3 className="font-display text-sm font-semibold text-gold">Burimet</h3>
                <ul className="mt-2 space-y-1 text-sm text-cream/50">
                  <li>
                    <a href="https://merrjep.al" target="_blank" rel="noopener noreferrer" className="transition hover:text-terracotta">
                      merrjep.al
                    </a>
                  </li>
                  <li>
                    <a href="https://gazetacelesi.al" target="_blank" rel="noopener noreferrer" className="transition hover:text-terracotta">
                      gazetacelesi.al
                    </a>
                  </li>
                  <li>
                    <a href="https://mirlir.com" target="_blank" rel="noopener noreferrer" className="transition hover:text-terracotta">
                      mirlir.com
                    </a>
                  </li>
                  <li>
                    <a href="https://njoftime.com" target="_blank" rel="noopener noreferrer" className="transition hover:text-terracotta">
                      njoftime.com
                    </a>
                  </li>
                </ul>
              </div>

              {/* Quick cities */}
              <div>
                <h3 className="font-display text-sm font-semibold text-gold">Qytete</h3>
                <ul className="mt-2 space-y-1 text-sm text-cream/50">
                  {QUICK_CITIES.map((city) => (
                    <li key={city}>
                      <Link
                        href={`/${cityToSlug(city)}`}
                        className="transition hover:text-terracotta"
                      >
                        {city}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="mt-8 border-t border-navy-light/30 pt-6 text-center text-xs text-cream/30">
              © {new Date().getFullYear()} ShtëpiAL. Të gjitha të drejtat e rezervuara.
            </div>
          </div>
        </footer>
        </Providers>
      </body>
    </html>
  );
}
