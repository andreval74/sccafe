/**
 * ==========================================================================
 * SCCAFE INDEX PAGE
 * Script principal da página inicial
 * ==========================================================================
 */

/**
 * Gerenciador da página inicial do SCCAFE
 */
class IndexPage {
  constructor() {
    this.isWalletConnected = false;
    this.currentAccount = null;
    this.stats = {
      tokensCreated: 1250,
      activeUsers: 890,
      uptime: 99.9
    };
    
    this.initializePage();
  }

  /**
   * Inicializa a página
   */
  async initializePage() {
    await this.waitForDOMReady();
    
    this.hideLoadingScreen();
    this.initializeAnimations();
    this.initializeCounters();
    this.initializeWalletConnection();
    this.initializeToolCards();
    this.initializeScrollEffects();
    this.startFloatingAnimation();
    
    console.log('🏠 Página inicial carregada');
  }

  /**
   * Aguarda o DOM estar pronto
   */
  waitForDOMReady() {
    return new Promise((resolve) => {
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', resolve);
      } else {
        resolve();
      }
    });
  }

  /**
   * Remove tela de carregamento
   */
  hideLoadingScreen() {
    const loadingScreen = document.getElementById('loading-screen');
    if (loadingScreen) {
      setTimeout(() => {
        loadingScreen.style.opacity = '0';
        setTimeout(() => {
          loadingScreen.style.display = 'none';
        }, 300);
      }, 1000);
    }
  }

  /**
   * Inicializa animações da página
   */
  initializeAnimations() {
    // Animação de entrada dos elementos
    const observerOptions = {
      threshold: 0.1,
      rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('animate-in');
        }
      });
    }, observerOptions);

    // Observa elementos que devem animar
    const animatedElements = document.querySelectorAll(
      '.feature-card, .tool-card, .hero-content, .hero-visual'
    );
    
    animatedElements.forEach(el => {
      el.classList.add('animate-on-scroll');
      observer.observe(el);
    });
  }

  /**
   * Inicializa contadores animados
   */
  initializeCounters() {
    const counters = document.querySelectorAll('[data-counter]');
    
    const observerOptions = {
      threshold: 0.5
    };

    const counterObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && !entry.target.dataset.counted) {
          this.animateCounter(entry.target);
          entry.target.dataset.counted = 'true';
        }
      });
    }, observerOptions);

    counters.forEach(counter => {
      counterObserver.observe(counter);
    });
  }

  /**
   * Anima um contador
   */
  animateCounter(element) {
    const target = parseFloat(element.dataset.counter);
    const duration = 2000;
    const step = target / (duration / 16);
    let current = 0;

    const timer = setInterval(() => {
      current += step;
      
      if (current >= target) {
        current = target;
        clearInterval(timer);
      }

      // Formatar número baseado no valor
      if (target % 1 !== 0) {
        element.textContent = current.toFixed(1);
      } else if (target >= 1000) {
        element.textContent = Math.floor(current).toLocaleString();
      } else {
        element.textContent = Math.floor(current);
      }
    }, 16);
  }

  /**
   * Inicializa conexão de carteira
   */
  initializeWalletConnection() {
    const connectBtn = document.getElementById('connect-hero-wallet');
    
    if (connectBtn) {
      connectBtn.addEventListener('click', () => {
        this.connectWallet();
      });
    }

    // Verifica se já está conectado
    this.checkExistingConnection();
  }

  /**
   * Conecta carteira
   */
  async connectWallet() {
    if (typeof window.ethereum === 'undefined') {
      this.showWalletNotFoundModal();
      return;
    }

    try {
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts'
      });

      if (accounts.length > 0) {
        this.currentAccount = accounts[0];
        this.isWalletConnected = true;
        this.updateWalletUI();
        this.showConnectionSuccess();
      }
    } catch (error) {
      console.error('Erro ao conectar carteira:', error);
      this.showConnectionError(error.message);
    }
  }

  /**
   * Verifica conexão existente
   */
  async checkExistingConnection() {
    if (typeof window.ethereum !== 'undefined') {
      try {
        const accounts = await window.ethereum.request({
          method: 'eth_accounts'
        });
        
        if (accounts.length > 0) {
          this.currentAccount = accounts[0];
          this.isWalletConnected = true;
          this.updateWalletUI();
        }
      } catch (error) {
        console.error('Erro ao verificar conexão:', error);
      }
    }
  }

  /**
   * Atualiza UI da carteira
   */
  updateWalletUI() {
    const connectBtn = document.getElementById('connect-hero-wallet');
    
    if (connectBtn && this.isWalletConnected) {
      connectBtn.innerHTML = `
        <i class="bi bi-check-circle"></i>
        <span>Carteira Conectada</span>
      `;
      connectBtn.classList.remove('btn-outline');
      connectBtn.classList.add('btn-success');
      connectBtn.disabled = true;
    }
  }

  /**
   * Mostra modal de carteira não encontrada
   */
  showWalletNotFoundModal() {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal modal-center">
        <div class="modal-header">
          <h3>MetaMask não encontrado</h3>
          <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">
            <i class="bi bi-x"></i>
          </button>
        </div>
        <div class="modal-body">
          <p>Para usar a SCCAFE, você precisa ter o MetaMask instalado.</p>
          <div class="modal-actions">
            <a href="https://metamask.io" target="_blank" class="btn btn-primary">
              <i class="bi bi-download"></i>
              Instalar MetaMask
            </a>
            <button class="btn btn-outline" onclick="this.closest('.modal-overlay').remove()">
              Cancelar
            </button>
          </div>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
  }

  /**
   * Mostra sucesso de conexão
   */
  showConnectionSuccess() {
    this.showToast('Carteira conectada com sucesso!', 'success');
  }

  /**
   * Mostra erro de conexão
   */
  showConnectionError(message) {
    this.showToast(`Erro ao conectar: ${message}`, 'error');
  }

  /**
   * Mostra toast notification
   */
  showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
      <div class="toast-content">
        <i class="bi bi-${type === 'success' ? 'check-circle' : type === 'error' ? 'x-circle' : 'info-circle'}"></i>
        <span>${message}</span>
      </div>
    `;
    
    document.body.appendChild(toast);
    
    // Animação de entrada
    setTimeout(() => toast.classList.add('toast-show'), 100);
    
    // Remove após 3 segundos
    setTimeout(() => {
      toast.classList.remove('toast-show');
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  /**
   * Inicializa cards de ferramentas
   */
  initializeToolCards() {
    const toolCards = document.querySelectorAll('.tool-card');
    
    toolCards.forEach(card => {
      card.addEventListener('mouseenter', () => {
        card.style.transform = 'translateY(-8px) scale(1.02)';
      });
      
      card.addEventListener('mouseleave', () => {
        card.style.transform = '';
      });
      
      // Efeito de clique
      card.addEventListener('click', (e) => {
        if (!e.target.closest('.tool-link')) {
          const link = card.querySelector('.tool-link');
          if (link) {
            link.click();
          }
        }
      });
    });
  }

  /**
   * Inicializa efeitos de scroll
   */
  initializeScrollEffects() {
    let ticking = false;
    
    const updateScrollEffects = () => {
      const scrollY = window.scrollY;
      
      // Parallax no hero
      const heroVisual = document.querySelector('.hero-visual');
      if (heroVisual) {
        heroVisual.style.transform = `translateY(${scrollY * 0.1}px)`;
      }
      
      // Floating elements
      const floatingElements = document.querySelectorAll('.floating-element');
      floatingElements.forEach((el, index) => {
        const speed = 0.05 + (index * 0.02);
        el.style.transform = `translateY(${scrollY * speed}px) rotate(${scrollY * 0.1}deg)`;
      });
      
      ticking = false;
    };

    window.addEventListener('scroll', () => {
      if (!ticking) {
        requestAnimationFrame(updateScrollEffects);
        ticking = true;
      }
    });
  }

  /**
   * Inicia animação dos elementos flutuantes
   */
  startFloatingAnimation() {
    const floatingElements = document.querySelectorAll('.floating-element');
    
    floatingElements.forEach((el, index) => {
      const delay = index * 1000;
      const duration = 3000 + (index * 500);
      
      el.style.animation = `float ${duration}ms ease-in-out ${delay}ms infinite alternate`;
    });
  }

  /**
   * Atualiza estatísticas em tempo real
   */
  updateStatsRealTime() {
    setInterval(() => {
      // Simula pequenas mudanças nas estatísticas
      this.stats.tokensCreated += Math.floor(Math.random() * 3);
      this.stats.activeUsers += Math.floor(Math.random() * 2);
      
      // Atualiza counters se estiverem visíveis
      const tokenCounter = document.querySelector('[data-counter="1250"]');
      const userCounter = document.querySelector('[data-counter="890"]');
      
      if (tokenCounter && tokenCounter.dataset.counted) {
        tokenCounter.textContent = this.stats.tokensCreated.toLocaleString();
      }
      
      if (userCounter && userCounter.dataset.counted) {
        userCounter.textContent = this.stats.activeUsers.toLocaleString();
      }
    }, 30000); // Atualiza a cada 30 segundos
  }

  /**
   * Obtém informações da página
   */
  getPageInfo() {
    return {
      isWalletConnected: this.isWalletConnected,
      currentAccount: this.currentAccount,
      stats: this.stats
    };
  }
}

// CSS adicional para animações
const additionalStyles = `
  /* Loading Screen */
  .loading-screen {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: var(--color-bg-primary);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9999;
    transition: opacity 0.3s ease;
  }
  
  .loading-content {
    text-align: center;
  }
  
  .loading-logo {
    width: 4rem;
    height: 4rem;
    margin-bottom: 2rem;
    animation: pulse 2s infinite;
  }
  
  .loading-spinner {
    width: 2rem;
    height: 2rem;
    border: 2px solid var(--color-border);
    border-top: 2px solid var(--color-accent);
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin: 0 auto 1rem;
  }
  
  .loading-text {
    color: var(--color-text-secondary);
    font-size: 0.875rem;
  }
  
  /* Hero Section */
  .hero-section {
    min-height: 100vh;
    display: flex;
    align-items: center;
    position: relative;
    overflow: hidden;
    background: linear-gradient(135deg, rgba(17, 24, 39, 0.95), rgba(31, 41, 55, 0.9));
  }
  
  .hero-container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 6rem 2rem 2rem;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 4rem;
    align-items: center;
  }
  
  .hero-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    background: rgba(245, 158, 11, 0.1);
    border: 1px solid rgba(245, 158, 11, 0.2);
    border-radius: 9999px;
    color: var(--color-accent);
    font-size: 0.875rem;
    font-weight: 500;
    margin-bottom: 2rem;
  }
  
  .hero-title {
    font-size: 3.5rem;
    font-weight: 700;
    line-height: 1.1;
    margin-bottom: 1.5rem;
    color: var(--color-text-primary);
  }
  
  .gradient-text {
    background: linear-gradient(135deg, var(--color-accent), #fbbf24);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }
  
  .hero-description {
    font-size: 1.125rem;
    line-height: 1.6;
    color: var(--color-text-secondary);
    margin-bottom: 2rem;
  }
  
  .hero-actions {
    display: flex;
    gap: 1rem;
    margin-bottom: 3rem;
  }
  
  .hero-stats {
    display: flex;
    gap: 2rem;
    align-items: center;
  }
  
  .stat-item {
    text-align: center;
  }
  
  .stat-number {
    font-size: 2rem;
    font-weight: 700;
    color: var(--color-accent);
    font-family: var(--font-mono);
  }
  
  .stat-label {
    font-size: 0.875rem;
    color: var(--color-text-secondary);
    margin-top: 0.25rem;
  }
  
  .stat-divider {
    width: 1px;
    height: 2rem;
    background: var(--color-border);
  }
  
  /* Hero Visual */
  .hero-visual {
    position: relative;
    display: flex;
    justify-content: center;
    align-items: center;
  }
  
  .hero-card {
    background: var(--color-bg-secondary);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    padding: 2rem;
    box-shadow: var(--shadow-xl);
    transform: rotate(5deg);
    transition: transform 0.3s ease;
  }
  
  .hero-card:hover {
    transform: rotate(0deg) scale(1.05);
  }
  
  .hero-card-header {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-bottom: 1.5rem;
  }
  
  .hero-card-icon img {
    width: 3rem;
    height: 3rem;
    border-radius: 50%;
  }
  
  .hero-card-info h3 {
    font-size: 1.25rem;
    font-weight: 600;
    margin: 0;
    color: var(--color-text-primary);
  }
  
  .hero-card-info p {
    font-size: 0.875rem;
    color: var(--color-text-secondary);
    margin: 0;
  }
  
  .status-verified {
    background: rgba(16, 185, 129, 0.1);
    color: #10b981;
    padding: 0.25rem 0.5rem;
    border-radius: var(--radius-sm);
    font-size: 0.75rem;
    font-weight: 500;
  }
  
  .card-metric {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.75rem 0;
    border-bottom: 1px solid var(--color-border);
  }
  
  .card-metric:last-child {
    border-bottom: none;
  }
  
  .metric-label {
    color: var(--color-text-secondary);
    font-size: 0.875rem;
  }
  
  .metric-value {
    color: var(--color-text-primary);
    font-weight: 500;
    font-family: var(--font-mono);
  }
  
  /* Floating Elements */
  .floating-element {
    position: absolute;
    width: 3rem;
    height: 3rem;
    background: rgba(245, 158, 11, 0.1);
    border: 1px solid rgba(245, 158, 11, 0.2);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--color-accent);
    font-size: 1.25rem;
    z-index: 1;
  }
  
  /* Sections */
  .features-section,
  .tools-section {
    padding: 6rem 0;
  }
  
  .section-container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 2rem;
  }
  
  .section-header {
    text-align: center;
    margin-bottom: 4rem;
  }
  
  .section-title {
    font-size: 2.5rem;
    font-weight: 700;
    margin-bottom: 1rem;
    color: var(--color-text-primary);
  }
  
  .section-description {
    font-size: 1.125rem;
    color: var(--color-text-secondary);
    max-width: 600px;
    margin: 0 auto;
  }
  
  /* Features Grid */
  .features-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 2rem;
  }
  
  .feature-card {
    background: var(--color-bg-secondary);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    padding: 2rem;
    text-align: center;
    transition: all 0.3s ease;
  }
  
  .feature-icon {
    width: 4rem;
    height: 4rem;
    background: var(--color-accent-alpha);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto 1.5rem;
    color: var(--color-accent);
    font-size: 2rem;
  }
  
  .feature-title {
    font-size: 1.5rem;
    font-weight: 600;
    margin-bottom: 1rem;
    color: var(--color-text-primary);
  }
  
  .feature-description {
    color: var(--color-text-secondary);
    margin-bottom: 1.5rem;
    line-height: 1.6;
  }
  
  .feature-list {
    list-style: none;
    padding: 0;
    text-align: left;
  }
  
  .feature-list li {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 0;
    color: var(--color-text-secondary);
  }
  
  .feature-list li i {
    color: var(--color-accent);
  }
  
  /* Tools Grid */
  .tools-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 1.5rem;
  }
  
  .tool-card {
    background: var(--color-bg-secondary);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    padding: 1.5rem;
    transition: all 0.3s ease;
    cursor: pointer;
  }
  
  .tool-header {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-bottom: 1rem;
  }
  
  .tool-icon {
    width: 3rem;
    height: 3rem;
    background: var(--color-accent-alpha);
    border-radius: var(--radius-md);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--color-accent);
    font-size: 1.25rem;
  }
  
  .tool-title {
    font-size: 1.125rem;
    font-weight: 600;
    color: var(--color-text-primary);
  }
  
  .tool-description {
    color: var(--color-text-secondary);
    margin-bottom: 1.5rem;
    line-height: 1.5;
  }
  
  .tool-link {
    display: flex;
    align-items: center;
    justify-content: space-between;
    color: var(--color-accent);
    text-decoration: none;
    font-weight: 500;
    transition: all 0.2s ease;
  }
  
  .tool-link:hover {
    color: #d97706;
  }
  
  /* CTA Section */
  .cta-section {
    background: linear-gradient(135deg, rgba(245, 158, 11, 0.1), rgba(251, 191, 36, 0.05));
    border-top: 1px solid rgba(245, 158, 11, 0.2);
    border-bottom: 1px solid rgba(245, 158, 11, 0.2);
    padding: 6rem 0;
  }
  
  .cta-container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 2rem;
    display: grid;
    grid-template-columns: 2fr 1fr;
    gap: 4rem;
    align-items: center;
  }
  
  .cta-title {
    font-size: 2.5rem;
    font-weight: 700;
    margin-bottom: 1rem;
    color: var(--color-text-primary);
  }
  
  .cta-description {
    font-size: 1.125rem;
    color: var(--color-text-secondary);
    margin-bottom: 2rem;
    line-height: 1.6;
  }
  
  .cta-actions {
    display: flex;
    gap: 1rem;
  }
  
  .cta-stats {
    display: flex;
    flex-direction: column;
    gap: 2rem;
  }
  
  .cta-stat {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1.5rem;
    background: var(--color-bg-secondary);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
  }
  
  .cta-stat-icon {
    width: 3rem;
    height: 3rem;
    background: var(--color-accent-alpha);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--color-accent);
    font-size: 1.5rem;
  }
  
  .cta-stat-number {
    font-size: 1.75rem;
    font-weight: 700;
    color: var(--color-accent);
    font-family: var(--font-mono);
  }
  
  .cta-stat-label {
    color: var(--color-text-secondary);
    font-size: 0.875rem;
  }
  
  /* Toast Notifications */
  .toast {
    position: fixed;
    top: 2rem;
    right: 2rem;
    background: var(--color-bg-secondary);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    padding: 1rem 1.5rem;
    box-shadow: var(--shadow-xl);
    z-index: 1000;
    transform: translateX(100%);
    transition: transform 0.3s ease;
  }
  
  .toast.toast-show {
    transform: translateX(0);
  }
  
  .toast-success {
    border-color: rgba(16, 185, 129, 0.3);
    background: rgba(16, 185, 129, 0.1);
  }
  
  .toast-error {
    border-color: rgba(239, 68, 68, 0.3);
    background: rgba(239, 68, 68, 0.1);
  }
  
  .toast-content {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    color: var(--color-text-primary);
  }
  
  /* Animations */
  .animate-on-scroll {
    opacity: 0;
    transform: translateY(30px);
    transition: all 0.6s ease;
  }
  
  .animate-in {
    opacity: 1;
    transform: translateY(0);
  }
  
  @keyframes float {
    from { transform: translateY(0px); }
    to { transform: translateY(-10px); }
  }
  
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
  
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }
  
  /* Media Queries */
  @media (max-width: 768px) {
    .hero-container {
      grid-template-columns: 1fr;
      gap: 2rem;
      text-align: center;
    }
    
    .hero-title {
      font-size: 2.5rem;
    }
    
    .hero-actions {
      flex-direction: column;
      align-items: center;
    }
    
    .hero-stats {
      justify-content: center;
    }
    
    .cta-container {
      grid-template-columns: 1fr;
      gap: 2rem;
      text-align: center;
    }
    
    .section-title {
      font-size: 2rem;
    }
    
    .cta-title {
      font-size: 2rem;
    }
  }
`;

// Adiciona estilos à página
const styleSheet = document.createElement('style');
styleSheet.textContent = additionalStyles;
document.head.appendChild(styleSheet);

// Inicializa a página quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
  window.indexPage = new IndexPage();
});

// Exporta para uso global
window.IndexPage = IndexPage;
