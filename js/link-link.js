import { adicionarTokenMetaMask, decodificarLinkToken, switchOrAddNetwork } from './metamask.js';

document.addEventListener('DOMContentLoaded', async function () {
  const decoded = decodificarLinkToken(window.location.search) || {};

  document.getElementById('tokenAddressText').textContent = decoded.tokenAddress || '-';
  document.getElementById('tokenNameText').textContent = decoded.tokenName || '-';
  document.getElementById('tokenSymbolText').textContent = decoded.tokenSymbol || '-';
  document.getElementById('tokenDecimalsText').textContent = decoded.tokenDecimals || '-';
  if (decoded.tokenImage) {
    document.getElementById('tokenImageText').innerHTML = `<img src="${decoded.tokenImage}" alt="Token Logo" style="max-width:32px;border-radius:6px;">`;
  } else {
    document.getElementById('tokenImageText').innerHTML = '<span class="text-muted">Não disponível</span>';
  }
  document.getElementById('tokenNetworkText').textContent = decoded.networkName || '-';

  const btnAddToken = document.getElementById('btnAddToken');
  const statusDiv = document.getElementById('status');

  btnAddToken.onclick = async function () {
    statusDiv.textContent = 'Processando...';
    btnAddToken.disabled = true;
    try {
      // Troca de rede se necessário
      if (decoded.chainId) {
        const switched = await switchOrAddNetwork(decoded);
        if (!switched) {
          statusDiv.innerHTML = '<span class="text-danger">❌ Não foi possível trocar para a rede do token.</span>';
          btnAddToken.disabled = false;
          return;
        }
      }
      // Adiciona o token
      const result = await adicionarTokenMetaMask({
        address: decoded.tokenAddress,
        symbol: decoded.tokenSymbol,
        decimals: decoded.tokenDecimals,
        image: decoded.tokenImage
      });
      if (result) {
        statusDiv.innerHTML = '<span class="text-success">✅ Token adicionado com sucesso!</span>';
      } else {
        statusDiv.innerHTML = '<span class="text-warning">⚠️ Token não foi adicionado.</span>';
      }
    } catch (e) {
      statusDiv.innerHTML = '<span class="text-danger">❌ Erro ao adicionar token.</span>';
    }
    btnAddToken.disabled = false;
  };
});