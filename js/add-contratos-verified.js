// Compilador com suporte a verificação - versão 2.0
// Adiciona informações de versão do compilador para verificação automática

import { marcarConcluido } from './add-utils.js';

export let contratoSource = "";
export let contratoAbi = null;
export let contratoBytecode = null;
export let contratoName = null;
export let compilerVersion = "0.8.30"; // ATUALIZADA para versão que funciona no Remix
export let resolvedCompilerVersion = "0.8.30"; // Versão que funciona no Remix

// Múltiplas configurações para tentar compilação (para verificação correta)
export const COMPILATION_CONFIGS = [
  {
    name: "BSCScan Default",
    optimizer: { enabled: false, runs: 200 },
    evmVersion: "paris" // EVM mais compatível
  },
  {
    name: "Legacy Compatible", 
    optimizer: { enabled: false, runs: 200 },
    evmVersion: "london"
  },
  {
    name: "Standard",
    optimizer: { enabled: false, runs: 200 },
    evmVersion: "cancun"
  },
  {
    name: "Optimized",
    optimizer: { enabled: true, runs: 200 },
    evmVersion: "paris"
  }
];

export let compilationSettings = COMPILATION_CONFIGS[0]; // Usar BSCScan default

// Função global de diagnóstico de bytecode - disponível sempre
window.diagnoseBytecode = function() {
  console.log('🔍 DIAGNÓSTICO GLOBAL DE BYTECODES:');
  
  // Verifica dados da última compilação
  const creation = window.creationBytecode || window.contratoBytecode;
  const runtime = window.runtimeBytecode;
  const deployed = window.deployedBytecode;
  
  if (!creation && !runtime && !deployed) {
    console.log('❌ Nenhum bytecode encontrado. Compile e faça deploy primeiro.');
    return;
  }
  
  console.log('📝 Bytecodes encontrados:');
  if (creation) {
    console.log('  ✅ Creation Bytecode:', creation.length, 'chars -', creation.substring(0, 50) + '...');
  }
  if (runtime) {
    console.log('  ✅ Runtime Bytecode:', runtime.length, 'chars -', runtime.substring(0, 50) + '...');
  }
  if (deployed) {
    console.log('  ✅ Deployed Bytecode:', deployed.length, 'chars -', deployed.substring(0, 50) + '...');
  }
  
  console.log('💡 Recomendação para verificação:');
  if (deployed) {
    console.log('  🎯 Use o DEPLOYED BYTECODE para verificação manual');
    console.log('  📋 Deployed Bytecode:', deployed);
  } else if (runtime) {
    console.log('  🎯 Use o RUNTIME BYTECODE para verificação manual');
    console.log('  📋 Runtime Bytecode:', runtime);
  } else if (creation) {
    console.log('  ⚠️ Apenas creation bytecode disponível - pode não funcionar na verificação');
    console.log('  📋 Creation Bytecode:', creation);
  }
};

// Função avançada de diagnóstico que busca bytecode do blockchain
window.diagnoseBytecodeAdvanced = async function(contractAddress = null) {
  console.log('🔍 DIAGNÓSTICO AVANÇADO DE BYTECODES:');
  
  const address = contractAddress || localStorage.getItem('tokenAddress') || window.contractAddress;
  
  if (!address) {
    console.log('❌ Endereço do contrato não encontrado. Forneça o endereço ou faça deploy primeiro.');
    return;
  }
  
  console.log('📍 Contrato:', address);
  
  // Busca bytecode do blockchain se MetaMask disponível
  if (window.ethereum) {
    try {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const deployedCode = await provider.getCode(address);
      
      window.deployedBytecode = deployedCode;
      localStorage.setItem('deployedBytecode', deployedCode);
      
      console.log('✅ Bytecode real do blockchain:', deployedCode.length, 'chars');
      console.log('📋 Para verificação, use este bytecode:', deployedCode);
      
      // Compara com bytecodes locais
      const creation = window.creationBytecode || window.contratoBytecode;
      const runtime = window.runtimeBytecode;
      
      if (creation) {
        const similarity = compareBytecodes(deployedCode, creation);
        console.log('📊 Similaridade com creation bytecode:', similarity.toFixed(2) + '%');
      }
      
      if (runtime) {
        const similarity = compareBytecodes(deployedCode, runtime);
        console.log('📊 Similaridade com runtime bytecode:', similarity.toFixed(2) + '%');
      }
      
    } catch (error) {
      console.error('❌ Erro ao buscar bytecode do blockchain:', error.message);
    }
  } else {
    console.log('⚠️ MetaMask não disponível. Conecte para buscar bytecode real.');
  }
  
  // Chama diagnóstico básico também
  window.diagnoseBytecode();
};

