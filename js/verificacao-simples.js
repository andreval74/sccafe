// Verificação Simples - Foco nos dados essenciais para verificação manual
import { detectContract } from './shared/contract-detector-global.js';

// Estado da aplicação
let isConnected = false;
let currentNetwork = null;
let currentAccount = null;

// Inicialização
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Verificação Simples carregada');
    checkMetaMaskConnection();
});

// Verificar conexão do MetaMask
async function checkMetaMaskConnection() {
    if (typeof window.ethereum !== 'undefined') {
        try {
            const accounts = await window.ethereum.request({ method: 'eth_accounts' });
            if (accounts.length > 0) {
                currentAccount = accounts[0];
                isConnected = true;
                await updateNetworkInfo();
                updateConnectionStatus();
            }
        } catch (error) {
            console.log('📱 MetaMask não conectado');
        }
    }
}

// Conectar MetaMask
window.conectarMetaMask = async function() {
    if (typeof window.ethereum === 'undefined') {
        alert('MetaMask não encontrado! Por favor, instale o MetaMask.');
        return;
    }

    try {
        console.log('🔗 Conectando ao MetaMask...');
        const accounts = await window.ethereum.request({ 
            method: 'eth_requestAccounts' 
        });
        
        if (accounts.length > 0) {
            currentAccount = accounts[0];
            isConnected = true;
            await updateNetworkInfo();
            updateConnectionStatus();
            console.log('✅ MetaMask conectado:', currentAccount);
        }
    } catch (error) {
        console.error('❌ Erro ao conectar MetaMask:', error);
        alert('Erro ao conectar com MetaMask: ' + error.message);
    }
};

// Atualizar informações da rede
async function updateNetworkInfo() {
    try {
        const chainId = await window.ethereum.request({ method: 'eth_chainId' });
        const networkNames = {
            '0x1': 'Ethereum Mainnet',
            '0x38': 'BSC Mainnet', 
            '0x61': 'BSC Testnet',
            '0x89': 'Polygon Mainnet'
        };
        currentNetwork = networkNames[chainId] || `Rede ${parseInt(chainId, 16)}`;
        console.log('🌐 Rede atual:', currentNetwork);
    } catch (error) {
        console.error('❌ Erro ao obter rede:', error);
        currentNetwork = 'Desconhecida';
    }
}

// Atualizar status de conexão na interface
function updateConnectionStatus() {
    const connectionStatus = document.getElementById('connection-status');
    const networkStatus = document.getElementById('network-status');
    
    if (isConnected) {
        connectionStatus.textContent = `Conectado: ${currentAccount.slice(0, 6)}...${currentAccount.slice(-4)}`;
        connectionStatus.className = 'badge bg-success';
        networkStatus.textContent = currentNetwork;
        networkStatus.className = 'badge bg-info ms-2';
    } else {
        connectionStatus.textContent = 'Desconectado';
        connectionStatus.className = 'badge bg-secondary';
        networkStatus.textContent = '-';
        networkStatus.className = 'badge bg-secondary ms-2';
    }
}

// Colar endereço da área de transferência
window.colarEndereco = async function() {
    try {
        const text = await navigator.clipboard.readText();
        if (text && text.match(/^0x[a-fA-F0-9]{40}$/)) {
            document.getElementById('contract-address').value = text.trim();
            console.log('📋 Endereço colado:', text);
        } else {
            alert('Texto na área de transferência não é um endereço válido');
        }
    } catch (error) {
        console.error('❌ Erro ao colar:', error);
        alert('Erro ao acessar área de transferência');
    }
};

// Detectar contrato - função principal
window.detectarContrato = async function() {
    const addressInput = document.getElementById('contract-address');
    const address = addressInput.value.trim();
    
    // Validação básica
    if (!address) {
        alert('Por favor, informe o endereço do contrato');
        addressInput.focus();
        return;
    }
    
    if (!address.match(/^0x[a-fA-F0-9]{40}$/)) {
        alert('Endereço inválido. Use o formato: 0x...');
        addressInput.focus();
        return;
    }

    // Mostrar loading
    showLoading(true);
    hideResults();
    
    try {
        console.log('🔍 Detectando contrato:', address);
        
        // Detectar dados do contrato
        const contractData = await detectContract(address);
        
        if (contractData && contractData.address) {
            console.log('✅ Contrato detectado:', contractData);
            displayResults(contractData);
        } else {
            throw new Error('Contrato não encontrado ou não é um token válido');
        }
        
    } catch (error) {
        console.error('❌ Erro na detecção:', error);
        alert(`Erro ao detectar contrato: ${error.message}`);
    } finally {
        showLoading(false);
    }
};

