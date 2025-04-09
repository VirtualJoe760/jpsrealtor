import { NextRequest } from 'next/server';
import { IncomingForm, type Fields, type Files } from 'formidable';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { exec } from 'child_process';
import { promisify } from 'util';
import archiver from 'archiver';

export const config = {
  api: {
    bodyParser: false,
  },
};

const execAsync = promisify(exec);

export async function POST(req: NextRequest) {
  const uploadDir = path.join(os.tmpdir(), `marketing-${Date.now()}`);
  await fs.mkdir(uploadDir, { recursive: true });

  const form = new IncomingForm({ multiples: true, uploadDir, keepExtensions: true });

  const formData = await new Promise<{ fields: Fields; files: Files }>((resolve, reject) => {
    form.parse(req as any, (err: any, fields: Fields, files: Files) => {
      if (err) reject(err);
      else resolve({ fields, files });
    });
  });

  const { fields, files } = formData;

  const getFilePath = (fileObj: any): string => {
    const file = Array.isArray(fileObj) ? fileObj[0] : fileObj;
    return file?.filepath || '';
  };

  const csvPath = getFilePath(files.csv);
  const qrPath = getFilePath(files.qr);
  const backgroundPath = getFilePath(files.background);
  const aboutPath = getFilePath(files.about);

  const letterBodyInput = fields.letter_body;
  const letterText = (
    Array.isArray(letterBodyInput) ? letterBodyInput[0] : letterBodyInput
  ) ?? '';
  const safeLetterText = String(letterText);

  const outputPath = path.join(uploadDir, 'output');
  await fs.mkdir(outputPath, { recursive: true });

  try {
    const letterCmd = `python3 src/scripts/generate_letters.py \
--csv "${csvPath}" \
--output "${outputPath}" \
--qr "${qrPath}" \
--background "${backgroundPath}" \
--about "${aboutPath}" \
--letter_text "${safeLetterText.replace(/\"/g, '\\\"')}"`;

    const labelCmd = `python3 src/scripts/generate_labels.py \
--csv "${csvPath}" \
--output "${path.join(outputPath, 'return-labels.pdf')}"`;

    await execAsync(letterCmd);
    await execAsync(labelCmd);
  } catch (err) {
    console.error('❌ Python script failed:', err);
    return new Response('Python script execution failed', { status: 500 });
  }

  const zipPath = path.join(uploadDir, 'marketing-package.zip');
  const archive = archiver('zip', { zlib: { level: 9 } });
  const output = await fs.open(zipPath, 'w');
  const zipStream = output.createWriteStream();

  archive.pipe(zipStream);
  archive.directory(outputPath, false);
  await archive.finalize();
  await zipStream.close();

  const zipBuffer = await fs.readFile(zipPath);
  return new Response(zipBuffer, {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': 'attachment; filename="marketing-package.zip"',
    },
  });
}
