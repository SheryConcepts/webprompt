import type { Command } from './index';

const toggleDarkModeCommand: Command = {
  id: 'toggle-dark-mode',
  name: 'Toggle Dark Mode',
  description: 'Toggle dark mode on the current page',
  context: 'content',
  isUserDefined: false,
  isEnabled: true,
  execute: async () => {
    try {
      // Inject CSS to invert colors
      await browser.scripting.insertCSS({
        target: { tabId: (await browser.tabs.getCurrent()).id! },
        css: `
          :root {
            filter: invert(1) hue-rotate(180deg);
          }
          img, video, iframe {
            filter: invert(1) hue-rotate(180deg);
          }
        `,
      });
      return { success: true, message: 'Dark mode toggled' };
    } catch (error) {
      return { success: false, message: 'Failed to toggle dark mode' };
    }
  },
};

export default toggleDarkModeCommand;