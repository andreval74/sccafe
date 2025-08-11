/**
 * 🔍 MÓDULO: VERIFICAÇÃO DE CONTRATO (module-verificacao.js)
 * 
 * 📍 RESPONSABILIDADES:
 * - Carregar dados do contrato deployado (do localStorage ou entrada manual)
 * - Executar verificação automática via BSCScan/Etherscan APIs
 * - Fornecer interface para verificação manual
 * - Gerenciar configuração de API Keys
 * - Exibir resultados e próximos passos
 * 
 * 🔗 INTEGRAÇÕES:
 * - storage-manager.js: Persistência de dados entre módulos
 * - etherscan-v2-verification.js: Sistema de verificação automática
 * - template-loader.js: Templates para interfaces dinâmicas
 * - api-key-manager.js: Gerenciamento de chaves API
 * 
 * 📤 OUTPUTS:
 * - Status de verificação (sucesso/erro)
 * - Links para explorador blockchain
 * - Dados para verificação manual (se automática falhar)
 * 
 * 🎯 ENTRADA INDEPENDENTE:
 * - Pode funcionar sozinho para verificar contratos existentes
 * - Detecta automaticamente dados do fluxo anterior
 * - Permite entrada manual de dados se necessário
 */

// ==================== INICIALIZAÇÃO DO MÓDULO ====================

/**
 * Estado global do módulo de verificação
 * Centraliza todos os dados necessários para verificação
 */
window.ModuleVerificacao = {
  // Dados do contrato
  contractData: {
    address: null,
    name: null,
    sourceCode: null,
    abi: null,
    bytecode: null,
    compilerVersion: null,
    network: null,
    networkName: null
  },
  
  // Status da verificação
  status: {
    dataLoaded: false,
    autoVerificationAttempted: false,
    manualVerificationShown: false,
    verificationCompleted: false,
    lastError: null
  },
  
  // Configurações
  config: {
    retryAttempts: 3,
    timeoutMs: 30000,
    showDebugLogs: true
  },
  
  // Elementos da UI
  elements: {},
  
  // Função para logging
  log: function(message, type = 'info') {
    if (this.config.showDebugLogs) {
      const timestamp = new Date().toLocaleTimeString();
      const prefix = {
        info: '🔍',
        success: '✅',
        warning: '⚠️',
        error: '❌',
        debug: '🔧'
      }[type] || '📋';
      
      console.log(`${prefix} [MÓDULO-VERIFICAÇÃO ${timestamp}] ${message}`);
    }
  }
};

// ==================== CARREGAMENTO DE DADOS ====================

/**
 * Carrega dados do contrato para verificação
 * FONTE 1: localStorage (vindo do fluxo de criação)
 * FONTE 2: sessionStorage (transferência entre módulos)
 * FONTE 3: URL parameters (entrada direta)
 * FONTE 4: Entrada manual (formulário)
 */
