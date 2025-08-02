import { marcarConcluido, clearErrors, markErrors } from './add-utils.js';
import { salvarContrato, compilarContrato, contratoSource, debugContractState, showVerificationInfo } from './add-contratos-verified.js';
import { deployContrato } from './add-deploy.js';
import { connectMetaMask, listenMetaMask, adicionarTokenMetaMask, montarTokenData, gerarLinkToken, switchOrAddNetwork } from './add-metamask.js';
import { buscarSaltFake, pararBuscaSalt } from './add-salt.js';
import { detectCurrentNetwork, currentNetwork, setupNetworkMonitoring, updateNetworkInfo } from './network-manager.js';
import { showVerificationInterface } from './verification-ui.js';
import { initNetworkCommons, getBlockExplorerAPI } from './network-commons.js';
import { verificarContratoManualmente } from './manual-verification.js';

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
const indicators = document.querySelectorAll('.step');
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

// -------------------- Navegação entre steps --------------------
function showStep(step) {
  console.log(`🔄 [DEBUG] Mudando para step ${step}`);
  
  steps.forEach((el, idx) => {
    el.classList.toggle('active', idx === (step - 1));
  });
  indicators.forEach((el, idx) => {
    el.classList.toggle('active', idx === (step - 1));
    el.classList.toggle('completed', idx < (step - 1));
  });
  currentStep = step;
  
  // Atualiza status visual da timeline
  updateTimelineStatus(step);
}

