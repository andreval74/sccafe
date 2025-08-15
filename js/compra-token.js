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
    
    try {
        // Mostra loading
        updateVerifyButton(true);
        clearContractMessages();
        hideTokenInfo();
        
        addContractMessage('🔍 Verificando contrato na blockchain...', 'info');
        
        // Inicializa provider com fallback para resolver problemas de RPC
        currentProvider = await initializeProviderWithFallback();
        currentSigner = currentProvider.getSigner();
        
        // Verifica se o endereço tem código (é um contrato)
        addContractMessage('🔍 Verificando se é um smart contract...', 'info');
        const code = await getCodeWithRetry(contractAddress);
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
    }     
    
    catch (error) {
        console.error('❌ Erro ao verificar contrato:', error);
        
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
 * NOVA ESTRATÉGIA: Teste direto das funções PAYABLE encontradas no ABI
 */
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
                    if (staticError.message.includes('revert')) {
                        console.log(`⚠️ ${funcName}() reverte com parâmetros de teste (normal)`);
                    } else {
                        console.log(`❌ ${funcName}() falhou no callStatic: ${staticError.message}`);
                        continue; // Pula esta função
                    }
                }
                
                buyFunctionName = funcName;
                updateCompatibilityStatus('buyStatus', '✅ Validada 100%', 'success');
                addContractMessage(`✅ Função "${funcName}" totalmente validada`, 'success');
                
                // 🎯 AGORA SIM: Habilita seção de compra apenas quando função válida é encontrada
                console.log('🎉 Função de compra válida encontrada - Habilitando seção de compra');
                enablePurchaseSection();
                
                return true;
                
            } catch (error) {
                console.log(`❌ Função ${funcName}() falhou: ${error.message}`);
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
                    updateCompatibilityStatus('buyStatus', '✅ Detectada via Etherscan', 'success');
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
    
    addContractMessage('🔍 Verificando funções de compra disponíveis...', 'info');
    
    for (const funcName of buyFunctions) {
        try {
            console.log(`🔍 Testando função: ${funcName}()`);
            
            // **NOVA ESTRATÉGIA: usar estimateGas que funciona melhor com payable functions**
            const testValue = ethers.utils.parseEther('0.001'); // Valor pequeno para teste
            
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
            
            // Tenta estimar gas - se funcionar, a função existe e é válida
            await currentContract.estimateGas[funcName](...gasEstimateParams);
            
            // Se chegou aqui, a função existe e aceita os parâmetros
            console.log(`✅ Função ${funcName}() encontrada e funcional`);
            buyFunctionName = funcName;
            updateCompatibilityStatus('buyStatus', '✅ Disponível', 'success');
            addContractMessage(`✅ Função de compra "${funcName}" detectada e funcional`, 'success');
            return;
            
        } catch (error) {
            if (error.message.includes('is not a function')) {
                console.log(`❌ Função ${funcName}() não existe no contrato`);
            } else if (error.code === 'UNPREDICTABLE_GAS_LIMIT' || error.message.includes('revert')) {
                // Função existe mas tem lógica que impede execução - ainda é válida
                console.log(`✅ Função ${funcName}() existe (rejeitou parâmetros de teste)`);
                buyFunctionName = funcName;
                updateCompatibilityStatus('buyStatus', '✅ Disponível', 'success');
                addContractMessage(`✅ Função de compra "${funcName}" detectada`, 'success');
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
            addContractMessage(`⚠️ Contrato tem funções suspeitas: ${possibleBuyFunctions.join(', ')}`, 'warning');
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
        addContractMessage('❌ Este contrato não suporta compra direta de tokens', 'error');
        
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
        
        // Tenta detectar preço do contrato
        try {
            let price = null;
            const priceFunctions = [
                'tokenPrice', 'price', 'getPrice', 'buyPrice', 
                'tokenCost', 'cost', 'salePrice', 'pricePerToken'
            ];
            
            console.log('💰 Detectando preço do contrato...');
            
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
                console.log(`💰 Preço final detectado: ${tokenInfo.price} BNB por token`);
            } else {
                tokenInfo.price = CONFIG.defaultTokenPrice;
                console.log(`⚠️ Preço não detectado, usando padrão: ${CONFIG.defaultTokenPrice} BNB`);
            }
        } catch (error) {
            tokenInfo.price = CONFIG.defaultTokenPrice;
            console.log(`❌ Erro na detecção de preço: ${error.message}`);
        }
        
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
    
    // Formata total supply
    const totalSupply = ethers.utils.formatUnits(tokenInfo.totalSupply, tokenInfo.decimals);
    document.getElementById('tokenTotalSupply').textContent = `${formatNumber(totalSupply)} ${tokenInfo.symbol}`;
    
    // Formata saldo do contrato
    const contractBalance = ethers.utils.formatEther(tokenInfo.contractBalance);
    document.getElementById('contractBalance').textContent = `${formatNumber(contractBalance)} BNB`;
    
    // Define preço como READ-ONLY (detectado do contrato)
    const priceInput = document.getElementById('token-price');
    if (priceInput) {
        priceInput.value = tokenInfo.price;
        priceInput.readOnly = true; // Campo somente leitura
        priceInput.disabled = false; // Habilita para mostrar o valor
        priceInput.style.backgroundColor = '#2d3748'; // Cor de fundo diferenciada
        priceInput.style.cursor = 'not-allowed'; // Cursor indicativo
        
        // Adiciona tooltip explicativo
        priceInput.title = 'Preço detectado automaticamente do contrato - não pode ser alterado';
        
        console.log(`💰 Preço detectado: ${tokenInfo.price} BNB por token`);
    }
}

// ==================== GERENCIAMENTO DE COMPRA ====================

/**
 * Habilita seção de compra - APENAS quando função válida é confirmada
 */
function enablePurchaseSection() {
    // 🛡️ PROTEÇÃO: Só executa se realmente há uma função de compra válida
    if (!buyFunctionName) {
        console.log('❌ enablePurchaseSection() chamada sem função de compra válida - IGNORANDO');
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
    addContractMessage('🔒 Seção de compra não disponível - Este contrato não suporta compra direta', 'warning');
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
        alert('Este contrato não suporta compra direta');
        return;
    }
    
    // Verifica se a função existe no contrato antes de executar
    if (!buyFunctionName) {
        alert('❌ Nenhuma função de compra foi detectada no contrato');
        return;
    }
    
    // **VALIDAÇÃO CRÍTICA: Verifica se a função realmente existe no contrato**
    if (!currentContract[buyFunctionName]) {
        console.error(`❌ ERRO CRÍTICO: Função ${buyFunctionName}() não existe no contrato!`);
        alert(`❌ Erro: A função ${buyFunctionName}() não está disponível no contrato`);
        
        // Reseta a detecção
        buyFunctionName = null;
        updateCompatibilityStatus('buyStatus', '❌ Função inválida', 'error');
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
    
    try {
        const totalValue = (price * quantity).toString();
        const valueInWei = ethers.utils.parseEther(totalValue);
        
        clearPurchaseMessages();
        addPurchaseMessage('🚀 Iniciando transação de compra...', 'info');
        
        // IMPORTANTE: Sempre usar MetaMask para transações (não RPC público)
        const web3Provider = new ethers.providers.Web3Provider(window.ethereum);
        const signer = web3Provider.getSigner();
        
        // Cria contrato com signer do MetaMask
        const contractWithSigner = new ethers.Contract(
            currentContract.address, 
            CONFIG.tokenABI, 
            signer
        );
        
        console.log(`💰 Executando compra: ${quantity} tokens por ${totalValue} BNB`);
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
            const totalCostWei = ethers.utils.parseEther(totalValue);
            if (userBalance.lt(totalCostWei)) {
                throw new Error(`Saldo insuficiente. Você tem ${ethers.utils.formatEther(userBalance)} BNB, mas precisa de ${totalValue} BNB`);
            }
            
            // Verifica se o contrato tem tokens suficientes
            if (tokenInfo.totalSupply) {
                const contractTokenBalance = await currentContract.balanceOf(currentContract.address);
                const contractTokens = parseFloat(ethers.utils.formatUnits(contractTokenBalance, tokenInfo.decimals));
                
                console.log(`🪙 Tokens no contrato: ${contractTokens} ${tokenInfo.symbol}`);
                
                if (contractTokens < quantity) {
                    throw new Error(`Contrato não tem tokens suficientes. Disponível: ${contractTokens}, solicitado: ${quantity}`);
                }
            }
            
            // DIAGNÓSTICO AVANÇADO - Verifica condições especiais do contrato
            console.log('🔍 Executando diagnóstico avançado do contrato...');
            await performAdvancedContractDiagnostics(publicProvider);
            
            addPurchaseMessage('✅ Verificações iniciais aprovadas', 'success');
            
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
        addPurchaseMessage('🧪 Testando diferentes cenários...', 'info');
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
                addPurchaseMessage('✅ Simulação bem-sucedida', 'success');
            } catch (simError1) {
                console.log('❌ Simulação com valor exato: FALHOU');
                console.log('🔍 Razão:', simError1.reason || simError1.message);
                
                // Tenta extrair a razão específica do revert
                await analyzeRevertReason(simError1, contractForSim, valueInWei);
            }
            
        } catch (simError) {
            console.warn('⚠️ Erro na simulação geral:', simError.message);
            
            // Análise do erro de simulação
            if (simError.message.includes('missing trie node')) {
                addPurchaseMessage('⚠️ Problema de sincronização da rede - tentando mesmo assim', 'warning');
            } else if (simError.message.includes('revert')) {
                addPurchaseMessage('❌ Contrato rejeitou a simulação - verifique os parâmetros', 'error');
                return;
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
        
        addPurchaseMessage(`✅ Transação enviada: ${tx.hash}`, 'success');
        addPurchaseMessage('⏳ Aguardando confirmação...', 'info');
        
        // Aguarda confirmação
        const receipt = await tx.wait();
        
        addPurchaseMessage('🎉 Transação confirmada!', 'success');
        
        // Mostra detalhes da transação
        showTransactionDetails(receipt, quantity, totalValue);
        
    } catch (error) {
        console.error('❌ Erro na compra:', error);
        
        // Mensagens de erro mais detalhadas
        let errorMessage = 'Erro desconhecido';
        let technicalDetails = '';
        
        if (error.code === 'INSUFFICIENT_FUNDS') {
            errorMessage = 'Saldo insuficiente na carteira';
        } else if (error.code === 'USER_REJECTED') {
            errorMessage = 'Transação cancelada pelo usuário';
        } else if (error.code === 'CALL_EXCEPTION') {
            errorMessage = 'Erro na execução do contrato';
            
            // Análise específica do CALL_EXCEPTION
            if (error.receipt) {
                technicalDetails = `Hash: ${error.receipt.transactionHash}\n`;
                technicalDetails += `Gas usado: ${error.receipt.gasUsed}\n`;
                technicalDetails += `Status: ${error.receipt.status === 0 ? 'FAILED' : 'SUCCESS'}\n`;
                
                console.log('📋 Detalhes da transação falhada:');
                console.log('🔗 Hash:', error.receipt.transactionHash);
                console.log('⛽ Gas usado:', error.receipt.gasUsed.toString());
                console.log('📊 Status:', error.receipt.status === 0 ? 'FAILED' : 'SUCCESS');
                
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
                    errorMessage += '\n• Função buy() tem condições específicas não atendidas';
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
                console.log('4. Função buy() com lógica específica não atendida');
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
            if (errorMsg.includes('execution reverted')) {
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
                const maxInTokens = ethers.utils.formatUnits(result, tokenInfo.decimals);
                if (parseFloat(maxInTokens) < quantity) {
                    console.log(`🚨 PROBLEMA: Quantidade solicitada (${quantity}) excede máximo permitido (${maxInTokens})`);
                    throw new Error(`Quantidade máxima permitida: ${maxInTokens} tokens`);
                }
            }
            
            if (func.name === 'minPurchase' && result.gt(0)) {
                const minInTokens = ethers.utils.formatUnits(result, tokenInfo.decimals);
                if (parseFloat(minInTokens) > quantity) {
                    console.log(`🚨 PROBLEMA: Quantidade solicitada (${quantity}) é menor que mínimo (${minInTokens})`);
                    throw new Error(`Quantidade mínima necessária: ${minInTokens} tokens`);
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
            addPurchaseMessage(`💡 Descoberta: ${scenario.name} funciona - ajuste necessário`, 'warning');
            return;
        } catch (testError) {
            console.log(`❌ ${scenario.name}: ${testError.reason || 'Falhou'}`);
        }
    }
    
    // Análise de padrões comuns de revert
    const commonReverts = {
        'insufficient funds': 'Saldo insuficiente no contrato ou usuário',
        'not enough tokens': 'Contrato sem tokens suficientes',
        'paused': 'Contrato está pausado',
        'not whitelisted': 'Endereço não está na whitelist',
        'sale not active': 'Venda não está ativa',
        'minimum purchase': 'Valor abaixo do mínimo',
        'maximum purchase': 'Valor acima do máximo',
        'already purchased': 'Usuário já comprou antes',
        'wrong price': 'Preço incorreto',
        'invalid amount': 'Quantidade inválida'
    };
    
    for (const [pattern, explanation] of Object.entries(commonReverts)) {
        if (revertReason.toLowerCase().includes(pattern)) {
            console.log(`💡 Padrão identificado: ${explanation}`);
            addPurchaseMessage(`❌ Erro identificado: ${explanation}`, 'error');
            return;
        }
    }
    
    // Se não conseguiu identificar, mostra a razão bruta
    addPurchaseMessage(`❌ Contrato rejeitou: ${revertReason}`, 'error');
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
    retryWithFallbackProvider
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
