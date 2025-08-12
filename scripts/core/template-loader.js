/**
 * ==========================================================================
 * SCCAFE TEMPLATE LOADER
 * Sistema modular para carregamento de componentes HTML
 * ==========================================================================
 */

/**
 * Sistema de carregamento de templates e componentes
 * Permite carregar componentes HTML dinamicamente e inseri-los na página
 */
class TemplateLoader {
  constructor() {
    this.loadedTemplates = new Map();
    this.componentCache = new Map();
    this.loadingPromises = new Map();
    
    // Configuração dos caminhos
    this.basePath = '';
    this.componentPaths = {
      ui: 'components/ui/',
      layout: 'components/layout/',
      core: 'components/core/',
      shared: 'components/shared/'
    };
    
    this.initializeLoader();
  }

  /**
   * Inicializa o sistema de carregamento
   */
  initializeLoader() {
    // Processa templates já presentes na página
    this.processExistingTemplates();
    
    // Configura observador para novos elementos
    this.setupMutationObserver();
    
    // Escuta eventos de carregamento de componentes
    this.setupEventListeners();
    
    console.log('🚀 Template Loader inicializado');
  }

  /**
   * Processa templates que já estão na página
   */
  processExistingTemplates() {
    const templates = document.querySelectorAll('template[id]');
    templates.forEach(template => {
      this.registerTemplate(template.id, template);
    });
  }

