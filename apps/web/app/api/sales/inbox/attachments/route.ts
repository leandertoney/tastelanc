import { NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { verifySalesAccess } from '@/lib/auth/sales-access';
import { ALLOWED_ATTACHMENT_TYPES, MAX_FILE_SIZE } from '@/lib/types/attachments';

const ALLOWED_EXTENSIONS_SET = new Set([
  'pdf', 'jpg', 'jpeg', 'png', 'webp', 'gif',
  'doc', 'docx', 'xls', 'xlsx', 'csv', 'txt',
]);

function isAllowedFile(file: File): boolean {
  if (file.type && ALLOWED_ATTACHMENT_TYPES.has(file.type)) return true;
  const ext = file.name.split('.').pop()?.toLowerCase();
  return ext ? ALLOWED_EXTENSIONS_SET.has(ext) : false;
}

function getContentType(file: File): string {
  if (file.type) return file.type;
  const ext = file.name.split('.').pop()?.toLowerCase();
  const mimeMap: Record<string, string> = {
    pdf: 'application/pdf', jpg: 'image/jpeg', jpeg: 'image/jpeg',
    png: 'image/png', webp: 'image/webp', gif: 'image/gif',
    doc: 'application/msword', csv: 'text/csv', txt: 'text/plain',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xls: 'application/vnd.ms-excel',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  };
  return (ext && mimeMap[ext]) || 'application/octet-stream';
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const access = await verifySalesAccess(supabase);

    if (!access.canAccess) {
      return NextResponse.json(
        { error: access.error },
        { status: access.userId ? 403 : 401 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!isAllowedFile(file)) {
      return NextResponse.json(
        { error: 'File type not allowed. Supported: PDF, images, DOC/DOCX, XLS/XLSX, CSV, TXT.' },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 10MB per file.' },
        { status: 400 }
      );
    }

    const serviceClient = createServiceRoleClient();
    const contentType = getContentType(file);
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = `email-attachments/${access.userId}/${Date.now()}-${sanitizedName}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { error: uploadError } = await serviceClient.storage
      .from('images')
      .upload(storagePath, buffer, {
        contentType,
        upsert: false,
      });

    if (uploadError) {
      console.error('Attachment upload error:', JSON.stringify(uploadError));
      return NextResponse.json({ error: `Failed to upload file: ${uploadError.message}` }, { status: 500 });
    }

    const { data: urlData } = serviceClient.storage
      .from('images')
      .getPublicUrl(storagePath);

    return NextResponse.json({
      url: urlData.publicUrl,
      filename: file.name,
      size: file.size,
      contentType,
    });
  } catch (error) {
    console.error('Error in attachment upload:', error);
    return NextResponse.json({ error: `Internal server error: ${error instanceof Error ? error.message : String(error)}` }, { status: 500 });
  }
}
