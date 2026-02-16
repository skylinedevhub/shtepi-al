import { z } from "zod";

export const listingCreateSchema = z.object({
  title: z.string().min(5, "Titulli duhet të ketë të paktën 5 karaktere").max(200),
  description: z.string().max(5000).optional(),
  price: z.number().positive("Çmimi duhet të jetë pozitiv").optional(),
  currency_original: z.enum(["EUR", "ALL"]).default("EUR"),
  price_period: z.enum(["total", "monthly"]).default("total"),
  transaction_type: z.enum(["sale", "rent"], {
    required_error: "Zgjidhni llojin e transaksionit",
  }),
  property_type: z
    .enum(["apartment", "house", "villa", "land", "commercial", "garage", "studio"])
    .optional(),
  room_config: z.string().max(20).optional(),
  area_sqm: z.number().positive().optional(),
  floor: z.number().int().min(-2).max(100).optional(),
  total_floors: z.number().int().min(1).max(100).optional(),
  rooms: z.number().int().min(0).max(50).optional(),
  bathrooms: z.number().int().min(0).max(20).optional(),
  city: z.string().max(100).optional(),
  neighborhood: z.string().max(200).optional(),
  address_raw: z.string().max(500).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  has_elevator: z.boolean().optional(),
  has_parking: z.boolean().optional(),
  is_furnished: z.boolean().optional(),
  is_new_build: z.boolean().optional(),
  poster_name: z.string().max(200).optional(),
  poster_phone: z.string().max(50).optional(),
  images: z.array(z.string().url()).max(20).default([]),
});

export const listingUpdateSchema = listingCreateSchema.partial();

export type ListingCreateInput = z.infer<typeof listingCreateSchema>;
export type ListingUpdateInput = z.infer<typeof listingUpdateSchema>;
