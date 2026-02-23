
import { put } from '@vercel/blob';
import { NextResponse } from 'next/server';

export async function POST(request) {
  const { searchParams } = new URL(request.url);
  const filename = searchParams.get('filename') || 'image.jpg';

  console.log("Upload request initiated. Token present:", !!process.env.BLOB_READ_WRITE_TOKEN);

  // Le o corpo como FormData
  const formData = await request.formData();
  const file = formData.get('file');

  if (!file) {
    return NextResponse.json({ error: 'No files received.' }, { status: 400 });
  }

  try {
    const blob = await put(filename, file, {
      access: 'public',
    });

    console.log("✅ Upload bem-sucedido:", blob.url);
    return NextResponse.json(blob);
  } catch (error) {
    console.error("❌ Erro detalhado no Upload Vercel Blob:", error);
    console.error("Stack:", error.stack);
    return NextResponse.json(
      { error: error.message, details: error.toString() },
      { status: 500 }
    );
  }
}
