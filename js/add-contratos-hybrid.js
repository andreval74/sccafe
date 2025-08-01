// Compilador híbrido: local + fallback para API
// Resolve problemas de CORS usando compilação local quando possível

import { marcarConcluido } from './add-utils.js';

export let contratoSource = "";
export let contratoAbi = null;
export let contratoBytecode = null;
export let contratoName = null;

// Estado do compilador
let solcLoaded = false;
let solcLoading = false;

/**
 * Carrega o compilador Solidity local
 */
async function loadLocalCompiler() {
  if (solcLoaded) return true;
  if (solcLoading) {
    // Aguarda o carregamento em andamento
    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        if (solcLoaded || !solcLoading) {
          clearInterval(checkInterval);
          resolve(solcLoaded);
        }
      }, 100);
    });
  }
  
  solcLoading = true;
  
  try {
    // Verifica se já está carregado globalmente
    if (window.solc) {
      solcLoaded = true;
      solcLoading = false;
      return true;
    }
    
    // Remove script anterior se existir
    const existingScript = document.querySelector('script[src*="solc.min.js"]');
    if (existingScript) {
      existingScript.remove();
    }
    
    // Carrega o script do compilador com versão específica
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/solc@0.8.19/solc.min.js';
    script.async = true;
    script.crossOrigin = 'anonymous';
    document.head.appendChild(script);
    
    await new Promise((resolve, reject) => {
      script.onload = () => {
        // Aguarda um pouco para o solc se inicializar
        setTimeout(() => {
          if (window.solc && typeof window.solc.compile === 'function') {
            solcLoaded = true;
            console.log('✅ Compilador Solidity carregado com sucesso');
            resolve();
          } else {
            reject(new Error('Solc carregado mas função compile não disponível'));
          }
        }, 500);
      };
      script.onerror = () => reject(new Error('Falha ao carregar compilador Solidity'));
      // Timeout de 15 segundos
      setTimeout(() => reject(new Error('Timeout ao carregar compilador')), 15000);
    });
    
    solcLoading = false;
    return true;
    
  } catch (error) {
    console.error('❌ Erro ao carregar compilador local:', error);
    solcLoaded = false;
    solcLoading = false;
    return false;
  }
}

/**
 * Compilação local usando solc-js
 */
