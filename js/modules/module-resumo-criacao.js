/*
=================================================================
MÓDULO 3: RESUMO E CRIAÇÃO DO TOKEN - JAVASCRIPT
=================================================================

ARQUIVO: module-resumo-criacao.js
RESPONSÁVEL POR: 03-resumo-criacao.html

FUNÇÕES PRINCIPAIS:
1. Carregar dados dos módulos anteriores via storage-manager.js
2. Exibir resumo formatado dos dados coletados
3. Executar sequência: Gerar → Compilar → Deploy
4. Gerenciar feedback visual e progresso
5. Salvar dados do deploy e redirecionar para verificação

INPUTS (via Storage):
- TokenProjectData.tokenName (Módulo 1)
- TokenProjectData.tokenSymbol (Módulo 1) 
- TokenProjectData.decimals (Módulo 1)
- TokenProjectData.totalSupply (Módulo 1)
- TokenProjectData.ownerAddress (Módulo 1)
- TokenProjectData.contractType (Módulo 2)
- TokenProjectData.targetSuffix (Módulo 2, se aplicável)

OUTPUTS (para Storage):
- TokenProjectData.contractSource
- TokenProjectData.contractAbi
- TokenProjectData.contractBytecode
- TokenProjectData.deployedAddress
- TokenProjectData.deployTx
- TokenProjectData.stages.contratoDeployado = true

PRÓXIMO MÓDULO: 04-verificacao.html

=================================================================
*/

console.log('🚀 [MÓDULO 3] Iniciando module-resumo-criacao.js');

// =================================================================
// VARIÁVEIS GLOBAIS DO MÓDULO
// =================================================================

let moduleData = null; // Dados carregados do storage
let currentStage = 'loading'; // loading, summary, creation, completed
let deployedInfo = null; // Informações do contrato deployado

// =================================================================
// INICIALIZAÇÃO DO MÓDULO
// =================================================================

document.addEventListener('DOMContentLoaded', function() {
    console.log('📋 [MÓDULO 3] DOM carregado, iniciando módulo...');
    
    // Inicializar módulo
    initModule();
});

/**
 * Função principal de inicialização do módulo
 * ENTRADA: Nenhuma
 * SAÍDA: Módulo inicializado com dados carregados
 */
async function initModule() {
    console.log('⚙️ [MÓDULO 3] Inicializando módulo de resumo e criação...');
    
    try {
        // 1. Verificar se há dados salvos dos módulos anteriores
        await loadPreviousData();
        
        // 2. Validar se os dados necessários estão presentes
        if (!validateRequiredData()) {
            showError('Dados incompletos dos módulos anteriores. Retornando ao início.');
            setTimeout(() => {
                window.location.href = '../modules/01-dados-basicos.html';
            }, 3000);
            return;
        }
        
        // 3. Exibir resumo dos dados
        await showDataSummary();
        
        // 4. Inicializar seção de criação
        await initCreationSection();
        
        // 5. Atualizar interface
        updateModuleStage('summary');
        
        console.log('✅ [MÓDULO 3] Módulo inicializado com sucesso');
        
    } catch (error) {
        console.error('❌ [MÓDULO 3] Erro na inicialização:', error);
        showError('Erro ao inicializar módulo: ' + error.message);
    }
}

// =================================================================
// CARREGAMENTO DE DADOS DOS MÓDULOS ANTERIORES
// =================================================================

/**
 * Carrega dados salvos pelos módulos anteriores
 * ENTRADA: Nenhuma
 * SAÍDA: moduleData preenchido com dados do localStorage
 */
async function loadPreviousData() {
    console.log('📂 [MÓDULO 3] Carregando dados dos módulos anteriores...');
    
    try {
        // Usar o storage manager compartilhado
        moduleData = window.StorageManager.getAll();
        
        console.log('📋 [MÓDULO 3] Dados carregados:', moduleData);
        
        if (!moduleData || Object.keys(moduleData).length === 0) {
            throw new Error('Nenhum dado encontrado dos módulos anteriores');
        }
        
        return moduleData;
        
    } catch (error) {
        console.error('❌ [MÓDULO 3] Erro ao carregar dados:', error);
        throw error;
    }
}

/**
 * Valida se todos os dados necessários estão presentes
 * ENTRADA: Nenhuma (usa moduleData global)
 * SAÍDA: boolean - true se dados válidos, false caso contrário
 */
