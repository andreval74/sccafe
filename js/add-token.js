import { processarArquivoSol, atualizarInfosContrato, limparArquivoSol } from './shared/sol-processor.js';
import { detectContract } from './shared/contract-detector.js';
import { getNetworkName, getExplorerUrl } from './shared/token-global.js';
import { setupWalletConnection, getCurrentProvider } from './shared/wallet-connection.js';

// Inicializa conexão da carteira quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', setupWalletConnection);

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
        const connection = await connectMetaMask();
        currentProvider = connection.provider;
        
        console.log('✅ MetaMask conectado:', connection.address);
        
        // Atualiza UI
        const walletStatus = document.getElementById('wallet-status');
        const connectBtn = document.getElementById('connect-metamask-btn');
        const networkSpan = document.getElementById('current-network');
        
        if (walletStatus) {
            walletStatus.value = connection.address;
            walletStatus.style.backgroundColor = '#e8f5e9';  // Verde claro
            walletStatus.style.color = '#2e7d32';  // Verde escuro
            walletStatus.style.fontWeight = 'bold';
        }
        
        if (connectBtn) {
            connectBtn.innerHTML = '<i class="bi bi-check-circle"></i> CONECTADO';
            connectBtn.className = 'btn btn-success';
            connectBtn.disabled = true;
        }
        
        if (networkSpan) {
            networkSpan.textContent = connection.networkName;
            networkSpan.className = 'fw-bold text-success';
        }
        
        return connection.address;
        
    } catch (error) {
        console.error('❌ Erro ao conectar MetaMask:', error);
        alert('❌ Erro ao conectar com MetaMask: ' + error.message);
    }
};

/**
 * Mostra dados do contrato na interface
 */
