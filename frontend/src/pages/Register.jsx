import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { db, storage } from '../firebase/config';
import { doc, setDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { ROLES, USER_STATUS } from '../firebase/constants';
import { freighterService } from '../services/freighterService';

export default function Register() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    organization: '',
    description: ''
  });
  const [documentFile, setDocumentFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  const roles = [
    {
      id: ROLES.DONOR,
      name: 'Donor',
      icon: '💝',
      description: 'Support relief campaigns with donations',
      autoApprove: true,
      color: 'from-green-500 to-emerald-600'
    },
    {
      id: ROLES.ORGANIZER,
      name: 'Campaign Organizer',
      icon: '🏢',
      description: 'Create and manage disaster relief campaigns',
      autoApprove: false,
      color: 'from-blue-500 to-indigo-600'
    },
    {
      id: ROLES.BENEFICIARY,
      name: 'Beneficiary',
      icon: '🤝',
      description: 'Receive relief funds for disaster recovery',
      autoApprove: false,
      color: 'from-purple-500 to-pink-600'
    }
  ];

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!selectedRole) {
      alert('Please select a role');
      return;
    }

    setLoading(true);
    
    try {
      // Get wallet address
      const publicKey = await freighterService.getPublicKey();
      
      // Check if user needs approval
      const role = roles.find(r => r.id === selectedRole);
      const status = role.autoApprove ? USER_STATUS.APPROVED : USER_STATUS.PENDING;

      // Prepare profile data
      const timestamp = new Date().toISOString();
      const baseProfile = {
        walletAddress: publicKey,
        name: formData.name,
        email: formData.email,
        status: status,
        createdAt: timestamp,
        updatedAt: timestamp
      };

      if (!db) {
        alert('Firebase not configured. Please check your .env file.');
        setLoading(false);
        return;
      }

      // Upload document if provided
      let documentUrl = null;
      if (documentFile && storage) {
        try {
          const fileRef = ref(storage, `verification-documents/${publicKey}/${documentFile.name}`);
          await uploadBytes(fileRef, documentFile);
          documentUrl = await getDownloadURL(fileRef);
        } catch (uploadError) {
          console.error('Document upload failed:', uploadError);
          alert('Warning: Document upload failed, but registration will continue.');
        }
      }

      // Build role-specific profile
      const roleProfile = { ...baseProfile };

      if (selectedRole === ROLES.DONOR) {
        roleProfile.totalDonated = 0;
        roleProfile.campaignsSupported = 0;
      } else if (selectedRole === ROLES.ORGANIZER) {
        roleProfile.organization = formData.organization;
        roleProfile.description = formData.description;
        roleProfile.documentUrl = documentUrl;
        roleProfile.campaignsCreated = 0;
        roleProfile.totalRaised = 0;
      } else if (selectedRole === ROLES.BENEFICIARY) {
        roleProfile.organization = formData.organization || null;
        roleProfile.description = formData.description;
        roleProfile.documentUrl = documentUrl;
        roleProfile.allocatedFunds = 0;
        roleProfile.spentFunds = 0;
        roleProfile.linkedCampaign = null;
      }

      // Save both documents
      const profileCollection = `${selectedRole}_profile`;
      
      await Promise.all([
        setDoc(doc(db, 'users', publicKey), {
          ...baseProfile,
          role: selectedRole
        }),
        setDoc(doc(db, profileCollection, publicKey), roleProfile)
      ]);

      // Navigate immediately
      if (status === USER_STATUS.APPROVED) {
        navigate(`/${selectedRole}/dashboard`);
      } else {
        navigate('/pending-approval');
      }

    } catch (error) {
      console.error('Registration error:', error);
      alert('Registration failed: ' + error.message + '\n\nPlease check:\n1. Firestore is enabled in Firebase Console\n2. Security rules allow writes\n3. Internet connection is stable');
    } finally {
      setLoading(false);
    }
  };

  const selectedRoleData = roles.find(r => r.id === selectedRole);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
      <div className="max-w-6xl w-full">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-4">
            Join Relifo
          </h1>
          <p className="text-gray-600 text-lg">
            Choose your role to start making a difference
          </p>
        </div>

        {!selectedRole ? (
          /* Role Selection */
          <div className="grid md:grid-cols-3 gap-6">
            {roles.map((role) => (
              <button
                key={role.id}
                onClick={() => setSelectedRole(role.id)}
                className="group relative bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 p-8 text-left border-2 border-transparent hover:border-indigo-500"
              >
                {/* Icon */}
                <div className={`text-6xl mb-4 transform group-hover:scale-110 transition-transform`}>
                  {role.icon}
                </div>

                {/* Title */}
                <h3 className="text-2xl font-bold text-gray-900 mb-3">
                  {role.name}
                </h3>

                {/* Description */}
                <p className="text-gray-600 mb-4">
                  {role.description}
                </p>

                {/* Badge */}
                <div className="flex items-center gap-2">
                  {role.autoApprove ? (
                    <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-semibold">
                      ✓ Instant Access
                    </span>
                  ) : (
                    <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-sm font-semibold">
                      ⏳ Needs Verification
                    </span>
                  )}
                </div>

                {/* Gradient Bar */}
                <div className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r ${role.color} rounded-b-2xl transform scale-x-0 group-hover:scale-x-100 transition-transform`} />
              </button>
            ))}
          </div>
        ) : (
          /* Registration Form */
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-2xl mx-auto">
            {/* Back Button */}
            <button
              onClick={() => setSelectedRole(null)}
              className="mb-6 text-gray-600 hover:text-gray-900 flex items-center gap-2"
            >
              ← Back to role selection
            </button>

            {/* Selected Role Header */}
            <div className={`bg-gradient-to-r ${selectedRoleData.color} text-white rounded-xl p-6 mb-8`}>
              <div className="flex items-center gap-4">
                <div className="text-5xl">{selectedRoleData.icon}</div>
                <div>
                  <h2 className="text-3xl font-bold">{selectedRoleData.name}</h2>
                  <p className="text-white/90">{selectedRoleData.description}</p>
                </div>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleRegister} className="space-y-6">
              {/* Name */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none"
                  placeholder="Enter your full name"
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none"
                  placeholder="your.email@example.com"
                />
              </div>

              {/* Organization (for Organizer/Beneficiary) */}
              {!selectedRoleData.autoApprove && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Organization {selectedRole === ROLES.ORGANIZER ? '*' : '(Optional)'}
                  </label>
                  <input
                    type="text"
                    required={selectedRole === ROLES.ORGANIZER}
                    value={formData.organization}
                    onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none"
                    placeholder="Organization name"
                  />
                </div>
              )}

              {/* Description (for Organizer/Beneficiary) */}
              {!selectedRoleData.autoApprove && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Why do you need this role? *
                  </label>
                  <textarea
                    required
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none"
                    rows="4"
                    placeholder="Explain your need for this role..."
                  />
                </div>
              )}

              {/* Document Upload (for Organizer/Beneficiary) */}
              {!selectedRoleData.autoApprove && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Verification Document (PDF) - Optional
                  </label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 hover:border-indigo-500 transition-colors">
                    <input
                      type="file"
                      accept=".pdf,application/pdf"
                      onChange={(e) => setDocumentFile(e.target.files[0])}
                      className="w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                    />
                    {documentFile && (
                      <div className="mt-2 flex items-center gap-2 text-sm text-green-600">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        {documentFile.name} ({(documentFile.size / 1024).toFixed(2)} KB)
                      </div>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    Upload ID proof, organization certificate, or disaster proof document (PDF only)
                  </p>
                </div>
              )}

              {/* Warning for verification */}
              {!selectedRoleData.autoApprove && (
                <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">⚠️</span>
                    <div>
                      <h4 className="font-semibold text-yellow-800">Verification Required</h4>
                      <p className="text-sm text-yellow-700">
                        Your application will be reviewed by our admin team. You'll be notified once approved.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className={`w-full py-4 rounded-lg font-bold text-white text-lg shadow-lg hover:shadow-xl transition-all ${
                  loading 
                    ? 'bg-gray-400 cursor-not-allowed' 
                    : `bg-gradient-to-r ${selectedRoleData.color} hover:scale-105`
                }`}
              >
                {loading ? 'Registering...' : 'Complete Registration'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