function validateRequiredData() {
    console.log('🔍 [MÓDULO 3] Validando dados obrigatórios...');
    
    const required = [
        'tokenName',
        'tokenSymbol', 
        'decimals',
        'totalSupply',
        'ownerAddress',
        'contractType'
    ];
    
    const missing = [];
    
    for (const field of required) {
        if (!moduleData[field]) {
            missing.push(field);
        }
    }
    
    if (missing.length > 0) {
        console.error('❌ [MÓDULO 3] Campos obrigatórios faltando:', missing);
        return false;
    }
    
    console.log('✅ [MÓDULO 3] Todos os dados obrigatórios presentes');
    return true;
}

// =================================================================
// EXIBIÇÃO DO RESUMO DOS DADOS
// =================================================================

/**
 * Exibe resumo formatado dos dados coletados
 * ENTRADA: Nenhuma (usa moduleData global)
 * SAÍDA: HTML do resumo inserido na página
 */
async function showDataSummary() {
    console.log('📊 [MÓDULO 3] Exibindo resumo dos dados...');
    
    const summarySection = document.getElementById('data-summary-section');
    const summaryData = document.getElementById('summary-data');
    
    if (!summarySection || !summaryData) {
        console.error('❌ [MÓDULO 3] Elementos de resumo não encontrados');
        return;
    }
    
    try {
        // Gerar HTML do resumo
        const summaryHTML = generateSummaryHTML();
        
        // Inserir na página
        summaryData.innerHTML = summaryHTML;
        
        // Mostrar seção
        summarySection.style.display = 'block';
        
        console.log('✅ [MÓDULO 3] Resumo exibido com sucesso');
        
    } catch (error) {
        console.error('❌ [MÓDULO 3] Erro ao exibir resumo:', error);
        showError('Erro ao gerar resumo dos dados');
    }
}

/**
 * Gera HTML formatado do resumo
 * ENTRADA: Nenhuma (usa moduleData global)
 * SAÍDA: String HTML do resumo
 */
function generateSummaryHTML() {
    console.log('🏗️ [MÓDULO 3] Gerando HTML do resumo...');
    
    return `
        <div class="row g-3">
            <!-- Dados Básicos do Token -->
            <div class="col-md-6">
                <h6 class="text-primary"><i class="bi bi-info-circle me-1"></i>Dados Básicos</h6>
                <table class="table table-sm">
                    <tr>
                        <td><strong>Nome:</strong></td>
                        <td>${moduleData.tokenName || 'Não definido'}</td>
                    </tr>
                    <tr>
                        <td><strong>Símbolo:</strong></td>
                        <td>${moduleData.tokenSymbol || 'Não definido'}</td>
                    </tr>
                    <tr>
                        <td><strong>Decimais:</strong></td>
                        <td>${moduleData.decimals || '18'}</td>
                    </tr>
                    <tr>
                        <td><strong>Supply Total:</strong></td>
                        <td>${formatNumber(moduleData.totalSupply) || 'Não definido'}</td>
                    </tr>
                </table>
            </div>
            
            <!-- Configurações -->
            <div class="col-md-6">
                <h6 class="text-success"><i class="bi bi-gear me-1"></i>Configurações</h6>
                <table class="table table-sm">
                    <tr>
                        <td><strong>Proprietário:</strong></td>
                        <td><small>${moduleData.ownerAddress || 'Não definido'}</small></td>
                    </tr>
                    <tr>
                        <td><strong>Tipo de Contrato:</strong></td>
                        <td>${moduleData.contractType === 'custom' ? 'Personalizado' : 'Simples'}</td>
                    </tr>
                    ${moduleData.contractType === 'custom' && moduleData.targetSuffix ? `
                    <tr>
                        <td><strong>Sufixo Desejado:</strong></td>
                        <td>${moduleData.targetSuffix}</td>
                    </tr>
                    ` : ''}
                    <tr>
                        <td><strong>Rede:</strong></td>
                        <td>${moduleData.networkName || 'Será detectada'}</td>
                    </tr>
                </table>
            </div>
        </div>
        
        ${moduleData.tokenImage ? `
        <div class="row mt-3">
            <div class="col-12">
                <h6 class="text-info"><i class="bi bi-image me-1"></i>Imagem do Token</h6>
                <div class="d-flex align-items-center gap-3">
                    <img src="${moduleData.tokenImage}" alt="Token" style="width: 64px; height: 64px; border-radius: 8px;" 
                         onerror="this.style.display='none'">
                    <small class="text-muted">${moduleData.tokenImage}</small>
                </div>
            </div>
        </div>
        ` : ''}
    `;
}

