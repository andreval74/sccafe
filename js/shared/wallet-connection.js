/**
 * Módulo compartilhado para gerenciar conexão com a carteira
 * Este módulo pode ser importado por qualquer página que precise de conexão com MetaMask
 */

import { connectMetaMask, listenMetaMask } from '../add-metamask.js';
import { detectCurrentNetwork, updateNetworkInfo } from '../network-manager.js';

// Estado do provider e da conexão
let currentProvider = null;
let isConnecting = false;

/**
 * Atualiza a interface de conexão com o status atual
 * @param {string} status - Status da conexão ('connecting', 'connected', 'error', etc.)
 */
function updateConnectionInterface(status = '') {
    const connectionSection = document.querySelector('.connection-section');
    const walletStatus = document.getElementById('wallet-status');
    const btnConectar = document.getElementById('connect-metamask-btn');
    const ownerInput = document.getElementById('ownerAddress');
    const currentNetworkSpan = document.getElementById('current-network');

    console.log('🔄 Atualizando interface de conexão com status:', status);

    // Remove estado de carregamento
    if (connectionSection) {
        connectionSection.classList.remove('connecting');
        if (status === 'connected') {
            connectionSection.classList.add('connected-state');
        }
    }
    
    // Atualiza status da carteira
    if (walletStatus) {
        switch(status) {
            case 'connecting':
                walletStatus.value = 'Conectando com MetaMask...';
                break;
            case 'connected':
                walletStatus.value = 'Carteira conectada com sucesso!';
                break;
            case 'error':
                walletStatus.value = 'Erro na conexão. Tente novamente.';
                break;
            default:
                walletStatus.value = status || 'Clique em Conectar para iniciar';
        }
        console.log('✅ Wallet status atualizado:', walletStatus.value);
    }

    // Se houver um campo de proprietário, atualiza ele também
    if (ownerInput && ownerInput.value) {
        ownerInput.classList.add('filled');
    }

    // Atualiza o span da rede se disponível
    if (currentNetworkSpan && status === 'connected') {
        // A rede será atualizada pela função updateNetworkInfo do network-manager
        console.log('✅ Preparado para atualização da rede via network-manager');
    }

    // Atualiza botão
    if (btnConectar) {
        if (status === 'connected') {
            btnConectar.innerHTML = '<i class="bi bi-check-circle"></i> CONECTADO';
            btnConectar.disabled = true;
            btnConectar.className = 'btn btn-success';
            console.log('✅ Botão marcado como conectado');
        } else if (status === 'connecting') {
            btnConectar.innerHTML = '<i class="spinner-border spinner-border-sm"></i> CONECTANDO...';
            btnConectar.disabled = true;
            btnConectar.className = 'btn btn-warning';
        } else {
            btnConectar.innerHTML = '<i class="bi bi-wallet2"></i> CONECTAR';
            btnConectar.disabled = isConnecting;
            btnConectar.className = 'btn btn-outline-warning';
        }
    }
}

/**
 * Inicializa o componente de conexão da carteira
 * Corrige o problema de speculation rule inserindo o HTML de forma segura
 */
