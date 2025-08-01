// Compilador com suporte a verificação - versão 2.0
// Adiciona informações de versão do compilador para verificação automática

import { marcarConcluido } from './add-utils.js';

export let contratoSource = "";
export let contratoAbi = null;
export let contratoBytecode = null;
export let contratoName = null;
export let compilerVersion = "latest"; // Sempre a última versão do Solidity
export let resolvedCompilerVersion = ""; // Versão real resolvida pela API
export let compilationSettings = {
  optimizer: {
    enabled: false,
    runs: 200
  },
  evmVersion: "cancun" // EVM mais recente
};

// Debug state com informações de compilação
export function debugContractState() {
  console.log('🔍 Estado das variáveis de compilação:');
  console.log('- contratoSource:', contratoSource ? `${contratoSource.length} chars` : 'VAZIO');
  console.log('- contratoAbi:', contratoAbi ? `${contratoAbi.length} funções` : 'NULL');
  console.log('- contratoBytecode:', contratoBytecode ? `${contratoBytecode.length} chars` : 'NULL');
  console.log('- contratoName:', contratoName || 'NULL');
  console.log('- compilerVersion:', compilerVersion);
  console.log('- resolvedVersion:', resolvedCompilerVersion || 'Não resolvida ainda');
  console.log('- optimizer:', compilationSettings.optimizer.enabled ? 'ENABLED' : 'DISABLED');
  console.log('- runs:', compilationSettings.optimizer.runs);
  console.log('- evmVersion:', compilationSettings.evmVersion);
  
  // Salva informações para verificação posterior
  if (typeof window !== 'undefined') {
    window.verificationData = {
      contractName: contratoName,
      compilerVersion: resolvedCompilerVersion || compilerVersion,
      optimizerEnabled: compilationSettings.optimizer.enabled,
      optimizerRuns: compilationSettings.optimizer.runs,
      evmVersion: compilationSettings.evmVersion,
      sourceCode: contratoSource,
      abi: contratoAbi,
      bytecode: contratoBytecode
    };
  }
  
  return { 
    contratoSource, 
    contratoAbi, 
    contratoBytecode, 
    contratoName,
    compilerVersion,
    resolvedCompilerVersion,
    compilationSettings
  };
}

/**
 * Função para exibir dados de verificação (só quando solicitado)
 */
