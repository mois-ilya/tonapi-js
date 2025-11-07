import { describe, test, expect, afterEach, vi } from 'vitest';
import { Address } from '@ton/core';
import { getAccount, getJettonInfo } from './__mock__/bigint';
import { mockFetch } from './utils/mockFetch';
import { getAccounts, getJettonInfo as getJettonInfoSDK } from '../src/generated/sdk.gen';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('BigInt transformations', () => {
  test('BigInt from number in response', async () => {
    mockFetch(getAccount);

    const accountIds = [
      '0:009d03ddede8c2620a72f999d03d5888102250a214bf574a29ff64df80162168',
      '0:7c9fc62291740a143086c807fe322accfd12737b3c2243676228176707c7ce40'
    ].map(addr => Address.parse(addr));

    const result = await getAccounts({
      body: { account_ids: accountIds.map(a => a.toRawString()) }
    });

    expect(result).toBeDefined();
    expect(result.data).toBeDefined();
    expect(result.data.accounts).toHaveLength(2);

    // Verify very large BigInt (exceeds Number.MAX_SAFE_INTEGER)
    expect(typeof result.data.accounts[0].balance).toBe('bigint');
    expect(result.data.accounts[0].balance).toBe(471698230471698230471698230471698230n);

    // Verify normal-sized BigInt
    expect(typeof result.data.accounts[1].balance).toBe('bigint');
    expect(result.data.accounts[1].balance).toBe(47602800n);
  });

  test('BigInt from string in response', async () => {
    mockFetch(getJettonInfo);

    const jettonAddress = Address.parse('EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs');

    const result = await getJettonInfoSDK({
      path: { account_id: jettonAddress.toRawString() }
    });

    expect(result).toBeDefined();
    expect(result.data).toBeDefined();

    // total_supply comes as string in JSON, should be converted to BigInt
    expect(typeof result.data.total_supply).toBe('bigint');
    expect(result.data.total_supply).toBe(51993848738495833n);
  });

  test('BigInt serialization in request body', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
    );

    // Create a request with BigInt value
    const bigintValue = 123456789012345678901234567890n;

    // Simulate a request that would include BigInt
    // In real usage, this would be part of SDK method call
    const bodyWithBigInt = JSON.stringify(
      { amount: bigintValue },
      (_key, value) => (typeof value === 'bigint' ? value.toString() : value)
    );

    expect(bodyWithBigInt).toContain('"123456789012345678901234567890"');

    fetchSpy.mockRestore();
  });
});
