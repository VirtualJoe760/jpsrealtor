import axios from "axios";

export async function fetchSchoolsByCity(latitude: number, longitude: number): Promise<any[]> {
  const url = `/api/schools?latitude=${latitude}&longitude=${longitude}`;

  try {
    const response = await axios.get(url);

    // Log full response to debug

    return response.data.map((place: any) => {
      const photoReference = place.photos?.[0]?.photo_reference || null;

      // Log each school for debugging

      return {
        id: place.place_id,
        name: place.name,
        address: place.vicinity || "Address not available",
        rating: place.rating || null,
        photoReference,
      };
    });
  } catch (error) {
    console.error("Error fetching school data:", error);
    return [];
  }
}
