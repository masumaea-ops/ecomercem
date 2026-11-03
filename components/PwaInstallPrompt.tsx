import React, { useState, useEffect, useCallback } from 'react';
import { Download, X, Sparkles, Smartphone, CheckCircle } from 'lucide-react';

declare global {
  interface Window {
    deferredPWAInstallPrompt?: any;
  }
}

interface PwaInstallPromptProps {
  onInstalled?: () => void;
}

export const PwaInstallPrompt: React.FC<PwaInstallPromptProps> = ({ onInstalled }) => {
  const [canInstall, setCanInstall] = useState<boolean>(false);
  const [isDismissed, setIsDismissed] = useState<boolean>(false);
  const [isInstalled, setIsInstalled] = useState<boolean>(false);

  useEffect(() => {
    // 1. Check if already running in standalone mode (desktop PWA window or mobile standalone)
    const isStandalone = 
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true ||
      document.referrer.includes('android-app://');

    if (isStandalone) {
      setCanInstall(false);
      return;
    }

    // 2. Check if prompt was already stashed by the root script
    if (window.deferredPWAInstallPrompt) {
      setCanInstall(true);
    }

    // 3. Listen for immediate beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      window.deferredPWAInstallPrompt = e;
      setCanInstall(true);
    };

    // 4. Custom event dispatched if root index.tsx captured it first
    const handlePromptReady = () => {
      setCanInstall(true);
    };

    // 5. Successful installation listener
    const handleAppInstalled = () => {
      window.deferredPWAInstallPrompt = null;
      setCanInstall(false);
      setIsInstalled(true);
      if (onInstalled) onInstalled();
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('pwa-prompt-ready', handlePromptReady);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('pwa-prompt-ready', handlePromptReady);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [onInstalled]);

  const handleInstallClick = useCallback(async () => {
    const promptEvent = window.deferredPWAInstallPrompt;
    if (!promptEvent) {
      return;
    }

    // Trigger native browser install dialog
    try {
      await promptEvent.prompt();
      const choiceResult = await promptEvent.userChoice;
      if (choiceResult && choiceResult.outcome === 'accepted') {
        window.deferredPWAInstallPrompt = null;
        setCanInstall(false);
        setIsInstalled(true);
        if (onInstalled) onInstalled();
      }
    } catch (err) {
      console.error('Error invoking PWA installation dialog:', err);
    }
  }, [onInstalled]);

  // Banner removed per user specification
  return null;
};

export default PwaInstallPrompt;
