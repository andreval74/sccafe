/**
 * Módulo compartilhado para detecção de contratos
 */

// Configuração das APIs
const API_CONFIG = {
    etherscan: {
        name: 'Ethereum',
        url: 'https://api.etherscan.io/api',
        key: 'I33WZ4CVTPWDG3VEJWN36TQ9USU9QUBVX5',
        chainId: 1
    },
    bscscan: {
        name: 'BSC',
        url: 'https://api.bscscan.com/api',
        key: 'I33WZ4CVTPWDG3VEJWN36TQ9USU9QUBVX5',
        chainId: 56
    },
    bsctestnet: {
        name: 'BSC Testnet',
        url: 'https://api-testnet.bscscan.com/api',
        key: 'I33WZ4CVTPWDG3VEJWN36TQ9USU9QUBVX5',
        chainId: 97
    }
};

/**
 * Verifica se um endereço é válido
 */
function isValidAddress(address) {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
}

/**
 * Obtém method ID para chamadas de contrato
 */
function getMethodId(signature) {
    const methods = {
        'name()': '0x06fdde03',
        'symbol()': '0x95d89b41',
        'decimals()': '0x313ce567',
        'totalSupply()': '0x18160ddd'
    };
    return methods[signature] || '0x';
}

/**
 * Converte hex para string
 */
function hexToString(hex) {
    if (!hex || hex === '0x') return '';
    
    hex = hex.replace('0x', '');
    
    // Remove zeros à esquerda que são padding
    while (hex.length > 0 && hex.substring(0, 2) === '00') {
        hex = hex.substring(2);
    }
    
    let result = '';
    for (let i = 0; i < hex.length; i += 2) {
        const charCode = parseInt(hex.substr(i, 2), 16);
        if (charCode > 0 && charCode < 127) { // ASCII válido
            result += String.fromCharCode(charCode);
        }
    }
    
    return result.trim();
}

/**
 * Chama função do contrato
 */
async function callContract(address, data, config) {
    const url = `${config.url}?module=proxy&action=eth_call&to=${address}&data=${getMethodId(data)}&tag=latest&apikey=${config.key}`;
    
    const response = await fetch(url);
    const result = await response.json();
    
    if (result.status === '1' && result.result && result.result !== '0x') {
        if (data.includes('decimals') || data.includes('totalSupply')) {
            return parseInt(result.result, 16).toString();
        } else {
            return hexToString(result.result);
        }
    }
    
    throw new Error('Dados não encontrados');
}

/**
 * Busca informações de token ERC-20/BEP-20
 */
async function getTokenInfo(address, config) {
    try {
        console.log(`🪙 Buscando dados do token em ${config.name}...`);
        
        const [name, symbol, decimals, totalSupply] = await Promise.allSettled([
            callContract(address, 'name()', config),
            callContract(address, 'symbol()', config),
            callContract(address, 'decimals()', config),
            callContract(address, 'totalSupply()', config)
        ]);

        return {
            name: name.status === 'fulfilled' ? name.value : null,
            symbol: symbol.status === 'fulfilled' ? symbol.value : null,
            decimals: decimals.status === 'fulfilled' ? decimals.value : null,
            totalSupply: totalSupply.status === 'fulfilled' ? totalSupply.value : null
        };

    } catch (error) {
        console.log(`⚠️ Erro ao buscar dados do token:`, error.message);
        return null;
    }
}

/**
 * Obtém informações básicas do contrato
 */
async function getContractInfo(address, config) {
    const url = `${config.url}?module=contract&action=getsourcecode&address=${address}&apikey=${config.key}`;
    
    try {
        console.log(`🔍 Buscando info do contrato em ${config.name}...`);
        
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.status === '1' && data.result && data.result[0]) {
            const result = data.result[0];
            if (result.ContractName && result.ContractName !== '') {
                console.log(`✅ Contrato encontrado: ${result.ContractName}`);
                return result;
            }
        }
        
        return null;
        
    } catch (error) {
        console.error(`❌ Erro ao buscar contrato em ${config.name}:`, error);
        throw error;
    }
}

/**
 * Detecta contrato nas redes disponíveis e retorna suas informações
 */
export async function detectContract(address, preferredNetwork = 'bscscan') {
    console.log(`🔍 Detectando contrato ${address}...`);
    
    if (!isValidAddress(address)) {
        throw new Error('Endereço inválido');
    }

    // Lista de redes para tentar
    const networks = [preferredNetwork, 'bscscan', 'etherscan', 'bsctestnet']
        .filter((v, i, a) => a.indexOf(v) === i);

    for (const networkName of networks) {
        const config = API_CONFIG[networkName];
        if (!config) continue;

        try {
            console.log(`🌐 Tentando detectar na rede: ${config.name}`);
            
            const contractInfo = await getContractInfo(address, config);
            
            if (contractInfo && contractInfo.ContractName) {
                console.log(`✅ Contrato encontrado em ${config.name}!`);

                // Busca dados do token se for ERC-20/BEP-20
                const tokenInfo = await getTokenInfo(address, config);

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
            }
        } catch (error) {
            console.error(`❌ Erro ao detectar na rede ${config.name}:`, error);
        }
    }
    
    throw new Error('Contrato não encontrado em nenhuma rede suportada');
}
