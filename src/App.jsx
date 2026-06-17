import { useEffect } from 'react';
import { MainWindow } from './windows/MainWindow';
import { OverlayWindow } from './windows/OverlayWindow';
import { SettingsWindow } from './windows/SettingsWindow';

const windowKind =
  new URLSearchParams(window.location.search).get('window') || 'main';

export function App() {
  useEffect(() => {
    document.body.classList.toggle('overlay-window',  windowKind === 'overlay');
    document.body.classList.toggle('settings-window', windowKind === 'settings');
  }, []);

  if (windowKind === 'overlay')  return <OverlayWindow />;
  if (windowKind === 'settings') return <SettingsWindow />;
  return <MainWindow />;
}
