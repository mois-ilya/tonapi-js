import { describe, test, expect } from 'vitest';
import { Address, Cell } from '@ton/core';
import type { Account, BlockchainRawAccount } from '../src/generated';

describe('Client-new Type Definitions', () => {
  test('Account type has Address field', () => {
    // This test just checks types are correctly defined
    const account: Partial<Account> = {
      address: Address.parse('EQD__________________________________________0vo'),
      balance: 1000000000n,
    };

    expect(account.address).toBeDefined();
    expect(Address.isAddress(account.address!)).toBe(true);
    expect(typeof account.balance).toBe('bigint');

    console.log('✓ Account type definitions are correct');
  });

  test('BlockchainRawAccount type has Cell fields', () => {
    // Check that Cell type is accepted
    // Create a simple empty cell
    const mockCell = new Cell();

    const account: Partial<BlockchainRawAccount> = {
      address: Address.parse('EQD__________________________________________0vo'),
      balance: 1000000000n,
      code: mockCell,
      data: mockCell,
    };

    expect(account.code).toBeDefined();
    expect(account.data).toBeDefined();
    expect(typeof account.code?.toBoc).toBe('function');

    console.log('✓ BlockchainRawAccount type definitions are correct');
  });

  test('BigInt types are correctly defined', () => {
    const balance: bigint = 471698230471698230471698230471698230n;

    // Type check
    const account: Partial<Account> = {
      balance,
    };

    expect(typeof account.balance).toBe('bigint');
    expect(account.balance).toBe(balance);

    console.log('✓ BigInt type definitions are correct');
  });
});
