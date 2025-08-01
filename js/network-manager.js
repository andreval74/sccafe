// Gerenciador de Redes - Detecta e gerencia informações de blockchain
// Versão 2.2.0 - Sistema de detecção automática de rede + network-commons

import { findNetworkByChainId, initNetworkCommons, getNetworkInfo } from './network-commons.js';

export let currentNetwork = null;
export let deployedContract = null;

/**
 * Detecta a rede atual conectada no MetaMask
 */
export async function detectCurrentNetwork() {
  try {
    if (!window.ethereum) {
      console.log('❌ MetaMask não encontrada');
      return null;
    }

    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const network = await provider.getNetwork();
    
    // Busca informações detalhadas da rede
    const networkInfo = await getNetworkInfo(network.chainId);
    
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

    console.log('🔗 Rede detectada:', currentNetwork);
    return currentNetwork;

  } catch (error) {
    console.error('❌ Erro ao detectar rede:', error);
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
  const networkDisplay = document.getElementById('networkDisplay'); // Campo oculto
  const networkValue = document.getElementById('networkValue');
  const walletStatus = document.getElementById('wallet-status');
  const inputOwner = document.getElementById('ownerAddress');
  
  if (currentNetwork) {
    // Atualiza o campo oculto (para compatibilidade)
    if (networkDisplay) {
      networkDisplay.value = currentNetwork.name;
    }
    
    // Atualiza o campo oculto com dados completos para o sistema
    if (networkValue) {
      networkValue.value = JSON.stringify({
        chainId: currentNetwork.chainId,
        name: currentNetwork.name,
        blockExplorer: currentNetwork.blockExplorer
      });
    }
    
    // Atualiza o status da carteira para incluir rede
    if (walletStatus && inputOwner && inputOwner.value) {
      const address = inputOwner.value;
      walletStatus.value = `Conectado: ${address.slice(0, 6)}...${address.slice(-4)} | ${currentNetwork.name}`;
    }
    
    console.log('✅ Interface atualizada com rede:', currentNetwork.name);
  } else {
    // Estado desconectado
    if (networkDisplay) {
      networkDisplay.value = '';
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
 */
export function setupNetworkMonitoring() {
  if (!window.ethereum) return;

  // Detecta rede inicial
  detectCurrentNetwork().then(() => {
    updateNetworkInfo(); // Usa a nova função
  });

  // Monitora mudanças de rede
  window.ethereum.on('chainChanged', async (chainId) => {
    console.log('🔄 Rede alterada para:', parseInt(chainId, 16));
    await detectCurrentNetwork();
    updateNetworkInfo(); // Usa a nova função
  });

  // Monitora mudanças de conta
  window.ethereum.on('accountsChanged', async (accounts) => {
    if (accounts.length > 0) {
      console.log('👤 Conta alterada para:', accounts[0]);
      await detectCurrentNetwork();
      updateNetworkInfo(); // Usa a nova função
    }
  });
}
