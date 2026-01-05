// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title ICampaignFactory
 * @dev Interface for CampaignFactory to check merchant verification
 */
interface ICampaignFactory {
    function isVerifiedMerchant(address merchant) external view returns (bool);
}

/**
 * @title BeneficiaryWallet
 * @dev Wallet with spending restrictions for disaster relief beneficiaries
 * @notice Allows beneficiaries to spend funds with category-based limits
 */
contract BeneficiaryWallet is ReentrancyGuard, Pausable {
    
    /// @notice Spending categories
    enum SpendingCategory { Food, Medicine, Shelter, Education, Other }
    
    /// @notice Spending record
    struct Spending {
        address merchant;
        uint256 amount;
        SpendingCategory category;
        string description;
        uint256 timestamp;
    }
    
    /// @notice Beneficiary (owner of this wallet)
    address public beneficiary;
    
    /// @notice RELIEF token contract
    IERC20 public reliefToken;
    
    /// @notice Campaign contract that created this wallet
    address public campaign;
    
    /// @notice Campaign organizer (can approve merchants and set limits)
    address public organizer;
    
    /// @notice Campaign factory for merchant verification
    address public factory;
    
    /// @notice Array of all spending records
    Spending[] public spendingHistory;
    
    /// @notice Mapping of category to spending limit per transaction
    mapping(SpendingCategory => uint256) public categoryLimits;
    
    /// @notice Mapping of category to total spent
    mapping(SpendingCategory => uint256) public categorySpent;
    
    /// @notice Mapping of merchant to approved categories
    mapping(address => mapping(SpendingCategory => bool)) public approvedMerchants;
    
    /// @notice List of all approved merchant addresses
    address[] public merchants;
    
    /// @notice Total amount spent
    uint256 public totalSpent;
    
    /// @notice Event emitted when spending occurs
    event Spent(
        address indexed merchant,
        uint256 amount,
        SpendingCategory category,
        string description,
        uint256 timestamp
    );
    
    /// @notice Event emitted when merchant is approved
    event MerchantApproved(
        address indexed merchant,
        SpendingCategory category,
        uint256 timestamp
    );
    
    /// @notice Event emitted when merchant is revoked
    event MerchantRevoked(
        address indexed merchant,
        SpendingCategory category,
        uint256 timestamp
    );
    
    /// @notice Event emitted when category limit is updated
    event CategoryLimitUpdated(
        SpendingCategory category,
        uint256 newLimit,
        uint256 timestamp
    );
    
    /// @notice Event emitted when funds are received
    event FundsReceived(address indexed from, uint256 amount, uint256 timestamp);

    /**
     * @dev Modifier to allow only beneficiary
     */
    modifier onlyBeneficiary() {
        require(msg.sender == beneficiary, "BeneficiaryWallet: Only beneficiary");
        _;
    }

    /**
     * @dev Modifier to allow only organizer
     */
    modifier onlyOrganizer() {
        require(msg.sender == organizer, "BeneficiaryWallet: Only organizer");
        _;
    }

    /**
     * @dev Modifier to allow only campaign contract
     */
    modifier onlyCampaign() {
        require(msg.sender == campaign, "BeneficiaryWallet: Only campaign");
        _;
    }

    /**
     * @dev Constructor
     * @param _beneficiary Beneficiary address (wallet owner)
     * @param _reliefToken RELIEF token address
     * @param _campaign Campaign contract address
     * @param _organizer Campaign organizer address
     * @param _factory Campaign factory address for merchant verification
     */
    constructor(
        address _beneficiary,
        address _reliefToken,
        address _campaign,
        address _organizer,
        address _factory
    ) {
        require(_beneficiary != address(0), "BeneficiaryWallet: Invalid beneficiary");
        require(_reliefToken != address(0), "BeneficiaryWallet: Invalid token");
        require(_campaign != address(0), "BeneficiaryWallet: Invalid campaign");
        require(_organizer != address(0), "BeneficiaryWallet: Invalid organizer");
        require(_factory != address(0), "BeneficiaryWallet: Invalid factory");
        
        beneficiary = _beneficiary;
        reliefToken = IERC20(_reliefToken);
        campaign = _campaign;
        organizer = _organizer;
        factory = _factory;
        
        // Set default category limits (can be updated by organizer)
        categoryLimits[SpendingCategory.Food] = 1000 * 10**18;       // 1000 RELIEF
        categoryLimits[SpendingCategory.Medicine] = 2000 * 10**18;   // 2000 RELIEF
        categoryLimits[SpendingCategory.Shelter] = 5000 * 10**18;    // 5000 RELIEF
        categoryLimits[SpendingCategory.Education] = 1500 * 10**18;  // 1500 RELIEF
        categoryLimits[SpendingCategory.Other] = 500 * 10**18;       // 500 RELIEF
    }

    /**
     * @notice Spend funds at approved merchant
     * @param merchant Merchant address
     * @param amount Amount to spend
     * @param category Spending category
     * @param description Description of purchase
     */
    function spend(
        address merchant,
        uint256 amount,
        SpendingCategory category,
        string memory description
    ) external nonReentrant onlyBeneficiary whenNotPaused {
        require(merchant != address(0), "BeneficiaryWallet: Invalid merchant");
        require(amount > 0, "BeneficiaryWallet: Amount must be greater than 0");
        
        // Check if merchant is globally verified by admin OR approved by organizer for this category
        bool isGloballyVerified = ICampaignFactory(factory).isVerifiedMerchant(merchant);
        bool isLocallyApproved = approvedMerchants[merchant][category];
        
        require(
            isGloballyVerified || isLocallyApproved,
            "BeneficiaryWallet: Merchant not verified"
        );
        
        require(
            amount <= categoryLimits[category],
            "BeneficiaryWallet: Amount exceeds category limit"
        );
        require(
            reliefToken.balanceOf(address(this)) >= amount,
            "BeneficiaryWallet: Insufficient balance"
        );
        
        // Transfer tokens to merchant
        require(
            reliefToken.transfer(merchant, amount),
            "BeneficiaryWallet: Token transfer failed"
        );
        
        // Update state
        totalSpent += amount;
        categorySpent[category] += amount;
        
        // Record spending
        spendingHistory.push(Spending({
            merchant: merchant,
            amount: amount,
            category: category,
            description: description,
            timestamp: block.timestamp
        }));
        
        emit Spent(merchant, amount, category, description, block.timestamp);
    }

    /**
     * @notice Approve merchant for specific category
     * @dev Only organizer can approve merchants. Merchant must be verified by admin first.
     * @param merchant Merchant address
     * @param category Spending category
     */
    function approveMerchant(address merchant, SpendingCategory category) 
        external 
        onlyOrganizer 
    {
        require(merchant != address(0), "BeneficiaryWallet: Invalid merchant");
        require(!approvedMerchants[merchant][category], "BeneficiaryWallet: Already approved");
        
        // Check if merchant is verified by admin in factory
        require(
            ICampaignFactory(factory).isVerifiedMerchant(merchant),
            "BeneficiaryWallet: Merchant not verified by admin"
        );
        
        approvedMerchants[merchant][category] = true;
        
        // Add to merchants list if first approval
        bool isNewMerchant = true;
        for (uint i = 0; i < merchants.length; i++) {
            if (merchants[i] == merchant) {
                isNewMerchant = false;
                break;
            }
        }
        if (isNewMerchant) {
            merchants.push(merchant);
        }
        
        emit MerchantApproved(merchant, category, block.timestamp);
    }

    /**
     * @notice Revoke merchant approval for category
     * @dev Only organizer can revoke
     * @param merchant Merchant address
     * @param category Spending category
     */
    function revokeMerchant(address merchant, SpendingCategory category) 
        external 
        onlyOrganizer 
    {
        require(
            approvedMerchants[merchant][category],
            "BeneficiaryWallet: Merchant not approved"
        );
        
        approvedMerchants[merchant][category] = false;
        emit MerchantRevoked(merchant, category, block.timestamp);
    }

    /**
     * @notice Update spending limit for category
     * @dev Only organizer can update limits
     * @param category Spending category
     * @param newLimit New limit amount
     */
    function setCategoryLimit(SpendingCategory category, uint256 newLimit) 
        external 
        onlyOrganizer 
    {
        require(newLimit > 0, "BeneficiaryWallet: Limit must be greater than 0");
        
        categoryLimits[category] = newLimit;
        emit CategoryLimitUpdated(category, newLimit, block.timestamp);
    }

    /**
     * @notice Get wallet balance
     * @return Current RELIEF token balance
     */
    function getBalance() external view returns (uint256) {
        return reliefToken.balanceOf(address(this));
    }

    /**
     * @notice Get remaining amount in category
     * @param category Spending category
     * @return Remaining amount available in category
     */
    function getRemainingInCategory(SpendingCategory category) 
        external 
        view 
        returns (uint256) 
    {
        if (categorySpent[category] >= categoryLimits[category]) {
            return 0;
        }
        return categoryLimits[category] - categorySpent[category];
    }

    /**
     * @notice Get spending history count
     * @return Number of spending records
     */
    function getSpendingHistoryCount() external view returns (uint256) {
        return spendingHistory.length;
    }

    /**
     * @notice Get all approved merchants
     * @return Array of merchant addresses
     */
    function getApprovedMerchants() external view returns (address[] memory) {
        return merchants;
    }

    /**
     * @notice Check if merchant is approved for category
     * @param merchant Merchant address
     * @param category Spending category
     * @return True if approved
     */
    function isMerchantApproved(address merchant, SpendingCategory category) 
        external 
        view 
        returns (bool) 
    {
        return approvedMerchants[merchant][category];
    }

    /**
     * @notice Pause all spending
     * @dev Only organizer can pause
     */
    function pause() external onlyOrganizer {
        _pause();
    }

    /**
     * @notice Unpause spending
     * @dev Only organizer can unpause
     */
    function unpause() external onlyOrganizer {
        _unpause();
    }

    /**
     * @notice Receive tokens notification
     * @dev This is called when tokens are transferred to this wallet
     */
    function notifyFundsReceived(uint256 amount) external onlyCampaign {
        emit FundsReceived(msg.sender, amount, block.timestamp);
    }
}
