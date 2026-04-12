import Link from "next/link";
import { getProjects, getFeaturedProjects } from "@/lib/db/projects";
import { CITIES } from "@/lib/constants";
import { parseNumericParam } from "@/lib/parse-numeric";
import type { ProjectFilters, DeveloperProject } from "@/lib/types";
import ProjectCard from "./ProjectCard";
import FeaturedCarousel from "./FeaturedCarousel";

export const revalidate = 60;

export const metadata = {
  title: "Projekte te reja ne Shqiperi | ShtëpiAL",
  description:
    "Zbuloni projektet e reja te ndertimit ne Shqiperi. Banesa, vila dhe komplekse moderne nga zhvilluesit me te mire.",
};

const PROJECT_TYPES = [
  { value: "apartment", label: "Apartamente" },
  { value: "villa", label: "Vila" },
  { value: "commercial", label: "Komerciale" },
  { value: "mixed", label: "Mikse" },
];

const STATUS_OPTIONS = [
  { value: "selling", label: "Ne shitje" },
  { value: "under_construction", label: "Ne ndertim" },
  { value: "completed", label: "Perfunduar" },
  { value: "upcoming", label: "Se shpejti" },
];

const SORT_OPTIONS = [
  { value: "newest", label: "Me te rejat" },
  { value: "price_asc", label: "Cmimi: Ulet -> Larte" },
  { value: "price_desc", label: "Cmimi: Larte -> Ulet" },
];

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const city =
    typeof searchParams.city === "string" ? searchParams.city : undefined;
  const projectType =
    typeof searchParams.project_type === "string"
      ? searchParams.project_type
      : undefined;
  const status =
    typeof searchParams.status === "string" ? searchParams.status : undefined;
  const sort =
    typeof searchParams.sort === "string"
      ? (searchParams.sort as ProjectFilters["sort"])
      : "newest";
  const priceMin = parseNumericParam(
    typeof searchParams.price_min === "string"
      ? searchParams.price_min
      : undefined
  );
  const priceMax = parseNumericParam(
    typeof searchParams.price_max === "string"
      ? searchParams.price_max
      : undefined
  );
  const pageParam = parseNumericParam(
    typeof searchParams.page === "string" ? searchParams.page : undefined
  );
  const page = pageParam && pageParam > 0 ? pageParam : 1;

  const filters: ProjectFilters = {
    city,
    project_type: projectType,
    status,
    sort,
    price_min: priceMin,
    price_max: priceMax,
    page,
    limit: 12,
  };

  const [result, featuredProjects] = await Promise.all([
    getProjects(filters),
    page === 1 && !city && !projectType && !status
      ? getFeaturedProjects()
      : Promise.resolve([]),
  ]);

  const hasActiveFilters = !!(city || projectType || status || priceMin || priceMax);

  function buildUrl(overrides: Record<string, string | undefined>) {
    const params = new URLSearchParams();
    const merged = {
      city,
      project_type: projectType,
      status,
      sort,
      price_min: priceMin?.toString(),
      price_max: priceMax?.toString(),
      ...overrides,
    };
    for (const [k, v] of Object.entries(merged)) {
      if (v && v !== "newest") params.set(k, v);
    }
    const qs = params.toString();
    return `/projects${qs ? `?${qs}` : ""}`;
  }

  return (
    <div className="min-h-[calc(100vh-4rem)]">
      {/* Hero */}
      <section
        className="noise-texture relative overflow-hidden px-4 py-16 sm:py-20"
        style={{
          background: `
            radial-gradient(ellipse 60% 50% at 80% 15%, rgba(199,91,57,0.09) 0%, transparent 70%),
            radial-gradient(ellipse 50% 60% at 15% 80%, rgba(212,168,67,0.07) 0%, transparent 70%),
            #FDF8F0
          `,
        }}
      >
        <div className="mx-auto max-w-7xl text-center">
          <div className="mb-4 flex items-center justify-center gap-3">
            <span className="h-px w-8 bg-gold/50" />
            <span className="text-xs font-medium uppercase tracking-[0.2em] text-gold">
              Ndertim i ri
            </span>
            <span className="h-px w-8 bg-gold/50" />
          </div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-navy sm:text-4xl md:text-5xl">
            Projekte te reja ne Shqiperi
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-warm-gray sm:text-lg">
            Zbuloni komplekset e reja rezidenciale dhe komerciale nga zhvilluesit
            me te besuar ne vend.
          </p>
        </div>
      </section>

      {/* Featured carousel */}
      {featuredProjects.length > 0 && (
        <section className="mx-auto w-full max-w-7xl px-4 py-10">
          <div className="mb-6 flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-gold/10 px-3 py-1 text-xs font-semibold text-gold ring-1 ring-gold/20">
              <svg className="size-3.5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              Te vecantat
            </span>
          </div>
          <FeaturedCarousel projects={featuredProjects} />
        </section>
      )}

      {/* Filters + Grid */}
      <section className="mx-auto w-full max-w-7xl px-4 pb-16">
        {/* Filter bar */}
        <div className="mb-8 flex flex-wrap items-center gap-3">
          {/* City */}
          <div className="relative">
            <select
              defaultValue={city ?? ""}
              onChange={() => {}} // SSR only, the Link approach is used
              className="appearance-none rounded-lg border border-warm-gray-light/60 bg-white py-2 pl-3 pr-8 text-sm text-navy shadow-sm"
              aria-label="Qyteti"
              // Not interactive server-side; replaced by links below
              style={{ pointerEvents: "none" }}
            >
              <option value="">Te gjithe qytetet</option>
              {CITIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* City quick links */}
          <div className="flex flex-wrap gap-2">
            <Link
              href={buildUrl({ city: undefined, page: undefined })}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                !city
                  ? "border-terracotta bg-terracotta text-white"
                  : "border-warm-gray-light/60 bg-white text-warm-gray hover:border-terracotta/30 hover:text-terracotta"
              }`}
            >
              Te gjitha
            </Link>
            {CITIES.slice(0, 6).map((c) => (
              <Link
                key={c}
                href={buildUrl({ city: c, page: undefined })}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                  city === c
                    ? "border-terracotta bg-terracotta text-white"
                    : "border-warm-gray-light/60 bg-white text-warm-gray hover:border-terracotta/30 hover:text-terracotta"
                }`}
              >
                {c}
              </Link>
            ))}
          </div>
        </div>

        {/* Secondary filters */}
        <div className="mb-6 flex flex-wrap items-center gap-3">
          {/* Type */}
          <div className="flex flex-wrap gap-2">
            {PROJECT_TYPES.map((pt) => (
              <Link
                key={pt.value}
                href={buildUrl({
                  project_type:
                    projectType === pt.value ? undefined : pt.value,
                  page: undefined,
                })}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                  projectType === pt.value
                    ? "border-navy bg-navy text-white"
                    : "border-warm-gray-light/60 bg-white text-warm-gray hover:border-navy/30 hover:text-navy"
                }`}
              >
                {pt.label}
              </Link>
            ))}
          </div>

          <span className="hidden h-4 w-px bg-warm-gray-light sm:block" />

          {/* Status */}
          <div className="flex flex-wrap gap-2">
            {STATUS_OPTIONS.map((s) => (
              <Link
                key={s.value}
                href={buildUrl({
                  status: status === s.value ? undefined : s.value,
                  page: undefined,
                })}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                  status === s.value
                    ? "border-gold bg-gold text-navy"
                    : "border-warm-gray-light/60 bg-white text-warm-gray hover:border-gold/30 hover:text-gold"
                }`}
              >
                {s.label}
              </Link>
            ))}
          </div>

          <span className="hidden h-4 w-px bg-warm-gray-light sm:block" />

          {/* Sort */}
          <div className="ml-auto flex items-center gap-2">
            <span className="text-xs text-warm-gray">Rendit:</span>
            {SORT_OPTIONS.map((s) => (
              <Link
                key={s.value}
                href={buildUrl({
                  sort: s.value === "newest" ? undefined : s.value,
                  page: undefined,
                })}
                className={`rounded-lg px-2.5 py-1 text-xs font-medium transition ${
                  sort === s.value
                    ? "bg-navy text-white"
                    : "text-warm-gray hover:bg-navy/5 hover:text-navy"
                }`}
              >
                {s.label}
              </Link>
            ))}
          </div>
        </div>

        {/* Active filter indicator */}
        {hasActiveFilters && (
          <div className="mb-6 flex items-center gap-2">
            <span className="text-sm text-warm-gray">
              {result.total} projekte te gjetura
            </span>
            <Link
              href="/projects"
              className="inline-flex items-center gap-1 rounded-full bg-terracotta/10 px-3 py-1 text-xs font-medium text-terracotta transition hover:bg-terracotta/20"
            >
              <svg
                className="size-3"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
              Pastro filtrat
            </Link>
          </div>
        )}

        {/* Project grid */}
        {result.projects.length === 0 ? (
          <div className="flex flex-col items-center py-20 text-center">
            <svg
              className="mb-4 size-20 text-warm-gray-light"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1}
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
              />
            </svg>
            <p className="text-lg font-medium text-navy">
              Nuk u gjeten projekte
            </p>
            <p className="mt-1 text-sm text-warm-gray">
              Provo te ndryshosh filtrat ose kthehu me vone per projekte te reja.
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {result.projects.map((project) => (
                <ProjectCard key={project.id} project={project} />
              ))}
            </div>

            {/* Pagination */}
            {(result.has_more || page > 1) && (
              <div className="mt-10 flex items-center justify-center gap-3">
                {page > 1 && (
                  <Link
                    href={buildUrl({ page: String(page - 1) })}
                    className="btn-press rounded-btn border border-warm-gray-light/60 bg-white px-5 py-2.5 text-sm font-medium text-navy shadow-sm transition hover:border-terracotta/30 hover:text-terracotta"
                  >
                    Mbrapa
                  </Link>
                )}
                <span className="text-sm text-warm-gray">
                  Faqja {page} nga{" "}
                  {Math.ceil(result.total / (filters.limit ?? 12))}
                </span>
                {result.has_more && (
                  <Link
                    href={buildUrl({ page: String(page + 1) })}
                    className="btn-press rounded-btn bg-terracotta px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-terracotta-dark"
                  >
                    Tjetra
                  </Link>
                )}
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
