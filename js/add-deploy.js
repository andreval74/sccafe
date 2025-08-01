// deploy.js
// Deploy do contrato na blockchain via ethers.js + MetaMask
// v2.1.0 - Integrado com network-manager

import { marcarConcluido } from './add-utils.js';
import { contratoAbi, contratoBytecode, contratoSource, contratoName, resolvedCompilerVersion } from './add-contratos-verified.js';
import { saveDeployedContract, detectCurrentNetwork, currentNetwork } from './network-manager.js';

/**
 * Faz o deploy do contrato usando ethers.js e MetaMask.
 * @param {HTMLElement} btnDeploy
 * @param {HTMLElement} deployStatus
 */
export async function deployContrato(btnDeploy, deployStatus) {
  btnDeploy.disabled = true;
  deployStatus.textContent = "Preparando deploy...";
  
  try {
    // Detecta rede atual
    await detectCurrentNetwork();
    
    // Validações antes do deploy
    if (!contratoAbi || !contratoBytecode) {
      throw new Error("Contrato não foi compilado. Compile primeiro!");
    }

    if (!contratoSource || !contratoName) {
      throw new Error("Informações do contrato incompletas!");
    }
    
    console.log('🔍 Debug deploy:');
    console.log('ABI:', contratoAbi ? `Presente (${contratoAbi.length} funções)` : 'NULL');
    console.log('Bytecode:', contratoBytecode ? `Presente (${contratoBytecode.length} chars)` : 'NULL');
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
    const factory = new ethers.ContractFactory(contratoAbi, contratoBytecode, signer);
    
    deployStatus.textContent = "Enviando transação de deploy...";
    console.log('🚀 Enviando deploy...');
    const contract = await factory.deploy(...args);
    
    deployStatus.textContent = "Aguardando confirmação do deploy...";
    console.log('⏳ Aguardando confirmação...');
    await contract.deployTransaction.wait();
    
    console.log('✅ Deploy concluído:', contract.address);
    console.log('🌐 Rede:', currentNetwork?.name);
    console.log('🔗 Explorer:', currentNetwork?.blockExplorer ? `${currentNetwork.blockExplorer}/address/${contract.address}` : 'N/A');
    
    // Salva informações do contrato deployado para verificação
    const deployedInfo = saveDeployedContract(
      contract.address,
      contratoAbi,
      contratoBytecode,
      contratoSource,
      resolvedCompilerVersion || 'latest',
      contratoName
    );
    
    marcarConcluido(btnDeploy);
    deployStatus.innerHTML = `
      ✅ Deploy concluído!<br>
      <small>Endereço: ${contract.address}</small><br>
      <small>Rede: ${currentNetwork?.name || 'Desconhecida'}</small>
    `;
    deployStatus.style.color = '#16924b';

    // Define endereço global para retrocompatibilidade
    window.contractAddress = contract.address;
    
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