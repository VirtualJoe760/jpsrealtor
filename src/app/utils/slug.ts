// src\app\utils\slug.ts

/**
 * Generates a slug from a given name.
 * @param name - The name to generate a slug for.
 * @returns The slugified version of the name.
 */
export const generateSlug = (name: string): string => {
    return name
      .trim() // Remove leading/trailing whitespace
      .toLowerCase() // Convert to lowercase
      .replace(/[^\w\s-]/g, '') // Remove special characters except spaces and hyphens
      .replace(/\s+/g, '-'); // Replace spaces with hyphens
  };
  