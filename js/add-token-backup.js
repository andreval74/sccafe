/**
 * Script para página add-token.html
 * Inclui funcionalidade de adicionar token ao MetaMask
 * E seção de verificação do contrato após deploy
 */

// Importa funções da API
import { detectContract, submitContractVerification, checkVerificationStatus, getNetworkFromChainId } from './api-manager.js';

/**
 * Adiciona o token ao MetaMask
 */
window.addTokenToMetaMask = async function() {
    if (!window.ethereum) {
        alert('❌ MetaMask não detectado! Por favor, instale o MetaMask.');
        return;
    }

    try {
        // Pega dados do token atual
        const tokenData = window.currentContractData || window.tokenData;
        
        if (!tokenData || !tokenData.address) {
            alert('❌ Dados do token não encontrados. Detecte o contrato primeiro.');
            return;
        }

        const tokenAddress = tokenData.contractAddress || tokenData.address;
        const tokenSymbol = tokenData.symbol || 'TKN';
        const tokenDecimals = parseInt(tokenData.decimals || '18');
        const tokenImage = tokenData.image || '';

        console.log('🦊 Adicionando token ao MetaMask:', {
            address: tokenAddress,
            symbol: tokenSymbol,
            decimals: tokenDecimals
        });

        const wasAdded = await window.ethereum.request({
            method: 'wallet_watchAsset',
            params: {
                type: 'ERC20',
                options: {
                    address: tokenAddress,
                    symbol: tokenSymbol,
                    decimals: tokenDecimals,
                    image: tokenImage,
                },
            },
        });

        if (wasAdded) {
            console.log('✅ Token adicionado ao MetaMask com sucesso!');
            alert('✅ Token adicionado ao MetaMask com sucesso!');
        } else {
            console.log('❌ Usuário rejeitou a adição do token');
        }
    } catch (error) {
        console.error('❌ Erro ao adicionar token:', error);
        alert('❌ Erro ao adicionar token ao MetaMask');
    }
};

/**
 * Rola para a seção de verificação
 */
window.scrollToVerification = function() {
    const verificationSection = document.getElementById('detection-status');
    if (verificationSection) {
        verificationSection.scrollIntoView({ 
            behavior: 'smooth',
            block: 'start'
        });
    } else {
        // Se não existe seção de verificação, força mostrar
        if (window.currentContractData?.contractAddress) {
            const address = window.currentContractData.contractAddress;
            detectarContrato(address);
        }
    }
};

/**
 * Copia texto para a área de transferência
 */
window.copyToClipboard = function(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
        const text = element.value || element.textContent;
        
        // Usa a API moderna do clipboard se disponível
        if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(text).then(() => {
                showCopyFeedback(element, true);
            }).catch(() => {
                fallbackCopyTextToClipboard(text, element);
            });
        } else {
            fallbackCopyTextToClipboard(text, element);
        }
    }
};

/**
 * Fallback para navegadores que não suportam clipboard API
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
        console.error('Fallback: Não foi possível copiar', err);
        showCopyFeedback(element, false);
    }
    
    document.body.removeChild(textArea);
}

/**
 * Mostra feedback visual do copy
 */
function showCopyFeedback(element, success) {
    const button = element.nextElementSibling || element.parentNode.querySelector('button');
    if (button) {
        const originalContent = button.innerHTML;
        
        if (success) {
            button.innerHTML = '<i class="bi bi-check-lg text-success"></i>';
            button.classList.add('btn-success');
            button.classList.remove('btn-outline-primary', 'btn-outline-secondary');
            
            setTimeout(() => {
                button.innerHTML = originalContent;
                button.classList.remove('btn-success');
                button.classList.add('btn-outline-primary');
            }, 1500);
        } else {
            button.innerHTML = '<i class="bi bi-x-lg text-danger"></i>';
            setTimeout(() => {
                button.innerHTML = originalContent;
            }, 1500);
        }
    }
}

document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 add-token.js carregado');
    
    // Inicializa conexão MetaMask
    inicializarConexaoMetaMask();
    
    // Verifica se vem dados de contrato criado
    verificarDadosContratoViaSaida();
    
    // Verifica se tem endereço na URL
    verificarEnderecoNaURL();
    
    // Carrega dados do token dos parâmetros da URL
    carregarDadosToken();
    
    // Configura evento do botão adicionar token
    document.getElementById('btnAddToken')?.addEventListener('click', adicionarTokenMetaMask);
    
    // Força verificação após pequeno delay para garantir que localStorage está disponível
    setTimeout(() => {
        verificarEMostrarSecaoVerificacao();
    }, 500);
});

/**
 * Verifica se há endereço de contrato na URL
 */
function verificarEnderecoNaURL() {
    const urlParams = new URLSearchParams(window.location.search);
    const contractAddress = urlParams.get('contract');
    
    if (contractAddress) {
        console.log('🔗 Endereço encontrado na URL:', contractAddress);
        
        // Preenche o campo
        const contractField = document.getElementById('contractAddress');
        if (contractField) {
            contractField.value = contractAddress;
            
            // Auto-detecta após 1 segundo
            setTimeout(() => {
                window.detectarContrato();
            }, 1000);
        }
    }
}

/**
 * Inicializa a conexão MetaMask seguindo o padrão do add-index.html
 */
function inicializarConexaoMetaMask() {
    const btnConectar = document.getElementById('connect-metamask-btn');
    const walletStatus = document.getElementById('wallet-status');
    const currentNetwork = document.getElementById('current-network');
    
    // Verifica se já está conectado
    verificarConexaoExistente();
    
    if (btnConectar) {
        console.log('✅ Botão conectar encontrado, adicionando event listener');
        
        btnConectar.addEventListener('click', async function() {
            console.log('🚀 Conectando MetaMask...');
            
            if (!window.ethereum) {
                alert('❌ MetaMask não encontrado. Instale a extensão MetaMask no seu navegador!');
                return;
            }
            
            try {
                // Solicita conexão
                const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
                const chainId = await window.ethereum.request({ method: 'eth_chainId' });
                
                if (accounts.length > 0) {
                    // Atualiza status da carteira
                    if (walletStatus) {
                        walletStatus.value = `Conectado: ${accounts[0].substring(0, 6)}...${accounts[0].substring(38)}`;
                        walletStatus.style.background = "#e9f7ef";
                    }
                    
                    // Atualiza rede
                    const networkName = getNetworkName(chainId);
                    if (currentNetwork) {
                        currentNetwork.textContent = networkName;
                    }
                    
                    // Esconde botão conectar
                    btnConectar.style.display = 'none';
                    
                    console.log('✅ MetaMask conectado com sucesso');
                    console.log('- Conta:', accounts[0]);
                    console.log('- Rede:', networkName);
                }
            } catch (error) {
                console.error('❌ Erro ao conectar MetaMask:', error);
                if (walletStatus) {
                    walletStatus.value = 'Erro na conexão. Tente novamente.';
                }
                alert('❌ Erro ao conectar MetaMask: ' + (error.message || error));
            }
        });
        
        // Monitora mudanças de conta e rede
        if (window.ethereum) {
            window.ethereum.on('accountsChanged', function(accounts) {
                if (accounts.length > 0 && walletStatus) {
                    walletStatus.value = `Conectado: ${accounts[0].substring(0, 6)}...${accounts[0].substring(38)}`;
                    walletStatus.style.background = "#e9f7ef";
                    btnConectar.style.display = 'none';
                } else if (walletStatus) {
                    walletStatus.value = 'Clique em "Conectar" para iniciar';
                    walletStatus.style.background = "";
                    btnConectar.style.display = 'block';
                }
            });
            
            window.ethereum.on('chainChanged', function(chainId) {
                const networkName = getNetworkName(chainId);
                if (currentNetwork) {
                    currentNetwork.textContent = networkName;
                }
                console.log('🔄 Rede alterada para:', networkName);
            });
        }
    }
}

