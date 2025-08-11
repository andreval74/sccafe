// Diagnóstico Rápido - Testa todas as funcionalidades do sistema
// Execute: window.diagnosticoRapido() no console para testar tudo

/**
 * Executa diagnóstico completo do sistema
 */
function diagnosticoRapido() {
  console.clear();
  console.log('🚀 DIAGNÓSTICO RÁPIDO DO SISTEMA SCCAFE');
  console.log('==========================================');
  console.log('⏰ Iniciado em:', new Date().toLocaleString());
  
  const resultados = {
    timestamp: new Date().toISOString(),
    testes: [],
    funcoes: {},
    status: 'INICIANDO'
  };
  
  // Lista de funções esperadas
  const funcoesEsperadas = [
    // Funções básicas de bytecode
    'analyzeBytecode',
    'compareBytecodes',
    'reverseBytecodeToSolidity',
    
    // Funções de engenharia reversa
    'reverseEngineerContract',
    'compareWithDeployedContract',
    'fetchContractBytecode',
    
    // Funções de decompilação
    'decompileBytecodeToSolidity',
    'recreateContractFromAddress',
    'compareWithSimilarContracts',
    
    // Funções de diagnóstico
    'diagnoseBytecode',
    'diagnoseBytecodeAdvanced',
    'prepararParaBSCScan',
    
    // Funções de teste
    'executarTestesCompletos',
    'testeCompatibilidadeBSCScan',
    'testeVersaoCompilador',
    
    // Funções do Remix
    'testarContratoRemix',
    'compararComRemix'
  ];
  
  console.log('\n🔍 1. VERIFICAÇÃO DE FUNÇÕES DISPONÍVEIS');
  console.log('==========================================');
  
  let funcoesOK = 0;
  let funcoesERRO = 0;
  
  for (const funcao of funcoesEsperadas) {
    if (typeof window[funcao] === 'function') {
      console.log(`✅ ${funcao}: DISPONÍVEL`);
      resultados.funcoes[funcao] = 'OK';
      funcoesOK++;
    } else {
      console.log(`❌ ${funcao}: NÃO ENCONTRADA`);
      resultados.funcoes[funcao] = 'ERRO';
      funcoesERRO++;
    }
  }
  
  console.log(`\n📊 Funções: ${funcoesOK} OK, ${funcoesERRO} com problema`);
  
  // Teste 2: Verificação de dados existentes
  console.log('\n📋 2. VERIFICAÇÃO DE DADOS EXISTENTES');
  console.log('==========================================');
  
  const dadosEsperados = [
    { nome: 'contratoSource', var: 'contratoSource' },
    { nome: 'contratoAbi', var: 'contratoAbi' },
    { nome: 'contratoBytecode', var: 'contratoBytecode' },
    { nome: 'creationBytecode', var: 'creationBytecode' },
    { nome: 'runtimeBytecode', var: 'runtimeBytecode' },
    { nome: 'contratoName', var: 'contratoName' },
    { nome: 'resolvedCompilerVersion', var: 'resolvedCompilerVersion' }
  ];
  
  for (const dado of dadosEsperados) {
    const valor = window[dado.var];
    if (valor) {
      console.log(`✅ ${dado.nome}: DISPONÍVEL (${typeof valor === 'string' ? valor.length + ' chars' : typeof valor})`);
    } else {
      console.log(`⚠️ ${dado.nome}: NÃO DISPONÍVEL`);
    }
  }
  
  // Teste 3: Testes funcionais básicos
  console.log('\n🧪 3. TESTES FUNCIONAIS BÁSICOS');
  console.log('==========================================');
  
  // Teste analyzeBytecode
  try {
    if (window.analyzeBytecode) {
      const bytecodeTest = '0x608060405234801561001057600080fd5b50';
      const resultado = window.analyzeBytecode(bytecodeTest);
      console.log('✅ analyzeBytecode: FUNCIONANDO');
      resultados.testes.push({ nome: 'analyzeBytecode', status: 'OK' });
    }
  } catch (error) {
    console.log('❌ analyzeBytecode: ERRO -', error.message);
    resultados.testes.push({ nome: 'analyzeBytecode', status: 'ERRO', erro: error.message });
  }
  
  // Teste compareBytecodes
  try {
    if (window.compareBytecodes) {
      const bytecode1 = '0x608060405234801561001057600080fd5b50';
      const bytecode2 = '0x608060405234801561001057600080fd5b51';
      const resultado = window.compareBytecodes(bytecode1, bytecode2);
      console.log('✅ compareBytecodes: FUNCIONANDO');
      resultados.testes.push({ nome: 'compareBytecodes', status: 'OK' });
    }
  } catch (error) {
    console.log('❌ compareBytecodes: ERRO -', error.message);
    resultados.testes.push({ nome: 'compareBytecodes', status: 'ERRO', erro: error.message });
  }
  
  // Teste diagnóstico se houver bytecode
  try {
    if (window.diagnoseBytecode && (window.creationBytecode || window.contratoBytecode)) {
      window.diagnoseBytecode();
      console.log('✅ diagnoseBytecode: FUNCIONANDO');
      resultados.testes.push({ nome: 'diagnoseBytecode', status: 'OK' });
    } else if (window.diagnoseBytecode) {
      console.log('⚠️ diagnoseBytecode: SEM DADOS PARA TESTAR');
      resultados.testes.push({ nome: 'diagnoseBytecode', status: 'SEM_DADOS' });
    }
  } catch (error) {
    console.log('❌ diagnoseBytecode: ERRO -', error.message);
    resultados.testes.push({ nome: 'diagnoseBytecode', status: 'ERRO', erro: error.message });
  }
  
  // Teste 4: Análise da versão do compilador
  console.log('\n🔧 4. ANÁLISE DO COMPILADOR');
  console.log('==========================================');
  
  const versaoEsperada = '0.8.30';
  const versaoAtual = window.resolvedCompilerVersion || window.compilerVersion;
  
  if (versaoAtual === versaoEsperada) {
    console.log(`✅ Versão do compilador: ${versaoAtual} (CORRETO)`);
  } else {
    console.log(`⚠️ Versão do compilador: ${versaoAtual || 'Não definida'} (ESPERADO: ${versaoEsperada})`);
  }
  
  // Teste 5: Verificação de dependências externas
  console.log('\n📦 5. VERIFICAÇÃO DE DEPENDÊNCIAS');
  console.log('==========================================');
  
  const dependencias = [
    { nome: 'ethers', obj: 'ethers' },
    { nome: 'MetaMask', obj: 'ethereum' }
  ];
  
  for (const dep of dependencias) {
    if (window[dep.obj]) {
      console.log(`✅ ${dep.nome}: DISPONÍVEL`);
    } else {
      console.log(`❌ ${dep.nome}: NÃO DISPONÍVEL`);
    }
  }
  
  // Resumo final
  console.log('\n📊 RESUMO DO DIAGNÓSTICO');
  console.log('==========================================');
  
  const testesOK = resultados.testes.filter(t => t.status === 'OK').length;
  const testesERRO = resultados.testes.filter(t => t.status === 'ERRO').length;
  const testesSemDados = resultados.testes.filter(t => t.status === 'SEM_DADOS').length;
  
  console.log(`✅ Funções disponíveis: ${funcoesOK}/${funcoesEsperadas.length}`);
  console.log(`🧪 Testes funcionais: ${testesOK} OK, ${testesERRO} com erro, ${testesSemDados} sem dados`);
  
  if (funcoesERRO === 0 && testesERRO === 0) {
    console.log('🎉 SISTEMA FUNCIONANDO PERFEITAMENTE!');
    resultados.status = 'OK';
  } else if (testesERRO === 0) {
    console.log('🔧 SISTEMA OK - Algumas funções não carregadas');
    resultados.status = 'OK_COM_AVISOS';
  } else {
    console.log('⚠️ SISTEMA COM PROBLEMAS - Verificar erros acima');
    resultados.status = 'COM_PROBLEMAS';
  }
  
  // Recomendações
  console.log('\n💡 RECOMENDAÇÕES');
  console.log('==========================================');
  
  if (funcoesERRO > 0) {
    console.log('🔧 Algumas funções não foram carregadas. Verifique os scripts.');
  }
  
  if (!window.contratoSource) {
    console.log('📝 Para testes completos, compile um contrato primeiro.');
  }
  
  if (versaoAtual !== versaoEsperada) {
    console.log('🔄 Atualize a versão do compilador para 0.8.30.');
  }
  
  if (!window.ethereum) {
    console.log('🦊 Conecte o MetaMask para funcionalidades avançadas.');
  }
  
  console.log('\n✅ Diagnóstico concluído!');
  console.log('💾 Resultados salvos em window.diagnosticoResultados');
  
  // Salva resultados globalmente
  window.diagnosticoResultados = resultados;
  
  return resultados;
}

