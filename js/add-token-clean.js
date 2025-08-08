// Importa API Manager
import { detectContract, submitContractVerification, checkVerificationStatus } from './api-manager.js';

/**
 * Adiciona token ao MetaMask
 */
window.addTokenToMetaMask = async function() {
    try {
        // Tenta obter dados do contrato atual
        const contractData = window.currentContractData;
        
        if (!contractData || !contractData.contractAddress) {
            // Fallback: busca dados dos elementos da página
            const address = document.getElementById('contract-address-display')?.value;
            const symbol = document.getElementById('token-symbol-display')?.textContent;
            const decimals = document.getElementById('token-decimals-display')?.textContent;
            
            if (!address) {
                alert('❌ Endereço do contrato não encontrado');
                return;
            }
            
            contractData = {
                contractAddress: address,
                symbol: symbol || 'TOKEN',
                decimals: parseInt(decimals) || 18
            };
        }
        
        if (!window.ethereum) {
            alert('❌ MetaMask não detectado. Instale a extensão do MetaMask primeiro.');
            return;
        }
        
        const tokenAddress = contractData.contractAddress;
        const tokenSymbol = contractData.symbol || 'TOKEN';
        const tokenDecimals = contractData.decimals || 18;
        
        await window.ethereum.request({
            method: 'wallet_watchAsset',
            params: {
                type: 'ERC20',
                options: {
                    address: tokenAddress,
                    symbol: tokenSymbol,
                    decimals: tokenDecimals
                }
            }
        });
        
        console.log('✅ Token adicionado ao MetaMask com sucesso');
        
    } catch (error) {
        console.error('❌ Erro ao adicionar token ao MetaMask:', error);
        if (error.code === 4001) {
            alert('❌ Usuário rejeitou a adição do token');
        } else {
            alert('❌ Erro ao adicionar token ao MetaMask: ' + error.message);
        }
    }
};

/**
 * Scroll suave para seção de verificação
 */
window.scrollToVerification = function() {
    const verificationSection = document.getElementById('verification-status-section') || 
                               document.getElementById('sol-upload-section');
    
    if (verificationSection) {
        verificationSection.scrollIntoView({ 
            behavior: 'smooth',
            block: 'start'
        });
    }
};

/**
 * Copia texto para clipboard
 */
window.copyToClipboard = function(elementId) {
    const element = document.getElementById(elementId);
    if (!element) {
        console.error('Elemento não encontrado:', elementId);
        return;
    }
    
    const text = element.value || element.textContent;
    
    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text).then(() => {
            showCopyFeedback(element, true);
        }).catch(err => {
            console.error('Erro ao copiar:', err);
            fallbackCopyTextToClipboard(text, element);
        });
    } else {
        fallbackCopyTextToClipboard(text, element);
    }
};

/**
 * Fallback para cópia de texto
 */
function fallbackCopyTextToClipboard(text, element) {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.top = "0";
    textArea.style.left = "0";
    textArea.style.position = "fixed";
    
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    try {
        const successful = document.execCommand('copy');
        showCopyFeedback(element, successful);
    } catch (err) {
        console.error('Fallback: erro ao copiar', err);
        showCopyFeedback(element, false);
    }
    
    document.body.removeChild(textArea);
}

/**
 * Mostra feedback visual da cópia
 */
function showCopyFeedback(element, success) {
    const button = element.nextElementSibling;
    if (button && button.tagName === 'BUTTON') {
        const originalHTML = button.innerHTML;
        
        if (success) {
            button.innerHTML = '<i class="bi bi-check text-success"></i>';
            button.classList.add('btn-success');
            button.classList.remove('btn-outline-primary', 'btn-outline-secondary');
        } else {
            button.innerHTML = '<i class="bi bi-x text-danger"></i>';
            button.classList.add('btn-danger');
        }
        
        setTimeout(() => {
            button.innerHTML = originalHTML;
            button.classList.remove('btn-success', 'btn-danger');
            button.classList.add('btn-outline-primary');
        }, 2000);
    }
}

