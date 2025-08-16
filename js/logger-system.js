/**
 * 📝 SISTEMA DE LOG PARA SUPORTE TÉCNICO
 * 
 * Gera arquivos de log detalhados quando há problemas com contratos
 * Permite download do arquivo para envio ao suporte
 */

class ContractLogger {
    constructor() {
        this.logs = [];
        this.sessionId = this.generateSessionId();
        this.startTime = new Date();
        
        // Inicia o log da sessão
        this.addLog('INFO', 'SESSÃO INICIADA', {
            sessionId: this.sessionId,
            timestamp: this.startTime.toISOString(),
            userAgent: navigator.userAgent,
            url: window.location.href
        });
    }
    
    generateSessionId() {
        return 'SCCAFE_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
    
    addLog(level, message, data = {}) {
        const logEntry = {
            timestamp: new Date().toISOString(),
            level: level,
            message: message,
            data: data,
            sessionId: this.sessionId
        };
        
        this.logs.push(logEntry);
        
        // Também registra no console para debug
        console.log(`[${level}] ${message}`, data);
    }
    
    logContractError(contractAddress, errorType, errorDetails) {
        this.addLog('ERROR', 'ERRO NO CONTRATO', {
            contractAddress: contractAddress,
            errorType: errorType,
            errorDetails: errorDetails,
            walletConnected: window.walletConnected || false,
            networkId: window.currentNetworkId || 'unknown'
        });
    }
    
    logContractValidation(contractAddress, validationResults) {
        this.addLog('INFO', 'VALIDAÇÃO DO CONTRATO', {
            contractAddress: contractAddress,
            isERC20: validationResults.isERC20 || false,
            hasBuyFunction: validationResults.hasBuyFunction || false,
            tokenInfo: validationResults.tokenInfo || {},
            errors: validationResults.errors || []
        });
    }
    
    logTransactionError(txHash, error) {
        this.addLog('ERROR', 'ERRO NA TRANSAÇÃO', {
            transactionHash: txHash,
            error: error.message || error,
            code: error.code || 'unknown',
            reason: error.reason || 'unknown'
        });
    }
    
    generateLogFile() {
        const logContent = {
            sessionInfo: {
                sessionId: this.sessionId,
                startTime: this.startTime.toISOString(),
                endTime: new Date().toISOString(),
                duration: (new Date() - this.startTime) / 1000 + ' segundos',
                platform: 'SCCAFE - Sistema de Compra de Tokens',
                version: '1.0.0'
            },
            browserInfo: {
                userAgent: navigator.userAgent,
                language: navigator.language,
                platform: navigator.platform,
                cookieEnabled: navigator.cookieEnabled,
                onLine: navigator.onLine
            },
            walletInfo: {
                connected: window.walletConnected || false,
                address: window.walletAddress || 'não conectada',
                networkId: window.currentNetworkId || 'desconhecida',
                balance: window.walletBalance || 'desconhecido'
            },
            logs: this.logs,
            summary: this.generateSummary()
        };
        
        return JSON.stringify(logContent, null, 2);
    }
    
    generateSummary() {
        const errorCount = this.logs.filter(log => log.level === 'ERROR').length;
        const warningCount = this.logs.filter(log => log.level === 'WARNING').length;
        const contractErrors = this.logs.filter(log => log.message.includes('CONTRATO')).length;
        
        return {
            totalLogs: this.logs.length,
            errorCount: errorCount,
            warningCount: warningCount,
            contractErrors: contractErrors,
            hasContractIssues: contractErrors > 0,
            lastError: this.logs.filter(log => log.level === 'ERROR').pop() || null
        };
    }
    
    downloadLogFile() {
        try {
            const logContent = this.generateLogFile();
            const fileName = `SCCAFE_LOG_${this.sessionId}_${new Date().toISOString().split('T')[0]}.log`;
            
            // Cria o blob para download
            const blob = new Blob([logContent], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            // Cria link para download
            const downloadLink = document.createElement('a');
            downloadLink.href = url;
            downloadLink.download = fileName;
            downloadLink.style.display = 'none';
            
            // Adiciona ao DOM e clica
            document.body.appendChild(downloadLink);
            downloadLink.click();
            
            // Remove o link
            document.body.removeChild(downloadLink);
            URL.revokeObjectURL(url);
            
            this.addLog('INFO', 'LOG BAIXADO', { fileName: fileName });
            
            return fileName;
        } catch (error) {
            console.error('Erro ao gerar arquivo de log:', error);
            return null;
        }
    }
    
    showDownloadButton() {
        // Verifica se já existe o botão
        let existingButton = document.getElementById('logDownloadButton');
        if (existingButton) {
            existingButton.style.display = 'block';
            return;
        }
        
        // Cria o botão de download
        const button = document.createElement('button');
        button.id = 'logDownloadButton';
        button.className = 'btn btn-warning btn-sm mt-2';
        button.innerHTML = '<i class="bi bi-download me-1"></i>Baixar Log para Suporte';
        
        button.onclick = () => {
            const fileName = this.downloadLogFile();
            if (fileName) {
                alert(`✅ Log salvo como: ${fileName}\n\nEnvie este arquivo para o suporte técnico para análise do problema.`);
            } else {
                alert('❌ Erro ao gerar arquivo de log. Tente novamente.');
            }
        };
        
        // Adiciona o botão na seção de mensagens de contrato
        const contractMessages = document.getElementById('contractMessages');
        if (contractMessages) {
            contractMessages.appendChild(button);
        }
    }
    
    hideDownloadButton() {
        const button = document.getElementById('logDownloadButton');
        if (button) {
            button.style.display = 'none';
        }
    }
}

// Instância global do logger
window.contractLogger = new ContractLogger();

// Intercepta erros globais
window.addEventListener('error', (event) => {
    window.contractLogger.addLog('ERROR', 'ERRO JAVASCRIPT', {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        stack: event.error ? event.error.stack : 'não disponível'
    });
});

// Intercepta rejeições de Promise não tratadas
window.addEventListener('unhandledrejection', (event) => {
    window.contractLogger.addLog('ERROR', 'PROMISE REJEITADA', {
        reason: event.reason,
        stack: event.reason && event.reason.stack ? event.reason.stack : 'não disponível'
    });
});

console.log('📝 Sistema de Log SCCAFE inicializado');
