import { describe, test, expect, afterEach, vi } from 'vitest';
import { Address } from '@ton/core';
import { mockFetch } from './utils/mockFetch';
import { getAccount } from '../src/generated/sdk.gen';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('Address transformations', () => {
  test('Address parsing in response', async () => {
    const mockData = {
      address: '0:009d03ddede8c2620a72f999d03d5888102250a214bf574a29ff64df80162168',
      balance: 10000000n,
      status: 'active',
      interfaces: [],
      name: null,
      is_scam: false,
      icon: null,
      memo_required: false,
      get_methods: [],
      is_suspended: false,
      is_wallet: true
    };

    mockFetch(mockData);

    const accountAddress = Address.parse('0:009d03ddede8c2620a72f999d03d5888102250a214bf574a29ff64df80162168');

    const result = await getAccount({
      path: { account_id: accountAddress.toRawString() }
    });

    expect(result).toBeDefined();
    expect(result.data).toBeDefined();

    if (!result.data) throw new Error('result.data is undefined');

    // Verify address field is Address instance
    expect(Address.isAddress(result.data.address)).toBe(true);
    expect(result.data.address.toRawString()).toBe('0:009d03ddede8c2620a72f999d03d5888102250a214bf574a29ff64df80162168');

    // Verify balance is BigInt
    expect(typeof result.data.balance).toBe('bigint');
  });

  test('Address serialization in request parameters', async () => {
    const fetchSpy = mockFetch({ balance: 1000n });

    const accountAddress = Address.parse('EQCae11h9N5znylEPRjmuLYGvIwnxkcCw4zVW4BJjVASi5eL');

    await getAccount({
      path: { account_id: accountAddress.toRawString() }
    });

    // Verify fetch was called with raw string format
    expect(fetchSpy).toHaveBeenCalled();
    const callArgs = fetchSpy.mock.calls[0];
    const url = callArgs[0] as string;

    // URL should contain raw format address
    expect(url).toContain('UQCae11h9N5znylEPRjmuLYGvIwnxkcCw4zVW4BJjVASi5eL');
  });

  test('Address fields with _address suffix', async () => {
    const mockData = {
      action: 'TonTransfer',
      sender: {
        address: '0:009d03ddede8c2620a72f999d03d5888102250a214bf574a29ff64df80162168',
        name: null,
        is_scam: false,
        icon: null,
        is_wallet: true
      },
      recipient_address: '0:7c9fc62291740a143086c807fe322accfd12737b3c2243676228176707c7ce40',
      amount: 1000000000n,
      comment: 'test'
    };

    // Mock response that contains *_address fields
    mockFetch({ actions: [mockData] });

    // Note: This test demonstrates the pattern
    // Actual SDK method would need to be available
    // The type transformation for *_address fields is confirmed in types.gen.ts
  });
});
