/**
 * 🛒 COMPRA DE TOKENS DINÂMICA - VERSÃO SIMPLIFICADA
 * 
 * 📍 RESPONSABILIDADES:
 * - Interface dinâmica para compra de tokens via MetaMask
 * - Verificação de conexão e habilitação de campos
 * - Leitura dinâmica de contratos da blockchain
 * - Verificação de compatibilidade para compra direta
 * - Cálculo dinâmico de preços e execução de transações
 * - Detecção simples de contratos de venda (não múltiplos)
 * 
 * 🔗 DEPENDÊNCIAS:
 * - ethers.js v5.7.2
 * - MetaMaskConnector (shared/metamask-connector.js)
 * - CommonUtils (shared/common-utils.js)
 * - TokenGlobal (shared/token-global.js)
 */

// ==================== CONFIGURAÇÕES ====================

const CONFIG = {
    // Configurações dinâmicas (sem contrato fixo)
    contractAddress: null,
    saleContractAddress: null,
    
    // RPC Endpoints para BSC Testnet
    rpcUrls: {
        97: [
            'https://data-seed-prebsc-1-s1.binance.org:8545/',
            'https://data-seed-prebsc-2-s1.binance.org:8545/',
            'https://bsc-testnet-rpc.publicnode.com',
            'https://bsc-testnet.bnbchain.org'
        ]
    },
    
    // ABI básico para tokens ERC20
    tokenABI: [
        "function name() view returns (string)",
        "function symbol() view returns (string)",
        "function decimals() view returns (uint8)",
        "function totalSupply() view returns (uint256)",
        "function balanceOf(address) view returns (uint256)",
        "function transfer(address, uint256) returns (bool)",
        "function approve(address, uint256) returns (bool)",
        "function allowance(address, address) view returns (uint256)",
        
        // Eventos
        "event Transfer(address indexed from, address indexed to, uint256 value)",
        "event Approval(address indexed owner, address indexed spender, uint256 value)",
        
        // Funções comuns de compra
        "function buy() payable",
        "function buyTokens() payable",
        "function buyToken() payable",
        "function purchase() payable",
        "function buyWithBNB() payable",
        "function buyWithETH() payable",
        
        // Funções de informação de venda
        "function price() view returns (uint256)",
        "function tokenPrice() view returns (uint256)",
        "function getPrice() view returns (uint256)",
        "function salePrice() view returns (uint256)",
        "function tokensForSale() view returns (uint256)",
        "function tokensAvailable() view returns (uint256)",
        "function isWhitelisted(address) view returns (bool)",
        "function purchaseLimit(address) view returns (uint256)",
        "function hasPurchased(address) view returns (bool)",
        
        // Funções de cálculo específicas
        "function calculateTokensForEth(uint256 ethAmount) view returns (uint256)",
        "function calculateEthForTokens(uint256 tokenAmount) view returns (uint256)",
        "function getTokensForEth(uint256 ethAmount) view returns (uint256)",
        "function getEthForTokens(uint256 tokenAmount) view returns (uint256)"
    ],
    
    // ABI para contratos de venda (sale contracts)
    saleContractABI: [
        // Funções para detectar token
        "function token() view returns (address)",
        "function tokenAddress() view returns (address)",
        "function getToken() view returns (address)",
        "function tokenContract() view returns (address)",
        "function saleToken() view returns (address)",
        "function targetToken() view returns (address)",
        "function purchaseToken() view returns (address)",
        "function sellToken() view returns (address)",
        
        // Funções de compra
        "function buy() payable",
        "function buyTokens() payable",
        "function buyToken() payable",
        "function purchase() payable",
        "function buyWithBNB() payable",
        "function buyWithETH() payable",
        
        // Funções de informação
        "function price() view returns (uint256)",
        "function tokenPrice() view returns (uint256)",
        "function getPrice() view returns (uint256)",
        "function salePrice() view returns (uint256)",
        "function tokensForSale() view returns (uint256)",
        "function tokensAvailable() view returns (uint256)",
        "function saleActive() view returns (bool)",
        "function saleEnabled() view returns (bool)"
    ],
    
    // Configurações de gas
    gasLimit: 200000,
    gasPrice: "5000000000" // 5 gwei
};

// ==================== ESTADO GLOBAL ====================

let currentProvider = null;
let currentSigner = null;
let walletConnected = false;
let walletAddress = '';
let networkData = {};
let currentContract = null;
let currentSaleContract = null;
let tokenInfo = {};

// Variáveis de controle para evitar execuções múltiplas
let walletBalanceLoaded = false;
let providerInitialized = false;
let balanceUpdateInProgress = false;
let buyFunctionName = null;

// ==================== INICIALIZAÇÃO ====================

