// Engenharia Reversa de Bytecode - Ferramenta Avançada
// Permite recriar contratos a partir do bytecode e diagnosticar diferenças

/**
 * Analisa bytecode e extrai informações estruturais
 */
function analyzeBytecode(bytecode) {
  if (!bytecode) return null;
  
  const clean = bytecode.replace(/^0x/, '');
  console.log('🔍 ANÁLISE DETALHADA DO BYTECODE:');
  console.log('==========================================');
  console.log('📏 Tamanho total:', clean.length, 'caracteres hexadecimais');
  console.log('📦 Tamanho em bytes:', clean.length / 2);
  
  // Analisa estrutura básica
  const analysis = {
    size: clean.length,
    bytes: clean.length / 2,
    isCreation: false,
    isRuntime: false,
    hasConstructor: false,
    hasMetadata: false,
    compiler: null,
    solcVersion: null,
    segments: []
  };
  
  // Detecta se é creation ou runtime bytecode
  if (clean.includes('60806040526004361061')) {
    analysis.isRuntime = true;
    console.log('🎯 Tipo: RUNTIME BYTECODE');
  } else if (clean.includes('608060405234801561001057600080fd5b')) {
    analysis.isCreation = true;
    analysis.hasConstructor = true;
    console.log('🎯 Tipo: CREATION BYTECODE (com constructor)');
  } else {
    console.log('🎯 Tipo: INDETERMINADO');
  }
  
  // Procura por metadata hash (final do bytecode)
  const metadataPattern = /a2646970667358221220[a-f0-9]{64}64736f6c63[a-f0-9]{6}0033$/i;
  if (metadataPattern.test(clean)) {
    analysis.hasMetadata = true;
    const match = clean.match(metadataPattern);
    console.log('📋 Metadata encontrada:', match[0]);
    
    // Extrai versão do Solidity do metadata
    const solcHex = clean.match(/64736f6c63([a-f0-9]{6})/i);
    if (solcHex) {
      const version = parseInt(solcHex[1], 16);
      const major = (version >> 16) & 0xFF;
      const minor = (version >> 8) & 0xFF;
      const patch = version & 0xFF;
      analysis.solcVersion = `${major}.${minor}.${patch}`;
      console.log('🔧 Versão Solidity detectada:', analysis.solcVersion);
    }
  }
  
  // Procura por padrões conhecidos
  const patterns = {
    'ERC20 Transfer': '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef',
    'ERC20 Approval': '0x8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925',
    'Ownable': '0x8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e0',
    'SafeMath': '4e487b7100000000000000000000000000000000000000000000000000000000',
    'Function Selector Start': '63ffffffff',
    'Standard Deploy Pattern': '608060405234801561001057600080fd5b'
  };
  
  console.log('\n🔍 PADRÕES DETECTADOS:');
  for (const [name, pattern] of Object.entries(patterns)) {
    if (clean.toLowerCase().includes(pattern.toLowerCase().replace(/^0x/, ''))) {
      console.log(`✅ ${name}: Encontrado`);
      analysis.segments.push(name);
    }
  }
  
  return analysis;
}

/**
 * Compara dois bytecodes e identifica diferenças específicas
 */
function compareBytecodes(bytecode1, bytecode2, label1 = 'Bytecode 1', label2 = 'Bytecode 2') {
  console.log('\n🔄 COMPARAÇÃO DETALHADA DE BYTECODES:');
  console.log('==========================================');
  
  if (!bytecode1 || !bytecode2) {
    console.log('❌ Um dos bytecodes está vazio');
    return { similarity: 0, differences: ['Bytecode vazio'] };
  }
  
  const clean1 = bytecode1.replace(/^0x/, '').toLowerCase();
  const clean2 = bytecode2.replace(/^0x/, '').toLowerCase();
  
  console.log(`📊 ${label1}: ${clean1.length} chars`);
  console.log(`📊 ${label2}: ${clean2.length} chars`);
  
  if (clean1 === clean2) {
    console.log('🎉 BYTECODES IDÊNTICOS!');
    return { similarity: 100, differences: [] };
  }
  
  // Análise de diferenças
  const differences = [];
  const minLength = Math.min(clean1.length, clean2.length);
  const maxLength = Math.max(clean1.length, clean2.length);
  
  console.log(`📏 Diferença de tamanho: ${Math.abs(clean1.length - clean2.length)} chars`);
  
  // Compara início (primeiros 200 chars)
  const start1 = clean1.substring(0, 200);
  const start2 = clean2.substring(0, 200);
  if (start1 !== start2) {
    differences.push('Início diferente (constructor/deployment code)');
    console.log('❌ Início dos bytecodes diferem');
    console.log(`   ${label1}: ${start1.substring(0, 50)}...`);
    console.log(`   ${label2}: ${start2.substring(0, 50)}...`);
  } else {
    console.log('✅ Início dos bytecodes idêntico');
  }
  
  // Compara final (últimos 200 chars) - geralmente metadata
  const end1 = clean1.substring(Math.max(0, clean1.length - 200));
  const end2 = clean2.substring(Math.max(0, clean2.length - 200));
  if (end1 !== end2) {
    differences.push('Final diferente (metadata hash)');
    console.log('❌ Final dos bytecodes diferem (provavelmente metadata)');
  } else {
    console.log('✅ Final dos bytecodes idêntico');
  }
  
  // Compara meio (runtime code principal)
  if (minLength > 400) {
    const mid1 = clean1.substring(200, minLength - 200);
    const mid2 = clean2.substring(200, minLength - 200);
    if (mid1 !== mid2) {
      differences.push('Runtime code diferente');
      console.log('❌ Runtime code principal difere');
    } else {
      console.log('✅ Runtime code principal idêntico');
    }
  }
  
  // Calcula similaridade por posição
  let matches = 0;
  for (let i = 0; i < minLength; i++) {
    if (clean1[i] === clean2[i]) matches++;
  }
  
  const similarity = (matches / maxLength) * 100;
  console.log(`📈 Similaridade: ${similarity.toFixed(2)}%`);
  
  return { similarity, differences, matches, total: maxLength };
}

