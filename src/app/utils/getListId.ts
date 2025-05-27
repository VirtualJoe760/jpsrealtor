/**
 * Retrieves the list ID for "jpsrealtor" from SendFox.
 * @param apiToken The API token for SendFox.
 * @returns The list ID or null if not found.
 */
export async function getListId(apiToken: string): Promise<string | null> {
  const targetListName = "jpsrealtor";
  console.log("🔍 Looking for SendFox list:", targetListName);

  try {
    const response = await fetch("https://api.sendfox.com/lists", {
      headers: {
        Authorization: `Bearer ${apiToken}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      console.error(`❌ Failed to fetch lists. Status: ${response.status}`);
      const errorText = await response.text();
      console.error("📨 Response body:", errorText);
      return null;
    }

    const data: { data: { id: string; name: string }[] } = await response.json();

    console.log("📋 Lists fetched:", data.data.map((list) => list.name));

    const list = data.data.find((l) => l.name.toLowerCase() === targetListName.toLowerCase());

    if (!list) {
      console.warn(`⚠️ List "${targetListName}" not found in SendFox.`);
      return null;
    }

    console.log(`✅ Found list "${targetListName}" with ID: ${list.id}`);
    return list.id;
  } catch (error) {
    console.error("💥 Error contacting SendFox:", error);
    return null;
  }
}
