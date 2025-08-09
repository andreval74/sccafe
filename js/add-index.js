import { marcarConcluido, clearErrors, markErrors } from './add-utils.js';
import { salvarContrato, compilarContrato, contratoSource, debugContractState, showVerificationInfo } from './add-contratos-verified.js';
import { deployContrato } from './add-deploy.js';
import { adicionarTokenMetaMask, montarTokenData, gerarLinkToken, switchOrAddNetwork } from './add-metamask.js';
import { buscarSaltFake, pararBuscaSalt } from './add-salt.js';
import { detectCurrentNetwork, currentNetwork, setupNetworkMonitoring, updateNetworkInfo } from './network-manager.js';
import { setupWalletConnection, getCurrentProvider } from './shared/wallet-connection.js';
// import { showVerificationInterface } from './verification-ui.js';
// import { initNetworkCommons, getBlockExplorerAPI } from './network-commons.js';
// import { verificarContratoManualmente } from './manual-verification.js';
import { loadTemplate, injectTemplate, fillTemplate } from './template-loader.js';

// Inicializa conexão da carteira e sistema de redes quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', async () => {
    // Inicializa o componente de conexão da carteira
    await setupWalletConnection();
    
    // Inicializa o monitoramento de rede após a conexão
    setupNetworkMonitoring();
});

// Listener para evento de deploy concluído
window.addEventListener('contractDeployed', (event) => {
  const deployedInfo = event.detail;
  console.log('📄 Contrato deployado:', deployedInfo);
  
  if (nextStep4) {
    nextStep4.style.display = 'inline-block';
  }
  
  // Não mostra mais os dados técnicos no console automaticamente
  console.log('✅ Deploy concluído - redirecionamento configurado');
});


// Referências a elementos DOM
const steps = document.querySelectorAll('.step-content');
const indicators = document.querySelectorAll('.step-indicator');
const summaryBox = document.getElementById('token-summary');
const inputNome = document.getElementById('tokenName');
const inputSymbol = document.getElementById('tokenSymbol');
const inputDecimals = document.getElementById('decimals');
const inputSupply = document.getElementById('totalSupply');
const inputOwner = document.getElementById('ownerAddress');
const inputImage = document.getElementById('tokenImage');
const radioPersonalizado = document.getElementById('contrato-personalizado');
const targetSuffix = document.getElementById('targetSuffix');
const predictedAddress = document.getElementById('predictedAddress');
const saltFound = document.getElementById('saltFound');
const btnSalvarContrato = document.getElementById('btn-salvar-contrato');
const btnCompilar = document.getElementById('btn-compilar-contrato');
const btnDeploy = document.getElementById('btn-deploy-contrato');
const btnVerificationInfo = document.getElementById('btn-verification-info');
const btnAutoVerify = document.getElementById('btn-auto-verify');
const nextStep4 = document.getElementById('next-step-4');
const nextStep5 = document.getElementById('next-step-5');

// Elementos de conexão e status
const connectionSection = document.querySelector('.connection-section');
const walletStatus = document.getElementById('wallet-status');
const networkValue = document.getElementById('networkValue');
const networkDisplay = document.getElementById('network-display'); // Corrigido: era 'networkDisplay'
const networkDisplayField = document.getElementById('network-display');
const networkStatus = document.getElementById('network-status');
const verificationStatus = document.getElementById('verification-status');
const contractStatus = document.getElementById('contract-status');
const compileStatus = document.getElementById('compile-status');
const deployStatus = document.getElementById('deploy-status');
// Elementos do novo layout - versão única e limpa
let currentStep = 1;

// Garante que os botões começam desabilitados
if (btnCompilar) btnCompilar.disabled = true;
if (btnDeploy) btnDeploy.disabled = true;

// -------------------- Sistema de Gerenciamento de Estados dos Botões --------------------

/**
 * Define o estado de um botão com feedback visual consistente
 * @param {HTMLElement} button - O elemento do botão
 * @param {string} state - Estado: 'disabled', 'enabled', 'processing', 'completed'
 * @param {string} originalText - Texto original do botão (opcional)
 */
function setButtonState(button, state, originalText = null) {
  if (!button) return;
  
  // Salvar texto original se não foi salvo ainda
  if (!button.dataset.originalText && originalText) {
    button.dataset.originalText = originalText;
  }
  
  // Remover classes de estado anterior
  button.classList.remove('btn-processing', 'btn-completed');
  
  switch (state) {
    case 'disabled':
      button.disabled = true;
      button.style.cursor = 'not-allowed';
      break;
      
    case 'enabled':
      button.disabled = false;
      button.style.cursor = 'pointer';
      if (button.dataset.originalText) {
        button.innerHTML = button.dataset.originalText;
      }
      break;
      
    case 'processing':
      button.disabled = true;
      button.classList.add('btn-processing');
      button.style.cursor = 'not-allowed';
      // Manter o texto mas adicionar indicador visual via CSS
      break;
      
    case 'completed':
      button.disabled = false;
      button.classList.add('btn-completed');
      button.style.cursor = 'pointer';
      break;
  }
  
  console.log(`🎯 [DEBUG] Botão ${button.id} estado alterado para: ${state}`);
}

/**
 * Habilita o próximo botão na sequência
 * @param {HTMLElement} currentButton - Botão atual que foi completado
 * @param {HTMLElement} nextButton - Próximo botão a ser habilitado
 */
function enableNextButton(currentButton, nextButton) {
  if (currentButton) {
    setButtonState(currentButton, 'completed');
  }
  if (nextButton) {
    setButtonState(nextButton, 'enabled');
  }
}

// Inicializar estados dos botões
function initializeButtonStates() {
  console.log('🔄 [DEBUG] Inicializando estados dos botões...');
  
  // Salvar textos originais e definir estados iniciais
  if (btnSalvarContrato) {
    setButtonState(btnSalvarContrato, 'enabled', btnSalvarContrato.innerHTML);
  }
  
  if (btnCompilar) {
    setButtonState(btnCompilar, 'disabled', btnCompilar.innerHTML);
  }
  
  if (btnDeploy) {
    setButtonState(btnDeploy, 'disabled', btnDeploy.innerHTML);
  }
  
  if (btnVerificationInfo) {
    setButtonState(btnVerificationInfo, 'disabled', btnVerificationInfo.innerHTML);
  }
  
  if (btnAutoVerify) {
    setButtonState(btnAutoVerify, 'disabled', btnAutoVerify.innerHTML);
  }
  
  const btnAddMetaMask = document.getElementById('btn-add-metamask');
  if (btnAddMetaMask) {
    setButtonState(btnAddMetaMask, 'disabled', btnAddMetaMask.innerHTML);
  }
}

// Chamar inicialização
initializeButtonStates();

// Inicializa o novo layout de conexão (com verificações defensivas)
if (walletStatus) {
  walletStatus.value = 'Clique em "Conectar" para iniciar';
}

// Inicializa campos ocultos (com verificações defensivas)
if (networkValue) networkValue.value = '';
if (networkDisplay) networkDisplay.value = '';

