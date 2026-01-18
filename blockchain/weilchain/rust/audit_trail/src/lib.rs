//! # Audit Trail Contract for EIBS 2.0 - Relifo
//!
//! A WeilChain applet that logs Polygon transactions for cross-chain verification.
//! Provides an immutable audit trail for donations, allocations, and beneficiary spending.
//!
//! ## Features
//! - Log Polygon transactions with full metadata
//! - Verify transactions by hash
//! - Query audit statistics
//! - Prevent duplicate entries
//!
//! ## Transaction Types
//! - Donation: Donor to Campaign
//! - Allocation: Campaign to Beneficiary
//! - BeneficiarySpending: Beneficiary to Merchant
//! - MerchantPayment: Direct merchant payment
//! - Withdrawal: Fund withdrawal

use serde::{Deserialize, Serialize};
use weil_macros::{WeilType, constructor, mutate, query, smart_contract};

/// Transaction types for categorization
#[derive(Clone, Debug, Serialize, Deserialize, WeilType, PartialEq)]
pub enum TransactionType {
    Donation,
    Allocation,
    BeneficiarySpending,
    MerchantPayment,
    Withdrawal,
}

/// A single audit entry representing a logged Polygon transaction
#[derive(Clone, Debug, Serialize, Deserialize, WeilType)]
pub struct AuditEntry {
    pub id: String,
    pub polygon_tx_hash: String,
    pub from_address: String,
    pub to_address: String,
    pub amount: u64,
    pub transaction_type: TransactionType,
    pub campaign_id: String,
    pub timestamp: u64,
    pub block_number: u64,
    pub metadata: String,
}

/// Audit statistics
#[derive(Clone, Debug, Serialize, Deserialize, WeilType)]
pub struct AuditStats {
    pub total_entries: u64,
    pub total_donations_logged: u64,
    pub total_amount_tracked: u64,
    pub last_entry_timestamp: u64,
}

/// Trait defining the audit trail interface
trait AuditTrail {
    /// Initialize the contract
    fn new() -> Result<Self, String> where Self: Sized;
    
    /// Get an entry by ID
    async fn get_entry(&self, id: String) -> Result<AuditEntry, String>;
    
    /// Get an entry by Polygon transaction hash
    async fn get_entry_by_tx_hash(&self, polygon_tx_hash: String) -> Result<AuditEntry, String>;
    
    /// Verify if a transaction has been logged
    async fn verify_transaction(&self, polygon_tx_hash: String) -> bool;
    
    /// Get overall audit statistics
    async fn get_stats(&self) -> AuditStats;
    
    /// Get recent audit entries
    async fn get_recent_entries(&self, limit: u64) -> Vec<AuditEntry>;
    
    /// Log a new transaction (state-changing)
    async fn log_transaction(
        &mut self,
        polygon_tx_hash: String,
        from_address: String,
        to_address: String,
        amount: u64,
        transaction_type: String,
        campaign_id: String,
        block_number: u64,
        metadata: String,
    ) -> Result<String, String>;
    
    /// Get MCP tools description
    fn tools(&self) -> String;
}

/// Contract state for the Audit Trail - using Vec for WeilType compatibility
#[derive(Serialize, Deserialize, WeilType)]
pub struct AuditTrailContractState {
    entries: Vec<AuditEntry>,
    logged_tx_hashes: Vec<String>,
    entry_count: u64,
    total_donations: u64,
    total_amount: u64,
    last_timestamp: u64,
}

#[smart_contract]
impl AuditTrail for AuditTrailContractState {
    /// Initialize an empty audit trail contract
    #[constructor]
    fn new() -> Result<Self, String> {
        Ok(AuditTrailContractState {
            entries: Vec::new(),
            logged_tx_hashes: Vec::new(),
            entry_count: 0,
            total_donations: 0,
            total_amount: 0,
            last_timestamp: 0,
        })
    }
    
    /// Get an entry by its ID
    #[query]
    async fn get_entry(&self, id: String) -> Result<AuditEntry, String> {
        self.entries
            .iter()
            .find(|e| e.id == id)
            .cloned()
            .ok_or_else(|| "Entry not found".to_string())
    }
    
    /// Get an entry by Polygon transaction hash
    #[query]
    async fn get_entry_by_tx_hash(&self, polygon_tx_hash: String) -> Result<AuditEntry, String> {
        let tx_hash_lower = polygon_tx_hash.to_lowercase();
        self.entries
            .iter()
            .find(|e| e.polygon_tx_hash == tx_hash_lower)
            .cloned()
            .ok_or_else(|| "Transaction not found".to_string())
    }
    
