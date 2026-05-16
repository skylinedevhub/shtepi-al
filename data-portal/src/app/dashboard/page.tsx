import { getDb } from "@/lib/db";
import { getPriceTrends, getMarketOverview, ALBANIAN_CITY_COORDS } from "@repo/analytics";
import DashboardControls from "./DashboardControls";
import PriceChart from "./PriceChart";

export const dynamic = "force-dynamic";

interface SearchParams {
  city?: string;
  tx?: string;
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { city: rawCity = "", tx = "sale" } = searchParams;
  const city = rawCity === "" ? null : rawCity;
  const transactionType = (tx === "rent" ? "rent" : "sale") as "sale" | "rent";

  const db = getDb();
  const [trend, overview] = await Promise.all([
    getPriceTrends(db, { city, transactionType, days: 180 }),
    getMarketOverview(db),
  ]);

  const cityList = Object.keys(ALBANIAN_CITY_COORDS);
  const cityMetrics = city ? overview.cities.find((c) => c.city === city) ?? null : null;

  return (
    <main className="max-w-5xl mx-auto px-4 py-10">
      <header className="mb-8">
        <h1 className="text-3xl font-semibold text-navy">Lëvizja e Çmimeve</h1>
        <p className="text-warmgray">Të dhëna ditore për tregun shqiptar të pasurive të paluajtshme.</p>
      </header>

      <DashboardControls cities={cityList} city={city} transactionType={transactionType} />

      <section className="mt-8 bg-white rounded-lg border border-warmgray/20 p-6">
        <h2 className="text-xl font-medium mb-4">
          {city ?? "Mesatare kombëtare"} — {transactionType === "sale" ? "Shitje" : "Qira"}
        </h2>
        {trend.points.length === 0 ? (
          <p className="text-warmgray py-12 text-center">
            Të dhëna të pamjaftueshme për këtë periudhë.
          </p>
        ) : (
          <PriceChart points={trend.points} />
        )}
      </section>

      {cityMetrics && (
        <section className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
          <Metric label="Çmim mesatar / m²" value={cityMetrics.avg_price_sqm} unit="€" />
          <Metric label="Mediana e çmimit" value={cityMetrics.median_price} unit="€" />
          <Metric label="Numri i listave" value={cityMetrics.total_listings} />
          <Metric label="Renta vjetore" value={cityMetrics.rent_yield} unit="%" />
        </section>
      )}
    </main>
  );
}

function Metric({ label, value, unit }: { label: string; value: number | null; unit?: string }) {
  return (
    <div className="bg-white rounded border border-warmgray/20 p-4">
      <p className="text-xs text-warmgray uppercase tracking-wide">{label}</p>
      <p className="text-xl font-medium text-navy mt-1">
        {value === null ? "—" : `${value.toLocaleString("sq-AL")}${unit ?? ""}`}
      </p>
    </div>
  );
}