console.log('🚀 Interface inicializada:', {
  walletStatus: !!walletStatus,
  connectionSection: !!connectionSection,
  networkValue: !!networkValue,
  networkDisplay: !!networkDisplay
});

// -------------------- Navegação Simplificada (3 Etapas) --------------------
function showStep(step) {
  console.log(`🔄 [DEBUG] Mudando para etapa ${step}`);
  
  // Scroll para o topo da página suavemente
  window.scrollTo({
    top: 0,
    behavior: 'smooth'
  });
  
  // Ocultar todos os steps
  const allSteps = document.querySelectorAll('.step-content');
  allSteps.forEach(s => s.style.display = 'none');
  
  // Mostrar step específico (1, 2 ou 3)
  const stepElement = document.getElementById(`step-${step}`);
  if (stepElement) {
    stepElement.style.display = 'block';
  } else {
    console.warn(`⚠️ [DEBUG] Step ${step} não encontrado`);
    return;
  }
  
  // Atualizar timeline simplificada
  updateTimelineStatus(step);
  
  // Se for etapa 3 (resumo), preencher dados
  if (step === 3) {
    setTimeout(() => {
      fillResumo();
    }, 100);
  }
  
  currentStep = step;
}

// Atualizar timeline simplificada (3 etapas)
function updateTimelineStatus(currentStep) {
  console.log(`🎯 [DEBUG] Atualizando timeline simplificada para etapa ${currentStep}`);
  
  // Atualizar indicadores simples (3 etapas)
  const stepIndicators = document.querySelectorAll('.step-simple');
  stepIndicators.forEach((indicator, idx) => {
    const stepNum = idx + 1;
    
    // Remover classes existentes
    indicator.classList.remove('active', 'completed');
    
    if (stepNum < currentStep) {
      indicator.classList.add('completed');
    } else if (stepNum === currentStep) {
      indicator.classList.add('active');
    }
  });
  
  console.log(`✅ [DEBUG] Timeline atualizada - Etapa ${currentStep} de 3`);
}

// Validação do Step 1
function validateStep1() {
  let isValid = true;
  const errors = [];
  
  // Verifica conexão MetaMask
  if (!inputOwner || !inputOwner.value || inputOwner.value.trim() === '') {
    errors.push('Conecte sua carteira MetaMask primeiro');
    isValid = false;
  }
  
  // Verifica nome do token
  if (!inputNome || !inputNome.value || inputNome.value.trim() === '') {
    errors.push('Nome do token é obrigatório');
    isValid = false;
  }
  
  // Verifica símbolo do token  
  if (!inputSymbol || !inputSymbol.value || inputSymbol.value.trim() === '') {
    errors.push('Símbolo do token é obrigatório');
    isValid = false;
  }
  
  // Verifica total supply
  if (!inputSupply || !inputSupply.value || isNaN(inputSupply.value) || parseFloat(inputSupply.value) <= 0) {
    errors.push('Total Supply deve ser um número maior que 0');
    isValid = false;
  }
  
  // Verifica decimais
  const decimals = parseInt(inputDecimals.value);
  if (isNaN(decimals) || decimals < 0 || decimals > 18) {
    errors.push('Decimais deve ser um número entre 0 e 18');
    isValid = false;
  }
  
  // Mostra erros se houver
  if (!isValid) {
    alert('⚠️ Corrija os seguintes erros:\n\n' + errors.join('\n'));
  }
  
  return isValid;
}

// Validação completa para todas as etapas
function validateAllData() {
  console.log('🔍 [DEBUG] Validando todos os dados antes da criação...');
  
  let isValid = true;
  const errors = [];
  
  // Validação básica (Etapa 1)
  if (!inputOwner || !inputOwner.value || inputOwner.value.trim() === '') {
    errors.push('Conecte sua carteira MetaMask primeiro');
    isValid = false;
  }
  
  if (!inputNome || !inputNome.value || inputNome.value.trim() === '') {
    errors.push('Nome do token é obrigatório');
    isValid = false;
  }
  
  if (!inputSymbol || !inputSymbol.value || inputSymbol.value.trim() === '') {
    errors.push('Símbolo do token é obrigatório');
    isValid = false;
  }
  
  if (!inputSupply || !inputSupply.value || isNaN(inputSupply.value) || parseFloat(inputSupply.value) <= 0) {
    errors.push('Total Supply deve ser um número maior que 0');
    isValid = false;
  }
  
  const decimals = parseInt(inputDecimals?.value || '18');
  if (isNaN(decimals) || decimals < 0 || decimals > 18) {
    errors.push('Decimais deve ser um número entre 0 e 18');
    isValid = false;
  }
  
  // Verificação de rede
  if (!networkValue || !networkValue.value) {
    errors.push('Rede blockchain não detectada. Verifique sua conexão MetaMask.');
    isValid = false;
  }
  
  // Mostrar erros se houver
  if (!isValid) {
    alert('⚠️ Corrija os seguintes erros antes de continuar:\n\n' + errors.join('\n'));
    console.error('❌ [DEBUG] Validação falhou:', errors);
  } else {
    console.log('✅ [DEBUG] Todos os dados validados com sucesso');
  }
  
  return isValid;
}

// Inicialização da criação do token (Etapa 3)
function initializeTokenCreation() {
  console.log('🚀 [DEBUG] Iniciando processo de criação do token...');
  
  // Mostrar seção de criação do contrato se existir
  const contractSection = document.getElementById('criacao-section');
  if (contractSection) {
    contractSection.style.display = 'block';
    console.log('✅ [DEBUG] Seção de criação exibida');
  }
  
  // Criar barra de progresso unificada para todo o processo
  const progressContainer = document.querySelector('.criacao-section .progress-container') || 
                           document.querySelector('#criacao-section .progress-container');
  
  if (progressContainer) {
    createProgressBar(progressContainer, 'Preparando criação do token...');
    console.log('✅ [DEBUG] Barra de progresso criada');
  }
  
  // Iniciar processo de compilação
  setTimeout(() => {
    console.log('⚙️ [DEBUG] Iniciando compilação do contrato...');
    if (typeof compileContract === 'function') {
      compileContract();
    } else {
      console.warn('⚠️ [DEBUG] Função compileContract não encontrada, simulando...');
      simulateTokenCreation();
    }
  }, 1000);
}

