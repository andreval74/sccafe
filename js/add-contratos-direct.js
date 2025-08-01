// Compilador com API direta - versão de emergência
// Remove proxies problemáticos e usa endpoint direto quando possível

import { marcarConcluido } from './add-utils.js';

export let contratoSource = "";
export let contratoAbi = null;
export let contratoBytecode = null;
export let contratoName = null;

// Debug state
export function debugContractState() {
  console.log('🔍 Estado das variáveis:');
  console.log('- contratoSource:', contratoSource ? `${contratoSource.length} chars` : 'VAZIO');
  console.log('- contratoAbi:', contratoAbi ? 'Presente' : 'NULL');
  console.log('- contratoBytecode:', contratoBytecode ? `${contratoBytecode.length} chars` : 'NULL');
  console.log('- contratoName:', contratoName || 'NULL');
  return { contratoSource, contratoAbi, contratoBytecode, contratoName };
}

/**
 * Tenta compilação usando diferentes estratégias
 */
async function compileContract(contractSource, contractName) {
  const strategies = [
    {
      name: 'API Direta (sem proxy)',
      url: 'https://token-creator-api.onrender.com/compile',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Origin': window.location.origin
      }
    },
    {
      name: 'CORS Proxy corsproxy.io',
      url: 'https://corsproxy.io/?' + encodeURIComponent('https://token-creator-api.onrender.com/compile'),
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    },
    {
      name: 'CORS Proxy via allorigins (GET)',
      url: 'https://api.allorigins.win/get?url=' + encodeURIComponent('https://token-creator-api.onrender.com/compile'),
      method: 'GET' // Estratégia diferente
    }
  ];
  
  for (let i = 0; i < strategies.length; i++) {
    const strategy = strategies[i];
    
    try {
      console.log(`🔄 Tentativa ${i+1}: ${strategy.name}`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 25000);
      
      let fetchOptions = {
        method: strategy.method || 'POST',
        headers: strategy.headers,
        signal: controller.signal
      };
      
      // Para estratégias POST, adiciona body
      if (!strategy.method || strategy.method === 'POST') {
        fetchOptions.body = JSON.stringify({
          sourceCode: contractSource,
          contractName: contractName,
          compilerVersion: "0.8.19"
        });
      }
      
      console.log('📦 Enviando:', {
        method: fetchOptions.method,
        url: strategy.url,
        bodySize: fetchOptions.body ? fetchOptions.body.length : 0,
        contractName: contractName,
        sourceCodeSize: contractSource.length
      });
      
      const response = await fetch(strategy.url, fetchOptions);
      clearTimeout(timeoutId);
      
      console.log(`📡 Resposta ${i+1}:`, response.status, response.statusText);
      
      if (response.ok) {
        let result;
        
        // Para allorigins GET, o resultado vem encapsulado
        if (strategy.method === 'GET') {
          const wrapper = await response.json();
          if (wrapper.contents) {
            result = JSON.parse(wrapper.contents);
          } else {
            throw new Error('Resposta inválida do proxy GET');
          }
        } else {
          result = await response.json();
        }
        
        console.log(`📊 Dados recebidos ${i+1}:`, result);
        
        if (result.success && result.bytecode && result.abi) {
          console.log(`✅ Estratégia ${i+1} funcionou!`);
          return result;
        } else {
          console.log(`❌ Estratégia ${i+1} - dados inválidos:`, result);
        }
      } else {
        console.log(`❌ Estratégia ${i+1} - HTTP ${response.status}`);
      }
      
    } catch (error) {
      if (error.name === 'AbortError') {
        console.log(`⏰ Estratégia ${i+1} - timeout`);
      } else {
        console.log(`❌ Estratégia ${i+1} - erro:`, error.message);
      }
    }
  }
  
  throw new Error('Todas as estratégias de compilação falharam');
}

/**
 * Salva o contrato com debug completo
 */
