// utils.js
// Funções utilitárias e helpers para todo o projeto

/**
 * Marca um botão como concluído visualmente.
 * @param {HTMLElement} btn - Botão a ser marcado.
 */
export function marcarConcluido(btn) {
  btn.disabled = true;
  btn.classList.add('done');
  if (!btn.textContent.includes('✔️')) btn.textContent = `✔️ ${btn.textContent}`;
}

/**
 * Valida um endereço Ethereum pelo checksum.
 * @param {string} address 
 * @returns {boolean}
 */
export function isValidAddress(address) {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

/**
 * Remove marcação de erro de campos
 * @param {HTMLElement[]} fields
 */
export function clearErrors(fields) {
  fields.forEach(field => field.classList.remove('error'));
}

/**
 * Marca campos obrigatórios que estão vazios.
 * @param {HTMLElement[]} fields
 */
export function markErrors(fields) {
  fields.forEach(field => {
    if (!field.value) field.classList.add('error');
  });
}