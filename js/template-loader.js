/**
 * Template Loader - Sistema de carregamento de componentes
 * Carrega header, footer e outros componentes dinamicamente
 */

class TemplateLoader {
    constructor() {
        this.loadedComponents = new Map();
        this.loadingPromises = new Map();
    }

    /**
     * Inicializa o carregamento de todos os componentes na página
     */
    async init() {
        try {
            await this.loadAllComponents();
            this.setupEventListeners();
            console.log('✅ Template Loader inicializado com sucesso');
        } catch (error) {
            console.error('❌ Erro ao inicializar Template Loader:', error);
        }
    }

    /**
     * Carrega todos os componentes encontrados na página
     */
    async loadAllComponents() {
        const components = document.querySelectorAll('[data-component]');
        const loadPromises = Array.from(components).map(element => 
            this.loadComponent(element)
        );
        
        await Promise.all(loadPromises);
    }

    /**
     * Carrega um componente específico
     */
    async loadComponent(element) {
        const componentName = element.getAttribute('data-component');
        
        if (!componentName) {
            console.warn('Elemento sem data-component encontrado:', element);
            return;
        }

        try {
            // Verifica se já está carregando este componente
            if (this.loadingPromises.has(componentName)) {
                const content = await this.loadingPromises.get(componentName);
                this.insertContent(element, content);
                return;
            }

            // Inicia o carregamento
            const loadPromise = this.fetchComponent(componentName);
            this.loadingPromises.set(componentName, loadPromise);

            const content = await loadPromise;
            this.loadedComponents.set(componentName, content);
            this.insertContent(element, content);

            console.log(`✅ Componente ${componentName} carregado`);
        } catch (error) {
            console.error(`❌ Erro ao carregar componente ${componentName}:`, error);
            this.insertErrorContent(element, componentName);
        }
    }

    /**
     * Busca o conteúdo do componente
     */
    async fetchComponent(componentName) {
        // Verifica se já está em cache
        if (this.loadedComponents.has(componentName)) {
            return this.loadedComponents.get(componentName);
        }

        const componentPath = `${componentName}.html`;
        
        const response = await fetch(componentPath);
        
        if (!response.ok) {
            throw new Error(`Erro ${response.status}: ${response.statusText}`);
        }

        const content = await response.text();
        return this.extractBodyContent(content);
    }

    /**
     * Extrai apenas o conteúdo do body do HTML carregado
     */
    extractBodyContent(html) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const bodyContent = doc.body.innerHTML;
        