  /**
   * Configura observador de mutações para detectar novos componentes
   */
  setupMutationObserver() {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            this.processComponentAttributes(node);
          }
        });
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  /**
   * Configura event listeners
   */
  setupEventListeners() {
    // Escuta eventos de carregamento de componentes
    document.addEventListener('load-component', (e) => {
      this.loadComponent(e.detail.component, e.detail.target, e.detail.props);
    });

    // Escuta eventos de carregamento de layout
    document.addEventListener('load-layout', (e) => {
      this.loadLayout(e.detail.layout, e.detail.target);
    });
  }

  /**
   * Processa atributos data-component em elementos
   */
  processComponentAttributes(element) {
    // Processa o próprio elemento
    if (element.hasAttribute && element.hasAttribute('data-component')) {
      this.loadComponentFromAttribute(element);
    }

    // Processa elementos filhos
    const componentElements = element.querySelectorAll('[data-component]');
    componentElements.forEach(el => this.loadComponentFromAttribute(el));
  }

  /**
   * Carrega componente baseado em atributo data-component
   */
  async loadComponentFromAttribute(element) {
    const componentName = element.getAttribute('data-component');
    const props = this.parseComponentProps(element);
    
    try {
      await this.loadComponent(componentName, element, props);
    } catch (error) {
      console.error(`Erro ao carregar componente ${componentName}:`, error);
    }
  }

  /**
   * Faz parse das props do componente
   */
  parseComponentProps(element) {
    const props = {};
    
    // Coleta todos os atributos data-prop-*
    Array.from(element.attributes).forEach(attr => {
      if (attr.name.startsWith('data-prop-')) {
        const propName = attr.name.replace('data-prop-', '');
        props[propName] = attr.value;
      }
    });

    // Verifica se há props em JSON
    const propsJson = element.getAttribute('data-props');
    if (propsJson) {
      try {
        Object.assign(props, JSON.parse(propsJson));
      } catch (error) {
        console.warn('Props JSON inválidas:', propsJson);
      }
    }

    return props;
  }

  /**
   * Registra um template no cache
   */
  registerTemplate(name, template) {
    this.loadedTemplates.set(name, template);
  }

  /**
   * Carrega um componente
   */
  async loadComponent(componentName, targetElement, props = {}) {
    try {
      // Verifica se já está carregando
      if (this.loadingPromises.has(componentName)) {
        await this.loadingPromises.get(componentName);
      }

      // Verifica cache
      if (!this.componentCache.has(componentName)) {
        const loadPromise = this.fetchComponent(componentName);
        this.loadingPromises.set(componentName, loadPromise);
        await loadPromise;
        this.loadingPromises.delete(componentName);
      }

      const componentContent = this.componentCache.get(componentName);
      if (componentContent) {
        await this.renderComponent(componentContent, targetElement, props);
      }
    } catch (error) {
      console.error(`Erro ao carregar componente ${componentName}:`, error);
      this.showErrorComponent(targetElement, componentName, error);
    }
  }

  /**
   * Busca componente do servidor
   */
  async fetchComponent(componentName) {
    const componentPath = this.resolveComponentPath(componentName);
    
    try {
      const response = await fetch(componentPath);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const html = await response.text();
      const componentData = this.parseComponentHTML(html);
      
      this.componentCache.set(componentName, componentData);
      return componentData;
    } catch (error) {
      console.error(`Erro ao buscar componente ${componentName}:`, error);
      throw error;
    }
  }

  /**
   * Resolve o caminho do componente
   */
  resolveComponentPath(componentName) {
    // Formato: "ui/button" ou "layout/header"
    const parts = componentName.split('/');
    
    if (parts.length === 2) {
      const [category, name] = parts;
      if (this.componentPaths[category]) {
        return `${this.basePath}${this.componentPaths[category]}${name}.html`;
      }
    }
    
    // Fallback: tenta encontrar em qualquer categoria
    return `${this.basePath}components/${componentName}.html`;
  }

  /**
   * Faz parse do HTML do componente
   */
  parseComponentHTML(html) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    
    return {
      templates: this.extractTemplates(doc),
      styles: this.extractStyles(doc),
      scripts: this.extractScripts(doc),
      html: this.extractMainHTML(doc)
    };
  }

  /**
   * Extrai templates do componente
   */
  extractTemplates(doc) {
    const templates = {};
    const templateElements = doc.querySelectorAll('template[id]');
    
    templateElements.forEach(template => {
      templates[template.id] = template.innerHTML;
    });
    
    return templates;
  }

  /**
   * Extrai estilos do componente
   */
  extractStyles(doc) {
    const styles = [];
    const styleElements = doc.querySelectorAll('style');
    
    styleElements.forEach(style => {
      styles.push(style.textContent);
    });
    
    return styles;
  }

  /**
   * Extrai scripts do componente
   */
  extractScripts(doc) {
    const scripts = [];
    const scriptElements = doc.querySelectorAll('script');
    
    scriptElements.forEach(script => {
      scripts.push(script.textContent);
    });
    
    return scripts;
  }

  /**
   * Extrai HTML principal do componente
   */
  extractMainHTML(doc) {
    // Remove templates, styles e scripts
    const clone = doc.cloneNode(true);
    clone.querySelectorAll('template, style, script').forEach(el => el.remove());
    
    return clone.body.innerHTML;
  }

  /**
   * Renderiza componente no elemento alvo
   */
  async renderComponent(componentData, targetElement, props = {}) {
    // Adiciona estilos se não foram adicionados ainda
    this.addComponentStyles(componentData.styles);
    
    // Registra templates
    Object.entries(componentData.templates).forEach(([id, html]) => {
      if (!document.getElementById(id)) {
        const template = document.createElement('template');
        template.id = id;
        template.innerHTML = html;
        document.head.appendChild(template);
      }
    });
    
    // Renderiza HTML principal se disponível
    if (componentData.html.trim()) {
      const processedHTML = this.processTemplate(componentData.html, props);
      targetElement.innerHTML = processedHTML;
    }
    
    // Executa scripts
    this.executeComponentScripts(componentData.scripts);
    
    // Dispara evento de componente carregado
    targetElement.dispatchEvent(new CustomEvent('component-loaded', {
      detail: { componentData, props }
    }));
  }

  /**
   * Adiciona estilos do componente
   */
  addComponentStyles(styles) {
    styles.forEach(styleContent => {
      const existingStyle = Array.from(document.querySelectorAll('style'))
        .find(style => style.textContent.trim() === styleContent.trim());
      
      if (!existingStyle) {
        const style = document.createElement('style');
        style.textContent = styleContent;
        document.head.appendChild(style);
      }
    });
  }

  /**
   * Executa scripts do componente
   */
  executeComponentScripts(scripts) {
    scripts.forEach(scriptContent => {
      try {
        // Cria um script em contexto isolado
        const func = new Function(scriptContent);
        func();
      } catch (error) {
        console.error('Erro ao executar script do componente:', error);
      }
    });
  }

  /**
   * Processa template com props
   */
  processTemplate(html, props) {
    let processedHTML = html;
    
    // Substitui variáveis {{prop}} por valores
    Object.entries(props).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      processedHTML = processedHTML.replace(regex, value);
    });
    
    return processedHTML;
  }

  /**
   * Carrega template específico
   */
  getTemplate(templateId) {
    const template = document.getElementById(templateId);
    if (template) {
      return template.content.cloneNode(true);
    }
    
    console.warn(`Template ${templateId} não encontrado`);
    return null;
  }

  /**
   * Cria elemento a partir de template
   */
  createFromTemplate(templateId, props = {}) {
    const template = this.getTemplate(templateId);
    if (!template) return null;
    
    const element = template.firstElementChild?.cloneNode(true);
    if (element && props) {
      this.applyPropsToElement(element, props);
    }
    
    return element;
  }

  /**
   * Aplica props a um elemento
   */
  applyPropsToElement(element, props) {
    Object.entries(props).forEach(([key, value]) => {
      // Aplica a elementos com data-prop
      const propElements = element.querySelectorAll(`[data-prop="${key}"]`);
      propElements.forEach(el => {
        if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
          el.value = value;
        } else {
          el.textContent = value;
        }
      });
      
      // Aplica ao elemento raiz se tiver o atributo
      if (element.hasAttribute(`data-prop`) && element.getAttribute('data-prop') === key) {
        if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
          element.value = value;
        } else {
          element.textContent = value;
        }
      }
    });
  }

  /**
   * Carrega layout completo
   */
  async loadLayout(layoutName, targetElement) {
    try {
      await this.loadComponent(`layout/${layoutName}`, targetElement);
    } catch (error) {
      console.error(`Erro ao carregar layout ${layoutName}:`, error);
    }
  }

  /**
   * Mostra componente de erro
   */
  showErrorComponent(targetElement, componentName, error) {
    targetElement.innerHTML = `
      <div class="component-error" style="
        padding: 1rem;
        background: rgba(239, 68, 68, 0.1);
        border: 1px solid rgba(239, 68, 68, 0.2);
        border-radius: 8px;
        color: #ef4444;
        font-family: monospace;
        font-size: 0.875rem;
      ">
        <div style="font-weight: 600; margin-bottom: 0.5rem;">
          ⚠️ Erro ao carregar componente: ${componentName}
        </div>
        <div style="opacity: 0.8;">
          ${error.message}
        </div>
      </div>
    `;
  }

  /**
   * Limpa cache de componentes
   */
  clearCache() {
    this.componentCache.clear();
    this.loadedTemplates.clear();
    console.log('Cache de componentes limpo');
  }

  /**
   * Pré-carrega componentes
   */
  async preloadComponents(componentNames) {
    const promises = componentNames.map(name => this.loadComponent(name, document.createElement('div')));
    await Promise.all(promises);
    console.log(`${componentNames.length} componentes pré-carregados`);
  }

  /**
   * Obtém estatísticas do loader
   */
  getStats() {
    return {
      cachedComponents: this.componentCache.size,
      loadedTemplates: this.loadedTemplates.size,
      loadingPromises: this.loadingPromises.size
    };
  }
}

