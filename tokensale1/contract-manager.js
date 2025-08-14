class ContractManager {
    constructor(walletManager) {
        this.walletManager = walletManager;
        this.contract = null;
        this.contractAddress = null;
        this.tokenPrice = 0;
    }

    async loadContract(address) {
        try {
            if (!this.walletManager.web3) {
                throw new Error('Conecte a carteira primeiro');
            }

            // Verificar se é um contrato válido
            const code = await this.walletManager.web3.eth.getCode(address);
            if (code === '0x' || code === '0x0') {
                throw new Error('Nenhum contrato encontrado neste endereço');
            }

            this.contract = new this.walletManager.web3.eth.Contract(SALE_CONTRACT_ABI, address);
            this.contractAddress = address;

            // Verificar se a pré-venda está ativa
            const isPreselling = await this.contract.methods.is_preselling().call();
            if (!isPreselling) {
                throw new Error('A pré-venda não está ativa');
            }

            return {
                success: true,
                contract: this.contract
            };

        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    async getContractInfo() {
        if (!this.contract) return null;

        try {
            const [soldTokens, totalFunds, tokenSupply] = await Promise.all([
                this.contract.methods.totalSoldTokens().call(),
                this.contract.methods.totalReceivedFunds().call(),
                this.contract.methods.getTokenSupply().call()
            ]);

            return {
                soldTokens: this.walletManager.web3.utils.fromWei(soldTokens, 'ether'),
                totalFunds: this.walletManager.web3.utils.fromWei(totalFunds, 'ether'),
                tokenSupply: this.walletManager.web3.utils.fromWei(tokenSupply, 'ether')
            };
        } catch (error) {
            console.error('Erro ao obter informações do contrato:', error);
            return null;
        }
    }

    async getUserTokenBalance() {
        if (!this.contract || !this.walletManager.account) return '0';

        try {
            const balance = await this.contract.methods.getTokenbalance(this.walletManager.account).call();
            return this.walletManager.web3.utils.fromWei(balance, 'ether');
        } catch (error) {
            console.error('Erro ao obter saldo de tokens:', error);
            return '0';
        }
    }

    async buyTokens(amount, pricePerToken) {
        if (!this.contract || !this.walletManager.account) {
            throw new Error('Contrato ou carteira não conectados');
        }

        try {
            const amountWei = this.walletManager.web3.utils.toWei(amount.toString(), 'ether');
            const totalCost = amount * pricePerToken;
            const totalCostWei = this.walletManager.web3.utils.toWei(totalCost.toString(), 'ether');

            // Verificar saldo
            const balance = await this.walletManager.getBalance();
            if (parseFloat(balance) < totalCost) {
                throw new Error(`${CONFIG.MESSAGES.INSUFFICIENT_BALANCE} Você tem ${parseFloat(balance).toFixed(4)} BNB`);
            }

            // Executar transação
            const tx = await this.contract.methods.sale(amountWei).send({
                from: this.walletManager.account,
                value: totalCostWei,
                gas: CONFIG.GAS_LIMIT
            });

            return {
                success: true,
                transactionHash: tx.transactionHash,
                amount: amount,
                cost: totalCost
            };

        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    getExplorerUrl(txHash) {
        return `${CONFIG.EXPLORER_URL}/tx/${txHash}`;
    }
}