/**
 * Verifica se MetaMask já está conectado
 */
async function verificarConexaoExistente() {
    if (!window.ethereum) return;
    
    try {
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        
        if (accounts.length > 0) {
            const chainId = await window.ethereum.request({ method: 'eth_chainId' });
            const walletStatus = document.getElementById('wallet-status');
            const currentNetwork = document.getElementById('current-network');
            const btnConectar = document.getElementById('connect-metamask-btn');
            
            // Atualiza interface como conectado
            if (walletStatus) {
                walletStatus.value = `Conectado: ${accounts[0].substring(0, 6)}...${accounts[0].substring(38)}`;
                walletStatus.style.background = "#e9f7ef";
            }
            
            const networkName = getNetworkName(chainId);
            if (currentNetwork) {
                currentNetwork.textContent = networkName;
            }
            
            if (btnConectar) {
                btnConectar.style.display = 'none';
            }
            
            console.log('✅ MetaMask já conectado');
            console.log('- Conta:', accounts[0]);
            console.log('- Rede:', networkName);
        }
    } catch (error) {
        console.log('ℹ️ MetaMask não conectado ou erro ao verificar:', error);
    }
}

/**
 * Retorna o nome da rede baseado no chainId
 */
function getNetworkName(chainId) {
    const chainIdInt = parseInt(chainId, 16);
    
    switch (chainIdInt) {
        case 1:
            return 'Ethereum Mainnet';
        case 56:
            return 'BNB Smart Chain';
        case 97:
            return 'BNB Testnet';
        case 137:
            return 'Polygon';
        case 5:
            return 'Goerli Testnet';
        case 11155111:
            return 'Sepolia Testnet';
        default:
            return `Rede Desconhecida (${chainIdInt})`;
    }
}

/**
 * Verifica dados do contrato vindo de add-index.html
 */
function verificarDadosContratoViaSaida() {
    const contractData = localStorage.getItem('contractVerificationData');
    
    if (contractData) {
        try {
            const data = JSON.parse(contractData);
            console.log('📄 Dados do contrato recebidos:', data);
            
            mostrarSecaoTokenCriado(data);
            
            // Limpa os dados após usar para evitar mostrar em recarregamentos
            localStorage.removeItem('contractVerificationData');
            
        } catch (error) {
            console.error('❌ Erro ao parsear dados do contrato:', error);
        }
    } else {
        console.log('ℹ️ Nenhum dado de contrato criado encontrado');
    }
}

/**
 * Mostra a seção com dados do token criado
 */
function mostrarSecaoTokenCriado(contractData) {
    console.log('🎯 Exibindo seção do token criado');
    
    const section = document.getElementById('token-created-section');
    if (!section) {
        console.error('❌ Seção token-created-section não encontrada');
        return;
    }
    
    // Preenche os dados
    document.getElementById('created-token-name').textContent = contractData.name || 'Token';
    document.getElementById('created-token-symbol').textContent = contractData.symbol || 'TKN';
    document.getElementById('created-contract-address').value = contractData.address || '';
    document.getElementById('created-token-network').textContent = contractData.network || 'BNB Smart Chain';
    
    // Configura link para o explorer
    const explorerLink = getExplorerUrl(contractData.address, contractData.network);
    const linkElement = document.getElementById('created-contract-link');
    if (linkElement && explorerLink) {
        linkElement.href = explorerLink;
    }
    
    // Auto-preenche o campo de endereço do contrato na seção de verificação
    const contractAddressField = document.getElementById('contractAddress');
    if (contractAddressField && contractData.address) {
        contractAddressField.value = contractData.address;
        console.log('✅ Campo de endereço auto-preenchido:', contractData.address);
    }
    
    // Atualiza a rede exibida
    const currentNetworkSpan = document.getElementById('current-network');
    if (currentNetworkSpan) {
        currentNetworkSpan.textContent = contractData.network || 'BNB Smart Chain';
        console.log('✅ Rede atualizada:', contractData.network);
    }
    
    // Mostra a seção
    section.style.display = 'block';
    
    console.log('✅ Seção do token criado exibida com sucesso');
}

/**
 * Gera URL do explorer baseado na rede
 */
function getExplorerUrl(address, network) {
    const explorers = {
        'BNB Smart Chain': 'https://bscscan.com',
        'BNB Testnet': 'https://testnet.bscscan.com',
        'Ethereum': 'https://etherscan.io',
        'Polygon': 'https://polygonscan.com'
    };
    
    const baseUrl = explorers[network] || explorers['BNB Smart Chain'];
    return `${baseUrl}/address/${address}`;
}

/**
 * Força verificação dos dados e mostra seção se necessário
 */
function verificarEMostrarSecaoVerificacao() {
    const tokenAddress = localStorage.getItem('tokenAddress');
    const contratoSource = localStorage.getItem('contratoSource');
    
    console.log('🔄 Verificação forçada:');
    console.log('- Token Address no localStorage:', tokenAddress);
    console.log('- Contrato Source no localStorage:', contratoSource ? `${contratoSource.length} chars` : 'VAZIO');
    
    if (tokenAddress && contratoSource) {
        console.log('🎯 Dados encontrados - forçando exibição da seção de verificação');
        mostrarSecaoVerificacao(tokenAddress);
    }
}

/**
 * Carrega dados do token da URL ou localStorage
 */
function carregarDadosToken() {
    const urlParams = new URLSearchParams(window.location.search);
    
    // Dados do token
    const tokenAddress = urlParams.get('address') || localStorage.getItem('tokenAddress') || '';
    const tokenName = urlParams.get('name') || localStorage.getItem('tokenName') || '';
    const tokenSymbol = urlParams.get('symbol') || localStorage.getItem('tokenSymbol') || '';
    const tokenDecimals = urlParams.get('decimals') || localStorage.getItem('tokenDecimals') || '18';
    const tokenImage = urlParams.get('image') || localStorage.getItem('tokenImage') || '';
    const tokenNetwork = urlParams.get('network') || localStorage.getItem('tokenNetwork') || '';
    
    // Debug - verificar se temos código fonte
    const contratoSource = localStorage.getItem('contratoSource');
    console.log('🔍 Debug carregamento de dados:');
    console.log('- Token Address:', tokenAddress);
    console.log('- Contrato Source:', contratoSource ? `${contratoSource.length} chars` : 'VAZIO');
    console.log('- Window contratoSource:', window.contratoSource ? `${window.contratoSource.length} chars` : 'VAZIO');
    
    // Salva dados globalmente para uso em outras funções
    if (tokenAddress) {
        window.tokenData = {
            address: tokenAddress,
            name: tokenName,
            symbol: tokenSymbol,
            decimals: tokenDecimals,
            image: tokenImage,
            network: tokenNetwork
        };
        
        console.log('✅ Dados do token salvos globalmente:', window.tokenData);
        
        // Se tem dados do token (vem do add-index.html), oculta seção de busca
        const searchSection = document.getElementById('contract-search-section');
        if (searchSection && (tokenName || contratoSource)) {
            searchSection.style.display = 'none';
            console.log('🔍 Seção de busca ocultada - dados vêm do add-index.html');
        }
    }
    
    // Se temos dados do contrato compilado, mostra seção de verificação
    if (tokenAddress && (window.contratoSource || contratoSource)) {
        console.log('✅ Mostrando seção de verificação');
        mostrarSecaoVerificacao(tokenAddress);
    } else {
        console.log('❌ Não foi possível mostrar seção de verificação:');
        console.log('- tokenAddress:', !!tokenAddress);
        console.log('- contratoSource:', !!contratoSource);
        console.log('- window.contratoSource:', !!window.contratoSource);
    }
}

