import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import { createRateLimiter, getClientIp } from "@/lib/rate-limit";

// 5 registrations per IP per hour
const limiter = createRateLimiter({ limit: 5, windowMs: 60 * 60 * 1000 });

const registerSchema = z.object({
  name: z.string().min(2, "Emri duhet të ketë të paktën 2 karaktere"),
  email: z.string().email("Email i pavlefshëm"),
  password: z
    .string()
    .min(8, "Fjalëkalimi duhet të ketë të paktën 8 karaktere"),
});

export async function POST(request: NextRequest) {
  const ip = getClientIp(request.headers);
  const { success, remaining, resetMs } = limiter.check(ip);

  if (!success) {
    return NextResponse.json(
      { error: "Shumë kërkesa. Provoni përsëri më vonë." },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.ceil(resetMs / 1000)),
          "X-RateLimit-Remaining": "0",
        },
      }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Kërkesë e pavlefshme" },
      { status: 400, headers: { "X-RateLimit-Remaining": String(remaining) } }
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

  const supabase = await createClient();
  if (!supabase) {
    return NextResponse.json(
      { error: "Auth service unavailable" },
      { status: 503 }
    );
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: name,
      },
    },
  });

  if (error) {
    if (error.message.includes("already registered")) {
      return NextResponse.json(
        { error: "Ky email është i regjistruar tashmë" },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json(
    {
      user: {
        id: data.user?.id,
        email: data.user?.email,
        name,
      },
    },
    { status: 201 }
  );
}
