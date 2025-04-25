import type { Command } from './index';

const closeTabsRight: Command = {
  id: 'close-tabs-right',
  name: 'Close Tabs to the Right',
  description: 'Close all tabs to the right of the current tab',
  context: 'background',
  execute: async () => {
    const tabs = await browser.tabs.query({ currentWindow: true });
    const currentTab = tabs.find(tab => tab.active);
    
    if (!currentTab?.id) return;

    const tabsToClose = tabs.filter(tab => 
      tab.index > currentTab.index && tab.id
    );
    
    await browser.tabs.remove(tabsToClose.map(tab => tab.id!));
    return { success: true, message: `Closed ${tabsToClose.length} tabs` };
  },
  isEnabled: true,
  isUserDefined: false,
  meta: { type: "browser", category: "tabs" },
};

export default closeTabsRight;