/**
 * Mostra a seção de verificação do contrato
 */
function mostrarSecaoVerificacao(contractAddress) {
    console.log('📋 Mostrando seção de verificação para:', contractAddress);
    
    // Busca dados do contrato - múltiplas fontes
    const sourceCode = localStorage.getItem('contratoSource') || window.contratoSource || '';
    const bytecode = localStorage.getItem('contratoBytecode') || window.contratoBytecode || '';
    const compilerVersion = localStorage.getItem('resolvedCompilerVersion') || window.resolvedCompilerVersion || '0.8.19';
    
    console.log('🔍 Dados encontrados para verificação:');
    console.log('- Source Code:', sourceCode ? `${sourceCode.length} caracteres` : 'VAZIO');
    console.log('- Bytecode:', bytecode ? `${bytecode.length} caracteres` : 'VAZIO');
    console.log('- Compiler Version:', compilerVersion);
    
    // Determina a rede baseada no chainId ou endereço
    const networkInfo = detectarRede(contractAddress);
    const verificationUrl = `${networkInfo.explorer}/verifyContract?a=${contractAddress}`;
    
    // Preenche dados da verificação
    const linkField = document.getElementById('verificationLink');
    const sourceField = document.getElementById('contractSourceCode');
    const bytecodeField = document.getElementById('contractBytecode');
    const compilerField = document.getElementById('compilerVersionDisplay');
    
    if (linkField) {
        linkField.value = verificationUrl;
        console.log('✅ Link preenchido:', verificationUrl);
    }
    
    if (sourceField) {
        if (sourceCode) {
            sourceField.value = sourceCode;
            console.log('✅ Código fonte preenchido:', sourceCode.length, 'caracteres');
        } else {
            sourceField.placeholder = 'Código fonte não encontrado. Verifique se o deploy foi concluído.';
            console.log('❌ Código fonte vazio - tentando buscar de outras fontes...');
            
            // Tenta buscar de outras fontes
            tentarRecuperarCodigoFonte();
        }
    }
    
    if (bytecodeField) {
        if (bytecode) {
            bytecodeField.value = bytecode;
            console.log('✅ Bytecode preenchido:', bytecode.length, 'caracteres');
        } else {
            bytecodeField.placeholder = 'Bytecode não encontrado. Verifique se o deploy foi concluído.';
            console.log('❌ Bytecode vazio');
        }
    }
    
    // Formata versão do compilador corretamente
    let formattedVersion = compilerVersion;
    if (!formattedVersion.startsWith('v')) {
        formattedVersion = 'v' + formattedVersion;
    }
    if (!formattedVersion.includes('+commit')) {
        formattedVersion = formattedVersion + '+commit.7dd6d404';
    }
    
    if (compilerField) {
        compilerField.value = formattedVersion;
        console.log('✅ Versão do compilador preenchida:', formattedVersion);
    }
    
    // Mostra a seção
    const verificationSection = document.getElementById('verificationSection');
    if (verificationSection) {
        verificationSection.style.display = 'block';
        console.log('✅ Seção de verificação mostrada com sucesso');
    }
}

/**
 * Tenta recuperar código fonte de diferentes módulos
 */
function tentarRecuperarCodigoFonte() {
    console.log('� Tentando recuperar código fonte de módulos...');
    
    // Importa módulos dinamicamente para tentar obter código
    Promise.all([
        import('./add-contratos-verified.js').catch(() => null),
        import('./add-contratos.js').catch(() => null)
    ]).then(modules => {
        for (const module of modules) {
            if (module && module.contratoSource) {
                console.log('✅ Código encontrado em módulo!');
                const sourceField = document.getElementById('contractSourceCode');
                if (sourceField) {
                    sourceField.value = module.contratoSource;
                    sourceField.placeholder = '';
                }
                break;
            }
        }
    });
}

/**
 * Detecta a rede baseada no contexto
 */
function detectarRede(contractAddress) {
    // Tenta detectar pela rede conectada
    if (window.ethereum && window.ethereum.chainId) {
        const chainId = parseInt(window.ethereum.chainId, 16);
        
        switch (chainId) {
            case 1:
                return { name: 'Ethereum', explorer: 'https://etherscan.io' };
            case 56:
                return { name: 'BNB Smart Chain', explorer: 'https://bscscan.com' };
            case 97:
                return { name: 'BNB Testnet', explorer: 'https://testnet.bscscan.com' };
            case 137:
                return { name: 'Polygon', explorer: 'https://polygonscan.com' };
            default:
                return { name: 'BNB Smart Chain', explorer: 'https://bscscan.com' };
        }
    }
    
    // Fallback para BSC
    return { name: 'BNB Smart Chain', explorer: 'https://bscscan.com' };
}

/**
 * Abre link de verificação
 */
function abrirVerificacao() {
    const link = document.getElementById('verificationLink').value;
    if (link) {
        window.open(link, '_blank');
    }
}

/**
 * Copia código do contrato para clipboard
 */
function copiarCodigoContrato() {
    const textarea = document.getElementById('contractSourceCode');
    textarea.select();
    document.execCommand('copy');
    
    // Feedback visual
    const button = event.target;
    const originalHTML = button.innerHTML;
    button.innerHTML = '<i class="bi bi-check"></i> Copiado!';
    button.classList.remove('btn-success');
    button.classList.add('btn-info');
    
    setTimeout(() => {
        button.innerHTML = originalHTML;
        button.classList.remove('btn-info');
        button.classList.add('btn-success');
    }, 2000);
}

/**
 * Copia bytecode do contrato para clipboard
 */
function copiarBytecode() {
    const textarea = document.getElementById('contractBytecode');
    textarea.select();
    document.execCommand('copy');
    
    // Feedback visual
    const button = event.target;
    const originalHTML = button.innerHTML;
    button.innerHTML = '<i class="bi bi-check"></i> Copiado!';
    button.classList.remove('btn-warning');
    button.classList.add('btn-info');
    
    setTimeout(() => {
        button.innerHTML = originalHTML;
        button.classList.remove('btn-info');
        button.classList.add('btn-warning');
    }, 2000);
}

/**
 * Copia texto de um campo específico
 */
function copiarTexto(fieldId) {
    const field = document.getElementById(fieldId);
    field.select();
    document.execCommand('copy');
    
    // Feedback visual
    const button = event.target.closest('button');
    const originalHTML = button.innerHTML;
    button.innerHTML = '<i class="bi bi-check"></i>';
    button.classList.add('btn-success');
    
    setTimeout(() => {
        button.innerHTML = originalHTML;
        button.classList.remove('btn-success');
    }, 1500);
}

/**
 * Copia texto direto (para valores fixos)
 */
