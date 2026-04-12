import { eq, and, gte, lte, sql, desc, asc } from "drizzle-orm";
import { cache } from "react";
import { getDb } from "./drizzle";
import { developerProjects } from "./schema";
import type { DeveloperProject, ProjectFilters, ProjectsResponse } from "../types";

type DbRow = typeof developerProjects.$inferSelect;

function dbRowToProject(row: DbRow): DeveloperProject {
  return {
    id: row.id,
    developer_name: row.developerName,
    project_name: row.projectName,
    slug: row.slug,
    description: row.description,
    project_type: row.projectType,
    status: row.status,
    city: row.city,
    neighborhood: row.neighborhood,
    address: row.address,
    latitude: row.latitude,
    longitude: row.longitude,
    price_from_eur: row.priceFromEur,
    price_to_eur: row.priceToEur,
    units_total: row.unitsTotal,
    units_available: row.unitsAvailable,
    completion_date: row.completionDate?.toISOString() ?? null,
    amenities: row.amenities as string[] | null,
    images: (row.images as string[]) ?? [],
    brochure_url: row.brochureUrl,
    contact_phone: row.contactPhone,
    contact_email: row.contactEmail,
    contact_whatsapp: row.contactWhatsapp,
    website: row.website,
    campaign_id: row.campaignId,
    is_featured: row.isFeatured ?? false,
    created_at: row.createdAt?.toISOString() ?? null,
    updated_at: row.updatedAt?.toISOString() ?? null,
  };
}

// --- Seed fallback data (when no DB is available) ---

const SEED_PROJECTS: DeveloperProject[] = [
  {
    id: "p001",
    developer_name: "Edil Al-It",
    project_name: "Residenca Panorama",
    slug: "residenca-panorama",
    description: "Kompleks modern rezidencial me pamje panoramike ndaj qytetit te Tiranes.",
    project_type: "apartment",
    status: "selling",
    city: "Tirane",
    neighborhood: "Blloku",
    address: "Rruga Ismail Qemali",
    latitude: 41.3275,
    longitude: 19.8187,
    price_from_eur: 85000,
    price_to_eur: 250000,
    units_total: 48,
    units_available: 12,
    completion_date: "2026-09-01T00:00:00.000Z",
    amenities: ["parking", "ashensor", "siguri 24/7", "kopesht"],
    images: [],
    brochure_url: null,
    contact_phone: "+355 69 123 4567",
    contact_email: "info@edilalit.al",
    contact_whatsapp: "+355691234567",
    website: "https://edilalit.al",
    campaign_id: null,
    is_featured: true,
    created_at: "2026-01-15T10:00:00.000Z",
    updated_at: "2026-01-15T10:00:00.000Z",
  },
  {
    id: "p002",
    developer_name: "Gener 2",
    project_name: "Green Valley Residence",
    slug: "green-valley-residence",
    description: "Banesa moderne ne zonen me te gjelbert te Durresit, afer plazhit.",
    project_type: "apartment",
    status: "selling",
    city: "Durres",
    neighborhood: "Plazh",
    address: "Lagjja 13",
    latitude: 41.3246,
    longitude: 19.4565,
    price_from_eur: 55000,
    price_to_eur: 180000,
    units_total: 96,
    units_available: 34,
    completion_date: "2026-06-01T00:00:00.000Z",
    amenities: ["parking", "pishine", "ashensor", "palestër"],
    images: [],
    brochure_url: null,
    contact_phone: "+355 68 234 5678",
    contact_email: "sales@gener2.al",
    contact_whatsapp: null,
    website: null,
    campaign_id: null,
    is_featured: true,
    created_at: "2026-02-01T10:00:00.000Z",
    updated_at: "2026-02-01T10:00:00.000Z",
  },
  {
    id: "p003",
    developer_name: "Mane TCI",
    project_name: "Vila Resort Vlore",
    slug: "vila-resort-vlore",
    description: "Vila luksoze ne bregdetin e Vlores me pamje ndaj detit Jon.",
    project_type: "villa",
    status: "under_construction",
    city: "Vlore",
    neighborhood: "Uji i Ftohte",
    address: "Rruga Nacionale Vlore-Sarande",
    latitude: 40.4487,
    longitude: 19.4916,
    price_from_eur: 220000,
    price_to_eur: 450000,
    units_total: 20,
    units_available: 8,
    completion_date: "2027-03-01T00:00:00.000Z",
    amenities: ["parking", "pishine private", "kopesht", "siguri 24/7"],
    images: [],
    brochure_url: null,
    contact_phone: "+355 67 345 6789",
    contact_email: "info@manetci.al",
    contact_whatsapp: "+355673456789",
    website: "https://manetci.al",
    campaign_id: null,
    is_featured: false,
    created_at: "2026-03-10T10:00:00.000Z",
    updated_at: "2026-03-10T10:00:00.000Z",
  },
];

