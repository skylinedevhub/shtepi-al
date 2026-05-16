import { notFound } from "next/navigation";
import { getDb } from "@/lib/db";
import { getPriceTrends, getMarketOverview, ALBANIAN_CITY_COORDS } from "@repo/analytics";
import { createClient } from "@/lib/supabase/server";
import { getB2bUser } from "@/lib/b2b-user";
import StatusBar from "./_components/status-bar";
import TickerTape from "./_components/ticker-tape";
import FilterRail from "./_components/filter-rail";
import MetricTiles from "./_components/metric-tiles";
import MapLoader from "./_components/map-loader";
import TrendChart from "./_components/trend-chart";
import CityTable from "./_components/city-table";
import FooterBar from "./_components/footer-bar";
import KeyboardShortcuts from "./_components/keyboard-shortcuts";

export const dynamic = "force-dynamic";

interface SearchParams {
  city?: string;
  tx?: string;
  days?: string;
  pt?: string;
}

const ALLOWED_DAYS = new Set([30, 90, 180, 365, 730]);

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  // b2b_users gate runs here (not in middleware — Postgres isn't available
  // in the Edge runtime). Anon redirect to /login is handled by middleware.
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) notFound();
  const b2bUser = await getB2bUser(authData.user.id);
  if (!b2bUser) notFound();

  const { city: rawCity = "", tx = "sale", days: daysRaw = "180", pt = "" } = searchParams;
  const city = rawCity === "" ? null : rawCity;
  const transactionType = (tx === "rent" ? "rent" : "sale") as "sale" | "rent";
  const daysNum = Number.parseInt(daysRaw, 10);
  const days = ALLOWED_DAYS.has(daysNum) ? daysNum : 180;
  const propertyType = pt && ["apartment", "house", "land", "commercial"].includes(pt) ? pt : "";

  const db = getDb();
  const [trend, overview] = await Promise.all([
    getPriceTrends(db, { city, transactionType, days }),
    getMarketOverview(db),
  ]);

  const cityList = Object.keys(ALBANIAN_CITY_COORDS);
  const cityMetrics = city ? overview.cities.find((c) => c.city === city) ?? null : null;

  const scopeLabel = city ?? "Mesatare kombëtare";

  return (
    <div className="h-screen flex flex-col bg-ink-900">
      <KeyboardShortcuts />
      <StatusBar email={authData.user.email ?? null} generatedAt={overview.generated_at} />
      <TickerTape
        totalListings={overview.total_listings}
        nationalAvg={overview.national_avg_price_sqm}
        cities={overview.cities}
      />

      <div className="flex-1 flex min-h-0">
        <FilterRail
          cities={cityList}
          city={city}
          transactionType={transactionType}
          days={days}
          propertyType={propertyType}
        />

        <main className="flex-1 min-w-0 overflow-auto">
          <div className="p-3 grid gap-3 grid-cols-12 grid-rows-[auto_minmax(360px,1fr)_minmax(280px,auto)]">
            {/* Top — metric tiles */}
            <div className="col-span-12">
              <MetricTiles
                selected={cityMetrics}
                overview={overview}
                transactionType={transactionType}
              />
            </div>

            {/* Middle — map + chart */}
            <div className="col-span-12 lg:col-span-7 term-panel flex flex-col overflow-hidden">
              <header className="term-panel-header">
                <span>
                  Hartë e tregut <span className="text-fg normal-case tracking-normal">· €/m²</span>
                </span>
                <span className="text-fg-dim">
                  klikoni një qytet për ta zgjedhur
                </span>
              </header>
              <div className="flex-1 min-h-[360px]">
                <MapLoader cities={overview.cities} selectedCity={city} />
              </div>
            </div>

            <div className="col-span-12 lg:col-span-5 min-h-[360px]">
              <TrendChart points={trend.points} scope={scopeLabel} transactionType={transactionType} />
            </div>

            {/* Bottom — city table */}
            <div className="col-span-12">
              <CityTable cities={overview.cities} selectedCity={city} />
            </div>
          </div>
        </main>
      </div>

      <FooterBar
        totalListings={overview.total_listings}
        cityCount={overview.cities.length}
        apiVersion="v1"
        generatedAt={overview.generated_at}
      />
    </div>
  );
}
