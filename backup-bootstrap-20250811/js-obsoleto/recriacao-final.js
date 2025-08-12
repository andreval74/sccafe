// FERRAMENTA FINAL: Recriação de Contratos a partir de Bytecode
// Execute: window.recriarContrato('0xENDERECO') para recriar qualquer contrato

/**
 * FUNÇÃO PRINCIPAL: Recria contrato completo a partir do endereço
 */
async function recriarContrato(endereco, nome = null) {
  console.clear();
  console.log('🚀 RECRIAÇÃO COMPLETA DE CONTRATO');
  console.log('==========================================');
  console.log('📍 Endereço:', endereco);
  console.log('⏰ Iniciado em:', new Date().toLocaleString());
  
  try {
    // 1. Verificar MetaMask
    if (!window.ethereum) {
      throw new Error('MetaMask não encontrado. Conecte sua carteira.');
    }
    
    console.log('✅ MetaMask conectado');
    
    // 2. Buscar bytecode do blockchain
    console.log('\n📡 BUSCANDO BYTECODE DO BLOCKCHAIN...');
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const bytecode = await provider.getCode(endereco);
    
    if (bytecode === '0x' || bytecode.length < 10) {
      throw new Error('Endereço não é um contrato válido ou não existe');
    }
    
    console.log('✅ Bytecode obtido:', bytecode.length, 'caracteres');
    console.log('📋 Bytecode:', bytecode.substring(0, 100) + '...');
    
    // 3. Analisar bytecode
    console.log('\n🔍 ANALISANDO ESTRUTURA DO BYTECODE...');
    const analise = analisarBytecodeCompleto(bytecode);
    
    // 4. Tentar obter informações do contrato
    console.log('\n📝 OBTENDO INFORMAÇÕES DO CONTRATO...');
    const infoContrato = await obterInfoContrato(endereco, provider);
    
    // 5. Gerar código Solidity
    console.log('\n⚙️ GERANDO CÓDIGO SOLIDITY...');
    const nomeContrato = nome || infoContrato.nome || 'RecreatedContract';
    const codigoSolidity = gerarCodigoCompleto(nomeContrato, analise, infoContrato);
    
    // 6. Salvar arquivo
    console.log('\n💾 SALVANDO ARQUIVO...');
    const nomeArquivo = `${nomeContrato.replace(/[^a-zA-Z0-9]/g, '')}_recreated.sol`;
    salvarArquivo(codigoSolidity, nomeArquivo);
    
    // 7. Resumo final
    console.log('\n🎉 RECRIAÇÃO CONCLUÍDA!');
    console.log('==========================================');
    console.log('📁 Arquivo:', nomeArquivo);
    console.log('📏 Código:', codigoSolidity.length, 'caracteres');
    console.log('🔍 Tipo detectado:', analise.tipo);
    console.log('🔧 Funções encontradas:', analise.funcoes.length);
    
    // 8. Salvar resultados globalmente
    window.contratoRecriado = {
      endereco,
      nome: nomeContrato,
      bytecode,
      analise,
      infoContrato,
      codigoSolidity,
      arquivo: nomeArquivo,
      timestamp: new Date().toISOString()
    };
    
    console.log('💾 Dados salvos em window.contratoRecriado');
    
    return window.contratoRecriado;
    
  } catch (error) {
    console.error('❌ ERRO NA RECRIAÇÃO:', error.message);
    throw error;
  }
}

/**
 * Análise completa do bytecode
 */
