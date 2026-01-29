
import { put } from '@vercel/blob';
import { NextResponse } from 'next/server';

export async function POST(request) {
  const { searchParams } = new URL(request.url);
  const filename = searchParams.get('filename') || 'image.jpg';

  console.log("Upload request initiated. Token present:", !!process.env.BLOB_READ_WRITE_TOKEN);

  // Le o corpo como Blob/Buffer
  // Note: Em App Router Route Handlers, request.body é um ReadableStream ou podemos usar formData()

  const formData = await request.formData();
  const file = formData.get('file');

  if (!file) {
    return NextResponse.json({ error: 'No files received.' }, { status: 400 });
  }

  const blob = await put(filename, file, {
    access: 'public',
  });

  return NextResponse.json(blob);
}
