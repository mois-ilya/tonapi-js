import { describe, test, expect, afterEach, vi } from 'vitest';
import { Address, Cell, TupleItem } from '@ton/core';
import { transformTupleItem, transformTupleStack, TvmStackRecord } from '../src/utils/tuple';
import { mockFetch } from './utils/mockFetch';
import { execGetMethodForBlockchainAccount } from './__mock__/cell';
import { execGetMethodForBlockchainAccount as execGetMethodSDK } from '../src/generated/sdk.gen';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('TupleItem transformations', () => {
  test('Transform num (hex) to int (bigint)', () => {
    const apiItem: TvmStackRecord = {
      type: 'num',
      num: '0xf'
    };

    const result = transformTupleItem(apiItem);

    expect(result.type).toBe('int');
    expect((result as { type: 'int'; value: bigint }).value).toBe(15n);
  });

  test('Transform large num to int', () => {
    const apiItem: TvmStackRecord = {
      type: 'num',
      num: '0x64'
    };

    const result = transformTupleItem(apiItem);

    expect(result.type).toBe('int');
    expect((result as { type: 'int'; value: bigint }).value).toBe(100n);
  });

  test('Transform cell (hex) to Cell object', () => {
    const apiItem: TvmStackRecord = {
      type: 'cell',
      cell: 'b5ee9c72010101010024000043801e1670765fe3410765c61a025aac396dae486f24630d380d4bb3edf2e8595b2990'
    };

    const result = transformTupleItem(apiItem);

    expect(result.type).toBe('cell');
    expect((result as { type: 'cell'; cell: Cell }).cell).toBeInstanceOf(Cell);

    // Verify the Cell can be used
    const cell = (result as { type: 'cell'; cell: Cell }).cell;
    expect(typeof cell.toBoc).toBe('function');
  });

  test('Transform null type', () => {
    const apiItem: TvmStackRecord = {
      type: 'null'
    };

    const result = transformTupleItem(apiItem);

    expect(result).toEqual({ type: 'null' });
  });

  test('Transform nan type', () => {
    const apiItem: TvmStackRecord = {
      type: 'nan'
    };

    const result = transformTupleItem(apiItem);

    expect(result).toEqual({ type: 'nan' });
  });

  test('Transform tuple with nested items', () => {
    const apiItem: TvmStackRecord = {
      type: 'tuple',
      tuple: [
        { type: 'num', num: '0xa' },
        { type: 'null' },
        { type: 'num', num: '0x14' }
      ]
    };

    const result = transformTupleItem(apiItem);

    expect(result.type).toBe('tuple');
    const tupleResult = result as { type: 'tuple'; items: TupleItem[] };
    expect(tupleResult.items).toHaveLength(3);

    // Check first item
    expect(tupleResult.items[0].type).toBe('int');
    expect((tupleResult.items[0] as { type: 'int'; value: bigint }).value).toBe(10n);

    // Check second item
    expect(tupleResult.items[1]).toEqual({ type: 'null' });

    // Check third item
    expect(tupleResult.items[2].type).toBe('int');
    expect((tupleResult.items[2] as { type: 'int'; value: bigint }).value).toBe(20n);
  });

  test('Transform slice (hex) to Cell object', () => {
    const apiItem: TvmStackRecord = {
      type: 'slice',
      slice: 'b5ee9c72010101010024000043801e1670765fe3410765c61a025aac396dae486f24630d380d4bb3edf2e8595b2990'
    };

    const result = transformTupleItem(apiItem);

    expect(result.type).toBe('slice');
    expect((result as { type: 'slice'; cell: Cell }).cell).toBeInstanceOf(Cell);
  });

  test('Transform array of stack items with transformTupleStack', () => {
    const apiStack: TvmStackRecord[] = [
      { type: 'num', num: '0xf' },
      { type: 'num', num: '0x64' },
      {
        type: 'cell',
        cell: 'b5ee9c72010101010024000043801e1670765fe3410765c61a025aac396dae486f24630d380d4bb3edf2e8595b2990'
      }
    ];

    const result = transformTupleStack(apiStack);

    expect(result).toHaveLength(3);

    // First item: 0xf = 15
    expect(result[0].type).toBe('int');
    expect((result[0] as { type: 'int'; value: bigint }).value).toBe(15n);

    // Second item: 0x64 = 100
    expect(result[1].type).toBe('int');
    expect((result[1] as { type: 'int'; value: bigint }).value).toBe(100n);

    // Third item: Cell
    expect(result[2].type).toBe('cell');
    expect((result[2] as { type: 'cell'; cell: Cell }).cell).toBeInstanceOf(Cell);
  });

  test('Integration: Transform real API response', async () => {
    mockFetch(execGetMethodForBlockchainAccount);

    const addressString = '0:009d03ddede8c2620a72f999d03d5888102250a214bf574a29ff64df80162168';
    const addressObject = Address.parse(addressString);

    const result = await execGetMethodSDK({
      path: { account_id: addressObject.toRawString() },
      query: { method_name: 'get_wallet_data' }
    });

    expect(result).toBeDefined();
    expect(result.data).toBeDefined();

    if (!result.data) throw new Error('result.data is undefined');

    // Transform the stack
    const transformedStack = transformTupleStack(result.data.stack as any as TvmStackRecord[]);

    expect(transformedStack).toHaveLength(3);

    // Verify first item (0xf = 15)
    expect(transformedStack[0].type).toBe('int');
    expect((transformedStack[0] as { type: 'int'; value: bigint }).value).toBe(15n);

    // Verify second item (0x64 = 100)
    expect(transformedStack[1].type).toBe('int');
    expect((transformedStack[1] as { type: 'int'; value: bigint }).value).toBe(100n);

    // Verify third item (Cell)
    expect(transformedStack[2].type).toBe('cell');
    const cell = (transformedStack[2] as { type: 'cell'; cell: Cell }).cell;
    expect(cell).toBeInstanceOf(Cell);

    // Verify Cell methods work
    const bocBuffer = cell.toBoc();
    expect(bocBuffer).toBeInstanceOf(Buffer);
  });
});
