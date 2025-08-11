// salt.js
// Funções mock para busca de salt e parada da busca

/**
 * Simula a busca de um salt para endereço personalizado.
 * @param {string} targetSuffix
 * @param {HTMLInputElement} saltFound
 * @param {HTMLInputElement} predictedAddress
 */
export function buscarSaltFake(targetSuffix, saltFound, predictedAddress) {
  saltFound.value = '0xFAKE';
  predictedAddress.value = '0x1234...'+(targetSuffix || 'cafe');
  document.getElementById('salt-output').style.display = '';
  document.getElementById('salt-output').textContent = 'Busca simulada concluída!';
}

/**
 * Simula a parada da busca de salt.
 */
export function pararBuscaSalt() {
  document.getElementById('salt-output').style.display = '';
  document.getElementById('salt-output').textContent = 'Busca parada.';
}