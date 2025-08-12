// Gerenciador de Redes - Detecta e gerencia informações de blockchain
// Versão 2.2.0 - Sistema de detecção automática de rede + network-commons

// import { findNetworkByChainId, initNetworkCommons, getNetworkInfo } from './network-commons.js';

export let currentNetwork = null;
export let deployedContract = null;

/**
 * Detecta a rede atual conectada no MetaMask
 */
export async function detectCurrentNetwork() {
  console.log('🌐 [DEBUG] detectCurrentNetwork iniciado');
  
  try {
    if (!window.ethereum) {
      console.log('❌ [DEBUG] MetaMask não encontrada');
      return null;
    }

    console.log('🔍 [DEBUG] Criando provider...');
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const network = await provider.getNetwork();
    
    console.log('✅ [DEBUG] Rede detectada:', network);
    
    // Busca informações detalhadas da rede
    console.log('🔍 [DEBUG] Buscando informações da rede...');
    // const networkInfo = await getNetworkInfo(network.chainId);
    console.log('✅ [DEBUG] Informações da rede carregadas');
    
    // Criar networkInfo básico para substituir função removida
    const networkMap = {
      1: { name: 'Ethereum Mainnet', explorers: [{ url: 'https://etherscan.io' }], nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 } },
      5: { name: 'Goerli Testnet', explorers: [{ url: 'https://goerli.etherscan.io' }], nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 } },
      56: { name: 'BSC Mainnet', explorers: [{ url: 'https://bscscan.com' }], nativeCurrency: { name: 'BNB', symbol: 'BNB', decimals: 18 } },
      97: { name: 'BSC Testnet', explorers: [{ url: 'https://testnet.bscscan.com' }], nativeCurrency: { name: 'BNB', symbol: 'BNB', decimals: 18 } },
      137: { name: 'Polygon Mainnet', explorers: [{ url: 'https://polygonscan.com' }], nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 } },
      80001: { name: 'Mumbai Testnet', explorers: [{ url: 'https://mumbai.polygonscan.com' }], nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 } }
    };
    
    const networkInfo = networkMap[network.chainId] || {
      name: network.name || `Chain ${network.chainId}`,
      explorers: [],
      nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 }
    };
    
    // Mapeia para exploradores de bloco conhecidos para verificação
    const verificationEndpoints = {
      1: "https://api.etherscan.io/api",
      5: "https://api-goerli.etherscan.io/api", 
      11155111: "https://api-sepolia.etherscan.io/api",
      56: "https://api.bscscan.com/api",
      97: "https://api-testnet.bscscan.com/api",
      137: "https://api.polygonscan.com/api",
      80001: "https://api-testnet.polygonscan.com/api",
      43114: "https://api.snowtrace.io/api",
      43113: "https://api-testnet.snowtrace.io/api",
      250: "https://api.ftmscan.com/api",
      4002: "https://api-testnet.ftmscan.com/api",
      42161: "https://api.arbiscan.io/api",
      421613: "https://api-goerli.arbiscan.io/api",
      10: "https://api-optimistic.etherscan.io/api",
      8453: "https://api.basescan.org/api",
      84531: "https://api-goerli.basescan.org/api"
    };

    const blockExplorer = networkInfo.explorers && networkInfo.explorers.length > 0 
      ? networkInfo.explorers[0].url 
      : null;

    currentNetwork = {
      chainId: network.chainId,
      name: networkInfo.name,
      blockExplorer: blockExplorer,
      verificationEndpoint: verificationEndpoints[network.chainId] || null,
      isSupported: !!verificationEndpoints[network.chainId],
      nativeCurrency: networkInfo.nativeCurrency
    };

    console.log('🔗 [DEBUG] Rede detectada e configurada:', currentNetwork);
    console.log('✅ [DEBUG] detectCurrentNetwork concluído com sucesso');
    return currentNetwork;

  } catch (error) {
    console.error('❌ [DEBUG] Erro ao detectar rede:', error);
    console.error('❌ [DEBUG] Stack trace:', error.stack);
    currentNetwork = null;
    return null;
  }
}

/**
 * Atualiza display da rede na interface
 */
