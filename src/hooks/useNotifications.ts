import { useState, useEffect, useCallback } from 'react';

interface UseNotificationsReturn {
  permission: NotificationPermission | 'unsupported';
  requestPermission: () => Promise<boolean>;
  showNotification: (title: string, options?: NotificationOptions) => void;
  isSupported: boolean;
}

export function useNotifications(): UseNotificationsReturn {
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>('default');

  const isSupported = typeof window !== 'undefined' && 'Notification' in window;

  useEffect(() => {
    if (!isSupported) {
      setPermission('unsupported');
      return;
    }
    setPermission(Notification.permission);
  }, [isSupported]);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!isSupported) {
      return false;
    }

    if (Notification.permission === 'granted') {
      setPermission('granted');
      return true;
    }

    if (Notification.permission === 'denied') {
      setPermission('denied');
      return false;
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      return result === 'granted';
    } catch {
      // Safari fallback - older callback-based API
      return new Promise((resolve) => {
        Notification.requestPermission((result) => {
          setPermission(result);
          resolve(result === 'granted');
        });
      });
    }
  }, [isSupported]);

  const showNotification = useCallback((title: string, options?: NotificationOptions) => {
    if (!isSupported || permission !== 'granted') {
      return;
    }

    // Use service worker registration if available for better background support
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.ready.then((registration) => {
        // vibrate is part of NotificationOptions but TypeScript types don't always include it
        const notificationOptions = {
          icon: '/pwa-192x192.png',
          badge: '/pwa-192x192.png',
          vibrate: [100, 50, 100],
          ...options,
        } as NotificationOptions;
        registration.showNotification(title, notificationOptions);
      });
    } else {
      // Fallback to regular notification
      new Notification(title, {
        icon: '/pwa-192x192.png',
        ...options,
      });
    }
  }, [isSupported, permission]);

  return {
    permission,
    requestPermission,
    showNotification,
    isSupported,
  };
}

// Utility to check if document is visible
export function isDocumentHidden(): boolean {
  if (typeof document === 'undefined') return false;
  return document.hidden || document.visibilityState === 'hidden';
}
