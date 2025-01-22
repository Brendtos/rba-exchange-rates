import { exchangeRates } from "./transform";

async function getExchangeRates(): Promise<Record<string, any>[]>;
async function getExchangeRates(currency: string): Promise<Record<string, any>>;

async function getExchangeRates(currency?: string): Promise<Record<string, any>[] | Record<string, any>> {
  let rates: Record<string, any>[] | Record<string, any> = await exchangeRates();
  if (currency) {
    rates = rates.find((rate: Record<string, any>) => rate.units === currency);
    if (!rates) {
      throw new Error('Rates not available for ' + currency);
    }
  } 
  return rates;
}

async function getExchangeRate(currency: string, date: string) {
  let datePattern = /^\d{4}-\d{2}(-\d{2})?$/;
  if (date && !datePattern.test(date)) {
    throw new Error('Date must be in format YYYY-MM or YYYY-MM-DD');
  }
  const rates = await getExchangeRates(currency);
  let rate = '';
  datePattern = /^\d{4}-\d{2}-\d{2}$/; // YYYY-MM-DD
  if (datePattern.test(date)) {
    rate = rates.rates_daily[date];
  }
  datePattern = /^\d{4}-\d{2}$/; // YYYY-MM
  if (datePattern.test(date)) {
    rate = rates.rates_monthly[date];
  }
  if (!rate) {
    throw new Error('Rate not available for ' + date);
  }
  return rate;
}

export const rba = {
  rates: async (currency?: string) => await getExchangeRates(currency!),
  rate: async (...args: Parameters<typeof getExchangeRate>) => await getExchangeRate(...args),
};