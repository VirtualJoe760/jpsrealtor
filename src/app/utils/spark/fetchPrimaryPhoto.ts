// src/app/utils/spark/fetchPrimaryPhoto.ts

export async function fetchPrimaryPhotoUrl(listingId: string): Promise<string> {
  try {
    const res = await fetch(`/api/photos/${listingId}`);
    const data = await res.json();
    return data?.uri300 || "/images/no-photo.png";
  } catch (err) {
    return "/images/no-photo.png";
  }
}