/**
 * Tenta recriar código Solidity a partir do bytecode
 */
function reverseBytecodeToSolidity(bytecode) {
  console.log('\n🔄 ENGENHARIA REVERSA: BYTECODE → SOLIDITY');
  console.log('==========================================');
  
  const analysis = analyzeBytecode(bytecode);
  if (!analysis) return null;
  
  let reconstructed = {
    pragma: 'pragma solidity ^0.8.19;',
    imports: [],
    contract: '',
    functions: [],
    events: [],
    variables: []
  };
  
  // Ajusta pragma baseado na versão detectada
  if (analysis.solcVersion) {
    const [major, minor] = analysis.solcVersion.split('.');
    reconstructed.pragma = `pragma solidity ^${major}.${minor}.0;`;
    console.log('🔧 Pragma detectado:', reconstructed.pragma);
  }
  
  // Detecta padrões ERC20
  if (analysis.segments.includes('ERC20 Transfer') || analysis.segments.includes('ERC20 Approval')) {
    reconstructed.imports.push('// ERC20 Interface detectada');
    reconstructed.contract = 'contract DetectedToken';
    reconstructed.functions.push('function transfer(address to, uint256 amount) public returns (bool)');
    reconstructed.functions.push('function approve(address spender, uint256 amount) public returns (bool)');
    reconstructed.events.push('event Transfer(address indexed from, address indexed to, uint256 value)');
    reconstructed.events.push('event Approval(address indexed owner, address indexed spender, uint256 value)');
    console.log('✅ Padrão ERC20 detectado');
  }
  
  // Detecta Ownable
  if (analysis.segments.includes('Ownable')) {
    reconstructed.functions.push('function owner() public view returns (address)');
    reconstructed.functions.push('function transferOwnership(address newOwner) public');
    reconstructed.events.push('event OwnershipTransferred(address indexed previousOwner, address indexed newOwner)');
    console.log('✅ Padrão Ownable detectado');
  }
  
  // Gera código Solidity básico
  let solidityCode = `${reconstructed.pragma}\n\n`;
  
  if (reconstructed.imports.length > 0) {
    solidityCode += reconstructed.imports.join('\n') + '\n\n';
  }
  
  solidityCode += `${reconstructed.contract || 'contract ReversedContract'} {\n`;
  
  if (reconstructed.events.length > 0) {
    solidityCode += '\n    // Events detectados\n';
    reconstructed.events.forEach(event => {
      solidityCode += `    ${event};\n`;
    });
  }
  
  if (reconstructed.variables.length > 0) {
    solidityCode += '\n    // Variables detectadas\n';
    reconstructed.variables.forEach(variable => {
      solidityCode += `    ${variable};\n`;
    });
  }
  
  if (reconstructed.functions.length > 0) {
    solidityCode += '\n    // Functions detectadas\n';
    reconstructed.functions.forEach(func => {
      solidityCode += `    ${func} {\n        // Implementação detectada do bytecode\n    }\n\n`;
    });
  }
  
  solidityCode += '}\n';
  
  console.log('📝 CÓDIGO SOLIDITY RECONSTRUÍDO:');
  console.log('==========================================');
  console.log(solidityCode);
  console.log('==========================================');
  
  return {
    analysis,
    reconstructed,
    solidityCode
  };
}

/**
 * Busca bytecode de contrato no blockchain
 */
