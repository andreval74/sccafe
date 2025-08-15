// Funções globais para manipulação de tokens e contratos

/**
 * Fallback RPCs por rede
 */
const rpcFallbacks = {
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
        "https://mainnet.infura.io/v3/YOUR_INFURA_KEY",
        "https://cloudflare-eth.com"
    ],
    137: [
        "https://polygon-rpc.com",
        "https://polygon-mainnet.public.blastapi.io",
        "https://rpc.ankr.com/polygon"
    ]
};

/**
 * Formata números grandes
 */
function formatarNumero(numero) {
    if (!numero) return '0';
    
    const num = parseFloat(numero.toString().replace(/,/g, ''));
    
    if (num >= 1e12) {
        return (num / 1e12).toFixed(2) + ' T';
    } else if (num >= 1e9) {
        return (num / 1e9).toFixed(2) + ' B';
    } else if (num >= 1e6) {
        return (num / 1e6).toFixed(2) + ' M';
    } else if (num >= 1e3) {
        return (num / 1e3).toFixed(2) + ' K';
    } else {
        return num.toLocaleString();
    }
}

/**
 * Obtém dados do token usando Web3/Ethers
 */
async function fetchTokenData(tokenAddress, provider) {
    try {
        const abi = [
            "function name() view returns (string)",
            "function symbol() view returns (string)",
            "function decimals() view returns (uint8)",
            "function totalSupply() view returns (uint256)",
            "function owner() view returns (address)"
        ];
        
        const contract = new ethers.Contract(tokenAddress, abi, provider);
        
        const [name, symbol, decimals, totalSupply, owner] = await Promise.all([
            contract.name().catch(() => ""),
            contract.symbol().catch(() => ""),
            contract.decimals().catch(() => 18),
            contract.totalSupply().catch(() => "0"),
            contract.owner().catch(() => "")
        ]);

        return {
            name,
            symbol,
            decimals: decimals.toString(),
            totalSupply: totalSupply.toString(),
            owner,
            address: tokenAddress
        };
    } catch (error) {
        console.error("❌ Erro ao buscar dados do token:", error);
        throw error;
    }
}

/**
 * Obtém nome da rede baseado no chainId
 */
function getNetworkName(chainId) {
    const networks = {
        '0x1': 'Ethereum',
        '0x38': 'BSC',
        '0x61': 'BSC Testnet',
        '0x89': 'Polygon',
        '0x13881': 'Mumbai Testnet'
    };
    
    return networks[chainId] || `Chain ${chainId}`;
}

/**
 * Obtém URL do explorer baseado no chainId
 */
function getExplorerUrl(chainId) {
    const explorers = {
        '0x1': 'https://etherscan.io',
        '0x38': 'https://bscscan.com',
        '0x61': 'https://testnet.bscscan.com',
        '0x89': 'https://polygonscan.com',
        '0x13881': 'https://mumbai.polygonscan.com'
    };
    
    return explorers[chainId] || 'https://etherscan.io';
}

/**
 * Conexão com MetaMask
 */
async function connectMetaMask() {
    if (!window.ethereum) {
        throw new Error('MetaMask não detectado! Por favor, instale a extensão.');
    }

    try {
        const accounts = await window.ethereum.request({
            method: 'eth_requestAccounts'
        });

        if (accounts.length > 0) {
            const provider = new ethers.providers.Web3Provider(window.ethereum);
            const network = await provider.getNetwork();
            
            return {
                address: accounts[0],
                chainId: window.ethereum.chainId,
                networkName: getNetworkName(window.ethereum.chainId),
                provider
            };
        }
        
        throw new Error('Nenhuma conta encontrada');
    } catch (error) {
        console.error('❌ Erro ao conectar MetaMask:', error);
        throw error;
    }
}

// ==================== EXPORTS GLOBAIS ====================

// Torna as funções disponíveis globalmente
window.TokenGlobal = {
    rpcFallbacks,
    formatarNumero,
    fetchTokenData,
    getNetworkName,
    getExplorerUrl,
    connectMetaMask
};

console.log('🎯 [TOKEN-GLOBAL] Módulo carregado - Funções disponíveis globalmente');