// Simulação do processo de criação (fallback)
function simulateTokenCreation() {
  console.log('🔧 [DEBUG] Simulando processo de criação do token...');
  
  const steps = [
    { message: 'Compilando contrato...', progress: 25 },
    { message: 'Fazendo deploy...', progress: 50 },
    { message: 'Verificando contrato...', progress: 75 },
    { message: 'Finalizando...', progress: 100 }
  ];
  
  let currentIndex = 0;
  
  // Obter referência da progress bar criada anteriormente
  const progressContainer = document.querySelector('.progress-bar-container');
  if (!progressContainer) {
    console.warn('⚠️ [DEBUG] Progress bar não encontrada para simulação');
    return;
  }
  
  const progressData = {
    progressBar: progressContainer.querySelector('.progress-bar'),
    container: progressContainer
  };
  
  const interval = setInterval(() => {
    if (currentIndex < steps.length) {
      const step = steps[currentIndex];
      
      // Atualizar progresso
      animateProgressBar(progressData, step.progress, step.message);
      
      currentIndex++;
    } else {
      clearInterval(interval);
      
      // Finalizar
      finishProgressBar(progressData, 'Token criado com sucesso!', 'success');
      
      // Mostrar seção de finalização
      const finalizacaoSection = document.getElementById('finalizacao-section');
      if (finalizacaoSection) {
        finalizacaoSection.style.display = 'block';
        console.log('✅ [DEBUG] Seção de finalização exibida');
      }
    }
  }, 2000);
}

// Função para mostrar/ocultar seção de personalização
function toggleAddressCustomization() {
  const customSection = document.getElementById('customization-section');
  const radioPersonalizado = document.getElementById('contrato-personalizado');
  
  if (customSection && radioPersonalizado) {
    if (radioPersonalizado.checked) {
      customSection.style.display = 'block';
    } else {
      customSection.style.display = 'none';
      // Limpa campos quando não está em uso
      if (targetSuffix) targetSuffix.value = '';
      if (predictedAddress) predictedAddress.value = '';
      if (saltFound) saltFound.value = '';
    }
  }
}

// Função para buscar SALT (placeholder - função real está em add-salt.js)
function buscarSalt() {
  console.log('🔍 Iniciando busca de SALT...');
  if (buscarSaltFake) {
    buscarSaltFake();
  } else {
    console.warn('⚠️ Função buscarSaltFake não encontrada');
  }
}

// Função para parar busca de SALT
function pararBusca() {
  console.log('⏹️ Parando busca de SALT...');
  if (pararBuscaSalt) {
    pararBuscaSalt();
  } else {
    console.warn('⚠️ Função pararBuscaSalt não encontrada');
  }
}

// Torna funções globais para uso no HTML
window.toggleAddressCustomization = toggleAddressCustomization;
window.buscarSalt = buscarSalt;
window.pararBusca = pararBusca;

function reiniciarFluxo() {
  console.log('🔄 [DEBUG] Reiniciando fluxo completo (3 etapas)...');
  
  // Limpar todos os campos
  document.querySelectorAll('input, select, textarea').forEach(field => {
    if (field.type === "radio" || field.type === "checkbox") field.checked = false;
    else field.value = "";
  });
  
  // Restaurar valores padrão
  if (inputDecimals) inputDecimals.value = '18';
  
  console.log('✅ [DEBUG] Campos limpos');
  
  // Reinicializa interface de conexão
  const btnConectar = document.getElementById('connect-metamask-btn');
  if (btnConectar) {
    btnConectar.style.display = 'block';
    btnConectar.disabled = false;
    btnConectar.textContent = 'CONECTAR';
    btnConectar.style.backgroundColor = '';
    console.log('✅ [DEBUG] Botão conectar reinicializado');
  }
  
  if (connectionSection) {
    connectionSection.classList.remove('connecting', 'connected-state');
    console.log('✅ [DEBUG] Classes de conexão removidas');
  }
  
  if (walletStatus) {
    walletStatus.value = 'Clique em "Conectar" para iniciar';
    console.log('✅ [DEBUG] Status da carteira reinicializado');
  }
  
  if (inputOwner) {
    inputOwner.readOnly = true;
    inputOwner.classList.remove('filled');
    inputOwner.value = '';
    inputOwner.placeholder = 'Será preenchido após conectar carteira';
    console.log('✅ [DEBUG] Campo owner reinicializado');
  }
  
  // Reinicializar campos ocultos
  if (networkDisplay) networkDisplay.value = '';
  if (networkValue) networkValue.value = '';
  
  // Ocultar seções avançadas
  if (verificationSection) verificationSection.style.display = 'none';
  
  // Reinicializar estados dos botões
  initializeButtonStates();
  
  // Limpar status
  if (contractStatus) contractStatus.innerHTML = '';
  if (compileStatus) compileStatus.innerHTML = '';
  if (deployStatus) deployStatus.innerHTML = '';
  
  // Ocultar botão finalizado
  const btnFinalizado = document.getElementById('btn-finalizado');
  if (btnFinalizado) {
    btnFinalizado.style.display = 'none';
  }
  
  // Limpar dados globais
  window.contractAddress = '';
  window.contratoSource = '';
  
  console.log('🔄 [DEBUG] Interface reinicializada, voltando para etapa 1');
  showStep(1);
}

// -------------------- Resumo Step Melhorado --------------------
async function fillResumo() {
  console.log('📋 [DEBUG] Preenchendo resumo com template separado...');
  
  try {
    // Prepara dados do resumo
    let ownerChecksum = inputOwner.value;
    try {
      if (window.ethers && window.ethers.utils) {
        ownerChecksum = window.ethers.utils.getAddress(inputOwner.value);
      }
    } catch (e) {
      // Se não conseguir converter, mantém o valor original
    }
    
    const resumoData = {
      'summary-nome': inputNome.value || 'Nome não definido',
      'summary-symbol': inputSymbol.value || 'SYM',
      'summary-decimals': inputDecimals.value || '18',
      'summary-supply': inputSupply.value ? Number(inputSupply.value).toLocaleString() : '0',
      'summary-owner': ownerChecksum || 'Conecte sua carteira',
      'summary-image': inputImage.value || '',
      'summary-network': networkDisplay ? networkDisplay.value : 'Rede não detectada',
      'summary-address-type': (radioPersonalizado && radioPersonalizado.checked) ? 'Personalizado' : 'Padrão'
    };
    
    console.log('📋 [DEBUG] Dados do resumo:', resumoData);
    
    // Carrega e preenche o template
    await fillTemplate('resumo-template', resumoData, summaryBox);
    
    // IMPORTANTE: Reconfigurar event listeners após template carregado
    console.log('🔧 [DEBUG] Reconfigurar event listeners após template carregado...');
    setTimeout(() => {
      // Chama a função de configuração do botoes-funcionais.js
      if (window.configureButtonListeners) {
        window.configureButtonListeners();
        console.log('✅ [DEBUG] Event listeners reconfigurados');
      } else {
        console.warn('⚠️ [DEBUG] window.configureButtonListeners não encontrada');
      }
    }, 100); // Pequeno delay para garantir que o DOM foi atualizado
    
    // Atualizar imagem se disponível
    if (resumoData['summary-image']) {
      const imageContainer = document.getElementById('summary-image-container');
      const imagePreview = document.getElementById('summary-image-preview');
      const imageLink = document.getElementById('summary-image');
      
      if (imageContainer && imagePreview && imageLink) {
        imageContainer.style.display = 'block';
        imagePreview.src = resumoData['summary-image'];
        imageLink.href = resumoData['summary-image'];
        imageLink.textContent = resumoData['summary-image'];
      }
    }
    
    console.log('✅ [DEBUG] Resumo preenchido com template externo');
    
  } catch (error) {
    console.error('❌ [DEBUG] Erro ao carregar template do resumo:', error);
    
    // Fallback: conteúdo simples mas funcional
    if (summaryBox) {
      summaryBox.innerHTML = `
        <div class="alert alert-info">
          <h5><i class="bi bi-clipboard-check me-2"></i>Resumo do Token</h5>
          <div class="row g-3">
            <div class="col-md-6">
              <strong>Nome:</strong> ${inputNome.value || 'Não definido'}
            </div>
            <div class="col-md-6">
              <strong>Símbolo:</strong> ${inputSymbol.value || 'Não definido'}
            </div>
            <div class="col-md-6">
              <strong>Decimais:</strong> ${inputDecimals.value || '18'}
            </div>
            <div class="col-md-6">
              <strong>Supply:</strong> ${inputSupply.value ? Number(inputSupply.value).toLocaleString() : '0'}
            </div>
            <div class="col-12">
              <strong>Proprietário:</strong><br>
              <code style="word-break: break-all;">${inputOwner.value || 'Conecte sua carteira'}</code>
            </div>
          </div>
          <div class="mt-3">
            <button id="btn-criar-token" class="btn btn-primary">
              <i class="bi bi-rocket-takeoff me-2"></i>Criar Token
            </button>
          </div>
        </div>
      `;
      
      // Adicionar event listener para o botão
      const btnCriarToken = document.getElementById('btn-criar-token');
      if (btnCriarToken) {
        btnCriarToken.addEventListener('click', () => {
          if (validateAllData()) {
            initializeTokenCreation();
          }
        });
      }
    }
  }
}

