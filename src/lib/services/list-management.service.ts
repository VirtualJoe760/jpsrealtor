/**
 * Label Management Service (List Management)
 *
 * Handles contact label (list) operations for the CRM system.
 * Used by chat-based import to assign contacts to labels.
 * Note: The system uses "labels" internally but "lists" in user-facing language.
 */

import Label, { ILabel } from '@/models/Label';
import connectDB from '@/lib/mongodb';
import type { Types } from 'mongoose';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface UserList {
  _id: string;
  name: string;
  contactCount?: number;
  createdAt?: Date;
}

// ============================================================================
// LIST OPERATIONS
// ============================================================================

/**
 * Get all available lists for user
 *
 * @param userId - Optional user ID for filtering (future enhancement)
 * @returns Array of lists with basic info
 */
export async function getUserLists(userId?: string): Promise<UserList[]> {
  await connectDB();

  // @ts-expect-error Mongoose typing issue with overloaded signatures
  const lists = await Label.find({ isArchived: false })
    .select('_id name contactCount createdAt')
    .sort({ name: 1 })
    .lean();

  return lists.map((list: any) => ({
    _id: list._id.toString(),
    name: list.name,
    contactCount: list.contactCount || 0,
    createdAt: list.createdAt,
  }));
}

/**
 * Create a new list
 *
 * @param name - List name
 * @param userId - Optional user ID (future enhancement)
 * @returns ID of created list
 */
export async function createList(name: string, userId?: string): Promise<string> {
  await connectDB();

  // Check if list with this name already exists
  // @ts-expect-error Mongoose typing issue with overloaded signatures
  const existing = await Label.findOne({ name, isArchived: false });
  if (existing) {
    return existing._id.toString();
  }

  // @ts-expect-error Mongoose typing issue with overloaded signatures
  const list = await Label.create({
    name,
    contactCount: 0,
    isSystem: false,
    isArchived: false,
    color: '#3B82F6', // Default blue
  });

  return list._id.toString();
}

/**
 * Check if list exists by name
 *
 * @param name - List name to search for
 * @returns List ID if found, null otherwise
 */
export async function findListByName(name: string): Promise<string | null> {
  await connectDB();

  // @ts-expect-error Mongoose typing issue with overloaded signatures
  const list = await Label.findOne({ name, isArchived: false }).select('_id');
  return list ? list._id.toString() : null;
}

/**
 * Get list by ID
 *
 * @param listId - List ID
 * @returns List info or null if not found
 */
export async function getListById(listId: string): Promise<UserList | null> {
  await connectDB();

  // @ts-expect-error Mongoose typing issue with overloaded signatures
  const list = await Label.findById(listId)
    .select('_id name contactCount createdAt')
    .lean();

  if (!list) return null;

  return {
    _id: list._id.toString(),
    name: list.name,
    contactCount: list.contactCount || 0,
    createdAt: list.createdAt,
  };
}

/**
 * Update list contact count
 *
 * @param listId - List ID
 * @param increment - Number to increment count by
 */
export async function updateListCount(listId: string, increment: number): Promise<void> {
  await connectDB();

  // @ts-expect-error Mongoose typing issue with overloaded signatures
  await Label.findByIdAndUpdate(listId, {
    $inc: { contactCount: increment },
  });
}

/**
 * Format lists for chat display
 *
 * @param lists - Array of lists
 * @returns Formatted string for chat
 */
export function formatListsForChat(lists: UserList[]): string {
  if (lists.length === 0) {
    return 'No lists found. You can create a new one by saying "Create list: [name]"';
  }

  let formatted = 'Available lists:\n';
  lists.forEach((list, index) => {
    formatted += `${index + 1}. ${list.name} (${list.contactCount || 0} contacts)\n`;
  });
  formatted += '\nYou can also create a new list by saying "Create list: [name]"';

  return formatted;
}

/**
 * Get user lists tool wrapper for Groq
 * This is for the chat-based import workflow
 */
export async function getUserListsTool(): Promise<{ lists: UserList[]; formatted: string }> {
  const lists = await getUserLists();
  const formatted = formatListsForChat(lists);
  
  return {
    lists,
    formatted,
  };
}
