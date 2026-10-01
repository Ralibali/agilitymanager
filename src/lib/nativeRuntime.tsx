import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Capacitor, type PluginListenerHandle } from '@capacitor/core';
import { App } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { Network } from '@capacitor/network';
import { Share } from '@capacitor/share';
import { toast } from 'sonner';
import { nativeRouteFromInternalAnchor, nativeRouteFromUrl } from './nativeRoutes';

export function NativeRuntime() {
  const navigate = useNavigate();

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    let disposed = false;
    const handles: PluginListenerHandle[] = [];
    const keep = async (pending: Promise<PluginListenerHandle>) => {
      const handle = await pending;
      if (disposed) await handle.remove();
      else handles.push(handle);
    };
    const networkStatus = (connected: boolean) => {
      window.dispatchEvent(new CustomEvent('am:network-status', { detail: { connected } }));
    };
    const openRoute = (url: string) => {
      const route = nativeRouteFromUrl(url);
      if (route) navigate(route);
    };
    const syncNetwork = () => Network.getStatus().then(({ connected }) => {
      if (!disposed) networkStatus(connected);
    });

    void Promise.all([
      keep(App.addListener('backButton', () => {
        const overlay = [...document.querySelectorAll<HTMLElement>('[role="dialog"], [role="alertdialog"], [role="menu"]')]
          .find(element => element.getClientRects().length > 0 && getComputedStyle(element).visibility !== 'hidden' && element.getAttribute('aria-hidden') !== 'true');
        if (overlay) {
          overlay.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', bubbles: true }));
          return;
        }
        // React Router stores idx on history entries. WebView canGoBack alone
        // can include initial native navigation and is not a router stack.
        if ((window.history.state?.idx ?? 0) > 0) navigate(-1);
        else if (location.hash !== '#/' && location.hash !== '') navigate('/', { replace: true });
        else void App.minimizeApp().catch(() => undefined);
      })),
      keep(App.addListener('appUrlOpen', ({ url }) => openRoute(url))),
      keep(App.addListener('appStateChange', ({ isActive }) => {
        if (isActive) void syncNetwork().catch(() => undefined);
      })),
      keep(Network.addListener('networkStatusChange', ({ connected }) => networkStatus(connected))),
      syncNetwork(),
      App.getLaunchUrl().then(value => { if (!disposed && value) openRoute(value.url); }),
    ]).catch(() => {
      // Browser online/offline events remain available if a platform plugin fails.
    });

    const openExternal = (event: MouseEvent) => {
      const anchor = event.target instanceof Element ? event.target.closest('a[href]') : null;
      if (!(anchor instanceof HTMLAnchorElement) || anchor.hasAttribute('download')) return;
      let url: URL;
      try { url = new URL(anchor.href); } catch { return; }
      const internalRoute = nativeRouteFromInternalAnchor(anchor.href, location.href);
      if (internalRoute) {
        event.preventDefault();
        navigate(internalRoute);
        return;
      }
      if (!['https:', 'http:'].includes(url.protocol) || url.origin === location.origin) return;
      event.preventDefault();
      void Browser.open({ url: url.href }).catch(() => toast.error('Kunde inte öppna länken. Försök igen.'));
    };
    document.addEventListener('click', openExternal, true);

    // Existing share buttons use the Web Share API. Install a native bridge
    // for text/URL shares on WebViews that do not provide it.
    const previousShare = navigator.share;
    const nativeShare = async (data: ShareData) => {
      if (data.files?.length) throw new Error('Använd filens exportknapp för att dela filer.');
      await Share.share({ title: data.title, text: data.text, url: data.url });
    };
    try { Object.defineProperty(navigator, 'share', { configurable: true, value: nativeShare }); } catch { /* Use existing API. */ }

    return () => {
      disposed = true;
      document.removeEventListener('click', openExternal, true);
      for (const handle of handles) void handle.remove();
      try { Object.defineProperty(navigator, 'share', { configurable: true, value: previousShare }); } catch { /* Read-only API. */ }
    };
  }, [navigate]);

  return null;
}