async function compileLocally(contractSource, contractName) {
  const input = {
    language: 'Solidity',
    sources: {
      'contract.sol': {
        content: contractSource
      }
    },
    settings: {
      outputSelection: {
        '*': {
          '*': ['abi', 'evm.bytecode']
        }
      },
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  };

  // Compila o contrato
  const output = JSON.parse(window.solc.compile(JSON.stringify(input)));
  
  // Verifica erros fatais
  if (output.errors) {
    const fatalErrors = output.errors.filter(error => error.severity === 'error');
    if (fatalErrors.length > 0) {
      throw new Error(fatalErrors[0].formattedMessage || fatalErrors[0].message);
    }
  }

  // Extrai resultado
  const contractData = output.contracts['contract.sol'][contractName];
  if (!contractData) {
    throw new Error(`Contrato '${contractName}' não encontrado`);
  }

  return {
    success: true,
    abi: contractData.abi,
    bytecode: '0x' + contractData.evm.bytecode.object
  };
}

/**
 * Fallback para API externa (com CORS proxy se necessário)
 */
async function compileViaAPI(contractSource, contractName) {
  // Lista de URLs para tentar (com diferentes proxies CORS)
  const apiUrls = [
    'https://corsproxy.io/?' + encodeURIComponent('https://token-creator-api.onrender.com/compile'),
    'https://api.allorigins.win/raw?url=' + encodeURIComponent('https://token-creator-api.onrender.com/compile'),
    // Proxy alternativo
    'https://cors-anywhere.herokuapp.com/https://token-creator-api.onrender.com/compile',
    // Direto (pode falhar por CORS)
    'https://token-creator-api.onrender.com/compile'
  ];
  
  for (let i = 0; i < apiUrls.length; i++) {
    const url = apiUrls[i];
    try {
      console.log(`🔄 Tentando API ${i+1}/${apiUrls.length}: ${url.substring(0, 50)}...`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
        console.log('⏰ Timeout na API:', url.substring(0, 50));
      }, 25000); // 25 segundos
      
      const response = await fetch(url, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          sourceCode: contractSource,
          contractName: contractName,
          compilerVersion: "0.8.19"
        }),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const result = await response.json();
        console.log('📊 Resposta da API:', result);
        
        if (result.success && result.bytecode && result.abi) {
          console.log(`✅ API ${i+1} funcionou!`);
          return result;
        } else {
          console.log(`❌ API ${i+1} retornou dados inválidos:`, result);
        }
      } else {
        console.log(`❌ API ${i+1} retornou status ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        console.log(`⏰ API ${i+1} timeout`);
      } else {
        console.log(`❌ API ${i+1} erro:`, error.message);
      }
      continue; // Tenta próxima URL
    }
  }
  
  throw new Error('Todas as APIs de compilação falharam');
}

/**
 * Gera e salva o contrato substituindo placeholders por valores dos inputs.
 * @param {Object} inputs - inputs do formulário
 * @param {Function} callback - chamada após salvar
 */
export async function salvarContrato(inputs, callback) {
  try {
    const response = await fetch('contratos/contrato-base.sol');
    if (!response.ok) throw new Error('Não foi possível carregar o contrato-base.sol');
    let contrato = await response.text();

    // Substituição dos placeholders
    contrato = contrato
      .replace(/{{TOKEN_NAME}}/g, inputs.nome)
      .replace(/{{TOKEN_SYMBOL}}/g, inputs.symbol)
      .replace(/{{TOKEN_DECIMALS}}/g, inputs.decimals)
      .replace(/{{TOKEN_SUPPLY}}/g, inputs.supply)
      .replace(/{{TOKEN_OWNER}}/g, inputs.owner)
      .replace(/{{TOKEN_LOGO_URI}}/g, inputs.image || "")
      .replace(/{{ORIGINAL_CONTRACT}}/g, "address(0)");

    contratoSource = contrato;

    // Download automático do contrato
    const blob = new Blob([contrato], { type: "text/plain" });
    const a = document.createElement("a");
    let nomeArquivo = (inputs.symbol || "contrato").replace(/[^a-zA-Z0-9_]/g, "") + ".sol";
    a.href = URL.createObjectURL(blob);
    a.download = nomeArquivo;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(a.href);
    }, 100);

    marcarConcluido(document.getElementById('btn-salvar-contrato'));
    callback && callback();
    
  } catch (e) {
    alert(e.message || "Erro ao salvar o contrato");
    document.getElementById('btn-salvar-contrato').disabled = false;
  }
}

/**
 * Compila o contrato usando estratégia híbrida (local + API fallback)
 * @param {string} contractName 
 * @param {HTMLElement} btnCompilar 
 * @param {HTMLElement} compileStatus 
 * @param {HTMLElement} btnDeploy 
 */
export async function compilarContrato(contractName, btnCompilar, compileStatus, btnDeploy) {
  btnCompilar.disabled = true;
  
  try {
    if (!contratoSource || !contratoSource.trim()) {
      throw new Error("Código fonte do contrato não encontrado!");
    }
    
    // Extrai o nome do contrato
    let match = contratoSource.match(/contract\s+([A-Za-z0-9_]+)/);
    let nomeContrato = match ? match[1] : contractName;
    
    console.log('Iniciando compilação híbrida para:', nomeContrato);
    
    let result = null;
    
    // Estratégia 1: Compilação Local
    try {
      compileStatus.textContent = "Carregando compilador local...";
      const localLoaded = await loadLocalCompiler();
      
      if (localLoaded) {
        compileStatus.textContent = "Compilando localmente...";
        result = await compileLocally(contratoSource, nomeContrato);
        console.log('✅ Compilação local bem-sucedida');
        compileStatus.textContent = "✅ Compilado localmente com sucesso!";
      }
    } catch (error) {
      console.log('❌ Compilação local falhou:', error.message);
    }
    
    // Estratégia 2: API Externa (fallback)
    if (!result) {
      try {
        compileStatus.textContent = "Tentando APIs externas...";
        result = await compileViaAPI(contratoSource, nomeContrato);
        console.log('✅ Compilação via API bem-sucedida');
        compileStatus.textContent = "✅ Compilado via API com sucesso!";
      } catch (error) {
        console.log('❌ Compilação via API falhou:', error.message);
        throw new Error('Todas as estratégias de compilação falharam: ' + error.message);
      }
    }
    
    // Sucesso - salva resultado
    if (result && result.success) {
      // Validação extra do bytecode
      if (!result.bytecode || typeof result.bytecode !== 'string' || result.bytecode.length < 10) {
        throw new Error('Bytecode inválido retornado pela compilação');
      }
      
      // Garante que o bytecode comece com 0x
      let bytecode = result.bytecode;
      if (!bytecode.startsWith('0x')) {
        bytecode = '0x' + bytecode;
      }
      
      // Validação da ABI
      if (!result.abi || !Array.isArray(result.abi)) {
        throw new Error('ABI inválida retornada pela compilação');
      }
      
      contratoAbi = result.abi;
      contratoBytecode = bytecode;
      contratoName = nomeContrato;
      
      console.log('💾 Dados salvos:');
      console.log('- Nome:', contratoName);
      console.log('- ABI:', contratoAbi.length, 'funções');
      console.log('- Bytecode:', contratoBytecode.length, 'caracteres');
      console.log('- Preview bytecode:', contratoBytecode.substring(0, 50) + '...');
      
      marcarConcluido(btnCompilar);
      compileStatus.style.color = '#16924b';
      
      // Habilita botão de deploy
      if (btnDeploy) {
        btnDeploy.disabled = false;
        console.log('✅ Botão de deploy habilitado');
      }
      
      return result;
    } else {
      throw new Error('Compilação retornou resultado inválido');
    }
    
  } catch (error) {
    console.error('❌ Erro na compilação híbrida:', error);
    compileStatus.textContent = "❌ Erro: " + (error.message || error);
    compileStatus.style.color = '#b91c1c';
    btnCompilar.disabled = false;
    throw error;
  }
}
