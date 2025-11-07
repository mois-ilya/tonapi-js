import { describe, test, expect, beforeAll } from 'vitest';
import { Address } from '@ton/core';
import { getAccountEvents, getAccount } from '../src/generated';

// Rate limit: 0.25 RPS without API key
const RATE_LIMIT_DELAY = 4100; // 4.1 seconds

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

describe('Client-new Date Transformations', () => {
  beforeAll(async () => {
    await delay(RATE_LIMIT_DELAY);
  });

  test('Unix timestamp to Date transformation - AccountEvent', async () => {
    // Use a known active address
    const addressString = 'UQC62nZpm36EFzADVfXDVd_4OpbFyc1D3w3ZvCPHLni8Dst4';

    const result = await getAccountEvents({
      path: {
        account_id: addressString,
      },
      query: {
        limit: 5,
      },
    });

    expect(result).toBeDefined();
    expect(result.events).toBeDefined();
    expect(Array.isArray(result.events)).toBe(true);

    if (result.events.length > 0) {
      const firstEvent = result.events[0];

      // Check that timestamp is Date object
      expect(firstEvent.timestamp).toBeDefined();
      expect(firstEvent.timestamp instanceof Date).toBe(true);

      console.log('✓ Date transformation works');
      console.log('  timestamp:', firstEvent.timestamp.toISOString());
      console.log('  year:', firstEvent.timestamp.getFullYear());
    } else {
      console.log('⚠️  No events found for testing (account might be inactive)');
    }

    await delay(RATE_LIMIT_DELAY);
  }, 15000);

  test('Account last_activity field', async () => {
    const addressString = 'UQC62nZpm36EFzADVfXDVd_4OpbFyc1D3w3ZvCPHLni8Dst4';

    const result = await getAccount({
      path: {
        account_id: addressString,
      },
    });

    expect(result).toBeDefined();

    // Check if last_activity exists and is a number (unix timestamp)
    if (result.last_activity !== undefined) {
      // In types it should be number (we only convert specific timestamp fields)
      expect(typeof result.last_activity).toBe('number');
      console.log('✓ last_activity field:', result.last_activity);
    }

    await delay(RATE_LIMIT_DELAY);
  }, 15000);
});