async function mostrarDadosContrato(data, origem = 'detectado') {
    console.log('🎯 Mostrando dados do contrato:', data);
    
    const tokenInfoSection = document.getElementById('token-info-section');
    const detectionSection = document.getElementById('detection-section');
    const sectionTitle = document.getElementById('section-title');
    const uploadSection = document.getElementById('upload-section');
    const detectionStatus = document.getElementById('detection-status');
    
    // Atualiza status de detecção/verificação
    if (detectionStatus) {
        const statusClass = data.verified ? 'success' : 'warning';
        const statusIcon = data.verified ? 'check-circle-fill' : 'exclamation-triangle-fill';
        const statusText = data.verified ? 'Contrato Verificado' : 'Contrato Não Verificado';
        
        detectionStatus.innerHTML = `
            <div class="alert alert-${statusClass} mb-3">
                <div class="d-flex justify-content-between align-items-center">
                    <div>
                        <i class="bi bi-${statusIcon} me-2"></i>
                        <strong>${statusText}</strong>
                    </div>
                    ${data.verified ? `
                        <a href="${data.explorerUrl}" target="_blank" class="btn btn-light btn-sm">
                            <i class="bi bi-box-arrow-up-right"></i> Ver no Explorer
                        </a>
                    ` : ''}
                </div>
            </div>
            ${!data.verified ? `
                <!-- Upload do Código Fonte -->
                <div class="card border-warning">
                    <div class="card-body">
                        <div class="mb-3">
                            <i class="bi bi-info-circle me-2"></i>
                            Este contrato ainda não foi verificado. Por favor, faça upload do arquivo fonte (.sol) para verificação.
                        </div>
                        <div class="input-group">
                            <input type="file" class="form-control" id="solFileInput" accept=".sol" 
                                   onchange="window.processarArquivoSol(this)">
                            <button class="btn btn-outline-secondary" type="button" onclick="window.limparArquivoSol()">
                                <i class="bi bi-x"></i>
                            </button>
                        </div>
                    </div>
                </div>
            ` : ''}
            
            <!-- Dados do Contrato (aparecem após upload do arquivo) -->
            <div id="contract-details" style="display: none;" class="mt-3">
                <div class="card">
                    <div class="card-header bg-light d-flex justify-content-between align-items-center">
                        <h6 class="mb-0" id="contract-name">Informações do Contrato</h6>
                        <div>
                            <button class="btn btn-success btn-sm me-2" onclick="window.iniciarVerificacaoAutomatica()">
                                <i class="bi bi-robot"></i> Verificação Automática
                            </button>
                            <button class="btn btn-primary btn-sm" onclick="window.iniciarVerificacaoManual()">
                                <i class="bi bi-shield-check"></i> Verificação Manual
                            </button>
                        </div>
                    </div>
                    <div class="card-body">
                        <div class="row g-3 mb-3">
                            <div class="col-md-6">
                                <label class="form-label fw-bold">Versão do Compilador</label>
                                <div id="compiler-version-display" class="form-control-plaintext">-</div>
                            </div>
                            <div class="col-md-6">
                                <label class="form-label fw-bold">Otimização</label>
                                <div id="optimization-display" class="form-control-plaintext">-</div>
                            </div>
                            <div class="col-md-6">
                                <label class="form-label fw-bold">Licença</label>
                                <div id="license-display" class="form-control-plaintext">-</div>
                            </div>
                            <div class="col-md-6">
                                <label class="form-label fw-bold">Bibliotecas</label>
                                <div id="libraries-display" class="form-control-plaintext">-</div>
                            </div>
                        </div>
                        
                        <!-- Código Fonte -->
                        <div class="card bg-light">
                            <div class="card-header d-flex justify-content-between align-items-center">
                                <span>Código Fonte</span>
                                <button class="btn btn-sm btn-outline-secondary" onclick="window.copiarCodigoFonte()">
                                    <i class="bi bi-clipboard"></i> Copiar
                                </button>
                            </div>
                            <div class="card-body p-0">
                                <pre id="codigo-fonte" class="m-0 p-3" style="max-height: 300px; overflow-y: auto;"></pre>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    
    // Tenta obter informações do contrato verificado se aplicável
    if (data.verified) {
        try {
            const explorerData = await fetchContractFromExplorer(data.address, data.chainId);
            Object.assign(data, explorerData);
        } catch (error) {
            console.error('❌ Erro ao buscar dados do explorer:', error);
        }
    }
    
    // Mostra/esconde seção de upload baseado no status de verificação
    if (uploadSection) {
        uploadSection.style.display = data.verified ? 'none' : 'block';
    }
    
    // Atualiza botões de ação
    const addToMetaMaskBtn = document.getElementById('add-to-metamask-btn');
    const verifyAutomaticBtn = document.getElementById('verify-automatic-btn');
    const verifyManualBtn = document.getElementById('verify-manual-btn');
    
    if (addToMetaMaskBtn) addToMetaMaskBtn.disabled = false;
    if (verifyAutomaticBtn) verifyAutomaticBtn.disabled = data.verified;
    if (verifyManualBtn) verifyManualBtn.disabled = data.verified;
    
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
    
    if (!currentProvider) {
        alert('❌ Por favor, conecte-se ao MetaMask primeiro');
        return;
    }
    
    try {
        detectionStatus.innerHTML = `
            <div class="card border-info mb-3">
                <div class="card-body">
                    <div class="d-flex align-items-center">
                        <div class="spinner-border text-info me-2" role="status"></div>
                        <h5 class="mb-0">Detectando contrato na rede atual...</h5>
                    </div>
                </div>
            </div>
        `;
        
        // Busca dados do token na rede atual
        const tokenData = await fetchTokenData(address, currentProvider);
        
        if (tokenData) {
            // Adiciona informações da rede
            const chainId = window.ethereum.chainId;
            const contractData = {
                ...tokenData,
                network: getNetworkName(chainId),
                chainId,
                verified: false, // Por padrão, consideramos não verificado
                address // Garante que temos o endereço correto
            };
            
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
function initialize() {
    console.log('🚀 add-token.js carregado');
    
    // Verifica endereço na URL
    verificarEnderecoNaURL();
    
    // Configura botão de conexão MetaMask
    const connectBtn = document.getElementById('connect-metamask-btn');
    if (connectBtn) {
        connectBtn.addEventListener('click', window.connectToMetaMask);
    } else {
        console.error('❌ Botão de conexão MetaMask não encontrado');
    }
    
    // Configura validação visual do input (sem auto-detecção)
    const addressInput = document.getElementById('contract-address');
}

// Inicialização do aplicativo
function initializeApp() {
    console.log('🚀 add-token.js carregado');
    
    // Verifica endereço na URL
    verificarEnderecoNaURL();
    
    // Configura botão de conexão MetaMask
    const connectBtn = document.getElementById('connect-metamask-btn');
    if (connectBtn) {
        console.log('✅ Configurando botão de conexão MetaMask');
        connectBtn.addEventListener('click', window.connectToMetaMask);
    } else {
        console.error('❌ Botão de conexão MetaMask não encontrado');
    }
    
    // Configura validação visual do input
    const addressInput = document.getElementById('contract-address');
    if (addressInput) {
        addressInput.addEventListener('input', function() {
            const address = this.value.trim();
            if (address.match(/^0x[a-fA-F0-9]{40}$/)) {
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
}

// Expõe funções globalmente
window.processarArquivoSol = async function(input) {
    await processarArquivoSol(input);
};

window.limparArquivoSol = function() {
    limparArquivoSol();
};

window.iniciarVerificacaoAutomatica = async function() {
    if (!window.currentSolInfo) {
        alert('❌ Por favor, carregue o arquivo .sol primeiro');
        return;
    }
    
    try {
        // Implementar lógica de verificação automática
        alert('🚀 Iniciando verificação automática...');
        // TODO: Implementar verificação
    } catch (error) {
        console.error('❌ Erro na verificação automática:', error);
        alert('❌ Erro na verificação automática: ' + error.message);
    }
};

window.iniciarVerificacaoManual = async function() {
    if (!window.currentSolInfo) {
        alert('❌ Por favor, carregue o arquivo .sol primeiro');
        return;
    }
    
    try {
        // Implementar lógica de verificação manual
        alert('🔍 Iniciando verificação manual...');
        // TODO: Implementar verificação
    } catch (error) {
        console.error('❌ Erro na verificação manual:', error);
        alert('❌ Erro na verificação manual: ' + error.message);
    }
};

// Aguarda o carregamento completo do DOM
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    initializeApp();
}
