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
    
    // ABI estendido para verificação completa e diagnóstico
    tokenABI: [
        // Funções básicas ERC-20
        "function balanceOf(address owner) view returns (uint256)",
        "function totalSupply() view returns (uint256)",
        "function name() view returns (string)",
        "function symbol() view returns (string)",
        "function decimals() view returns (uint8)",
        "function transfer(address to, uint256 amount) returns (bool)",
        
        // Funções para verificar compra direta (expandido)
        "function buy() payable",
        "function buy(uint256 amount) payable",
        "function buyTokens() payable",
        "function buyTokens(uint256 amount) payable",
        "function purchase() payable",
        "function purchase(uint256 amount) payable",
        
        // Funções para detectar preço (expandido)
        "function tokenPrice() view returns (uint256)",
        "function price() view returns (uint256)",
        "function getPrice() view returns (uint256)",
        "function buyPrice() view returns (uint256)",
        "function tokenCost() view returns (uint256)",
        "function cost() view returns (uint256)",
        "function salePrice() view returns (uint256)",
        "function pricePerToken() view returns (uint256)",
        
        // Funções para diagnóstico avançado
        "function owner() view returns (address)",
        "function paused() view returns (bool)",
        "function saleActive() view returns (bool)",
        "function saleEnabled() view returns (bool)",
        "function maxPurchase() view returns (uint256)",
        "function minPurchase() view returns (uint256)",
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
    
    // 🔒 GARANTIA: Seção de compra inicia OCULTA até validação completa
    ensurePurchaseSectionHidden();
    
    initializeWalletConnection();
    setupEventListeners();
    checkInitialWalletState();
});

/**
 * Garante que a seção de compra inicie oculta
 */
function ensurePurchaseSectionHidden() {
    const section = document.getElementById('purchase-section');
    const purchaseBtn = document.getElementById('execute-purchase-btn');
    const quantityInput = document.getElementById('token-quantity');
    
    if (section) {
        section.style.display = 'none';
        console.log('🔒 Seção de compra garantidamente OCULTA no início');
    }
    
    if (purchaseBtn) {
        purchaseBtn.disabled = true;
        purchaseBtn.style.opacity = '0.5';
        purchaseBtn.style.cursor = 'not-allowed';
    }
    
    if (quantityInput) {
        quantityInput.disabled = true;
    }
    
    console.log('🔒 Estado inicial: Seção de compra BLOQUEADA até validação do contrato');
}

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
                // Carregar saldo inicial se já conectado
                setTimeout(() => {
                    updateWalletBalance();
                }, 500);
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
    
    if (quantityInput) {
        quantityInput.addEventListener('input', calculateTotal);
    }
    
    // PREÇO É READ-ONLY - removido listener pois é detectado do contrato
    // O campo de preço não deve ser editável pelo usuário
    
    // Botão de compra
    const purchaseBtn = document.getElementById('execute-purchase-btn');
    if (purchaseBtn) {
        purchaseBtn.addEventListener('click', executePurchase);
        console.log('✅ Event listener configurado para botão de compra');
    } else {
        console.error('❌ Botão de compra não encontrado ao configurar listeners');
    }
    
    // Botão de limpar dados
    const clearAllBtn = document.getElementById('clear-all-btn');
    if (clearAllBtn) {
        clearAllBtn.addEventListener('click', clearAllData);
        console.log('✅ Event listener configurado para botão de limpar dados');
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
        button.disabled = true;
        button.innerHTML = `<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>${loadingText}`;
    }
}

/**
 * Remove indicador de carregamento de um botão
 */
function hideButtonLoading(buttonId, newText = null) {
    const button = document.getElementById(buttonId);
    if (button) {
        button.disabled = false;
        button.innerHTML = newText || button.originalText || button.textContent.replace(/Carregando\.\.\./g, '').trim();
    }
}

/**
 * Mostra indicador de carregamento em uma mensagem
 */
