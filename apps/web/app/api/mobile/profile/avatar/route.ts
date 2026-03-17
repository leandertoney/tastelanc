import { NextResponse } from 'next/server';
import { createMobileClient } from '@/lib/supabase/mobile-auth';
import { createServiceRoleClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const BUCKET = 'images';
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

/**
 * POST /api/mobile/profile/avatar
 *
 * Body: { imageBase64: string, mimeType: string }
 * Auth: Bearer <supabase access token>
 *
 * Uploads the image to user-avatars/{userId}/{timestamp}.ext, updates
 * profiles.avatar_url, and removes the previous avatar file (if any).
 * Returns: { avatar_url: string }
 */
export async function POST(request: Request) {
  try {
    // 1. Authenticate via Bearer token
    const mobileClient = createMobileClient(request);
    if (!mobileClient) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: { user }, error: authError } = await mobileClient.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Parse & validate body
    const body = await request.json();
    const { imageBase64, mimeType } = body as { imageBase64?: string; mimeType?: string };

    if (!imageBase64 || typeof imageBase64 !== 'string') {
      return NextResponse.json({ error: 'imageBase64 is required' }, { status: 400 });
    }

    const resolvedMime =
      mimeType && ALLOWED_MIME_TYPES.includes(mimeType) ? mimeType : 'image/jpeg';

    const buffer = Buffer.from(imageBase64, 'base64');
    if (buffer.byteLength > MAX_SIZE_BYTES) {
      return NextResponse.json({ error: 'Image must be under 5 MB' }, { status: 400 });
    }

    const ext =
      resolvedMime === 'image/png' ? 'png' : resolvedMime === 'image/webp' ? 'webp' : 'jpg';
    const storagePath = `user-avatars/${user.id}/${Date.now()}.${ext}`;

    const serviceClient = createServiceRoleClient();

    // 3. Fetch existing avatar_url before overwriting (for cleanup)
    const { data: existing } = await serviceClient
      .from('profiles')
      .select('avatar_url')
      .eq('id', user.id)
      .single();

    // 4. Upload to Supabase Storage
    const { error: uploadError } = await serviceClient.storage
      .from(BUCKET)
      .upload(storagePath, buffer, { contentType: resolvedMime, upsert: false });

    if (uploadError) {
      console.error('Avatar storage upload error:', uploadError);
      return NextResponse.json({ error: 'Storage upload failed' }, { status: 500 });
    }

    // 5. Get the public URL
    const { data: { publicUrl } } = serviceClient.storage
      .from(BUCKET)
      .getPublicUrl(storagePath);

    // 6. Update profiles table
    const { error: updateError } = await serviceClient
      .from('profiles')
      .update({ avatar_url: publicUrl, updated_at: new Date().toISOString() })
      .eq('id', user.id);

    if (updateError) {
      console.error('Profile avatar_url update error:', updateError);
      // Storage succeeded — return URL anyway; log for investigation
    }

    // 7. Delete old avatar file from storage (best-effort, non-fatal)
    if (existing?.avatar_url) {
      try {
        const url = new URL(existing.avatar_url);
        // Path after /storage/v1/object/public/images/
        const pathMatch = url.pathname.match(/\/storage\/v1\/object\/public\/images\/(.+)/);
        if (pathMatch) {
          await serviceClient.storage.from(BUCKET).remove([pathMatch[1]]);
        }
      } catch {
        // Ignore cleanup errors — old file will remain but is harmless
      }
    }

    return NextResponse.json({ avatar_url: publicUrl });
  } catch (err) {
    console.error('Profile avatar route error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