async function fetchContractBytecode(contractAddress) {
  console.log('🌐 Buscando bytecode do contrato:', contractAddress);
  
  if (!window.ethereum) {
    throw new Error('MetaMask não encontrado');
  }
  
  try {
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const code = await provider.getCode(contractAddress);
    
    if (code === '0x') {
      throw new Error('Endereço não é um contrato ou não existe');
    }
    
    console.log('✅ Bytecode obtido:', code.length, 'caracteres');
    return code;
  } catch (error) {
    console.error('❌ Erro ao buscar bytecode:', error);
    throw error;
  }
}

/**
 * Ferramenta completa: busca contrato e faz engenharia reversa
 */
async function reverseEngineerContract(contractAddress) {
  console.log('🚀 ENGENHARIA REVERSA COMPLETA');
  console.log('==========================================');
  console.log('📍 Contrato:', contractAddress);
  
  try {
    // 1. Busca bytecode
    const bytecode = await fetchContractBytecode(contractAddress);
    
    // 2. Analisa bytecode
    const analysis = analyzeBytecode(bytecode);
    
    // 3. Reconstrói Solidity
    const reconstruction = reverseBytecodeToSolidity(bytecode);
    
    // 4. Salva resultados globalmente
    window.reversedContract = {
      address: contractAddress,
      bytecode: bytecode,
      analysis: analysis,
      reconstruction: reconstruction,
      timestamp: new Date().toISOString()
    };
    
    console.log('✅ Engenharia reversa concluída!');
    console.log('💾 Dados salvos em window.reversedContract');
    
    return window.reversedContract;
    
  } catch (error) {
    console.error('❌ Erro na engenharia reversa:', error);
    throw error;
  }
}

/**
 * Compara nosso bytecode compilado com um contrato específico
 */
async function compareWithDeployedContract(contractAddress) {
  console.log('🔄 COMPARANDO COM CONTRATO IMPLANTADO');
  console.log('==========================================');
  
  try {
    // Busca bytecode do contrato
    const deployedBytecode = await fetchContractBytecode(contractAddress);
    
    // Compara com nossos bytecodes locais
    const ourCreation = window.creationBytecode || window.contratoBytecode;
    const ourRuntime = window.runtimeBytecode;
    
    console.log('📊 COMPARAÇÕES:');
    
    if (ourCreation) {
      const comp1 = compareBytecodes(deployedBytecode, ourCreation, 'Deployed', 'Nossa Creation');
      console.log(`Creation vs Deployed: ${comp1.similarity.toFixed(2)}% similar`);
    }
    
    if (ourRuntime) {
      const comp2 = compareBytecodes(deployedBytecode, ourRuntime, 'Deployed', 'Nosso Runtime');
      console.log(`Runtime vs Deployed: ${comp2.similarity.toFixed(2)}% similar`);
    }
    
    // Analisa o contrato implantado
    const analysis = analyzeBytecode(deployedBytecode);
    
    console.log('\n💡 RECOMENDAÇÕES:');
    if (analysis.solcVersion) {
      console.log(`🔧 Use Solidity versão ${analysis.solcVersion}`);
      if (analysis.solcVersion !== window.resolvedCompilerVersion) {
        console.log(`⚠️ Nossa versão (${window.resolvedCompilerVersion}) difere da detectada (${analysis.solcVersion})`);
      }
    }
    
    return {
      deployedBytecode,
      analysis,
      ourCreation,
      ourRuntime
    };
    
  } catch (error) {
    console.error('❌ Erro na comparação:', error);
    throw error;
  }
}

/**
 * Cria template de contrato baseado em bytecode analisado
 */
function createTemplateFromBytecode(analysis) {
  if (!analysis || !analysis.reconstruction) {
    console.log('❌ Análise de bytecode necessária primeiro');
    return null;
  }
  
  const template = analysis.reconstruction.solidityCode;
  
  // Salva como arquivo
  const blob = new Blob([template], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'reversed-contract.sol';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  
  console.log('📁 Template salvo como reversed-contract.sol');
  return template;
}

// Expõe funções globalmente
if (typeof window !== 'undefined') {
  window.analyzeBytecode = analyzeBytecode;
  window.compareBytecodes = compareBytecodes;
  window.reverseBytecodeToSolidity = reverseBytecodeToSolidity;
  window.reverseEngineerContract = reverseEngineerContract;
  window.compareWithDeployedContract = compareWithDeployedContract;
  window.createTemplateFromBytecode = createTemplateFromBytecode;
  
  console.log('🔧 Ferramentas de engenharia reversa carregadas:');
  console.log('- window.analyzeBytecode(bytecode)');
  console.log('- window.compareBytecodes(bytecode1, bytecode2)');
  console.log('- window.reverseEngineerContract(address)');
  console.log('- window.compareWithDeployedContract(address)');
  console.log('- window.createTemplateFromBytecode(analysis)');
}
