import type { ViewportSize } from '@playwright/test';

export const VIEWPORTS: Record<string, ViewportSize> = {
  phoneSmall: { width: 320, height: 568 },
  phoneCompact: { width: 360, height: 800 },
  phone: { width: 390, height: 844 },
  phoneLarge: { width: 414, height: 896 },
  phoneLandscape: { width: 568, height: 320 },
  tabletPortrait: { width: 768, height: 1024 },
  tabletLandscape: { width: 1024, height: 768 },
  laptop: { width: 1280, height: 800 },
  desktop: { width: 1440, height: 900 },
  wide: { width: 1920, height: 1080 },
};

export const RESPONSIVE_VIEWPORT_NAMES = Object.keys(VIEWPORTS);
