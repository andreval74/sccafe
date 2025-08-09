// Estado global do workflow
window.tokenWorkflow = {
    contratoGerado: false,
    contratoCompilado: false,
    contratoDeployado: false,
    contratoAddress: null,
    networkName: null
};

// Aguarda o carregamento completo da página e template
document.addEventListener('DOMContentLoaded', function() {
    // Verifica se estamos na página que precisa do template resumo-template
    const currentPage = window.location.pathname;
    const needsResumoTemplate = currentPage.includes('add-index.html') || 
                               currentPage.endsWith('/') || 
                               currentPage === '' ||
                               document.querySelector('#summary-box, [data-template="resumo-template"], .token-creator-simplified');
    
    if (!needsResumoTemplate) {
        console.log('🔗 DOM carregado em página que não precisa do template resumo-template');
        loadSystemFunctions();
        return;
    }
    
    console.log('🔗 DOM carregado, aguardando template resumo-template...');
    
    // Importa funções dinâmicamente para torná-las globais
    loadSystemFunctions();
    
    // Carrega o template
    fetch('/templates/resumo-template.html')
        .then(response => response.text())
        .then(template => {
            const templateContainer = document.querySelector('#summary-box, [data-template="resumo-template"], .token-creator-simplified');
            if (templateContainer) {
                templateContainer.innerHTML = template;
                console.log('🎯 Template resumo-template carregado! Conectando botões...');
                setupButtonHandlers();
            }
        })
        .catch(error => {
            console.log('⚠️ Erro ao carregar resumo-template:', error);
            console.log('ℹ️ Sistema funcionará sem o template resumo');
        });
});

// Carrega funções do sistema dinamicamente
async function loadSystemFunctions() {
    try {
        console.log('🔧 Carregando funções REAIS do sistema...');
        
        // Importa módulos dinamicamente (força reload para garantir versão mais recente)
        const timestamp = Date.now(); // Cache busting
        
        const contractsModule = await import(`./add-contratos-verified.js?t=${timestamp}`);
        const deployModule = await import(`./add-deploy.js?t=${timestamp}`);
        const utilsModule = await import(`./add-utils.js?t=${timestamp}`);
        
        // Torna funções globais
        window.salvarContrato = contractsModule.salvarContrato;
        window.compilarContrato = contractsModule.compilarContrato;
        window.deployContrato = deployModule.deployContrato;
        window.marcarConcluido = utilsModule.marcarConcluido;
        
        // Verifica se todas as funções foram carregadas
        const funcoes = {
            'salvarContrato': !!window.salvarContrato,
            'compilarContrato': !!window.compilarContrato,
            'deployContrato': !!window.deployContrato,
            'marcarConcluido': !!window.marcarConcluido
        };
        
        console.log('✅ Status das funções carregadas:', funcoes);
        
        const funcionaisDisponiveis = Object.values(funcoes).filter(v => v).length;
        console.log(`✅ ${funcionaisDisponiveis}/4 funções do sistema carregadas e disponíveis globalmente`);
        
        if (funcionaisDisponiveis < 3) {
            throw new Error(`Apenas ${funcionaisDisponiveis}/4 funções foram carregadas com sucesso`);
        }
        
    } catch (error) {
        console.error('❌ ERRO CRÍTICO ao carregar funções do sistema:', error);
        console.log('� Verifique se os arquivos existem:');
        console.log('   - js/add-contratos-verified.js');
        console.log('   - js/add-deploy.js');
        console.log('   - js/add-utils.js');
        
        // Mostra erro para o usuário
        alert('❌ ERRO: Não foi possível carregar as funções do sistema!\n\n' + 
              'Detalhes: ' + error.message + '\n\n' +
              'Verifique se todos os arquivos JavaScript estão presentes e acessíveis.');
        
        throw error; // Re-propaga o erro para debug
    }
}

