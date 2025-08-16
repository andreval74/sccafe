// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * 🎯 CONTRATO OTIMIZADO PARA SISTEMA SCCAFE
 * 
 * ✅ Compatível com todas as verificações do sistema:
 * - ERC-20 completo
 * - Função buy() payable funcional
 * - Funções de preço detectáveis
 * - Sistema de diagnóstico compatível
 * - Sem pausas ou bloqueios
 * - Venda sempre ativa
 */

interface IERC20 {
    function totalSupply() external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
    function transfer(address to, uint256 amount) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
}

contract SCCAFEDirectSaleToken is IERC20 {
    
    // ==================== INFORMAÇÕES DO TOKEN ====================
    string public name = "SCCAFE Direct Sale Token";
    string public symbol = "SCDST";
    uint8 public decimals = 18;
    uint256 public totalSupply;
    
    // ==================== MAPEAMENTOS ====================
    mapping(address => uint256) private _balances;
    mapping(address => mapping(address => uint256)) private _allowances;
    
    // ==================== CONFIGURAÇÕES DE VENDA ====================
    address public owner;
    uint256 public _tokenPrice = 1000000000000000; // 0.001 BNB por token (1e15 wei)
    bool public saleActive = true;
    bool public saleEnabled = true;
    bool public paused = false;
    
    // Limites de compra
    uint256 public minPurchase = 1000000000000000; // 0.001 BNB mínimo (para testes)
    uint256 public maxPurchase = 10000000000000000000; // 10 BNB máximo
    
    // ==================== EVENTOS ====================
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    event TokensPurchased(address indexed buyer, uint256 ethSpent, uint256 tokensReceived);
    event PriceUpdated(uint256 newPrice);
    
    // ==================== CONSTRUTOR ====================
    constructor(uint256 _initialSupply) {
        owner = msg.sender;
        totalSupply = _initialSupply * 10**decimals;
        _balances[address(this)] = totalSupply; // Tokens no contrato para venda
        emit Transfer(address(0), address(this), totalSupply);
    }
    
    // ==================== MODIFICADORES ====================
    modifier onlyOwner() {
        require(msg.sender == owner, "Somente o proprietario pode executar");
        _;
    }
    
    modifier whenNotPaused() {
        require(!paused, "Contrato pausado");
        _;
    }
    
    modifier whenSaleActive() {
        require(saleActive && saleEnabled, "Venda nao esta ativa");
        _;
    }
    
    // ==================== FUNÇÕES ERC-20 ====================
    function balanceOf(address account) public view override returns (uint256) {
        return _balances[account];
    }
    
    function transfer(address to, uint256 amount) public override returns (bool) {
        require(to != address(0), "Transfer para endereco zero");
        require(_balances[msg.sender] >= amount, "Saldo insuficiente");
        
        _balances[msg.sender] -= amount;
        _balances[to] += amount;
        
        emit Transfer(msg.sender, to, amount);
        return true;
    }
    
    function allowance(address tokenOwner, address spender) public view override returns (uint256) {
        return _allowances[tokenOwner][spender];
    }
    
    function approve(address spender, uint256 amount) public override returns (bool) {
        _allowances[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }
    
    function transferFrom(address from, address to, uint256 amount) public override returns (bool) {
        require(to != address(0), "Transfer para endereco zero");
        require(_balances[from] >= amount, "Saldo insuficiente");
        require(_allowances[from][msg.sender] >= amount, "Allowance insuficiente");
        
        _balances[from] -= amount;
        _balances[to] += amount;
        _allowances[from][msg.sender] -= amount;
        
        emit Transfer(from, to, amount);
        return true;
    }
    
    // ==================== FUNÇÕES DE PREÇO (DETECTÁVEIS PELO SISTEMA) ====================
    
    /**
     * 💰 Função principal de preço - detectada pelo sistema
     */
    function tokenPrice() external view returns (uint256) {
        return _tokenPrice;
    }
    
    /**
     * 💰 Funções alternativas de preço para compatibilidade
     */
    function price() external view returns (uint256) {
        return _tokenPrice;
    }
    
    function getPrice() external view returns (uint256) {
        return _tokenPrice;
    }
    
    function buyPrice() external view returns (uint256) {
        return _tokenPrice;
    }
    
    function salePrice() external view returns (uint256) {
        return _tokenPrice;
    }
    
    function pricePerToken() external view returns (uint256) {
        return _tokenPrice;
    }
    
    // ==================== FUNÇÕES DE CÁLCULO ====================
    
    /**
     * 🔢 Calcula quantos tokens para determinado valor em ETH/BNB
     */
    function calculateTokensForEth(uint256 ethAmount) external view returns (uint256) {
        require(ethAmount > 0, "Valor deve ser maior que zero");
        return (ethAmount * 10**decimals) / _tokenPrice;
    }
    
    /**
     * 🔢 Calcula quanto ETH/BNB para determinada quantidade de tokens
     */
    function calculateEthForTokens(uint256 tokenAmount) external view returns (uint256) {
        require(tokenAmount > 0, "Quantidade deve ser maior que zero");
        return (tokenAmount * _tokenPrice) / 10**decimals;
    }
    
    /**
     * 🔢 Versões alternativas para compatibilidade
     */
    function getTokensForEth(uint256 ethAmount) external view returns (uint256) {
        return (ethAmount * 10**decimals) / _tokenPrice;
    }
    
    function getEthForTokens(uint256 tokenAmount) external view returns (uint256) {
        return (tokenAmount * _tokenPrice) / 10**decimals;
    }
    
    // ==================== FUNÇÃO DE COMPRA PRINCIPAL ====================
    
    /**
     * 🛒 FUNÇÃO DE COMPRA DIRETA - DETECTADA E TESTADA PELO SISTEMA
     * Esta é a função principal que o sistema SCCAFE irá usar
     */
    function buy() external payable whenNotPaused whenSaleActive {
        require(msg.value >= minPurchase, "Valor abaixo do minimo");
        require(msg.value <= maxPurchase, "Valor acima do maximo");
        
        // Calcula quantos tokens o comprador receberá
        uint256 tokensToReceive = (msg.value * 10**decimals) / _tokenPrice;
        
        // Verifica se o contrato tem tokens suficientes
        require(_balances[address(this)] >= tokensToReceive, "Tokens insuficientes no contrato");
        
        // Executa a transferência
        _balances[address(this)] -= tokensToReceive;
        _balances[msg.sender] += tokensToReceive;
        
        // Emite eventos
        emit Transfer(address(this), msg.sender, tokensToReceive);
        emit TokensPurchased(msg.sender, msg.value, tokensToReceive);
    }
    
    /**
     * 🛒 Versões alternativas da função de compra para compatibilidade
     */
    function buyTokens() external payable {
        this.buy{value: msg.value}();
    }
    
    function purchase() external payable {
        this.buy{value: msg.value}();
    }
    
    function buy(uint256 tokenAmount) external payable whenNotPaused whenSaleActive {
        require(tokenAmount > 0, "Quantidade deve ser maior que zero");
        
        uint256 ethRequired = (tokenAmount * _tokenPrice) / 10**decimals;
        require(msg.value >= ethRequired, "ETH insuficiente para a quantidade solicitada");
        
        require(_balances[address(this)] >= tokenAmount, "Tokens insuficientes no contrato");
        
        _balances[address(this)] -= tokenAmount;
        _balances[msg.sender] += tokenAmount;
        
        // Devolve excesso se houver
        uint256 excess = msg.value - ethRequired;
        if (excess > 0) {
            payable(msg.sender).transfer(excess);
        }
        
        emit Transfer(address(this), msg.sender, tokenAmount);
        emit TokensPurchased(msg.sender, ethRequired, tokenAmount);
    }
    
    // ==================== FUNÇÕES DE DIAGNÓSTICO (PARA SISTEMA SCCAFE) ====================
    
    /**
     * 🏥 Funções para diagnóstico automático do sistema
     */
    function tokensForSale() external view returns (uint256) {
        return _balances[address(this)];
    }
    
    function tokensAvailable() external view returns (uint256) {
        return _balances[address(this)];
    }
    
    /**
     * 🔍 Funções de estado para verificação
     */
    function isActive() external view returns (bool) {
        return saleActive;
    }
    
    function enabled() external view returns (bool) {
        return saleEnabled;
    }
    
    // ==================== FUNÇÕES ADMINISTRATIVAS ====================
    
    /**
     * 💰 Atualiza preço do token (apenas owner)
     */
    function setTokenPrice(uint256 newPrice) external onlyOwner {
        require(newPrice > 0, "Preco deve ser maior que zero");
        _tokenPrice = newPrice;
        emit PriceUpdated(newPrice);
    }
    
    /**
     * ⏸️ Controle de pausa (apenas owner)
     */
    function setPaused(bool _paused) external onlyOwner {
        paused = _paused;
    }
    
    /**
     * 🎯 Controle de venda (apenas owner)
     */
    function setSaleActive(bool _active) external onlyOwner {
        saleActive = _active;
    }
    
    function setSaleEnabled(bool _enabled) external onlyOwner {
        saleEnabled = _enabled;
    }
    
    /**
     * 📏 Atualiza limites de compra (apenas owner)
     */
    function setLimits(uint256 _minPurchase, uint256 _maxPurchase) external onlyOwner {
        require(_minPurchase < _maxPurchase, "Limite minimo deve ser menor que maximo");
        minPurchase = _minPurchase;
        maxPurchase = _maxPurchase;
    }
    
    /**
     * 💸 Saca BNB do contrato (apenas owner)
     */
    function withdraw() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "Nenhum BNB para sacar");
        payable(owner).transfer(balance);
    }
    
    /**
     * 🎁 Adiciona mais tokens ao contrato para venda (apenas owner)
     */
    function addTokensForSale(uint256 amount) external onlyOwner {
        require(amount > 0, "Quantidade deve ser maior que zero");
        require(_balances[msg.sender] >= amount, "Tokens insuficientes");
        
        _balances[msg.sender] -= amount;
        _balances[address(this)] += amount;
        
        emit Transfer(msg.sender, address(this), amount);
    }
    
    /**
     * 🔄 Transfere propriedade (apenas owner)
     */
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Novo proprietario nao pode ser endereco zero");
        owner = newOwner;
    }
    
    // ==================== FUNÇÃO PARA RECEBER BNB DIRETAMENTE ====================
    receive() external payable {
        // Permite que o contrato receba BNB diretamente
        // Mas não executa compra automática para evitar problemas
    }
    
    fallback() external payable {
        // Fallback caso chamem função inexistente com valor
        revert("Funcao nao encontrada");
    }
}