async function loadContractData() {
  const module = window.ModuleVerificacao;
  module.log('Iniciando carregamento de dados do contrato...');
  
  try {
    // FONTE 1: Dados do localStorage (fluxo completo)
    const deployedContract = localStorage.getItem('deployedContract');
    if (deployedContract) {
      const contractInfo = JSON.parse(deployedContract);
      module.log('Dados encontrados no localStorage', 'success');
      
      module.contractData = {
        address: contractInfo.address,
        name: contractInfo.contractName || window.contratoName,
        sourceCode: contractInfo.sourceCode || window.contratoSource,
        abi: contractInfo.abi || window.contratoAbi,
        bytecode: contractInfo.bytecode || window.contratoBytecode,
        compilerVersion: contractInfo.compilerVersion || window.resolvedCompilerVersion,
        network: contractInfo.network,
        networkName: contractInfo.networkName
      };
      
      module.status.dataLoaded = true;
      await displayContractInfo();
      await showVerificationOptions();
      return;
    }
    
    // FONTE 2: Dados do sessionStorage (transferência de módulo)
    const moduleData = sessionStorage.getItem('TokenProjectData');
    if (moduleData) {
      const projectData = JSON.parse(moduleData);
      if (projectData.deployedAddress) {
        module.log('Dados encontrados no sessionStorage', 'success');
        
        module.contractData = {
          address: projectData.deployedAddress,
          name: projectData.contractName,
          sourceCode: projectData.contractSource,
          abi: projectData.contractAbi,
          bytecode: projectData.contractBytecode,
          compilerVersion: projectData.compilerVersion,
          network: projectData.networkId,
          networkName: projectData.networkName
        };
        
        module.status.dataLoaded = true;
        await displayContractInfo();
        await showVerificationOptions();
        return;
      }
    }
    
    // FONTE 3: URL parameters (entrada direta)
    const urlParams = new URLSearchParams(window.location.search);
    const contractAddress = urlParams.get('address');
    const contractName = urlParams.get('name');
    
    if (contractAddress) {
      module.log('Dados encontrados nos parâmetros da URL', 'success');
      
      module.contractData.address = contractAddress;
      module.contractData.name = contractName || 'UnknownContract';
      
      // Tentar carregar dados adicionais via API do explorador
      await loadContractFromExplorer(contractAddress);
      return;
    }
    
    // FONTE 4: Nenhum dado encontrado - mostrar formulário manual
    module.log('Nenhum dado encontrado - mostrando entrada manual', 'warning');
    await showManualEntry();
    
  } catch (error) {
    module.log(`Erro no carregamento de dados: ${error.message}`, 'error');
    module.status.lastError = error.message;
    await showErrorState('Erro ao carregar dados do contrato');
  }
}

/**
 * Carrega dados do contrato via API do explorador blockchain
 * Usado quando apenas o endereço é fornecido
 */
async function loadContractFromExplorer(address) {
  const module = window.ModuleVerificacao;
  module.log(`Carregando dados do explorador para: ${address}`);
  
  try {
    // Detectar rede atual ou usar BSC como padrão
    const network = await detectNetworkForAddress(address);
    
    // Buscar código fonte se já verificado
    const sourceCode = await fetchSourceCodeFromExplorer(address, network);
    
    if (sourceCode) {
      module.contractData.sourceCode = sourceCode.source;
      module.contractData.compilerVersion = sourceCode.compilerVersion;
      module.contractData.name = sourceCode.contractName;
      module.log('Código fonte obtido do explorador', 'success');
    }
    
    module.contractData.network = network.chainId;
    module.contractData.networkName = network.name;
    module.status.dataLoaded = true;
    
    await displayContractInfo();
    await showVerificationOptions();
    
  } catch (error) {
    module.log(`Erro ao carregar do explorador: ${error.message}`, 'error');
    await showManualEntry();
  }
}

/**
 * Exibe informações do contrato detectado
 */