export function showVerificationInfo() {
  if (!contratoName || !contratoBytecode) {
    console.log('❌ Compile o contrato primeiro');
    return;
  }
  
  console.log('📋 DADOS PARA VERIFICAÇÃO NO EXPLORADOR:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`Contract Name: ${contratoName}`);
  console.log(`Compiler Version: ${resolvedCompilerVersion || 'Versão não resolvida'}`);
  console.log(`Optimization: ${compilationSettings.optimizer.enabled ? 'Yes' : 'No'}`);
  if (compilationSettings.optimizer.enabled) {
    console.log(`Runs: ${compilationSettings.optimizer.runs}`);
  }
  console.log(`EVM Version: ${compilationSettings.evmVersion}`);
  console.log('🆕 USANDO SEMPRE A ÚLTIMA VERSÃO DO SOLIDITY!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔗 Source Code (para copiar):');
  console.log(contratoSource);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔗 ABI (para usar no front-end):');
  console.log(JSON.stringify(contratoAbi, null, 2));
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  // Cria elementos temporários para facilitar cópia
  const sourceElement = document.createElement('textarea');
  sourceElement.value = contratoSource;
  sourceElement.style.position = 'fixed';
  sourceElement.style.left = '-9999px';
  document.body.appendChild(sourceElement);
  
  const abiElement = document.createElement('textarea');
  abiElement.value = JSON.stringify(contratoAbi, null, 2);
  abiElement.style.position = 'fixed';
  abiElement.style.left = '-9999px';
  document.body.appendChild(abiElement);
  
  // Salva elementos globalmente para acesso fácil
  window.verificationElements = {
    sourceCode: sourceElement,
    abi: abiElement
  };
  
  console.log('💡 Use window.verificationElements.sourceCode.select() + Ctrl+C para copiar o código');
  console.log('💡 Use window.verificationElements.abi.select() + Ctrl+C para copiar o ABI');
}

/**
 * Busca a última versão do Solidity disponível
 */
async function getLatestSolidityVersion() {
  try {
    console.log('🔍 Buscando a última versão do Solidity...');
    
    // Tenta várias APIs para encontrar a versão mais recente
    const endpoints = [
      {
        name: 'GitHub Releases API',
        url: 'https://api.github.com/repos/ethereum/solidity/releases/latest',
        parser: (data) => data.tag_name.replace('v', '')
      },
      {
        name: 'Solc-bin List',
        url: 'https://binaries.soliditylang.org/bin/list.json',
        parser: (data) => {
          const builds = data.builds || [];
          const latest = builds.find(build => build.prerelease === false);
          return latest ? latest.version : null;
        }
      }
    ];
    
    for (const endpoint of endpoints) {
      try {
        console.log(`🔄 Tentando ${endpoint.name}...`);
        const response = await fetch(endpoint.url);
        
        if (response.ok) {
          const data = await response.json();
          const version = endpoint.parser(data);
          
          if (version) {
            console.log(`✅ Última versão encontrada: v${version}`);
            return version;
          }
        }
      } catch (error) {
        console.log(`❌ Erro em ${endpoint.name}:`, error.message);
      }
    }
    
    // Fallback para uma versão recente conhecida
    const fallbackVersion = '0.8.28';
    console.log(`⚠️ Usando versão fallback: v${fallbackVersion}`);
    return fallbackVersion;
    
  } catch (error) {
    console.error('❌ Erro ao buscar versão do Solidity:', error);
    return '0.8.28'; // Versão fallback
  }
}

/**
 * Tenta compilação usando diferentes estratégias com versão específica
 */
async function compileContract(contractSource, contractName) {
  // Busca a última versão do Solidity se ainda não foi resolvida
  if (!resolvedCompilerVersion) {
    resolvedCompilerVersion = await getLatestSolidityVersion();
    console.log(`🎯 Usando Solidity v${resolvedCompilerVersion} (ÚLTIMA VERSÃO)`);
  }
  
  const strategies = [
    {
      name: `API Direta (sem proxy) - v${resolvedCompilerVersion} LATEST`,
      url: 'https://token-creator-api.onrender.com/compile',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Origin': window.location.origin
      }
    },
    {
      name: `CORS Proxy corsproxy.io - v${resolvedCompilerVersion}`,
      url: 'https://corsproxy.io/?' + encodeURIComponent('https://token-creator-api.onrender.com/compile'),
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    },
    {
      name: 'Remix Compiler API - LATEST',
      url: 'https://remix.ethereum.org/api/compiler',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      method: 'REMIX'
    }
  ];
  
  for (let i = 0; i < strategies.length; i++) {
    const strategy = strategies[i];
    
    try {
      console.log(`🔄 Tentativa ${i+1}: ${strategy.name}`);
      
      if (strategy.method === 'LOCAL') {
        console.log('⚠️ Estratégia local não implementada nesta versão');
        continue;
      }
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);
      
      let payload;
      
      if (strategy.method === 'REMIX') {
        // Payload específico para Remix
        payload = {
          language: 'Solidity',
          sources: {
            [`${contractName}.sol`]: {
              content: contractSource
            }
          },
          settings: {
            optimizer: compilationSettings.optimizer,
            evmVersion: compilationSettings.evmVersion,
            outputSelection: {
              "*": {
                "*": ["abi", "evm.bytecode"]
              }
            }
          }
        };
      } else {
        // Payload padrão para nossa API
        payload = {
          sourceCode: contractSource,
          contractName: contractName,
          compilerVersion: resolvedCompilerVersion,
          settings: {
            optimizer: compilationSettings.optimizer,
            evmVersion: compilationSettings.evmVersion,
            outputSelection: {
              "*": {
                "*": ["abi", "evm.bytecode"]
              }
            }
          }
        };
      }
      
      console.log('📦 Enviando com configurações da ÚLTIMA VERSÃO:', {
        method: 'POST',
        url: strategy.url,
        contractName: contractName,
        compilerVersion: resolvedCompilerVersion,
        optimizer: compilationSettings.optimizer.enabled,
        evmVersion: compilationSettings.evmVersion,
        sourceCodeSize: contractSource.length
      });
      
      const response = await fetch(strategy.url, {
        method: 'POST',
        headers: strategy.headers,
        body: JSON.stringify(payload),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      console.log(`📡 Resposta ${i+1}:`, response.status, response.statusText);
      
      if (response.ok) {
        const result = await response.json();
        console.log(`📊 Dados recebidos ${i+1}:`, result);
        
        if (result.success && result.bytecode && result.abi) {
          console.log(`✅ Estratégia ${i+1} funcionou com Solidity v${resolvedCompilerVersion}!`);
          
          // Adiciona informações de compilação ao resultado
          result.compilerVersion = resolvedCompilerVersion;
          result.settings = compilationSettings;
          
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
 * Salva o contrato garantindo pragma correto
 */
export async function salvarContrato(inputs, callback) {
  try {
    console.log('📥 Carregando template do contrato...');
    const response = await fetch('contratos/contrato-base.sol');
    if (!response.ok) throw new Error(`Erro ${response.status}: ${response.statusText}`);
    
    let contrato = await response.text();
    console.log('📄 Template carregado:', contrato.length, 'caracteres');

    // Busca a última versão se ainda não foi resolvida
    if (!resolvedCompilerVersion) {
      resolvedCompilerVersion = await getLatestSolidityVersion();
    }

    // Atualiza pragma para usar a versão mais recente
    const majorMinor = resolvedCompilerVersion.split('.').slice(0, 2).join('.');
    const newPragma = `pragma solidity ^${majorMinor}.0;`;
    
    console.log(`🔧 Ajustando pragma solidity para v${majorMinor}.0 (compatível com ${resolvedCompilerVersion})...`);
    contrato = contrato.replace(/pragma solidity \^0\.\d+\.\d+;/, newPragma);

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

    // Adiciona comentário com informações de compilação
    const compilationInfo = `
/* ================================================================
 * 🔧 INFORMAÇÕES DE COMPILAÇÃO (para verificação)
 * ================================================================
 * Compiler Version: v${resolvedCompilerVersion} (LATEST)
 * Optimization: ${compilationSettings.optimizer.enabled ? 'Enabled' : 'Disabled'}
 * Runs: ${compilationSettings.optimizer.runs}
 * EVM Version: ${compilationSettings.evmVersion}
 * Generated by: Smart Contract Cafe
 * Auto-updated to latest Solidity version
 * ================================================================ */
`;
    
    contrato = contrato.replace('// SPDX-License-Identifier: MIT', `// SPDX-License-Identifier: MIT\n${compilationInfo}`);

    // Salva na variável global
    contratoSource = contrato;
    
    console.log('💾 Contrato processado e salvo:');
    console.log('- Tamanho final:', contrato.length, 'caracteres');
    console.log('- Pragma version:', newPragma);
    console.log('- Compiler target:', resolvedCompilerVersion);
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
 * Compila o contrato com informações precisas para verificação
 */
export async function compilarContrato(contractName, btnCompilar, compileStatus, btnDeploy) {
  btnCompilar.disabled = true;
  
  try {
    console.log('🔍 Verificando pré-requisitos para verificação...');
    debugContractState();
    
    // Validação rigorosa
    if (!contratoSource || typeof contratoSource !== 'string') {
      throw new Error('❌ Código fonte não encontrado! Clique em "Salvar Contrato" primeiro.');
    }
    
    if (contratoSource.trim().length < 100) {
      throw new Error(`❌ Código fonte muito pequeno (${contratoSource.length} chars). Salve o contrato novamente.`);
    }
    
    // Verifica pragma
    if (!contratoSource.includes('pragma solidity ^0.8.19')) {
      console.log('⚠️ Aviso: pragma solidity pode não coincidir com versão do compilador');
    }
    
    // Extrai nome do contrato
    let match = contratoSource.match(/contract\s+([A-Za-z0-9_]+)/);
    let nomeContrato = match ? match[1] : contractName;
    
    if (!nomeContrato) {
      throw new Error('❌ Nome do contrato não encontrado no código fonte!');
    }
    
    console.log('🚀 Iniciando compilação com ÚLTIMA VERSÃO...');
    console.log('- Nome do contrato:', nomeContrato);
    console.log('- Versão do compilador:', resolvedCompilerVersion || 'Buscando...');
    console.log('- EVM Version:', compilationSettings.evmVersion);
    console.log('- Tamanho do código:', contratoSource.length, 'caracteres');
    
    compileStatus.textContent = `Compilando com Solidity v${resolvedCompilerVersion || 'latest'}...`;
    
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
    
    console.log('✅ Compilação bem-sucedida com ÚLTIMA VERSÃO!');
    console.log('- ABI funções:', contratoAbi.length);
    console.log('- Bytecode tamanho:', contratoBytecode.length);
    console.log('- Compiler:', resolvedCompilerVersion);
    console.log('- EVM Version:', compilationSettings.evmVersion);
    
    // Expõe variáveis globalmente para verificação automática
    window.contratoSource = contratoSource;
    window.contratoAbi = contratoAbi;
    window.contratoBytecode = contratoBytecode;
    window.contratoName = contratoName;
    window.resolvedCompilerVersion = resolvedCompilerVersion;
    window.compilationSettings = compilationSettings;
    
    // Não mostra mais informações automaticamente - só quando solicitado
    // setTimeout(() => {
    //   showVerificationInfo();
    // }, 1000);
    
    marcarConcluido(btnCompilar);
    compileStatus.textContent = `✅ Compilado com Solidity v${resolvedCompilerVersion} - Pronto para deploy!`;
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
