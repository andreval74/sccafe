/**
 * @fileoverview Add Token Page - Sistema moderno de criação de tokens
 * @version 1.0.0
 * @author SCCAFE Team
 */

class TokenCreator {
    constructor() {
        this.currentStep = 1;
        this.maxSteps = 3;
        this.tokenConfig = {
            name: '',
            symbol: '',
            decimals: 18,
            totalSupply: 0,
            features: [],
            network: 'ethereum'
        };
        this.web3 = null;
        this.userAccount = null;
        
        this.init();
    }

    /**
     * Inicializa a página de criação de tokens
     */
    init() {
        console.log('🚀 Inicializando TokenCreator...');
        
        this.bindEvents();
        this.loadUserData();
        this.setupFormValidation();
        this.updateProgress();
        
        // Fade out loading screen
        setTimeout(() => {
            const loadingScreen = document.getElementById('loading-screen');
            if (loadingScreen) {
                loadingScreen.style.opacity = '0';
                setTimeout(() => {
                    loadingScreen.style.display = 'none';
                }, 300);
            }
        }, 1000);
    }

    /**
     * Vincula eventos dos elementos
     */
    bindEvents() {
        // Step navigation
        const nextBtn = document.getElementById('next-step-btn');
        const prevBtn = document.getElementById('prev-step-btn');
        const deployBtn = document.getElementById('deploy-btn');

        if (nextBtn) nextBtn.addEventListener('click', () => this.nextStep());
        if (prevBtn) prevBtn.addEventListener('click', () => this.prevStep());
        if (deployBtn) deployBtn.addEventListener('click', () => this.deployToken());

        // Form inputs
        this.bindFormInputs();
        
        // Network selection
        this.bindNetworkSelector();
        
        // Feature checkboxes
        this.bindFeatureCheckboxes();
    }

    /**
     * Vincula eventos dos inputs do formulário
     */
    bindFormInputs() {
        const inputs = ['token-name', 'token-symbol', 'token-decimals', 'total-supply'];
        
        inputs.forEach(inputId => {
            const input = document.getElementById(inputId);
            if (input) {
                input.addEventListener('input', (e) => this.handleInputChange(e));
                input.addEventListener('blur', (e) => this.validateInput(e.target));
            }
        });

        // Symbol input - force uppercase
        const symbolInput = document.getElementById('token-symbol');
        if (symbolInput) {
            symbolInput.addEventListener('input', (e) => {
                e.target.value = e.target.value.toUpperCase();
            });
        }
    }

    /**
     * Vincula eventos do seletor de rede
     */
    bindNetworkSelector() {
        const networkOptions = document.querySelectorAll('.network-option');
        
        networkOptions.forEach(option => {
            option.addEventListener('click', () => {
                // Remove active class from all options
                networkOptions.forEach(opt => opt.classList.remove('active'));
                
                // Add active class to clicked option
                option.classList.add('active');
                
                // Update network in config
                this.tokenConfig.network = option.dataset.network;
                this.updateCostEstimation();
            });
        });
    }

