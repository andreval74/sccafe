/**
 * Sistema de Detecção de Contrato
 * Detecta automaticamente qual contrato foi deployado comparando bytecodes
 */

class ContractDetector {
    constructor() {
        this.knownContracts = [
            {
                name: 'USDT018',
                description: 'Contrato USDT018 (Token Principal Detectado)',
                bytecodeStart: '60806040526000600260006101000a81548173ffffffffffffffffffffffffffffffffffffffff',
                characteristics: ['USDT018', 'BBB124', '0x77359400'] // 2000000000 em hex
            },
            {
                name: 'GT',
                description: 'Contrato GT (Token Secundário)',
                bytecodeStart: '6080604052600280546001600160a01b03199081169091556103e86006556107d06007556064600a55600b8054821690555f600d55600e8054909116730b81337f18767565d2ea40913799317a25dc4bc5',
                characteristics: ['GT', 'BBB123415', '0x3b9aca00'] // 1000000000 em hex
            },
            {
                name: 'IERC20',
                description: 'Interface IERC20 (Interface)',
                bytecodeStart: '60806040523480156100',
                characteristics: ['IERC20', 'interface']
            },
            {
                name: 'Original',
                description: 'Contrato Original (Base)',
                bytecodeStart: '608060405234801561001057600080fd5b',
                characteristics: ['Original', 'base']
            }
        ];
    }

    /**
     * Detecta qual contrato foi deployado baseado no bytecode E código fonte
     */
    detectContract(deployedBytecode, compiledBytecode, sourceCode = '') {
        console.log('🔍 Detectando contrato deployado...');
        console.log('- Bytecode deployado:', deployedBytecode?.substring(0, 100) + '...');
        console.log('- Bytecode compilado:', compiledBytecode?.substring(0, 100) + '...');

        // 1. DETECÇÃO PELO CÓDIGO FONTE (mais confiável)
        if (sourceCode) {
            const sourceDetection = this.detectFromSourceCode(sourceCode);
            if (sourceDetection) {
                console.log(`✅ Contrato detectado pelo código fonte: ${sourceDetection.name}`);
                return sourceDetection.name;
            }
        }

        // 2. DETECÇÃO PELO BYTECODE COMPILADO
        const cleanCompiled = this.cleanBytecode(compiledBytecode);
        for (const contract of this.knownContracts) {
            if (this.matchesBytecodePattern(cleanCompiled, contract)) {
                console.log(`✅ Contrato detectado pelo bytecode compilado: ${contract.name}`);
                return contract.name;
            }
        }

        // 3. DETECÇÃO PELO BYTECODE DEPLOYADO
        if (deployedBytecode) {
            const cleanDeployed = this.cleanBytecode(deployedBytecode);
            for (const contract of this.knownContracts) {
                if (this.matchesBytecodePattern(cleanDeployed, contract)) {
                    console.log(`✅ Contrato detectado pelo bytecode deployado: ${contract.name}`);
                    return contract.name;
                }
            }
        }

        // 4. FALLBACK: ANÁLISE DE SIMILARIDADE
        const similarity = this.calculateSimilarity(
            this.cleanBytecode(deployedBytecode), 
            cleanCompiled
        );
        
        console.log(`📊 Similaridade bytecode: ${(similarity * 100).toFixed(2)}%`);

        if (similarity > 0.8) {
            console.log('✅ Bytecodes são similares - usando USDT018 como padrão (baseado no erro BSCScan)');
            return 'USDT018';
        }

        // Se não conseguir detectar, usa USDT018 baseado no erro BSCScan
        console.log('⚠️ Não foi possível detectar o contrato específico - usando USDT018 (encontrado no erro BSCScan)');
        return 'USDT018';
    }

    /**
     * Detecta contrato baseado no código fonte
     */
    detectFromSourceCode(sourceCode) {
        if (!sourceCode) return null;

        // Procura por contratos específicos no código
        const contractMatches = sourceCode.match(/contract\s+(\w+)/g);
        if (!contractMatches) return null;

        // Extrai nomes dos contratos
        const contractNames = contractMatches.map(match => 
            match.replace('contract ', '').trim()
        );

        console.log('📋 Contratos encontrados no código fonte:', contractNames);

        // Primeiro: procura por contratos exatos na nossa base de conhecimento
        for (const contract of this.knownContracts) {
            if (contractNames.includes(contract.name)) {
                console.log(`✅ Contrato conhecido encontrado: ${contract.name}`);
                return contract;
            }
        }

        // Segundo: procura o primeiro contrato principal (não interface)
        const mainContract = contractNames.find(name => 
            !['IERC20', 'ERC20', 'Context', 'Ownable', 'SafeMath'].includes(name)
        );

        if (mainContract) {
            console.log(`🔍 Contrato principal detectado: ${mainContract}`);
            
            // Se é variante conhecida, mapeia para contrato conhecido
            if (mainContract.includes('USDT') || mainContract.includes('018')) {
                console.log('↪️ Mapeando para USDT018 (variante detectada)');
                return this.knownContracts.find(c => c.name === 'USDT018');
            }
            
            // Retorna informações dinâmicas do contrato detectado
            return {
                name: mainContract,
                description: `Contrato ${mainContract} (Detectado Automaticamente)`,
                bytecodeStart: '',
                characteristics: [mainContract]
            };
        }

        // Fallback final: USDT018 baseado no erro BSCScan original
        console.log('⚠️ Fallback: usando USDT018 (baseado no erro BSCScan)');
        return this.knownContracts.find(c => c.name === 'USDT018');
    }

