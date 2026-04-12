"use client";

import { useState, useRef } from "react";
import type { DeveloperProject } from "@/lib/types";
import ProjectCard from "./ProjectCard";

interface FeaturedCarouselProps {
  projects: DeveloperProject[];
}

export default function FeaturedCarousel({ projects }: FeaturedCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(projects.length > 1);

  function updateScrollState() {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 10);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 10);
  }

  function scrollBy(direction: "left" | "right") {
    const el = scrollRef.current;
    if (!el) return;
    const amount = el.clientWidth * 0.8;
    el.scrollBy({
      left: direction === "left" ? -amount : amount,
      behavior: "smooth",
    });
  }

  return (
    <div className="relative">
      {/* Scroll container */}
      <div
        ref={scrollRef}
        onScroll={updateScrollState}
        className="scrollbar-hide flex gap-6 overflow-x-auto pb-2"
        style={{ scrollSnapType: "x mandatory" }}
      >
        {projects.map((project) => (
          <div
            key={project.id}
            className="w-[340px] shrink-0 sm:w-[380px]"
            style={{ scrollSnapAlign: "start" }}
          >
            <ProjectCard project={project} />
          </div>
        ))}
      </div>

      {/* Scroll arrows */}
      {canScrollLeft && (
        <button
          onClick={() => scrollBy("left")}
          aria-label="Shko majtas"
          className="absolute -left-3 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white p-2.5 shadow-lg transition hover:bg-cream"
        >
          <svg
            className="size-5 text-navy"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </button>
      )}
      {canScrollRight && (
        <button
          onClick={() => scrollBy("right")}
          aria-label="Shko djathtas"
          className="absolute -right-3 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white p-2.5 shadow-lg transition hover:bg-cream"
        >
          <svg
            className="size-5 text-navy"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
        </button>
      )}
    </div>
  );
}
