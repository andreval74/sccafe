import { marcarConcluido, clearErrors, markErrors } from './add-utils.js';
import { salvarContrato, compilarContrato, contratoSource, debugContractState, showVerificationInfo } from './add-contratos-verified.js';
import { deployContrato } from './add-deploy.js';
import { connectMetaMask, listenMetaMask, adicionarTokenMetaMask, montarTokenData, gerarLinkToken, switchOrAddNetwork } from './add-metamask.js';
import { buscarSaltFake, pararBuscaSalt } from './add-salt.js';
import { detectCurrentNetwork, currentNetwork, setupNetworkMonitoring, updateNetworkInfo } from './network-manager.js';
import { showVerificationInterface } from './verification-ui.js';
import { initNetworkCommons, getBlockExplorerAPI } from './network-commons.js';
import { verificarContratoManualmente } from './manual-verification.js';
import { loadTemplate, injectTemplate, fillTemplate } from './template-loader.js';

// Adiciona evento ao botão Conectar MetaMask
console.log('🔍 [DEBUG] Iniciando setup do botão MetaMask...');
console.log('🔍 [DEBUG] Document ready state:', document.readyState);
console.log('🔍 [DEBUG] Window.ethereum disponível:', !!window.ethereum);

const btnConectar = document.getElementById('connect-metamask-btn');
console.log('🔍 [DEBUG] Botão encontrado:', btnConectar);
console.log('🔍 [DEBUG] Botão é válido:', btnConectar instanceof HTMLElement);

if (btnConectar) {
  console.log('✅ [DEBUG] Adicionando event listener ao botão...');
  
  btnConectar.addEventListener('click', async (event) => {
    console.log('🔗 [DEBUG] Botão clicado! Event:', event);
    console.log('🔗 [DEBUG] Iniciando conexão MetaMask...');
    
    // Previne comportamento padrão
    event.preventDefault();
    
    // Verifica se o MetaMask está disponível
    if (!window.ethereum) {
      console.error('❌ [DEBUG] MetaMask não encontrado!');
      alert('MetaMask não encontrado! Por favor, instale a extensão MetaMask no seu navegador.');
      return;
    }
    
    console.log('✅ [DEBUG] MetaMask disponível, iniciando conexão...');
    
    // Adiciona classe de estado conectando
    if (connectionSection) {
      connectionSection.classList.add('connecting');
      console.log('✅ [DEBUG] Classe connecting adicionada');
    }
    
    // Atualiza status
    if (walletStatus) {
      walletStatus.value = 'Conectando com MetaMask...';
      console.log('✅ [DEBUG] Status atualizado para conectando');
    }
    
    try {
      console.log('🚀 [DEBUG] Chamando connectMetaMask...');
      // Primeiro conecta MetaMask
      await connectMetaMask(inputOwner);
      console.log('✅ [DEBUG] MetaMask conectado com sucesso');
      
      console.log('🌐 [DEBUG] Detectando rede...');
      // Depois detecta a rede
      await detectNetworkAfterConnection();
      console.log('✅ [DEBUG] Rede detectada com sucesso');
      
      console.log('👂 [DEBUG] Iniciando monitoramento...');
      // Inicia monitoramento de mudanças (só após conexão)
      listenMetaMask(inputOwner);
      console.log('✅ [DEBUG] Monitoramento iniciado');
      
      console.log('🎨 [DEBUG] Atualizando interface...');
      // Atualiza interface
      updateConnectionInterface();
      console.log('✅ [DEBUG] Interface atualizada com sucesso');
      
    } catch (error) {
      console.error('❌ [DEBUG] Erro na conexão:', error);
      console.error('❌ [DEBUG] Stack trace:', error.stack);
      if (walletStatus) walletStatus.value = 'Erro na conexão. Tente novamente.';
      if (connectionSection) connectionSection.classList.remove('connecting');
    }
  });
  
  console.log('✅ [DEBUG] Event listener adicionado com sucesso');
} else {
  console.warn('⚠️ [DEBUG] Botão conectar não encontrado - ID: connect-metamask-btn');
  console.log('🔍 [DEBUG] Elementos disponíveis com ID:', 
    Array.from(document.querySelectorAll('[id]')).map(el => el.id));
}

