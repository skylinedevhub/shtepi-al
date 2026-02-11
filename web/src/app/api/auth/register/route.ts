import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { users } from "@/lib/db/schema";

const registerSchema = z.object({
  name: z.string().min(2, "Emri duhet të ketë të paktën 2 karaktere"),
  email: z.string().email("Email i pavlefshëm"),
  password: z
    .string()
    .min(8, "Fjalëkalimi duhet të ketë të paktën 8 karaktere"),
});

export async function POST(request: NextRequest) {
  const url = process.env.DATABASE_URL;
  if (!url) {
    return NextResponse.json(
      { error: "Serveri nuk është konfiguruar" },
      { status: 500 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Kërkesë e pavlefshme" },
      { status: 400 }
    );
  }

  const result = registerSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      { error: result.error.issues[0].message },
      { status: 400 }
    );
  }

  const { name, email, password } = result.data;

  const sql = neon(url);
  const db = drizzle(sql);

  // Check if user already exists
  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email));

  if (existing) {
    return NextResponse.json(
      { error: "Ky email është i regjistruar tashmë" },
      { status: 409 }
    );
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  const [newUser] = await db
    .insert(users)
    .values({
      name,
      email,
      hashedPassword,
      role: "user",
    })
    .returning({ id: users.id, email: users.email, name: users.name });

  return NextResponse.json(
    { user: { id: newUser.id, email: newUser.email, name: newUser.name } },
    { status: 201 }
  );
}
