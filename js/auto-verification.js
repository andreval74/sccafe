/**
 * Sistema de Verificação Automática de Contratos
 * Integra com APIs da BSCScan/Etherscan para verificação automática
 */

// Configurações das redes suportadas
const AUTO_VERIFICATION_NETWORK_CONFIGS = {
    1: { // Ethereum Mainnet
        name: 'Ethereum',
        apiUrl: 'https://api.etherscan.io/api',
        explorerUrl: 'https://etherscan.io',
        apiKeyRequired: true
    },
    56: { // BSC Mainnet
        name: 'BNB Smart Chain',
        apiUrl: 'https://api.bscscan.com/api',
        explorerUrl: 'https://bscscan.com',
        apiKeyRequired: false
    },
    97: { // BSC Testnet
        name: 'BNB Smart Chain Testnet',
        apiUrl: 'https://api-testnet.bscscan.com/api',
        explorerUrl: 'https://testnet.bscscan.com',
        apiKeyRequired: false
    },
    137: { // Polygon
        name: 'Polygon',
        apiUrl: 'https://api.polygonscan.com/api',
        explorerUrl: 'https://polygonscan.com',
        apiKeyRequired: true
    }
};

/**
 * Classe principal para verificação automática
 */
class AutoVerification {
    constructor() {
        this.isVerifying = false;
        this.verificationStatus = null;
    }

    /**
     * Inicia verificação automática do contrato
     */
    async verificarContrato(contractAddress, sourceCode, compilerVersion = '0.8.19', optimization = false) {
        if (this.isVerifying) {
            console.log('⏳ Verificação já em andamento...');
            return;
        }

        this.isVerifying = true;
        
        try {
            console.log('🚀 Iniciando verificação automática...');
            this.updateStatus('Iniciando verificação automática...', 'info');

            // Detecta rede atual
            const networkConfig = await this.detectNetwork();
            if (!networkConfig) {
                throw new Error('Rede não suportada para verificação automática');
            }

            console.log('🌐 Rede detectada:', networkConfig.name);
            this.updateStatus(`Verificando na ${networkConfig.name}...`, 'info');

            // Prepara dados para verificação
            const verificationData = await this.prepareVerificationData(
                contractAddress, 
                sourceCode, 
                compilerVersion, 
                optimization
            );

            console.log('📋 Dados preparados:', verificationData);

            // Envia para verificação
            const result = await this.submitVerification(networkConfig, verificationData);

            if (result.success) {
                this.updateStatus('✅ Contrato verificado com sucesso!', 'success');
                this.showVerificationSuccess(result, networkConfig);
            } else {
                this.updateStatus('❌ Falha na verificação: ' + result.error, 'error');
                this.showVerificationError(result);
            }

            return result;

        } catch (error) {
            console.error('❌ Erro na verificação automática:', error);
            this.updateStatus('❌ Erro: ' + error.message, 'error');
            this.showVerificationError({ error: error.message, details: error });
        } finally {
            this.isVerifying = false;
        }
    }

    /**
     * Detecta a rede atual
     */
    async detectNetwork() {
        if (!window.ethereum) {
            throw new Error('MetaMask não encontrado');
        }

        try {
            const chainId = await window.ethereum.request({ method: 'eth_chainId' });
            const networkId = parseInt(chainId, 16);
            
            console.log('🔍 Chain ID detectado:', networkId);
            
            return AUTO_VERIFICATION_NETWORK_CONFIGS[networkId] || null;
        } catch (error) {
            console.error('Erro ao detectar rede:', error);
            return null;
        }
    }

