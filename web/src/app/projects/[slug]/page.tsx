import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { getProjectBySlug, getProjects } from "@/lib/db/projects";
import ImageGallery from "@/components/ImageGallery";
import ProjectContactForm from "./ProjectContactForm";
import ProjectMap from "./ProjectMap";
import SimilarProjects from "./SimilarProjects";

export const revalidate = 60;

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const project = await getProjectBySlug(params.slug);
  if (!project) return { title: "Projekti nuk u gjet" };

  const priceRange =
    project.price_from_eur != null
      ? `Nga ${project.price_from_eur.toLocaleString("de-DE")}EUR`
      : "";

  return {
    title: `${project.project_name} - ${project.developer_name} | ShtëpiAL`,
    description: project.description
      ? project.description.slice(0, 160)
      : `${project.project_name} nga ${project.developer_name} ne ${project.city ?? "Shqiperi"}. ${priceRange}`,
  };
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  selling: {
    label: "Ne shitje",
    color: "bg-green-50 text-green-700 ring-1 ring-green-200",
  },
  under_construction: {
    label: "Ne ndertim",
    color: "bg-gold-light text-navy ring-1 ring-gold/30",
  },
  completed: {
    label: "Perfunduar",
    color: "bg-navy/5 text-navy ring-1 ring-navy/10",
  },
  upcoming: {
    label: "Se shpejti",
    color: "bg-terracotta-light text-terracotta ring-1 ring-terracotta/20",
  },
};

const AMENITY_ICONS: Record<string, string> = {
  parking: "P",
  ashensor: "A",
  pishine: "~",
  "pishine private": "~",
  "siguri 24/7": "S",
  kopesht: "K",
  "palestër": "G",
};