/**
 * Inicialização principal
 */
document.addEventListener('DOMContentLoaded', function() {
    console.log('🛒 Sistema de Compra Dinâmica iniciado');
    
    // Oculta a seção de compra no início
    const purchaseSection = document.getElementById('purchase-section');
    if (purchaseSection) {
        purchaseSection.style.display = 'none';
        console.log('🔒 Seção de compra garantidamente OCULTA no início');
    }
    
    // Bloqueia botão de compra até validação completa
    const purchaseBtn = document.getElementById('purchase-btn');
    if (purchaseBtn) {
        purchaseBtn.disabled = true;
        console.log('🔒 Estado inicial: Seção de compra BLOQUEADA até validação do contrato');
    }
    
    // Configurar event listeners
    setupEventListeners();
    
    // Verificar conexão existente
    checkExistingConnection();
    
    // Inicializa monitoramento de saldo
    initializeBalanceMonitoring();
});

/**
 * Verifica conexão existente da MetaMask
 */
async function checkExistingConnection() {
    if (typeof window.ethereum !== 'undefined') {
        try {
            const accounts = await window.ethereum.request({
                method: 'eth_accounts'
            });
            
            if (accounts.length > 0) {
                walletAddress = accounts[0];
                walletConnected = true;
                await detectNetwork();
                updateWalletUI();
                // Carregar saldo inicial se já conectado (apenas uma vez)
                if (!walletBalanceLoaded) {
                    setTimeout(() => {
                        updateWalletBalance();
                        walletBalanceLoaded = true;
                    }, 800);
                }
            }
        } catch (error) {
            console.log('Wallet não conectada previamente');
        }
    }
}

/**
 * Configura event listeners
 */
function setupEventListeners() {
    // Botão de conectar MetaMask
    const connectBtn = document.getElementById('connect-metamask-btn');
    if (connectBtn) {
        connectBtn.addEventListener('click', connectWallet);
        console.log('✅ Event listener configurado para conectar MetaMask');
    }
    
    // Botão de verificar contrato
    const verifyBtn = document.getElementById('verify-contract-btn');
    if (verifyBtn) {
        verifyBtn.addEventListener('click', verifyContract);
        console.log('✅ Event listener configurado para verificar contrato');
    }
    
    // Botão de compra
    const purchaseBtn = document.getElementById('purchase-btn');
    if (purchaseBtn) {
        purchaseBtn.addEventListener('click', executePurchase);
        console.log('✅ Event listener configurado para botão de compra');
    }
    
    // Botão de limpar dados (reload)
    const clearBtn = document.getElementById('clear-data-btn');
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            console.log('🔄 Limpando dados e reiniciando página...');
            location.reload();
        });
        console.log('✅ Event listener configurado para botão de limpar dados (reload)');
    }
    
    // Botão de atualizar saldo
    const refreshBalanceBtn = document.getElementById('refresh-balance-btn');
    if (refreshBalanceBtn) {
        refreshBalanceBtn.addEventListener('click', () => {
            console.log('🔄 Atualizando saldo manualmente...');
            updateWalletBalance();
        });
        console.log('✅ Event listener configurado para botão de atualizar saldo');
    }
}

// ==================== INDICADORES DE CARREGAMENTO ====================

/**
 * Mostra indicador de carregamento em um botão
 */
function showButtonLoading(buttonId, loadingText = 'Carregando...') {
    const button = document.getElementById(buttonId);
    if (button) {
        button.originalText = button.textContent;
        button.innerHTML = `<span class="spinner-border spinner-border-sm me-2" role="status"></span>${loadingText}`;
        button.disabled = true;
    }
}

/**
 * Oculta indicador de carregamento em um botão
 */
function hideButtonLoading(buttonId, originalText = null) {
    const button = document.getElementById(buttonId);
    if (button) {
        const text = originalText || button.originalText || button.textContent;
        button.innerHTML = text;
        button.disabled = false;
    }
}

/**
 * Mostra mensagem de carregamento em um elemento
 */
function showLoadingMessage(elementId, message = 'Carregando...') {
    const element = document.getElementById(elementId);
    if (element) {
        element.innerHTML = `
            <div class="text-center py-3">
                <div class="spinner-border text-primary me-2" role="status"></div>
                <span>${message}</span>
            </div>
        `;
    }
}

// ==================== CONEXÃO COM CARTEIRA ====================

/**
 * Conecta com a MetaMask
 */