function setupButtonHandlers() {
    console.log('🔧 Configurando handlers dos botões...');
    
    // Debug: listar todos os elementos encontrados
    console.log('🔍 Elementos no DOM:', {
        'btn-salvar-contrato': !!document.getElementById('btn-salvar-contrato'),
        'btn-compilar-contrato': !!document.getElementById('btn-compilar-contrato'),
        'btn-deploy-contrato': !!document.getElementById('btn-deploy-contrato'),
        'containers': document.querySelectorAll('.token-creator-simplified, .etapa-card').length
    });
    
    // Botão Gerar Contrato
    const btnGerar = document.getElementById('btn-salvar-contrato');
    if (btnGerar) {
        btnGerar.onclick = handleGerarContrato;
        console.log('✅ Botão Gerar conectado');
    } else {
        console.warn('❌ Botão btn-salvar-contrato não encontrado!');
    }
    
    // Botão Compilar
    const btnCompilar = document.getElementById('btn-compilar-contrato');
    if (btnCompilar) {
        btnCompilar.onclick = handleCompilarContrato;
        console.log('✅ Botão Compilar conectado');
    } else {
        console.warn('❌ Botão btn-compilar-contrato não encontrado!');
    }
    
    // Botão Deploy
    const btnDeploy = document.getElementById('btn-deploy-contrato');
    if (btnDeploy) {
        btnDeploy.onclick = handleDeployContrato;
        console.log('✅ Botão Deploy conectado');
    } else {
        console.warn('❌ Botão btn-deploy-contrato não encontrado!');
    }
    
    // Botão Adicionar ao MetaMask
    const btnMetaMask = document.getElementById('btn-add-metamask');
    if (btnMetaMask) {
        btnMetaMask.onclick = adicionarAoMetaMask;
        console.log('✅ Botão MetaMask conectado');
    }
    
    // Botão Criar Novo Token
    const btnNovoToken = document.getElementById('btn-criar-novo-token');
    if (btnNovoToken) {
        btnNovoToken.onclick = criarNovoToken;
        console.log('✅ Botão Novo Token conectado');
    }
    
    // Conta botões encontrados
    const botoes = [btnGerar, btnCompilar, btnDeploy].filter(btn => btn);
    console.log(`🎉 ${botoes.length}/3 botões principais conectados!`);
    
    if (botoes.length === 3) {
        console.log('� Sistema de botões totalmente funcional!');
    }
}

// Atualizar status visual e progresso
function updateStatus(statusId, text, className = '') {
    const statusElement = document.getElementById(statusId);
    if (statusElement) {
        statusElement.textContent = text;
        statusElement.className = `step-status ${className}`;
    }
}

function updateProgress(progressId, percentage) {
    const progressElement = document.getElementById(progressId);
    if (progressElement) {
        progressElement.style.width = percentage + '%';
    }
}

// Função para marcar botão como concluído (cópia da função original)
function marcarConcluido(btn) {
    if (btn) {
        btn.classList.add('completed');
        btn.disabled = true;
    }
}

// Função global para reconfigurar event listeners (pode ser chamada externamente)
window.configureButtonListeners = function() {
    console.log('🔧 Reconfigurando event listeners dos botões...');
    setupButtonHandlers();
};

