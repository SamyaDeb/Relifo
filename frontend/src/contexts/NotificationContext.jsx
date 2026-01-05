import { createContext, useContext, useState, useCallback } from 'react';
import Notification from '../components/Notification';

const NotificationContext = createContext();

export function useNotification() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within NotificationProvider');
  }
  return context;
}

export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([]);

  const showNotification = useCallback((notification) => {
    const id = Date.now() + Math.random();
    const newNotification = { ...notification, id };
    
    setNotifications(prev => [...prev, newNotification]);

    // Auto-remove after duration
    const duration = notification.duration || 5000;
    setTimeout(() => {
      removeNotification(id);
    }, duration + 500); // Extra time for animation
  }, []);

  const removeNotification = useCallback((id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  return (
    <NotificationContext.Provider value={{ showNotification }}>
      {children}
      
      {/* Render notifications stacked */}
      <div className="fixed bottom-6 left-6 z-50 flex flex-col gap-3 pointer-events-none">
        {notifications.map((notification, index) => (
          <div key={notification.id} className="pointer-events-auto" style={{ zIndex: 50 + index }}>
            <Notification
              type={notification.type}
              message={notification.message}
              onClose={() => removeNotification(notification.id)}
              duration={notification.duration}
              showReceipt={notification.showReceipt}
            />
          </div>
        ))}
      </div>
    </NotificationContext.Provider>
  );
}
