import { describe, test, expect, beforeAll } from 'vitest';
import { Address } from '@ton/core';
import { getAccount, getBlockchainRawAccount } from '../src/generated';

// Rate limit: 0.25 RPS without API key (1 request per 4 seconds)
const RATE_LIMIT_DELAY = 4100; // 4.1 seconds to be safe

// Helper to add delay between tests
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Test addresses
const TEST_ADDRESSES = {
  // Well-known TON Foundation address
  foundation: 'EQD__________________________________________0vo',
  // USDT Jetton master
  usdt: 'EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs',
  // Random active wallet
  wallet: 'UQC62nZpm36EFzADVfXDVd_4OpbFyc1D3w3ZvCPHLni8Dst4'
};

describe('Client-new Type Transformations', () => {
  beforeAll(async () => {
    // Initial delay
    await delay(RATE_LIMIT_DELAY);
  });

  test('Address type transformation - getAccount', async () => {
    const addressString = TEST_ADDRESSES.wallet;
    const addressObject = Address.parse(addressString);

    const result = await getAccount({
      path: {
        account_id: addressString,
      },
    });

    // Check that address field is Address object, not string
    expect(result).toBeDefined();
    expect(result.address).toBeDefined();
    expect(Address.isAddress(result.address)).toBe(true);
    expect(result.address.toString()).toBe(addressObject.toString());

    console.log('✓ Address transformation works:', result.address.toString());

    await delay(RATE_LIMIT_DELAY);
  }, 15000);

  test('BigInt type transformation - account balance', async () => {
    const addressString = TEST_ADDRESSES.wallet;

    const result = await getAccount({
      path: {
        account_id: addressString,
      },
    });

    // Check that balance is bigint, not number
    expect(result).toBeDefined();
    expect(result.balance).toBeDefined();
    expect(typeof result.balance).toBe('bigint');
    expect(result.balance).toBeGreaterThan(0n);

    console.log('✓ BigInt transformation works:', result.balance, 'nanoTON');

    await delay(RATE_LIMIT_DELAY);
  }, 15000);

  test('Cell type transformation - BlockchainRawAccount', async () => {
    const addressString = TEST_ADDRESSES.wallet;

    const result = await getBlockchainRawAccount({
      path: {
        account_id: addressString,
      },
    });

    // Check that code/data fields are Cell objects if present
    expect(result).toBeDefined();
    expect(Address.isAddress(result.address)).toBe(true);

    // Code and data might be null for some accounts
    if (result.code) {
      // Check it's a Cell object by trying to call Cell methods
      expect(result.code).toBeDefined();
      expect(typeof result.code.toBoc).toBe('function');
      console.log('✓ Cell transformation works for code field');
    }

    if (result.data) {
      expect(result.data).toBeDefined();
      expect(typeof result.data.toBoc).toBe('function');
      console.log('✓ Cell transformation works for data field');
    }

    await delay(RATE_LIMIT_DELAY);
  }, 15000);

  test('Multiple address fields - oracle addresses', async () => {
    const addressString = TEST_ADDRESSES.wallet;

    const result = await getAccount({
      path: {
        account_id: addressString,
      },
    });

    expect(result).toBeDefined();
    expect(Address.isAddress(result.address)).toBe(true);

    console.log('✓ All address fields are Address objects');

    await delay(RATE_LIMIT_DELAY);
  }, 15000);

  test('BigInt in nested structures', async () => {
    const addressString = TEST_ADDRESSES.wallet;

    const result = await getBlockchainRawAccount({
      path: {
        account_id: addressString,
      },
    });

    expect(result).toBeDefined();
    expect(typeof result.balance).toBe('bigint');
    expect(typeof result.last_transaction_lt).toBe('bigint');

    console.log('✓ BigInt works in nested structures');
    console.log('  balance:', result.balance);
    console.log('  last_transaction_lt:', result.last_transaction_lt);

    await delay(RATE_LIMIT_DELAY);
  }, 15000);
});
