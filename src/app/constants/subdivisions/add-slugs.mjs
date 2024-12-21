import fs from 'fs/promises';
import path from 'path';

// Utility function to generate a slug
const generateSlug = (name) => {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^\w\s-]/g, '') // Remove special characters except spaces and hyphens
    .replace(/\s+/g, '-'); // Replace spaces with hyphens
};

// Path to the subdivisions directory
const dirPath = path.resolve('./');

// Function to add slugs to all JSON files in the directory
const addSlugsToAllFiles = async () => {
  try {
    // Read all files in the directory
    const files = await fs.readdir(dirPath);

    // Filter for JSON files
    const jsonFiles = files.filter((file) => file.endsWith('.json'));

    for (const file of jsonFiles) {
      const filePath = path.join(dirPath, file);
      
      // Read the JSON file
      const data = await fs.readFile(filePath, 'utf8');
      const subdivisions = JSON.parse(data);

      // Add slug field to each object
      const updatedSubdivisions = subdivisions.map((subdivision) => ({
        ...subdivision,
        slug: generateSlug(subdivision.name),
      }));

      // Write the updated JSON back to the file
      await fs.writeFile(filePath, JSON.stringify(updatedSubdivisions, null, 2), 'utf8');
      console.log(`Slugs added successfully to ${file}`);
    }
  } catch (error) {
    console.error('Error processing the JSON files:', error);
  }
};

// Execute the function
addSlugsToAllFiles();
