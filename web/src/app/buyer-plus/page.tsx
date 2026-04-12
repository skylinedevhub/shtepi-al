import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Buyer Plus | ShtëpiAL",
  description:
    "Merrni akses te hershëm, njoftime çmimi, dhe vlerësim të drejtë tregu me planin Buyer Plus.",
};

const FEATURES = [
  {
    icon: (
      <svg
        className="h-7 w-7 text-gold"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
    title: "Qasje e hershme",
    description:
      "Shikoni njoftimet 2 orë përpara përdoruesve falas. Mos humbisni mundësitë më të mira.",
  },
  {
    icon: (
      <svg
        className="h-7 w-7 text-gold"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
        />
      </svg>
    ),
    title: "Njoftime çmimi",
    description:
      "Vendosni alerte për çdo njoftim dhe merrni njoftim kur çmimi ulet.",
  },
  {
    icon: (
      <svg
        className="h-7 w-7 text-gold"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
        />
      </svg>
    ),
    title: "Pa reklama",
    description:
      "Përvoja e pastër pa asnjë reklamë. Fokusohuni vetëm tek njoftimet.",
  },
  {
    icon: (
      <svg
        className="h-7 w-7 text-gold"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
        />
      </svg>
    ),
    title: "Çmim i drejtë",
    description:
      "Vlerësoni nëse çmimi i një njoftimi është nën, afër, apo mbi mesataren e tregut.",
  },
  {
    icon: (
      <svg
        className="h-7 w-7 text-gold"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
        />
      </svg>
    ),
    title: "Kërkim i ruajtur",
    description:
      "Ruani kërkimet tuaja pa limit dhe merrni njoftime kur shfaqen njoftimet e reja.",
  },
];

const FAQ = [
  {
    q: "Si funksionon qasja e hershme?",
    a: "Njoftimet e reja shfaqen për abonentët Buyer Plus 2 orë përpara se të jenë të dukshme për përdoruesit falas. Kjo ju jep avantazh konkurrues.",
  },
  {
    q: "A mund ta anuloj abonimin?",
    a: "Po, mund ta anuloni abonimin në çdo kohë nga paneli juaj. Abonimin do ta keni aktiv deri në fund të periudhës aktuale.",
  },
  {
    q: "Si funksionon çmimi i drejtë?",
    a: "Ne krahasojmë çmimin për m² të njoftimit me mesataren e tregut për qytetin dhe tipin e pronës. Rezultati tregon nëse çmimi është nën, afër, apo mbi mesataren.",
  },
  {
    q: "Sa alerte çmimi mund të vendos?",
    a: "Me Buyer Plus, mund të vendosni alerte çmimi pa limit për çdo njoftim që ju intereson.",
  },
  {
    q: "Çfarë metodash pagese pranoni?",
    a: "Pranojmë karta krediti dhe debiti nëpërmjet Stripe. Pagesat janë të sigurta dhe të koduara.",
  },
];

export default function BuyerPlusPage() {
  return (
    <div className="min-h-[calc(100vh-4rem)]">
      {/* Hero */}
      <section
        className="relative overflow-hidden px-4 pb-16 pt-16 sm:pt-24"
        style={{
          background: `
            radial-gradient(ellipse 60% 50% at 80% 15%, rgba(212,168,67,0.12) 0%, transparent 70%),
            radial-gradient(ellipse 50% 60% at 15% 80%, rgba(199,91,57,0.06) 0%, transparent 70%),
            #FDF8F0
          `,
        }}
      >
        <div className="pointer-events-none absolute left-6 top-16 h-24 w-px bg-gradient-to-b from-transparent via-gold/30 to-transparent sm:left-12 sm:h-32" />
        <div className="pointer-events-none absolute bottom-16 right-6 h-24 w-px bg-gradient-to-b from-transparent via-terracotta/20 to-transparent sm:right-12 sm:h-32" />

        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-5 flex items-center justify-center gap-3">
            <span className="h-px w-8 bg-gold/50" />
            <span className="text-xs font-medium uppercase tracking-[0.2em] text-gold">
              Per blerësit
            </span>
            <span className="h-px w-8 bg-gold/50" />
          </div>
          <h1 className="font-display text-4xl font-bold tracking-tight text-navy sm:text-5xl">
            Buyer{" "}
            <span className="text-gold">Plus</span>
          </h1>
          <p className="mx-auto mt-4 max-w-lg text-base leading-relaxed text-warm-gray sm:text-lg">
            Gjeni pronën e ëndrrave tuaja me avantazh. Qasje e hershme,
            njoftime çmimi, dhe analiza tregu.
          </p>

          {/* Price */}
          <div className="mt-8 flex items-baseline justify-center gap-1">
            <span className="font-display text-5xl font-bold text-navy">
              &euro;4.99
            </span>
            <span className="text-lg text-warm-gray">/muaj</span>
          </div>

          {/* CTA */}
          <div className="mt-6">
            <Link
              href="/pricing"
              className="btn-press inline-block rounded-btn bg-gold px-8 py-3.5 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:bg-gold/90 hover:shadow-md"
            >
              Aktivizo Buyer Plus
            </Link>
            <p className="mt-3 text-xs text-warm-gray">
              Anuloni në çdo kohë. Provë falas 14-ditore.
            </p>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-5xl px-4 py-16">
        <h2 className="mb-10 text-center font-display text-2xl font-bold text-navy">
          Çfarë përfshihet
        </h2>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature) => (
            <div
              key={feature.title}
              className="rounded-xl border border-warm-gray-light/60 bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-gold/10">
                {feature.icon}
              </div>
              <h3 className="font-display text-lg font-bold text-navy">
                {feature.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-warm-gray">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section
        className="px-4 py-16"
        style={{ background: "#FDF8F0" }}
      >
        <div className="mx-auto max-w-3xl">
          <h2 className="mb-10 text-center font-display text-2xl font-bold text-navy">
            Si funksionon
          </h2>
          <div className="space-y-8">
            {[
              {
                step: "1",
                title: "Abonohuni",
                desc: "Zgjidhni planin Buyer Plus dhe paguani me kartë krediti.",
              },
              {
                step: "2",
                title: "Shikoni njoftimet e reja para të tjerëve",
                desc: "Njoftimet e reja shfaqen 2 orë përpara për ju.",
              },
              {
                step: "3",
                title: "Vendosni alerte dhe ruani kërkime",
                desc: "Merrni njoftime automatike kur pronave tuaja të preferuara u ulet çmimi.",
              },
            ].map((item) => (
              <div key={item.step} className="flex gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gold text-sm font-bold text-white">
                  {item.step}
                </div>
                <div>
                  <h3 className="font-display text-base font-bold text-navy">
                    {item.title}
                  </h3>
                  <p className="mt-1 text-sm text-warm-gray">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="px-4 py-16">
        <div className="mx-auto max-w-2xl">
          <h2 className="mb-8 text-center font-display text-2xl font-bold text-navy">
            Pyetjet e shpeshta
          </h2>
          <div className="space-y-3">
            {FAQ.map((item, i) => (
              <details
                key={i}
                className="group rounded-xl border border-warm-gray-light/60 bg-white shadow-sm"
              >
                <summary className="flex cursor-pointer items-center justify-between px-5 py-4 text-left [&::-webkit-details-marker]:hidden">
                  <span className="font-medium text-navy">{item.q}</span>
                  <svg
                    className="h-5 w-5 shrink-0 text-warm-gray transition-transform group-open:rotate-180"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </summary>
                <div className="border-t border-warm-gray-light/40 px-5 pb-4 pt-3 text-sm leading-relaxed text-warm-gray">
                  {item.a}
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section
        className="px-4 py-16 text-center"
        style={{ background: "#FDF8F0" }}
      >
        <div className="mx-auto max-w-lg">
          <h2 className="font-display text-2xl font-bold text-navy">
            Gati per te filluar?
          </h2>
          <p className="mt-3 text-sm text-warm-gray">
            Bëhuni pjesë e Buyer Plus dhe gjeni pronën tuaj me avantazh.
          </p>
          <Link
            href="/pricing"
            className="btn-press mt-6 inline-block rounded-btn bg-gold px-8 py-3.5 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:bg-gold/90 hover:shadow-md"
          >
            Aktivizo Buyer Plus — &euro;4.99/muaj
          </Link>
        </div>
      </section>
    </div>
  );
}
