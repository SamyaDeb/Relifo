// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@uniswap/v3-periphery/contracts/interfaces/ISwapRouter.sol";

/**
 * @title POLtoUSDCSwap
 * @dev Contract to swap native POL to USDC stablecoin on Polygon Amoy testnet
 * @notice Donors can call swapPOLtoUSDC() to exchange POL for USDC directly on the website
 */
contract POLtoUSDCSwap is Ownable, ReentrancyGuard {
    
    /// @notice Uniswap V3 Router address on Polygon Amoy
    ISwapRouter public constant UNISWAP_ROUTER = ISwapRouter(0xE592427A0AEce92De3Edee1F18E0157C05861564);
    
    /// @notice WMATIC (wrapped POL) token address on Amoy
    address public constant WMATIC = 0x9c3C9283D3e44854cA1CC2e7cA2f22701e42d18e;
    
    /// @notice USDC token address on Amoy
    address public constant USDC = 0xBc03f5c495d594304052824924461A24fa6d4163;
    
    /// @notice Uniswap V3 fee tier (0.3%)
    uint24 public constant POOL_FEE = 3000;
    
    /// @notice Minimum amount of USDC to receive (slippage protection)
    uint256 public minUSDCOut = 1e6; // 1 USDC with 6 decimals
    
    /// @notice Total POL swapped
    uint256 public totalPOLSwapped;
    
    /// @notice Total USDC received
    uint256 public totalUSDCReceived;
    
    /// @notice Event emitted when swap occurs
    event SwapExecuted(
        address indexed donor,
        uint256 polAmount,
        uint256 usdcAmount,
        uint256 timestamp
    );
    
    /// @notice Event emitted when minimum output updated
    event MinUSDCOutUpdated(uint256 newMinimum);

    /**
     * @dev Constructor
     * @param initialOwner Address of the initial owner
     */
    constructor(address initialOwner) Ownable(initialOwner) {}

    /**
     * @notice Swap native POL to USDC
     * @dev Donors call this function with POL, receive USDC
     * @return amountOut Amount of USDC received
     */
    function swapPOLtoUSDC() external payable nonReentrant returns (uint256 amountOut) {
        require(msg.value > 0, "POLtoUSDCSwap: No POL sent");
        
        // Wrap POL to WMATIC
        IWMATIC(WMATIC).deposit{value: msg.value}();
        
        // Approve WMATIC to Uniswap Router
        IERC20(WMATIC).approve(address(UNISWAP_ROUTER), msg.value);
        
        // Execute swap on Uniswap V3
        ISwapRouter.ExactInputSingleParams memory params = ISwapRouter.ExactInputSingleParams({
            tokenIn: WMATIC,
            tokenOut: USDC,
            fee: POOL_FEE,
            recipient: msg.sender,
            deadline: block.timestamp + 300, // 5 minutes deadline
            amountIn: msg.value,
            amountOutMinimum: minUSDCOut,
            sqrtPriceLimitX96: 0 // No price limit
        });
        
        // Perform the swap
        amountOut = UNISWAP_ROUTER.exactInputSingle(params);
        
        // Track swap statistics
        totalPOLSwapped += msg.value;
        totalUSDCReceived += amountOut;
        
        // Emit event
        emit SwapExecuted(msg.sender, msg.value, amountOut, block.timestamp);
    }

    /**
     * @notice Get estimated USDC output for given POL amount (off-chain simulation)
     * @dev This is approximate - actual output depends on pool liquidity
     * @param polAmount Amount of POL to swap
     * @return Estimated USDC amount (approximate)
     */
    function getEstimatedUSDCOut(uint256 polAmount) external pure returns (uint256) {
        // Rough estimate: 1 POL ≈ 0.26 USDC on testnet
        // This is just for display purposes
        return (polAmount * 26) / 100;
    }

    /**
     * @notice Update minimum USDC output (slippage protection)
     * @dev Only owner can update
     * @param newMinimum New minimum USDC amount (in wei, with 6 decimals)
     */
    function setMinUSDCOut(uint256 newMinimum) external onlyOwner {
        minUSDCOut = newMinimum;
        emit MinUSDCOutUpdated(newMinimum);
    }

    /**
     * @notice Withdraw accidentally sent tokens
     * @dev Only owner can withdraw
     * @param token Token address to withdraw
     * @param amount Amount to withdraw
     */
    function withdrawToken(address token, uint256 amount) external onlyOwner {
        require(IERC20(token).transfer(msg.sender, amount), "Transfer failed");
    }

    /**
     * @notice Withdraw accidentally sent POL
     * @dev Only owner can withdraw
     */
    function withdrawPOL() external onlyOwner {
        (bool success, ) = payable(msg.sender).call{value: address(this).balance}("");
        require(success, "Withdrawal failed");
    }

    /**
     * @notice Receive function to accept POL
     */
    receive() external payable {}
}

/**
 * @title IWMATIC
 * @dev Interface for WMATIC (wrapped POL) token
 */
interface IWMATIC is IERC20 {
    function deposit() external payable;
    function withdraw(uint256 amount) external;
}