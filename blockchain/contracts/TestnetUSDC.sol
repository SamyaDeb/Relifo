// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title TestnetUSDC
 * @dev USDC token for Polygon Amoy testnet
 * Mimics real USDC with 6 decimals and faucet functionality
 */
contract TestnetUSDC is ERC20 {
    uint8 private constant DECIMALS = 6;
    
    constructor() ERC20("USD Coin (Testnet)", "USDC") {
        // Mint initial supply to deployer
        _mint(msg.sender, 1000000 * 10**DECIMALS);
    }
    
    function decimals() public pure override returns (uint8) {
        return DECIMALS;
    }
    
    /**
     * @dev Public faucet - anyone can get testnet USDC
     * @param amount Amount in USDC (will be converted to proper decimals)
     */
    function faucet(uint256 amount) external {
        require(amount <= 1000 * 10**DECIMALS, "Max 1000 USDC per request");
        _mint(msg.sender, amount);
    }
    
    /**
     * @dev Mint directly to an address
     */
    function mintTo(address to, uint256 amount) external {
        _mint(to, amount);
    }
}
