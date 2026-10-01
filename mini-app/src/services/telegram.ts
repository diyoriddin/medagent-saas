/**
 * Telegram WebApp SDK helper & haptics wrapper
 */

declare global {
  interface Window {
    Telegram?: {
      WebApp: any;
    };
  }
}

export const getTelegramWebApp = () => {
  if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
    return window.Telegram.WebApp;
  }
  return null;
};

export const initTelegramApp = () => {
  let tg = getTelegramWebApp();

  // If not available and we're in development, create a light mock so
  // the app can be tested outside of Telegram (localhost/ngrok).
  if (!tg && import.meta.env.DEV) {
    const win = window as any;
    win.Telegram = win.Telegram || {};
    win.Telegram.WebApp = win.Telegram.WebApp || {
      initDataUnsafe: {
        user: {
          id: 0,
          first_name: 'Local',
          username: 'local_dev',
        },
      },
      ready: () => console.info('Telegram WebApp mock ready'),
      expand: () => console.info('Telegram WebApp mock expand'),
      close: () => console.info('Telegram WebApp mock close'),
      HapticFeedback: {
        selectionChanged: () => {},
        impactOccurred: (_: any) => {},
        notificationOccurred: (_: any) => {},
      },
    };
    tg = getTelegramWebApp();
    console.warn('Using Telegram.WebApp mock for local development');
  }

  if (tg) {
    tg.ready();
    try {
      tg.expand();
    } catch (e) {
      console.warn('Could not expand WebApp', e);
    }
  }
};

export const getTelegramUser = () => {
  const tg = getTelegramWebApp();
  return tg?.initDataUnsafe?.user || null;
};

export const triggerHaptic = (type: 'light' | 'medium' | 'heavy' | 'selection' | 'success' | 'warning' | 'error') => {
  const tg = getTelegramWebApp();
  if (!tg?.HapticFeedback) return;

  try {
    if (type === 'selection') {
      tg.HapticFeedback.selectionChanged();
    } else if (['light', 'medium', 'heavy'].includes(type)) {
      tg.HapticFeedback.impactOccurred(type);
    } else if (['success', 'warning', 'error'].includes(type)) {
      tg.HapticFeedback.notificationOccurred(type);
    }
  } catch (e) {
    console.debug('Haptics not supported in this environment', e);
  }
};

export const closeTelegramApp = () => {
  const tg = getTelegramWebApp();
  tg?.close();
};