export default async function ProjectDetailPage({
  params,
}: {
  params: { slug: string };
}) {
  const project = await getProjectBySlug(params.slug);
  if (!project) notFound();

  const statusInfo =
    STATUS_LABELS[project.status ?? "selling"] ?? STATUS_LABELS.selling;

  const priceText =
    project.price_from_eur != null
      ? project.price_to_eur != null &&
        project.price_to_eur !== project.price_from_eur
        ? `${project.price_from_eur.toLocaleString("de-DE")}${String.fromCharCode(8364)} - ${project.price_to_eur.toLocaleString("de-DE")}${String.fromCharCode(8364)}`
        : `Nga ${project.price_from_eur.toLocaleString("de-DE")}${String.fromCharCode(8364)}`
      : "Cmimi me kerkese";

  // Fetch similar projects by same city
  const similarResult = project.city
    ? await getProjects({ city: project.city, limit: 4 })
    : null;
  const similarProjects = (similarResult?.projects ?? []).filter(
    (p) => p.id !== project.id
  ).slice(0, 3);

  return (
    <div className="min-h-[calc(100vh-4rem)]">
      {/* Breadcrumb */}
      <nav className="mx-auto max-w-7xl px-4 py-4" aria-label="Breadcrumb">
        <ol className="flex items-center gap-2 text-sm text-warm-gray">
          <li>
            <Link href="/" className="hover:text-terracotta">
              Ballina
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li>
            <Link href="/projects" className="hover:text-terracotta">
              Projekte
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li className="truncate font-medium text-navy">
            {project.project_name}
          </li>
        </ol>
      </nav>

      <div className="mx-auto max-w-7xl px-4 pb-16">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-3">
          {/* Main content */}
          <div className="lg:col-span-2">
            {/* Image gallery */}
            <ImageGallery
              images={project.images}
              alt={project.project_name}
            />

            {/* Header */}
            <div className="mt-6">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`rounded-full px-3 py-1 text-xs font-medium ${statusInfo.color}`}
                >
                  {statusInfo.label}
                </span>
                {project.is_featured && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-gold/10 px-3 py-1 text-xs font-medium text-gold ring-1 ring-gold/20">
                    <svg
                      className="size-3"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                      aria-hidden="true"
                    >
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                    E vecante
                  </span>
                )}
                {project.project_type && (
                  <span className="rounded-full bg-cream-dark px-3 py-1 text-xs font-medium text-warm-gray">
                    {project.project_type === "apartment"
                      ? "Apartamente"
                      : project.project_type === "villa"
                        ? "Vila"
                        : project.project_type === "commercial"
                          ? "Komerciale"
                          : project.project_type}
                  </span>
                )}
              </div>

              <h1 className="mt-3 font-display text-2xl font-bold text-navy sm:text-3xl">
                {project.project_name}
              </h1>
              <p className="mt-1 text-base text-warm-gray">
                nga{" "}
                <span className="font-medium text-navy">
                  {project.developer_name}
                </span>
              </p>

              {/* Location */}
              {(project.city || project.neighborhood || project.address) && (
                <p className="mt-2 flex items-center gap-1.5 text-sm text-warm-gray">
                  <svg
                    className="size-4 shrink-0"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                  {[project.address, project.neighborhood, project.city]
                    .filter(Boolean)
                    .join(", ")}
                </p>
              )}
            </div>

            {/* Price & Units */}
            <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div className="rounded-xl border border-warm-gray-light/40 bg-cream/50 p-4">
                <p className="text-xs font-medium uppercase tracking-wider text-warm-gray">
                  Cmimi
                </p>
                <p className="mt-1 text-lg font-bold tabular-nums text-navy">
                  {priceText}
                </p>
              </div>

              {project.units_total != null && (
                <div className="rounded-xl border border-warm-gray-light/40 bg-cream/50 p-4">
                  <p className="text-xs font-medium uppercase tracking-wider text-warm-gray">
                    Njesi totale
                  </p>
                  <p className="mt-1 text-lg font-bold text-navy">
                    {project.units_total}
                  </p>
                </div>
              )}

              {project.units_available != null && (
                <div className="rounded-xl border border-warm-gray-light/40 bg-cream/50 p-4">
                  <p className="text-xs font-medium uppercase tracking-wider text-warm-gray">
                    Te disponueshme
                  </p>
                  <p className="mt-1 text-lg font-bold text-terracotta">
                    {project.units_available}
                  </p>
                </div>
              )}

              {project.completion_date && (
                <div className="rounded-xl border border-warm-gray-light/40 bg-cream/50 p-4">
                  <p className="text-xs font-medium uppercase tracking-wider text-warm-gray">
                    Perfundimi
                  </p>
                  <p className="mt-1 text-lg font-bold text-navy">
                    {new Date(project.completion_date).toLocaleDateString(
                      "sq-AL",
                      { month: "long", year: "numeric" }
                    )}
                  </p>
                </div>
              )}
            </div>

            {/* Description */}
            {project.description && (
              <div className="mt-8">
                <h2 className="font-display text-lg font-bold text-navy">
                  Pershkrim
                </h2>
                <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-warm-gray">
                  {project.description}
                </p>
              </div>
            )}

            {/* Amenities */}
            {project.amenities && project.amenities.length > 0 && (
              <div className="mt-8">
                <h2 className="font-display text-lg font-bold text-navy">
                  Facilitete
                </h2>
                <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {project.amenities.map((amenity) => (
                    <div
                      key={amenity}
                      className="flex items-center gap-2.5 rounded-lg border border-warm-gray-light/40 bg-cream/30 px-3 py-2.5"
                    >
                      <span className="flex size-8 items-center justify-center rounded-lg bg-navy/5 text-sm font-bold text-navy">
                        {AMENITY_ICONS[amenity.toLowerCase()] ?? amenity.charAt(0).toUpperCase()}
                      </span>
                      <span className="text-sm font-medium capitalize text-navy">
                        {amenity}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Map */}
            {project.latitude != null && project.longitude != null && (
              <div className="mt-8">
                <h2 className="font-display text-lg font-bold text-navy">
                  Vendndodhja
                </h2>
                <div className="mt-3 overflow-hidden rounded-xl border border-warm-gray-light/40">
                  <ProjectMap
                    latitude={project.latitude}
                    longitude={project.longitude}
                    name={project.project_name}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-20 space-y-6">
              {/* Contact card */}
              <div className="rounded-2xl border border-warm-gray-light/40 bg-white p-6 shadow-sm">
                <h3 className="font-display text-lg font-bold text-navy">
                  Na kontaktoni
                </h3>
                <p className="mt-1 text-sm text-warm-gray">
                  Merrni informacion per kete projekt
                </p>

                {/* Contact buttons */}
                <div className="mt-4 space-y-3">
                  {project.contact_phone && (
                    <a
                      href={`tel:${project.contact_phone}`}
                      className="btn-press flex w-full items-center justify-center gap-2 rounded-btn bg-terracotta px-4 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-terracotta-dark"
                    >
                      <svg
                        className="size-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        aria-hidden="true"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                        />
                      </svg>
                      {project.contact_phone}
                    </a>
                  )}

                  {project.contact_whatsapp && (
                    <a
                      href={`https://wa.me/${project.contact_whatsapp.replace(/[^0-9+]/g, "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-press flex w-full items-center justify-center gap-2 rounded-btn border-2 border-green-600 px-4 py-3 text-sm font-medium text-green-700 transition hover:bg-green-50"
                    >
                      <svg className="size-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
                        <path d="M12 0C5.373 0 0 5.373 0 12c0 2.625.846 5.059 2.284 7.034L.789 23.492a.5.5 0 00.612.638l4.647-1.416A11.945 11.945 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-2.29 0-4.405-.763-6.102-2.048l-.427-.323-2.783.848.908-2.695-.357-.454A9.935 9.935 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z" />
                      </svg>
                      WhatsApp
                    </a>
                  )}

                  {project.contact_email && (
                    <a
                      href={`mailto:${project.contact_email}`}
                      className="btn-press flex w-full items-center justify-center gap-2 rounded-btn border-2 border-navy/20 px-4 py-3 text-sm font-medium text-navy transition hover:bg-navy/5"
                    >
                      <svg
                        className="size-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        aria-hidden="true"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                        />
                      </svg>
                      Email
                    </a>
                  )}

                  {project.website && (
                    <a
                      href={project.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-press flex w-full items-center justify-center gap-2 rounded-btn border-2 border-warm-gray-light/60 px-4 py-3 text-sm font-medium text-warm-gray transition hover:border-navy/20 hover:text-navy"
                    >
                      <svg
                        className="size-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        aria-hidden="true"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9"
                        />
                      </svg>
                      Faqja web
                    </a>
                  )}

                  {project.brochure_url && (
                    <a
                      href={project.brochure_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-press flex w-full items-center justify-center gap-2 rounded-btn border-2 border-gold/30 px-4 py-3 text-sm font-medium text-gold transition hover:bg-gold/5"
                    >
                      <svg
                        className="size-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        aria-hidden="true"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                      </svg>
                      Shkarko brosuren
                    </a>
                  )}
                </div>
              </div>

              {/* Contact form */}
              <ProjectContactForm
                projectId={project.id}
                projectName={project.project_name}
              />

              {/* Compare CTA */}
              <div className="rounded-2xl border border-warm-gray-light/40 bg-cream/50 p-6 text-center">
                <p className="text-sm font-medium text-navy">
                  Doni te krahasoni projekte?
                </p>
                <Link
                  href="/projects/compare"
                  className="btn-press mt-3 inline-flex items-center gap-2 rounded-btn border-2 border-terracotta px-5 py-2.5 text-sm font-medium text-terracotta transition hover:bg-terracotta hover:text-white"
                >
                  <svg
                    className="size-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                    />
                  </svg>
                  Krahaso projektet
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Similar projects */}
        {similarProjects.length > 0 && (
          <SimilarProjects projects={similarProjects} />
        )}
      </div>
    </div>
  );
}
