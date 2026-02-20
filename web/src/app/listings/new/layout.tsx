import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Posto njoftim të ri",
  robots: { index: false, follow: false },
};

export default function NewListingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