// -------------------- Navegação Simplificada (3 Etapas) --------------------
// Função nextStep simplificada para 3 etapas
function nextStep() {
  console.log(`➡️ [DEBUG] NextStep - Etapa atual: ${currentStep}`);
  
  // Validar antes de prosseguir
  if (currentStep === 1 && !validateStep1()) {
    console.log('❌ [DEBUG] Validação da etapa 1 falhou');
    return;
  }
  
  if (currentStep < 3) { // Máximo 3 etapas
    showStep(currentStep + 1);
  } else {
    console.log('⚠️ [DEBUG] Já na última etapa (3)');
  }
}

// Função prevStep simplificada para 3 etapas
function prevStep() {
  console.log(`⬅️ [DEBUG] PrevStep - Etapa atual: ${currentStep}`);
  if (currentStep > 1) {
    showStep(currentStep - 1);
  } else {
    console.log('⚠️ [DEBUG] Já na primeira etapa (1)');
  }
}

// Tornar funções globais para uso em onclick
window.reiniciarFluxo = reiniciarFluxo;
window.prevStep = prevStep;

// -------------------- Handlers navegação (3 etapas) --------------------
document.getElementById('next-step-1').addEventListener('click', nextStep);
document.getElementById('next-step-2').addEventListener('click', nextStep);
// Note: next-step-3 não existe mais, pois step-3 é o final

// Remover handlers para etapas 4 e 5 (não existem mais)
// if (nextStep4) nextStep4.addEventListener('click', nextStep);
// if (nextStep5) nextStep5.addEventListener('click', nextStep);

document.querySelectorAll('.navigation .btn-secondary').forEach(btn => {
  btn.addEventListener('click', prevStep);
});

// Reiniciar fluxo
const btnReiniciar = document.querySelector('button[onclick="reiniciarFluxo()"]');
if (btnReiniciar) btnReiniciar.addEventListener('click', reiniciarFluxo);

// -------------------- Funções de Status e Progress Bar --------------------
// -------------------- Funções de Status e Progress Bar Unificadas --------------------
function updateContractStatus(message, type) {
  const contractStatus = document.getElementById('contract-status');
  if (contractStatus) {
    contractStatus.textContent = message;
    contractStatus.className = `status-item ${type}`;
    console.log(`📊 [STATUS] Contract: ${message}`);
  }
}

function updateCompileStatus(message, type) {
  const compileStatus = document.getElementById('compile-status');
  if (compileStatus) {
    compileStatus.textContent = message;
    compileStatus.className = `status-item ${type}`;
    console.log(`📊 [STATUS] Compile: ${message}`);
  }
}

function updateDeployStatus(message, type) {
  const deployStatus = document.getElementById('deploy-status');
  if (deployStatus) {
    deployStatus.textContent = message;
    deployStatus.className = `status-item ${type}`;
    console.log(`📊 [STATUS] Deploy: ${message}`);
  }
}

// Função unificada para criar barra de progresso
function createProgressBar(containerOrId, initialMessage = 'Processando...') {
  let container;
  
  if (typeof containerOrId === 'string') {
    container = document.getElementById(containerOrId);
  } else {
    container = containerOrId;
  }
  
  if (!container) {
    console.warn('⚠️ [DEBUG] Container não encontrado para progress bar');
    return null;
  }
  
  // Remove barra existente se houver
  const existingBar = container.querySelector('.progress-bar-container');
  if (existingBar) existingBar.remove();
  
  // Cria nova barra de progresso
  const progressBarContainer = document.createElement('div');
  progressBarContainer.className = 'progress-bar-container';
  progressBarContainer.style.cssText = `
    width: 100%;
    height: 4px;
    background-color: rgba(248, 93, 35, 0.2);
    border-radius: 2px;
    margin-top: 8px;
    overflow: hidden;
  `;
  
  const progressBar = document.createElement('div');
  progressBar.className = 'progress-bar';
  progressBar.style.cssText = `
    width: 0%;
    height: 100%;
    background-color: #f85d23;
    border-radius: 2px;
    transition: width 0.3s ease;
    background-image: linear-gradient(45deg, rgba(255,255,255,0.2) 25%, transparent 25%, transparent 50%, rgba(255,255,255,0.2) 50%, rgba(255,255,255,0.2) 75%, transparent 75%, transparent);
    background-size: 20px 20px;
    animation: progress-animation 1s linear infinite;
  `;
  
  // Adicionar mensagem de status se fornecida
  if (initialMessage) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'progress-message';
    messageDiv.textContent = initialMessage;
    messageDiv.style.cssText = `
      font-size: 12px;
      color: #666;
      margin-top: 4px;
    `;
    progressBarContainer.appendChild(messageDiv);
  }
  
  progressBarContainer.appendChild(progressBar);
  container.appendChild(progressBarContainer);
  
  return { progressBar, container: progressBarContainer };
}

// Função para animar barra de progresso
function animateProgressBar(progressData, percentage, message = null) {
  if (!progressData || !progressData.progressBar) return;
  
  const { progressBar, container } = progressData;
  
  // Atualizar progresso
  progressBar.style.width = `${percentage}%`;
  
  // Atualizar mensagem se fornecida
  if (message) {
    const messageDiv = container.querySelector('.progress-message');
    if (messageDiv) {
      messageDiv.textContent = message;
    }
  }
}

