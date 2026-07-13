import { useEffect } from 'react';
import { MainWindow } from './windows/MainWindow';
import { OverlayWindow } from './windows/OverlayWindow';
import { SettingsWindow } from './windows/SettingsWindow';
import { AboutWindow } from './windows/AboutWindow';

const windowKind = new URLSearchParams(window.location.search).get('window') || 'main';

export function App() {
  useEffect(() => {
    document.body.classList.toggle('overlay-window', windowKind === 'overlay');
    document.body.classList.toggle('settings-window', windowKind === 'settings');
    document.body.classList.toggle('about-window', windowKind === 'about');
    // Glimpse gets the same amber accent as its app icon, everywhere in the
    // app — not just the dock — so it's never confused with stable at a
    // glance while actually in use.
    document.body.classList.toggle(
      'glimpse-channel',
      typeof __RELEASE_CHANNEL__ !== 'undefined' && __RELEASE_CHANNEL__ === 'glimpse'
    );
  }, []);

  if (windowKind === 'overlay') return <OverlayWindow />;
  if (windowKind === 'settings') return <SettingsWindow />;
  if (windowKind === 'about') return <AboutWindow />;
  return <MainWindow />;
}
