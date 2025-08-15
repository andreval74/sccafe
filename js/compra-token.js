/**
 * 🛒 COMPRA DE TOKENS - MÓDULO ESPECÍFICO
 * 
 * 📍 RESPONSABILIDADES:
 * - Interface para compra de tokens via MetaMask
 * - Cálculo de preços e disponibilidade
 * - Verificação de contratos ERC-20
 * - Execução de transações de compra
 * 
 * 🔗 DEPENDÊNCIAS:
 * - ethers.js v5.7.2
 * - MetaMaskConnector (shared/metamask-connector.js) - REUTILIZADO
 * - CommonUtils (shared/common-utils.js) - REUTILIZADO
 * - TokenGlobal (shared/token-global.js) - REUTILIZADO
 * 
 * 📤 EXPORTS:
 * - TokenPurchase: Classe principal
 * - Funções utilitárias específicas de compra
 */

// ==================== CONFIGURAÇÕES ====================

const CONFIG = {
    // Endereço do contrato TKN na BSC Testnet
    contractAddress: "0x5265F80e30e019344a218Dd89b67cBE164511c65",
    tokenDecimals: 18,
    tokenPrice: "0.003", // BNB por token
    targetChainId: 97, // BSC Testnet
    
    // ABI básico do ERC-20
    tokenABI: [
        "function balanceOf(address owner) view returns (uint256)",
        "function totalSupply() view returns (uint256)",
        "function name() view returns (string)",
        "function symbol() view returns (string)"
    ],
    
    // Configurações de gas
    gasLimit: 150000,
    gasPrice: "5000000000" // 5 gwei
};

// ==================== ESTADO GLOBAL ====================

let currentProvider = null;
let currentSigner = null;
let isConnected = false;

// ==================== SISTEMA DE FEEDBACK POR SEÇÃO ====================

/**
 * Sistema de mensagens organizado por seções
 * REUTILIZA o conceito de feedback específico por área do projeto
 */
const FeedbackSystem = {
    
    /**
     * Adiciona mensagem na seção de conexão
     */
    addConnectionMessage(msg, type = 'info') {
        this._addMessage("connectionErrors", "connectionResult", msg, type);
    },
    
    /**
     * Adiciona mensagem na seção de contrato
     */
    addContractMessage(msg, type = 'info') {
        this._addMessage("contractErrors", "contractResult", msg, type);
    },
    
    /**
     * Adiciona mensagem na seção de compra
     */
    addPurchaseMessage(msg, type = 'info') {
        this._addMessage("purchaseErrors", "purchaseResult", msg, type);
    },
    
    /**
     * Limpa mensagens da seção de conexão
     */
    clearConnectionMessages() {
        this._clearMessages("connectionErrors", "connectionResult");
    },
    
    /**
     * Limpa mensagens da seção de contrato
     */
    clearContractMessages() {
        this._clearMessages("contractErrors", "contractResult");
    },
    
    /**
     * Limpa mensagens da seção de compra
     */
    clearPurchaseMessages() {
        this._clearMessages("purchaseErrors", "purchaseResult");
    },
    
    /**
     * Método interno para adicionar mensagens
     */
    _addMessage(listId, containerId, msg, type) {
        const ul = document.getElementById(listId);
        const container = document.getElementById(containerId);
        
        if (ul && container) {
            const li = document.createElement("li");
            li.textContent = msg;
            li.className = `text-dark mb-1 ${type === 'error' ? 'text-danger' : ''}`;
            ul.appendChild(li);
            container.style.display = "block";
        }
    },
    
    /**
     * Método interno para limpar mensagens
     */
    _clearMessages(listId, containerId) {
        const ul = document.getElementById(listId);
        const container = document.getElementById(containerId);
        
        if (ul) ul.innerHTML = "";
        if (container) container.style.display = "none";
    }
};

// ==================== FUNÇÕES DE CONEXÃO ====================

/**
 * Conecta com a carteira MetaMask
 * REUTILIZA o MetaMaskConnector global existente do projeto
 */
