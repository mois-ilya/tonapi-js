/**
 * Mock data for BigInt transformation tests
 */

export const getAccount = {
  accounts: [
    {
      address: '0:009d03ddede8c2620a72f999d03d5888102250a214bf574a29ff64df80162168',
      balance: 471698230471698230471698230471698230n,
      status: 'active',
      interfaces: [],
      name: null,
      is_scam: false,
      icon: null,
      memo_required: false,
      get_methods: [],
      is_suspended: false,
      is_wallet: true
    },
    {
      address: '0:7c9fc62291740a143086c807fe322accfd12737b3c2243676228176707c7ce40',
      balance: 47602800n,
      status: 'active',
      interfaces: [],
      name: null,
      is_scam: false,
      icon: null,
      memo_required: false,
      get_methods: [],
      is_suspended: false,
      is_wallet: true
    }
  ]
};

export const getJettonInfo = {
  mintable: false,
  total_supply: '51993848738495833', // BigInt as string
  admin: {
    address: '0:67fb742ad51e2f5e8f645b41a5a1202e4b0f18db83ae1fff00daa87c39dbc3e8',
    name: null,
    is_scam: false,
    icon: null,
    is_wallet: false
  },
  metadata: {
    address: 'EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs',
    name: 'Tether USD',
    symbol: 'USD₮',
    decimals: '6',
    image: 'https://cache.tonapi.io/imgproxy/T3PB4s7oprNVaJkwqbGg54nexKE0zzKhcrPv8jcWYzU/rs:fill:200:200:1/g:no/aHR0cHM6Ly90ZXRoZXIudG8vaW1hZ2VzL2xvZ29DaXJjbGUucG5n.webp',
    image_data: null,
    custom_payload_api_uri: null
  },
  verification: 'whitelist',
  holders_count: 6097926
};
