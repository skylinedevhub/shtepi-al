import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { auth } from "@/lib/auth";
import { users } from "@/lib/db/schema";
import { z } from "zod";

const updateProfileSchema = z.object({
  name: z.string().min(2).max(255).optional(),
  phone: z.string().max(50).optional(),
});

function getProfileDb() {
  const url = process.env.DATABASE_URL;
  if (!url) return null;
  return drizzle(neon(url));
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "Duhet të jeni i kyçur" },
      { status: 401 }
    );
  }

  const db = getProfileDb();
  if (!db) {
    return NextResponse.json(
      { error: "Databaza nuk është e disponueshme" },
      { status: 503 }
    );
  }

  const [user] = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      phone: users.phone,
      role: users.role,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(eq(users.id, session.user.id));

  if (!user) {
    return NextResponse.json(
      { error: "Përdoruesi nuk u gjet" },
      { status: 404 }
    );
  }

  return NextResponse.json({ user });
}

export async function PUT(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "Duhet të jeni i kyçur" },
      { status: 401 }
    );
  }

  const db = getProfileDb();
  if (!db) {
    return NextResponse.json(
      { error: "Databaza nuk është e disponueshme" },
      { status: 503 }
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

  const result = updateProfileSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      { error: result.error.issues[0].message },
      { status: 400 }
    );
  }

  await db
    .update(users)
    .set({ ...result.data, updatedAt: new Date() })
    .where(eq(users.id, session.user.id));

  return NextResponse.json({ message: "Profili u përditësua me sukses" });
}