// =================================================================
// INICIALIZAÇÃO DA SEÇÃO DE CRIAÇÃO
// =================================================================

/**
 * Inicializa a seção de criação do token
 * ENTRADA: Nenhuma
 * SAÍDA: Seção de criação carregada com template
 */
async function initCreationSection() {
    console.log('🔧 [MÓDULO 3] Inicializando seção de criação...');
    
    try {
        const creationSection = document.getElementById('creation-section');
        const tokenSummary = document.getElementById('token-summary');
        
        if (!creationSection || !tokenSummary) {
            throw new Error('Elementos da seção de criação não encontrados');
        }
        
        // Carregar template resumo-template.html (reutilizado do sistema atual)
        console.log('📄 [MÓDULO 3] Carregando template de criação...');
        
        // Usar sistema de templates existente
        if (window.loadTemplate && window.fillTemplate) {
            await window.fillTemplate('resumo-template', getTemplateData(), tokenSummary);
            console.log('✅ [MÓDULO 3] Template carregado via sistema existente');
        } else {
            // Fallback: HTML simples
            tokenSummary.innerHTML = generateCreationFallbackHTML();
            console.log('⚠️ [MÓDULO 3] Template carregado via fallback');
        }
        
        // Configurar event listeners dos botões
        setupCreationButtons();
        
        // Mostrar seção
        creationSection.style.display = 'block';
        
        console.log('✅ [MÓDULO 3] Seção de criação inicializada');
        
    } catch (error) {
        console.error('❌ [MÓDULO 3] Erro ao inicializar criação:', error);
        showError('Erro ao carregar seção de criação');
    }
}

/**
 * Prepara dados para o template de criação
 * ENTRADA: Nenhuma (usa moduleData global)
 * SAÍDA: Object com dados formatados para o template
 */
function getTemplateData() {
    console.log('📋 [MÓDULO 3] Preparando dados para template...');
    
    return {
        'summary-nome': moduleData.tokenName || '',
        'summary-symbol': moduleData.tokenSymbol || '',
        'summary-decimals': moduleData.decimals || '18',
        'summary-supply': formatNumber(moduleData.totalSupply) || '',
        'summary-owner': moduleData.ownerAddress || '',
        'summary-network': moduleData.networkName || 'Será detectada',
        'summary-address-type': moduleData.contractType === 'custom' ? 'Personalizado' : 'Padrão',
        'summary-image': moduleData.tokenImage || ''
    };
}

/**
 * Gera HTML de fallback para criação
 * ENTRADA: Nenhuma
 * SAÍDA: String HTML simples para criação
 */
function generateCreationFallbackHTML() {
    return `
        <div class="alert alert-info">
            <h6>Criação do Token</h6>
            <p>Execute os passos na ordem: Gerar → Compilar → Deploy</p>
            <div class="d-grid gap-2">
                <button id="btn-gerar" class="btn btn-primary">
                    <i class="bi bi-file-earmark-code me-1"></i>Gerar Contrato
                </button>
                <button id="btn-compilar" class="btn btn-warning" disabled>
                    <i class="bi bi-tools me-1"></i>Compilar
                </button>
                <button id="btn-deploy" class="btn btn-success" disabled>
                    <i class="bi bi-rocket me-1"></i>Deploy
                </button>
            </div>
        </div>
    `;
}

// =================================================================
// CONFIGURAÇÃO DOS BOTÕES DE CRIAÇÃO
// =================================================================

/**
 * Configura event listeners dos botões de criação
 * ENTRADA: Nenhuma
 * SAÍDA: Event listeners configurados
 */
function setupCreationButtons() {
    console.log('🔘 [MÓDULO 3] Configurando botões de criação...');
    
    // Aguardar um pouco para botões carregarem
    setTimeout(() => {
        // Botão Gerar Contrato
        const btnGerar = document.getElementById('btn-salvar-contrato') || document.getElementById('btn-gerar');
        if (btnGerar) {
            btnGerar.onclick = handleGerarContrato;
            console.log('✅ [MÓDULO 3] Botão Gerar configurado');
        }
        
        // Botão Compilar
        const btnCompilar = document.getElementById('btn-compilar-contrato') || document.getElementById('btn-compilar');
        if (btnCompilar) {
            btnCompilar.onclick = handleCompilarContrato;
            console.log('✅ [MÓDULO 3] Botão Compilar configurado');
        }
        
        // Botão Deploy
        const btnDeploy = document.getElementById('btn-deploy-contrato') || document.getElementById('btn-deploy');
        if (btnDeploy) {
            btnDeploy.onclick = handleDeployContrato;
            console.log('✅ [MÓDULO 3] Botão Deploy configurado');
        }
        
        // Usar sistema de botões funcionais se disponível
        if (window.configureButtonListeners) {
            window.configureButtonListeners();
            console.log('✅ [MÓDULO 3] Sistema de botões funcionais ativado');
        }
        
    }, 500);
}

