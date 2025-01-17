import { getCampaignListId } from "./campaign";

/**
 * Retrieves the list ID for the given URL path or defaults to "jpsrealtor".
 * @param apiToken The API token for SendFox.
 * @param path The pathname to determine the campaign.
 * @returns The list ID or null if not found.
 */
export async function getListId(apiToken: string, path: string): Promise<string | null> {
  // Determine the list name based on the URL path
  const listName = getCampaignListId(path);

  try {
    const response = await fetch("https://api.sendfox.com/lists", {
      headers: {
        Authorization: `Bearer ${apiToken}`,
      },
    });

    if (!response.ok) {
      console.error("Failed to fetch lists:", response.statusText);
      return null;
    }

    const data = await response.json();
    const list = data.data.find((item: any) => item.name === listName);

    return list ? list.id : null;
  } catch (error) {
    console.error("Error fetching list ID:", error);
    return null;
  }
}
