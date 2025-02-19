import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' }); // Load .env.local

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_SECRET, // ✅ Uses your CLOUDINARY_SECRET
});

// Path to your post-photos folder (change if needed)
const IMAGE_FOLDER = './post-photos';

// Upload function
const uploadImages = async () => {
  const files = fs.readdirSync(IMAGE_FOLDER).filter(file => /\.(jpg|jpeg|png|webp)$/i.test(file));

  if (files.length === 0) {
    console.log('🚨 No images found to upload.');
    return;
  }

  console.log(`🚀 Uploading ${files.length} images to Cloudinary (/jpsrealtor/posts)...`);

  for (const file of files) {
    const filePath = path.join(IMAGE_FOLDER, file);

    try {
      const result = await cloudinary.uploader.upload(filePath, {
        folder: 'jpsrealtor/posts', // ✅ Uploading to the correct folder in Cloudinary
        use_filename: true,
        unique_filename: false,
      });

      console.log(`✅ Uploaded: ${file} → ${result.secure_url}`);
    } catch (error) {
      console.error(`❌ Error uploading ${file}:`, error);
    }
  }

  console.log('🎉 All uploads complete!');
};

// Run the script
uploadImages();
