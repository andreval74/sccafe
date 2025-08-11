// deploy.js
// Deploy do contrato na blockchain via ethers.js + MetaMask
// v2.1.0 - Integrado com network-manager

import { marcarConcluido } from './add-utils.js';
import { contratoAbi, contratoBytecode, contratoSource, contratoName, resolvedCompilerVersion } from './add-contratos-verified.js';
import { saveDeployedContract, detectCurrentNetwork, currentNetwork } from './network-manager.js';

// Debug function para verificar estado da compilação
function debugCompilationState() {
  console.log('🔍 [DEPLOY DEBUG] Estado da compilação:');
  console.log('- Variáveis do módulo:', {
    contratoAbi: contratoAbi ? `${contratoAbi.length} funções` : 'NULL',
    contratoBytecode: contratoBytecode ? `${contratoBytecode.length} chars` : 'NULL',
    contratoName: contratoName || 'NULL',
    contratoSource: contratoSource ? `${contratoSource.length} chars` : 'NULL'
  });
  console.log('- Variáveis window:', {
    contratoAbi: window.contratoAbi ? `${window.contratoAbi.length} funções` : 'NULL',
    contratoBytecode: window.contratoBytecode ? `${window.contratoBytecode.length} chars` : 'NULL',
    contratoName: window.contratoName || 'NULL',
    contratoSource: window.contratoSource ? `${window.contratoSource.length} chars` : 'NULL'
  });
  console.log('- Module data:', window.moduleContractData || 'NULL');
}

/**
 * Faz o deploy do contrato usando ethers.js e MetaMask.
 * @param {HTMLElement} btnDeploy
 * @param {HTMLElement} deployStatus
 */
