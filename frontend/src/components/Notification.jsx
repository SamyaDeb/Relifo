import { useEffect, useState } from 'react';

export default function Notification({ type = 'success', message, onClose, duration = 5000, showReceipt }) {
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      handleClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration]);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
    }, 300); // Match animation duration
  };

  const typeStyles = {
    success: 'bg-gradient-to-r from-green-500 to-emerald-600 border-green-400',
    error: 'bg-gradient-to-r from-red-500 to-pink-600 border-red-400',
    warning: 'bg-gradient-to-r from-yellow-500 to-orange-600 border-yellow-400',
    info: 'bg-gradient-to-r from-blue-500 to-indigo-600 border-blue-400',
  };

  const icons = {
    success: '✅',
    error: '❌',
    warning: '⚠️',
    info: 'ℹ️',
  };

  return (
    <div
      className={`fixed bottom-6 left-6 z-50 transition-all duration-300 ease-out ${
        isClosing ? 'translate-x-[120%] opacity-0' : 'translate-x-0 opacity-100 animate-slideInFromLeft'
      }`}
    >
      <div
        className={`${typeStyles[type]} text-white rounded-2xl shadow-2xl border-2 backdrop-blur-sm 
        min-w-[320px] max-w-md overflow-hidden`}
      >
        <div className="p-4 flex items-start gap-3">
          <span className="text-3xl flex-shrink-0">{icons[type]}</span>
          <div className="flex-1">
            <p className="font-semibold text-white leading-tight">{message.title}</p>
            {message.description && (
              <p className="text-sm text-white/90 mt-1">{message.description}</p>
            )}
            {message.txHash && (
              <a
                href={`https://amoy.polygonscan.com/tx/${message.txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-white/80 hover:text-white underline mt-2 block"
              >
                View on PolygonScan ↗
              </a>
            )}
            {showReceipt && (
              <button
                onClick={showReceipt}
                className="text-xs bg-white/20 hover:bg-white/30 px-3 py-1 rounded-full mt-2 transition-colors"
              >
                📄 View Receipt
              </button>
            )}
          </div>
          <button
            onClick={handleClose}
            className="text-white/80 hover:text-white text-2xl leading-none flex-shrink-0 -mt-1"
          >
            ×
          </button>
        </div>
        
        {/* Progress bar */}
        <div className="h-1 bg-white/20 overflow-hidden">
          <div
            className="h-full bg-white/60 animate-shrink"
            style={{ animationDuration: `${duration}ms` }}
          />
        </div>
      </div>
    </div>
  );
}