async function connectWallet() {
    FeedbackSystem.clearConnectionMessages();
    
    try {
        // USAR função global existente do projeto
        if (!window.isMetaMaskInstalled || !window.isMetaMaskInstalled()) {
            FeedbackSystem.addConnectionMessage("❌ MetaMask não instalado!", 'error');
            if (window.showMetaMaskInstallModal) {
                window.showMetaMaskInstallModal();
            }
            return false;
        }
        
        FeedbackSystem.addConnectionMessage("🔍 Verificando conectividade...");
        
        // USAR MetaMaskConnector global existente
        const connectionResult = await window.connectWallet();
        
        if (connectionResult && connectionResult.account) {
            FeedbackSystem.addConnectionMessage(`✅ Carteira conectada: ${connectionResult.account}`);
            
            // Verificar rede BSC Testnet
            if (connectionResult.chainId !== CONFIG.targetChainId) {
                FeedbackSystem.addConnectionMessage(`⚠️ Você está na rede ${connectionResult.networkName} (chainId: ${connectionResult.chainId})`, 'error');
                FeedbackSystem.addConnectionMessage("Por favor, mude para BSC Testnet (chainId: 97)");
                
                // Tentar trocar automaticamente
                try {
                    FeedbackSystem.addConnectionMessage("🔄 Tentando trocar para BSC Testnet...");
                    await window.switchToNetwork(CONFIG.targetChainId);
                    FeedbackSystem.addConnectionMessage("✅ Trocado para BSC Testnet com sucesso!");
                } catch (switchError) {
                    FeedbackSystem.addConnectionMessage(`❌ Erro ao trocar rede: ${switchError.message}`, 'error');
                    return false;
                }
            } else {
                FeedbackSystem.addConnectionMessage("✅ Conectado à BSC Testnet");
            }
            
            // Criar provider ethers.js
            currentProvider = new ethers.providers.Web3Provider(window.ethereum);
            currentSigner = currentProvider.getSigner();
            
            // Verificar saldo BNB
            const balance = await currentProvider.getBalance(connectionResult.account);
            const balanceFormatted = ethers.utils.formatEther(balance);
            FeedbackSystem.addConnectionMessage(`💰 Saldo BNB: ${parseFloat(balanceFormatted).toFixed(4)} BNB`);
            
            isConnected = true;
            updateConnectionStatus(connectionResult.account);
            
            return true;
        }
        
        return false;
        
    } catch (err) {
        FeedbackSystem.addConnectionMessage(`❌ Erro de conectividade: ${err.message}`, 'error');
        FeedbackSystem.addConnectionMessage("💡 Possíveis soluções:");
        FeedbackSystem.addConnectionMessage("• Reinicie o MetaMask");
        FeedbackSystem.addConnectionMessage("• Mude para BSC Testnet manualmente");
        FeedbackSystem.addConnectionMessage("• Verifique sua conexão com internet");
        return false;
    }
}

/**
 * Atualiza status visual da conexão
 */
function updateConnectionStatus(address) {
    const statusEl = document.getElementById("status");
    if (statusEl) {
        statusEl.innerText = `✅ Carteira conectada: ${address}`;
    }
}

// ==================== FUNÇÕES DE VERIFICAÇÃO DE CONTRATO ====================

/**
 * Verifica o contrato de tokens na blockchain
 * REUTILIZA providers RPC do projeto e estrutura de verificação
 */