async function connectWallet() {
    if (typeof window.ethereum === 'undefined') {
        alert('MetaMask não está instalada! Por favor, instale a extensão MetaMask.');
        return;
    }
    
    try {
        showButtonLoading('connect-metamask-btn', 'Conectando...');
        
        const accounts = await window.ethereum.request({
            method: 'eth_requestAccounts'
        });
        
        if (accounts.length > 0) {
            walletAddress = accounts[0];
            walletConnected = true;
            
            // Atualiza UI
            await detectNetwork();
            updateWalletUI();
            
            // Carregar saldo após conectar (apenas uma vez)
            setTimeout(() => {
                updateWalletBalance();
            }, 800);
            
            console.log('✅ Wallet conectada:', walletAddress);
        }
        
    } catch (error) {
        console.error('❌ Erro ao conectar wallet:', error);
        alert('Erro ao conectar com a MetaMask: ' + error.message);
        // Restaura botão em caso de erro
        hideButtonLoading('connect-metamask-btn', '<i class="bi bi-wallet2 me-2"></i>CONECTAR');
    }
}

/**
 * Atualiza saldo da carteira (com controle de execuções múltiplas)
 */
async function updateWalletBalance() {
    // Evitar execuções múltiplas simultâneas
    if (balanceUpdateInProgress) {
        console.log('⏳ Atualização de saldo já em progresso, ignorando...');
        return;
    }
    
    const balanceElement = document.getElementById('wallet-balance-display');
    const balanceContainer = document.getElementById('wallet-balance-info');
    
    if (!walletConnected || !walletAddress) {
        // Esconder seção se não conectado
        if (balanceContainer) {
            balanceContainer.style.display = 'none';
        }
        return;
    }
    
    if (!balanceElement) {
        console.error('❌ Elemento wallet-balance-display não encontrado');
        return;
    }
    
    try {
        balanceUpdateInProgress = true;
        console.log('💰 Atualizando saldo da carteira...');
        console.log(`👤 Endereço: ${walletAddress}`);
        console.log(`🔗 Conectado: ${walletConnected}`);
        
        // Mostra loading no saldo
        balanceElement.innerHTML = '<span class="spinner-border spinner-border-sm me-1" role="status"></span>Carregando...';
        if (balanceContainer) {
            balanceContainer.style.display = 'block';
        }
        
        // Garante que o provider está inicializado
        if (!currentProvider) {
            console.log('⚙️ Provider não encontrado, inicializando...');
            currentProvider = await initializeProviderWithFallback();
        }
        
        console.log('🌐 Provider pronto, buscando saldo...');
        
        const balanceRaw = await currentProvider.getBalance(walletAddress);
        console.log(`💰 Saldo raw: ${balanceRaw.toString()} wei`);
        
        const balanceInBNB = parseFloat(ethers.utils.formatEther(balanceRaw));
        console.log(`💰 Saldo em BNB: ${balanceInBNB}`);
        
        // Formatar para exibição
        const formattedBalance = formatNumber(balanceInBNB);
        console.log(`💰 Saldo formatado: ${formattedBalance}`);
        
        balanceElement.textContent = formattedBalance;
        
        // Mostrar seção do saldo
        if (balanceContainer) {
            balanceContainer.style.display = 'block';
        }
        
        console.log(`✅ Saldo da carteira exibido: ${formattedBalance} BNB`);
        
    } catch (error) {
        console.error('❌ Erro ao buscar saldo da carteira:', error);
        balanceElement.textContent = 'Erro ao carregar';
        
        // Mostrar seção mesmo com erro
        if (balanceContainer) {
            balanceContainer.style.display = 'block';
        }
    } finally {
        // Libera controle de execução múltipla
        balanceUpdateInProgress = false;
    }
}

/**
 * Atualiza UI da carteira
 */
function updateWalletUI() {
    const walletInfo = document.getElementById('wallet-info');
    const walletAddressElement = document.getElementById('wallet-address');
    const connectBtn = document.getElementById('connect-metamask-btn');
    const networkSection = document.getElementById('network-section');
    
    if (walletConnected && walletAddress) {
        // Atualiza informações da carteira
        if (walletAddressElement) {
            // Formatar endereço com fonte maior
            walletAddressElement.innerHTML = `
                <span style="font-size: 14px;">${walletAddress.slice(0,6)}...${walletAddress.slice(-4)}</span>
            `;
        }
        
        // Mostra seção de informações da carteira
        if (walletInfo) {
            walletInfo.style.display = 'block';
        }
        
        // Esconde botão de conectar
        if (connectBtn) {
            connectBtn.style.display = 'none';
        }
        
        // Mostra info da rede
        if (networkSection) {
            networkSection.style.display = 'block';
        }
        
        // Atualiza saldo da carteira (apenas uma vez)
        updateWalletBalance();
        
        // Habilita seção de contrato apenas após conexão
        enableContractSection();
    }
}

/**
 * Detecta a rede atual
 */
