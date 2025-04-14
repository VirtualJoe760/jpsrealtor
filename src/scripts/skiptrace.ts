import * as dotenv from "dotenv";
import axios from "axios";
import * as XLSX from "xlsx";
import { createObjectCsvWriter } from "csv-writer";
import fs from "fs";
import path from "path";

dotenv.config({ path: ".env.local" });

const API_KEY = process.env.PEOPLE_DATA_API_KEY;
const INPUT_FILE = path.join("src", "scripts", "data", "hot-emmcrhp.xlsx");
const OUTPUT_DIR = path.join("src", "scripts", "data", "skiptrace");
const OUTPUT_FILE = path.join(OUTPUT_DIR, "hot-emmcrhp-skiptraced.csv");

interface ContactRow {
  Owner1FirstName: string;
  Owner1LastName: string;
  PropertyCity: string;
  PropertyState?: string;
  PropertyZip?: string;
  MailZip?: string;
  [key: string]: any;
}

async function enrichPerson(row: ContactRow): Promise<{ email: string; phone: string }> {
  const {
    Owner1FirstName: first,
    Owner1LastName: last,
    PropertyCity: city,
    PropertyState = "CA",
    MailZip,
    PropertyZip,
  } = row;

  const location = `${city}, ${PropertyState} ${MailZip || PropertyZip || ""}`;

  const params = {
    api_key: API_KEY,
    first_name: first,
    last_name: last,
    location,
  };

  try {
    const response = await axios.get("https://api.peopledatalabs.com/v5/person/enrich", { params });
    const data = response.data?.data || {};
    const email = data.emails?.[0]?.address || "";
    const phone = data.phone_numbers?.[0]?.number || "";
    return { email, phone };
  } catch (err) {
    const error = err as { response?: any; message?: string };
    console.error(`Error enriching ${first} ${last}:`, error?.response?.data || error?.message || error);
    return { email: "", phone: "" };
  }
}

async function main() {
  const workbook = XLSX.readFile(INPUT_FILE);
  const sheetName = workbook.SheetNames[0];
  
  if (!sheetName) {
    throw new Error("❌ No sheet found in the workbook.");
  }

  const sheet = workbook.Sheets[sheetName];
  if (!sheet) throw new Error(`❌ Sheet "${sheetName}" could not be found.`);
  
  const rows: ContactRow[] = XLSX.utils.sheet_to_json(sheet as XLSX.WorkSheet);
  

  const enriched: ContactRow[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (!row || !row.Owner1FirstName || !row.Owner1LastName || !row.PropertyCity) continue;

    const { email, phone } = await enrichPerson(row);

    enriched.push({
      ...row,
      SkiptracedEmail: email,
      SkiptracedPhone: phone,
    });

    console.log(`[${i + 1}/${rows.length}] ${row.Owner1FirstName} ${row.Owner1LastName} → ${email} / ${phone}`);
    await new Promise((r) => setTimeout(r, 1500)); // throttle API calls
  }

  if (enriched.length === 0) {
    console.warn("⚠️ No rows were enriched. Skipping CSV export.");
    return;
  }

  // Ensure output directory exists
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const firstRow: Record<string, any> = enriched[0]!;
  const headers = Object.keys(firstRow).map((key) => ({
    id: key,
    title: key,
  }));

  const writer = createObjectCsvWriter({
    path: OUTPUT_FILE,
    header: headers,
  });

  await writer.writeRecords(enriched);
  console.log(`✅ Done! File written to ${OUTPUT_FILE}`);
}

main();