export async function deployContrato(btnDeploy, deployStatus) {
  btnDeploy.disabled = true;
  deployStatus.textContent = "Preparando deploy...";
  
  // Debug inicial
  debugCompilationState();
  
  try {
    // Detecta rede atual
    await detectCurrentNetwork();
    
    // Busca dados da compilação de múltiplas fontes (prioriza window)
    let abi = contratoAbi || window.contratoAbi || window.moduleContractData?.contratoAbi;
    let bytecode = contratoBytecode || window.contratoBytecode || window.moduleContractData?.contratoBytecode;
    let contractName = contratoName || window.contratoName || window.moduleContractData?.contratoName;
    let source = contratoSource || window.contratoSource || window.moduleContractData?.contratoSource;
    
    console.log('🔍 Debug dados de compilação para deploy:');
    console.log('- ABI módulo:', contratoAbi ? 'OK' : 'NULL');
    console.log('- ABI window:', window.contratoAbi ? 'OK' : 'NULL');
    console.log('- ABI moduleData:', window.moduleContractData?.contratoAbi ? 'OK' : 'NULL');
    console.log('- Bytecode módulo:', contratoBytecode ? 'OK' : 'NULL');
    console.log('- Bytecode window:', window.contratoBytecode ? 'OK' : 'NULL');
    console.log('- Bytecode moduleData:', window.moduleContractData?.contratoBytecode ? 'OK' : 'NULL');
    console.log('- ABI final:', abi ? `${abi.length} funções` : 'NULL');
    console.log('- Bytecode final:', bytecode ? `${bytecode.length} chars` : 'NULL');
    
    // Validações antes do deploy
    if (!abi || !bytecode) {
      throw new Error("Contrato não foi compilado. Compile primeiro!");
    }

    if (!source || !contractName) {
      throw new Error("Informações do contrato incompletas!");
    }
    
    console.log('🔍 Debug deploy:');
    console.log('ABI:', abi ? `Presente (${abi.length} funções)` : 'NULL');
    console.log('Bytecode:', bytecode ? `Presente (${bytecode.length} chars)` : 'NULL');
    console.log('Contract Name:', contractName);
    console.log('Rede:', currentNetwork ? currentNetwork.name : 'Não detectada');
    console.log('Compiler Version:', resolvedCompilerVersion || 'Não disponível');
    
    if (!window.ethereum) throw new Error("MetaMask não encontrada");
    
    deployStatus.textContent = "Conectando com MetaMask...";
    await window.ethereum.request({ method: 'eth_requestAccounts' });
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const signer = provider.getSigner();

    // Adapte conforme construtor do seu contrato
    let args = [];
    
    deployStatus.textContent = `Criando contrato na ${currentNetwork?.name || 'rede atual'}...`;
    console.log('🏭 Criando ContractFactory...');
    const factory = new ethers.ContractFactory(abi, bytecode, signer);
    
    deployStatus.textContent = "Enviando transação de deploy...";
    console.log('🚀 Enviando deploy...');
    const contract = await factory.deploy(...args);
    
    deployStatus.textContent = "Aguardando confirmação do deploy...";
    console.log('⏳ Aguardando confirmação...');
    await contract.deployTransaction.wait();
    
    console.log('✅ Deploy concluído:', contract.address);
    console.log('🌐 Rede:', currentNetwork?.name);
    console.log('🔗 Explorer:', currentNetwork?.blockExplorer ? `${currentNetwork.blockExplorer}/address/${contract.address}` : 'N/A');
    
    // CORREÇÃO: Busca o bytecode real do contrato deployado para verificação
    try {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const deployedBytecode = await provider.getCode(contract.address);
      
      console.log('🔍 COMPARAÇÃO DE BYTECODES:');
      console.log('📝 Bytecode usado no deploy (creation):', bytecode.substring(0, 100) + '...');
      console.log('📝 Bytecode real deployado (runtime):', deployedBytecode.substring(0, 100) + '...');
      console.log('📊 Tamanhos:');
      console.log('  - Creation bytecode:', bytecode.length);
      console.log('  - Deployed bytecode:', deployedBytecode.length);
      console.log('🎯 Para verificação, use o deployed bytecode!');
      
      // Salva o bytecode real para verificação
      localStorage.setItem('deployedBytecode', deployedBytecode);
      window.deployedBytecode = deployedBytecode;
      
    } catch (error) {
      console.warn('⚠️ Não foi possível buscar bytecode deployado:', error.message);
    }
    
    // Salva informações do contrato deployado para verificação
    const deployedInfo = saveDeployedContract(
      contract.address,
      abi,
      bytecode,
      source,
      resolvedCompilerVersion || 'latest',
      contractName
    );
    
    marcarConcluido(btnDeploy);
    deployStatus.innerHTML = `
      ✅ Deploy concluído!<br>
      <small>Endereço: ${contract.address}</small><br>
      <small>Rede: ${currentNetwork?.name || 'Desconhecida'}</small><br>
      <button class="btn btn-success btn-sm mt-2" onclick="irParaVerificacao()">
        📋 Ver Código para Verificação
      </button>
    `;
    deployStatus.style.color = '#16924b';

    // Define endereço global para retrocompatibilidade
    window.contractAddress = contract.address;
    
    // Salva dados para verificação no localStorage - INCLUINDO AMBOS OS BYTECODES
    localStorage.setItem('tokenAddress', contract.address);
    localStorage.setItem('contratoSource', source);
    localStorage.setItem('contratoBytecode', bytecode); // Creation bytecode (usado para deploy)
    localStorage.setItem('resolvedCompilerVersion', resolvedCompilerVersion || '0.8.30');
    
    // Salva bytecodes específicos se disponíveis
    if (window.creationBytecode) {
      localStorage.setItem('creationBytecode', window.creationBytecode);
    }
    if (window.runtimeBytecode) {
      localStorage.setItem('runtimeBytecode', window.runtimeBytecode);
    }
    
    // Debug - verifica se foi salvo corretamente
    console.log('💾 Dados salvos no localStorage:');
    console.log('- tokenAddress:', localStorage.getItem('tokenAddress'));
    console.log('- contratoSource:', localStorage.getItem('contratoSource') ? `${localStorage.getItem('contratoSource').length} chars` : 'ERRO: VAZIO');
    console.log('- contratoBytecode (creation):', localStorage.getItem('contratoBytecode') ? `${localStorage.getItem('contratoBytecode').length} chars` : 'ERRO: VAZIO');
    console.log('- runtimeBytecode:', localStorage.getItem('runtimeBytecode') ? `${localStorage.getItem('runtimeBytecode').length} chars` : 'Não disponível');
    console.log('- resolvedCompilerVersion:', localStorage.getItem('resolvedCompilerVersion'));
    
    if (!localStorage.getItem('contratoSource')) {
        console.error('❌ ERRO: contratoSource não foi salvo no localStorage!');
        console.log('- source original era:', source ? `${source.length} chars` : 'VAZIO');
    }
    
    if (!localStorage.getItem('contratoBytecode')) {
        console.error('❌ ERRO: contratoBytecode não foi salvo no localStorage!');
        console.log('- bytecode original era:', bytecode ? `${bytecode.length} chars` : 'VAZIO');
    }
    
    // Função global para redirecionar para verificação
    window.irParaVerificacao = function() {
      const params = new URLSearchParams({
        address: contract.address,
        name: contractName || 'Token',
        symbol: 'TKN',
        decimals: '18',
        network: currentNetwork?.name || 'BSC'
      });
      
      window.open(`add-token.html?${params.toString()}`, '_blank');
    };
    
    // Habilita próximo passo se existir
    if (document.getElementById('next-step-4')) {
      document.getElementById('next-step-4').style.display = "inline-block";
    }

    // Habilita botão de verificação após deploy
    const verificationBtn = document.getElementById('btn-verification-info');
    if (verificationBtn) {
      verificationBtn.style.display = 'inline-block';
      verificationBtn.disabled = false;
      verificationBtn.textContent = '🔍 Verificar Contrato';
    }

    // Dispara evento personalizado para notificar outros componentes
    window.dispatchEvent(new CustomEvent('contractDeployed', { 
      detail: deployedInfo 
    }));

    return contract.address;
    
  } catch (error) {
    console.error('❌ Erro no deploy:', error);
    deployStatus.textContent = "❌ " + error.message;
    deployStatus.style.color = '#b91c1c';
    btnDeploy.disabled = false;
    throw error;
  }
}