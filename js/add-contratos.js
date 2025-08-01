// contratos.js
// Geração, substituição de variáveis e compilação do contrato Solidity via API

import { marcarConcluido } from './add-utils.js';

export let contratoSource = "";
export let contratoAbi = null;
export let contratoBytecode = null;
export let contratoName = null;

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

    marcarConcluido(document.getElementById('btn-salvar-contrato'));
    callback && callback();
  } catch (e) {
    alert(e.message || "Erro ao salvar o contrato");
    document.getElementById('btn-salvar-contrato').disabled = false;
  }
}

/**
 * Compila o contrato Solidity via sua API no Render.
 * @param {string} contractName 
 * @param {HTMLElement} btnCompilar 
 * @param {HTMLElement} compileStatus 
 * @param {HTMLElement} btnDeploy 
 */
export async function compilarContrato(contractName, btnCompilar, compileStatus, btnDeploy) {
  btnCompilar.disabled = true;
  compileStatus.textContent = "Compilando via servidor...";
  
  try {
    if (!contratoSource || !contratoSource.trim()) {
      compileStatus.textContent = "Código fonte do contrato não encontrado!";
      btnCompilar.disabled = false;
      throw new Error("Código fonte do contrato não encontrado!");
    }
    
    // Extrai o nome do contrato automaticamente do código fonte
    let match = contratoSource.match(/contract\s+([A-Za-z0-9_]+)/);
    let nomeContrato = match ? match[1] : contractName;
    
    console.log('Enviando contrato para compilação:', nomeContrato); // Debug
    
    // Timeout de 30 segundos para a compilação
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);
    
    const response = await fetch('https://token-creator-api.onrender.com/compile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sourceCode: contratoSource,
        contractName: nomeContrato,
        compilerVersion: "0.8.19"
      }),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Erro do servidor:', response.status, errorText);
      throw new Error(`Erro do servidor (${response.status}): ${errorText}`);
    }
    
    const result = await response.json();
    console.log('Resultado da compilação:', result); // Debug

    if (!result.success) {
      const errorMsg = result.error || "Bytecode não retornado";
      compileStatus.textContent = "Erro na compilação: " + errorMsg;
      btnCompilar.disabled = false;
      throw new Error("Erro na compilação: " + errorMsg);
    }

    contratoAbi = result.abi;
    contratoBytecode = result.bytecode;
    contratoName = nomeContrato;
    
    console.log('Compilação bem-sucedida - ABI:', contratoAbi ? 'OK' : 'NULL');
    console.log('Compilação bem-sucedida - Bytecode:', contratoBytecode ? 'OK' : 'NULL');
    
    marcarConcluido(btnCompilar);
    compileStatus.textContent = "Compilado com sucesso!";
    
    if (btnDeploy) {
      btnDeploy.disabled = false;
    }
    
    return result; // Retorna o resultado para a Promise
    
  } catch (e) {
    if (e.name === 'AbortError') {
      compileStatus.textContent = "Timeout: Compilação demorou mais que 30 segundos";
    } else {
      compileStatus.textContent = "Erro na compilação: " + (e.message || e);
    }
    btnCompilar.disabled = false;
    throw e; // Re-lança o erro para ser capturado pela Promise
  }
}