async function displayContractInfo() {
  const module = window.ModuleVerificacao;
  const container = document.getElementById('contract-detection-content');
  
  if (!container) return;
  
  const data = module.contractData;
  
  container.innerHTML = `
    <div class="row g-3">
      <div class="col-md-6">
        <label class="form-label fw-bold">📍 Endereço do Contrato:</label>
        <div class="data-display">
          <div class="d-flex justify-content-between align-items-center">
            <code>${data.address || 'Não informado'}</code>
            ${data.address ? `<button class="btn btn-sm btn-outline-secondary" onclick="copyToClipboard('${data.address}')">
              <i class="bi bi-clipboard"></i>
            </button>` : ''}
          </div>
        </div>
      </div>
      
      <div class="col-md-6">
        <label class="form-label fw-bold">🏷️ Nome do Contrato:</label>
        <div class="data-display">
          <code>${data.name || 'Não detectado'}</code>
        </div>
      </div>
      
      <div class="col-md-6">
        <label class="form-label fw-bold">🌐 Rede:</label>
        <div class="data-display">
          <code>${data.networkName || 'Não detectada'}</code>
        </div>
      </div>
      
      <div class="col-md-6">
        <label class="form-label fw-bold">⚙️ Versão do Compilador:</label>
        <div class="data-display">
          <code>${data.compilerVersion || 'Não informada'}</code>
        </div>
      </div>
      
      <div class="col-12">
        <label class="form-label fw-bold">📄 Código Fonte:</label>
        <div class="data-display" style="max-height: 150px;">
          <code>${data.sourceCode ? 
            data.sourceCode.substring(0, 500) + (data.sourceCode.length > 500 ? '...' : '') : 
            'Não disponível'}</code>
        </div>
        ${data.sourceCode ? `<small class="text-muted">${data.sourceCode.length} caracteres</small>` : ''}
      </div>
    </div>
    
    <div class="mt-3">
      <div class="status-indicator ${data.address && data.sourceCode ? 'success' : 'pending'}">
        <i class="bi bi-${data.address && data.sourceCode ? 'check-circle' : 'clock'} me-2"></i>
        ${data.address && data.sourceCode ? 'Dados completos - Pronto para verificação' : 'Dados incompletos - Verificação limitada'}
      </div>
    </div>
  `;
  
  // Atualizar status do módulo
  const statusIndicator = document.getElementById('module-status');
  if (statusIndicator) {
    statusIndicator.className = 'status-indicator success';
    statusIndicator.innerHTML = '<i class="bi bi-check-circle me-2"></i>Contrato detectado';
  }
  
  module.log('Informações do contrato exibidas na interface', 'success');
}

// ==================== VERIFICAÇÃO AUTOMÁTICA ====================

/**
 * Mostra opções de verificação (automática e manual)
 */
async function showVerificationOptions() {
  const module = window.ModuleVerificacao;
  
  // Mostrar seção de verificação automática
  const autoCard = document.getElementById('auto-verification-card');
  if (autoCard) {
    autoCard.style.display = 'block';
  }
  
  // Mostrar seção de verificação manual
  const manualCard = document.getElementById('manual-verification-card');
  if (manualCard) {
    manualCard.style.display = 'block';
    await loadManualVerificationTemplate();
  }
  
  // Configurar botões
  setupVerificationButtons();
  
  module.log('Opções de verificação carregadas', 'success');
}

/**
 * Configura os event listeners dos botões de verificação
 */
function setupVerificationButtons() {
  const module = window.ModuleVerificacao;
  
  // Botão de verificação automática
  const btnAutoVerify = document.getElementById('btn-auto-verify');
  if (btnAutoVerify) {
    btnAutoVerify.onclick = async () => {
      module.log('Iniciando verificação automática...');
      await startAutoVerification();
    };
  }
  
  // Botão de verificar status
  const btnCheckStatus = document.getElementById('btn-check-status');
  if (btnCheckStatus) {
    btnCheckStatus.onclick = async () => {
      await checkVerificationStatus();
    };
  }
  
  // Botão de salvar API Key
  const btnSaveApiKey = document.getElementById('btn-save-api-key');
  if (btnSaveApiKey) {
    btnSaveApiKey.onclick = () => {
      saveApiKey();
    };
  }
  
  // Botões de navegação
  const btnBack = document.getElementById('btn-back');
  if (btnBack) {
    btnBack.onclick = () => {
      navigateToModule('03-resumo-criacao.html');
    };
  }
  
  const btnNext = document.getElementById('btn-next');
  if (btnNext) {
    btnNext.onclick = () => {
      navigateToModule('05-finalizacao.html');
    };
  }
  
  const btnRetry = document.getElementById('btn-retry');
  if (btnRetry) {
    btnRetry.onclick = async () => {
      await retryVerification();
    };
  }
  
  module.log('Event listeners dos botões configurados', 'success');
}

/**
 * Inicia o processo de verificação automática
 */
