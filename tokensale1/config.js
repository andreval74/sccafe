// Configurações do sistema
const CONFIG = {
    // Rede BSC Testnet
    CHAIN_ID: 97,
    CHAIN_NAME: 'BSC Testnet',
    // RPCs mais confiáveis e atualizados
    RPC_URLS: [
        'https://bsc-testnet.publicnode.com',
        'https://bsc-testnet-rpc.publicnode.com',
        'https://endpoints.omniatech.io/v1/bsc/testnet/public',
        'https://bsc-testnet.blockpi.network/v1/rpc/public',
        'https://data-seed-prebsc-2-s1.binance.org:8545'
    ],
    RPC_URL: 'https://bsc-testnet.publicnode.com', // RPC principal mais estável
    EXPLORER_URL: 'https://testnet.bscscan.com',
    NATIVE_CURRENCY: {
        name: 'BNB',
        symbol: 'BNB',
        decimals: 18
    },
    
    // Configurações do token
    TOKEN: {
        symbol: 'SCCAFE',
        decimals: 18,
        image: '/imgs/sccafe.png'
    },
    
    // Configurações de transação
    GAS_LIMIT: 300000,
    MAX_RETRIES: 3,
    RETRY_DELAY: 2000, // Aumentado para 2 segundos
    
    // Mensagens
    MESSAGES: {
        WALLET_NOT_FOUND: '❌ MetaMask não encontrado! Instale a extensão.',
        WRONG_NETWORK: '❌ Rede incorreta! Mude para BSC Testnet.',
        INSUFFICIENT_BALANCE: '❌ Saldo insuficiente.',
        TRANSACTION_SUCCESS: '🎉 Transação realizada com sucesso!',
        CONTRACT_LOADED: '✅ Contrato carregado com sucesso!',
        WALLET_CONNECTED: '✅ Carteira conectada!',
        RPC_ERROR: '⚠️ Erro de conexão. Tentando RPC alternativo...',
        CONNECTION_FAILED: '❌ Falha na conexão. Tente novamente.'
    }
};

// ABI do contrato de venda
const SALE_CONTRACT_ABI = [
    {
        "inputs": [{"internalType": "uint256", "name": "_amount", "type": "uint256"}],
        "name": "sale",
        "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
        "stateMutability": "payable",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "getTokenSupply",
        "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [{"internalType": "address", "name": "_address", "type": "address"}],
        "name": "getTokenbalance",
        "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "totalSoldTokens",
        "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "totalReceivedFunds",
        "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "is_preselling",
        "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "anonymous": false,
        "inputs": [
            {"indexed": true, "internalType": "address", "name": "_owner", "type": "address"},
            {"indexed": false, "internalType": "uint256", "name": "_amount", "type": "uint256"},
            {"indexed": false, "internalType": "uint256", "name": "_bnb", "type": "uint256"}
        ],
        "name": "TokenPurchased",
        "type": "event"
    }
];