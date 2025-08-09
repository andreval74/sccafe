// metamask.js
// Integração centralizada com MetaMask, manipulação de token e utilitários de link
// ------------------------------------------------------------
// BLOCO 1: Conexão e eventos MetaMask
/**
 * Solicita conexão com MetaMask, preenche owner em input.
 * @param {HTMLInputElement} inputOwner 
 */
export async function connectMetaMask(inputOwner) {
  if (!window.ethereum) {
    alert("MetaMask não encontrada. Instale a extensão MetaMask no seu navegador!");
    return;
  }
  try {
    const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
    const chainId = await window.ethereum.request({ method: 'eth_chainId' });
    const owner = accounts[0] || "";
    if (inputOwner) {
      inputOwner.value = owner;
      inputOwner.readOnly = false;
      inputOwner.style.background = "#e9f7ef";
    }
    // A detecção de rede é feita pelo network-manager
    
    const btn = document.getElementById('connect-metamask-btn');
    if (btn) btn.style.display = "none";
    const info = document.getElementById('connected-wallet-info');
    if (info) info.style.display = "";
  } catch (err) {
    alert("Erro ao conectar MetaMask: " + (err && err.message ? err.message : err));
  }
}

/**
 * Monitora eventos de troca de conta e rede do MetaMask.
 * Atualiza o input de owner em tempo real.
 * NOTA: Esta função não é mais usada - listeners centralizados no wallet-connection.js
 */
export function listenMetaMask(inputOwner) {
  console.log('⚠️ listenMetaMask é depreciada - listeners centralizados no wallet-connection.js');
  // Função mantida para compatibilidade, mas não faz nada
  // Os listeners estão centralizados no setupGlobalListeners() do wallet-connection.js
}

// ------------------------------------------------------------
// BLOCO 2: Adicionar token ao MetaMask
/**
 * Adiciona o token ao MetaMask do usuário
 * @param {Object} tokenData - { address, symbol, decimals, image }
 * @returns {Promise<boolean>}
 */
export async function adicionarTokenMetaMask({ address, symbol, decimals, image }) {
  if (!window.ethereum) {
    alert("MetaMask não encontrada. Instale a extensão MetaMask no seu navegador!");
    return false;
  }
  try {
    const wasAdded = await window.ethereum.request({
      method: 'wallet_watchAsset',
      params: {
        type: 'ERC20',
        options: {
          address,
          symbol,
          decimals: Number(decimals),
          image: image || undefined
        }
      }
    });
    if (wasAdded) {
      alert('Token adicionado ao MetaMask!');
    } else {
      alert('Token não foi adicionado ao MetaMask.');
    }
    return wasAdded;
  } catch (error) {
    alert('Erro ao adicionar token ao MetaMask: ' + (error && error.message ? error.message : error));
    return false;
  }
}

// ------------------------------------------------------------
// BLOCO 3: Utilitários para geração e decodificação de link de token
/**
 * Gera um link de compartilhamento para adicionar token
 * @param {Object} tokenData - dados do token e rede
 * @returns {string} - link pronto para compartilhar
 */
export function gerarLinkToken(tokenData) {
  // Garante compatibilidade com addtoken-link.html
  const compatData = {
    tokenAddress: tokenData.address || tokenData.tokenAddress || '',
    tokenSymbol: tokenData.symbol || tokenData.tokenSymbol || '',
    tokenName: tokenData.name || tokenData.tokenName || '',
    tokenDecimals: tokenData.decimals || tokenData.tokenDecimals || 18,
    tokenImage: tokenData.image || tokenData.tokenImage || '',
    chainId: tokenData.chainId || '',
    networkName: tokenData.networkName || tokenData.chainName || '',
    rpcUrl: tokenData.rpcUrl || '',
    blockExplorer: tokenData.blockExplorer || '',
    nativeCurrency: tokenData.nativeCurrency || '',
    nativeDecimals: tokenData.nativeDecimals || 18
  };
  const encoded = btoa(JSON.stringify(compatData));
  const baseUrl = window.location.origin + window.location.pathname.replace(/[^\/]*$/, 'addtoken-link.html');
  return `${baseUrl}?data=${encoded}`;
}

/**
 * Decodifica os dados do token a partir do link
 * @param {string} search - window.location.search
 * @returns {Object|null}
 */
export function decodificarLinkToken(search) {
  const params = new URLSearchParams(search);
  let encodedData = params.get('data');
  if (!encodedData) return null;
  if (encodedData.includes('=')) encodedData = encodedData.split('=')[0];
  try {
    return JSON.parse(atob(encodedData));
  } catch {
    return null;
  }
}

// ------------------------------------------------------------
// BLOCO 4: Utilitário para montar objeto de dados do token
/**
 * Monta objeto de dados do token para MetaMask/link
 * @param {Object} campos - campos do formulário ou deploy
 * @returns {Object}
 */
export function montarTokenData(campos) {
  return {
    address: campos.address || campos.tokenAddress || '',
    symbol: campos.symbol || campos.tokenSymbol || '',
    decimals: campos.decimals || campos.tokenDecimals || 18,
    image: campos.image || campos.tokenImage || '',
    name: campos.name || campos.tokenName || '',
    chainId: campos.chainId || '',
    chainName: campos.chainName || '',
    rpcUrl: campos.rpcUrl || '',
    blockExplorer: campos.blockExplorer || '',
    nativeCurrency: campos.nativeCurrency || '',
    nativeDecimals: campos.nativeDecimals || 18,
    networkName: campos.networkName || ''
  };
}

// ------------------------------------------------------------
// BLOCO 5: (Opcional) Função para trocar/adicionar rede automaticamente
/**
 * Tenta trocar para a rede correta no MetaMask, ou adiciona se não existir
 * @param {Object} tokenData
 * @returns {Promise<boolean>}
 */
export async function switchOrAddNetwork(tokenData) {
  if (!window.ethereum || !tokenData.chainId) return false;
  try {
    const currentChainId = await window.ethereum.request({ method: 'eth_chainId' });
    const expectedChainIdDec = parseInt(tokenData.chainId);
    const currentChainIdDec = parseInt(currentChainId, 16);
    if (currentChainIdDec === expectedChainIdDec) return true;
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0x' + expectedChainIdDec.toString(16) }]
      });
      return true;
    } catch (switchError) {
      if (switchError.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: '0x' + expectedChainIdDec.toString(16),
              chainName: tokenData.networkName || tokenData.chainName,
              rpcUrls: [tokenData.rpcUrl],
              blockExplorerUrls: [tokenData.blockExplorer],
              nativeCurrency: {
                name: tokenData.nativeCurrency,
                symbol: tokenData.nativeCurrency,
                decimals: parseInt(tokenData.nativeDecimals) || 18
              }
            }]
          });
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: '0x' + expectedChainIdDec.toString(16) }]
          });
          return true;
        } catch (addError) {
          return false;
        }
      } else {
        return false;
      }
    }
  } catch {
    return false;
  }
}

// ------------------------------------------------------------
// FIM DO ARQUIVO CENTRALIZADO DE INTEGRAÇÃO METAMASK E TOKEN