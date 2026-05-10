import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';
import { Capacitor } from '@capacitor/core';

// Prevent "The play() request was interrupted" unhandled promise rejections
const originalPlay = HTMLMediaElement.prototype.play;
HTMLMediaElement.prototype.play = function() {
  const promise = originalPlay.apply(this, arguments as any);
  if (promise !== undefined) {
    promise.catch((error: any) => {
      if (error.name === 'AbortError') return;
    });
  }
  return promise;
};

// Android/iOS Specific Initializations
const initCapacitor = async () => {
  if (Capacitor.isNativePlatform()) {
    try {
      // Set Status Bar to dark to match app theme
      await StatusBar.setStyle({ style: Style.Dark });
      await StatusBar.setBackgroundColor({ color: '#000000' });
      
      // Hide splash screen after app load
      await SplashScreen.hide();
    } catch (e) {
      console.warn('Capacitor plugins not available:', e);
    }
  }
};

initCapacitor();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
