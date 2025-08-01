// Compilador Solidity local usando solc-js
// Alternativa para evitar problemas de CORS com APIs externas

export let contratoSource = "";
export let contratoAbi = null;
export let contratoBytecode = null;
export let contratoName = null;

// Carrega o compilador Solidity via CDN
let solc = null;

async function loadSolc() {
  if (solc) return solc;
  
  try {
    // Carrega o compilador Solidity
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/solc@0.8.19/solc.min.js';
    document.head.appendChild(script);
    
    return new Promise((resolve, reject) => {
      script.onload = () => {
        solc = window.solc;
        resolve(solc);
      };
      script.onerror = () => reject(new Error('Falha ao carregar o compilador Solidity'));
    });
  } catch (error) {
    throw new Error('Erro ao carregar compilador: ' + error.message);
  }
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

    
    // Atualiza a variável exportada para uso posterior
    contratoSource = contrato;

    // Download automático do contrato com nome do token
    const blob = new Blob([contrato], { type: "text/plain" });
    const a = document.createElement("a");
    // Usa o nome do token, removendo espaços e caracteres especiais
    let nomeArquivo = (inputs.symbol || "contrato").replace(/[^a-zA-Z0-9_]/g, "") + ".sol";
    a.href = URL.createObjectURL(blob);
    a.download = nomeArquivo;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(a.href);
    }, 100);

    // Marca como concluído (função importada)
    if (window.marcarConcluido) {
      window.marcarConcluido(document.getElementById('btn-salvar-contrato'));
    }
    callback && callback();
  } catch (e) {
    alert(e.message || "Erro ao salvar o contrato");
    document.getElementById('btn-salvar-contrato').disabled = false;
  }
}

/**
 * Compila o contrato Solidity localmente usando solc-js
 * @param {string} contractName 
 * @param {HTMLElement} btnCompilar 
 * @param {HTMLElement} compileStatus 
 * @param {HTMLElement} btnDeploy 
 */
export async function compilarContrato(contractName, btnCompilar, compileStatus, btnDeploy) {
  btnCompilar.disabled = true;
  compileStatus.textContent = "Carregando compilador Solidity...";
  
  try {
    if (!contratoSource || !contratoSource.trim()) {
      compileStatus.textContent = "Código fonte do contrato não encontrado!";
      btnCompilar.disabled = false;
      throw new Error("Código fonte do contrato não encontrado!");
    }
    
    // Carrega o compilador se ainda não foi carregado
    compileStatus.textContent = "Carregando compilador Solidity...";
    await loadSolc();
    
    // Extrai o nome do contrato automaticamente do código fonte
    let match = contratoSource.match(/contract\s+([A-Za-z0-9_]+)/);
    let nomeContrato = match ? match[1] : contractName;
    
    console.log('Compilando contrato localmente:', nomeContrato);
    compileStatus.textContent = "Compilando contrato localmente...";
    
    // Configuração do compilador
    const input = {
      language: 'Solidity',
      sources: {
        'contract.sol': {
          content: contratoSource
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
    const output = JSON.parse(solc.compile(JSON.stringify(input)));
    
    // Verifica erros de compilação
    if (output.errors) {
      const fatalErrors = output.errors.filter(error => error.severity === 'error');
      if (fatalErrors.length > 0) {
        const errorMsg = fatalErrors[0].formattedMessage || fatalErrors[0].message;
        compileStatus.textContent = "Erro na compilação: " + errorMsg;
        btnCompilar.disabled = false;
        throw new Error("Erro na compilação: " + errorMsg);
      }
    }

    // Extrai ABI e bytecode
    const contractData = output.contracts['contract.sol'][nomeContrato];
    if (!contractData) {
      throw new Error(`Contrato '${nomeContrato}' não encontrado na saída da compilação`);
    }

    contratoAbi = contractData.abi;
    contratoBytecode = '0x' + contractData.evm.bytecode.object;
    contratoName = nomeContrato;
    
    console.log('Compilação local bem-sucedida - ABI:', contratoAbi ? 'OK' : 'NULL');
    console.log('Compilação local bem-sucedida - Bytecode:', contratoBytecode ? 'OK' : 'NULL');
    
    // Marca como concluído
    if (window.marcarConcluido) {
      window.marcarConcluido(btnCompilar);
    }
    
    compileStatus.textContent = "✅ Compilado com sucesso (local)!";
    compileStatus.style.color = '#16924b';
    
    if (btnDeploy) {
      btnDeploy.disabled = false;
      console.log('Botão de deploy habilitado após compilação local');
    }
    
    return { success: true, abi: contratoAbi, bytecode: contratoBytecode };
    
  } catch (e) {
    console.error('Erro na compilação local:', e);
    compileStatus.textContent = "❌ Erro na compilação: " + (e.message || e);
    compileStatus.style.color = '#b91c1c';
    btnCompilar.disabled = false;
    throw e;
  }
}
