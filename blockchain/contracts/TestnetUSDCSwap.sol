// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title TestnetUSDCSwap
 * @dev Simple swap contract for testnet - exchanges POL for USDC at a fixed rate
 * @notice For testnet use only - real deployment should use DEX integration
 */
contract TestnetUSDCSwap is Ownable, ReentrancyGuard {
    
    /// @notice USDC token contract
    IERC20 public usdc;
    
    /// @notice Exchange rate: USDC per POL (in USDC decimals, 6)
    /// @dev 160000 = 0.16 USDC per 1 POL (at $0.16/POL price)
    uint256 public exchangeRate = 160000; // 0.16 USDC per POL
    
    /// @notice Total POL received
    uint256 public totalPOLReceived;
    
    /// @notice Total USDC distributed
    uint256 public totalUSDCDistributed;
    
    /// @notice Event emitted when swap occurs
    event SwapExecuted(
        address indexed user,
        uint256 polAmount,
        uint256 usdcAmount,
        uint256 timestamp
    );
    
    /// @notice Event emitted when exchange rate updated
    event ExchangeRateUpdated(uint256 oldRate, uint256 newRate);
    
    /// @notice Event emitted when USDC withdrawn by owner
    event USDCWithdrawn(address indexed to, uint256 amount);
    
    /// @notice Event emitted when POL withdrawn by owner
    event POLWithdrawn(address indexed to, uint256 amount);

    /**
     * @dev Constructor
     * @param _usdc USDC token address
     * @param initialOwner Address of the initial owner
     */
    constructor(address _usdc, address initialOwner) Ownable(initialOwner) {
        require(_usdc != address(0), "TestnetUSDCSwap: Invalid USDC address");
        usdc = IERC20(_usdc);
    }

    /**
     * @notice Swap POL for USDC
     * @dev User sends POL, receives USDC at current exchange rate
     */
    function swapPOLforUSDC() external payable nonReentrant {
        require(msg.value > 0, "TestnetUSDCSwap: No POL sent");
        
        // Calculate USDC amount: (POL in wei * exchangeRate) / 1e18
        // POL has 18 decimals, USDC has 6 decimals, exchangeRate is in USDC units (6 decimals)
        uint256 usdcAmount = (msg.value * exchangeRate) / 1e18;
        
        require(usdcAmount > 0, "TestnetUSDCSwap: Amount too small");
        require(usdc.balanceOf(address(this)) >= usdcAmount, "TestnetUSDCSwap: Insufficient USDC liquidity");
        
        // Transfer USDC to user
        require(usdc.transfer(msg.sender, usdcAmount), "TestnetUSDCSwap: USDC transfer failed");
        
        // Update stats
        totalPOLReceived += msg.value;
        totalUSDCDistributed += usdcAmount;
        
        emit SwapExecuted(msg.sender, msg.value, usdcAmount, block.timestamp);
    }
    
    /**
     * @notice Get estimated USDC output for a given POL amount
     * @param polAmount Amount of POL to swap (in wei)
     * @return usdcAmount Estimated USDC output
     */
    function getEstimatedUSDC(uint256 polAmount) external view returns (uint256 usdcAmount) {
        return (polAmount * exchangeRate) / 1e18;
    }
    
    /**
     * @notice Get contract's USDC balance (liquidity)
     * @return balance USDC balance
     */
    function getUSDCBalance() external view returns (uint256 balance) {
        return usdc.balanceOf(address(this));
    }
    
    /**
     * @notice Get contract's POL balance
     * @return balance POL balance
     */
    function getPOLBalance() external view returns (uint256 balance) {
        return address(this).balance;
    }
    
    /**
     * @notice Update exchange rate
     * @dev Only owner can update
     * @param newRate New exchange rate (USDC per POL, in 6 decimals)
     */
    function setExchangeRate(uint256 newRate) external onlyOwner {
        require(newRate > 0, "TestnetUSDCSwap: Invalid rate");
        uint256 oldRate = exchangeRate;
        exchangeRate = newRate;
        emit ExchangeRateUpdated(oldRate, newRate);
    }
    
    /**
     * @notice Withdraw USDC from contract
     * @dev Only owner can withdraw
     * @param to Address to send USDC
     * @param amount Amount to withdraw
     */
    function withdrawUSDC(address to, uint256 amount) external onlyOwner {
        require(to != address(0), "TestnetUSDCSwap: Invalid address");
        require(usdc.transfer(to, amount), "TestnetUSDCSwap: Transfer failed");
        emit USDCWithdrawn(to, amount);
    }
    
    /**
     * @notice Withdraw POL from contract
     * @dev Only owner can withdraw
     * @param to Address to send POL
     * @param amount Amount to withdraw
     */
    function withdrawPOL(address payable to, uint256 amount) external onlyOwner {
        require(to != address(0), "TestnetUSDCSwap: Invalid address");
        require(address(this).balance >= amount, "TestnetUSDCSwap: Insufficient balance");
        (bool success, ) = to.call{value: amount}("");
        require(success, "TestnetUSDCSwap: POL transfer failed");
        emit POLWithdrawn(to, amount);
    }
    
    /**
     * @notice Receive POL directly (for funding)
     */
    receive() external payable {}
}