    /// Verify if a Polygon transaction has been logged
    #[query]
    async fn verify_transaction(&self, polygon_tx_hash: String) -> bool {
        let tx_hash_lower = polygon_tx_hash.to_lowercase();
        self.logged_tx_hashes.contains(&tx_hash_lower)
    }
    
    /// Get overall audit statistics
    #[query]
    async fn get_stats(&self) -> AuditStats {
        AuditStats {
            total_entries: self.entry_count,
            total_donations_logged: self.total_donations,
            total_amount_tracked: self.total_amount,
            last_entry_timestamp: self.last_timestamp,
        }
    }
    
    /// Get recent audit entries (last N entries)
    #[query]
    async fn get_recent_entries(&self, limit: u64) -> Vec<AuditEntry> {
        let len = self.entries.len();
        let start = if len > limit as usize { len - limit as usize } else { 0 };
        self.entries[start..].to_vec()
    }
    
    /// Log a new Polygon transaction to the audit trail
    #[mutate]
    async fn log_transaction(
        &mut self,
        polygon_tx_hash: String,
        from_address: String,
        to_address: String,
        amount: u64,
        transaction_type: String,
        campaign_id: String,
        block_number: u64,
        metadata: String,
    ) -> Result<String, String> {
        let tx_hash_lower = polygon_tx_hash.to_lowercase();
        
        // Check for duplicate
        if self.logged_tx_hashes.contains(&tx_hash_lower) {
            return Err("Transaction already logged".to_string());
        }
        
        // Parse transaction type
        let tx_type = match transaction_type.as_str() {
            "Donation" => TransactionType::Donation,
            "Allocation" => TransactionType::Allocation,
            "BeneficiarySpending" => TransactionType::BeneficiarySpending,
            "MerchantPayment" => TransactionType::MerchantPayment,
            "Withdrawal" => TransactionType::Withdrawal,
            _ => TransactionType::Donation, // Default
        };
        
        // Generate entry ID
        self.entry_count += 1;
        let entry_id = format!("AUDIT_{}", self.entry_count);
        
        // Use block number as timestamp proxy (WeilChain will set actual time)
        let timestamp = block_number;
        
        // Create entry
        let entry = AuditEntry {
            id: entry_id.clone(),
            polygon_tx_hash: tx_hash_lower.clone(),
            from_address: from_address.to_lowercase(),
            to_address: to_address.to_lowercase(),
            amount,
            transaction_type: tx_type.clone(),
            campaign_id,
            timestamp,
            block_number,
            metadata,
        };
        
        // Store entry
        self.entries.push(entry);
        self.logged_tx_hashes.push(tx_hash_lower);
        
        // Update stats
        self.total_amount += amount;
        self.last_timestamp = timestamp;
        
        if tx_type == TransactionType::Donation {
            self.total_donations += 1;
        }
        
        Ok(entry_id)
    }
    
    /// MCP tools description for agent integration
    #[query]
    fn tools(&self) -> String {
        r#"[
  {
    "type": "function",
    "function": {
      "name": "log_transaction",
      "description": "Log a Polygon transaction to the WeilChain audit trail",
      "parameters": {
        "type": "object",
        "properties": {
          "polygon_tx_hash": { "type": "string", "description": "The Polygon transaction hash" },
          "from_address": { "type": "string", "description": "Sender address" },
          "to_address": { "type": "string", "description": "Recipient address" },
          "amount": { "type": "integer", "description": "Amount in smallest units" },
          "transaction_type": { "type": "string", "description": "Donation, Allocation, BeneficiarySpending, MerchantPayment, or Withdrawal" },
          "campaign_id": { "type": "string", "description": "Campaign identifier" },
          "block_number": { "type": "integer", "description": "Polygon block number" },
          "metadata": { "type": "string", "description": "Additional JSON metadata" }
        },
        "required": ["polygon_tx_hash", "from_address", "to_address", "amount", "transaction_type"]
      }
    }
  },
  {
    "type": "function",
    "function": {
      "name": "verify_transaction",
      "description": "Verify if a Polygon transaction has been logged on WeilChain",
      "parameters": {
        "type": "object",
        "properties": {
          "polygon_tx_hash": { "type": "string", "description": "The Polygon transaction hash to verify" }
        },
        "required": ["polygon_tx_hash"]
      }
    }
  },
  {
    "type": "function",
    "function": {
      "name": "get_stats",
      "description": "Get audit trail statistics",
      "parameters": { "type": "object", "properties": {} }
    }
  }
]"#.to_string()
    }
}