/**
 * Formata números grandes
 */
function formatarNumero(valor) {
    if (!valor) return '0';
    
    const numero = parseFloat(valor);
    if (isNaN(numero)) return valor;
    
    if (numero >= 1e9) {
        return (numero / 1e9).toFixed(2) + 'B';
    } else if (numero >= 1e6) {
        return (numero / 1e6).toFixed(2) + 'M';
    } else if (numero >= 1e3) {
        return (numero / 1e3).toFixed(2) + 'K';
    }
    
    return numero.toLocaleString();
}

/**
 * Verifica se há endereço na URL
 */
function verificarEnderecoNaURL() {
    const urlParams = new URLSearchParams(window.location.search);
    const contractAddress = urlParams.get('address') || urlParams.get('contract');
    
    if (contractAddress && contractAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
        console.log('🔗 Endereço detectado na URL:', contractAddress);
        
        // Preenche o campo de endereço
        const addressInput = document.getElementById('contractAddress');
        if (addressInput) {
            addressInput.value = contractAddress;
            
            // Detecta automaticamente após um pequeno delay
            setTimeout(() => {
                detectarContrato();
            }, 1000);
        }
        
        return contractAddress;
    }
    
    return null;
}

/**
 * Inicializa conexão MetaMask
 */
function inicializarConexaoMetaMask() {
    const connectBtn = document.getElementById('connect-metamask-btn');
    const walletStatus = document.getElementById('wallet-status');
    const currentNetwork = document.getElementById('current-network');
    
    if (!connectBtn) return;
    
    // Verifica se MetaMask está instalado
    if (!window.ethereum) {
        walletStatus.value = '❌ MetaMask não detectado';
        connectBtn.textContent = 'INSTALAR METAMASK';
        connectBtn.onclick = () => window.open('https://metamask.io/', '_blank');
        return;
    }
    
    // Evento de conexão
    connectBtn.onclick = async () => {
        try {
            connectBtn.disabled = true;
            connectBtn.textContent = 'CONECTANDO...';
            
            const accounts = await window.ethereum.request({
                method: 'eth_requestAccounts'
            });
            
            if (accounts.length > 0) {
                const account = accounts[0];
                walletStatus.value = `${account.slice(0, 6)}...${account.slice(-4)}`;
                connectBtn.textContent = 'CONECTADO';
                connectBtn.classList.add('connected');
                
                // Atualiza rede
                const chainId = await window.ethereum.request({ method: 'eth_chainId' });
                const networkName = getNetworkName(chainId);
                if (currentNetwork) {
                    currentNetwork.textContent = networkName;
                }
                
                console.log('✅ MetaMask conectado:', account);
            }
            
        } catch (error) {
            console.error('❌ Erro ao conectar MetaMask:', error);
            walletStatus.value = '❌ Erro na conexão';
            connectBtn.textContent = 'CONECTAR';
        } finally {
            connectBtn.disabled = false;
        }
    };
    
    // Verifica conexão existente
    verificarConexaoExistente();
}

/**
 * Verifica conexão existente do MetaMask
 */
async function verificarConexaoExistente() {
    if (!window.ethereum) return;
    
    try {
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        const walletStatus = document.getElementById('wallet-status');
        const connectBtn = document.getElementById('connect-metamask-btn');
        const currentNetwork = document.getElementById('current-network');
        
        if (accounts.length > 0) {
            const account = accounts[0];
            if (walletStatus) {
                walletStatus.value = `${account.slice(0, 6)}...${account.slice(-4)}`;
            }
            if (connectBtn) {
                connectBtn.textContent = 'CONECTADO';
                connectBtn.classList.add('connected');
            }
            
            // Atualiza rede
            const chainId = await window.ethereum.request({ method: 'eth_chainId' });
            const networkName = getNetworkName(chainId);
            if (currentNetwork) {
                currentNetwork.textContent = networkName;
            }
        }
    } catch (error) {
        console.error('❌ Erro ao verificar conexão:', error);
    }
}

