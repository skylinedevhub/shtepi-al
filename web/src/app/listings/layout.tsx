import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Njoftime — Kërko prona në Shqipëri",
  description:
    "Kërko apartamente, shtëpi, vila dhe tokë për shitje dhe qira në Shqipëri. Filtra sipas qytetit, çmimit, sipërfaqes dhe më shumë.",
  alternates: {
    canonical: "/listings",
  },
};

export default function ListingsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
