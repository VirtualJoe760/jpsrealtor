/**
 * Trello API Integration Utilities
 * For managing DevOps tracking and task automation
 */

const TRELLO_API_BASE = 'https://api.trello.com/1';

interface TrelloCardData {
  name: string;
  desc?: string;
  idList: string;
  pos?: 'top' | 'bottom' | number;
  due?: string;
  labels?: string[];
}

interface TrelloCard {
  id: string;
  name: string;
  desc: string;
  url: string;
  idList: string;
  due: string | null;
  labels: Array<{
    id: string;
    name: string;
    color: string;
  }>;
}

/**
 * Create a new card in Trello
 */
export async function createTrelloCard(cardData: TrelloCardData): Promise<TrelloCard> {
  const url = new URL(`${TRELLO_API_BASE}/cards`);

  // Add authentication
  url.searchParams.append('key', process.env.TRELLO_API_KEY!);
  url.searchParams.append('token', process.env.TRELLO_TOKEN!);

  // Add card data
  url.searchParams.append('name', cardData.name);
  if (cardData.desc) url.searchParams.append('desc', cardData.desc);
  url.searchParams.append('idList', cardData.idList);
  if (cardData.pos) url.searchParams.append('pos', cardData.pos.toString());
  if (cardData.due) url.searchParams.append('due', cardData.due);

  const response = await fetch(url.toString(), {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to create Trello card: ${response.status} ${error}`);
  }

  return response.json();
}

/**
 * Get all lists on the board
 */
export async function getTrelloBoardLists() {
  const url = new URL(`${TRELLO_API_BASE}/boards/${process.env.TRELLO_BOARD_ID}/lists`);

  url.searchParams.append('key', process.env.TRELLO_API_KEY!);
  url.searchParams.append('token', process.env.TRELLO_TOKEN!);

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get Trello lists: ${response.status} ${error}`);
  }

  return response.json();
}

/**
 * Update a card (move to different list, update description, etc.)
 */
export async function updateTrelloCard(
  cardId: string,
  updates: Partial<TrelloCardData>
): Promise<TrelloCard> {
  const url = new URL(`${TRELLO_API_BASE}/cards/${cardId}`);

  url.searchParams.append('key', process.env.TRELLO_API_KEY!);
  url.searchParams.append('token', process.env.TRELLO_TOKEN!);

  // Add updates
  if (updates.name) url.searchParams.append('name', updates.name);
  if (updates.desc) url.searchParams.append('desc', updates.desc);
  if (updates.idList) url.searchParams.append('idList', updates.idList);
  if (updates.pos) url.searchParams.append('pos', updates.pos.toString());
  if (updates.due) url.searchParams.append('due', updates.due);

  const response = await fetch(url.toString(), {
    method: 'PUT',
    headers: {
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to update Trello card: ${response.status} ${error}`);
  }

  return response.json();
}

/**
 * Add a comment to a card
 */
export async function addCommentToCard(cardId: string, comment: string) {
  const url = new URL(`${TRELLO_API_BASE}/cards/${cardId}/actions/comments`);

  url.searchParams.append('key', process.env.TRELLO_API_KEY!);
  url.searchParams.append('token', process.env.TRELLO_TOKEN!);
  url.searchParams.append('text', comment);

  const response = await fetch(url.toString(), {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to add comment: ${response.status} ${error}`);
  }

  return response.json();
}

/**
 * Helper: Create a deployment card
 */
export async function createDeploymentCard(
  environment: 'development' | 'staging' | 'production',
  version: string,
  listId: string
) {
  const emoji = environment === 'production' ? '🚀' : environment === 'staging' ? '🔧' : '🛠️';

  return createTrelloCard({
    name: `${emoji} Deploy ${version} to ${environment}`,
    desc: `Automated deployment to ${environment} environment.\n\nVersion: ${version}\nTimestamp: ${new Date().toISOString()}`,
    idList: listId,
    pos: 'top',
  });
}

/**
 * Helper: Create a bug report card
 */
export async function createBugCard(
  title: string,
  description: string,
  listId: string,
  priority: 'high' | 'medium' | 'low' = 'medium'
) {
  const emoji = priority === 'high' ? '🔴' : priority === 'medium' ? '🟡' : '🟢';

  return createTrelloCard({
    name: `${emoji} Bug: ${title}`,
    desc: `**Priority:** ${priority.toUpperCase()}\n\n**Description:**\n${description}\n\n**Reported:** ${new Date().toLocaleString()}`,
    idList: listId,
    pos: 'top',
  });
}

/**
 * Helper: Create a feature request card
 */
export async function createFeatureCard(
  title: string,
  description: string,
  listId: string
) {
  return createTrelloCard({
    name: `✨ Feature: ${title}`,
    desc: `**Description:**\n${description}\n\n**Requested:** ${new Date().toLocaleString()}`,
    idList: listId,
    pos: 'bottom',
  });
}
