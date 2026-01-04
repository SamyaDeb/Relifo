// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "./BeneficiaryWallet.sol";

/**
 * @title Campaign
 * @dev Individual disaster relief campaign with escrow and fund distribution
 * @notice Accepts donations and distributes funds to approved beneficiaries
 */
contract Campaign is ReentrancyGuard, Pausable {
    
    /// @notice Campaign information
    struct CampaignInfo {
        string title;
        string description;
        uint256 goalAmount;
        uint256 raisedAmount;
        string location;
        string disasterType;
        address organizer;
        address admin;
        CampaignStatus status;
        uint256 createdAt;
    }
    
    /// @notice Campaign status enum
    enum CampaignStatus { Active, Paused, Completed, Cancelled }
    
    /// @notice Donation information
    struct Donation {
        address donor;
        uint256 amount;
        uint256 timestamp;
    }
    
    /// @notice Beneficiary allocation information
    struct Allocation {
        address beneficiary;
        uint256 amount;
        uint256 timestamp;
        bool executed;
    }
    
    /// @notice Campaign details
    CampaignInfo public campaignInfo;
    
    /// @notice RELIEF token contract
    IERC20 public reliefToken;
    
    /// @notice Campaign factory contract
    address public factory;
    
    /// @notice Array of all donations
    Donation[] public donations;
    
    /// @notice Array of all allocations
    Allocation[] public allocations;
    
    /// @notice Mapping of donor to total donated amount
    mapping(address => uint256) public donorContributions;
    
    /// @notice Mapping of beneficiary to allocated amount
    mapping(address => uint256) public beneficiaryAllocations;
    
    /// @notice Mapping of beneficiary to their wallet contract
    mapping(address => address) public beneficiaryWallets;
    
    /// @notice List of all donors
    address[] public donors;
    
    /// @notice List of all beneficiaries
    address[] public beneficiaries;
    
    /// @notice Total allocated to beneficiaries
    uint256 public totalAllocated;
    
    /// @notice Event emitted when donation is received
    event DonationReceived(
        address indexed donor,
        uint256 amount,
        uint256 timestamp
    );
    
    /// @notice Event emitted when funds are allocated to beneficiary
    event FundsAllocated(
        address indexed beneficiary,
        address walletAddress,
        uint256 amount,
        uint256 timestamp
    );
    
    /// @notice Event emitted when campaign status changes
    event StatusChanged(CampaignStatus newStatus, uint256 timestamp);
    
    /// @notice Event emitted when campaign goal is reached
    event GoalReached(uint256 totalRaised, uint256 timestamp);

    /**
     * @dev Modifier to allow only organizer
     */
    modifier onlyOrganizer() {
        require(msg.sender == campaignInfo.organizer, "Campaign: Only organizer");
        _;
    }

    /**
     * @dev Modifier to allow only admin
     */
    modifier onlyAdmin() {
        require(msg.sender == campaignInfo.admin, "Campaign: Only admin");
        _;
    }

    /**
     * @dev Modifier to allow organizer or admin
     */
    modifier onlyOrganizerOrAdmin() {
        require(
            msg.sender == campaignInfo.organizer || msg.sender == campaignInfo.admin,
            "Campaign: Only organizer or admin"
        );
        _;
    }

    /**
     * @dev Constructor
     * @param _organizer Campaign organizer address
     * @param _admin Super admin address
     * @param _reliefToken RELIEF token address
     * @param _factory Campaign factory address
     * @param _title Campaign title
     * @param _description Campaign description
     * @param _goalAmount Target amount to raise
     * @param _location Disaster location
     * @param _disasterType Type of disaster
     */
    constructor(
        address _organizer,
        address _admin,
        address _reliefToken,
        address _factory,
        string memory _title,
        string memory _description,
        uint256 _goalAmount,
        string memory _location,
        string memory _disasterType
    ) {
        require(_organizer != address(0), "Campaign: Invalid organizer");
        require(_admin != address(0), "Campaign: Invalid admin");
        require(_reliefToken != address(0), "Campaign: Invalid token");
        require(_factory != address(0), "Campaign: Invalid factory");
        require(_goalAmount > 0, "Campaign: Invalid goal amount");
        
        reliefToken = IERC20(_reliefToken);
        factory = _factory;
        
        campaignInfo = CampaignInfo({
            title: _title,
            description: _description,
            goalAmount: _goalAmount,
            raisedAmount: 0,
            location: _location,
            disasterType: _disasterType,
            organizer: _organizer,
            admin: _admin,
            status: CampaignStatus.Active,
            createdAt: block.timestamp
        });
    }

    /**
     * @notice Donate RELIEF tokens to campaign
     * @param amount Amount of tokens to donate
     */
    function donate(uint256 amount) external nonReentrant whenNotPaused {
        require(campaignInfo.status == CampaignStatus.Active, "Campaign: Not active");
        require(amount > 0, "Campaign: Amount must be greater than 0");
        
        // Transfer tokens from donor to campaign
        require(
            reliefToken.transferFrom(msg.sender, address(this), amount),
            "Campaign: Token transfer failed"
        );
        
        // Update state
        campaignInfo.raisedAmount += amount;
        
        // Track donor
        if (donorContributions[msg.sender] == 0) {
            donors.push(msg.sender);
        }
        donorContributions[msg.sender] += amount;
        
        // Record donation
        donations.push(Donation({
            donor: msg.sender,
            amount: amount,
            timestamp: block.timestamp
        }));
        
        emit DonationReceived(msg.sender, amount, block.timestamp);
        
        // Check if goal reached
        if (campaignInfo.raisedAmount >= campaignInfo.goalAmount) {
            emit GoalReached(campaignInfo.raisedAmount, block.timestamp);
        }
    }

    /**
     * @notice Allocate funds to beneficiary and create wallet
     * @param beneficiary Beneficiary address
     * @param amount Amount to allocate
     * @return walletAddress Address of created beneficiary wallet
     */
    function allocateFunds(address beneficiary, uint256 amount) 
        external 
        nonReentrant 
        onlyOrganizerOrAdmin 
        returns (address walletAddress) 
    {
        require(beneficiary != address(0), "Campaign: Invalid beneficiary");
        require(amount > 0, "Campaign: Amount must be greater than 0");
        require(
            campaignInfo.raisedAmount >= totalAllocated + amount,
            "Campaign: Insufficient campaign balance"
        );
        
        // Create beneficiary wallet if doesn't exist
        if (beneficiaryWallets[beneficiary] == address(0)) {
            BeneficiaryWallet wallet =,
                factory new BeneficiaryWallet(
                beneficiary,
                address(reliefToken),
                address(this),
                campaignInfo.organizer
            );
            beneficiaryWallets[beneficiary] = address(wallet);
            beneficiaries.push(beneficiary);
        }
        
        walletAddress = beneficiaryWallets[beneficiary];
        
        // Transfer tokens to beneficiary wallet
        require(
            reliefToken.transfer(walletAddress, amount),
            "Campaign: Token transfer failed"
        );
        
        // Update state
        totalAllocated += amount;
        beneficiaryAllocations[beneficiary] += amount;
        
        // Record allocation
        allocations.push(Allocation({
            beneficiary: beneficiary,
            amount: amount,
            timestamp: block.timestamp,
            executed: true
        }));
        
        emit FundsAllocated(beneficiary, walletAddress, amount, block.timestamp);
        
        return walletAddress;
    }

    /**
     * @notice Get campaign balance
     * @return Current RELIEF token balance
     */
    function getBalance() external view returns (uint256) {
        return reliefToken.balanceOf(address(this));
    }

    /**
     * @notice Get available balance for allocation
     * @return Available balance (raised - allocated)
     */
    function getAvailableBalance() external view returns (uint256) {
        return campaignInfo.raisedAmount - totalAllocated;
    }

    /**
     * @notice Get all donors
     * @return Array of donor addresses
     */
    function getDonors() external view returns (address[] memory) {
        return donors;
    }

    /**
     * @notice Get all beneficiaries
     * @return Array of beneficiary addresses
     */
    function getBeneficiaries() external view returns (address[] memory) {
        return beneficiaries;
    }

    /**
     * @notice Get total donations count
     * @return Number of donations
     */
    function getDonationsCount() external view returns (uint256) {
        return donations.length;
    }

    /**
     * @notice Get total allocations count
     * @return Number of allocations
     */
    function getAllocationsCount() external view returns (uint256) {
        return allocations.length;
    }

    /**
     * @notice Get campaign completion percentage
     * @return Percentage (0-100)
     */
    function getCompletionPercentage() external view returns (uint256) {
        if (campaignInfo.goalAmount == 0) return 0;
        return (campaignInfo.raisedAmount * 100) / campaignInfo.goalAmount;
    }

    /**
     * @notice Pause campaign
     * @dev Only organizer or admin
     */
    function pause() external onlyOrganizerOrAdmin {
        _pause();
        campaignInfo.status = CampaignStatus.Paused;
        emit StatusChanged(CampaignStatus.Paused, block.timestamp);
    }

    /**
     * @notice Unpause campaign
     * @dev Only organizer or admin
     */
    function unpause() external onlyOrganizerOrAdmin {
        _unpause();
        campaignInfo.status = CampaignStatus.Active;
        emit StatusChanged(CampaignStatus.Active, block.timestamp);
    }

    /**
     * @notice Mark campaign as completed
     * @dev Only organizer or admin
     */
    function markCompleted() external onlyOrganizerOrAdmin {
        campaignInfo.status = CampaignStatus.Completed;
        emit StatusChanged(CampaignStatus.Completed, block.timestamp);
    }

    /**
     * @notice Cancel campaign
     * @dev Only admin can cancel
     */
    function cancel() external onlyAdmin {
        campaignInfo.status = CampaignStatus.Cancelled;
        _pause();
        emit StatusChanged(CampaignStatus.Cancelled, block.timestamp);
    }

    /**
     * @notice Get beneficiary wallet address
     * @param beneficiary Beneficiary address
     * @return Wallet contract address
     */
    function getBeneficiaryWallet(address beneficiary) external view returns (address) {
        return beneficiaryWallets[beneficiary];
    }
}
