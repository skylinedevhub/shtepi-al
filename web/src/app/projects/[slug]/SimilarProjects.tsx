import type { DeveloperProject } from "@/lib/types";
import ProjectCard from "../ProjectCard";

interface SimilarProjectsProps {
  projects: DeveloperProject[];
}

export default function SimilarProjects({ projects }: SimilarProjectsProps) {
  return (
    <section className="mt-16">
      <div className="mb-6 flex items-center gap-3">
        <h2 className="font-display text-xl font-bold text-navy">
          Projekte te ngjashme
        </h2>
        <span className="h-px flex-1 bg-warm-gray-light/40" />
      </div>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {projects.map((project) => (
          <ProjectCard key={project.id} project={project} />
        ))}
      </div>
    </section>
  );
}
