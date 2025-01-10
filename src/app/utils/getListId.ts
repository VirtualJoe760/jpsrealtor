export async function getListId(apiToken: string, listName: string): Promise<string | null> {
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
  }
  