// =================================================================
// HANDLERS DOS BOTÕES DE CRIAÇÃO
// =================================================================

/**
 * Handler do botão Gerar Contrato
 * ENTRADA: Event do clique
 * SAÍDA: Contrato gerado e salvo
 */
async function handleGerarContrato(event) {
    console.log('🔧 [MÓDULO 3] Executando geração de contrato...');
    
    try {
        // Prevenir comportamento padrão
        if (event) event.preventDefault();
        
        // Preparar dados do token para geração
        const tokenData = {
            nome: moduleData.tokenName,
            symbol: moduleData.tokenSymbol,
            decimals: moduleData.decimals,
            supply: moduleData.totalSupply,
            owner: moduleData.ownerAddress,
            image: moduleData.tokenImage || ''
        };
        
        console.log('📋 [MÓDULO 3] Dados do token para geração:', tokenData);
        
        // Usar função existente de geração se disponível
        if (window.salvarContrato) {
            await window.salvarContrato(tokenData, () => {
                console.log('✅ [MÓDULO 3] Contrato gerado com sucesso');
                
                // Salvar no storage que contrato foi gerado
                window.StorageManager.save('stages', {
                    ...moduleData.stages,
                    contratoGerado: true
                });
                
                // Habilitar próximo botão
                enableNextButton('btn-compilar-contrato');
                enableNextButton('btn-compilar');
            });
        } else {
            throw new Error('Função salvarContrato não disponível');
        }
        
    } catch (error) {
        console.error('❌ [MÓDULO 3] Erro na geração:', error);
        showError('Erro ao gerar contrato: ' + error.message);
    }
}

/**
 * Handler do botão Compilar Contrato
 * ENTRADA: Event do clique
 * SAÍDA: Contrato compilado
 */
async function handleCompilarContrato(event) {
    console.log('⚙️ [MÓDULO 3] Executando compilação de contrato...');
    
    try {
        // Prevenir comportamento padrão
        if (event) event.preventDefault();
        
        // Usar função existente de compilação
        if (window.compilarContrato) {
            await window.compilarContrato(
                moduleData.tokenName,
                document.getElementById('btn-compilar-contrato') || document.getElementById('btn-compilar'),
                document.getElementById('compile-status'),
                document.getElementById('btn-deploy-contrato') || document.getElementById('btn-deploy')
            );
            
            console.log('✅ [MÓDULO 3] Compilação concluída');
            
            // Salvar no storage que contrato foi compilado
            window.StorageManager.save('stages', {
                ...moduleData.stages,
                contratoCompilado: true
            });
            
            // Habilitar próximo botão
            enableNextButton('btn-deploy-contrato');
            enableNextButton('btn-deploy');
            
        } else {
            throw new Error('Função compilarContrato não disponível');
        }
        
    } catch (error) {
        console.error('❌ [MÓDULO 3] Erro na compilação:', error);
        showError('Erro ao compilar contrato: ' + error.message);
    }
}

/**
 * Handler do botão Deploy Contrato
 * ENTRADA: Event do clique
 * SAÍDA: Contrato deployado na blockchain
 */
async function handleDeployContrato(event) {
    console.log('🚀 [MÓDULO 3] Executando deploy de contrato...');
    
    try {
        // Prevenir comportamento padrão
        if (event) event.preventDefault();
        
        // Usar função existente de deploy
        if (window.deployContrato) {
            const result = await window.deployContrato();
            
            if (result && result.contractAddress) {
                deployedInfo = result;
                
                console.log('✅ [MÓDULO 3] Deploy concluído:', deployedInfo);
                
                // Salvar informações do deploy no storage
                window.StorageManager.save('deployedAddress', deployedInfo.contractAddress);
                window.StorageManager.save('deployTx', deployedInfo.transactionHash);
                window.StorageManager.save('stages', {
                    ...moduleData.stages,
                    contratoDeployado: true
                });
                
                // Mostrar sucesso e preparar próximo módulo
                await showDeploySuccess();
                
            } else {
                throw new Error('Deploy não retornou endereço do contrato');
            }
            
        } else {
            throw new Error('Função deployContrato não disponível');
        }
        
    } catch (error) {
        console.error('❌ [MÓDULO 3] Erro no deploy:', error);
        showError('Erro ao fazer deploy: ' + error.message);
    }
}

