/**
 * Sistema de Verificação Automática usando Etherscan API V2
 * Suporta múltiplas chains com uma única API key
 */

class EtherscanV2Verification {
    constructor() {
        this.baseUrl = 'https://api.etherscan.io/v2/api';
        this.fallbackUrls = {
            56: 'https://api.bscscan.com/api', // BSC Mainnet
            97: 'https://api-testnet.bscscan.com/api', // BSC Testnet
            1: 'https://api.etherscan.io/api', // Ethereum Mainnet
            11155111: 'https://api-sepolia.etherscan.io/api' // Sepolia Testnet
        };
        
        this.chainIds = {
            'bsc': 56,
            'bsc-testnet': 97,
            'ethereum': 1,
            'sepolia': 11155111
        };
    }

    /**
     * Verifica contrato usando Etherscan V2 API
     */
    async verifyContract(contractAddress, sourceCode, contractName, compilerVersion, chainId = 56) {
        try {
            console.log('🚀 Iniciando verificação via Etherscan V2 API...');
            console.log(`📍 Chain ID: ${chainId}`);
            console.log(`📝 Contrato: ${contractName}`);
            console.log(`⚙️ Compiler: ${compilerVersion}`);

            // Preparar dados de verificação
            const verificationData = this.prepareVerificationData(
                contractAddress, 
                sourceCode, 
                contractName, 
                compilerVersion
            );

            // BSC Testnet (97) não suporta V2 API - ir direto para V1
            if (chainId === 97) {
                console.log('📍 BSC Testnet detectado - usando API V1 diretamente (V2 não suportada)');
                const v1Result = await this.submitV1Verification(verificationData, chainId);
                return v1Result;
            }

            // Tentar V2 API primeiro para outras chains
            const v2Result = await this.submitV2Verification(verificationData, chainId);
            if (v2Result.success) {
                return v2Result;
            }

            console.log('⚠️ V2 API falhou, tentando API V1 fallback...');

            // Fallback para V1 API específica da chain
            const v1Result = await this.submitV1Verification(verificationData, chainId);
            return v1Result;

        } catch (error) {
            console.error('❌ Erro na verificação:', error);
            return {
                success: false,
                error: error.message,
                details: 'Falha na verificação automática'
            };
        }
    }

    /**
     * Prepara dados para verificação
     */
    prepareVerificationData(contractAddress, sourceCode, contractName, compilerVersion) {
        // Limpa e formata o código fonte
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

        return {
            contractaddress: contractAddress.toLowerCase(),
            sourceCode: cleanSourceCode,
            codeformat: 'solidity-single-file',
            contractname: contractName,
            compilerversion: formattedVersion,
            optimizationUsed: '0', // Sem otimização conforme seu setup
            runs: '0',
            constructorArguements: '', // Vazio se não tem argumentos do constructor
            evmversion: 'default',
            licenseType: '3' // MIT License
        };
    }