// Função: Gerar Contrato - USANDO SISTEMA REAL
async function handleGerarContrato() {
    console.log('🔧 Gerando contrato com sistema REAL...');
    const btn = document.getElementById('btn-salvar-contrato');
    
    try {
        // Visual feedback
        btn.disabled = true;
        btn.innerHTML = '<i class="spinner-border spinner-border-sm me-1"></i>Gerando...';
        updateStatus('contract-status', 'Gerando...', 'processing');
        updateProgress('progress-gerar', 0);
        
        // Coleta dados do resumo já preenchido
        const tokenData = {
            nome: document.getElementById('summary-nome')?.textContent || 'TokenTest',
            symbol: document.getElementById('summary-symbol')?.textContent || 'TEST',
            decimals: document.getElementById('summary-decimals')?.textContent || '18',
            supply: document.getElementById('summary-supply')?.textContent || '1000000',
            owner: document.getElementById('summary-owner')?.textContent || '',
            image: ''
        };
        
        console.log('📊 Dados coletados para geração:', tokenData);
        updateProgress('progress-gerar', 20);
        
        // Usa a função real de salvar contrato com fallback robusto
        try {
            if (typeof window.salvarContrato === 'function') {
                console.log('🔧 Usando função REAL salvarContrato...');
                
                await window.salvarContrato(tokenData, () => {
                    // Callback de sucesso da função real
                    console.log('✅ Contrato gerado via sistema REAL!');
                    updateProgress('progress-gerar', 100);
                    
                    window.tokenWorkflow.contratoGerado = true;
                    btn.innerHTML = '<i class="bi bi-check-circle me-1"></i>Gerado!';
                    btn.classList.remove('btn-primary');
                    btn.classList.add('btn-success');
                    updateStatus('contract-status', 'Gerado!', 'success');
                    
                    // Habilitar próximo botão
                    const btnCompilar = document.getElementById('btn-compilar-contrato');
                    if (btnCompilar) {
                        btnCompilar.disabled = false;
                        updateStatus('compile-status', 'Pronto', 'ready');
                    }
                });
                
            } else {
                // Fallback usando função inline robusta
                console.log('🔄 Usando fallback inline para salvar contrato...');
                updateStatus('contract-status', 'Carregando template...', 'processing');
                
                const response = await fetch('contratos/contrato-base.sol');
                if (!response.ok) throw new Error(`Erro ${response.status}: ${response.statusText}`);
                
                let contrato = await response.text();
                console.log('📄 Template carregado via fallback:', contrato.length, 'caracteres');
                
                // Força pragma para versão compatível
                contrato = contrato.replace(/pragma solidity[\s]*\^?[\d\.]+;/g, 'pragma solidity ^0.8.19;');
                
                // Formatar supply para ser compatível com Solidity
                const formatSupplyForSolidity = (supply) => {
                    if (!supply) return '1000000000';
                    
                    // Remove pontos e espaços
                    let formatted = supply.toString().replace(/[.\s]/g, '');
                    
                    // Se contém vírgulas, substitui por underscores (formato Solidity)
                    formatted = formatted.replace(/,/g, '_');
                    
                    // Se não tem underscores e é um número grande, adiciona underscores para legibilidade
                    if (!formatted.includes('_') && formatted.length > 6) {
                        // Adiciona underscores a cada 3 dígitos da direita para a esquerda
                        formatted = formatted.replace(/\B(?=(\d{3})+(?!\d))/g, '_');
                    }
                    
                    console.log(`📝 Supply formatado (fallback): ${supply} → ${formatted}`);
                    return formatted;
                };
                
                const formattedSupply = formatSupplyForSolidity(tokenData.supply);
                
                // Substituição dos placeholders
                contrato = contrato
                    .replace(/{{TOKEN_NAME}}/g, tokenData.nome)
                    .replace(/{{TOKEN_SYMBOL}}/g, tokenData.symbol)
                    .replace(/{{TOKEN_DECIMALS}}/g, tokenData.decimals)
                    .replace(/{{TOKEN_SUPPLY}}/g, formattedSupply)
                    .replace(/{{TOKEN_OWNER}}/g, tokenData.owner || "address(0)")
                    .replace(/{{TOKEN_LOGO_URI}}/g, tokenData.image || "")
                    .replace(/{{ORIGINAL_CONTRACT}}/g, "address(0)");
                
                // Salva na variável global
                window.contratoSource = contrato;
                
                console.log('✅ Contrato gerado via fallback inline!');
                console.log('📄 Pragma forçado para: pragma solidity ^0.8.19;');
                
                updateProgress('progress-gerar', 100);
                window.tokenWorkflow.contratoGerado = true;
                btn.innerHTML = '<i class="bi bi-check-circle me-1"></i>Gerado!';
                btn.classList.remove('btn-primary');
                btn.classList.add('btn-success');
                updateStatus('contract-status', 'Gerado!', 'success');
                
                // Habilitar próximo botão
                const btnCompilar = document.getElementById('btn-compilar-contrato');
                if (btnCompilar) {
                    btnCompilar.disabled = false;
                    updateStatus('compile-status', 'Pronto', 'ready');
                }
            }
        } catch (error) {
            console.error('❌ Erro na geração de contrato:', error);
            throw error;
        }
        
    } catch (error) {
        console.error('❌ Erro ao gerar contrato REAL:', error);
        
        btn.innerHTML = '<i class="bi bi-file-earmark-code me-1"></i>Gerar';
        btn.disabled = false;
        btn.classList.remove('btn-success');
        btn.classList.add('btn-primary');
        updateStatus('contract-status', 'Erro: ' + error.message, 'error');
        updateProgress('progress-gerar', 0);
        
        alert('❌ Erro ao gerar contrato: ' + error.message);
    }
}