// Função auxiliar para comparar bytecodes
function compareBytecodes(bytecode1, bytecode2) {
  if (!bytecode1 || !bytecode2) return 0;
  
  const clean1 = bytecode1.replace(/^0x/, '').toLowerCase();
  const clean2 = bytecode2.replace(/^0x/, '').toLowerCase();
  
  if (clean1 === clean2) return 100;
  
  // Compara início dos bytecodes (primeiros 1000 caracteres)
  const start1 = clean1.substring(0, 1000);
  const start2 = clean2.substring(0, 1000);
  
  let matches = 0;
  const minLength = Math.min(start1.length, start2.length);
  
  for (let i = 0; i < minLength; i++) {
    if (start1[i] === start2[i]) matches++;
  }
  
  return (matches / minLength) * 100;
}

// Função específica para preparar dados para verificação no BSCScan
window.prepararParaBSCScan = function() {
  console.log('📋 DADOS PARA VERIFICAÇÃO NO BSCSCAN:');
  console.log('==========================================');
  
  const sourceCode = window.contratoSource || localStorage.getItem('contratoSource');
  const contractName = window.contratoName || localStorage.getItem('contratoName');
  const compiler = window.resolvedCompilerVersion || localStorage.getItem('resolvedCompilerVersion');
  const settings = window.compilationSettings;
  
  if (!sourceCode) {
    console.log('❌ Código fonte não encontrado. Compile o contrato primeiro.');
    return;
  }
  
  console.log('🏷️ Contract Name:', contractName || 'Token');
  console.log('⚙️ Compiler Version:', 'v' + compiler + '+commit.7dd6d404');
  console.log('🔧 Optimization:', settings?.optimizer?.enabled ? 'Yes' : 'No');
  if (settings?.optimizer?.enabled) {
    console.log('🔄 Runs:', settings.optimizer.runs || 200);
  }
  console.log('🌐 EVM Version:', settings?.evmVersion || 'paris');
  
  console.log('\n📝 CÓDIGO FONTE (copie tudo abaixo):');
  console.log('==========================================');
  console.log(sourceCode);
  console.log('==========================================');
  
  console.log('\n💡 INSTRUÇÕES:');
  console.log('1. Vá para BSCScan > Verify Contract');
  console.log('2. Cole o código fonte acima');
  console.log('3. Use as configurações mostradas acima');
  console.log('4. Submeta para verificação');
  
  return {
    sourceCode,
    contractName,
    compiler,
    settings
  };
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
  // CORRIGIDO: Usa versão fixa que funcionava no repo antigo
  console.log('🔧 Usando versão fixa Solidity 0.8.30 (compatível com Remix)');
  return '0.8.30';
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
 * Extrai runtime bytecode do creation bytecode
 * O creation bytecode contém o constructor + runtime code
 */
export function extractRuntimeBytecode(creationBytecode) {
  if (!creationBytecode) return null;
  
  try {
    // Remove 0x prefix se presente
    let bytecode = creationBytecode.replace(/^0x/, '');
    
    // Padrão típico: creation code termina com metadata hash
    // Runtime code começa após o constructor
    
    // Procura pelo padrão de início do runtime code (típico pattern)
    // 60806040526004361061 é um padrão comum de início de runtime
    const runtimeStart = bytecode.indexOf('60806040526004361061');
    
    if (runtimeStart > 0) {
      const runtime = '0x' + bytecode.substring(runtimeStart);
      console.log('🔍 Runtime bytecode extraído:', runtime.length, 'chars');
      return runtime;
    }
    
    // Se não encontrou o padrão específico, tenta outro método
    // Procura pelo padrão de final do constructor (STOP + RETURN)
    const patterns = [
      'fe', // INVALID opcode
      '5b5f5ffd5b', // Common constructor end pattern
      '6000555b5f5ffd5b' // Another constructor pattern
    ];
    
    for (const pattern of patterns) {
      const endPos = bytecode.indexOf(pattern);
      if (endPos > 0) {
        // Tenta extrair código após este ponto
        const possibleRuntime = bytecode.substring(endPos + pattern.length);
        if (possibleRuntime.length > 100) { // Deve ter tamanho razoável
          return '0x' + possibleRuntime;
        }
      }
    }
    
    console.log('⚠️ Não foi possível extrair runtime bytecode automaticamente');
    return null;
    
  } catch (error) {
    console.error('❌ Erro ao extrair runtime bytecode:', error);
    return null;
  }
}

/**
 * Tenta múltiplas configurações de compilação para encontrar bytecode matching
 */
export async function compileContractMultipleConfigs(contractSource, contractName, targetBytecode = null) {
  console.log('🔄 Tentando múltiplas configurações para compilação...');
  
  for (let i = 0; i < COMPILATION_CONFIGS.length; i++) {
    const config = COMPILATION_CONFIGS[i];
    console.log(`📝 Testando configuração ${i+1}: ${config.name}`);
    console.log(`- Optimizer: ${config.optimizer.enabled ? 'Enabled' : 'Disabled'}`);
    console.log(`- Runs: ${config.optimizer.runs}`);
    console.log(`- EVM Version: ${config.evmVersion}`);
    
    // Atualiza configuração temporariamente
    const originalSettings = compilationSettings;
    compilationSettings = config;
    
    try {
      const result = await compileContract(contractSource, contractName);
      
      if (result.success && result.bytecode && result.abi) {
        // Remove "0x" prefix se presente para comparação
        const cleanBytecode = result.bytecode.replace(/^0x/, '');
        const cleanTarget = targetBytecode ? targetBytecode.replace(/^0x/, '') : null;
        
        console.log(`✅ Compilação ${i+1} bem-sucedida:`);
        console.log(`- Bytecode length: ${cleanBytecode.length}`);
        console.log(`- Config: ${config.name}`);
        
        // Se temos um bytecode alvo, compara
        if (cleanTarget) {
          if (cleanBytecode === cleanTarget) {
            console.log('🎯 MATCH PERFEITO! Esta configuração produz o bytecode correto');
            return { ...result, config, isMatch: true };
          } else {
            console.log(`❌ Bytecode não bate (esperado: ${cleanTarget.length}, obtido: ${cleanBytecode.length})`);
          }
        }
        
        // Se não temos alvo ou é a primeira compilação bem-sucedida, salva
        if (!targetBytecode) {
          console.log('✅ Primeira compilação bem-sucedida - usando esta configuração');
          return { ...result, config, isMatch: false };
        }
      }
      
    } catch (error) {
      console.log(`❌ Configuração ${i+1} falhou:`, error.message);
    } finally {
      // Restaura configuração original
      compilationSettings = originalSettings;
    }
  }
  
  throw new Error('Nenhuma configuração produziu compilação válida');
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

    // Força pragma para versão que funciona com as APIs
    const newPragma = `pragma solidity ^0.8.30;`;
    
    console.log(`🔧 Forçando pragma solidity para ^0.8.30 (versão compatível com Remix)...`);
    contrato = contrato.replace(/pragma solidity[\s]*\^?[\d\.]+;/g, newPragma);

    // Substituição dos placeholders
    console.log('🔄 Substituindo placeholders...');
    console.log('- Nome:', inputs.nome);
    console.log('- Símbolo:', inputs.symbol);
    console.log('- Decimais:', inputs.decimals);
    console.log('- Supply:', inputs.supply);
    console.log('- Owner:', inputs.owner);
    
    // Formatar supply para ser compatível com Solidity
    const formatSupplyForSolidity = (supply) => {
      if (!supply) return '1000000000';
      
      // Remove pontos e espaços
      let formatted = supply.toString().replace(/[.\s]/g, '');
      
      // Se contém vírgulas, substitui por underscores (formato Solidity)
      formatted = formatted.replace(/,/g, '_');
      
      // Se não tem underscores e é um número grande, adiciona underscores para legibilidade
      if (!formatted.includes('_') && formatted.length > 6) {
        // Adiciona underscores a cada 3 dígitos da direita para a esquerda
        formatted = formatted.replace(/\B(?=(\d{3})+(?!\d))/g, '_');
      }
      
      console.log(`📝 Supply formatado: ${supply} → ${formatted}`);
      return formatted;
    };
    
    const formattedSupply = formatSupplyForSolidity(inputs.supply);
    
    contrato = contrato
      .replace(/{{TOKEN_NAME}}/g, inputs.nome)
      .replace(/{{TOKEN_SYMBOL}}/g, inputs.symbol)
      .replace(/{{TOKEN_DECIMALS}}/g, inputs.decimals)
      .replace(/{{TOKEN_SUPPLY}}/g, formattedSupply)
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
    console.log('- Pragma version: pragma solidity ^0.8.30;');
    console.log('- Compiler target: 0.8.30 (FORÇADO)');
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
    if (!contratoSource.includes('pragma solidity ^0.8.30')) {
      console.log('⚠️ Aviso: pragma solidity pode não coincidir com versão do compilador');
    }
    
    // Extrai nome do contrato
    let match = contratoSource.match(/contract\s+([A-Za-z0-9_]+)/);
    let nomeContrato = match ? match[1] : contractName;
    
    if (!nomeContrato) {
      throw new Error('❌ Nome do contrato não encontrado no código fonte!');
    }
    
    console.log('🚀 Iniciando compilação com múltiplas configurações...');
    console.log('- Nome do contrato:', nomeContrato);
    console.log('- Versão do compilador:', resolvedCompilerVersion || 'Buscando...');
    console.log('- Tamanho do código:', contratoSource.length, 'caracteres');
    
    compileStatus.textContent = `Testando configurações de compilação...`;
    
    // Tenta múltiplas configurações para encontrar a correta
    const result = await compileContractMultipleConfigs(contratoSource, nomeContrato);
    
    // Validação do resultado
    if (!result.bytecode || !result.abi) {
      throw new Error('❌ Resultado da compilação inválido');
    }
    
    console.log('🎯 Configuração selecionada:', result.config.name);
    console.log('- Optimizer:', result.config.optimizer.enabled ? 'Enabled' : 'Disabled');
    console.log('- EVM Version:', result.config.evmVersion);
    
    // Validação do resultado
    if (!result.bytecode || !result.abi) {
      throw new Error('❌ Resultado da compilação inválido');
    }
    
    // Processamento do bytecode
    let bytecode = result.bytecode;
    if (!bytecode.startsWith('0x')) {
      bytecode = '0x' + bytecode;
    }
    
    // CORREÇÃO: Salva AMBOS creation e runtime bytecode para verificação correta
    let creationBytecode = bytecode; // Bytecode de criação (para deploy)
    let runtimeBytecode = null; // Será extraído se disponível
    
    // Se o resultado contém runtime bytecode separado, usa ele
    if (result.deployedBytecode) {
      runtimeBytecode = result.deployedBytecode;
      if (!runtimeBytecode.startsWith('0x')) {
        runtimeBytecode = '0x' + runtimeBytecode;
      }
    } else {
      // Tenta extrair runtime bytecode do creation bytecode
      runtimeBytecode = extractRuntimeBytecode(creationBytecode);
    }
    
    // Salva resultados com configuração usada
    contratoAbi = result.abi;
    contratoBytecode = creationBytecode; // Para deploy
    contratoName = nomeContrato;
    compilationSettings = result.config; // Usa a configuração que funcionou
    
    // Salva AMBOS os bytecodes para verificação
    window.creationBytecode = creationBytecode;
    window.runtimeBytecode = runtimeBytecode;
    
    // Função de diagnóstico para verificação
    window.diagnoseBytecode = function() {
      console.log('🔍 DIAGNÓSTICO DE BYTECODES:');
      console.log('📝 Creation Bytecode (para deploy):', creationBytecode.substring(0, 100) + '...');
      console.log('📝 Runtime Bytecode (para verificação):', runtimeBytecode ? runtimeBytecode.substring(0, 100) + '...' : 'Não disponível');
      console.log('📊 Tamanhos:');
      console.log('  - Creation:', creationBytecode.length);
      console.log('  - Runtime:', runtimeBytecode ? runtimeBytecode.length : 'N/A');
      console.log('💡 Para verificação manual, use o Runtime Bytecode se disponível');
    };
    
    // Alias para compatibilidade
    window.diagnoseBytecodes = window.diagnoseBytecode;
    
    console.log('✅ Compilação bem-sucedida com configuração otimizada!');
    console.log('- ABI funções:', contratoAbi.length);
    console.log('- Creation Bytecode:', creationBytecode.length, 'chars');
    console.log('- Runtime Bytecode:', runtimeBytecode ? runtimeBytecode.length + ' chars' : 'Não extraído');
    console.log('- Compiler:', resolvedCompilerVersion);
    console.log('- EVM Version:', compilationSettings.evmVersion);
    console.log('- Optimizer:', compilationSettings.optimizer.enabled ? 'Enabled' : 'Disabled');
    
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

/**
 * Função auxiliar para re-compilar com bytecode alvo específico
 * Útil quando sabemos o bytecode correto do BSCScan
 */
export async function recompileWithTargetBytecode(targetBytecode) {
  console.log('🎯 Re-compilando para bater com bytecode alvo...');
  console.log('- Target bytecode length:', targetBytecode.replace(/^0x/, '').length);
  
  if (!contratoSource) {
    throw new Error('❌ Código fonte não disponível. Gere o contrato primeiro.');
  }
  
  let match = contratoSource.match(/contract\s+([A-Za-z0-9_]+)/);
  let nomeContrato = match ? match[1] : 'Token';
  
  try {
    const result = await compileContractMultipleConfigs(contratoSource, nomeContrato, targetBytecode);
    
    if (result.isMatch) {
      console.log('🎉 SUCESSO! Encontrou configuração que produz bytecode correto');
      console.log('🔧 Configuração correta:', result.config.name);
      
      // Atualiza variáveis globais
      contratoAbi = result.abi;
      contratoBytecode = result.bytecode;
      contratoName = nomeContrato;
      compilationSettings = result.config;
      
      // Expõe globalmente
      window.contratoAbi = contratoAbi;
      window.contratoBytecode = contratoBytecode;
      window.contratoName = contratoName;
      window.compilationSettings = compilationSettings;
      
      return result;
    } else {
      console.log('⚠️ Nenhuma configuração produziu bytecode exato, mas compilação foi bem-sucedida');
      return result;
    }
  } catch (error) {
    console.error('❌ Erro ao re-compilar:', error);
    throw error;
  }
}

// Expõe função globalmente para uso no console
if (typeof window !== 'undefined') {
  window.recompileWithTargetBytecode = recompileWithTargetBytecode;
}
