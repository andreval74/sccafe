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
            
            // Inicializar Web3 com fallback
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
        // Primeiro tentar com o provider do MetaMask
        try {
            this.web3 = new Web3(window.ethereum);
            // Testar a conexão rapidamente
            const chainId = await Promise.race([
                this.web3.eth.getChainId(),
                new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 3000))
            ]);
            console.log('Conectado via MetaMask provider');
            return;
        } catch (error) {
            console.warn('Provider MetaMask falhou, tentando RPCs alternativos:', error);
        }

        // Tentar RPCs alternativos
        for (let i = 0; i < CONFIG.RPC_URLS.length; i++) {
            try {
                const rpcUrl = CONFIG.RPC_URLS[i];
                console.log(`Tentando RPC ${i + 1}/${CONFIG.RPC_URLS.length}: ${rpcUrl}`);
                
                const provider = new Web3.providers.HttpProvider(rpcUrl, {
                    timeout: 5000, // 5 segundos de timeout
                    headers: [{
                        name: 'User-Agent',
                        value: 'SCCAFE-TokenSale/1.0'
                    }]
                });
                
                this.web3 = new Web3(provider);
                
                // Testar a conexão com timeout
                await Promise.race([
                    this.web3.eth.getChainId(),
                    new Promise((_, reject) => setTimeout(() => reject(new Error('RPC Timeout')), 5000))
                ]);
                
                this.currentRpcIndex = i;
                console.log(`✅ Conectado com sucesso ao RPC: ${rpcUrl}`);
                return;
                
            } catch (error) {
                console.warn(`❌ Falha no RPC ${CONFIG.RPC_URLS[i]}:`, error.message);
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
                rpcUrls: CONFIG.RPC_URLS,
                blockExplorerUrls: [CONFIG.EXPLORER_URL]
            }]
        });
    }

    async getBalance() {
        if (!this.web3 || !this.account) return '0';
        
        try {
            const balance = await this.retryOperation(async () => {
                return await Promise.race([
                    this.web3.eth.getBalance(this.account),
                    new Promise((_, reject) => setTimeout(() => reject(new Error('Balance timeout')), 10000))
                ]);
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
                console.warn(`Tentativa ${i + 1} falhou:`, error.message);
                
                if (i === maxRetries - 1) {
                    throw error;
                }
                
                // Aguardar antes da próxima tentativa
                await new Promise(resolve => setTimeout(resolve, CONFIG.RETRY_DELAY));
                
                // Tentar próximo RPC se for erro de rede
                if (this.isNetworkError(error)) {
                    await this.tryNextRpc();
                }
            }
        }
    }

    isNetworkError(error) {
        const networkErrors = [
            'JSON-RPC',
            'trie node',
            'timeout',
            'network',
            'connection',
            'ECONNREFUSED',
            'ETIMEDOUT'
        ];
        
        return networkErrors.some(errorType => 
            error.message.toLowerCase().includes(errorType.toLowerCase())
        );
    }

    async tryNextRpc() {
        if (CONFIG.RPC_URLS.length <= 1) return;
        
        this.currentRpcIndex = (this.currentRpcIndex + 1) % CONFIG.RPC_URLS.length;
        const nextRpc = CONFIG.RPC_URLS[this.currentRpcIndex];
        
        try {
            console.log(`🔄 Tentando RPC alternativo: ${nextRpc}`);
            
            const provider = new Web3.providers.HttpProvider(nextRpc, {
                timeout: 5000,
                headers: [{
                    name: 'User-Agent',
                    value: 'SCCAFE-TokenSale/1.0'
                }]
            });
            
            this.web3 = new Web3(provider);
            
            // Testar rapidamente
            await Promise.race([
                this.web3.eth.getChainId(),
                new Promise((_, reject) => setTimeout(() => reject(new Error('Quick test timeout')), 3000))
            ]);
            
            console.log(`✅ Mudança para RPC alternativo bem-sucedida: ${nextRpc}`);
        } catch (error) {
            console.warn(`❌ Falha no RPC alternativo ${nextRpc}:`, error.message);
        }
    }

    setupEventListeners() {
        if (window.ethereum) {
            window.ethereum.on('accountsChanged', (accounts) => {
                if (accounts.length === 0) {
                    this.disconnect();
                } else {
                    this.account = accounts[0];
                    // Recarregar a página para atualizar tudo
                    window.location.reload();
                }
            });

            window.ethereum.on('chainChanged', () => {
                // Recarregar a página quando a rede mudar
                window.location.reload();
            });
        }
    }

    disconnect() {
        this.web3 = null;
        this.account = null;
        this.isConnected = false;
        this.currentRpcIndex = 0;
    }

    async addTokenToWallet(tokenAddress) {
        try {
            await window.ethereum.request({
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
        } catch (error) {
            console.error('Erro ao adicionar token:', error);
        }
    }
}