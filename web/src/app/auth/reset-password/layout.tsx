import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Vendos fjalëkalimin e ri",
  robots: { index: false, follow: false },
};

export default function ResetPasswordLayout({ children }: { children: React.ReactNode }) {
  return children;
}
