/**
 * Sistema de Configuração de API Keys
 * Permite ao usuário configurar suas próprias chaves API
 */

class ApiKeyManager {
    constructor() {
        this.defaultKeys = {
            // API Keys atualizadas e funcionais
            bscscan: 'YDB3T4YT72PHNQHPD2GXUKP7URFPJ44XJQ',  // Verificada para BSC
            etherscan: 'I33WZ4CVTPWDG3VEJWN36TQ9USU9QUBVX5', // Para Ethereum
            polygonscan: 'YDB3T4YT72PHNQHPD2GXUKP7URFPJ44XJQ', // Para Polygon
            fantom: 'YDB3T4YT72PHNQHPD2GXUKP7URFPJ44XJQ'     // Para Fantom
        };
        
        // Pool de API keys para rotação
        this.apiKeyPools = {
            bscscan: [
                'YDB3T4YT72PHNQHPD2GXUKP7URFPJ44XJQ',
                'N5FDCGJ8UTUDHA8PQCJQYH2G8G2FZXQHE1',
                'MSKN6YMNPMX9VJ5Z8M4PFPQVXH8E2JNDH3'
            ],
            etherscan: [
                'I33WZ4CVTPWDG3VEJWN36TQ9USU9QUBVX5',
                'YDB3T4YT72PHNQHPD2GXUKP7URFPJ44XJQ'
            ]
        };
        
        this.currentKeyIndex = {};
    }

    /**
     * Configura API key para uma rede específica
     */
    setApiKey(network, apiKey) {
        if (!apiKey || apiKey.trim() === '') {
            throw new Error('API Key não pode estar vazia');
        }

        const key = `${network}ApiKey`;
        localStorage.setItem(key, apiKey.trim());
        
        console.log(`✅ API Key configurada para ${network}`);
        return true;
    }

    /**
     * Obtém API key para uma rede específica
     */
    getApiKey(network = 'bscscan') {
        const key = `${network}ApiKey`;
        const apiKey = localStorage.getItem(key);
        
        // Se tem API key salva, usa ela
        if (apiKey && apiKey !== 'YourApiKeyToken') {
            return apiKey;
        }
        
        // Senão, usa a API key padrão configurada
        return this.defaultKeys[network];
    }

    /**
     * Obtém próxima API key do pool (rotação)
     */
    getNextApiKey(network = 'bscscan') {
        const pool = this.apiKeyPools[network];
        if (!pool || pool.length === 0) {
            return this.getApiKey(network);
        }

        // Inicializar índice se não existir
        if (this.currentKeyIndex[network] === undefined) {
            this.currentKeyIndex[network] = 0;
        }

        const apiKey = pool[this.currentKeyIndex[network]];
        
        // Avançar para próxima key (rotação circular)
        this.currentKeyIndex[network] = (this.currentKeyIndex[network] + 1) % pool.length;
        
        console.log(`🔑 Usando API Key ${this.currentKeyIndex[network]}/${pool.length} para ${network}`);
        return apiKey;
    }

    /**
     * Verifica se uma API key está funcionando
     */
    async testApiKey(network, apiKey) {
        try {
            const baseUrls = {
                bscscan: 'https://api.bscscan.com/api',
                etherscan: 'https://api.etherscan.io/api',
                polygonscan: 'https://api.polygonscan.com/api',
                fantom: 'https://api.ftmscan.com/api'
            };

            const url = baseUrls[network];
            if (!url) {
                throw new Error(`Network ${network} não suportada`);
            }

            const testUrl = `${url}?module=stats&action=ethsupply&apikey=${apiKey}`;
            const response = await fetch(testUrl);
            const data = await response.json();

            return data.status === '1' || data.result; // Success indicators
        } catch (error) {
            console.warn(`⚠️ Teste da API key falhou para ${network}:`, error);
            return false;
        }
    }

    /**
     * Verifica se tem API key configurada
     */
    hasValidApiKey(network = 'bscscan') {
        const apiKey = this.getApiKey(network);
        return apiKey && apiKey.length > 10 && apiKey !== 'YourApiKeyToken';
    }

    /**
     * Remove API key
     */
    removeApiKey(network) {
        const key = `${network}ApiKey`;
        localStorage.removeItem(key);
        console.log(`🗑️ API Key removida para ${network}`);
    }

    /**
     * Lista todas as API keys configuradas
     */
    listConfiguredKeys() {
        const networks = ['bscscan', 'etherscan'];
        const configured = {};
        
        networks.forEach(network => {
            const hasKey = this.hasValidApiKey(network);
            configured[network] = {
                configured: hasKey,
                key: hasKey ? this.getApiKey(network).substring(0, 8) + '...' : 'não configurada'
            };
        });
        
        return configured;
    }

    /**
     * Mostra modal para configurar API key
     */
    showConfigModal() {
        const modal = this.createConfigModal();
        document.body.appendChild(modal);
        
        // Inicializar modal Bootstrap
        const bsModal = new bootstrap.Modal(modal);
        bsModal.show();
        
        // Remover modal quando fechar
        modal.addEventListener('hidden.bs.modal', () => {
            modal.remove();
        });
    }