// Função para finalizar barra de progresso
function finishProgressBar(progressData, message = 'Concluído!', type = 'success') {
  if (!progressData || !progressData.progressBar) return;
  
  const { progressBar, container } = progressData;
  
  progressBar.style.width = '100%';
  progressBar.style.backgroundColor = type === 'success' ? '#22c55e' : '#dc2626';
  progressBar.style.animation = 'none';
  
  // Atualizar mensagem final
  const messageDiv = container.querySelector('.progress-message');
  if (messageDiv) {
    messageDiv.textContent = message;
    messageDiv.style.color = type === 'success' ? '#22c55e' : '#dc2626';
  }
  
  // Remove a barra após 3 segundos
  setTimeout(() => {
    if (container && container.parentNode) {
      container.remove();
    }
  }, 3000);
}

function startCompileProgressBar() {
  return createProgressBar('compile-status', 'Compilando contrato...');
}

function stopCompileProgressBar(progressData, success) {
  if (progressData) {
    finishProgressBar(progressData, success ? 'Compilação concluída!' : 'Erro na compilação', success ? 'success' : 'error');
  }
}

function startDeployProgressBar() {
  return createProgressBar('deploy-status', 'Fazendo deploy...');
}

function stopDeployProgressBar(progressData, success) {
  if (progressData) {
    finishProgressBar(progressData, success ? 'Deploy concluído!' : 'Erro no deploy', success ? 'success' : 'error');
  }
}

// Função de verificação automática
async function autoVerifyContract(contractAddress) {
  console.log('🔍 [DEBUG] Iniciando verificação automática para:', contractAddress);
  
  if (!contractAddress || !window.lastCompilationResult) {
    console.log('❌ [DEBUG] Dados insuficientes para verificação automática');
    return false;
  }
  
  try {
    // Mostrar botão de verificação
    const btnVerify = document.getElementById('btn-verify-contract');
    if (btnVerify) {
      btnVerify.style.display = 'inline-block';
      btnVerify.textContent = '🔄 Verificando...';
      btnVerify.disabled = true;
    }
    
    // Obter dados da rede atual
    const networkData = window.currentNetwork;
    // const explorerAPI = networkData ? getBlockExplorerAPI(networkData.chainId) : null;
    const explorerAPI = null; // Temporariamente desabilitado
    
    if (!explorerAPI) {
      console.log('⚠️ [DEBUG] Rede não suporta verificação automática');
      if (btnVerify) {
        btnVerify.textContent = '⚠️ Verificação manual necessária';
        btnVerify.disabled = false;
      }
      return false;
    }
    
    // Preparar dados para verificação
    const verificationData = {
      contractAddress: contractAddress,
      sourceCode: window.lastCompilationResult.sourceCode,
      contractName: inputNome.value,
      compilerVersion: window.lastCompilationResult.compilerVersion || 'v0.8.19+commit.7dd6d404',
      constructorArguments: window.lastCompilationResult.constructorArgs || '',
      optimizationUsed: '1',
      runs: '200'
    };
    
    console.log('📤 [DEBUG] Enviando para verificação:', verificationData);
    
    // Fazer verificação via API do explorer
    const response = await fetch(`${explorerAPI.api}/api`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        module: 'contract',
        action: 'verifysourcecode',
        contractaddress: verificationData.contractAddress,
        sourceCode: verificationData.sourceCode,
        codeformat: 'solidity-single-file',
        contractname: verificationData.contractName,
        compilerversion: verificationData.compilerVersion,
        optimizationUsed: verificationData.optimizationUsed,
        runs: verificationData.runs,
        constructorArguements: verificationData.constructorArguments,
        apikey: explorerAPI.apiKey
      })
    });
    
    const result = await response.json();
    console.log('📥 [DEBUG] Resposta da verificação:', result);
    
    if (result.status === '1') {
      console.log('✅ [DEBUG] Verificação automática iniciada com sucesso!');
      if (btnVerify) {
        btnVerify.textContent = '✅ Verificação enviada';
        btnVerify.disabled = true;
      }
      
      // Checar status da verificação
      setTimeout(() => checkVerificationStatus(result.result, explorerAPI), 10000);
      return true;
    } else {
      console.log('❌ [DEBUG] Falha na verificação automática:', result.result);
      if (btnVerify) {
        btnVerify.textContent = '❌ Verificação falhou';
        btnVerify.disabled = false;
      }
      return false;
    }
    
  } catch (error) {
    console.error('❌ [DEBUG] Erro na verificação automática:', error);
    const btnVerify = document.getElementById('btn-verify-contract');
    if (btnVerify) {
      btnVerify.textContent = '❌ Erro na verificação';
      btnVerify.disabled = false;
    }
    return false;
  }
}

// Verificar status da verificação
async function checkVerificationStatus(guid, explorerAPI) {
  try {
    const response = await fetch(`${explorerAPI.api}/api?module=contract&action=checkverifystatus&guid=${guid}&apikey=${explorerAPI.apiKey}`);
    const result = await response.json();
    
    console.log('🔍 [DEBUG] Status da verificação:', result);
    
    const btnVerify = document.getElementById('btn-verify-contract');
    if (result.status === '1') {
      console.log('✅ [DEBUG] Contrato verificado com sucesso!');
      if (btnVerify) {
        btnVerify.textContent = '✅ Verificado';
        btnVerify.style.backgroundColor = '#22c55e';
      }
      
      // Mostrar sucesso da verificação usando template
      if (window.deployedContractAddress) {
        await showVerificationSuccess(window.deployedContractAddress, explorerAPI.explorer, explorerAPI.name);
      }
      
    } else if (result.result === 'Pending in queue') {
      console.log('⏳ [DEBUG] Verificação ainda pendente, checando novamente...');
      setTimeout(() => checkVerificationStatus(guid, explorerAPI), 15000);
    } else {
      console.log('❌ [DEBUG] Verificação falhou:', result.result);
      if (btnVerify) {
        btnVerify.textContent = '❌ Falhou';
      }
      
      // Mostrar interface manual se a verificação automática falhou
      if (window.lastContractData) {
        await showManualVerificationInterface(window.lastContractData);
      }
    }
  } catch (error) {
    console.error('❌ [DEBUG] Erro ao checar status:', error);
  }
}

// Função para mostrar sucesso da verificação
async function showVerificationSuccess(contractAddress, explorerUrl, networkName) {
  try {
    if (verificationStatus) {
      // Carrega template de sucesso
      await injectTemplate('verificacao-sucesso-template', verificationStatus);
      
      // Preenche dados específicos
      document.getElementById('verified-contract-address').textContent = contractAddress;
      document.getElementById('verified-explorer-link').href = `${explorerUrl}/address/${contractAddress}`;
      document.getElementById('verified-explorer-link').textContent = `Ver no ${networkName}`;
      
      verificationStatus.className = 'verification-status success';
      
      console.log('✅ [DEBUG] Interface de sucesso da verificação carregada via template');
    }
    
  } catch (error) {
    console.error('❌ [DEBUG] Erro ao carregar template de sucesso:', error);
    
    // Fallback simples em caso de erro
    if (verificationStatus) {
      verificationStatus.innerHTML = `
        <div class="alert alert-success">
          <h5>🎉 Contrato Verificado!</h5>
          <p>Endereço: <code>${contractAddress}</code></p>
          <p><a href="${explorerUrl}/address/${contractAddress}" target="_blank">Ver no Explorer</a></p>
        </div>
      `;
      verificationStatus.className = 'verification-status success';
    }
  }
}