async function detectNetwork() {
    try {
        const chainId = await window.ethereum.request({
            method: 'eth_chainId'
        });
        
        const chainIdDecimal = parseInt(chainId, 16);
        console.log(`🌐 Rede detectada: ${getNetworkName(chainIdDecimal)} (${chainIdDecimal})`);
        
        networkData = {
            chainId: chainIdDecimal,
            name: getNetworkName(chainIdDecimal)
        };
        
        // Atualiza UI da rede
        updateNetworkUI();
        
        return networkData;
        
    } catch (error) {
        console.error('❌ Erro ao detectar rede:', error);
        return null;
    }
}

/**
 * Obtém nome da rede baseado no Chain ID
 */
function getNetworkName(chainId) {
    const networks = {
        1: 'Ethereum Mainnet',
        56: 'BSC Mainnet',
        97: 'BSC Testnet',
        137: 'Polygon Mainnet',
        80001: 'Polygon Mumbai',
        43114: 'Avalanche Mainnet',
        43113: 'Avalanche Fuji'
    };
    
    return networks[chainId] || `Rede ${chainId}`;
}

/**
 * Atualiza UI da rede
 */
function updateNetworkUI() {
    const networkName = document.getElementById('network-name');
    const chainIdElement = document.getElementById('chain-id');
    
    if (networkName && networkData.name) {
        networkName.textContent = networkData.name;
    }
    
    if (chainIdElement && networkData.chainId) {
        chainIdElement.textContent = networkData.chainId;
    }
    
    // Mostra informações da rede
    const networkSection = document.getElementById('network-section');
    if (networkSection) {
        networkSection.style.display = 'block';
    }
}

/**
 * Habilita seção de contrato após conexão da wallet
 */
function enableContractSection() {
    const contractSection = document.getElementById('contract-section');
    if (contractSection) {
        contractSection.style.display = 'block';
        console.log('✅ Seção de contrato habilitada após conexão');
    }
}

// ==================== DETECÇÃO DE CONTRATOS DE VENDA ====================

/**
 * Verifica se o contrato informado é um contrato de venda que aponta para outro token
 */
async function checkIfSaleContract(contractAddress) {
    console.log('🔍 Verificando se é contrato de venda...');
    
    try {
        // Lista de funções comuns em contratos de venda para detectar o token
        const tokenFunctions = [
            'token',           // Mais comum
            'tokenAddress',    // Comum
            'getToken',        // Alternativa
            'tokenContract',   // Alternativa
            'saleToken',       // Específico para sales
            'targetToken',     // Específico
            'purchaseToken',   // Específico
            'sellToken'        // Específico
        ];
        
        // ABI básico para contratos de venda
        const saleContractABI = [
            "function token() view returns (address)",
            "function tokenAddress() view returns (address)",
            "function getToken() view returns (address)",
            "function tokenContract() view returns (address)",
            "function saleToken() view returns (address)",
            "function targetToken() view returns (address)",
            "function purchaseToken() view returns (address)",
            "function sellToken() view returns (address)"
        ];
        
        const saleContract = new ethers.Contract(contractAddress, saleContractABI, currentProvider);
        
        // Testa cada função para encontrar o endereço do token
        for (const funcName of tokenFunctions) {
            try {
                console.log(`🔍 Testando função: ${funcName}()`);
                const tokenAddress = await saleContract[funcName]();
                
                if (tokenAddress && ethers.utils.isAddress(tokenAddress) && tokenAddress !== '0x0000000000000000000000000000000000000000') {
                    console.log(`✅ Token encontrado via ${funcName}(): ${tokenAddress}`);
                    
                    // Verificar se é um contrato válido
                    const code = await currentProvider.getCode(tokenAddress);
                    if (code !== '0x') {
                        console.log('✅ Contrato de token válido detectado!');
                        
                        return {
                            isSaleContract: true,
                            saleContractAddress: contractAddress,
                            tokenAddress: tokenAddress,
                            detectionMethod: funcName
                        };
                    }
                }
            } catch (error) {
                // Função não existe ou falhou, continua
                console.log(`❌ Função ${funcName}() não disponível`);
            }
        }
        
        console.log('ℹ️ Não é um contrato de venda ou token não detectado');
        return { isSaleContract: false };
        
    } catch (error) {
        console.error('❌ Erro ao verificar contrato de venda:', error);
        return { isSaleContract: false };
    }
}

// ==================== VERIFICAÇÃO DE CONTRATOS ====================

/**
 * Verifica o contrato informado pelo usuário
 */