// Exibir resultados na interface simplificada
function displayResults(data) {
    // Preencher campos básicos
    document.getElementById('contract-name').value = data.name || 'N/A';
    document.getElementById('contract-symbol').value = data.symbol || 'N/A';
    document.getElementById('contract-address-result').value = data.address || data.contractAddress || '';
    document.getElementById('owner-address').value = data.owner || data.ownerAddress || 'Não detectado';
    
    // Dados de compilação
    document.getElementById('compiler-version').value = data.compilerVersion || 'N/A';
    document.getElementById('optimization').value = data.optimizerRuns ? 
        `Sim (${data.optimizerRuns} runs)` : 'Não especificado';
    document.getElementById('evm-version').value = data.evmVersion || 'default';
    document.getElementById('license-type').value = data.licenseType || 'None';
    
    // Argumentos do construtor
    const constructorArgs = data.constructorArguments || '';
    if (constructorArgs && constructorArgs !== '0x') {
        document.getElementById('constructor-arguments').value = constructorArgs;
        document.getElementById('constructor-section').style.display = 'block';
    } else {
        document.getElementById('constructor-section').style.display = 'none';
    }
    
    // Código fonte
    document.getElementById('source-code').value = data.sourcecode || 
        data.sourceCode || 'Código fonte não disponível';
    
    // Mostrar seção de resultados
    showResults();
    
    console.log('✅ Interface atualizada com dados do contrato');
}

// Controle de interface
function showLoading(show) {
    document.getElementById('loading-status').style.display = show ? 'block' : 'none';
}

function showResults() {
    document.getElementById('result-section').style.display = 'block';
    document.getElementById('result-section').scrollIntoView({ behavior: 'smooth' });
}

function hideResults() {
    document.getElementById('result-section').style.display = 'none';
}

// Copiar texto para área de transferência
window.copiarTexto = async function(elementId) {
    try {
        const element = document.getElementById(elementId);
        const text = element.value || element.textContent;
        
        await navigator.clipboard.writeText(text);
        
        // Feedback visual
        const originalBg = element.style.backgroundColor;
        element.style.backgroundColor = '#d4edda';
        setTimeout(() => {
            element.style.backgroundColor = originalBg;
        }, 500);
        
        console.log('📋 Texto copiado:', text.slice(0, 50) + '...');
    } catch (error) {
        console.error('❌ Erro ao copiar:', error);
        alert('Erro ao copiar texto');
    }
};

// Abrir no explorador
window.abrirEtherscan = function() {
    const address = document.getElementById('contract-address-result').value;
    if (!address) return;
    
    // Determinar URL baseado na rede
    let explorerUrl = '';
    if (currentNetwork && currentNetwork.includes('BSC')) {
        explorerUrl = currentNetwork.includes('Testnet') ? 
            'https://testnet.bscscan.com' : 'https://bscscan.com';
    } else if (currentNetwork && currentNetwork.includes('Polygon')) {
        explorerUrl = 'https://polygonscan.com';
    } else {
        explorerUrl = 'https://etherscan.io';
    }
    
    window.open(`${explorerUrl}/address/${address}`, '_blank');
};

// Adicionar token ao MetaMask
window.adicionarAoMetaMask = async function() {
    if (!isConnected) {
        alert('Conecte-se ao MetaMask primeiro');
        return;
    }
    
    const address = document.getElementById('contract-address-result').value;
    const symbol = document.getElementById('contract-symbol').value;
    const name = document.getElementById('contract-name').value;
    
    if (!address || !symbol) {
        alert('Dados do token incompletos');
        return;
    }
    
    try {
        await window.ethereum.request({
            method: 'wallet_watchAsset',
            params: {
                type: 'ERC20',
                options: {
                    address: address,
                    symbol: symbol,
                    decimals: 18,
                    image: ''
                }
            }
        });
        
        console.log('✅ Token adicionado ao MetaMask');
    } catch (error) {
        console.error('❌ Erro ao adicionar token:', error);
        alert('Erro ao adicionar token ao MetaMask');
    }
};

// Limpar formulário
window.limparFormulario = function() {
    document.getElementById('contract-address').value = '';
    hideResults();
    document.getElementById('contract-address').focus();
};

// Listener para mudanças de rede no MetaMask
if (typeof window.ethereum !== 'undefined') {
    window.ethereum.on('chainChanged', () => {
        window.location.reload();
    });
    
    window.ethereum.on('accountsChanged', (accounts) => {
        if (accounts.length === 0) {
            isConnected = false;
            currentAccount = null;
            updateConnectionStatus();
        } else {
            currentAccount = accounts[0];
            updateConnectionStatus();
        }
    });
}

console.log('📋 Verificação Simples - Sistema pronto para uso');