export function updateNetworkDisplay(element) {
  if (!element) return;
  
  if (currentNetwork) {
    // Se for um input, usa value, senão usa textContent
    if (element.tagName === 'INPUT') {
      element.value = currentNetwork.name;
    } else {
      element.textContent = currentNetwork.name;
    }
    element.style.color = currentNetwork.isSupported !== false ? '#16924b' : '#b91c1c';
    
    if (currentNetwork.isSupported === false) {
      element.title = 'Rede não suportada para verificação automática';
    }
  } else {
    if (element.tagName === 'INPUT') {
      element.value = 'Não conectado';
    } else {
      element.textContent = 'Não conectado';
    }
  }
}

/**
 * Atualiza o novo layout com informação da rede
 */
export function updateNetworkInfo() {
  console.log('🔄 [DEBUG] updateNetworkInfo chamado');
  console.log('🔍 [DEBUG] currentNetwork:', currentNetwork);
  
  const networkDisplay = document.getElementById('network-display'); // Corrigido: era 'networkDisplay'
  const networkValue = document.getElementById('networkValue');
  const walletStatus = document.getElementById('wallet-status');
  const inputOwner = document.getElementById('ownerAddress');
  const networkStatus = document.getElementById('network-status');
  const currentNetworkSpan = document.getElementById('current-network'); // Novo elemento
  const chainIdDisplay = document.getElementById('chain-id-display'); // Container do Chain ID
  const chainIdValue = document.getElementById('chain-id-value'); // Valor do Chain ID
  const networkInfoSection = document.getElementById('network-info-section'); // Seção da informação de rede
  
  console.log('🔍 [DEBUG] Elementos encontrados:', {
    networkDisplay: !!networkDisplay,
    networkValue: !!networkValue,
    walletStatus: !!walletStatus,
    inputOwner: !!inputOwner,
    networkStatus: !!networkStatus,
    currentNetworkSpan: !!currentNetworkSpan,
    chainIdDisplay: !!chainIdDisplay,
    chainIdValue: !!chainIdValue,
    networkInfoSection: !!networkInfoSection
  });
  
  if (currentNetwork) {
    console.log('✅ [DEBUG] Atualizando com rede:', currentNetwork.name);
    
    // Mostra a seção de informações de rede apenas quando conectado
    if (networkInfoSection) {
      networkInfoSection.style.display = 'block';
      console.log('✅ [DEBUG] Seção de rede mostrada');
    }
    
    // Atualiza o campo visível da rede
    if (networkDisplay) {
      networkDisplay.value = currentNetwork.name;
      console.log('✅ [DEBUG] networkDisplay atualizado:', currentNetwork.name);
    }
    
    // Atualiza o status visual da rede
    if (networkStatus) {
      networkStatus.innerHTML = `<i class="bi bi-check-circle text-success"></i> Conectado`;
      console.log('✅ [DEBUG] networkStatus atualizado');
    }
    
    // Atualiza o span da rede atual na seção de conexão
    if (currentNetworkSpan) {
      currentNetworkSpan.textContent = currentNetwork.name;
      currentNetworkSpan.className = 'fw-bold'; // Remove text-success para manter cinza
      console.log('✅ [DEBUG] current-network span atualizado:', currentNetwork.name);
    }
    
    // Mostra o Chain ID ao lado da rede
    if (chainIdDisplay && chainIdValue) {
      chainIdValue.textContent = currentNetwork.chainId;
      chainIdDisplay.style.display = 'inline';
      console.log('✅ [DEBUG] Chain ID exibido:', currentNetwork.chainId);
    }
    
    // Atualiza o campo oculto com dados completos para o sistema
    if (networkValue) {
      const networkData = {
        chainId: currentNetwork.chainId,
        name: currentNetwork.name,
        blockExplorer: currentNetwork.blockExplorer
      };
      networkValue.value = JSON.stringify(networkData);
      console.log('✅ [DEBUG] networkValue atualizado:', networkData);
    }
    
    // Atualiza o status da carteira para mostrar endereço completo quando conectado
    if (walletStatus && inputOwner && inputOwner.value) {
      const address = inputOwner.value;
      walletStatus.value = address; // Endereço completo
      walletStatus.classList.add('wallet-status-connected');
      console.log('✅ [DEBUG] walletStatus atualizado com endereço completo:', address);
    }
    
    console.log('✅ [DEBUG] Interface atualizada com rede:', currentNetwork.name);
  } else {
    console.log('⚠️ [DEBUG] currentNetwork é null, limpando campos');
    
    // Estado desconectado - esconde Chain ID
    if (chainIdDisplay) {
      chainIdDisplay.style.display = 'none';
    }
    
    if (currentNetworkSpan) {
      currentNetworkSpan.textContent = 'Não conectado';
      currentNetworkSpan.className = 'fw-bold'; // Mantém cinza também para desconectado
    }
    
    // Estado desconectado
    if (networkDisplay) {
      networkDisplay.value = '';
      networkDisplay.placeholder = 'Será detectado após conectar';
    }
    
    if (networkStatus) {
      networkStatus.innerHTML = `<i class="bi bi-search text-muted"></i> Detectando...`;
    }
    
    if (networkValue) {
      networkValue.value = '';
    }
    
    if (walletStatus) {
      walletStatus.value = 'Clique em "Conectar" para iniciar';
    }
  }
}