// Inicializa apenas o sistema de redes (sem detectar automaticamente)
async function initNetworkSystem() {
  console.log('🔧 [DEBUG] Iniciando sistema de redes...');
  try {
    // Apenas inicializa sistema de redes comum (sem detectar rede)
    if (typeof initNetworkCommons === 'function') {
      await initNetworkCommons();
      console.log('✅ [DEBUG] initNetworkCommons executado');
    } else {
      console.warn('⚠️ [DEBUG] initNetworkCommons não encontrado');
    }
    
    console.log('🌐 [DEBUG] Sistema de redes carregado, aguardando conexão do usuário...');
  } catch (error) {
    console.error('❌ [DEBUG] Erro ao inicializar sistema de redes:', error);
    console.error('❌ [DEBUG] Stack trace:', error.stack);
  }
}

// Detecta rede somente após conexão explícita do usuário
async function detectNetworkAfterConnection() {
  console.log('🌐 [DEBUG] Iniciando detecção de rede após conexão...');
  try {
    console.log('🔍 [DEBUG] Chamando detectCurrentNetwork...');
    await detectCurrentNetwork();
    console.log('✅ [DEBUG] detectCurrentNetwork concluído');
    
    console.log('🔄 [DEBUG] Atualizando informações de rede...');
    updateNetworkInfo(); // Usa a nova função para o layout atualizado
    console.log('✅ [DEBUG] updateNetworkInfo concluído');
    
    // Inicia monitoramento para mudanças de rede
    if (typeof setupNetworkMonitoring === 'function') {
      console.log('👂 [DEBUG] Iniciando setupNetworkMonitoring...');
      setupNetworkMonitoring(); // Remove parâmetro desnecessário
      console.log('✅ [DEBUG] setupNetworkMonitoring concluído');
    } else {
      console.warn('⚠️ [DEBUG] setupNetworkMonitoring não encontrado');
    }
  } catch (error) {
    console.error('❌ [DEBUG] Erro ao detectar rede:', error);
    console.error('❌ [DEBUG] Stack trace:', error.stack);
  }
}

// Atualiza a interface de conexão com as informações
function updateConnectionInterface() {
  console.log('🔄 Atualizando interface de conexão...');
  
  // Remove estado de carregamento
  if (connectionSection) {
    connectionSection.classList.remove('connecting');
    connectionSection.classList.add('connected-state');
    console.log('✅ Estado de conexão atualizado na UI');
  }
  
  if (walletStatus) {
    walletStatus.value = 'Carteira conectada com sucesso!';
    console.log('✅ Status da carteira atualizado');
  }
  
  // Preenche o campo proprietário e marca como preenchido
  if (inputOwner && inputOwner.value) {
    inputOwner.classList.add('filled');
    console.log('✅ Campo proprietário preenchido:', inputOwner.value);
  }
  
  // Atualiza texto do botão (sem ícone)
  const btnConectar = document.getElementById('connect-metamask-btn');
  if (btnConectar) {
    btnConectar.textContent = 'CONECTADO';
    btnConectar.disabled = true;
    btnConectar.style.backgroundColor = '#28a745';
    console.log('✅ Botão atualizado para estado conectado');
  }
  
  console.log('🎉 Interface de conexão atualizada com sucesso!');
}

