jest.mock('fs', () => ({
  ...jest.requireActual('fs'), 
  readFileSync: jest.fn(),
  writeFileSync: jest.fn(),
  statSync: jest.fn(),
}));
import fs from 'fs';

jest.mock('https');
import { mocks } from './mocks';
mocks.env.set('RBA_URL', mocks.config.rbaUrl);
mocks.env.set('RAW_DATA_FILE_NAME', mocks.config.rbaFileName);
mocks.env.set('CACHE_FILE_NAME', mocks.config.cacheFileName);
mocks.env.set('CACHE_MAX_AGE', mocks.config.cacheMaxAge.toString());

import { rba } from '../src/rates';

describe('RBA Exchange Rates', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    jest.mock('fs', () => ({
      readFileSync: mocks.fs.readFileSync,
    }));
    const mockFsStatSync = mocks.fs.statSync(true);
    (fs.statSync as jest.Mock).mockImplementation(mockFsStatSync);
    jest.mock('https', () => ({
      ...jest.requireActual('https'),
      get: mocks.https.get
    }));
  });

  describe('getExchangeRates', () => {
    it('should return exchange rates for USD', async () => {
      const usdRates = await rba.rates('USD');
      expect(usdRates).toBeDefined();
      expect(usdRates.units).toBe('USD');
      expect(usdRates.rates_daily).toBeDefined();
      expect(usdRates.rates_monthly).toBeDefined();
      expect(usdRates.rates_daily['2023-01-03']).toBe('0.6828');
      expect(usdRates.rates_monthly['2023-01']).toBe('0.6949');
    });

    it('should handle errors when curreny is invalid', async () => {
      await expect(rba.rates('XXX'))
        .rejects
        .toThrow('Rates not available for XXX');
    });
  });

  describe('getExchangeRate', () => {
    it('should return daily rate for specific date', async () => {
      const rate = await rba.rate('USD', '2023-01-03');
      expect(rate).toBe('0.6828');
    });

    it('should return monthly rate for specific month', async () => {
      const rate = await rba.rate('USD', '2023-01');
      expect(rate).toBe('0.6949');
    });

    it('should handle errors when date format is invalid', async () => {
      await expect(rba.rate('USD', '2023-JAN-01'))
        .rejects
        .toThrow('Date must be in format YYYY-MM or YYYY-MM-DD');

      await expect(rba.rate('USD', '2023-JAN'))
        .rejects
        .toThrow('Date must be in format YYYY-MM or YYYY-MM-DD');
    });

    it('should handle errors when date is not available', async () => {
      await expect(rba.rate('USD', '2022-01-01'))
        .rejects
        .toThrow('Rate not available for 2022-01-01');
    });
  });
}); 