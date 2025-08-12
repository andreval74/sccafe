// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/*
Teste de Formatação de Supply
Gerado por: Smart Contract Cafe
https://smartcontract.cafe
*/

/* ================================================================
 * ⚙️ CONFIGURAÇÕES DO TOKEN
 * ================================================================ */
string constant TOKEN_NAME = "USDT Test";           // Nome do token
string constant TOKEN_SYMBOL = "USDT018";           // Símbolo do token
uint8 constant TOKEN_DECIMALS = 18;                 // Casas decimais
uint256 constant TOKEN_SUPPLY = 1_000_000_000;      // Supply inicial formatado corretamente
address constant TOKEN_OWNER = 0x0b81337F18767565D2eA40913799317A25DC4bc5; // Dono inicial do contrato

/* ================================================================
 * 💎 CONTRATO PRINCIPAL
 * ================================================================ */
contract USDT018 {
    /* ================================================================
     * 🔗 VARIÁVEIS PÚBLICAS DO TOKEN
     * ================================================================ */
    string public constant name = TOKEN_NAME;
    string public constant symbol = TOKEN_SYMBOL;
    uint8 public constant decimals = TOKEN_DECIMALS;
    uint256 public constant totalSupply = TOKEN_SUPPLY * 10**TOKEN_DECIMALS;
    
    /* ================================================================
     * 📊 MAPEAMENTOS
     * ================================================================ */
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;
    
    /* ================================================================
     * 📢 EVENTOS
     * ================================================================ */
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    
    /* ================================================================
     * 🏗️ CONSTRUTOR
     * ================================================================ */
    constructor() {
        balanceOf[TOKEN_OWNER] = totalSupply;
        emit Transfer(address(0), TOKEN_OWNER, totalSupply);
    }
    
    /* ================================================================
     * 💸 FUNÇÕES DE TRANSFERÊNCIA
     * ================================================================ */
    function transfer(address to, uint256 value) public returns (bool) {
        require(balanceOf[msg.sender] >= value, "Insufficient balance");
        balanceOf[msg.sender] -= value;
        balanceOf[to] += value;
        emit Transfer(msg.sender, to, value);
        return true;
    }
    
    function approve(address spender, uint256 value) public returns (bool) {
        allowance[msg.sender][spender] = value;
        emit Approval(msg.sender, spender, value);
        return true;
    }
    
    function transferFrom(address from, address to, uint256 value) public returns (bool) {
        require(balanceOf[from] >= value, "Insufficient balance");
        require(allowance[from][msg.sender] >= value, "Insufficient allowance");
        
        balanceOf[from] -= value;
        balanceOf[to] += value;
        allowance[from][msg.sender] -= value;
        
        emit Transfer(from, to, value);
        return true;
    }
}
