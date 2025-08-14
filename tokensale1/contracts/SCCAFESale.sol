// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IERC20 {
    function totalSupply() external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
}

contract SCCAFESale {
    event TokenPurchased(address indexed buyer, uint256 amount, uint256 bnbPaid);
    event PreSaleStatusChanged(bool status);
    event PriceUpdated(uint256 newPrice);
    
    IERC20 public token;
    
    bool public is_preselling;
    address payable public owner;
    address payable public tokenSource;
    address payable public fundReceiver;
    
    uint256 public tokenPrice; // Preço em wei por token (18 decimais)
    uint256 public soldTokens;
    uint256 public receivedFunds;
    uint256 public minPurchase = 1 * 10**18; // Mínimo 1 token
    uint256 public maxPurchase = 10000 * 10**18; // Máximo 10.000 tokens
    
    mapping(address => uint256) public purchasedTokens;
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }
    
    modifier presaleActive() {
        require(is_preselling, "Presale is not active");
        _;
    }
    
    constructor(IERC20 _token, address payable _tokenSource, uint256 _tokenPrice) {
        token = _token;
        owner = payable(msg.sender);
        tokenSource = _tokenSource;
        fundReceiver = owner;
        tokenPrice = _tokenPrice; // Ex: 1000000000000000 = 0.001 BNB por token
        is_preselling = true;
    }
    
    // Função principal de compra
    function sale(uint256 _amount) public payable presaleActive returns (bool) {
        require(_amount >= minPurchase, "Amount below minimum purchase");
        require(_amount <= maxPurchase, "Amount exceeds maximum purchase");
        
        uint256 totalCost = (_amount * tokenPrice) / 10**18;
        require(msg.value >= totalCost, "Insufficient BNB sent");
        
        // Verificar se o tokenSource tem tokens suficientes
        require(token.balanceOf(tokenSource) >= _amount, "Insufficient tokens in source");
        
        // Transferir tokens do tokenSource para o comprador
        require(token.transferFrom(tokenSource, msg.sender, _amount), "Token transfer failed");
        
        // Enviar BNB para o fundReceiver
        fundReceiver.transfer(msg.value);
        
        // Atualizar estatísticas
        soldTokens += _amount;
        receivedFunds += msg.value;
        purchasedTokens[msg.sender] += _amount;
        
        emit TokenPurchased(msg.sender, _amount, msg.value);
        
        return true;
    }
    
    // Função de compra simples (calcula automaticamente o valor)
    function buyTokens(uint256 _amount) public payable presaleActive {
        sale(_amount);
    }
    
    // Função para comprar com BNB exato
    function buyWithBNB() public payable presaleActive {
        require(msg.value > 0, "Must send BNB");
        
        uint256 tokenAmount = (msg.value * 10**18) / tokenPrice;
        require(tokenAmount >= minPurchase, "Amount below minimum purchase");
        require(tokenAmount <= maxPurchase, "Amount exceeds maximum purchase");
        
        sale(tokenAmount);
    }
    
    // Funções de visualização
    function getTokenSupply() public view returns (uint256) {
        return token.totalSupply();
    }
    
    function getTokenbalance(address _address) public view returns (uint256) {
        return token.balanceOf(_address);
    }
    
    function totalSoldTokens() public view returns (uint256) {
        return soldTokens;
    }
    
    function totalReceivedFunds() public view returns (uint256) {
        return receivedFunds;
    }
    
    function getTokenPrice() public view returns (uint256) {
        return tokenPrice;
    }
    
    function getUserPurchases(address _user) public view returns (uint256) {
        return purchasedTokens[_user];
    }
    
    // Funções administrativas
    function setTokenPrice(uint256 _newPrice) public onlyOwner {
        tokenPrice = _newPrice;
        emit PriceUpdated(_newPrice);
    }
    
    function setMinMaxPurchase(uint256 _min, uint256 _max) public onlyOwner {
        minPurchase = _min;
        maxPurchase = _max;
    }
    
    function setFundReceiver(address payable _newReceiver) public onlyOwner {
        fundReceiver = _newReceiver;
    }
    
    function setTokenSource(address payable _newSource) public onlyOwner {
        tokenSource = _newSource;
    }
    
    function togglePresale() public onlyOwner {
        is_preselling = !is_preselling;
        emit PreSaleStatusChanged(is_preselling);
    }
    
    // Função de emergência para retirar BNB
    function emergencyWithdraw() public onlyOwner {
        owner.transfer(address(this).balance);
    }
    
    // Função para retirar tokens não vendidos
    function withdrawUnsoldTokens(uint256 _amount) public onlyOwner {
        require(token.transferFrom(tokenSource, owner, _amount), "Token withdrawal failed");
    }
}