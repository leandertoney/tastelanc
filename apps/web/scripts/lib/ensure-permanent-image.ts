/**
 * Shared utility: download an external image URL and upload to Supabase Storage.
 *
 * Use this in every import script so that no temporary/external URL ever
 * reaches the `cover_image_url` column.
 *
 * Usage:
 *   import { ensurePermanentImageUrl, migrateImagesBatch } from './lib/ensure-permanent-image';
 *
 *   // Single restaurant (after insert when you have the ID):
 *   const permanentUrl = await ensurePermanentImageUrl(supabase, externalUrl, restaurantId);
 *
 *   // Batch (after bulk insert — pass inserted rows with their external URLs):
 *   await migrateImagesBatch(supabase, insertedRows);
 */

import type { SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_STORAGE_MARKER = 'supabase.co';
const STORAGE_BUCKET = 'images';
const RATE_LIMIT_MS = 200;

/**
 * Returns true if the URL is already a permanent Supabase Storage URL.
 */
export function isPermanentUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  return url.includes(SUPABASE_STORAGE_MARKER);
}

/**
 * Downloads an image from an external URL and uploads it to Supabase Storage.
 * Returns the permanent public URL, or null on failure.
 *
 * If the URL is already a Supabase Storage URL, returns it as-is (no re-upload).
 */
export async function ensurePermanentImageUrl(
  supabase: SupabaseClient,
  externalUrl: string | null | undefined,
  restaurantId: string,
): Promise<string | null> {
  if (!externalUrl) return null;
  if (isPermanentUrl(externalUrl)) return externalUrl;

  try {
    const res = await fetch(externalUrl, { signal: AbortSignal.timeout(15_000) });
    if (!res.ok) {
      console.log(`    ⚠ Image download failed (${res.status}) for ${restaurantId}`);
      return null;
    }

    const buffer = Buffer.from(await res.arrayBuffer());
    if (buffer.length < 1000) {
      console.log(`    ⚠ Image too small (${buffer.length}B), skipping ${restaurantId}`);
      return null;
    }

    // Detect content type from response headers, default to jpeg
    const contentType = res.headers.get('content-type') || 'image/jpeg';
    const ext = contentType.includes('png') ? 'png' : contentType.includes('webp') ? 'webp' : 'jpg';
    const fileName = `restaurants/${restaurantId}/cover.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(fileName, buffer, { contentType, upsert: true });

    if (uploadError) {
      console.log(`    ⚠ Upload error for ${restaurantId}: ${uploadError.message}`);
      return null;
    }

    const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(fileName);
    return data.publicUrl;
  } catch (err: any) {
    console.log(`    ⚠ Image migration error for ${restaurantId}: ${err.message}`);
    return null;
  }
}

/**
 * Batch-migrates external image URLs to Supabase Storage for a list of
 * inserted restaurant rows. Each row must have `id` and `cover_image_url`.
 *
 * Updates the DB row with the permanent URL after successful upload.
 * Returns count of migrated images.
 */
export async function migrateImagesBatch(
  supabase: SupabaseClient,
  rows: Array<{ id: string; name?: string; cover_image_url?: string | null }>,
): Promise<number> {
  let migrated = 0;
  const toMigrate = rows.filter(r => r.cover_image_url && !isPermanentUrl(r.cover_image_url));

  if (toMigrate.length === 0) return 0;

  console.log(`\n📸 Migrating ${toMigrate.length} images to permanent storage...`);

  for (const row of toMigrate) {
    const permanentUrl = await ensurePermanentImageUrl(supabase, row.cover_image_url, row.id);

    if (permanentUrl) {
      const { error } = await supabase
        .from('restaurants')
        .update({ cover_image_url: permanentUrl })
        .eq('id', row.id);

      if (error) {
        console.log(`    ⚠ DB update failed for ${row.name || row.id}: ${error.message}`);
      } else {
        console.log(`    ✓ ${row.name || row.id} → permanent`);
        migrated++;
      }
    }

    // Rate-limit external image downloads
    await new Promise(r => setTimeout(r, RATE_LIMIT_MS));
  }

  console.log(`📸 Image migration complete: ${migrated}/${toMigrate.length} succeeded\n`);
  return migrated;
}
