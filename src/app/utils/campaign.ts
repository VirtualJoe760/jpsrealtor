// utils/campaign.ts

// Define the type for the campaigns object
type Campaigns = {
  [key: string]: string; // Allow string indexing
};

export const campaigns: Campaigns = {
  "direct-mail": "direct-mail",
  expired: "expired",
  "open-house": "open-house",
  "door-knocking": "door-knocking",
};

/**
 * Get the list ID based on the URL path.
 * @param path The pathname from the URL.
 * @returns The corresponding list ID or the default "jpsrealtor".
 */
export function getCampaignListId(path: string): string {
  // Extract the endpoint from the path (e.g., "direct-mail" from "/campaign/direct-mail")
  const endpoint = path.split("/").pop() || "";
  return campaigns[endpoint] || "jpsrealtor"; // Default to "jpsrealtor"
}
