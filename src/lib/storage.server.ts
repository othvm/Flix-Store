import { createClient } from "@supabase/supabase-js";

export function getSupabaseServerClient() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in the environment.");
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export const CATALOG_BUCKET_NAME = "catalog-images";
export const MAX_IMAGE_SIZE = 2 * 1024 * 1024; // 2MB
export const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

/**
 * Validates binary magic bytes to guarantee file matches declared MIME type.
 */
export function validateImageMagicBytes(buffer: Buffer | Uint8Array, contentType: string) {
  if (buffer.byteLength < 12) {
    throw new Error("ملف الصورة تالف أو صغير جداً.");
  }

  const b = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);

  if (contentType === "image/jpeg") {
    if (b[0] !== 0xff || b[1] !== 0xd8 || b[2] !== 0xff) {
      throw new Error("محتوى الملف لا يطابق صيغة JPEG صالحة.");
    }
  } else if (contentType === "image/png") {
    if (
      b[0] !== 0x89 ||
      b[1] !== 0x50 ||
      b[2] !== 0x4e ||
      b[3] !== 0x47 ||
      b[4] !== 0x0d ||
      b[5] !== 0x0a ||
      b[6] !== 0x1a ||
      b[7] !== 0x0a
    ) {
      throw new Error("محتوى الملف لا يطابق صيغة PNG صالحة.");
    }
  } else if (contentType === "image/webp") {
    const riff = b.toString("ascii", 0, 4);
    const webp = b.toString("ascii", 8, 12);
    if (riff !== "RIFF" || webp !== "WEBP") {
      throw new Error("محتوى الملف لا يطابق صيغة WebP صالحة.");
    }
  }
}

/**
 * Extracts storage path if the URL points to our Supabase Storage bucket.
 * Returns null if it is a local static asset (e.g. /assets/games/...) or external URL.
 */
export function extractStoragePathFromUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const marker = `/storage/v1/object/public/${CATALOG_BUCKET_NAME}/`;
  const idx = url.indexOf(marker);
  if (idx !== -1) {
    return url.slice(idx + marker.length);
  }
  return null;
}

/**
 * Uploads a catalog image to the Supabase Storage public bucket `catalog-images`.
 */
export async function uploadCatalogImage({
  fileBuffer,
  filename,
  contentType,
}: {
  fileBuffer: Buffer | Uint8Array;
  filename: string;
  contentType: string;
}) {
  if (!ALLOWED_IMAGE_TYPES.has(contentType)) {
    throw new Error(`Unsupported file type: ${contentType}. Allowed types: JPEG, PNG, WebP.`);
  }

  if (fileBuffer.byteLength > MAX_IMAGE_SIZE) {
    throw new Error("File exceeds 2MB limit.");
  }

  validateImageMagicBytes(fileBuffer, contentType);

  // Generate safe filename with crypto UUID to prevent collision and cache issues
  const cleanExt = filename.split(".").pop()?.toLowerCase() || "webp";
  const safeBase = filename
    .replace(/\.[^/.]+$/, "")
    .replace(/[^a-zA-Z0-9_-]/g, "_")
    .slice(0, 30);
  const randomSuffix = crypto.randomUUID().slice(0, 8);
  const path = `${safeBase}-${randomSuffix}.${cleanExt}`;

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase.storage
    .from(CATALOG_BUCKET_NAME)
    .upload(path, fileBuffer, {
      contentType,
      upsert: false,
    });

  if (error) {
    throw new Error(`Failed to upload image: ${error.message}`);
  }

  const { data: publicUrlData } = supabase.storage
    .from(CATALOG_BUCKET_NAME)
    .getPublicUrl(data.path);

  return {
    path: data.path,
    publicUrl: publicUrlData.publicUrl,
  };
}

/**
 * Deletes a catalog image from the Supabase Storage bucket by path.
 */
export async function deleteCatalogImage(path: string) {
  if (!path) return;
  const supabase = getSupabaseServerClient();
  const { error } = await supabase.storage.from(CATALOG_BUCKET_NAME).remove([path]);
  if (error) {
    console.warn(`Failed to delete image at path ${path}:`, error.message);
  }
}

/**
 * Safely removes an old image URL only if it belongs to Supabase Storage.
 * Never deletes local or default asset paths.
 */
export async function safeDeleteOldImage(oldUrl: string | null | undefined) {
  const path = extractStoragePathFromUrl(oldUrl);
  if (path) {
    await deleteCatalogImage(path);
  }
}
