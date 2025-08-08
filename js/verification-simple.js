/**
 * Sistema de Verificação Automática Simplificado
 * Versão limpa focada na resolução do erro BSCScan
 */

/**
 * Função principal para iniciar verificação automática
 */
window.iniciarVerificacaoAutomatica = async function() {
    try {
        console.log('🚀 Iniciando verificação automática...');
        
        // Limpar status anterior
        clearVerificationStatus();
        
        // Obter dados necessários
        const contractAddress = localStorage.getItem('tokenAddress');
        const sourceCode = localStorage.getItem('contratoSource');
        const compilerVersion = localStorage.getItem('resolvedCompilerVersion') || '0.8.19';
        
        // Validações básicas
        if (!contractAddress) {
            showError('❌ Endereço do contrato não encontrado. Faça o deploy primeiro.');
            return;
        }
        
        if (!sourceCode) {
            showError('❌ Código fonte não encontrado. Compile o contrato primeiro.');
            return;
        }

        updateStatus('🔍 Detectando contrato...', 'info');
        
        // Detectar nome do contrato (priorizar USDT018)
        const contractName = detectContractFromSource(sourceCode);
        updateStatus(`🎯 Contrato detectado: ${contractName}`, 'success');

        // Detectar Chain ID
        const chainId = await detectChainId();
        updateStatus(`🌐 Rede: Chain ID ${chainId}`, 'info');

        // Usar sistema Etherscan V2 se disponível
        if (window.etherscanV2Verification) {
            updateStatus('📡 Iniciando verificação via Etherscan V2...', 'info');
            
            const result = await window.etherscanV2Verification.verifyContract(
                contractAddress,
                sourceCode,
                contractName,
                compilerVersion,
                chainId
            );

            if (result.success) {
                updateStatus(`✅ ${result.message}`, 'success');
                
                if (result.guid) {
                    updateStatus(`📋 GUID: ${result.guid}`, 'info');
                    
                    if (result.checkUrl) {
                        updateStatus(`🔗 <a href="${result.checkUrl}" target="_blank" class="btn btn-sm btn-outline-primary">Verificar Status</a>`, 'info');
                    }
                    
                    // Monitorar status
                    monitorVerification(result.guid, chainId);
                }
                
                return result;
            } else {
                throw new Error(result.error || 'Falha na verificação V2');
            }
        } else {
            // Fallback para sistema antigo
            updateStatus('⚠️ Sistema V2 não disponível, usando método legado...', 'warning');
            
            // Usar sistema antigo se V2 não estiver disponível
            if (window.autoVerification) {
                await window.autoVerification.verificarContrato(
                    contractAddress,
                    sourceCode,
                    compilerVersion,
                    false
                );
            } else {
                throw new Error('Nenhum sistema de verificação disponível');
            }
        }

    } catch (error) {
        console.error('❌ Erro na verificação:', error);
        showError(`❌ Erro: ${error.message}`);
        
        // Detectar nome do contrato para o fallback manual
        const sourceCode = localStorage.getItem('contratoSource') || '';
        const contractName = detectContractFromSource(sourceCode);
        showManualFallback(contractName);
    }
};

/**
 * Detecta nome do contrato do código fonte
 */
function detectContractFromSource(sourceCode) {
    // Primeiro: procurar por contratos específicos no código
    const contractMatches = sourceCode.match(/contract\s+(\w+)/g);
    if (contractMatches) {
        const contracts = contractMatches.map(m => m.replace('contract ', '').trim());
        
        // Filtrar interfaces comuns (não são o contrato principal)
        const mainContracts = contracts.filter(name => 
            !['IERC20', 'ERC20', 'Context', 'Ownable', 'SafeMath'].includes(name)
        );
        
        console.log('🔍 Contratos encontrados:', contracts);
        console.log('📋 Contratos principais (filtrados):', mainContracts);
        
        // Se encontrou contratos principais, usar o primeiro
        if (mainContracts.length > 0) {
            const detectedName = mainContracts[0];
            console.log(`✅ Contrato detectado automaticamente: ${detectedName}`);
            return detectedName;
        }
    }
    
    // Fallback: Se não detectou nada, usar USDT018 baseado no erro BSCScan
    console.log('⚠️ Não foi possível detectar contrato - usando USDT018 como fallback');
    return 'USDT018';
}

