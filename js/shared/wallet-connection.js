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
 */
function updateConnectionInterface(status = '') {
    const connectionSection = document.querySelector('.connection-section');
    const walletStatus = document.getElementById('wallet-status');
    const btnConectar = document.getElementById('connect-metamask-btn');
    const ownerInput = document.getElementById('ownerAddress');

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
    }

    // Se houver um campo de proprietário, atualiza ele também
    if (ownerInput && ownerInput.value) {
        ownerInput.classList.add('filled');
    }

    // Atualiza botão
    if (btnConectar) {
        if (status === 'connected') {
            btnConectar.textContent = 'CONECTADO';
            btnConectar.disabled = true;
            btnConectar.className = 'btn btn-success';
        } else {
            btnConectar.disabled = isConnecting;
            btnConectar.className = 'btn btn-outline-warning';
        }
    }
}

/**
 * Inicializa o componente de conexão da carteira
 */
export async function setupWalletConnection() {
    try {
        // Primeiro carrega o template
        const response = await fetch('/templates/wallet-connection.html');
        const template = await response.text();
        
        // Procura pelo local onde o template deve ser injetado
        const connectionSection = document.querySelector('.connection-section');
        if (connectionSection) {
            // Usa um parser temporário para evitar o aviso de speculation rule
            const parser = new DOMParser();
            const doc = parser.parseFromString(template, 'text/html');
            connectionSection.replaceChildren(...doc.body.children);
            
            // Configura o botão de conexão
            const btnConectar = document.getElementById('connect-metamask-btn');
            if (btnConectar) {
                btnConectar.addEventListener('click', handleConnection);
            }
        }
    } catch (error) {
        console.error('❌ Erro ao configurar conexão:', error);
    }
}

/**
 * Manipula o processo de conexão
 */
async function handleConnection(event) {
    event.preventDefault();
    
    if (isConnecting) return;
    if (!window.ethereum) {
        alert('MetaMask não encontrado! Por favor, instale a extensão MetaMask no seu navegador.');
        return;
    }

    try {
        isConnecting = true;
        updateConnectionInterface('connecting');

        // Conecta com MetaMask
        currentProvider = await connectMetaMask();
        
        // Detecta a rede atual
        await detectCurrentNetwork();
        updateNetworkInfo();
        
        // Configura listeners
        listenMetaMask(currentProvider);
        
        // Atualiza interface
        updateConnectionInterface('connected');

    } catch (error) {
        console.error('❌ Erro ao conectar:', error);
        updateConnectionInterface('error');
        alert('Erro ao conectar com MetaMask: ' + error.message);
    } finally {
        isConnecting = false;
    }
}

// Exporta o provider atual para quem precisar usar
export function getCurrentProvider() {
    return currentProvider;
}
