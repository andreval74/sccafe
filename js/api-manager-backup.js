/**
 * API Manager para Etherscan/BSCScan
 * Handles contract detection and verification
 */

// Configuração das APIs
const API_CONFIG = {
    etherscan: {
        url: 'https://api.etherscan.io/api',
        key: 'I33WZ4CVTPWDG3VEJWN36TQ9USU9QUBVX5',
        chainId: 1,
        name: 'Ethereum'
    },
    bscscan: {
        url: 'https://api.bscscan.com/api',
        key: 'I33WZ4CVTPWDG3VEJWN36TQ9USU9QUBVX5',
        chainId: 56,
        name: 'BNB Smart Chain'
    },
    bsctestnet: {
        url: 'https://api-testnet.bscscan.com/api',
        key: 'I33WZ4CVTPWDG3VEJWN36TQ9USU9QUBVX5',
        chainId: 97,
        name: 'BNB Testnet'
    }
};

/**
 * Detecta informações do contrato usando API - tenta múltiplas redes
 */
/**
 * Verifica se um endereço existe como carteira comum (não contrato)
 */
async function checkAddressExists(address) {
    const networks = ['bscscan', 'etherscan'];
    
    for (const networkName of networks) {
        const config = API_CONFIG[networkName];
        const url = `${config.url}?module=account&action=balance&address=${address}&tag=latest&apikey=${config.key}`;
        
        try {
            console.log(`🔍 Verificando existência do endereço em ${config.name}...`);
            
            const response = await fetch(url);
            const data = await response.json();
            
            console.log(`📊 Resposta balance API ${config.name}:`, data);
            
            if (data.status === '1') {
                // Endereço existe (tem saldo, mesmo que 0)
                console.log(`✅ Endereço existe em ${config.name} com saldo: ${data.result}`);
                
                // Verificar se tem código (é contrato)
                const codeUrl = `${config.url}?module=proxy&action=eth_getCode&address=${address}&tag=latest&apikey=${config.key}`;
                const codeResponse = await fetch(codeUrl);
                const codeData = await codeResponse.json();
                
                console.log(`📝 Código do endereço:`, codeData);
                
                if (codeData.result === '0x') {
                    // Sem código = carteira comum
                    return { found: true, network: config.name, isContract: false };
                } else {
                    // Com código = contrato
                    return { found: true, network: config.name, isContract: true };
                }
            }
        } catch (error) {
            console.log(`❌ Erro ao verificar endereço em ${config.name}:`, error.message);
        }
    }
    
    return { found: false, network: null, isContract: false };
}

export async function detectContract(address, preferredNetwork = 'bscscan') {
    console.log(`🔍 Detectando contrato ${address}...`);
    
    // Lista de redes para tentar em ordem de prioridade
    const networks = [preferredNetwork];
    
    // Adiciona outras redes se não foram especificadas como preferidas
    if (preferredNetwork !== 'etherscan') networks.push('etherscan');
    if (preferredNetwork !== 'bscscan') networks.push('bscscan');
    if (preferredNetwork !== 'bsctestnet') networks.push('bsctestnet');

    let lastError = null;

    for (const networkName of networks) {
        const config = API_CONFIG[networkName];
        if (!config) continue;

        try {
            console.log(`🌐 Tentando detectar na rede: ${config.name}`);
            
            // 1. Busca informações básicas do contrato
            const contractInfo = await getContractInfo(address, config);
            
            if (!contractInfo) {
                console.log(`❌ Contrato não encontrado em ${config.name}`);
                continue;
            }

            console.log(`✅ Contrato encontrado em ${config.name}!`);

            // 2. Se for um token ERC-20/BEP-20, busca dados específicos
            const tokenInfo = await getTokenInfo(address, config);

            // 3. Combina as informações
            return {
                address: address,
                name: tokenInfo?.name || contractInfo.ContractName || 'Token Desconhecido',
                symbol: tokenInfo?.symbol || 'TKN', 
                decimals: tokenInfo?.decimals || '18',
                totalSupply: tokenInfo?.totalSupply || '0',
                owner: contractInfo.Implementation || '0x0000000000000000000000000000000000000000',
                verified: contractInfo.ABI !== 'Contract source code not verified',
                compiler: contractInfo.CompilerVersion || 'v0.8.19+commit.7dd6d404',
                optimization: contractInfo.OptimizationUsed === '1',
                network: config.name,
                sourceCode: contractInfo.SourceCode || '',
                abi: contractInfo.ABI || '',
                chainId: config.chainId
            };

        } catch (error) {
            console.log(`❌ Erro ao verificar ${config.name}:`, error.message);
            lastError = error;
            continue;
        }
    }

    // Se chegou aqui, não encontrou contrato em nenhuma rede
    console.log('🔄 Verificando se endereço existe como carteira comum...');
    
    const addressExists = await checkAddressExists(address);
    if (addressExists.found && !addressExists.isContract) {
        const message = `Endereço ${address} encontrado na rede ${addressExists.network}, mas não é um contrato inteligente. Este é um endereço de carteira comum (sem código de contrato).`;
        console.warn(`⚠️ ${message}`);
        throw new Error(message);
    }
    
    console.error('❌ Contrato não encontrado em nenhuma rede suportada');
    throw new Error('Contrato não encontrado em nenhuma rede suportada');
}