/**
 * Detecta Chain ID atual
 */
async function detectChainId() {
    try {
        if (window.ethereum) {
            const chainId = await window.ethereum.request({ method: 'eth_chainId' });
            return parseInt(chainId, 16);
        }
    } catch (error) {
        console.warn('Erro ao detectar chain ID:', error);
    }
    
    return 56; // BSC Mainnet fallback
}

/**
 * Monitora status da verificação
 */
async function monitorVerification(guid, chainId) {
    let attempts = 0;
    const maxAttempts = 15; // 7.5 minutos

    const checkStatus = async () => {
        if (attempts >= maxAttempts) {
            updateStatus('⏰ Timeout na verificação. Verifique manualmente o status.', 'warning');
            return;
        }

        try {
            if (window.etherscanV2Verification) {
                const status = await window.etherscanV2Verification.checkVerificationStatus(guid, chainId);
                
                updateStatus(`📊 ${status.message}`, getStatusType(status.status));

                if (status.status === 'success') {
                    updateStatus('🎉 Verificação concluída com sucesso!', 'success');
                    return;
                } else if (status.status === 'error') {
                    showManualFallback();
                    return;
                } else {
                    attempts++;
                    setTimeout(checkStatus, 30000); // 30 segundos
                }
            }
        } catch (error) {
            console.error('Erro ao verificar status:', error);
            updateStatus(`⚠️ Erro ao verificar: ${error.message}`, 'warning');
        }
    };

    // Primeira verificação em 10 segundos
    setTimeout(checkStatus, 10000);
}

/**
 * Função para detectar contrato manualmente
 */
window.detectarContrato = async function() {
    try {
        clearVerificationStatus();
        updateStatus('🔍 Detectando contrato...', 'info');

        const contractAddress = localStorage.getItem('tokenAddress');
        const sourceCode = localStorage.getItem('contratoSource');
        
        if (!contractAddress || !sourceCode) {
            showError('❌ Dados do contrato não encontrados.');
            return;
        }

        // Usar detector se disponível
        if (window.contractDetector) {
            const chainId = await detectChainId();
            const networkConfig = getNetworkConfig(chainId);
            const compiledBytecode = localStorage.getItem('contratoBytecode');
            
            const detection = await window.contractDetector.autoDetectContract(
                contractAddress,
                compiledBytecode,
                networkConfig,
                sourceCode
            );
            
            updateStatus(`🎯 Contrato detectado: ${detection.name}`, 'success');
            
            if (detection.similarity) {
                updateStatus(`📊 Similaridade bytecode: ${(detection.similarity * 100).toFixed(1)}%`, 'info');
            }
            
            if (detection.deployedBytecode) {
                updateStatus('✅ Bytecode deployado obtido da blockchain', 'success');
            }
            
        } else {
            // Detecção simples
            const contractName = detectContractFromSource(sourceCode);
            updateStatus(`🎯 Contrato detectado: ${contractName}`, 'success');
        }

    } catch (error) {
        console.error('Erro na detecção:', error);
        showError(`❌ Erro na detecção: ${error.message}`);
    }
};

/**
 * Funções utilitárias de UI
 */
function updateStatus(message, type) {
    const statusDiv = document.getElementById('verificationStatus');
    if (statusDiv) {
        const alertClass = {
            'info': 'alert-info',
            'success': 'alert-success',
            'error': 'alert-danger',
            'warning': 'alert-warning'
        }[type] || 'alert-info';

        statusDiv.innerHTML += `<div class="alert ${alertClass} mt-2 small">${message}</div>`;
        statusDiv.scrollTop = statusDiv.scrollHeight;
    }
}

function clearVerificationStatus() {
    const statusDiv = document.getElementById('verificationStatus');
    if (statusDiv) {
        statusDiv.innerHTML = '';
    }
}

function showError(message) {
    updateStatus(message, 'error');
}

