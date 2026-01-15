// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title ReliefTokenSale
 * @dev Contract for exchanging USDC to RELIEF tokens at 1:1 ratio
 * @notice Donors can buy RELIEF tokens by transferring USDC to this contract
 */
contract ReliefTokenSale is Ownable, ReentrancyGuard, Pausable {
    
    /// @notice RELIEF token contract
    IERC20 public reliefToken;
    
    /// @notice USDC token contract
    IERC20 public usdcToken;
    
    /// @notice Exchange rate: 1 USDC = 1 RELIEF (considering decimals: USDC has 6, RELIEF has 18)
    uint256 public constant USDC_TO_RELIEF_MULTIPLIER = 10**12; // Convert 6 decimals to 18
    
    /// @notice Minimum purchase amount (0.01 USDC = 10,000 with 6 decimals)
    uint256 public constant MIN_PURCHASE = 10000; // 0.01 USDC
    
    /// @notice Maximum purchase amount per transaction (10,000 USDC)
    uint256 public constant MAX_PURCHASE = 10000 * 10**6; // 10,000 USDC
    
    /// @notice Total USDC raised
    uint256 public totalRaised;
    
    /// @notice Total tokens sold
    uint256 public totalTokensSold;
    
    /// @notice Mapping of buyer addresses to amount purchased
    mapping(address => uint256) public purchases;
    
    /// @notice Event emitted when tokens are purchased
    event TokensPurchased(
        address indexed buyer,
        uint256 usdcAmount,
        uint256 tokenAmount,
        uint256 timestamp
    );
    
    /// @notice Event emitted when USDC is withdrawn
    event USDCWithdrawn(address indexed owner, uint256 amount);
    
    /// @notice Event emitted when unsold tokens are withdrawn
    event TokensWithdrawn(address indexed owner, uint256 amount);

    /**
     * @dev Constructor
     * @param _reliefToken Address of RELIEF token contract
     * @param _usdcToken Address of USDC token contract
     * @param initialOwner Address of the initial owner (super admin)
     */
    constructor(address _reliefToken, address _usdcToken, address initialOwner) Ownable(initialOwner) {
        require(_reliefToken != address(0), "ReliefTokenSale: Invalid relief token address");
        require(_usdcToken != address(0), "ReliefTokenSale: Invalid USDC token address");
        reliefToken = IERC20(_reliefToken);
        usdcToken = IERC20(_usdcToken);
    }

    /**
     * @notice Buy RELIEF tokens with USDC
     * @dev User must approve this contract to spend USDC first
     * @param usdcAmount Amount of USDC to spend (with 6 decimals)
     */
    function buyTokens(uint256 usdcAmount) external nonReentrant whenNotPaused {
        require(usdcAmount >= MIN_PURCHASE, "ReliefTokenSale: Amount below minimum");
        require(usdcAmount <= MAX_PURCHASE, "ReliefTokenSale: Amount exceeds maximum");
        
        // Calculate RELIEF token amount (convert USDC 6 decimals to RELIEF 18 decimals)
        uint256 tokenAmount = usdcAmount * USDC_TO_RELIEF_MULTIPLIER;
        
        require(
            reliefToken.balanceOf(address(this)) >= tokenAmount,
            "ReliefTokenSale: Insufficient tokens in contract"
        );
        
        // Transfer USDC from buyer to this contract
        require(
            usdcToken.transferFrom(msg.sender, address(this), usdcAmount),
            "ReliefTokenSale: USDC transfer failed"
        );
        
        // Update state
        totalRaised += usdcAmount;
        totalTokensSold += tokenAmount;
        purchases[msg.sender] += tokenAmount;
        
        // Transfer RELIEF tokens to buyer
        require(
            reliefToken.transfer(msg.sender, tokenAmount),
            "ReliefTokenSale: Token transfer failed"
        );
        
        emit TokensPurchased(msg.sender, usdcAmount, tokenAmount, block.timestamp);
    }

    /**
     * @notice Withdraw collected USDC to owner
     * @dev Only owner can withdraw
     */
    function withdrawUSDC() external onlyOwner nonReentrant {
        uint256 balance = usdcToken.balanceOf(address(this));
        require(balance > 0, "ReliefTokenSale: No USDC to withdraw");
        
        require(
            usdcToken.transfer(owner(), balance),
            "ReliefTokenSale: USDC transfer failed"
        );
        
        emit USDCWithdrawn(owner(), balance);
    }

    /**
     * @notice Withdraw unsold RELIEF tokens
     * @dev Only owner can withdraw unsold tokens
     * @param amount Amount of tokens to withdraw
     */
    function withdrawUnsoldTokens(uint256 amount) external onlyOwner nonReentrant {
        require(
            reliefToken.balanceOf(address(this)) >= amount,
            "ReliefTokenSale: Insufficient token balance"
        );
        
        require(
            reliefToken.transfer(owner(), amount),
            "ReliefTokenSale: Token transfer failed"
        );
        
        emit TokensWithdrawn(owner(), amount);
    }

    /**
     * @notice Pause token sale
     * @dev Only owner can pause
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @notice Unpause token sale
     * @dev Only owner can unpause
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    /**
     * @notice Get available tokens for sale
     * @return Available token balance
     */
    function getAvailableTokens() external view returns (uint256) {
        return reliefToken.balanceOf(address(this));
    }

    /**
     * @notice Calculate token amount for given USDC amount
     * @param usdcAmount Amount of USDC (with 6 decimals)
     * @return Token amount (with 18 decimals)
     */
    function calculateTokenAmount(uint256 usdcAmount) external pure returns (uint256) {
        return usdcAmount * USDC_TO_RELIEF_MULTIPLIER;
    }
    
    /**
     * @notice Get USDC balance of this contract
     * @return USDC balance
     */
    function getUSDCBalance() external view returns (uint256) {
        return usdcToken.balanceOf(address(this));
    }

    /**
     * @notice Get purchase info for an address
     * @param buyer Address of buyer
     * @return Total tokens purchased by buyer
     */
    function getPurchaseInfo(address buyer) external view returns (uint256) {
        return purchases[buyer];
    }
}
