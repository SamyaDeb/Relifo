// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./Campaign.sol";

/**
 * @title CampaignFactory
 * @dev Factory contract for creating and managing relief campaigns
 * @notice Only approved organizers can create campaigns
 */
contract CampaignFactory is Ownable, ReentrancyGuard {
    
    /// @notice RELIEF token contract address
    address public reliefToken;
    
    /// @notice Array of all campaign addresses
    address[] public campaigns;
    
    /// @notice Mapping from organizer address to their campaigns
    mapping(address => address[]) public organizerCampaigns;
    
    /// @notice Mapping to check if address is an approved organizer
    mapping(address => bool) public approvedOrganizers;
    
    /// @notice Mapping to check if address is a verified merchant
    mapping(address => bool) public verifiedMerchants;
    
    /// @notice Array of all verified merchant addresses
    address[] public merchants;
    
    /// @notice Mapping to check if address is a campaign
    mapping(address => bool) public isCampaign;
    
    /// @notice Total number of campaigns created
    uint256 public campaignCount;
    
    /// @notice Event emitted when campaign is created
    event CampaignCreated(
        address indexed campaignAddress,
        address indexed organizer,
        string title,
        uint256 goalAmount,
        uint256 timestamp
    );
    
    /// @notice Event emitted when organizer is approved
    event OrganizerApproved(address indexed organizer, uint256 timestamp);
    
    /// @notice Event emitted when organizer is revoked
    event OrganizerRevoked(address indexed organizer, uint256 timestamp);
    
    /// @notice Event emitted when merchant is verified
    event MerchantVerified(address indexed merchant, uint256 timestamp);
    
    /// @notice Event emitted when merchant verification is revoked
    event MerchantRevoked(address indexed merchant, uint256 timestamp);

    /**
     * @dev Constructor
     * @param _reliefToken Address of RELIEF token contract
     * @param initialOwner Address of super admin
     */
    constructor(address _reliefToken, address initialOwner) Ownable(initialOwner) {
        require(_reliefToken != address(0), "CampaignFactory: Invalid token address");
        reliefToken = _reliefToken;
    }

    /**
     * @notice Approve an organizer to create campaigns
     * @dev Only owner (super admin) can approve organizers
     * @param organizer Address of organizer to approve
     */
    function approveOrganizer(address organizer) external onlyOwner {
        require(organizer != address(0), "CampaignFactory: Invalid organizer address");
        require(!approvedOrganizers[organizer], "CampaignFactory: Already approved");
        
        approvedOrganizers[organizer] = true;
        emit OrganizerApproved(organizer, block.timestamp);
    }

    /**
     * @notice Revoke organizer approval
     * @dev Only owner can revoke
     * @param organizer Address of organizer to revoke
     */
    function revokeOrganizer(address organizer) external onlyOwner {
        require(approvedOrganizers[organizer], "CampaignFactory: Not an approved organizer");
        
        approvedOrganizers[organizer] = false;
        emit OrganizerRevoked(organizer, block.timestamp);
    }

    /**
     * @notice Create a new campaign
     * @dev Only approved organizers can create campaigns
     * @param title Campaign title
     * @param description Campaign description
     * @param goalAmount Target amount to raise (in RELIEF tokens)
     * @param location Disaster location
     * @param disasterType Type of disaster
     * @return campaignAddress Address of newly created campaign
     */
    function createCampaign(
        string memory title,
        string memory description,
        uint256 goalAmount,
        string memory location,
        string memory disasterType
    ) external nonReentrant returns (address campaignAddress) {
        require(approvedOrganizers[msg.sender], "CampaignFactory: Not an approved organizer");
        require(goalAmount > 0, "CampaignFactory: Goal must be greater than 0");
        require(bytes(title).length > 0, "CampaignFactory: Title cannot be empty");
        
        // Deploy new Campaign contract
        Campaign campaign = new Campaign(
            msg.sender,      // organizer
            owner(),         // admin (super admin)
            reliefToken,     // RELIEF token address
            address(this),   // factory address
            title,
            description,
            goalAmount,
            location,
            disasterType
        );
        
        campaignAddress = address(campaign);
        
        // Store campaign
        campaigns.push(campaignAddress);
        organizerCampaigns[msg.sender].push(campaignAddress);
        isCampaign[campaignAddress] = true;
        campaignCount++;
        
        emit CampaignCreated(
            campaignAddress,
            msg.sender,
            title,
            goalAmount,
            block.timestamp
        );
        
        return campaignAddress;
    }

    /**
     * @notice Get all campaigns
     * @return Array of campaign addresses
     */
    function getAllCampaigns() external view returns (address[] memory) {
        return campaigns;
    }

    /**
     * @notice Get campaigns by organizer
     * @param organizer Address of organizer
     * @return Array of campaign addresses
     */
    function getCampaignsByOrganizer(address organizer) external view returns (address[] memory) {
        return organizerCampaigns[organizer];
    }

    /**
     * @notice Get total number of campaigns
     * @return Total campaign count
     */
    function getTotalCampaigns() external view returns (uint256) {
        return campaignCount;
    }

    /**
     * @notice Check if address is approved organizer

    /**
     * @notice Verify a merchant (Super Admin only)
     * @dev Only owner (super admin) can verify merchants
     * @param merchant Address of merchant to verify
     */
    function verifyMerchant(address merchant) external onlyOwner {
        require(merchant != address(0), "CampaignFactory: Invalid merchant address");
        require(!verifiedMerchants[merchant], "CampaignFactory: Already verified");
        
        verifiedMerchants[merchant] = true;
        merchants.push(merchant);
        emit MerchantVerified(merchant, block.timestamp);
    }

    /**
     * @notice Revoke merchant verification
     * @dev Only owner can revoke
     * @param merchant Address of merchant to revoke
     */
    function revokeMerchant(address merchant) external onlyOwner {
        require(verifiedMerchants[merchant], "CampaignFactory: Not a verified merchant");
        
        verifiedMerchants[merchant] = false;
        emit MerchantRevoked(merchant, block.timestamp);
    }

    /**
     * @notice Check if address is verified merchant
     * @param merchant Address to check
     * @return True if verified
     */
    function isVerifiedMerchant(address merchant) external view returns (bool) {
        return verifiedMerchants[merchant];
    }

    /**
     * @notice Get all verified merchants
     * @return Array of verified merchant addresses
     */
    function getAllVerifiedMerchants() external view returns (address[] memory) {
        return merchants;
    }
     * @param organizer Address to check
     * @return True if approved
     */
    function isApprovedOrganizer(address organizer) external view returns (bool) {
        return approvedOrganizers[organizer];
    }
}