function analisarBytecodeCompleto(bytecode) {
  const clean = bytecode.replace(/^0x/, '').toLowerCase();
  
  console.log('🔍 Analisando padrões no bytecode...');
  
  const analise = {
    tamanho: clean.length,
    bytes: clean.length / 2,
    tipo: 'Desconhecido',
    funcoes: [],
    eventos: [],
    caracteristicas: [],
    versaoSolidity: null
  };
  
  // Detectar tipo de contrato
  if (clean.includes('a9059cbb') && clean.includes('70a08231') && clean.includes('18160ddd')) {
    analise.tipo = 'ERC20';
    analise.caracteristicas.push('Token ERC20');
    console.log('✅ Tipo detectado: ERC20 Token');
  } else if (clean.includes('6352211e') || clean.includes('42842e0e')) {
    analise.tipo = 'ERC721';
    analise.caracteristicas.push('NFT ERC721');
    console.log('✅ Tipo detectado: ERC721 NFT');
  } else if (clean.includes('8da5cb5b')) {
    analise.tipo = 'Ownable';
    analise.caracteristicas.push('Contrato com Owner');
    console.log('✅ Tipo detectado: Ownable Contract');
  }
  
  // Detectar funções ERC20
  const funcoesERC20 = {
    '06fdde03': 'name()',
    '95d89b41': 'symbol()', 
    '313ce567': 'decimals()',
    '18160ddd': 'totalSupply()',
    '70a08231': 'balanceOf(address)',
    'a9059cbb': 'transfer(address,uint256)',
    '23b872dd': 'transferFrom(address,address,uint256)',
    '095ea7b3': 'approve(address,uint256)',
    'dd62ed3e': 'allowance(address,address)'
  };
  
  for (const [selector, funcao] of Object.entries(funcoesERC20)) {
    if (clean.includes(selector)) {
      analise.funcoes.push(funcao);
      console.log(`  ✅ Função encontrada: ${funcao}`);
    }
  }
  
  // Detectar eventos
  const eventosERC20 = {
    'ddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef': 'Transfer',
    '8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925': 'Approval'
  };
  
  for (const [hash, evento] of Object.entries(eventosERC20)) {
    if (clean.includes(hash)) {
      analise.eventos.push(evento);
      console.log(`  ✅ Evento encontrado: ${evento}`);
    }
  }
  
  // Detectar versão do Solidity
  const solcPattern = /64736f6c63([a-f0-9]{6})/i;
  const match = clean.match(solcPattern);
  if (match) {
    const version = parseInt(match[1], 16);
    const major = (version >> 16) & 0xFF;
    const minor = (version >> 8) & 0xFF;
    const patch = version & 0xFF;
    analise.versaoSolidity = `${major}.${minor}.${patch}`;
    console.log(`  ✅ Versão Solidity detectada: ${analise.versaoSolidity}`);
  }
  
  return analise;
}

/**
 * Obtém informações do contrato via chamadas
 */
async function obterInfoContrato(endereco, provider) {
  console.log('📞 Tentando obter informações via chamadas...');
  
  const info = {
    nome: null,
    simbolo: null,
    decimais: null,
    supply: null,
    owner: null
  };
  
  try {
    // ABI básica para ERC20
    const abiBasica = [
      'function name() view returns (string)',
      'function symbol() view returns (string)',
      'function decimals() view returns (uint8)',
      'function totalSupply() view returns (uint256)',
      'function owner() view returns (address)'
    ];
    
    const contrato = new ethers.Contract(endereco, abiBasica, provider);
    
    // Tenta obter nome
    try {
      info.nome = await contrato.name();
      console.log(`  ✅ Nome: ${info.nome}`);
    } catch (e) {
      console.log('  ⚠️ Nome não disponível');
    }
    
    // Tenta obter símbolo
    try {
      info.simbolo = await contrato.symbol();
      console.log(`  ✅ Símbolo: ${info.simbolo}`);
    } catch (e) {
      console.log('  ⚠️ Símbolo não disponível');
    }
    
    // Tenta obter decimais
    try {
      info.decimais = await contrato.decimals();
      console.log(`  ✅ Decimais: ${info.decimais}`);
    } catch (e) {
      console.log('  ⚠️ Decimais não disponível');
    }
    
    // Tenta obter supply total
    try {
      const supply = await contrato.totalSupply();
      info.supply = supply.toString();
      console.log(`  ✅ Total Supply: ${info.supply}`);
    } catch (e) {
      console.log('  ⚠️ Total Supply não disponível');
    }
    
    // Tenta obter owner
    try {
      info.owner = await contrato.owner();
      console.log(`  ✅ Owner: ${info.owner}`);
    } catch (e) {
      console.log('  ⚠️ Owner não disponível');
    }
    
  } catch (error) {
    console.log('⚠️ Não foi possível obter informações via chamadas');
  }
  
  return info;
}

