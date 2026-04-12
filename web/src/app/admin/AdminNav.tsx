"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_LINKS = [
  {
    href: "/admin",
    label: "Paneli kryesor",
    icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6",
    exact: true,
  },
  {
    href: "/admin/revenue",
    label: "Te ardhurat",
    icon: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
    exact: false,
  },
  {
    href: "/admin/plans",
    label: "Planet",
    icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01",
    exact: false,
  },
  {
    href: "/admin/subscriptions",
    label: "Abonimet",
    icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z",
    exact: false,
  },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <div className="border-b border-warm-gray-light bg-white">
      <div className="mx-auto max-w-6xl px-4">
        <nav className="-mb-px flex gap-1 overflow-x-auto py-1">
          {NAV_LINKS.map(({ href, label, icon, exact }) => {
            const isActive = exact
              ? pathname === href
              : pathname.startsWith(href);

            return (
              <Link
                key={href}
                href={href}
                className={`inline-flex items-center gap-2 whitespace-nowrap rounded-btn px-4 py-2.5 text-sm font-medium transition ${
                  isActive
                    ? "bg-navy/5 text-navy"
                    : "text-warm-gray hover:bg-cream-dark hover:text-navy"
                }`}
              >
                <svg
                  className="h-4 w-4 flex-shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d={icon}
                  />
                </svg>
                {label}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