async function verifyContract() {
    const contractInput = document.getElementById('contract-address');
    const contractMessages = document.getElementById('contract-messages');
    
    if (!contractInput || !contractMessages) {
        console.error('❌ Elementos não encontrados');
        return;
    }
    
    const contractAddress = contractInput.value.trim();
    
    if (!contractAddress) {
        addContractMessage('❌ Por favor, insira um endereço de contrato', 'error');
        return;
    }
    
    if (!ethers.utils.isAddress(contractAddress)) {
        addContractMessage('❌ Endereço de contrato inválido', 'error');
        return;
    }
    
    if (!walletConnected) {
        addContractMessage('❌ Conecte sua carteira primeiro', 'error');
        return;
    }
    
    try {
        showButtonLoading('verify-contract-btn', 'Verificando...');
        
        // Limpar mensagens anteriores
        contractMessages.innerHTML = '';
        
        // Garantir que o provider está inicializado
        if (!currentProvider) {
            addContractMessage('🔄 Inicializando conexão...', 'info');
            currentProvider = await initializeProviderWithFallback();
        }
        
        addContractMessage('🔍 Verificando contrato...', 'info');
        
        // Verificar se o endereço tem código (é um contrato)
        const code = await currentProvider.getCode(contractAddress);
        if (code === '0x') {
            addContractMessage('❌ Endereço não é um contrato válido', 'error');
            return;
        }
        
        addContractMessage('✅ Contrato válido encontrado', 'success');
        
        // PRIMEIRA VERIFICAÇÃO: É um contrato de venda?
        const saleContractInfo = await checkIfSaleContract(contractAddress);
        
        if (saleContractInfo.isSaleContract) {
            addContractMessage(`🎯 Contrato de venda detectado! Token: ${saleContractInfo.tokenAddress.slice(0,8)}...${saleContractInfo.tokenAddress.slice(-6)}`, 'success');
            
            // Configurar como contrato de venda
            CONFIG.contractAddress = saleContractInfo.tokenAddress;
            CONFIG.saleContractAddress = contractAddress;
            
            // Criar instância do token real
            currentContract = new ethers.Contract(saleContractInfo.tokenAddress, CONFIG.tokenABI, currentProvider);
            // Criar instância do contrato de venda
            currentSaleContract = new ethers.Contract(contractAddress, CONFIG.saleContractABI, currentProvider);
            
            addContractMessage('🔄 Verificando token associado...', 'info');
        } else {
            // É um contrato de token direto
            addContractMessage('🪙 Contrato de token detectado', 'info');
            
            CONFIG.contractAddress = contractAddress;
            CONFIG.saleContractAddress = null;
            
            // Criar instância do contrato
            currentContract = new ethers.Contract(contractAddress, CONFIG.tokenABI, currentProvider);
            currentSaleContract = null;
        }
        
        // Verificar funções ERC20
        await verifyERC20Functions();
        
        // Verificar funções de compra
        await verifyBuyFunctions();
        
        // Carregar informações do token
        await loadTokenInfo();
        
        // Mostrar informações do token
        showTokenInfo();
        
        addContractMessage('🎉 Token verificado e pronto para compra!', 'success');
        
    } catch (error) {
        console.error('❌ Erro na verificação:', error);
        addContractMessage(`❌ Erro na verificação: ${error.message}`, 'error');
    } finally {
        hideButtonLoading('verify-contract-btn', 'VERIFICAR CONTRATO');
    }
}

/**
 * Adiciona mensagem na área de contratos
 */
function addContractMessage(message, type = 'info') {
    const contractMessages = document.getElementById('contract-messages');
    if (!contractMessages) return;
    
    const alertClass = {
        'success': 'alert-success',
        'error': 'alert-danger',
        'warning': 'alert-warning',
        'info': 'alert-info'
    }[type] || 'alert-info';
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `alert ${alertClass} border-0 mb-2 p-2`;
    messageDiv.innerHTML = `<small>${message}</small>`;
    
    contractMessages.appendChild(messageDiv);
    
    // Auto-remove mensagens antigas (mantém apenas as últimas 5)
    const messages = contractMessages.children;
    if (messages.length > 5) {
        contractMessages.removeChild(messages[0]);
    }
    
    // Scroll para a mensagem mais recente
    contractMessages.scrollTop = contractMessages.scrollHeight;
}

/**
 * Verifica se o contrato possui as funções ERC20 básicas
 */
async function verifyERC20Functions() {
    const erc20Functions = ['name', 'symbol', 'decimals', 'totalSupply'];
    let validFunctions = 0;
    
    for (const funcName of erc20Functions) {
        try {
            await currentContract[funcName]();
            validFunctions++;
        } catch (error) {
            console.log(`❌ Função ${funcName}() não disponível`);
        }
    }
    
    const isERC20Compatible = validFunctions >= 3; // Pelo menos 3 das 4 funções
    
    if (isERC20Compatible) {
        addContractMessage(`✅ Token ERC20 compatível (${validFunctions}/4 funções)`, 'success');
    } else {
        addContractMessage(`⚠️ Token com compatibilidade limitada (${validFunctions}/4 funções)`, 'warning');
    }
    
    return isERC20Compatible;
}