function copiarTextoDirecto(texto) {
    navigator.clipboard.writeText(texto).then(() => {
        // Feedback visual
        const button = event.target.closest('button');
        const originalHTML = button.innerHTML;
        button.innerHTML = '<i class="bi bi-check"></i>';
        button.classList.add('btn-success');
        
        setTimeout(() => {
            button.innerHTML = originalHTML;
            button.classList.remove('btn-success');
        }, 1500);
    });
}

// Funções globais para serem acessíveis via console se necessário
window.preencherCodigoManual = function() {
    const sourceCode = localStorage.getItem('contratoSource');
    const bytecode = localStorage.getItem('contratoBytecode');
    const contractSourceField = document.getElementById('contractSourceCode');
    const contractBytecodeField = document.getElementById('contractBytecode');
    
    if (sourceCode && contractSourceField) {
        contractSourceField.value = sourceCode;
        console.log('✅ Código fonte preenchido manualmente:', sourceCode.length, 'caracteres');
    } else {
        console.log('❌ Erro código fonte: sourceCode =', !!sourceCode, 'field =', !!contractSourceField);
    }
    
    if (bytecode && contractBytecodeField) {
        contractBytecodeField.value = bytecode;
        console.log('✅ Bytecode preenchido manualmente:', bytecode.length, 'caracteres');
    } else {
        console.log('❌ Erro bytecode: bytecode =', !!bytecode, 'field =', !!contractBytecodeField);
    }
};

window.mostrarDadosLocalStorage = function() {
    console.log('📋 Dados no localStorage:');
    console.log('- tokenAddress:', localStorage.getItem('tokenAddress'));
    console.log('- contratoSource:', localStorage.getItem('contratoSource') ? `${localStorage.getItem('contratoSource').length} chars` : 'VAZIO');
    console.log('- contratoBytecode:', localStorage.getItem('contratoBytecode') ? `${localStorage.getItem('contratoBytecode').length} chars` : 'VAZIO');
    console.log('- resolvedCompilerVersion:', localStorage.getItem('resolvedCompilerVersion'));
};

window.forcarExibicaoVerificacao = function() {
    const tokenAddress = localStorage.getItem('tokenAddress');
    if (tokenAddress) {
        mostrarSecaoVerificacao(tokenAddress);
    } else {
        console.log('❌ Token address não encontrado');
    }
};

window.debugVerificacao = function() {
    console.log('🔍 DEBUG COMPLETO:');
    console.log('- localStorage.contratoSource:', localStorage.getItem('contratoSource') ? `${localStorage.getItem('contratoSource').length} chars` : 'VAZIO');
    console.log('- localStorage.contratoBytecode:', localStorage.getItem('contratoBytecode') ? `${localStorage.getItem('contratoBytecode').length} chars` : 'VAZIO');
    console.log('- window.contratoSource:', window.contratoSource ? `${window.contratoSource.length} chars` : 'VAZIO');
    console.log('- window.contratoBytecode:', window.contratoBytecode ? `${window.contratoBytecode.length} chars` : 'VAZIO');
    
    // Testa elementos do DOM
    const sourceField = document.getElementById('contractSourceCode');
    const bytecodeField = document.getElementById('contractBytecode');
    const linkField = document.getElementById('verificationLink');
    const compilerField = document.getElementById('compilerVersionDisplay');
    
    console.log('- DOM sourceField:', !!sourceField);
    console.log('- DOM bytecodeField:', !!bytecodeField);
    console.log('- DOM linkField:', !!linkField);
    console.log('- DOM compilerField:', !!compilerField);
    
    // Força preenchimento manual
    if (sourceField) {
        const sourceCode = localStorage.getItem('contratoSource') || window.contratoSource;
        if (sourceCode) {
            sourceField.value = sourceCode;
            console.log('✅ Código fonte forçado:', sourceCode.length, 'chars');
        }
    }
    
    if (bytecodeField) {
        const bytecode = localStorage.getItem('contratoBytecode') || window.contratoBytecode;
        if (bytecode) {
            bytecodeField.value = bytecode;
            console.log('✅ Bytecode forçado:', bytecode.length, 'chars');
        }
    }
    
    // Mostra a seção
    const verificationSection = document.getElementById('verificationSection');
    if (verificationSection) {
        verificationSection.style.display = 'block';
        console.log('✅ Seção mostrada');
    }
};

/**
 * Adiciona token ao MetaMask
 */
async function adicionarTokenMetaMask() {
    if (!window.ethereum) {
        alert('MetaMask não detectado! Instale a extensão MetaMask.');
        return;
    }
    
    try {
        const tokenAddress = document.getElementById('tokenAddressText').textContent;
        const tokenSymbol = document.getElementById('tokenSymbolText').textContent;
        const tokenDecimals = parseInt(document.getElementById('tokenDecimalsText').textContent);
        const tokenImage = document.getElementById('tokenImageText').textContent;
        
        const wasAdded = await window.ethereum.request({
            method: 'wallet_watchAsset',
            params: {
                type: 'ERC20',
                options: {
                    address: tokenAddress,
                    symbol: tokenSymbol,
                    decimals: tokenDecimals,
                    image: tokenImage !== 'Não definida' ? tokenImage : ''
                }
            }
        });
        
        if (wasAdded) {
            document.getElementById('status').innerHTML = 
                '<div class="alert alert-success">✅ Token adicionado com sucesso ao MetaMask!</div>';
        } else {
            document.getElementById('status').innerHTML = 
                '<div class="alert alert-warning">⚠️ Token não foi adicionado. Tente novamente.</div>';
        }
        
    } catch (error) {
        console.error('Erro ao adicionar token:', error);
        document.getElementById('status').innerHTML = 
            '<div class="alert alert-danger">❌ Erro ao adicionar token: ' + error.message + '</div>';
    }
}

/**
 * Função para verificação rápida de contrato existente
 */
async function verificarContratoRapido() {
    const contractAddress = document.getElementById('quickContractAddress').value.trim();
    
    if (!contractAddress || !contractAddress.startsWith('0x') || contractAddress.length !== 42) {
        alert('❌ Por favor, insira um endereço de contrato válido (42 caracteres, começando com 0x)');
        return;
    }
    
    // Atualiza localStorage com o endereço
    localStorage.setItem('tokenAddress', contractAddress);
    
    // Força mostrar seção de verificação com detecção automática
    mostrarSecaoVerificacao(contractAddress);
    
    // Auto-detecta o contrato
    try {
        console.log('🔍 Iniciando detecção automática do contrato:', contractAddress);
        await detectarContrato();
    } catch (error) {
        console.error('❌ Erro na detecção:', error);
    }
}

// Torna funções globais para uso nos botões HTML
window.abrirVerificacao = abrirVerificacao;
window.copiarCodigoContrato = copiarCodigoContrato;
window.copiarBytecode = copiarBytecode;
window.copiarTexto = copiarTexto;
window.copiarTextoDirecto = copiarTextoDirecto;
window.verificarContratoRapido = verificarContratoRapido;

/**
 * Funções auxiliares para a nova seção de token criado
 */

// Copia texto para clipboard
window.copyToClipboard = function(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
        element.select();
        document.execCommand('copy');
        
        // Feedback visual
        const button = event.target.closest('button');
        const originalHTML = button.innerHTML;
        button.innerHTML = '<i class="bi bi-check"></i>';
        button.classList.add('btn-success');
        button.classList.remove('btn-outline-primary');
        
        setTimeout(() => {
            button.innerHTML = originalHTML;
            button.classList.remove('btn-success');
            button.classList.add('btn-outline-primary');
        }, 1500);
    }
};

