const express = require('express');
const router = express.Router();
const { db } = require('../firebase/config');
const { collection, addDoc, query, where, getDocs, serverTimestamp } = require('firebase/firestore');

/**
 * Record a spending transaction
 * POST /api/transactions/record
 */
router.post('/record', async (req, res) => {
  try {
    const {
      beneficiaryAddress,
      merchantAddress,
      merchantName,
      amount,
      transactionHash,
      blockNumber,
      timestamp,
    } = req.body;

    console.log('📝 Recording transaction:');
    console.log('- Beneficiary:', beneficiaryAddress);
    console.log('- Merchant:', merchantName);
    console.log('- Amount:', amount, 'RELIEF');
    console.log('- TX Hash:', transactionHash);

    // Add transaction to Firebase
    const docRef = await addDoc(collection(db, 'transactions'), {
      beneficiaryAddress: beneficiaryAddress.toLowerCase(),
      merchantAddress: merchantAddress.toLowerCase(),
      merchantName,
      amount: parseFloat(amount),
      transactionHash,
      blockNumber,
      status: 'confirmed',
      type: 'spending',
      timestamp: new Date(timestamp),
      createdAt: serverTimestamp(),
    });

    console.log('✅ Transaction recorded:', docRef.id);

    res.status(201).json({
      success: true,
      message: 'Transaction recorded',
      transactionId: docRef.id,
    });
  } catch (error) {
    console.error('❌ Error recording transaction:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

/**
 * Get beneficiary spending history
 * GET /api/transactions/beneficiary/:walletAddress
 */
router.get('/beneficiary/:walletAddress', async (req, res) => {
  try {
    const { walletAddress } = req.params;

    console.log('📊 Fetching spending history for:', walletAddress);

    const q = query(
      collection(db, 'transactions'),
      where('beneficiaryAddress', '==', walletAddress.toLowerCase()),
      where('type', '==', 'spending')
    );

    const querySnapshot = await getDocs(q);
    const transactions = [];

    querySnapshot.forEach((doc) => {
      transactions.push({
        id: doc.id,
        ...doc.data(),
      });
    });

    // Sort by timestamp descending
    transactions.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    const totalSpent = transactions.reduce((sum, tx) => sum + tx.amount, 0);

    console.log('✅ Found', transactions.length, 'transactions. Total spent:', totalSpent);

    res.json({
      success: true,
      transactions,
      totalSpent,
      totalCount: transactions.length,
    });
  } catch (error) {
    console.error('❌ Error fetching transactions:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

/**
 * Get merchant receiving history
 * GET /api/transactions/merchant/:merchantAddress
 */
router.get('/merchant/:merchantAddress', async (req, res) => {
  try {
    const { merchantAddress } = req.params;

    console.log('📊 Fetching merchant receiving history for:', merchantAddress);

    const q = query(
      collection(db, 'transactions'),
      where('merchantAddress', '==', merchantAddress.toLowerCase()),
      where('type', '==', 'spending')
    );

    const querySnapshot = await getDocs(q);
    const transactions = [];

    querySnapshot.forEach((doc) => {
      transactions.push({
        id: doc.id,
        ...doc.data(),
      });
    });

    // Sort by timestamp descending
    transactions.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    const totalReceived = transactions.reduce((sum, tx) => sum + tx.amount, 0);

    console.log('✅ Found', transactions.length, 'transactions. Total received:', totalReceived);

    res.json({
      success: true,
      transactions,
      totalReceived,
      totalCount: transactions.length,
    });
  } catch (error) {
    console.error('❌ Error fetching merchant transactions:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

/**
 * Get all transactions (admin)
 * GET /api/transactions/all
 */
router.get('/all', async (req, res) => {
  try {
    console.log('📊 Fetching all transactions');

    const querySnapshot = await getDocs(collection(db, 'transactions'));
    const transactions = [];

    querySnapshot.forEach((doc) => {
      transactions.push({
        id: doc.id,
        ...doc.data(),
      });
    });

    // Sort by timestamp descending
    transactions.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    console.log('✅ Found', transactions.length, 'total transactions');

    res.json({
      success: true,
      transactions,
      totalCount: transactions.length,
    });
  } catch (error) {
    console.error('❌ Error fetching all transactions:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

module.exports = router;