/**
 * Retorna nome da rede baseado no chainId
 */
function getNetworkName(chainId) {
    const networks = {
        '0x1': 'Ethereum Mainnet',
        '0x38': 'BNB Smart Chain',
        '0x61': 'BNB Testnet',
        '0x89': 'Polygon',
        '0xa86a': 'Avalanche'
    };
    
    return networks[chainId] || `Rede ${chainId}`;
}

/**
 * Mostra os dados do contrato detectado na seção unificada
 */
function mostrarDadosContrato(data, origem = 'detectado') {
    console.log('🎯 Mostrando dados do contrato:', data);
    
    const tokenInfoSection = document.getElementById('token-info-section');
    const detectionSection = document.getElementById('detection-section');
    const sectionTitle = document.getElementById('section-title');
    
    if (!tokenInfoSection) {
        console.error('❌ Seção token-info-section não encontrada');
        return;
    }
    
    // Salva dados do contrato para usar nas verificações
    window.currentContractData = {
        contractAddress: data.address,
        ...data
    };
    
    // Ajusta o título baseado na origem
    if (sectionTitle) {
        if (origem === 'criado') {
            sectionTitle.innerHTML = '<i class="bi bi-check-circle-fill me-2"></i>Token Criado com Sucesso!';
            tokenInfoSection.querySelector('.card-header').style.background = 'linear-gradient(135deg, #28a745, #20c997)';
        } else {
            sectionTitle.innerHTML = '<i class="bi bi-search me-2"></i>Token Detectado!';
            tokenInfoSection.querySelector('.card-header').style.background = 'linear-gradient(135deg, #007bff, #0056b3)';
        }
    }
    
    // Preenche os dados básicos
    const elementos = {
        'token-name-display': data.name || 'Nome não encontrado',
        'token-symbol-display': data.symbol || 'Símbolo não encontrado',
        'token-decimals-display': data.decimals || '18',
        'token-supply-display': data.totalSupply ? formatarNumero(data.totalSupply) : 'Supply não encontrado',
        'contract-address-display': data.address || '',
        'owner-address-display': data.owner || 'Não identificado',
        'network-display': data.network || getCurrentNetwork()
    };
    
    // Atualiza elementos DOM
    Object.entries(elementos).forEach(([id, valor]) => {
        const elemento = document.getElementById(id);
        if (elemento) {
            if (elemento.tagName === 'INPUT') {
                elemento.value = valor;
            } else {
                elemento.textContent = valor;
            }
        }
    });
    
    // Atualiza status da verificação
    const contractStatus = document.getElementById('contract-status');
    const explorerLink = document.getElementById('explorer-link');
    
    if (contractStatus) {
        if (data.verified) {
            contractStatus.innerHTML = '✅ Verificado';
            contractStatus.className = 'badge bg-success text-white fs-6';
        } else {
            contractStatus.innerHTML = '⚠️ Não Verificado';
            contractStatus.className = 'badge bg-warning text-dark fs-6';
        }
    }
    
    // Configura link do explorer
    if (explorerLink && data.address) {
        const chainId = window.ethereum?.chainId || '0x1';
        const explorerUrls = {
            '0x1': 'https://etherscan.io',
            '0x38': 'https://bscscan.com',
            '0x61': 'https://testnet.bscscan.com'
        };
        
        const baseUrl = explorerUrls[chainId] || 'https://etherscan.io';
        explorerLink.href = `${baseUrl}/address/${data.address}`;
        explorerLink.innerHTML = '<i class="bi bi-box-arrow-up-right"></i>';
    }
    
    // Mostra/esconde seções
    tokenInfoSection.style.display = 'block';
    if (detectionSection && origem === 'criado') {
        detectionSection.style.display = 'none';
    }
    
    // Configura upload de arquivo para contratos não verificados
    const solUploadSection = document.getElementById('sol-upload-section');
    if (solUploadSection && !data.verified) {
        solUploadSection.style.display = 'block';
    }
    
    console.log('✅ Dados do contrato exibidos com sucesso');
}

