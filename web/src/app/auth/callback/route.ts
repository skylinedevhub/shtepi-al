import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";
  const type = searchParams.get("type");

  if (code) {
    const supabase = await createClient();
    if (supabase) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error) {
        // Recovery flow: redirect to reset-password page
        if (type === "recovery") {
          return NextResponse.redirect(`${origin}/auth/reset-password`);
        }

        // Email verification: redirect to home with verified param
        if (type === "signup") {
          return NextResponse.redirect(`${origin}/?verified=true`);
        }

        return NextResponse.redirect(`${origin}${next}`);
      }
    }
  }

  // Auth error — redirect to sign in with error
  return NextResponse.redirect(`${origin}/auth/signin?error=auth_callback_error`);
}
