import fs from 'fs';
import https from 'https'
import path from 'path';

const rbaUrl = process.env.RBA_URL || 'https://www.rba.gov.au/statistics/tables/csv/f11.1-data.csv'; // see https://www.rba.gov.au/statistics/tables/#exchange-rates
const rawDataFileName = process.env.RAW_DATA_FILE_NAME || '.cache/f11.1-data.csv';
const cacheFileName = process.env.CACHE_FILE_NAME || '.cache/rba-exchange-rates.json';
const cacheMaxAge = process.env.CACHE_MAX_AGE || 86400000; // 1 day in milliseconds

async function fetchData(url: string = rbaUrl): Promise<string>
{ 
  return new Promise((resolve, reject) => {
    const request = https.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Error fetching the data: statusCode: ${response.statusCode}`));
        return;
      }
      const chunks: Buffer[] = [];
      response.on('data', (chunk: Buffer) => chunks.push(chunk));
      response.on('end', () => {
        const buffer: Buffer = Buffer.concat(chunks);
        const data: string = buffer.toString('utf-8');
        resolve(data);
      });
    });
    
    request.on('error', (error) => {
      reject(new Error(`Error fetching the data: ${error.message}`));
    });
  });
}

function cleanData(data: string): string[] {
  return data.replace(/\r\n/g, '\n').replace(/\n$/g, '').split('\n');
}

async function isCacheValid(filePath: string, cacheMaxAge: number = 86400000): Promise<boolean> {
  if (fs.existsSync(filePath)) {
    const stats = fs.statSync(filePath);
    const ageInMs = Date.now() - stats.mtimeMs;
    return ageInMs < cacheMaxAge;
  }
  return false;
}

async function loadData(fileName: string = cacheFileName): Promise<Record<string, any>> {
  const filePath = path.join(process.cwd(), fileName);
  if (await isCacheValid(filePath)) {
    return {rates: JSON.parse(fs.readFileSync(filePath, 'utf-8'))};
  } else {
    const rbaData: string = await fetchData();
    return {rows: cleanData(rbaData)};
  }
}

function splitData(data: string[], slices: number[][] | number): string[][] {
  const rows = data.map(row => row.split(','));
  if (Array.isArray(slices)) {
    return slices.reduce((acc: string[][], slice) => [...acc, ...rows.slice(...slice)], [] as string[][]);
  } else {
    return rows.slice(slices);
  }
}

async function saveData(fileName: string, data: any): Promise<void> {
  try {
    const dir = path.dirname(fileName);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(fileName, JSON.stringify(data, null, 2));
  } catch (error) {
    throw new Error(`Error saving the file: ${(error as Error).message}`);
  }
}

export const utils = { 
  load: loadData,
  save: saveData, 
  process: splitData
};

export const config = {
  rbaUrl: rbaUrl,
  rbaFileName: rawDataFileName,
  cacheFileName: cacheFileName,
  cacheMaxAge: cacheMaxAge
};

export const __test__ = process.env.NODE_ENV === 'test' ? {
  fetchData,
  cleanData,
  isCacheValid,
  loadData,
  splitData,
  saveData
} : undefined;