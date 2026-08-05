import { withThemeByClassName } from '@storybook/addon-themes';
import type { Preview } from '@storybook/web-components-vite';
import '../src/ui/ui-catalog.css';

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    viewport: {
      options: {
        haDesktop: { name: 'Gateway desktop', styles: { width: '1280px', height: '720px' } },
        haTablet: { name: 'Gateway tablet', styles: { width: '768px', height: '1024px' } },
        haPhone: { name: 'Gateway phone', styles: { width: '390px', height: '844px' } },
      },
      defaultViewport: 'haDesktop',
    },
    a11y: {
      test: 'error',
    },
    backgrounds: {
      default: 'light',
      values: [
        { name: 'light', value: '#f4f7fb' },
        { name: 'dark', value: '#07111f' },
      ],
    },
  },
  decorators: [
    withThemeByClassName({
      themes: { Light: 'theme-light', Dark: 'theme-dark' },
      defaultTheme: 'Light',
    }),
  ],
};

export default preview;