    /**
     * Submete verificação usando API V2
     */
    async submitV2Verification(verificationData, chainId) {
        try {
            console.log('📡 Tentando verificação via Etherscan V2 API...');

            // Obter API key
            const apiKey = this.getApiKey(chainId);
            if (!apiKey) {
                throw new Error('API Key não encontrada');
            }

            // Preparar dados para V2
            const formData = new FormData();
            formData.append('chainid', chainId.toString());
            formData.append('module', 'contract');
            formData.append('action', 'verifysourcecode');
            formData.append('apikey', apiKey);

            // Adicionar todos os dados de verificação
            Object.keys(verificationData).forEach(key => {
                formData.append(key, verificationData[key]);
            });

            const response = await fetch(this.baseUrl, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();
            console.log('📊 Resposta V2 API:', result);

            if (result.status === '1') {
                return {
                    success: true,
                    guid: result.result,
                    message: 'Verificação submetida com sucesso via V2 API',
                    checkUrl: this.getCheckUrl(result.result, chainId)
                };
            } else {
                throw new Error(result.result || 'Erro na verificação V2');
            }

        } catch (error) {
            console.error('❌ Erro na V2 API:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Submete verificação usando API V1 (fallback)
     */
    async submitV1Verification(verificationData, chainId) {
        try {
            console.log('📡 Tentando verificação via API V1 (fallback)...');

            const apiUrl = this.fallbackUrls[chainId];
            if (!apiUrl) {
                throw new Error(`Chain ID ${chainId} não suportada no fallback`);
            }

            // Obter API key
            const apiKey = this.getApiKey(chainId);
            if (!apiKey) {
                throw new Error('API Key não encontrada');
            }

            console.log('🔍 Debug API V1:');
            console.log('- URL:', apiUrl);
            console.log('- API Key (primeiros 8):', apiKey.substring(0, 8) + '...');
            console.log('- Contract Address:', verificationData.contractaddress);
            console.log('- Contract Name:', verificationData.contractname);

            // Teste simples da API Key primeiro
            console.log('🔍 Testando API Key com query simples...');
            const testUrl = `${apiUrl}?module=stats&action=ethsupply&apikey=${apiKey}`;
            try {
                const testResponse = await fetch(testUrl);
                const testResult = await testResponse.json();
                console.log('🧪 Teste da API Key:', testResult);
                
                if (testResult.status === '0' && testResult.message === 'NOTOK') {
                    console.error('❌ API Key inválida para BSC Testnet:', testResult.result);
                    throw new Error(`API Key inválida: ${testResult.result}`);
                }
            } catch (testError) {
                console.warn('⚠️ Teste da API Key falhou:', testError.message);
                // Continua mesmo assim para tentar a verificação
            }

            // Preparar dados para V1
            const formData = new FormData();
            formData.append('module', 'contract');
            formData.append('action', 'verifysourcecode');
            formData.append('apikey', apiKey);

            // Adicionar todos os dados de verificação
            Object.keys(verificationData).forEach(key => {
                formData.append(key, verificationData[key]);
            });

            console.log('📤 Enviando dados para verificação...');
            const response = await fetch(apiUrl, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();
            console.log('📊 Resposta V1 API:', result);

            if (result.status === '1') {
                return {
                    success: true,
                    guid: result.result,
                    message: 'Verificação submetida com sucesso via V1 API',
                    checkUrl: this.getCheckUrl(result.result, chainId)
                };
            } else {
                throw new Error(result.result || 'Erro na verificação V1');
            }

        } catch (error) {
            console.error('❌ Erro na V1 API:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Verifica status da verificação
     */
    async checkVerificationStatus(guid, chainId) {
        try {
            const apiKey = this.getApiKey(chainId);
            if (!apiKey) {
                throw new Error('API Key não encontrada');
            }

            // Tentar V2 primeiro
            const v2Url = `${this.baseUrl}?chainid=${chainId}&module=contract&action=checkverifystatus&guid=${guid}&apikey=${apiKey}`;
            
            try {
                const v2Response = await fetch(v2Url);
                if (v2Response.ok) {
                    const v2Result = await v2Response.json();
                    if (v2Result.status) {
                        return this.parseVerificationStatus(v2Result);
                    }
                }
            } catch (v2Error) {
                console.log('⚠️ V2 status check falhou, tentando V1...');
            }

            // Fallback para V1
            const v1Url = this.fallbackUrls[chainId];
            if (v1Url) {
                const v1Response = await fetch(`${v1Url}?module=contract&action=checkverifystatus&guid=${guid}&apikey=${apiKey}`);
                if (v1Response.ok) {
                    const v1Result = await v1Response.json();
                    return this.parseVerificationStatus(v1Result);
                }
            }

            throw new Error('Não foi possível verificar o status');

        } catch (error) {
            console.error('❌ Erro ao verificar status:', error);
            return {
                status: 'error',
                message: error.message
            };
        }
    }

    /**
     * Interpreta status de verificação
     */
    parseVerificationStatus(result) {
        if (result.status === '1') {
            if (result.result === 'Pass - Verified') {
                return {
                    status: 'success',
                    message: '✅ Contrato verificado com sucesso!'
                };
            } else if (result.result === 'Pending in queue') {
                return {
                    status: 'pending',
                    message: '⏳ Verificação em andamento...'
                };
            } else {
                return {
                    status: 'processing',
                    message: `🔄 ${result.result}`
                };
            }
        } else {
            return {
                status: 'error',
                message: `❌ ${result.result || 'Erro na verificação'}`
            };
        }
    }

    /**
     * Obtém URL para verificar status
     */
    getCheckUrl(guid, chainId) {
        const baseUrls = {
            56: 'https://bscscan.com',
            97: 'https://testnet.bscscan.com',
            1: 'https://etherscan.io',
            11155111: 'https://sepolia.etherscan.io'
        };
        
        const baseUrl = baseUrls[chainId] || 'https://bscscan.com';
        return `${baseUrl}/verifyContract?guid=${guid}`;
    }

    /**
     * Obtém API key do localStorage ou config com rotação
     */
    getApiKey(chainId = 56) {
        // Usar o gerenciador de API keys se disponível
        if (window.apiKeyManager) {
            const networkMap = {
                56: 'bscscan',
                97: 'bscscan',
                1: 'etherscan',
                11155111: 'etherscan',
                137: 'polygonscan',
                250: 'fantom'
            };
            
            const network = networkMap[chainId] || 'bscscan';
            
            // Tentar obter próxima API key do pool
            const apiKey = window.apiKeyManager.getNextApiKey(network);
            console.log('🔑 API Key obtida do apiKeyManager:', apiKey ? apiKey.substring(0, 8) + '...' : 'NENHUMA');
            if (apiKey && apiKey !== 'YourApiKeyToken') {
                return apiKey;
            }
        }

        // Fallback para localStorage direto
        let apiKey = localStorage.getItem('bscscanApiKey') || localStorage.getItem('etherscanApiKey');
        console.log('🔑 API Key obtida do localStorage:', apiKey ? apiKey.substring(0, 8) + '...' : 'NENHUMA');
        
        // Se não encontrar, tenta chaves comuns ou configuração do projeto
        if (!apiKey) {
            // Verifica se há uma chave configurada no network-manager
            if (window.networkManager && window.networkManager.getCurrentNetworkConfig) {
                try {
                    const config = window.networkManager.getCurrentNetworkConfig();
                    if (config && config.apiKey && config.apiKey !== 'YourApiKeyToken') {
                        apiKey = config.apiKey;
                    }
                } catch (error) {
                    console.warn('Erro ao obter API key do network manager:', error);
                }
            }
        }
        
        // Fallback final: API Key padrão fornecida
        if (!apiKey || apiKey === 'YourApiKeyToken') {
            // API Keys melhoradas por rede
            const defaultKeys = {
                56: 'YDB3T4YT72PHNQHPD2GXUKP7URFPJ44XJQ',  // BSC Mainnet
                97: 'YDB3T4YT72PHNQHPD2GXUKP7URFPJ44XJQ',  // BSC Testnet
                1: 'I33WZ4CVTPWDG3VEJWN36TQ9USU9QUBVX5',   // Ethereum
                11155111: 'I33WZ4CVTPWDG3VEJWN36TQ9USU9QUBVX5' // Sepolia
            };
            
            apiKey = defaultKeys[chainId] || defaultKeys[56];
            console.log('🔑 Usando API Key padrão integrada no sistema para chain', chainId);
        }
        
        console.log('🔑 API Key final para verificação:', apiKey ? apiKey.substring(0, 8) + '...' : 'NENHUMA');
        return apiKey;
    }

    /**
     * Detecta chain ID atual
     */
    async detectChainId() {
        try {
            if (window.ethereum) {
                const chainId = await window.ethereum.request({ method: 'eth_chainId' });
                return parseInt(chainId, 16);
            }
        } catch (error) {
            console.error('Erro ao detectar chain ID:', error);
        }
        
        // Fallback para BSC
        return 56;
    }

    /**
     * Obtém configuração da rede atual
     */
    async getCurrentNetworkConfig() {
        const chainId = await this.detectChainId();
        
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
            },
            1: {
                name: 'Ethereum Mainnet',
                apiUrl: 'https://api.etherscan.io/api',
                explorerUrl: 'https://etherscan.io'
            },
            11155111: {
                name: 'Sepolia Testnet',
                apiUrl: 'https://api-sepolia.etherscan.io/api',
                explorerUrl: 'https://sepolia.etherscan.io'
            }
        };

        return configs[chainId] || configs[56];
    }
}

// Instância global
window.etherscanV2Verification = new EtherscanV2Verification();

console.log('✅ Etherscan V2 Verification System carregado!');