// Função para gerar código ERC20 simples
function generateERC20Contract(tokenData) {
    return `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract ${tokenData.nome} {
    string public name = "${tokenData.nome}";
    string public symbol = "${tokenData.symbol}";
    uint8 public decimals = ${tokenData.decimals};
    uint256 public totalSupply = ${tokenData.supply} * 10**${tokenData.decimals};
    
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;
    
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    
    constructor() {
        balanceOf[msg.sender] = totalSupply;
        emit Transfer(address(0), msg.sender, totalSupply);
    }
    
    function transfer(address to, uint256 value) public returns (bool) {
        require(balanceOf[msg.sender] >= value, "Insufficient balance");
        balanceOf[msg.sender] -= value;
        balanceOf[to] += value;
        emit Transfer(msg.sender, to, value);
        return true;
    }
    
    function approve(address spender, uint256 value) public returns (bool) {
        allowance[msg.sender][spender] = value;
        emit Approval(msg.sender, spender, value);
        return true;
    }
    
    function transferFrom(address from, address to, uint256 value) public returns (bool) {
        require(balanceOf[from] >= value, "Insufficient balance");
        require(allowance[from][msg.sender] >= value, "Insufficient allowance");
        balanceOf[from] -= value;
        balanceOf[to] += value;
        allowance[from][msg.sender] -= value;
        emit Transfer(from, to, value);
        return true;
    }
}`;
}

// Função: Compilar Contrato - USANDO SISTEMA REAL
async function handleCompilarContrato() {
    if (!window.tokenWorkflow.contratoGerado) {
        alert('⚠️ Primeiro é necessário gerar o contrato!');
        return;
    }
    
    console.log('🛠️ Compilando contrato com sistema REAL...');
    const btn = document.getElementById('btn-compilar-contrato');
    const compileStatus = document.getElementById('compile-status');
    const btnDeploy = document.getElementById('btn-deploy-contrato');
    
    try {
        // Visual feedback
        btn.disabled = true;
        btn.innerHTML = '<i class="spinner-border spinner-border-sm me-1"></i>Compilando...';
        updateStatus('compile-status', 'Compilando...', 'processing');
        updateProgress('progress-compilar', 0);
        
        // Nome do contrato
        const contractName = document.getElementById('summary-nome')?.textContent || 'TestToken';
        
        updateProgress('progress-compilar', 20);
        
        // Usa a função real de compilar contrato - FORÇA INLINE
        console.log('🔧 Compilando via função inline que funciona...');
        
        // Chama diretamente a função inline em vez de window.compilarContrato
        await window.compilarContrato(contractName, btn, compileStatus, btnDeploy);
            
            // Se chegou aqui, compilação foi bem-sucedida
            console.log('✅ Compilação REAL concluída!');
            updateProgress('progress-compilar', 100);
            
            window.tokenWorkflow.contratoCompilado = true;
            btn.innerHTML = '<i class="bi bi-check-circle me-1"></i>Compilado!';
            btn.classList.remove('btn-warning');
            btn.classList.add('btn-success');
            updateStatus('compile-status', 'Compilado!', 'success');
            
            // Habilitar próximo botão
            if (btnDeploy) {
                btnDeploy.disabled = false;
                updateStatus('deploy-status', 'Pronto', 'ready');
            }
        
    } catch (error) {
        console.error('❌ Erro na compilação REAL:', error);
        
        btn.innerHTML = '<i class="bi bi-gear me-1"></i>Compilar';
        btn.disabled = false;
        btn.classList.remove('btn-success');
        btn.classList.add('btn-warning');
        updateStatus('compile-status', 'Erro: ' + error.message, 'error');
        updateProgress('progress-compilar', 0);
        
        alert('❌ Erro na compilação: ' + error.message);
    }
}