        return bodyContent || html;
    }

    /**
     * Insere o conteúdo no elemento
     */
    insertContent(element, content) {
        element.innerHTML = content;
        
        // Executa scripts inline se houver
        this.executeScripts(element);
        
        // Dispara evento de componente carregado
        const event = new CustomEvent('componentLoaded', {
            detail: { 
                element, 
                component: element.getAttribute('data-component') 
            }
        });
        document.dispatchEvent(event);
    }

    /**
     * Insere conteúdo de erro
     */
    insertErrorContent(element, componentName) {
        element.innerHTML = `
            <div class="component-error">
                <p>⚠️ Erro ao carregar ${componentName}</p>
                <button onclick="templateLoader.retryComponent('${componentName}')">
                    Tentar novamente
                </button>
            </div>
        `;
    }

    /**
     * Executa scripts encontrados no componente carregado
     */
    executeScripts(container) {
        const scripts = container.querySelectorAll('script');
        scripts.forEach(oldScript => {
            const newScript = document.createElement('script');
            
            if (oldScript.src) {
                newScript.src = oldScript.src;
            } else {
                newScript.textContent = oldScript.textContent;
            }
            
            // Copia atributos
            Array.from(oldScript.attributes).forEach(attr => {
                if (attr.name !== 'src') {
                    newScript.setAttribute(attr.name, attr.value);
                }
            });
            
            oldScript.parentNode.replaceChild(newScript, oldScript);
        });
    }

    /**
     * Recarrega um componente específico
     */
    async retryComponent(componentName) {
        const elements = document.querySelectorAll(`[data-component="${componentName}"]`);
        
        // Remove do cache
        this.loadedComponents.delete(componentName);
        this.loadingPromises.delete(componentName);
        
        // Recarrega todos os elementos deste componente
        const retryPromises = Array.from(elements).map(element => 
            this.loadComponent(element)
        );
        
        await Promise.all(retryPromises);
    }

    /**
     * Configura event listeners
     */
    setupEventListeners() {
        // Listener para componentes carregados dinamicamente
        document.addEventListener('componentLoaded', (event) => {
            const { element, component } = event.detail;
            
            // Configurações específicas por componente
            switch (component) {
                case 'header':
                    this.setupHeaderEvents(element);
                    break;
                case 'footer':
                    this.setupFooterEvents(element);
                    break;
            }
        });

        // Observer para novos elementos com data-component
        if (window.MutationObserver) {
            const observer = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    mutation.addedNodes.forEach((node) => {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            const components = node.querySelectorAll('[data-component]');
                            components.forEach(element => this.loadComponent(element));
                        }
                    });
                });
            });

            observer.observe(document.body, {
                childList: true,
                subtree: true
            });
        }
    }

    /**
     * Configura eventos específicos do header
     */
    setupHeaderEvents(headerElement) {
        // Menu mobile toggle
        const mobileToggle = headerElement.querySelector('#mobileMenuToggle');
        const mobileNav = headerElement.querySelector('#mobileNav');
        
        if (mobileToggle && mobileNav) {
            mobileToggle.addEventListener('click', () => {
                mobileNav.classList.toggle('active');
                mobileToggle.classList.toggle('active');
            });
        }

        // Wallet connection
        const connectBtn = headerElement.querySelector('#connectWallet');
        if (connectBtn) {
            connectBtn.addEventListener('click', () => {
                console.log('Conectando wallet...');
                // Implementar lógica de conexão
                this.handleWalletConnection();
            });
        }

        // Network selector
        const networkSelect = headerElement.querySelector('#networkSelect');
        if (networkSelect) {
            networkSelect.addEventListener('change', (e) => {
                console.log('Rede alterada para:', e.target.value);
                // Implementar mudança de rede
            });
        }
    }

    /**
     * Configura eventos específicos do footer
     */
    setupFooterEvents(footerElement) {
        // Links de redes sociais
        const socialLinks = footerElement.querySelectorAll('.social-link');
        socialLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                console.log('Link social clicado:', link.getAttribute('aria-label'));
            });
        });
    }

    /**
     * Gerencia conexão da wallet
     */
    async handleWalletConnection() {
        try {
            if (typeof window.ethereum !== 'undefined') {
                await window.ethereum.request({ method: 'eth_requestAccounts' });
                console.log('✅ Wallet conectada');
                this.updateWalletUI(true);
            } else {
                console.warn('MetaMask não detectado');
                this.showWalletInstallPrompt();
            }
        } catch (error) {
            console.error('❌ Erro ao conectar wallet:', error);
        }
    }

    /**
     * Atualiza UI da wallet
     */
    updateWalletUI(connected) {
        const connectBtns = document.querySelectorAll('#connectWallet');
        connectBtns.forEach(btn => {
            if (connected) {
                btn.innerHTML = '<i class="icon-wallet"></i><span>Conectado</span>';
                btn.classList.add('connected');
            } else {
                btn.innerHTML = '<i class="icon-wallet"></i><span>Conectar Wallet</span>';
                btn.classList.remove('connected');
            }
        });
    }

    /**
     * Mostra prompt para instalar wallet
     */
    showWalletInstallPrompt() {
        const prompt = document.createElement('div');
        prompt.className = 'wallet-install-prompt';
        prompt.innerHTML = `
            <div class="prompt-content">
                <h3>MetaMask não detectado</h3>
                <p>Para usar esta aplicação, você precisa instalar a MetaMask.</p>
                <a href="https://metamask.io/download/" target="_blank" class="btn-install">
                    Instalar MetaMask
                </a>
                <button onclick="this.parentElement.parentElement.remove()" class="btn-close">
                    Fechar
                </button>
            </div>
        `;
        document.body.appendChild(prompt);
    }
}

// Instância global
const templateLoader = new TemplateLoader();

// Auto-inicialização quando DOM estiver pronto
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => templateLoader.init());
} else {
    templateLoader.init();
}

// Exporta para uso em módulos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TemplateLoader;
}

// Exporta para window para uso global
window.TemplateLoader = TemplateLoader;
window.templateLoader = templateLoader;
