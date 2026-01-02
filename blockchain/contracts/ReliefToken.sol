// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title ReliefToken
 * @dev ERC20 token for disaster relief platform
 * @notice This token is used for transparent donations and fund distribution
 */
contract ReliefToken is ERC20, ERC20Burnable, Ownable, Pausable {
    
    /// @notice Maximum supply of RELIEF tokens (10 million)
    uint256 public constant MAX_SUPPLY = 10_000_000 * 10**18;
    
    /// @notice Event emitted when tokens are minted
    event TokensMinted(address indexed to, uint256 amount);
    
    /// @notice Event emitted when tokens are burned
    event TokensBurned(address indexed from, uint256 amount);

    /**
     * @dev Constructor mints initial supply to deployer (super admin)
     * @param initialOwner Address of the initial owner (super admin)
     */
    constructor(address initialOwner) ERC20("Relief Token", "RELIEF") Ownable(initialOwner) {
        // Mint initial supply to super admin
        _mint(initialOwner, MAX_SUPPLY);
        emit TokensMinted(initialOwner, MAX_SUPPLY);
    }

    /**
     * @notice Mint new tokens (only owner can mint, up to max supply)
     * @param to Address to receive tokens
     * @param amount Amount of tokens to mint
     */
    function mint(address to, uint256 amount) external onlyOwner {
        require(totalSupply() + amount <= MAX_SUPPLY, "ReliefToken: Exceeds max supply");
        _mint(to, amount);
        emit TokensMinted(to, amount);
    }

    /**
     * @notice Pause all token transfers
     * @dev Only owner can pause
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @notice Unpause token transfers
     * @dev Only owner can unpause
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    /**
     * @dev Hook that is called before any transfer of tokens
     * @param from Address sending tokens
     * @param to Address receiving tokens
     * @param amount Amount of tokens
     */
    function _update(address from, address to, uint256 amount) internal override whenNotPaused {
        super._update(from, to, amount);
    }

    /**
     * @notice Burn tokens from caller's balance
     * @param amount Amount to burn
     */
    function burn(uint256 amount) public override {
        super.burn(amount);
        emit TokensBurned(msg.sender, amount);
    }

    /**
     * @notice Burn tokens from another account (requires approval)
     * @param account Account to burn from
     * @param amount Amount to burn
     */
    function burnFrom(address account, uint256 amount) public override {
        super.burnFrom(account, amount);
        emit TokensBurned(account, amount);
    }
}