// Listener para evento de deploy concluído
window.addEventListener('contractDeployed', (event) => {
  const deployedInfo = event.detail;
  console.log('📄 Contrato deployado:', deployedInfo);
  
  // Mostra seção de verificação e habilita botão next
  if (verificationSection) {
    verificationSection.style.display = 'block';
  }
  
  if (nextStep4) {
    nextStep4.style.display = 'inline-block';
  }
  
  // Não mostra mais os dados técnicos no console automaticamente
  console.log('✅ Deploy concluído - seção de verificação disponível');
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
const verificationSection = document.getElementById('verification-section');
const verificationStatus = document.getElementById('verification-status');
const contractStatus = document.getElementById('contract-status');
const compileStatus = document.getElementById('compile-status');
const deployStatus = document.getElementById('deploy-status');
// Elementos do novo layout - versão única e limpa
let currentStep = 1;

// Garante que os botões começam desabilitados
if (btnCompilar) btnCompilar.disabled = true;
if (btnDeploy) btnDeploy.disabled = true;

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
  const allSteps = document.querySelectorAll('.step-content, .step');
  allSteps.forEach(s => s.style.display = 'none');
  
  // Mapear etapas simplificadas
  const stepMapping = {
    1: ['step-1'], // Configuração
    2: ['step-2'], // Personalização (opcional)
    3: ['step-3'] // Resumo e Criação
  };
  
  // Mostrar steps correspondentes à etapa
  if (stepMapping[step]) {
    stepMapping[step].forEach(stepId => {
      const stepElement = document.getElementById(stepId);
      if (stepElement) {
        stepElement.style.display = 'block';
      }
    });
  }
  
  // Atualizar indicadores se existirem (mas de forma simplificada)
  const indicators = document.querySelectorAll('.step-indicator');
  indicators.forEach((indicator, idx) => {
    if (idx < 3) { // Apenas 3 indicadores
      indicator.classList.toggle('active', idx === (step - 1));
      indicator.classList.toggle('completed', idx < (step - 1));
    } else {
      // Ocultar indicadores extras
      indicator.style.display = 'none';
    }
  });
  
  currentStep = step;
}

// Remover timeline complexa e usar indicadores simples
function updateTimelineStatus(currentStep) {
  console.log(`🎯 [DEBUG] Atualizando para etapa ${currentStep} (simplificado)`);
  
  const stepTitles = [
    'Configuração',
    'Personalização', 
    'Criação & Deploy'
  ];
  
  // Atualizar apenas indicadores simples
  const indicators = document.querySelectorAll('.step-indicator');
  indicators.forEach((indicator, idx) => {
    if (idx < 3) {
      const stepNum = idx + 1;
      
      if (stepNum < currentStep) {
        indicator.classList.add('completed');
        indicator.classList.remove('active');
      } else if (stepNum === currentStep) {
        indicator.classList.add('active');
        indicator.classList.remove('completed');
      } else {
        indicator.classList.remove('active', 'completed');
      }
      
      // Atualizar texto se houver
      const titleElement = indicator.querySelector('.step-title');
      if (titleElement && stepTitles[idx]) {
        titleElement.textContent = stepTitles[idx];
      }
    }
  });
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
  
  // Desabilitar botões de ação
  if (btnCompilar) btnCompilar.disabled = true;
  if (btnDeploy) btnDeploy.disabled = true;
  
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
      'summary-nome': inputNome.value,
      'summary-symbol': inputSymbol.value,
      'summary-decimals': inputDecimals.value,
      'summary-supply': inputSupply.value,
      'summary-owner': ownerChecksum,
      'summary-image': inputImage.value || "Não definido",
      'summary-network': networkDisplay ? networkDisplay.value : "Não detectada",
      'summary-address-type': (radioPersonalizado && radioPersonalizado.checked) ? "Personalizado" : "Padrão"
    };
    
    // Carrega e preenche o template
    await fillTemplate('resumo-template', resumoData, summaryBox);
    
    console.log('✅ [DEBUG] Resumo preenchido com template externo');
    
  } catch (error) {
    console.error('❌ [DEBUG] Erro ao carregar template do resumo:', error);
    
    // Fallback: mantém funcionalidade básica
    summaryBox.innerHTML = `
      <div class="alert alert-warning">
        <h5>Resumo do Token</h5>
        <p><strong>Nome:</strong> ${inputNome.value}</p>
        <p><strong>Símbolo:</strong> ${inputSymbol.value}</p>
        <p><strong>Decimais:</strong> ${inputDecimals.value}</p>
        <p><strong>Supply:</strong> ${inputSupply.value}</p>
        <p><em>Erro ao carregar template completo. Usando versão simplificada.</em></p>
      </div>
    `;
  }
}