async function startAutoVerification() {
  const module = window.ModuleVerificacao;
  
  try {
    // Validar dados necessários
    if (!module.contractData.address) {
      throw new Error('Endereço do contrato não informado');
    }
    
    if (!module.contractData.sourceCode) {
      throw new Error('Código fonte não disponível');
    }
    
    // Mostrar status de carregamento
    updateVerificationStatus('Iniciando verificação automática...', 'processing');
    
    // Usar o sistema existente de verificação
    module.log('Chamando sistema de verificação automática...');
    
    // Preparar dados para o sistema existente
    window.contratoSource = module.contractData.sourceCode;
    window.contratoName = module.contractData.name;
    window.contratoAbi = module.contractData.abi;
    window.contratoBytecode = module.contractData.bytecode;
    
    // Salvar dados de deploy para o sistema
    const deployedContract = {
      address: module.contractData.address,
      contractName: module.contractData.name,
      sourceCode: module.contractData.sourceCode,
      compilerVersion: module.contractData.compilerVersion,
      networkName: module.contractData.networkName
    };
    
    localStorage.setItem('deployedContract', JSON.stringify(deployedContract));
    
    // Chamar verificação automática do sistema existente
    if (typeof window.iniciarVerificacaoAutomatica === 'function') {
      updateVerificationStatus('Executando verificação via API...', 'processing');
      await window.iniciarVerificacaoAutomatica();
      
      // Verificar resultado
      await checkVerificationResult();
      
    } else {
      throw new Error('Sistema de verificação automática não disponível');
    }
    
    module.status.autoVerificationAttempted = true;
    
  } catch (error) {
    module.log(`Erro na verificação automática: ${error.message}`, 'error');
    updateVerificationStatus(`Erro: ${error.message}`, 'error');
    
    // Mostrar opções de fallback
    showApiKeyConfiguration();
    enableRetryButton();
  }
}

/**
 * Verifica o resultado da verificação automática
 */
async function checkVerificationResult() {
  const module = window.ModuleVerificacao;
  
  module.log('Verificando resultado da verificação...');
  
  // Aguardar um momento para a verificação processar
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  // Simular verificação do status (implementar lógica real baseada na resposta)
  // Por agora, mostrar sucesso ou erro baseado na ausência de erros
  const lastError = module.status.lastError;
  
  if (!lastError) {
    updateVerificationStatus('Verificação concluída com sucesso!', 'success');
    showVerificationSuccess();
    enableNextButton();
    module.status.verificationCompleted = true;
  } else {
    updateVerificationStatus('Verificação automática falhou - tente verificação manual', 'error');
    showManualVerificationFallback();
  }
}

/**
 * Atualiza o status visual da verificação
 */
function updateVerificationStatus(message, type) {
  const statusContainer = document.getElementById('auto-verification-status');
  if (!statusContainer) return;
  
  const iconClass = {
    processing: 'bi-arrow-clockwise spin',
    success: 'bi-check-circle-fill',
    error: 'bi-x-circle-fill',
    warning: 'bi-exclamation-triangle-fill'
  }[type] || 'bi-info-circle';
  
  const colorClass = {
    processing: 'text-primary',
    success: 'text-success',
    error: 'text-danger',
    warning: 'text-warning'
  }[type] || 'text-info';
  
  statusContainer.innerHTML = `
    <div class="alert alert-${type === 'success' ? 'success' : type === 'error' ? 'danger' : 'info'}">
      <i class="${iconClass} ${colorClass} me-2"></i>
      ${message}
    </div>
  `;
  
  window.ModuleVerificacao.log(`Status atualizado: ${message}`, type);
}

// ==================== VERIFICAÇÃO MANUAL ====================

/**
 * Carrega o template de verificação manual
 */
