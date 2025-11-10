/**
 * Utility functions for transforming TupleItem (TvmStackRecord) from API format to @ton/core format
 *
 * API format (TvmStackRecord):
 * - { type: 'num', num: '0xf' } -> hex string
 * - { type: 'cell', cell: 'b5ee...' } -> hex string
 * - { type: 'slice', slice: 'b5ee...' } -> hex string
 * - { type: 'tuple', tuple: [...] } -> nested array
 * - { type: 'null' }
 * - { type: 'nan' }
 *
 * @ton/core format (TupleItem):
 * - { type: 'int', value: 15n } -> bigint
 * - { type: 'cell', cell: Cell } -> Cell object
 * - { type: 'slice', slice: Cell } -> Cell object
 * - { type: 'tuple', items: [...] } -> nested array with 'items' key
 * - { type: 'null' }
 * - { type: 'nan' }
 */

import { Cell, TupleItem } from '@ton/core';

/**
 * Parse hex string to BigInt
 * Handles both '0x' prefixed and non-prefixed hex strings
 */
function parseHexToBigInt(hex: string): bigint {
  if (!hex) return 0n;
  // Remove '0x' prefix if present
  const cleanHex = hex.startsWith('0x') ? hex.slice(2) : hex;
  // Handle negative numbers (if first bit is 1, it's negative in two's complement)
  return BigInt('0x' + cleanHex);
}

/**
 * API TvmStackRecord format (raw from API)
 */
export interface TvmStackRecord {
  type: 'cell' | 'num' | 'nan' | 'null' | 'tuple' | 'slice';
  cell?: string;
  slice?: string;
  num?: string;
  tuple?: TvmStackRecord[];
}

/**
 * Transform API TvmStackRecord to @ton/core TupleItem
 *
 * @param item - Raw TvmStackRecord from API
 * @returns TupleItem compatible with @ton/core
 *
 * @example
 * ```typescript
 * const result = await execGetMethodForBlockchainAccount({...});
 * const transformedStack = result.data.stack.map(transformTupleItem);
 * ```
 */
export function transformTupleItem(item: TvmStackRecord): TupleItem {
  switch (item.type) {
    case 'tuple':
      return {
        type: 'tuple',
        items: item.tuple ? item.tuple.map(transformTupleItem) : []
      };
    case 'num':
      return {
        type: 'int',
        value: parseHexToBigInt(item.num || '0x0')
      };
    case 'cell':
      return {
        type: 'cell',
        cell: Cell.fromBoc(Buffer.from(item.cell || '', 'hex'))[0]
      };
    case 'slice':
      return {
        type: 'slice',
        cell: Cell.fromBoc(Buffer.from(item.slice || '', 'hex'))[0]
      };
    case 'null':
      return { type: 'null' };
    case 'nan':
      return { type: 'nan' };
    default:
      throw new Error(`Unknown TupleItem type: ${(item as any).type}`);
  }
}

/**
 * Transform array of TvmStackRecords to TupleItems
 *
 * @param stack - Array of TvmStackRecords from API
 * @returns Array of TupleItems compatible with @ton/core
 *
 * @example
 * ```typescript
 * const result = await execGetMethodForBlockchainAccount({...});
 * const transformedStack = transformTupleStack(result.data.stack);
 * ```
 */
export function transformTupleStack(stack: TvmStackRecord[]): TupleItem[] {
  return stack.map(transformTupleItem);
}
