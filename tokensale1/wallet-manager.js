class WalletManager {
    constructor() {
        this.web3 = null;
        this.account = null;
        this.isConnected = false;
        this.currentRpcIndex = 0;
    }

    async connect() {
        try {
            if (typeof window.ethereum === 'undefined') {
                throw new Error(CONFIG.MESSAGES.WALLET_NOT_FOUND);
            }

            // Solicitar conexão
            const accounts = await window.ethereum.request({
                method: 'eth_requestAccounts'
            });

            this.account = accounts[0];
            
            // Tentar conectar com RPC com fallback
            await this.initializeWeb3();

            // Verificar rede
            await this.checkNetwork();

            this.isConnected = true;
            this.setupEventListeners();
            
            return {
                success: true,
                account: this.account
            };

        } catch (error) {
            console.error('Erro na conexão:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    async initializeWeb3() {
        // Tentar usar o provider do MetaMask primeiro
        try {
            this.web3 = new Web3(window.ethereum);
            // Testar a conexão
            await this.web3.eth.getChainId();
            return;
        } catch (error) {
            console.warn('Erro com provider MetaMask, tentando RPC alternativo:', error);
        }

        // Se falhar, tentar RPCs alternativos
        for (let i = 0; i < CONFIG.RPC_URLS.length; i++) {
            try {
                const rpcUrl = CONFIG.RPC_URLS[i];
                console.log(`Tentando RPC: ${rpcUrl}`);
                
                this.web3 = new Web3(new Web3.providers.HttpProvider(rpcUrl));
                
                // Testar a conexão
                await this.web3.eth.getChainId();
                
                this.currentRpcIndex = i;
                console.log(`Conectado com sucesso ao RPC: ${rpcUrl}`);
                return;
                
            } catch (error) {
                console.warn(`Falha no RPC ${CONFIG.RPC_URLS[i]}:`, error);
                continue;
            }
        }
        
        throw new Error(CONFIG.MESSAGES.CONNECTION_FAILED);
    }

    async checkNetwork() {
        try {
            const chainId = await this.web3.eth.getChainId();
            
            if (chainId !== CONFIG.CHAIN_ID) {
                try {
                    await window.ethereum.request({
                        method: 'wallet_switchEthereumChain',
                        params: [{ chainId: `0x${CONFIG.CHAIN_ID.toString(16)}` }]
                    });
                } catch (switchError) {
                    if (switchError.code === 4902) {
                        await this.addNetwork();
                    } else {
                        throw new Error(CONFIG.MESSAGES.WRONG_NETWORK);
                    }
                }
            }
        } catch (error) {
            console.error('Erro na verificação de rede:', error);
            throw error;
        }
    }

    async addNetwork() {
        await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{
                chainId: `0x${CONFIG.CHAIN_ID.toString(16)}`,
                chainName: CONFIG.CHAIN_NAME,
                nativeCurrency: CONFIG.NATIVE_CURRENCY,
                rpcUrls: CONFIG.RPC_URLS, // Usar todos os RPCs disponíveis
                blockExplorerUrls: [CONFIG.EXPLORER_URL]
            }]
        });
    }

    async getBalance() {
        if (!this.web3 || !this.account) return '0';
        
        try {
            const balance = await this.retryOperation(async () => {
                return await this.web3.eth.getBalance(this.account);
            });
            
            return this.web3.utils.fromWei(balance, 'ether');
        } catch (error) {
            console.error('Erro ao obter saldo:', error);
            return '0';
        }
    }

    async retryOperation(operation, maxRetries = CONFIG.MAX_RETRIES) {
        for (let i = 0; i < maxRetries; i++) {
            try {
                return await operation();
            } catch (error) {
                console.warn(`Tentativa ${i + 1} falhou:`, error);
                
                if (i === maxRetries - 1) {
                    throw error;
                }
                
                // Aguardar antes da próxima tentativa
                await new Promise(resolve => setTimeout(resolve, CONFIG.RETRY_DELAY));
                
                // Tentar próximo RPC se disponível
                if (error.message.includes('JSON-RPC') || error.message.includes('trie node')) {
                    await this.tryNextRpc();
                }
            }
        }
    }

    async tryNextRpc() {
        this.currentRpcIndex = (this.currentRpcIndex + 1) % CONFIG.RPC_URLS.length;
        const nextRpc = CONFIG.RPC_URLS[this.currentRpcIndex];
        
        try {
            console.log(`Tentando RPC alternativo: ${nextRpc}`);
            this.web3 = new Web3(new Web3.providers.HttpProvider(nextRpc));
            await this.web3.eth.getChainId(); // Testar conexão
        } catch (error) {
            console.warn(`Falha no RPC alternativo ${nextRpc}:`, error);
        }
    }

    setupEventListeners() {
        window.ethereum.on('accountsChanged', (accounts) => {
            if (accounts.length === 0) {
                this.disconnect();
            } else {
                this.account = accounts[0];
                window.location.reload();
            }
        });

        window.ethereum.on('chainChanged', () => {
            window.location.reload();
        });
    }

    disconnect() {
        this.web3 = null;
        this.account = null;
        this.isConnected = false;
    }

    async addTokenToWallet(tokenAddress) {
        try {
            const wasAdded = await window.ethereum.request({
                method: 'wallet_watchAsset',
                params: {
                    type: 'ERC20',
                    options: {
                        address: tokenAddress,
                        symbol: CONFIG.TOKEN.symbol,
                        decimals: CONFIG.TOKEN.decimals,
                        image: CONFIG.TOKEN.image
                    }
                }
            });
            return wasAdded;
        } catch (error) {
            console.error('Erro ao adicionar token:', error);
            return false;
        }
    }
}