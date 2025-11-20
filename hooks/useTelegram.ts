import { useEffect, useState } from 'react';

// Make sure to declare the Telegram object to avoid TypeScript errors
declare global {
  interface Window {
    Telegram: {
      WebApp: any;
    };
  }
}

export function useTelegram() {
  const [tg, setTg] = useState<any>(null);
  
  useEffect(() => {
    if (window.Telegram && window.Telegram.WebApp) {
      const telegramApp = window.Telegram.WebApp;
      telegramApp.ready();
      telegramApp.expand();
      setTg(telegramApp);
    }
  }, []);

  const onClose = () => {
    tg?.close();
  };

  const onToggleButton = () => {
    if (tg?.MainButton.isVisible) {
      tg.MainButton.hide();
    } else {
      tg.MainButton.show();
    }
  };

  return {
    onClose,
    onToggleButton,
    tg,
    user: tg?.initDataUnsafe?.user,
  };
}