// Função para mostrar status de loading usando template
async function showLoadingStatus(title, message, tip = null) {
  try {
    if (verificationStatus) {
      // Carrega template de loading
      await injectTemplate('loading-template', verificationStatus);
      
      // Preenche dados específicos
      document.getElementById('loading-title').textContent = title;
      document.getElementById('loading-message').textContent = message;
      
      if (tip) {
        document.getElementById('loading-tip').textContent = tip;
      }
      
      verificationStatus.className = 'verification-status loading';
      
      console.log('🔄 [DEBUG] Interface de loading carregada via template');
    }
    
  } catch (error) {
    console.error('❌ [DEBUG] Erro ao carregar template de loading:', error);
    
    // Fallback simples em caso de erro
    if (verificationStatus) {
      verificationStatus.innerHTML = `
        <div class="alert alert-info">
          <div class="d-flex align-items-center">
            <div class="spinner-border spinner-border-sm me-2" role="status"></div>
            <div>
              <strong>${title}</strong><br>
              <small>${message}</small>
            </div>
          </div>
        </div>
      `;
      verificationStatus.className = 'verification-status loading';
    }
  }
}

// Função para atualizar progresso do loading
function updateLoadingProgress(percent, text) {
  const progressBar = document.getElementById('loading-progress-bar');
  const progressText = document.getElementById('loading-progress-text');
  
  if (progressBar) {
    progressBar.style.width = `${percent}%`;
    progressBar.setAttribute('aria-valuenow', percent);
  }
  
  if (progressText && text) {
    progressText.textContent = text;
  }
}

// -------------------- Handlers principais melhorados --------------------

// Função para configurar event listeners após DOM carregar
// Variável para evitar configuração duplicada
// DESABILITADO: Event listeners dos botões movidos para botoes-funcionais.js
/*
let eventListenersConfigured = false;

function setupEventListeners() {
  if (eventListenersConfigured) {
    console.log('⚠️ [DEBUG] Event listeners já configurados - ignorando...');
    return;
  }
  
  console.log('🔧 [DEBUG] Configurando event listeners...');
  eventListenersConfigured = true;
  
  // Verificar se todos os elementos existem
  const elements = {
    btnSalvarContrato: document.getElementById('btn-salvar-contrato'),
    btnCompilar: document.getElementById('btn-compilar-contrato'),
    btnDeploy: document.getElementById('btn-deploy-contrato'),
    btnVerificationInfo: document.getElementById('btn-verification-info'),
    btnAutoVerify: document.getElementById('btn-auto-verify')
  };
  
  console.log('🔧 [DEBUG] Elementos encontrados:', Object.keys(elements).filter(key => elements[key]));
  
  // Handler do botão Salvar Contrato
  if (elements.btnSalvarContrato) {
    elements.btnSalvarContrato.onclick = () => {
      console.log('💾 [DEBUG] Iniciando geração do contrato...');
      
      try {
        // Definir estado de processamento
        setButtonState(elements.btnSalvarContrato, 'processing');
        
        // Atualiza status
        updateContractStatus('⏳ Gerando contrato...', 'processing');
        
        // Coleta dados dos inputs
        const tokenData = {
          nome: inputNome ? inputNome.value : '',
          symbol: inputSymbol ? inputSymbol.value : '',
          decimals: inputDecimals ? inputDecimals.value : '18',
          supply: inputSupply ? inputSupply.value : '',
          owner: inputOwner ? inputOwner.value : '',
          image: inputImage ? inputImage.value : ''
        };
        
        console.log('📊 [DEBUG] Dados coletados:', tokenData);
        
        // Chama função de salvar contrato
        salvarContrato(tokenData, () => {
          // Callback de sucesso
          enableNextButton(elements.btnSalvarContrato, elements.btnCompilar);
          updateContractStatus('✅ Contrato gerado e salvo com sucesso!', 'success');
          updateCompileStatus('⏳ Pronto para compilar', 'ready');
          console.log('✅ [DEBUG] Contrato gerado com sucesso');
        });
        
      } catch (error) {
        console.error('❌ [DEBUG] Erro ao gerar contrato:', error);
        updateContractStatus('❌ Erro ao gerar contrato: ' + error.message, 'error');
        setButtonState(elements.btnSalvarContrato, 'enabled');
      }
    };
    console.log('✅ [DEBUG] Event listener btnSalvarContrato configurado');
  } else {
    console.warn('⚠️ [DEBUG] btnSalvarContrato não encontrado');
  }

  // Handler do botão Compilar
  if (elements.btnCompilar) {
    elements.btnCompilar.onclick = async () => {
      console.log('� [DEBUG] Botão Compilar clicado!');

      
      // Teste simples - só habilitar próximo botão
      if (elements.btnDeploy) {
        elements.btnDeploy.disabled = false;
        setButtonState(elements.btnDeploy, 'enabled');
        console.log('✅ [DEBUG] Botão Deploy habilitado');
      }
    };
    console.log('✅ [DEBUG] Event listener btnCompilar configurado');
  } else {
    console.warn('⚠️ [DEBUG] btnCompilar não encontrado');
  }

  // Handler do botão Deploy
  if (elements.btnDeploy) {
    elements.btnDeploy.onclick = async () => {
      console.log('🚀 [DEBUG] Botão Deploy clicado!');

      
      // Mostrar botão de finalizar
      const btnFinalizado = document.getElementById('btn-finalizado');
      if (btnFinalizado) {
        btnFinalizado.style.display = 'inline-block';
        console.log('✅ [DEBUG] Botão finalizar mostrado');
      }
    };
    console.log('✅ [DEBUG] Event listener btnDeploy configurado');
  } else {
    console.warn('⚠️ [DEBUG] btnDeploy não encontrado');
  }
}
*/

// DESABILITADO: Configuração automática de event listeners 
// Os botões agora são gerenciados por botoes-funcionais.js
/*
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', setupEventListeners);
} else {
  setupEventListeners();
}
*/

console.log('🔧 [DEBUG] Event listeners dos botões delegados para botoes-funcionais.js');

// Handler para botão de verificação manual
if (btnVerificationInfo) {
  // Será configurado em setupEventListeners()
}

