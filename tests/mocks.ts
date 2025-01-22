import { EventEmitter } from 'events';
import https from 'https';
import fs from 'fs';
import path from 'path';

const rbaUrl = 'https://example.com/f11.1-data.csv';
const rbaFileName = 'tests/data/f11.1-data.csv';
const cacheFileName = 'tests/data/rba-exchange-rates.json';
const cacheMaxAge = 300000; // 5 minutes in milliseconds

const realFs = jest.requireActual<typeof fs>('fs');
const mockRawData = realFs.readFileSync(
  path.join(process.cwd(), rbaFileName),
  'utf8'
);
const mockRatesData = realFs.readFileSync(
  path.join(process.cwd(), cacheFileName),
  'utf8'
);

// fs
const mockFsReadFileSync = jest.fn().mockImplementation((filePath: fs.PathOrFileDescriptor, encoding?: any) => {
  if (filePath === path.join(process.cwd(), rbaFileName)) {
    return mockRawData;
  }
  if (filePath === path.join(process.cwd(), cacheFileName)) {
    return mockRatesData;
  }
  throw new Error(`Unexpected file: ${path}`);
});
(fs.readFileSync as jest.Mock).mockImplementation(mockFsReadFileSync);

const mockFsWriteFileSync = jest.fn().mockImplementation(() => jest.fn());
(fs.writeFileSync as jest.Mock).mockImplementation(mockFsWriteFileSync);

const mockFsStatSync = function(isValidCache: boolean) {
  return jest.fn().mockImplementation((path: fs.PathLike) => ({
    mtimeMs: isValidCache
      ? Date.now() - 1000
      : Date.now() - (2 * 24 * 60 * 60 * 1000)
  }) as fs.Stats);
}

// https
const mockRequest = new EventEmitter() as EventEmitter & { setTimeout: Function };
mockRequest.setTimeout = jest.fn().mockReturnThis();

const mockHttpsGet = jest.fn().mockImplementation((url, callback) => {
  const response = new EventEmitter() as EventEmitter & { statusCode: number };
  response.statusCode = 200;
  process.nextTick(() => {
    callback(response);
    response.emit('data', Buffer.from(mockRawData));
    response.emit('end');
  });
  return mockRequest;
});
(https.get as jest.Mock).mockImplementation(mockHttpsGet);

const mockEnv = {
  original: { ...process.env },
  set: (key: string, value: string) => {
    process.env[key] = value;
  },
  reset: () => {
    process.env = { ...mockEnv.original };
  },
  clear: (key: string) => {
    delete process.env[key];
  }
};

export const mocks = {
  fs: {
    readFileSync: mockFsReadFileSync,
    writeFileSync: mockFsWriteFileSync,
    statSync: mockFsStatSync
  },
  https: {
    get: mockHttpsGet
  },
  data: {
    mockRawData,
    mockRatesData,
  },
  config: {
    rbaUrl,
    rbaFileName,
    cacheFileName,
    cacheMaxAge
  },
  env: mockEnv
};