/**
 * Mostra erro na detecção do contrato
 */
function mostrarErroDeteccao(address) {
    const detectionStatus = document.getElementById('detection-status');
    
    if (detectionStatus) {
        detectionStatus.innerHTML = `
            <div class="alert alert-danger">
                <h6><i class="bi bi-exclamation-triangle-fill me-2"></i>Erro na Detecção</h6>
                <p class="mb-2">Não foi possível detectar o contrato <code>${address}</code>.</p>
                <p class="mb-2"><strong>Possíveis causas:</strong></p>
                <ul class="mb-2">
                    <li>Contrato não existe na rede atual</li>
                    <li>Endereço incorreto ou inválido</li>
                    <li>Problema de conectividade</li>
                    <li>Contrato não é um token ERC-20/BEP-20</li>
                </ul>
                <button class="btn btn-outline-danger btn-sm" onclick="detectarContrato()">
                    <i class="bi bi-arrow-clockwise me-1"></i>Tentar Novamente
                </button>
            </div>
        `;
    }
    
    console.error('❌ Erro na detecção do contrato:', address);
}

/**
 * Retorna o nome da rede atual
 */
function getCurrentNetwork() {
    const networkSpan = document.getElementById('current-network');
    return networkSpan ? networkSpan.textContent : 'BNB Smart Chain';
}

/**
 * Detecta contrato usando API Manager
 */
window.detectarContrato = async function() {
    const addressInput = document.getElementById('contractAddress');
    const detectionStatus = document.getElementById('detection-status');
    
    if (!addressInput || !detectionStatus) {
        console.error('❌ Elementos necessários não encontrados');
        return;
    }
    
    const address = addressInput.value.trim();
    
    if (!address) {
        alert('❌ Por favor, insira um endereço de contrato');
        return;
    }
    
    if (!address.match(/^0x[a-fA-F0-9]{40}$/)) {
        alert('❌ Endereço inválido. Use o formato 0x...');
        return;
    }
    
    try {
        detectionStatus.innerHTML = `
            <div class="alert alert-info">
                <i class="bi bi-hourglass-split"></i> Detectando contrato...
            </div>
        `;
        
        const contractData = await detectContract(address);
        
        if (contractData) {
            mostrarDadosContrato(contractData, 'detectado');
        } else {
            mostrarErroDeteccao(address);
        }
        
    } catch (error) {
        console.error('❌ Erro na detecção:', error);
        mostrarErroDeteccao(address);
    }
};

/**
 * Inicia verificação automática
 */
window.iniciarVerificacaoAutomatica = async function() {
    const contractData = window.currentContractData;
    
    if (!contractData || !contractData.contractAddress) {
        alert('❌ Dados do contrato não encontrados');
        return;
    }
    
    try {
        console.log('🤖 Iniciando verificação automática...');
        
        const result = await submitContractVerification(contractData.contractAddress, {
            sourceCode: contractData.sourceCode || '',
            contractName: contractData.name || 'Token',
            compilerVersion: 'v0.8.30+commit.5b4cc3d1',
            optimizationUsed: '0',
            runs: '200',
            evmVersion: 'paris'
        });
        
        if (result.success) {
            alert('✅ Verificação automática iniciada com sucesso!');
            // Monitora o status
            monitorarVerificacao(result.guid);
        } else {
            alert('❌ Erro na verificação automática: ' + result.message);
        }
        
    } catch (error) {
        console.error('❌ Erro na verificação automática:', error);
        alert('❌ Erro na verificação automática: ' + error.message);
    }
};