/**
 * Verifica funções de compra disponíveis
 */
async function verifyBuyFunctions() {
    const buyFunctions = [
        'buy',
        'buyTokens', 
        'buyToken',
        'purchase',
        'buyWithBNB',
        'buyWithETH'
    ];
    
    let availableFunctions = [];
    const contractToCheck = currentSaleContract || currentContract;
    
    for (const funcName of buyFunctions) {
        try {
            // Tenta acessar a função (sem executar)
            const func = contractToCheck[funcName];
            if (func) {
                availableFunctions.push(funcName);
            }
        } catch (error) {
            // Função não existe
        }
    }
    
    if (availableFunctions.length > 0) {
        buyFunctionName = availableFunctions[0]; // Usa a primeira disponível
        const contractType = currentSaleContract ? 'contrato de venda' : 'contrato do token';
        addContractMessage(`✅ Função de compra encontrada: ${buyFunctionName}() no ${contractType}`, 'success');
        
        // Habilita seção de compra
        enablePurchaseSection();
    } else {
        buyFunctionName = null;
        addContractMessage('⚠️ Nenhuma função de compra padrão encontrada', 'warning');
        
        // Mesmo assim habilita para tentar compra manual
        enablePurchaseSection();
    }
}

/**
 * Carrega informações do token
 */
async function loadTokenInfo() {
    try {
        tokenInfo = {};
        
        // Tentar carregar informações básicas
        try {
            tokenInfo.name = await currentContract.name();
        } catch (e) {
            tokenInfo.name = 'Token Desconhecido';
        }
        
        try {
            tokenInfo.symbol = await currentContract.symbol();
        } catch (e) {
            tokenInfo.symbol = 'N/A';
        }
        
        try {
            tokenInfo.decimals = await currentContract.decimals();
        } catch (e) {
            tokenInfo.decimals = 18;
        }
        
        try {
            const supply = await currentContract.totalSupply();
            tokenInfo.totalSupply = ethers.utils.formatUnits(supply, tokenInfo.decimals);
        } catch (e) {
            tokenInfo.totalSupply = 'N/A';
        }
        
        // Tentar carregar preço
        const contractToCheckPrice = currentSaleContract || currentContract;
        const priceFunctions = ['price', 'tokenPrice', 'getPrice', 'salePrice'];
        
        for (const priceFunc of priceFunctions) {
            try {
                const price = await contractToCheckPrice[priceFunc]();
                tokenInfo.price = ethers.utils.formatEther(price);
                tokenInfo.priceFunction = priceFunc;
                break;
            } catch (e) {
                // Função não existe, tenta próxima
            }
        }
        
        if (!tokenInfo.price) {
            tokenInfo.price = 'N/A';
        }
        
        console.log('📊 Informações do token carregadas:', tokenInfo);
        
    } catch (error) {
        console.error('❌ Erro ao carregar informações do token:', error);
    }
}

/**
 * Mostra informações do token na interface
 */
function showTokenInfo() {
    const tokenInfoSection = document.getElementById('token-info');
    if (!tokenInfoSection) return;
    
    const tokenNameElement = document.getElementById('token-name');
    const tokenSymbolElement = document.getElementById('token-symbol');
    const tokenDecimalsElement = document.getElementById('token-decimals');
    const tokenSupplyElement = document.getElementById('token-supply');
    const tokenPriceElement = document.getElementById('token-price');
    const tokenAddressElement = document.getElementById('token-address');
    
    if (tokenNameElement) tokenNameElement.textContent = tokenInfo.name || 'N/A';
    if (tokenSymbolElement) tokenSymbolElement.textContent = tokenInfo.symbol || 'N/A';
    if (tokenDecimalsElement) tokenDecimalsElement.textContent = tokenInfo.decimals || 'N/A';
    if (tokenSupplyElement) tokenSupplyElement.textContent = formatNumber(tokenInfo.totalSupply) || 'N/A';
    if (tokenPriceElement) tokenPriceElement.textContent = tokenInfo.price !== 'N/A' ? `${formatNumber(tokenInfo.price)} BNB` : 'N/A';
    if (tokenAddressElement) tokenAddressElement.textContent = CONFIG.contractAddress || 'N/A';
    
    // Mostrar seção
    tokenInfoSection.style.display = 'block';
    
    addContractMessage('📊 Informações do token carregadas', 'success');
}

/**
 * Habilita seção de compra
 */
