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
      if (commandName === "toggle_webprompt") {
        console.log("shortcut pressed");
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYmFja2dyb3VuZC5qcyIsInNvdXJjZXMiOlsiLi4vLi4vbm9kZV9tb2R1bGVzLy5wbnBtL3d4dEAwLjIwLjNfQHR5cGVzK25vZGVAMjIuMTQuMV9qaXRpQDIuNC4yX2xpZ2h0bmluZ2Nzc0AxLjI5LjJfcm9sbHVwQDQuNDAuMC9ub2RlX21vZHVsZXMvd3h0L2Rpc3QvdXRpbHMvZGVmaW5lLWJhY2tncm91bmQubWpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzLy5wbnBtL0B3eHQtZGV2K2Jyb3dzZXJAMC4wLjMxNS9ub2RlX21vZHVsZXMvQHd4dC1kZXYvYnJvd3Nlci9zcmMvaW5kZXgubWpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzLy5wbnBtL3d4dEAwLjIwLjNfQHR5cGVzK25vZGVAMjIuMTQuMV9qaXRpQDIuNC4yX2xpZ2h0bmluZ2Nzc0AxLjI5LjJfcm9sbHVwQDQuNDAuMC9ub2RlX21vZHVsZXMvd3h0L2Rpc3QvYnJvd3Nlci5tanMiLCIuLi8uLi9saWIvY29tbWFuZHMudHMiLCIuLi8uLi9lbnRyeXBvaW50cy9iYWNrZ3JvdW5kLnRzIiwiLi4vLi4vbm9kZV9tb2R1bGVzLy5wbnBtL0B3ZWJleHQtY29yZSttYXRjaC1wYXR0ZXJuc0AxLjAuMy9ub2RlX21vZHVsZXMvQHdlYmV4dC1jb3JlL21hdGNoLXBhdHRlcm5zL2xpYi9pbmRleC5qcyJdLCJzb3VyY2VzQ29udGVudCI6WyJleHBvcnQgZnVuY3Rpb24gZGVmaW5lQmFja2dyb3VuZChhcmcpIHtcbiAgaWYgKGFyZyA9PSBudWxsIHx8IHR5cGVvZiBhcmcgPT09IFwiZnVuY3Rpb25cIikgcmV0dXJuIHsgbWFpbjogYXJnIH07XG4gIHJldHVybiBhcmc7XG59XG4iLCIvLyAjcmVnaW9uIHNuaXBwZXRcbmV4cG9ydCBjb25zdCBicm93c2VyID0gZ2xvYmFsVGhpcy5icm93c2VyPy5ydW50aW1lPy5pZFxuICA/IGdsb2JhbFRoaXMuYnJvd3NlclxuICA6IGdsb2JhbFRoaXMuY2hyb21lO1xuLy8gI2VuZHJlZ2lvbiBzbmlwcGV0XG4iLCJpbXBvcnQgeyBicm93c2VyIGFzIF9icm93c2VyIH0gZnJvbSBcIkB3eHQtZGV2L2Jyb3dzZXJcIjtcbmV4cG9ydCBjb25zdCBicm93c2VyID0gX2Jyb3dzZXI7XG5leHBvcnQge307XG4iLCIvLyBVbmNvbW1lbnQgaWYgJ2Jyb3dzZXInIGlzIG5vdCByZWNvZ25pemVkIGdsb2JhbGx5IGJ5IFRTIGRlc3BpdGUgV1hUIHNldHVwXG4vLyBpbXBvcnQgeyBicm93c2VyIH0gZnJvbSAnd3h0L2Jyb3dzZXInO1xuXG5pbXBvcnQgdHlwZSB7IEJyb3dzZXIgfSBmcm9tIFwid3h0L2Jyb3dzZXJcIjtcbmltcG9ydCB0eXBlIHsgQ29udGVudFNjcmlwdENvbnRleHQgfSBmcm9tIFwiI2ltcG9ydHNcIjsgLy8gSWYgbmVlZGVkIGZvciBjb250ZW50IGNvbW1hbmRzXG5cbi8qKlxuICogRGVmaW5lcyB0aGUgZXhlY3V0aW9uIGNvbnRleHQgZm9yIGEgY29tbWFuZC5cbiAqIC0gJ2JhY2tncm91bmQnOiBFeGVjdXRlcyBpbiB0aGUgYmFja2dyb3VuZCBzY3JpcHQgKFNlcnZpY2UgV29ya2VyKS4gSGFzIGZ1bGwgZXh0ZW5zaW9uIEFQSSBhY2Nlc3MsIG5vIGRpcmVjdCBET00gYWNjZXNzLlxuICogLSAnY29udGVudCc6IEV4ZWN1dGVzIGluIHRoZSBjb250ZW50IHNjcmlwdCBvZiB0aGUgYWN0aXZlIHRhYi4gSGFzIERPTSBhY2Nlc3MsIGxpbWl0ZWQgZXh0ZW5zaW9uIEFQSSBhY2Nlc3MuXG4gKi9cbmV4cG9ydCB0eXBlIENvbW1hbmRFeGVjdXRpb25Db250ZXh0ID0gXCJiYWNrZ3JvdW5kXCIgfCBcImNvbnRlbnRcIjtcblxuZXhwb3J0IGludGVyZmFjZSBDb21tYW5kIHtcbiAgaWQ6IHN0cmluZzsgLy8gVW5pcXVlIGlkZW50aWZpZXJcbiAgbmFtZTogc3RyaW5nOyAvLyBVc2VyLWZhY2luZyBuYW1lXG4gIGRlc2NyaXB0aW9uOiBzdHJpbmc7XG4gIGNvbnRleHQ6IENvbW1hbmRFeGVjdXRpb25Db250ZXh0OyAvLyBXaGVyZSB0aGUgY29yZSBsb2dpYyBydW5zXG4gIC8vIFRoZSBhY3R1YWwgZnVuY3Rpb24gdG8gZXhlY3V0ZS4gQXJndW1lbnRzIGFyZSBwYXNzZWQgZnJvbSB0aGUgVUkvaW5wdXQuXG4gIC8vIENvbnRleHQtc3BlY2lmaWMgYXJndW1lbnRzIChsaWtlIHRoZSBUYWIgZm9yIGJhY2tncm91bmQgb3IgbWF5YmUgY3R4IGZvciBjb250ZW50KSBhcmUgYWRkZWQgYnkgdGhlIG9yY2hlc3RyYXRvci5cbiAgZXhlY3V0ZTogKC4uLmFyZ3M6IGFueVtdKSA9PiBQcm9taXNlPGFueT4gfCBhbnk7XG4gIC8vIE9wdGlvbmFsOiBEZWZpbmUgZXhwZWN0ZWQgYXJndW1lbnRzIGZvciBoZWxwL3ZhbGlkYXRpb24gbGF0ZXJcbiAgLy8gYXJncz86IHsgbmFtZTogc3RyaW5nOyBkZXNjcmlwdGlvbj86IHN0cmluZzsgdHlwZTogc3RyaW5nIH1bXTtcbn1cblxuLy8gLS0tIERlZmluZSBDb21tYW5kcyAtLS1cblxuY29uc3QgY29tbWFuZHNMaXN0OiBDb21tYW5kW10gPSBbXG4gIC8vIC0tLSBCYWNrZ3JvdW5kIENvbW1hbmRzIC0tLVxuICB7XG4gICAgaWQ6IFwibmV3LXRhYlwiLFxuICAgIG5hbWU6IFwiTmV3IFRhYlwiLFxuICAgIGRlc2NyaXB0aW9uOiBcIk9wZW4gYSBuZXcgYnJvd3NlciB0YWJcIixcbiAgICBjb250ZXh0OiBcImJhY2tncm91bmRcIixcbiAgICBleGVjdXRlOiBhc3luYyAodXJsPzogc3RyaW5nKSA9PiB7XG4gICAgICBhd2FpdCBicm93c2VyLnRhYnMuY3JlYXRlKHsgdXJsOiB1cmwgfHwgXCJhYm91dDpuZXd0YWJcIiB9KTtcbiAgICAgIHJldHVybiBcIk5ldyB0YWIgb3BlbmVkLlwiOyAvLyBPcHRpb25hbCBzdWNjZXNzIG1lc3NhZ2VcbiAgICB9LFxuICAgIC8vIGFyZ3M6IFt7IG5hbWU6ICd1cmwnLCB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICcoT3B0aW9uYWwpIFVSTCB0byBvcGVuJyB9XVxuICB9LFxuICB7XG4gICAgaWQ6IFwiY2xvc2UtdGFiXCIsXG4gICAgbmFtZTogXCJDbG9zZSBUYWJcIixcbiAgICBkZXNjcmlwdGlvbjogXCJDbG9zZSB0aGUgY3VycmVudCB0YWJcIixcbiAgICBjb250ZXh0OiBcImJhY2tncm91bmRcIixcbiAgICAvLyBOb3RlOiBCYWNrZ3JvdW5kIGV4ZWN1dG9yIG5lZWRzIHRvIHBhc3MgdGhlICd0YWInIG9iamVjdCBmcm9tIHRoZSBzZW5kZXJcbiAgICBleGVjdXRlOiBhc3luYyAodGFiPzogQnJvd3Nlci5UYWJzLlRhYikgPT4ge1xuICAgICAgaWYgKHRhYj8uaWQpIHtcbiAgICAgICAgYXdhaXQgYnJvd3Nlci50YWJzLnJlbW92ZSh0YWIuaWQpO1xuICAgICAgICByZXR1cm4gXCJUYWIgY2xvc2VkLlwiO1xuICAgICAgfVxuICAgICAgdGhyb3cgbmV3IEVycm9yKFwiQ291bGQgbm90IGRldGVybWluZSB0aGUgYWN0aXZlIHRhYiB0byBjbG9zZS5cIik7XG4gICAgfSxcbiAgfSxcbiAge1xuICAgIGlkOiBcInJlbG9hZC10YWJcIixcbiAgICBuYW1lOiBcIlJlbG9hZCBUYWJcIixcbiAgICBkZXNjcmlwdGlvbjogXCJSZWxvYWQgdGhlIGN1cnJlbnQgdGFiXCIsXG4gICAgY29udGV4dDogXCJiYWNrZ3JvdW5kXCIsXG4gICAgZXhlY3V0ZTogYXN5bmMgKHRhYj86IGJyb3dzZXIudGFicy5UYWIpID0+IHtcbiAgICAgIGlmICh0YWI/LmlkKSB7XG4gICAgICAgIGF3YWl0IGJyb3dzZXIudGFicy5yZWxvYWQodGFiLmlkKTtcbiAgICAgICAgcmV0dXJuIFwiVGFiIHJlbG9hZGVkLlwiO1xuICAgICAgfVxuICAgICAgdGhyb3cgbmV3IEVycm9yKFwiQ291bGQgbm90IGRldGVybWluZSB0aGUgYWN0aXZlIHRhYiB0byByZWxvYWQuXCIpO1xuICAgIH0sXG4gIH0sXG4gIHtcbiAgICBpZDogXCJsaXN0LWJvb2ttYXJrc1wiLCAvLyBFeGFtcGxlIC0gSW1wbGVtZW50IGFjdHVhbCBsb2dpYyBsYXRlclxuICAgIG5hbWU6IFwiTGlzdCBCb29rbWFya3NcIixcbiAgICBkZXNjcmlwdGlvbjogXCJTZWFyY2ggYW5kIGxpc3QgYm9va21hcmtzXCIsXG4gICAgY29udGV4dDogXCJiYWNrZ3JvdW5kXCIsXG4gICAgZXhlY3V0ZTogYXN5bmMgKHF1ZXJ5Pzogc3RyaW5nKSA9PiB7XG4gICAgICBjb25zb2xlLmxvZyhcIkxpc3RpbmcgYm9va21hcmtzIChpbXBsZW1lbnRhdGlvbiBuZWVkZWQpLi4uIFF1ZXJ5OlwiLCBxdWVyeSk7XG4gICAgICAvLyBQbGFjZWhvbGRlcjogUmVwbGFjZSB3aXRoIGFjdHVhbCBicm93c2VyLmJvb2ttYXJrcy5zZWFyY2goLi4uKVxuICAgICAgYXdhaXQgbmV3IFByb21pc2UoKHJlcykgPT4gc2V0VGltZW91dChyZXMsIDUwKSk7IC8vIFNpbXVsYXRlIGFzeW5jIHdvcmtcbiAgICAgIHJldHVybiBcIkJvb2ttYXJrIGxpc3Rpbmcgbm90IHlldCBpbXBsZW1lbnRlZC5cIjtcbiAgICB9LFxuICB9LFxuXG4gIC8vIC0tLSBDb250ZW50IFNjcmlwdCBDb21tYW5kcyAtLS1cbiAge1xuICAgIGlkOiBcImdvLWJhY2tcIixcbiAgICBuYW1lOiBcIkdvIEJhY2tcIixcbiAgICBkZXNjcmlwdGlvbjogXCJOYXZpZ2F0ZSBiYWNrIGluIGhpc3RvcnlcIixcbiAgICBjb250ZXh0OiBcImNvbnRlbnRcIixcbiAgICBleGVjdXRlOiAoKSA9PiB7XG4gICAgICB3aW5kb3cuaGlzdG9yeS5iYWNrKCk7XG4gICAgICByZXR1cm4gXCJOYXZpZ2F0ZWQgYmFjay5cIjsgLy8gQ29udGVudCBzY3JpcHRzIGNhbiByZXR1cm4gcmVzdWx0cyB0b29cbiAgICB9LFxuICB9LFxuICB7XG4gICAgaWQ6IFwiZ28tZm9yd2FyZFwiLFxuICAgIG5hbWU6IFwiR28gRm9yd2FyZFwiLFxuICAgIGRlc2NyaXB0aW9uOiBcIk5hdmlnYXRlIGZvcndhcmQgaW4gaGlzdG9yeVwiLFxuICAgIGNvbnRleHQ6IFwiY29udGVudFwiLFxuICAgIGV4ZWN1dGU6ICgpID0+IHtcbiAgICAgIHdpbmRvdy5oaXN0b3J5LmZvcndhcmQoKTtcbiAgICAgIHJldHVybiBcIk5hdmlnYXRlZCBmb3J3YXJkLlwiO1xuICAgIH0sXG4gIH0sXG4gIHtcbiAgICBpZDogXCJjb3B5LXRpdGxlXCIsXG4gICAgbmFtZTogXCJDb3B5IFBhZ2UgVGl0bGVcIixcbiAgICBkZXNjcmlwdGlvbjogXCJDb3B5IHRoZSBjdXJyZW50IHBhZ2UgdGl0bGUgdG8gY2xpcGJvYXJkXCIsXG4gICAgY29udGV4dDogXCJjb250ZW50XCIsXG4gICAgZXhlY3V0ZTogYXN5bmMgKCkgPT4ge1xuICAgICAgY29uc3QgdGl0bGUgPSBkb2N1bWVudC50aXRsZTtcbiAgICAgIGF3YWl0IG5hdmlnYXRvci5jbGlwYm9hcmQud3JpdGVUZXh0KHRpdGxlKTtcbiAgICAgIHJldHVybiBgQ29waWVkIHRpdGxlOiBcIiR7dGl0bGV9XCJgO1xuICAgIH0sXG4gIH0sXG4gIHtcbiAgICBpZDogXCJkb3dubG9hZC1tYXJrZG93blwiLFxuICAgIG5hbWU6IFwiRG93bmxvYWQgYXMgTWFya2Rvd25cIixcbiAgICBkZXNjcmlwdGlvbjogXCJDb252ZXJ0IHBhZ2UgY29udGVudCB0byBNYXJrZG93biBhbmQgZG93bmxvYWRcIixcbiAgICBjb250ZXh0OiBcImNvbnRlbnRcIixcbiAgICBleGVjdXRlOiBhc3luYyAoKSA9PiB7XG4gICAgICBjb25zb2xlLmxvZyhcIkRvd25sb2FkaW5nIGFzIG1hcmtkb3duIChpbXBsZW1lbnRhdGlvbiBuZWVkZWQpLi4uXCIpO1xuICAgICAgLy8gUGxhY2Vob2xkZXI6IEFkZCBIVE1MLXRvLU1hcmtkb3duIGNvbnZlcnNpb24gbG9naWMgaGVyZVxuICAgICAgYXdhaXQgbmV3IFByb21pc2UoKHJlcykgPT4gc2V0VGltZW91dChyZXMsIDUwKSk7XG4gICAgICByZXR1cm4gXCJNYXJrZG93biBkb3dubG9hZCBub3QgeWV0IGltcGxlbWVudGVkLlwiO1xuICAgIH0sXG4gIH0sXG4gIC8vIEFkZCBtb3JlIGNvbW1hbmRzLi4uXG5dO1xuXG4vLyAtLS0gUmVnaXN0cnkgTG9naWMgLS0tXG5cbmNvbnN0IGNvbW1hbmRzQnlJZCA9IG5ldyBNYXA8c3RyaW5nLCBDb21tYW5kPihcbiAgY29tbWFuZHNMaXN0Lm1hcCgoY21kKSA9PiBbY21kLmlkLCBjbWRdKSxcbik7XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRBbGxDb21tYW5kcygpOiBDb21tYW5kW10ge1xuICAvLyBSZXR1cm4gYSBjb3B5IHRvIHByZXZlbnQgbXV0YXRpb25cbiAgcmV0dXJuIFsuLi5jb21tYW5kc0xpc3RdO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZ2V0Q29tbWFuZEJ5SWQoaWQ6IHN0cmluZyk6IENvbW1hbmQgfCB1bmRlZmluZWQge1xuICByZXR1cm4gY29tbWFuZHNCeUlkLmdldChpZCk7XG59XG5cbi8vIFlvdSBtaWdodCBhZGQgc2VhcmNoL2ZpbHRlciBmdW5jdGlvbnMgaGVyZSBsYXRlciBpZiBuZWVkZWRcbmV4cG9ydCBmdW5jdGlvbiBzZWFyY2hDb21tYW5kcyhxdWVyeTogc3RyaW5nKTogQ29tbWFuZFtdIHtcbiAgY29uc3QgbG93ZXJDYXNlUXVlcnkgPSBxdWVyeS50b0xvd2VyQ2FzZSgpLnRyaW0oKTtcbiAgaWYgKCFsb3dlckNhc2VRdWVyeSkgcmV0dXJuIGdldEFsbENvbW1hbmRzKCk7XG4gIHJldHVybiBjb21tYW5kc0xpc3QuZmlsdGVyKFxuICAgIChjbWQpID0+XG4gICAgICBjbWQubmFtZS50b0xvd2VyQ2FzZSgpLmluY2x1ZGVzKGxvd2VyQ2FzZVF1ZXJ5KSB8fFxuICAgICAgY21kLmRlc2NyaXB0aW9uLnRvTG93ZXJDYXNlKCkuaW5jbHVkZXMobG93ZXJDYXNlUXVlcnkpIHx8XG4gICAgICBjbWQuaWQudG9Mb3dlckNhc2UoKS5pbmNsdWRlcyhsb3dlckNhc2VRdWVyeSksXG4gICk7XG59XG4iLCJpbXBvcnQgeyBnZXRDb21tYW5kQnlJZCB9IGZyb20gXCJAL2xpYi9jb21tYW5kc1wiOyAvLyBJbXBvcnQgZnJvbSByZWdpc3RyeVxuXG5jb25zb2xlLmxvZyhcIkJhY2tncm91bmQgc2NyaXB0IGxvYWRlZC5cIik7XG5cbmV4cG9ydCBkZWZhdWx0IGRlZmluZUJhY2tncm91bmQoKCkgPT4ge1xuICAvLyBDb21tYW5kIGxpc3RlbmVyIChmb3Iga2V5Ym9hcmQgc2hvcnRjdXQpIHJlbWFpbnMgdGhlIHNhbWVcbiAgYnJvd3Nlci5jb21tYW5kcy5vbkNvbW1hbmQuYWRkTGlzdGVuZXIoYXN5bmMgKGNvbW1hbmROYW1lKSA9PiB7XG4gICAgY29uc29sZS5sb2coYENvbW1hbmQgcmVjZWl2ZWQ6ICR7Y29tbWFuZE5hbWV9YCk7XG4gICAgaWYgKGNvbW1hbmROYW1lID09PSBcInRvZ2dsZV93ZWJwcm9tcHRcIikge1xuICAgICAgY29uc29sZS5sb2coXCJzaG9ydGN1dCBwcmVzc2VkXCIpO1xuICAgICAgY29uc3QgW2N1cnJlbnRUYWJdID0gYXdhaXQgYnJvd3Nlci50YWJzLnF1ZXJ5KHtcbiAgICAgICAgYWN0aXZlOiB0cnVlLFxuICAgICAgICBjdXJyZW50V2luZG93OiB0cnVlLFxuICAgICAgfSk7XG5cbiAgICAgIGlmIChjdXJyZW50VGFiPy5pZCkge1xuICAgICAgICBjb25zb2xlLmxvZyhgU2VuZGluZyB0b2dnbGUtdWkgbWVzc2FnZSB0byB0YWIgJHtjdXJyZW50VGFiLmlkfWApO1xuICAgICAgICB0cnkge1xuICAgICAgICAgIGF3YWl0IGJyb3dzZXIudGFicy5zZW5kTWVzc2FnZShjdXJyZW50VGFiLmlkLCB7XG4gICAgICAgICAgICBhY3Rpb246IFwidG9nZ2xlLXVpXCIsXG4gICAgICAgICAgfSk7XG4gICAgICAgICAgY29uc29sZS5sb2coYE1lc3NhZ2Ugc2VudCBzdWNjZXNzZnVsbHkgdG8gdGFiICR7Y3VycmVudFRhYi5pZH1gKTtcbiAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICBjb25zb2xlLmVycm9yKFxuICAgICAgICAgICAgYEVycm9yIHNlbmRpbmcgbWVzc2FnZSB0byB0YWIgJHtjdXJyZW50VGFiLmlkfTpgLFxuICAgICAgICAgICAgZXJyb3IsXG4gICAgICAgICAgKTtcbiAgICAgICAgICAvLyBUT0RPOiBDb25zaWRlciBpbmplY3RpbmcgY29udGVudCBzY3JpcHQgaWYgaXQgZG9lc24ndCBleGlzdFxuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjb25zb2xlLmxvZyhcIk5vIGFjdGl2ZSB0YWIgZm91bmQgb3IgdGFiIGhhcyBubyBJRC5cIik7XG4gICAgICB9XG4gICAgfVxuICB9KTtcblxuICAvLyAtLS0gQ29tbWFuZCBPcmNoZXN0cmF0aW9uIC0tLVxuICBicm93c2VyLnJ1bnRpbWUub25NZXNzYWdlLmFkZExpc3RlbmVyKChtZXNzYWdlLCBzZW5kZXIsIHNlbmRSZXNwb25zZSkgPT4ge1xuICAgIGNvbnNvbGUubG9nKFxuICAgICAgXCJNZXNzYWdlIHJlY2VpdmVkIGluIGJhY2tncm91bmQ6XCIsXG4gICAgICBtZXNzYWdlLFxuICAgICAgXCJmcm9tIHRhYjpcIixcbiAgICAgIHNlbmRlci50YWI/LmlkLFxuICAgICk7XG5cbiAgICBpZiAobWVzc2FnZS5hY3Rpb24gPT09IFwiZXhlY3V0ZS1jb21tYW5kXCIpIHtcbiAgICAgIGNvbnN0IHsgY29tbWFuZElkLCBhcmdzIH0gPSBtZXNzYWdlLnBheWxvYWQ7XG4gICAgICBjb25zdCBjb21tYW5kID0gZ2V0Q29tbWFuZEJ5SWQoY29tbWFuZElkKTtcblxuICAgICAgaWYgKCFjb21tYW5kKSB7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoYENvbW1hbmQgbm90IGZvdW5kOiAke2NvbW1hbmRJZH1gKTtcbiAgICAgICAgc2VuZFJlc3BvbnNlKHtcbiAgICAgICAgICBzdWNjZXNzOiBmYWxzZSxcbiAgICAgICAgICBlcnJvcjogYENvbW1hbmQgbm90IGZvdW5kOiAke2NvbW1hbmRJZH1gLFxuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIGZhbHNlOyAvLyBTeW5jaHJvbm91cyByZXNwb25zZVxuICAgICAgfVxuXG4gICAgICBjb25zb2xlLmxvZyhcbiAgICAgICAgYE9yY2hlc3RyYXRpbmcgY29tbWFuZDogJHtjb21tYW5kLm5hbWV9IChjb250ZXh0OiAke2NvbW1hbmQuY29udGV4dH0pYCxcbiAgICAgICk7XG5cbiAgICAgIGlmIChjb21tYW5kLmNvbnRleHQgPT09IFwiYmFja2dyb3VuZFwiKSB7XG4gICAgICAgIC8vIEV4ZWN1dGUgZGlyZWN0bHkgaW4gYmFja2dyb3VuZFxuICAgICAgICBQcm9taXNlLnJlc29sdmUoKSAvLyBFbnN1cmUgYXN5bmMgaGFuZGxpbmdcbiAgICAgICAgICAudGhlbigoKSA9PiBjb21tYW5kLmV4ZWN1dGUoc2VuZGVyLnRhYiwgLi4uKGFyZ3MgfHwgW10pKSkgLy8gUGFzcyB0YWIgY29udGV4dFxuICAgICAgICAgIC50aGVuKChyZXN1bHQpID0+IHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFxuICAgICAgICAgICAgICBgQmFja2dyb3VuZCBjb21tYW5kICcke2NvbW1hbmQubmFtZX0nIGV4ZWN1dGVkIHN1Y2Nlc3NmdWxseS5gLFxuICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIHNlbmRSZXNwb25zZSh7IHN1Y2Nlc3M6IHRydWUsIHJlc3VsdCB9KTtcbiAgICAgICAgICB9KVxuICAgICAgICAgIC5jYXRjaCgoZXJyb3IpID0+IHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoXG4gICAgICAgICAgICAgIGBFcnJvciBleGVjdXRpbmcgYmFja2dyb3VuZCBjb21tYW5kICcke2NvbW1hbmQubmFtZX0nOmAsXG4gICAgICAgICAgICAgIGVycm9yLFxuICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIHNlbmRSZXNwb25zZSh7XG4gICAgICAgICAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxuICAgICAgICAgICAgICBlcnJvcjogZXJyb3I/Lm1lc3NhZ2UgfHwgU3RyaW5nKGVycm9yKSxcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gdHJ1ZTsgLy8gSW5kaWNhdGVzIGFzeW5jIHJlc3BvbnNlXG4gICAgICB9IGVsc2UgaWYgKGNvbW1hbmQuY29udGV4dCA9PT0gXCJjb250ZW50XCIpIHtcbiAgICAgICAgLy8gRm9yd2FyZCB0byB0aGUgY29udGVudCBzY3JpcHQgdGhhdCBzZW50IHRoZSBtZXNzYWdlXG4gICAgICAgIGlmICghc2VuZGVyLnRhYj8uaWQpIHtcbiAgICAgICAgICBjb25zb2xlLmVycm9yKFxuICAgICAgICAgICAgXCJDYW5ub3QgZXhlY3V0ZSBjb250ZW50IHNjcmlwdCBjb21tYW5kOiBzZW5kZXIgdGFiIElEIGlzIG1pc3NpbmcuXCIsXG4gICAgICAgICAgKTtcbiAgICAgICAgICBzZW5kUmVzcG9uc2UoeyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IFwiTWlzc2luZyBzZW5kZXIgdGFiIElELlwiIH0pO1xuICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICBjb25zb2xlLmxvZyhcbiAgICAgICAgICBgRm9yd2FyZGluZyBjb21tYW5kICcke2NvbW1hbmQubmFtZX0nIHRvIGNvbnRlbnQgc2NyaXB0IGluIHRhYiAke3NlbmRlci50YWIuaWR9YCxcbiAgICAgICAgKTtcbiAgICAgICAgYnJvd3Nlci50YWJzXG4gICAgICAgICAgLnNlbmRNZXNzYWdlKHNlbmRlci50YWIuaWQsIHtcbiAgICAgICAgICAgIGFjdGlvbjogXCJydW4tY29udGVudC1jb21tYW5kXCIsXG4gICAgICAgICAgICBwYXlsb2FkOiB7IGNvbW1hbmRJZCwgYXJnczogYXJncyB8fCBbXSB9LFxuICAgICAgICAgIH0pXG4gICAgICAgICAgLnRoZW4oKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcbiAgICAgICAgICAgICAgYFJlc3BvbnNlIGZyb20gY29udGVudCBzY3JpcHQgZm9yICcke2NvbW1hbmQubmFtZX0nOmAsXG4gICAgICAgICAgICAgIHJlc3BvbnNlLFxuICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIC8vIEZvcndhcmQgdGhlIGNvbnRlbnQgc2NyaXB0J3MgcmVzcG9uc2UgYmFjayB0byB0aGUgb3JpZ2luYWwgVUkgY2FsbGVyXG4gICAgICAgICAgICBzZW5kUmVzcG9uc2UocmVzcG9uc2UpO1xuICAgICAgICAgIH0pXG4gICAgICAgICAgLmNhdGNoKChlcnJvcikgPT4ge1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcihcbiAgICAgICAgICAgICAgYEVycm9yIGZvcndhcmRpbmcvcmVjZWl2aW5nIGZyb20gY29udGVudCBzY3JpcHQgZm9yICcke2NvbW1hbmQubmFtZX0nOmAsXG4gICAgICAgICAgICAgIGVycm9yLFxuICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIHNlbmRSZXNwb25zZSh7XG4gICAgICAgICAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxuICAgICAgICAgICAgICBlcnJvcjpcbiAgICAgICAgICAgICAgICBlcnJvcj8ubWVzc2FnZSB8fCBgRXJyb3IgY29tbXVuaWNhdGluZyB3aXRoIGNvbnRlbnQgc2NyaXB0LmAsXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIHRydWU7IC8vIEluZGljYXRlcyBhc3luYyByZXNwb25zZVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY29uc29sZS5lcnJvcihgVW5zdXBwb3J0ZWQgY29tbWFuZCBjb250ZXh0OiAke2NvbW1hbmQuY29udGV4dH1gKTtcbiAgICAgICAgc2VuZFJlc3BvbnNlKHtcbiAgICAgICAgICBzdWNjZXNzOiBmYWxzZSxcbiAgICAgICAgICBlcnJvcjogYFVuc3VwcG9ydGVkIGNvbW1hbmQgY29udGV4dDogJHtjb21tYW5kLmNvbnRleHR9YCxcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICB9XG4gICAgLy8gSGFuZGxlIG90aGVyIG1lc3NhZ2UgdHlwZXMgaWYgbmVlZGVkXG4gICAgcmV0dXJuIGZhbHNlOyAvLyBJbmRpY2F0ZSBzeW5jaHJvbm91cyBoYW5kbGluZyBpZiBubyByZXNwb25zZSBuZWVkZWQgb3IgaGFuZGxlZCBhYm92ZVxuICB9KTtcbn0pO1xuXG5jb25zb2xlLmxvZyhcIkJhY2tncm91bmQgc2NyaXB0IHNldHVwIGNvbXBsZXRlLlwiKTtcbiIsIi8vIHNyYy9pbmRleC50c1xudmFyIF9NYXRjaFBhdHRlcm4gPSBjbGFzcyB7XG4gIGNvbnN0cnVjdG9yKG1hdGNoUGF0dGVybikge1xuICAgIGlmIChtYXRjaFBhdHRlcm4gPT09IFwiPGFsbF91cmxzPlwiKSB7XG4gICAgICB0aGlzLmlzQWxsVXJscyA9IHRydWU7XG4gICAgICB0aGlzLnByb3RvY29sTWF0Y2hlcyA9IFsuLi5fTWF0Y2hQYXR0ZXJuLlBST1RPQ09MU107XG4gICAgICB0aGlzLmhvc3RuYW1lTWF0Y2ggPSBcIipcIjtcbiAgICAgIHRoaXMucGF0aG5hbWVNYXRjaCA9IFwiKlwiO1xuICAgIH0gZWxzZSB7XG4gICAgICBjb25zdCBncm91cHMgPSAvKC4qKTpcXC9cXC8oLio/KShcXC8uKikvLmV4ZWMobWF0Y2hQYXR0ZXJuKTtcbiAgICAgIGlmIChncm91cHMgPT0gbnVsbClcbiAgICAgICAgdGhyb3cgbmV3IEludmFsaWRNYXRjaFBhdHRlcm4obWF0Y2hQYXR0ZXJuLCBcIkluY29ycmVjdCBmb3JtYXRcIik7XG4gICAgICBjb25zdCBbXywgcHJvdG9jb2wsIGhvc3RuYW1lLCBwYXRobmFtZV0gPSBncm91cHM7XG4gICAgICB2YWxpZGF0ZVByb3RvY29sKG1hdGNoUGF0dGVybiwgcHJvdG9jb2wpO1xuICAgICAgdmFsaWRhdGVIb3N0bmFtZShtYXRjaFBhdHRlcm4sIGhvc3RuYW1lKTtcbiAgICAgIHZhbGlkYXRlUGF0aG5hbWUobWF0Y2hQYXR0ZXJuLCBwYXRobmFtZSk7XG4gICAgICB0aGlzLnByb3RvY29sTWF0Y2hlcyA9IHByb3RvY29sID09PSBcIipcIiA/IFtcImh0dHBcIiwgXCJodHRwc1wiXSA6IFtwcm90b2NvbF07XG4gICAgICB0aGlzLmhvc3RuYW1lTWF0Y2ggPSBob3N0bmFtZTtcbiAgICAgIHRoaXMucGF0aG5hbWVNYXRjaCA9IHBhdGhuYW1lO1xuICAgIH1cbiAgfVxuICBpbmNsdWRlcyh1cmwpIHtcbiAgICBpZiAodGhpcy5pc0FsbFVybHMpXG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICBjb25zdCB1ID0gdHlwZW9mIHVybCA9PT0gXCJzdHJpbmdcIiA/IG5ldyBVUkwodXJsKSA6IHVybCBpbnN0YW5jZW9mIExvY2F0aW9uID8gbmV3IFVSTCh1cmwuaHJlZikgOiB1cmw7XG4gICAgcmV0dXJuICEhdGhpcy5wcm90b2NvbE1hdGNoZXMuZmluZCgocHJvdG9jb2wpID0+IHtcbiAgICAgIGlmIChwcm90b2NvbCA9PT0gXCJodHRwXCIpXG4gICAgICAgIHJldHVybiB0aGlzLmlzSHR0cE1hdGNoKHUpO1xuICAgICAgaWYgKHByb3RvY29sID09PSBcImh0dHBzXCIpXG4gICAgICAgIHJldHVybiB0aGlzLmlzSHR0cHNNYXRjaCh1KTtcbiAgICAgIGlmIChwcm90b2NvbCA9PT0gXCJmaWxlXCIpXG4gICAgICAgIHJldHVybiB0aGlzLmlzRmlsZU1hdGNoKHUpO1xuICAgICAgaWYgKHByb3RvY29sID09PSBcImZ0cFwiKVxuICAgICAgICByZXR1cm4gdGhpcy5pc0Z0cE1hdGNoKHUpO1xuICAgICAgaWYgKHByb3RvY29sID09PSBcInVyblwiKVxuICAgICAgICByZXR1cm4gdGhpcy5pc1Vybk1hdGNoKHUpO1xuICAgIH0pO1xuICB9XG4gIGlzSHR0cE1hdGNoKHVybCkge1xuICAgIHJldHVybiB1cmwucHJvdG9jb2wgPT09IFwiaHR0cDpcIiAmJiB0aGlzLmlzSG9zdFBhdGhNYXRjaCh1cmwpO1xuICB9XG4gIGlzSHR0cHNNYXRjaCh1cmwpIHtcbiAgICByZXR1cm4gdXJsLnByb3RvY29sID09PSBcImh0dHBzOlwiICYmIHRoaXMuaXNIb3N0UGF0aE1hdGNoKHVybCk7XG4gIH1cbiAgaXNIb3N0UGF0aE1hdGNoKHVybCkge1xuICAgIGlmICghdGhpcy5ob3N0bmFtZU1hdGNoIHx8ICF0aGlzLnBhdGhuYW1lTWF0Y2gpXG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgY29uc3QgaG9zdG5hbWVNYXRjaFJlZ2V4cyA9IFtcbiAgICAgIHRoaXMuY29udmVydFBhdHRlcm5Ub1JlZ2V4KHRoaXMuaG9zdG5hbWVNYXRjaCksXG4gICAgICB0aGlzLmNvbnZlcnRQYXR0ZXJuVG9SZWdleCh0aGlzLmhvc3RuYW1lTWF0Y2gucmVwbGFjZSgvXlxcKlxcLi8sIFwiXCIpKVxuICAgIF07XG4gICAgY29uc3QgcGF0aG5hbWVNYXRjaFJlZ2V4ID0gdGhpcy5jb252ZXJ0UGF0dGVyblRvUmVnZXgodGhpcy5wYXRobmFtZU1hdGNoKTtcbiAgICByZXR1cm4gISFob3N0bmFtZU1hdGNoUmVnZXhzLmZpbmQoKHJlZ2V4KSA9PiByZWdleC50ZXN0KHVybC5ob3N0bmFtZSkpICYmIHBhdGhuYW1lTWF0Y2hSZWdleC50ZXN0KHVybC5wYXRobmFtZSk7XG4gIH1cbiAgaXNGaWxlTWF0Y2godXJsKSB7XG4gICAgdGhyb3cgRXJyb3IoXCJOb3QgaW1wbGVtZW50ZWQ6IGZpbGU6Ly8gcGF0dGVybiBtYXRjaGluZy4gT3BlbiBhIFBSIHRvIGFkZCBzdXBwb3J0XCIpO1xuICB9XG4gIGlzRnRwTWF0Y2godXJsKSB7XG4gICAgdGhyb3cgRXJyb3IoXCJOb3QgaW1wbGVtZW50ZWQ6IGZ0cDovLyBwYXR0ZXJuIG1hdGNoaW5nLiBPcGVuIGEgUFIgdG8gYWRkIHN1cHBvcnRcIik7XG4gIH1cbiAgaXNVcm5NYXRjaCh1cmwpIHtcbiAgICB0aHJvdyBFcnJvcihcIk5vdCBpbXBsZW1lbnRlZDogdXJuOi8vIHBhdHRlcm4gbWF0Y2hpbmcuIE9wZW4gYSBQUiB0byBhZGQgc3VwcG9ydFwiKTtcbiAgfVxuICBjb252ZXJ0UGF0dGVyblRvUmVnZXgocGF0dGVybikge1xuICAgIGNvbnN0IGVzY2FwZWQgPSB0aGlzLmVzY2FwZUZvclJlZ2V4KHBhdHRlcm4pO1xuICAgIGNvbnN0IHN0YXJzUmVwbGFjZWQgPSBlc2NhcGVkLnJlcGxhY2UoL1xcXFxcXCovZywgXCIuKlwiKTtcbiAgICByZXR1cm4gUmVnRXhwKGBeJHtzdGFyc1JlcGxhY2VkfSRgKTtcbiAgfVxuICBlc2NhcGVGb3JSZWdleChzdHJpbmcpIHtcbiAgICByZXR1cm4gc3RyaW5nLnJlcGxhY2UoL1suKis/XiR7fSgpfFtcXF1cXFxcXS9nLCBcIlxcXFwkJlwiKTtcbiAgfVxufTtcbnZhciBNYXRjaFBhdHRlcm4gPSBfTWF0Y2hQYXR0ZXJuO1xuTWF0Y2hQYXR0ZXJuLlBST1RPQ09MUyA9IFtcImh0dHBcIiwgXCJodHRwc1wiLCBcImZpbGVcIiwgXCJmdHBcIiwgXCJ1cm5cIl07XG52YXIgSW52YWxpZE1hdGNoUGF0dGVybiA9IGNsYXNzIGV4dGVuZHMgRXJyb3Ige1xuICBjb25zdHJ1Y3RvcihtYXRjaFBhdHRlcm4sIHJlYXNvbikge1xuICAgIHN1cGVyKGBJbnZhbGlkIG1hdGNoIHBhdHRlcm4gXCIke21hdGNoUGF0dGVybn1cIjogJHtyZWFzb259YCk7XG4gIH1cbn07XG5mdW5jdGlvbiB2YWxpZGF0ZVByb3RvY29sKG1hdGNoUGF0dGVybiwgcHJvdG9jb2wpIHtcbiAgaWYgKCFNYXRjaFBhdHRlcm4uUFJPVE9DT0xTLmluY2x1ZGVzKHByb3RvY29sKSAmJiBwcm90b2NvbCAhPT0gXCIqXCIpXG4gICAgdGhyb3cgbmV3IEludmFsaWRNYXRjaFBhdHRlcm4oXG4gICAgICBtYXRjaFBhdHRlcm4sXG4gICAgICBgJHtwcm90b2NvbH0gbm90IGEgdmFsaWQgcHJvdG9jb2wgKCR7TWF0Y2hQYXR0ZXJuLlBST1RPQ09MUy5qb2luKFwiLCBcIil9KWBcbiAgICApO1xufVxuZnVuY3Rpb24gdmFsaWRhdGVIb3N0bmFtZShtYXRjaFBhdHRlcm4sIGhvc3RuYW1lKSB7XG4gIGlmIChob3N0bmFtZS5pbmNsdWRlcyhcIjpcIikpXG4gICAgdGhyb3cgbmV3IEludmFsaWRNYXRjaFBhdHRlcm4obWF0Y2hQYXR0ZXJuLCBgSG9zdG5hbWUgY2Fubm90IGluY2x1ZGUgYSBwb3J0YCk7XG4gIGlmIChob3N0bmFtZS5pbmNsdWRlcyhcIipcIikgJiYgaG9zdG5hbWUubGVuZ3RoID4gMSAmJiAhaG9zdG5hbWUuc3RhcnRzV2l0aChcIiouXCIpKVxuICAgIHRocm93IG5ldyBJbnZhbGlkTWF0Y2hQYXR0ZXJuKFxuICAgICAgbWF0Y2hQYXR0ZXJuLFxuICAgICAgYElmIHVzaW5nIGEgd2lsZGNhcmQgKCopLCBpdCBtdXN0IGdvIGF0IHRoZSBzdGFydCBvZiB0aGUgaG9zdG5hbWVgXG4gICAgKTtcbn1cbmZ1bmN0aW9uIHZhbGlkYXRlUGF0aG5hbWUobWF0Y2hQYXR0ZXJuLCBwYXRobmFtZSkge1xuICByZXR1cm47XG59XG5leHBvcnQge1xuICBJbnZhbGlkTWF0Y2hQYXR0ZXJuLFxuICBNYXRjaFBhdHRlcm5cbn07XG4iXSwibmFtZXMiOlsiYnJvd3NlciIsIl9icm93c2VyIiwiX2EiLCJyZXN1bHQiLCJfYiJdLCJtYXBwaW5ncyI6Ijs7O0FBQU8sV0FBUyxpQkFBaUIsS0FBSztBQUNwQyxRQUFJLE9BQU8sUUFBUSxPQUFPLFFBQVEsV0FBWSxRQUFPLEVBQUUsTUFBTSxJQUFLO0FBQ2xFLFdBQU87QUFBQSxFQUNUO0FDRk8sUUFBTUEsY0FBVSxzQkFBVyxZQUFYLG1CQUFvQixZQUFwQixtQkFBNkIsTUFDaEQsV0FBVyxVQUNYLFdBQVc7QUNGUixRQUFNLFVBQVVDO0FDMEJ2QixRQUFBLGVBQUE7QUFBQTtBQUFBLElBQWdDO0FBQUEsTUFFOUIsSUFBQTtBQUFBLE1BQ00sTUFBQTtBQUFBLE1BQ0UsYUFBQTtBQUFBLE1BQ08sU0FBQTtBQUFBLE1BQ0osU0FBQSxPQUFBLFFBQUE7QUFFUCxjQUFBLFFBQUEsS0FBQSxPQUFBLEVBQUEsS0FBQSxPQUFBLGdCQUFBO0FBQ0EsZUFBQTtBQUFBLE1BQU87QUFBQTtBQUFBLElBQ1Q7QUFBQSxJQUVGO0FBQUEsTUFD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