export async function salvarContrato(inputs, callback) {
  try {
    console.log('📥 Carregando template do contrato...');
    const response = await fetch('contratos/contrato-base.sol');
    if (!response.ok) throw new Error(`Erro ${response.status}: ${response.statusText}`);
    
    let contrato = await response.text();
    console.log('📄 Template carregado:', contrato.length, 'caracteres');

    // Substituição dos placeholders
    console.log('🔄 Substituindo placeholders...');
    console.log('- Nome:', inputs.nome);
    console.log('- Símbolo:', inputs.symbol);
    console.log('- Decimais:', inputs.decimals);
    console.log('- Supply:', inputs.supply);
    console.log('- Owner:', inputs.owner);
    
    contrato = contrato
      .replace(/{{TOKEN_NAME}}/g, inputs.nome)
      .replace(/{{TOKEN_SYMBOL}}/g, inputs.symbol)
      .replace(/{{TOKEN_DECIMALS}}/g, inputs.decimals)
      .replace(/{{TOKEN_SUPPLY}}/g, inputs.supply)
      .replace(/{{TOKEN_OWNER}}/g, inputs.owner)
      .replace(/{{TOKEN_LOGO_URI}}/g, inputs.image || "")
      .replace(/{{ORIGINAL_CONTRACT}}/g, "address(0)");

    // Salva na variável global
    contratoSource = contrato;
    
    console.log('💾 Contrato processado e salvo:');
    console.log('- Tamanho final:', contrato.length, 'caracteres');
    console.log('- Preview:', contrato.substring(0, 200) + '...');
    console.log('- Variável contratoSource atualizada');

    // Download automático
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
    console.log('✅ Contrato salvo com sucesso!');
    
    if (callback) callback();
    
  } catch (e) {
    console.error('❌ Erro ao salvar contrato:', e);
    alert(e.message || "Erro ao salvar o contrato");
    document.getElementById('btn-salvar-contrato').disabled = false;
  }
}

/**
 * Compila o contrato com debug completo
 */
export async function compilarContrato(contractName, btnCompilar, compileStatus, btnDeploy) {
  btnCompilar.disabled = true;
  
  try {
    console.log('🔍 Verificando pré-requisitos...');
    debugContractState();
    
    // Validação rigorosa
    if (!contratoSource || typeof contratoSource !== 'string') {
      throw new Error('❌ Código fonte não encontrado! Clique em "Salvar Contrato" primeiro.');
    }
    
    if (contratoSource.trim().length < 100) {
      throw new Error(`❌ Código fonte muito pequeno (${contratoSource.length} chars). Salve o contrato novamente.`);
    }
    
    // Extrai nome do contrato
    let match = contratoSource.match(/contract\s+([A-Za-z0-9_]+)/);
    let nomeContrato = match ? match[1] : contractName;
    
    if (!nomeContrato) {
      throw new Error('❌ Nome do contrato não encontrado no código fonte!');
    }
    
    console.log('🚀 Iniciando compilação...');
    console.log('- Nome do contrato:', nomeContrato);
    console.log('- Tamanho do código:', contratoSource.length, 'caracteres');
    
    compileStatus.textContent = "Compilando contrato...";
    
    const result = await compileContract(contratoSource, nomeContrato);
    
    // Validação do resultado
    if (!result.bytecode || !result.abi) {
      throw new Error('❌ Resultado da compilação inválido');
    }
    
    // Processamento do bytecode
    let bytecode = result.bytecode;
    if (!bytecode.startsWith('0x')) {
      bytecode = '0x' + bytecode;
    }
    
    // Salva resultados
    contratoAbi = result.abi;
    contratoBytecode = bytecode;
    contratoName = nomeContrato;
    
    console.log('✅ Compilação bem-sucedida!');
    console.log('- ABI funções:', contratoAbi.length);
    console.log('- Bytecode tamanho:', contratoBytecode.length);
    
    marcarConcluido(btnCompilar);
    compileStatus.textContent = "✅ Compilado com sucesso!";
    compileStatus.style.color = '#16924b';
    
    if (btnDeploy) {
      btnDeploy.disabled = false;
      console.log('✅ Botão de deploy habilitado');
    }
    
    return result;
    
  } catch (error) {
    console.error('❌ Erro na compilação:', error);
    compileStatus.textContent = "❌ " + error.message;
    compileStatus.style.color = '#b91c1c';
    btnCompilar.disabled = false;
    throw error;
  }
}