async function checkContract() {
    FeedbackSystem.clearContractMessages();
    
    try {
        FeedbackSystem.addContractMessage("🔍 Verificando contrato...");
        
        // USAR RPCs do token-global.js se disponível
        const rpcUrl = window.rpcFallbacks && window.rpcFallbacks[97] 
            ? window.rpcFallbacks[97][0] 
            : "https://data-seed-prebsc-1-s1.binance.org:8545/";
            
        const publicProvider = new ethers.providers.JsonRpcProvider(rpcUrl);
        
        // Verificar se existe código no endereço
        const code = await publicProvider.getCode(CONFIG.contractAddress);
        
        if (code === '0x') {
            FeedbackSystem.addContractMessage("❌ PROBLEMA: Não existe contrato neste endereço!", 'error');
            FeedbackSystem.addContractMessage("O endereço pode estar incorreto ou o contrato não foi deployed na BSC Testnet.");
            return false;
        } else {
            FeedbackSystem.addContractMessage("✅ Contrato encontrado no endereço.");
        }
        
        // Verificar saldo do contrato em BNB
        const balance = await publicProvider.getBalance(CONFIG.contractAddress);
        FeedbackSystem.addContractMessage(`💰 Saldo BNB do contrato: ${ethers.utils.formatEther(balance)} BNB`);
        
        // Verificar conectividade da rede
        const blockNumber = await publicProvider.getBlockNumber();
        FeedbackSystem.addContractMessage(`📡 Bloco atual BSC Testnet: ${blockNumber}`);
        
        // Tentar acessar funções ERC-20 usando fetchTokenData se disponível
        try {
            let tokenData;
            
            // TENTAR usar função global existente primeiro
            if (window.fetchTokenData) {
                tokenData = await window.fetchTokenData(CONFIG.contractAddress, publicProvider);
            } else {
                // Fallback para implementação local
                const tokenContract = new ethers.Contract(CONFIG.contractAddress, CONFIG.tokenABI, publicProvider);
                
                const [name, symbol, totalSupply, contractTokenBalance] = await Promise.all([
                    tokenContract.name(),
                    tokenContract.symbol(),
                    tokenContract.totalSupply(),
                    tokenContract.balanceOf(CONFIG.contractAddress)
                ]);
                
                tokenData = { name, symbol, totalSupply, contractTokenBalance };
            }
            
            // Atualizar interface
            updateTokenInfo(tokenData.name, tokenData.symbol, tokenData.totalSupply, tokenData.contractTokenBalance);
            
            FeedbackSystem.addContractMessage(`✅ Token: ${tokenData.name} (${tokenData.symbol})`);
            FeedbackSystem.addContractMessage(`📊 Total Supply: ${ethers.utils.formatUnits(tokenData.totalSupply, CONFIG.tokenDecimals)} ${tokenData.symbol}`);
            FeedbackSystem.addContractMessage(`🪙 Tokens disponíveis: ${ethers.utils.formatUnits(tokenData.contractTokenBalance, CONFIG.tokenDecimals)} ${tokenData.symbol}`);
            
            // Verificar disponibilidade para venda
            if (tokenData.contractTokenBalance.gt(0)) {
                FeedbackSystem.addContractMessage("✅ Contrato tem tokens disponíveis para venda.");
            } else {
                FeedbackSystem.addContractMessage("⚠️ ATENÇÃO: Contrato não tem tokens para venda!", 'error');
            }
            
            return true;
            
        } catch (tokenErr) {
            FeedbackSystem.addContractMessage(`⚠️ Não foi possível acessar funções ERC-20: ${tokenErr.message}`, 'error');
            FeedbackSystem.addContractMessage("O contrato pode não ser um token ERC-20 padrão.");
            
            // Resetar displays
            resetTokenInfo();
            return false;
        }
        
    } catch (err) {
        FeedbackSystem.addContractMessage(`❌ Erro ao verificar contrato: ${err.message}`, 'error');
        FeedbackSystem.addContractMessage("💡 Pode ser um problema de conectividade com a BSC Testnet.");
        return false;
    }
}

/**
 * Atualiza informações do token na interface
 */
function updateTokenInfo(name, symbol, totalSupply, contractBalance) {
    const elements = {
        tokenName: document.getElementById("tokenName"),
        tokenSymbol: document.getElementById("tokenSymbol"),
        tokenBalance: document.getElementById("tokenBalance")
    };
    
    if (elements.tokenName) elements.tokenName.textContent = name;
    if (elements.tokenSymbol) elements.tokenSymbol.textContent = symbol;
    if (elements.tokenBalance) {
        elements.tokenBalance.textContent = ethers.utils.formatUnits(contractBalance, CONFIG.tokenDecimals);
    }
}

/**
 * Reseta informações do token na interface
 */
function resetTokenInfo() {
    const elements = {
        tokenName: document.getElementById("tokenName"),
        tokenSymbol: document.getElementById("tokenSymbol"),
        tokenBalance: document.getElementById("tokenBalance")
    };
    
    Object.values(elements).forEach(el => {
        if (el) el.textContent = "N/A";
    });
}

// ==================== FUNÇÕES DE CÁLCULO ====================

/**
 * Calcula total da compra em tempo real
 * REUTILIZA formatação de números do projeto se disponível
 */
function calculateTotal() {
    const amount = document.getElementById("tokenAmount").value;
    const calcDiv = document.getElementById("calculationDisplay");
    
    if (amount && amount > 0) {
        const total = parseFloat(amount) * parseFloat(CONFIG.tokenPrice);
        
        // Atualizar elementos de cálculo
        const elements = {
            calcTokens: document.getElementById("calcTokens"),
            calcTotal: document.getElementById("calcTotal"),
            availabilityStatus: document.getElementById("availabilityStatus")
        };
        
        // USAR formatação do projeto se disponível
        if (elements.calcTokens) {
            elements.calcTokens.textContent = window.formatarNumero ? 
                window.formatarNumero(amount) : amount;
        }
        if (elements.calcTotal) {
            elements.calcTotal.textContent = total.toFixed(6) + " BNB";
        }
        
        // Verificar disponibilidade
        checkTokenAvailability(amount, elements.availabilityStatus);
        
        if (calcDiv) calcDiv.style.display = "block";
    } else {
        if (calcDiv) calcDiv.style.display = "none";
    }
}

