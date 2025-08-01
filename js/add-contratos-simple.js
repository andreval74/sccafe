// Compilador simplificado: apenas API externa com proxy CORS
// Versão mais estável que evita problemas com solc.min.js

import { marcarConcluido } from './add-utils.js';

export let contratoSource = "";
export let contratoAbi = null;
export let contratoBytecode = null;
export let contratoName = null;

// Função para debug - verificar estado das variáveis
export function debugContractState() {
  console.log('🔍 Estado atual das variáveis:');
  console.log('- contratoSource:', contratoSource ? `${contratoSource.length} caracteres` : 'VAZIO');
  console.log('- contratoAbi:', contratoAbi ? `${contratoAbi.length} funções` : 'NULL');
  console.log('- contratoBytecode:', contratoBytecode ? `${contratoBytecode.length} caracteres` : 'NULL');
  console.log('- contratoName:', contratoName || 'NULL');
  return { contratoSource, contratoAbi, contratoBytecode, contratoName };
}

/**
 * Compilação via API externa com proxy CORS
 */
async function compileViaAPI(contractSource, contractName) {
  // URLs testadas e funcionais
  const apiUrls = [
    'https://corsproxy.io/?' + encodeURIComponent('https://token-creator-api.onrender.com/compile'),
    'https://api.allorigins.win/raw?url=' + encodeURIComponent('https://token-creator-api.onrender.com/compile')
  ];
  
  for (let i = 0; i < apiUrls.length; i++) {
    const url = apiUrls[i];
    try {
      console.log(`🔄 Tentando API ${i+1}/${apiUrls.length}`);
      
      const payload = {
        sourceCode: contractSource,
        contractName: contractName,
        compilerVersion: "0.8.19"
      };
      
      console.log('📦 Payload sendo enviado:', {
        sourceCodeLength: payload.sourceCode ? payload.sourceCode.length : 'NULL',
        contractName: payload.contractName,
        compilerVersion: payload.compilerVersion
      });
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
      }, 30000); // 30 segundos
      
      const response = await fetch(url, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(payload),
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
          continue;
        }
      } else {
        console.log(`❌ API ${i+1} retornou status ${response.status}`);
        continue;
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        console.log(`⏰ API ${i+1} timeout`);
      } else {
        console.log(`❌ API ${i+1} erro:`, error.message);
      }
      continue;
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
    
    console.log('💾 Contrato salvo:');
    console.log('- Tamanho:', contrato.length, 'caracteres');
    console.log('- Preview:', contrato.substring(0, 200) + '...');
    console.log('- Variable contratoSource definida:', contratoSource ? 'SIM' : 'NÃO');

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
 * Compila o contrato usando API externa com proxy CORS
 * @param {string} contractName 
 * @param {HTMLElement} btnCompilar 
 * @param {HTMLElement} compileStatus 
 * @param {HTMLElement} btnDeploy 
 */
export async function compilarContrato(contractName, btnCompilar, compileStatus, btnDeploy) {
  btnCompilar.disabled = true;
  
  try {
    // Validação rigorosa do código fonte
    if (!contratoSource || typeof contratoSource !== 'string' || contratoSource.trim().length < 50) {
      const errorMsg = !contratoSource ? 
        "Código fonte não encontrado! Salve o contrato primeiro." :
        `Código fonte inválido (${contratoSource.length} caracteres). Salve o contrato novamente.`;
      throw new Error(errorMsg);
    }
    
    // Extrai o nome do contrato
    let match = contratoSource.match(/contract\s+([A-Za-z0-9_]+)/);
    let nomeContrato = match ? match[1] : contractName;
    
    if (!nomeContrato || nomeContrato.trim() === '') {
      throw new Error("Nome do contrato não encontrado no código fonte!");
    }
    
    console.log('🚀 Iniciando compilação via API para:', nomeContrato);
    console.log('📄 Source code length:', contratoSource.length);
    console.log('📄 Source code preview:', contratoSource.substring(0, 200) + '...');
    compileStatus.textContent = "Compilando via API externa...";
    
    const result = await compileViaAPI(contratoSource, nomeContrato);
    
    console.log('✅ Compilação via API bem-sucedida');
    
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
    
    // Salva os dados
    contratoAbi = result.abi;
    contratoBytecode = bytecode;
    contratoName = nomeContrato;
    
    console.log('💾 Dados da compilação salvos:');
    console.log('- Nome:', contratoName);
    console.log('- ABI:', contratoAbi.length, 'funções');
    console.log('- Bytecode:', contratoBytecode.length, 'caracteres');
    console.log('- Preview bytecode:', contratoBytecode.substring(0, 50) + '...');
    
    marcarConcluido(btnCompilar);
    compileStatus.textContent = "✅ Compilado via API com sucesso!";
    compileStatus.style.color = '#16924b';
    
    // Habilita botão de deploy
    if (btnDeploy) {
      btnDeploy.disabled = false;
      console.log('✅ Botão de deploy habilitado');
    }
    
    return result;
    
  } catch (error) {
    console.error('❌ Erro na compilação:', error);
    compileStatus.textContent = "❌ Erro: " + (error.message || error);
    compileStatus.style.color = '#b91c1c';
    btnCompilar.disabled = false;
    throw error;
  }
}
