/**
 * sol-processor.js
 * Módulo para processamento de arquivos Solidity (.sol)
 */

export class SolProcessor {
    /**
     * Lê o conteúdo de um arquivo como texto
     * @param {File} file - O arquivo a ser lido
     * @returns {Promise<string>} Conteúdo do arquivo
     */
    static lerArquivo(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = e => resolve(e.target.result);
            reader.onerror = e => reject(new Error('Erro ao ler arquivo'));
            reader.readAsText(file);
        });
    }

    /**
     * Extrai informações do contrato do código fonte
     * @param {string} codigo - Código fonte do contrato
     * @returns {Object} Informações do contrato
     */
    static extrairInfosContrato(codigo) {
        const infos = {
            version: '',
            nome: '',
            optimizacao: false,
            licenca: '',
            imports: [],
            libraries: [],
            codigo: codigo
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
            infos.optimizacao = codigo.includes('optimizer') || codigo.includes('optimization');
            
            // Extrai licença
            const licenseMatch = codigo.match(/SPDX-License-Identifier:\s*(.*)/);
            if (licenseMatch) {
                infos.licenca = licenseMatch[1].trim();
            }

            // Extrai imports
            const importRegex = /import\s+["'](.+?)["'];/g;
            let importMatch;
            while ((importMatch = importRegex.exec(codigo)) !== null) {
                infos.imports.push(importMatch[1]);
            }

            // Extrai libraries
            const libraryRegex = /library\s+(\w+)/g;
            let libraryMatch;
            while ((libraryMatch = libraryRegex.exec(codigo)) !== null) {
                infos.libraries.push(libraryMatch[1]);
            }
            
        } catch (error) {
            console.error('❌ Erro ao extrair informações:', error);
        }
        
        return infos;
    }

    /**
     * Processa um arquivo .sol
     * @param {File} file - O arquivo .sol a ser processado
     * @returns {Promise<Object>} Informações do contrato
     */
    static async processarArquivo(file) {
        if (!file) throw new Error('Arquivo não fornecido');

        try {
            const codigo = await this.lerArquivo(file);
            return this.extrairInfosContrato(codigo);
        } catch (erro) {
            console.error('Erro ao processar arquivo:', erro);
            throw erro;
        }
    }
}
