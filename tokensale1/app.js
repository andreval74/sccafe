class TokenSaleApp {
    constructor() {
        this.walletManager = new WalletManager();
        this.contractManager = new ContractManager(this.walletManager);
        this.uiManager = new UIManager();
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.uiManager.showMessage('Sistema carregado. Conecte sua carteira para começar.', 'info');
    }

    setupEventListeners() {
        // Conectar carteira
        this.uiManager.elements.connectWallet.addEventListener('click', () => {
            this.connectWallet();
        });

        // Carregar contrato
        this.uiManager.elements.loadContract.addEventListener('click', () => {
            this.loadContract();
        });

        // Calcular total em tempo real
        this.uiManager.elements.tokenAmount.addEventListener('input', () => {
            this.uiManager.updateCalculation();
        });

        // Comprar tokens
        this.uiManager.elements.buyTokens.addEventListener('click', () => {
            this.buyTokens();
        });

        // Adicionar token à carteira
        this.uiManager.elements.addTokenToWallet.addEventListener('click', () => {
            this.addTokenToWallet();
        });

        // Ver no explorer
        this.uiManager.elements.viewOnExplorer.addEventListener('click', () => {
            this.viewOnExplorer();
        });
    }

    async connectWallet() {
        this.uiManager.setLoading(this.uiManager.elements.connectWallet);
        this.uiManager.showMessage('Conectando carteira...', 'info');

        try {
            const result = await this.walletManager.connect();
            
            if (result.success) {
                // Tentar obter saldo com retry
                let balance = '0';
                try {
                    balance = await this.walletManager.getBalance();
                } catch (balanceError) {
                    console.warn('Erro ao obter saldo, usando 0:', balanceError);
                    this.uiManager.showMessage('⚠️ Conectado, mas erro ao obter saldo. Tente recarregar.', 'warning');
                }
                
                this.uiManager.updateWalletInfo(result.account, balance);
                this.uiManager.showMessage(CONFIG.MESSAGES.WALLET_CONNECTED, 'success');
            } else {
                this.uiManager.showMessage(result.error, 'error');
            }
        } catch (error) {
            console.error('Erro na conexão da carteira:', error);
            this.uiManager.showMessage('❌ Erro inesperado na conexão. Tente novamente.', 'error');
        } finally {
            this.uiManager.setLoading(this.uiManager.elements.connectWallet, false);
        }
    }

    async loadContract() {
        const address = this.uiManager.elements.contractAddress.value.trim();
        
        if (!address) {
            this.uiManager.showMessage('Digite o endereço do contrato!', 'error');
            return;
        }

        if (!this.walletManager.isConnected) {
            this.uiManager.showMessage('Conecte a carteira primeiro!', 'error');
            return;
        }

        this.uiManager.setLoading(this.uiManager.elements.loadContract);
        this.uiManager.showMessage('Carregando contrato...', 'info');

        const result = await this.contractManager.loadContract(address);
        
        if (result.success) {
            await this.updateContractInfo();
            this.uiManager.showSaleInterface();
            this.uiManager.showMessage(CONFIG.MESSAGES.CONTRACT_LOADED, 'success');
        } else {
            this.uiManager.showMessage(result.error, 'error');
        }
        
        this.uiManager.setLoading(this.uiManager.elements.loadContract, false);
    }

    async updateContractInfo() {
        const info = await this.contractManager.getContractInfo();
        if (info) {
            this.uiManager.updateContractInfo(info);
            
            // Calcular preço baseado nos tokens vendidos e fundos recebidos
            const price = info.soldTokens > 0 ? 
                parseFloat(info.totalFunds) / parseFloat(info.soldTokens) : 
                0.001; // Preço padrão
            
            this.uiManager.setTokenPrice(price);
        }
    }

    async buyTokens() {
        const amount = parseFloat(this.uiManager.elements.tokenAmount.value);
        
        if (!amount || amount <= 0) {
            this.uiManager.showMessage('Digite uma quantidade válida!', 'error');
            return;
        }

        this.uiManager.setLoading(this.uiManager.elements.buyTokens);
        this.uiManager.showMessage('Processando compra...', 'info');

        const result = await this.contractManager.buyTokens(amount, this.uiManager.currentTokenPrice);
        
        if (result.success) {
            this.uiManager.showMessage(
                `${CONFIG.MESSAGES.TRANSACTION_SUCCESS}<br>` +
                `Tokens: ${result.amount.toLocaleString()}<br>` +
                `Custo: ${result.cost.toFixed(6)} BNB<br>` +
                `TX: ${result.transactionHash.substring(0, 10)}...`,
                'success'
            );
            
            this.uiManager.showTransactionSuccess(result.transactionHash);
            await this.updateContractInfo();
            
            // Atualizar saldo da carteira
            const balance = await this.walletManager.getBalance();
            this.uiManager.updateWalletInfo(this.walletManager.account, balance);
        } else {
            this.uiManager.showMessage(result.error, 'error');
        }
        
        this.uiManager.setLoading(this.uiManager.elements.buyTokens, false);
    }

    async addTokenToWallet() {
        const success = await this.walletManager.addTokenToWallet(this.contractManager.contractAddress);
        
        if (success) {
            this.uiManager.showMessage('Token adicionado à carteira!', 'success');
        } else {
            this.uiManager.showMessage('Erro ao adicionar token à carteira', 'error');
        }
    }

    viewOnExplorer() {
        if (this.uiManager.lastTransactionHash) {
            const url = this.contractManager.getExplorerUrl(this.uiManager.lastTransactionHash);
            window.open(url, '_blank');
        }
    }
}

// Inicializar aplicação quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', () => {
    new TokenSaleApp();
});