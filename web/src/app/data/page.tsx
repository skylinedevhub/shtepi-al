import Link from "next/link";

export const metadata = {
  title: "Të dhëna tregu | ShtëpiAL",
  description:
    "Të dhëna dhe analiza të tregut të pasurive të paluajtshme në Shqipëri. Çmimet mesatare, trendet, dhe raportet e tregut.",
};

const FEATURES = [
  {
    title: "Çmimi mesatar €/m²",
    desc: "Për çdo qytet dhe lagje në Shqipëri",
    icon: "📊",
  },
  {
    title: "Trendet e çmimeve",
    desc: "Ndryshimet mujore dhe vjetore",
    icon: "📈",
  },
  {
    title: "Rendimenti i qirasë",
    desc: "Yield vjetor për investitorë",
    icon: "💰",
  },
  {
    title: "Inventari i tregut",
    desc: "Njoftime aktive dhe thellësia e tregut",
    icon: "🏠",
  },
  {
    title: "Harta e kërkesës",
    desc: "Zonat më të kërkuara në kohë reale",
    icon: "🗺️",
  },
  {
    title: "Aksioni i agjencive",
    desc: "Pjesa e tregut për çdo agjenci",
    icon: "🏢",
  },
];

const PLANS = [
  {
    name: "Dashboard",
    price: "€199",
    period: "/muaj",
    features: [
      "Të gjitha metrikat",
      "Grafiqe interaktive",
      "Filtrim sipas qytetit",
      "Raporti mujor PDF",
      "Historiku 12 muaj",
    ],
    cta: "Fillo tani",
    highlight: false,
    slug: "data-dashboard",
  },
  {
    name: "API",
    price: "€499",
    period: "/muaj",
    features: [
      "Gjithçka në Dashboard",
      "REST API i plotë",
      "60 kërkesa/minutë",
      "Webhook njoftimet",
      "Mbështetje prioritare",
    ],
    cta: "Fillo tani",
    highlight: true,
    slug: "data-api",
  },
  {
    name: "Enterprise",
    price: "€1,500+",
    period: "/muaj",
    features: [
      "Gjithçka në API",
      "Kërkesa pa limit",
      "Të dhëna të personalizuara",
      "SLA i dedikuar",
      "Account manager",
    ],
    cta: "Na kontaktoni",
    highlight: false,
    slug: null,
  },
];

export default function DataLandingPage() {
  return (
    <div className="min-h-screen bg-cream">
      {/* Hero */}
      <section className="bg-navy px-4 py-20 text-center">
        <h1 className="font-display text-4xl font-bold text-cream sm:text-5xl">
          Të dhëna tregu të pasurive
          <br />
          <span className="text-gold">të paluajtshme në Shqipëri</span>
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-cream/80">
          Nga 13 burime, për zhvillues, banka, investitorë dhe agjenci.
          Vendime të informuara me të dhëna reale.
        </p>
      </section>

      {/* Feature grid */}
      <section className="mx-auto max-w-5xl px-4 py-16">
        <h2 className="mb-8 text-center font-display text-2xl font-bold text-navy">
          Çfarë përfshihet
        </h2>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="rounded-xl bg-white p-6 shadow-sm"
            >
              <div className="mb-3 text-3xl">{f.icon}</div>
              <h3 className="font-display text-lg font-bold text-navy">
                {f.title}
              </h3>
              <p className="mt-1 text-sm text-warm-gray">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section className="bg-navy/5 px-4 py-16">
        <h2 className="mb-8 text-center font-display text-2xl font-bold text-navy">
          Çmimet
        </h2>
        <div className="mx-auto grid max-w-4xl gap-6 sm:grid-cols-3">
          {PLANS.map((plan) => (
            <div
              key={plan.name}
              className={`rounded-xl bg-white p-6 shadow-sm ${
                plan.highlight
                  ? "ring-2 ring-gold shadow-md"
                  : ""
              }`}
            >
              {plan.highlight && (
                <span className="mb-2 inline-block rounded-full bg-gold/15 px-3 py-0.5 text-xs font-semibold text-gold">
                  Rekomanduar
                </span>
              )}
              <h3 className="font-display text-xl font-bold text-navy">
                {plan.name}
              </h3>
              <div className="mt-2">
                <span className="text-3xl font-bold text-navy">
                  {plan.price}
                </span>
                <span className="text-warm-gray">{plan.period}</span>
              </div>
              <ul className="mt-4 space-y-2">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-navy">
                    <svg
                      className="h-4 w-4 flex-shrink-0 text-green-500"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>
              <div className="mt-6">
                {plan.slug ? (
                  <Link
                    href={`/pricing?plan=${plan.slug}`}
                    className={`block rounded-lg py-2.5 text-center text-sm font-semibold transition ${
                      plan.highlight
                        ? "bg-gold text-navy hover:bg-gold/90"
                        : "bg-navy text-cream hover:bg-navy/90"
                    }`}
                  >
                    {plan.cta}
                  </Link>
                ) : (
                  <a
                    href="mailto:info@shtepial.al"
                    className="block rounded-lg bg-warm-gray/20 py-2.5 text-center text-sm font-semibold text-navy transition hover:bg-warm-gray/30"
                  >
                    {plan.cta}
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="px-4 py-16 text-center">
        <h2 className="font-display text-2xl font-bold text-navy">
          Gati për të filluar?
        </h2>
        <p className="mt-2 text-warm-gray">
          Provoni dashboard-in me 7 ditë provë falas.
        </p>
        <Link
          href="/pricing?plan=data-dashboard"
          className="mt-4 inline-block rounded-lg bg-gold px-8 py-3 font-semibold text-navy transition hover:bg-gold/90"
        >
          Filloni provën falas
        </Link>
      </section>
    </div>
  );
}