function enablePurchaseSection() {
    const purchaseSection = document.getElementById('purchase-section');
    const purchaseBtn = document.getElementById('purchase-btn');
    
    if (purchaseSection) {
        purchaseSection.style.display = 'block';
        console.log('✅ Seção de compra habilitada');
    }
    
    if (purchaseBtn) {
        purchaseBtn.disabled = false;
        console.log('✅ Botão de compra habilitado');
    }
}

// ==================== EXECUÇÃO DE COMPRA ====================

/**
 * Executa a compra de tokens
 */
async function executePurchase() {
    const amountInput = document.getElementById('bnb-amount');
    
    if (!amountInput) {
        alert('Campo de valor não encontrado');
        return;
    }
    
    const bnbAmount = parseFloat(amountInput.value);
    
    if (!bnbAmount || bnbAmount <= 0) {
        alert('Por favor, insira um valor válido em BNB');
        return;
    }
    
    if (!walletConnected) {
        alert('Conecte sua carteira primeiro');
        return;
    }
    
    if (!currentContract && !currentSaleContract) {
        alert('Nenhum contrato verificado');
        return;
    }
    
    try {
        showButtonLoading('purchase-btn', 'Comprando...');
        
        // Inicializar signer se necessário
        if (!currentSigner) {
            const provider = new ethers.providers.Web3Provider(window.ethereum);
            currentSigner = provider.getSigner();
        }
        
        const contractToUse = currentSaleContract || currentContract;
        const contractWithSigner = contractToUse.connect(currentSigner);
        
        // Preparar transação
        const valueInWei = ethers.utils.parseEther(bnbAmount.toString());
        
        let tx;
        
        if (buyFunctionName) {
            // Usar função específica encontrada
            console.log(`🔄 Executando compra via ${buyFunctionName}()...`);
            tx = await contractWithSigner[buyFunctionName]({
                value: valueInWei,
                gasLimit: CONFIG.gasLimit
            });
        } else {
            // Tentar função padrão "buy"
            console.log('🔄 Tentando função padrão buy()...');
            tx = await contractWithSigner.buy({
                value: valueInWei,
                gasLimit: CONFIG.gasLimit
            });
        }
        
        console.log('📝 Transação enviada:', tx.hash);
        addContractMessage(`📝 Transação enviada: ${tx.hash}`, 'info');
        
        // Aguardar confirmação
        const receipt = await tx.wait();
        
        if (receipt.status === 1) {
            console.log('✅ Compra realizada com sucesso!');
            addContractMessage('✅ Compra realizada com sucesso!', 'success');
            
            // Atualizar saldo da carteira
            setTimeout(() => {
                updateWalletBalance();
            }, 2000);
            
            // Limpar campo de valor
            amountInput.value = '';
            
        } else {
            console.error('❌ Transação falhou');
            addContractMessage('❌ Transação falhou', 'error');
        }
        
    } catch (error) {
        console.error('❌ Erro na compra:', error);
        
        let errorMessage = 'Erro na transação';
        if (error.message.includes('user rejected')) {
            errorMessage = 'Transação cancelada pelo usuário';
        } else if (error.message.includes('insufficient funds')) {
            errorMessage = 'Saldo insuficiente';
        } else if (error.message.includes('gas')) {
            errorMessage = 'Erro de gas - tente ajustar o limite';
        }
        
        addContractMessage(`❌ ${errorMessage}`, 'error');
        
    } finally {
        hideButtonLoading('purchase-btn', '<i class="bi bi-cart-plus me-2"></i>COMPRAR TOKENS');
    }
}

// ==================== UTILITÁRIOS ====================

/**
 * Formata números para exibição
 */
function formatNumber(value, decimals = 6) {
    if (!value || value === 'N/A') return 'N/A';
    
    const num = parseFloat(value);
    if (isNaN(num)) return 'N/A';
    
    // Para números muito pequenos, mostrar mais decimais
    if (num < 0.000001) {
        return num.toExponential(2);
    }
    
    // Para números normais, formatar com vírgulas
    return new Intl.NumberFormat('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: decimals
    }).format(num);
}

/**
 * Inicializa monitoramento de saldo
 */
function initializeBalanceMonitoring() {
    // Monitorar mudanças de conta
    if (typeof window.ethereum !== 'undefined') {
        window.ethereum.on('accountsChanged', function (accounts) {
            if (accounts.length === 0) {
                // Desconectou
                walletConnected = false;
                walletAddress = '';
                location.reload();
            } else if (accounts[0] !== walletAddress) {
                // Mudou de conta
                walletAddress = accounts[0];
                updateWalletUI();
                updateWalletBalance();
            }
        });
        
        // Monitorar mudanças de rede
        window.ethereum.on('chainChanged', function (chainId) {
            console.log('🔄 Rede alterada, recarregando página...');
            location.reload();
        });
    }
    
    // Verificação periódica menos frequente (60 segundos se conectado)
    setInterval(() => {
        if (walletConnected && walletAddress && !balanceUpdateInProgress) {
            console.log('🔄 Verificação periódica do saldo...');
            updateWalletBalance();
        }
    }, 60000); // 60 segundos
}