    /**
     * Verifica se bytecode corresponde ao padrão do contrato
     */
    matchesBytecodePattern(bytecode, contract) {
        if (!bytecode || !contract.bytecodeStart) return false;

        // Verifica início do bytecode
        const startsMatch = bytecode.toLowerCase().startsWith(
            contract.bytecodeStart.toLowerCase()
        );

        if (startsMatch) return true;

        // Verifica características específicas
        if (contract.characteristics) {
            for (const characteristic of contract.characteristics) {
                if (bytecode.toLowerCase().includes(characteristic.toLowerCase())) {
                    return true;
                }
            }
        }

        return false;
    }

    /**
     * Limpa o bytecode removendo prefixos e sufixos desnecessários
     */
    cleanBytecode(bytecode) {
        if (!bytecode) return '';
        
        let cleaned = bytecode.toLowerCase();
        
        // Remove 0x prefix
        if (cleaned.startsWith('0x')) {
            cleaned = cleaned.substring(2);
        }
        
        // Remove constructor parameters (depois do código principal)
        // Isso pode variar, mas geralmente o código do contrato termina com metadata
        const metadataIndex = cleaned.indexOf('a264697066735822');
        if (metadataIndex > 0) {
            cleaned = cleaned.substring(0, metadataIndex);
        }
        
        return cleaned;
    }

    /**
     * Calcula similaridade entre dois bytecodes
     */
    calculateSimilarity(bytecode1, bytecode2) {
        if (!bytecode1 || !bytecode2) return 0;
        
        const len1 = bytecode1.length;
        const len2 = bytecode2.length;
        const maxLen = Math.max(len1, len2);
        
        if (maxLen === 0) return 1;
        
        // Compara os primeiros 2000 caracteres (parte principal do contrato)
        const sample1 = bytecode1.substring(0, 2000);
        const sample2 = bytecode2.substring(0, 2000);
        
        let matches = 0;
        const minLen = Math.min(sample1.length, sample2.length);
        
        for (let i = 0; i < minLen; i++) {
            if (sample1[i] === sample2[i]) {
                matches++;
            }
        }
        
        return matches / minLen;
    }

    /**
     * Obtém informações detalhadas do contrato detectado
     */
    getContractInfo(contractName) {
        const contract = this.knownContracts.find(c => c.name === contractName);
        return contract || {
            name: contractName,
            description: `Contrato ${contractName}`,
            bytecodeStart: ''
        };
    }

    /**
     * Busca bytecode deployado na blockchain
     */
    async fetchDeployedBytecode(contractAddress, networkConfig) {
        try {
            console.log('🌐 Buscando bytecode deployado na blockchain...');
            
            const response = await fetch(
                `${networkConfig.apiUrl}?module=proxy&action=eth_getCode&address=${contractAddress}&tag=latest`
            );
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.status === '1' && data.result && data.result !== '0x') {
                console.log('✅ Bytecode deployado obtido com sucesso');
                return data.result;
            } else {
                console.log('⚠️ Bytecode não encontrado ou contrato não deployado');
                return null;
            }
            
        } catch (error) {
            console.error('❌ Erro ao buscar bytecode deployado:', error);
            return null;
        }
    }

    /**
     * Detecta automaticamente o contrato correto
     */
    async autoDetectContract(contractAddress, compiledBytecode, networkConfig, sourceCode = '') {
        try {
            console.log('🚀 Iniciando detecção automática de contrato...');
            
            // Busca bytecode deployado
            const deployedBytecode = await this.fetchDeployedBytecode(contractAddress, networkConfig);
            
            // Obtém código fonte do localStorage se não fornecido
            if (!sourceCode) {
                sourceCode = localStorage.getItem('contratoSource') || '';
            }
            
            // Detecta qual contrato foi deployado
            const detectedContract = this.detectContract(deployedBytecode, compiledBytecode, sourceCode);
            
            // Retorna informações completas
            const contractInfo = this.getContractInfo(detectedContract);
            
            return {
                name: detectedContract,
                info: contractInfo,
                deployedBytecode: deployedBytecode,
                compiledBytecode: compiledBytecode,
                sourceCode: sourceCode,
                similarity: deployedBytecode ? 
                    this.calculateSimilarity(
                        this.cleanBytecode(deployedBytecode), 
                        this.cleanBytecode(compiledBytecode)
                    ) : 0
            };
            
        } catch (error) {
            console.error('❌ Erro na detecção automática:', error);
            
            // Fallback para USDT018 baseado no erro BSCScan
            return {
                name: 'USDT018',
                info: this.getContractInfo('USDT018'),
                deployedBytecode: null,
                compiledBytecode: compiledBytecode,
                sourceCode: sourceCode,
                similarity: 0,
                error: error.message
            };
        }
    }
}

// Instância global
window.contractDetector = new ContractDetector();

console.log('✅ Sistema de detecção de contrato aprimorado carregado!');
