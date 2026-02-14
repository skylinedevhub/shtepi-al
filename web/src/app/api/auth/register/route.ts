import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const registerSchema = z.object({
  name: z.string().min(2, "Emri duhet të ketë të paktën 2 karaktere"),
  email: z.string().email("Email i pavlefshëm"),
  password: z
    .string()
    .min(8, "Fjalëkalimi duhet të ketë të paktën 8 karaktere"),
});

export async function POST(request: NextRequest) {
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

  const supabase = await createClient();

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
