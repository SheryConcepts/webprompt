var background = function() {
  "use strict";
  var _a, _b;
  function defineBackground(arg) {
    if (arg == null || typeof arg === "function") return { main: arg };
    return arg;
  }
  const browser$1 = ((_b = (_a = globalThis.browser) == null ? void 0 : _a.runtime) == null ? void 0 : _b.id) ? globalThis.browser : globalThis.chrome;
  const browser = browser$1;
  console.log("Background script loaded.");
  const definition = defineBackground(async () => {
    browser.runtime.onInstalled.addListener(async (details) => {
      console.log("Extension installed or updated. Loading commands...");
      console.log("Commands loaded.");
    });
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
            await browser.scripting.executeScript({
              target: { tabId: currentTab.id },
              func: () => !!window.webPromptContentScriptLoaded
              // Check for a flag set by content script
            });
            await browser.tabs.sendMessage(currentTab.id, {
              action: "toggle-ui"
            });
            console.log(`Message sent successfully to tab ${currentTab.id}`);
          } catch (error) {
            console.error(
              `Error checking/sending message to tab ${currentTab.id}:`,
              error
            );
            try {
              console.log(
                `Attempting to inject content script into tab ${currentTab.id}`
              );
              await browser.scripting.executeScript({
                target: { tabId: currentTab.id },
                files: ["content-scripts/content.js"]
                // Make sure path is correct based on WXT output
              });
              await browser.tabs.sendMessage(currentTab.id, {
                action: "toggle-ui"
              });
              console.log(
                `Message sent successfully after injection to tab ${currentTab.id}`
              );
            } catch (injectionError) {
              console.error(
                `Failed to inject content script or send message after injection:`,
                injectionError
              );
            }
          }
        } else {
          console.log("No active tab found or tab has no ID.");
        }
      }
    });
    browser.runtime.onMessage.addListener(
      async (message, sender, sendResponse) => {
        var _a2, _b2;
        console.log(
          "Message received in background:",
          message,
          "from tab:",
          (_a2 = sender.tab) == null ? void 0 : _a2.id
        );
        if (message.action === "execute-command") {
          const { commandId, args } = message.payload;
          let command;
          try {
            command = await getCommandById(commandId);
          } catch (error) {
            console.error(`Error retrieving command ${commandId}:`, error);
            sendResponse({
              success: false,
              error: `Failed to retrieve command: ${error.message}`
            });
            return false;
          }
          if (!command) {
            console.error(`Command not found: ${commandId}`);
            sendResponse({
              success: false,
              error: `Command not found: ${commandId}`
            });
            return false;
          }
          if (!command.isEnabled) {
            console.log(`Command '${command.name}' (${commandId}) is disabled.`);
            sendResponse({
              success: false,
              error: `Command '${command.name}' is disabled.`
            });
            return false;
          }
          console.log(
            `Orchestrating command: ${command.name} (context: ${command.context})`
          );
          try {
            if (command.context === "background") {
              const result2 = await command.execute(sender.tab, ...args || []);
              console.log(
                `Background command '${command.name}' executed successfully.`
              );
              sendResponse({ success: true, result: result2 });
            } else if (command.context === "content") {
              if (!((_b2 = sender.tab) == null ? void 0 : _b2.id)) {
                throw new Error(
                  "Cannot execute content script command: sender tab ID is missing."
                );
              }
              console.log(
                `Forwarding command '${command.name}' to content script in tab ${sender.tab.id}`
              );
              const response = await browser.tabs.sendMessage(sender.tab.id, {
                // Use await
                action: "run-content-command",
                payload: { commandId, args: args || [] }
              });
              console.log(
                `Response from content script for '${command.name}':`,
                response
              );
              sendResponse(response);
            } else {
              throw new Error(`Unsupported command context: ${command.context}`);
            }
          } catch (error) {
            console.error(
              `Error during command orchestration/execution for '${(command == null ? void 0 : command.name) || commandId}':`,
              error
            );
            sendResponse({
              success: false,
              error: (error == null ? void 0 : error.message) || String(error)
            });
          }
          return true;
        }
        return false;
      }
    );
  });
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYmFja2dyb3VuZC5qcyIsInNvdXJjZXMiOlsiLi4vLi4vbm9kZV9tb2R1bGVzLy5wbnBtL3d4dEAwLjIwLjNfQHR5cGVzK25vZGVAMjIuMTQuMV9qaXRpQDIuNC4yX2xpZ2h0bmluZ2Nzc0AxLjI5LjJfcm9sbHVwQDQuNDAuMC9ub2RlX21vZHVsZXMvd3h0L2Rpc3QvdXRpbHMvZGVmaW5lLWJhY2tncm91bmQubWpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzLy5wbnBtL0B3eHQtZGV2K2Jyb3dzZXJAMC4wLjMxNS9ub2RlX21vZHVsZXMvQHd4dC1kZXYvYnJvd3Nlci9zcmMvaW5kZXgubWpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzLy5wbnBtL3d4dEAwLjIwLjNfQHR5cGVzK25vZGVAMjIuMTQuMV9qaXRpQDIuNC4yX2xpZ2h0bmluZ2Nzc0AxLjI5LjJfcm9sbHVwQDQuNDAuMC9ub2RlX21vZHVsZXMvd3h0L2Rpc3QvYnJvd3Nlci5tanMiLCIuLi8uLi9lbnRyeXBvaW50cy9iYWNrZ3JvdW5kLnRzIiwiLi4vLi4vbm9kZV9tb2R1bGVzLy5wbnBtL0B3ZWJleHQtY29yZSttYXRjaC1wYXR0ZXJuc0AxLjAuMy9ub2RlX21vZHVsZXMvQHdlYmV4dC1jb3JlL21hdGNoLXBhdHRlcm5zL2xpYi9pbmRleC5qcyJdLCJzb3VyY2VzQ29udGVudCI6WyJleHBvcnQgZnVuY3Rpb24gZGVmaW5lQmFja2dyb3VuZChhcmcpIHtcbiAgaWYgKGFyZyA9PSBudWxsIHx8IHR5cGVvZiBhcmcgPT09IFwiZnVuY3Rpb25cIikgcmV0dXJuIHsgbWFpbjogYXJnIH07XG4gIHJldHVybiBhcmc7XG59XG4iLCIvLyAjcmVnaW9uIHNuaXBwZXRcbmV4cG9ydCBjb25zdCBicm93c2VyID0gZ2xvYmFsVGhpcy5icm93c2VyPy5ydW50aW1lPy5pZFxuICA/IGdsb2JhbFRoaXMuYnJvd3NlclxuICA6IGdsb2JhbFRoaXMuY2hyb21lO1xuLy8gI2VuZHJlZ2lvbiBzbmlwcGV0XG4iLCJpbXBvcnQgeyBicm93c2VyIGFzIF9icm93c2VyIH0gZnJvbSBcIkB3eHQtZGV2L2Jyb3dzZXJcIjtcbmV4cG9ydCBjb25zdCBicm93c2VyID0gX2Jyb3dzZXI7XG5leHBvcnQge307XG4iLCJpbXBvcnQgdHlwZSB7IENvbW1hbmQgfSBmcm9tIFwiQC9saWIvY29tbWFuZHNcIjsgLy8gSW1wb3J0IHR5cGUgaWYgbmVlZGVkXG5pbXBvcnQgdHlwZSB7IEJyb3dzZXIgfSBmcm9tIFwid3h0L2Jyb3dzZXJcIjtcblxuY29uc29sZS5sb2coXCJCYWNrZ3JvdW5kIHNjcmlwdCBsb2FkZWQuXCIpO1xuXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVCYWNrZ3JvdW5kKGFzeW5jICgpID0+IHtcbiAgYnJvd3Nlci5ydW50aW1lLm9uSW5zdGFsbGVkLmFkZExpc3RlbmVyKGFzeW5jIChkZXRhaWxzKSA9PiB7XG4gICAgY29uc29sZS5sb2coXCJFeHRlbnNpb24gaW5zdGFsbGVkIG9yIHVwZGF0ZWQuIExvYWRpbmcgY29tbWFuZHMuLi5cIik7XG4gICAgY29uc29sZS5sb2coXCJDb21tYW5kcyBsb2FkZWQuXCIpO1xuICAgIC8vIEV4YW1wbGU6IExvZyBhIHNwZWNpZmljIGNvbW1hbmQgYWZ0ZXIgbG9hZGluZ1xuICAgIC8vIGNvbnN0IGV4YW1wbGVDbWQgPSBhd2FpdCBnZXRDb21tYW5kQnlJZChcImNtZC1uZXctdGFiXCIpO1xuICAgIC8vIGNvbnNvbGUubG9nKFwiRXhhbXBsZSBsb2FkZWQgY29tbWFuZDpcIiwgZXhhbXBsZUNtZCk7XG4gIH0pO1xuXG4gIC8vIElmIHlvdSBuZWVkIGNvbW1hbmRzIGltbWVkaWF0ZWx5IG9uIHN0YXJ0dXAgKG5vdCBqdXN0IGluc3RhbGwpXG4gIC8vIGxvYWRDb21tYW5kcygpOyAvLyBDb25zaWRlciBpZiBuZWVkZWQgb3V0c2lkZSBvbkluc3RhbGxlZFxuXG4gIC8vIEtleWJvYXJkIHNob3J0Y3V0IGxpc3RlbmVyXG4gIGJyb3dzZXIuY29tbWFuZHMub25Db21tYW5kLmFkZExpc3RlbmVyKGFzeW5jIChjb21tYW5kTmFtZSkgPT4ge1xuICAgIGNvbnNvbGUubG9nKGBDb21tYW5kIHJlY2VpdmVkOiAke2NvbW1hbmROYW1lfWApO1xuICAgIGlmIChjb21tYW5kTmFtZSA9PT0gXCJ0b2dnbGVfd2VicHJvbXB0XCIpIHtcbiAgICAgIGNvbnNvbGUubG9nKFwic2hvcnRjdXQgcHJlc3NlZFwiKTtcbiAgICAgIGNvbnN0IFtjdXJyZW50VGFiXSA9IGF3YWl0IGJyb3dzZXIudGFicy5xdWVyeSh7XG4gICAgICAgIGFjdGl2ZTogdHJ1ZSxcbiAgICAgICAgY3VycmVudFdpbmRvdzogdHJ1ZSxcbiAgICAgIH0pO1xuXG4gICAgICBpZiAoY3VycmVudFRhYj8uaWQpIHtcbiAgICAgICAgY29uc29sZS5sb2coYFNlbmRpbmcgdG9nZ2xlLXVpIG1lc3NhZ2UgdG8gdGFiICR7Y3VycmVudFRhYi5pZH1gKTtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAvLyBDaGVjayBpZiBjb250ZW50IHNjcmlwdCBpcyBsaWtlbHkgaW5qZWN0ZWQgYmVmb3JlIHNlbmRpbmdcbiAgICAgICAgICBhd2FpdCBicm93c2VyLnNjcmlwdGluZy5leGVjdXRlU2NyaXB0KHtcbiAgICAgICAgICAgIHRhcmdldDogeyB0YWJJZDogY3VycmVudFRhYi5pZCB9LFxuICAgICAgICAgICAgZnVuYzogKCkgPT4gISEod2luZG93IGFzIGFueSkud2ViUHJvbXB0Q29udGVudFNjcmlwdExvYWRlZCwgLy8gQ2hlY2sgZm9yIGEgZmxhZyBzZXQgYnkgY29udGVudCBzY3JpcHRcbiAgICAgICAgICB9KTtcblxuICAgICAgICAgIGF3YWl0IGJyb3dzZXIudGFicy5zZW5kTWVzc2FnZShjdXJyZW50VGFiLmlkLCB7XG4gICAgICAgICAgICBhY3Rpb246IFwidG9nZ2xlLXVpXCIsXG4gICAgICAgICAgfSk7XG4gICAgICAgICAgY29uc29sZS5sb2coYE1lc3NhZ2Ugc2VudCBzdWNjZXNzZnVsbHkgdG8gdGFiICR7Y3VycmVudFRhYi5pZH1gKTtcbiAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICBjb25zb2xlLmVycm9yKFxuICAgICAgICAgICAgYEVycm9yIGNoZWNraW5nL3NlbmRpbmcgbWVzc2FnZSB0byB0YWIgJHtjdXJyZW50VGFiLmlkfTpgLFxuICAgICAgICAgICAgZXJyb3IsXG4gICAgICAgICAgKTtcbiAgICAgICAgICAvLyBBdHRlbXB0IHRvIGluamVjdCB0aGUgY29udGVudCBzY3JpcHQgaWYgbWVzc2FnaW5nIGZhaWxlZFxuICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcbiAgICAgICAgICAgICAgYEF0dGVtcHRpbmcgdG8gaW5qZWN0IGNvbnRlbnQgc2NyaXB0IGludG8gdGFiICR7Y3VycmVudFRhYi5pZH1gLFxuICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIGF3YWl0IGJyb3dzZXIuc2NyaXB0aW5nLmV4ZWN1dGVTY3JpcHQoe1xuICAgICAgICAgICAgICB0YXJnZXQ6IHsgdGFiSWQ6IGN1cnJlbnRUYWIuaWQgfSxcbiAgICAgICAgICAgICAgZmlsZXM6IFtcImNvbnRlbnQtc2NyaXB0cy9jb250ZW50LmpzXCJdLCAvLyBNYWtlIHN1cmUgcGF0aCBpcyBjb3JyZWN0IGJhc2VkIG9uIFdYVCBvdXRwdXRcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgLy8gVHJ5IHNlbmRpbmcgdGhlIG1lc3NhZ2UgYWdhaW4gYWZ0ZXIgaW5qZWN0aW9uXG4gICAgICAgICAgICBhd2FpdCBicm93c2VyLnRhYnMuc2VuZE1lc3NhZ2UoY3VycmVudFRhYi5pZCwge1xuICAgICAgICAgICAgICBhY3Rpb246IFwidG9nZ2xlLXVpXCIsXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFxuICAgICAgICAgICAgICBgTWVzc2FnZSBzZW50IHN1Y2Nlc3NmdWxseSBhZnRlciBpbmplY3Rpb24gdG8gdGFiICR7Y3VycmVudFRhYi5pZH1gLFxuICAgICAgICAgICAgKTtcbiAgICAgICAgICB9IGNhdGNoIChpbmplY3Rpb25FcnJvcikge1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcihcbiAgICAgICAgICAgICAgYEZhaWxlZCB0byBpbmplY3QgY29udGVudCBzY3JpcHQgb3Igc2VuZCBtZXNzYWdlIGFmdGVyIGluamVjdGlvbjpgLFxuICAgICAgICAgICAgICBpbmplY3Rpb25FcnJvcixcbiAgICAgICAgICAgICk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjb25zb2xlLmxvZyhcIk5vIGFjdGl2ZSB0YWIgZm91bmQgb3IgdGFiIGhhcyBubyBJRC5cIik7XG4gICAgICB9XG4gICAgfVxuICB9KTtcblxuICAvLyBDb21tYW5kIE9yY2hlc3RyYXRpb24gTGlzdGVuZXJcbiAgYnJvd3Nlci5ydW50aW1lLm9uTWVzc2FnZS5hZGRMaXN0ZW5lcihcbiAgICBhc3luYyAobWVzc2FnZSwgc2VuZGVyLCBzZW5kUmVzcG9uc2UpID0+IHtcbiAgICAgIGNvbnNvbGUubG9nKFxuICAgICAgICBcIk1lc3NhZ2UgcmVjZWl2ZWQgaW4gYmFja2dyb3VuZDpcIixcbiAgICAgICAgbWVzc2FnZSxcbiAgICAgICAgXCJmcm9tIHRhYjpcIixcbiAgICAgICAgc2VuZGVyLnRhYj8uaWQsXG4gICAgICApO1xuXG4gICAgICBpZiAobWVzc2FnZS5hY3Rpb24gPT09IFwiZXhlY3V0ZS1jb21tYW5kXCIpIHtcbiAgICAgICAgY29uc3QgeyBjb21tYW5kSWQsIGFyZ3MgfSA9IG1lc3NhZ2UucGF5bG9hZDtcbiAgICAgICAgbGV0IGNvbW1hbmQ6IENvbW1hbmQgfCB1bmRlZmluZWQ7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgY29tbWFuZCA9IGF3YWl0IGdldENvbW1hbmRCeUlkKGNvbW1hbmRJZCk7IC8vIFVzZSBhd2FpdFxuICAgICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICAgIGNvbnNvbGUuZXJyb3IoYEVycm9yIHJldHJpZXZpbmcgY29tbWFuZCAke2NvbW1hbmRJZH06YCwgZXJyb3IpO1xuICAgICAgICAgIHNlbmRSZXNwb25zZSh7XG4gICAgICAgICAgICBzdWNjZXNzOiBmYWxzZSxcbiAgICAgICAgICAgIGVycm9yOiBgRmFpbGVkIHRvIHJldHJpZXZlIGNvbW1hbmQ6ICR7ZXJyb3IubWVzc2FnZX1gLFxuICAgICAgICAgIH0pO1xuICAgICAgICAgIHJldHVybiBmYWxzZTsgLy8gU3RvcCBwcm9jZXNzaW5nXG4gICAgICAgIH1cblxuICAgICAgICBpZiAoIWNvbW1hbmQpIHtcbiAgICAgICAgICBjb25zb2xlLmVycm9yKGBDb21tYW5kIG5vdCBmb3VuZDogJHtjb21tYW5kSWR9YCk7XG4gICAgICAgICAgc2VuZFJlc3BvbnNlKHtcbiAgICAgICAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxuICAgICAgICAgICAgZXJyb3I6IGBDb21tYW5kIG5vdCBmb3VuZDogJHtjb21tYW5kSWR9YCxcbiAgICAgICAgICB9KTtcbiAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoIWNvbW1hbmQuaXNFbmFibGVkKSB7XG4gICAgICAgICAgY29uc29sZS5sb2coYENvbW1hbmQgJyR7Y29tbWFuZC5uYW1lfScgKCR7Y29tbWFuZElkfSkgaXMgZGlzYWJsZWQuYCk7XG4gICAgICAgICAgc2VuZFJlc3BvbnNlKHtcbiAgICAgICAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxuICAgICAgICAgICAgZXJyb3I6IGBDb21tYW5kICcke2NvbW1hbmQubmFtZX0nIGlzIGRpc2FibGVkLmAsXG4gICAgICAgICAgfSk7XG4gICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc29sZS5sb2coXG4gICAgICAgICAgYE9yY2hlc3RyYXRpbmcgY29tbWFuZDogJHtjb21tYW5kLm5hbWV9IChjb250ZXh0OiAke2NvbW1hbmQuY29udGV4dH0pYCxcbiAgICAgICAgKTtcblxuICAgICAgICB0cnkge1xuICAgICAgICAgIGlmIChjb21tYW5kLmNvbnRleHQgPT09IFwiYmFja2dyb3VuZFwiKSB7XG4gICAgICAgICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBjb21tYW5kLmV4ZWN1dGUoc2VuZGVyLnRhYiwgLi4uKGFyZ3MgfHwgW10pKTsgLy8gUGFzcyB0YWIgY29udGV4dCwgdXNlIGF3YWl0XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcbiAgICAgICAgICAgICAgYEJhY2tncm91bmQgY29tbWFuZCAnJHtjb21tYW5kLm5hbWV9JyBleGVjdXRlZCBzdWNjZXNzZnVsbHkuYCxcbiAgICAgICAgICAgICk7XG4gICAgICAgICAgICBzZW5kUmVzcG9uc2UoeyBzdWNjZXNzOiB0cnVlLCByZXN1bHQgfSk7XG4gICAgICAgICAgfSBlbHNlIGlmIChjb21tYW5kLmNvbnRleHQgPT09IFwiY29udGVudFwiKSB7XG4gICAgICAgICAgICBpZiAoIXNlbmRlci50YWI/LmlkKSB7XG4gICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgICAgICAgICBcIkNhbm5vdCBleGVjdXRlIGNvbnRlbnQgc2NyaXB0IGNvbW1hbmQ6IHNlbmRlciB0YWIgSUQgaXMgbWlzc2luZy5cIixcbiAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFxuICAgICAgICAgICAgICBgRm9yd2FyZGluZyBjb21tYW5kICcke2NvbW1hbmQubmFtZX0nIHRvIGNvbnRlbnQgc2NyaXB0IGluIHRhYiAke3NlbmRlci50YWIuaWR9YCxcbiAgICAgICAgICAgICk7XG4gICAgICAgICAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IGJyb3dzZXIudGFicy5zZW5kTWVzc2FnZShzZW5kZXIudGFiLmlkLCB7XG4gICAgICAgICAgICAgIC8vIFVzZSBhd2FpdFxuICAgICAgICAgICAgICBhY3Rpb246IFwicnVuLWNvbnRlbnQtY29tbWFuZFwiLFxuICAgICAgICAgICAgICBwYXlsb2FkOiB7IGNvbW1hbmRJZCwgYXJnczogYXJncyB8fCBbXSB9LFxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcbiAgICAgICAgICAgICAgYFJlc3BvbnNlIGZyb20gY29udGVudCBzY3JpcHQgZm9yICcke2NvbW1hbmQubmFtZX0nOmAsXG4gICAgICAgICAgICAgIHJlc3BvbnNlLFxuICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIHNlbmRSZXNwb25zZShyZXNwb25zZSk7IC8vIEZvcndhcmQgdGhlIHJlc3BvbnNlXG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgVW5zdXBwb3J0ZWQgY29tbWFuZCBjb250ZXh0OiAke2NvbW1hbmQuY29udGV4dH1gKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgY29uc29sZS5lcnJvcihcbiAgICAgICAgICAgIGBFcnJvciBkdXJpbmcgY29tbWFuZCBvcmNoZXN0cmF0aW9uL2V4ZWN1dGlvbiBmb3IgJyR7Y29tbWFuZD8ubmFtZSB8fCBjb21tYW5kSWR9JzpgLFxuICAgICAgICAgICAgZXJyb3IsXG4gICAgICAgICAgKTtcbiAgICAgICAgICBzZW5kUmVzcG9uc2Uoe1xuICAgICAgICAgICAgc3VjY2VzczogZmFsc2UsXG4gICAgICAgICAgICBlcnJvcjogZXJyb3I/Lm1lc3NhZ2UgfHwgU3RyaW5nKGVycm9yKSxcbiAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICAvLyBJbmRpY2F0ZSB0aGF0IHRoZSByZXNwb25zZSBtaWdodCBiZSBzZW50IGFzeW5jaHJvbm91c2x5LlxuICAgICAgICAvLyBXaGlsZSB3ZSB1c2UgYXdhaXQgYWJvdmUsIHJldHVybmluZyB0cnVlIGlzIHN0aWxsIHRoZSBzYWZlc3QgcHJhY3RpY2VcbiAgICAgICAgLy8gZm9yIGNvbXBsZXggYXN5bmMgbWVzc2FnZSBoYW5kbGVycyBpbiBleHRlbnNpb25zLlxuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH1cbiAgICAgIC8vIEhhbmRsZSBvdGhlciBtZXNzYWdlIHR5cGVzIGlmIG5lZWRlZFxuICAgICAgcmV0dXJuIGZhbHNlOyAvLyBJbmRpY2F0ZSBzeW5jaHJvbm91cyBoYW5kbGluZyBpZiBtZXNzYWdlIG5vdCBoYW5kbGVkXG4gICAgfSxcbiAgKTtcbn0pO1xuIiwiLy8gc3JjL2luZGV4LnRzXG52YXIgX01hdGNoUGF0dGVybiA9IGNsYXNzIHtcbiAgY29uc3RydWN0b3IobWF0Y2hQYXR0ZXJuKSB7XG4gICAgaWYgKG1hdGNoUGF0dGVybiA9PT0gXCI8YWxsX3VybHM+XCIpIHtcbiAgICAgIHRoaXMuaXNBbGxVcmxzID0gdHJ1ZTtcbiAgICAgIHRoaXMucHJvdG9jb2xNYXRjaGVzID0gWy4uLl9NYXRjaFBhdHRlcm4uUFJPVE9DT0xTXTtcbiAgICAgIHRoaXMuaG9zdG5hbWVNYXRjaCA9IFwiKlwiO1xuICAgICAgdGhpcy5wYXRobmFtZU1hdGNoID0gXCIqXCI7XG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbnN0IGdyb3VwcyA9IC8oLiopOlxcL1xcLyguKj8pKFxcLy4qKS8uZXhlYyhtYXRjaFBhdHRlcm4pO1xuICAgICAgaWYgKGdyb3VwcyA9PSBudWxsKVxuICAgICAgICB0aHJvdyBuZXcgSW52YWxpZE1hdGNoUGF0dGVybihtYXRjaFBhdHRlcm4sIFwiSW5jb3JyZWN0IGZvcm1hdFwiKTtcbiAgICAgIGNvbnN0IFtfLCBwcm90b2NvbCwgaG9zdG5hbWUsIHBhdGhuYW1lXSA9IGdyb3VwcztcbiAgICAgIHZhbGlkYXRlUHJvdG9jb2wobWF0Y2hQYXR0ZXJuLCBwcm90b2NvbCk7XG4gICAgICB2YWxpZGF0ZUhvc3RuYW1lKG1hdGNoUGF0dGVybiwgaG9zdG5hbWUpO1xuICAgICAgdmFsaWRhdGVQYXRobmFtZShtYXRjaFBhdHRlcm4sIHBhdGhuYW1lKTtcbiAgICAgIHRoaXMucHJvdG9jb2xNYXRjaGVzID0gcHJvdG9jb2wgPT09IFwiKlwiID8gW1wiaHR0cFwiLCBcImh0dHBzXCJdIDogW3Byb3RvY29sXTtcbiAgICAgIHRoaXMuaG9zdG5hbWVNYXRjaCA9IGhvc3RuYW1lO1xuICAgICAgdGhpcy5wYXRobmFtZU1hdGNoID0gcGF0aG5hbWU7XG4gICAgfVxuICB9XG4gIGluY2x1ZGVzKHVybCkge1xuICAgIGlmICh0aGlzLmlzQWxsVXJscylcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIGNvbnN0IHUgPSB0eXBlb2YgdXJsID09PSBcInN0cmluZ1wiID8gbmV3IFVSTCh1cmwpIDogdXJsIGluc3RhbmNlb2YgTG9jYXRpb24gPyBuZXcgVVJMKHVybC5ocmVmKSA6IHVybDtcbiAgICByZXR1cm4gISF0aGlzLnByb3RvY29sTWF0Y2hlcy5maW5kKChwcm90b2NvbCkgPT4ge1xuICAgICAgaWYgKHByb3RvY29sID09PSBcImh0dHBcIilcbiAgICAgICAgcmV0dXJuIHRoaXMuaXNIdHRwTWF0Y2godSk7XG4gICAgICBpZiAocHJvdG9jb2wgPT09IFwiaHR0cHNcIilcbiAgICAgICAgcmV0dXJuIHRoaXMuaXNIdHRwc01hdGNoKHUpO1xuICAgICAgaWYgKHByb3RvY29sID09PSBcImZpbGVcIilcbiAgICAgICAgcmV0dXJuIHRoaXMuaXNGaWxlTWF0Y2godSk7XG4gICAgICBpZiAocHJvdG9jb2wgPT09IFwiZnRwXCIpXG4gICAgICAgIHJldHVybiB0aGlzLmlzRnRwTWF0Y2godSk7XG4gICAgICBpZiAocHJvdG9jb2wgPT09IFwidXJuXCIpXG4gICAgICAgIHJldHVybiB0aGlzLmlzVXJuTWF0Y2godSk7XG4gICAgfSk7XG4gIH1cbiAgaXNIdHRwTWF0Y2godXJsKSB7XG4gICAgcmV0dXJuIHVybC5wcm90b2NvbCA9PT0gXCJodHRwOlwiICYmIHRoaXMuaXNIb3N0UGF0aE1hdGNoKHVybCk7XG4gIH1cbiAgaXNIdHRwc01hdGNoKHVybCkge1xuICAgIHJldHVybiB1cmwucHJvdG9jb2wgPT09IFwiaHR0cHM6XCIgJiYgdGhpcy5pc0hvc3RQYXRoTWF0Y2godXJsKTtcbiAgfVxuICBpc0hvc3RQYXRoTWF0Y2godXJsKSB7XG4gICAgaWYgKCF0aGlzLmhvc3RuYW1lTWF0Y2ggfHwgIXRoaXMucGF0aG5hbWVNYXRjaClcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICBjb25zdCBob3N0bmFtZU1hdGNoUmVnZXhzID0gW1xuICAgICAgdGhpcy5jb252ZXJ0UGF0dGVyblRvUmVnZXgodGhpcy5ob3N0bmFtZU1hdGNoKSxcbiAgICAgIHRoaXMuY29udmVydFBhdHRlcm5Ub1JlZ2V4KHRoaXMuaG9zdG5hbWVNYXRjaC5yZXBsYWNlKC9eXFwqXFwuLywgXCJcIikpXG4gICAgXTtcbiAgICBjb25zdCBwYXRobmFtZU1hdGNoUmVnZXggPSB0aGlzLmNvbnZlcnRQYXR0ZXJuVG9SZWdleCh0aGlzLnBhdGhuYW1lTWF0Y2gpO1xuICAgIHJldHVybiAhIWhvc3RuYW1lTWF0Y2hSZWdleHMuZmluZCgocmVnZXgpID0+IHJlZ2V4LnRlc3QodXJsLmhvc3RuYW1lKSkgJiYgcGF0aG5hbWVNYXRjaFJlZ2V4LnRlc3QodXJsLnBhdGhuYW1lKTtcbiAgfVxuICBpc0ZpbGVNYXRjaCh1cmwpIHtcbiAgICB0aHJvdyBFcnJvcihcIk5vdCBpbXBsZW1lbnRlZDogZmlsZTovLyBwYXR0ZXJuIG1hdGNoaW5nLiBPcGVuIGEgUFIgdG8gYWRkIHN1cHBvcnRcIik7XG4gIH1cbiAgaXNGdHBNYXRjaCh1cmwpIHtcbiAgICB0aHJvdyBFcnJvcihcIk5vdCBpbXBsZW1lbnRlZDogZnRwOi8vIHBhdHRlcm4gbWF0Y2hpbmcuIE9wZW4gYSBQUiB0byBhZGQgc3VwcG9ydFwiKTtcbiAgfVxuICBpc1Vybk1hdGNoKHVybCkge1xuICAgIHRocm93IEVycm9yKFwiTm90IGltcGxlbWVudGVkOiB1cm46Ly8gcGF0dGVybiBtYXRjaGluZy4gT3BlbiBhIFBSIHRvIGFkZCBzdXBwb3J0XCIpO1xuICB9XG4gIGNvbnZlcnRQYXR0ZXJuVG9SZWdleChwYXR0ZXJuKSB7XG4gICAgY29uc3QgZXNjYXBlZCA9IHRoaXMuZXNjYXBlRm9yUmVnZXgocGF0dGVybik7XG4gICAgY29uc3Qgc3RhcnNSZXBsYWNlZCA9IGVzY2FwZWQucmVwbGFjZSgvXFxcXFxcKi9nLCBcIi4qXCIpO1xuICAgIHJldHVybiBSZWdFeHAoYF4ke3N0YXJzUmVwbGFjZWR9JGApO1xuICB9XG4gIGVzY2FwZUZvclJlZ2V4KHN0cmluZykge1xuICAgIHJldHVybiBzdHJpbmcucmVwbGFjZSgvWy4qKz9eJHt9KCl8W1xcXVxcXFxdL2csIFwiXFxcXCQmXCIpO1xuICB9XG59O1xudmFyIE1hdGNoUGF0dGVybiA9IF9NYXRjaFBhdHRlcm47XG5NYXRjaFBhdHRlcm4uUFJPVE9DT0xTID0gW1wiaHR0cFwiLCBcImh0dHBzXCIsIFwiZmlsZVwiLCBcImZ0cFwiLCBcInVyblwiXTtcbnZhciBJbnZhbGlkTWF0Y2hQYXR0ZXJuID0gY2xhc3MgZXh0ZW5kcyBFcnJvciB7XG4gIGNvbnN0cnVjdG9yKG1hdGNoUGF0dGVybiwgcmVhc29uKSB7XG4gICAgc3VwZXIoYEludmFsaWQgbWF0Y2ggcGF0dGVybiBcIiR7bWF0Y2hQYXR0ZXJufVwiOiAke3JlYXNvbn1gKTtcbiAgfVxufTtcbmZ1bmN0aW9uIHZhbGlkYXRlUHJvdG9jb2wobWF0Y2hQYXR0ZXJuLCBwcm90b2NvbCkge1xuICBpZiAoIU1hdGNoUGF0dGVybi5QUk9UT0NPTFMuaW5jbHVkZXMocHJvdG9jb2wpICYmIHByb3RvY29sICE9PSBcIipcIilcbiAgICB0aHJvdyBuZXcgSW52YWxpZE1hdGNoUGF0dGVybihcbiAgICAgIG1hdGNoUGF0dGVybixcbiAgICAgIGAke3Byb3RvY29sfSBub3QgYSB2YWxpZCBwcm90b2NvbCAoJHtNYXRjaFBhdHRlcm4uUFJPVE9DT0xTLmpvaW4oXCIsIFwiKX0pYFxuICAgICk7XG59XG5mdW5jdGlvbiB2YWxpZGF0ZUhvc3RuYW1lKG1hdGNoUGF0dGVybiwgaG9zdG5hbWUpIHtcbiAgaWYgKGhvc3RuYW1lLmluY2x1ZGVzKFwiOlwiKSlcbiAgICB0aHJvdyBuZXcgSW52YWxpZE1hdGNoUGF0dGVybihtYXRjaFBhdHRlcm4sIGBIb3N0bmFtZSBjYW5ub3QgaW5jbHVkZSBhIHBvcnRgKTtcbiAgaWYgKGhvc3RuYW1lLmluY2x1ZGVzKFwiKlwiKSAmJiBob3N0bmFtZS5sZW5ndGggPiAxICYmICFob3N0bmFtZS5zdGFydHNXaXRoKFwiKi5cIikpXG4gICAgdGhyb3cgbmV3IEludmFsaWRNYXRjaFBhdHRlcm4oXG4gICAgICBtYXRjaFBhdHRlcm4sXG4gICAgICBgSWYgdXNpbmcgYSB3aWxkY2FyZCAoKiksIGl0IG11c3QgZ28gYXQgdGhlIHN0YXJ0IG9mIHRoZSBob3N0bmFtZWBcbiAgICApO1xufVxuZnVuY3Rpb24gdmFsaWRhdGVQYXRobmFtZShtYXRjaFBhdHRlcm4sIHBhdGhuYW1lKSB7XG4gIHJldHVybjtcbn1cbmV4cG9ydCB7XG4gIEludmFsaWRNYXRjaFBhdHRlcm4sXG4gIE1hdGNoUGF0dGVyblxufTtcbiJdLCJuYW1lcyI6WyJicm93c2VyIiwiX2Jyb3dzZXIiLCJfYSIsInJlc3VsdCIsIl9iIl0sIm1hcHBpbmdzIjoiOzs7QUFBTyxXQUFTLGlCQUFpQixLQUFLO0FBQ3BDLFFBQUksT0FBTyxRQUFRLE9BQU8sUUFBUSxXQUFZLFFBQU8sRUFBRSxNQUFNLElBQUs7QUFDbEUsV0FBTztBQUFBLEVBQ1Q7QUNGTyxRQUFNQSxjQUFVLHNCQUFXLFlBQVgsbUJBQW9CLFlBQXBCLG1CQUE2QixNQUNoRCxXQUFXLFVBQ1gsV0FBVztBQ0ZSLFFBQU0sVUFBVUM7QUNFdkIsVUFBQSxJQUFBLDJCQUFBO0FBRUEsUUFBQSxhQUFBLGlCQUFBLFlBQUE7QUFDRSxZQUFBLFFBQUEsWUFBQSxZQUFBLE9BQUEsWUFBQTtBQUNFLGNBQUEsSUFBQSxxREFBQTtBQUNBLGNBQUEsSUFBQSxrQkFBQTtBQUFBLElBQThCLENBQUE7QUFVaEMsWUFBQSxTQUFBLFVBQUEsWUFBQSxPQUFBLGdCQUFBO0FBQ0UsY0FBQSxJQUFBLHFCQUFBLFdBQUEsRUFBQTtBQUNBLFVBQUEsZ0JBQUEsb0JBQUE7QUFDRSxnQkFBQSxJQUFBLGtCQUFB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
