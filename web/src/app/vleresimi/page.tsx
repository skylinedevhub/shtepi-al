import type { Metadata } from "next";
import ValuationCalculator from "./ValuationCalculator";

export const metadata: Metadata = {
  title: "Vleresimi i Prones | ShtëpiAL",
  description:
    "Llogaritni vleren e tregut dhe vleren e references per pronat ne Shqiperi bazuar ne te dhenat kadastrale zyrtare.",
};

export default function ValuationPage() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:py-12">
      <div className="mb-8 text-center">
        <h1 className="font-display text-3xl font-bold text-navy sm:text-4xl">
          Vleresimi i Prones
        </h1>
        <p className="mt-2 text-sm text-warm-gray sm:text-base">
          Llogaritni vleren e tregut bazuar ne te dhenat kadastrale te
          Shqiperise
        </p>
      </div>
      <ValuationCalculator />
    </main>
  );
}
