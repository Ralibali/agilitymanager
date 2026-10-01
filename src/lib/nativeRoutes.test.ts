import { describe, expect, it } from 'vitest';
import { nativeRouteFromInternalAnchor, nativeRouteFromUrl } from './nativeRoutes';

describe('native link routes', () => {
  it('opens owned routes and preserves course parameters', () => {
    expect(nativeRouteFromUrl('agilitymanager://banplanerare?bana=example')).toBe('/banplanerare?bana=example');
    expect(nativeRouteFromUrl('https://agilitymanager.se/bana/123')).toBe('/bana/123');
    expect(nativeRouteFromUrl('agilitymanager:///')).toBe('/');
  });
  it('rejects other hosts, protocols and unsupported paths', () => {
    expect(nativeRouteFromUrl('https://agilitymanager.se.evil.example/bana/123')).toBeNull();
    expect(nativeRouteFromUrl('javascript:alert(1)')).toBeNull();
    expect(nativeRouteFromUrl('agilitymanager://admin')).toBeNull();
    for (const path of ['priser', 'gratis', 'tavlingar', 'traning', 'instruktor', 'elev', 'jamfor-hundforsakring']) {
      expect(nativeRouteFromUrl(`agilitymanager://${path}`)).toBeNull();
    }
  });
});


describe('native internal anchors', () => {
  it('routes course paths and preserves their query from an iOS WebView', () => {
    expect(nativeRouteFromInternalAnchor('/banplanerare?template=starter', 'capacitor://localhost/#/banor'))
      .toBe('/banplanerare?template=starter');
    expect(nativeRouteFromInternalAnchor('/banplanerare?bana=encoded-course', 'capacitor://localhost/#/bana/course-id'))
      .toBe('/banplanerare?bana=encoded-course');
  });
  it('preserves HashRouter links and course fragments on Android', () => {
    expect(nativeRouteFromInternalAnchor('#/banplanerare?bana=encoded-course', 'https://localhost/#/banor'))
      .toBe('/banplanerare?bana=encoded-course');
    expect(nativeRouteFromInternalAnchor('/bana/course-id#obstacle-3', 'https://localhost/#/'))
      .toBe('/bana/course-id#obstacle-3');
  });
  it('leaves external anchors and unsupported internal destinations to the existing handler', () => {
    for (const href of ['https://outside.example/banplanerare?bana=secret', 'mailto:info@auroramedia.se', '/admin']) {
      expect(nativeRouteFromInternalAnchor(href, 'capacitor://localhost/#/')).toBeNull();
    }
    // Both URL origins are opaque; a foreign authority must still be rejected.
    expect(nativeRouteFromInternalAnchor('capacitor://other-host/banplanerare', 'capacitor://localhost/#/')).toBeNull();
    expect(nativeRouteFromInternalAnchor('https://agilitymanager.se/banplanerare', 'https://localhost/#/')).toBeNull();
    expect(nativeRouteFromInternalAnchor('#jamforelse', 'capacitor://localhost/#/jamfor-hundforsakring')).toBeNull();
  });
});
