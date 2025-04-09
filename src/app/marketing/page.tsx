import { NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_SECRET,
});

export async function POST(req: Request) {
  const { folderName } = await req.json();

  if (!folderName) {
    return NextResponse.json({ error: 'Missing folderName' }, { status: 400 });
  }

  try {
    // Search for existing files in the folder
    const searchResult = await cloudinary.search
      .expression(`folder:${folderName}`)
      .max_results(1)
      .execute();

    if (searchResult.total_count > 0) {
      return NextResponse.json({ success: true, message: 'Folder already exists' });
    }

    // If folder is empty/non-existent, upload a tiny 1x1 transparent gif
    await cloudinary.uploader.upload(
      'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==',
      {
        public_id: `${folderName}/.placeholder`,
        resource_type: 'image',
        overwrite: true,
      }
    );

    return NextResponse.json({ success: true, message: 'Folder created' });
  } catch (error) {
    console.error('Cloudinary error:', error);
    return NextResponse.json({ error: 'Cloudinary API failed' }, { status: 500 });
  }
}
