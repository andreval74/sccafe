/**
 * 🌐 NETWORK DETECTOR - MÓDULO COMPARTILHADO
 * 
 * 📍 RESPONSABILIDADES:
 * - Detectar rede blockchain atual
 * - Validar se rede é suportada
 * - Fornecer informações detalhadas da rede
 * - Mapear explorers e APIs por rede
 * 
 * 🔗 USADO POR:
 * - Módulos que precisam de informações específicas da rede
 * - Sistema de verificação de contratos
 * - Sistema de deploy
 * 
 * 📤 EXPORTS:
 * - NetworkDetector: Classe principal
 * - detectCurrentNetwork(): Detecta rede atual
 * - getNetworkInfo(): Informações detalhadas
 * - getSupportedNetworks(): Lista de redes suportadas
 */

// ==================== CONFIGURAÇÕES DE REDES ====================

/**
 * Configurações completas das redes suportadas
 */
const NETWORK_CONFIGS = {
  // BSC Mainnet
  56: {
    chainId: 56,
    chainIdHex: '0x38',
    name: 'BNB Smart Chain Mainnet',
    shortName: 'BSC',
    symbol: 'BNB',
    decimals: 18,
    
    // URLs da rede
    rpcUrls: [
      'https://bsc-dataseed.binance.org/',
      'https://bsc-dataseed1.binance.org/',
      'https://bsc-dataseed2.binance.org/'
    ],
    
    // Exploradores
    explorers: {
      primary: 'https://bscscan.com',
      name: 'BscScan'
    },
    
    // APIs de verificação
    verification: {
      apiUrl: 'https://api.bscscan.com/api',
      apiKeyRequired: true,
      supportedCompilers: ['0.8.19', '0.8.20', '0.8.21']
    },
    
    // Configurações específicas
    isTestnet: false,
    isSupported: true,
    gasPrice: {
      fast: 5,
      standard: 3,
      safe: 1
    }
  },
  
  // BSC Testnet
  97: {
    chainId: 97,
    chainIdHex: '0x61',
    name: 'BNB Smart Chain Testnet',
    shortName: 'BSC Testnet',
    symbol: 'tBNB',
    decimals: 18,
    
    rpcUrls: [
      'https://data-seed-prebsc-1-s1.binance.org:8545/',
      'https://data-seed-prebsc-2-s1.binance.org:8545/'
    ],
    
    explorers: {
      primary: 'https://testnet.bscscan.com',
      name: 'BscScan Testnet'
    },
    
    verification: {
      apiUrl: 'https://api-testnet.bscscan.com/api',
      apiKeyRequired: true,
      supportedCompilers: ['0.8.19', '0.8.20', '0.8.21']
    },
    
    isTestnet: true,
    isSupported: true,
    gasPrice: {
      fast: 10,
      standard: 5,
      safe: 3
    }
  },
  
  // Ethereum Mainnet
  1: {
    chainId: 1,
    chainIdHex: '0x1',
    name: 'Ethereum Mainnet',
    shortName: 'Ethereum',
    symbol: 'ETH',
    decimals: 18,
    
    rpcUrls: [
      'https://mainnet.infura.io/v3/',
      'https://eth-mainnet.alchemyapi.io/v2/'
    ],
    
    explorers: {
      primary: 'https://etherscan.io',
      name: 'Etherscan'
    },
    
    verification: {
      apiUrl: 'https://api.etherscan.io/api',
      apiKeyRequired: true,
      supportedCompilers: ['0.8.19', '0.8.20', '0.8.21']
    },
    
    isTestnet: false,
    isSupported: true,
    gasPrice: {
      fast: 30,
      standard: 20,
      safe: 15
    }
  },
  
  // Ethereum Sepolia
  11155111: {
    chainId: 11155111,
    chainIdHex: '0xaa36a7',
    name: 'Ethereum Sepolia',
    shortName: 'Sepolia',
    symbol: 'ETH',
    decimals: 18,
    
    rpcUrls: [
      'https://sepolia.infura.io/v3/',
      'https://eth-sepolia.g.alchemy.com/v2/'
    ],
    
    explorers: {
      primary: 'https://sepolia.etherscan.io',
      name: 'Sepolia Etherscan'
    },
    
    verification: {
      apiUrl: 'https://api-sepolia.etherscan.io/api',
      apiKeyRequired: true,
      supportedCompilers: ['0.8.19', '0.8.20', '0.8.21']
    },
    
    isTestnet: true,
    isSupported: true,
    gasPrice: {
      fast: 5,
      standard: 3,
      safe: 1
    }
  }
};

// ==================== CLASSE PRINCIPAL ====================