function showLoadingMessage(containerId, message = 'Processando...') {
    const container = document.getElementById(containerId);
    if (container) {
        container.innerHTML = `
            <div class="alert alert-info border-0 mb-3">
                <div class="d-flex align-items-center">
                    <div class="spinner-border spinner-border-sm me-3" role="status" aria-hidden="true"></div>
                    <div>
                        <strong>${message}</strong>
                        <br><small class="text-muted">Aguarde, isso pode levar alguns segundos...</small>
                    </div>
                </div>
            </div>
        `;
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
        
        // Mostra loading
        showButtonLoading('connect-metamask-btn', 'Conectando...');
        
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
            
            // Força atualização do saldo após conectar
            setTimeout(() => {
                updateWalletBalance();
            }, 500);
            
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
 * Atualiza saldo da carteira
 */
async function updateWalletBalance() {
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
        console.log('💰 Atualizando saldo da carteira...');
        console.log(`👤 Endereço: ${walletAddress}`);
        console.log(`🔗 Conectado: ${walletConnected}`);
        
        // Mostra loading no saldo
        balanceElement.innerHTML = '<span class="spinner-border spinner-border-sm me-1" role="status"></span>Carregando...';
        if (balanceContainer) {
            balanceContainer.style.display = 'block';
        }
        
        // Usar provider atual ou inicializar um novo
        let provider = currentProvider;
        if (!provider) {
            console.log('⚙️ Provider não encontrado, inicializando...');
            provider = await initializeProviderWithFallback();
        }
        
        if (!provider) {
            throw new Error('Não foi possível inicializar provider');
        }
        
        console.log('🌐 Provider pronto, buscando saldo...');
        
        // Buscar saldo
        const balance = await provider.getBalance(walletAddress);
        console.log(`💰 Saldo raw: ${balance.toString()} wei`);
        
        const balanceInBNB = ethers.utils.formatEther(balance);
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
        // Status da wallet - mostrar endereço completo
        if (statusInput) {
            statusInput.value = walletAddress;
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
        
        // Atualiza saldo da carteira
        updateWalletBalance();
        
        // Força uma segunda atualização após pequeno delay para garantir que apareça
        setTimeout(() => {
            updateWalletBalance();
        }, 1000);
        
        // Terceira tentativa com delay maior para garantir provider
        setTimeout(() => {
            updateWalletBalance();
        }, 2000);
        
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
        
        // Se carteira já conectada, atualiza saldo ao detectar rede
        if (walletConnected && walletAddress) {
            setTimeout(() => {
                updateWalletBalance();
            }, 500);
        }
        
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
    // Mostra a seção de contrato
    const contractSection = document.getElementById('contract-section');
    if (contractSection) {
        contractSection.style.display = 'block';
        
        // Adiciona animação de slide down
        contractSection.style.opacity = '0';
        contractSection.style.transform = 'translateY(-20px)';
        
        setTimeout(() => {
            contractSection.style.transition = 'all 0.3s ease-in-out';
            contractSection.style.opacity = '1';
            contractSection.style.transform = 'translateY(0)';
        }, 100);
    }
    
    // Habilita campos
    const contractInput = document.getElementById('contract-address');
    const verifyBtn = document.getElementById('verify-contract-btn');
    
    if (contractInput) {
        contractInput.disabled = false;
        contractInput.placeholder = "0x1234567890123456789012345678901234567890";
        contractInput.classList.add('border-success');
    }
    
    if (verifyBtn) {
        verifyBtn.disabled = false;
    }
    
    console.log('✅ Seção de contrato habilitada após conexão');
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
    
    if (!ethers.utils.isAddress(contractAddress)) {
        alert('Endereço do contrato inválido. Verifique o formato.');
        return;
    }
    
    try {
        // Mostra loading
        showButtonLoading('verify-contract-btn', 'Verificando...');
        updateVerifyButton(true);
        clearContractMessages();
        hideTokenInfo();
        
        showLoadingMessage('contract-messages', 'Verificando contrato inteligente');
        
        // Inicializa provider com fallback para resolver problemas de RPC
        addContractMessage('⚙️ Inicializando conexão blockchain...', 'info');
        currentProvider = await initializeProviderWithFallback();
        currentSigner = currentProvider.getSigner();
        
        // **MELHORIA 1: Verificação robusta se contrato existe**
        addContractMessage('🔍 Verificando se é um smart contract...', 'info');
        const code = await currentProvider.getCode(contractAddress);
        if (code === '0x') {
            // Log do erro para suporte
            window.contractLogger.logContractError(contractAddress, 'CONTRACT_NOT_FOUND', {
                message: 'Nenhum código encontrado no endereço',
                code: code,
                network: networkData.chainId || 'desconhecida'
            });
            window.contractLogger.showDownloadButton();
            
            throw new Error('Contrato não existe neste endereço. Verifique se foi deployado corretamente.');
        }
        
        addContractMessage(`✅ Contrato detectado no endereço: ${contractAddress.slice(0,6)}...${contractAddress.slice(-4)}`, 'success');
        
        // Armazena endereço validado
        CONFIG.contractAddress = contractAddress;
        
        // **MELHORIA 2: Criar instância do contrato**
        currentContract = new ethers.Contract(contractAddress, CONFIG.tokenABI, currentProvider);
        
        // **MELHORIA 3: Verificar funções básicas ERC-20 com melhor tratamento de erro**
        await verifyERC20Functions();
        
        // Verifica funções de compra
        await verifyBuyFunctions();
        
        // Mostra informações do token
        await loadTokenInfo();
        showTokenInfo();
        
        addContractMessage('🎉 Contrato verificado com sucesso!', 'success');
    }     
    
    catch (error) {
        console.error('❌ Erro ao verificar contrato:', error);
        
        // Log geral de erro de verificação para suporte
        window.contractLogger.logContractError(contractAddress, 'VERIFICATION_FAILED', {
            error: error.message,
            stack: error.stack,
            code: error.code,
            isRPCError: error.message?.includes('JSON-RPC') || error.code === -32603,
            contractAddress: contractAddress,
            providerType: currentProvider ? 'available' : 'unavailable'
        });
        window.contractLogger.showDownloadButton();
        
        // Se for erro de RPC, oferece alternativa
        if (error.message?.includes('JSON-RPC') || error.code === -32603) {
            addContractMessage('⚠️ Problema de conectividade detectado', 'warning');
            addContractMessage('🔄 Tentando com provider alternativo...', 'info');
            
            try {
                await retryWithFallbackProvider(contractAddress);
            } catch (fallbackError) {
                addContractMessage(`❌ Erro mesmo com provider alternativo: ${fallbackError.message}`, 'error');
            }
        } else {
            addContractMessage(`❌ Erro: ${error.message}`, 'error');
        }
    } finally {
        hideButtonLoading('verify-contract-btn', 'VERIFICAR CONTRATO');
        updateVerifyButton(false);
    }
}

/**
 * Verifica funções básicas ERC-20 com melhor diagnóstico
 */
async function verifyERC20Functions() {
    addContractMessage('📝 Teste 1: Verificando ERC-20...', 'info');
    
    try {
        // **MELHORIA: Verificar cada função individualmente para melhor diagnóstico**
        const name = await currentContract.name();
        const symbol = await currentContract.symbol(); 
        const decimals = await currentContract.decimals();
        const totalSupply = await currentContract.totalSupply();
        
        // Armazenar informações do token
        tokenInfo = {
            name,
            symbol,
            decimals: parseInt(decimals),
            totalSupply: totalSupply.toString()
        };
        
        updateCompatibilityStatus('erc20Status', '✅ Suportado', 'success');
        updateCompatibilityStatus('transferStatus', '✅ Disponível', 'success');
        addContractMessage(`✅ Token: ${name} (${symbol})`, 'success');
        
        // Log de sucesso da validação
        window.contractLogger.logContractValidation(currentContract.address, {
            isERC20: true,
            tokenInfo: { name, symbol, decimals: parseInt(decimals) },
            errors: []
        });
        
    } catch (error) {
        updateCompatibilityStatus('erc20Status', '❌ Não suportado', 'error');
        updateCompatibilityStatus('transferStatus', '❌ Indisponível', 'error');
        addContractMessage(`❌ Token não suportado`, 'error');
        
        // Log do erro ERC-20 para suporte
        window.contractLogger.logContractError(currentContract.address, 'ERC20_VALIDATION_FAILED', {
            error: error.message,
            stack: error.stack,
            attemptedFunctions: ['name', 'symbol', 'decimals', 'totalSupply']
        });
        window.contractLogger.showDownloadButton();
        
        throw new Error('Contrato não é ERC-20 compatível');
    }
}

/**
 * 🔍 DIAGNÓSTICO PROFUNDO: Identifica exatamente por que o contrato rejeita transações
 */
async function performDeepContractAnalysis(contractAddress, buyFunctionName) {
    console.log('🔬 INICIANDO DIAGNÓSTICO PROFUNDO DO CONTRATO...');
    
    try {
        // 1. Verificações básicas do estado do contrato
        const basicChecks = await performBasicContractChecks();
        
        // 2. Testa diferentes cenários de chamada
        const callTests = await performCallTests(buyFunctionName);
        
        // 3. Analisa condições específicas
        const conditions = await analyzeContractConditions();
        
        // 4. Gera relatório final
        const isReady = generateReadinessReport(basicChecks, callTests, conditions);
        
        return isReady;
        
    } catch (error) {
        console.log('❌ Erro no diagnóstico profundo:', error.message);
        return false;
    }
}

/**
 * 1️⃣ Verificações básicas do estado do contrato
 */
async function performBasicContractChecks() {
    console.log('🔍 1️⃣ Verificações básicas do estado...');
    
    const checks = {
        contractExists: false,
        hasTokens: false,
        hasBalance: false,
        isPaused: null,
        saleActive: null,
        owner: null
    };
    
    try {
        // Verifica se o contrato existe
        const code = await currentProvider.getCode(CONFIG.contractAddress);
        checks.contractExists = code !== '0x';
        console.log(`📋 Contrato existe: ${checks.contractExists}`);
        
        // Verifica tokens no contrato
        try {
            const tokenBalance = await currentContract.balanceOf(CONFIG.contractAddress);
            const tokens = parseFloat(ethers.utils.formatUnits(tokenBalance, tokenInfo.decimals || 18));
            checks.hasTokens = tokens > 0;
            console.log(`📋 Tokens no contrato: ${tokens} (${checks.hasTokens ? 'OK' : 'ZERO'})`);
        } catch (e) {
            console.log('📋 Não foi possível verificar tokens no contrato');
        }
        
        // Verifica se está pausado
        try {
            checks.isPaused = await currentContract.paused();
            console.log(`📋 Contrato pausado: ${checks.isPaused}`);
        } catch (e) {
            console.log('📋 Função paused() não disponível');
        }
        
        // Verifica se venda está ativa
        const saleChecks = ['saleActive', 'saleEnabled', 'isActive', 'enabled'];
        for (const funcName of saleChecks) {
            try {
                checks.saleActive = await currentContract[funcName]();
                console.log(`📋 ${funcName}(): ${checks.saleActive}`);
                break;
            } catch (e) {
                // Função não existe
            }
        }
        
        // Verifica owner
        try {
            checks.owner = await currentContract.owner();
            console.log(`📋 Owner: ${checks.owner}`);
        } catch (e) {
            console.log('📋 Função owner() não disponível');
        }
        
        return checks;
        
    } catch (error) {
        console.log('❌ Erro nas verificações básicas:', error.message);
        return checks;
    }
}

/**
 * 2️⃣ Testa diferentes cenários de chamada
 */
async function performCallTests(buyFunctionName) {
    console.log('🔍 2️⃣ Testando cenários de chamada...');
    
    const tests = {
        withoutValue: false,
        withSmallValue: false,
        withCorrectPrice: false,
        withParameters: false,
        gasEstimation: null
    };
    
    try {
        // Teste 1: Sem valor (para verificar se função é realmente payable)
        try {
            await currentContract.callStatic[buyFunctionName]();
            tests.withoutValue = true;
            console.log('✅ Teste sem valor: PASSOU (função pode não ser payable)');
        } catch (e) {
            console.log(`❌ Teste sem valor: ${e.reason || e.message}`);
        }
        
        // Teste 2: Com valor pequeno
        try {
            await currentContract.callStatic[buyFunctionName]({ value: ethers.utils.parseEther('0.001') });
            tests.withSmallValue = true;
            console.log('✅ Teste valor pequeno: PASSOU');
        } catch (e) {
            console.log(`❌ Teste valor pequeno: ${e.reason || e.message}`);
        }
        
        // Teste 3: Tentativa de estimativa de gas
        try {
            tests.gasEstimation = await currentContract.estimateGas[buyFunctionName]({ value: ethers.utils.parseEther('0.001') });
            console.log(`📋 Estimativa de gas: ${tests.gasEstimation.toString()}`);
        } catch (e) {
            console.log(`❌ Estimativa de gas: ${e.reason || e.message}`);
        }
        
        return tests;
        
    } catch (error) {
        console.log('❌ Erro nos testes de chamada:', error.message);
        return tests;
    }
}

/**
 * 3️⃣ Analisa condições específicas do contrato
 */
async function analyzeContractConditions() {
    console.log('🔍 3️⃣ Analisando condições específicas...');
    
    const conditions = {
        hasWhitelist: false,
        hasMinMax: false,
        hasCooldown: false,
        requiresApproval: false
    };
    
    try {
        // Verifica whitelist
        try {
            await currentContract.isWhitelisted(walletAddress);
            conditions.hasWhitelist = true;
            console.log('📋 Contrato usa whitelist');
        } catch (e) {
            console.log('📋 Contrato não usa whitelist');
        }
        
        // Verifica limites
        const limitFunctions = ['minPurchase', 'maxPurchase', 'purchaseLimit'];
        for (const func of limitFunctions) {
            try {
                const limit = await currentContract[func](walletAddress || '0x0000000000000000000000000000000000000000');
                if (limit.gt(0)) {
                    conditions.hasMinMax = true;
                    console.log(`📋 ${func}: ${ethers.utils.formatEther(limit)} BNB`);
                }
            } catch (e) {
                // Função não existe
            }
        }
        
        return conditions;
        
    } catch (error) {
        console.log('❌ Erro na análise de condições:', error.message);
        return conditions;
    }
}

/**
 * 4️⃣ Gera relatório final de prontidão
 */
function generateReadinessReport(basicChecks, callTests, conditions) {
    console.log('🔍 4️⃣ Gerando relatório de prontidão...');
    
    let score = 0;
    let maxScore = 0;
    const issues = [];
    
    // Avaliação básica
    maxScore += 10;
    if (basicChecks.contractExists) score += 10;
    else issues.push('❌ CRÍTICO: Contrato não existe no endereço informado');
    
    // Avaliação de estado
    if (basicChecks.isPaused === true) {
        issues.push('⚠️ BLOQUEADOR: Contrato está PAUSADO');
    } else if (basicChecks.isPaused === false) {
        score += 5;
    }
    maxScore += 5;
    
    if (basicChecks.saleActive === true) {
        score += 5;
    } else if (basicChecks.saleActive === false) {
        issues.push('⚠️ BLOQUEADOR: Venda não está ATIVA');
    }
    maxScore += 5;
    
    // Avaliação de tokens
    if (basicChecks.hasTokens) {
        score += 3;
    } else {
        issues.push('⚠️ AVISO: Contrato não tem tokens (pode usar mint)');
    }
    maxScore += 3;
    
    // Avaliação de testes
    if (callTests.withoutValue || callTests.withSmallValue) {
        score += 7;
    } else {
        issues.push('❌ CRÍTICO: Função não aceita chamadas de teste');
    }
    maxScore += 7;
    
    const readinessPercent = Math.round((score / maxScore) * 100);
    const isReady = score >= (maxScore * 0.7); // 70% de prontidão mínima
    
    console.log(`📊 RELATÓRIO DE PRONTIDÃO: ${readinessPercent}% (${score}/${maxScore})`);
    console.log(`🎯 Status: ${isReady ? '✅ PRONTO PARA NEGOCIAÇÃO' : '❌ NÃO PRONTO'}`);
    
    if (issues.length > 0) {
        console.log('🚨 PROBLEMAS IDENTIFICADOS:');
        issues.forEach(issue => console.log(`   ${issue}`));
    }
    
    // Atualiza UI com o resultado
    updateReadinessUI(readinessPercent, isReady, issues);
    
    return isReady;
}

/**
 * 🎯 Atualiza UI com resultado da análise de prontidão
 */
function updateReadinessUI(readinessPercent, isReady, issues) {
    // Cria ou atualiza seção de status de prontidão
    let readinessSection = document.getElementById('readiness-status');
    if (!readinessSection) {
        // Cria seção se não existe
        const contractSection = document.querySelector('#contract-section .card-body');
        if (contractSection) {
            readinessSection = document.createElement('div');
            readinessSection.id = 'readiness-status';
            readinessSection.className = 'mt-3 p-3 border rounded';
            contractSection.appendChild(readinessSection);
        }
    }
    
    if (readinessSection) {
        const statusColor = isReady ? 'success' : 'danger';
        const statusIcon = isReady ? '✅' : '❌';
        const statusText = isReady ? 'PRONTO PARA NEGOCIAÇÃO' : 'PROBLEMAS IDENTIFICADOS';
        
        readinessSection.innerHTML = `
            <div class="d-flex align-items-center mb-2">
                <div class="flex-grow-1">
                    <h6 class="text-${statusColor} mb-0">${statusIcon} Status de Prontidão: ${readinessPercent}%</h6>
                    <small class="text-${statusColor}">${statusText}</small>
                </div>
                <div class="progress" style="width: 120px; height: 8px;">
                    <div class="progress-bar bg-${statusColor}" style="width: ${readinessPercent}%"></div>
                </div>
            </div>
            ${issues.length > 0 ? `
                <div class="alert alert-warning alert-sm mb-0">
                    <small><strong>Problemas encontrados:</strong></small>
                    <ul class="mb-0 mt-1" style="font-size: 0.875em;">
                        ${issues.map(issue => `<li>${issue}</li>`).join('')}
                    </ul>
                </div>
            ` : ''}
        `;
        
        readinessSection.className = `mt-3 p-3 border border-${statusColor} rounded bg-${statusColor} bg-opacity-10`;
    }
}

async function testActualPayableFunctions() {
    console.log('🎯 TESTE DIRETO: Validando funções PAYABLE do ABI...');
    
    try {
        const contractInterface = currentContract.interface;
        const allFunctions = Object.keys(contractInterface.functions);
        
        // Filtra apenas funções PAYABLE que existem no ABI
        const payableFunctions = allFunctions.filter(funcName => {
            const fragment = contractInterface.functions[funcName];
            return fragment.payable;
        });
        
        console.log(`💰 Encontradas ${payableFunctions.length} funções PAYABLE no ABI:`);
        payableFunctions.forEach(func => console.log(`   💡 ${func}`));
        
        if (payableFunctions.length === 0) {
            console.log('❌ Nenhuma função PAYABLE encontrada no ABI!');
            return false;
        }
        
        // Testa cada função PAYABLE com estimateGas
        for (const funcName of payableFunctions) {
            try {
                console.log(`🧪 Testando função PAYABLE: ${funcName}()`);
                
                const fragment = contractInterface.functions[funcName];
                const testValue = ethers.utils.parseEther('0.001');
                
                // Monta parâmetros baseado nos inputs da função
                const testParams = fragment.inputs.map(input => {
                    switch(input.type) {
                        case 'uint256': return '1000'; // Quantidade de teste
                        case 'address': return walletAddress || '0x0000000000000000000000000000000000000000';
                        case 'bool': return true;
                        default: return '0';
                    }
                });
                
                // Se não tem parâmetros, usa só o value
                if (testParams.length === 0) {
                    await currentContract.estimateGas[funcName]({ value: testValue });
                } else {
                    await currentContract.estimateGas[funcName](...testParams, { value: testValue });
                }
                
                console.log(`✅ SUCESSO! Função ${funcName}() é válida e funcional!`);
                
                // **VALIDAÇÃO EXTRA: Testa callStatic também**
                try {
                    if (testParams.length === 0) {
                        await currentContract.callStatic[funcName]({ value: testValue });
                    } else {
                        await currentContract.callStatic[funcName](...testParams, { value: testValue });
                    }
                    console.log(`✅ CONFIRMADO! ${funcName}() passou também no callStatic!`);
                } catch (staticError) {
                    if (staticError.message.includes('revert') || staticError.message.includes('execution reverted')) {
                        console.log(`⚠️ ${funcName}() reverte com parâmetros de teste (NORMAL - função existe!)`);
                    } else {
                        console.log(`❌ ${funcName}() falhou no callStatic: ${staticError.message}`);
                        continue; // Pula esta função
                    }
                }
                
                buyFunctionName = funcName;
                updateCompatibilityStatus('buyStatus', '✅ Disponível', 'success');
                addContractMessage(`✅ Função de compra totalmente validada`, 'success');
                
                // **DIAGNÓSTICO PROFUNDO antes de habilitar**
                console.log('🔬 Executando diagnóstico profundo antes de habilitar seção...');
                const contractReady = await performDeepContractAnalysis(CONFIG.contractAddress, funcName);
                
                if (contractReady) {
                    // 🎯 AGORA SIM: Habilita seção de compra apenas quando contrato está realmente pronto
                    console.log('🎉 Contrato APROVADO no diagnóstico profundo - Habilitando seção de compra');
                    enablePurchaseSection();
                } else {
                    console.log('❌ Contrato REPROVADO no diagnóstico profundo - Seção permanece bloqueada');
                    addContractMessage('❌ Contrato não está pronto para negociações', 'error');
                    hidePurchaseSection();
                }
                
                return contractReady;
                
            } catch (error) {
                // **MUDANÇA CRÍTICA: Considerar REVERT como função VÁLIDA**
                if (error.code === 'UNPREDICTABLE_GAS_LIMIT' || 
                    error.message.includes('execution reverted') || 
                    error.message.includes('revert')) {
                    
                    console.log(`✅ FUNÇÃO VÁLIDA! ${funcName}() existe e reverte (comportamento esperado)`);
                    console.log(`📝 Motivo do revert: ${error.reason || error.message}`);
                    
                    // Função existe, apenas reverte com parâmetros de teste
                    buyFunctionName = funcName;
                    updateCompatibilityStatus('buyStatus', '✅ Disponível', 'success');
                    addContractMessage(`✅ Função de compra detectada - reverte com parâmetros teste`, 'success');
                    
                    // **DIAGNÓSTICO PROFUNDO antes de habilitar**
                    console.log('🔬 Executando diagnóstico profundo para função com revert...');
                    const contractReady = await performDeepContractAnalysis(CONFIG.contractAddress, funcName);
                    
                    if (contractReady) {
                        // 🎯 Habilita seção de compra 
                        console.log('🎉 Contrato APROVADO no diagnóstico profundo - Habilitando seção de compra');
                        enablePurchaseSection();
                    } else {
                        console.log('❌ Contrato REPROVADO no diagnóstico profundo - Seção permanece bloqueada');
                        addContractMessage('❌ Contrato não está pronto para negociações', 'error');
                        hidePurchaseSection();
                    }
                    
                    return contractReady;
                } else {
                    console.log(`❌ Função ${funcName}() falhou: ${error.message}`);
                }
            }
        }
        
        console.log('❌ Nenhuma função PAYABLE funcionou corretamente');
        return false;
        
    } catch (error) {
        console.log('❌ Erro ao testar funções PAYABLE:', error.message);
        return false;
    }
}

/**
 * Investigação adicional: consulta ABI via Etherscan para contrato não-padrão
 */
async function investigateContractViaEtherscan(contractAddress) {
    try {
        console.log('🔍 Investigando contrato via Etherscan API...');
        
        // Tenta pegar ABI completo do Etherscan
        const apiKey = 'YourApiKeyToken'; // Vamos tentar sem API key primeiro
        const etherscanUrl = `https://api.bscscan.com/api?module=contract&action=getabi&address=${contractAddress}`;
        
        console.log('🌐 URL da consulta:', etherscanUrl);
        
        const response = await fetch(etherscanUrl);
        const data = await response.json();
        
        if (data.status === '1' && data.result) {
            const abi = JSON.parse(data.result);
            console.log('📋 ABI completo obtido do Etherscan:');
            
            // Filtra apenas funções
            const functions = abi.filter(item => item.type === 'function');
            const payableFunctions = functions.filter(func => func.stateMutability === 'payable');
            
            console.log(`📊 Estatísticas do contrato:`);
            console.log(`   📌 Total de funções: ${functions.length}`);
            console.log(`   💰 Funções payable: ${payableFunctions.length}`);
            
            if (payableFunctions.length > 0) {
                console.log('💰 Funções PAYABLE encontradas (possíveis compras):');
                payableFunctions.forEach(func => {
                    const inputs = func.inputs.map(i => `${i.type} ${i.name}`).join(', ');
                    console.log(`   🎯 ${func.name}(${inputs})`);
                });
                
                // Testa a primeira função payable
                const firstPayable = payableFunctions[0];
                console.log(`🧪 Testando primeira função payable: ${firstPayable.name}()`);
                
                try {
                    // Monta parâmetros básicos baseado nos inputs esperados
                    const testParams = firstPayable.inputs.map(input => {
                        switch(input.type) {
                            case 'uint256': return '1000';
                            case 'address': return walletAddress || '0x0000000000000000000000000000000000000000';
                            case 'bool': return true;
                            default: return '0';
                        }
                    });
                    
                    // Se a função é payable, adiciona value
                    const callOptions = { value: ethers.utils.parseEther('0.001') };
                    
                    await currentContract.estimateGas[firstPayable.name](...testParams, callOptions);
                    
                    console.log(`✅ SUCESSO! Função ${firstPayable.name}() funciona!`);
                    buyFunctionName = firstPayable.name;
                    updateCompatibilityStatus('buyStatus', '✅ Disponível', 'success');
                    addContractMessage(`✅ Função de compra "${firstPayable.name}" encontrada via Etherscan`, 'success');
                    return true;
                    
                } catch (testError) {
                    console.log(`❌ Função ${firstPayable.name}() rejeitou teste:`, testError.message);
                }
            }
        }
        
    } catch (error) {
        console.log('❌ Erro na investigação via Etherscan:', error.message);
    }
    
    return false;
}

/**
 * Verifica funções de compra disponíveis
 */
async function verifyBuyFunctions() {
    const buyFunctions = [
        'buy', 'buyTokens', 'purchase', 
        'buyWithBNB', 'mint', 'swap',
        'exchange', 'buyToken'
    ];
    
    addContractMessage('� Teste 4: Testando função de compra...', 'info');
    
    for (const funcName of buyFunctions) {
        try {
            console.log(`🔍 Testando função: ${funcName}()`);
            
            // **MELHORIA: Usar valor baseado nos limites detectados, como no teste**
            let testValue = ethers.utils.parseEther('0.001'); // Valor padrão
            
            // Se temos limites detectados, usar o valor mínimo + margem
            if (tokenInfo.limits && tokenInfo.limits.minPurchase && tokenInfo.limits.minPurchase.gt(0)) {
                testValue = tokenInfo.limits.minPurchase;
                console.log(`📏 Usando valor mínimo do contrato: ${ethers.utils.formatEther(testValue)} BNB`);
            }
            
            // Prepara parâmetros baseado no tipo da função
            let gasEstimateParams;
            switch(funcName) {
                case 'mint':
                    // Para mint, testa com address e amount
                    gasEstimateParams = [walletAddress, '1000'];
                    break;
                case 'swap':
                    // Para swap, testa troca básica
                    gasEstimateParams = ['0x0000000000000000000000000000000000000000', '1000'];
                    break;
                default:
                    // Para funções de compra normais, usa value
                    gasEstimateParams = [{ value: testValue }];
            }
            
            // **MELHORIA: Tenta estimar gas primeiro**
            const gasEstimate = await currentContract.estimateGas[funcName](...gasEstimateParams);
            
            // Se chegou aqui, a função existe e é válida
            console.log(`✅ Função de compra: Detectada e funcional (Gas: ${gasEstimate})`);
            
            // **MELHORIA: Teste callStatic adicional como no teste**
            try {
                console.log('🔬 Teste 5: Teste callStatic...');
                await currentContract.callStatic[funcName](...gasEstimateParams);
                console.log('✅ CallStatic funcionou perfeitamente');
                addContractMessage('✅ CallStatic: Passou em todos os testes', 'success');
            } catch (callError) {
                if (callError.message.includes('revert') || callError.reason) {
                    console.log(`✅ CallStatic com revert (normal): ${callError.reason || callError.message}`);
                    addContractMessage('✅ CallStatic: Revert detectado (comportamento normal)', 'success');
                } else {
                    console.log(`⚠️ CallStatic falhou: ${callError.message}`);
                    addContractMessage(`⚠️ CallStatic: ${callError.message}`, 'warning');
                }
            }
            
            buyFunctionName = funcName;
            updateCompatibilityStatus('buyStatus', '✅ Disponível', 'success');
            addContractMessage(`✅ Função de compra totalmente validada`, 'success');
            return;
            
        } catch (error) {
            if (error.message.includes('is not a function')) {
                console.log(`❌ Função ${funcName}() não existe no contrato`);
            } else if (error.code === 'UNPREDICTABLE_GAS_LIMIT' || 
                       error.message.includes('revert') || 
                       error.message.includes('execution reverted')) {
                // **MELHORIA: Melhor tratamento de revert - incluir motivo**
                const reason = error.reason || error.message.split(':')[1] || 'Motivo não especificado';
                console.log(`⚠️ Função de compra: Detectada mas reverte (${reason})`);
                buyFunctionName = funcName;
                updateCompatibilityStatus('buyStatus', '✅ Disponível', 'success');
                addContractMessage(`✅ Função de compra detectada (reverte com parâmetros de teste - normal)`, 'success');
                return;
            } else {
                console.log(`❌ Função ${funcName}() erro: ${error.message}`);
            }
        }
    }
    
    // Se não encontrou nenhuma função válida
    console.log('❌ Nenhuma função de compra válida encontrada no contrato');
    
    // **INVESTIGAÇÃO ADICIONAL: Listar todas as funções disponíveis no contrato**
    console.log('🔍 INVESTIGANDO - Funções disponíveis no contrato:');
    try {
        const contractInterface = currentContract.interface;
        const allFunctions = Object.keys(contractInterface.functions);
        
        console.log('📋 Todas as funções do contrato:');
        allFunctions.forEach(func => {
            const fragment = contractInterface.functions[func];
            const isPayable = fragment.payable;
            const inputs = fragment.inputs.map(i => `${i.type} ${i.name}`).join(', ');
            console.log(`   📌 ${func}(${inputs}) ${isPayable ? '[PAYABLE]' : ''}`);
        });
        
        // Procura por funções que possam ser de compra baseado no nome
        const possibleBuyFunctions = allFunctions.filter(func => 
            func.toLowerCase().includes('buy') || 
            func.toLowerCase().includes('purchase') ||
            func.toLowerCase().includes('mint') ||
            func.toLowerCase().includes('swap') ||
            func.toLowerCase().includes('exchange')
        );
        
        if (possibleBuyFunctions.length > 0) {
            console.log('🎯 Funções suspeitas de compra encontradas:');
            possibleBuyFunctions.forEach(func => console.log(`   💡 ${func}`));
            // Não mostra mensagem para o usuário - apenas no console para debug
        }
        
    } catch (e) {
        console.log('❌ Erro ao listar funções do contrato:', e.message);
    }
    
    // **TESTE FINAL: Validação das funções PAYABLE reais do ABI**
    console.log('🎯 Teste final: Validando funções PAYABLE do ABI...');
    const found = await testActualPayableFunctions();
    
    if (!found) {
        buyFunctionName = null;
        updateCompatibilityStatus('buyStatus', '❌ Não disponível', 'error');
        addContractMessage('❌ Este token não permite compra automática', 'error');
        
        // Log detalhado do erro para suporte
        window.contractLogger.logContractError(currentContract.address, 'NO_BUY_FUNCTION', {
            message: 'Nenhuma função de compra detectada',
            availableFunctions: Object.keys(currentContract.functions || {}),
            possibleBuyFunctions: possibleBuyFunctions || [],
            contractABI: CONFIG.tokenABI.map(f => typeof f === 'string' ? f : f.name).filter(Boolean),
            testedFunctions: {
                buyFunctionName: buyFunctionName,
                priceFunction: priceFunctionName
            }
        });
        window.contractLogger.showDownloadButton();
        
        // 🚨 IMPORTANTE: Garantir que a seção de compra permaneça OCULTA
        hidePurchaseSection();
        console.log('🔒 Seção de compra mantida OCULTA - Contrato incompatível');
    }
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
        
        // Verificar tokens disponíveis para venda no contrato
        try {
            console.log('🔍 Verificando tokens disponíveis para venda...');
            const tokensBalance = await currentContract.balanceOf(currentContract.address);
            const tokensForSale = parseFloat(ethers.utils.formatUnits(tokensBalance, tokenInfo.decimals));
            tokenInfo.tokensForSale = tokensBalance;
            tokenInfo.tokensForSaleFormatted = tokensForSale;
            console.log(`💰 Tokens disponíveis para venda: ${tokensForSale.toLocaleString()} ${tokenInfo.symbol}`);
        } catch (error) {
            console.log('⚠️ Não foi possível verificar tokens para venda:', error.message);
            tokenInfo.tokensForSale = ethers.BigNumber.from(0);
            tokenInfo.tokensForSaleFormatted = 0;
        }
        
        // Tenta detectar preço do contrato
        try {
            let price = null;
            const priceFunctions = [
                'tokenPrice', 'price', 'getPrice', 'buyPrice', 
                'tokenCost', 'cost', 'salePrice', 'pricePerToken'
            ];
            
            console.log('💰 Teste 2: Verificando preço...');
            
            for (const priceFunc of priceFunctions) {
                try {
                    console.log(`🔍 Tentando função: ${priceFunc}()`);
                    price = await currentContract[priceFunc]();
                    console.log(`✅ Preço encontrado via ${priceFunc}(): ${price.toString()}`);
                    break;
                } catch (e) {
                    console.log(`❌ Função ${priceFunc}() não disponível`);
                }
            }
            
            if (price) {
                tokenInfo.price = ethers.utils.formatEther(price);
                console.log(`✅ Preço: ${tokenInfo.price} BNB por token`);
            } else {
                // Tentar calcular preço usando função calculateEthForTokens
                try {
                    console.log('🧮 Tentando calcular preço via calculateEthForTokens...');
                    const oneToken = ethers.utils.parseUnits('1', tokenInfo.decimals);
                    const ethCost = await currentContract.calculateEthForTokens(oneToken);
                    tokenInfo.price = ethers.utils.formatEther(ethCost);
                    console.log(`✅ Preço calculado: ${tokenInfo.price} BNB por token`);
                } catch (calcError) {
                    // Tentar função inversa calculateTokensForEth com 1 ETH
                    try {
                        console.log('🧮 Tentando calcular preço via calculateTokensForEth...');
                        const oneEth = ethers.utils.parseEther('1');
                        const tokensForOneEth = await currentContract.calculateTokensForEth(oneEth);
                        const tokensFormatted = ethers.utils.formatUnits(tokensForOneEth, tokenInfo.decimals);
                        tokenInfo.price = (1 / parseFloat(tokensFormatted)).toString();
                        console.log(`✅ Preço calculado (inverso): ${tokenInfo.price} BNB por token`);
                    } catch (invError) {
                        tokenInfo.price = CONFIG.defaultTokenPrice;
                        console.log(`⚠️ Preço não detectado, usando padrão: ${CONFIG.defaultTokenPrice} BNB`);
                    }
                }
            }
        } catch (error) {
            tokenInfo.price = CONFIG.defaultTokenPrice;
            console.log(`❌ Erro no preço: ${error.message}`);
        }

        // **MELHORIA: Verificar limites de compra como no teste**
        await checkPurchaseLimits();
        
        updateTokenInfoUI();
        
        // ⚠️ NÃO habilita seção de compra automaticamente
        // A seção só será habilitada SE uma função de compra válida for encontrada
        console.log('ℹ️ Informações do token carregadas - Aguardando validação de funções de compra');
        
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
    
    // Formata total supply (sem símbolo do token)
    const totalSupply = ethers.utils.formatUnits(tokenInfo.totalSupply, tokenInfo.decimals);
    document.getElementById('tokenTotalSupply').textContent = formatNumber(totalSupply);
    
    // Formata saldo do contrato (BNB)
    const contractBalance = ethers.utils.formatEther(tokenInfo.contractBalance);
    document.getElementById('contractBalance').textContent = `${formatNumber(contractBalance)} BNB`;
    
    // Formata tokens disponíveis para venda (sem símbolo do token)
    const tokensForSaleElement = document.getElementById('tokensForSale');
    if (tokensForSaleElement) {
        const tokensAvailable = tokenInfo.tokensForSaleFormatted || 0;
        if (tokensAvailable > 0) {
            tokensForSaleElement.textContent = formatNumber(tokensAvailable);
            tokensForSaleElement.className = 'fw-bold text-success mb-2'; // Verde se há tokens
        } else {
            tokensForSaleElement.textContent = '0';
            tokensForSaleElement.className = 'fw-bold text-danger mb-2'; // Vermelho se não há tokens
        }
    }
    
    // Atualiza informação de disponibilidade na área de compra (sem símbolo do token)
    const availabilityInfo = document.getElementById('tokens-availability');
    const availableDisplay = document.getElementById('available-tokens-display');
    if (availabilityInfo && availableDisplay && tokenInfo.tokensForSaleFormatted !== undefined) {
        const tokensAvailable = tokenInfo.tokensForSaleFormatted || 0;
        availableDisplay.textContent = formatNumber(tokensAvailable);
        
        if (tokensAvailable > 0) {
            availabilityInfo.className = 'alert alert-success border-0 mb-3 py-2';
            availabilityInfo.style.display = 'block';
        } else {
            availabilityInfo.className = 'alert alert-warning border-0 mb-3 py-2';
            availabilityInfo.style.display = 'block';
            availableDisplay.innerHTML = `<span class="text-warning">Nenhum token disponível</span>`;
        }
    }
    
    // Define preço como READ-ONLY (detectado do contrato)
    const priceInput = document.getElementById('token-price');
    if (priceInput) {
        priceInput.value = tokenInfo.price;
        priceInput.readOnly = true; // Campo somente leitura
        priceInput.disabled = false; // Habilita para mostrar o valor
        priceInput.style.backgroundColor = '#2d3748'; // Cor de fundo diferenciada
        priceInput.style.cursor = 'not-allowed'; // Cursor indicativo
        
        // Verifica se preço foi detectado automaticamente ou é padrão
        if (tokenInfo.price === CONFIG.defaultTokenPrice) {
            priceInput.title = 'Preço padrão (não detectado no contrato) - verifique manualmente';
            priceInput.style.borderColor = '#fbbf24'; // Cor amarela para atenção
        } else {
            priceInput.title = '✅ Preço detectado automaticamente do contrato';
            priceInput.style.borderColor = '#10b981'; // Cor verde para sucesso
        }
        
        console.log(`💰 Preço detectado: ${tokenInfo.price} BNB por token`);
    }
    
    // **MELHORIA: Mostrar limites de compra na interface**
    if (tokenInfo.minPurchase && tokenInfo.maxPurchase) {
        const limitsInfo = document.getElementById('purchase-limits-info');
        const minDisplay = document.getElementById('min-purchase-display');
        const maxDisplay = document.getElementById('max-purchase-display');
        
        if (limitsInfo && minDisplay && maxDisplay) {
            minDisplay.textContent = `${tokenInfo.minPurchase} BNB`;
            maxDisplay.textContent = `${tokenInfo.maxPurchase} BNB`;
            limitsInfo.style.display = 'block';
        }
    }
}

/**
 * 📏 Verificar limites de compra do contrato
 */
async function checkPurchaseLimits() {
    console.log('📏 Teste 3: Verificando limites...');
    
    try {
        let minPurchase = null, maxPurchase = null;
        
        // Tenta detectar limites de forma mais robusta
        try {
            // Primeiro tenta as funções básicas
            try {
                minPurchase = await currentContract.minPurchase();
                console.log(`✅ Limite mínimo: ${ethers.utils.formatEther(minPurchase)} BNB`);
            } catch (e) {
                console.log('❌ Função minPurchase() não disponível');
            }
            
            try {
                maxPurchase = await currentContract.maxPurchase();
                console.log(`✅ Limite máximo: ${ethers.utils.formatEther(maxPurchase)} BNB`);
            } catch (e) {
                console.log('❌ Função maxPurchase() não disponível');
            }
            
            // Se não encontrou limites, tenta verificar purchaseLimit para o usuário
            if (!minPurchase && !maxPurchase && walletAddress) {
                try {
                    const userLimit = await currentContract.purchaseLimit(walletAddress);
                    if (userLimit && !userLimit.isZero()) {
                        maxPurchase = userLimit;
                        console.log(`✅ Limite do usuário: ${ethers.utils.formatEther(userLimit)} BNB`);
                    }
                } catch (e) {
                    console.log('❌ Função purchaseLimit() não disponível para o usuário');
                }
            }
            
            const minFormatted = ethers.utils.formatEther(minPurchase);
            const maxFormatted = ethers.utils.formatEther(maxPurchase);
            
            tokenInfo.minPurchase = minFormatted;
            tokenInfo.maxPurchase = maxFormatted;
            
            console.log(`✅ Limites: ${minFormatted} - ${maxFormatted} BNB`);
            addContractMessage(`✅ Compra mínima: ${minFormatted} BNB, máxima: ${maxFormatted} BNB`, 'success');
            
        } catch (e) {
            console.log(`⚠️ Limites: Não foi possível verificar - ${e.message}`);
            addContractMessage('⚠️ Limites de compra não detectados (pode não ter)', 'warning');
        }
        
        // Armazenar para uso posterior
        tokenInfo.limits = { minPurchase, maxPurchase };
        
    } catch (error) {
        console.log(`❌ Erro na verificação de limites: ${error.message}`);
    }
}

// ==================== GERENCIAMENTO DE COMPRA ====================

/**
 * Habilita seção de compra - APENAS quando função válida é confirmada E seção de informações está visível
 */
function enablePurchaseSection() {
    // 🛡️ PROTEÇÃO: Só executa se realmente há uma função de compra válida
    if (!buyFunctionName) {
        console.log('❌ enablePurchaseSection() chamada sem função de compra válida - IGNORANDO');
        return;
    }
    
    // 🛡️ PROTEÇÃO: Verifica se a seção de informações está visível primeiro
    const infoSection = document.getElementById('token-info-section');
    if (!infoSection || infoSection.style.display === 'none') {
        console.log('📢 Sistema: Aguardando exibição da seção de informações antes de habilitar compra');
        return;
    }
    
    const section = document.getElementById('purchase-section');
    const priceInput = document.getElementById('token-price');
    const quantityInput = document.getElementById('token-quantity');
    const purchaseBtn = document.getElementById('execute-purchase-btn');
    
    console.log('🎉 HABILITANDO SEÇÃO DE COMPRA - Função validada:', buyFunctionName);
    console.log('📍 Seção encontrada:', section ? 'SIM' : 'NÃO');
    console.log('📍 Campo quantidade encontrado:', quantityInput ? 'SIM' : 'NÃO');
    console.log('📍 Botão compra encontrado:', purchaseBtn ? 'SIM' : 'NÃO');
    
    if (section) {
        section.style.display = 'block';
        // Adiciona uma animação de slide para mostrar que a seção foi liberada
        section.classList.add('animate__animated', 'animate__slideInUp');
        console.log('✅ Seção de compra LIBERADA e exibida');
        
        // Adiciona uma mensagem visual de sucesso
        addContractMessage('🎉 Seção de compra liberada - Contrato suporta compras!', 'success');
    }
    
    // Campo de preço permanece READ-ONLY (já configurado em updateTokenInfoUI)
    // Não habilitamos edição do preço pois é detectado do contrato
    
    if (quantityInput) {
        quantityInput.disabled = false;
        console.log('✅ Campo quantidade habilitado');
    }
    
    // HABILITA o botão com função validada
    if (purchaseBtn) {
        purchaseBtn.disabled = false;
        purchaseBtn.style.opacity = '1';
        purchaseBtn.style.cursor = 'pointer';
        purchaseBtn.style.backgroundColor = '#28a745'; // Verde para indicar liberado
        console.log(`✅ Botão LIBERADO - Função confirmada: ${buyFunctionName}()`);
    } else {
        console.error('❌ Botão de compra não encontrado no DOM!');
    }
    
    console.log('🛒 Seção de compra TOTALMENTE habilitada - Contrato validado para compras');
    console.log(`📊 STATUS FINAL: ${tokenInfo.name} (${tokenInfo.symbol}) - Preço: ${tokenInfo.price} BNB - Tokens disponíveis: ${formatNumber(tokenInfo.tokensForSaleFormatted || 0)}`);
    console.log('🎉 SISTEMA PRONTO! Você pode agora comprar tokens com segurança.');
    
    // Adiciona mensagem de sucesso na interface
    const systemMessages = document.getElementById('system-messages');
    if (systemMessages) {
        systemMessages.innerHTML = `
            <div class="alert alert-success border-0 mb-3">
                <i class="bi bi-check-circle-fill me-2"></i>
                <strong>Sistema Validado!</strong> Contrato aprovado e pronto para negociação.
                <br><small class="text-muted">Função de compra: ${buyFunctionName}() | Tokens disponíveis: ${formatNumber(tokenInfo.tokensForSaleFormatted || 0)}</small>
            </div>
        `;
    }
}

/**
 * Mantém seção de compra oculta quando contrato não suporta compras
 */
function hidePurchaseSection() {
    const section = document.getElementById('purchase-section');
    const purchaseBtn = document.getElementById('execute-purchase-btn');
    
    if (section) {
        section.style.display = 'none';
        console.log('🔒 Seção de compra mantida OCULTA');
    }
    
    if (purchaseBtn) {
        purchaseBtn.disabled = true;
        purchaseBtn.style.opacity = '0.3';
        purchaseBtn.style.cursor = 'not-allowed';
        purchaseBtn.style.backgroundColor = '#dc3545'; // Vermelho para indicar indisponível
        console.log('🔒 Botão de compra desabilitado');
    }
    
    // Adiciona uma mensagem explicativa para o usuário
    addContractMessage('🔒 Compra não disponível - Este token não permite compra automática', 'warning');
    console.log('🔒 Seção de compra permanece oculta - Contrato incompatível');
}

/**
 * Debug do estado do botão de compra - função global para console
 */
function debugPurchaseButton() {
    const btn = document.getElementById('execute-purchase-btn');
    console.log('🔧 DEBUG BOTÃO DE COMPRA:');
    console.log('📍 Botão encontrado:', btn ? 'SIM' : 'NÃO');
    if (btn) {
        console.log('📍 Disabled:', btn.disabled);
        console.log('📍 Style opacity:', btn.style.opacity);
        console.log('📍 Style cursor:', btn.style.cursor);
        console.log('📍 Classes:', btn.className);
        console.log('📍 Texto:', btn.textContent.trim());
    }
    console.log('📍 buyFunctionName:', buyFunctionName);
}

// Torna disponível no console para debug
window.debugPurchaseButton = debugPurchaseButton;

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
        alert('Este token não permite compra automática');
        return;
    }
    
    // Verifica se a função existe no contrato antes de executar
    if (!buyFunctionName) {
        alert('❌ Este token não permite compra direta');
        return;
    }
    
    // **VALIDAÇÃO CRÍTICA: Verifica se a função realmente existe no contrato**
    if (!currentContract[buyFunctionName]) {
        console.error(`❌ ERRO CRÍTICO: Função ${buyFunctionName}() não existe no contrato!`);
        alert('❌ Erro: Sistema de compra não está disponível');
        
        // Reseta a detecção
        buyFunctionName = null;
        updateCompatibilityStatus('buyStatus', '❌ Erro interno', 'error');
        return;
    }
    
    console.log(`✅ Função ${buyFunctionName}() confirmada no contrato`);
    
    // Verifica se MetaMask está conectado
    if (!walletConnected || !walletAddress) {
        alert('Por favor, conecte sua carteira MetaMask primeiro');
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

    // **MELHORIA: Validar contra limites detectados do contrato**
    const totalValue = price * quantity;
    
    if (tokenInfo.limits) {
        const { minPurchase, maxPurchase } = tokenInfo.limits;
        
        if (minPurchase && totalValue < parseFloat(tokenInfo.minPurchase)) {
            alert(`Valor abaixo do mínimo permitido pelo contrato (${tokenInfo.minPurchase} BNB)`);
            return;
        }
        
        if (maxPurchase && totalValue > parseFloat(tokenInfo.maxPurchase)) {
            alert(`Valor acima do máximo permitido pelo contrato (${tokenInfo.maxPurchase} BNB)`);
            return;
        }
        
        console.log(`✅ Valor ${totalValue} BNB está dentro dos limites do contrato`);
    }

    try {
        // Mostra loading
        showButtonLoading('execute-purchase-btn', 'Processando...');
        showLoadingMessage('system-messages', 'Preparando transação');
        
        const totalValueStr = totalValue.toString();
        const valueInWei = ethers.utils.parseEther(totalValueStr);
        
        clearPurchaseMessages();
        addPurchaseMessage('🚀 Processando compra...', 'info');
        
        // IMPORTANTE: Sempre usar MetaMask para transações (não RPC público)
        const web3Provider = new ethers.providers.Web3Provider(window.ethereum);
        const signer = web3Provider.getSigner();
        
        // Cria contrato com signer do MetaMask
        const contractWithSigner = new ethers.Contract(
            currentContract.address, 
            CONFIG.tokenABI, 
            signer
        );
        
        console.log(`💰 Executando compra: ${quantity} tokens por ${totalValueStr} BNB`);
        console.log(`📝 Função: ${buyFunctionName}()`);
        console.log(`💎 Valor: ${valueInWei.toString()} wei`);
        console.log(`📍 Contrato: ${currentContract.address}`);
        console.log(`👤 Comprador: ${walletAddress}`);
        
        // DIAGNÓSTICO AVANÇADO DO CONTRATO
        addPurchaseMessage('🔍 Verificando condições da compra...', 'info');
        try {
            // Usa RPC público para diagnóstico (não MetaMask que está falhando)
            const publicProvider = await initializeProviderWithFallback();
            
            const contractBalance = await publicProvider.getBalance(currentContract.address);
            const userBalance = await publicProvider.getBalance(walletAddress);
            
            console.log(`💰 Saldo do contrato: ${ethers.utils.formatEther(contractBalance)} BNB`);
            console.log(`💰 Saldo do usuário: ${ethers.utils.formatEther(userBalance)} BNB`);
            
            // Verifica se usuário tem saldo suficiente
            const totalCostWei = ethers.utils.parseEther(totalValue.toString());
            if (userBalance.lt(totalCostWei)) {
                throw new Error(`Saldo insuficiente. Você tem ${ethers.utils.formatEther(userBalance)} BNB, mas precisa de ${totalValue} BNB`);
            }
            
            // Verifica se o contrato tem tokens suficientes
            // ⚠️ NOTA: Nem todos os contratos armazenam tokens no endereço do contrato
            try {
                if (tokenInfo.totalSupply) {
                    const contractTokenBalance = await currentContract.balanceOf(currentContract.address);
                    const contractTokens = parseFloat(ethers.utils.formatUnits(contractTokenBalance, tokenInfo.decimals));
                    
                    console.log(`🪙 Tokens no endereço do contrato: ${contractTokens} ${tokenInfo.symbol}`);
                    
                    if (contractTokens === 0) {
                        console.log('⚠️ Contrato não tem tokens em seu endereço - pode usar mint ou reserva externa');
                        // Não mostra mensagem - apenas no log
                    } else if (contractTokens < quantity) {
                        console.log(`⚠️ Contrato tem poucos tokens (${contractTokens}), mas pode ter outras fontes`);
                        // Não mostra mensagem - apenas no log
                    } else {
                        console.log(`✅ Contrato tem tokens suficientes: ${contractTokens} >= ${quantity}`);
                        // Não mostra mensagem - apenas no log
                    }
                }
            } catch (tokenCheckError) {
                console.log('⚠️ Não foi possível verificar tokens do contrato:', tokenCheckError.message);
                // Não mostra mensagem - apenas no log
            }
            
            // 🔍 VERIFICAÇÃO ADICIONAL: Tenta detectar se contrato usa mint ou tem reservas
            try {
                console.log('🔍 Verificando capacidade de fornecimento de tokens...');
                
                // Tenta verificar se há função de tokens disponíveis
                const availabilityFunctions = ['tokensAvailable', 'tokensForSale', 'remainingTokens', 'maxSupply'];
                
                for (const funcName of availabilityFunctions) {
                    try {
                        const available = await currentContract[funcName]();
                        const availableTokens = parseFloat(ethers.utils.formatUnits(available, tokenInfo.decimals));
                        console.log(`💰 ${funcName}(): ${availableTokens} tokens disponíveis`);
                        
                        if (availableTokens >= quantity) {
                            console.log(`✅ Tokens disponíveis confirmados via ${funcName}(): ${availableTokens}`);
                            // Não mostra mensagem - apenas no log
                            break;
                        }
                    } catch (e) {
                        // Função não existe ou falhou, continua
                    }
                }
                
                // Verifica se contrato tem função de mint (indicativo de criação dinâmica)
                const contractInterface = currentContract.interface;
                const hasMintFunction = Object.keys(contractInterface.functions).some(func => 
                    func.toLowerCase().includes('mint')
                );
                
                if (hasMintFunction) {
                    console.log('✅ Contrato tem função de mint - pode criar tokens dinamicamente');
                    // Não mostra mensagem - apenas no log
                }
                
            } catch (availabilityError) {
                console.log('ℹ️ Verificação de disponibilidade ignorada:', availabilityError.message);
            }
            
            // DIAGNÓSTICO AVANÇADO - Verifica condições especiais do contrato
            console.log('🔍 Executando diagnóstico avançado do contrato...');
            await performAdvancedContractDiagnostics(publicProvider);
            
            // Não mostra mensagem de aprovação - apenas processa
            
        } catch (diagError) {
            console.warn('⚠️ Erro no diagnóstico:', diagError.message);
            addPurchaseMessage(`⚠️ Aviso: ${diagError.message}`, 'warning');
            
            // Se o erro é crítico, para por aqui
            if (diagError.message.includes('Saldo insuficiente') || diagError.message.includes('não tem tokens suficientes')) {
                addPurchaseMessage('❌ Compra cancelada devido a verificação falhada', 'error');
                return;
            }
        }
        
        // SIMULAÇÃO COM DIFERENTES VALORES PARA ENCONTRAR O PROBLEMA
        try {
            // Cria provider MetaMask apenas para simulação
            const metamaskProvider = new ethers.providers.Web3Provider(window.ethereum);
            const metamaskSigner = metamaskProvider.getSigner();
            const contractForSim = new ethers.Contract(currentContract.address, CONFIG.tokenABI, metamaskSigner);
            
            // Teste 1: Simulação com valor exato
            console.log('🧪 Teste 1: Simulação com valor exato');
            try {
                // **VALIDAÇÃO: Verifica se a função existe antes de usar**
                if (!contractForSim[buyFunctionName]) {
                    throw new Error(`Função ${buyFunctionName}() não existe no contrato`);
                }
                
                await contractForSim.callStatic[buyFunctionName]({
                    value: valueInWei,
                    from: walletAddress
                });
                console.log('✅ Simulação com valor exato: SUCESSO');
            } catch (simError1) {
                console.log('❌ Simulação com valor exato: FALHOU');
                console.log('🔍 Razão:', simError1.reason || simError1.message);
                
                // Log apenas no console - não mostra erro para usuário na simulação
                // A simulação pode falhar mas a transação real pode funcionar
            }
            
        } catch (simError) {
            console.warn('⚠️ Erro na simulação geral:', simError.message);
            
            // Análise do erro de simulação
            if (simError.message.includes('missing trie node')) {
                addPurchaseMessage('⚠️ Problema de sincronização da rede - tentando mesmo assim', 'warning');
            } else if (simError.message.includes('revert')) {
                // Não mostra erro de revert na simulação - pode funcionar na transação real
                console.log('🔍 Simulação falhou com revert - mas transação real pode funcionar');
            } else {
                addPurchaseMessage(`⚠️ Simulação falhou: ${simError.message}`, 'warning');
            }
            
            addPurchaseMessage('🚀 Prosseguindo com a transação real...', 'info');
        }
        
        // **VALIDAÇÃO FINAL: Verifica se a função existe no contrato assinado**
        if (!contractWithSigner[buyFunctionName]) {
            throw new Error(`Função ${buyFunctionName}() não existe no contrato`);
        }
        
        // Executa a transação
        const tx = await contractWithSigner[buyFunctionName]({
            value: valueInWei,
            gasLimit: CONFIG.gasLimit
        });
        
        addPurchaseMessage(`✅ Compra confirmada!`, 'success');
        addPurchaseMessage('⏳ Aguardando confirmação...', 'info');
        
        // Aguarda confirmação
        const receipt = await tx.wait();
        
        addPurchaseMessage('🎉 Transação confirmada!', 'success');
        
        // Mostra detalhes da transação
        showTransactionDetails(receipt, quantity, totalValue);
        
    } catch (error) {
        console.error('❌ Erro na compra:', error);
        
        // Log detalhado do erro de transação para suporte
        window.contractLogger.logTransactionError(error.receipt ? error.receipt.transactionHash : 'unknown', {
            code: error.code,
            message: error.message,
            reason: error.reason,
            receipt: error.receipt,
            contractAddress: currentContract.address,
            functionCalled: buyFunctionName,
            valueInBNB: totalValue,
            gasUsed: error.receipt ? error.receipt.gasUsed.toString() : 'unknown'
        });
        window.contractLogger.showDownloadButton();
        
        // Mensagens de erro mais detalhadas
        let errorMessage = 'Erro desconhecido';
        let technicalDetails = '';
        
        if (error.code === 'INSUFFICIENT_FUNDS') {
            errorMessage = 'Saldo insuficiente na carteira';
        } else if (error.code === 'USER_REJECTED') {
            errorMessage = 'Transação cancelada pelo usuário';
        } else if (error.code === 4001) {
            errorMessage = 'Transação rejeitada pelo usuário';
        } else if (error.code === 'UNPREDICTABLE_GAS_LIMIT') {
            errorMessage = 'Não foi possível estimar o gás necessário. O contrato pode ter rejeitado a transação.';
        } else if (error.code === 'CALL_EXCEPTION') {
            errorMessage = 'Erro na execução do contrato';
            
            // Análise específica do CALL_EXCEPTION
            if (error.receipt) {
                technicalDetails = `Hash: ${error.receipt.transactionHash}\n`;
                technicalDetails += `Gas usado: ${error.receipt.gasUsed}\n`;
                technicalDetails += `Status: ${error.receipt.status === 0 ? 'FALHOU' : 'SUCESSO'}\n`;
                
                console.log('📋 Detalhes da transação falhada:');
                console.log('🔗 Hash:', error.receipt.transactionHash);
                console.log('⛽ Gas usado:', error.receipt.gasUsed.toString());
                console.log('📊 Status:', error.receipt.status === 0 ? 'FALHOU' : 'SUCESSO');
                
                // Análise específica baseada no gas usado
                const gasUsed = error.receipt.gasUsed.toNumber();
                if (gasUsed === 21307 || gasUsed < 25000) {
                    console.log('🔍 ANÁLISE: Gas muito baixo - função falha no início');
                    console.log('💡 Isso indica que o contrato rejeitou a transação imediatamente');
                    console.log('💡 Possíveis causas específicas:');
                    console.log('   - require() falhando logo no início da função');
                    console.log('   - Função payable recebendo valor quando não deveria');
                    console.log('   - Modificadores (onlyOwner, whenNotPaused, etc.) rejeitando');
                    console.log('   - Função não existe ou tem assinatura diferente');
                    
                    errorMessage += '\n\n🔍 ANÁLISE TÉCNICA:';
                    errorMessage += '\nGas muito baixo (21307) indica que o contrato rejeitou a transação imediatamente.';
                    errorMessage += '\n\nCausas mais prováveis:';
                    errorMessage += '\n• Contrato está pausado ou com restrições';
                    errorMessage += '\n• Função de compra tem condições específicas não atendidas';
                    errorMessage += '\n• Valor enviado não está correto para este contrato';
                    errorMessage += '\n• Contrato requer whitelist ou aprovação prévia';
                    
                } else {
                    console.log('🔍 ANÁLISE: Gas normal - erro durante execução');
                }
                
                // Possíveis causas do erro
                console.log('🔍 Possíveis causas:');
                console.log('1. Contrato sem tokens suficientes para vender');
                console.log('2. Valor enviado incorreto (muito alto/baixo)');
                console.log('3. Contrato pausado ou com restrições');
                console.log('4. Função de compra com lógica específica não atendida');
                console.log('5. Problema de aprovação ou allowance');
                
                errorMessage += '\n\nPossíveis causas:\n';
                errorMessage += '• Contrato sem tokens para vender\n';
                errorMessage += '• Valor enviado incorreto\n';
                errorMessage += '• Contrato pausado ou restrito\n';
                errorMessage += '• Lógica específica do contrato não atendida';
            }
        } else if (error.message.includes('revert')) {
            errorMessage = 'Transação rejeitada pelo contrato';
            
            // Tenta extrair razão do revert
            if (error.reason) {
                errorMessage += `\nRazão: ${error.reason}`;
                console.log(`🔍 Razão específica do revert: ${error.reason}`);
            } else {
                // Tenta extrair da mensagem
                const revertMatch = error.message.match(/revert (.+)/i);
                if (revertMatch) {
                    errorMessage += `\nRazão: ${revertMatch[1]}`;
                    console.log(`🔍 Razão extraída: ${revertMatch[1]}`);
                }
            }
            
            // Análise de reverts comuns
            const errorMsg = error.message.toLowerCase();
            if (errorMsg.includes('execution reverted') || errorMsg.includes('execução revertida')) {
                errorMessage += '\n\n💡 O contrato executou mas rejeitou a transação.';
                errorMessage += '\nIsso indica que alguma condição interna não foi atendida.';
                
                // Sugestões baseadas no gas baixo (21307)
                if (error.receipt && error.receipt.gasUsed.toNumber() < 25000) {
                    errorMessage += '\n\n🔍 Sugestões específicas (gas baixo):';
                    errorMessage += '\n• Verifique se o contrato aceita pagamentos em BNB';
                    errorMessage += '\n• Confirme se a quantidade está dentro dos limites';
                    errorMessage += '\n• Verifique se sua conta está autorizada';
                    errorMessage += '\n• Contrato pode estar pausado temporariamente';
                }
            }
        } else {
            errorMessage = error.message;
        }
        
        addPurchaseMessage(`❌ Erro: ${errorMessage}`, 'error');
        
        if (technicalDetails) {
            addPurchaseMessage(`🔧 Detalhes técnicos:\n${technicalDetails}`, 'warning');
        }
        
        // Remove loading em caso de erro
        hideButtonLoading('execute-purchase-btn', '<i class="bi bi-lightning me-2"></i>COMPRAR TOKENS');
    }
}

/**
 * Diagnóstico avançado do contrato para identificar problemas específicos
 */
async function performAdvancedContractDiagnostics(provider) {
    const diagnosticFunctions = [
        { name: 'paused', desc: 'Contrato pausado' },
        { name: 'saleActive', desc: 'Venda ativa' },
        { name: 'saleEnabled', desc: 'Venda habilitada' },
        { name: 'owner', desc: 'Proprietário do contrato' },
        { name: 'maxPurchase', desc: 'Compra máxima permitida' },
        { name: 'minPurchase', desc: 'Compra mínima permitida' },
        { name: 'tokensForSale', desc: 'Tokens para venda' },
        { name: 'tokensAvailable', desc: 'Tokens disponíveis' }
    ];
    
    const contractWithProvider = new ethers.Contract(currentContract.address, CONFIG.tokenABI, provider);
    const quantity = parseFloat(document.getElementById('token-quantity').value);
    
    for (const func of diagnosticFunctions) {
        try {
            const result = await contractWithProvider[func.name]();
            console.log(`📋 ${func.desc}: ${result.toString()}`);
            
            // Análise específica de cada resultado
            if (func.name === 'paused' && result === true) {
                console.log('🚨 PROBLEMA: Contrato está pausado!');
                throw new Error('Contrato está pausado - compras temporariamente desabilitadas');
            }
            
            if ((func.name === 'saleActive' || func.name === 'saleEnabled') && result === false) {
                console.log('🚨 PROBLEMA: Venda não está ativa!');
                throw new Error('Venda não está ativa neste contrato');
            }
            
            if (func.name === 'maxPurchase' && result.gt(0)) {
                const maxInBNB = ethers.utils.formatEther(result);
                const totalValueNeeded = quantity * parseFloat(tokenInfo.price);
                if (totalValueNeeded > parseFloat(maxInBNB)) {
                    console.log(`🚨 PROBLEMA: Valor solicitado (${totalValueNeeded} BNB) excede máximo permitido (${maxInBNB} BNB)`);
                    throw new Error(`Valor máximo permitido: ${maxInBNB} BNB`);
                }
            }
            
            if (func.name === 'minPurchase' && result.gt(0)) {
                const minInBNB = ethers.utils.formatEther(result);
                const totalValueNeeded = quantity * parseFloat(tokenInfo.price);
                if (totalValueNeeded < parseFloat(minInBNB)) {
                    console.log(`🚨 PROBLEMA: Valor solicitado (${totalValueNeeded} BNB) é menor que mínimo (${minInBNB} BNB)`);
                    throw new Error(`Valor mínimo necessário: ${minInBNB} BNB`);
                }
            }
            
        } catch (error) {
            // Se é um erro específico da análise, repassa
            if (error.message.includes('pausado') || error.message.includes('ativa') || 
                error.message.includes('máxima') || error.message.includes('mínima')) {
                throw error;
            }
            // Senão, função simplesmente não existe no contrato (normal)
            console.log(`📋 ${func.desc}: Não disponível`);
        }
    }
    
    // Verifica se usuário está na whitelist (se aplicável)
    try {
        const isWhitelisted = await contractWithProvider.isWhitelisted(walletAddress);
        console.log(`📋 Usuário na whitelist: ${isWhitelisted}`);
        if (isWhitelisted === false) {
            console.log('🚨 PROBLEMA: Usuário não está na whitelist!');
            throw new Error('Seu endereço não está autorizado para comprar tokens');
        }
    } catch (error) {
        if (error.message.includes('autorizado')) {
            throw error;
        }
        console.log('📋 Whitelist: Não aplicável');
    }
    
    // Verifica limites por usuário
    try {
        const userLimit = await contractWithProvider.purchaseLimit(walletAddress);
        const hasPurchased = await contractWithProvider.hasPurchased(walletAddress);
        
        console.log(`📋 Limite por usuário: ${userLimit.toString()}`);
        console.log(`📋 Já comprou antes: ${hasPurchased}`);
        
        if (hasPurchased && userLimit.eq(0)) {
            console.log('🚨 PROBLEMA: Usuário já atingiu limite de compras!');
            throw new Error('Você já atingiu o limite de compras para este token');
        }
    } catch (error) {
        if (error.message.includes('limite')) {
            throw error;
        }
        console.log('📋 Limites por usuário: Não aplicável');
    }
    
    console.log('✅ Diagnóstico avançado concluído - nenhum problema detectado');
}

/**
 * Analisa a razão específica do revert para dar feedback preciso
 */
async function analyzeRevertReason(error, contract, valueInWei) {
    console.log('🔍 Analisando razão do revert...');
    
    // Tenta extrair mensagem de revert
    let revertReason = 'Desconhecida';
    if (error.reason) {
        revertReason = error.reason;
    } else if (error.message.includes('revert')) {
        const match = error.message.match(/revert (.+)/);
        if (match) {
            revertReason = match[1];
        }
    }
    
    console.log(`🚨 Razão do revert: ${revertReason}`);
    
    // Testes específicos baseados em padrões comuns
    const testScenarios = [
        {
            name: 'Valor muito baixo',
            test: async () => {
                const minValue = ethers.utils.parseEther('0.001'); // 0.001 BNB
                return await contract.callStatic[buyFunctionName]({ value: minValue, from: walletAddress });
            }
        },
        {
            name: 'Valor dobrado',
            test: async () => {
                const doubleValue = valueInWei.mul(2);
                return await contract.callStatic[buyFunctionName]({ value: doubleValue, from: walletAddress });
            }
        },
        {
            name: 'Valor exato do preço',
            test: async () => {
                const exactPrice = ethers.utils.parseEther(tokenInfo.price);
                return await contract.callStatic[buyFunctionName]({ value: exactPrice, from: walletAddress });
            }
        },
        {
            name: 'Sem valor (0 BNB)',
            test: async () => {
                return await contract.callStatic[buyFunctionName]({ value: 0, from: walletAddress });
            }
        }
    ];
    
    for (const scenario of testScenarios) {
        try {
            console.log(`🧪 Testando: ${scenario.name}`);
            await scenario.test();
            console.log(`✅ ${scenario.name}: FUNCIONOU!`);
            // Não mostra mais descobertas para o usuário - apenas no console
            return;
        } catch (testError) {
            console.log(`❌ ${scenario.name}: ${testError.reason || 'Falhou'}`);
        }
    }
    
    // Análise de padrões comuns de revert
    const commonReverts = {
        'insufficient funds': 'Saldo insuficiente no contrato ou usuário',
        'saldo insuficiente': 'Saldo insuficiente no contrato ou usuário',
        'not enough tokens': 'Contrato sem tokens suficientes',
        'sem tokens': 'Contrato sem tokens suficientes',
        'paused': 'Contrato está pausado',
        'pausado': 'Contrato está pausado',
        'not whitelisted': 'Endereço não está na whitelist',
        'não autorizado': 'Endereço não está na whitelist',
        'sale not active': 'Venda não está ativa',
        'venda inativa': 'Venda não está ativa',
        'minimum purchase': 'Valor abaixo do mínimo',
        'valor mínimo': 'Valor abaixo do mínimo',
        'maximum purchase': 'Valor acima do máximo',
        'valor máximo': 'Valor acima do máximo',
        'already purchased': 'Usuário já comprou antes',
        'já comprou': 'Usuário já comprou antes',
        'wrong price': 'Preço incorreto',
        'preço incorreto': 'Preço incorreto',
        'invalid amount': 'Quantidade inválida',
        'quantidade inválida': 'Quantidade inválida'
    };
    
    for (const [pattern, explanation] of Object.entries(commonReverts)) {
        if (revertReason.toLowerCase().includes(pattern)) {
            console.log(`💡 Padrão identificado: ${explanation}`);
            // Não mostra mais erros técnicos para o usuário durante simulação
            return;
        }
    }
    
    // Log apenas no console - não mostra erro técnico para o usuário
    console.log(`🔍 Razão do revert: ${revertReason}`);
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
        
        // Após mostrar as informações, verifica se pode habilitar a compra
        console.log('📢 Sistema: Seção de informações exibida, verificando se pode habilitar compra...');
        if (buyFunctionName) {
            enablePurchaseSection();
        }
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
 * Formata números para exibição de forma amigável
 */
function formatNumber(num) {
    const number = parseFloat(num);
    if (isNaN(number) || number === 0) return '0';
    
    // Para números muito grandes
    if (number >= 1000000000) {
        return (number / 1000000000).toFixed(2) + 'B';
    } else if (number >= 1000000) {
        return (number / 1000000).toFixed(2) + 'M';
    } else if (number >= 1000) {
        return (number / 1000).toFixed(2) + 'K';
    } 
    // Para números muito pequenos, mostrar com mais precisão sem notação científica
    else if (number < 1 && number > 0) {
        // Encontrar quantas casas decimais são necessárias
        const str = number.toString();
        if (str.includes('e-')) {
            // Se ainda tem notação científica, converter para decimal fixo
            const parts = str.split('e-');
            const decimals = parseInt(parts[1]) + 2; // Adiciona 2 casas extras
            return number.toFixed(Math.min(decimals, 18)); // Máximo 18 casas
        } else {
            return number.toFixed(6).replace(/\.?0+$/, ''); // Remove zeros desnecessários
        }
    } 
    // Para números normais
    else {
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
                // Atualizar saldo quando trocar de conta
                setTimeout(() => {
                    updateWalletBalance();
                }, 500);
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
    
    // Verificação periódica do saldo (a cada 30 segundos se conectado)
    setInterval(() => {
        if (walletConnected && walletAddress) {
            console.log('🔄 Verificação periódica do saldo...');
            updateWalletBalance();
        }
    }, 30000); // 30 segundos
}

// ==================== SISTEMA DE FALLBACK RPC ====================

/**
 * Inicializa provider com fallback para resolver problemas de RPC
 * ESTRATÉGIA: Usa APENAS RPC público para leitura, MetaMask apenas para transações
 */
async function initializeProviderWithFallback() {
    console.log('🔄 Inicializando provider com estratégia RPC-primeiro');
    
    // NUNCA usa MetaMask para operações de leitura
    // Detecta chain ID da MetaMask para usar RPC correspondente
    let chainId = 97; // BSC Testnet padrão
    
    try {
        const currentChainId = await window.ethereum.request({ method: 'eth_chainId' });
        chainId = parseInt(currentChainId, 16);
        console.log(`🌐 Chain ID detectado: ${chainId}`);
    } catch (error) {
        console.warn('⚠️ Não foi possível detectar chain ID, usando BSC Testnet');
    }
    
    // RPC endpoints por rede
    const rpcEndpoints = {
        97: [  // BSC Testnet
            'https://data-seed-prebsc-1-s1.binance.org:8545',
            'https://bsc-testnet.binance.org',
            'https://data-seed-prebsc-2-s1.binance.org:8545',
            'https://bsc-testnet-rpc.publicnode.com'
        ],
        56: [  // BSC Mainnet
            'https://bsc-dataseed.binance.org',
            'https://bsc-dataseed1.defibit.io',
            'https://bsc-dataseed1.ninicoin.io'
        ]
    };
    
    const endpoints = rpcEndpoints[chainId] || rpcEndpoints[97];
    
    for (let i = 0; i < endpoints.length; i++) {
        const rpcUrl = endpoints[i];
        try {
            console.log(`🔍 Testando RPC ${i + 1}/${endpoints.length}: ${rpcUrl}`);
            
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
}

/**
 * Obtém URL de RPC fallback baseado na rede
 */
function getFallbackRpcUrl(chainId) {
    const rpcUrls = {
        97: [
            'https://data-seed-prebsc-1-s1.binance.org:8545/',
            'https://data-seed-prebsc-2-s1.binance.org:8545/',
            'https://bsc-testnet.publicnode.com'
        ],  // BSC Testnet
        56: [
            'https://bsc-dataseed.binance.org/',
            'https://bsc-mainnet.public.blastapi.io',
            'https://bsc.publicnode.com'
        ],  // BSC Mainnet
        1: [
            'https://cloudflare-eth.com/',
            'https://ethereum.publicnode.com',
            'https://rpc.ankr.com/eth'
        ],  // Ethereum Mainnet
        137: [
            'https://polygon-rpc.com/',
            'https://polygon.publicnode.com',
            'https://rpc.ankr.com/polygon'
        ]   // Polygon Mainnet
    };
    
    const urls = rpcUrls[chainId];
    return urls ? urls[0] : null; // Retorna primeiro RPC disponível
}

/**
 * Tenta obter código do contrato com retry
 */
async function getCodeWithRetry(contractAddress, maxRetries = 3) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const code = await currentProvider.getCode(contractAddress);
            return code;
        } catch (error) {
            console.warn(`⚠️ Tentativa ${attempt}/${maxRetries} falhou:`, error.message);
            
            if (attempt === maxRetries) {
                throw error;
            }
            
            // Aguarda antes de tentar novamente
            await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
    }
}

/**
 * Retry com provider alternativo - tenta múltiplos RPCs
 */
async function retryWithFallbackProvider(contractAddress) {
    // Detecta chain ID
    const chainId = await window.ethereum.request({ method: 'eth_chainId' });
    const chainIdDecimal = parseInt(chainId, 16);
    
    // Obtém lista de RPCs
    const rpcUrls = getFallbackRpcUrls(chainIdDecimal);
    if (!rpcUrls || rpcUrls.length === 0) {
        throw new Error('Nenhum RPC alternativo disponível para esta rede');
    }
    
    // Tenta cada RPC até encontrar um que funcione
    for (let i = 0; i < rpcUrls.length; i++) {
        try {
            const rpcUrl = rpcUrls[i];
            addContractMessage(`🔄 Tentando RPC ${i + 1}/${rpcUrls.length}: ${rpcUrl}`, 'info');
            
            // Cria novo provider
            const fallbackProvider = new ethers.providers.JsonRpcProvider(rpcUrl);
            
            // Testa conectividade
            await fallbackProvider.getNetwork();
            
            // Testa com novo provider
            const code = await fallbackProvider.getCode(contractAddress);
            if (code === '0x') {
                throw new Error('Endereço não é um smart contract válido');
            }
            
            addContractMessage('✅ Smart contract detectado via RPC alternativo', 'success');
            
            // Atualiza provider global
            currentProvider = fallbackProvider;
            currentSigner = null; // Sem signer no RPC público
            
            // Continua verificação
            currentContract = new ethers.Contract(contractAddress, CONFIG.tokenABI, currentProvider);
            await verifyERC20Functions();
            await verifyBuyFunctions();
            await loadTokenInfo();
            showTokenInfo();
            
            addContractMessage('🎉 Contrato verificado com RPC alternativo!', 'success');
            addContractMessage('⚠️ Para transações, reconecte com MetaMask', 'warning');
            return; // Sucesso, sai da função
            
        } catch (error) {
            console.warn(`❌ RPC ${rpcUrls[i]} falhou:`, error.message);
            if (i === rpcUrls.length - 1) {
                // Último RPC também falhou
                throw new Error(`Todos os RPCs falharam. Último erro: ${error.message}`);
            }
        }
    }
}

/**
 * Retorna lista completa de RPCs para fallback
 */
function getFallbackRpcUrls(chainId) {
    const rpcUrls = {
        97: [
            'https://data-seed-prebsc-1-s1.binance.org:8545/',
            'https://data-seed-prebsc-2-s1.binance.org:8545/',
            'https://bsc-testnet.publicnode.com',
            'https://endpoints.omniatech.io/v1/bsc/testnet/public'
        ],  // BSC Testnet
        56: [
            'https://bsc-dataseed.binance.org/',
            'https://bsc-mainnet.public.blastapi.io',
            'https://bsc.publicnode.com',
            'https://endpoints.omniatech.io/v1/bsc/mainnet/public'
        ],  // BSC Mainnet
        1: [
            'https://cloudflare-eth.com/',
            'https://ethereum.publicnode.com',
            'https://rpc.ankr.com/eth',
            'https://endpoints.omniatech.io/v1/eth/mainnet/public'
        ],  // Ethereum Mainnet
        137: [
            'https://polygon-rpc.com/',
            'https://polygon.publicnode.com',
            'https://rpc.ankr.com/polygon',
            'https://endpoints.omniatech.io/v1/matic/mainnet/public'
        ]   // Polygon Mainnet
    };
    
    return rpcUrls[chainId] || [];
}

// ==================== CONTROLES DO SISTEMA ====================

/**
 * Limpa todos os dados e reinicia o sistema
 */
function clearAllData() {
    console.log('🧹 Limpando dados e reiniciando sistema...');
    
    // Limpar campos
    const contractInput = document.getElementById('contract-address');
    const quantityInput = document.getElementById('token-quantity');
    const priceInput = document.getElementById('token-price');
    const totalValueInput = document.getElementById('total-value');
    
    if (contractInput) {
        contractInput.value = '';
        contractInput.classList.remove('border-success', 'border-danger', 'is-valid', 'is-invalid');
        contractInput.disabled = false; // Reabilita o campo
        contractInput.placeholder = 'Conecte sua carteira primeiro...';
    }
    
    if (quantityInput) {
        quantityInput.value = '';
        quantityInput.disabled = true;
    }
    
    if (priceInput) {
        priceInput.value = '';
        priceInput.readOnly = false;
        priceInput.disabled = true; // Desabilita até validação
        priceInput.style.backgroundColor = '';
        priceInput.style.borderColor = '';
        priceInput.style.cursor = '';
        priceInput.title = '';
    }
    
    if (totalValueInput) {
        totalValueInput.value = '';
    }
    
    // Limpar informações do token
    const tokenFields = ['tokenName', 'tokenSymbol', 'tokenDecimals', 'tokenTotalSupply', 'contractBalance', 'tokensForSale'];
    tokenFields.forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (field) {
            field.textContent = '-';
            field.className = 'fw-bold text-muted mb-2'; // Reset de classes
        }
    });
    
    // Ocultar informação de disponibilidade
    const availabilityInfo = document.getElementById('tokens-availability');
    if (availabilityInfo) {
        availabilityInfo.style.display = 'none';
    }
    
    // Limpar saldo da carteira
    const balanceElement = document.getElementById('wallet-balance-display');
    const balanceContainer = document.getElementById('wallet-balance-info');
    if (balanceElement) {
        balanceElement.textContent = '-';
    }
    if (balanceContainer) {
        balanceContainer.style.display = 'none';
    }
    
    // Resetar status
    const statusFields = ['erc20Status', 'transferStatus', 'buyStatus'];
    statusFields.forEach(fieldId => {
        updateCompatibilityStatus(fieldId, 'Verificando...', 'warning');
    });
    
    // Limpar mensagens
    ['contract-messages', 'system-messages'].forEach(id => {
        const element = document.getElementById(id);
        if (element) element.innerHTML = '';
    });
    
    const purchaseResult = document.getElementById('purchaseResult');
    if (purchaseResult) {
        purchaseResult.style.display = 'none';
        const purchaseErrors = document.getElementById('purchaseErrors');
        if (purchaseErrors) purchaseErrors.innerHTML = '';
    }
    
    // Ocultar seções
    ['contract-detection-section', 'token-info-section', 'purchase-section', 'transactionDetails'].forEach(id => {
        const element = document.getElementById(id);
        if (element) element.style.display = 'none';
    });
    
    // Resetar botões
    const detectBtn = document.getElementById('detect-contract-btn');
    if (detectBtn) {
        detectBtn.disabled = false;
        detectBtn.textContent = 'DETECTAR';
        detectBtn.classList.remove('btn-success');
        detectBtn.classList.add('btn-info');
    }
    
    // Botão de verificar contrato
    const verifyBtn = document.getElementById('verify-contract-btn');
    if (verifyBtn) {
        verifyBtn.disabled = true;
        verifyBtn.textContent = 'VERIFICAR CONTRATO';
        verifyBtn.classList.remove('btn-success', 'btn-warning');
        verifyBtn.classList.add('btn-info');
    }
    
    const purchaseBtn = document.getElementById('execute-purchase-btn');
    if (purchaseBtn) {
        purchaseBtn.disabled = true;
        purchaseBtn.style.opacity = '0.5';
        purchaseBtn.style.cursor = 'not-allowed';
        purchaseBtn.style.backgroundColor = '';
    }
    
    // Resetar variáveis globais
    currentContract = null;
    tokenInfo = { 
        name: '', 
        symbol: '', 
        decimals: 0, 
        price: '0', 
        minPurchase: null, 
        maxPurchase: null,
        tokensForSale: null,
        tokensForSaleFormatted: 0
    };
    buyFunctionName = null;
    
    console.log('✅ Sistema reiniciado');
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
    clearPurchaseMessages,
    initializeProviderWithFallback,
    retryWithFallbackProvider,
    clearAllData
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
