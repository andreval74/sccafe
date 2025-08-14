class UIManager {
    constructor() {
        this.elements = {
            connectWallet: document.getElementById('connectWallet'),
            walletInfo: document.getElementById('walletInfo'),
            walletAddress: document.getElementById('walletAddress'),
            walletBalance: document.getElementById('walletBalance'),
            contractAddress: document.getElementById('contractAddress'),
            loadContract: document.getElementById('loadContract'),
            saleInterface: document.getElementById('saleInterface'),
            tokenPrice: document.getElementById('tokenPrice'),
            soldTokens: document.getElementById('soldTokens'),
            totalFunds: document.getElementById('totalFunds'),
            tokenAmount: document.getElementById('tokenAmount'),
            calcAmount: document.getElementById('calcAmount'),
            calcPrice: document.getElementById('calcPrice'),
            calcTotal: document.getElementById('calcTotal'),
            buyTokens: document.getElementById('buyTokens'),
            messages: document.getElementById('messages'),
            addTokenToWallet: document.getElementById('addTokenToWallet'),
            viewOnExplorer: document.getElementById('viewOnExplorer')
        };
        
        this.currentTokenPrice = 0;
        this.lastTransactionHash = null;
    }

    showMessage(message, type = 'info', duration = 5000) {
        this.elements.messages.innerHTML = `<div class="message ${type}">${message}</div>`;
        
        if (type === 'success' && duration > 0) {
            setTimeout(() => {
                this.elements.messages.innerHTML = '';
            }, duration);
        }
    }

    updateWalletInfo(account, balance) {
        this.elements.walletAddress.textContent = `${account.substring(0, 6)}...${account.substring(38)}`;
        this.elements.walletBalance.textContent = `${parseFloat(balance).toFixed(4)} BNB`;
        this.elements.walletInfo.classList.remove('hidden');
        this.elements.connectWallet.textContent = 'Carteira Conectada';
        this.elements.connectWallet.disabled = true;
    }

    showSaleInterface() {
        this.elements.saleInterface.classList.remove('hidden');
    }

    updateContractInfo(info) {
        this.elements.soldTokens.textContent = `${parseFloat(info.soldTokens).toLocaleString()} SCCAFE`;
        this.elements.totalFunds.textContent = `${parseFloat(info.totalFunds).toFixed(4)} BNB`;
    }

    setTokenPrice(price) {
        this.currentTokenPrice = price;
        this.elements.tokenPrice.textContent = `${price} BNB`;
        this.elements.calcPrice.textContent = `${price} BNB`;
        this.updateCalculation();
    }

    updateCalculation() {
        const amount = parseFloat(this.elements.tokenAmount.value) || 0;
        const total = amount * this.currentTokenPrice;
        
        this.elements.calcAmount.textContent = amount.toLocaleString();
        this.elements.calcTotal.textContent = `${total.toFixed(6)} BNB`;
        
        // Habilitar/desabilitar botão de compra
        this.elements.buyTokens.disabled = amount <= 0;
    }

    enableBuyButton() {
        this.elements.buyTokens.disabled = false;
    }

    disableBuyButton() {
        this.elements.buyTokens.disabled = true;
    }

    showTransactionSuccess(txHash) {
        this.lastTransactionHash = txHash;
        this.elements.addTokenToWallet.classList.remove('hidden');
        this.elements.viewOnExplorer.classList.remove('hidden');
        
        // Limpar formulário
        this.elements.tokenAmount.value = '';
        this.updateCalculation();
    }

    setLoading(element, loading = true) {
        if (loading) {
            element.disabled = true;
            element.textContent = element.textContent.includes('...') ? element.textContent : element.textContent + '...';
        } else {
            element.disabled = false;
            element.textContent = element.textContent.replace('...', '');
        }
    }
}