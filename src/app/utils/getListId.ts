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
  console.log("📌 Resolved campaign list name:", listName);

  try {
    // Fetch available lists from SendFox
    const response = await fetch("https://api.sendfox.com/lists", {
      headers: {
        Authorization: `Bearer ${apiToken}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      console.error(`❌ Failed to fetch lists from SendFox. Status: ${response.status}`);
      return null;
    }

    const data: { data: { id: string; name: string }[] } = await response.json();

    console.log("📋 Available SendFox Lists:", data.data.map((l) => l.name));

    // Try to match the list name (case-insensitive)
    const list = data.data.find((item) => item.name.toLowerCase() === listName.toLowerCase());

    if (!list) {
      console.warn(`⚠️ List with name "${listName}" not found in SendFox.`);
      return null;
    }

    console.log(`✅ Matched SendFox List ID: ${list.id} for "${list.name}"`);
    return list.id;
  } catch (error) {
    console.error("💥 Error fetching list ID from SendFox:", error);
    return null;
  }
}
