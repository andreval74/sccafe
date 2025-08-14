class WalletManager {
    constructor() {
        this.web3 = null;
        this.account = null;
        this.isConnected = false;
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
            this.web3 = new Web3(window.ethereum);

            // Verificar rede
            await this.checkNetwork();

            this.isConnected = true;
            this.setupEventListeners();
            
            return {
                success: true,
                account: this.account
            };

        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    async checkNetwork() {
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
    }

    async addNetwork() {
        await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{
                chainId: `0x${CONFIG.CHAIN_ID.toString(16)}`,
                chainName: CONFIG.CHAIN_NAME,
                nativeCurrency: CONFIG.NATIVE_CURRENCY,
                rpcUrls: [CONFIG.RPC_URL],
                blockExplorerUrls: [CONFIG.EXPLORER_URL]
            }]
        });
    }

    async getBalance() {
        if (!this.web3 || !this.account) return '0';
        
        const balance = await this.web3.eth.getBalance(this.account);
        return this.web3.utils.fromWei(balance, 'ether');
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