/**
 * Classe para detectar e gerenciar informações de rede
 */
class NetworkDetector {
  constructor() {
    this.currentNetwork = null;
    this.isConnected = false;
    
    // Configurações
    this.config = {
      showDebugLogs: true,
      autoDetect: true,
      cacheResults: true,
      cacheTime: 30000 // 30 segundos
    };
    
    // Cache
    this.cache = {
      lastDetection: null,
      lastResult: null,
      timestamp: null
    };
    
    // Eventos
    this.onNetworkChange = null;
    this.onNetworkDetected = null;
    
    this.log('Network Detector inicializado');
  }
  
  /**
   * Sistema de logging
   */
  log(message, type = 'info') {
    if (this.config.showDebugLogs) {
      const timestamp = new Date().toLocaleTimeString();
      const prefix = {
        info: '🌐',
        success: '✅',
        warning: '⚠️',
        error: '❌',
        debug: '🔧'
      }[type] || '📋';
      
      console.log(`${prefix} [NETWORK ${timestamp}] ${message}`);
    }
  }
  
  /**
   * Detecta a rede atual via MetaMask
   */
  async detectCurrentNetwork() {
    this.log('Detectando rede atual...');
    
    try {
      // Verificar cache
      if (this.config.cacheResults && this.cache.lastResult && this.cache.timestamp) {
        const timeDiff = Date.now() - this.cache.timestamp;
        if (timeDiff < this.config.cacheTime) {
          this.log('Usando resultado do cache', 'debug');
          return this.cache.lastResult;
        }
      }
      
      // Verificar se há provider Web3
      if (typeof window.ethereum === 'undefined') {
        throw new Error('Provedor Web3 não encontrado (instale MetaMask)');
      }
      
      // Obter chainId atual
      const chainId = await window.ethereum.request({
        method: 'eth_chainId'
      });
      
      const chainIdDecimal = parseInt(chainId, 16);
      
      // Buscar configuração da rede
      const networkConfig = NETWORK_CONFIGS[chainIdDecimal];
      
      const result = {
        chainId: chainIdDecimal,
        chainIdHex: chainId,
        isSupported: !!networkConfig,
        isTestnet: networkConfig ? networkConfig.isTestnet : false,
        config: networkConfig || null,
        detectedAt: new Date().toISOString()
      };
      
      // Adicionar informações extras se rede conhecida
      if (networkConfig) {
        result.name = networkConfig.name;
        result.shortName = networkConfig.shortName;
        result.symbol = networkConfig.symbol;
        result.explorerUrl = networkConfig.explorers.primary;
        result.verificationApiUrl = networkConfig.verification.apiUrl;
      } else {
        result.name = `Rede Desconhecida (${chainIdDecimal})`;
        result.shortName = `Unknown-${chainIdDecimal}`;
        result.symbol = 'ETH';
        result.explorerUrl = null;
        result.verificationApiUrl = null;
      }
      
      this.currentNetwork = result;
      this.isConnected = true;
      
      // Atualizar cache
      if (this.config.cacheResults) {
        this.cache.lastResult = result;
        this.cache.timestamp = Date.now();
      }
      
      this.log(`Rede detectada: ${result.name} (${result.chainId})`, 'success');
      
      // Callback
      if (this.onNetworkDetected) {
        this.onNetworkDetected(result);
      }
      
      return result;
      
    } catch (error) {
      this.log(`Erro na detecção: ${error.message}`, 'error');
      this.isConnected = false;
      throw error;
    }
  }
  
  /**
   * Obtém informações detalhadas da rede atual
   */
  async getNetworkInfo(chainId = null) {
    const targetChainId = chainId || (this.currentNetwork ? this.currentNetwork.chainId : null);
    
    if (!targetChainId) {
      await this.detectCurrentNetwork();
      return this.currentNetwork;
    }
    
    const config = NETWORK_CONFIGS[targetChainId];
    
    if (!config) {
      return {
        chainId: targetChainId,
        isSupported: false,
        name: `Rede Desconhecida (${targetChainId})`,
        error: 'Rede não suportada'
      };
    }
    
    return {
      ...config,
      isCurrentNetwork: this.currentNetwork ? this.currentNetwork.chainId === targetChainId : false
    };
  }
  
  /**
   * Verifica se a rede atual é suportada
   */
  async isNetworkSupported(chainId = null) {
    const targetChainId = chainId || (this.currentNetwork ? this.currentNetwork.chainId : null);
    
    if (!targetChainId) {
      await this.detectCurrentNetwork();
      return this.currentNetwork ? this.currentNetwork.isSupported : false;
    }
    
    return !!NETWORK_CONFIGS[targetChainId];
  }
  
