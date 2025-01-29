import { utils, config } from './utils';

const convertDate = (date: string): string => {
  const [day, month, year] = date.split('-');
  const months: { [key: string]: string } = {
    'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04', 'May': '05', 'Jun': '06',
    'Jul': '07', 'Aug': '08', 'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12'
  };
  return `${year}-${months[month]}-${day}`;
}

async function exchangeRatesMetadata(rows: string[]): Promise<Record<string, any>[]> {
  const slices = [[1, 6],[8, 11]]; // see raw data f11.1-data.csv
  const matrix: string[][] = utils.process(rows, slices);
  const titles: string[] = matrix.map(row => row[0].toLowerCase().replace(/ /g, '_'));
  const metadata: string[][] = matrix.map((row: string[]) => row.slice(1).filter(cell => cell !== ""));
  const records: Record<string, any>[] = [];
  for (let i = 0; i < metadata[0].length; i++) {
    const record: Record<string, any> = {};
    titles.forEach((title: string, j: number) => {
      record[title] = metadata[j][i];
    });
    record.publication_date = convertDate(record.publication_date);
    records.push(record);
  }
  return records;
}

async function exchangeRatesDaily(rows: string[]): Promise<Record<string, any>[]> {
  const slice = 11; // see raw data f11.1-data.csv
  const matrix: string[][] = utils.process(rows, slice);
  const dates: string[] = matrix.map(row => {
    const date = new Date(row[0].split('-').reverse().join('-'));
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  });
  const rates: string[][] = matrix.map((row: string[]) => row.slice(1));
  return rates.map((row: string[], i: number) => {
    const record: Record<string, any> = {};
    dates.forEach((title: string, j: number) => {
      const rate = rates[j][i];
      record[title] = rate ? rate : null;
    });
    return record;
  });
}

async function exchangeRatesMonthly(rates: Record<string, string>[]): Promise<Record<string, any>[]> {
  let ratesMonthly: Record<string, any>[] = [];
  rates.forEach((rate: Record<string, string>, index: number) => {
    const monthlyRates: Record<string, number[]> = {};
    Object.entries(rate).forEach(([key, value]) => {
      const date = new Date(key);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (!monthlyRates[monthKey]) {
        monthlyRates[monthKey] = [];
      }
      monthlyRates[monthKey].push(parseFloat(value));
    });
    const monthlyAverages: Record<string, string | null> = {};
    Object.entries(monthlyRates).forEach(([month, values]) => {
      const avg = values.reduce((sum, val) => sum + val, 0) / values.length;
      monthlyAverages[month] = avg ? avg.toFixed(4) : null;
    });
    ratesMonthly.push(monthlyAverages);
  });
  ratesMonthly = ratesMonthly.map(rate => {
    return Object.fromEntries(
      Object.entries(rate).sort(([a], [b]) => a.localeCompare(b))
    );
  });
  return ratesMonthly;
}

async function exchangeRates(): Promise<Record<string, any>[]> {
  let data: any = await utils.load();
  if (data.rows){ 
    const exchangeRates = await exchangeRatesMetadata(data.rows);
    const ratesDaily = await exchangeRatesDaily(data.rows);
    const ratesMonthly = await exchangeRatesMonthly(ratesDaily);
    exchangeRates.forEach((record: Record<string, any>, index: number) => {
      record['rates_daily'] = ratesDaily[index];
      record['rates_monthly'] = ratesMonthly[index];
    });
    await utils.save(config.cacheFileName, exchangeRates);
    return exchangeRates;
  } else if (data.rates){
    return data.rates;
  } else {
    throw new Error('No data available');
  }
}

export {
  exchangeRates
};