/**
 * Helper functions para uso global
 */
window.TemplateHelpers = {
  /**
   * Carrega componente em elemento
   */
  async loadComponent(componentName, selector, props = {}) {
    const element = typeof selector === 'string' ? document.querySelector(selector) : selector;
    if (element && window.templateLoader) {
      await window.templateLoader.loadComponent(componentName, element, props);
    }
  },

  /**
   * Cria elemento a partir de template
   */
  createElement(templateId, props = {}) {
    if (window.templateLoader) {
      return window.templateLoader.createFromTemplate(templateId, props);
    }
    return null;
  },

  /**
   * Obtém template
   */
  getTemplate(templateId) {
    if (window.templateLoader) {
      return window.templateLoader.getTemplate(templateId);
    }
    return null;
  }
};

// Inicializa o Template Loader quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
  window.templateLoader = new TemplateLoader();
  
  // Expõe helpers globalmente
  window.loadComponent = window.TemplateHelpers.loadComponent;
  window.createElement = window.TemplateHelpers.createElement;
  window.getTemplate = window.TemplateHelpers.getTemplate;
});

// Exporta para uso como módulo
if (typeof module !== 'undefined' && module.exports) {
  module.exports = TemplateLoader;
}

// Exporta para uso global
window.TemplateLoader = TemplateLoader;
