// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

string constant TOKEN_NAME = "{{TOKEN_NAME}}";
string constant TOKEN_SYMBOL = "{{TOKEN_SYMBOL}}";
uint8 constant TOKEN_DECIMALS = {{TOKEN_DECIMALS}};
uint256 constant TOKEN_SUPPLY = {{TOKEN_SUPPLY}};
address constant TOKEN_OWNER = {{TOKEN_OWNER}};
// string constant TOKEN_LOGO_URI = "{{TOKEN_LOGO_URI}}";
address constant ORIGINAL_CONTRACT = {{ORIGINAL_CONTRACT}};

contract {{TOKEN_SYMBOL}} {
    string public constant name = TOKEN_NAME;
    string public constant symbol = TOKEN_SYMBOL;
    uint8 public constant decimals = TOKEN_DECIMALS;
    uint256 public constant totalSupply = TOKEN_SUPPLY * (10 ** uint256(decimals));
    // string public logoURI;
    address public contractOwner;
    mapping(address => uint256) public balanceOf;

    constructor() {
        contractOwner = TOKEN_OWNER;
        // logoURI = TOKEN_LOGO_URI;
        balanceOf[contractOwner] = totalSupply;
    }
}
