/**
 * Authentication middleware for protected routes
 */

const verifyBeneficiary = async (req, res, next) => {
  try {
    const { beneficiaryAddress } = req.body;
    
    if (!beneficiaryAddress) {
      return res.status(400).json({ error: 'Beneficiary address required' });
    }

    // Store in request for later use
    req.beneficiaryAddress = beneficiaryAddress.toLowerCase();
    next();
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const verifyMerchant = async (req, res, next) => {
  try {
    const { merchantAddress } = req.body;
    
    if (!merchantAddress) {
      return res.status(400).json({ error: 'Merchant address required' });
    }

    // Store in request for later use
    req.merchantAddress = merchantAddress.toLowerCase();
    next();
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

module.exports = {
  verifyBeneficiary,
  verifyMerchant,
};