// Atualiza status visual da timeline
function updateTimelineStatus(currentStep) {
  console.log(`🎯 [DEBUG] Atualizando timeline para step ${currentStep}`);
  
  const stepStatuses = [
    'Coleta de Dados',
    'Personalização',
    'Compilação & Deploy',
    'Verificação',
    'MetaMask'
  ];
  
  // Atualiza indicadores visuais
  indicators.forEach((indicator, idx) => {
    const stepNum = idx + 1;
    
    if (stepNum < currentStep) {
      // Steps concluídos
      indicator.classList.add('completed');
      indicator.classList.remove('active');
      console.log(`✅ [DEBUG] Step ${stepNum} marcado como concluído`);
    } else if (stepNum === currentStep) {
      // Step atual
      indicator.classList.add('active');
      indicator.classList.remove('completed');
      console.log(`⏳ [DEBUG] Step ${stepNum} marcado como ativo`);
    } else {
      // Steps futuros
      indicator.classList.remove('active', 'completed');
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

function nextStep() {
  if (currentStep === 1 && !validateStep1()) return;
  if (currentStep === 2) fillResumo();
  if (currentStep < steps.length) showStep(currentStep + 1);
  if (nextStep4) nextStep4.style.display = "none";
}

function prevStep() {
  if (currentStep > 1) showStep(currentStep - 1);
}

function reiniciarFluxo() {
  console.log('🔄 [DEBUG] Reiniciando fluxo completo...');
  
  document.querySelectorAll('input, select, textarea').forEach(field => {
    if (field.type === "radio" || field.type === "checkbox") field.checked = false;
    else field.value = "";
  });
  inputDecimals.value = '18';
  
  console.log('✅ [DEBUG] Campos limpos');
  
  // Reinicializa interface de conexão (com verificações defensivas)
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
  
  // Reinicializa campos ocultos (com verificações defensivas)
  if (networkDisplay) networkDisplay.value = '';
  if (networkValue) networkValue.value = '';
  
  console.log('🔄 [DEBUG] Interface reinicializada, mostrando step 1');
  showStep(1);
}

// -------------------- Resumo Step Melhorado --------------------
function fillResumo() {
  console.log('📋 [DEBUG] Preenchendo resumo melhorado...');
  
  let ownerChecksum = inputOwner.value;
  try {
    if (window.ethers && window.ethers.utils) {
      ownerChecksum = window.ethers.utils.getAddress(inputOwner.value);
    }
  } catch (e) {
    // Se não conseguir converter, mantém o valor original
  }
  
  // Melhora o layout do resumo para ficar mais parecido com a tela inicial
  summaryBox.innerHTML = `
    <div class="token-summary-card">
      <div class="summary-header">
        <h4><i class="bi bi-check-circle-fill text-success me-2"></i>Resumo do Token</h4>
        <p class="text-muted">Revise as informações antes de prosseguir</p>
      </div>
      
      <div class="row g-3">
        <div class="col-md-6">
          <div class="summary-field">
            <label><i class="bi bi-tag me-1"></i>Nome do Token</label>
            <div class="summary-value">${inputNome.value}</div>
          </div>
        </div>
        
        <div class="col-md-6">
          <div class="summary-field">
            <label><i class="bi bi-code-square me-1"></i>Símbolo</label>
            <div class="summary-value">${inputSymbol.value}</div>
          </div>
        </div>
        
        <div class="col-md-6">
          <div class="summary-field">
            <label><i class="bi bi-123 me-1"></i>Decimais</label>
            <div class="summary-value">${inputDecimals.value}</div>
          </div>
        </div>
        
        <div class="col-md-6">
          <div class="summary-field">
            <label><i class="bi bi-coin me-1"></i>Total Supply</label>
            <div class="summary-value">${inputSupply.value}</div>
          </div>
        </div>
        
        <div class="col-12">
          <div class="summary-field">
            <label><i class="bi bi-person-circle me-1"></i>Proprietário</label>
            <div class="summary-value address-value">${ownerChecksum}</div>
          </div>
        </div>
        
        <div class="col-md-6">
          <div class="summary-field">
            <label><i class="bi bi-image me-1"></i>Logo URL</label>
            <div class="summary-value">${inputImage.value || "Não definido"}</div>
          </div>
        </div>
        
        <div class="col-md-6">
          <div class="summary-field">
            <label><i class="bi bi-globe me-1"></i>Rede</label>
            <div class="summary-value">${networkDisplay ? networkDisplay.value : "Não detectada"}</div>
          </div>
        </div>
        
        <div class="col-12">
          <div class="summary-field">
            <label><i class="bi bi-gear me-1"></i>Tipo de Endereço</label>
            <div class="summary-value">${(radioPersonalizado && radioPersonalizado.checked) ? "Personalizado" : "Padrão"}</div>
          </div>
        </div>
      </div>
      
      <!-- Seção de Deploy integrada -->
      <div class="deploy-section mt-4">
        <h5><i class="bi bi-rocket-takeoff me-2"></i>Deploy do Contrato</h5>
        <div class="deploy-controls">
          <div class="row g-2">
            <div class="col-12">
              <div class="status-item">
                <span class="status-label">Status do Contrato:</span>
                <span id="contract-status" class="status-value">Aguardando...</span>
              </div>
            </div>
            <div class="col-12">
              <div class="status-item">
                <span class="status-label">Status da Compilação:</span>
                <span id="compile-status" class="status-value">Aguardando...</span>
              </div>
            </div>
            <div class="col-12">
              <div class="status-item">
                <span class="status-label">Status do Deploy:</span>
                <span id="deploy-status" class="status-value">Aguardando...</span>
              </div>
            </div>
          </div>
          
          <div class="deploy-buttons mt-3">
            <button id="btn-salvar-contrato" type="button" class="btn btn-primary me-2">
              <i class="bi bi-file-code me-1"></i>Gerar Contrato
            </button>
            <button id="btn-compilar-contrato" type="button" class="btn btn-warning me-2" disabled>
              <i class="bi bi-gear-fill me-1"></i>Compilar
            </button>
            <button id="btn-deploy-contrato" type="button" class="btn btn-success me-2" disabled>
              <i class="bi bi-rocket-takeoff me-1"></i>Deploy
            </button>
          </div>
        </div>
      </div>
      
      <!-- Seção MetaMask integrada -->
      <div class="metamask-section mt-4" id="metamask-section" style="display: none;">
        <h5><i class="bi bi-wallet2 me-2"></i>Adicionar ao MetaMask</h5>
        <div class="metamask-controls">
          <div class="row g-2">
            <div class="col-12">
              <div class="contract-info">
                <p><strong>Endereço do Contrato:</strong> <span id="contract-address-display">-</span></p>
                <p><strong>Rede:</strong> <span id="network-name-display">-</span></p>
              </div>
            </div>
            <div class="col-12">
              <div class="status-item">
                <span class="status-label">Status MetaMask:</span>
                <span id="metamask-status" class="status-value">Aguardando deploy...</span>
              </div>
            </div>
          </div>
          
          <div class="metamask-buttons mt-3">
            <button id="btn-add-metamask" type="button" class="btn btn-success me-2" disabled>
              <i class="bi bi-wallet2 me-1"></i>Adicionar ao MetaMask
            </button>
            <button id="btn-verify-contract" type="button" class="btn btn-info me-2" style="display: none;">
              <i class="bi bi-shield-check me-1"></i>Verificar Contrato
            </button>
            <button id="btn-share-link" type="button" class="btn btn-outline-primary" style="display: none;">
              <i class="bi bi-share me-1"></i>Compartilhar Link
            </button>
          </div>
          
          <div id="share-link-field" class="mt-3" style="display: none;">
            <div class="input-group">
              <input type="text" class="form-control" id="generated-link" readonly>
              <button class="btn btn-outline-secondary" type="button" onclick="navigator.clipboard.writeText(document.getElementById('generated-link').value)">
                <i class="bi bi-clipboard"></i> Copiar
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
  
  console.log('✅ [DEBUG] Resumo preenchido com layout melhorado e MetaMask integrado');
}

// -------------------- Handlers navegação --------------------
document.getElementById('next-step-1').addEventListener('click', nextStep);
document.getElementById('next-step-2').addEventListener('click', nextStep);
document.getElementById('next-step-3').addEventListener('click', nextStep);
if (nextStep4) nextStep4.addEventListener('click', nextStep);
if (nextStep5) nextStep5.addEventListener('click', nextStep);

document.querySelectorAll('.navigation .btn-secondary').forEach(btn => {
  btn.addEventListener('click', prevStep);
});

// Reiniciar fluxo
const btnReiniciar = document.querySelector('button[onclick="reiniciarFluxo()"]');
if (btnReiniciar) btnReiniciar.addEventListener('click', reiniciarFluxo);

// -------------------- Funções de Status e Progress Bar --------------------
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

function updateTimelineStatus(step) {
  console.log(`📈 [TIMELINE] Atualizando para step: ${step}`);
  const steps = ['dados-basicos', 'personalizacao', 'resumo', 'deploy', 'verificacao', 'metamask'];
  
  steps.forEach((stepName, index) => {
    const element = document.querySelector(`.timeline-step[data-step="${stepName}"]`);
    if (element) {
      if (index < step) {
        element.classList.add('completed');
        element.classList.remove('active');
      } else if (index === step) {
        element.classList.add('active');
        element.classList.remove('completed');
      } else {
        element.classList.remove('active', 'completed');
      }
    }
  });
}

function startCompileProgressBar() {
  const compileStatus = document.getElementById('compile-status');
  if (!compileStatus) return null;
  
  let dots = 0;
  return setInterval(() => {
    dots = (dots + 1) % 4;
    const dotString = '.'.repeat(dots);
    updateCompileStatus(`🔄 Compilando contrato${dotString}`, 'processing');
  }, 500);
}

function stopCompileProgressBar(interval, success) {
  if (interval) {
    clearInterval(interval);
  }
  if (success) {
    updateCompileStatus('✅ Contrato compilado com sucesso!', 'success');
  } else {
    updateCompileStatus('❌ Erro na compilação', 'error');
  }
}

function startDeployProgressBar() {
  const deployStatus = document.getElementById('deploy-status');
  if (!deployStatus) return null;
  
  let dots = 0;
  return setInterval(() => {
    dots = (dots + 1) % 4;
    const dotString = '.'.repeat(dots);
    updateDeployStatus(`🚀 Fazendo deploy${dotString}`, 'processing');
  }, 500);
}

function stopDeployProgressBar(interval, success) {
  if (interval) {
    clearInterval(interval);
  }
  if (success) {
    updateDeployStatus('✅ Contrato implantado com sucesso!', 'success');
  } else {
    updateDeployStatus('❌ Erro no deploy', 'error');
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
    } else if (result.result === 'Pending in queue') {
      console.log('⏳ [DEBUG] Verificação ainda pendente, checando novamente...');
      setTimeout(() => checkVerificationStatus(guid, explorerAPI), 15000);
    } else {
      console.log('❌ [DEBUG] Verificação falhou:', result.result);
      if (btnVerify) {
        btnVerify.textContent = '❌ Falhou';
      }
    }
  } catch (error) {
    console.error('❌ [DEBUG] Erro ao checar status:', error);
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

// Função para atualizar status do contrato
function updateContractStatus(message, type = 'info') {
  const statusElement = document.getElementById('contract-status');
  if (statusElement) {
    statusElement.textContent = message;
    statusElement.className = `status-value ${type}`;
  }
}

// Função para atualizar status da compilação
function updateCompileStatus(message, type = 'info') {
  const statusElement = document.getElementById('compile-status');
  if (statusElement) {
    statusElement.textContent = message;
    statusElement.className = `status-value ${type}`;
  }
}

// Função para atualizar status do deploy
function updateDeployStatus(message, type = 'info') {
  const statusElement = document.getElementById('deploy-status');
  if (statusElement) {
    statusElement.textContent = message;
    statusElement.className = `status-value ${type}`;
  }
}



// Spinner Overlay helpers

// Barra de progresso/contador na compilação
function startCompileProgressBar() {
  let percent = 0;
  let dots = 0;
  compileStatus.textContent = `Compilando contrato... 0%`;
  const interval = setInterval(() => {
    percent += Math.floor(Math.random() * 3) + 2; // Progresso mais lento e realista
    if (percent >= 95) percent = 95; // Para em 95% até a compilação real terminar
    
    // Adiciona pontos animados
    dots = (dots + 1) % 4;
    let dotStr = '.'.repeat(dots);
    compileStatus.textContent = `Compilando contrato${dotStr} ${percent}%`;
  }, 300);
  return interval;
}

function stopCompileProgressBar(interval, success = true) {
  if (interval) clearInterval(interval);
  if (success) {
    compileStatus.innerHTML = '✅ <strong>Contrato compilado com sucesso!</strong>';
    compileStatus.style.color = '#16924b';
  } else {
    compileStatus.style.color = '#b91c1c';
  }
}

btnCompilar.onclick = async () => {
  console.log('🔍 [DEBUG] Verificando estado antes da compilação...');
  debugContractState();
  
  if (!contratoSource || !contratoSource.trim()) {
    updateCompileStatus('⚠️ Salve o contrato antes de compilar!', 'error');
    return;
  }
  
  console.log('🚀 [DEBUG] Iniciando compilação via API...');
  updateCompileStatus('🔄 Compilando contrato...', 'processing');
  
  let progressInterval = startCompileProgressBar();
  
  try {
    const result = await compilarContrato(inputNome.value, btnCompilar, compileStatus, btnDeploy);
    console.log('✅ [DEBUG] Compilação concluída:', result);
    
    stopCompileProgressBar(progressInterval, true);
    updateCompileStatus('✅ Contrato compilado com sucesso!', 'success');
    updateDeployStatus('⏳ Pronto para deploy', 'ready');
    
    // Não mostra mais botão de verificação aqui
    // Será mostrado apenas após o deploy
    
  } catch (error) {
    console.error('❌ [DEBUG] Erro na compilação:', error);
    stopCompileProgressBar(progressInterval, false);
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
      sourceCode: window.contratoSource || '',
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
function showManualVerificationInterface(contractData) {
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
    verificationStatus.innerHTML = `
      <div class="manual-verification">
        <div class="verification-info">
          <h4>📋 Dados para Verificação Manual</h4>
          <p>✅ Todos os dados foram preparados para facilitar o processo manual.</p>
        </div>
        
        <div class="verification-steps">
          <h5>🎯 Passos para verificar:</h5>
          <ol>
            <li>Acesse o explorador: <a href="${explorerUrl}" target="_blank">${networkName}</a></li>
            <li>Vá para o endereço do seu contrato</li>
            <li>Clique em "Contract" → "Verify and Publish"</li>
            <li>Use os dados abaixo (clique para copiar facilmente)</li>
          </ol>
        </div>
        
        <div class="verification-data">
          <div class="data-group">
            <label>📋 Configurações do Compilador:</label>
            <div class="copy-section">
              <div class="config-grid">
                <div><strong>Compiler Version:</strong> ${contractData.compilerVersion}</div>
                <div><strong>Optimization:</strong> ${contractData.optimizationUsed ? 'Yes' : 'No'}</div>
                <div><strong>Runs:</strong> ${contractData.runs}</div>
                <div><strong>EVM Version:</strong> ${contractData.evmVersion}</div>
              </div>
            </div>
          </div>
          
          <div class="data-group">
            <label>📄 Código Fonte:</label>
            <div class="copy-section">
              <textarea id="source-code-display" readonly>${contractData.sourceCode}</textarea>
              <button type="button" class="btn-copy" onclick="copyToClipboard('source-code-display', this)">
                📋 Copiar Código Fonte
              </button>
            </div>
          </div>
          
          <div class="data-group">
            <label>⚙️ ABI (Application Binary Interface):</label>
            <div class="copy-section">
              <textarea id="abi-display" readonly>${JSON.stringify(window.contratoAbi || [], null, 2)}</textarea>
              <button type="button" class="btn-copy" onclick="copyToClipboard('abi-display', this)">
                📋 Copiar ABI
              </button>
            </div>
          </div>
        </div>
        
        <div class="verification-help">
          <h5>💡 Dicas importantes:</h5>
          <ul>
            <li>✅ Use EXATAMENTE as configurações mostradas acima</li>
            <li>🔄 O processo pode demorar alguns minutos</li>
            <li>📧 Alguns exploradores enviam email de confirmação</li>
            <li>🆔 Mantenha a aba aberta durante o processo</li>
          </ul>
        </div>
      </div>
    `;
    verificationStatus.className = 'verification-status manual';
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
// Handler do botão adicionar ao MetaMask integrado
document.addEventListener('click', async (e) => {
  if (e.target.id === 'btn-add-metamask') {
    console.log('🦊 [DEBUG] Adicionando token ao MetaMask...');
    
    const address = window.contractAddress;
    const symbol = inputSymbol.value;
    const decimals = inputDecimals.value;
    const image = inputImage.value;
    
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

// -------------------- MetaMask Legacy (manter compatibilidade) --------------------

if (btnAddMetaMask) {
  btnAddMetaMask.onclick = async function() {
    statusDiv.textContent = '';
    btnAddMetaMask.disabled = true;
    try {
      const address = document.getElementById('final-token-address').value;
      const symbol = document.getElementById('final-token-symbol').value;
      const decimals = parseInt(document.getElementById('final-token-decimals').value, 10);
      const image = document.getElementById('final-token-image').value;
      // Recupera chainId e dados de rede do campo oculto
      let networkData = null;
      if (networkValue && networkValue.value) {
        try {
          networkData = JSON.parse(networkValue.value);
        } catch (e) {
          console.log('Erro ao parse dados da rede:', e);
        }
      }
      let chainId = networkData ? networkData.chainId : null;
      let tokenData = { address, symbol, decimals, image };
      if (chainId) {
        // Garantir que chainId seja tratado corretamente
        if (typeof chainId === 'string' && chainId.startsWith('0x')) {
          tokenData.chainId = parseInt(chainId, 16);
        } else {
          tokenData.chainId = parseInt(chainId);
        }
      }
      // Tenta trocar para a rede correta antes de adicionar
      let switched = true;
      if (tokenData.chainId) {
        switched = await switchOrAddNetwork(tokenData);
      }
      if (!switched) {
        statusDiv.textContent = 'Não foi possível trocar para a rede do token.';
        statusDiv.style.color = '#b91c1c';
        btnAddMetaMask.disabled = false;
        return;
      }
      const result = await adicionarTokenMetaMask({ address, symbol, decimals, image });
      if (result) {
        statusDiv.textContent = 'Token adicionado ao MetaMask!';
        statusDiv.style.color = '#16924b';
        if (btnShareLink) btnShareLink.style.display = 'inline-block';
      } else {
        statusDiv.textContent = 'Não foi possível adicionar o token.';
        statusDiv.style.color = '#b91c1c';
      }
    } catch (e) {
      statusDiv.textContent = 'Erro ao adicionar token: ' + (e.message || e);
      statusDiv.style.color = '#b91c1c';
    }
    btnAddMetaMask.disabled = false;
  };
}

if (btnShareLink) {
  btnShareLink.onclick = () => {
    const address = document.getElementById('final-token-address').value;
    const symbol = document.getElementById('final-token-symbol').value;
    const decimals = parseInt(document.getElementById('final-token-decimals').value, 10);
    const image = document.getElementById('final-token-image').value;
    const link = gerarLinkToken({ address, symbol, decimals, image });
    // Web Share API se disponível
    if (navigator.share) {
      navigator.share({
        title: 'Token criado',
        text: 'Veja o token que acabei de criar:',
        url: link
      }).catch(() => {
        // fallback se usuário cancelar
      });
    } else {
      shareLinkField.value = link;
      shareLinkField.style.display = 'block';
      shareLinkField.select();
      document.execCommand('copy');
      btnShareLink.textContent = '🔗 Link Copiado!';
      setTimeout(() => {
        btnShareLink.textContent = '🔗 Compartilhar Link';
      }, 2000);
    }
  };
}

btnDeploy.onclick = async () => {
  console.log('🚀 [DEBUG] Iniciando processo de deploy...');
  updateDeployStatus('🔄 Fazendo deploy do contrato...', 'processing');
  
  let progressInterval = startDeployProgressBar();
  
  try {
    await deployContrato(btnDeploy, deployStatus);
    console.log('✅ [DEBUG] Deploy concluído com sucesso!');
    
    stopDeployProgressBar(progressInterval, true);
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
    
    // Mostrar seção MetaMask
    const metamaskSection = document.getElementById('metamask-section');
    if (metamaskSection) {
      metamaskSection.style.display = 'block';
      
      // Habilitar botão do MetaMask
      const btnAddMetaMask = document.getElementById('btn-add-metamask');
      if (btnAddMetaMask && address && inputSymbol.value && inputDecimals.value) {
        btnAddMetaMask.disabled = false;
        document.getElementById('metamask-status').textContent = 'Pronto para adicionar';
        document.getElementById('metamask-status').className = 'status-value ready';
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
    stopDeployProgressBar(progressInterval, false);
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

// -------------------- Busca Salt --------------------
document.getElementById('search-salt-btn').onclick = () => buscarSaltFake(targetSuffix.value, saltFound, predictedAddress);
document.getElementById('stop-search-btn').onclick = () => pararBuscaSalt();

// -------------------- Event listeners para personalização (usa função já existente) --------------------
document.getElementById('contrato-simples').addEventListener('change', toggleAddressCustomization);
if (radioPersonalizado) {
  radioPersonalizado.addEventListener('change', toggleAddressCustomization);
}

// -------------------- Aguarda DOM estar pronto antes de inicializar --------------------
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
  // DOM ainda carregando, aguarda evento
  console.log('⏳ [DEBUG] Aguardando DOM carregar...');
} else {
  // DOM já pronto, executa imediatamente
  console.log('🚀 [DEBUG] DOM pronto - inicializando imediatamente...');
  console.log('🔍 [DEBUG] Elementos principais:', {
    btnConectar: !!document.getElementById('connect-metamask-btn'),
    inputOwner: !!document.getElementById('ownerAddress'),
    walletStatus: !!document.getElementById('wallet-status'),
    connectionSection: !!document.querySelector('.connection-section')
  });
  
  showStep(1);
  toggleAddressCustomization();
  initNetworkSystem();
}

// Handler para Step 6 - MetaMask
// Reutiliza elementos já declarados
if (btnAddMetaMask) {
  btnAddMetaMask.addEventListener('click', () => {
    const tokenData = {
      address: document.getElementById('final-token-address')?.value || '',
      symbol: document.getElementById('final-token-symbol')?.value || '',
      decimals: parseInt(document.getElementById('final-token-decimals')?.value) || 18,
      image: document.getElementById('final-token-image')?.value || ''
    };
    
    if (!tokenData.address || !tokenData.symbol) {
      alert('⚠️ Dados do token não encontrados. Faça o deploy primeiro.');
      return;
    }
    
    // Chama função do add-metamask.js
    adicionarTokenMetaMask(tokenData);
  });
}

// Handler para botão de compartilhar link (reutiliza elemento)
const shareLinkBtn = document.getElementById('btn-share-link');
if (shareLinkBtn) {
  shareLinkBtn.addEventListener('click', () => {
    const tokenData = montarTokenData({
      address: document.getElementById('final-token-address')?.value || '',
      symbol: document.getElementById('final-token-symbol')?.value || '',
      decimals: document.getElementById('final-token-decimals')?.value || '18',
      image: document.getElementById('final-token-image')?.value || '',
      name: inputNome?.value || '',
      chainId: currentNetwork?.chainId || '',
      chainName: currentNetwork?.name || '',
      rpcUrl: currentNetwork?.rpcUrl || '',
      blockExplorer: currentNetwork?.blockExplorer || '',
      nativeCurrency: currentNetwork?.nativeCurrency || ''
    });
    
    const shareLink = gerarLinkToken(tokenData);
    const linkField = document.getElementById('share-link-field');
    
    if (linkField) {
      linkField.value = shareLink;
      linkField.style.display = 'block';
      // Copia automaticamente
      linkField.select();
      document.execCommand('copy');
      alert('🔗 Link copiado para área de transferência!');
    }
  });
}

// Função para preencher dados do Step 6 após deploy
function fillStep6Data(deployedInfo) {
  if (deployedInfo) {
    const addressField = document.getElementById('final-token-address');
    const symbolField = document.getElementById('final-token-symbol');
    const decimalsField = document.getElementById('final-token-decimals');
    const imageField = document.getElementById('final-token-image');
    
    if (addressField) addressField.value = deployedInfo.address || '';
    if (symbolField) symbolField.value = inputSymbol?.value || '';
    if (decimalsField) decimalsField.value = inputDecimals?.value || '18';
    if (imageField) imageField.value = inputImage?.value || '';
    
    // Mostra botão de compartilhar
    if (shareLinkBtn) shareLinkBtn.style.display = 'inline-block';
  }
}

// Listener para evento de deploy concluído (para Step 6)
window.addEventListener('contractDeployed', (event) => {
  fillStep6Data(event.detail);
});
// Garante que a função global nunca receba undefined
window.adicionarTokenMetaMask = function(args) {
  // Log para depuração
  console.log('adicionarTokenMetaMask chamado com:', args);
  if (!args || typeof args !== 'object') {
    alert('Dados do token não informados!');
    return;
  }
  // Remove espaços extras
  const address = (args.address || '').trim();
  const symbol = (args.symbol || '').trim();
  const decimals = Number(args.decimals);
  const image = (args.image || '').trim();
  if (!address || !symbol || isNaN(decimals) || decimals < 0) {
    alert('Preencha todos os campos do token antes de adicionar ao MetaMask.');
    return;
  }
  adicionarTokenMetaMask({ address, symbol, decimals, image });
};

// Expor funções adicionais para HTML inline
window.prevStep = prevStep;
window.reiniciarFluxo = reiniciarFluxo;