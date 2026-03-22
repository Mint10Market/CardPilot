import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireUser } from "@/lib/auth-server";
import { randomUUID } from "crypto";

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

function extForMime(mime: string): string {
  if (mime === "image/jpeg") return "jpg";
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  if (mime === "image/gif") return "gif";
  return "bin";
}

/**
 * POST /api/uploads/item-image — multipart field "file".
 * Requires Supabase Storage bucket (see DEPLOY.md). Returns { url } for use as primary_image_url / image_url.
 */
export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const bucket = process.env.SUPABASE_ITEM_IMAGES_BUCKET ?? "item-images";
    if (!url?.trim() || !key?.trim()) {
      return NextResponse.json(
        { error: "Image upload is not configured (set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY)" },
        { status: 503 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ error: "file required" }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "File too large (max 5MB)" }, { status: 400 });
    }
    const mime = file.type || "application/octet-stream";
    if (!ALLOWED.has(mime)) {
      return NextResponse.json({ error: "Only JPEG, PNG, WebP, or GIF allowed" }, { status: 400 });
    }

    const buf = Buffer.from(await file.arrayBuffer());
    const ext = extForMime(mime);
    const objectPath = `${user.id}/${randomUUID()}.${ext}`;

    const supabase = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { error: upErr } = await supabase.storage.from(bucket).upload(objectPath, buf, {
      contentType: mime,
      upsert: false,
    });
    if (upErr) {
      console.error("Supabase upload:", upErr);
      return NextResponse.json(
        { error: upErr.message || "Upload failed" },
        { status: 500 }
      );
    }

    const { data: pub } = supabase.storage.from(bucket).getPublicUrl(objectPath);
    if (!pub?.publicUrl) {
      return NextResponse.json({ error: "Could not resolve public URL for upload" }, { status: 500 });
    }

    return NextResponse.json({ url: pub.publicUrl, path: objectPath });
  } catch (e) {
    if (e instanceof Error && e.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Upload failed" },
      { status: 500 }
    );
  }
}