  /**
   * Obtém URL do explorador para endereço/transação
   */
  getExplorerUrl(addressOrTx, type = 'address', chainId = null) {
    const targetChainId = chainId || (this.currentNetwork ? this.currentNetwork.chainId : null);
    
    if (!targetChainId) {
      this.log('ChainId não disponível para explorador', 'warning');
      return null;
    }
    
    const config = NETWORK_CONFIGS[targetChainId];
    if (!config) {
      this.log(`Rede ${targetChainId} não suportada para explorador`, 'warning');
      return null;
    }
    
    const baseUrl = config.explorers.primary;
    const pathMap = {
      address: 'address',
      transaction: 'tx',
      tx: 'tx',
      token: 'token',
      contract: 'address'
    };
    
    const path = pathMap[type] || 'address';
    return `${baseUrl}/${path}/${addressOrTx}`;
  }
  
  /**
   * Obtém configuração da API de verificação
   */
  getVerificationConfig(chainId = null) {
    const targetChainId = chainId || (this.currentNetwork ? this.currentNetwork.chainId : null);
    
    if (!targetChainId) {
      return null;
    }
    
    const config = NETWORK_CONFIGS[targetChainId];
    return config ? config.verification : null;
  }
  
  /**
   * Lista todas as redes suportadas
   */
  getSupportedNetworks() {
    return Object.values(NETWORK_CONFIGS).map(config => ({
      chainId: config.chainId,
      name: config.name,
      shortName: config.shortName,
      symbol: config.symbol,
      isTestnet: config.isTestnet,
      explorerName: config.explorers.name
    }));
  }
  
  /**
   * Filtra redes por critério
   */
  getNetworksByType(isTestnet = false) {
    return Object.values(NETWORK_CONFIGS)
      .filter(config => config.isTestnet === isTestnet)
      .map(config => ({
        chainId: config.chainId,
        name: config.name,
        shortName: config.shortName,
        symbol: config.symbol
      }));
  }
  
  /**
   * Configura monitoramento de mudanças de rede
   */
  setupNetworkMonitoring() {
    if (typeof window.ethereum === 'undefined') {
      this.log('MetaMask não disponível para monitoramento', 'warning');
      return;
    }
    
    this.log('Configurando monitoramento de rede...', 'debug');
    
    window.ethereum.on('chainChanged', async (chainId) => {
      const chainIdDecimal = parseInt(chainId, 16);
      this.log(`Rede alterada para: ${chainIdDecimal}`);
      
      // Limpar cache
      this.cache.lastResult = null;
      this.cache.timestamp = null;
      
      // Detectar nova rede
      try {
        const newNetwork = await this.detectCurrentNetwork();
        
        if (this.onNetworkChange) {
          this.onNetworkChange(newNetwork);
        }
        
      } catch (error) {
        this.log(`Erro ao detectar nova rede: ${error.message}`, 'error');
      }
    });
    
    this.log('Monitoramento configurado', 'success');
  }
  
  /**
   * Obtém preço de gas recomendado
   */
  getGasPrice(priority = 'standard', chainId = null) {
    const targetChainId = chainId || (this.currentNetwork ? this.currentNetwork.chainId : null);
    
    if (!targetChainId) {
      return null;
    }
    
    const config = NETWORK_CONFIGS[targetChainId];
    if (!config || !config.gasPrice) {
      return null;
    }
    
    return config.gasPrice[priority] || config.gasPrice.standard;
  }
  
  /**
   * Verifica se rede requer API key para verificação
   */
  requiresApiKey(chainId = null) {
    const verificationConfig = this.getVerificationConfig(chainId);
    return verificationConfig ? verificationConfig.apiKeyRequired : false;
  }
  
  /**
   * Obtém compilers suportados pela rede
   */
  getSupportedCompilers(chainId = null) {
    const verificationConfig = this.getVerificationConfig(chainId);
    return verificationConfig ? verificationConfig.supportedCompilers : [];
  }
}

// ==================== INSTÂNCIA GLOBAL ====================

/**
 * Instância global do detector
 */
window.networkDetector = new NetworkDetector();

// ==================== FUNÇÕES DE CONVENIÊNCIA ====================

/**
 * Função rápida para detectar rede
 */
async function detectCurrentNetwork() {
  console.log('🌐 [QUICK-DETECT] Detectando rede...');
  
  try {
    const result = await window.networkDetector.detectCurrentNetwork();
    console.log('✅ [QUICK-DETECT] Rede detectada:', result);
    return result;
  } catch (error) {
    console.error('❌ [QUICK-DETECT] Erro:', error.message);
    throw error;
  }
}

/**
 * Função rápida para obter informações da rede
 */