/**
 * Executa apenas teste de funções básicas
 */
function testeFuncoesSimpples() {
  console.log('🔧 TESTE SIMPLES DE FUNÇÕES');
  console.log('==========================================');
  
  const funcoes = ['analyzeBytecode', 'compareBytecodes', 'diagnoseBytecode'];
  
  for (const funcao of funcoes) {
    if (typeof window[funcao] === 'function') {
      console.log(`✅ ${funcao}: OK`);
    } else {
      console.log(`❌ ${funcao}: NÃO ENCONTRADA`);
    }
  }
}

/**
 * Executa teste com bytecode de exemplo
 */
function testeComBytecodeExemplo() {
  console.log('📝 TESTE COM BYTECODE DE EXEMPLO');
  console.log('==========================================');
  
  // Simula dados de contrato
  window.creationBytecode = '0x608060405234801561001057600080fd5b5033600073ffffffffffffffffffffffffffffffffffffffff168160008190555050600073ffffffffffffffffffffffffffffffffffffffff163373ffffffffffffffffffffffffffffffffffffffff1614151561007f57600080fd5b565b60008054905090565b';
  
  window.runtimeBytecode = '0x60806040526004361061004c576000357c010000000000000000000000000000000000000000000000000000000090048063893d20e81461005157806395d89b411461007c578063a9059cbb146100a7575b600080fd5b';
  
  window.contratoName = 'TestToken';
  window.resolvedCompilerVersion = '0.8.30';
  
  console.log('✅ Dados de exemplo criados');
  
  if (window.diagnoseBytecode) {
    window.diagnoseBytecode();
  }
  
  if (window.analyzeBytecode) {
    window.analyzeBytecode(window.creationBytecode);
  }
}

// Expõe funções globalmente
if (typeof window !== 'undefined') {
  window.diagnosticoRapido = diagnosticoRapido;
  window.testeFuncoesSimpples = testeFuncoesSimpples;
  window.testeComBytecodeExemplo = testeComBytecodeExemplo;
  
  console.log('🚀 Diagnóstico rápido carregado!');
  console.log('💡 Execute: window.diagnosticoRapido() para testar tudo');
  console.log('🔧 Execute: window.testeFuncoesSimpples() para teste básico');
  console.log('📝 Execute: window.testeComBytecodeExemplo() para teste com dados');
}
