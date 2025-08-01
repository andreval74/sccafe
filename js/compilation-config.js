// Configuração para compilação de contratos
// Suporta múltiplas estratégias: local, API com proxy, API externa

export const COMPILATION_CONFIG = {
  // Estratégia padrão: local (evita problemas de CORS)
  strategy: 'local', // 'local', 'proxy', 'external'
  
  // URLs para diferentes estratégias
  urls: {
    external: 'https://token-creator-api.onrender.com/compile',
    proxy: '/api/compile', // Proxy local se disponível
    local: null // Compilação no browser
  },
  
  // Configurações do compilador
  compiler: {
    version: '0.8.19',
    optimizer: {
      enabled: true,
      runs: 200
    }
  },
  
  // Timeouts
  timeouts: {
    local: 15000, // 15 segundos para compilação local
    remote: 30000 // 30 segundos para APIs remotas
  }
};

/**
 * Detecta automaticamente a melhor estratégia de compilação
 */
export async function detectBestStrategy() {
  // Tenta compilação local primeiro (mais rápida e sem CORS)
  try {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/solc@0.8.19/solc.min.js';
    document.head.appendChild(script);
    
    await new Promise((resolve, reject) => {
      script.onload = resolve;
      script.onerror = reject;
      setTimeout(reject, 5000); // Timeout de 5 segundos
    });
    
    console.log('✅ Compilação local disponível');
    return 'local';
  } catch (error) {
    console.log('❌ Compilação local não disponível:', error.message);
  }
  
  // Testa proxy local
  try {
    const response = await fetch('/api/health', { method: 'GET' });
    if (response.ok) {
      console.log('✅ Proxy local disponível');
      return 'proxy';
    }
  } catch (error) {
    console.log('❌ Proxy local não disponível');
  }
  
  // Fallback para API externa (pode ter problemas de CORS)
  console.log('⚠️ Usando API externa (pode ter problemas de CORS)');
  return 'external';
}

export default COMPILATION_CONFIG;