function seedGetProjects(filters: ProjectFilters): ProjectsResponse {
  let filtered = [...SEED_PROJECTS];

  if (filters.city) filtered = filtered.filter((p) => p.city === filters.city);
  if (filters.project_type)
    filtered = filtered.filter((p) => p.project_type === filters.project_type);
  if (filters.status)
    filtered = filtered.filter((p) => p.status === filters.status);
  if (filters.price_min != null)
    filtered = filtered.filter(
      (p) => p.price_from_eur != null && p.price_from_eur >= filters.price_min!
    );
  if (filters.price_max != null)
    filtered = filtered.filter(
      (p) => p.price_to_eur != null && p.price_to_eur <= filters.price_max!
    );

  switch (filters.sort) {
    case "price_asc":
      filtered.sort((a, b) => (a.price_from_eur ?? 0) - (b.price_from_eur ?? 0));
      break;
    case "price_desc":
      filtered.sort((a, b) => (b.price_from_eur ?? 0) - (a.price_from_eur ?? 0));
      break;
    case "newest":
    default:
      filtered.sort(
        (a, b) =>
          new Date(b.created_at ?? 0).getTime() -
          new Date(a.created_at ?? 0).getTime()
      );
  }

  const page = filters.page ?? 1;
  const limit = filters.limit ?? 12;
  const offset = (page - 1) * limit;
  const paged = filtered.slice(offset, offset + limit);

  return {
    projects: paged,
    total: filtered.length,
    page,
    limit,
    has_more: offset + paged.length < filtered.length,
  };
}

function seedGetProjectBySlug(slug: string): DeveloperProject | null {
  return SEED_PROJECTS.find((p) => p.slug === slug) ?? null;
}

function seedGetFeaturedProjects(): DeveloperProject[] {
  return SEED_PROJECTS.filter((p) => p.is_featured);
}

// --- DB query functions ---

function buildProjectFilterConditions(filters: ProjectFilters) {
  const conditions: ReturnType<typeof eq>[] = [];

  if (filters.city) conditions.push(eq(developerProjects.city, filters.city));
  if (filters.project_type)
    conditions.push(eq(developerProjects.projectType, filters.project_type));
  if (filters.status)
    conditions.push(eq(developerProjects.status, filters.status));
  if (filters.price_min != null)
    conditions.push(gte(developerProjects.priceFromEur, filters.price_min));
  if (filters.price_max != null)
    conditions.push(lte(developerProjects.priceToEur, filters.price_max));

  return conditions;
}

export async function getProjects(
  filters: ProjectFilters
): Promise<ProjectsResponse> {
  const db = getDb();
  if (!db) return seedGetProjects(filters);

  const conditions = buildProjectFilterConditions(filters);
  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [countResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(developerProjects)
    .where(where);
  const total = Number(countResult.count);

  let orderByClause;
  switch (filters.sort) {
    case "price_asc":
      orderByClause = asc(sql`price_from_eur NULLS LAST`);
      break;
    case "price_desc":
      orderByClause = desc(sql`price_from_eur NULLS LAST`);
      break;
    case "newest":
    default:
      orderByClause = desc(developerProjects.createdAt);
  }

  const page = filters.page ?? 1;
  const limit = Math.min(filters.limit ?? 12, 100);
  const offset = (page - 1) * limit;

  const rows = await db
    .select()
    .from(developerProjects)
    .where(where)
    .orderBy(orderByClause)
    .limit(limit)
    .offset(offset);

  return {
    projects: rows.map(dbRowToProject),
    total,
    page,
    limit,
    has_more: offset + rows.length < total,
  };
}

export const getProjectBySlug = cache(async function getProjectBySlug(
  slug: string
): Promise<DeveloperProject | null> {
  const db = getDb();
  if (!db) return seedGetProjectBySlug(slug);

  const [row] = await db
    .select()
    .from(developerProjects)
    .where(eq(developerProjects.slug, slug));

  return row ? dbRowToProject(row) : null;
});

export async function getFeaturedProjects(): Promise<DeveloperProject[]> {
  const db = getDb();
  if (!db) return seedGetFeaturedProjects();

  const rows = await db
    .select()
    .from(developerProjects)
    .where(eq(developerProjects.isFeatured, true))
    .orderBy(desc(developerProjects.createdAt))
    .limit(6);

  return rows.map(dbRowToProject);
}

export async function getProjectById(
  id: string
): Promise<DeveloperProject | null> {
  const db = getDb();
  if (!db) return SEED_PROJECTS.find((p) => p.id === id) ?? null;

  const [row] = await db
    .select()
    .from(developerProjects)
    .where(eq(developerProjects.id, id));

  return row ? dbRowToProject(row) : null;
}
