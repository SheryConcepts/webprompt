var background = function() {
  "use strict";
  var _a, _b;
  function defineBackground(arg) {
    if (arg == null || typeof arg === "function") return { main: arg };
    return arg;
  }
  const browser$1 = ((_b = (_a = globalThis.browser) == null ? void 0 : _a.runtime) == null ? void 0 : _b.id) ? globalThis.browser : globalThis.chrome;
  const browser = browser$1;
  const commandsList = [
    // --- Background Commands ---
    {
      id: "new-tab",
      name: "New Tab",
      description: "Open a new browser tab",
      context: "background",
      execute: async (url) => {
        await browser.tabs.create({ url: url || "about:newtab" });
        return "New tab opened.";
      }
      // args: [{ name: 'url', type: 'string', description: '(Optional) URL to open' }]
    },
    {
      id: "close-tab",
      name: "Close Tab",
      description: "Close the current tab",
      context: "background",
      // Note: Background executor needs to pass the 'tab' object from the sender
      execute: async (tab) => {
        if (tab == null ? void 0 : tab.id) {
          await browser.tabs.remove(tab.id);
          return "Tab closed.";
        }
        throw new Error("Could not determine the active tab to close.");
      }
    },
    {
      id: "reload-tab",
      name: "Reload Tab",
      description: "Reload the current tab",
      context: "background",
      execute: async (tab) => {
        if (tab == null ? void 0 : tab.id) {
          await browser.tabs.reload(tab.id);
          return "Tab reloaded.";
        }
        throw new Error("Could not determine the active tab to reload.");
      }
    },
    {
      id: "list-bookmarks",
      // Example - Implement actual logic later
      name: "List Bookmarks",
      description: "Search and list bookmarks",
      context: "background",
      execute: async (query) => {
        console.log("Listing bookmarks (implementation needed)... Query:", query);
        await new Promise((res) => setTimeout(res, 50));
        return "Bookmark listing not yet implemented.";
      }
    },
    // --- Content Script Commands ---
    {
      id: "go-back",
      name: "Go Back",
      description: "Navigate back in history",
      context: "content",
      execute: () => {
        window.history.back();
        return "Navigated back.";
      }
    },
    {
      id: "go-forward",
      name: "Go Forward",
      description: "Navigate forward in history",
      context: "content",
      execute: () => {
        window.history.forward();
        return "Navigated forward.";
      }
    },
    {
      id: "copy-title",
      name: "Copy Page Title",
      description: "Copy the current page title to clipboard",
      context: "content",
      execute: async () => {
        const title = document.title;
        await navigator.clipboard.writeText(title);
        return `Copied title: "${title}"`;
      }
    },
    {
      id: "download-markdown",
      name: "Download as Markdown",
      description: "Convert page content to Markdown and download",
      context: "content",
      execute: async () => {
        console.log("Downloading as markdown (implementation needed)...");
        await new Promise((res) => setTimeout(res, 50));
        return "Markdown download not yet implemented.";
      }
    }
    // Add more commands...
  ];
  const commandsById = new Map(
    commandsList.map((cmd) => [cmd.id, cmd])
  );
  function getCommandById(id) {
    return commandsById.get(id);
  }
  background;
  console.log("Background script loaded.");
  const definition = defineBackground(() => {
    browser.commands.onCommand.addListener(async (commandName) => {
      console.log(`Command received: ${commandName}`);
      if (commandName === "_execute_action" || commandName === "toggle-webprompt") {
        const [currentTab] = await browser.tabs.query({
          active: true,
          currentWindow: true
        });
        if (currentTab == null ? void 0 : currentTab.id) {
          console.log(`Sending toggle-ui message to tab ${currentTab.id}`);
          try {
            await browser.tabs.sendMessage(currentTab.id, {
              action: "toggle-ui"
            });
            console.log(`Message sent successfully to tab ${currentTab.id}`);
          } catch (error) {
            console.error(
              `Error sending message to tab ${currentTab.id}:`,
              error
            );
          }
        } else {
          console.log("No active tab found or tab has no ID.");
        }
      }
    });
    browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
      var _a2, _b2;
      console.log(
        "Message received in background:",
        message,
        "from tab:",
        (_a2 = sender.tab) == null ? void 0 : _a2.id
      );
      if (message.action === "execute-command") {
        const { commandId, args } = message.payload;
        const command = getCommandById(commandId);
        if (!command) {
          console.error(`Command not found: ${commandId}`);
          sendResponse({
            success: false,
            error: `Command not found: ${commandId}`
          });
          return false;
        }
        console.log(
          `Orchestrating command: ${command.name} (context: ${command.context})`
        );
        if (command.context === "background") {
          Promise.resolve().then(() => command.execute(sender.tab, ...args || [])).then((result2) => {
            console.log(
              `Background command '${command.name}' executed successfully.`
            );
            sendResponse({ success: true, result: result2 });
          }).catch((error) => {
            console.error(
              `Error executing background command '${command.name}':`,
              error
            );
            sendResponse({
              success: false,
              error: (error == null ? void 0 : error.message) || String(error)
            });
          });
          return true;
        } else if (command.context === "content") {
          if (!((_b2 = sender.tab) == null ? void 0 : _b2.id)) {
            console.error(
              "Cannot execute content script command: sender tab ID is missing."
            );
            sendResponse({ success: false, error: "Missing sender tab ID." });
            return false;
          }
          console.log(
            `Forwarding command '${command.name}' to content script in tab ${sender.tab.id}`
          );
          browser.tabs.sendMessage(sender.tab.id, {
            action: "run-content-command",
            payload: { commandId, args: args || [] }
          }).then((response) => {
            console.log(
              `Response from content script for '${command.name}':`,
              response
            );
            sendResponse(response);
          }).catch((error) => {
            console.error(
              `Error forwarding/receiving from content script for '${command.name}':`,
              error
            );
            sendResponse({
              success: false,
              error: (error == null ? void 0 : error.message) || `Error communicating with content script.`
            });
          });
          return true;
        } else {
          console.error(`Unsupported command context: ${command.context}`);
          sendResponse({
            success: false,
            error: `Unsupported command context: ${command.context}`
          });
          return false;
        }
      }
      return false;
    });
  });
  console.log("Background script setup complete.");
  background;
  function initPlugins() {
  }
  var _MatchPattern = class {
    constructor(matchPattern) {
      if (matchPattern === "<all_urls>") {
        this.isAllUrls = true;
        this.protocolMatches = [..._MatchPattern.PROTOCOLS];
        this.hostnameMatch = "*";
        this.pathnameMatch = "*";
      } else {
        const groups = /(.*):\/\/(.*?)(\/.*)/.exec(matchPattern);
        if (groups == null)
          throw new InvalidMatchPattern(matchPattern, "Incorrect format");
        const [_, protocol, hostname, pathname] = groups;
        validateProtocol(matchPattern, protocol);
        validateHostname(matchPattern, hostname);
        this.protocolMatches = protocol === "*" ? ["http", "https"] : [protocol];
        this.hostnameMatch = hostname;
        this.pathnameMatch = pathname;
      }
    }
    includes(url) {
      if (this.isAllUrls)
        return true;
      const u = typeof url === "string" ? new URL(url) : url instanceof Location ? new URL(url.href) : url;
      return !!this.protocolMatches.find((protocol) => {
        if (protocol === "http")
          return this.isHttpMatch(u);
        if (protocol === "https")
          return this.isHttpsMatch(u);
        if (protocol === "file")
          return this.isFileMatch(u);
        if (protocol === "ftp")
          return this.isFtpMatch(u);
        if (protocol === "urn")
          return this.isUrnMatch(u);
      });
    }
    isHttpMatch(url) {
      return url.protocol === "http:" && this.isHostPathMatch(url);
    }
    isHttpsMatch(url) {
      return url.protocol === "https:" && this.isHostPathMatch(url);
    }
    isHostPathMatch(url) {
      if (!this.hostnameMatch || !this.pathnameMatch)
        return false;
      const hostnameMatchRegexs = [
        this.convertPatternToRegex(this.hostnameMatch),
        this.convertPatternToRegex(this.hostnameMatch.replace(/^\*\./, ""))
      ];
      const pathnameMatchRegex = this.convertPatternToRegex(this.pathnameMatch);
      return !!hostnameMatchRegexs.find((regex) => regex.test(url.hostname)) && pathnameMatchRegex.test(url.pathname);
    }
    isFileMatch(url) {
      throw Error("Not implemented: file:// pattern matching. Open a PR to add support");
    }
    isFtpMatch(url) {
      throw Error("Not implemented: ftp:// pattern matching. Open a PR to add support");
    }
    isUrnMatch(url) {
      throw Error("Not implemented: urn:// pattern matching. Open a PR to add support");
    }
    convertPatternToRegex(pattern) {
      const escaped = this.escapeForRegex(pattern);
      const starsReplaced = escaped.replace(/\\\*/g, ".*");
      return RegExp(`^${starsReplaced}$`);
    }
    escapeForRegex(string) {
      return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    }
  };
  var MatchPattern = _MatchPattern;
  MatchPattern.PROTOCOLS = ["http", "https", "file", "ftp", "urn"];
  var InvalidMatchPattern = class extends Error {
    constructor(matchPattern, reason) {
      super(`Invalid match pattern "${matchPattern}": ${reason}`);
    }
  };
  function validateProtocol(matchPattern, protocol) {
    if (!MatchPattern.PROTOCOLS.includes(protocol) && protocol !== "*")
      throw new InvalidMatchPattern(
        matchPattern,
        `${protocol} not a valid protocol (${MatchPattern.PROTOCOLS.join(", ")})`
      );
  }
  function validateHostname(matchPattern, hostname) {
    if (hostname.includes(":"))
      throw new InvalidMatchPattern(matchPattern, `Hostname cannot include a port`);
    if (hostname.includes("*") && hostname.length > 1 && !hostname.startsWith("*."))
      throw new InvalidMatchPattern(
        matchPattern,
        `If using a wildcard (*), it must go at the start of the hostname`
      );
  }
  function print(method, ...args) {
    if (typeof args[0] === "string") {
      const message = args.shift();
      method(`[wxt] ${message}`, ...args);
    } else {
      method("[wxt]", ...args);
    }
  }
  const logger = {
    debug: (...args) => print(console.debug, ...args),
    log: (...args) => print(console.log, ...args),
    warn: (...args) => print(console.warn, ...args),
    error: (...args) => print(console.error, ...args)
  };
  let ws;
  function getDevServerWebSocket() {
    if (ws == null) {
      const serverUrl = "http://localhost:3000";
      logger.debug("Connecting to dev server @", serverUrl);
      ws = new WebSocket(serverUrl, "vite-hmr");
      ws.addWxtEventListener = ws.addEventListener.bind(ws);
      ws.sendCustom = (event, payload) => ws == null ? void 0 : ws.send(JSON.stringify({ type: "custom", event, payload }));
      ws.addEventListener("open", () => {
        logger.debug("Connected to dev server");
      });
      ws.addEventListener("close", () => {
        logger.debug("Disconnected from dev server");
      });
      ws.addEventListener("error", (event) => {
        logger.error("Failed to connect to dev server", event);
      });
      ws.addEventListener("message", (e) => {
        try {
          const message = JSON.parse(e.data);
          if (message.type === "custom") {
            ws == null ? void 0 : ws.dispatchEvent(
              new CustomEvent(message.event, { detail: message.data })
            );
          }
        } catch (err) {
          logger.error("Failed to handle message", err);
        }
      });
    }
    return ws;
  }
  function keepServiceWorkerAlive() {
    setInterval(async () => {
      await browser.runtime.getPlatformInfo();
    }, 5e3);
  }
  function reloadContentScript(payload) {
    const manifest = browser.runtime.getManifest();
    if (manifest.manifest_version == 2) {
      void reloadContentScriptMv2();
    } else {
      void reloadContentScriptMv3(payload);
    }
  }
  async function reloadContentScriptMv3({
    registration,
    contentScript
  }) {
    if (registration === "runtime") {
      await reloadRuntimeContentScriptMv3(contentScript);
    } else {
      await reloadManifestContentScriptMv3(contentScript);
    }
  }
  async function reloadManifestContentScriptMv3(contentScript) {
    const id = `wxt:${contentScript.js[0]}`;
    logger.log("Reloading content script:", contentScript);
    const registered = await browser.scripting.getRegisteredContentScripts();
    logger.debug("Existing scripts:", registered);
    const existing = registered.find((cs) => cs.id === id);
    if (existing) {
      logger.debug("Updating content script", existing);
      await browser.scripting.updateContentScripts([{ ...contentScript, id }]);
    } else {
      logger.debug("Registering new content script...");
      await browser.scripting.registerContentScripts([{ ...contentScript, id }]);
    }
    await reloadTabsForContentScript(contentScript);
  }
  async function reloadRuntimeContentScriptMv3(contentScript) {
    logger.log("Reloading content script:", contentScript);
    const registered = await browser.scripting.getRegisteredContentScripts();
    logger.debug("Existing scripts:", registered);
    const matches = registered.filter((cs) => {
      var _a2, _b2;
      const hasJs = (_a2 = contentScript.js) == null ? void 0 : _a2.find((js) => {
        var _a3;
        return (_a3 = cs.js) == null ? void 0 : _a3.includes(js);
      });
      const hasCss = (_b2 = contentScript.css) == null ? void 0 : _b2.find((css) => {
        var _a3;
        return (_a3 = cs.css) == null ? void 0 : _a3.includes(css);
      });
      return hasJs || hasCss;
    });
    if (matches.length === 0) {
      logger.log(
        "Content script is not registered yet, nothing to reload",
        contentScript
      );
      return;
    }
    await browser.scripting.updateContentScripts(matches);
    await reloadTabsForContentScript(contentScript);
  }
  async function reloadTabsForContentScript(contentScript) {
    const allTabs = await browser.tabs.query({});
    const matchPatterns = contentScript.matches.map(
      (match) => new MatchPattern(match)
    );
    const matchingTabs = allTabs.filter((tab) => {
      const url = tab.url;
      if (!url) return false;
      return !!matchPatterns.find((pattern) => pattern.includes(url));
    });
    await Promise.all(
      matchingTabs.map(async (tab) => {
        try {
          await browser.tabs.reload(tab.id);
        } catch (err) {
          logger.warn("Failed to reload tab:", err);
        }
      })
    );
  }
  async function reloadContentScriptMv2(_payload) {
    throw Error("TODO: reloadContentScriptMv2");
  }
  {
    try {
      const ws2 = getDevServerWebSocket();
      ws2.addWxtEventListener("wxt:reload-extension", () => {
        browser.runtime.reload();
      });
      ws2.addWxtEventListener("wxt:reload-content-script", (event) => {
        reloadContentScript(event.detail);
      });
      if (true) {
        ws2.addEventListener(
          "open",
          () => ws2.sendCustom("wxt:background-initialized")
        );
        keepServiceWorkerAlive();
      }
    } catch (err) {
      logger.error("Failed to setup web socket connection with dev server", err);
    }
    browser.commands.onCommand.addListener((command) => {
      if (command === "wxt:reload-extension") {
        browser.runtime.reload();
      }
    });
  }
  let result;
  try {
    initPlugins();
    result = definition.main();
    if (result instanceof Promise) {
      console.warn(
        "The background's main() function return a promise, but it must be synchronous"
      );
    }
  } catch (err) {
    logger.error("The background crashed on startup!");
    throw err;
  }
  const result$1 = result;
  return result$1;
}();
background;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYmFja2dyb3VuZC5qcyIsInNvdXJjZXMiOlsiLi4vLi4vbm9kZV9tb2R1bGVzLy5wbnBtL3d4dEAwLjIwLjNfQHR5cGVzK25vZGVAMjIuMTQuMV9qaXRpQDIuNC4yX2xpZ2h0bmluZ2Nzc0AxLjI5LjJfcm9sbHVwQDQuNDAuMC9ub2RlX21vZHVsZXMvd3h0L2Rpc3QvdXRpbHMvZGVmaW5lLWJhY2tncm91bmQubWpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzLy5wbnBtL0B3eHQtZGV2K2Jyb3dzZXJAMC4wLjMxNS9ub2RlX21vZHVsZXMvQHd4dC1kZXYvYnJvd3Nlci9zcmMvaW5kZXgubWpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzLy5wbnBtL3d4dEAwLjIwLjNfQHR5cGVzK25vZGVAMjIuMTQuMV9qaXRpQDIuNC4yX2xpZ2h0bmluZ2Nzc0AxLjI5LjJfcm9sbHVwQDQuNDAuMC9ub2RlX21vZHVsZXMvd3h0L2Rpc3QvYnJvd3Nlci5tanMiLCIuLi8uLi9saWIvY29tbWFuZHMudHMiLCIuLi8uLi9lbnRyeXBvaW50cy9iYWNrZ3JvdW5kLnRzIiwiLi4vLi4vbm9kZV9tb2R1bGVzLy5wbnBtL0B3ZWJleHQtY29yZSttYXRjaC1wYXR0ZXJuc0AxLjAuMy9ub2RlX21vZHVsZXMvQHdlYmV4dC1jb3JlL21hdGNoLXBhdHRlcm5zL2xpYi9pbmRleC5qcyJdLCJzb3VyY2VzQ29udGVudCI6WyJleHBvcnQgZnVuY3Rpb24gZGVmaW5lQmFja2dyb3VuZChhcmcpIHtcbiAgaWYgKGFyZyA9PSBudWxsIHx8IHR5cGVvZiBhcmcgPT09IFwiZnVuY3Rpb25cIikgcmV0dXJuIHsgbWFpbjogYXJnIH07XG4gIHJldHVybiBhcmc7XG59XG4iLCIvLyAjcmVnaW9uIHNuaXBwZXRcbmV4cG9ydCBjb25zdCBicm93c2VyID0gZ2xvYmFsVGhpcy5icm93c2VyPy5ydW50aW1lPy5pZFxuICA/IGdsb2JhbFRoaXMuYnJvd3NlclxuICA6IGdsb2JhbFRoaXMuY2hyb21lO1xuLy8gI2VuZHJlZ2lvbiBzbmlwcGV0XG4iLCJpbXBvcnQgeyBicm93c2VyIGFzIF9icm93c2VyIH0gZnJvbSBcIkB3eHQtZGV2L2Jyb3dzZXJcIjtcbmV4cG9ydCBjb25zdCBicm93c2VyID0gX2Jyb3dzZXI7XG5leHBvcnQge307XG4iLCJpbXBvcnQgdHlwZSB7IENvbnRlbnRTY3JpcHRDb250ZXh0IH0gZnJvbSBcIiNpbXBvcnRzXCI7IC8vIElmIG5lZWRlZCBmb3IgY29udGVudCBjb21tYW5kc1xuXG4vKipcbiAqIERlZmluZXMgdGhlIGV4ZWN1dGlvbiBjb250ZXh0IGZvciBhIGNvbW1hbmQuXG4gKiAtICdiYWNrZ3JvdW5kJzogRXhlY3V0ZXMgaW4gdGhlIGJhY2tncm91bmQgc2NyaXB0IChTZXJ2aWNlIFdvcmtlcikuIEhhcyBmdWxsIGV4dGVuc2lvbiBBUEkgYWNjZXNzLCBubyBkaXJlY3QgRE9NIGFjY2Vzcy5cbiAqIC0gJ2NvbnRlbnQnOiBFeGVjdXRlcyBpbiB0aGUgY29udGVudCBzY3JpcHQgb2YgdGhlIGFjdGl2ZSB0YWIuIEhhcyBET00gYWNjZXNzLCBsaW1pdGVkIGV4dGVuc2lvbiBBUEkgYWNjZXNzLlxuICovXG5leHBvcnQgdHlwZSBDb21tYW5kRXhlY3V0aW9uQ29udGV4dCA9IFwiYmFja2dyb3VuZFwiIHwgXCJjb250ZW50XCI7XG5cbmV4cG9ydCBpbnRlcmZhY2UgQ29tbWFuZCB7XG4gIGlkOiBzdHJpbmc7IC8vIFVuaXF1ZSBpZGVudGlmaWVyXG4gIG5hbWU6IHN0cmluZzsgLy8gVXNlci1mYWNpbmcgbmFtZVxuICBkZXNjcmlwdGlvbjogc3RyaW5nO1xuICBjb250ZXh0OiBDb21tYW5kRXhlY3V0aW9uQ29udGV4dDsgLy8gV2hlcmUgdGhlIGNvcmUgbG9naWMgcnVuc1xuICAvLyBUaGUgYWN0dWFsIGZ1bmN0aW9uIHRvIGV4ZWN1dGUuIEFyZ3VtZW50cyBhcmUgcGFzc2VkIGZyb20gdGhlIFVJL2lucHV0LlxuICAvLyBDb250ZXh0LXNwZWNpZmljIGFyZ3VtZW50cyAobGlrZSB0aGUgVGFiIGZvciBiYWNrZ3JvdW5kIG9yIG1heWJlIGN0eCBmb3IgY29udGVudCkgYXJlIGFkZGVkIGJ5IHRoZSBvcmNoZXN0cmF0b3IuXG4gIGV4ZWN1dGU6ICguLi5hcmdzOiBhbnlbXSkgPT4gUHJvbWlzZTxhbnk+IHwgYW55O1xuICAvLyBPcHRpb25hbDogRGVmaW5lIGV4cGVjdGVkIGFyZ3VtZW50cyBmb3IgaGVscC92YWxpZGF0aW9uIGxhdGVyXG4gIC8vIGFyZ3M/OiB7IG5hbWU6IHN0cmluZzsgZGVzY3JpcHRpb24/OiBzdHJpbmc7IHR5cGU6IHN0cmluZyB9W107XG59XG5cbi8vIC0tLSBEZWZpbmUgQ29tbWFuZHMgLS0tXG5cbmNvbnN0IGNvbW1hbmRzTGlzdDogQ29tbWFuZFtdID0gW1xuICAvLyAtLS0gQmFja2dyb3VuZCBDb21tYW5kcyAtLS1cbiAge1xuICAgIGlkOiBcIm5ldy10YWJcIixcbiAgICBuYW1lOiBcIk5ldyBUYWJcIixcbiAgICBkZXNjcmlwdGlvbjogXCJPcGVuIGEgbmV3IGJyb3dzZXIgdGFiXCIsXG4gICAgY29udGV4dDogXCJiYWNrZ3JvdW5kXCIsXG4gICAgZXhlY3V0ZTogYXN5bmMgKHVybD86IHN0cmluZykgPT4ge1xuICAgICAgYXdhaXQgYnJvd3Nlci50YWJzLmNyZWF0ZSh7IHVybDogdXJsIHx8IFwiYWJvdXQ6bmV3dGFiXCIgfSk7XG4gICAgICByZXR1cm4gXCJOZXcgdGFiIG9wZW5lZC5cIjsgLy8gT3B0aW9uYWwgc3VjY2VzcyBtZXNzYWdlXG4gICAgfSxcbiAgICAvLyBhcmdzOiBbeyBuYW1lOiAndXJsJywgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnKE9wdGlvbmFsKSBVUkwgdG8gb3BlbicgfV1cbiAgfSxcbiAge1xuICAgIGlkOiBcImNsb3NlLXRhYlwiLFxuICAgIG5hbWU6IFwiQ2xvc2UgVGFiXCIsXG4gICAgZGVzY3JpcHRpb246IFwiQ2xvc2UgdGhlIGN1cnJlbnQgdGFiXCIsXG4gICAgY29udGV4dDogXCJiYWNrZ3JvdW5kXCIsXG4gICAgLy8gTm90ZTogQmFja2dyb3VuZCBleGVjdXRvciBuZWVkcyB0byBwYXNzIHRoZSAndGFiJyBvYmplY3QgZnJvbSB0aGUgc2VuZGVyXG4gICAgZXhlY3V0ZTogYXN5bmMgKHRhYj86IGJyb3dzZXIudGFicy5UYWIpID0+IHtcbiAgICAgIGlmICh0YWI/LmlkKSB7XG4gICAgICAgIGF3YWl0IGJyb3dzZXIudGFicy5yZW1vdmUodGFiLmlkKTtcbiAgICAgICAgcmV0dXJuIFwiVGFiIGNsb3NlZC5cIjtcbiAgICAgIH1cbiAgICAgIHRocm93IG5ldyBFcnJvcihcIkNvdWxkIG5vdCBkZXRlcm1pbmUgdGhlIGFjdGl2ZSB0YWIgdG8gY2xvc2UuXCIpO1xuICAgIH0sXG4gIH0sXG4gIHtcbiAgICBpZDogXCJyZWxvYWQtdGFiXCIsXG4gICAgbmFtZTogXCJSZWxvYWQgVGFiXCIsXG4gICAgZGVzY3JpcHRpb246IFwiUmVsb2FkIHRoZSBjdXJyZW50IHRhYlwiLFxuICAgIGNvbnRleHQ6IFwiYmFja2dyb3VuZFwiLFxuICAgIGV4ZWN1dGU6IGFzeW5jICh0YWI/OiBicm93c2VyLnRhYnMuVGFiKSA9PiB7XG4gICAgICBpZiAodGFiPy5pZCkge1xuICAgICAgICBhd2FpdCBicm93c2VyLnRhYnMucmVsb2FkKHRhYi5pZCk7XG4gICAgICAgIHJldHVybiBcIlRhYiByZWxvYWRlZC5cIjtcbiAgICAgIH1cbiAgICAgIHRocm93IG5ldyBFcnJvcihcIkNvdWxkIG5vdCBkZXRlcm1pbmUgdGhlIGFjdGl2ZSB0YWIgdG8gcmVsb2FkLlwiKTtcbiAgICB9LFxuICB9LFxuICB7XG4gICAgaWQ6IFwibGlzdC1ib29rbWFya3NcIiwgLy8gRXhhbXBsZSAtIEltcGxlbWVudCBhY3R1YWwgbG9naWMgbGF0ZXJcbiAgICBuYW1lOiBcIkxpc3QgQm9va21hcmtzXCIsXG4gICAgZGVzY3JpcHRpb246IFwiU2VhcmNoIGFuZCBsaXN0IGJvb2ttYXJrc1wiLFxuICAgIGNvbnRleHQ6IFwiYmFja2dyb3VuZFwiLFxuICAgIGV4ZWN1dGU6IGFzeW5jIChxdWVyeT86IHN0cmluZykgPT4ge1xuICAgICAgY29uc29sZS5sb2coXCJMaXN0aW5nIGJvb2ttYXJrcyAoaW1wbGVtZW50YXRpb24gbmVlZGVkKS4uLiBRdWVyeTpcIiwgcXVlcnkpO1xuICAgICAgLy8gUGxhY2Vob2xkZXI6IFJlcGxhY2Ugd2l0aCBhY3R1YWwgYnJvd3Nlci5ib29rbWFya3Muc2VhcmNoKC4uLilcbiAgICAgIGF3YWl0IG5ldyBQcm9taXNlKChyZXMpID0+IHNldFRpbWVvdXQocmVzLCA1MCkpOyAvLyBTaW11bGF0ZSBhc3luYyB3b3JrXG4gICAgICByZXR1cm4gXCJCb29rbWFyayBsaXN0aW5nIG5vdCB5ZXQgaW1wbGVtZW50ZWQuXCI7XG4gICAgfSxcbiAgfSxcblxuICAvLyAtLS0gQ29udGVudCBTY3JpcHQgQ29tbWFuZHMgLS0tXG4gIHtcbiAgICBpZDogXCJnby1iYWNrXCIsXG4gICAgbmFtZTogXCJHbyBCYWNrXCIsXG4gICAgZGVzY3JpcHRpb246IFwiTmF2aWdhdGUgYmFjayBpbiBoaXN0b3J5XCIsXG4gICAgY29udGV4dDogXCJjb250ZW50XCIsXG4gICAgZXhlY3V0ZTogKCkgPT4ge1xuICAgICAgd2luZG93Lmhpc3RvcnkuYmFjaygpO1xuICAgICAgcmV0dXJuIFwiTmF2aWdhdGVkIGJhY2suXCI7IC8vIENvbnRlbnQgc2NyaXB0cyBjYW4gcmV0dXJuIHJlc3VsdHMgdG9vXG4gICAgfSxcbiAgfSxcbiAge1xuICAgIGlkOiBcImdvLWZvcndhcmRcIixcbiAgICBuYW1lOiBcIkdvIEZvcndhcmRcIixcbiAgICBkZXNjcmlwdGlvbjogXCJOYXZpZ2F0ZSBmb3J3YXJkIGluIGhpc3RvcnlcIixcbiAgICBjb250ZXh0OiBcImNvbnRlbnRcIixcbiAgICBleGVjdXRlOiAoKSA9PiB7XG4gICAgICB3aW5kb3cuaGlzdG9yeS5mb3J3YXJkKCk7XG4gICAgICByZXR1cm4gXCJOYXZpZ2F0ZWQgZm9yd2FyZC5cIjtcbiAgICB9LFxuICB9LFxuICB7XG4gICAgaWQ6IFwiY29weS10aXRsZVwiLFxuICAgIG5hbWU6IFwiQ29weSBQYWdlIFRpdGxlXCIsXG4gICAgZGVzY3JpcHRpb246IFwiQ29weSB0aGUgY3VycmVudCBwYWdlIHRpdGxlIHRvIGNsaXBib2FyZFwiLFxuICAgIGNvbnRleHQ6IFwiY29udGVudFwiLFxuICAgIGV4ZWN1dGU6IGFzeW5jICgpID0+IHtcbiAgICAgIGNvbnN0IHRpdGxlID0gZG9jdW1lbnQudGl0bGU7XG4gICAgICBhd2FpdCBuYXZpZ2F0b3IuY2xpcGJvYXJkLndyaXRlVGV4dCh0aXRsZSk7XG4gICAgICByZXR1cm4gYENvcGllZCB0aXRsZTogXCIke3RpdGxlfVwiYDtcbiAgICB9LFxuICB9LFxuICB7XG4gICAgaWQ6IFwiZG93bmxvYWQtbWFya2Rvd25cIixcbiAgICBuYW1lOiBcIkRvd25sb2FkIGFzIE1hcmtkb3duXCIsXG4gICAgZGVzY3JpcHRpb246IFwiQ29udmVydCBwYWdlIGNvbnRlbnQgdG8gTWFya2Rvd24gYW5kIGRvd25sb2FkXCIsXG4gICAgY29udGV4dDogXCJjb250ZW50XCIsXG4gICAgZXhlY3V0ZTogYXN5bmMgKCkgPT4ge1xuICAgICAgY29uc29sZS5sb2coXCJEb3dubG9hZGluZyBhcyBtYXJrZG93biAoaW1wbGVtZW50YXRpb24gbmVlZGVkKS4uLlwiKTtcbiAgICAgIC8vIFBsYWNlaG9sZGVyOiBBZGQgSFRNTC10by1NYXJrZG93biBjb252ZXJzaW9uIGxvZ2ljIGhlcmVcbiAgICAgIGF3YWl0IG5ldyBQcm9taXNlKChyZXMpID0+IHNldFRpbWVvdXQocmVzLCA1MCkpO1xuICAgICAgcmV0dXJuIFwiTWFya2Rvd24gZG93bmxvYWQgbm90IHlldCBpbXBsZW1lbnRlZC5cIjtcbiAgICB9LFxuICB9LFxuICAvLyBBZGQgbW9yZSBjb21tYW5kcy4uLlxuXTtcblxuLy8gLS0tIFJlZ2lzdHJ5IExvZ2ljIC0tLVxuXG5jb25zdCBjb21tYW5kc0J5SWQgPSBuZXcgTWFwPHN0cmluZywgQ29tbWFuZD4oXG4gIGNvbW1hbmRzTGlzdC5tYXAoKGNtZCkgPT4gW2NtZC5pZCwgY21kXSksXG4pO1xuXG5leHBvcnQgZnVuY3Rpb24gZ2V0QWxsQ29tbWFuZHMoKTogQ29tbWFuZFtdIHtcbiAgLy8gUmV0dXJuIGEgY29weSB0byBwcmV2ZW50IG11dGF0aW9uXG4gIHJldHVybiBbLi4uY29tbWFuZHNMaXN0XTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGdldENvbW1hbmRCeUlkKGlkOiBzdHJpbmcpOiBDb21tYW5kIHwgdW5kZWZpbmVkIHtcbiAgcmV0dXJuIGNvbW1hbmRzQnlJZC5nZXQoaWQpO1xufVxuXG4vLyBZb3UgbWlnaHQgYWRkIHNlYXJjaC9maWx0ZXIgZnVuY3Rpb25zIGhlcmUgbGF0ZXIgaWYgbmVlZGVkXG5leHBvcnQgZnVuY3Rpb24gc2VhcmNoQ29tbWFuZHMocXVlcnk6IHN0cmluZyk6IENvbW1hbmRbXSB7XG4gIGNvbnN0IGxvd2VyQ2FzZVF1ZXJ5ID0gcXVlcnkudG9Mb3dlckNhc2UoKS50cmltKCk7XG4gIGlmICghbG93ZXJDYXNlUXVlcnkpIHJldHVybiBnZXRBbGxDb21tYW5kcygpO1xuICByZXR1cm4gY29tbWFuZHNMaXN0LmZpbHRlcihcbiAgICAoY21kKSA9PlxuICAgICAgY21kLm5hbWUudG9Mb3dlckNhc2UoKS5pbmNsdWRlcyhsb3dlckNhc2VRdWVyeSkgfHxcbiAgICAgIGNtZC5kZXNjcmlwdGlvbi50b0xvd2VyQ2FzZSgpLmluY2x1ZGVzKGxvd2VyQ2FzZVF1ZXJ5KSB8fFxuICAgICAgY21kLmlkLnRvTG93ZXJDYXNlKCkuaW5jbHVkZXMobG93ZXJDYXNlUXVlcnkpLFxuICApO1xufVxuIiwiaW1wb3J0IHsgZ2V0Q29tbWFuZEJ5SWQgfSBmcm9tIFwiQC9saWIvY29tbWFuZHNcIjsgLy8gSW1wb3J0IGZyb20gcmVnaXN0cnlcblxuY29uc29sZS5sb2coXCJCYWNrZ3JvdW5kIHNjcmlwdCBsb2FkZWQuXCIpO1xuXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVCYWNrZ3JvdW5kKCgpID0+IHtcbiAgLy8gQ29tbWFuZCBsaXN0ZW5lciAoZm9yIGtleWJvYXJkIHNob3J0Y3V0KSByZW1haW5zIHRoZSBzYW1lXG4gIGJyb3dzZXIuY29tbWFuZHMub25Db21tYW5kLmFkZExpc3RlbmVyKGFzeW5jIChjb21tYW5kTmFtZSkgPT4ge1xuICAgIGNvbnNvbGUubG9nKGBDb21tYW5kIHJlY2VpdmVkOiAke2NvbW1hbmROYW1lfWApO1xuICAgIGlmIChcbiAgICAgIGNvbW1hbmROYW1lID09PSBcIl9leGVjdXRlX2FjdGlvblwiIHx8XG4gICAgICBjb21tYW5kTmFtZSA9PT0gXCJ0b2dnbGUtd2VicHJvbXB0XCJcbiAgICApIHtcbiAgICAgIGNvbnN0IFtjdXJyZW50VGFiXSA9IGF3YWl0IGJyb3dzZXIudGFicy5xdWVyeSh7XG4gICAgICAgIGFjdGl2ZTogdHJ1ZSxcbiAgICAgICAgY3VycmVudFdpbmRvdzogdHJ1ZSxcbiAgICAgIH0pO1xuXG4gICAgICBpZiAoY3VycmVudFRhYj8uaWQpIHtcbiAgICAgICAgY29uc29sZS5sb2coYFNlbmRpbmcgdG9nZ2xlLXVpIG1lc3NhZ2UgdG8gdGFiICR7Y3VycmVudFRhYi5pZH1gKTtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICBhd2FpdCBicm93c2VyLnRhYnMuc2VuZE1lc3NhZ2UoY3VycmVudFRhYi5pZCwge1xuICAgICAgICAgICAgYWN0aW9uOiBcInRvZ2dsZS11aVwiLFxuICAgICAgICAgIH0pO1xuICAgICAgICAgIGNvbnNvbGUubG9nKGBNZXNzYWdlIHNlbnQgc3VjY2Vzc2Z1bGx5IHRvIHRhYiAke2N1cnJlbnRUYWIuaWR9YCk7XG4gICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgY29uc29sZS5lcnJvcihcbiAgICAgICAgICAgIGBFcnJvciBzZW5kaW5nIG1lc3NhZ2UgdG8gdGFiICR7Y3VycmVudFRhYi5pZH06YCxcbiAgICAgICAgICAgIGVycm9yLFxuICAgICAgICAgICk7XG4gICAgICAgICAgLy8gVE9ETzogQ29uc2lkZXIgaW5qZWN0aW5nIGNvbnRlbnQgc2NyaXB0IGlmIGl0IGRvZXNuJ3QgZXhpc3RcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY29uc29sZS5sb2coXCJObyBhY3RpdmUgdGFiIGZvdW5kIG9yIHRhYiBoYXMgbm8gSUQuXCIpO1xuICAgICAgfVxuICAgIH1cbiAgfSk7XG5cbiAgLy8gLS0tIENvbW1hbmQgT3JjaGVzdHJhdGlvbiAtLS1cbiAgYnJvd3Nlci5ydW50aW1lLm9uTWVzc2FnZS5hZGRMaXN0ZW5lcigobWVzc2FnZSwgc2VuZGVyLCBzZW5kUmVzcG9uc2UpID0+IHtcbiAgICBjb25zb2xlLmxvZyhcbiAgICAgIFwiTWVzc2FnZSByZWNlaXZlZCBpbiBiYWNrZ3JvdW5kOlwiLFxuICAgICAgbWVzc2FnZSxcbiAgICAgIFwiZnJvbSB0YWI6XCIsXG4gICAgICBzZW5kZXIudGFiPy5pZCxcbiAgICApO1xuXG4gICAgaWYgKG1lc3NhZ2UuYWN0aW9uID09PSBcImV4ZWN1dGUtY29tbWFuZFwiKSB7XG4gICAgICBjb25zdCB7IGNvbW1hbmRJZCwgYXJncyB9ID0gbWVzc2FnZS5wYXlsb2FkO1xuICAgICAgY29uc3QgY29tbWFuZCA9IGdldENvbW1hbmRCeUlkKGNvbW1hbmRJZCk7XG5cbiAgICAgIGlmICghY29tbWFuZCkge1xuICAgICAgICBjb25zb2xlLmVycm9yKGBDb21tYW5kIG5vdCBmb3VuZDogJHtjb21tYW5kSWR9YCk7XG4gICAgICAgIHNlbmRSZXNwb25zZSh7XG4gICAgICAgICAgc3VjY2VzczogZmFsc2UsXG4gICAgICAgICAgZXJyb3I6IGBDb21tYW5kIG5vdCBmb3VuZDogJHtjb21tYW5kSWR9YCxcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiBmYWxzZTsgLy8gU3luY2hyb25vdXMgcmVzcG9uc2VcbiAgICAgIH1cblxuICAgICAgY29uc29sZS5sb2coXG4gICAgICAgIGBPcmNoZXN0cmF0aW5nIGNvbW1hbmQ6ICR7Y29tbWFuZC5uYW1lfSAoY29udGV4dDogJHtjb21tYW5kLmNvbnRleHR9KWAsXG4gICAgICApO1xuXG4gICAgICBpZiAoY29tbWFuZC5jb250ZXh0ID09PSBcImJhY2tncm91bmRcIikge1xuICAgICAgICAvLyBFeGVjdXRlIGRpcmVjdGx5IGluIGJhY2tncm91bmRcbiAgICAgICAgUHJvbWlzZS5yZXNvbHZlKCkgLy8gRW5zdXJlIGFzeW5jIGhhbmRsaW5nXG4gICAgICAgICAgLnRoZW4oKCkgPT4gY29tbWFuZC5leGVjdXRlKHNlbmRlci50YWIsIC4uLihhcmdzIHx8IFtdKSkpIC8vIFBhc3MgdGFiIGNvbnRleHRcbiAgICAgICAgICAudGhlbigocmVzdWx0KSA9PiB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcbiAgICAgICAgICAgICAgYEJhY2tncm91bmQgY29tbWFuZCAnJHtjb21tYW5kLm5hbWV9JyBleGVjdXRlZCBzdWNjZXNzZnVsbHkuYCxcbiAgICAgICAgICAgICk7XG4gICAgICAgICAgICBzZW5kUmVzcG9uc2UoeyBzdWNjZXNzOiB0cnVlLCByZXN1bHQgfSk7XG4gICAgICAgICAgfSlcbiAgICAgICAgICAuY2F0Y2goKGVycm9yKSA9PiB7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKFxuICAgICAgICAgICAgICBgRXJyb3IgZXhlY3V0aW5nIGJhY2tncm91bmQgY29tbWFuZCAnJHtjb21tYW5kLm5hbWV9JzpgLFxuICAgICAgICAgICAgICBlcnJvcixcbiAgICAgICAgICAgICk7XG4gICAgICAgICAgICBzZW5kUmVzcG9uc2Uoe1xuICAgICAgICAgICAgICBzdWNjZXNzOiBmYWxzZSxcbiAgICAgICAgICAgICAgZXJyb3I6IGVycm9yPy5tZXNzYWdlIHx8IFN0cmluZyhlcnJvciksXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIHRydWU7IC8vIEluZGljYXRlcyBhc3luYyByZXNwb25zZVxuICAgICAgfSBlbHNlIGlmIChjb21tYW5kLmNvbnRleHQgPT09IFwiY29udGVudFwiKSB7XG4gICAgICAgIC8vIEZvcndhcmQgdG8gdGhlIGNvbnRlbnQgc2NyaXB0IHRoYXQgc2VudCB0aGUgbWVzc2FnZVxuICAgICAgICBpZiAoIXNlbmRlci50YWI/LmlkKSB7XG4gICAgICAgICAgY29uc29sZS5lcnJvcihcbiAgICAgICAgICAgIFwiQ2Fubm90IGV4ZWN1dGUgY29udGVudCBzY3JpcHQgY29tbWFuZDogc2VuZGVyIHRhYiBJRCBpcyBtaXNzaW5nLlwiLFxuICAgICAgICAgICk7XG4gICAgICAgICAgc2VuZFJlc3BvbnNlKHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBcIk1pc3Npbmcgc2VuZGVyIHRhYiBJRC5cIiB9KTtcbiAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgY29uc29sZS5sb2coXG4gICAgICAgICAgYEZvcndhcmRpbmcgY29tbWFuZCAnJHtjb21tYW5kLm5hbWV9JyB0byBjb250ZW50IHNjcmlwdCBpbiB0YWIgJHtzZW5kZXIudGFiLmlkfWAsXG4gICAgICAgICk7XG4gICAgICAgIGJyb3dzZXIudGFic1xuICAgICAgICAgIC5zZW5kTWVzc2FnZShzZW5kZXIudGFiLmlkLCB7XG4gICAgICAgICAgICBhY3Rpb246IFwicnVuLWNvbnRlbnQtY29tbWFuZFwiLFxuICAgICAgICAgICAgcGF5bG9hZDogeyBjb21tYW5kSWQsIGFyZ3M6IGFyZ3MgfHwgW10gfSxcbiAgICAgICAgICB9KVxuICAgICAgICAgIC50aGVuKChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgY29uc29sZS5sb2coXG4gICAgICAgICAgICAgIGBSZXNwb25zZSBmcm9tIGNvbnRlbnQgc2NyaXB0IGZvciAnJHtjb21tYW5kLm5hbWV9JzpgLFxuICAgICAgICAgICAgICByZXNwb25zZSxcbiAgICAgICAgICAgICk7XG4gICAgICAgICAgICAvLyBGb3J3YXJkIHRoZSBjb250ZW50IHNjcmlwdCdzIHJlc3BvbnNlIGJhY2sgdG8gdGhlIG9yaWdpbmFsIFVJIGNhbGxlclxuICAgICAgICAgICAgc2VuZFJlc3BvbnNlKHJlc3BvbnNlKTtcbiAgICAgICAgICB9KVxuICAgICAgICAgIC5jYXRjaCgoZXJyb3IpID0+IHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoXG4gICAgICAgICAgICAgIGBFcnJvciBmb3J3YXJkaW5nL3JlY2VpdmluZyBmcm9tIGNvbnRlbnQgc2NyaXB0IGZvciAnJHtjb21tYW5kLm5hbWV9JzpgLFxuICAgICAgICAgICAgICBlcnJvcixcbiAgICAgICAgICAgICk7XG4gICAgICAgICAgICBzZW5kUmVzcG9uc2Uoe1xuICAgICAgICAgICAgICBzdWNjZXNzOiBmYWxzZSxcbiAgICAgICAgICAgICAgZXJyb3I6XG4gICAgICAgICAgICAgICAgZXJyb3I/Lm1lc3NhZ2UgfHwgYEVycm9yIGNvbW11bmljYXRpbmcgd2l0aCBjb250ZW50IHNjcmlwdC5gLFxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiB0cnVlOyAvLyBJbmRpY2F0ZXMgYXN5bmMgcmVzcG9uc2VcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoYFVuc3VwcG9ydGVkIGNvbW1hbmQgY29udGV4dDogJHtjb21tYW5kLmNvbnRleHR9YCk7XG4gICAgICAgIHNlbmRSZXNwb25zZSh7XG4gICAgICAgICAgc3VjY2VzczogZmFsc2UsXG4gICAgICAgICAgZXJyb3I6IGBVbnN1cHBvcnRlZCBjb21tYW5kIGNvbnRleHQ6ICR7Y29tbWFuZC5jb250ZXh0fWAsXG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG4gICAgfVxuICAgIC8vIEhhbmRsZSBvdGhlciBtZXNzYWdlIHR5cGVzIGlmIG5lZWRlZFxuICAgIHJldHVybiBmYWxzZTsgLy8gSW5kaWNhdGUgc3luY2hyb25vdXMgaGFuZGxpbmcgaWYgbm8gcmVzcG9uc2UgbmVlZGVkIG9yIGhhbmRsZWQgYWJvdmVcbiAgfSk7XG59KTtcblxuY29uc29sZS5sb2coXCJCYWNrZ3JvdW5kIHNjcmlwdCBzZXR1cCBjb21wbGV0ZS5cIik7XG4iLCIvLyBzcmMvaW5kZXgudHNcbnZhciBfTWF0Y2hQYXR0ZXJuID0gY2xhc3Mge1xuICBjb25zdHJ1Y3RvcihtYXRjaFBhdHRlcm4pIHtcbiAgICBpZiAobWF0Y2hQYXR0ZXJuID09PSBcIjxhbGxfdXJscz5cIikge1xuICAgICAgdGhpcy5pc0FsbFVybHMgPSB0cnVlO1xuICAgICAgdGhpcy5wcm90b2NvbE1hdGNoZXMgPSBbLi4uX01hdGNoUGF0dGVybi5QUk9UT0NPTFNdO1xuICAgICAgdGhpcy5ob3N0bmFtZU1hdGNoID0gXCIqXCI7XG4gICAgICB0aGlzLnBhdGhuYW1lTWF0Y2ggPSBcIipcIjtcbiAgICB9IGVsc2Uge1xuICAgICAgY29uc3QgZ3JvdXBzID0gLyguKik6XFwvXFwvKC4qPykoXFwvLiopLy5leGVjKG1hdGNoUGF0dGVybik7XG4gICAgICBpZiAoZ3JvdXBzID09IG51bGwpXG4gICAgICAgIHRocm93IG5ldyBJbnZhbGlkTWF0Y2hQYXR0ZXJuKG1hdGNoUGF0dGVybiwgXCJJbmNvcnJlY3QgZm9ybWF0XCIpO1xuICAgICAgY29uc3QgW18sIHByb3RvY29sLCBob3N0bmFtZSwgcGF0aG5hbWVdID0gZ3JvdXBzO1xuICAgICAgdmFsaWRhdGVQcm90b2NvbChtYXRjaFBhdHRlcm4sIHByb3RvY29sKTtcbiAgICAgIHZhbGlkYXRlSG9zdG5hbWUobWF0Y2hQYXR0ZXJuLCBob3N0bmFtZSk7XG4gICAgICB2YWxpZGF0ZVBhdGhuYW1lKG1hdGNoUGF0dGVybiwgcGF0aG5hbWUpO1xuICAgICAgdGhpcy5wcm90b2NvbE1hdGNoZXMgPSBwcm90b2NvbCA9PT0gXCIqXCIgPyBbXCJodHRwXCIsIFwiaHR0cHNcIl0gOiBbcHJvdG9jb2xdO1xuICAgICAgdGhpcy5ob3N0bmFtZU1hdGNoID0gaG9zdG5hbWU7XG4gICAgICB0aGlzLnBhdGhuYW1lTWF0Y2ggPSBwYXRobmFtZTtcbiAgICB9XG4gIH1cbiAgaW5jbHVkZXModXJsKSB7XG4gICAgaWYgKHRoaXMuaXNBbGxVcmxzKVxuICAgICAgcmV0dXJuIHRydWU7XG4gICAgY29uc3QgdSA9IHR5cGVvZiB1cmwgPT09IFwic3RyaW5nXCIgPyBuZXcgVVJMKHVybCkgOiB1cmwgaW5zdGFuY2VvZiBMb2NhdGlvbiA/IG5ldyBVUkwodXJsLmhyZWYpIDogdXJsO1xuICAgIHJldHVybiAhIXRoaXMucHJvdG9jb2xNYXRjaGVzLmZpbmQoKHByb3RvY29sKSA9PiB7XG4gICAgICBpZiAocHJvdG9jb2wgPT09IFwiaHR0cFwiKVxuICAgICAgICByZXR1cm4gdGhpcy5pc0h0dHBNYXRjaCh1KTtcbiAgICAgIGlmIChwcm90b2NvbCA9PT0gXCJodHRwc1wiKVxuICAgICAgICByZXR1cm4gdGhpcy5pc0h0dHBzTWF0Y2godSk7XG4gICAgICBpZiAocHJvdG9jb2wgPT09IFwiZmlsZVwiKVxuICAgICAgICByZXR1cm4gdGhpcy5pc0ZpbGVNYXRjaCh1KTtcbiAgICAgIGlmIChwcm90b2NvbCA9PT0gXCJmdHBcIilcbiAgICAgICAgcmV0dXJuIHRoaXMuaXNGdHBNYXRjaCh1KTtcbiAgICAgIGlmIChwcm90b2NvbCA9PT0gXCJ1cm5cIilcbiAgICAgICAgcmV0dXJuIHRoaXMuaXNVcm5NYXRjaCh1KTtcbiAgICB9KTtcbiAgfVxuICBpc0h0dHBNYXRjaCh1cmwpIHtcbiAgICByZXR1cm4gdXJsLnByb3RvY29sID09PSBcImh0dHA6XCIgJiYgdGhpcy5pc0hvc3RQYXRoTWF0Y2godXJsKTtcbiAgfVxuICBpc0h0dHBzTWF0Y2godXJsKSB7XG4gICAgcmV0dXJuIHVybC5wcm90b2NvbCA9PT0gXCJodHRwczpcIiAmJiB0aGlzLmlzSG9zdFBhdGhNYXRjaCh1cmwpO1xuICB9XG4gIGlzSG9zdFBhdGhNYXRjaCh1cmwpIHtcbiAgICBpZiAoIXRoaXMuaG9zdG5hbWVNYXRjaCB8fCAhdGhpcy5wYXRobmFtZU1hdGNoKVxuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIGNvbnN0IGhvc3RuYW1lTWF0Y2hSZWdleHMgPSBbXG4gICAgICB0aGlzLmNvbnZlcnRQYXR0ZXJuVG9SZWdleCh0aGlzLmhvc3RuYW1lTWF0Y2gpLFxuICAgICAgdGhpcy5jb252ZXJ0UGF0dGVyblRvUmVnZXgodGhpcy5ob3N0bmFtZU1hdGNoLnJlcGxhY2UoL15cXCpcXC4vLCBcIlwiKSlcbiAgICBdO1xuICAgIGNvbnN0IHBhdGhuYW1lTWF0Y2hSZWdleCA9IHRoaXMuY29udmVydFBhdHRlcm5Ub1JlZ2V4KHRoaXMucGF0aG5hbWVNYXRjaCk7XG4gICAgcmV0dXJuICEhaG9zdG5hbWVNYXRjaFJlZ2V4cy5maW5kKChyZWdleCkgPT4gcmVnZXgudGVzdCh1cmwuaG9zdG5hbWUpKSAmJiBwYXRobmFtZU1hdGNoUmVnZXgudGVzdCh1cmwucGF0aG5hbWUpO1xuICB9XG4gIGlzRmlsZU1hdGNoKHVybCkge1xuICAgIHRocm93IEVycm9yKFwiTm90IGltcGxlbWVudGVkOiBmaWxlOi8vIHBhdHRlcm4gbWF0Y2hpbmcuIE9wZW4gYSBQUiB0byBhZGQgc3VwcG9ydFwiKTtcbiAgfVxuICBpc0Z0cE1hdGNoKHVybCkge1xuICAgIHRocm93IEVycm9yKFwiTm90IGltcGxlbWVudGVkOiBmdHA6Ly8gcGF0dGVybiBtYXRjaGluZy4gT3BlbiBhIFBSIHRvIGFkZCBzdXBwb3J0XCIpO1xuICB9XG4gIGlzVXJuTWF0Y2godXJsKSB7XG4gICAgdGhyb3cgRXJyb3IoXCJOb3QgaW1wbGVtZW50ZWQ6IHVybjovLyBwYXR0ZXJuIG1hdGNoaW5nLiBPcGVuIGEgUFIgdG8gYWRkIHN1cHBvcnRcIik7XG4gIH1cbiAgY29udmVydFBhdHRlcm5Ub1JlZ2V4KHBhdHRlcm4pIHtcbiAgICBjb25zdCBlc2NhcGVkID0gdGhpcy5lc2NhcGVGb3JSZWdleChwYXR0ZXJuKTtcbiAgICBjb25zdCBzdGFyc1JlcGxhY2VkID0gZXNjYXBlZC5yZXBsYWNlKC9cXFxcXFwqL2csIFwiLipcIik7XG4gICAgcmV0dXJuIFJlZ0V4cChgXiR7c3RhcnNSZXBsYWNlZH0kYCk7XG4gIH1cbiAgZXNjYXBlRm9yUmVnZXgoc3RyaW5nKSB7XG4gICAgcmV0dXJuIHN0cmluZy5yZXBsYWNlKC9bLiorP14ke30oKXxbXFxdXFxcXF0vZywgXCJcXFxcJCZcIik7XG4gIH1cbn07XG52YXIgTWF0Y2hQYXR0ZXJuID0gX01hdGNoUGF0dGVybjtcbk1hdGNoUGF0dGVybi5QUk9UT0NPTFMgPSBbXCJodHRwXCIsIFwiaHR0cHNcIiwgXCJmaWxlXCIsIFwiZnRwXCIsIFwidXJuXCJdO1xudmFyIEludmFsaWRNYXRjaFBhdHRlcm4gPSBjbGFzcyBleHRlbmRzIEVycm9yIHtcbiAgY29uc3RydWN0b3IobWF0Y2hQYXR0ZXJuLCByZWFzb24pIHtcbiAgICBzdXBlcihgSW52YWxpZCBtYXRjaCBwYXR0ZXJuIFwiJHttYXRjaFBhdHRlcm59XCI6ICR7cmVhc29ufWApO1xuICB9XG59O1xuZnVuY3Rpb24gdmFsaWRhdGVQcm90b2NvbChtYXRjaFBhdHRlcm4sIHByb3RvY29sKSB7XG4gIGlmICghTWF0Y2hQYXR0ZXJuLlBST1RPQ09MUy5pbmNsdWRlcyhwcm90b2NvbCkgJiYgcHJvdG9jb2wgIT09IFwiKlwiKVxuICAgIHRocm93IG5ldyBJbnZhbGlkTWF0Y2hQYXR0ZXJuKFxuICAgICAgbWF0Y2hQYXR0ZXJuLFxuICAgICAgYCR7cHJvdG9jb2x9IG5vdCBhIHZhbGlkIHByb3RvY29sICgke01hdGNoUGF0dGVybi5QUk9UT0NPTFMuam9pbihcIiwgXCIpfSlgXG4gICAgKTtcbn1cbmZ1bmN0aW9uIHZhbGlkYXRlSG9zdG5hbWUobWF0Y2hQYXR0ZXJuLCBob3N0bmFtZSkge1xuICBpZiAoaG9zdG5hbWUuaW5jbHVkZXMoXCI6XCIpKVxuICAgIHRocm93IG5ldyBJbnZhbGlkTWF0Y2hQYXR0ZXJuKG1hdGNoUGF0dGVybiwgYEhvc3RuYW1lIGNhbm5vdCBpbmNsdWRlIGEgcG9ydGApO1xuICBpZiAoaG9zdG5hbWUuaW5jbHVkZXMoXCIqXCIpICYmIGhvc3RuYW1lLmxlbmd0aCA+IDEgJiYgIWhvc3RuYW1lLnN0YXJ0c1dpdGgoXCIqLlwiKSlcbiAgICB0aHJvdyBuZXcgSW52YWxpZE1hdGNoUGF0dGVybihcbiAgICAgIG1hdGNoUGF0dGVybixcbiAgICAgIGBJZiB1c2luZyBhIHdpbGRjYXJkICgqKSwgaXQgbXVzdCBnbyBhdCB0aGUgc3RhcnQgb2YgdGhlIGhvc3RuYW1lYFxuICAgICk7XG59XG5mdW5jdGlvbiB2YWxpZGF0ZVBhdGhuYW1lKG1hdGNoUGF0dGVybiwgcGF0aG5hbWUpIHtcbiAgcmV0dXJuO1xufVxuZXhwb3J0IHtcbiAgSW52YWxpZE1hdGNoUGF0dGVybixcbiAgTWF0Y2hQYXR0ZXJuXG59O1xuIl0sIm5hbWVzIjpbImJyb3dzZXIiLCJfYnJvd3NlciIsIl9hIiwicmVzdWx0IiwiX2IiXSwibWFwcGluZ3MiOiI7OztBQUFPLFdBQVMsaUJBQWlCLEtBQUs7QUFDcEMsUUFBSSxPQUFPLFFBQVEsT0FBTyxRQUFRLFdBQVksUUFBTyxFQUFFLE1BQU0sSUFBSztBQUNsRSxXQUFPO0FBQUEsRUFDVDtBQ0ZPLFFBQU1BLGNBQVUsc0JBQVcsWUFBWCxtQkFBb0IsWUFBcEIsbUJBQTZCLE1BQ2hELFdBQVcsVUFDWCxXQUFXO0FDRlIsUUFBTSxVQUFVQztBQ3NCdkIsUUFBQSxlQUFBO0FBQUE7QUFBQSxJQUFnQztBQUFBLE1BRTlCLElBQUE7QUFBQSxNQUNNLE1BQUE7QUFBQSxNQUNFLGFBQUE7QUFBQSxNQUNPLFNBQUE7QUFBQSxNQUNKLFNBQUEsT0FBQSxRQUFBO0FBRVAsY0FBQSxRQUFBLEtBQUEsT0FBQSxFQUFBLEtBQUEsT0FBQSxnQkFBQTtBQUNBLGVBQUE7QUFBQSxNQUFPO0FBQUE7QUFBQSxJQUNUO0FBQUEsSUFFRjtBQUFBLE1BQ0EsSUFBQTtBQUFBLE1BQ00sTUFBQTtBQUFBLE1BQ0UsYUFBQTtBQUFBLE1BQ08sU0FBQTtBQUFBO0FBQUEsTUFDSixTQUFBLE9BQUEsUUFBQTtBQUdQLFlBQUEsMkJBQUEsSUFBQTtBQUNFLGdCQUFBLFFBQUEsS0FBQSxPQUFBLElBQUEsRUFBQTtBQUNBLGlCQUFBO0FB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