/**
 * Verifica disponibilidade de tokens
 */
function checkTokenAvailability(requestedAmount, statusElement) {
    const availableText = document.getElementById("tokenBalance").textContent;
    
    if (statusElement) {
        if (availableText !== "-" && availableText !== "Clique em verificar" && !isNaN(parseFloat(availableText))) {
            const available = parseFloat(availableText);
            
            if (parseFloat(requestedAmount) <= available) {
                statusElement.textContent = "✅ Disponível";
                statusElement.className = "fw-bold text-success";
            } else {
                statusElement.textContent = "❌ Indisponível";
                statusElement.className = "fw-bold text-danger";
            }
        } else {
            statusElement.textContent = "⏳ Verificar contrato";
            statusElement.className = "fw-bold text-warning";
        }
    }
}

// ==================== FUNÇÕES DE COMPRA ====================

/**
 * Executa a compra de tokens
 * REUTILIZA provider e signer do MetaMaskConnector
 */
async function buyTokens() {
    FeedbackSystem.clearPurchaseMessages();
    
    const amountInput = document.getElementById("tokenAmount").value;
    
    // Validações básicas
    if (!amountInput || amountInput <= 0) {
        FeedbackSystem.addPurchaseMessage("Informe a quantidade de tokens.", 'error');
        return;
    }
    
    if (!currentSigner) {
        FeedbackSystem.addPurchaseMessage("Carteira não conectada.", 'error');
        return;
    }
    
    // Verificar disponibilidade
    const availableText = document.getElementById("tokenBalance").textContent;
    if (availableText !== "-" && availableText !== "Clique em verificar" && !isNaN(parseFloat(availableText))) {
        const available = parseFloat(availableText);
        if (parseFloat(amountInput) > available) {
            FeedbackSystem.addPurchaseMessage(`❌ Tokens insuficientes! Disponível: ${available.toLocaleString()}, Solicitado: ${amountInput}`, 'error');
            return;
        }
    }
    
    try {
        // Calcular valor em BNB
        const tokenPriceWei = ethers.utils.parseEther(CONFIG.tokenPrice);
        const amountWei = tokenPriceWei.mul(ethers.BigNumber.from(amountInput));
        
        FeedbackSystem.addPurchaseMessage(`💰 Valor calculado: ${ethers.utils.formatEther(amountWei)} BNB para ${amountInput} tokens`);
        FeedbackSystem.addPurchaseMessage("📤 Preparando transação...");
        
        // Executar transação
        const tx = await currentSigner.sendTransaction({
            to: CONFIG.contractAddress,
            value: amountWei,
            gasLimit: CONFIG.gasLimit
        });
        
        FeedbackSystem.addPurchaseMessage("⏳ Transação enviada, aguardando confirmação...");
        updateTransactionStatus("Transação enviada. Aguarde confirmação...");
        
        // Aguardar confirmação
        const receipt = await tx.wait();
        
        // Atualizar detalhes da transação
        updateTransactionDetails(tx, receipt, amountWei, amountInput);
        
        FeedbackSystem.addPurchaseMessage(`✅ Transação confirmada no bloco ${receipt.blockNumber}`);
        FeedbackSystem.addPurchaseMessage(`🎉 Você comprou ${amountInput} tokens!`);
        
        updateTransactionStatus(`✅ Compra concluída! Hash: ${tx.hash}`);
        
        // Atualizar informações do contrato após a transação
        setTimeout(() => {
            FeedbackSystem.addPurchaseMessage("🔄 Atualizando informações do contrato...");
            checkContract();
        }, 3000);
        
    } catch (err) {
        FeedbackSystem.addPurchaseMessage(`❌ Erro na transação: ${err.message}`, 'error');
        
        if (err.reason) {
            FeedbackSystem.addPurchaseMessage(`Motivo: ${err.reason}`);
        }
        if (err.code) {
            FeedbackSystem.addPurchaseMessage(`Código do erro: ${err.code}`);
        }
        
        // Dicas específicas para erros comuns
        if (err.message.includes("insufficient funds")) {
            FeedbackSystem.addPurchaseMessage("💡 Dica: Você não tem BNB suficiente para a transação + taxas de gas.");
        } else if (err.message.includes("execution reverted")) {
            FeedbackSystem.addPurchaseMessage("💡 Dica: O contrato rejeitou a transação. Verifique se há tokens disponíveis.");
        }
    }
}

