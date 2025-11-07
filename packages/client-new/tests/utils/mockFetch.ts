import { vi } from 'vitest';

/**
 * Mock fetch with JSON response
 * Supports BigInt serialization using JSON.stringify replacer
 */
export const mockFetch = (data: any, status = 200) => {
  return vi.spyOn(global, 'fetch').mockResolvedValueOnce(
    new Response(
      JSON.stringify(data, (_key, value) =>
        typeof value === 'bigint' ? value.toString() : value
      ),
      {
        status,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  );
};
