// template-loader.js - Utilitário para carregar templates HTML
// v1.0.0 - Separação de HTML e JS para melhor manutenção

/**
 * Cache de templates carregados
 */
const templateCache = new Map();

/**
 * Carrega um template HTML do servidor
 * @param {string} templateName - Nome do template (sem extensão)
 * @returns {Promise<string>} - Conteúdo HTML do template
 */
export async function loadTemplate(templateName) {
  // Verifica se já está no cache
  if (templateCache.has(templateName)) {
    return templateCache.get(templateName);
  }
  
  try {
    const response = await fetch(`./templates/${templateName}.html`);
    if (!response.ok) {
      throw new Error(`Template não encontrado: ${templateName}`);
    }
    
    const html = await response.text();
    
    // Armazena no cache
    templateCache.set(templateName, html);
    
    console.log(`✅ [TEMPLATE] Template "${templateName}" carregado com sucesso`);
    return html;
    
  } catch (error) {
    console.error(`❌ [TEMPLATE] Erro ao carregar template "${templateName}":`, error);
    throw error;
  }
}

/**
 * Carrega e injeta um template em um elemento
 * @param {string} templateName - Nome do template
 * @param {HTMLElement|string} targetElement - Elemento ou seletor onde injetar
 * @returns {Promise<HTMLElement>} - Elemento onde foi injetado
 */
export async function injectTemplate(templateName, targetElement) {
  const html = await loadTemplate(templateName);
  
  // Resolve o elemento se for string
  const element = typeof targetElement === 'string' 
    ? document.querySelector(targetElement) 
    : targetElement;
    
  if (!element) {
    throw new Error(`Elemento não encontrado: ${targetElement}`);
  }
  
  element.innerHTML = html;
  console.log(`✅ [TEMPLATE] Template "${templateName}" injetado em ${element.id || element.className}`);
  
  return element;
}

/**
 * Preenche um template com dados
 * @param {string} templateName - Nome do template
 * @param {Object} data - Dados para preencher
 * @param {HTMLElement|string} targetElement - Onde injetar
 * @returns {Promise<HTMLElement>} - Elemento preenchido
 */
export async function fillTemplate(templateName, data, targetElement) {
  await injectTemplate(templateName, targetElement);
  
  // Preenche os campos com os dados
  Object.entries(data).forEach(([key, value]) => {
    const element = document.getElementById(key);
    if (element) {
      if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
        element.value = value;
      } else {
        element.textContent = value;
      }
    }
  });
  
  console.log(`✅ [TEMPLATE] Template "${templateName}" preenchido com dados`);
  return targetElement;
}

/**
 * Limpa o cache de templates (útil para desenvolvimento)
 */
export function clearTemplateCache() {
  templateCache.clear();
  console.log('🧹 [TEMPLATE] Cache de templates limpo');
}

/**
 * Pré-carrega templates comuns para melhor performance
 */
export async function preloadTemplates() {
  const commonTemplates = [
    'resumo-template',
    'verificacao-manual-template'
  ];
  
  console.log('⏳ [TEMPLATE] Pré-carregando templates comuns...');
  
  try {
    await Promise.all(
      commonTemplates.map(template => loadTemplate(template))
    );
    console.log('✅ [TEMPLATE] Templates pré-carregados com sucesso');
  } catch (error) {
    console.warn('⚠️ [TEMPLATE] Erro no pré-carregamento de templates:', error);
  }
}