    /**
     * Cria modal de configuração
     */
    createConfigModal() {
        const modalHtml = `
            <div class="modal fade" id="apiKeyModal" tabindex="-1">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">🔑 Configurar API Keys</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <p class="text-muted">Configure suas próprias API keys para melhor performance na verificação de contratos.</p>
                            
                            <!-- BSCScan API Key -->
                            <div class="mb-3">
                                <label class="form-label fw-bold">BSCScan API Key</label>
                                <div class="input-group">
                                    <input type="password" class="form-control" id="bscscanApiKey" 
                                           placeholder="Sua API key da BSCScan">
                                    <button class="btn btn-outline-secondary" type="button" onclick="toggleApiKeyVisibility('bscscanApiKey')">
                                        👁️
                                    </button>
                                </div>
                                <small class="text-muted">
                                    Obtenha em: <a href="https://bscscan.com/apis" target="_blank">https://bscscan.com/apis</a>
                                </small>
                            </div>

                            <!-- Etherscan API Key -->
                            <div class="mb-3">
                                <label class="form-label fw-bold">Etherscan API Key</label>
                                <div class="input-group">
                                    <input type="password" class="form-control" id="etherscanApiKey" 
                                           placeholder="Sua API key da Etherscan">
                                    <button class="btn btn-outline-secondary" type="button" onclick="toggleApiKeyVisibility('etherscanApiKey')">
                                        👁️
                                    </button>
                                </div>
                                <small class="text-muted">
                                    Obtenha em: <a href="https://etherscan.io/apis" target="_blank">https://etherscan.io/apis</a>
                                </small>
                            </div>

                            <!-- Status atual -->
                            <div class="alert alert-info">
                                <h6>📊 Status Atual:</h6>
                                <div id="apiKeyStatus"></div>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
                            <button type="button" class="btn btn-danger" onclick="clearAllApiKeys()">Limpar Tudo</button>
                            <button type="button" class="btn btn-primary" onclick="saveApiKeys()">Salvar</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        const modalElement = document.createElement('div');
        modalElement.innerHTML = modalHtml;
        const modal = modalElement.firstElementChild;

        // Carregar valores atuais
        const bscscanInput = modal.querySelector('#bscscanApiKey');
        const etherscanInput = modal.querySelector('#etherscanApiKey');
        
        if (this.hasValidApiKey('bscscan')) {
            bscscanInput.value = this.getApiKey('bscscan');
        }
        if (this.hasValidApiKey('etherscan')) {
            etherscanInput.value = this.getApiKey('etherscan');
        }

        // Atualizar status
        this.updateApiKeyStatus(modal);

        return modal;
    }

    /**
     * Atualiza status das API keys no modal
     */
    updateApiKeyStatus(modal) {
        const statusDiv = modal.querySelector('#apiKeyStatus');
        const configured = this.listConfiguredKeys();
        
        let statusHtml = '';
        Object.keys(configured).forEach(network => {
            const status = configured[network];
            const icon = status.configured ? '✅' : '❌';
            statusHtml += `<div>${icon} ${network.toUpperCase()}: ${status.key}</div>`;
        });
        
        statusDiv.innerHTML = statusHtml;
    }
}

// Funções globais para o modal
window.toggleApiKeyVisibility = function(inputId) {
    const input = document.getElementById(inputId);
    if (input.type === 'password') {
        input.type = 'text';
    } else {
        input.type = 'password';
    }
};

window.saveApiKeys = function() {
    try {
        const bscscanKey = document.getElementById('bscscanApiKey').value.trim();
        const etherscanKey = document.getElementById('etherscanApiKey').value.trim();
        
        if (bscscanKey) {
            window.apiKeyManager.setApiKey('bscscan', bscscanKey);
        }
        if (etherscanKey) {
            window.apiKeyManager.setApiKey('etherscan', etherscanKey);
        }
        
        alert('✅ API Keys salvas com sucesso!');
        
        // Fechar modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('apiKeyModal'));
        modal.hide();
        
    } catch (error) {
        alert(`❌ Erro ao salvar: ${error.message}`);
    }
};

window.clearAllApiKeys = function() {
    if (confirm('🗑️ Tem certeza que deseja remover todas as API keys?')) {
        window.apiKeyManager.removeApiKey('bscscan');
        window.apiKeyManager.removeApiKey('etherscan');
        
        // Limpar inputs
        document.getElementById('bscscanApiKey').value = '';
        document.getElementById('etherscanApiKey').value = '';
        
        // Atualizar status
        const modal = document.getElementById('apiKeyModal');
        window.apiKeyManager.updateApiKeyStatus(modal);
        
        alert('🗑️ Todas as API keys foram removidas!');
    }
};

// Função global para configurar API keys
window.configurarApiKeys = function() {
    window.apiKeyManager.showConfigModal();
};

// Instância global
window.apiKeyManager = new ApiKeyManager();

console.log('✅ Sistema de configuração de API Keys carregado!');

// Configurar automaticamente a API Key padrão se não tiver nenhuma configurada
if (!window.apiKeyManager.hasValidApiKey('bscscan')) {
    try {
        window.apiKeyManager.setApiKey('bscscan', 'I33WZ4CVTPWDG3VEJWN36TQ9USU9QUBVX5');
        console.log('🔑 API Key padrão configurada automaticamente para BSCScan');
    } catch (error) {
        console.log('📝 Usando API Key padrão integrada no sistema');
    }
}

// Verificar status final
const configured = window.apiKeyManager.listConfiguredKeys();
let hasValidKeys = false;
Object.values(configured).forEach(config => {
    if (config.configured) hasValidKeys = true;
});

if (hasValidKeys) {
    console.log('🔑✅ API Keys configuradas e prontas para verificação automática!');
} else {
    console.warn('⚠️ Use configurarApiKeys() para configurar chaves personalizadas.');
}
