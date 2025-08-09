// Processador de arquivos .sol
const SolProcessor = {
    const file = input.files[0];
    if (!file) return;

    try {
        const reader = new FileReader();
        return new Promise((resolve, reject) => {
            reader.onload = function(e) {
                try {
                    const codigo = e.target.result;
                    
                    // Extrai informações do código
                    const infos = extrairInfosContrato(codigo);
                    
                    // Mostra detalhes do contrato
                    const detailsSection = document.getElementById('contract-details');
                    if (detailsSection) {
                        detailsSection.style.display = 'block';
                    }
                    
                    // Atualiza os campos com as informações
                    document.getElementById('contract-name').textContent = `Contrato: ${infos.nome || file.name}`;
                    document.getElementById('compiler-version-display').textContent = infos.version || 'Não detectado';
                    document.getElementById('optimization-display').textContent = infos.optimizacao ? 'Sim' : 'Não';
                    document.getElementById('license-display').textContent = infos.licenca || 'Não especificada';
                    document.getElementById('libraries-display').textContent = infos.libraries?.length > 0 ? infos.libraries.join(', ') : 'Nenhuma';
                    document.getElementById('codigo-fonte').textContent = codigo;
            
            // Salva informações para uso na verificação
            window.currentSolInfo = {
                codigo: codigo,
                nome: file.name,
                ...infos
            };
            
            // Atualiza UI com informações extraídas
            atualizarInfosContrato(infos);
        };
        reader.readAsText(file);
    } catch (error) {
        console.error('❌ Erro ao processar arquivo:', error);
        alert('❌ Erro ao processar arquivo: ' + error.message);
    }
}

/**
 * Extrai informações do contrato do código fonte
 */
function extrairInfosContrato(codigo) {
    const infos = {
        version: '',
        nome: '',
        optimizacao: false,
        licenca: '',
        imports: [],
        libraries: []
    };
    
    try {
        // Extrai versão do compilador
        const versionMatch = codigo.match(/pragma solidity\s*(.*?);/);
        if (versionMatch) {
            infos.version = versionMatch[1];
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
            infos.licenca = licenseMatch[1];
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
 * Atualiza UI com informações do contrato
 */
export function atualizarInfosContrato(infos) {
    // Atualiza campos de compilação
    if (document.getElementById('compiler-version-display')) {
        document.getElementById('compiler-version-display').textContent = infos.version || 'Não detectado';
    }
    if (document.getElementById('optimization-display')) {
        document.getElementById('optimization-display').textContent = infos.optimizacao ? 'Sim' : 'Não';
    }
    
    // Atualiza campos adicionais se existirem
    const elementos = {
        'contract-name-display': infos.nome || 'Não detectado',
        'license-display': infos.licenca || 'Não especificada',
        'imports-display': infos.imports.length > 0 ? infos.imports.join(', ') : 'Nenhum',
        'libraries-display': infos.libraries.length > 0 ? infos.libraries.join(', ') : 'Nenhuma'
    };
    
    Object.entries(elementos).forEach(([id, valor]) => {
        const elemento = document.getElementById(id);
        if (elemento) elemento.textContent = valor;
    });
}

/**
 * Limpa arquivo .sol
 */
export function limparArquivoSol() {
    const input = document.getElementById('solFileInput');
    if (input) input.value = '';
    
    document.getElementById('codigo-preview').style.display = 'none';
    document.getElementById('codigo-fonte').textContent = '';
    window.currentSolInfo = null;
    
    // Limpa campos de informação
    const campos = [
        'compiler-version-display',
        'optimization-display',
        'contract-name-display',
        'license-display',
        'imports-display',
        'libraries-display'
    ];
    
    campos.forEach(id => {
        const elemento = document.getElementById(id);
        if (elemento) elemento.textContent = '-';
    });
}