/**
 * Salva informações do contrato deployado
 */
export function saveDeployedContract(address, abi, bytecode, sourceCode, compilerVersion, contractName) {
  deployedContract = {
    address,
    abi,
    bytecode,
    sourceCode,
    compilerVersion,
    contractName,
    network: currentNetwork,
    deployTime: new Date().toISOString(),
    explorerUrl: currentNetwork?.blockExplorer ? `${currentNetwork.blockExplorer}/address/${address}` : null
  };
  
  console.log('💾 Contrato deployado salvo:', deployedContract);
  
  // Salva no localStorage para persistência
  localStorage.setItem('lastDeployedContract', JSON.stringify(deployedContract));
  
  return deployedContract;
}

/**
 * Tenta verificação automática do contrato
 */
export async function autoVerifyContract() {
  if (!deployedContract || !currentNetwork?.verificationEndpoint) {
    console.log('❌ Verificação automática não disponível');
    return { success: false, reason: 'Rede não suportada ou contrato não deployado' };
  }

  try {
    console.log('🔄 Tentando verificação automática...');
    
    // Parâmetros para verificação
    const verificationParams = {
      apikey: 'YourApiKeyToken', // Usuário precisa configurar
      module: 'contract',
      action: 'verifysourcecode',
      contractaddress: deployedContract.address,
      sourceCode: deployedContract.sourceCode,
      codeformat: 'solidity-single-file',
      contractname: deployedContract.contractName,
      compilerversion: deployedContract.compilerVersion,
      optimizationUsed: '0',
      runs: '200',
      constructorArguements: '', // Vazio para tokens simples
    };

    // Tenta verificação via API do explorador
    const response = await fetch(currentNetwork.verificationEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams(verificationParams)
    });

    const result = await response.json();
    
    if (result.status === '1') {
      console.log('✅ Verificação automática enviada!');
      return { 
        success: true, 
        guid: result.result,
        message: 'Verificação enviada com sucesso! Aguarde alguns minutos para processamento.'
      };
    } else {
      console.log('❌ Verificação automática falhou:', result.result);
      return { 
        success: false, 
        reason: result.result || 'Erro desconhecido'
      };
    }

  } catch (error) {
    console.error('❌ Erro na verificação automática:', error);
    return { 
      success: false, 
      reason: 'Erro de conexão: ' + error.message
    };
  }
}

/**
 * Gera dados formatados para verificação manual
 */
export function getVerificationData() {
  if (!deployedContract) {
    return null;
  }

  return {
    contractAddress: deployedContract.address,
    contractName: deployedContract.contractName,
    compilerVersion: deployedContract.compilerVersion,
    optimization: 'No',
    runs: '200',
    sourceCode: deployedContract.sourceCode,
    abi: JSON.stringify(deployedContract.abi, null, 2),
    explorerUrl: deployedContract.explorerUrl,
    networkName: deployedContract.network?.name,
    verificationUrl: deployedContract.network?.blockExplorer ? 
      `${deployedContract.network.blockExplorer}/verifyContract?a=${deployedContract.address}` : null
  };
}

/**
 * Monitora mudanças de rede
 * NOTA: Listeners centralizados no wallet-connection.js
 */
export function setupNetworkMonitoring() {
  if (!window.ethereum) return;

  console.log('🎧 Network monitoring configurado (listeners centralizados no wallet-connection.js)');
  console.log('ℹ️ A detecção de rede será feita apenas após conexão da carteira');
  
  // NÃO configura listeners aqui - estão centralizados no wallet-connection.js
  // NÃO detecta rede inicial - só após conexão
}
