import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getB2bUser } from "@/lib/b2b-user";

const PUBLIC_PATHS = ["/login"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // API key paths use a separate auth flow (see /api/v1/* routes).
  if (pathname.startsWith("/api/v1/")) return NextResponse.next();

  if (PUBLIC_PATHS.includes(pathname)) return NextResponse.next();

  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();

  if (!data.user) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  const b2bUser = await getB2bUser(data.user.id);
  if (!b2bUser) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt|public/).*)"],
};