/**
 * Gera código Solidity completo
 */
function gerarCodigoCompleto(nomeContrato, analise, infoContrato) {
  let codigo = '';
  
  // Header
  codigo += '// SPDX-License-Identifier: MIT\n';
  codigo += `// Contrato recriado automaticamente em ${new Date().toLocaleString()}\n`;
  codigo += `// Endereço original: ${window.contratoRecriado?.endereco || 'N/A'}\n\n`;
  
  // Pragma
  const versao = analise.versaoSolidity || '0.8.19';
  codigo += `pragma solidity ^${versao};\n\n`;
  
  // Interface se for ERC20
  if (analise.tipo === 'ERC20') {
    codigo += 'interface IERC20 {\n';
    codigo += '    function totalSupply() external view returns (uint256);\n';
    codigo += '    function balanceOf(address account) external view returns (uint256);\n';
    codigo += '    function transfer(address to, uint256 amount) external returns (bool);\n';
    codigo += '    function allowance(address owner, address spender) external view returns (uint256);\n';
    codigo += '    function approve(address spender, uint256 amount) external returns (bool);\n';
    codigo += '    function transferFrom(address from, address to, uint256 amount) external returns (bool);\n';
    codigo += '}\n\n';
  }
  
  // Contrato principal
  const implementa = analise.tipo === 'ERC20' ? ' is IERC20' : '';
  codigo += `contract ${nomeContrato}${implementa} {\n`;
  
  // Eventos
  if (analise.eventos.length > 0) {
    codigo += '\n    // Eventos detectados\n';
    for (const evento of analise.eventos) {
      if (evento === 'Transfer') {
        codigo += '    event Transfer(address indexed from, address indexed to, uint256 value);\n';
      } else if (evento === 'Approval') {
        codigo += '    event Approval(address indexed owner, address indexed spender, uint256 value);\n';
      }
    }
  }
  
  // Variáveis de estado
  codigo += '\n    // Variáveis de estado (recriadas baseadas na análise)\n';
  
  if (analise.tipo === 'ERC20') {
    codigo += '    mapping(address => uint256) private _balances;\n';
    codigo += '    mapping(address => mapping(address => uint256)) private _allowances;\n';
    codigo += '    uint256 private _totalSupply;\n';
    
    if (infoContrato.nome) {
      codigo += `    string private _name = "${infoContrato.nome}";\n`;
    } else {
      codigo += '    string private _name;\n';
    }
    
    if (infoContrato.simbolo) {
      codigo += `    string private _symbol = "${infoContrato.simbolo}";\n`;
    } else {
      codigo += '    string private _symbol;\n';
    }
    
    if (infoContrato.decimais) {
      codigo += `    uint8 private _decimals = ${infoContrato.decimais};\n`;
    } else {
      codigo += '    uint8 private _decimals = 18;\n';
    }
  }
  
  if (infoContrato.owner || analise.caracteristicas.includes('Contrato com Owner')) {
    codigo += '    address private _owner;\n';
  }
  
  // Constructor
  codigo += '\n    // Constructor (recriado)\n';
  codigo += '    constructor() {\n';
  
  if (infoContrato.owner) {
    codigo += `        _owner = ${infoContrato.owner};\n`;
  } else if (analise.caracteristicas.includes('Contrato com Owner')) {
    codigo += '        _owner = msg.sender;\n';
  }
  
  if (analise.tipo === 'ERC20' && infoContrato.supply) {
    codigo += `        _totalSupply = ${infoContrato.supply};\n`;
    codigo += '        _balances[msg.sender] = _totalSupply;\n';
    codigo += '        emit Transfer(address(0), msg.sender, _totalSupply);\n';
  }
  
  codigo += '    }\n';
  
  // Funções
  if (analise.funcoes.length > 0) {
    codigo += '\n    // Funções detectadas (implementação recriada)\n';
    
    for (const funcao of analise.funcoes) {
      if (funcao === 'name()') {
        codigo += '    function name() public view returns (string memory) {\n';
        codigo += '        return _name;\n';
        codigo += '    }\n\n';
      } else if (funcao === 'symbol()') {
        codigo += '    function symbol() public view returns (string memory) {\n';
        codigo += '        return _symbol;\n';
        codigo += '    }\n\n';
      } else if (funcao === 'decimals()') {
        codigo += '    function decimals() public view returns (uint8) {\n';
        codigo += '        return _decimals;\n';
        codigo += '    }\n\n';
      } else if (funcao === 'totalSupply()') {
        codigo += '    function totalSupply() public view returns (uint256) {\n';
        codigo += '        return _totalSupply;\n';
        codigo += '    }\n\n';
      } else if (funcao === 'balanceOf(address)') {
        codigo += '    function balanceOf(address account) public view returns (uint256) {\n';
        codigo += '        return _balances[account];\n';
        codigo += '    }\n\n';
      } else if (funcao === 'transfer(address,uint256)') {
        codigo += '    function transfer(address to, uint256 amount) public returns (bool) {\n';
        codigo += '        require(to != address(0), "Transfer to zero address");\n';
        codigo += '        require(_balances[msg.sender] >= amount, "Insufficient balance");\n';
        codigo += '        _balances[msg.sender] -= amount;\n';
        codigo += '        _balances[to] += amount;\n';
        codigo += '        emit Transfer(msg.sender, to, amount);\n';
        codigo += '        return true;\n';
        codigo += '    }\n\n';
      } else if (funcao === 'approve(address,uint256)') {
        codigo += '    function approve(address spender, uint256 amount) public returns (bool) {\n';
        codigo += '        _allowances[msg.sender][spender] = amount;\n';
        codigo += '        emit Approval(msg.sender, spender, amount);\n';
        codigo += '        return true;\n';
        codigo += '    }\n\n';
      } else if (funcao === 'allowance(address,address)') {
        codigo += '    function allowance(address owner, address spender) public view returns (uint256) {\n';
        codigo += '        return _allowances[owner][spender];\n';
        codigo += '    }\n\n';
      }
    }
  }
  
  codigo += '}\n';
  
  return codigo;
}

