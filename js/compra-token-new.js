/**
 * 🛒 COMPRA DE TOKENS DINÂMICA - MÓDULO ESPECÍFICO
 * 
 * 📍 RESPONSABILIDADES:
 * - Interface dinâmica para compra de tokens via MetaMask
 * - Verificação de conexão e habilitação de campos
 * - Leitura dinâmica de contratos da blockchain
 * - Verificação de compatibilidade para compra direta
 * - Cálculo dinâmico de preços e execução de transações
 * 
 * 🔗 DEPENDÊNCIAS:
 * - ethers.js v5.7.2
 * - MetaMaskConnector (shared/metamask-connector.js) - REUTILIZADO
 * - CommonUtils (shared/common-utils.js) - REUTILIZADO
 * - TokenGlobal (shared/token-global.js) - REUTILIZADO
 * 
 * 📤 EXPORTS:
 * - DynamicTokenPurchase: Classe principal
 * - Funções utilitárias específicas de compra dinâmica
 */

// ==================== CONFIGURAÇÕES ====================

const CONFIG = {
    // Configurações dinâmicas (sem contrato fixo)
    defaultTokenPrice: "0.001", // BNB por token (padrão)
    supportedChains: [56, 97], // BSC Mainnet e Testnet
    
    // ABI estendido para verificação completa
    tokenABI: [
        // Funções básicas ERC-20
        "function balanceOf(address owner) view returns (uint256)",
        "function totalSupply() view returns (uint256)",
        "function name() view returns (string)",
        "function symbol() view returns (string)",
        "function decimals() view returns (uint8)",
        "function transfer(address to, uint256 amount) returns (bool)",
        
        // Funções para verificar compra direta
        "function buy() payable",
        "function buyTokens() payable",
        "function purchase() payable",
        "function tokenPrice() view returns (uint256)",
        "function price() view returns (uint256)",
        "function getPrice() view returns (uint256)"
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
let tokenInfo = {};
let buyFunctionName = null;

// ==================== INICIALIZAÇÃO ====================

/**
 * Inicialização principal
 */
document.addEventListener('DOMContentLoaded', function() {
    console.log('🛒 Sistema de Compra Dinâmica iniciado');
    
    initializeWalletConnection();
    setupEventListeners();
    checkInitialWalletState();
});

/**
 * Verifica estado inicial da wallet (sem tentar conectar)
 */
async function checkInitialWalletState() {
    if (typeof window.ethereum !== 'undefined') {
        try {
            // Apenas verifica se já está conectado, sem solicitar
            const accounts = await window.ethereum.request({
                method: 'eth_accounts'
            });
            
            if (accounts.length > 0) {
                walletAddress = accounts[0];
                walletConnected = true;
                await detectNetwork();
                updateWalletUI();
                enableContractSection();
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
    // Conexão MetaMask
    const connectBtn = document.getElementById('connect-metamask-btn');
    if (connectBtn) {
        connectBtn.addEventListener('click', connectWallet);
    }
    
    // Verificação de contrato
    const verifyBtn = document.getElementById('verify-contract-btn');
    if (verifyBtn) {
        verifyBtn.addEventListener('click', verifyContract);
    }
    
    // Campo de endereço do contrato
    const contractInput = document.getElementById('contract-address');
    if (contractInput) {
        contractInput.addEventListener('input', validateContractAddress);
    }
    
    // Campos de compra
    const quantityInput = document.getElementById('token-quantity');
    const priceInput = document.getElementById('token-price');
    
    if (quantityInput) {
        quantityInput.addEventListener('input', calculateTotal);
    }
    
    if (priceInput) {
        priceInput.addEventListener('input', calculateTotal);
    }
    
    // Botão de compra
    const purchaseBtn = document.getElementById('execute-purchase-btn');
    if (purchaseBtn) {
        purchaseBtn.addEventListener('click', executePurchase);
    }
}

// ==================== GERENCIAMENTO DE WALLET ====================

/**
 * Conecta com a MetaMask
 */
async function connectWallet() {
    try {
        if (typeof window.ethereum === 'undefined') {
            alert('MetaMask não detectado! Por favor, instale a MetaMask.');
            return;
        }
        
        console.log('🔗 Conectando com MetaMask...');
        
        // Solicita conexão
        const accounts = await window.ethereum.request({
            method: 'eth_requestAccounts'
        });
        
        if (accounts.length > 0) {
            walletAddress = accounts[0];
            walletConnected = true;
            
            // Atualiza UI
            await detectNetwork();
            updateWalletUI();
            enableContractSection();
            
            console.log('✅ Wallet conectada:', walletAddress);
        }
        
    } catch (error) {
        console.error('❌ Erro ao conectar wallet:', error);
        alert('Erro ao conectar com a MetaMask: ' + error.message);
    }
}

/**
 * Atualiza interface da wallet
 */
function updateWalletUI() {
    const statusInput = document.getElementById('wallet-status');
    const connectBtn = document.getElementById('connect-metamask-btn');
    const networkSection = document.getElementById('network-info-section');
    
    if (walletConnected && walletAddress) {
        // Status da wallet
        if (statusInput) {
            statusInput.value = `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`;
            statusInput.classList.add('text-success');
        }
        
        // Botão conectar
        if (connectBtn) {
            connectBtn.innerHTML = '<i class="bi bi-check-circle"></i> CONECTADO';
            connectBtn.classList.remove('btn-warning');
            connectBtn.classList.add('btn-success');
            connectBtn.disabled = true;
        }
        
        // Mostra info da rede
        if (networkSection) {
            networkSection.style.display = 'block';
        }
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
        
        networkData = getNetworkInfo(chainId);
        
        // Atualiza UI da rede
        const currentNetworkSpan = document.getElementById('current-network');
        const chainIdSpan = document.getElementById('chain-id-value');
        
        if (currentNetworkSpan) {
            currentNetworkSpan.textContent = networkData.name;
        }
        
        if (chainIdSpan) {
            chainIdSpan.textContent = networkData.chainId;
        }
        
        console.log('🌐 Rede detectada:', networkData);
        
    } catch (error) {
        console.error('❌ Erro ao detectar rede:', error);
    }
}

/**
 * Obtém informações da rede baseado no chainId
 */
function getNetworkInfo(chainId) {
    const networks = {
        '0x38': { name: 'BSC Mainnet', chainId: '56' },
        '0x61': { name: 'BSC Testnet', chainId: '97' },
        '0x1': { name: 'Ethereum Mainnet', chainId: '1' },
        '0x89': { name: 'Polygon Mainnet', chainId: '137' },
        '0xaa36a7': { name: 'Sepolia Testnet', chainId: '11155111' }
    };
    
    return networks[chainId] || { 
        name: 'Rede Desconhecida', 
        chainId: parseInt(chainId, 16).toString() 
    };
}

// ==================== GERENCIAMENTO DE CONTRATO ====================

/**
 * Habilita seção de contrato após conexão
 */
function enableContractSection() {
    const contractInput = document.getElementById('contract-address');
    const verifyBtn = document.getElementById('verify-contract-btn');
    
    if (contractInput) {
        contractInput.disabled = false;
        contractInput.placeholder = "0x1234567890123456789012345678901234567890";
    }
    
    if (verifyBtn) {
        verifyBtn.disabled = false;
    }
}

/**
 * Valida endereço do contrato
 */
function validateContractAddress() {
    const contractInput = document.getElementById('contract-address');
    const verifyBtn = document.getElementById('verify-contract-btn');
    
    if (contractInput && verifyBtn) {
        const address = contractInput.value.trim();
        
        // Verifica se é um endereço válido (42 caracteres, começando com 0x)
        const isValid = address.length === 42 && address.startsWith('0x');
        
        if (isValid) {
            contractInput.classList.remove('is-invalid');
            contractInput.classList.add('is-valid');
            verifyBtn.disabled = false;
        } else {
            contractInput.classList.remove('is-valid');
            if (address.length > 0) {
                contractInput.classList.add('is-invalid');
            }
            verifyBtn.disabled = true;
        }
    }
}

/**
 * Verifica o contrato na blockchain
 */
async function verifyContract() {
    const contractInput = document.getElementById('contract-address');
    const contractAddress = contractInput.value.trim();
    
    if (!contractAddress) {
        alert('Por favor, digite o endereço do contrato');
        return;
    }
    
    try {
        // Mostra loading
        updateVerifyButton(true);
        clearContractMessages();
        hideTokenInfo();
        
        addContractMessage('🔍 Verificando contrato na blockchain...', 'info');
        
        // Inicializa provider
        currentProvider = new ethers.providers.Web3Provider(window.ethereum);
        currentSigner = currentProvider.getSigner();
        
        // Verifica se o endereço tem código (é um contrato)
        const code = await currentProvider.getCode(contractAddress);
        if (code === '0x') {
            throw new Error('Endereço não é um smart contract válido');
        }
        
        addContractMessage('✅ Smart contract detectado', 'success');
        
        // Tenta criar instância do contrato
        currentContract = new ethers.Contract(contractAddress, CONFIG.tokenABI, currentProvider);
        
        // Verifica funções básicas ERC-20
        await verifyERC20Functions();
        
        // Verifica funções de compra
        await verifyBuyFunctions();
        
        // Mostra informações do token
        await loadTokenInfo();
        showTokenInfo();
        
        addContractMessage('🎉 Contrato verificado com sucesso!', 'success');
        
    } catch (error) {
        console.error('❌ Erro ao verificar contrato:', error);
        addContractMessage(`❌ Erro: ${error.message}`, 'error');
    } finally {
        updateVerifyButton(false);
    }
}

/**
 * Verifica funções básicas ERC-20
 */
async function verifyERC20Functions() {
    try {
        // Testa funções básicas
        await currentContract.name();
        await currentContract.symbol();
        await currentContract.decimals();
        await currentContract.totalSupply();
        
        updateCompatibilityStatus('erc20Status', '✅ Compatível', 'success');
        updateCompatibilityStatus('transferStatus', '✅ Detectada', 'success');
        addContractMessage('✅ Funções ERC-20 básicas detectadas', 'success');
        
    } catch (error) {
        updateCompatibilityStatus('erc20Status', '❌ Incompatível', 'error');
        updateCompatibilityStatus('transferStatus', '❌ Não detectada', 'error');
        throw new Error('Contrato não é ERC-20 compatível');
    }
}

/**
 * Verifica funções de compra disponíveis
 */
async function verifyBuyFunctions() {
    const buyFunctions = ['buy', 'buyTokens', 'purchase'];
    
    for (const funcName of buyFunctions) {
        try {
            // Verifica se a função existe tentando fazer um call estático
            const func = currentContract[funcName];
            if (func) {
                buyFunctionName = funcName;
                updateCompatibilityStatus('buyStatus', '✅ Disponível', 'success');
                addContractMessage(`✅ Função de compra "${funcName}" detectada`, 'success');
                return;
            }
        } catch (error) {
            // Função não existe, continua testando
        }
    }
    
    // Nenhuma função de compra encontrada
    updateCompatibilityStatus('buyStatus', '❌ Não disponível', 'warning');
    addContractMessage('⚠️ Função de compra direta não detectada', 'warning');
    buyFunctionName = null;
}

/**
 * Carrega informações do token
 */
async function loadTokenInfo() {
    try {
        tokenInfo = {
            name: await currentContract.name(),
            symbol: await currentContract.symbol(),
            decimals: await currentContract.decimals(),
            totalSupply: await currentContract.totalSupply(),
            contractBalance: await currentProvider.getBalance(currentContract.address)
        };
        
        // Tenta detectar preço
        try {
            let price = null;
            const priceFunctions = ['tokenPrice', 'price', 'getPrice'];
            
            for (const priceFunc of priceFunctions) {
                try {
                    price = await currentContract[priceFunc]();
                    break;
                } catch (e) {
                    // Função não existe, tenta próxima
                }
            }
            
            if (price) {
                tokenInfo.price = ethers.utils.formatEther(price);
            } else {
                tokenInfo.price = CONFIG.defaultTokenPrice;
            }
        } catch (error) {
            tokenInfo.price = CONFIG.defaultTokenPrice;
        }
        
        updateTokenInfoUI();
        enablePurchaseSection();
        
    } catch (error) {
        throw new Error(`Erro ao carregar informações do token: ${error.message}`);
    }
}

/**
 * Atualiza UI com informações do token
 */
function updateTokenInfoUI() {
    document.getElementById('tokenName').textContent = tokenInfo.name || '-';
    document.getElementById('tokenSymbol').textContent = tokenInfo.symbol || '-';
    document.getElementById('tokenDecimals').textContent = tokenInfo.decimals || '-';
    
    // Formata total supply
    const totalSupply = ethers.utils.formatUnits(tokenInfo.totalSupply, tokenInfo.decimals);
    document.getElementById('tokenTotalSupply').textContent = `${formatNumber(totalSupply)} ${tokenInfo.symbol}`;
    
    // Formata saldo do contrato
    const contractBalance = ethers.utils.formatEther(tokenInfo.contractBalance);
    document.getElementById('contractBalance').textContent = `${formatNumber(contractBalance)} BNB`;
    
    // Define preço
    const priceInput = document.getElementById('token-price');
    if (priceInput) {
        priceInput.value = tokenInfo.price;
    }
}

// ==================== GERENCIAMENTO DE COMPRA ====================

/**
 * Habilita seção de compra
 */
function enablePurchaseSection() {
    const section = document.getElementById('purchase-section');
    const priceInput = document.getElementById('token-price');
    const quantityInput = document.getElementById('token-quantity');
    const purchaseBtn = document.getElementById('execute-purchase-btn');
    
    if (section) section.style.display = 'block';
    if (priceInput) priceInput.disabled = false;
    if (quantityInput) quantityInput.disabled = false;
    if (purchaseBtn && buyFunctionName) purchaseBtn.disabled = false;
}

/**
 * Calcula total da compra
 */
function calculateTotal() {
    const priceInput = document.getElementById('token-price');
    const quantityInput = document.getElementById('token-quantity');
    const totalTokensSpan = document.getElementById('totalTokens');
    const totalPriceSpan = document.getElementById('totalPrice');
    
    if (priceInput && quantityInput && totalTokensSpan && totalPriceSpan) {
        const price = parseFloat(priceInput.value) || 0;
        const quantity = parseFloat(quantityInput.value) || 0;
        const total = price * quantity;
        
        totalTokensSpan.textContent = formatNumber(quantity);
        totalPriceSpan.textContent = `${formatNumber(total)} BNB`;
    }
}

/**
 * Executa a compra de tokens
 */
async function executePurchase() {
    if (!buyFunctionName) {
        alert('Este contrato não suporta compra direta');
        return;
    }
    
    const quantityInput = document.getElementById('token-quantity');
    const priceInput = document.getElementById('token-price');
    
    const quantity = parseFloat(quantityInput.value);
    const price = parseFloat(priceInput.value);
    
    if (!quantity || quantity <= 0) {
        alert('Por favor, digite uma quantidade válida');
        return;
    }
    
    if (!price || price <= 0) {
        alert('Por favor, digite um preço válido');
        return;
    }
    
    try {
        const totalValue = (price * quantity).toString();
        const valueInWei = ethers.utils.parseEther(totalValue);
        
        clearPurchaseMessages();
        addPurchaseMessage('🚀 Iniciando transação de compra...', 'info');
        
        // Executa a transação
        const contract = currentContract.connect(currentSigner);
        const tx = await contract[buyFunctionName]({
            value: valueInWei,
            gasLimit: CONFIG.gasLimit
        });
        
        addPurchaseMessage(`✅ Transação enviada: ${tx.hash}`, 'success');
        addPurchaseMessage('⏳ Aguardando confirmação...', 'info');
        
        // Aguarda confirmação
        const receipt = await tx.wait();
        
        addPurchaseMessage('🎉 Transação confirmada!', 'success');
        
        // Mostra detalhes da transação
        showTransactionDetails(receipt, quantity, totalValue);
        
    } catch (error) {
        console.error('❌ Erro na compra:', error);
        addPurchaseMessage(`❌ Erro: ${error.message}`, 'error');
    }
}

// ==================== FUNÇÕES AUXILIARES ====================

/**
 * Atualiza status de compatibilidade
 */
function updateCompatibilityStatus(elementId, text, type) {
    const element = document.getElementById(elementId);
    if (element) {
        element.textContent = text;
        element.className = `fw-bold mb-1 text-${type === 'success' ? 'success' : type === 'error' ? 'danger' : 'warning'}`;
    }
}

/**
 * Atualiza botão de verificação
 */
function updateVerifyButton(isLoading) {
    const btn = document.getElementById('verify-contract-btn');
    if (btn) {
        if (isLoading) {
            btn.innerHTML = '<i class="bi bi-arrow-clockwise spin me-2"></i>VERIFICANDO...';
            btn.disabled = true;
        } else {
            btn.innerHTML = '<i class="bi bi-search me-2"></i>VERIFICAR';
            btn.disabled = false;
        }
    }
}

/**
 * Mostra seção de informações do token
 */
function showTokenInfo() {
    const section = document.getElementById('token-info-section');
    if (section) {
        section.style.display = 'block';
    }
}

/**
 * Esconde seção de informações do token
 */
function hideTokenInfo() {
    const section = document.getElementById('token-info-section');
    if (section) {
        section.style.display = 'none';
    }
}

/**
 * Mostra detalhes da transação
 */
function showTransactionDetails(receipt, tokensQuantity, totalValue) {
    const section = document.getElementById('transactionDetails');
    if (section) {
        section.style.display = 'block';
        
        // Preenche os dados
        document.getElementById('txHash').textContent = receipt.transactionHash;
        document.getElementById('txTokensReceived').textContent = `${formatNumber(tokensQuantity)} ${tokenInfo.symbol}`;
        document.getElementById('txValue').textContent = `${formatNumber(totalValue)} BNB`;
        
        // Calcula gas usado
        const gasUsed = receipt.gasUsed;
        const gasPrice = receipt.effectiveGasPrice || ethers.utils.parseUnits('5', 'gwei');
        const gasCost = ethers.utils.formatEther(gasUsed.mul(gasPrice));
        document.getElementById('txGasPrice').textContent = `${formatNumber(gasCost)} BNB`;
        
        // Total pago
        const totalCost = parseFloat(totalValue) + parseFloat(gasCost);
        document.getElementById('txTotalCost').textContent = `${formatNumber(totalCost)} BNB`;
    }
}

/**
 * Formata números para exibição
 */
function formatNumber(num) {
    const number = parseFloat(num);
    if (isNaN(number)) return '0';
    
    if (number >= 1000000) {
        return (number / 1000000).toFixed(2) + 'M';
    } else if (number >= 1000) {
        return (number / 1000).toFixed(2) + 'K';
    } else if (number < 0.001 && number > 0) {
        return number.toExponential(3);
    } else {
        return number.toLocaleString('pt-BR', { maximumFractionDigits: 6 });
    }
}

// ==================== SISTEMA DE FEEDBACK ====================

/**
 * Adiciona mensagem na seção de contrato
 */
function addContractMessage(msg, type = 'info') {
    const listId = "contractErrors";
    const containerId = "contractResult";
    
    const container = document.getElementById(containerId);
    const list = document.getElementById(listId);
    
    if (container && list) {
        const li = document.createElement('li');
        li.innerHTML = msg;
        li.className = getMessageClass(type);
        list.appendChild(li);
        container.style.display = 'block';
        
        // Auto-scroll
        container.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
}

/**
 * Adiciona mensagem na seção de compra
 */
function addPurchaseMessage(msg, type = 'info') {
    const listId = "purchaseErrors";
    const containerId = "purchaseResult";
    
    const container = document.getElementById(containerId);
    const list = document.getElementById(listId);
    
    if (container && list) {
        const li = document.createElement('li');
        li.innerHTML = msg;
        li.className = getMessageClass(type);
        list.appendChild(li);
        container.style.display = 'block';
        
        // Auto-scroll
        container.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
}

/**
 * Limpa mensagens da seção de contrato
 */
function clearContractMessages() {
    const list = document.getElementById("contractErrors");
    const container = document.getElementById("contractResult");
    
    if (list) list.innerHTML = '';
    if (container) container.style.display = 'none';
}

/**
 * Limpa mensagens da seção de compra
 */
function clearPurchaseMessages() {
    const list = document.getElementById("purchaseErrors");
    const container = document.getElementById("purchaseResult");
    
    if (list) list.innerHTML = '';
    if (container) container.style.display = 'none';
}

/**
 * Retorna classe CSS baseada no tipo de mensagem
 */
function getMessageClass(type) {
    const classes = {
        'info': 'text-info',
        'success': 'text-success', 
        'warning': 'text-warning',
        'error': 'text-danger'
    };
    return classes[type] || 'text-info';
}

// ==================== FUNÇÕES GLOBAIS PARA COMPATIBILIDADE ====================

/**
 * Inicializa conexão da wallet (compatibilidade)
 */
function initializeWalletConnection() {
    // Monitora mudanças de rede e conta
    if (typeof window.ethereum !== 'undefined') {
        window.ethereum.on('accountsChanged', (accounts) => {
            if (accounts.length > 0) {
                walletAddress = accounts[0];
                walletConnected = true;
                updateWalletUI();
                enableContractSection();
            } else {
                walletConnected = false;
                walletAddress = '';
                // Reset da interface
                location.reload();
            }
        });
        
        window.ethereum.on('chainChanged', () => {
            // Recarrega a página quando muda de rede
            location.reload();
        });
    }
}

// ==================== EXPORTS ====================

// Tornar funções disponíveis globalmente para compatibilidade
window.DynamicTokenPurchase = {
    connectWallet,
    verifyContract,
    executePurchase,
    calculateTotal,
    addContractMessage,
    addPurchaseMessage,
    clearContractMessages,
    clearPurchaseMessages
};

// CSS para animação de loading
const style = document.createElement('style');
style.textContent = `
    .spin {
        animation: spin 1s linear infinite;
    }
    
    @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
    }
`;
document.head.appendChild(style);
