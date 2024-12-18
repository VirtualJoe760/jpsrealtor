const CLOUDINARY_URL = `https://api.cloudinary.com/v1_1/duqgao9h8/image/upload`;
const UPLOAD_PRESET = "ml_default"; // Replace with your Cloudinary upload preset name

/**
 * Upload files to Cloudinary and return their secure URLs.
 * @param files - A FileList or an array of File objects to upload.
 * @param folderName - The name of the folder to store the uploaded files.
 * @returns Promise<string[]> - An array of uploaded file URLs.
 */
export const uploadToCloudinary = async (
  files: FileList | File[],
  folderName: string
): Promise<string[]> => {
  const uploadedUrls: string[] = [];

  // Ensure files are valid
  if (!files || files.length === 0) return uploadedUrls;

  try {
    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      if (file) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("upload_preset", UPLOAD_PRESET);
        formData.append("folder", folderName); // Specify the dynamic folder name

        const response = await fetch(CLOUDINARY_URL, {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          console.error("Cloudinary Upload Failed:", await response.text());
          throw new Error(`Failed to upload file: ${file.name}`);
        }

        const data = await response.json();
        uploadedUrls.push(data.secure_url);
      }
    }
  } catch (error) {
    console.error("Error uploading to Cloudinary:", error);
    throw error;
  }

  return uploadedUrls;
};