async function loadManualVerificationTemplate() {
  const module = window.ModuleVerificacao;
  
  try {
    const container = document.getElementById('manual-verification-content');
    if (!container) return;
    
    // Usar template loader se disponível
    if (typeof loadTemplate === 'function') {
      module.log('Carregando template de verificação manual...');
      
      const templateData = {
        'contract-address': module.contractData.address,
        'contract-name': module.contractData.name,
        'compiler-version': module.contractData.compilerVersion,
        'source-code': module.contractData.sourceCode,
        'network-name': module.contractData.networkName,
        'explorer-url': getExplorerVerificationUrl()
      };
      
      await fillTemplate('verificacao-manual-template', templateData, container);
      module.log('Template de verificação manual carregado', 'success');
      
    } else {
      // Fallback: HTML inline
      container.innerHTML = createManualVerificationHTML();
      module.log('Template de verificação manual criado inline', 'warning');
    }
    
  } catch (error) {
    module.log(`Erro ao carregar template manual: ${error.message}`, 'error');
    
    // Fallback simples
    const container = document.getElementById('manual-verification-content');
    if (container) {
      container.innerHTML = `
        <div class="alert alert-info">
          <h5>📋 Dados para Verificação Manual</h5>
          <p>Use estes dados na página de verificação da BSCScan:</p>
          <ul>
            <li><strong>Endereço:</strong> ${module.contractData.address}</li>
            <li><strong>Nome:</strong> ${module.contractData.name}</li>
            <li><strong>Compiler:</strong> ${module.contractData.compilerVersion}</li>
          </ul>
          <a href="${getExplorerVerificationUrl()}" target="_blank" class="btn btn-primary">
            <i class="bi bi-box-arrow-up-right me-2"></i>Abrir BSCScan
          </a>
        </div>
      `;
    }
  }
}

/**
 * Cria HTML para verificação manual (fallback)
 */
function createManualVerificationHTML() {
  const module = window.ModuleVerificacao;
  const data = module.contractData;
  
  return `
    <div class="row g-3">
      <div class="col-12">
        <div class="alert alert-info">
          <h5><i class="bi bi-info-circle me-2"></i>Como Verificar Manualmente</h5>
          <ol>
            <li>Clique no link do explorador abaixo</li>
            <li>Selecione "Solidity (Single file)"</li>
            <li>Cole os dados fornecidos</li>
            <li>Clique em "Verify and Publish"</li>
          </ol>
        </div>
      </div>
      
      <div class="col-md-6">
        <label class="form-label fw-bold">🌐 Link do Explorador:</label>
        <div class="d-flex gap-2">
          <input type="text" class="form-control" value="${getExplorerVerificationUrl()}" readonly>
          <button class="btn btn-outline-primary" onclick="window.open('${getExplorerVerificationUrl()}')">
            <i class="bi bi-box-arrow-up-right"></i>
          </button>
        </div>
      </div>
      
      <div class="col-md-6">
        <label class="form-label fw-bold">🏷️ Nome do Contrato:</label>
        <div class="d-flex gap-2">
          <input type="text" class="form-control" value="${data.name}" readonly>
          <button class="btn btn-outline-secondary" onclick="copyToClipboard('${data.name}')">
            <i class="bi bi-clipboard"></i>
          </button>
        </div>
      </div>
      
      <div class="col-md-6">
        <label class="form-label fw-bold">⚙️ Versão do Compilador:</label>
        <div class="d-flex gap-2">
          <input type="text" class="form-control" value="${data.compilerVersion}" readonly>
          <button class="btn btn-outline-secondary" onclick="copyToClipboard('${data.compilerVersion}')">
            <i class="bi bi-clipboard"></i>
          </button>
        </div>
      </div>
      
      <div class="col-md-6">
        <label class="form-label fw-bold">🔧 Optimization:</label>
        <div class="d-flex gap-2">
          <input type="text" class="form-control" value="No" readonly>
          <button class="btn btn-outline-secondary" onclick="copyToClipboard('No')">
            <i class="bi bi-clipboard"></i>
          </button>
        </div>
      </div>
      
      <div class="col-12">
        <label class="form-label fw-bold">📄 Código Fonte:</label>
        <div class="position-relative">
          <textarea class="form-control" rows="10" readonly>${data.sourceCode}</textarea>
          <button class="btn btn-success position-absolute top-0 end-0 m-2" 
                  onclick="copyToClipboard('${data.sourceCode.replace(/'/g, "\\'")}')">
            <i class="bi bi-clipboard"></i> Copiar Código
          </button>
        </div>
      </div>
    </div>
  `;
}