// Função: Deploy - USANDO SISTEMA REAL
async function handleDeployContrato() {
    if (!window.tokenWorkflow.contratoCompilado) {
        alert('⚠️ Primeiro é necessário compilar o contrato!');
        return;
    }
    
    console.log('🚀 Fazendo deploy com sistema REAL...');
    const btn = document.getElementById('btn-deploy-contrato');
    const deployStatus = document.getElementById('deploy-status');
    
    try {
        // Visual feedback
        btn.disabled = true;
        btn.innerHTML = '<i class="spinner-border spinner-border-sm me-1"></i>Deploy...';
        updateStatus('deploy-status', 'Deploy...', 'processing');
        updateProgress('progress-deploy', 0);
        
        updateProgress('progress-deploy', 20);
        
        // Usa a função real de deploy
        if (typeof window.deployContrato === 'function') {
            console.log('🔧 Usando função REAL deployContrato...');
            
            // Chama função real de deploy passando os parâmetros corretos
            const contractAddress = await window.deployContrato(btn, deployStatus);
            
            // Se chegou aqui, deploy foi bem-sucedido
            console.log('✅ Deploy REAL concluído! Endereço:', contractAddress);
            
            window.tokenWorkflow.contratoDeployado = true;
            window.tokenWorkflow.contratoAddress = contractAddress;
            window.tokenWorkflow.networkName = window.currentNetwork?.name || 'Rede Atual';
            
            btn.innerHTML = '<i class="bi bi-check-circle me-1"></i>Deploy OK!';
            btn.classList.remove('btn-primary');
            btn.classList.add('btn-success');
            updateStatus('deploy-status', 'Deploy OK!', 'success');
            updateProgress('progress-deploy', 100);
            
            // Mostrar seção de finalização
            mostrarFinalizacao();
            
        } else {
            throw new Error('Função deployContrato não encontrada! Verifique se o sistema está carregado.');
        }
        
    } catch (error) {
        console.error('❌ Erro no deploy REAL:', error);
        
        btn.innerHTML = '<i class="bi bi-rocket-takeoff me-1"></i>Deploy';
        btn.disabled = false;
        btn.classList.remove('btn-success');
        btn.classList.add('btn-primary');
        updateStatus('deploy-status', 'Erro: ' + error.message, 'error');
        updateProgress('progress-deploy', 0);
        
        alert('❌ Erro no deploy: ' + error.message);
    }
}

// Mostrar seção de finalização
function mostrarFinalizacao() {
    const finalizacaoSection = document.getElementById('finalizacao-section');
    if (finalizacaoSection) {
        finalizacaoSection.style.display = 'block';
        
        // Atualizar informações do contrato
        const addressDisplay = document.getElementById('contract-address-display');
        const networkDisplay = document.getElementById('network-name-display');
        
        if (addressDisplay && window.tokenWorkflow.contratoAddress) {
            addressDisplay.textContent = window.tokenWorkflow.contratoAddress;
        }
        
        if (networkDisplay && window.tokenWorkflow.networkName) {
            networkDisplay.textContent = window.tokenWorkflow.networkName;
        }
        
        // Scroll suave para a seção
        setTimeout(() => {
            finalizacaoSection.scrollIntoView({ behavior: 'smooth' });
        }, 500);
    }
}

