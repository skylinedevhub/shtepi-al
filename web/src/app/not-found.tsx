import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <svg
        className="mb-6 size-24 text-warm-gray-light"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1}
          d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0h4"
        />
      </svg>
      <h1 className="font-display text-3xl font-bold text-navy">
        Faqja nuk u gjet
      </h1>
      <p className="mt-3 max-w-md text-warm-gray">
        Faqja që po kërkoni nuk ekziston ose është zhvendosur.
      </p>
      <Link
        href="/"
        className="mt-8 rounded-btn bg-terracotta px-6 py-3 font-medium text-white transition hover:bg-terracotta-dark"
      >
        Kthehu në kryefaqe
      </Link>
    </div>
  );
}