export async function setupWalletConnection() {
    try {
        console.log('🔗 Configurando conexão da carteira...');
        
        // Procura pelo local onde o template deve ser injetado
        const connectionSection = document.querySelector('.connection-section');
        if (!connectionSection) {
            console.warn('⚠️ Seção de conexão não encontrada na página');
            return;
        }

        console.log('✅ Seção de conexão encontrada');

        // Verifica se já existe conteúdo na seção (HTML já presente na página)
        const existingButton = document.getElementById('connect-metamask-btn');
        if (existingButton) {
            console.log('✅ Interface de conexão já presente, configurando botões...');
            // Apenas configura o botão existente
            existingButton.addEventListener('click', handleConnection);
            console.log('✅ Botão de conexão configurado');
            return;
        }

        // Se não existe, tenta carregar template
        console.log('📄 Carregando template wallet-connection...');
        const response = await fetch('./templates/wallet-connection.html');
        if (!response.ok) {
            console.warn(`⚠️ Template não encontrado (${response.status}), usando fallback`);
            createFallbackInterface();
            return;
        }
        
        const template = await response.text();
        console.log('✅ Template carregado com sucesso');
        
        // Método seguro para inserir HTML sem causar speculation rule warning
        // Cria um elemento temporário e move seus filhos para evitar problemas
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = template;
        
        // Remove todo o conteúdo atual da seção
        connectionSection.innerHTML = '';
        
        // Move cada elemento filho do template para a seção
        while (tempDiv.firstChild) {
            connectionSection.appendChild(tempDiv.firstChild);
        }
        
        // Configura o botão de conexão após inserir o template
        const btnConectar = document.getElementById('connect-metamask-btn');
        if (btnConectar) {
            btnConectar.addEventListener('click', handleConnection);
            console.log('✅ Botão de conexão configurado');
        } else {
            console.warn('⚠️ Botão de conexão não encontrado no template');
        }
        
        console.log('✅ Componente de conexão configurado com sucesso');
        
    } catch (error) {
        console.error('❌ Erro ao configurar conexão da carteira:', error);
        
        // Fallback: cria interface básica se falhar
        createFallbackInterface();
    }
}

/**
 * Cria uma interface básica de conexão se o template falhar
 */
function createFallbackInterface() {
    const connectionSection = document.querySelector('.connection-section');
    if (!connectionSection) return;
    
    connectionSection.innerHTML = `
        <div class="card border-warning">
            <div class="card-body">
                <h5 class="card-title">
                    <i class="bi bi-wallet2 text-warning me-2"></i>Conexão da Carteira
                </h5>
                <div class="d-flex gap-3 align-items-center">
                    <input type="text" class="form-control" id="wallet-status" 
                           placeholder="Clique em 'Conectar' para iniciar" style="font-family: monospace;" readonly>
                    <button id="connect-metamask-btn" type="button" class="btn btn-outline-warning">
                        <i class="bi bi-wallet2"></i> CONECTAR
                    </button>
                </div>
                <div class="row mt-2">
                    <div class="col-md-6">
                        <small class="text-muted">
                            <i class="bi bi-wifi"></i> Rede: <span id="current-network" class="fw-bold">Não conectado</span>
                        </small>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Configura o botão
    const btnConectar = document.getElementById('connect-metamask-btn');
    if (btnConectar) {
        btnConectar.addEventListener('click', handleConnection);
    }
    
    console.log('✅ Interface de fallback criada');
}

/**
 * Manipula o processo de conexão com a carteira
 * @param {Event} event - Evento do clique no botão
 */
async function handleConnection(event) {
    event.preventDefault();
    
    if (isConnecting) {
        console.log('⚠️ Conexão já em andamento, aguarde...');
        return;
    }
    
    if (!window.ethereum) {
        alert('MetaMask não encontrado! Por favor, instale a extensão MetaMask no seu navegador.');
        return;
    }

    try {
        isConnecting = true;
        console.log('🔗 Iniciando processo de conexão...');
        updateConnectionInterface('connecting');

        // Conecta com MetaMask
        currentProvider = await connectMetaMask();
        console.log('✅ MetaMask conectado');
        
        // Detecta a rede atual
        await detectCurrentNetwork();
        updateNetworkInfo();
        console.log('✅ Rede detectada e informações atualizadas');
        
        // Configura listeners para mudanças de conta e rede
        listenMetaMask(currentProvider);
        console.log('✅ Listeners configurados');
        
        // Atualiza interface para estado conectado
        updateConnectionInterface('connected');
        console.log('✅ Conexão concluída com sucesso');

    } catch (error) {
        console.error('❌ Erro ao conectar com MetaMask:', error);
        updateConnectionInterface('error');
        alert('Erro ao conectar com MetaMask: ' + error.message);
    } finally {
        isConnecting = false;
    }
}

/**
 * Retorna o provider atual da carteira conectada
 * @returns {Object|null} Provider do MetaMask ou null se não conectado
 */
export function getCurrentProvider() {
    return currentProvider;
}
