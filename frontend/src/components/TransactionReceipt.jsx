import { format } from 'date-fns';

export default function TransactionReceipt({ transaction, onClose }) {
  const {
    transactionHash,
    merchantName,
    merchantAddress,
    beneficiaryAddress,
    amount,
    category,
    timestamp,
    blockNumber,
    status,
  } = transaction;

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    // Create a simple text receipt
    const receiptText = `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
              TRANSACTION RECEIPT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Date: ${format(new Date(timestamp), 'PPpp')}
Status: ${status || 'Confirmed'}

TRANSACTION DETAILS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Amount:           ${amount} RELIEF
Merchant:         ${merchantName || 'N/A'}
Category:         ${category || 'N/A'}

FROM (Beneficiary)
${beneficiaryAddress}

TO (Merchant)
${merchantAddress}

BLOCKCHAIN VERIFICATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Transaction Hash: ${transactionHash}
Block Number:     ${blockNumber || 'N/A'}
Network:          Polygon Amoy (80002)

Verify on PolygonScan:
https://amoy.polygonscan.com/tx/${transactionHash}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
       This is a digital receipt.
        No signature required.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    `;

    const blob = new Blob([receiptText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `receipt-${transactionHash.substring(0, 10)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto receipt-print">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white p-6 rounded-t-2xl">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold mb-1">Transaction Receipt</h2>
              <p className="text-white/80 text-sm">EIBS 2.0 - Relief Token System</p>
            </div>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white text-3xl leading-none print:hidden"
            >
              ×
            </button>
          </div>
        </div>

        {/* Receipt Body */}
        <div className="p-6">
          {/* Status Badge */}
          <div className="flex justify-center mb-6">
            <div className="bg-green-100 text-green-800 px-6 py-2 rounded-full font-semibold flex items-center gap-2">
              <span className="text-xl">✅</span>
              <span>{status || 'Confirmed'}</span>
            </div>
          </div>

          {/* Amount */}
          <div className="text-center mb-8 pb-6 border-b-2 border-dashed border-gray-300">
            <p className="text-gray-600 text-sm mb-2">Amount Paid</p>
            <p className="text-5xl font-bold text-purple-600">{amount} RELIEF</p>
            <p className="text-gray-500 text-sm mt-2">
              {format(new Date(timestamp), 'PPpp')}
            </p>
          </div>

          {/* Details Grid */}
          <div className="space-y-4 mb-6">
            <DetailRow label="Merchant" value={merchantName || 'N/A'} />
            <DetailRow label="Category" value={category || 'N/A'} />
            <DetailRow 
              label="From (Beneficiary)" 
              value={beneficiaryAddress}
              mono 
            />
            <DetailRow 
              label="To (Merchant)" 
              value={merchantAddress}
              mono 
            />
          </div>

          {/* Blockchain Details */}
          <div className="bg-gray-50 rounded-xl p-4 mb-6">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <span>🔗</span>
              <span>Blockchain Verification</span>
            </h3>
            <div className="space-y-2 text-sm">
              <DetailRow 
                label="Transaction Hash" 
                value={transactionHash}
                mono
                small
              />
              <DetailRow 
                label="Block Number" 
                value={blockNumber || 'N/A'}
                small
              />
              <DetailRow 
                label="Network" 
                value="Polygon Amoy (80002)"
                small
              />
            </div>
          </div>

          {/* PolygonScan Link */}
          <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4 mb-6">
            <p className="text-sm text-gray-700 mb-2 font-medium">Verify on Blockchain:</p>
            <a
              href={`https://amoy.polygonscan.com/tx/${transactionHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 text-sm break-all underline"
            >
              https://amoy.polygonscan.com/tx/{transactionHash.substring(0, 20)}...
            </a>
          </div>

          {/* Footer */}
          <div className="text-center text-gray-500 text-xs border-t-2 border-dashed border-gray-300 pt-4">
            <p>This is a digital receipt. No signature required.</p>
            <p className="mt-1">Transaction recorded on Polygon blockchain</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="bg-gray-50 p-4 rounded-b-2xl flex gap-3 print:hidden">
          <button
            onClick={handlePrint}
            className="flex-1 bg-white hover:bg-gray-100 text-gray-700 px-6 py-3 rounded-lg font-semibold border-2 border-gray-300 transition-colors flex items-center justify-center gap-2"
          >
            <span>🖨️</span>
            <span>Print</span>
          </button>
          <button
            onClick={handleDownload}
            className="flex-1 bg-white hover:bg-gray-100 text-gray-700 px-6 py-3 rounded-lg font-semibold border-2 border-gray-300 transition-colors flex items-center justify-center gap-2"
          >
            <span>📥</span>
            <span>Download</span>
          </button>
          <button
            onClick={onClose}
            className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function DetailRow({ label, value, mono = false, small = false }) {
  return (
    <div className="flex justify-between items-start gap-4">
      <span className={`text-gray-600 ${small ? 'text-xs' : 'text-sm'} font-medium`}>
        {label}:
      </span>
      <span className={`text-gray-900 ${small ? 'text-xs' : 'text-sm'} font-semibold text-right ${
        mono ? 'font-mono break-all' : ''
      }`}>
        {value}
      </span>
    </div>
  );
}