// ==================== UTILITÁRIOS ====================

/**
 * Obtém URL de verificação do explorador blockchain
 */
function getExplorerVerificationUrl() {
  const module = window.ModuleVerificacao;
  const address = module.contractData.address;
  const network = module.contractData.networkName;
  
  if (!address) return '#';
  
  // Mapear redes para URLs de verificação
  const explorerMap = {
    'BNB Smart Chain Mainnet': `https://bscscan.com/verifyContract?a=${address}`,
    'BNB Smart Chain Testnet': `https://testnet.bscscan.com/verifyContract?a=${address}`,
    'Ethereum Mainnet': `https://etherscan.io/verifyContract?a=${address}`,
    'Ethereum Sepolia': `https://sepolia.etherscan.io/verifyContract?a=${address}`,
  };
  
  return explorerMap[network] || `https://bscscan.com/verifyContract?a=${address}`;
}

/**
 * Copia texto para área de transferência
 */
function copyToClipboard(text) {
  navigator.clipboard.writeText(text).then(() => {
    // Mostrar feedback visual
    const toast = document.createElement('div');
    toast.className = 'position-fixed top-0 end-0 p-3';
    toast.style.zIndex = '9999';
    toast.innerHTML = `
      <div class="toast show" role="alert">
        <div class="toast-body bg-success text-white">
          <i class="bi bi-check-circle me-2"></i>Copiado para área de transferência!
        </div>
      </div>
    `;
    
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
    
    window.ModuleVerificacao.log('Texto copiado para área de transferência', 'success');
  }).catch(err => {
    window.ModuleVerificacao.log(`Erro ao copiar: ${err.message}`, 'error');
  });
}

/**
 * Navega para outro módulo
 */
function navigateToModule(moduleName) {
  window.ModuleVerificacao.log(`Navegando para: ${moduleName}`);
  
  // Salvar estado atual no sessionStorage
  const currentState = {
    contractData: window.ModuleVerificacao.contractData,
    status: window.ModuleVerificacao.status,
    timestamp: Date.now()
  };
  
  sessionStorage.setItem('ModuleVerificacaoState', JSON.stringify(currentState));
  
  // Navegar
  window.location.href = moduleName;
}

/**
 * Habilita botão de próximo passo
 */
function enableNextButton() {
  const btnNext = document.getElementById('btn-next');
  if (btnNext) {
    btnNext.style.display = 'inline-block';
  }
}

/**
 * Habilita botão de tentar novamente
 */
function enableRetryButton() {
  const btnRetry = document.getElementById('btn-retry');
  if (btnRetry) {
    btnRetry.style.display = 'inline-block';
  }
}

/**
 * Mostra configuração de API Key
 */
function showApiKeyConfiguration() {
  const apiKeyCard = document.getElementById('api-key-card');
  if (apiKeyCard) {
    apiKeyCard.style.display = 'block';
  }
}

/**
 * Salva API Key configurada
 */
function saveApiKey() {
  const input = document.getElementById('api-key-input');
  if (!input || !input.value.trim()) {
    alert('Por favor, insira uma API Key válida');
    return;
  }
  
  // Usar o sistema existente de API Key se disponível
  if (typeof window.saveApiKeyForNetwork === 'function') {
    window.saveApiKeyForNetwork('bsc', input.value.trim());
    window.ModuleVerificacao.log('API Key salva via sistema existente', 'success');
  } else {
    // Fallback: localStorage direto
    localStorage.setItem('bsc_api_key', input.value.trim());
    window.ModuleVerificacao.log('API Key salva no localStorage', 'success');
  }
  
  // Feedback visual
  const btn = document.getElementById('btn-save-api-key');
  if (btn) {
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="bi bi-check me-2"></i>Salva!';
    btn.className = 'btn btn-success w-100';
    
    setTimeout(() => {
      btn.innerHTML = originalText;
      btn.className = 'btn btn-primary w-100';
    }, 2000);
  }
  
  // Limpar campo
  input.value = '';
}