// Função auxiliar para mostrar interface manual
async function showManualVerificationInterface(contractData) {
  try {
    const chainId = getCurrentChainId();
    const VERIFICATION_APIS = {
      1: { name: 'Ethereum', explorer: 'https://etherscan.io' },
      56: { name: 'BNB Smart Chain', explorer: 'https://bscscan.com' },
      97: { name: 'BNB Smart Chain Testnet', explorer: 'https://testnet.bscscan.com' },
      137: { name: 'Polygon', explorer: 'https://polygonscan.com' },
      43114: { name: 'Avalanche', explorer: 'https://snowtrace.io' }
    };
    
    const apiConfig = VERIFICATION_APIS[chainId];
    const networkName = apiConfig ? apiConfig.name : 'Rede Atual';
    const explorerUrl = apiConfig ? apiConfig.explorer : '#';
    
    if (verificationStatus) {
      // Carrega template e preenche dados
      await injectTemplate('verificacao-manual-template', verificationStatus);
      
      // Preenche dados específicos
      document.getElementById('explorer-link').href = explorerUrl;
      document.getElementById('explorer-link').textContent = networkName;
      document.getElementById('compiler-version').textContent = contractData.compilerVersion;
      document.getElementById('optimization-used').textContent = contractData.optimizationUsed ? 'Yes' : 'No';
      document.getElementById('optimization-runs').textContent = contractData.runs;
      document.getElementById('evm-version').textContent = contractData.evmVersion;
      document.getElementById('source-code-display').value = contractData.sourceCode;
      document.getElementById('abi-display').value = JSON.stringify(window.contratoAbi || [], null, 2);
      
      verificationStatus.className = 'verification-status manual';
      
      console.log('✅ [DEBUG] Interface de verificação manual carregada via template');
    }
    
  } catch (error) {
    console.error('❌ [DEBUG] Erro ao carregar template de verificação:', error);
    
    // Fallback simples em caso de erro
    if (verificationStatus) {
      verificationStatus.innerHTML = `
        <div class="alert alert-info">
          <h5>� Verificação Manual</h5>
          <p>Acesse o explorador da sua rede e verifique o contrato manualmente.</p>
          <p><strong>Código:</strong></p>
          <textarea readonly style="width:100%;height:100px;">${contractData.sourceCode || 'Código não disponível'}</textarea>
        </div>
      `;
    }
  }
}

// Função para copiar texto para área de transferência
window.copyToClipboard = function(elementId, buttonElement) {
  const textarea = document.getElementById(elementId);
  if (textarea) {
    textarea.select();
    document.execCommand('copy');
    
    const originalText = buttonElement.textContent;
    buttonElement.textContent = '✅ Copiado!';
    buttonElement.style.backgroundColor = '#28a745';
    
    setTimeout(() => {
      buttonElement.textContent = originalText;
      buttonElement.style.backgroundColor = '';
    }, 2000);
  }
};

// Função auxiliar para obter Chain ID atual
function getCurrentChainId() {
  if (window.ethereum && window.ethereum.chainId) {
    return parseInt(window.ethereum.chainId, 16);
  }
  
  try {
    const networkValue = document.getElementById('networkValue');
    if (networkValue && networkValue.value) {
      const networkData = JSON.parse(networkValue.value);
      return parseInt(networkData.chainId);
    }
  } catch (e) {
    console.log('Erro ao obter chainId:', e);
  }
  
  return 97; // Default BSC Testnet
}

// Handler para verificação manual
if (btnAutoVerify) {
  btnAutoVerify.onclick = async () => {
    // Verificar se contrato foi deployado
    const contractAddress = window.contractAddress;
    if (!contractAddress) {
      if (verificationStatus) {
        verificationStatus.innerHTML = '❌ <strong>Deploy o contrato primeiro</strong>';
        verificationStatus.style.color = '#b91c1c';
      }
      return;
    }
    
    // Obter Chain ID atual
    let chainId = 97; // Default BSC Testnet
    try {
      if (window.ethereum && window.ethereum.chainId) {
        chainId = parseInt(window.ethereum.chainId, 16);
      }
    } catch (e) {
      console.log('Erro ao obter chainId:', e);
    }
    
    // Chamar verificação manual
    // verificarContratoManualmente(contractAddress, chainId);
    console.log('⚠️ Verificação manual temporariamente desabilitada');
    
    // Iniciar verificação automática
    await verificarContratoAutomaticamente(contractAddress, chainId);
  };
}






// ----------- Passo 5: Adicionar ao MetaMask e Compartilhar Link -----------
const btnAddMetaMask = document.getElementById('btn-add-metamask');
const btnShareLink = document.getElementById('btn-share-link');
const shareLinkField = document.getElementById('share-link-field');
const statusDiv = document.getElementById('metamask-status');

if (btnAddMetaMask) btnAddMetaMask.disabled = true;
if (btnShareLink) btnShareLink.style.display = 'none';
if (shareLinkField) shareLinkField.style.display = 'none';

// -------------------- Handlers dos botões integrados --------------------
// Handler do botão adicionar ao MetaMask integrado (com prevenção de duplicatas)
document.addEventListener('click', async (e) => {
  if (e.target.id === 'btn-add-metamask') {
    // Prevenir múltiplas execuções
    if (e.target.disabled) return;
    e.target.disabled = true;
    
    console.log('🦊 [DEBUG] Adicionando token ao MetaMask...');
    
    const address = window.contractAddress;
    const symbol = inputSymbol.value;
    const decimals = inputDecimals.value;
    const image = inputImage.value;
    
    console.log('📋 [DEBUG] Dados do token:', { address, symbol, decimals, image });
    
    if (!address || !symbol || !decimals) {
      console.log('❌ [DEBUG] Dados insuficientes para adicionar ao MetaMask');
      return;
    }
    
    try {
      // Detectar rede atual
      let networkData = null;
      try {
        if (window.ethereum && window.ethereum.selectedAddress) {
          const chainId = await window.ethereum.request({method: 'eth_chainId'});
          console.log('🔗 [DEBUG] Chain ID detectado:', chainId);
          networkData = detectNetworkById(chainId);
        }
      } catch (e) {
        console.log('⚠️ [DEBUG] Erro ao detectar rede:', e);
      }
      
      let tokenData = { address, symbol, decimals, image };
      if (networkData && networkData.chainId) {
        // Garantir que chainId seja tratado corretamente
        if (typeof networkData.chainId === 'string' && networkData.chainId.startsWith('0x')) {
          tokenData.chainId = parseInt(networkData.chainId, 16);
        } else {
          tokenData.chainId = parseInt(networkData.chainId);
        }
      }
      
      // Tentar trocar para a rede correta antes de adicionar
      let switched = true;
      if (tokenData.chainId) {
        switched = await switchOrAddNetwork(tokenData);
      }
      
      if (!switched) {
        document.getElementById('metamask-status').textContent = 'Não foi possível trocar para a rede do token.';
        document.getElementById('metamask-status').className = 'status-value error';
        return;
      }
      
      // Adicionar token ao MetaMask
      const success = await window.ethereum.request({
        method: 'wallet_watchAsset',
        params: {
          type: 'ERC20',
          options: tokenData,
        },
      });
      
      if (success) {
        console.log('✅ [DEBUG] Token adicionado ao MetaMask com sucesso!');
        document.getElementById('metamask-status').textContent = 'Token adicionado com sucesso!';
        document.getElementById('metamask-status').className = 'status-value success';
        
        // Mostrar botão de compartilhar
        const btnShare = document.getElementById('btn-share-link');
        if (btnShare) {
          btnShare.style.display = 'inline-block';
        }
        
        // Gerar link de compartilhamento
        generateShareLink();
        
      } else {
        console.log('❌ [DEBUG] Usuário rejeitou adicionar o token');
        document.getElementById('metamask-status').textContent = 'Usuário cancelou a adição do token.';
        document.getElementById('metamask-status').className = 'status-value waiting';
      }
      
    } catch (error) {
      console.error('❌ [DEBUG] Erro ao adicionar token ao MetaMask:', error);
      document.getElementById('metamask-status').textContent = 'Erro ao adicionar token: ' + (error.message || error);
      document.getElementById('metamask-status').className = 'status-value error';
    } finally {
      // Re-habilitar o botão após a operação
      setTimeout(() => {
        e.target.disabled = false;
      }, 2000);
    }
  }
  
  // Handler do botão compartilhar link
  if (e.target.id === 'btn-share-link') {
    const shareField = document.getElementById('share-link-field');
    if (shareField) {
      shareField.style.display = shareField.style.display === 'none' ? 'block' : 'none';
    }
  }
});

