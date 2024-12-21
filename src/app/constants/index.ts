import { readdirSync } from 'fs';
import { join } from 'path';

// Define the structure of your JSON data
interface CommunityData {
  [key: string]: Record<string, unknown>;
}

// Function to dynamically import JSON files
const importJsonFiles = async (folderPath: string): Promise<CommunityData> => {
  const directory = join(__dirname, folderPath);
  const files = readdirSync(directory).filter((file) => file.endsWith('.json'));
  const data: CommunityData = {};

  for (const file of files) {
    const fileName = file.replace('.json', '');
    const filePath = join(directory, file);
    data[fileName] = await import(filePath);
  }

  return data;
};

// Load HOA and general JSON files
const loadHOAData = async (): Promise<CommunityData> => await importJsonFiles('./hoa');
const loadGeneralData = async (): Promise<CommunityData> => await importJsonFiles('./json');

// Helper function to fetch specific community data
export const getCommunityData = async (
  city: string,
  isHoa: boolean = false
): Promise<Record<string, unknown>> => {
  const data = isHoa ? await loadHOAData() : await loadGeneralData();
  if (!data[city]) throw new Error(`Data for city "${city}" not found.`);
  return data[city];
};

// Export dynamic loaders
export { loadHOAData, loadGeneralData };