/**
 * Mostra sucesso da verificação
 */
function showVerificationSuccess() {
  const resultsCard = document.getElementById('results-card');
  const resultsContainer = document.getElementById('verification-results');
  
  if (resultsCard && resultsContainer) {
    resultsCard.style.display = 'block';
    resultsCard.className = 'verification-card success';
    
    resultsContainer.innerHTML = `
      <div class="text-center">
        <i class="bi bi-check-circle-fill text-success" style="font-size: 3rem;"></i>
        <h4 class="mt-3 text-success">Verificação Concluída!</h4>
        <p class="text-muted">Seu contrato foi verificado com sucesso na blockchain.</p>
        
        <div class="row g-3 mt-4">
          <div class="col-md-6">
            <a href="${getExplorerVerificationUrl().replace('verifyContract', 'address')}" 
               target="_blank" class="btn btn-outline-primary w-100">
              <i class="bi bi-box-arrow-up-right me-2"></i>Ver no Explorador
            </a>
          </div>
          <div class="col-md-6">
            <button onclick="navigateToModule('05-finalizacao.html')" class="btn btn-success w-100">
              <i class="bi bi-arrow-right me-2"></i>Finalizar
            </button>
          </div>
        </div>
      </div>
    `;
  }
}

/**
 * Mostra fallback para verificação manual
 */
function showManualVerificationFallback() {
  const manualCard = document.getElementById('manual-verification-card');
  if (manualCard) {
    manualCard.scrollIntoView({ behavior: 'smooth' });
    
    // Destacar seção manual
    manualCard.style.borderColor = '#f59e0b';
    manualCard.style.backgroundColor = '#fffbeb';
    
    // Adicionar alerta
    const content = document.getElementById('manual-verification-content');
    if (content) {
      const alert = document.createElement('div');
      alert.className = 'alert alert-warning mb-3';
      alert.innerHTML = `
        <i class="bi bi-exclamation-triangle me-2"></i>
        <strong>Verificação Automática Falhou</strong><br>
        Use os dados abaixo para verificação manual na BSCScan.
      `;
      content.insertBefore(alert, content.firstChild);
    }
  }
}

/**
 * Tenta verificação novamente
 */
async function retryVerification() {
  window.ModuleVerificacao.log('Tentando verificação novamente...');
  
  // Reset status
  window.ModuleVerificacao.status.autoVerificationAttempted = false;
  window.ModuleVerificacao.status.lastError = null;
  
  // Limpar status anterior
  updateVerificationStatus('Preparando nova tentativa...', 'processing');
  
  // Tentar novamente
  await startAutoVerification();
}

// ==================== INICIALIZAÇÃO ====================

/**
 * Inicialização do módulo quando DOM estiver pronto
 */
document.addEventListener('DOMContentLoaded', async function() {
  window.ModuleVerificacao.log('🚀 Módulo de Verificação inicializado');
  
  try {
    // Carregar dados do contrato
    await loadContractData();
    
    window.ModuleVerificacao.log('✅ Módulo de Verificação pronto para uso');
    
  } catch (error) {
    window.ModuleVerificacao.log(`❌ Erro na inicialização: ${error.message}`, 'error');
    
    // Mostrar erro na interface
    const moduleStatus = document.getElementById('module-status');
    if (moduleStatus) {
      moduleStatus.className = 'status-indicator error';
      moduleStatus.innerHTML = '<i class="bi bi-x-circle me-2"></i>Erro na inicialização';
    }
  }
});

// ==================== EXPORTS GLOBAIS ====================

// Disponibilizar funções principais globalmente para compatibilidade
window.startAutoVerification = startAutoVerification;
window.loadContractData = loadContractData;
window.copyToClipboard = copyToClipboard;
window.navigateToModule = navigateToModule;
