// network-commons.js - Funcionalidades compartilhadas de rede
// v1.0.0 - Extraído do link-index.js para reuso

/**
 * RPCs de fallback para redes principais
 */
export const RPC_FALLBACKS = {
  97: [
    "https://data-seed-prebsc-1-s1.binance.org:8545/",
    "https://data-seed-prebsc-2-s1.binance.org:8545/",
    "https://bsc-testnet.publicnode.com",
    "https://endpoints.omniatech.io/v1/bsc/testnet/public",
    "https://bsc-testnet.public.blastapi.io"
  ],
  56: [
    "https://bsc-dataseed.binance.org",
    "https://bsc-mainnet.public.blastapi.io",
    "https://endpoints.omniatech.io/v1/bsc/mainnet/public",
    "https://bsc.publicnode.com"
  ],
  1: [
    "https://rpc.ankr.com/eth",
    "https://eth-mainnet.public.blastapi.io",
    "https://cloudflare-eth.com"
  ],
  137: [
    "https://polygon-rpc.com",
    "https://polygon-mainnet.public.blastapi.io",
    "https://rpc.ankr.com/polygon"
  ],
  43114: [
    "https://api.avax.network/ext/bc/C/rpc",
    "https://avalanche-mainnet.infura.io/v3/YOUR_INFURA_KEY",
    "https://rpc.ankr.com/avalanche"
  ],
  250: [
    "https://rpc.ftm.tools",
    "https://fantom-mainnet.public.blastapi.io",
    "https://rpc.ankr.com/fantom"
  ],
  42161: [
    "https://arb1.arbitrum.io/rpc",
    "https://arbitrum-mainnet.infura.io/v3/YOUR_INFURA_KEY",
    "https://rpc.ankr.com/arbitrum"
  ],
  10: [
    "https://mainnet.optimism.io",
    "https://optimism-mainnet.public.blastapi.io",
    "https://rpc.ankr.com/optimism"
  ]
};

/**
 * Cache para todas as redes disponíveis
 */
let allNetworksCache = null;

/**
 * Carrega todas as redes disponíveis do chainid.network
 */
export async function loadAllNetworks() {
  if (allNetworksCache) {
    return allNetworksCache;
  }

  try {
    const response = await fetch('https://chainid.network/chains.json');
    allNetworksCache = await response.json();
    console.log('📋 Carregadas', allNetworksCache.length, 'redes disponíveis');
    return allNetworksCache;
  } catch (error) {
    console.error('❌ Erro ao carregar redes:', error);
    return [];
  }
}

/**
 * Busca rede por chainId nas redes carregadas
 */
export function findNetworkByChainId(chainId) {
  if (!allNetworksCache) {
    console.warn('⚠️ Redes não carregadas ainda. Use loadAllNetworks() primeiro.');
    return null;
  }

  return allNetworksCache.find(network => network.chainId === chainId);
}

/**
 * Busca redes por nome (busca fuzzy)
 */
export function searchNetworksByName(searchTerm) {
  if (!allNetworksCache) {
    return [];
  }

  const term = searchTerm.toLowerCase();
  return allNetworksCache.filter(network => 
    network.name.toLowerCase().includes(term) || 
    network.chainId.toString().includes(term)
  );
}

/**
 * Tenta conectar em um RPC funcional para uma rede
 */
export async function findWorkingRPC(chainId, customRPCs = []) {
  // Combina RPCs customizados com fallbacks
  let rpcList = [...customRPCs];
  
  const network = findNetworkByChainId(chainId);
  if (network && network.rpc) {
    rpcList = rpcList.concat(network.rpc);
  }
  
  if (RPC_FALLBACKS[chainId]) {
    rpcList = rpcList.concat(RPC_FALLBACKS[chainId]);
  }

  // Remove duplicatas
  rpcList = [...new Set(rpcList)];

  for (const rpcUrl of rpcList) {
    try {
      const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
      const network = await provider.getNetwork();
      
      if (network.chainId === chainId) {
        console.log('✅ RPC funcional encontrado:', rpcUrl);
        return { provider, rpcUrl };
      }
    } catch (error) {
      console.log('❌ RPC falhou:', rpcUrl, error.message);
      continue;
    }
  }

  throw new Error(`Nenhum RPC funcional encontrado para chainId ${chainId}`);
}

/**
 * Obtém informações completas de uma rede
 */
export async function getNetworkInfo(chainId) {
  const networkData = findNetworkByChainId(chainId);
  
  if (!networkData) {
    return {
      chainId,
      name: `Rede Desconhecida (${chainId})`,
      nativeCurrency: { symbol: 'ETH', decimals: 18 },
      explorers: [],
      rpc: []
    };
  }

  return {
    chainId: networkData.chainId,
    name: networkData.name,
    nativeCurrency: networkData.nativeCurrency || { symbol: 'ETH', decimals: 18 },
    explorers: networkData.explorers || [],
    rpc: networkData.rpc || [],
    infoURL: networkData.infoURL
  };
}

/**
 * Valida se um endereço é válido para Ethereum/EVM
 */
export function isValidAddress(address) {
  try {
    return ethers.utils.isAddress(address);
  } catch {
    return false;
  }
}

/**
 * Formata chainId para hexadecimal (para MetaMask)
 */
export function chainIdToHex(chainId) {
  return `0x${chainId.toString(16)}`;
}

/**
 * Inicializa o sistema de redes comuns
 */
export async function initNetworkCommons() {
  try {
    await loadAllNetworks();
    console.log('🌐 Sistema de redes inicializado');
    return true;
  } catch (error) {
    console.error('❌ Erro ao inicializar sistema de redes:', error);
    return false;
  }
}
