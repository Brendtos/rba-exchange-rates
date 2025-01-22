jest.mock('fs', () => ({
  ...jest.requireActual('fs'), 
  readFileSync: jest.fn(),
  statSync: jest.fn(),
  writeFileSync: jest.fn(),
  createWriteStream: jest.fn(),
}));

jest.mock('https');
import { mocks } from './mocks';
mocks.env.set('RBA_URL', mocks.config.rbaUrl);
mocks.env.set('RAW_DATA_FILE_NAME', mocks.config.rbaFileName);
mocks.env.set('CACHE_FILE_NAME', mocks.config.cacheFileName);
mocks.env.set('CACHE_MAX_AGE', mocks.config.cacheMaxAge.toString());

import { utils } from '../src/utils';
import { __test__ } from '../src/utils';

import fs from 'fs';
import path from 'path';
import https from 'https';
import { EventEmitter } from 'events';

describe('Utils', () => {

  let mockFsReadFileSync: jest.Mock;
  let mockFsWriteFileSync: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    mockFsReadFileSync = mocks.fs.readFileSync;
    mockFsWriteFileSync = mocks.fs.writeFileSync;
    jest.mock('fs', () => ({
      ...jest.requireActual('fs'),
      readFileSync: mockFsReadFileSync,
      writeFileSync: mockFsWriteFileSync,
    }));
    const mockFsStatSync = mocks.fs.statSync(true);
    (fs.statSync as jest.Mock).mockImplementation(mockFsStatSync);
    jest.mock('https', () => ({
      ...jest.requireActual('https'),
      get: mocks.https.get
    }));
  });

  afterEach(() => {
    mocks.env.reset();
  });

  describe('loadData', () => {
    it('should return cached data when cache is valid', async () => {
      const mockFsStatSync = mocks.fs.statSync(true);
      (fs.statSync as jest.Mock).mockImplementation(mockFsStatSync);
      const result = await utils.load();
      expect(mockFsReadFileSync).toHaveBeenCalledTimes(1);
      expect(mockFsReadFileSync).toHaveBeenCalledWith(path.join(process.cwd(), mocks.config.cacheFileName), 'utf-8');
      expect(result).toEqual({rates: JSON.parse(mocks.data.mockRatesData)});
    });

    it('should fetch and return new data when cache is invalid', async () => {
      const mockFsStatSync = mocks.fs.statSync(false);
      (fs.statSync as jest.Mock).mockImplementation(mockFsStatSync);
      const result = await utils.load();
      expect(mockFsReadFileSync).toHaveBeenCalledTimes(0);
      expect(mockFsReadFileSync).not.toHaveBeenCalledWith(path.join(process.cwd(), mocks.config.cacheFileName), 'utf-8');
      expect(result).toEqual({rows: __test__!.cleanData(mocks.data.mockRawData)});
    });
  });

  describe('splitData', () => {
    const mockRows = [
      'header1,value1,value2,value3',
      'header2,value4,value5,value6',
      'header3,value7,value8,value9',
      'header4,value10,value11,value12',
      'header5,value13,value14,value15',
      'header6,value16,value17,value18',
      'header7,value19,value20,value21'
    ];

    it('should split data with single slice number', () => {
      const result = utils.process(mockRows, 2);
      expect(result).toHaveLength(5);
      expect(result[0]).toEqual(['header3', 'value7', 'value8', 'value9']);
    });

    it('should split data with multiple slices', () => {
      const result = utils.process(mockRows, [[1, 2], [4, 5]]);
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual(['header2', 'value4', 'value5', 'value6']);
      expect(result[1]).toEqual(['header5', 'value13', 'value14', 'value15']);
    });
  });

  describe('saveData', () => {
    it('should save data to file', async () => {
      const testData = { test: 'data' };
      await utils.save('test.json', testData);
      expect(mockFsWriteFileSync).toHaveBeenCalledWith(
        'test.json',
        JSON.stringify(testData, null, 2)
      );
    });

    it('should handle errors when saving fails', async () => {
      const mockFsWriteFileSync = jest.fn().mockImplementation(() => {
        throw new Error('Write failed');
      });
      (fs.writeFileSync as jest.Mock).mockImplementation(mockFsWriteFileSync);
      await expect(utils.save('test.json', {}))
        .rejects
        .toThrow('Error saving the file: Write failed');
    });
  });

  describe('fetchData', () => {
    it('should download file successfully', async () => {
      const result = await __test__!.fetchData();
      expect(result).toBe(mocks.data.mockRawData);
      expect(https.get).toHaveBeenCalledWith(mocks.config.rbaUrl, expect.any(Function));
    });

    it('should handle HTTP error status codes', async () => {
      (https.get as jest.Mock).mockImplementationOnce((url, callback) => {
        const request = Object.assign(new EventEmitter(), {
          setTimeout: jest.fn().mockReturnThis(),
          end: jest.fn()
        });
        process.nextTick(() => {
          const response = new EventEmitter() as EventEmitter & { statusCode: number };
          response.statusCode = 404;
          callback(response);
          response.emit('end');
        });
        return request;
      });
      await expect(__test__!.fetchData(mocks.config.rbaUrl))
        .rejects
        .toThrow('Error fetching the data: statusCode: 404');
    });
  
    it('should handle errors', async () => {
      (https.get as jest.Mock).mockImplementationOnce((url, callback) => {
        const request = Object.assign(new EventEmitter(), {
          setTimeout: jest.fn().mockReturnThis(),
          end: jest.fn()
        });
        process.nextTick(() => {
          request.emit('error', new Error('Mock error'));
        });
        return request;
      });
      await expect(__test__!.fetchData(mocks.config.rbaUrl))
        .rejects
        .toThrow('Error fetching the data: Mock error');
    });
  });
});