// =================================================================
// FINALIZAÇÃO E NAVEGAÇÃO
// =================================================================

/**
 * Exibe sucesso do deploy e prepara próximo módulo
 * ENTRADA: Nenhuma (usa deployedInfo global)
 * SAÍDA: Interface atualizada para sucesso
 */
async function showDeploySuccess() {
    console.log('🎉 [MÓDULO 3] Exibindo sucesso do deploy...');
    
    try {
        const completionSection = document.getElementById('completion-section');
        const deployedInfoDiv = document.getElementById('deployed-info');
        
        if (completionSection && deployedInfoDiv) {
            // Gerar HTML das informações de deploy
            deployedInfoDiv.innerHTML = `
                <div class="row g-3">
                    <div class="col-md-6">
                        <strong>Endereço do Contrato:</strong><br>
                        <code>${deployedInfo.contractAddress}</code>
                    </div>
                    <div class="col-md-6">
                        <strong>Hash da Transação:</strong><br>
                        <code>${deployedInfo.transactionHash}</code>
                    </div>
                </div>
                <div class="mt-3">
                    <small class="text-muted">
                        Estes dados foram salvos automaticamente. 
                        Agora você pode prosseguir para a verificação do contrato.
                    </small>
                </div>
            `;
            
            // Mostrar seção de sucesso
            completionSection.style.display = 'block';
        }
        
        // Habilitar botão de próximo módulo
        const btnNext = document.getElementById('btn-next-module');
        if (btnNext) {
            btnNext.disabled = false;
        }
        
        // Atualizar estágio
        updateModuleStage('completed');
        
        console.log('✅ [MÓDULO 3] Sucesso exibido, pronto para próximo módulo');
        
    } catch (error) {
        console.error('❌ [MÓDULO 3] Erro ao exibir sucesso:', error);
    }
}

/**
 * Navega para o módulo de verificação
 * ENTRADA: Nenhuma
 * SAÍDA: Redirecionamento para módulo 4
 */
function goToNextModule() {
    console.log('➡️ [MÓDULO 3] Navegando para módulo de verificação...');
    
    if (!deployedInfo) {
        showError('Conclua o deploy antes de prosseguir');
        return;
    }
    
    // Redirecionar para módulo de verificação
    window.location.href = '04-verificacao.html';
}

/**
 * Navega para o módulo anterior
 * ENTRADA: Nenhuma
 * SAÍDA: Redirecionamento para módulo 2
 */
function goToPreviousModule() {
    console.log('⬅️ [MÓDULO 3] Navegando para módulo anterior...');
    window.location.href = '02-personalizacao.html';
}

// =================================================================
// FUNÇÕES AUXILIARES
// =================================================================

/**
 * Atualiza o estágio visual do módulo
 * ENTRADA: String stage - novo estágio
 * SAÍDA: Interface atualizada
 */
function updateModuleStage(stage) {
    console.log(`🔄 [MÓDULO 3] Atualizando estágio para: ${stage}`);
    
    currentStage = stage;
    
    // Ocultar loading
    const loadingSection = document.getElementById('loading-section');
    if (loadingSection) {
        loadingSection.style.display = 'none';
    }
}

/**
 * Habilita botão específico
 * ENTRADA: String buttonId - ID do botão
 * SAÍDA: Botão habilitado
 */
function enableNextButton(buttonId) {
    const button = document.getElementById(buttonId);
    if (button) {
        button.disabled = false;
        console.log(`✅ [MÓDULO 3] Botão ${buttonId} habilitado`);
    }
}

/**
 * Exibe erro para o usuário
 * ENTRADA: String message - mensagem de erro
 * SAÍDA: Alerta de erro exibido
 */
function showError(message) {
    console.error(`❌ [MÓDULO 3] ERRO: ${message}`);
    alert(`Erro no Módulo 3: ${message}`);
}

/**
 * Formata números para exibição
 * ENTRADA: String/Number number - número a formatar
 * SAÍDA: String formatada
 */
function formatNumber(number) {
    if (!number) return '';
    return Number(number).toLocaleString('pt-BR');
}

// =================================================================
// FUNÇÕES GLOBAIS (para compatibilidade)
// =================================================================

// Expor funções necessárias globalmente
window.goToNextModule = goToNextModule;
window.goToPreviousModule = goToPreviousModule;

console.log('✅ [MÓDULO 3] Script module-resumo-criacao.js carregado');
