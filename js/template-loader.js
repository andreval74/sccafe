/**
 * Template Loader - Sistema simples de carregamento de componentes
 */

class TemplateLoader {
    constructor() {
        this.loadedComponents = new Map();
    }

    async init() {
        console.log('🚀 Iniciando Template Loader...');
        try {
            await this.loadAllComponents();
            console.log('✅ Template Loader inicializado');
        } catch (error) {
            console.error('❌ Erro no Template Loader:', error);
        }
    }

    async loadAllComponents() {
        const components = document.querySelectorAll('[data-component]');
        console.log(`📦 Encontrados ${components.length} componentes para carregar`);
        
        for (const element of components) {
            await this.loadComponent(element);
        }
    }

    async loadComponent(element) {
        const componentName = element.getAttribute('data-component');
        console.log(`🔄 Carregando componente: ${componentName}`);
        
        try {
            const response = await fetch(`${componentName}.html`);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const html = await response.text();
            const content = this.extractBodyContent(html);
            element.innerHTML = content;
            
            console.log(`✅ Componente ${componentName} carregado`);
        } catch (error) {
            console.error(`❌ Erro ao carregar ${componentName}:`, error);
            element.innerHTML = `<div style="color: red; padding: 20px;">❌ Erro ao carregar ${componentName}</div>`;
        }
    }

    extractBodyContent(html) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        return doc.body.innerHTML || html;
    }
}

// Inicialização automática
const templateLoader = new TemplateLoader();

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => templateLoader.init());
} else {
    templateLoader.init();
}

window.templateLoader = templateLoader;
