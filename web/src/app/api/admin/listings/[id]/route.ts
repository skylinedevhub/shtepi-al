import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserProfile, updateListingStatus } from "@/lib/db/queries";
import { validateCsrf } from "@/lib/csrf";

async function verifyAdmin(): Promise<{ error?: NextResponse; userId?: string }> {
  const supabase = await createClient();
  if (!supabase) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const profile = await getUserProfile(user.id);
  if (!profile || (profile.role !== "admin" && profile.role !== "moderator")) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  return { userId: user.id };
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const csrfError = validateCsrf(request);
  if (csrfError) return csrfError;

  const { error: authError } = await verifyAdmin();
  if (authError) return authError;

  const { id } = await params;
  const body = await request.json();
  const { status, reason } = body as {
    status: "active" | "rejected";
    reason?: string;
  };

  if (!status || !["active", "rejected"].includes(status)) {
    return NextResponse.json(
      { error: "Invalid status" },
      { status: 400 }
    );
  }

  const metadata =
    status === "rejected" && reason
      ? { rejection_reason: reason, rejected_at: new Date().toISOString() }
      : status === "active"
        ? { approved_at: new Date().toISOString() }
        : undefined;

  const updated = await updateListingStatus(id, status, metadata);

  if (!updated) {
    return NextResponse.json(
      { error: "Listing not found" },
      { status: 404 }
    );
  }

  return NextResponse.json(updated);
}