    /**
     * Vincula eventos dos checkboxes de funcionalidades
     */
    bindFeatureCheckboxes() {
        const featureCheckboxes = document.querySelectorAll('.feature-checkbox');
        
        featureCheckboxes.forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                const feature = e.target.id;
                
                if (e.target.checked) {
                    if (!this.tokenConfig.features.includes(feature)) {
                        this.tokenConfig.features.push(feature);
                    }
                } else {
                    this.tokenConfig.features = this.tokenConfig.features.filter(f => f !== feature);
                }
                
                console.log('🎛️ Features atualizadas:', this.tokenConfig.features);
            });
        });
    }

    /**
     * Manipula mudanças nos inputs
     */
    handleInputChange(event) {
        const { id, value } = event.target;
        
        switch (id) {
            case 'token-name':
                this.tokenConfig.name = value;
                break;
            case 'token-symbol':
                this.tokenConfig.symbol = value.toUpperCase();
                break;
            case 'token-decimals':
                this.tokenConfig.decimals = parseInt(value) || 18;
                break;
            case 'total-supply':
                this.tokenConfig.totalSupply = parseFloat(value) || 0;
                break;
        }
        
        this.updatePreview();
    }

    /**
     * Valida um input específico
     */
    validateInput(input) {
        const { id, value } = input;
        const inputGroup = input.closest('.input-group');
        const errorElement = inputGroup?.querySelector('.input-error');
        
        // Remove existing error
        if (errorElement) errorElement.remove();
        input.classList.remove('input-error');
        
        let isValid = true;
        let errorMessage = '';
        
        switch (id) {
            case 'token-name':
                if (!value.trim()) {
                    isValid = false;
                    errorMessage = 'Nome do token é obrigatório';
                } else if (value.length > 50) {
                    isValid = false;
                    errorMessage = 'Nome deve ter no máximo 50 caracteres';
                }
                break;
                
            case 'token-symbol':
                if (!value.trim()) {
                    isValid = false;
                    errorMessage = 'Símbolo é obrigatório';
                } else if (value.length < 2 || value.length > 10) {
                    isValid = false;
                    errorMessage = 'Símbolo deve ter entre 2 e 10 caracteres';
                }
                break;
                
            case 'total-supply':
                if (!value || parseFloat(value) <= 0) {
                    isValid = false;
                    errorMessage = 'Supply total deve ser maior que zero';
                }
                break;
        }
        
        if (!isValid) {
            input.classList.add('input-error');
            const errorSpan = document.createElement('span');
            errorSpan.className = 'input-error';
            errorSpan.textContent = errorMessage;
            inputGroup?.appendChild(errorSpan);
        }
        
        return isValid;
    }

    /**
     * Valida todo o formulário
     */
    validateForm() {
        const requiredInputs = document.querySelectorAll('input[required]');
        let isValid = true;
        
        requiredInputs.forEach(input => {
            if (!this.validateInput(input)) {
                isValid = false;
            }
        });
        
        return isValid;
    }

    /**
     * Avança para o próximo step
     */
    async nextStep() {
        if (this.currentStep === 1) {
            if (!this.validateForm()) {
                this.showNotification('Por favor, corrija os erros no formulário', 'error');
                return;
            }
            
            // Check wallet connection
            if (!this.userAccount) {
                await this.connectWallet();
                if (!this.userAccount) return;
            }
        }
        
        if (this.currentStep < this.maxSteps) {
            this.currentStep++;
            this.updateStepDisplay();
            this.updateProgress();
            
            if (this.currentStep === 2) {
                this.updatePreview();
                this.updateCostEstimation();
            }
        }
    }

    /**
     * Volta para o step anterior
     */
    prevStep() {
        if (this.currentStep > 1) {
            this.currentStep--;
            this.updateStepDisplay();
            this.updateProgress();
        }
    }

    /**
     * Atualiza a exibição dos steps
     */
    updateStepDisplay() {
        // Hide all steps
        document.querySelectorAll('.form-step').forEach(step => {
            step.classList.remove('active');
        });
        
        // Show current step
        const currentStepElement = document.getElementById(`step-${this.currentStep}`);
        if (currentStepElement) {
            currentStepElement.classList.add('active');
        }
        
        // Smooth scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    /**
     * Atualiza o progresso visual
     */
    updateProgress() {
        const steps = document.querySelectorAll('.progress-steps .step');
        
        steps.forEach((step, index) => {
            const stepNumber = index + 1;
            
            if (stepNumber < this.currentStep) {
                step.classList.add('step-completed');
                step.classList.remove('step-active');
            } else if (stepNumber === this.currentStep) {
                step.classList.add('step-active');
                step.classList.remove('step-completed');
            } else {
                step.classList.remove('step-active', 'step-completed');
            }
        });
    }

    /**
     * Atualiza o preview do token
     */
    updatePreview() {
        const namePreview = document.getElementById('token-name-preview');
        const symbolPreview = document.getElementById('token-symbol-preview');
        const supplyPreview = document.getElementById('supply-preview');
        const decimalsPreview = document.getElementById('decimals-preview');
        const networkPreview = document.getElementById('network-preview');
        const featuresList = document.getElementById('features-list');
        
        if (namePreview) namePreview.textContent = this.tokenConfig.name || 'Nome do Token';
        if (symbolPreview) symbolPreview.textContent = this.tokenConfig.symbol || 'SÍMBOLO';
        if (supplyPreview) {
            const formattedSupply = this.tokenConfig.totalSupply.toLocaleString('pt-BR');
            supplyPreview.textContent = formattedSupply || '0';
        }
        if (decimalsPreview) decimalsPreview.textContent = this.tokenConfig.decimals;
        if (networkPreview) {
            const networkNames = {
                ethereum: 'Ethereum',
                polygon: 'Polygon',
                bsc: 'BSC'
            };
            networkPreview.textContent = networkNames[this.tokenConfig.network] || 'Ethereum';
        }
        
        if (featuresList) {
            featuresList.innerHTML = '';
            
            if (this.tokenConfig.features.length === 0) {
                featuresList.innerHTML = '<span class="no-features">Nenhuma funcionalidade adicional selecionada</span>';
            } else {
                const featureNames = {
                    mintable: 'Mintable',
                    burnable: 'Burnable',
                    pausable: 'Pausable',
                    capped: 'Capped'
                };
                
                this.tokenConfig.features.forEach(feature => {
                    const featureTag = document.createElement('span');
                    featureTag.className = 'feature-tag';
                    featureTag.innerHTML = `
                        <i class="bi bi-check"></i>
                        ${featureNames[feature] || feature}
                    `;
                    featuresList.appendChild(featureTag);
                });
            }
        }
    }

    /**
     * Atualiza estimativa de custos
     */
    updateCostEstimation() {
        const deployCost = document.getElementById('deploy-cost');
        const totalCost = document.getElementById('total-cost');
        
        const costs = {
            ethereum: '~0.05 ETH',
            polygon: '~0.001 MATIC',
            bsc: '~0.005 BNB'
        };
        
        const cost = costs[this.tokenConfig.network] || '~0.05 ETH';
        
        if (deployCost) deployCost.textContent = cost;
        if (totalCost) totalCost.textContent = cost;
    }

    /**
     * Conecta carteira
     */
    async connectWallet() {
        try {
            if (typeof window.ethereum !== 'undefined') {
                console.log('🦊 MetaMask detectado');
                
                const accounts = await window.ethereum.request({
                    method: 'eth_requestAccounts'
                });
                
                if (accounts.length > 0) {
                    this.userAccount = accounts[0];
                    console.log('✅ Carteira conectada:', this.userAccount);
                    this.showNotification('Carteira conectada com sucesso!', 'success');
                    return true;
                }
            } else {
                this.showWalletModal();
                return false;
            }
        } catch (error) {
            console.error('❌ Erro ao conectar carteira:', error);
            this.showNotification('Erro ao conectar carteira', 'error');
            return false;
        }
    }

    /**
     * Mostra modal de carteira
     */
    showWalletModal() {
        const modal = document.getElementById('wallet-modal');
        if (modal) {
            modal.style.display = 'flex';
            setTimeout(() => modal.classList.add('active'), 10);
        }
    }

    /**
     * Realiza o deploy do token
     */
    async deployToken() {
        console.log('🚀 Iniciando deploy do token...');
        
        this.currentStep = 3;
        this.updateStepDisplay();
        this.updateProgress();
        
        const statusContainer = document.getElementById('deploy-status');
        if (statusContainer) {
            statusContainer.innerHTML = this.getDeployStatusHTML();
        }
        
        try {
            // Simular deploy process
            await this.simulateDeployProcess();
            
        } catch (error) {
            console.error('❌ Erro no deploy:', error);
            this.showDeployError(error.message);
        }
    }

    /**
     * Simula processo de deploy
     */
    async simulateDeployProcess() {
        const steps = [
            { id: 'compile', text: 'Compilando contrato inteligente...', duration: 2000 },
            { id: 'validate', text: 'Validando parâmetros...', duration: 1500 },
            { id: 'estimate', text: 'Estimando gas...', duration: 1000 },
            { id: 'deploy', text: 'Fazendo deploy na blockchain...', duration: 3000 },
            { id: 'verify', text: 'Verificando contrato...', duration: 2000 },
            { id: 'complete', text: 'Deploy concluído com sucesso!', duration: 500 }
        ];
        
        for (const step of steps) {
            this.updateDeployStep(step.id, 'in-progress');
            await this.delay(step.duration);
            this.updateDeployStep(step.id, 'completed');
        }
        
        // Show success
        setTimeout(() => {
            this.showDeploySuccess();
        }, 1000);
    }

    /**
     * Atualiza step do deploy
     */
    updateDeployStep(stepId, status) {
        const stepElement = document.querySelector(`[data-deploy-step="${stepId}"]`);
        if (stepElement) {
            stepElement.className = `deploy-step deploy-step-${status}`;
            
            const icon = stepElement.querySelector('.deploy-step-icon');
            if (icon) {
                icon.innerHTML = this.getDeployStepIcon(status);
            }
        }
    }

    /**
     * Retorna ícone do step de deploy
     */
    getDeployStepIcon(status) {
        switch (status) {
            case 'pending':
                return '<i class="bi bi-circle"></i>';
            case 'in-progress':
                return '<div class="loading-spinner small"></div>';
            case 'completed':
                return '<i class="bi bi-check-circle"></i>';
            case 'error':
                return '<i class="bi bi-x-circle"></i>';
            default:
                return '<i class="bi bi-circle"></i>';
        }
    }

    /**
     * Retorna HTML do status de deploy
     */
    getDeployStatusHTML() {
        return `
            <div class="deploy-progress">
                <div class="deploy-step deploy-step-pending" data-deploy-step="compile">
                    <div class="deploy-step-icon">
                        <i class="bi bi-circle"></i>
                    </div>
                    <div class="deploy-step-info">
                        <span class="deploy-step-title">Compilando contrato</span>
                        <span class="deploy-step-subtitle">Preparando código Solidity...</span>
                    </div>
                </div>
                
                <div class="deploy-step deploy-step-pending" data-deploy-step="validate">
                    <div class="deploy-step-icon">
                        <i class="bi bi-circle"></i>
                    </div>
                    <div class="deploy-step-info">
                        <span class="deploy-step-title">Validando parâmetros</span>
                        <span class="deploy-step-subtitle">Verificando configurações...</span>
                    </div>
                </div>
                
                <div class="deploy-step deploy-step-pending" data-deploy-step="estimate">
                    <div class="deploy-step-icon">
                        <i class="bi bi-circle"></i>
                    </div>
                    <div class="deploy-step-info">
                        <span class="deploy-step-title">Estimando gas</span>
                        <span class="deploy-step-subtitle">Calculando custos de transação...</span>
                    </div>
                </div>
                
                <div class="deploy-step deploy-step-pending" data-deploy-step="deploy">
                    <div class="deploy-step-icon">
                        <i class="bi bi-circle"></i>
                    </div>
                    <div class="deploy-step-info">
                        <span class="deploy-step-title">Deploy na blockchain</span>
                        <span class="deploy-step-subtitle">Publicando contrato...</span>
                    </div>
                </div>
                
                <div class="deploy-step deploy-step-pending" data-deploy-step="verify">
                    <div class="deploy-step-icon">
                        <i class="bi bi-circle"></i>
                    </div>
                    <div class="deploy-step-info">
                        <span class="deploy-step-title">Verificando contrato</span>
                        <span class="deploy-step-subtitle">Validando na blockchain...</span>
                    </div>
                </div>
                
                <div class="deploy-step deploy-step-pending" data-deploy-step="complete">
                    <div class="deploy-step-icon">
                        <i class="bi bi-circle"></i>
                    </div>
                    <div class="deploy-step-info">
                        <span class="deploy-step-title">Deploy concluído</span>
                        <span class="deploy-step-subtitle">Token criado com sucesso!</span>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Mostra sucesso do deploy
     */
    showDeploySuccess() {
        const statusContainer = document.getElementById('deploy-status');
        if (statusContainer) {
            statusContainer.innerHTML = `
                <div class="deploy-success">
                    <div class="success-icon">
                        <i class="bi bi-check-circle"></i>
                    </div>
                    <h3>Token Criado com Sucesso!</h3>
                    <p>Seu token <strong>${this.tokenConfig.name} (${this.tokenConfig.symbol})</strong> foi publicado na blockchain.</p>
                    
                    <div class="success-details">
                        <div class="detail-item">
                            <span class="detail-label">Endereço do Contrato:</span>
                            <span class="detail-value">0x742d35cc6C1f9bfE2A4b2E6C5E1f4b8f9a2c1d3e</span>
                            <button class="copy-btn" onclick="this.copyToClipboard('0x742d35cc6C1f9bfE2A4b2E6C5E1f4b8f9a2c1d3e')">
                                <i class="bi bi-copy"></i>
                            </button>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Hash da Transação:</span>
                            <span class="detail-value">0xa1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2</span>
                            <button class="copy-btn" onclick="this.copyToClipboard('0xa1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2')">
                                <i class="bi bi-copy"></i>
                            </button>
                        </div>
                    </div>
                    
                    <div class="success-actions">
                        <a href="#" class="btn btn-primary">
                            <i class="bi bi-eye"></i>
                            <span>Ver no Explorer</span>
                        </a>
                        <button class="btn btn-outline" onclick="window.location.href='index.html'">
                            <i class="bi bi-house"></i>
                            <span>Voltar ao Início</span>
                        </button>
                    </div>
                </div>
            `;
        }
    }

    /**
     * Mostra erro no deploy
     */
    showDeployError(errorMessage) {
        const statusContainer = document.getElementById('deploy-status');
        if (statusContainer) {
            statusContainer.innerHTML = `
                <div class="deploy-error">
                    <div class="error-icon">
                        <i class="bi bi-x-circle"></i>
                    </div>
                    <h3>Erro no Deploy</h3>
                    <p>Ocorreu um erro ao publicar seu token na blockchain.</p>
                    <div class="error-message">${errorMessage}</div>
                    
                    <div class="error-actions">
                        <button class="btn btn-primary" onclick="location.reload()">
                            <i class="bi bi-arrow-clockwise"></i>
                            <span>Tentar Novamente</span>
                        </button>
                        <button class="btn btn-outline" onclick="window.location.href='index.html'">
                            <i class="bi bi-house"></i>
                            <span>Voltar ao Início</span>
                        </button>
                    </div>
                </div>
            `;
        }
    }

    /**
     * Carrega dados do usuário
     */
    loadUserData() {
        // Load recent tokens
        this.loadRecentTokens();
        
        // Check wallet connection
        this.checkWalletConnection();
    }

    /**
     * Carrega tokens recentes
     */
    loadRecentTokens() {
        const recentContainer = document.getElementById('recent-tokens');
        if (recentContainer) {
            // Simulação de tokens recentes
            const recentTokens = [
                { name: 'CafeToken', symbol: 'CAFE', network: 'Ethereum' },
                { name: 'TechCoin', symbol: 'TECH', network: 'Polygon' }
            ];
            
            if (recentTokens.length === 0) {
                recentContainer.innerHTML = '<p class="no-recent">Nenhum token criado recentemente</p>';
            } else {
                recentContainer.innerHTML = recentTokens.map(token => `
                    <div class="recent-token">
                        <div class="recent-token-info">
                            <span class="recent-token-name">${token.name}</span>
                            <span class="recent-token-symbol">${token.symbol}</span>
                        </div>
                        <span class="recent-token-network">${token.network}</span>
                    </div>
                `).join('');
            }
        }
    }

    /**
     * Verifica conexão da carteira
     */
    async checkWalletConnection() {
        if (typeof window.ethereum !== 'undefined') {
            try {
                const accounts = await window.ethereum.request({ method: 'eth_accounts' });
                if (accounts.length > 0) {
                    this.userAccount = accounts[0];
                    console.log('✅ Carteira já conectada:', this.userAccount);
                }
            } catch (error) {
                console.error('❌ Erro ao verificar carteira:', error);
            }
        }
    }

    /**
     * Mostra notificação
     */
    showNotification(message, type = 'info') {
        console.log(`📢 ${type.toUpperCase()}: ${message}`);
        
        // Criar elemento de notificação
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <i class="bi bi-${type === 'success' ? 'check-circle' : type === 'error' ? 'x-circle' : 'info-circle'}"></i>
                <span>${message}</span>
            </div>
            <button class="notification-close" onclick="this.parentElement.remove()">
                <i class="bi bi-x"></i>
            </button>
        `;
        
        document.body.appendChild(notification);
        
        // Auto remove após 5 segundos
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 5000);
    }

    /**
     * Copia texto para clipboard
     */
    copyToClipboard(text) {
        navigator.clipboard.writeText(text).then(() => {
            this.showNotification('Copiado para a área de transferência!', 'success');
        }).catch(() => {
            this.showNotification('Erro ao copiar', 'error');
        });
    }

    /**
     * Delay helper
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Global functions for modal
window.closeWalletModal = function() {
    const modal = document.getElementById('wallet-modal');
    if (modal) {
        modal.classList.remove('active');
        setTimeout(() => {
            modal.style.display = 'none';
        }, 300);
    }
};

window.connectMetaMask = async function() {
    const tokenCreator = window.tokenCreatorInstance;
    if (tokenCreator) {
        const connected = await tokenCreator.connectWallet();
        if (connected) {
            closeWalletModal();
        }
    }
};

// Inicialização quando DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    window.tokenCreatorInstance = new TokenCreator();
});

// Exportar para uso global
window.TokenCreator = TokenCreator;
