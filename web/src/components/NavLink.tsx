"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

interface NavLinkProps {
  href: string;
  /** Query param key=value to match for active state, e.g. "transaction_type=sale" */
  matchParam?: string;
  children: React.ReactNode;
  className?: string;
  activeClassName?: string;
  onClick?: () => void;
}

export default function NavLink({
  href,
  matchParam,
  children,
  className = "",
  activeClassName = "",
  onClick,
}: NavLinkProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const isListings = pathname === "/listings";

  let active = false;
  if (matchParam) {
    // e.g. matchParam="transaction_type=sale"
    const [key, value] = matchParam.split("=");
    active = isListings && searchParams.get(key) === value;
  } else {
    // "Te gjitha" — active on /listings with no transaction_type
    active = isListings && !searchParams.has("transaction_type");
  }

  return (
    <Link
      href={href}
      onClick={onClick}
      className={`${className} ${active ? activeClassName : ""}`}
      aria-current={active ? "page" : undefined}
    >
      {children}
    </Link>
  );
}
