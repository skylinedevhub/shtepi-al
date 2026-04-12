"use client";

import { useState } from "react";
import Link from "next/link";
import type { DeveloperProject } from "@/lib/types";
import { cn } from "@/lib/cn";

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

interface ProjectCardProps {
  project: DeveloperProject;
}

export default function ProjectCard({ project }: ProjectCardProps) {
  const [imgError, setImgError] = useState(false);
  const firstImage = project.images[0];
  const statusInfo = STATUS_LABELS[project.status ?? "selling"] ?? STATUS_LABELS.selling;

  const priceText =
    project.price_from_eur != null
      ? project.price_to_eur != null && project.price_to_eur !== project.price_from_eur
        ? `Nga ${project.price_from_eur.toLocaleString("de-DE")}${String.fromCharCode(8364)} - ${project.price_to_eur.toLocaleString("de-DE")}${String.fromCharCode(8364)}`
        : `Nga ${project.price_from_eur.toLocaleString("de-DE")}${String.fromCharCode(8364)}`
      : "Cmimi me kerkese";

  return (
    <Link
      href={`/projects/${project.slug}`}
      className="group block overflow-hidden rounded-2xl border border-warm-gray-light/50 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_12px_32px_-8px_rgba(27,42,74,0.12)]"
    >
      {/* Image */}
      <div className="relative aspect-[16/10] overflow-hidden bg-cream-dark">
        {firstImage && !imgError ? (
          <img
            src={firstImage}
            alt={project.project_name}
            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
            loading="lazy"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-warm-gray-light">
            <svg
              className="size-16"
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
          </div>
        )}

        {/* Badges */}
        <div className="absolute left-2 top-2 flex gap-1.5">
          <span
            className={cn(
              "rounded-full px-2.5 py-0.5 text-xs font-medium",
              statusInfo.color
            )}
          >
            {statusInfo.label}
          </span>
          {project.is_featured && (
            <span className="inline-flex items-center gap-1 rounded-full bg-gold px-2.5 py-0.5 text-xs font-medium text-navy">
              <svg className="size-3" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              E vecante
            </span>
          )}
        </div>

        {/* Image count */}
        {project.images.length > 1 && (
          <span className="absolute bottom-2 right-2 rounded-md bg-navy/60 px-1.5 py-0.5 text-xs font-medium text-white backdrop-blur-sm">
            {project.images.length} foto
          </span>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Price */}
        <p className="text-lg font-bold tabular-nums text-navy">{priceText}</p>

        {/* Project name */}
        <h3 className="mt-1 truncate text-base font-semibold text-navy group-hover:text-terracotta">
          {project.project_name}
        </h3>

        {/* Developer */}
        <p className="mt-0.5 text-sm text-warm-gray">
          nga {project.developer_name}
        </p>

        {/* Details row */}
        <div className="mt-2.5 flex items-center gap-3 text-sm text-warm-gray">
          {/* Location */}
          {(project.neighborhood || project.city) && (
            <span className="flex items-center gap-1 truncate">
              <svg
                className="size-3.5 shrink-0"
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
              {[project.neighborhood, project.city].filter(Boolean).join(", ")}
            </span>
          )}

          {/* Units */}
          {project.units_available != null && (
            <span className="flex items-center gap-1">
              <svg
                className="size-3.5 shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5"
                />
              </svg>
              {project.units_available} njesi
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
