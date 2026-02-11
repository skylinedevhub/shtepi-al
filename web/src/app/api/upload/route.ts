import { NextRequest, NextResponse } from "next/server";
import { put, del } from "@vercel/blob";
import { auth } from "@/lib/auth";

const MAX_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "Duhet të jeni i kyçur" },
      { status: 401 }
    );
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json(
      { error: "Asnjë skedar nuk u ngarkua" },
      { status: 400 }
    );
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: "Vetëm imazhe JPEG, PNG ose WebP lejohen" },
      { status: 400 }
    );
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json(
      { error: "Skedari duhet të jetë më i vogël se 5MB" },
      { status: 400 }
    );
  }

  const ext = file.name.split(".").pop() ?? "jpg";
  const path = `listings/${session.user.id}/${Date.now()}.${ext}`;

  const blob = await put(path, file, {
    access: "public",
    contentType: file.type,
  });

  return NextResponse.json({ url: blob.url, path });
}

export async function DELETE(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "Duhet të jeni i kyçur" },
      { status: 401 }
    );
  }

  const { url } = await request.json();
  if (!url) {
    return NextResponse.json(
      { error: "URL e skedarit mungon" },
      { status: 400 }
    );
  }

  await del(url);
  return NextResponse.json({ success: true });
}