    /**
     * Prepara dados para verificação com detecção automática de contrato
     */
    async prepareVerificationData(contractAddress, sourceCode, compilerVersion, optimization) {
        // Remove caracteres problemáticos do código
        const cleanSourceCode = sourceCode
            .replace(/\r\n/g, '\n')
            .replace(/\r/g, '\n')
            .trim();

        // Formata versão do compilador
        let formattedVersion = compilerVersion;
        if (!formattedVersion.startsWith('v')) {
            formattedVersion = 'v' + formattedVersion;
        }
        if (!formattedVersion.includes('+commit')) {
            formattedVersion = formattedVersion + '+commit.7dd6d404';
        }

        // 🎯 DETECÇÃO AUTOMÁTICA DE CONTRATO
        let contractName = 'USDT018'; // Baseado no erro BSCScan que detectou este contrato
        let detectionInfo = null;
        
        // Detecta automaticamente qual contrato foi deployado
        if (window.contractDetector) {
            try {
                const networkConfig = await this.detectNetwork();
                const compiledBytecode = localStorage.getItem('contratoBytecode');
                
                detectionInfo = await window.contractDetector.autoDetectContract(
                    contractAddress, 
                    compiledBytecode, 
                    networkConfig,
                    cleanSourceCode // Passa o código fonte para melhor detecção
                );
                
                contractName = detectionInfo.name;
                console.log('🎯 Contrato detectado automaticamente:', contractName);
                console.log('📊 Similaridade bytecode:', (detectionInfo.similarity * 100).toFixed(2) + '%');
                
                // Força uso do USDT018 se disponível (baseado no erro BSCScan)
                if (detectionInfo.name === 'USDT018' || contractName.includes('USDT') || contractName.includes('018')) {
                    contractName = 'USDT018';
                    console.log('✅ Confirmado: usando USDT018 (detectado no erro BSCScan)');
                }
                
                // Atualiza status com informações de detecção
                this.updateStatus(`🔍 Contrato detectado: ${contractName} (${(detectionInfo.similarity * 100).toFixed(1)}% similaridade)`, 'info');
                
            } catch (error) {
                console.error('⚠️ Erro na detecção de contrato:', error);
                
                // Fallback prioritário: procura por USDT018 no código
                if (cleanSourceCode.includes('USDT018') || cleanSourceCode.includes('contract USDT018')) {
                    contractName = 'USDT018';
                    this.updateStatus('✅ Usando USDT018 como nome do contrato (encontrado no código)', 'success');
                } else {
                    // Extrai nome do código fonte
                    const contractNameMatch = cleanSourceCode.match(/contract\s+(\w+)/);
                    if (contractNameMatch && contractNameMatch[1] !== 'IERC20') {
                        contractName = contractNameMatch[1];
                    }
                    this.updateStatus(`⚠️ Usando ${contractName} como nome do contrato (detecção manual)`, 'warning');
                }
            }
        } else {
            // Fallback: procura por USDT018 primeiro, depois outros contratos
            if (cleanSourceCode.includes('USDT018') || cleanSourceCode.includes('contract USDT018')) {
                contractName = 'USDT018';
                console.log('✅ USDT018 encontrado no código fonte');
            } else {
                const contractNameMatch = cleanSourceCode.match(/contract\s+(\w+)/);
                contractName = contractNameMatch ? contractNameMatch[1] : 'USDT018';
            }
            console.log('📝 Sistema de detecção não disponível, usando:', contractName);
        }

        const verificationData = {
            contractaddress: contractAddress,
            sourceCode: cleanSourceCode,
            codeformat: 'solidity-single-file',
            contractname: contractName, // Nome detectado automaticamente
            compilerversion: formattedVersion,
            optimizationUsed: optimization ? '1' : '0',
            runs: optimization ? '200' : '0',
            evmversion: 'cancun',
            licenseType: '3' // MIT License
        };

        console.log('📋 Dados finais preparados:', {
            contractName,
            compilerVersion: formattedVersion,
            optimization: optimization,
            detectionInfo: detectionInfo ? {
                name: detectionInfo.name,
                similarity: detectionInfo.similarity
            } : 'não disponível'
        });

        return verificationData;
    }

    /**
     * Envia verificação usando múltiplas estratégias
     */
    async submitVerification(networkConfig, verificationData) {
        try {
            console.log('📡 Tentando verificação com múltiplas estratégias...');
            
            // Estratégia 1: API direta da BSCScan (sem CORS issues na testnet)
            const result1 = await this.tryDirectAPI(networkConfig, verificationData);
            if (result1.success) {
                return result1;
            }
            
            console.log('⚠️ Estratégia 1 falhou, tentando estratégia 2...');
            
            // Estratégia 2: Proxy CORS
            const result2 = await this.tryProxyAPI(networkConfig, verificationData);
            if (result2.success) {
                return result2;
            }
            
            console.log('⚠️ Estratégia 2 falhou, tentando estratégia 3...');
            
            // Estratégia 3: Simulação e retorno de instruções
            return this.provideManualInstructions(networkConfig, verificationData);

        } catch (error) {
            console.error('❌ Erro ao enviar verificação:', error);
            return {
                success: false,
                error: error.message,
                details: error
            };
        }
    }