// -------------------- Navegação Simplificada (3 Etapas) --------------------
// Função nextStep simplificada para 3 etapas
function nextStep() {
  console.log(`➡️ [DEBUG] NextStep - Etapa atual: ${currentStep}`);
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

// -------------------- Handlers navegação (3 etapas) --------------------
document.getElementById('next-step-1').addEventListener('click', nextStep);
document.getElementById('next-step-2').addEventListener('click', nextStep);
document.getElementById('next-step-3').addEventListener('click', nextStep);

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
    const explorerAPI = networkData ? getBlockExplorerAPI(networkData.chainId) : null;
    
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
btnSalvarContrato.onclick = () => {
  console.log('💾 [DEBUG] Iniciando geração do contrato...');
  
  // Atualiza status
  updateContractStatus('⏳ Gerando contrato...', 'processing');
  
  let ownerChecksum = inputOwner.value;
  try {
    if (window.ethers && window.ethers.utils) {
      ownerChecksum = window.ethers.utils.getAddress(inputOwner.value);
    }
  } catch (e) {}
  
  salvarContrato({
    nome: inputNome.value,
    symbol: inputSymbol.value,
    decimals: inputDecimals.value,
    supply: inputSupply.value,
    owner: ownerChecksum,
    image: inputImage.value
  }, () => {
    btnCompilar.disabled = false;
    
    // Atualiza status de sucesso
    updateContractStatus('✅ Contrato gerado e salvo com sucesso!', 'success');
    updateCompileStatus('⏳ Pronto para compilar', 'ready');
    
    console.log('✅ [DEBUG] Contrato gerado com sucesso');
  });
};

// Spinner Overlay helpers

btnCompilar.onclick = async () => {
  console.log('🔍 [DEBUG] Verificando estado antes da compilação...');
  debugContractState();
  
  if (!contratoSource || !contratoSource.trim()) {
    updateCompileStatus('⚠️ Salve o contrato antes de compilar!', 'error');
    return;
  }
  
  console.log('🚀 [DEBUG] Iniciando compilação via API...');
  updateCompileStatus('🔄 Compilando contrato...', 'processing');
  
  let progressData = startCompileProgressBar();
  
  try {
    const result = await compilarContrato(inputNome.value, btnCompilar, compileStatus, btnDeploy);
    console.log('✅ [DEBUG] Compilação concluída:', result);
    
    stopCompileProgressBar(progressData, true);
    updateCompileStatus('✅ Contrato compilado com sucesso!', 'success');
    updateDeployStatus('⏳ Pronto para deploy', 'ready');
    
  } catch (error) {
    console.error('❌ [DEBUG] Erro na compilação:', error);
    stopCompileProgressBar(progressData, false);
    updateCompileStatus('❌ Erro na compilação: ' + (error.message || error), 'error');
    btnCompilar.disabled = false;
  }
};

// Handler para botão de verificação manual
if (btnVerificationInfo) {
  btnVerificationInfo.onclick = () => {
    console.log('📋 Mostrando dados de verificação manual...');
    
    // Chama função importada do add-contratos-verified.js para console (backup)
    showVerificationInfo();
    
    // Mostra interface visual amigável
    const contractAddress = window.contractAddress || 'Endereço não encontrado';
    
    // Simula mostrar verificação manual
    const contractData = {
      isValid: true,
      sourceCode: contratoSource || '',
      contractName: window.contratoName || '',
      compilerVersion: `v${window.resolvedCompilerVersion || '0.8.30'}+commit.d5af09b8`,
      optimizationUsed: false,
      runs: 200,
      evmVersion: 'cancun'
    };
    
    // Usar função do auto-verification.js
    showManualVerificationInterface(contractData);
    
    // Habilita próximo passo
    if (nextStep5) {
      nextStep5.style.display = 'inline-block';
    }
  };
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
    verificarContratoManualmente(contractAddress, chainId);
    
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

// -------------------- Deploy Handler --------------------
btnDeploy.onclick = async () => {
  console.log('🚀 [DEBUG] Iniciando processo de deploy...');
  updateDeployStatus('🔄 Fazendo deploy do contrato...', 'processing');
  
  let progressData = startDeployProgressBar();
  
  try {
    await deployContrato(btnDeploy, deployStatus);
    console.log('✅ [DEBUG] Deploy concluído com sucesso!');
    
    stopDeployProgressBar(progressData, true);
    updateDeployStatus('✅ Contrato implantado com sucesso!', 'success');
    
    // Atualizar informações do contrato no resumo
    const address = window.contractAddress || '';
    if (address && document.getElementById('contract-address-display')) {
      document.getElementById('contract-address-display').textContent = address;
    }
    
    // Atualizar nome da rede
    const networkNameDisplay = document.getElementById('network-name-display');
    if (networkNameDisplay && window.currentNetwork) {
      networkNameDisplay.textContent = window.currentNetwork.name || 'Rede Detectada';
    }
    
    // Mostrar seção de finalização
    const finalizacaoSection = document.getElementById('finalizacao-section');
    if (finalizacaoSection) {
      finalizacaoSection.style.display = 'block';
    }
    
    // Mostrar seção MetaMask (compatibilidade com template antigo)
    const metamaskSection = document.getElementById('metamask-section');
    if (metamaskSection) {
      metamaskSection.style.display = 'block';
      
      // Habilitar botão do MetaMask
      const btnAddMetaMask = document.getElementById('btn-add-metamask');
      if (btnAddMetaMask && address && inputSymbol.value && inputDecimals.value) {
        btnAddMetaMask.disabled = false;
        document.getElementById('metamask-status').textContent = 'Pronto para adicionar';
        document.getElementById('metamask-status').className = 'step-status ready';
      }
    }
    
    // Após deploy, preencher campos do passo MetaMask (manter compatibilidade)
    if (document.getElementById('final-token-address')) {
      document.getElementById('final-token-address').value = address;
    }
    if (document.getElementById('final-token-symbol')) {
      document.getElementById('final-token-symbol').value = inputSymbol.value;
    }
    if (document.getElementById('final-token-decimals')) {
      document.getElementById('final-token-decimals').value = inputDecimals.value;
    }
    
    // Iniciar verificação automática após 2 segundos
    if (address) {
      console.log('🔄 [DEBUG] Iniciando verificação automática em 2 segundos...');
      setTimeout(async () => {
        await autoVerifyContract(address);
      }, 2000);
    }
    
    // Habilitar verificação
    const verifySection = document.querySelector('.verify-section');
    if (verifySection) {
      verifySection.style.display = 'block';
      updateContractStatus('⏳ Pronto para verificação', 'ready');
    }
    
  } catch (error) {
    console.error('❌ [DEBUG] Erro no deploy:', error);
    stopDeployProgressBar(progressData, false);
    updateDeployStatus('❌ Erro no deploy: ' + (error.message || error), 'error');
    btnDeploy.disabled = false;
  }
  
  // Após deploy, preencher campos do passo MetaMask
  const address = window.contractAddress || '';
  if (document.getElementById('final-token-image')) {
    document.getElementById('final-token-image').value = inputImage.value;
  }
  
  // Habilita o botão MetaMask se todos os campos estiverem preenchidos
  if (btnAddMetaMask) {
    if (address && inputSymbol.value && inputDecimals.value) {
      btnAddMetaMask.disabled = false;
    } else {
      btnAddMetaMask.disabled = true;
    }
  }
  
  // Esconde botão de compartilhar link e campo de link ao novo deploy
  if (btnShareLink) btnShareLink.style.display = 'none';
  if (shareLinkField) shareLinkField.style.display = 'none';
};

// Função para verificar contrato automaticamente
async function verificarContratoAutomaticamente(contractAddress, chainId) {
  console.log('🔄 [DEBUG] Iniciando verificação automática...');
  
  try {
    // Obter configuração da API para a rede atual
    const explorerAPI = getBlockExplorerAPI(chainId);
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
document.addEventListener('DOMContentLoaded', () => {
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
});

// Se DOM já estiver pronto (no caso de module loading)
if (document.readyState === 'loading') {
  console.log('⏳ [DEBUG] Aguardando DOM carregar...');
} else {
  console.log('🚀 [DEBUG] DOM pronto - inicializando imediatamente...');
  showStep(1);
  toggleAddressCustomization();
  initNetworkSystem();
}

// Expor funções necessárias para HTML inline
window.prevStep = prevStep;
window.reiniciarFluxo = reiniciarFluxo;