function showManualFallback(contractName = null) {
    // Detecta o nome do contrato se não foi fornecido
    if (!contractName) {
        const sourceCode = localStorage.getItem('contratoSource') || '';
        contractName = detectContractFromSource(sourceCode);
    }
    
    updateStatus(`
        <div class="alert alert-warning mt-3">
            <h6>⚠️ Verificação Automática Falhou</h6>
            <p>Use a verificação manual:</p>
            <ol>
                <li>Copie o código fonte acima</li>
                <li>Use <strong>${contractName}</strong> como nome do contrato</li>
                <li>Cole na <a href="https://testnet.bscscan.com/verifyContract" target="_blank">BSCScan</a></li>
            </ol>
        </div>
    `, 'warning');
}

function getStatusType(status) {
    switch (status) {
        case 'success': return 'success';
        case 'error': return 'error';
        case 'pending': return 'warning';
        default: return 'info';
    }
}

function getNetworkConfig(chainId) {
    const configs = {
        56: {
            name: 'BSC Mainnet',
            apiUrl: 'https://api.bscscan.com/api',
            explorerUrl: 'https://bscscan.com'
        },
        97: {
            name: 'BSC Testnet',
            apiUrl: 'https://api-testnet.bscscan.com/api',
            explorerUrl: 'https://testnet.bscscan.com'
        }
    };
    
    return configs[chainId] || configs[56];
}

/**
 * Função de debug para verificação
 */
window.debugVerificacao = function() {
    console.log('🐛 Iniciando debug de verificação...');
    
    clearVerificationStatus();
    updateStatus('🐛 Debug da Verificação', 'info');
    
    // Verificar dados básicos
    const contractAddress = localStorage.getItem('tokenAddress');
    const sourceCode = localStorage.getItem('contratoSource');
    const compilerVersion = localStorage.getItem('resolvedCompilerVersion') || '0.8.19';
    const bytecode = localStorage.getItem('contratoBytecode');
    
    updateStatus(`📍 Endereço: ${contractAddress || 'Não encontrado'}`, contractAddress ? 'success' : 'error');
    updateStatus(`📄 Código fonte: ${sourceCode ? `${sourceCode.length} caracteres` : 'Não encontrado'}`, sourceCode ? 'success' : 'error');
    updateStatus(`⚙️ Compilador: ${compilerVersion}`, 'info');
    updateStatus(`🔢 Bytecode: ${bytecode ? `${bytecode.length} caracteres` : 'Não encontrado'}`, bytecode ? 'success' : 'warning');
    
    // Verificar sistemas carregados
    updateStatus(`🤖 Detector de contrato: ${window.contractDetector ? 'Carregado' : 'Não carregado'}`, window.contractDetector ? 'success' : 'warning');
    updateStatus(`🆕 Etherscan V2: ${window.etherscanV2Verification ? 'Carregado' : 'Não carregado'}`, window.etherscanV2Verification ? 'success' : 'warning');
    updateStatus(`🔑 Gerenciador API: ${window.apiKeyManager ? 'Carregado' : 'Não carregado'}`, window.apiKeyManager ? 'success' : 'warning');
    
    // Verificar API keys
    if (window.apiKeyManager) {
        const keys = window.apiKeyManager.listConfiguredKeys();
        updateStatus(`🔐 BSCScan API: ${keys.bscscan.configured ? 'Configurada' : 'Não configurada'}`, keys.bscscan.configured ? 'success' : 'warning');
        updateStatus(`🔐 Etherscan API: ${keys.etherscan.configured ? 'Configurada' : 'Não configurada'}`, keys.etherscan.configured ? 'success' : 'warning');
    }
    
    // Detectar contrato se possível
    if (sourceCode) {
        const contractName = detectContractFromSource(sourceCode);
        updateStatus(`🎯 Contrato detectado: ${contractName}`, 'success');
    }
    
    // Verificar conexão MetaMask
    if (window.ethereum) {
        window.ethereum.request({ method: 'eth_chainId' })
            .then(chainId => {
                const chainIdNum = parseInt(chainId, 16);
                updateStatus(`🌐 Chain ID: ${chainIdNum}`, 'success');
            })
            .catch(error => {
                updateStatus(`❌ Erro ao detectar rede: ${error.message}`, 'error');
            });
    } else {
        updateStatus('❌ MetaMask não conectado', 'error');
    }
    
    updateStatus('✅ Debug concluído!', 'success');
};

console.log('✅ Sistema de verificação simplificado carregado!');
