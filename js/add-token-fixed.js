// Importa apenas a função disponível do API Manager
import { detectContract } from './api-manager.js';

/**
 * Adiciona token ao MetaMask
 */
window.addTokenToMetaMask = async function() {
    try {
        // Tenta obter dados do contrato atual
        const contractData = window.currentContractData;
        
        if (!contractData || !contractData.contractAddress) {
            alert('❌ Dados do contrato não disponíveis');
            return;
        }
        
        // Configura dados do token para o MetaMask
        const tokenData = {
            type: 'ERC20',
            options: {
                address: contractData.contractAddress,
                symbol: contractData.symbol || 'TKN',
                decimals: parseInt(contractData.decimals || '18'),
                image: contractData.logoUrl || ''
            }
        };
        
        // Adiciona o token ao MetaMask
        await window.ethereum.request({
            method: 'wallet_watchAsset',
            params: tokenData
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
 * Fallback para clipboard
 */
function fallbackCopyTextToClipboard(text, element) {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    textArea.style.left = "-999999px";
    textArea.style.top = "-999999px";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    try {
        document.execCommand('copy');
        showCopyFeedback(element, true);
    } catch (err) {
        console.error('Fallback: Oops, unable to copy', err);
        showCopyFeedback(element, false);
    }
    
    document.body.removeChild(textArea);
}

/**
 * Mostra feedback visual de cópia
 */
function showCopyFeedback(element, success) {
    const originalText = element.textContent || element.value;
    const originalClass = element.className;
    
    if (success) {
        if (element.tagName === 'BUTTON') {
            element.innerHTML = '<i class="bi bi-check"></i>';
            element.className = 'btn btn-success btn-sm';
        } else {
            element.title = 'Copiado!';
        }
        
        setTimeout(() => {
            if (element.tagName === 'BUTTON') {
                element.innerHTML = '<i class="bi bi-clipboard"></i>';
                element.className = originalClass;
            } else {
                element.title = '';
            }
        }, 1000);
    } else {
        if (element.tagName === 'BUTTON') {
            element.innerHTML = '<i class="bi bi-x"></i>';
            element.className = 'btn btn-danger btn-sm';
            
            setTimeout(() => {
                element.innerHTML = '<i class="bi bi-clipboard"></i>';
                element.className = originalClass;
            }, 1000);
        }
    }
}

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
 * Obtém rede atual
 */
function getCurrentNetwork() {
    if (!window.ethereum) return 'Não conectado';
    
    const chainId = window.ethereum.chainId;
    const networks = {
        '0x1': 'Ethereum',
        '0x38': 'BSC',
        '0x61': 'BSC Testnet'
    };
    
    return networks[chainId] || `Rede ${chainId}`;
}

/**
 * Verifica endereço na URL ao carregar a página
 */
function verificarEnderecoNaURL() {
    const urlParams = new URLSearchParams(window.location.search);
    const contractAddress = urlParams.get('address') || urlParams.get('contract');
    
    if (contractAddress && contractAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
        console.log('🔗 Endereço detectado na URL:', contractAddress);
        
        // Preenche o campo de endereço
        const addressInput = document.getElementById('contract-address');
        if (addressInput) {
            addressInput.value = contractAddress;
        }
        
        // Auto-detecta se parâmetro autodetect=true
        if (urlParams.get('autodetect') === 'true') {
            setTimeout(() => detectarContrato(), 1000);
        }
        
        return contractAddress;
    }
    
    return null;
}

/**
 * Conecta com MetaMask
 */
window.connectToMetaMask = async function() {
    try {
        if (!window.ethereum) {
            alert('❌ MetaMask não detectado! Por favor, instale a extensão.');
            return;
        }

        // Solicita conexão
        const accounts = await window.ethereum.request({
            method: 'eth_requestAccounts'
        });

        if (accounts.length > 0) {
            const walletAddress = accounts[0];
            console.log('✅ MetaMask conectado:', walletAddress);
            
            // Atualiza UI
            const walletStatus = document.getElementById('wallet-status');
            const connectBtn = document.getElementById('connect-metamask-btn');
            const networkSpan = document.getElementById('current-network');
            
            if (walletStatus) {
                walletStatus.value = `${walletAddress.substring(0, 6)}...${walletAddress.substring(38)}`;
            }
            
            if (connectBtn) {
                connectBtn.textContent = 'CONECTADO';
                connectBtn.className = 'btn btn-success btn-sm';
                connectBtn.disabled = true;
            }
            
            if (networkSpan) {
                networkSpan.textContent = getCurrentNetwork();
            }
            
            return walletAddress;
        }
        
    } catch (error) {
        console.error('❌ Erro ao conectar MetaMask:', error);
        alert('❌ Erro ao conectar com MetaMask: ' + error.message);
    }
};

/**
 * Mostra dados do contrato na interface
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
        'network-display': data.network || getCurrentNetwork(),
        'compiler-version-display': data.compiler || 'Não disponível',
        'optimization-display': data.optimization ? 'Habilitada' : 'Desabilitada',
        'abi-status-display': data.abi && data.abi !== '' ? 'Disponível' : 'Não disponível',
        'chain-id-display': data.chainId || 'Não identificado'
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
            contractStatus.className = 'badge bg-success text-white';
            contractStatus.style.fontSize = '0.75rem';
        } else {
            contractStatus.innerHTML = '❌ Não Verificado';
            contractStatus.className = 'badge bg-danger text-white';
            contractStatus.style.fontSize = '0.75rem';
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
    
    // Configura upload de arquivo para contratos não verificados
    const solUploadSection = document.getElementById('sol-upload-section');
    if (solUploadSection && !data.verified) {
        solUploadSection.style.display = 'block';
    }
    
    console.log('✅ Dados do contrato exibidos com sucesso');
}

/**
 * Mostra erro na detecção
 */
function mostrarErroDeteccao(address, errorMessage = null) {
    console.log('❌ Erro na detecção do contrato:', address);
    
    const detectionStatus = document.getElementById('detection-status');
    if (detectionStatus) {
        const message = errorMessage || 'Contrato não encontrado em nenhuma rede suportada';
        detectionStatus.innerHTML = `
            <div class="alert alert-danger">
                <div class="d-flex justify-content-between align-items-center">
                    <div>
                        <i class="bi bi-exclamation-triangle me-2"></i>
                        <strong>Erro na Detecção:</strong> ${message}
                    </div>
                    <button class="btn btn-outline-danger btn-sm" onclick="detectarContrato()">
                        <i class="bi bi-arrow-clockwise"></i> Tentar Novamente
                    </button>
                </div>
            </div>
        `;
    }
}

/**
 * Função principal para detectar contrato
 */
window.detectarContrato = async function() {
    const addressInput = document.getElementById('contract-address');
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
                <div class="d-flex align-items-center">
                    <div class="spinner-border spinner-border-sm me-2" role="status"></div>
                    <span>🔍 Detectando contrato em múltiplas redes...</span>
                </div>
            </div>
        `;
        
        // Importa e usa o detectContract
        const { detectContract } = await import('./api-manager.js');
        const contractData = await detectContract(address);
        
        if (contractData) {
            // Mostra sucesso temporário
            detectionStatus.innerHTML = `
                <div class="alert alert-success">
                    <i class="bi bi-check-circle me-2"></i>Contrato detectado com sucesso!
                </div>
            `;
            
            // Aguarda um momento e então mostra os dados
            setTimeout(() => {
                mostrarDadosContrato(contractData, 'detectado');
                
                // Scroll suave para a seção de dados
                document.getElementById('token-info-section')?.scrollIntoView({ 
                    behavior: 'smooth',
                    block: 'start'
                });
            }, 500);
        } else {
            mostrarErroDeteccao(address);
        }
        
    } catch (error) {
        console.error('❌ Erro na detecção:', error);
        mostrarErroDeteccao(address, error.message);
    }
};

/**
 * Inicia verificação automática
 */
window.iniciarVerificacaoAutomatica = async function() {
    const contractData = window.currentContractData;
    
    if (!contractData || !contractData.contractAddress) {
        alert('❌ Dados do contrato não disponíveis para verificação');
        return;
    }
    
    try {
        console.log('🤖 Verificação automática temporariamente desabilitada na versão simplificada');
        alert('⚠️ Verificação automática será implementada em uma próxima atualização');
        
    } catch (error) {
        console.error('❌ Erro na verificação automática:', error);
        alert('❌ Erro na verificação automática: ' + error.message);
    }
};

/**
 * Monitora status da verificação
 */
function monitorarVerificacao(guid) {
    console.log('🔄 Monitoramento temporariamente desabilitado na versão simplificada');
}

/**
 * Inicialização quando DOM carrega
 */
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 add-token.js carregado');
    
    // Verifica endereço na URL
    verificarEnderecoNaURL();
    
    // Configura botão de conexão MetaMask
    const connectBtn = document.getElementById('connect-metamask-btn');
    if (connectBtn) {
        connectBtn.addEventListener('click', connectToMetaMask);
    }
    
    // Configura validação visual do input (sem auto-detecção)
    const addressInput = document.getElementById('contract-address');
    if (addressInput) {
        addressInput.addEventListener('input', function() {
            const address = this.value.trim();
            if (address.match(/^0x[a-fA-F0-9]{40}$/)) {
                // Apenas valida visualmente, sem auto-detectar
                this.classList.add('is-valid');
                this.classList.remove('is-invalid');
            } else if (address.length > 0) {
                this.classList.add('is-invalid');
                this.classList.remove('is-valid');
            } else {
                this.classList.remove('is-valid', 'is-invalid');
            }
        });
    }
});
