import { useState } from 'react';
import { db } from '../firebase/config';
import { collection, getDocs, deleteDoc, doc } from 'firebase/firestore';

export default function CleanupData() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);

  const deleteCollection = async (collectionName) => {
    const querySnapshot = await getDocs(collection(db, collectionName));
    let count = 0;
    
    for (const document of querySnapshot.docs) {
      await deleteDoc(doc(db, collectionName, document.id));
      count++;
    }
    
    return count;
  };

  const handleCleanup = async () => {
    if (!window.confirm('⚠️ WARNING: This will delete ALL data from Firebase!\n\nAre you sure you want to continue?')) {
      return;
    }

    setLoading(true);
    setResults([]);
    
    try {
      const collections = ['users', 'campaigns', 'donations', 'transactions'];
      const newResults = [];
      let totalDeleted = 0;
      
      for (const collectionName of collections) {
        const deleted = await deleteCollection(collectionName);
        totalDeleted += deleted;
        newResults.push(`✅ Deleted ${deleted} documents from ${collectionName}`);
        setResults([...newResults]);
      }
      
      newResults.push('');
      newResults.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      newResults.push(`✅ CLEANUP COMPLETE! Total deleted: ${totalDeleted}`);
      newResults.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      newResults.push('');
      newResults.push('📝 Next steps:');
      newResults.push('1. Register as organizer');
      newResults.push('2. Create new campaign');
      newResults.push('3. Register as beneficiary');
      newResults.push('4. Approve beneficiary');
      newResults.push('5. Allocate funds');
      
      setResults(newResults);
    } catch (error) {
      setResults([`❌ Error: ${error.message}`]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold text-red-600 mb-4">🗑️ Firebase Data Cleanup</h1>
          <p className="text-gray-600 mb-6">
            This will delete all data from Firebase collections: users, campaigns, donations, and transactions.
          </p>
          
          <button
            onClick={handleCleanup}
            disabled={loading}
            className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Deleting...' : '🗑️ Delete All Data'}
          </button>

          {results.length > 0 && (
            <div className="mt-6 bg-gray-50 rounded-lg p-4 font-mono text-sm">
              {results.map((result, index) => (
                <div key={index} className="mb-1">
                  {result}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