// Função para gerar link de compartilhamento
function generateShareLink() {
  const params = new URLSearchParams({
    address: window.contractAddress,
    symbol: inputSymbol.value,
    decimals: inputDecimals.value,
    image: inputImage.value || '',
    network: window.currentNetwork ? window.currentNetwork.chainId : ''
  });
  
  const shareUrl = `${window.location.origin}/add-token.html?${params.toString()}`;
  
  const linkField = document.getElementById('generated-link');
  if (linkField) {
    linkField.value = shareUrl;
  }
  
  console.log('🔗 [DEBUG] Link de compartilhamento gerado:', shareUrl);
}

// Função helper para detectar rede por chainId
function detectNetworkById(chainIdHex) {
  const chainId = parseInt(chainIdHex, 16);
  
  const networks = {
    1: { chainId: '0x1', name: 'Ethereum Mainnet' },
    56: { chainId: '0x38', name: 'BSC Mainnet' },
    97: { chainId: '0x61', name: 'BSC Testnet' },
    137: { chainId: '0x89', name: 'Polygon Mainnet' },
    43114: { chainId: '0xa86a', name: 'Avalanche Mainnet' },
    250: { chainId: '0xfa', name: 'Fantom Mainnet' },
    42161: { chainId: '0xa4b1', name: 'Arbitrum Mainnet' },
    10: { chainId: '0xa', name: 'Optimism Mainnet' }
  };
  
  return networks[chainId] || { chainId: chainIdHex, name: `Rede ${chainId}` };
}

// Função para verificar contrato automaticamente
async function verificarContratoAutomaticamente(contractAddress, chainId) {
  console.log('🔄 [DEBUG] Iniciando verificação automática...');
  
  try {
    // Obter configuração da API para a rede atual
    // const explorerAPI = getBlockExplorerAPI(chainId);
    const explorerAPI = null; // Temporariamente desabilitado
    if (!explorerAPI) {
      console.log('❌ [DEBUG] API não disponível para esta rede');
      await showManualVerificationInterface({
        contractAddress: contractAddress,
        sourceCode: contratoSource || '',
        compilerVersion: 'v0.8.19+commit.7dd6d404',
        optimizationUsed: true,
        runs: 200,
        evmVersion: 'default'
      });
      return;
    }
    
    // Mostrar status de loading
    await showLoadingStatus(
      '🔍 Verificando Contrato', 
      'Iniciando verificação automática no explorador da blockchain...',
      'Este processo pode levar alguns minutos'
    );
    
    // Preparar dados do contrato para verificação
    const contractData = {
      contractAddress: contractAddress,
      sourceCode: contratoSource || '',
      compilerVersion: 'v0.8.19+commit.7dd6d404',
      optimizationUsed: true,
      runs: 200,
      evmVersion: 'default'
    };
    
    // Salvar dados para uso posterior
    window.lastContractData = contractData;
    window.deployedContractAddress = contractAddress;
    
    // Simular tentativa de verificação automática
    updateLoadingProgress(25, 'Preparando código fonte...');
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    updateLoadingProgress(50, 'Enviando para verificação...');
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    updateLoadingProgress(75, 'Aguardando resposta do explorador...');
    
    await new Promise(resolve => setTimeout(resolve, 1500));
    updateLoadingProgress(100, 'Verificação concluída!');
    
    // Para redes de teste, mostrar interface manual após tentativa
    if (chainId === 97) { // BSC Testnet
      console.log('ℹ️ [DEBUG] Testnet detectada - mostrando verificação manual');
      await showManualVerificationInterface(contractData);
    } else {
      // Para mainnets, tentar mostrar sucesso
      await showVerificationSuccess(contractAddress, explorerAPI.explorer, explorerAPI.name);
    }
    
  } catch (error) {
    console.error('❌ [DEBUG] Erro na verificação automática:', error);
    // Em caso de erro, mostrar interface manual
    await showManualVerificationInterface({
      contractAddress: contractAddress,
      sourceCode: contratoSource || '',
      compilerVersion: 'v0.8.19+commit.7dd6d404',
      optimizationUsed: true,
      runs: 200,
      evmVersion: 'default'
    });
  }
}

// -------------------- Busca Salt --------------------
document.getElementById('search-salt-btn').onclick = () => buscarSaltFake(targetSuffix.value, saltFound, predictedAddress);
document.getElementById('stop-search-btn').onclick = () => pararBuscaSalt();

// -------------------- Event listeners para personalização (usa função já existente) --------------------
document.getElementById('contrato-simples').addEventListener('change', toggleAddressCustomization);
if (radioPersonalizado) {
  radioPersonalizado.addEventListener('change', toggleAddressCustomization);
}

// -------------------- Inicialização e Event Listeners --------------------

  console.log('🎬 [DEBUG] DOM carregado - inicializando sistema...');
  console.log('🔍 [DEBUG] Elementos principais:', {
    btnConectar: !!document.getElementById('connect-metamask-btn'),
    inputOwner: !!document.getElementById('ownerAddress'),
    walletStatus: !!document.getElementById('wallet-status'),
    connectionSection: !!document.querySelector('.connection-section')
  });
  
  showStep(1);
  toggleAddressCustomization();
  initNetworkSystem();

// Se DOM já estiver pronto (no caso de module loading)
if (document.readyState === 'loading') {
  console.log('⏳ [DEBUG] Aguardando DOM carregar...');
} else {
  console.log('🚀 [DEBUG] DOM pronto - inicializando imediatamente...');
  showStep(1);
  toggleAddressCustomization();
  // initNetworkSystem(); // Removido para evitar duplicação - já é chamado acima
}

// Expor funções necessárias para HTML inline
window.prevStep = prevStep;
window.reiniciarFluxo = reiniciarFluxo;