/**
 * Inicia verificação manual
 */
window.iniciarVerificacaoManual = function() {
    const solUploadSection = document.getElementById('sol-upload-section');
    
    if (solUploadSection) {
        solUploadSection.style.display = 'block';
        solUploadSection.scrollIntoView({ behavior: 'smooth' });
    }
    
    alert('📄 Carregue o arquivo .sol do contrato na seção abaixo para verificação manual.');
};

/**
 * Processa arquivo .sol
 */
window.processarArquivoSol = function(input) {
    const file = input.files[0];
    
    if (!file) return;
    
    if (!file.name.endsWith('.sol')) {
        alert('❌ Por favor, selecione um arquivo .sol');
        input.value = '';
        return;
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
        const content = e.target.result;
        
        // Mostra preview
        const filePreview = document.getElementById('file-preview');
        const fileName = document.getElementById('file-name');
        const sourceCodePreview = document.getElementById('source-code-preview');
        
        if (filePreview && fileName && sourceCodePreview) {
            fileName.textContent = file.name;
            sourceCodePreview.value = content;
            filePreview.style.display = 'block';
        }
        
        // Salva código fonte nos dados do contrato
        if (window.currentContractData) {
            window.currentContractData.sourceCode = content;
        }
        
        console.log('✅ Arquivo .sol carregado:', file.name);
    };
    
    reader.readAsText(file);
};

/**
 * Remove arquivo carregado
 */
window.removerArquivo = function() {
    const fileInput = document.getElementById('solFileInput');
    const filePreview = document.getElementById('file-preview');
    
    if (fileInput) {
        fileInput.value = '';
    }
    
    if (filePreview) {
        filePreview.style.display = 'none';
    }
    
    // Remove código fonte dos dados
    if (window.currentContractData) {
        delete window.currentContractData.sourceCode;
    }
    
    console.log('🗑️ Arquivo removido');
};

/**
 * Monitora status da verificação
 */
async function monitorarVerificacao(guid) {
    const maxTentativas = 20;
    let tentativas = 0;
    
    const verificarStatus = async () => {
        try {
            tentativas++;
            console.log(`🔄 Verificando status da verificação (${tentativas}/${maxTentativas})...`);
            
            const status = await checkVerificationStatus(guid);
            
            if (status.verified) {
                console.log('✅ Verificação concluída com sucesso!');
                alert('✅ Contrato verificado com sucesso!');
                return;
            }
            
            if (status.error) {
                console.error('❌ Erro na verificação:', status.error);
                alert('❌ Erro na verificação: ' + status.error);
                return;
            }
            
            if (tentativas < maxTentativas) {
                setTimeout(verificarStatus, 10000); // Verifica a cada 10 segundos
            } else {
                console.log('⏰ Tempo limite atingido para verificação');
                alert('⏰ Verificação ainda em processo. Verifique manualmente no explorer.');
            }
            
        } catch (error) {
            console.error('❌ Erro ao verificar status:', error);
            if (tentativas < maxTentativas) {
                setTimeout(verificarStatus, 10000);
            }
        }
    };
    
    // Inicia verificação após 5 segundos
    setTimeout(verificarStatus, 5000);
}

// Inicialização quando DOM carrega
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 add-token.js carregado');
    
    // Inicializa funções
    inicializarConexaoMetaMask();
    verificarEnderecoNaURL();
    
    // Auto-detecção de endereço no campo
    const addressInput = document.getElementById('contractAddress');
    if (addressInput) {
        addressInput.addEventListener('input', function() {
            const address = this.value.trim();
            if (address.match(/^0x[a-fA-F0-9]{40}$/)) {
                // Auto-detecta após 1 segundo de inatividade
                clearTimeout(this.detectTimer);
                this.detectTimer = setTimeout(() => {
                    detectarContrato();
                }, 1000);
            }
        });
    }
});
