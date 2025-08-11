// Processador de arquivos Solidity
const SolProcessor = {
    /**
     * Processa arquivo .sol
     */
    async processFile(file) {
        if (!file) return null;

        try {
            const codigo = await this.readFile(file);
            const infos = this.extrairInfos(codigo);
            
            // Atualiza a UI
            this.atualizarUI(file.name, codigo, infos);
            
            // Salva para uso global
            window.currentSolInfo = {
                codigo,
                nome: file.name,
                ...infos
            };
            
            return window.currentSolInfo;
        } catch (error) {
            console.error('❌ Erro ao processar arquivo:', error);
            throw error;
        }
    },

    /**
     * Lê o arquivo como texto
     */
    readFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = e => resolve(e.target.result);
            reader.onerror = reject;
            reader.readAsText(file);
        });
    },

    /**
     * Extrai informações do contrato
     */
    extrairInfos(codigo) {
        const infos = {
            version: '',
            nome: '',
            optimizacao: false,
            licenca: '',
            libraries: [],
            imports: []
        };
        
        try {
            // Extrai versão do compilador
            const versionMatch = codigo.match(/pragma solidity\s*(.*?);/);
            if (versionMatch) {
                infos.version = versionMatch[1].trim();
            }
            
            // Extrai nome do contrato
            const contractMatch = codigo.match(/contract\s+(\w+)/);
            if (contractMatch) {
                infos.nome = contractMatch[1];
            }
            
            // Verifica se tem otimização
            infos.optimizacao = codigo.includes('optimizer') || 
                               codigo.includes('optimization') || 
                               codigo.includes('optimized');
            
            // Extrai licença
            const licenseMatch = codigo.match(/SPDX-License-Identifier:\s*(.*)/);
            if (licenseMatch) {
                infos.licenca = licenseMatch[1].trim();
            }

            // Extrai bibliotecas
            const libraryRegex = /library\s+(\w+)/g;
            let libraryMatch;
            while ((libraryMatch = libraryRegex.exec(codigo)) !== null) {
                infos.libraries.push(libraryMatch[1]);
            }

            // Extrai imports
            const importRegex = /import\s+["'](.+?)["'];/g;
            let importMatch;
            while ((importMatch = importRegex.exec(codigo)) !== null) {
                infos.imports.push(importMatch[1]);
            }
            
        } catch (error) {
            console.error('❌ Erro ao extrair informações:', error);
        }
        
        return infos;
    },

    /**
     * Atualiza a interface com as informações
     */
    atualizarUI(fileName, codigo, infos) {
        // Mostra seção de detalhes
        const detailsSection = document.getElementById('contract-details');
        if (detailsSection) {
            detailsSection.style.display = 'block';
        }
        
        // Atualiza campos
        const campos = {
            'contract-name': `Contrato: ${infos.nome || fileName}`,
            'compiler-version-display': infos.version || 'Não detectado',
            'optimization-display': infos.optimizacao ? 'Sim' : 'Não',
            'license-display': infos.licenca || 'Não especificada',
            'libraries-display': infos.libraries?.length > 0 ? infos.libraries.join(', ') : 'Nenhuma',
            'codigo-fonte': codigo
        };
        
        Object.entries(campos).forEach(([id, valor]) => {
            const elemento = document.getElementById(id);
            if (elemento) elemento.textContent = valor;
        });
    },

    /**
     * Limpa todos os campos e remove arquivo
     */
    limpar() {
        // Limpa input
        const input = document.getElementById('solFileInput');
        if (input) input.value = '';
        
        // Esconde seção de detalhes
        const detailsSection = document.getElementById('contract-details');
        if (detailsSection) {
            detailsSection.style.display = 'none';
        }
        
        // Limpa campos
        const campos = {
            'contract-name': 'Informações do Contrato',
            'compiler-version-display': '-',
            'optimization-display': '-',
            'license-display': '-',
            'libraries-display': '-',
            'codigo-fonte': ''
        };
        
        Object.entries(campos).forEach(([id, valor]) => {
            const elemento = document.getElementById(id);
            if (elemento) elemento.textContent = valor;
        });
        
        // Remove dados globais
        window.currentSolInfo = null;
    }
};

// Funções exportadas para uso global
export async function processarArquivoSol(input) {
    if (!input?.files?.length) return;
    await SolProcessor.processFile(input.files[0]);
}

export function limparArquivoSol() {
    SolProcessor.limpar();
}