/**
 * Busca informações básicas do contrato
 */
async function getContractInfo(address, config) {
    const url = `${config.url}?module=contract&action=getsourcecode&address=${address}&apikey=${config.key}`;
    
    try {
        console.log(`🔍 Buscando info do contrato em ${config.name}:`, url);
        
        const response = await fetch(url);
        const data = await response.json();
        
        console.log(`📊 Resposta da API ${config.name}:`, data);
        
        if (data.status === '1' && data.result && data.result[0]) {
            const contractData = data.result[0];
            
            // Verifica se o contrato realmente existe (ABI não vazio indica existência)
            if (contractData.ABI && contractData.ABI !== '') {
                console.log(`✅ Contrato encontrado em ${config.name}`);
                return contractData;
            } else {
                console.log(`⚠️ Contrato existe mas sem ABI em ${config.name}`);
                return contractData; // Retorna mesmo sem ABI para tentar outras informações
            }
        }
        
        // Se não encontrou via getsourcecode, tenta verificar se existe via eth_getCode
        console.log(`🔄 Tentando verificação alternativa em ${config.name}...`);
        const codeExists = await checkContractExists(address, config);
        
        if (codeExists) {
            console.log(`✅ Contrato existe em ${config.name} mas sem source code`);
            // Retorna dados básicos mesmo sem source code
            return {
                ContractName: 'Contrato Detectado',
                ABI: 'Contract source code not verified',
                SourceCode: '',
                CompilerVersion: 'Unknown'
            };
        }
        
        console.log(`❌ Contrato não encontrado em ${config.name} - Status: ${data.status}`);
        return null;
        
    } catch (error) {
        console.error(`❌ Erro na requisição para ${config.name}:`, error);
        throw error;
    }
}

/**
 * Verifica se contrato existe através do bytecode
 */
async function checkContractExists(address, config) {
    try {
        const url = `${config.url}?module=proxy&action=eth_getCode&address=${address}&tag=latest&apikey=${config.key}`;
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.status === '1' && data.result && data.result !== '0x') {
            return true; // Contrato existe (tem bytecode)
        }
        
        return false;
    } catch (error) {
        console.log(`Erro ao verificar bytecode em ${config.name}:`, error);
        return false;
    }
}

/**
 * Busca informações específicas de token ERC-20/BEP-20
 */
async function getTokenInfo(address, config) {
    try {
        console.log(`🪙 Tentando obter dados de token ERC-20 para ${address}...`);
        
        // Tenta obter informações básicas do token
        const tokenCalls = await Promise.allSettled([
            callContractFunction(address, 'name()', config),
            callContractFunction(address, 'symbol()', config),
            callContractFunction(address, 'decimals()', config),
            callContractFunction(address, 'totalSupply()', config)
        ]);

        const [nameResult, symbolResult, decimalsResult, totalSupplyResult] = tokenCalls;
        
        // Processa os resultados mesmo se alguns falharam
        const tokenInfo = {
            name: nameResult.status === 'fulfilled' ? hexToString(nameResult.value) : null,
            symbol: symbolResult.status === 'fulfilled' ? hexToString(symbolResult.value) : null,
            decimals: decimalsResult.status === 'fulfilled' ? parseInt(decimalsResult.value, 16).toString() : '18',
            totalSupply: totalSupplyResult.status === 'fulfilled' ? 
                formatTokenAmount(parseInt(totalSupplyResult.value, 16), 
                    decimalsResult.status === 'fulfilled' ? parseInt(decimalsResult.value, 16) : 18) : '0'
        };
        
        console.log(`📊 Dados do token obtidos:`, tokenInfo);
        
        // Se conseguiu pelo menos o nome ou símbolo, considera sucesso
        if (tokenInfo.name || tokenInfo.symbol) {
            return tokenInfo;
        }
        
        console.log('⚠️ Não conseguiu obter dados básicos do token');
        return null;

    } catch (error) {
        console.log('❌ Erro ao obter dados do token:', error.message);
        return null;
    }
}