    /**
     * Estratégia 1: API direta da BSCScan
     */
    async tryDirectAPI(networkConfig, verificationData) {
        try {
            console.log('📡 Estratégia 1: API direta da BSCScan...');
            
            const formData = new FormData();
            formData.append('module', 'contract');
            formData.append('action', 'verifysourcecode');
            
            // Adiciona todos os dados de verificação
            Object.keys(verificationData).forEach(key => {
                formData.append(key, verificationData[key]);
            });

            const response = await fetch(networkConfig.apiUrl, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();
            console.log('📋 Resposta API direta:', result);

            if (result.status === '1') {
                return await this.checkVerificationStatus(networkConfig, result.result);
            } else {
                throw new Error(result.result || 'Erro na submissão');
            }

        } catch (error) {
            console.log('❌ Estratégia 1 falhou:', error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * Estratégia 2: API com proxy CORS
     */
    async tryProxyAPI(networkConfig, verificationData) {
        try {
            console.log('📡 Estratégia 2: API via proxy CORS...');
            
            const proxyUrl = 'https://api.allorigins.win/raw?url=';
            const targetUrl = networkConfig.apiUrl;
            
            const formData = new FormData();
            formData.append('module', 'contract');
            formData.append('action', 'verifysourcecode');
            
            Object.keys(verificationData).forEach(key => {
                formData.append(key, verificationData[key]);
            });

            const response = await fetch(proxyUrl + encodeURIComponent(targetUrl), {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();
            console.log('📋 Resposta proxy:', result);

            if (result.status === '1') {
                return await this.checkVerificationStatus(networkConfig, result.result);
            } else {
                throw new Error(result.result || 'Erro na submissão via proxy');
            }

        } catch (error) {
            console.log('❌ Estratégia 2 falhou:', error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * Estratégia 3: Instruções manuais detalhadas
     */
    provideManualInstructions(networkConfig, verificationData) {
        console.log('📋 Estratégia 3: Fornecendo instruções manuais...');
        
        const instructions = `
🔧 VERIFICAÇÃO AUTOMÁTICA INDISPONÍVEL

A verificação automática falhou, mas você pode verificar manualmente seguindo estas instruções:

1. 🔗 ACESSE: ${networkConfig.explorerUrl}/verifyContract?a=${verificationData.contractaddress}

2. 📝 PREENCHA:
   • Contract Address: ${verificationData.contractaddress}
   • Contract Name: ${verificationData.contractname}
   • Compiler: ${verificationData.compilerversion}
   • Optimization: ${verificationData.optimizationUsed === '1' ? 'Yes' : 'No'}
   • Runs: ${verificationData.runs}

3. 📄 COLE O CÓDIGO FONTE que está no campo acima

4. ✅ CLIQUE EM "Verify and Publish"

💡 DICA: Use os botões "Copiar" para copiar cada campo automaticamente!
        `;

        return {
            success: false,
            error: 'Verificação automática indisponível',
            instructions: instructions,
            manualUrl: `${networkConfig.explorerUrl}/verifyContract?a=${verificationData.contractaddress}`,
            isManualFallback: true
        };
    }

    /**
     * Verifica status da verificação
     */
    async checkVerificationStatus(networkConfig, guid, attempts = 0, maxAttempts = 10) {
        try {
            console.log(`🔄 Verificando status (tentativa ${attempts + 1}/${maxAttempts})...`);
            this.updateStatus(`Aguardando confirmação da verificação... (${attempts + 1}/${maxAttempts})`, 'info');

            const statusUrl = `${networkConfig.apiUrl}?module=contract&action=checkverifystatus&guid=${guid}`;

            const response = await fetch(statusUrl);
            const result = await response.json();

            console.log('� Status da verificação:', result);

            if (result.status === '1') {
                return {
                    success: true,
                    message: 'Contrato verificado com sucesso!',
                    result: result.result,
                    guid: guid
                };
            } else if (result.result === 'Pending in queue') {
                if (attempts < maxAttempts) {
                    await new Promise(resolve => setTimeout(resolve, 3000));
                    return this.checkVerificationStatus(networkConfig, guid, attempts + 1, maxAttempts);
                } else {
                    return {
                        success: false,
                        error: 'Timeout: Verificação ainda pendente após múltiplas tentativas',
                        guid: guid
                    };
                }
            } else {
                return {
                    success: false,
                    error: result.result || 'Erro na verificação',
                    details: result,
                    guid: guid
                };
            }

        } catch (error) {
            console.error('❌ Erro ao verificar status:', error);
            return {
                success: false,
                error: error.message,
                details: error
            };
        }
    }

    /**
     * Atualiza status na interface
     */
    updateStatus(message, type = 'info') {
        console.log('📢 Status:', message);
        
        const statusElement = document.getElementById('verificationStatus');
        if (statusElement) {
            statusElement.innerHTML = `
                <div class="alert alert-${type === 'success' ? 'success' : type === 'error' ? 'danger' : 'info'} mb-2">
                    ${message}
                </div>
            `;
        }
    }

    /**
     * Mostra resultado de sucesso
     */
    showVerificationSuccess(result, networkConfig) {
        const statusElement = document.getElementById('verificationStatus');
        if (statusElement) {
            statusElement.innerHTML = `
                <div class="alert alert-success">
                    <h6><i class="bi bi-check-circle"></i> Verificação Concluída!</h6>
                    <p class="mb-2">${result.message || 'Contrato verificado com sucesso!'}</p>
                    ${result.guid ? `<small>GUID: ${result.guid}</small>` : ''}
                </div>
            `;
        }

        // Adiciona botão para ver no explorer
        const contractAddress = localStorage.getItem('tokenAddress');
        if (contractAddress) {
            const explorerUrl = `${networkConfig.explorerUrl}/address/${contractAddress}#code`;
            statusElement.innerHTML += `
                <div class="mt-2">
                    <a href="${explorerUrl}" target="_blank" class="btn btn-success btn-sm">
                        <i class="bi bi-box-arrow-up-right"></i> Ver Contrato Verificado
                    </a>
                </div>
            `;
        }
    }

    /**
     * Mostra erro detalhado
     */
    showVerificationError(result) {
        const statusElement = document.getElementById('verificationStatus');
        if (statusElement) {
            let errorDetails = '';
            
            // Analisa tipos comuns de erro
            if (result.error) {
                if (result.error.includes('Bytecode does not match')) {
                    errorDetails = `
                        <div class="mt-2">
                            <strong>💡 Possíveis soluções:</strong>
                            <ul class="small">
                                <li>Verificar se a versão do compilador está correta</li>
                                <li>Verificar se a otimização está configurada corretamente</li>
                                <li>Verificar se o código fonte está completo</li>
                            </ul>
                        </div>
                    `;
                } else if (result.error.includes('Constructor arguments')) {
                    errorDetails = `
                        <div class="mt-2">
                            <strong>💡 Solução:</strong> Este contrato precisa de argumentos do construtor.
                            Use a verificação manual na BSCScan.
                        </div>
                    `;
                }
            }

            statusElement.innerHTML = `
                <div class="alert alert-danger">
                    <h6><i class="bi bi-exclamation-triangle"></i> Erro na Verificação</h6>
                    <p class="mb-1">${result.error}</p>
                    ${errorDetails}
                    ${result.guid ? `<small>GUID: ${result.guid}</small>` : ''}
                </div>
            `;
        }
    }
}

/**
 * Funções auxiliares para exibição de resultados
 */

// Função para mostrar sucesso da verificação
AutoVerification.prototype.showVerificationSuccess = function(result, networkConfig) {
    const statusDiv = document.getElementById('verificationStatus');
    if (statusDiv) {
        statusDiv.innerHTML += `
            <div class="alert alert-success mt-3">
                <h6><i class="bi bi-check-circle"></i> Verificação Concluída!</h6>
                <p class="mb-2">Seu contrato foi verificado com sucesso na blockchain.</p>
                ${result.guid ? `<p class="small">GUID: <code>${result.guid}</code></p>` : ''}
                <button class="btn btn-sm btn-outline-success" onclick="window.open('${networkConfig.explorerUrl}/address/${this.contractAddress}', '_blank')">
                    <i class="bi bi-box-arrow-up-right"></i> Ver no Explorer
                </button>
            </div>
        `;
    }
};

// Função para mostrar erro da verificação
AutoVerification.prototype.showVerificationError = function(result) {
    if (result.isManualFallback) {
        this.showManualInstructions(result);
        return;
    }

    let errorAnalysis = '';
    let suggestions = [];

    // Analisa o tipo de erro
    if (result.error.includes('404')) {
        errorAnalysis = 'API não encontrada ou indisponível';
        suggestions = [
            'Tente novamente em alguns minutos',
            'Use a verificação manual clicando no link acima',
            'Verifique se o contrato foi deployado corretamente'
        ];
    } else if (result.error.includes('CORS')) {
        errorAnalysis = 'Problema de política CORS do navegador';
        suggestions = [
            'Use a verificação manual',
            'Tente em um navegador diferente',
            'Desative temporariamente bloqueadores de anúncios'
        ];
    } else if (result.error.includes('timeout')) {
        errorAnalysis = 'Timeout na verificação';
        suggestions = [
            'A rede pode estar congestionada',
            'Tente novamente em alguns minutos',
            'Use a verificação manual como alternativa'
        ];
    } else {
        errorAnalysis = 'Erro desconhecido na verificação automática';
        suggestions = [
            'Use a verificação manual',
            'Verifique se todos os dados estão corretos',
            'Tente novamente mais tarde'
        ];
    }

    const statusDiv = document.getElementById('verificationStatus');
    if (statusDiv) {
        statusDiv.innerHTML += `
            <div class="alert alert-danger mt-3">
                <h6><i class="bi bi-exclamation-triangle"></i> Análise do Erro</h6>
                <p><strong>Diagnóstico:</strong> ${errorAnalysis}</p>
                <p><strong>Erro técnico:</strong> <code>${result.error}</code></p>
                
                <h6 class="mt-3">💡 Sugestões:</h6>
                <ul class="mb-3">
                    ${suggestions.map(s => `<li>${s}</li>`).join('')}
                </ul>
                
                <div class="d-flex gap-2">
                    <button class="btn btn-sm btn-primary" onclick="iniciarVerificacaoAutomatica()">
                        <i class="bi bi-arrow-clockwise"></i> Tentar Novamente
                    </button>
                    <button class="btn btn-sm btn-outline-secondary" onclick="abrirVerificacao()">
                        <i class="bi bi-box-arrow-up-right"></i> Verificação Manual
                    </button>
                </div>
            </div>
        `;
    }
};

// Função para mostrar instruções manuais
AutoVerification.prototype.showManualInstructions = function(result) {
    const statusDiv = document.getElementById('verificationStatus');
    if (statusDiv) {
        statusDiv.innerHTML += `
            <div class="alert alert-warning mt-3">
                <h6><i class="bi bi-tools"></i> Verificação Manual Necessária</h6>
                <div class="small">
                    <pre style="white-space: pre-wrap; font-size: 12px;">${result.instructions}</pre>
                </div>
                <div class="d-flex gap-2 mt-3">
                    <button class="btn btn-sm btn-warning" onclick="window.open('${result.manualUrl}', '_blank')">
                        <i class="bi bi-box-arrow-up-right"></i> Abrir Verificação Manual
                    </button>
                    <button class="btn btn-sm btn-outline-primary" onclick="copiarTodasInformacoes()">
                        <i class="bi bi-clipboard"></i> Copiar Todas as Informações
                    </button>
                </div>
            </div>
        `;
    }
};

/**
 * Função global para copiar todas as informações de verificação
 */
window.copiarTodasInformacoes = function() {
    const contractAddress = localStorage.getItem('contractAddress');
    const contractName = localStorage.getItem('tokenName') || 'GT';
    const sourceCode = localStorage.getItem('contratoSource');
    const compilerVersion = localStorage.getItem('compilerVersion') || '0.8.19';
    
    const allInfo = `
INFORMAÇÕES PARA VERIFICAÇÃO MANUAL:

📋 Contract Address: ${contractAddress}
📋 Contract Name: ${contractName}
📋 Compiler Version: v${compilerVersion}+commit.7dd6d404
📋 Optimization: No
📋 Runs: 200

📄 SOURCE CODE:
${sourceCode}

🔗 Link para verificação:
https://testnet.bscscan.com/verifyContract?a=${contractAddress}
    `.trim();
    
    navigator.clipboard.writeText(allInfo).then(() => {
        console.log('✅ Todas as informações copiadas!');
        
        // Mostra feedback visual
        const btn = event.target;
        const originalText = btn.innerHTML;
        btn.innerHTML = '<i class="bi bi-check"></i> Copiado!';
        btn.classList.add('btn-success');
        btn.classList.remove('btn-outline-primary');
        
        setTimeout(() => {
            btn.innerHTML = originalText;
            btn.classList.remove('btn-success');
            btn.classList.add('btn-outline-primary');
        }, 2000);
    }).catch(err => {
        console.error('❌ Erro ao copiar:', err);
        alert('Erro ao copiar. Tente novamente.');
    });
};

/**
 * Função global para detectar contrato manualmente
 */
window.detectarContrato = async function() {
    try {
        console.log('🔍 Iniciando detecção manual de contrato...');
        
        const contractAddress = localStorage.getItem('contractAddress');
        const compiledBytecode = localStorage.getItem('contratoBytecode');
        
        if (!contractAddress) {
            alert('❌ Endereço do contrato não encontrado!');
            return;
        }
        
        if (!window.contractDetector) {
            alert('❌ Sistema de detecção não carregado!');
            return;
        }
        
        // Detecta rede
        const networkConfig = await window.autoVerification.detectNetwork();
        if (!networkConfig) {
            alert('❌ Não foi possível detectar a rede!');
            return;
        }
        
        // Mostra status
        const statusDiv = document.getElementById('verificationStatus');
        if (statusDiv) {
            statusDiv.innerHTML = `
                <div class="alert alert-info">
                    <h6><i class="bi bi-search"></i> Detectando Contrato...</h6>
                    <p class="mb-0">Analisando bytecode deployado vs compilado...</p>
                </div>
            `;
        }
        
        // Executa detecção
        const detectionResult = await window.contractDetector.autoDetectContract(
            contractAddress,
            compiledBytecode,
            networkConfig
        );
        
        console.log('🎯 Resultado da detecção:', detectionResult);
        
        // Exibe resultado
        if (statusDiv) {
            const similarityPercent = (detectionResult.similarity * 100).toFixed(2);
            const isGoodMatch = detectionResult.similarity > 0.8;
            
            statusDiv.innerHTML = `
                <div class="alert alert-${isGoodMatch ? 'success' : 'warning'}">
                    <h6><i class="bi bi-${isGoodMatch ? 'check-circle' : 'exclamation-triangle'}"></i> Detecção Concluída</h6>
                    
                    <div class="row">
                        <div class="col-md-6">
                            <strong>📝 Contrato Detectado:</strong><br>
                            <code>${detectionResult.name}</code>
                        </div>
                        <div class="col-md-6">
                            <strong>📊 Similaridade:</strong><br>
                            <span class="badge bg-${isGoodMatch ? 'success' : 'warning'}">${similarityPercent}%</span>
                        </div>
                    </div>
                    
                    <div class="mt-3">
                        <strong>📋 Informações:</strong><br>
                        ${detectionResult.info.description}
                    </div>
                    
                    ${detectionResult.deployedBytecode ? 
                        `<div class="mt-2">
                            <small class="text-muted">
                                ✅ Bytecode deployado encontrado na blockchain<br>
                                🔗 Bytecode compilado comparado com sucesso
                            </small>
                        </div>` :
                        `<div class="mt-2">
                            <small class="text-warning">
                                ⚠️ Não foi possível obter bytecode deployado
                            </small>
                        </div>`
                    }
                    
                    <div class="d-flex gap-2 mt-3">
                        <button class="btn btn-sm btn-primary" onclick="iniciarVerificacaoAutomatica()">
                            <i class="bi bi-gear"></i> Verificar com ${detectionResult.name}
                        </button>
                        ${!isGoodMatch ? 
                            `<button class="btn btn-sm btn-outline-warning" onclick="alert('⚠️ Baixa similaridade pode indicar:\\n\\n• Contrato diferente do compilado\\n• Parâmetros de constructor diferentes\\n• Versão do compilador incorreta\\n\\nVerifique os dados antes de continuar.')">
                                <i class="bi bi-question-circle"></i> Por que baixa similaridade?
                            </button>` : ''
                        }
                    </div>
                </div>
            `;
        }
        
    } catch (error) {
        console.error('❌ Erro na detecção manual:', error);
        
        const statusDiv = document.getElementById('verificationStatus');
        if (statusDiv) {
            statusDiv.innerHTML = `
                <div class="alert alert-danger">
                    <h6><i class="bi bi-exclamation-triangle"></i> Erro na Detecção</h6>
                    <p class="mb-0">Erro: ${error.message}</p>
                </div>
            `;
        }
    }
};

// Instância global
window.autoVerification = new AutoVerification();

/**
 * Função para iniciar verificação automática
 */
window.iniciarVerificacaoAutomatica = async function() {
    try {
        const contractAddress = localStorage.getItem('tokenAddress');
        const sourceCode = localStorage.getItem('contratoSource');
        const compilerVersion = localStorage.getItem('resolvedCompilerVersion') || '0.8.19';
        
        if (!contractAddress) {
            alert('❌ Endereço do contrato não encontrado. Faça o deploy primeiro.');
            return;
        }
        
        if (!sourceCode) {
            alert('❌ Código fonte não encontrado. Compile o contrato primeiro.');
            return;
        }

        console.log('🚀 Iniciando verificação automática com Etherscan V2...');
        console.log('- Contrato:', contractAddress);
        console.log('- Código:', sourceCode.length, 'caracteres');
        console.log('- Compilador:', compilerVersion);

        // Detectar contrato automaticamente
        const contractName = await detectContractNameFromSource(sourceCode, contractAddress);
        console.log('🎯 Contrato detectado:', contractName);

        // Detectar Chain ID
        const chainId = await detectCurrentChainId();
        console.log('🌐 Chain ID detectado:', chainId);

        // Atualizar status na UI
        updateVerificationStatus('🚀 Iniciando verificação automática...', 'info');
        updateVerificationStatus(`🎯 Contrato detectado: ${contractName}`, 'info');
        updateVerificationStatus(`🌐 Rede: Chain ID ${chainId}`, 'info');

        // **USAR NOVA API ETHERSCAN V2**
        if (window.etherscanV2Verification) {
            console.log('✅ Usando Etherscan V2 API...');
            
            const result = await window.etherscanV2Verification.verifyContract(
                contractAddress,
                sourceCode,
                contractName,
                compilerVersion,
                chainId
            );

            if (result.success) {
                updateVerificationStatus(`✅ ${result.message}`, 'success');
                
                if (result.guid) {
                    updateVerificationStatus(`📋 GUID: ${result.guid}`, 'info');
                    
                    // Monitorar status
                    monitorVerificationStatus(result.guid, chainId);
                    
                    if (result.checkUrl) {
                        updateVerificationStatus(`🔗 <a href="${result.checkUrl}" target="_blank">Verificar status aqui</a>`, 'info');
                    }
                }
                
                return result;
            } else {
                throw new Error(result.error || 'Falha na verificação V2');
            }
        } else {
            // Fallback para sistema antigo
            console.log('⚠️ Etherscan V2 não disponível, usando sistema legado...');
            updateVerificationStatus('⚠️ Usando API legada...', 'warning');
            
            await window.autoVerification.verificarContrato(
                contractAddress,
                sourceCode,
                compilerVersion,
                false // optimization disabled
            );
        }

    } catch (error) {
        console.error('❌ Erro na verificação automática:', error);
        updateVerificationStatus(`❌ Erro: ${error.message}`, 'error');
        
        // Mostrar opção de verificação manual
        showManualVerificationFallback();
    }
};

/**
 * Detecta nome do contrato a partir do código fonte
 */
async function detectContractNameFromSource(sourceCode, contractAddress) {
    // 1. Usar detector se disponível
    if (window.contractDetector) {
        try {
            const networkConfig = await getCurrentNetworkConfig();
            const compiledBytecode = localStorage.getItem('contratoBytecode');
            
            const detection = await window.contractDetector.autoDetectContract(
                contractAddress,
                compiledBytecode,
                networkConfig,
                sourceCode
            );
            
            if (detection && detection.name) {
                return detection.name;
            }
        } catch (error) {
            console.warn('⚠️ Detector falhou:', error);
        }
    }

    // 2. Extrair do código fonte
    const contractMatches = sourceCode.match(/contract\s+(\w+)/g);
    if (contractMatches) {
        const contractNames = contractMatches.map(match => 
            match.replace('contract ', '').trim()
        );

        // Priorizar USDT018 (baseado no erro BSCScan)
        if (contractNames.includes('USDT018')) {
            return 'USDT018';
        }

        // Filtrar interfaces
        const mainContracts = contractNames.filter(name => 
            !['IERC20', 'ERC20', 'Context', 'Ownable'].includes(name)
        );

        if (mainContracts.length > 0) {
            return mainContracts[0];
        }
    }

    return 'USDT018'; // Fallback
}

/**
 * Detecta Chain ID atual
 */
async function detectCurrentChainId() {
    try {
        if (window.ethereum) {
            const chainId = await window.ethereum.request({ method: 'eth_chainId' });
            return parseInt(chainId, 16);
        }
    } catch (error) {
        console.warn('⚠️ Erro ao detectar chain ID:', error);
    }
    
    return 56; // BSC Mainnet fallback
}

/**
 * Monitora status da verificação
 */
async function monitorVerificationStatus(guid, chainId) {
    let attempts = 0;
    const maxAttempts = 20;
    
    const checkStatus = async () => {
        if (attempts >= maxAttempts) {
            updateVerificationStatus('⏰ Timeout na verificação. Verifique manualmente.', 'warning');
            return;
        }

        try {
            if (window.etherscanV2Verification) {
                const status = await window.etherscanV2Verification.checkVerificationStatus(guid, chainId);
                
                updateVerificationStatus(`📊 ${status.message}`, 
                    status.status === 'success' ? 'success' : 
                    status.status === 'error' ? 'error' : 'info'
                );

                if (status.status === 'success') {
                    updateVerificationStatus('🎉 Verificação concluída!', 'success');
                    return;
                } else if (status.status === 'error') {
                    showManualVerificationFallback();
                    return;
                } else {
                    attempts++;
                    setTimeout(checkStatus, 30000); // 30 segundos
                }
            }
        } catch (error) {
            console.error('❌ Erro ao verificar status:', error);
            updateVerificationStatus(`⚠️ Erro ao verificar: ${error.message}`, 'warning');
        }
    };

    // Primeira verificação em 10 segundos
    setTimeout(checkStatus, 10000);
}

/**
 * Atualiza status na UI
 */
function updateVerificationStatus(message, type) {
    const statusDiv = document.getElementById('verificationStatus');
    if (statusDiv) {
        const alertClass = {
            'info': 'alert-info',
            'success': 'alert-success',
            'error': 'alert-danger',
            'warning': 'alert-warning'
        }[type] || 'alert-info';

        statusDiv.innerHTML += `<div class="alert ${alertClass} mt-2">${message}</div>`;
        statusDiv.scrollTop = statusDiv.scrollHeight;
    }
}

/**
 * Mostra opção de verificação manual como fallback
 */
function showManualVerificationFallback() {
    updateVerificationStatus(`
        <div class="alert alert-warning mt-3">
            <h6>⚠️ Verificação Automática Falhou</h6>
            <p>Use a verificação manual copiando os dados exibidos acima e colando na BSCScan.</p>
            <p><strong>Dica:</strong> Use o contrato <code>USDT018</code> como nome do contrato.</p>
        </div>
    `, 'warning');
}

/**
 * Obtém configuração da rede atual
 */
async function getCurrentNetworkConfig() {
    if (window.etherscanV2Verification) {
        return await window.etherscanV2Verification.getCurrentNetworkConfig();
    }
    
    // Fallback
    return {
        name: 'BSC Mainnet',
        apiUrl: 'https://api.bscscan.com/api',
        explorerUrl: 'https://bscscan.com'
    };
}

console.log('✅ Sistema de verificação automática carregado!');