/**
 * Salva arquivo para download
 */
function salvarArquivo(conteudo, nomeArquivo) {
  const blob = new Blob([conteudo], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nomeArquivo;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  
  console.log(`✅ Arquivo ${nomeArquivo} salvo para download`);
}

/**
 * Recria o contrato de teste do Remix
 */
async function recriarContratoRemix() {
  console.log('🎯 RECRIANDO CONTRATO DO REMIX...');
  const enderecoRemix = '0x1733c3e3E3058C570E4264C576F764c1c56e26fE';
  return await recriarContrato(enderecoRemix, 'RemixTestToken');
}

/**
 * Exemplo de uso com contrato conhecido
 */
async function exemploUso() {
  console.log('📚 EXEMPLO DE USO');
  console.log('==========================================');
  console.log('Para recriar um contrato, execute:');
  console.log('window.recriarContrato("0xENDERECO_DO_CONTRATO", "NomeOpcional")');
  console.log('');
  console.log('Exemplo com contrato do Remix:');
  console.log('window.recriarContratoRemix()');
}

// Expõe funções globalmente
if (typeof window !== 'undefined') {
  window.recriarContrato = recriarContrato;
  window.recriarContratoRemix = recriarContratoRemix;
  window.exemploUso = exemploUso;
  
  console.log('🎉 FERRAMENTA DE RECRIAÇÃO CARREGADA!');
  console.log('==========================================');
  console.log('🚀 Execute: window.recriarContrato("0xENDERECO")');
  console.log('🎯 Execute: window.recriarContratoRemix() para testar');
  console.log('📚 Execute: window.exemploUso() para ver exemplos');
}
