import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { db, storage } from '../../firebase/config';
import { collection, doc, setDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useAccount } from 'wagmi';
import { USER_STATUS } from '../../firebase/constants';

export default function MerchantRegister() {
  const [formData, setFormData] = useState({
    businessName: '',
    ownerName: '',
    businessType: '',
    address: '',
    phone: '',
    email: '',
    categories: [],
  });
  const [documents, setDocuments] = useState({
    businessLicense: null,
    taxId: null,
    ownershipProof: null,
  });
  const [uploading, setUploading] = useState(false);
  const { address: walletAddress } = useAccount();
  const navigate = useNavigate();

  const categoryOptions = ['Food', 'Medicine', 'Shelter', 'Education', 'Clothing', 'Other'];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCategoryToggle = (category) => {
    setFormData(prev => ({
      ...prev,
      categories: prev.categories.includes(category)
        ? prev.categories.filter(c => c !== category)
        : [...prev.categories, category]
    }));
  };

  const handleFileChange = (e, docType) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        alert('File size must be less than 5MB');
        return;
      }
      setDocuments(prev => ({ ...prev, [docType]: file }));
    }
  };

  const uploadDocument = async (file, path) => {
    const storageRef = ref(storage, path);
    await uploadBytes(storageRef, file);
    return await getDownloadURL(storageRef);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!walletAddress) {
      alert('Please connect your wallet first');
      return;
    }

    if (formData.categories.length === 0) {
      alert('Please select at least one business category');
      return;
    }

    if (!documents.businessLicense || !documents.taxId || !documents.ownershipProof) {
      alert('Please upload all required documents');
      return;
    }

    try {
      setUploading(true);

      // Upload documents to Firebase Storage
      const docUrls = {
        businessLicense: await uploadDocument(
          documents.businessLicense,
          `merchants/${walletAddress}/business_license.pdf`
        ),
        taxId: await uploadDocument(
          documents.taxId,
          `merchants/${walletAddress}/tax_id.pdf`
        ),
        ownershipProof: await uploadDocument(
          documents.ownershipProof,
          `merchants/${walletAddress}/ownership_proof.pdf`
        ),
      };

      // Save merchant data to Firestore
      await setDoc(doc(db, 'users', walletAddress.toLowerCase()), {
        walletAddress: walletAddress.toLowerCase(),
        role: 'merchant',
        status: USER_STATUS.PENDING, // Pending admin verification
        businessName: formData.businessName,
        ownerName: formData.ownerName,
        businessType: formData.businessType,
        address: formData.address,
        phone: formData.phone,
        email: formData.email,
        categories: formData.categories,
        documents: docUrls,
        verifiedOnChain: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      alert('✅ Registration successful!\n\nYour application has been submitted for admin verification.\nYou will be notified once approved.');
      navigate('/merchant/pending');

    } catch (error) {
      console.error('Error registering merchant:', error);
      alert('❌ Registration failed: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      {/* Animated Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-green-500/20 rounded-full filter blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-500/20 rounded-full filter blur-3xl animate-pulse delay-1000"></div>
      </div>

      <div className="relative z-10 container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-5xl font-bold bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent mb-4">
              🏪 Merchant Registration
            </h1>
            <p className="text-gray-400 text-lg">
              Register your business to become a verified relief merchant
            </p>
          </div>

          {/* Registration Form */}
          <div className="bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900 border-2 border-green-500/30 rounded-2xl p-8 shadow-2xl">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Business Information */}
              <div>
                <h3 className="text-2xl font-bold text-green-400 mb-4">📋 Business Information</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-green-300 mb-2 font-semibold">Business Name *</label>
                    <input
                      type="text"
                      name="businessName"
                      value={formData.businessName}
                      onChange={handleInputChange}
                      required
                      placeholder="e.g., Green Valley Pharmacy"
                      className="w-full px-4 py-3 bg-black/40 border-2 border-green-500/30 rounded-lg text-white placeholder-gray-500 focus:border-green-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-green-300 mb-2 font-semibold">Owner Name *</label>
                    <input
                      type="text"
                      name="ownerName"
                      value={formData.ownerName}
                      onChange={handleInputChange}
                      required
                      placeholder="Full name"
                      className="w-full px-4 py-3 bg-black/40 border-2 border-green-500/30 rounded-lg text-white placeholder-gray-500 focus:border-green-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-green-300 mb-2 font-semibold">Business Type *</label>
                    <select
                      name="businessType"
                      value={formData.businessType}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-3 bg-black/40 border-2 border-green-500/30 rounded-lg text-white focus:border-green-500 focus:outline-none"
                    >
                      <option value="">Select type</option>
                      <option value="grocery">Grocery Store</option>
                      <option value="pharmacy">Pharmacy</option>
                      <option value="clinic">Medical Clinic</option>
                      <option value="shelter">Shelter Provider</option>
                      <option value="education">Educational Institute</option>
                      <option value="clothing">Clothing Store</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-green-300 mb-2 font-semibold">Phone Number *</label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      required
                      placeholder="+1234567890"
                      className="w-full px-4 py-3 bg-black/40 border-2 border-green-500/30 rounded-lg text-white placeholder-gray-500 focus:border-green-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-green-300 mb-2 font-semibold">Email *</label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      required
                      placeholder="business@example.com"
                      className="w-full px-4 py-3 bg-black/40 border-2 border-green-500/30 rounded-lg text-white placeholder-gray-500 focus:border-green-500 focus:outline-none"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-green-300 mb-2 font-semibold">Business Address *</label>
                    <textarea
                      name="address"
                      value={formData.address}
                      onChange={handleInputChange}
                      required
                      rows="2"
                      placeholder="Full business address"
                      className="w-full px-4 py-3 bg-black/40 border-2 border-green-500/30 rounded-lg text-white placeholder-gray-500 focus:border-green-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Service Categories */}
              <div>
                <h3 className="text-2xl font-bold text-green-400 mb-4">🏷️ Service Categories *</h3>
                <p className="text-gray-400 text-sm mb-3">Select all categories your business provides</p>
                
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {categoryOptions.map(category => (
                    <button
                      key={category}
                      type="button"
                      onClick={() => handleCategoryToggle(category)}
                      className={`px-4 py-3 rounded-lg font-semibold transition-all ${
                        formData.categories.includes(category)
                          ? 'bg-green-500 text-white border-2 border-green-400'
                          : 'bg-black/40 text-gray-400 border-2 border-gray-700 hover:border-green-500/50'
                      }`}
                    >
                      {category}
                    </button>
                  ))}
                </div>
              </div>

              {/* Document Upload */}
              <div>
                <h3 className="text-2xl font-bold text-green-400 mb-4">📄 Required Documents</h3>
                <p className="text-gray-400 text-sm mb-4">Upload clear, legible copies (PDF, max 5MB each)</p>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-green-300 mb-2 font-semibold">
                      Business License *
                    </label>
                    <input
                      type="file"
                      accept=".pdf,image/*"
                      onChange={(e) => handleFileChange(e, 'businessLicense')}
                      className="w-full px-4 py-3 bg-black/40 border-2 border-green-500/30 rounded-lg text-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-green-500 file:text-white file:cursor-pointer hover:file:bg-green-600"
                    />
                    {documents.businessLicense && (
                      <p className="text-green-400 text-sm mt-1">✓ {documents.businessLicense.name}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-green-300 mb-2 font-semibold">
                      Tax ID / Registration Number *
                    </label>
                    <input
                      type="file"
                      accept=".pdf,image/*"
                      onChange={(e) => handleFileChange(e, 'taxId')}
                      className="w-full px-4 py-3 bg-black/40 border-2 border-green-500/30 rounded-lg text-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-green-500 file:text-white file:cursor-pointer hover:file:bg-green-600"
                    />
                    {documents.taxId && (
                      <p className="text-green-400 text-sm mt-1">✓ {documents.taxId.name}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-green-300 mb-2 font-semibold">
                      Proof of Ownership / Lease Agreement *
                    </label>
                    <input
                      type="file"
                      accept=".pdf,image/*"
                      onChange={(e) => handleFileChange(e, 'ownershipProof')}
                      className="w-full px-4 py-3 bg-black/40 border-2 border-green-500/30 rounded-lg text-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-green-500 file:text-white file:cursor-pointer hover:file:bg-green-600"
                    />
                    {documents.ownershipProof && (
                      <p className="text-green-400 text-sm mt-1">✓ {documents.ownershipProof.name}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Wallet Address Display */}
              {walletAddress && (
                <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                  <p className="text-blue-300 text-sm">
                    <strong>Wallet Address:</strong>
                  </p>
                  <p className="text-blue-400 font-mono text-sm mt-1">{walletAddress}</p>
                </div>
              )}

              {/* Submit Button */}
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => navigate('/')}
                  className="flex-1 px-6 py-4 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-semibold text-lg transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading || !walletAddress}
                  className="flex-1 px-6 py-4 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white rounded-lg font-semibold text-lg shadow-lg shadow-green-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {uploading ? '⏳ Uploading Documents...' : '✅ Submit Registration'}
                </button>
              </div>

              <p className="text-gray-400 text-sm text-center">
                By submitting, you confirm all information is accurate and documents are authentic.
              </p>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