// ==================== SISTEMA DE FALLBACK RPC ====================

/**
 * Inicializa provider com fallback para resolver problemas de RPC
 * ESTRATÉGIA: Usa APENAS RPC público para leitura, MetaMask apenas para transações
 */
async function initializeProviderWithFallback() {
    // Evitar inicializações múltiplas
    if (providerInitialized && currentProvider) {
        console.log('🔄 Provider já inicializado, reutilizando...');
        return currentProvider;
    }
    
    console.log('🔄 Inicializando provider com estratégia RPC-primeiro');
    
    // NUNCA usa MetaMask para operações de leitura
    // Detecta chain ID da MetaMask para usar RPC correspondente
    let chainId = 97; // BSC Testnet padrão
    
    try {
        const currentChainId = await window.ethereum.request({ method: 'eth_chainId' });
        chainId = parseInt(currentChainId, 16);
        console.log(`🌐 Chain ID detectado: ${chainId}`);
    } catch (error) {
        console.warn('⚠️ Não foi possível detectar chain ID, usando BSC Testnet (97)');
    }
    
    // Busca endpoints RPC para a rede
    const rpcEndpoints = getFallbackRpcUrl(chainId);
    
    try {
        console.log(`🔍 Testando ${rpcEndpoints.length} endpoints RPC...`);
        
        for (let i = 0; i < rpcEndpoints.length; i++) {
            const rpcUrl = rpcEndpoints[i];
            try {
                console.log(`🔍 Testando RPC ${i + 1}/${rpcEndpoints.length}: ${rpcUrl}`);
                
                const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
                
                // Teste rápido de conectividade (3s timeout)
                const network = await Promise.race([
                    provider.getNetwork(),
                    new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 3000))
                ]);
                
                console.log(`✅ RPC funcionando: ${rpcUrl} - Rede: ${network.name} (${network.chainId})`);
                return provider;
                
            } catch (error) {
                console.warn(`❌ RPC ${i + 1} falhou: ${rpcUrl} - ${error.message}`);
            }
        }
        
        throw new Error('❌ Todos os RPC endpoints falharam - verifique sua conexão com a internet');
        
    } catch (error) {
        console.error('❌ Falha crítica na inicialização do provider:', error);
        
        // FALLBACK FINAL: Tenta usar qualquer provider disponível
        try {
            console.log('🔄 Tentativa de fallback final...');
            const fallbackProvider = new ethers.providers.JsonRpcProvider('https://bsc-testnet-rpc.publicnode.com');
            await fallbackProvider.getNetwork(); // Teste básico
            
            console.log('✅ Provider de fallback funcionando');
            
            // Atualiza provider global
            currentProvider = fallbackProvider;
            currentSigner = null; // Sem signer no RPC público
            providerInitialized = true; // Marca como inicializado
            
            return fallbackProvider;
            
        } catch (finalError) {
            console.error('💥 Falha total na inicialização do provider:', finalError);
            throw new Error('Não foi possível conectar-se à blockchain. Verifique sua conexão com a internet.');
        }
    }
}

/**
 * Obtém URL de RPC fallback baseado na rede
 */
function getFallbackRpcUrl(chainId) {
    const rpcUrls = {
        97: [
            'https://data-seed-prebsc-1-s1.binance.org:8545/',
            'https://data-seed-prebsc-2-s1.binance.org:8545/',
            'https://bsc-testnet-rpc.publicnode.com',
            'https://bsc-testnet.bnbchain.org'
        ],
        56: [
            'https://bsc-dataseed1.binance.org/',
            'https://bsc-dataseed2.binance.org/',
            'https://bsc-rpc.publicnode.com',
            'https://rpc.ankr.com/bsc'
        ],
        1: [
            'https://ethereum-rpc.publicnode.com',
            'https://rpc.ankr.com/eth',
            'https://eth.llamarpc.com'
        ],
        137: [
            'https://polygon-rpc.com/',
            'https://rpc.ankr.com/polygon',
            'https://polygon.llamarpc.com'
        ]
    };
    
    return rpcUrls[chainId] || rpcUrls[97]; // Default para BSC Testnet
}

// ==================== INICIALIZAÇÃO FINAL ====================

console.log('🚀 Sistema de Compra Dinâmica carregado e pronto');
