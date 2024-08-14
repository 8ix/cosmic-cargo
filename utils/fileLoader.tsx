import fs from 'fs';
import path from 'path';

export function loadJSONFile<T>(filename: string): T {
  const filePath = path.join(process.cwd(), 'content', filename);
  const data = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(data) as T;
}