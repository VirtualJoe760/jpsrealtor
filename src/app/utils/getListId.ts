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
    // Fetch available lists from SendFox
    const response = await fetch("https://api.sendfox.com/lists", {
      headers: {
        Authorization: `Bearer ${apiToken}`,
        "Content-Type": "application/json",
      },
    });

    // Handle errors if the response is not OK
    if (!response.ok) {
      console.error(`Failed to fetch lists from SendFox. Status: ${response.status}`);
      return null;
    }

    const data: { data: { id: string; name: string }[] } = await response.json();

    // Find the list matching the resolved name
    const list = data.data.find((item) => item.name === listName);

    if (!list) {
      console.warn(`List with name "${listName}" not found in SendFox.`);
      return null;
    }

    return list.id;
  } catch (error) {
    console.error("Error fetching list ID from SendFox:", error);
    return null;
  }
}