// Jest globals type definitions for backend tests
import type { Response } from 'express';
import type { PrismaClient } from '@prisma/client';

declare global {
  namespace NodeJS {
    interface Global {
      beforeAll: (fn: (() => Promise<void>) | (() => void)) => void;
      afterAll: (fn: (() => Promise<void>) | (() => void)) => void;
      beforeEach: (fn: (() => Promise<void>) | (() => void)) => void;
      afterEach: (fn: (() => Promise<void>) | (() => void)) => void;
      describe: (name: string, fn: () => void) => void;
      it: (name: string, fn: (() => Promise<void>) | (() => void)) => void;
      test: (name: string, fn: (() => Promise<void>) | (() => void)) => void;
      expect: jest.Expect;
    }
  }

  var beforeAll: (fn: (() => Promise<void>) | (() => void)) => void;
  var afterAll: (fn: (() => Promise<void>) | (() => void)) => void;
  var beforeEach: (fn: (() => Promise<void>) | (() => void)) => void;
  var afterEach: (fn: (() => Promise<void>) | (() => void)) => void;
  var describe: (name: string, fn: () => void) => void;
  var it: (name: string, fn: (() => Promise<void>) | (() => void)) => void;
  var test: (name: string, fn: (() => Promise<void>) | (() => void)) => void;
  var expect: jest.Expect;
}

// Express Mock Types
declare module 'express' {
  interface Response {
    json: jest.MockedFunction<(obj: any) => Response>;
    status: jest.MockedFunction<(code: number) => Response>;
    send: jest.MockedFunction<(body?: any) => Response>;
  }
}

// Prisma Mock Types  
declare module '@prisma/client' {
  interface PrismaClient {
    $connect: jest.MockedFunction<() => Promise<void>>;
    $disconnect: jest.MockedFunction<() => Promise<void>>;
    user: {
      create: jest.MockedFunction<any>;
      findUnique: jest.MockedFunction<any>;
      findMany: jest.MockedFunction<any>;
      update: jest.MockedFunction<any>;
      delete: jest.MockedFunction<any>;
      deleteMany: jest.MockedFunction<any>;
    };
    company: {
      create: jest.MockedFunction<any>;
      findUnique: jest.MockedFunction<any>;
      findMany: jest.MockedFunction<any>;
      update: jest.MockedFunction<any>;
      delete: jest.MockedFunction<any>;
      deleteMany: jest.MockedFunction<any>;
    };
  }
}

export {};