/**
 * Atualiza status da transação
 */
function updateTransactionStatus(message) {
    const statusEl = document.getElementById("status");
    if (statusEl) {
        statusEl.innerText = message;
    }
}

/**
 * Atualiza detalhes da transação na interface
 */
function updateTransactionDetails(tx, receipt, amountWei, tokenAmount) {
    const elements = {
        txHash: document.getElementById("txHash"),
        txValue: document.getElementById("txValue"),
        txGasPrice: document.getElementById("txGasPrice"),
        txTotalCost: document.getElementById("txTotalCost"),
        txTokensReceived: document.getElementById("txTokensReceived"),
        transactionDetails: document.getElementById("transactionDetails")
    };
    
    if (elements.txHash) elements.txHash.textContent = tx.hash;
    if (elements.txValue) elements.txValue.textContent = ethers.utils.formatEther(amountWei);
    if (elements.txTokensReceived) elements.txTokensReceived.textContent = tokenAmount + " TKN";
    
    // Calcular taxa de gas
    if (receipt.gasUsed && receipt.effectiveGasPrice) {
        const gasFee = receipt.gasUsed.mul(receipt.effectiveGasPrice);
        if (elements.txGasPrice) elements.txGasPrice.textContent = ethers.utils.formatEther(gasFee);
        
        // Calcular total aproximado
        const totalApprox = amountWei.add(gasFee);
        if (elements.txTotalCost) elements.txTotalCost.textContent = ethers.utils.formatEther(totalApprox);
    }
    
    // Mostrar seção de detalhes
    if (elements.transactionDetails) {
        elements.transactionDetails.style.display = "block";
    }
}

// ==================== INICIALIZAÇÃO ====================

/**
 * Inicializa o módulo quando o DOM estiver carregado
 * INTEGRA com o sistema existente do projeto
 */
document.addEventListener('DOMContentLoaded', function() {
    // Aguardar carregamento de dependências globais
    setTimeout(() => {
        // Atualizar display de preço
        const priceEl = document.getElementById("tokenPriceDisplay");
        if (priceEl) {
            priceEl.textContent = CONFIG.tokenPrice + " BNB";
        }
        
        // Configurar event listeners
        setupEventListeners();
        
        // Log de inicialização usando sistema do projeto se disponível
        if (window.CommonUtils && window.CommonUtils.log) {
            window.CommonUtils.log("Módulo de Compra de Tokens inicializado", 'info', 'COMPRA-TOKEN');
        } else {
            console.log("🛒 Módulo de Compra de Tokens inicializado");
        }
    }, 500); // Pequeno delay para garantir carregamento das dependências
});

/**
 * Configura event listeners para os botões
 */
function setupEventListeners() {
    // Botão de verificar contrato
    const checkContractBtn = document.getElementById("checkContract");
    if (checkContractBtn) {
        checkContractBtn.addEventListener("click", checkContract);
    }
    
    // Botão de testar conexão
    const testConnectionBtn = document.getElementById("testConnection");
    if (testConnectionBtn) {
        testConnectionBtn.addEventListener("click", connectWallet);
    }
    
    // Botão de comprar
    const buyBtn = document.getElementById("buyButton");
    if (buyBtn) {
        buyBtn.addEventListener("click", async () => {
            try {
                if (!isConnected) {
                    const connected = await connectWallet();
                    if (!connected) return;
                }
                await buyTokens();
            } catch (err) {
                FeedbackSystem.addPurchaseMessage(`Erro inesperado: ${err.message}`, 'error');
            }
        });
    }
    
    // Input de quantidade - cálculo em tempo real
    const tokenAmountInput = document.getElementById("tokenAmount");
    if (tokenAmountInput) {
        tokenAmountInput.addEventListener("input", calculateTotal);
    }
}

// ==================== EXPORTS ====================

// Tornar funções disponíveis globalmente para compatibilidade
window.TokenPurchase = {
    connectWallet,
    checkContract,
    buyTokens,
    calculateTotal,
    FeedbackSystem
};
