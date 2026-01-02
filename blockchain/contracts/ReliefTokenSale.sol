// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title ReliefTokenSale
 * @dev Contract for exchanging POL (MATIC) to RELIEF tokens at 1:1 ratio
 * @notice Donors can buy RELIEF tokens by sending POL to this contract
 */
contract ReliefTokenSale is Ownable, ReentrancyGuard, Pausable {
    
    /// @notice RELIEF token contract
    IERC20 public reliefToken;
    
    /// @notice Exchange rate: 1 POL = 1 RELIEF (in wei)
    uint256 public constant EXCHANGE_RATE = 1;
    
    /// @notice Minimum purchase amount (0.01 POL)
    uint256 public constant MIN_PURCHASE = 0.01 ether;
    
    /// @notice Maximum purchase amount per transaction (10,000 POL)
    uint256 public constant MAX_PURCHASE = 10000 ether;
    
    /// @notice Total POL raised
    uint256 public totalRaised;
    
    /// @notice Total tokens sold
    uint256 public totalTokensSold;
    
    /// @notice Mapping of buyer addresses to amount purchased
    mapping(address => uint256) public purchases;
    
    /// @notice Event emitted when tokens are purchased
    event TokensPurchased(
        address indexed buyer,
        uint256 polAmount,
        uint256 tokenAmount,
        uint256 timestamp
    );
    
    /// @notice Event emitted when POL is withdrawn
    event PolWithdrawn(address indexed owner, uint256 amount);
    
    /// @notice Event emitted when unsold tokens are withdrawn
    event TokensWithdrawn(address indexed owner, uint256 amount);

    /**
     * @dev Constructor
     * @param _reliefToken Address of RELIEF token contract
     * @param initialOwner Address of the initial owner (super admin)
     */
    constructor(address _reliefToken, address initialOwner) Ownable(initialOwner) {
        require(_reliefToken != address(0), "ReliefTokenSale: Invalid token address");
        reliefToken = IERC20(_reliefToken);
    }

    /**
     * @notice Buy RELIEF tokens with POL
     * @dev Automatically calculates tokens based on POL sent
     */
    function buyTokens() external payable nonReentrant whenNotPaused {
        require(msg.value >= MIN_PURCHASE, "ReliefTokenSale: Amount below minimum");
        require(msg.value <= MAX_PURCHASE, "ReliefTokenSale: Amount exceeds maximum");
        
        uint256 tokenAmount = msg.value * EXCHANGE_RATE;
        
        require(
            reliefToken.balanceOf(address(this)) >= tokenAmount,
            "ReliefTokenSale: Insufficient tokens in contract"
        );
        
        // Update state
        totalRaised += msg.value;
        totalTokensSold += tokenAmount;
        purchases[msg.sender] += tokenAmount;
        
        // Transfer tokens to buyer
        require(
            reliefToken.transfer(msg.sender, tokenAmount),
            "ReliefTokenSale: Token transfer failed"
        );
        
        emit TokensPurchased(msg.sender, msg.value, tokenAmount, block.timestamp);
    }

    /**
     * @notice Receive function to accept POL and buy tokens
     */
    receive() external payable {
        require(msg.value >= MIN_PURCHASE, "ReliefTokenSale: Amount below minimum");
        require(msg.value <= MAX_PURCHASE, "ReliefTokenSale: Amount exceeds maximum");
        
        uint256 tokenAmount = msg.value * EXCHANGE_RATE;
        
        require(
            reliefToken.balanceOf(address(this)) >= tokenAmount,
            "ReliefTokenSale: Insufficient tokens in contract"
        );
        
        totalRaised += msg.value;
        totalTokensSold += tokenAmount;
        purchases[msg.sender] += tokenAmount;
        
        require(
            reliefToken.transfer(msg.sender, tokenAmount),
            "ReliefTokenSale: Token transfer failed"
        );
        
        emit TokensPurchased(msg.sender, msg.value, tokenAmount, block.timestamp);
    }

    /**
     * @notice Withdraw collected POL to owner
     * @dev Only owner can withdraw
     */
    function withdrawPol() external onlyOwner nonReentrant {
        uint256 balance = address(this).balance;
        require(balance > 0, "ReliefTokenSale: No POL to withdraw");
        
        (bool success, ) = payable(owner()).call{value: balance}("");
        require(success, "ReliefTokenSale: POL transfer failed");
        
        emit PolWithdrawn(owner(), balance);
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
     * @notice Calculate token amount for given POL amount
     * @param polAmount Amount of POL
     * @return Token amount
     */
    function calculateTokenAmount(uint256 polAmount) external pure returns (uint256) {
        return polAmount * EXCHANGE_RATE;
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