// Função: Adicionar ao MetaMask
async function adicionarAoMetaMask() {
    if (!window.tokenWorkflow.contratoDeployado) {
        alert('⚠️ É necessário fazer o deploy primeiro!');
        return;
    }
    
    console.log('🦊 Adicionando token ao MetaMask...');
    const btn = document.getElementById('btn-add-metamask');
    
    try {
        btn.disabled = true;
        btn.innerHTML = '<i class="spinner-border spinner-border-sm me-1"></i>Adicionando...';
        
        if (!window.ethereum) {
            throw new Error('MetaMask não encontrado!');
        }
        
        // Coleta dados do token
        const tokenSymbol = document.getElementById('summary-symbol')?.textContent || 'TEST';
        const tokenDecimals = parseInt(document.getElementById('summary-decimals')?.textContent || '18');
        
        const wasAdded = await window.ethereum.request({
            method: 'wallet_watchAsset',
            params: {
                type: 'ERC20',
                options: {
                    address: window.tokenWorkflow.contratoAddress,
                    symbol: tokenSymbol,
                    decimals: tokenDecimals,
                    image: '',
                },
            },
        });
        
        if (wasAdded) {
            btn.innerHTML = '<i class="bi bi-check-circle me-1"></i>Adicionado!';
            marcarConcluido(btn);
            alert('✅ Token adicionado ao MetaMask com sucesso!');
        } else {
            btn.innerHTML = '<i class="bi bi-plus-circle me-1"></i>Adicionar ao MetaMask';
            btn.disabled = false;
        }
        
    } catch (error) {
        console.error('❌ Erro ao adicionar ao MetaMask:', error);
        btn.innerHTML = '<i class="bi bi-plus-circle me-1"></i>Adicionar ao MetaMask';
        btn.disabled = false;
        alert('❌ Erro ao adicionar token ao MetaMask: ' + error.message);
    }
}

// Função: Criar Novo Token
function criarNovoToken() {
    if (confirm('🔄 Deseja criar um novo token? Isso irá resetar o processo atual.')) {
        // Reset do estado
        window.tokenWorkflow = {
            contratoGerado: false,
            contratoCompilado: false,
            contratoDeployado: false,
            contratoAddress: null,
            networkName: null
        };
        
        // Recarregar a página para resetar
        window.location.reload();
    }
}

// ============================================================================
// NAVEGAÇÃO PARA VERIFICAÇÃO
// ============================================================================

/**
 * Função para ir para verificação com dados do contrato
 * Coleta dados do resumo e redireciona para add-token.html
 */
function irParaVerificacao() {
    const contractData = {
        address: document.getElementById('contract-address-display')?.textContent || '',
        name: document.getElementById('summary-nome')?.textContent || '',
        symbol: document.getElementById('summary-symbol')?.textContent || '',
        decimals: document.getElementById('summary-decimals')?.textContent || '',
        totalSupply: document.getElementById('summary-supply')?.textContent || '',
        network: document.getElementById('network-name-display')?.textContent || 'BNB Smart Chain'
    };
    
    // Valida se temos dados mínimos
    if (!contractData.address) {
        alert('❌ Endereço do contrato não encontrado. Certifique-se de que o contrato foi criado com sucesso.');
        return;
    }
    
    // Salva os dados no localStorage para a próxima página
    localStorage.setItem('contractVerificationData', JSON.stringify(contractData));
    
    console.log('🔗 Redirecionando para verificação com dados:', contractData);
    
    // Redireciona para a página de verificação
    window.location.href = 'add-token.html';
}

// Disponibiliza função globalmente
window.irParaVerificacao = irParaVerificacao;

console.log('🔗 Sistema de botões funcionais carregado!');