async function getNetworkInfo(chainId = null) {
  return await window.networkDetector.getNetworkInfo(chainId);
}

/**
 * Função rápida para verificar se rede é suportada
 */
async function isNetworkSupported(chainId = null) {
  return await window.networkDetector.isNetworkSupported(chainId);
}

/**
 * Função rápida para obter URL do explorador
 */
function getExplorerUrl(addressOrTx, type = 'address', chainId = null) {
  return window.networkDetector.getExplorerUrl(addressOrTx, type, chainId);
}

/**
 * Função rápida para listar redes suportadas
 */
function getSupportedNetworks() {
  return window.networkDetector.getSupportedNetworks();
}

/**
 * Função para obter redes mainnet ou testnet
 */
function getMainnetNetworks() {
  return window.networkDetector.getNetworksByType(false);
}

function getTestnetNetworks() {
  return window.networkDetector.getNetworksByType(true);
}

/**
 * Exibe modal de rede não suportada
 */
function showUnsupportedNetworkModal(currentNetwork) {
  const modal = document.createElement('div');
  modal.className = 'modal fade';
  modal.id = 'unsupportedNetworkModal';
  modal.innerHTML = `
    <div class="modal-dialog">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title">
            <i class="bi bi-exclamation-triangle text-warning me-2"></i>Rede Não Suportada
          </h5>
          <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
        </div>
        <div class="modal-body">
          <div class="alert alert-warning">
            <h6>Rede Atual: ${currentNetwork.name}</h6>
            <p>Esta rede não é suportada pela plataforma SCCAFE.</p>
          </div>
          
          <h6>Redes Suportadas:</h6>
          <ul class="list-group list-group-flush">
            ${getSupportedNetworks().map(network => `
              <li class="list-group-item d-flex justify-content-between">
                <span>
                  <strong>${network.name}</strong>
                  ${network.isTestnet ? '<small class="text-muted ms-1">(Testnet)</small>' : ''}
                </span>
                <small class="text-muted">${network.symbol}</small>
              </li>
            `).join('')}
          </ul>
          
          <div class="mt-3">
            <small class="text-muted">
              <i class="bi bi-info-circle me-1"></i>
              Troque para uma dessas redes no MetaMask para continuar.
            </small>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
            Entendi
          </button>
        </div>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  const bootstrapModal = new bootstrap.Modal(modal);
  bootstrapModal.show();
  
  // Remover modal quando fechado
  modal.addEventListener('hidden.bs.modal', () => {
    modal.remove();
  });
}

/**
 * Configuração automática de eventos de rede
 */
function setupNetworkChangeEvents() {
  const detector = window.networkDetector;
  
  // Atualizar elementos que mostram nome da rede
  detector.onNetworkChange = (network) => {
    const networkElements = document.querySelectorAll('[data-network-name]');
    networkElements.forEach(el => {
      el.textContent = network.name;
    });
    
    const networkShortElements = document.querySelectorAll('[data-network-short]');
    networkShortElements.forEach(el => {
      el.textContent = network.shortName;
    });
    
    const networkSymbolElements = document.querySelectorAll('[data-network-symbol]');
    networkSymbolElements.forEach(el => {
      el.textContent = network.symbol;
    });
    
    // Alertar se rede não suportada
    if (!network.isSupported) {
      setTimeout(() => {
        showUnsupportedNetworkModal(network);
      }, 1000);
    }
  };
  
  console.log('🔧 [NETWORK] Eventos de rede configurados');
}

// ==================== INICIALIZAÇÃO AUTOMÁTICA ====================

document.addEventListener('DOMContentLoaded', function() {
  console.log('🌐 [NETWORK] Network Detector carregado');
  
  // Configurar eventos
  setupNetworkChangeEvents();
  
  // Configurar monitoramento se disponível
  if (window.networkDetector.config.autoDetect) {
    setTimeout(() => {
      window.networkDetector.setupNetworkMonitoring();
    }, 1000);
  }
});

// ==================== EXPORTS GLOBAIS ====================

// Disponibilizar funções globalmente
window.detectCurrentNetwork = detectCurrentNetwork;
window.getNetworkInfo = getNetworkInfo;
window.isNetworkSupported = isNetworkSupported;
window.getExplorerUrl = getExplorerUrl;
window.getSupportedNetworks = getSupportedNetworks;
window.getMainnetNetworks = getMainnetNetworks;
window.getTestnetNetworks = getTestnetNetworks;
window.showUnsupportedNetworkModal = showUnsupportedNetworkModal;
window.setupNetworkChangeEvents = setupNetworkChangeEvents;

console.log('✅ [NETWORK] Network Detector inicializado');