/**
 * Chama função específica do contrato
 */
async function callContractFunction(address, functionSig, config) {
    const url = `${config.url}?module=proxy&action=eth_call&to=${address}&data=${getFunctionHash(functionSig)}&tag=latest&apikey=${config.key}`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.status === '1' && data.result) {
        return data.result;
    }
    
    throw new Error(`Erro ao chamar ${functionSig}`);
}

/**
 * Submete contrato para verificação
 */
export async function submitContractVerification(contractData, network = 'bscscan') {
    const config = API_CONFIG[network];
    if (!config) {
        throw new Error(`Rede ${network} não suportada`);
    }

    const formData = new FormData();
    formData.append('module', 'contract');
    formData.append('action', 'verifysourcecode');
    formData.append('apikey', config.key);
    formData.append('chainId', config.chainId.toString());
    
    // Dados obrigatórios
    formData.append('contractaddress', contractData.address);
    formData.append('sourceCode', contractData.sourceCode);
    formData.append('codeformat', 'solidity-single-file');
    formData.append('contractname', contractData.contractName || 'Token');
    formData.append('compilerversion', contractData.compilerVersion);
    
    // Dados opcionais
    if (contractData.constructorArguments) {
        formData.append('constructorArguments', contractData.constructorArguments);
    }
    
    formData.append('optimizationUsed', contractData.optimization ? '1' : '0');
    if (contractData.optimization && contractData.runs) {
        formData.append('runs', contractData.runs.toString());
    }

    try {
        const response = await fetch(config.url, {
            method: 'POST',
            body: formData
        });

        const result = await response.json();
        
        if (result.status === '1') {
            return {
                success: true,
                guid: result.result,
                message: 'Verificação submetida com sucesso'
            };
        } else {
            return {
                success: false,
                error: result.result || 'Erro desconhecido',
                message: 'Falha na submissão da verificação'
            };
        }
    } catch (error) {
        return {
            success: false,
            error: error.message,
            message: 'Erro de conexão com a API'
        };
    }
}

/**
 * Verifica status da verificação
 */
export async function checkVerificationStatus(guid, network = 'bscscan') {
    const config = API_CONFIG[network];
    const url = `${config.url}?module=contract&action=checkverifystatus&guid=${guid}&apikey=${config.key}`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    return {
        status: data.status,
        result: data.result
    };
}

/**
 * Funções utilitárias
 */
function getFunctionHash(signature) {
    // Simplified - in real implementation, use proper keccak256
    const hashes = {
        'name()': '0x06fdde03',
        'symbol()': '0x95d89b41',
        'decimals()': '0x313ce567',
        'totalSupply()': '0x18160ddd'
    };
    return hashes[signature] || '0x';
}

function hexToString(hex) {
    if (!hex || hex === '0x') return '';
    
    try {
        // Remove 0x and decode hex to string
        const cleanHex = hex.replace('0x', '');
        let str = '';
        for (let i = 0; i < cleanHex.length; i += 2) {
            const charCode = parseInt(cleanHex.substr(i, 2), 16);
            if (charCode !== 0) {
                str += String.fromCharCode(charCode);
            }
        }
        return str.trim();
    } catch (error) {
        return hex;
    }
}

function formatTokenAmount(amount, decimals) {
    if (decimals === 0) return amount.toString();
    
    const divisor = Math.pow(10, decimals);
    const formatted = (amount / divisor).toLocaleString('pt-BR');
    return formatted;
}

/**
 * Determina a rede baseada no chainId atual
 */
export function getNetworkFromChainId(chainId) {
    const networks = {
        1: 'etherscan',
        56: 'bscscan',
        97: 'bsctestnet'
    };
    
    return networks[chainId] || 'bscscan';
}