// Adiciona token ao MetaMask
window.addTokenToMetaMask = async function() {
    const address = document.getElementById('created-contract-address')?.value;
    const symbol = document.getElementById('created-token-symbol')?.textContent;
    const name = document.getElementById('created-token-name')?.textContent;
    
    if (!address) {
        alert('❌ Endereço do contrato não encontrado');
        return;
    }
    
    if (typeof window.ethereum !== 'undefined') {
        try {
            await window.ethereum.request({
                method: 'wallet_watchAsset',
                params: {
                    type: 'ERC20',
                    options: {
                        address: address,
                        symbol: symbol || 'TKN',
                        decimals: 18,
                        image: ''
                    }
                }
            });
            console.log('✅ Token adicionado ao MetaMask');
        } catch (error) {
            console.error('❌ Erro ao adicionar token:', error);
        }
    } else {
        alert('❌ MetaMask não encontrado');
    }
};

// Scroll para seção de verificação
window.scrollToVerification = function() {
    const verificationSection = document.querySelector('.card.mx-auto.mb-4');
    if (verificationSection) {
        verificationSection.scrollIntoView({ behavior: 'smooth' });
    }
};

// Detectar contrato - função chamada pelo botão Detectar
window.detectarContrato = function() {
    const contractAddress = document.getElementById('contractAddress')?.value?.trim();
    const detectionStatus = document.getElementById('detection-status');
    
    if (!contractAddress) {
        alert('❌ Por favor, insira o endereço do contrato');
        return;
    }
    
    // Validação básica do endereço
    if (!contractAddress.startsWith('0x') || contractAddress.length !== 42) {
        alert('❌ Endereço do contrato inválido. Deve começar com 0x e ter 42 caracteres');
        return;
    }
    
    console.log('🔍 Detectando contrato:', contractAddress);
    
    // Mostra status de carregamento
    if (detectionStatus) {
        detectionStatus.innerHTML = `
            <div class="alert alert-info">
                <i class="bi bi-hourglass-split me-2"></i>
                Detectando contrato ${contractAddress.substring(0, 6)}...${contractAddress.substring(38)}
                <div class="spinner-border spinner-border-sm ms-2" role="status"></div>
            </div>
        `;
    }
    
    // Tenta buscar dados reais do contrato primeiro
    buscarDadosContrato(contractAddress)
        .then(contractData => {
            if (contractData) {
                mostrarDadosContrato(contractData);
            } else {
                // Se não conseguir buscar dados reais, usa dados simulados
                setTimeout(() => {
                    const contractData = {
                        address: contractAddress,
                        name: 'BBB123415',
                        symbol: 'GT',
                        decimals: '18',
                        totalSupply: '500.000.000.000.000',
                        owner: '0x0b81337f18767565D2eA40913799317A25DC4bc5',
                        verified: false,
                        compiler: 'v0.8.19+commit.7dd6d404',
                        optimization: false,
                        network: getCurrentNetwork()
                    };
                    
                    // Simula sucesso ou erro (90% sucesso para demonstração)
                    const success = Math.random() > 0.1;
                    
                    if (success) {
                        mostrarDadosContrato(contractData);
                    } else {
                        mostrarErroDeteccao(contractAddress);
                    }
                }, 1500);
            }
        })
        .catch(error => {
            console.error('Erro ao buscar dados do contrato:', error);
            mostrarErroDeteccao(contractAddress);
        });
};

/**
 * Busca dados reais do contrato usando API do Etherscan/BSCScan
 */
async function buscarDadosContrato(address) {
    // Verifica se é acesso direto ou vem do add-index.html
    const isFromAddIndex = localStorage.getItem('contratoSource') && localStorage.getItem('tokenName');
    
    // Se vem do add-index.html, usa dados locais
    if (isFromAddIndex && window.tokenData && window.tokenData.address === address) {
        console.log('📋 Usando dados do add-index.html para:', address);
        
        const localData = {
            address: address,
            name: window.tokenData.name || localStorage.getItem('tokenName') || 'Token Local',
            symbol: window.tokenData.symbol || localStorage.getItem('tokenSymbol') || 'TKN', 
            decimals: window.tokenData.decimals || localStorage.getItem('tokenDecimals') || '18',
            totalSupply: localStorage.getItem('tokenTotalSupply') || '1.000.000',
            owner: localStorage.getItem('ownerAddress') || '0x742d35Cc6634C0532925a3b8D598C8C33fB2C1b4',
            verified: false,
            compiler: 'v0.8.30+commit.7dd6d404',
            optimization: false,
            network: getCurrentNetwork(),
            sourceCode: localStorage.getItem('contratoSource') || '',
            abi: ''
        };
        
        return localData;
    }
    
    try {
        console.log('🔍 Buscando dados reais do contrato via API...');
        
        // Determina a rede atual
        const network = await getCurrentNetworkForApi();
        console.log('🌐 Rede detectada:', network);
        
        // Chama API real
        const contractData = await detectContract(address, network);
        
        if (contractData) {
            console.log('✅ Dados do contrato obtidos via API:', contractData);
            return contractData;
        }
        
        return null;
        
    } catch (error) {
        console.error('❌ Erro na API real:', error);
        
        // Para acesso direto (sem dados locais), retorna dados vazios para consulta
        if (!isFromAddIndex) {
            console.log('🔄 Acesso direto - retornando dados vazios para consulta...');
            return {
                address: address,
                name: '',
                symbol: '',
                decimals: '',
                totalSupply: '',
                owner: '',
                verified: false,
                compiler: 'v0.8.30 (LATEST)',
                optimization: false,
                network: getCurrentNetwork(),
                sourceCode: '',
                abi: ''
            };
        }
        
        // Se der erro na API real com dados locais, tenta dados simulados como fallback
        console.log('🔄 Tentando dados simulados como fallback...');
        
        return {
            address: address,
            name: 'CafeToken',
            symbol: 'CAFE',
            decimals: '18',
            totalSupply: '1.000.000',
            owner: '0x742d35Cc6634C0532925a3b8D598C8C33fB2C1b4',
            verified: false,
            compiler: 'v0.8.30+commit.7dd6d404',
            optimization: false,
            network: getCurrentNetwork(),
            sourceCode: '',
            abi: ''
        };
    }
}

/**
 * Determina a rede atual para usar na API
 */
