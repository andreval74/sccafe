// Interface de Verificação - Sistema visual para verificação de contratos
// Versão 2.1.0 - Interface amigável para usuários não-técnicos

import { getVerificationData, autoVerifyContract, currentNetwork, deployedContract } from './network-manager.js';

/**
 * Cria interface visual para verificação do contrato
 */
export function showVerificationInterface() {
  const verificationData = getVerificationData();
  
  if (!verificationData) {
    alert('❌ Nenhum contrato deployado encontrado!');
    return;
  }

  // Remove modal existente se houver
  const existingModal = document.getElementById('verification-modal');
  if (existingModal) {
    existingModal.remove();
  }

  // Cria modal
  const modal = document.createElement('div');
  modal.id = 'verification-modal';
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0,0,0,0.7);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 10000;
  `;

  const modalContent = document.createElement('div');
  modalContent.style.cssText = `
    background: white;
    padding: 30px;
    border-radius: 15px;
    max-width: 800px;
    max-height: 90vh;
    overflow-y: auto;
    box-shadow: 0 10px 30px rgba(0,0,0,0.3);
  `;

  modalContent.innerHTML = `
    <div style="text-align: center; margin-bottom: 20px;">
      <h2 style="color: #333; margin: 0;">🔍 Verificação do Contrato</h2>
      <p style="color: #666; margin: 10px 0;">Contrato deployado na <strong>${verificationData.networkName}</strong></p>
      <p style="color: #888; font-size: 14px;">Endereço: ${verificationData.contractAddress}</p>
    </div>

    <div id="verification-status" style="margin: 20px 0; padding: 15px; border-radius: 8px; display: none;">
    </div>

    <div style="display: grid; gap: 15px;">
      
      <!-- Verificação Automática -->
      <div style="border: 2px solid #16924b; border-radius: 10px; padding: 20px; background: #f0fdf4;">
        <h3 style="color: #16924b; margin: 0 0 10px 0;">🚀 Opção 1: Verificação Automática</h3>
        <p style="margin: 10px 0; color: #333;">A forma mais fácil! Tentamos verificar automaticamente para você.</p>
        <button id="auto-verify-btn" style="
          background: #16924b; 
          color: white; 
          padding: 12px 24px; 
          border: none; 
          border-radius: 8px; 
          cursor: pointer; 
          font-size: 16px;
          font-weight: bold;
        ">
          ✨ Verificar Automaticamente
        </button>
        <p style="font-size: 12px; color: #666; margin-top: 10px;">
          ⚠️ Funciona na maioria das redes populares
        </p>
      </div>

      <!-- Verificação Manual -->
      <div style="border: 2px solid #f59e0b; border-radius: 10px; padding: 20px; background: #fffbeb;">
        <h3 style="color: #f59e0b; margin: 0 0 10px 0;">📋 Opção 2: Verificação Manual</h3>
        <p style="margin: 10px 0; color: #333;">Se a automática não funcionar, aqui estão os dados prontos para copiar:</p>
        
        <div style="display: grid; gap: 10px; margin: 15px 0;">
          
          <div style="background: #f9f9f9; padding: 10px; border-radius: 5px;">
            <strong>🏷️ Nome do Contrato:</strong>
            <div style="background: white; padding: 8px; margin-top: 5px; border-radius: 3px; font-family: monospace; word-break: break-all;">
              ${verificationData.contractName}
            </div>
            <button onclick="copyToClipboard('${verificationData.contractName}')" style="background: #6b7280; color: white; border: none; padding: 5px 10px; border-radius: 3px; margin-top: 5px; cursor: pointer;">Copiar</button>
          </div>

          <div style="background: #f9f9f9; padding: 10px; border-radius: 5px;">
            <strong>⚙️ Versão do Compilador:</strong>
            <div style="background: white; padding: 8px; margin-top: 5px; border-radius: 3px; font-family: monospace;">
              ${verificationData.compilerVersion}
            </div>
            <button onclick="copyToClipboard('${verificationData.compilerVersion}')" style="background: #6b7280; color: white; border: none; padding: 5px 10px; border-radius: 3px; margin-top: 5px; cursor: pointer;">Copiar</button>
          </div>

          <div style="background: #f9f9f9; padding: 10px; border-radius: 5px;">
            <strong>🔧 Configurações:</strong>
            <div style="background: white; padding: 8px; margin-top: 5px; border-radius: 3px; font-family: monospace;">
              Optimization: ${verificationData.optimization}<br>
              Runs: ${verificationData.runs}
            </div>
          </div>

          <div style="background: #f9f9f9; padding: 10px; border-radius: 5px;">
            <strong>📄 Código Fonte:</strong>
            <div style="background: white; padding: 8px; margin-top: 5px; border-radius: 3px; max-height: 150px; overflow-y: auto; font-family: monospace; font-size: 12px; line-height: 1.4;">
              ${verificationData.sourceCode.substring(0, 500)}...
            </div>
            <button id="copy-source-btn" style="background: #6b7280; color: white; border: none; padding: 5px 10px; border-radius: 3px; margin-top: 5px; cursor: pointer;">Copiar Código Completo</button>
          </div>

        </div>

        ${verificationData.verificationUrl ? `
          <div style="text-align: center; margin-top: 15px;">
            <a href="${verificationData.verificationUrl}" target="_blank" style="
              background: #f59e0b; 
              color: white; 
              padding: 12px 24px; 
              text-decoration: none; 
              border-radius: 8px; 
              font-weight: bold;
              display: inline-block;
            ">
              🔗 Ir para Página de Verificação
            </a>
          </div>
        ` : ''}
      </div>

      <!-- Como Verificar Manualmente -->
      <div style="border: 2px solid #6366f1; border-radius: 10px; padding: 20px; background: #f8faff;">
        <h3 style="color: #6366f1; margin: 0 0 10px 0;">📖 Como Verificar Manualmente</h3>
        <ol style="color: #333; line-height: 1.6;">
          <li>Clique em "🔗 Ir para Página de Verificação" acima</li>
          <li>Selecione <strong>"Solidity (Single file)"</strong></li>
          <li>Cole o <strong>Nome do Contrato</strong> copiado acima</li>
          <li>Selecione a <strong>Versão do Compilador</strong> copiada acima</li>
          <li>Deixe <strong>Optimization: No</strong></li>
          <li>Cole o <strong>Código Fonte</strong> completo</li>
          <li>Clique em <strong>"Verify and Publish"</strong></li>
        </ol>
      </div>

    </div>

    <div style="text-align: center; margin-top: 20px;">
      <button id="close-modal-btn" style="
        background: #6b7280; 
        color: white; 
        padding: 10px 20px; 
        border: none; 
        border-radius: 8px; 
        cursor: pointer;
      ">
        Fechar
      </button>
    </div>
  `;

  modal.appendChild(modalContent);
  document.body.appendChild(modal);

  // Event listeners
  setupModalEventListeners(modal, verificationData);
}

/**
 * Configura event listeners do modal
 */
function setupModalEventListeners(modal, verificationData) {
  // Fechar modal
  const closeBtn = modal.querySelector('#close-modal-btn');
  closeBtn.addEventListener('click', () => modal.remove());
  
  // Fechar clicando fora
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.remove();
  });

  // Verificação automática
  const autoVerifyBtn = modal.querySelector('#auto-verify-btn');
  autoVerifyBtn.addEventListener('click', async () => {
    const statusDiv = modal.querySelector('#verification-status');
    
    autoVerifyBtn.disabled = true;
    autoVerifyBtn.textContent = '⏳ Verificando...';
    
    statusDiv.style.display = 'block';
    statusDiv.style.background = '#fef3c7';
    statusDiv.style.color = '#92400e';
    statusDiv.innerHTML = '⏳ Enviando verificação automática...';

    try {
      const result = await autoVerifyContract();
      
      if (result.success) {
        statusDiv.style.background = '#d1fae5';
        statusDiv.style.color = '#065f46';
        statusDiv.innerHTML = `✅ ${result.message}<br><small>GUID: ${result.guid || 'N/A'}</small>`;
        
        autoVerifyBtn.textContent = '✅ Verificação Enviada!';
        autoVerifyBtn.style.background = '#16924b';
      } else {
        throw new Error(result.reason);
      }
    } catch (error) {
      statusDiv.style.background = '#fecaca';
      statusDiv.style.color = '#b91c1c';
      statusDiv.innerHTML = `❌ Verificação automática falhou: ${error.message}<br><small>Use a verificação manual abaixo.</small>`;
      
      autoVerifyBtn.textContent = '❌ Falhou - Tente Manual';
      autoVerifyBtn.style.background = '#dc2626';
      autoVerifyBtn.disabled = false;
    }
  });

  // Copiar código fonte completo
  const copySourceBtn = modal.querySelector('#copy-source-btn');
  copySourceBtn.addEventListener('click', () => {
    copyToClipboard(verificationData.sourceCode);
    copySourceBtn.textContent = '✅ Copiado!';
    setTimeout(() => {
      copySourceBtn.textContent = 'Copiar Código Completo';
    }, 2000);
  });

  // Adiciona função global para copiar
  window.copyToClipboard = function(text) {
    navigator.clipboard.writeText(text).then(() => {
      console.log('📋 Texto copiado:', text.substring(0, 50) + '...');
    }).catch(err => {
      console.error('❌ Erro ao copiar:', err);
      
      // Fallback para browsers antigos
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
    });
  };
}

/**
 * Mostra apenas se o contrato foi deployado
 */
export function showVerificationIfDeployed() {
  if (deployedContract && deployedContract.address) {
    console.log('✅ Contrato deployado detectado - mostrando verificação');
    showVerificationInterface();
  } else {
    alert('⚠️ Faça o deploy do contrato primeiro!');
  }
}