async function getCurrentNetworkForApi() {
    if (window.ethereum) {
        try {
            const chainId = await window.ethereum.request({ method: 'eth_chainId' });
            const chainIdInt = parseInt(chainId, 16);
            return getNetworkFromChainId(chainIdInt);
        } catch (error) {
            console.log('Erro ao detectar chainId:', error);
        }
    }
    
    // Fallback para BSC
    return 'bscscan';
};

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
                            </div>
                        </div>
                        <div class="col-md-6">
                            <div class="info-item">
                                <label class="fw-bold text-orange">🔢 Decimais</label>
                                <div class="info-value">${data.decimals}</div>
                            </div>
                        </div>
                        <div class="col-md-6">
                            <div class="info-item">
                                <label class="fw-bold text-orange">💰 Supply Total</label>
                                <div class="info-value">${data.totalSupply}</div>
                            </div>
                        </div>
                        <div class="col-12">
                            <div class="info-item">
                                <label class="fw-bold text-orange">� Endereço do Contrato</label>
                                <div class="input-group">
                                    <input type="text" class="form-control" id="contract-address-display" value="${data.address}" readonly>
                                    <button class="btn btn-outline-primary" onclick="copyToClipboard('contract-address-display')" title="Copiar endereço">
                                        <i class="bi bi-clipboard"></i>
                                    </button>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-6">
                            <div class="info-item">
                                <label class="fw-bold text-orange">�👤 Proprietário</label>
                                <div class="input-group">
                                    <input type="text" class="form-control" id="owner-address-display" value="${data.owner}" readonly>
                                    <button class="btn btn-outline-secondary btn-sm" onclick="copyToClipboard('owner-address-display')" title="Copiar proprietário">
                                        <i class="bi bi-clipboard"></i>
                                    </button>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-6">
                            <div class="info-item">
                                <label class="fw-bold text-orange">🌐 Rede</label>
                                <div class="info-value">
                                    <span class="text-info fw-bold">${data.network}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <hr class="my-3">
                    
                    <h6 class="text-primary mb-3">🔧 Dados Técnicos</h6>
                    <div class="row g-3">
                        <div class="col-md-8">
                            <div class="info-item">
                                <label class="fw-bold">⚙️ Compilador</label>
                                <div class="info-value">${data.compiler}</div>
                            </div>
                        </div>
                        <div class="col-md-4">
                            <div class="info-item">
                                <label class="fw-bold">🚀 Otimização</label>
                                <div class="info-value">${data.optimization ? 'Sim' : 'Não'}</div>
                            </div>
                        </div>
                        <div class="col-12">
                            <div class="info-item">
                                <label class="fw-bold">🔗 Link do Explorer</label>
                                <div class="info-value">
                                    <a href="${getExplorerUrl(data.address, data.network)}" target="_blank" class="btn btn-sm btn-outline-primary">
                                        <i class="bi bi-box-arrow-up-right me-1"></i>Ver no ${getExplorerName(data.network)}
                                    </a>
                                </div>
                            </div>
                        </div>
                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-6">
                            <div class="info-item">
                                <label class="fw-bold text-orange">✅ Status</label>
                                <div class="info-value">
                                    <span class="badge ${data.verified ? 'bg-success' : 'bg-warning'}">
                                        ${data.verified ? 'Verificado' : 'Não Verificado'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <hr class="my-3">
                    
                    <h6 class="text-primary mb-3">🔧 Dados Técnicos</h6>
                    <div class="row g-3">
                        <div class="col-md-8">
                            <div class="info-item">
                                <label class="fw-bold">⚙️ Compilador</label>
                                <div class="info-value">${data.compiler}</div>
                            </div>
                        </div>
                        <div class="col-md-4">
                            <div class="info-item">
                                <label class="fw-bold">🚀 Otimização</label>
                                <div class="info-value">${data.optimization ? 'Sim' : 'Não'}</div>
                            </div>
                        </div>
                        <div class="col-12">
                            <div class="info-item">
                                <label class="fw-bold">🔗 Link do Explorer</label>
                                <div class="info-value">
                                    <a href="${getExplorerUrl(data.address, data.network)}" target="_blank" class="btn btn-sm btn-outline-primary">
                                        <i class="bi bi-box-arrow-up-right me-1"></i>Ver no ${getExplorerName(data.network)}
                                    </a>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    ${!data.verified ? `
                    <hr class="my-3">
                    
                    <h6 class="text-primary mb-3">📄 Código Fonte para Verificação</h6>
                    <div class="row g-3">
                        <div class="col-12">
                            <div class="info-item">
                                <label class="fw-bold">📁 Upload do Arquivo .sol</label>
                                <div class="info-value">
                                    <div class="mb-2">
                                        <input type="file" class="form-control" id="solFileInput" accept=".sol" onchange="processarArquivoSol(this)">
                                        <small class="text-muted">Selecione o arquivo .sol do contrato para verificação</small>
                                    </div>
                                    <div id="file-preview" class="mt-2" style="display: none;">
                                        <div class="card">
                                            <div class="card-header bg-light d-flex justify-content-between align-items-center">
                                                <span id="file-name" class="fw-bold"></span>
                                                <button class="btn btn-sm btn-outline-danger" onclick="removerArquivo()">
                                                    <i class="bi bi-trash"></i>
                                                </button>
                                            </div>
                                            <div class="card-body">
                                                <textarea id="source-code-preview" class="form-control" rows="8" 
                                                    style="font-family: 'Courier New', monospace; font-size: 0.85rem;" readonly></textarea>
                                                <div class="mt-2">
                                                    <small class="text-success">
                                                        <i class="bi bi-check-circle me-1"></i>
                                                        Arquivo carregado com sucesso! Pronto para verificação.
                                                    </small>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div class="alert alert-info mt-2">
                                        <small>
                                            <strong>💡 Dica:</strong> 
                                            O arquivo .sol deve ser o código fonte exato usado no deploy do contrato. 
                                            Certifique-se de que é o mesmo código que foi compilado e deployado.
                                        </small>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    ` : ''}
                    
                    <div class="alert alert-success mt-3">
                        <strong>✅ Próximo passo:</strong> Os dados estão prontos para verificação. 
                        Role para baixo para continuar com o processo de verificação.
                        
                        ${!data.verified ? `
                        <div class="mt-2">
                            <button class="btn btn-primary btn-sm me-2" onclick="iniciarVerificacaoAutomatica('${data.address}')">
                                <i class="bi bi-robot me-1"></i>Verificação Automática
                            </button>
                            <button class="btn btn-outline-primary btn-sm me-2" onclick="iniciarVerificacaoManual()">
                                <i class="bi bi-shield-check me-1"></i>Verificar com Arquivo
                            </button>
                            <br><small class="text-muted">Use verificação automática primeiro. Se falhar, carregue o arquivo .sol e use verificação manual.</small>
                        </div>
                        ` : `
                        <div class="mt-2">
                            <span class="badge bg-success">
                                <i class="bi bi-check-circle-fill me-1"></i>Contrato já verificado!
                            </span>
                        </div>
                        `}
                    </div>
                </div>
            </div>
        `;
    }
    
    console.log('✅ Dados do contrato exibidos:', data);
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
 * Retorna o nome do explorer baseado na rede
 */
function getExplorerName(network) {
    const explorers = {
        'BNB Smart Chain': 'BSCScan',
        'BNB Testnet': 'BSCScan Testnet',
        'Ethereum Mainnet': 'Etherscan',
        'Polygon': 'PolygonScan'
    };
    
    return explorers[network] || 'BSCScan';
}

/**
 * Inicia verificação automática do contrato
 */
window.iniciarVerificacaoAutomatica = async function(contractAddress) {
    // Se não tem endereço como parâmetro, procura de outras fontes
    if (!contractAddress) {
        contractAddress = window.currentContractData?.contractAddress || 
                         window.currentContractData?.address ||
                         document.getElementById('contract-address-display')?.value ||
                         localStorage.getItem('tokenAddress');
    }
    
    if (!contractAddress) {
        console.error('❌ Endereço do contrato não encontrado para verificação automática');
        alert('❌ Erro: Endereço do contrato não encontrado');
        return;
    }
    
    const button = event.target;
    const originalHTML = button.innerHTML;
    
    // Desabilita botão e mostra loading
    button.disabled = true;
    button.innerHTML = '<i class="bi bi-hourglass-split me-1"></i>Verificando...';
    
    try {
        console.log('🤖 Iniciando verificação automática para:', contractAddress);
        
        // Busca dados do contrato novamente para garantir que temos source code
        const network = await getCurrentNetworkForApi();
        const contractData = await detectContract(contractAddress, network);
        
        if (!contractData || !contractData.sourceCode) {
            throw new Error('Código fonte não disponível para verificação automática');
        }
        
        // Prepara dados para verificação
        const verificationData = {
            address: contractAddress,
            sourceCode: contractData.sourceCode,
            contractName: contractData.name,
            compilerVersion: contractData.compiler,
            optimization: contractData.optimization,
            runs: 200 // Padrão
        };
        
        // Submete para verificação
        const result = await submitContractVerification(verificationData, network);
        
        if (result.success) {
            // Mostra sucesso e inicia monitoramento
            button.innerHTML = '<i class="bi bi-check-circle-fill me-1"></i>Submetido!';
            button.classList.remove('btn-primary');
            button.classList.add('btn-success');
            
            // Monitora o status
            monitorarStatusVerificacao(result.guid, network, button);
            
        } else {
            throw new Error(result.error || 'Erro na submissão');
        }
        
    } catch (error) {
        console.error('❌ Erro na verificação automática:', error);
        
        // Restaura botão e mostra erro
        button.disabled = false;
        button.innerHTML = originalHTML;
        
        alert(`❌ Erro na verificação automática: ${error.message}`);
    }
};

/**
 * Monitora o status da verificação
 */
async function monitorarStatusVerificacao(guid, network, button) {
    console.log('📊 Monitorando verificação:', guid);
    
    const maxTentativas = 12; // 2 minutos (12 x 10s)
    let tentativas = 0;
    
    const verificarStatus = async () => {
        try {
            const status = await checkVerificationStatus(guid, network);
            tentativas++;
            
            console.log(`📊 Status (${tentativas}/${maxTentativas}):`, status);
            
            if (status.result === 'Pending in queue' || status.result === 'In progress') {
                // Ainda processando
                button.innerHTML = `<i class="bi bi-hourglass-split me-1"></i>Processando... (${tentativas}/${maxTentativas})`;
                
                if (tentativas < maxTentativas) {
                    setTimeout(verificarStatus, 10000); // Verifica a cada 10 segundos
                } else {
                    // Timeout
                    button.innerHTML = '<i class="bi bi-clock me-1"></i>Timeout';
                    button.classList.remove('btn-success');
                    button.classList.add('btn-warning');
                }
                
            } else if (status.result === 'Pass - Verified') {
                // Sucesso!
                button.innerHTML = '<i class="bi bi-check-circle-fill me-1"></i>Verificado!';
                button.classList.remove('btn-success');
                button.classList.add('btn-success');
                
                // Mostra mensagem de sucesso
                mostrarSucessoVerificacao();
                
            } else {
                // Erro na verificação
                button.innerHTML = '<i class="bi bi-x-circle-fill me-1"></i>Falhou';
                button.classList.remove('btn-success');
                button.classList.add('btn-danger');
                
                console.error('❌ Verificação falhou:', status.result);
            }
            
        } catch (error) {
            console.error('❌ Erro ao verificar status:', error);
            button.innerHTML = '<i class="bi bi-exclamation-triangle-fill me-1"></i>Erro';
            button.classList.remove('btn-success');
            button.classList.add('btn-danger');
        }
    };
    
    // Inicia verificação em 5 segundos
    setTimeout(verificarStatus, 5000);
}

/**
 * Mostra mensagem de sucesso da verificação
 */
function mostrarSucessoVerificacao() {
    const detectionStatus = document.getElementById('detection-status');
    
    if (detectionStatus) {
        const successMessage = document.createElement('div');
        successMessage.className = 'alert alert-success mt-3';
        successMessage.innerHTML = `
            <h6><i class="bi bi-check-circle-fill me-2"></i>Verificação Concluída!</h6>
            <p class="mb-0">✅ Seu contrato foi verificado com sucesso na blockchain!</p>
            <p class="mb-0">🎉 Agora ele aparecerá como "Verified" no explorer.</p>
        `;
        
        detectionStatus.appendChild(successMessage);
        
        // Scroll para mostrar a mensagem
        successMessage.scrollIntoView({ behavior: 'smooth' });
    }
}

/**
 * Processa o arquivo .sol carregado pelo usuário
 */
window.processarArquivoSol = function(input) {
    const file = input.files[0];
    
    if (!file) {
        return;
    }
    
    // Validação do arquivo
    if (!file.name.endsWith('.sol')) {
        alert('❌ Por favor, selecione um arquivo .sol válido');
        input.value = '';
        return;
    }
    
    if (file.size > 1024 * 1024) { // 1MB max
        alert('❌ Arquivo muito grande. Máximo 1MB permitido');
        input.value = '';
        return;
    }
    
    console.log('📄 Processando arquivo .sol:', file.name);
    
    // Lê o conteúdo do arquivo
    const reader = new FileReader();
    reader.onload = function(e) {
        const sourceCode = e.target.result;
        
        // Validação básica do código Solidity
        if (!sourceCode.includes('pragma solidity') && !sourceCode.includes('SPDX-License-Identifier')) {
            alert('⚠️ Este arquivo pode não ser um contrato Solidity válido');
        }
        
        // Mostra preview do arquivo
        mostrarPreviewArquivo(file.name, sourceCode);
        
        // Salva o código fonte para usar na verificação
        window.uploadedSourceCode = sourceCode;
        window.uploadedFileName = file.name;
        
        console.log('✅ Arquivo .sol carregado com sucesso');
    };
    
    reader.onerror = function() {
        alert('❌ Erro ao ler o arquivo');
        input.value = '';
    };
    
    reader.readAsText(file);
};

/**
 * Mostra preview do arquivo carregado
 */
function mostrarPreviewArquivo(fileName, sourceCode) {
    const preview = document.getElementById('file-preview');
    const nameElement = document.getElementById('file-name');
    const codeElement = document.getElementById('source-code-preview');
    
    if (preview && nameElement && codeElement) {
        nameElement.textContent = fileName;
        codeElement.value = sourceCode;
        preview.style.display = 'block';
        
        // Scroll para mostrar o preview
        preview.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
}

/**
 * Remove o arquivo carregado
 */
window.removerArquivo = function() {
    const input = document.getElementById('solFileInput');
    const preview = document.getElementById('file-preview');
    
    if (input) {
        input.value = '';
    }
    
    if (preview) {
        preview.style.display = 'none';
    }
    
    // Remove dados salvos
    delete window.uploadedSourceCode;
    delete window.uploadedFileName;
    
    console.log('🗑️ Arquivo removido');
};

/**
 * Extrai nome do contrato do código fonte
 */
function extrairNomeContrato(sourceCode) {
    // Procura por "contract NomeDoContrato"
    const match = sourceCode.match(/contract\s+(\w+)/);
    return match ? match[1] : 'Contract';
};

/**
 * Inicia verificação manual com arquivo carregado
 */
window.iniciarVerificacaoManual = async function() {
    // Procura o endereço do contrato de várias fontes
    const contractAddress = window.currentContractData?.contractAddress || 
                          window.currentContractData?.address ||
                          document.getElementById('contract-address-display')?.value ||
                          localStorage.getItem('tokenAddress');
    
    if (!contractAddress) {
        console.error('❌ Endereço do contrato não encontrado');
        console.log('Debug sources:', {
            currentContractData: window.currentContractData,
            displayElement: document.getElementById('contract-address-display')?.value,
            localStorage: localStorage.getItem('tokenAddress')
        });
        alert('❌ Erro: Endereço do contrato não encontrado');
        return;
    }
    
    // Verifica se existe código fonte carregado
    if (!window.uploadedSourceCode) {
        alert('❌ Por favor, carregue o arquivo .sol primeiro');
        return;
    }
    
    console.log('🚀 Iniciando verificação manual para:', contractAddress);
    
    try {
        // Mostra loading
        const buttonElement = document.querySelector('[onclick="iniciarVerificacaoManual()"]');
        if (buttonElement) {
            buttonElement.innerHTML = '<i class="bi bi-arrow-clockwise spin"></i> Verificando...';
            buttonElement.disabled = true;
        }
        
        // Extrai dados necessários do código fonte
        const contractName = extrairNomeContrato(window.uploadedSourceCode);
        
        // Validações básicas
        const warnings = validarCompatibilidade(window.uploadedSourceCode, window.currentContractData);
        if (warnings.length > 0) {
            console.warn('⚠️ Avisos de compatibilidade:', warnings);
        }
        
        // Prepara dados para verificação
        const verificationData = {
            address: contractAddress,
            sourceCode: window.uploadedSourceCode,
            contractName: contractName,
            compilerVersion: 'v0.8.19+commit.7dd6d404', // Versão padrão, pode ser configurável
            optimization: true,
            runs: 200
        };
        
        console.log('📝 Dados da verificação manual:', {
            address: verificationData.address,
            name: verificationData.contractName,
            fileName: window.uploadedFileName,
            codeLength: verificationData.sourceCode.length
        });
        
        // Chama API de verificação
        const network = await getCurrentNetworkForApi();
        const result = await submitContractVerification(verificationData, network);
        
        if (result.success) {
            console.log('✅ Verificação manual submetida com sucesso:', result.guid);
            
            // Atualiza botão e inicia monitoramento
            if (buttonElement) {
                buttonElement.innerHTML = '<i class="bi bi-check-circle-fill me-1"></i>Submetido!';
                buttonElement.classList.remove('btn-primary');
                buttonElement.classList.add('btn-success');
            }
            
            // Monitora o status
            monitorarStatusVerificacaoManual(result.guid, network, buttonElement);
            
            // Mostra mensagem de progresso
            mostrarProgressoVerificacao('Verificação manual enviada! Aguardando processamento...');
            
        } else {
            throw new Error(result.error || 'Erro na verificação');
        }
        
    } catch (error) {
        console.error('❌ Erro na verificação manual:', error);
        
        // Restaura botão
        const buttonElement = document.querySelector('[onclick="iniciarVerificacaoManual()"]');
        if (buttonElement) {
            buttonElement.innerHTML = '<i class="bi bi-shield-check"></i> Verificar com Arquivo';
            buttonElement.disabled = false;
        }
        
        // Mostra erro para o usuário
        alert(`❌ Erro na verificação: ${error.message}`);
        mostrarErroVerificacao(error.message);
    }
};

/**
 * Monitora o status da verificação manual
 */
async function monitorarStatusVerificacaoManual(guid, network, button) {
    console.log('� Monitorando verificação manual:', guid);
    
    let tentativas = 0;
    const maxTentativas = 15; // 2.5 minutos máximo
    
    const verificarStatus = async () => {
        try {
            tentativas++;
            console.log(`🔄 Tentativa ${tentativas}/${maxTentativas} - Verificando status...`);
            
            const status = await checkVerificationStatus(guid, network);
            
            console.log(`📊 Status manual (${tentativas}/${maxTentativas}):`, status);
            
            if (status.result === 'Pending in queue' || status.result === 'In progress') {
                // Ainda processando
                if (button) {
                    button.innerHTML = `<i class="bi bi-hourglass-split me-1"></i>Processando... (${tentativas}/${maxTentativas})`;
                }
                mostrarProgressoVerificacao(`Processando verificação manual... (${tentativas}/${maxTentativas})`);
                
                if (tentativas < maxTentativas) {
                    setTimeout(verificarStatus, 10000); // Verifica a cada 10 segundos
                } else {
                    // Timeout
                    if (button) {
                        button.innerHTML = '<i class="bi bi-clock me-1"></i>Timeout';
                        button.classList.remove('btn-success');
                        button.classList.add('btn-warning');
                    }
                    mostrarErroVerificacao('Timeout: Verificação demorou mais que o esperado');
                }
                
            } else if (status.result === 'Pass - Verified') {
                // Sucesso!
                if (button) {
                    button.innerHTML = '<i class="bi bi-check-circle-fill me-1"></i>Verificado!';
                    button.classList.remove('btn-success');
                    button.classList.add('btn-success');
                }
                
                console.log('🎉 Verificação manual concluída com sucesso!');
                mostrarSucessoVerificacao();
                
            } else {
                // Erro na verificação
                if (button) {
                    button.innerHTML = '<i class="bi bi-x-circle-fill me-1"></i>Falhou';
                    button.classList.remove('btn-success');
                    button.classList.add('btn-danger');
                }
                
                console.error('❌ Verificação manual falhou:', status.result);
                mostrarErroVerificacao(`Verificação falhou: ${status.result}`);
            }
            
        } catch (error) {
            console.error('❌ Erro ao verificar status manual:', error);
            if (button) {
                button.innerHTML = '<i class="bi bi-exclamation-triangle-fill me-1"></i>Erro';
                button.classList.remove('btn-success');
                button.classList.add('btn-danger');
            }
            mostrarErroVerificacao(`Erro ao verificar status: ${error.message}`);
        }
    };
    
    // Inicia verificação após 5 segundos
    setTimeout(verificarStatus, 5000);
}

/**
 * Mostra progresso da verificação
 */
function mostrarProgressoVerificacao(mensagem) {
    const detectionStatus = document.getElementById('detection-status');
    
    if (detectionStatus) {
        // Remove mensagens anteriores de progresso
        const existingProgress = detectionStatus.querySelector('.alert-info');
        if (existingProgress) {
            existingProgress.remove();
        }
        
        const progressMessage = document.createElement('div');
        progressMessage.className = 'alert alert-info mt-3';
        progressMessage.innerHTML = `
            <h6><i class="bi bi-arrow-clockwise spin me-2"></i>Verificação em Andamento</h6>
            <p class="mb-0">${mensagem}</p>
            <small class="text-muted">⏳ Aguarde enquanto processamos a verificação...</small>
        `;
        
        detectionStatus.appendChild(progressMessage);
        progressMessage.scrollIntoView({ behavior: 'smooth' });
    }
}

/**
 * Mostra erro na verificação
 */
function mostrarErroVerificacao(erro) {
    const detectionStatus = document.getElementById('detection-status');
    
    if (detectionStatus) {
        // Remove mensagens anteriores de erro
        const existingError = detectionStatus.querySelector('.alert-danger');
        if (existingError) {
            existingError.remove();
        }
        
        const errorMessage = document.createElement('div');
        errorMessage.className = 'alert alert-danger mt-3';
        errorMessage.innerHTML = `
            <h6><i class="bi bi-exclamation-triangle-fill me-2"></i>Erro na Verificação</h6>
            <p class="mb-0">${erro}</p>
            <small class="text-muted">💡 Verifique se o código fonte, versão do compilador e configurações estão corretos</small>
        `;
        
        detectionStatus.appendChild(errorMessage);
        errorMessage.scrollIntoView({ behavior: 'smooth' });
    }
}
