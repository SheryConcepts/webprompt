var background = function() {
  "use strict";
  var _a, _b, _c, _d;
  function defineBackground(arg) {
    if (arg == null || typeof arg === "function") return { main: arg };
    return arg;
  }
  const browser$2 = ((_b = (_a = globalThis.browser) == null ? void 0 : _a.runtime) == null ? void 0 : _b.id) ? globalThis.browser : globalThis.chrome;
  const browser$1 = browser$2;
  var has = Object.prototype.hasOwnProperty;
  function dequal(foo, bar) {
    var ctor, len;
    if (foo === bar) return true;
    if (foo && bar && (ctor = foo.constructor) === bar.constructor) {
      if (ctor === Date) return foo.getTime() === bar.getTime();
      if (ctor === RegExp) return foo.toString() === bar.toString();
      if (ctor === Array) {
        if ((len = foo.length) === bar.length) {
          while (len-- && dequal(foo[len], bar[len])) ;
        }
        return len === -1;
      }
      if (!ctor || typeof foo === "object") {
        len = 0;
        for (ctor in foo) {
          if (has.call(foo, ctor) && ++len && !has.call(bar, ctor)) return false;
          if (!(ctor in bar) || !dequal(foo[ctor], bar[ctor])) return false;
        }
        return Object.keys(bar).length === len;
      }
    }
    return foo !== foo && bar !== bar;
  }
  const E_CANCELED = new Error("request for lock canceled");
  var __awaiter$2 = function(thisArg, _arguments, P, generator) {
    function adopt(value) {
      return value instanceof P ? value : new P(function(resolve) {
        resolve(value);
      });
    }
    return new (P || (P = Promise))(function(resolve, reject) {
      function fulfilled(value) {
        try {
          step(generator.next(value));
        } catch (e) {
          reject(e);
        }
      }
      function rejected(value) {
        try {
          step(generator["throw"](value));
        } catch (e) {
          reject(e);
        }
      }
      function step(result2) {
        result2.done ? resolve(result2.value) : adopt(result2.value).then(fulfilled, rejected);
      }
      step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
  };
  class Semaphore {
    constructor(_value, _cancelError = E_CANCELED) {
      this._value = _value;
      this._cancelError = _cancelError;
      this._queue = [];
      this._weightedWaiters = [];
    }
    acquire(weight = 1, priority = 0) {
      if (weight <= 0)
        throw new Error(`invalid weight ${weight}: must be positive`);
      return new Promise((resolve, reject) => {
        const task = { resolve, reject, weight, priority };
        const i = findIndexFromEnd(this._queue, (other) => priority <= other.priority);
        if (i === -1 && weight <= this._value) {
          this._dispatchItem(task);
        } else {
          this._queue.splice(i + 1, 0, task);
        }
      });
    }
    runExclusive(callback_1) {
      return __awaiter$2(this, arguments, void 0, function* (callback, weight = 1, priority = 0) {
        const [value, release] = yield this.acquire(weight, priority);
        try {
          return yield callback(value);
        } finally {
          release();
        }
      });
    }
    waitForUnlock(weight = 1, priority = 0) {
      if (weight <= 0)
        throw new Error(`invalid weight ${weight}: must be positive`);
      if (this._couldLockImmediately(weight, priority)) {
        return Promise.resolve();
      } else {
        return new Promise((resolve) => {
          if (!this._weightedWaiters[weight - 1])
            this._weightedWaiters[weight - 1] = [];
          insertSorted(this._weightedWaiters[weight - 1], { resolve, priority });
        });
      }
    }
    isLocked() {
      return this._value <= 0;
    }
    getValue() {
      return this._value;
    }
    setValue(value) {
      this._value = value;
      this._dispatchQueue();
    }
    release(weight = 1) {
      if (weight <= 0)
        throw new Error(`invalid weight ${weight}: must be positive`);
      this._value += weight;
      this._dispatchQueue();
    }
    cancel() {
      this._queue.forEach((entry) => entry.reject(this._cancelError));
      this._queue = [];
    }
    _dispatchQueue() {
      this._drainUnlockWaiters();
      while (this._queue.length > 0 && this._queue[0].weight <= this._value) {
        this._dispatchItem(this._queue.shift());
        this._drainUnlockWaiters();
      }
    }
    _dispatchItem(item) {
      const previousValue = this._value;
      this._value -= item.weight;
      item.resolve([previousValue, this._newReleaser(item.weight)]);
    }
    _newReleaser(weight) {
      let called = false;
      return () => {
        if (called)
          return;
        called = true;
        this.release(weight);
      };
    }
    _drainUnlockWaiters() {
      if (this._queue.length === 0) {
        for (let weight = this._value; weight > 0; weight--) {
          const waiters = this._weightedWaiters[weight - 1];
          if (!waiters)
            continue;
          waiters.forEach((waiter) => waiter.resolve());
          this._weightedWaiters[weight - 1] = [];
        }
      } else {
        const queuedPriority = this._queue[0].priority;
        for (let weight = this._value; weight > 0; weight--) {
          const waiters = this._weightedWaiters[weight - 1];
          if (!waiters)
            continue;
          const i = waiters.findIndex((waiter) => waiter.priority <= queuedPriority);
          (i === -1 ? waiters : waiters.splice(0, i)).forEach((waiter) => waiter.resolve());
        }
      }
    }
    _couldLockImmediately(weight, priority) {
      return (this._queue.length === 0 || this._queue[0].priority < priority) && weight <= this._value;
    }
  }
  function insertSorted(a, v) {
    const i = findIndexFromEnd(a, (other) => v.priority <= other.priority);
    a.splice(i + 1, 0, v);
  }
  function findIndexFromEnd(a, predicate) {
    for (let i = a.length - 1; i >= 0; i--) {
      if (predicate(a[i])) {
        return i;
      }
    }
    return -1;
  }
  var __awaiter$1 = function(thisArg, _arguments, P, generator) {
    function adopt(value) {
      return value instanceof P ? value : new P(function(resolve) {
        resolve(value);
      });
    }
    return new (P || (P = Promise))(function(resolve, reject) {
      function fulfilled(value) {
        try {
          step(generator.next(value));
        } catch (e) {
          reject(e);
        }
      }
      function rejected(value) {
        try {
          step(generator["throw"](value));
        } catch (e) {
          reject(e);
        }
      }
      function step(result2) {
        result2.done ? resolve(result2.value) : adopt(result2.value).then(fulfilled, rejected);
      }
      step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
  };
  class Mutex {
    constructor(cancelError) {
      this._semaphore = new Semaphore(1, cancelError);
    }
    acquire() {
      return __awaiter$1(this, arguments, void 0, function* (priority = 0) {
        const [, releaser] = yield this._semaphore.acquire(1, priority);
        return releaser;
      });
    }
    runExclusive(callback, priority = 0) {
      return this._semaphore.runExclusive(() => callback(), 1, priority);
    }
    isLocked() {
      return this._semaphore.isLocked();
    }
    waitForUnlock(priority = 0) {
      return this._semaphore.waitForUnlock(1, priority);
    }
    release() {
      if (this._semaphore.isLocked())
        this._semaphore.release();
    }
    cancel() {
      return this._semaphore.cancel();
    }
  }
  const browser = (
    // @ts-expect-error
    ((_d = (_c = globalThis.browser) == null ? void 0 : _c.runtime) == null ? void 0 : _d.id) == null ? globalThis.chrome : (
      // @ts-expect-error
      globalThis.browser
    )
  );
  const storage = createStorage();
  function createStorage() {
    const drivers = {
      local: createDriver("local"),
      session: createDriver("session"),
      sync: createDriver("sync"),
      managed: createDriver("managed")
    };
    const getDriver = (area) => {
      const driver = drivers[area];
      if (driver == null) {
        const areaNames = Object.keys(drivers).join(", ");
        throw Error(`Invalid area "${area}". Options: ${areaNames}`);
      }
      return driver;
    };
    const resolveKey = (key) => {
      const deliminatorIndex = key.indexOf(":");
      const driverArea = key.substring(0, deliminatorIndex);
      const driverKey = key.substring(deliminatorIndex + 1);
      if (driverKey == null)
        throw Error(
          `Storage key should be in the form of "area:key", but received "${key}"`
        );
      return {
        driverArea,
        driverKey,
        driver: getDriver(driverArea)
      };
    };
    const getMetaKey = (key) => key + "$";
    const mergeMeta = (oldMeta, newMeta) => {
      const newFields = { ...oldMeta };
      Object.entries(newMeta).forEach(([key, value]) => {
        if (value == null) delete newFields[key];
        else newFields[key] = value;
      });
      return newFields;
    };
    const getValueOrFallback = (value, fallback) => value ?? fallback ?? null;
    const getMetaValue = (properties) => typeof properties === "object" && !Array.isArray(properties) ? properties : {};
    const getItem = async (driver, driverKey, opts) => {
      const res = await driver.getItem(driverKey);
      return getValueOrFallback(res, (opts == null ? void 0 : opts.fallback) ?? (opts == null ? void 0 : opts.defaultValue));
    };
    const getMeta = async (driver, driverKey) => {
      const metaKey = getMetaKey(driverKey);
      const res = await driver.getItem(metaKey);
      return getMetaValue(res);
    };
    const setItem = async (driver, driverKey, value) => {
      await driver.setItem(driverKey, value ?? null);
    };
    const setMeta = async (driver, driverKey, properties) => {
      const metaKey = getMetaKey(driverKey);
      const existingFields = getMetaValue(await driver.getItem(metaKey));
      await driver.setItem(metaKey, mergeMeta(existingFields, properties));
    };
    const removeItem = async (driver, driverKey, opts) => {
      await driver.removeItem(driverKey);
      if (opts == null ? void 0 : opts.removeMeta) {
        const metaKey = getMetaKey(driverKey);
        await driver.removeItem(metaKey);
      }
    };
    const removeMeta = async (driver, driverKey, properties) => {
      const metaKey = getMetaKey(driverKey);
      if (properties == null) {
        await driver.removeItem(metaKey);
      } else {
        const newFields = getMetaValue(await driver.getItem(metaKey));
        [properties].flat().forEach((field) => delete newFields[field]);
        await driver.setItem(metaKey, newFields);
      }
    };
    const watch = (driver, driverKey, cb) => {
      return driver.watch(driverKey, cb);
    };
    const storage2 = {
      getItem: async (key, opts) => {
        const { driver, driverKey } = resolveKey(key);
        return await getItem(driver, driverKey, opts);
      },
      getItems: async (keys) => {
        const areaToKeyMap = /* @__PURE__ */ new Map();
        const keyToOptsMap = /* @__PURE__ */ new Map();
        const orderedKeys = [];
        keys.forEach((key) => {
          let keyStr;
          let opts;
          if (typeof key === "string") {
            keyStr = key;
          } else if ("getValue" in key) {
            keyStr = key.key;
            opts = { fallback: key.fallback };
          } else {
            keyStr = key.key;
            opts = key.options;
          }
          orderedKeys.push(keyStr);
          const { driverArea, driverKey } = resolveKey(keyStr);
          const areaKeys = areaToKeyMap.get(driverArea) ?? [];
          areaToKeyMap.set(driverArea, areaKeys.concat(driverKey));
          keyToOptsMap.set(keyStr, opts);
        });
        const resultsMap = /* @__PURE__ */ new Map();
        await Promise.all(
          Array.from(areaToKeyMap.entries()).map(async ([driverArea, keys2]) => {
            const driverResults = await drivers[driverArea].getItems(keys2);
            driverResults.forEach((driverResult) => {
              const key = `${driverArea}:${driverResult.key}`;
              const opts = keyToOptsMap.get(key);
              const value = getValueOrFallback(
                driverResult.value,
                (opts == null ? void 0 : opts.fallback) ?? (opts == null ? void 0 : opts.defaultValue)
              );
              resultsMap.set(key, value);
            });
          })
        );
        return orderedKeys.map((key) => ({
          key,
          value: resultsMap.get(key)
        }));
      },
      getMeta: async (key) => {
        const { driver, driverKey } = resolveKey(key);
        return await getMeta(driver, driverKey);
      },
      getMetas: async (args) => {
        const keys = args.map((arg) => {
          const key = typeof arg === "string" ? arg : arg.key;
          const { driverArea, driverKey } = resolveKey(key);
          return {
            key,
            driverArea,
            driverKey,
            driverMetaKey: getMetaKey(driverKey)
          };
        });
        const areaToDriverMetaKeysMap = keys.reduce((map, key) => {
          var _a2;
          map[_a2 = key.driverArea] ?? (map[_a2] = []);
          map[key.driverArea].push(key);
          return map;
        }, {});
        const resultsMap = {};
        await Promise.all(
          Object.entries(areaToDriverMetaKeysMap).map(async ([area, keys2]) => {
            const areaRes = await browser.storage[area].get(
              keys2.map((key) => key.driverMetaKey)
            );
            keys2.forEach((key) => {
              resultsMap[key.key] = areaRes[key.driverMetaKey] ?? {};
            });
          })
        );
        return keys.map((key) => ({
          key: key.key,
          meta: resultsMap[key.key]
        }));
      },
      setItem: async (key, value) => {
        const { driver, driverKey } = resolveKey(key);
        await setItem(driver, driverKey, value);
      },
      setItems: async (items) => {
        const areaToKeyValueMap = {};
        items.forEach((item) => {
          const { driverArea, driverKey } = resolveKey(
            "key" in item ? item.key : item.item.key
          );
          areaToKeyValueMap[driverArea] ?? (areaToKeyValueMap[driverArea] = []);
          areaToKeyValueMap[driverArea].push({
            key: driverKey,
            value: item.value
          });
        });
        await Promise.all(
          Object.entries(areaToKeyValueMap).map(async ([driverArea, values]) => {
            const driver = getDriver(driverArea);
            await driver.setItems(values);
          })
        );
      },
      setMeta: async (key, properties) => {
        const { driver, driverKey } = resolveKey(key);
        await setMeta(driver, driverKey, properties);
      },
      setMetas: async (items) => {
        const areaToMetaUpdatesMap = {};
        items.forEach((item) => {
          const { driverArea, driverKey } = resolveKey(
            "key" in item ? item.key : item.item.key
          );
          areaToMetaUpdatesMap[driverArea] ?? (areaToMetaUpdatesMap[driverArea] = []);
          areaToMetaUpdatesMap[driverArea].push({
            key: driverKey,
            properties: item.meta
          });
        });
        await Promise.all(
          Object.entries(areaToMetaUpdatesMap).map(
            async ([storageArea, updates]) => {
              const driver = getDriver(storageArea);
              const metaKeys = updates.map(({ key }) => getMetaKey(key));
              console.log(storageArea, metaKeys);
              const existingMetas = await driver.getItems(metaKeys);
              const existingMetaMap = Object.fromEntries(
                existingMetas.map(({ key, value }) => [key, getMetaValue(value)])
              );
              const metaUpdates = updates.map(({ key, properties }) => {
                const metaKey = getMetaKey(key);
                return {
                  key: metaKey,
                  value: mergeMeta(existingMetaMap[metaKey] ?? {}, properties)
                };
              });
              await driver.setItems(metaUpdates);
            }
          )
        );
      },
      removeItem: async (key, opts) => {
        const { driver, driverKey } = resolveKey(key);
        await removeItem(driver, driverKey, opts);
      },
      removeItems: async (keys) => {
        const areaToKeysMap = {};
        keys.forEach((key) => {
          let keyStr;
          let opts;
          if (typeof key === "string") {
            keyStr = key;
          } else if ("getValue" in key) {
            keyStr = key.key;
          } else if ("item" in key) {
            keyStr = key.item.key;
            opts = key.options;
          } else {
            keyStr = key.key;
            opts = key.options;
          }
          const { driverArea, driverKey } = resolveKey(keyStr);
          areaToKeysMap[driverArea] ?? (areaToKeysMap[driverArea] = []);
          areaToKeysMap[driverArea].push(driverKey);
          if (opts == null ? void 0 : opts.removeMeta) {
            areaToKeysMap[driverArea].push(getMetaKey(driverKey));
          }
        });
        await Promise.all(
          Object.entries(areaToKeysMap).map(async ([driverArea, keys2]) => {
            const driver = getDriver(driverArea);
            await driver.removeItems(keys2);
          })
        );
      },
      clear: async (base) => {
        const driver = getDriver(base);
        await driver.clear();
      },
      removeMeta: async (key, properties) => {
        const { driver, driverKey } = resolveKey(key);
        await removeMeta(driver, driverKey, properties);
      },
      snapshot: async (base, opts) => {
        var _a2;
        const driver = getDriver(base);
        const data = await driver.snapshot();
        (_a2 = opts == null ? void 0 : opts.excludeKeys) == null ? void 0 : _a2.forEach((key) => {
          delete data[key];
          delete data[getMetaKey(key)];
        });
        return data;
      },
      restoreSnapshot: async (base, data) => {
        const driver = getDriver(base);
        await driver.restoreSnapshot(data);
      },
      watch: (key, cb) => {
        const { driver, driverKey } = resolveKey(key);
        return watch(driver, driverKey, cb);
      },
      unwatch() {
        Object.values(drivers).forEach((driver) => {
          driver.unwatch();
        });
      },
      defineItem: (key, opts) => {
        const { driver, driverKey } = resolveKey(key);
        const { version: targetVersion = 1, migrations = {} } = opts ?? {};
        if (targetVersion < 1) {
          throw Error(
            "Storage item version cannot be less than 1. Initial versions should be set to 1, not 0."
          );
        }
        const migrate = async () => {
          var _a2;
          const driverMetaKey = getMetaKey(driverKey);
          const [{ value }, { value: meta }] = await driver.getItems([
            driverKey,
            driverMetaKey
          ]);
          if (value == null) return;
          const currentVersion = (meta == null ? void 0 : meta.v) ?? 1;
          if (currentVersion > targetVersion) {
            throw Error(
              `Version downgrade detected (v${currentVersion} -> v${targetVersion}) for "${key}"`
            );
          }
          if (currentVersion === targetVersion) {
            return;
          }
          console.debug(
            `[@wxt-dev/storage] Running storage migration for ${key}: v${currentVersion} -> v${targetVersion}`
          );
          const migrationsToRun = Array.from(
            { length: targetVersion - currentVersion },
            (_, i) => currentVersion + i + 1
          );
          let migratedValue = value;
          for (const migrateToVersion of migrationsToRun) {
            try {
              migratedValue = await ((_a2 = migrations == null ? void 0 : migrations[migrateToVersion]) == null ? void 0 : _a2.call(migrations, migratedValue)) ?? migratedValue;
            } catch (err) {
              throw new MigrationError(key, migrateToVersion, {
                cause: err
              });
            }
          }
          await driver.setItems([
            { key: driverKey, value: migratedValue },
            { key: driverMetaKey, value: { ...meta, v: targetVersion } }
          ]);
          console.debug(
            `[@wxt-dev/storage] Storage migration completed for ${key} v${targetVersion}`,
            { migratedValue }
          );
        };
        const migrationsDone = (opts == null ? void 0 : opts.migrations) == null ? Promise.resolve() : migrate().catch((err) => {
          console.error(
            `[@wxt-dev/storage] Migration failed for ${key}`,
            err
          );
        });
        const initMutex = new Mutex();
        const getFallback = () => (opts == null ? void 0 : opts.fallback) ?? (opts == null ? void 0 : opts.defaultValue) ?? null;
        const getOrInitValue = () => initMutex.runExclusive(async () => {
          const value = await driver.getItem(driverKey);
          if (value != null || (opts == null ? void 0 : opts.init) == null) return value;
          const newValue = await opts.init();
          await driver.setItem(driverKey, newValue);
          return newValue;
        });
        migrationsDone.then(getOrInitValue);
        return {
          key,
          get defaultValue() {
            return getFallback();
          },
          get fallback() {
            return getFallback();
          },
          getValue: async () => {
            await migrationsDone;
            if (opts == null ? void 0 : opts.init) {
              return await getOrInitValue();
            } else {
              return await getItem(driver, driverKey, opts);
            }
          },
          getMeta: async () => {
            await migrationsDone;
            return await getMeta(driver, driverKey);
          },
          setValue: async (value) => {
            await migrationsDone;
            return await setItem(driver, driverKey, value);
          },
          setMeta: async (properties) => {
            await migrationsDone;
            return await setMeta(driver, driverKey, properties);
          },
          removeValue: async (opts2) => {
            await migrationsDone;
            return await removeItem(driver, driverKey, opts2);
          },
          removeMeta: async (properties) => {
            await migrationsDone;
            return await removeMeta(driver, driverKey, properties);
          },
          watch: (cb) => watch(
            driver,
            driverKey,
            (newValue, oldValue) => cb(newValue ?? getFallback(), oldValue ?? getFallback())
          ),
          migrate
        };
      }
    };
    return storage2;
  }
  function createDriver(storageArea) {
    const getStorageArea = () => {
      if (browser.runtime == null) {
        throw Error(
          [
            "'wxt/storage' must be loaded in a web extension environment",
            "\n - If thrown during a build, see https://github.com/wxt-dev/wxt/issues/371",
            " - If thrown during tests, mock 'wxt/browser' correctly. See https://wxt.dev/guide/go-further/testing.html\n"
          ].join("\n")
        );
      }
      if (browser.storage == null) {
        throw Error(
          "You must add the 'storage' permission to your manifest to use 'wxt/storage'"
        );
      }
      const area = browser.storage[storageArea];
      if (area == null)
        throw Error(`"browser.storage.${storageArea}" is undefined`);
      return area;
    };
    const watchListeners = /* @__PURE__ */ new Set();
    return {
      getItem: async (key) => {
        const res = await getStorageArea().get(key);
        return res[key];
      },
      getItems: async (keys) => {
        const result2 = await getStorageArea().get(keys);
        return keys.map((key) => ({ key, value: result2[key] ?? null }));
      },
      setItem: async (key, value) => {
        if (value == null) {
          await getStorageArea().remove(key);
        } else {
          await getStorageArea().set({ [key]: value });
        }
      },
      setItems: async (values) => {
        const map = values.reduce(
          (map2, { key, value }) => {
            map2[key] = value;
            return map2;
          },
          {}
        );
        await getStorageArea().set(map);
      },
      removeItem: async (key) => {
        await getStorageArea().remove(key);
      },
      removeItems: async (keys) => {
        await getStorageArea().remove(keys);
      },
      clear: async () => {
        await getStorageArea().clear();
      },
      snapshot: async () => {
        return await getStorageArea().get();
      },
      restoreSnapshot: async (data) => {
        await getStorageArea().set(data);
      },
      watch(key, cb) {
        const listener = (changes) => {
          const change = changes[key];
          if (change == null) return;
          if (dequal(change.newValue, change.oldValue)) return;
          cb(change.newValue ?? null, change.oldValue ?? null);
        };
        getStorageArea().onChanged.addListener(listener);
        watchListeners.add(listener);
        return () => {
          getStorageArea().onChanged.removeListener(listener);
          watchListeners.delete(listener);
        };
      },
      unwatch() {
        watchListeners.forEach((listener) => {
          getStorageArea().onChanged.removeListener(listener);
        });
        watchListeners.clear();
      }
    };
  }
  class MigrationError extends Error {
    constructor(key, version, options) {
      super(`v${version} migration failed for "${key}"`, options);
      this.key = key;
      this.version = version;
    }
  }
  const byteToHex = [];
  for (let i = 0; i < 256; ++i) {
    byteToHex.push((i + 256).toString(16).slice(1));
  }
  function unsafeStringify(arr, offset = 0) {
    return (byteToHex[arr[offset + 0]] + byteToHex[arr[offset + 1]] + byteToHex[arr[offset + 2]] + byteToHex[arr[offset + 3]] + "-" + byteToHex[arr[offset + 4]] + byteToHex[arr[offset + 5]] + "-" + byteToHex[arr[offset + 6]] + byteToHex[arr[offset + 7]] + "-" + byteToHex[arr[offset + 8]] + byteToHex[arr[offset + 9]] + "-" + byteToHex[arr[offset + 10]] + byteToHex[arr[offset + 11]] + byteToHex[arr[offset + 12]] + byteToHex[arr[offset + 13]] + byteToHex[arr[offset + 14]] + byteToHex[arr[offset + 15]]).toLowerCase();
  }
  let getRandomValues;
  const rnds8 = new Uint8Array(16);
  function rng() {
    if (!getRandomValues) {
      if (typeof crypto === "undefined" || !crypto.getRandomValues) {
        throw new Error("crypto.getRandomValues() not supported. See https://github.com/uuidjs/uuid#getrandomvalues-not-supported");
      }
      getRandomValues = crypto.getRandomValues.bind(crypto);
    }
    return getRandomValues(rnds8);
  }
  const randomUUID = typeof crypto !== "undefined" && crypto.randomUUID && crypto.randomUUID.bind(crypto);
  const native = { randomUUID };
  function v4(options, buf, offset) {
    var _a2;
    if (native.randomUUID && true && !options) {
      return native.randomUUID();
    }
    options = options || {};
    const rnds = options.random ?? ((_a2 = options.rng) == null ? void 0 : _a2.call(options)) ?? rng();
    if (rnds.length < 16) {
      throw new Error("Random bytes length must be >= 16");
    }
    rnds[6] = rnds[6] & 15 | 64;
    rnds[8] = rnds[8] & 63 | 128;
    return unsafeStringify(rnds);
  }
  const newTabCommand = {
    id: "new-tab",
    name: "New Tab",
    description: "Open a new browser tab",
    context: "background",
    execute: async () => {
      await browser$1.tabs.create({ url: "about:newtab" });
      return "New tab opened.";
    },
    meta: { type: "browser", category: "tabs" },
    isEnabled: true,
    isUserDefined: false
  };
  background;
  const closeTabCommand = {
    id: "close-tab",
    name: "Close Tab",
    description: "Close the current tab",
    context: "background",
    // Note: Background executor needs to pass the 'tab' object from the sender
    execute: async (tab) => {
      if (tab == null ? void 0 : tab.id) {
        await browser$1.tabs.remove(tab.id);
        return "Tab closed.";
      }
      throw new Error("Could not determine the active tab to close.");
    },
    meta: { type: "browser", category: "tabs" },
    isEnabled: true,
    isUserDefined: false
  };
  background;
  const reloadTabCommand = {
    id: "cmd-reload-tab",
    name: "Reload Tab",
    description: "Reload the current tab",
    context: "background",
    execute: async (tab) => {
      if (tab == null ? void 0 : tab.id) {
        await browser$1.tabs.reload(tab.id);
        return "Tab reloaded.";
      }
      throw new Error("Could not determine the active tab to reload.");
    },
    meta: { type: "browser", category: "tabs" },
    isEnabled: true,
    isUserDefined: false
  };
  background;
  const listBookmarksCommand = {
    id: "cmd-list-bookmarks",
    name: "List Bookmarks",
    description: "Open the bookmarks section of the browser",
    context: "background",
    execute: async () => {
      await browser$1.windows.create({
        url: "chrome://bookmarks/",
        type: "popup"
      });
    },
    meta: { type: "browser", category: "bookmarks" },
    isEnabled: true,
    isUserDefined: false
  };
  background;
  const goBackCommand = {
    id: v4(),
    name: "Go Back",
    description: "Navigate back in history",
    context: "content",
    execute: () => {
      window.history.back();
      return "Navigated back.";
    },
    meta: { type: "page", category: "navigation" }
  };
  background;
  const goForwardCommand = {
    id: v4(),
    name: "Go Forward",
    description: "Navigate forward in history",
    context: "content",
    execute: () => {
      window.history.forward();
      return "Navigated forward.";
    },
    meta: { type: "page", category: "navigation" }
  };
  background;
  const copyTitleCommand = {
    id: v4(),
    name: "Copy Page Title",
    description: "Copy the current page title to clipboard",
    context: "content",
    execute: async () => {
      const title = document.title;
      await navigator.clipboard.writeText(title);
      return `Copied title: "${title}"`;
    },
    meta: { type: "page", category: "content" }
  };
  background;
  const downloadMarkdownCommand = {
    id: "cmd-download-markdown",
    name: "Download as Markdown",
    description: "Convert page content to Markdown and download",
    context: "content",
    execute: async () => {
      try {
        const title = document.title || "page";
        const content = document.body.innerText;
        const markdownContent = `# ${title}

${content.replace(/^#+\s/gm, "").replace(/\n{3,}/g, "\n\n")}`;
        const blob = new Blob([markdownContent], { type: "text/markdown" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${title.replace(/[^a-z0-9]/gi, "_").toLowerCase()}.md`;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }, 100);
        return `Downloaded "${title}" as markdown`;
      } catch (error) {
        console.error("Failed to download markdown:", error);
        throw new Error("Failed to convert page to markdown");
      }
    },
    meta: { type: "page", category: "content" },
    isEnabled: true,
    isUserDefined: false
  };
  background;
  const closeTabsRight = {
    id: "close-tabs-right",
    name: "Close Tabs to the Right",
    description: "Close all tabs to the right of the current tab",
    context: "background",
    execute: async () => {
      const tabs = await browser$1.tabs.query({ currentWindow: true });
      const currentTab = tabs.find((tab) => tab.active);
      if (!(currentTab == null ? void 0 : currentTab.id)) return;
      const tabsToClose = tabs.filter(
        (tab) => tab.index > currentTab.index && tab.id
      );
      await browser$1.tabs.remove(tabsToClose.map((tab) => tab.id));
      return { success: true, message: `Closed ${tabsToClose.length} tabs` };
    },
    isEnabled: true,
    isUserDefined: false,
    meta: { type: "browser", category: "tabs" }
  };
  background;
  const USER_COMMANDS_STORAGE_KEY = "user_commands";
  const SOURCE_OVERRIDES_STORAGE_KEY = "source_command_overrides";
  const userCommandsStorage = storage.defineItem(
    `local:${USER_COMMANDS_STORAGE_KEY}`,
    { fallback: [] }
  );
  const sourceOverridesStorage = storage.defineItem(`local:${SOURCE_OVERRIDES_STORAGE_KEY}`, { fallback: {} });
  const sourceCommandDefinitions = {
    "cmd-new-tab": newTabCommand,
    "cmd-close-tab": closeTabCommand,
    "cmd-reload-tab": reloadTabCommand,
    "cmd-list-bookmarks": listBookmarksCommand,
    "cmd-go-back": goBackCommand,
    "cmd-go-forward": goForwardCommand,
    "cmd-copy-title": copyTitleCommand,
    "cmd-download-markdown": downloadMarkdownCommand,
    "cmd-close-tabs-right": closeTabsRight
    // "cmd-toggle-dark-mode": toggleDarkModeCommand
  };
  function createFunctionFromString(script) {
    try {
      return new Function(
        "...args",
        `return (async (...args) => { ${script} })(...args);`
      );
    } catch (error) {
      console.error("Error creating function from string:", error);
      return () => Promise.reject(
        new Error(`Failed to compile user command script: ${error}`)
      );
    }
  }
  function mergeSourceWithOverride(id, sourceDef, overrideData) {
    const base = {
      ...sourceDef,
      id,
      isUserDefined: false,
      isEnabled: true
      // Default to enabled
    };
    if (overrideData) {
      return {
        ...base,
        name: overrideData.name !== void 0 ? overrideData.name : base.name,
        description: overrideData.description !== void 0 ? overrideData.description : base.description,
        isEnabled: overrideData.isEnabled !== void 0 ? overrideData.isEnabled : base.isEnabled,
        meta: overrideData.meta !== void 0 ? { ...base.meta || {}, ...overrideData.meta } : base.meta
      };
    }
    return base;
  }
  async function getCommandById(id) {
    const sourceDef = sourceCommandDefinitions[id];
    if (sourceDef) {
      const overrides = await sourceOverridesStorage.getValue();
      return mergeSourceWithOverride(id, sourceDef, overrides[id]);
    }
    const userCmdsStored = await userCommandsStorage.getValue();
    const userCmdStored = userCmdsStored.find((cmd) => cmd.id === id);
    if (userCmdStored) {
      return {
        ...userCmdStored,
        execute: createFunctionFromString(userCmdStored.executeScript),
        isUserDefined: true,
        isEnabled: userCmdStored.isEnabled !== void 0 ? userCmdStored.isEnabled : true
      };
    }
    return void 0;
  }
  background;
  console.log("Background script loaded.");
  const definition = defineBackground(async () => {
    browser$1.runtime.onInstalled.addListener(async (details) => {
      console.log("Extension installed or updated. Loading commands...");
      console.log("Commands loaded.");
    });
    browser$1.commands.onCommand.addListener(async (commandName) => {
      console.log(`Command received: ${commandName}`);
      if (commandName === "toggle_webprompt") {
        console.log("shortcut pressed");
        const [currentTab] = await browser$1.tabs.query({
          active: true,
          currentWindow: true
        });
        if (currentTab == null ? void 0 : currentTab.id) {
          console.log(`Sending toggle-ui message to tab ${currentTab.id}`);
          try {
            await browser$1.tabs.sendMessage(currentTab.id, {
              action: "toggle-ui"
            });
            console.log(`Message sent successfully to tab ${currentTab.id}`);
          } catch (error) {
            console.error(
              `Error checking/sending message to tab ${currentTab.id}:`,
              error
            );
          }
        } else {
          console.log("No active tab found or tab has no ID.");
        }
      }
    });
    browser$1.runtime.onMessage.addListener(
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
              error: `Failed to retrieve command: ${String(error)}`
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
              const response = await browser$1.tabs.sendMessage(sender.tab.id, {
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
              error: String(error)
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
      await browser$1.runtime.getPlatformInfo();
    }, 5e3);
  }
  function reloadContentScript(payload) {
    const manifest = browser$1.runtime.getManifest();
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
    const registered = await browser$1.scripting.getRegisteredContentScripts();
    logger.debug("Existing scripts:", registered);
    const existing = registered.find((cs) => cs.id === id);
    if (existing) {
      logger.debug("Updating content script", existing);
      await browser$1.scripting.updateContentScripts([{ ...contentScript, id }]);
    } else {
      logger.debug("Registering new content script...");
      await browser$1.scripting.registerContentScripts([{ ...contentScript, id }]);
    }
    await reloadTabsForContentScript(contentScript);
  }
  async function reloadRuntimeContentScriptMv3(contentScript) {
    logger.log("Reloading content script:", contentScript);
    const registered = await browser$1.scripting.getRegisteredContentScripts();
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
    await browser$1.scripting.updateContentScripts(matches);
    await reloadTabsForContentScript(contentScript);
  }
  async function reloadTabsForContentScript(contentScript) {
    const allTabs = await browser$1.tabs.query({});
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
          await browser$1.tabs.reload(tab.id);
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
        browser$1.runtime.reload();
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
    browser$1.commands.onCommand.addListener((command) => {
      if (command === "wxt:reload-extension") {
        browser$1.runtime.reload();
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYmFja2dyb3VuZC5qcyIsInNvdXJjZXMiOlsiLi4vLi4vbm9kZV9tb2R1bGVzLy5wbnBtL3d4dEAwLjIwLjNfQHR5cGVzK25vZGVAMjIuMTQuMV9qaXRpQDIuNC4yX2xpZ2h0bmluZ2Nzc0AxLjI5LjJfcm9sbHVwQDQuNDAuMC9ub2RlX21vZHVsZXMvd3h0L2Rpc3QvdXRpbHMvZGVmaW5lLWJhY2tncm91bmQubWpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzLy5wbnBtL0B3eHQtZGV2K2Jyb3dzZXJAMC4wLjMxNS9ub2RlX21vZHVsZXMvQHd4dC1kZXYvYnJvd3Nlci9zcmMvaW5kZXgubWpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzLy5wbnBtL3d4dEAwLjIwLjNfQHR5cGVzK25vZGVAMjIuMTQuMV9qaXRpQDIuNC4yX2xpZ2h0bmluZ2Nzc0AxLjI5LjJfcm9sbHVwQDQuNDAuMC9ub2RlX21vZHVsZXMvd3h0L2Rpc3QvYnJvd3Nlci5tanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvLnBucG0vZGVxdWFsQDIuMC4zL25vZGVfbW9kdWxlcy9kZXF1YWwvbGl0ZS9pbmRleC5tanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvLnBucG0vYXN5bmMtbXV0ZXhAMC41LjAvbm9kZV9tb2R1bGVzL2FzeW5jLW11dGV4L2luZGV4Lm1qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy8ucG5wbS9Ad3h0LWRlditzdG9yYWdlQDEuMS4xL25vZGVfbW9kdWxlcy9Ad3h0LWRldi9zdG9yYWdlL2Rpc3QvaW5kZXgubWpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzLy5wbnBtL3V1aWRAMTEuMS4wL25vZGVfbW9kdWxlcy91dWlkL2Rpc3QvZXNtLWJyb3dzZXIvc3RyaW5naWZ5LmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzLy5wbnBtL3V1aWRAMTEuMS4wL25vZGVfbW9kdWxlcy91dWlkL2Rpc3QvZXNtLWJyb3dzZXIvcm5nLmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzLy5wbnBtL3V1aWRAMTEuMS4wL25vZGVfbW9kdWxlcy91dWlkL2Rpc3QvZXNtLWJyb3dzZXIvbmF0aXZlLmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzLy5wbnBtL3V1aWRAMTEuMS4wL25vZGVfbW9kdWxlcy91dWlkL2Rpc3QvZXNtLWJyb3dzZXIvdjQuanMiLCIuLi8uLi9saWIvY29tbWFuZHMvbmV3LXRhYi50cyIsIi4uLy4uL2xpYi9jb21tYW5kcy9jbG9zZS10YWIudHMiLCIuLi8uLi9saWIvY29tbWFuZHMvcmVsb2FkLXRhYi50cyIsIi4uLy4uL2xpYi9jb21tYW5kcy9saXN0LWJvb2ttYXJrcy50cyIsIi4uLy4uL2xpYi9jb21tYW5kcy9nby1iYWNrLnRzIiwiLi4vLi4vbGliL2NvbW1hbmRzL2dvLWZvcndhcmQudHMiLCIuLi8uLi9saWIvY29tbWFuZHMvY29weS10aXRsZS50cyIsIi4uLy4uL2xpYi9jb21tYW5kcy9kb3dubG9hZC1tYXJrZG93bi50cyIsIi4uLy4uL2xpYi9jb21tYW5kcy9jbG9zZS10YWJzLXJpZ2h0cy50c3giLCIuLi8uLi9saWIvY29tbWFuZHMvaW5kZXgudHMiLCIuLi8uLi9lbnRyeXBvaW50cy9iYWNrZ3JvdW5kLnRzIiwiLi4vLi4vbm9kZV9tb2R1bGVzLy5wbnBtL0B3ZWJleHQtY29yZSttYXRjaC1wYXR0ZXJuc0AxLjAuMy9ub2RlX21vZHVsZXMvQHdlYmV4dC1jb3JlL21hdGNoLXBhdHRlcm5zL2xpYi9pbmRleC5qcyJdLCJzb3VyY2VzQ29udGVudCI6WyJleHBvcnQgZnVuY3Rpb24gZGVmaW5lQmFja2dyb3VuZChhcmcpIHtcbiAgaWYgKGFyZyA9PSBudWxsIHx8IHR5cGVvZiBhcmcgPT09IFwiZnVuY3Rpb25cIikgcmV0dXJuIHsgbWFpbjogYXJnIH07XG4gIHJldHVybiBhcmc7XG59XG4iLCIvLyAjcmVnaW9uIHNuaXBwZXRcbmV4cG9ydCBjb25zdCBicm93c2VyID0gZ2xvYmFsVGhpcy5icm93c2VyPy5ydW50aW1lPy5pZFxuICA/IGdsb2JhbFRoaXMuYnJvd3NlclxuICA6IGdsb2JhbFRoaXMuY2hyb21lO1xuLy8gI2VuZHJlZ2lvbiBzbmlwcGV0XG4iLCJpbXBvcnQgeyBicm93c2VyIGFzIF9icm93c2VyIH0gZnJvbSBcIkB3eHQtZGV2L2Jyb3dzZXJcIjtcbmV4cG9ydCBjb25zdCBicm93c2VyID0gX2Jyb3dzZXI7XG5leHBvcnQge307XG4iLCJ2YXIgaGFzID0gT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eTtcblxuZXhwb3J0IGZ1bmN0aW9uIGRlcXVhbChmb28sIGJhcikge1xuXHR2YXIgY3RvciwgbGVuO1xuXHRpZiAoZm9vID09PSBiYXIpIHJldHVybiB0cnVlO1xuXG5cdGlmIChmb28gJiYgYmFyICYmIChjdG9yPWZvby5jb25zdHJ1Y3RvcikgPT09IGJhci5jb25zdHJ1Y3Rvcikge1xuXHRcdGlmIChjdG9yID09PSBEYXRlKSByZXR1cm4gZm9vLmdldFRpbWUoKSA9PT0gYmFyLmdldFRpbWUoKTtcblx0XHRpZiAoY3RvciA9PT0gUmVnRXhwKSByZXR1cm4gZm9vLnRvU3RyaW5nKCkgPT09IGJhci50b1N0cmluZygpO1xuXG5cdFx0aWYgKGN0b3IgPT09IEFycmF5KSB7XG5cdFx0XHRpZiAoKGxlbj1mb28ubGVuZ3RoKSA9PT0gYmFyLmxlbmd0aCkge1xuXHRcdFx0XHR3aGlsZSAobGVuLS0gJiYgZGVxdWFsKGZvb1tsZW5dLCBiYXJbbGVuXSkpO1xuXHRcdFx0fVxuXHRcdFx0cmV0dXJuIGxlbiA9PT0gLTE7XG5cdFx0fVxuXG5cdFx0aWYgKCFjdG9yIHx8IHR5cGVvZiBmb28gPT09ICdvYmplY3QnKSB7XG5cdFx0XHRsZW4gPSAwO1xuXHRcdFx0Zm9yIChjdG9yIGluIGZvbykge1xuXHRcdFx0XHRpZiAoaGFzLmNhbGwoZm9vLCBjdG9yKSAmJiArK2xlbiAmJiAhaGFzLmNhbGwoYmFyLCBjdG9yKSkgcmV0dXJuIGZhbHNlO1xuXHRcdFx0XHRpZiAoIShjdG9yIGluIGJhcikgfHwgIWRlcXVhbChmb29bY3Rvcl0sIGJhcltjdG9yXSkpIHJldHVybiBmYWxzZTtcblx0XHRcdH1cblx0XHRcdHJldHVybiBPYmplY3Qua2V5cyhiYXIpLmxlbmd0aCA9PT0gbGVuO1xuXHRcdH1cblx0fVxuXG5cdHJldHVybiBmb28gIT09IGZvbyAmJiBiYXIgIT09IGJhcjtcbn1cbiIsImNvbnN0IEVfVElNRU9VVCA9IG5ldyBFcnJvcigndGltZW91dCB3aGlsZSB3YWl0aW5nIGZvciBtdXRleCB0byBiZWNvbWUgYXZhaWxhYmxlJyk7XG5jb25zdCBFX0FMUkVBRFlfTE9DS0VEID0gbmV3IEVycm9yKCdtdXRleCBhbHJlYWR5IGxvY2tlZCcpO1xuY29uc3QgRV9DQU5DRUxFRCA9IG5ldyBFcnJvcigncmVxdWVzdCBmb3IgbG9jayBjYW5jZWxlZCcpO1xuXG52YXIgX19hd2FpdGVyJDIgPSAodW5kZWZpbmVkICYmIHVuZGVmaW5lZC5fX2F3YWl0ZXIpIHx8IGZ1bmN0aW9uICh0aGlzQXJnLCBfYXJndW1lbnRzLCBQLCBnZW5lcmF0b3IpIHtcbiAgICBmdW5jdGlvbiBhZG9wdCh2YWx1ZSkgeyByZXR1cm4gdmFsdWUgaW5zdGFuY2VvZiBQID8gdmFsdWUgOiBuZXcgUChmdW5jdGlvbiAocmVzb2x2ZSkgeyByZXNvbHZlKHZhbHVlKTsgfSk7IH1cbiAgICByZXR1cm4gbmV3IChQIHx8IChQID0gUHJvbWlzZSkpKGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgICAgZnVuY3Rpb24gZnVsZmlsbGVkKHZhbHVlKSB7IHRyeSB7IHN0ZXAoZ2VuZXJhdG9yLm5leHQodmFsdWUpKTsgfSBjYXRjaCAoZSkgeyByZWplY3QoZSk7IH0gfVxuICAgICAgICBmdW5jdGlvbiByZWplY3RlZCh2YWx1ZSkgeyB0cnkgeyBzdGVwKGdlbmVyYXRvcltcInRocm93XCJdKHZhbHVlKSk7IH0gY2F0Y2ggKGUpIHsgcmVqZWN0KGUpOyB9IH1cbiAgICAgICAgZnVuY3Rpb24gc3RlcChyZXN1bHQpIHsgcmVzdWx0LmRvbmUgPyByZXNvbHZlKHJlc3VsdC52YWx1ZSkgOiBhZG9wdChyZXN1bHQudmFsdWUpLnRoZW4oZnVsZmlsbGVkLCByZWplY3RlZCk7IH1cbiAgICAgICAgc3RlcCgoZ2VuZXJhdG9yID0gZ2VuZXJhdG9yLmFwcGx5KHRoaXNBcmcsIF9hcmd1bWVudHMgfHwgW10pKS5uZXh0KCkpO1xuICAgIH0pO1xufTtcbmNsYXNzIFNlbWFwaG9yZSB7XG4gICAgY29uc3RydWN0b3IoX3ZhbHVlLCBfY2FuY2VsRXJyb3IgPSBFX0NBTkNFTEVEKSB7XG4gICAgICAgIHRoaXMuX3ZhbHVlID0gX3ZhbHVlO1xuICAgICAgICB0aGlzLl9jYW5jZWxFcnJvciA9IF9jYW5jZWxFcnJvcjtcbiAgICAgICAgdGhpcy5fcXVldWUgPSBbXTtcbiAgICAgICAgdGhpcy5fd2VpZ2h0ZWRXYWl0ZXJzID0gW107XG4gICAgfVxuICAgIGFjcXVpcmUod2VpZ2h0ID0gMSwgcHJpb3JpdHkgPSAwKSB7XG4gICAgICAgIGlmICh3ZWlnaHQgPD0gMClcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgaW52YWxpZCB3ZWlnaHQgJHt3ZWlnaHR9OiBtdXN0IGJlIHBvc2l0aXZlYCk7XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgICAgICBjb25zdCB0YXNrID0geyByZXNvbHZlLCByZWplY3QsIHdlaWdodCwgcHJpb3JpdHkgfTtcbiAgICAgICAgICAgIGNvbnN0IGkgPSBmaW5kSW5kZXhGcm9tRW5kKHRoaXMuX3F1ZXVlLCAob3RoZXIpID0+IHByaW9yaXR5IDw9IG90aGVyLnByaW9yaXR5KTtcbiAgICAgICAgICAgIGlmIChpID09PSAtMSAmJiB3ZWlnaHQgPD0gdGhpcy5fdmFsdWUpIHtcbiAgICAgICAgICAgICAgICAvLyBOZWVkcyBpbW1lZGlhdGUgZGlzcGF0Y2gsIHNraXAgdGhlIHF1ZXVlXG4gICAgICAgICAgICAgICAgdGhpcy5fZGlzcGF0Y2hJdGVtKHRhc2spO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgdGhpcy5fcXVldWUuc3BsaWNlKGkgKyAxLCAwLCB0YXNrKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfVxuICAgIHJ1bkV4Y2x1c2l2ZShjYWxsYmFja18xKSB7XG4gICAgICAgIHJldHVybiBfX2F3YWl0ZXIkMih0aGlzLCBhcmd1bWVudHMsIHZvaWQgMCwgZnVuY3Rpb24qIChjYWxsYmFjaywgd2VpZ2h0ID0gMSwgcHJpb3JpdHkgPSAwKSB7XG4gICAgICAgICAgICBjb25zdCBbdmFsdWUsIHJlbGVhc2VdID0geWllbGQgdGhpcy5hY3F1aXJlKHdlaWdodCwgcHJpb3JpdHkpO1xuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICByZXR1cm4geWllbGQgY2FsbGJhY2sodmFsdWUpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZmluYWxseSB7XG4gICAgICAgICAgICAgICAgcmVsZWFzZSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9XG4gICAgd2FpdEZvclVubG9jayh3ZWlnaHQgPSAxLCBwcmlvcml0eSA9IDApIHtcbiAgICAgICAgaWYgKHdlaWdodCA8PSAwKVxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBpbnZhbGlkIHdlaWdodCAke3dlaWdodH06IG11c3QgYmUgcG9zaXRpdmVgKTtcbiAgICAgICAgaWYgKHRoaXMuX2NvdWxkTG9ja0ltbWVkaWF0ZWx5KHdlaWdodCwgcHJpb3JpdHkpKSB7XG4gICAgICAgICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKCk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUpID0+IHtcbiAgICAgICAgICAgICAgICBpZiAoIXRoaXMuX3dlaWdodGVkV2FpdGVyc1t3ZWlnaHQgLSAxXSlcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fd2VpZ2h0ZWRXYWl0ZXJzW3dlaWdodCAtIDFdID0gW107XG4gICAgICAgICAgICAgICAgaW5zZXJ0U29ydGVkKHRoaXMuX3dlaWdodGVkV2FpdGVyc1t3ZWlnaHQgLSAxXSwgeyByZXNvbHZlLCBwcmlvcml0eSB9KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfVxuICAgIGlzTG9ja2VkKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fdmFsdWUgPD0gMDtcbiAgICB9XG4gICAgZ2V0VmFsdWUoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl92YWx1ZTtcbiAgICB9XG4gICAgc2V0VmFsdWUodmFsdWUpIHtcbiAgICAgICAgdGhpcy5fdmFsdWUgPSB2YWx1ZTtcbiAgICAgICAgdGhpcy5fZGlzcGF0Y2hRdWV1ZSgpO1xuICAgIH1cbiAgICByZWxlYXNlKHdlaWdodCA9IDEpIHtcbiAgICAgICAgaWYgKHdlaWdodCA8PSAwKVxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBpbnZhbGlkIHdlaWdodCAke3dlaWdodH06IG11c3QgYmUgcG9zaXRpdmVgKTtcbiAgICAgICAgdGhpcy5fdmFsdWUgKz0gd2VpZ2h0O1xuICAgICAgICB0aGlzLl9kaXNwYXRjaFF1ZXVlKCk7XG4gICAgfVxuICAgIGNhbmNlbCgpIHtcbiAgICAgICAgdGhpcy5fcXVldWUuZm9yRWFjaCgoZW50cnkpID0+IGVudHJ5LnJlamVjdCh0aGlzLl9jYW5jZWxFcnJvcikpO1xuICAgICAgICB0aGlzLl9xdWV1ZSA9IFtdO1xuICAgIH1cbiAgICBfZGlzcGF0Y2hRdWV1ZSgpIHtcbiAgICAgICAgdGhpcy5fZHJhaW5VbmxvY2tXYWl0ZXJzKCk7XG4gICAgICAgIHdoaWxlICh0aGlzLl9xdWV1ZS5sZW5ndGggPiAwICYmIHRoaXMuX3F1ZXVlWzBdLndlaWdodCA8PSB0aGlzLl92YWx1ZSkge1xuICAgICAgICAgICAgdGhpcy5fZGlzcGF0Y2hJdGVtKHRoaXMuX3F1ZXVlLnNoaWZ0KCkpO1xuICAgICAgICAgICAgdGhpcy5fZHJhaW5VbmxvY2tXYWl0ZXJzKCk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgX2Rpc3BhdGNoSXRlbShpdGVtKSB7XG4gICAgICAgIGNvbnN0IHByZXZpb3VzVmFsdWUgPSB0aGlzLl92YWx1ZTtcbiAgICAgICAgdGhpcy5fdmFsdWUgLT0gaXRlbS53ZWlnaHQ7XG4gICAgICAgIGl0ZW0ucmVzb2x2ZShbcHJldmlvdXNWYWx1ZSwgdGhpcy5fbmV3UmVsZWFzZXIoaXRlbS53ZWlnaHQpXSk7XG4gICAgfVxuICAgIF9uZXdSZWxlYXNlcih3ZWlnaHQpIHtcbiAgICAgICAgbGV0IGNhbGxlZCA9IGZhbHNlO1xuICAgICAgICByZXR1cm4gKCkgPT4ge1xuICAgICAgICAgICAgaWYgKGNhbGxlZClcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICBjYWxsZWQgPSB0cnVlO1xuICAgICAgICAgICAgdGhpcy5yZWxlYXNlKHdlaWdodCk7XG4gICAgICAgIH07XG4gICAgfVxuICAgIF9kcmFpblVubG9ja1dhaXRlcnMoKSB7XG4gICAgICAgIGlmICh0aGlzLl9xdWV1ZS5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgIGZvciAobGV0IHdlaWdodCA9IHRoaXMuX3ZhbHVlOyB3ZWlnaHQgPiAwOyB3ZWlnaHQtLSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IHdhaXRlcnMgPSB0aGlzLl93ZWlnaHRlZFdhaXRlcnNbd2VpZ2h0IC0gMV07XG4gICAgICAgICAgICAgICAgaWYgKCF3YWl0ZXJzKVxuICAgICAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgICAgICB3YWl0ZXJzLmZvckVhY2goKHdhaXRlcikgPT4gd2FpdGVyLnJlc29sdmUoKSk7XG4gICAgICAgICAgICAgICAgdGhpcy5fd2VpZ2h0ZWRXYWl0ZXJzW3dlaWdodCAtIDFdID0gW107XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBjb25zdCBxdWV1ZWRQcmlvcml0eSA9IHRoaXMuX3F1ZXVlWzBdLnByaW9yaXR5O1xuICAgICAgICAgICAgZm9yIChsZXQgd2VpZ2h0ID0gdGhpcy5fdmFsdWU7IHdlaWdodCA+IDA7IHdlaWdodC0tKSB7XG4gICAgICAgICAgICAgICAgY29uc3Qgd2FpdGVycyA9IHRoaXMuX3dlaWdodGVkV2FpdGVyc1t3ZWlnaHQgLSAxXTtcbiAgICAgICAgICAgICAgICBpZiAoIXdhaXRlcnMpXG4gICAgICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgICAgIGNvbnN0IGkgPSB3YWl0ZXJzLmZpbmRJbmRleCgod2FpdGVyKSA9PiB3YWl0ZXIucHJpb3JpdHkgPD0gcXVldWVkUHJpb3JpdHkpO1xuICAgICAgICAgICAgICAgIChpID09PSAtMSA/IHdhaXRlcnMgOiB3YWl0ZXJzLnNwbGljZSgwLCBpKSlcbiAgICAgICAgICAgICAgICAgICAgLmZvckVhY2goKHdhaXRlciA9PiB3YWl0ZXIucmVzb2x2ZSgpKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG4gICAgX2NvdWxkTG9ja0ltbWVkaWF0ZWx5KHdlaWdodCwgcHJpb3JpdHkpIHtcbiAgICAgICAgcmV0dXJuICh0aGlzLl9xdWV1ZS5sZW5ndGggPT09IDAgfHwgdGhpcy5fcXVldWVbMF0ucHJpb3JpdHkgPCBwcmlvcml0eSkgJiZcbiAgICAgICAgICAgIHdlaWdodCA8PSB0aGlzLl92YWx1ZTtcbiAgICB9XG59XG5mdW5jdGlvbiBpbnNlcnRTb3J0ZWQoYSwgdikge1xuICAgIGNvbnN0IGkgPSBmaW5kSW5kZXhGcm9tRW5kKGEsIChvdGhlcikgPT4gdi5wcmlvcml0eSA8PSBvdGhlci5wcmlvcml0eSk7XG4gICAgYS5zcGxpY2UoaSArIDEsIDAsIHYpO1xufVxuZnVuY3Rpb24gZmluZEluZGV4RnJvbUVuZChhLCBwcmVkaWNhdGUpIHtcbiAgICBmb3IgKGxldCBpID0gYS5sZW5ndGggLSAxOyBpID49IDA7IGktLSkge1xuICAgICAgICBpZiAocHJlZGljYXRlKGFbaV0pKSB7XG4gICAgICAgICAgICByZXR1cm4gaTtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gLTE7XG59XG5cbnZhciBfX2F3YWl0ZXIkMSA9ICh1bmRlZmluZWQgJiYgdW5kZWZpbmVkLl9fYXdhaXRlcikgfHwgZnVuY3Rpb24gKHRoaXNBcmcsIF9hcmd1bWVudHMsIFAsIGdlbmVyYXRvcikge1xuICAgIGZ1bmN0aW9uIGFkb3B0KHZhbHVlKSB7IHJldHVybiB2YWx1ZSBpbnN0YW5jZW9mIFAgPyB2YWx1ZSA6IG5ldyBQKGZ1bmN0aW9uIChyZXNvbHZlKSB7IHJlc29sdmUodmFsdWUpOyB9KTsgfVxuICAgIHJldHVybiBuZXcgKFAgfHwgKFAgPSBQcm9taXNlKSkoZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xuICAgICAgICBmdW5jdGlvbiBmdWxmaWxsZWQodmFsdWUpIHsgdHJ5IHsgc3RlcChnZW5lcmF0b3IubmV4dCh2YWx1ZSkpOyB9IGNhdGNoIChlKSB7IHJlamVjdChlKTsgfSB9XG4gICAgICAgIGZ1bmN0aW9uIHJlamVjdGVkKHZhbHVlKSB7IHRyeSB7IHN0ZXAoZ2VuZXJhdG9yW1widGhyb3dcIl0odmFsdWUpKTsgfSBjYXRjaCAoZSkgeyByZWplY3QoZSk7IH0gfVxuICAgICAgICBmdW5jdGlvbiBzdGVwKHJlc3VsdCkgeyByZXN1bHQuZG9uZSA/IHJlc29sdmUocmVzdWx0LnZhbHVlKSA6IGFkb3B0KHJlc3VsdC52YWx1ZSkudGhlbihmdWxmaWxsZWQsIHJlamVjdGVkKTsgfVxuICAgICAgICBzdGVwKChnZW5lcmF0b3IgPSBnZW5lcmF0b3IuYXBwbHkodGhpc0FyZywgX2FyZ3VtZW50cyB8fCBbXSkpLm5leHQoKSk7XG4gICAgfSk7XG59O1xuY2xhc3MgTXV0ZXgge1xuICAgIGNvbnN0cnVjdG9yKGNhbmNlbEVycm9yKSB7XG4gICAgICAgIHRoaXMuX3NlbWFwaG9yZSA9IG5ldyBTZW1hcGhvcmUoMSwgY2FuY2VsRXJyb3IpO1xuICAgIH1cbiAgICBhY3F1aXJlKCkge1xuICAgICAgICByZXR1cm4gX19hd2FpdGVyJDEodGhpcywgYXJndW1lbnRzLCB2b2lkIDAsIGZ1bmN0aW9uKiAocHJpb3JpdHkgPSAwKSB7XG4gICAgICAgICAgICBjb25zdCBbLCByZWxlYXNlcl0gPSB5aWVsZCB0aGlzLl9zZW1hcGhvcmUuYWNxdWlyZSgxLCBwcmlvcml0eSk7XG4gICAgICAgICAgICByZXR1cm4gcmVsZWFzZXI7XG4gICAgICAgIH0pO1xuICAgIH1cbiAgICBydW5FeGNsdXNpdmUoY2FsbGJhY2ssIHByaW9yaXR5ID0gMCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fc2VtYXBob3JlLnJ1bkV4Y2x1c2l2ZSgoKSA9PiBjYWxsYmFjaygpLCAxLCBwcmlvcml0eSk7XG4gICAgfVxuICAgIGlzTG9ja2VkKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fc2VtYXBob3JlLmlzTG9ja2VkKCk7XG4gICAgfVxuICAgIHdhaXRGb3JVbmxvY2socHJpb3JpdHkgPSAwKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9zZW1hcGhvcmUud2FpdEZvclVubG9jaygxLCBwcmlvcml0eSk7XG4gICAgfVxuICAgIHJlbGVhc2UoKSB7XG4gICAgICAgIGlmICh0aGlzLl9zZW1hcGhvcmUuaXNMb2NrZWQoKSlcbiAgICAgICAgICAgIHRoaXMuX3NlbWFwaG9yZS5yZWxlYXNlKCk7XG4gICAgfVxuICAgIGNhbmNlbCgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3NlbWFwaG9yZS5jYW5jZWwoKTtcbiAgICB9XG59XG5cbnZhciBfX2F3YWl0ZXIgPSAodW5kZWZpbmVkICYmIHVuZGVmaW5lZC5fX2F3YWl0ZXIpIHx8IGZ1bmN0aW9uICh0aGlzQXJnLCBfYXJndW1lbnRzLCBQLCBnZW5lcmF0b3IpIHtcbiAgICBmdW5jdGlvbiBhZG9wdCh2YWx1ZSkgeyByZXR1cm4gdmFsdWUgaW5zdGFuY2VvZiBQID8gdmFsdWUgOiBuZXcgUChmdW5jdGlvbiAocmVzb2x2ZSkgeyByZXNvbHZlKHZhbHVlKTsgfSk7IH1cbiAgICByZXR1cm4gbmV3IChQIHx8IChQID0gUHJvbWlzZSkpKGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgICAgZnVuY3Rpb24gZnVsZmlsbGVkKHZhbHVlKSB7IHRyeSB7IHN0ZXAoZ2VuZXJhdG9yLm5leHQodmFsdWUpKTsgfSBjYXRjaCAoZSkgeyByZWplY3QoZSk7IH0gfVxuICAgICAgICBmdW5jdGlvbiByZWplY3RlZCh2YWx1ZSkgeyB0cnkgeyBzdGVwKGdlbmVyYXRvcltcInRocm93XCJdKHZhbHVlKSk7IH0gY2F0Y2ggKGUpIHsgcmVqZWN0KGUpOyB9IH1cbiAgICAgICAgZnVuY3Rpb24gc3RlcChyZXN1bHQpIHsgcmVzdWx0LmRvbmUgPyByZXNvbHZlKHJlc3VsdC52YWx1ZSkgOiBhZG9wdChyZXN1bHQudmFsdWUpLnRoZW4oZnVsZmlsbGVkLCByZWplY3RlZCk7IH1cbiAgICAgICAgc3RlcCgoZ2VuZXJhdG9yID0gZ2VuZXJhdG9yLmFwcGx5KHRoaXNBcmcsIF9hcmd1bWVudHMgfHwgW10pKS5uZXh0KCkpO1xuICAgIH0pO1xufTtcbmZ1bmN0aW9uIHdpdGhUaW1lb3V0KHN5bmMsIHRpbWVvdXQsIHRpbWVvdXRFcnJvciA9IEVfVElNRU9VVCkge1xuICAgIHJldHVybiB7XG4gICAgICAgIGFjcXVpcmU6ICh3ZWlnaHRPclByaW9yaXR5LCBwcmlvcml0eSkgPT4ge1xuICAgICAgICAgICAgbGV0IHdlaWdodDtcbiAgICAgICAgICAgIGlmIChpc1NlbWFwaG9yZShzeW5jKSkge1xuICAgICAgICAgICAgICAgIHdlaWdodCA9IHdlaWdodE9yUHJpb3JpdHk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICB3ZWlnaHQgPSB1bmRlZmluZWQ7XG4gICAgICAgICAgICAgICAgcHJpb3JpdHkgPSB3ZWlnaHRPclByaW9yaXR5O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHdlaWdodCAhPT0gdW5kZWZpbmVkICYmIHdlaWdodCA8PSAwKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBpbnZhbGlkIHdlaWdodCAke3dlaWdodH06IG11c3QgYmUgcG9zaXRpdmVgKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiBfX2F3YWl0ZXIodGhpcywgdm9pZCAwLCB2b2lkIDAsIGZ1bmN0aW9uKiAoKSB7XG4gICAgICAgICAgICAgICAgbGV0IGlzVGltZW91dCA9IGZhbHNlO1xuICAgICAgICAgICAgICAgIGNvbnN0IGhhbmRsZSA9IHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBpc1RpbWVvdXQgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICByZWplY3QodGltZW91dEVycm9yKTtcbiAgICAgICAgICAgICAgICB9LCB0aW1lb3V0KTtcbiAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCB0aWNrZXQgPSB5aWVsZCAoaXNTZW1hcGhvcmUoc3luYylcbiAgICAgICAgICAgICAgICAgICAgICAgID8gc3luYy5hY3F1aXJlKHdlaWdodCwgcHJpb3JpdHkpXG4gICAgICAgICAgICAgICAgICAgICAgICA6IHN5bmMuYWNxdWlyZShwcmlvcml0eSkpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoaXNUaW1lb3V0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCByZWxlYXNlID0gQXJyYXkuaXNBcnJheSh0aWNrZXQpID8gdGlja2V0WzFdIDogdGlja2V0O1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVsZWFzZSgpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgY2xlYXJUaW1lb3V0KGhhbmRsZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHRpY2tldCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFpc1RpbWVvdXQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNsZWFyVGltZW91dChoYW5kbGUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVqZWN0KGUpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSkpO1xuICAgICAgICB9LFxuICAgICAgICBydW5FeGNsdXNpdmUoY2FsbGJhY2ssIHdlaWdodCwgcHJpb3JpdHkpIHtcbiAgICAgICAgICAgIHJldHVybiBfX2F3YWl0ZXIodGhpcywgdm9pZCAwLCB2b2lkIDAsIGZ1bmN0aW9uKiAoKSB7XG4gICAgICAgICAgICAgICAgbGV0IHJlbGVhc2UgPSAoKSA9PiB1bmRlZmluZWQ7XG4gICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgdGlja2V0ID0geWllbGQgdGhpcy5hY3F1aXJlKHdlaWdodCwgcHJpb3JpdHkpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoQXJyYXkuaXNBcnJheSh0aWNrZXQpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZWxlYXNlID0gdGlja2V0WzFdO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHlpZWxkIGNhbGxiYWNrKHRpY2tldFswXSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZWxlYXNlID0gdGlja2V0O1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHlpZWxkIGNhbGxiYWNrKCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZmluYWxseSB7XG4gICAgICAgICAgICAgICAgICAgIHJlbGVhc2UoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSxcbiAgICAgICAgcmVsZWFzZSh3ZWlnaHQpIHtcbiAgICAgICAgICAgIHN5bmMucmVsZWFzZSh3ZWlnaHQpO1xuICAgICAgICB9LFxuICAgICAgICBjYW5jZWwoKSB7XG4gICAgICAgICAgICByZXR1cm4gc3luYy5jYW5jZWwoKTtcbiAgICAgICAgfSxcbiAgICAgICAgd2FpdEZvclVubG9jazogKHdlaWdodE9yUHJpb3JpdHksIHByaW9yaXR5KSA9PiB7XG4gICAgICAgICAgICBsZXQgd2VpZ2h0O1xuICAgICAgICAgICAgaWYgKGlzU2VtYXBob3JlKHN5bmMpKSB7XG4gICAgICAgICAgICAgICAgd2VpZ2h0ID0gd2VpZ2h0T3JQcmlvcml0eTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIHdlaWdodCA9IHVuZGVmaW5lZDtcbiAgICAgICAgICAgICAgICBwcmlvcml0eSA9IHdlaWdodE9yUHJpb3JpdHk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAod2VpZ2h0ICE9PSB1bmRlZmluZWQgJiYgd2VpZ2h0IDw9IDApIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYGludmFsaWQgd2VpZ2h0ICR7d2VpZ2h0fTogbXVzdCBiZSBwb3NpdGl2ZWApO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgICAgICAgICAgICBjb25zdCBoYW5kbGUgPSBzZXRUaW1lb3V0KCgpID0+IHJlamVjdCh0aW1lb3V0RXJyb3IpLCB0aW1lb3V0KTtcbiAgICAgICAgICAgICAgICAoaXNTZW1hcGhvcmUoc3luYylcbiAgICAgICAgICAgICAgICAgICAgPyBzeW5jLndhaXRGb3JVbmxvY2sod2VpZ2h0LCBwcmlvcml0eSlcbiAgICAgICAgICAgICAgICAgICAgOiBzeW5jLndhaXRGb3JVbmxvY2socHJpb3JpdHkpKS50aGVuKCgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgY2xlYXJUaW1lb3V0KGhhbmRsZSk7XG4gICAgICAgICAgICAgICAgICAgIHJlc29sdmUoKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9LFxuICAgICAgICBpc0xvY2tlZDogKCkgPT4gc3luYy5pc0xvY2tlZCgpLFxuICAgICAgICBnZXRWYWx1ZTogKCkgPT4gc3luYy5nZXRWYWx1ZSgpLFxuICAgICAgICBzZXRWYWx1ZTogKHZhbHVlKSA9PiBzeW5jLnNldFZhbHVlKHZhbHVlKSxcbiAgICB9O1xufVxuZnVuY3Rpb24gaXNTZW1hcGhvcmUoc3luYykge1xuICAgIHJldHVybiBzeW5jLmdldFZhbHVlICE9PSB1bmRlZmluZWQ7XG59XG5cbi8vIGVzbGludC1kaXNhYmxlLW5leHQtbGlzbmUgQHR5cGVzY3JpcHQtZXNsaW50L2V4cGxpY2l0LW1vZHVsZS1ib3VuZGFyeS10eXBlc1xuZnVuY3Rpb24gdHJ5QWNxdWlyZShzeW5jLCBhbHJlYWR5QWNxdWlyZWRFcnJvciA9IEVfQUxSRUFEWV9MT0NLRUQpIHtcbiAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLWV4cGxpY2l0LWFueVxuICAgIHJldHVybiB3aXRoVGltZW91dChzeW5jLCAwLCBhbHJlYWR5QWNxdWlyZWRFcnJvcik7XG59XG5cbmV4cG9ydCB7IEVfQUxSRUFEWV9MT0NLRUQsIEVfQ0FOQ0VMRUQsIEVfVElNRU9VVCwgTXV0ZXgsIFNlbWFwaG9yZSwgdHJ5QWNxdWlyZSwgd2l0aFRpbWVvdXQgfTtcbiIsImltcG9ydCB7IGRlcXVhbCB9IGZyb20gJ2RlcXVhbC9saXRlJztcbmltcG9ydCB7IE11dGV4IH0gZnJvbSAnYXN5bmMtbXV0ZXgnO1xuXG5jb25zdCBicm93c2VyID0gKFxuICAvLyBAdHMtZXhwZWN0LWVycm9yXG4gIGdsb2JhbFRoaXMuYnJvd3Nlcj8ucnVudGltZT8uaWQgPT0gbnVsbCA/IGdsb2JhbFRoaXMuY2hyb21lIDogKFxuICAgIC8vIEB0cy1leHBlY3QtZXJyb3JcbiAgICBnbG9iYWxUaGlzLmJyb3dzZXJcbiAgKVxuKTtcbmNvbnN0IHN0b3JhZ2UgPSBjcmVhdGVTdG9yYWdlKCk7XG5mdW5jdGlvbiBjcmVhdGVTdG9yYWdlKCkge1xuICBjb25zdCBkcml2ZXJzID0ge1xuICAgIGxvY2FsOiBjcmVhdGVEcml2ZXIoXCJsb2NhbFwiKSxcbiAgICBzZXNzaW9uOiBjcmVhdGVEcml2ZXIoXCJzZXNzaW9uXCIpLFxuICAgIHN5bmM6IGNyZWF0ZURyaXZlcihcInN5bmNcIiksXG4gICAgbWFuYWdlZDogY3JlYXRlRHJpdmVyKFwibWFuYWdlZFwiKVxuICB9O1xuICBjb25zdCBnZXREcml2ZXIgPSAoYXJlYSkgPT4ge1xuICAgIGNvbnN0IGRyaXZlciA9IGRyaXZlcnNbYXJlYV07XG4gICAgaWYgKGRyaXZlciA9PSBudWxsKSB7XG4gICAgICBjb25zdCBhcmVhTmFtZXMgPSBPYmplY3Qua2V5cyhkcml2ZXJzKS5qb2luKFwiLCBcIik7XG4gICAgICB0aHJvdyBFcnJvcihgSW52YWxpZCBhcmVhIFwiJHthcmVhfVwiLiBPcHRpb25zOiAke2FyZWFOYW1lc31gKTtcbiAgICB9XG4gICAgcmV0dXJuIGRyaXZlcjtcbiAgfTtcbiAgY29uc3QgcmVzb2x2ZUtleSA9IChrZXkpID0+IHtcbiAgICBjb25zdCBkZWxpbWluYXRvckluZGV4ID0ga2V5LmluZGV4T2YoXCI6XCIpO1xuICAgIGNvbnN0IGRyaXZlckFyZWEgPSBrZXkuc3Vic3RyaW5nKDAsIGRlbGltaW5hdG9ySW5kZXgpO1xuICAgIGNvbnN0IGRyaXZlcktleSA9IGtleS5zdWJzdHJpbmcoZGVsaW1pbmF0b3JJbmRleCArIDEpO1xuICAgIGlmIChkcml2ZXJLZXkgPT0gbnVsbClcbiAgICAgIHRocm93IEVycm9yKFxuICAgICAgICBgU3RvcmFnZSBrZXkgc2hvdWxkIGJlIGluIHRoZSBmb3JtIG9mIFwiYXJlYTprZXlcIiwgYnV0IHJlY2VpdmVkIFwiJHtrZXl9XCJgXG4gICAgICApO1xuICAgIHJldHVybiB7XG4gICAgICBkcml2ZXJBcmVhLFxuICAgICAgZHJpdmVyS2V5LFxuICAgICAgZHJpdmVyOiBnZXREcml2ZXIoZHJpdmVyQXJlYSlcbiAgICB9O1xuICB9O1xuICBjb25zdCBnZXRNZXRhS2V5ID0gKGtleSkgPT4ga2V5ICsgXCIkXCI7XG4gIGNvbnN0IG1lcmdlTWV0YSA9IChvbGRNZXRhLCBuZXdNZXRhKSA9PiB7XG4gICAgY29uc3QgbmV3RmllbGRzID0geyAuLi5vbGRNZXRhIH07XG4gICAgT2JqZWN0LmVudHJpZXMobmV3TWV0YSkuZm9yRWFjaCgoW2tleSwgdmFsdWVdKSA9PiB7XG4gICAgICBpZiAodmFsdWUgPT0gbnVsbCkgZGVsZXRlIG5ld0ZpZWxkc1trZXldO1xuICAgICAgZWxzZSBuZXdGaWVsZHNba2V5XSA9IHZhbHVlO1xuICAgIH0pO1xuICAgIHJldHVybiBuZXdGaWVsZHM7XG4gIH07XG4gIGNvbnN0IGdldFZhbHVlT3JGYWxsYmFjayA9ICh2YWx1ZSwgZmFsbGJhY2spID0+IHZhbHVlID8/IGZhbGxiYWNrID8/IG51bGw7XG4gIGNvbnN0IGdldE1ldGFWYWx1ZSA9IChwcm9wZXJ0aWVzKSA9PiB0eXBlb2YgcHJvcGVydGllcyA9PT0gXCJvYmplY3RcIiAmJiAhQXJyYXkuaXNBcnJheShwcm9wZXJ0aWVzKSA/IHByb3BlcnRpZXMgOiB7fTtcbiAgY29uc3QgZ2V0SXRlbSA9IGFzeW5jIChkcml2ZXIsIGRyaXZlcktleSwgb3B0cykgPT4ge1xuICAgIGNvbnN0IHJlcyA9IGF3YWl0IGRyaXZlci5nZXRJdGVtKGRyaXZlcktleSk7XG4gICAgcmV0dXJuIGdldFZhbHVlT3JGYWxsYmFjayhyZXMsIG9wdHM/LmZhbGxiYWNrID8/IG9wdHM/LmRlZmF1bHRWYWx1ZSk7XG4gIH07XG4gIGNvbnN0IGdldE1ldGEgPSBhc3luYyAoZHJpdmVyLCBkcml2ZXJLZXkpID0+IHtcbiAgICBjb25zdCBtZXRhS2V5ID0gZ2V0TWV0YUtleShkcml2ZXJLZXkpO1xuICAgIGNvbnN0IHJlcyA9IGF3YWl0IGRyaXZlci5nZXRJdGVtKG1ldGFLZXkpO1xuICAgIHJldHVybiBnZXRNZXRhVmFsdWUocmVzKTtcbiAgfTtcbiAgY29uc3Qgc2V0SXRlbSA9IGFzeW5jIChkcml2ZXIsIGRyaXZlcktleSwgdmFsdWUpID0+IHtcbiAgICBhd2FpdCBkcml2ZXIuc2V0SXRlbShkcml2ZXJLZXksIHZhbHVlID8/IG51bGwpO1xuICB9O1xuICBjb25zdCBzZXRNZXRhID0gYXN5bmMgKGRyaXZlciwgZHJpdmVyS2V5LCBwcm9wZXJ0aWVzKSA9PiB7XG4gICAgY29uc3QgbWV0YUtleSA9IGdldE1ldGFLZXkoZHJpdmVyS2V5KTtcbiAgICBjb25zdCBleGlzdGluZ0ZpZWxkcyA9IGdldE1ldGFWYWx1ZShhd2FpdCBkcml2ZXIuZ2V0SXRlbShtZXRhS2V5KSk7XG4gICAgYXdhaXQgZHJpdmVyLnNldEl0ZW0obWV0YUtleSwgbWVyZ2VNZXRhKGV4aXN0aW5nRmllbGRzLCBwcm9wZXJ0aWVzKSk7XG4gIH07XG4gIGNvbnN0IHJlbW92ZUl0ZW0gPSBhc3luYyAoZHJpdmVyLCBkcml2ZXJLZXksIG9wdHMpID0+IHtcbiAgICBhd2FpdCBkcml2ZXIucmVtb3ZlSXRlbShkcml2ZXJLZXkpO1xuICAgIGlmIChvcHRzPy5yZW1vdmVNZXRhKSB7XG4gICAgICBjb25zdCBtZXRhS2V5ID0gZ2V0TWV0YUtleShkcml2ZXJLZXkpO1xuICAgICAgYXdhaXQgZHJpdmVyLnJlbW92ZUl0ZW0obWV0YUtleSk7XG4gICAgfVxuICB9O1xuICBjb25zdCByZW1vdmVNZXRhID0gYXN5bmMgKGRyaXZlciwgZHJpdmVyS2V5LCBwcm9wZXJ0aWVzKSA9PiB7XG4gICAgY29uc3QgbWV0YUtleSA9IGdldE1ldGFLZXkoZHJpdmVyS2V5KTtcbiAgICBpZiAocHJvcGVydGllcyA9PSBudWxsKSB7XG4gICAgICBhd2FpdCBkcml2ZXIucmVtb3ZlSXRlbShtZXRhS2V5KTtcbiAgICB9IGVsc2Uge1xuICAgICAgY29uc3QgbmV3RmllbGRzID0gZ2V0TWV0YVZhbHVlKGF3YWl0IGRyaXZlci5nZXRJdGVtKG1ldGFLZXkpKTtcbiAgICAgIFtwcm9wZXJ0aWVzXS5mbGF0KCkuZm9yRWFjaCgoZmllbGQpID0+IGRlbGV0ZSBuZXdGaWVsZHNbZmllbGRdKTtcbiAgICAgIGF3YWl0IGRyaXZlci5zZXRJdGVtKG1ldGFLZXksIG5ld0ZpZWxkcyk7XG4gICAgfVxuICB9O1xuICBjb25zdCB3YXRjaCA9IChkcml2ZXIsIGRyaXZlcktleSwgY2IpID0+IHtcbiAgICByZXR1cm4gZHJpdmVyLndhdGNoKGRyaXZlcktleSwgY2IpO1xuICB9O1xuICBjb25zdCBzdG9yYWdlMiA9IHtcbiAgICBnZXRJdGVtOiBhc3luYyAoa2V5LCBvcHRzKSA9PiB7XG4gICAgICBjb25zdCB7IGRyaXZlciwgZHJpdmVyS2V5IH0gPSByZXNvbHZlS2V5KGtleSk7XG4gICAgICByZXR1cm4gYXdhaXQgZ2V0SXRlbShkcml2ZXIsIGRyaXZlcktleSwgb3B0cyk7XG4gICAgfSxcbiAgICBnZXRJdGVtczogYXN5bmMgKGtleXMpID0+IHtcbiAgICAgIGNvbnN0IGFyZWFUb0tleU1hcCA9IC8qIEBfX1BVUkVfXyAqLyBuZXcgTWFwKCk7XG4gICAgICBjb25zdCBrZXlUb09wdHNNYXAgPSAvKiBAX19QVVJFX18gKi8gbmV3IE1hcCgpO1xuICAgICAgY29uc3Qgb3JkZXJlZEtleXMgPSBbXTtcbiAgICAgIGtleXMuZm9yRWFjaCgoa2V5KSA9PiB7XG4gICAgICAgIGxldCBrZXlTdHI7XG4gICAgICAgIGxldCBvcHRzO1xuICAgICAgICBpZiAodHlwZW9mIGtleSA9PT0gXCJzdHJpbmdcIikge1xuICAgICAgICAgIGtleVN0ciA9IGtleTtcbiAgICAgICAgfSBlbHNlIGlmIChcImdldFZhbHVlXCIgaW4ga2V5KSB7XG4gICAgICAgICAga2V5U3RyID0ga2V5LmtleTtcbiAgICAgICAgICBvcHRzID0geyBmYWxsYmFjazoga2V5LmZhbGxiYWNrIH07XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAga2V5U3RyID0ga2V5LmtleTtcbiAgICAgICAgICBvcHRzID0ga2V5Lm9wdGlvbnM7XG4gICAgICAgIH1cbiAgICAgICAgb3JkZXJlZEtleXMucHVzaChrZXlTdHIpO1xuICAgICAgICBjb25zdCB7IGRyaXZlckFyZWEsIGRyaXZlcktleSB9ID0gcmVzb2x2ZUtleShrZXlTdHIpO1xuICAgICAgICBjb25zdCBhcmVhS2V5cyA9IGFyZWFUb0tleU1hcC5nZXQoZHJpdmVyQXJlYSkgPz8gW107XG4gICAgICAgIGFyZWFUb0tleU1hcC5zZXQoZHJpdmVyQXJlYSwgYXJlYUtleXMuY29uY2F0KGRyaXZlcktleSkpO1xuICAgICAgICBrZXlUb09wdHNNYXAuc2V0KGtleVN0ciwgb3B0cyk7XG4gICAgICB9KTtcbiAgICAgIGNvbnN0IHJlc3VsdHNNYXAgPSAvKiBAX19QVVJFX18gKi8gbmV3IE1hcCgpO1xuICAgICAgYXdhaXQgUHJvbWlzZS5hbGwoXG4gICAgICAgIEFycmF5LmZyb20oYXJlYVRvS2V5TWFwLmVudHJpZXMoKSkubWFwKGFzeW5jIChbZHJpdmVyQXJlYSwga2V5czJdKSA9PiB7XG4gICAgICAgICAgY29uc3QgZHJpdmVyUmVzdWx0cyA9IGF3YWl0IGRyaXZlcnNbZHJpdmVyQXJlYV0uZ2V0SXRlbXMoa2V5czIpO1xuICAgICAgICAgIGRyaXZlclJlc3VsdHMuZm9yRWFjaCgoZHJpdmVyUmVzdWx0KSA9PiB7XG4gICAgICAgICAgICBjb25zdCBrZXkgPSBgJHtkcml2ZXJBcmVhfToke2RyaXZlclJlc3VsdC5rZXl9YDtcbiAgICAgICAgICAgIGNvbnN0IG9wdHMgPSBrZXlUb09wdHNNYXAuZ2V0KGtleSk7XG4gICAgICAgICAgICBjb25zdCB2YWx1ZSA9IGdldFZhbHVlT3JGYWxsYmFjayhcbiAgICAgICAgICAgICAgZHJpdmVyUmVzdWx0LnZhbHVlLFxuICAgICAgICAgICAgICBvcHRzPy5mYWxsYmFjayA/PyBvcHRzPy5kZWZhdWx0VmFsdWVcbiAgICAgICAgICAgICk7XG4gICAgICAgICAgICByZXN1bHRzTWFwLnNldChrZXksIHZhbHVlKTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgfSlcbiAgICAgICk7XG4gICAgICByZXR1cm4gb3JkZXJlZEtleXMubWFwKChrZXkpID0+ICh7XG4gICAgICAgIGtleSxcbiAgICAgICAgdmFsdWU6IHJlc3VsdHNNYXAuZ2V0KGtleSlcbiAgICAgIH0pKTtcbiAgICB9LFxuICAgIGdldE1ldGE6IGFzeW5jIChrZXkpID0+IHtcbiAgICAgIGNvbnN0IHsgZHJpdmVyLCBkcml2ZXJLZXkgfSA9IHJlc29sdmVLZXkoa2V5KTtcbiAgICAgIHJldHVybiBhd2FpdCBnZXRNZXRhKGRyaXZlciwgZHJpdmVyS2V5KTtcbiAgICB9LFxuICAgIGdldE1ldGFzOiBhc3luYyAoYXJncykgPT4ge1xuICAgICAgY29uc3Qga2V5cyA9IGFyZ3MubWFwKChhcmcpID0+IHtcbiAgICAgICAgY29uc3Qga2V5ID0gdHlwZW9mIGFyZyA9PT0gXCJzdHJpbmdcIiA/IGFyZyA6IGFyZy5rZXk7XG4gICAgICAgIGNvbnN0IHsgZHJpdmVyQXJlYSwgZHJpdmVyS2V5IH0gPSByZXNvbHZlS2V5KGtleSk7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAga2V5LFxuICAgICAgICAgIGRyaXZlckFyZWEsXG4gICAgICAgICAgZHJpdmVyS2V5LFxuICAgICAgICAgIGRyaXZlck1ldGFLZXk6IGdldE1ldGFLZXkoZHJpdmVyS2V5KVxuICAgICAgICB9O1xuICAgICAgfSk7XG4gICAgICBjb25zdCBhcmVhVG9Ecml2ZXJNZXRhS2V5c01hcCA9IGtleXMucmVkdWNlKChtYXAsIGtleSkgPT4ge1xuICAgICAgICBtYXBba2V5LmRyaXZlckFyZWFdID8/PSBbXTtcbiAgICAgICAgbWFwW2tleS5kcml2ZXJBcmVhXS5wdXNoKGtleSk7XG4gICAgICAgIHJldHVybiBtYXA7XG4gICAgICB9LCB7fSk7XG4gICAgICBjb25zdCByZXN1bHRzTWFwID0ge307XG4gICAgICBhd2FpdCBQcm9taXNlLmFsbChcbiAgICAgICAgT2JqZWN0LmVudHJpZXMoYXJlYVRvRHJpdmVyTWV0YUtleXNNYXApLm1hcChhc3luYyAoW2FyZWEsIGtleXMyXSkgPT4ge1xuICAgICAgICAgIGNvbnN0IGFyZWFSZXMgPSBhd2FpdCBicm93c2VyLnN0b3JhZ2VbYXJlYV0uZ2V0KFxuICAgICAgICAgICAga2V5czIubWFwKChrZXkpID0+IGtleS5kcml2ZXJNZXRhS2V5KVxuICAgICAgICAgICk7XG4gICAgICAgICAga2V5czIuZm9yRWFjaCgoa2V5KSA9PiB7XG4gICAgICAgICAgICByZXN1bHRzTWFwW2tleS5rZXldID0gYXJlYVJlc1trZXkuZHJpdmVyTWV0YUtleV0gPz8ge307XG4gICAgICAgICAgfSk7XG4gICAgICAgIH0pXG4gICAgICApO1xuICAgICAgcmV0dXJuIGtleXMubWFwKChrZXkpID0+ICh7XG4gICAgICAgIGtleToga2V5LmtleSxcbiAgICAgICAgbWV0YTogcmVzdWx0c01hcFtrZXkua2V5XVxuICAgICAgfSkpO1xuICAgIH0sXG4gICAgc2V0SXRlbTogYXN5bmMgKGtleSwgdmFsdWUpID0+IHtcbiAgICAgIGNvbnN0IHsgZHJpdmVyLCBkcml2ZXJLZXkgfSA9IHJlc29sdmVLZXkoa2V5KTtcbiAgICAgIGF3YWl0IHNldEl0ZW0oZHJpdmVyLCBkcml2ZXJLZXksIHZhbHVlKTtcbiAgICB9LFxuICAgIHNldEl0ZW1zOiBhc3luYyAoaXRlbXMpID0+IHtcbiAgICAgIGNvbnN0IGFyZWFUb0tleVZhbHVlTWFwID0ge307XG4gICAgICBpdGVtcy5mb3JFYWNoKChpdGVtKSA9PiB7XG4gICAgICAgIGNvbnN0IHsgZHJpdmVyQXJlYSwgZHJpdmVyS2V5IH0gPSByZXNvbHZlS2V5KFxuICAgICAgICAgIFwia2V5XCIgaW4gaXRlbSA/IGl0ZW0ua2V5IDogaXRlbS5pdGVtLmtleVxuICAgICAgICApO1xuICAgICAgICBhcmVhVG9LZXlWYWx1ZU1hcFtkcml2ZXJBcmVhXSA/Pz0gW107XG4gICAgICAgIGFyZWFUb0tleVZhbHVlTWFwW2RyaXZlckFyZWFdLnB1c2goe1xuICAgICAgICAgIGtleTogZHJpdmVyS2V5LFxuICAgICAgICAgIHZhbHVlOiBpdGVtLnZhbHVlXG4gICAgICAgIH0pO1xuICAgICAgfSk7XG4gICAgICBhd2FpdCBQcm9taXNlLmFsbChcbiAgICAgICAgT2JqZWN0LmVudHJpZXMoYXJlYVRvS2V5VmFsdWVNYXApLm1hcChhc3luYyAoW2RyaXZlckFyZWEsIHZhbHVlc10pID0+IHtcbiAgICAgICAgICBjb25zdCBkcml2ZXIgPSBnZXREcml2ZXIoZHJpdmVyQXJlYSk7XG4gICAgICAgICAgYXdhaXQgZHJpdmVyLnNldEl0ZW1zKHZhbHVlcyk7XG4gICAgICAgIH0pXG4gICAgICApO1xuICAgIH0sXG4gICAgc2V0TWV0YTogYXN5bmMgKGtleSwgcHJvcGVydGllcykgPT4ge1xuICAgICAgY29uc3QgeyBkcml2ZXIsIGRyaXZlcktleSB9ID0gcmVzb2x2ZUtleShrZXkpO1xuICAgICAgYXdhaXQgc2V0TWV0YShkcml2ZXIsIGRyaXZlcktleSwgcHJvcGVydGllcyk7XG4gICAgfSxcbiAgICBzZXRNZXRhczogYXN5bmMgKGl0ZW1zKSA9PiB7XG4gICAgICBjb25zdCBhcmVhVG9NZXRhVXBkYXRlc01hcCA9IHt9O1xuICAgICAgaXRlbXMuZm9yRWFjaCgoaXRlbSkgPT4ge1xuICAgICAgICBjb25zdCB7IGRyaXZlckFyZWEsIGRyaXZlcktleSB9ID0gcmVzb2x2ZUtleShcbiAgICAgICAgICBcImtleVwiIGluIGl0ZW0gPyBpdGVtLmtleSA6IGl0ZW0uaXRlbS5rZXlcbiAgICAgICAgKTtcbiAgICAgICAgYXJlYVRvTWV0YVVwZGF0ZXNNYXBbZHJpdmVyQXJlYV0gPz89IFtdO1xuICAgICAgICBhcmVhVG9NZXRhVXBkYXRlc01hcFtkcml2ZXJBcmVhXS5wdXNoKHtcbiAgICAgICAgICBrZXk6IGRyaXZlcktleSxcbiAgICAgICAgICBwcm9wZXJ0aWVzOiBpdGVtLm1ldGFcbiAgICAgICAgfSk7XG4gICAgICB9KTtcbiAgICAgIGF3YWl0IFByb21pc2UuYWxsKFxuICAgICAgICBPYmplY3QuZW50cmllcyhhcmVhVG9NZXRhVXBkYXRlc01hcCkubWFwKFxuICAgICAgICAgIGFzeW5jIChbc3RvcmFnZUFyZWEsIHVwZGF0ZXNdKSA9PiB7XG4gICAgICAgICAgICBjb25zdCBkcml2ZXIgPSBnZXREcml2ZXIoc3RvcmFnZUFyZWEpO1xuICAgICAgICAgICAgY29uc3QgbWV0YUtleXMgPSB1cGRhdGVzLm1hcCgoeyBrZXkgfSkgPT4gZ2V0TWV0YUtleShrZXkpKTtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKHN0b3JhZ2VBcmVhLCBtZXRhS2V5cyk7XG4gICAgICAgICAgICBjb25zdCBleGlzdGluZ01ldGFzID0gYXdhaXQgZHJpdmVyLmdldEl0ZW1zKG1ldGFLZXlzKTtcbiAgICAgICAgICAgIGNvbnN0IGV4aXN0aW5nTWV0YU1hcCA9IE9iamVjdC5mcm9tRW50cmllcyhcbiAgICAgICAgICAgICAgZXhpc3RpbmdNZXRhcy5tYXAoKHsga2V5LCB2YWx1ZSB9KSA9PiBba2V5LCBnZXRNZXRhVmFsdWUodmFsdWUpXSlcbiAgICAgICAgICAgICk7XG4gICAgICAgICAgICBjb25zdCBtZXRhVXBkYXRlcyA9IHVwZGF0ZXMubWFwKCh7IGtleSwgcHJvcGVydGllcyB9KSA9PiB7XG4gICAgICAgICAgICAgIGNvbnN0IG1ldGFLZXkgPSBnZXRNZXRhS2V5KGtleSk7XG4gICAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAga2V5OiBtZXRhS2V5LFxuICAgICAgICAgICAgICAgIHZhbHVlOiBtZXJnZU1ldGEoZXhpc3RpbmdNZXRhTWFwW21ldGFLZXldID8/IHt9LCBwcm9wZXJ0aWVzKVxuICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBhd2FpdCBkcml2ZXIuc2V0SXRlbXMobWV0YVVwZGF0ZXMpO1xuICAgICAgICAgIH1cbiAgICAgICAgKVxuICAgICAgKTtcbiAgICB9LFxuICAgIHJlbW92ZUl0ZW06IGFzeW5jIChrZXksIG9wdHMpID0+IHtcbiAgICAgIGNvbnN0IHsgZHJpdmVyLCBkcml2ZXJLZXkgfSA9IHJlc29sdmVLZXkoa2V5KTtcbiAgICAgIGF3YWl0IHJlbW92ZUl0ZW0oZHJpdmVyLCBkcml2ZXJLZXksIG9wdHMpO1xuICAgIH0sXG4gICAgcmVtb3ZlSXRlbXM6IGFzeW5jIChrZXlzKSA9PiB7XG4gICAgICBjb25zdCBhcmVhVG9LZXlzTWFwID0ge307XG4gICAgICBrZXlzLmZvckVhY2goKGtleSkgPT4ge1xuICAgICAgICBsZXQga2V5U3RyO1xuICAgICAgICBsZXQgb3B0cztcbiAgICAgICAgaWYgKHR5cGVvZiBrZXkgPT09IFwic3RyaW5nXCIpIHtcbiAgICAgICAgICBrZXlTdHIgPSBrZXk7XG4gICAgICAgIH0gZWxzZSBpZiAoXCJnZXRWYWx1ZVwiIGluIGtleSkge1xuICAgICAgICAgIGtleVN0ciA9IGtleS5rZXk7XG4gICAgICAgIH0gZWxzZSBpZiAoXCJpdGVtXCIgaW4ga2V5KSB7XG4gICAgICAgICAga2V5U3RyID0ga2V5Lml0ZW0ua2V5O1xuICAgICAgICAgIG9wdHMgPSBrZXkub3B0aW9ucztcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBrZXlTdHIgPSBrZXkua2V5O1xuICAgICAgICAgIG9wdHMgPSBrZXkub3B0aW9ucztcbiAgICAgICAgfVxuICAgICAgICBjb25zdCB7IGRyaXZlckFyZWEsIGRyaXZlcktleSB9ID0gcmVzb2x2ZUtleShrZXlTdHIpO1xuICAgICAgICBhcmVhVG9LZXlzTWFwW2RyaXZlckFyZWFdID8/PSBbXTtcbiAgICAgICAgYXJlYVRvS2V5c01hcFtkcml2ZXJBcmVhXS5wdXNoKGRyaXZlcktleSk7XG4gICAgICAgIGlmIChvcHRzPy5yZW1vdmVNZXRhKSB7XG4gICAgICAgICAgYXJlYVRvS2V5c01hcFtkcml2ZXJBcmVhXS5wdXNoKGdldE1ldGFLZXkoZHJpdmVyS2V5KSk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgICAgYXdhaXQgUHJvbWlzZS5hbGwoXG4gICAgICAgIE9iamVjdC5lbnRyaWVzKGFyZWFUb0tleXNNYXApLm1hcChhc3luYyAoW2RyaXZlckFyZWEsIGtleXMyXSkgPT4ge1xuICAgICAgICAgIGNvbnN0IGRyaXZlciA9IGdldERyaXZlcihkcml2ZXJBcmVhKTtcbiAgICAgICAgICBhd2FpdCBkcml2ZXIucmVtb3ZlSXRlbXMoa2V5czIpO1xuICAgICAgICB9KVxuICAgICAgKTtcbiAgICB9LFxuICAgIGNsZWFyOiBhc3luYyAoYmFzZSkgPT4ge1xuICAgICAgY29uc3QgZHJpdmVyID0gZ2V0RHJpdmVyKGJhc2UpO1xuICAgICAgYXdhaXQgZHJpdmVyLmNsZWFyKCk7XG4gICAgfSxcbiAgICByZW1vdmVNZXRhOiBhc3luYyAoa2V5LCBwcm9wZXJ0aWVzKSA9PiB7XG4gICAgICBjb25zdCB7IGRyaXZlciwgZHJpdmVyS2V5IH0gPSByZXNvbHZlS2V5KGtleSk7XG4gICAgICBhd2FpdCByZW1vdmVNZXRhKGRyaXZlciwgZHJpdmVyS2V5LCBwcm9wZXJ0aWVzKTtcbiAgICB9LFxuICAgIHNuYXBzaG90OiBhc3luYyAoYmFzZSwgb3B0cykgPT4ge1xuICAgICAgY29uc3QgZHJpdmVyID0gZ2V0RHJpdmVyKGJhc2UpO1xuICAgICAgY29uc3QgZGF0YSA9IGF3YWl0IGRyaXZlci5zbmFwc2hvdCgpO1xuICAgICAgb3B0cz8uZXhjbHVkZUtleXM/LmZvckVhY2goKGtleSkgPT4ge1xuICAgICAgICBkZWxldGUgZGF0YVtrZXldO1xuICAgICAgICBkZWxldGUgZGF0YVtnZXRNZXRhS2V5KGtleSldO1xuICAgICAgfSk7XG4gICAgICByZXR1cm4gZGF0YTtcbiAgICB9LFxuICAgIHJlc3RvcmVTbmFwc2hvdDogYXN5bmMgKGJhc2UsIGRhdGEpID0+IHtcbiAgICAgIGNvbnN0IGRyaXZlciA9IGdldERyaXZlcihiYXNlKTtcbiAgICAgIGF3YWl0IGRyaXZlci5yZXN0b3JlU25hcHNob3QoZGF0YSk7XG4gICAgfSxcbiAgICB3YXRjaDogKGtleSwgY2IpID0+IHtcbiAgICAgIGNvbnN0IHsgZHJpdmVyLCBkcml2ZXJLZXkgfSA9IHJlc29sdmVLZXkoa2V5KTtcbiAgICAgIHJldHVybiB3YXRjaChkcml2ZXIsIGRyaXZlcktleSwgY2IpO1xuICAgIH0sXG4gICAgdW53YXRjaCgpIHtcbiAgICAgIE9iamVjdC52YWx1ZXMoZHJpdmVycykuZm9yRWFjaCgoZHJpdmVyKSA9PiB7XG4gICAgICAgIGRyaXZlci51bndhdGNoKCk7XG4gICAgICB9KTtcbiAgICB9LFxuICAgIGRlZmluZUl0ZW06IChrZXksIG9wdHMpID0+IHtcbiAgICAgIGNvbnN0IHsgZHJpdmVyLCBkcml2ZXJLZXkgfSA9IHJlc29sdmVLZXkoa2V5KTtcbiAgICAgIGNvbnN0IHsgdmVyc2lvbjogdGFyZ2V0VmVyc2lvbiA9IDEsIG1pZ3JhdGlvbnMgPSB7fSB9ID0gb3B0cyA/PyB7fTtcbiAgICAgIGlmICh0YXJnZXRWZXJzaW9uIDwgMSkge1xuICAgICAgICB0aHJvdyBFcnJvcihcbiAgICAgICAgICBcIlN0b3JhZ2UgaXRlbSB2ZXJzaW9uIGNhbm5vdCBiZSBsZXNzIHRoYW4gMS4gSW5pdGlhbCB2ZXJzaW9ucyBzaG91bGQgYmUgc2V0IHRvIDEsIG5vdCAwLlwiXG4gICAgICAgICk7XG4gICAgICB9XG4gICAgICBjb25zdCBtaWdyYXRlID0gYXN5bmMgKCkgPT4ge1xuICAgICAgICBjb25zdCBkcml2ZXJNZXRhS2V5ID0gZ2V0TWV0YUtleShkcml2ZXJLZXkpO1xuICAgICAgICBjb25zdCBbeyB2YWx1ZSB9LCB7IHZhbHVlOiBtZXRhIH1dID0gYXdhaXQgZHJpdmVyLmdldEl0ZW1zKFtcbiAgICAgICAgICBkcml2ZXJLZXksXG4gICAgICAgICAgZHJpdmVyTWV0YUtleVxuICAgICAgICBdKTtcbiAgICAgICAgaWYgKHZhbHVlID09IG51bGwpIHJldHVybjtcbiAgICAgICAgY29uc3QgY3VycmVudFZlcnNpb24gPSBtZXRhPy52ID8/IDE7XG4gICAgICAgIGlmIChjdXJyZW50VmVyc2lvbiA+IHRhcmdldFZlcnNpb24pIHtcbiAgICAgICAgICB0aHJvdyBFcnJvcihcbiAgICAgICAgICAgIGBWZXJzaW9uIGRvd25ncmFkZSBkZXRlY3RlZCAodiR7Y3VycmVudFZlcnNpb259IC0+IHYke3RhcmdldFZlcnNpb259KSBmb3IgXCIke2tleX1cImBcbiAgICAgICAgICApO1xuICAgICAgICB9XG4gICAgICAgIGlmIChjdXJyZW50VmVyc2lvbiA9PT0gdGFyZ2V0VmVyc2lvbikge1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBjb25zb2xlLmRlYnVnKFxuICAgICAgICAgIGBbQHd4dC1kZXYvc3RvcmFnZV0gUnVubmluZyBzdG9yYWdlIG1pZ3JhdGlvbiBmb3IgJHtrZXl9OiB2JHtjdXJyZW50VmVyc2lvbn0gLT4gdiR7dGFyZ2V0VmVyc2lvbn1gXG4gICAgICAgICk7XG4gICAgICAgIGNvbnN0IG1pZ3JhdGlvbnNUb1J1biA9IEFycmF5LmZyb20oXG4gICAgICAgICAgeyBsZW5ndGg6IHRhcmdldFZlcnNpb24gLSBjdXJyZW50VmVyc2lvbiB9LFxuICAgICAgICAgIChfLCBpKSA9PiBjdXJyZW50VmVyc2lvbiArIGkgKyAxXG4gICAgICAgICk7XG4gICAgICAgIGxldCBtaWdyYXRlZFZhbHVlID0gdmFsdWU7XG4gICAgICAgIGZvciAoY29uc3QgbWlncmF0ZVRvVmVyc2lvbiBvZiBtaWdyYXRpb25zVG9SdW4pIHtcbiAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgbWlncmF0ZWRWYWx1ZSA9IGF3YWl0IG1pZ3JhdGlvbnM/LlttaWdyYXRlVG9WZXJzaW9uXT8uKG1pZ3JhdGVkVmFsdWUpID8/IG1pZ3JhdGVkVmFsdWU7XG4gICAgICAgICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgTWlncmF0aW9uRXJyb3Ioa2V5LCBtaWdyYXRlVG9WZXJzaW9uLCB7XG4gICAgICAgICAgICAgIGNhdXNlOiBlcnJcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBhd2FpdCBkcml2ZXIuc2V0SXRlbXMoW1xuICAgICAgICAgIHsga2V5OiBkcml2ZXJLZXksIHZhbHVlOiBtaWdyYXRlZFZhbHVlIH0sXG4gICAgICAgICAgeyBrZXk6IGRyaXZlck1ldGFLZXksIHZhbHVlOiB7IC4uLm1ldGEsIHY6IHRhcmdldFZlcnNpb24gfSB9XG4gICAgICAgIF0pO1xuICAgICAgICBjb25zb2xlLmRlYnVnKFxuICAgICAgICAgIGBbQHd4dC1kZXYvc3RvcmFnZV0gU3RvcmFnZSBtaWdyYXRpb24gY29tcGxldGVkIGZvciAke2tleX0gdiR7dGFyZ2V0VmVyc2lvbn1gLFxuICAgICAgICAgIHsgbWlncmF0ZWRWYWx1ZSB9XG4gICAgICAgICk7XG4gICAgICB9O1xuICAgICAgY29uc3QgbWlncmF0aW9uc0RvbmUgPSBvcHRzPy5taWdyYXRpb25zID09IG51bGwgPyBQcm9taXNlLnJlc29sdmUoKSA6IG1pZ3JhdGUoKS5jYXRjaCgoZXJyKSA9PiB7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoXG4gICAgICAgICAgYFtAd3h0LWRldi9zdG9yYWdlXSBNaWdyYXRpb24gZmFpbGVkIGZvciAke2tleX1gLFxuICAgICAgICAgIGVyclxuICAgICAgICApO1xuICAgICAgfSk7XG4gICAgICBjb25zdCBpbml0TXV0ZXggPSBuZXcgTXV0ZXgoKTtcbiAgICAgIGNvbnN0IGdldEZhbGxiYWNrID0gKCkgPT4gb3B0cz8uZmFsbGJhY2sgPz8gb3B0cz8uZGVmYXVsdFZhbHVlID8/IG51bGw7XG4gICAgICBjb25zdCBnZXRPckluaXRWYWx1ZSA9ICgpID0+IGluaXRNdXRleC5ydW5FeGNsdXNpdmUoYXN5bmMgKCkgPT4ge1xuICAgICAgICBjb25zdCB2YWx1ZSA9IGF3YWl0IGRyaXZlci5nZXRJdGVtKGRyaXZlcktleSk7XG4gICAgICAgIGlmICh2YWx1ZSAhPSBudWxsIHx8IG9wdHM/LmluaXQgPT0gbnVsbCkgcmV0dXJuIHZhbHVlO1xuICAgICAgICBjb25zdCBuZXdWYWx1ZSA9IGF3YWl0IG9wdHMuaW5pdCgpO1xuICAgICAgICBhd2FpdCBkcml2ZXIuc2V0SXRlbShkcml2ZXJLZXksIG5ld1ZhbHVlKTtcbiAgICAgICAgcmV0dXJuIG5ld1ZhbHVlO1xuICAgICAgfSk7XG4gICAgICBtaWdyYXRpb25zRG9uZS50aGVuKGdldE9ySW5pdFZhbHVlKTtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIGtleSxcbiAgICAgICAgZ2V0IGRlZmF1bHRWYWx1ZSgpIHtcbiAgICAgICAgICByZXR1cm4gZ2V0RmFsbGJhY2soKTtcbiAgICAgICAgfSxcbiAgICAgICAgZ2V0IGZhbGxiYWNrKCkge1xuICAgICAgICAgIHJldHVybiBnZXRGYWxsYmFjaygpO1xuICAgICAgICB9LFxuICAgICAgICBnZXRWYWx1ZTogYXN5bmMgKCkgPT4ge1xuICAgICAgICAgIGF3YWl0IG1pZ3JhdGlvbnNEb25lO1xuICAgICAgICAgIGlmIChvcHRzPy5pbml0KSB7XG4gICAgICAgICAgICByZXR1cm4gYXdhaXQgZ2V0T3JJbml0VmFsdWUoKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIGF3YWl0IGdldEl0ZW0oZHJpdmVyLCBkcml2ZXJLZXksIG9wdHMpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgZ2V0TWV0YTogYXN5bmMgKCkgPT4ge1xuICAgICAgICAgIGF3YWl0IG1pZ3JhdGlvbnNEb25lO1xuICAgICAgICAgIHJldHVybiBhd2FpdCBnZXRNZXRhKGRyaXZlciwgZHJpdmVyS2V5KTtcbiAgICAgICAgfSxcbiAgICAgICAgc2V0VmFsdWU6IGFzeW5jICh2YWx1ZSkgPT4ge1xuICAgICAgICAgIGF3YWl0IG1pZ3JhdGlvbnNEb25lO1xuICAgICAgICAgIHJldHVybiBhd2FpdCBzZXRJdGVtKGRyaXZlciwgZHJpdmVyS2V5LCB2YWx1ZSk7XG4gICAgICAgIH0sXG4gICAgICAgIHNldE1ldGE6IGFzeW5jIChwcm9wZXJ0aWVzKSA9PiB7XG4gICAgICAgICAgYXdhaXQgbWlncmF0aW9uc0RvbmU7XG4gICAgICAgICAgcmV0dXJuIGF3YWl0IHNldE1ldGEoZHJpdmVyLCBkcml2ZXJLZXksIHByb3BlcnRpZXMpO1xuICAgICAgICB9LFxuICAgICAgICByZW1vdmVWYWx1ZTogYXN5bmMgKG9wdHMyKSA9PiB7XG4gICAgICAgICAgYXdhaXQgbWlncmF0aW9uc0RvbmU7XG4gICAgICAgICAgcmV0dXJuIGF3YWl0IHJlbW92ZUl0ZW0oZHJpdmVyLCBkcml2ZXJLZXksIG9wdHMyKTtcbiAgICAgICAgfSxcbiAgICAgICAgcmVtb3ZlTWV0YTogYXN5bmMgKHByb3BlcnRpZXMpID0+IHtcbiAgICAgICAgICBhd2FpdCBtaWdyYXRpb25zRG9uZTtcbiAgICAgICAgICByZXR1cm4gYXdhaXQgcmVtb3ZlTWV0YShkcml2ZXIsIGRyaXZlcktleSwgcHJvcGVydGllcyk7XG4gICAgICAgIH0sXG4gICAgICAgIHdhdGNoOiAoY2IpID0+IHdhdGNoKFxuICAgICAgICAgIGRyaXZlcixcbiAgICAgICAgICBkcml2ZXJLZXksXG4gICAgICAgICAgKG5ld1ZhbHVlLCBvbGRWYWx1ZSkgPT4gY2IobmV3VmFsdWUgPz8gZ2V0RmFsbGJhY2soKSwgb2xkVmFsdWUgPz8gZ2V0RmFsbGJhY2soKSlcbiAgICAgICAgKSxcbiAgICAgICAgbWlncmF0ZVxuICAgICAgfTtcbiAgICB9XG4gIH07XG4gIHJldHVybiBzdG9yYWdlMjtcbn1cbmZ1bmN0aW9uIGNyZWF0ZURyaXZlcihzdG9yYWdlQXJlYSkge1xuICBjb25zdCBnZXRTdG9yYWdlQXJlYSA9ICgpID0+IHtcbiAgICBpZiAoYnJvd3Nlci5ydW50aW1lID09IG51bGwpIHtcbiAgICAgIHRocm93IEVycm9yKFxuICAgICAgICBbXG4gICAgICAgICAgXCInd3h0L3N0b3JhZ2UnIG11c3QgYmUgbG9hZGVkIGluIGEgd2ViIGV4dGVuc2lvbiBlbnZpcm9ubWVudFwiLFxuICAgICAgICAgIFwiXFxuIC0gSWYgdGhyb3duIGR1cmluZyBhIGJ1aWxkLCBzZWUgaHR0cHM6Ly9naXRodWIuY29tL3d4dC1kZXYvd3h0L2lzc3Vlcy8zNzFcIixcbiAgICAgICAgICBcIiAtIElmIHRocm93biBkdXJpbmcgdGVzdHMsIG1vY2sgJ3d4dC9icm93c2VyJyBjb3JyZWN0bHkuIFNlZSBodHRwczovL3d4dC5kZXYvZ3VpZGUvZ28tZnVydGhlci90ZXN0aW5nLmh0bWxcXG5cIlxuICAgICAgICBdLmpvaW4oXCJcXG5cIilcbiAgICAgICk7XG4gICAgfVxuICAgIGlmIChicm93c2VyLnN0b3JhZ2UgPT0gbnVsbCkge1xuICAgICAgdGhyb3cgRXJyb3IoXG4gICAgICAgIFwiWW91IG11c3QgYWRkIHRoZSAnc3RvcmFnZScgcGVybWlzc2lvbiB0byB5b3VyIG1hbmlmZXN0IHRvIHVzZSAnd3h0L3N0b3JhZ2UnXCJcbiAgICAgICk7XG4gICAgfVxuICAgIGNvbnN0IGFyZWEgPSBicm93c2VyLnN0b3JhZ2Vbc3RvcmFnZUFyZWFdO1xuICAgIGlmIChhcmVhID09IG51bGwpXG4gICAgICB0aHJvdyBFcnJvcihgXCJicm93c2VyLnN0b3JhZ2UuJHtzdG9yYWdlQXJlYX1cIiBpcyB1bmRlZmluZWRgKTtcbiAgICByZXR1cm4gYXJlYTtcbiAgfTtcbiAgY29uc3Qgd2F0Y2hMaXN0ZW5lcnMgPSAvKiBAX19QVVJFX18gKi8gbmV3IFNldCgpO1xuICByZXR1cm4ge1xuICAgIGdldEl0ZW06IGFzeW5jIChrZXkpID0+IHtcbiAgICAgIGNvbnN0IHJlcyA9IGF3YWl0IGdldFN0b3JhZ2VBcmVhKCkuZ2V0KGtleSk7XG4gICAgICByZXR1cm4gcmVzW2tleV07XG4gICAgfSxcbiAgICBnZXRJdGVtczogYXN5bmMgKGtleXMpID0+IHtcbiAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGdldFN0b3JhZ2VBcmVhKCkuZ2V0KGtleXMpO1xuICAgICAgcmV0dXJuIGtleXMubWFwKChrZXkpID0+ICh7IGtleSwgdmFsdWU6IHJlc3VsdFtrZXldID8/IG51bGwgfSkpO1xuICAgIH0sXG4gICAgc2V0SXRlbTogYXN5bmMgKGtleSwgdmFsdWUpID0+IHtcbiAgICAgIGlmICh2YWx1ZSA9PSBudWxsKSB7XG4gICAgICAgIGF3YWl0IGdldFN0b3JhZ2VBcmVhKCkucmVtb3ZlKGtleSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBhd2FpdCBnZXRTdG9yYWdlQXJlYSgpLnNldCh7IFtrZXldOiB2YWx1ZSB9KTtcbiAgICAgIH1cbiAgICB9LFxuICAgIHNldEl0ZW1zOiBhc3luYyAodmFsdWVzKSA9PiB7XG4gICAgICBjb25zdCBtYXAgPSB2YWx1ZXMucmVkdWNlKFxuICAgICAgICAobWFwMiwgeyBrZXksIHZhbHVlIH0pID0+IHtcbiAgICAgICAgICBtYXAyW2tleV0gPSB2YWx1ZTtcbiAgICAgICAgICByZXR1cm4gbWFwMjtcbiAgICAgICAgfSxcbiAgICAgICAge31cbiAgICAgICk7XG4gICAgICBhd2FpdCBnZXRTdG9yYWdlQXJlYSgpLnNldChtYXApO1xuICAgIH0sXG4gICAgcmVtb3ZlSXRlbTogYXN5bmMgKGtleSkgPT4ge1xuICAgICAgYXdhaXQgZ2V0U3RvcmFnZUFyZWEoKS5yZW1vdmUoa2V5KTtcbiAgICB9LFxuICAgIHJlbW92ZUl0ZW1zOiBhc3luYyAoa2V5cykgPT4ge1xuICAgICAgYXdhaXQgZ2V0U3RvcmFnZUFyZWEoKS5yZW1vdmUoa2V5cyk7XG4gICAgfSxcbiAgICBjbGVhcjogYXN5bmMgKCkgPT4ge1xuICAgICAgYXdhaXQgZ2V0U3RvcmFnZUFyZWEoKS5jbGVhcigpO1xuICAgIH0sXG4gICAgc25hcHNob3Q6IGFzeW5jICgpID0+IHtcbiAgICAgIHJldHVybiBhd2FpdCBnZXRTdG9yYWdlQXJlYSgpLmdldCgpO1xuICAgIH0sXG4gICAgcmVzdG9yZVNuYXBzaG90OiBhc3luYyAoZGF0YSkgPT4ge1xuICAgICAgYXdhaXQgZ2V0U3RvcmFnZUFyZWEoKS5zZXQoZGF0YSk7XG4gICAgfSxcbiAgICB3YXRjaChrZXksIGNiKSB7XG4gICAgICBjb25zdCBsaXN0ZW5lciA9IChjaGFuZ2VzKSA9PiB7XG4gICAgICAgIGNvbnN0IGNoYW5nZSA9IGNoYW5nZXNba2V5XTtcbiAgICAgICAgaWYgKGNoYW5nZSA9PSBudWxsKSByZXR1cm47XG4gICAgICAgIGlmIChkZXF1YWwoY2hhbmdlLm5ld1ZhbHVlLCBjaGFuZ2Uub2xkVmFsdWUpKSByZXR1cm47XG4gICAgICAgIGNiKGNoYW5nZS5uZXdWYWx1ZSA/PyBudWxsLCBjaGFuZ2Uub2xkVmFsdWUgPz8gbnVsbCk7XG4gICAgICB9O1xuICAgICAgZ2V0U3RvcmFnZUFyZWEoKS5vbkNoYW5nZWQuYWRkTGlzdGVuZXIobGlzdGVuZXIpO1xuICAgICAgd2F0Y2hMaXN0ZW5lcnMuYWRkKGxpc3RlbmVyKTtcbiAgICAgIHJldHVybiAoKSA9PiB7XG4gICAgICAgIGdldFN0b3JhZ2VBcmVhKCkub25DaGFuZ2VkLnJlbW92ZUxpc3RlbmVyKGxpc3RlbmVyKTtcbiAgICAgICAgd2F0Y2hMaXN0ZW5lcnMuZGVsZXRlKGxpc3RlbmVyKTtcbiAgICAgIH07XG4gICAgfSxcbiAgICB1bndhdGNoKCkge1xuICAgICAgd2F0Y2hMaXN0ZW5lcnMuZm9yRWFjaCgobGlzdGVuZXIpID0+IHtcbiAgICAgICAgZ2V0U3RvcmFnZUFyZWEoKS5vbkNoYW5nZWQucmVtb3ZlTGlzdGVuZXIobGlzdGVuZXIpO1xuICAgICAgfSk7XG4gICAgICB3YXRjaExpc3RlbmVycy5jbGVhcigpO1xuICAgIH1cbiAgfTtcbn1cbmNsYXNzIE1pZ3JhdGlvbkVycm9yIGV4dGVuZHMgRXJyb3Ige1xuICBjb25zdHJ1Y3RvcihrZXksIHZlcnNpb24sIG9wdGlvbnMpIHtcbiAgICBzdXBlcihgdiR7dmVyc2lvbn0gbWlncmF0aW9uIGZhaWxlZCBmb3IgXCIke2tleX1cImAsIG9wdGlvbnMpO1xuICAgIHRoaXMua2V5ID0ga2V5O1xuICAgIHRoaXMudmVyc2lvbiA9IHZlcnNpb247XG4gIH1cbn1cblxuZXhwb3J0IHsgTWlncmF0aW9uRXJyb3IsIHN0b3JhZ2UgfTtcbiIsImltcG9ydCB2YWxpZGF0ZSBmcm9tICcuL3ZhbGlkYXRlLmpzJztcbmNvbnN0IGJ5dGVUb0hleCA9IFtdO1xuZm9yIChsZXQgaSA9IDA7IGkgPCAyNTY7ICsraSkge1xuICAgIGJ5dGVUb0hleC5wdXNoKChpICsgMHgxMDApLnRvU3RyaW5nKDE2KS5zbGljZSgxKSk7XG59XG5leHBvcnQgZnVuY3Rpb24gdW5zYWZlU3RyaW5naWZ5KGFyciwgb2Zmc2V0ID0gMCkge1xuICAgIHJldHVybiAoYnl0ZVRvSGV4W2FycltvZmZzZXQgKyAwXV0gK1xuICAgICAgICBieXRlVG9IZXhbYXJyW29mZnNldCArIDFdXSArXG4gICAgICAgIGJ5dGVUb0hleFthcnJbb2Zmc2V0ICsgMl1dICtcbiAgICAgICAgYnl0ZVRvSGV4W2FycltvZmZzZXQgKyAzXV0gK1xuICAgICAgICAnLScgK1xuICAgICAgICBieXRlVG9IZXhbYXJyW29mZnNldCArIDRdXSArXG4gICAgICAgIGJ5dGVUb0hleFthcnJbb2Zmc2V0ICsgNV1dICtcbiAgICAgICAgJy0nICtcbiAgICAgICAgYnl0ZVRvSGV4W2FycltvZmZzZXQgKyA2XV0gK1xuICAgICAgICBieXRlVG9IZXhbYXJyW29mZnNldCArIDddXSArXG4gICAgICAgICctJyArXG4gICAgICAgIGJ5dGVUb0hleFthcnJbb2Zmc2V0ICsgOF1dICtcbiAgICAgICAgYnl0ZVRvSGV4W2FycltvZmZzZXQgKyA5XV0gK1xuICAgICAgICAnLScgK1xuICAgICAgICBieXRlVG9IZXhbYXJyW29mZnNldCArIDEwXV0gK1xuICAgICAgICBieXRlVG9IZXhbYXJyW29mZnNldCArIDExXV0gK1xuICAgICAgICBieXRlVG9IZXhbYXJyW29mZnNldCArIDEyXV0gK1xuICAgICAgICBieXRlVG9IZXhbYXJyW29mZnNldCArIDEzXV0gK1xuICAgICAgICBieXRlVG9IZXhbYXJyW29mZnNldCArIDE0XV0gK1xuICAgICAgICBieXRlVG9IZXhbYXJyW29mZnNldCArIDE1XV0pLnRvTG93ZXJDYXNlKCk7XG59XG5mdW5jdGlvbiBzdHJpbmdpZnkoYXJyLCBvZmZzZXQgPSAwKSB7XG4gICAgY29uc3QgdXVpZCA9IHVuc2FmZVN0cmluZ2lmeShhcnIsIG9mZnNldCk7XG4gICAgaWYgKCF2YWxpZGF0ZSh1dWlkKSkge1xuICAgICAgICB0aHJvdyBUeXBlRXJyb3IoJ1N0cmluZ2lmaWVkIFVVSUQgaXMgaW52YWxpZCcpO1xuICAgIH1cbiAgICByZXR1cm4gdXVpZDtcbn1cbmV4cG9ydCBkZWZhdWx0IHN0cmluZ2lmeTtcbiIsImxldCBnZXRSYW5kb21WYWx1ZXM7XG5jb25zdCBybmRzOCA9IG5ldyBVaW50OEFycmF5KDE2KTtcbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIHJuZygpIHtcbiAgICBpZiAoIWdldFJhbmRvbVZhbHVlcykge1xuICAgICAgICBpZiAodHlwZW9mIGNyeXB0byA9PT0gJ3VuZGVmaW5lZCcgfHwgIWNyeXB0by5nZXRSYW5kb21WYWx1ZXMpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignY3J5cHRvLmdldFJhbmRvbVZhbHVlcygpIG5vdCBzdXBwb3J0ZWQuIFNlZSBodHRwczovL2dpdGh1Yi5jb20vdXVpZGpzL3V1aWQjZ2V0cmFuZG9tdmFsdWVzLW5vdC1zdXBwb3J0ZWQnKTtcbiAgICAgICAgfVxuICAgICAgICBnZXRSYW5kb21WYWx1ZXMgPSBjcnlwdG8uZ2V0UmFuZG9tVmFsdWVzLmJpbmQoY3J5cHRvKTtcbiAgICB9XG4gICAgcmV0dXJuIGdldFJhbmRvbVZhbHVlcyhybmRzOCk7XG59XG4iLCJjb25zdCByYW5kb21VVUlEID0gdHlwZW9mIGNyeXB0byAhPT0gJ3VuZGVmaW5lZCcgJiYgY3J5cHRvLnJhbmRvbVVVSUQgJiYgY3J5cHRvLnJhbmRvbVVVSUQuYmluZChjcnlwdG8pO1xuZXhwb3J0IGRlZmF1bHQgeyByYW5kb21VVUlEIH07XG4iLCJpbXBvcnQgbmF0aXZlIGZyb20gJy4vbmF0aXZlLmpzJztcbmltcG9ydCBybmcgZnJvbSAnLi9ybmcuanMnO1xuaW1wb3J0IHsgdW5zYWZlU3RyaW5naWZ5IH0gZnJvbSAnLi9zdHJpbmdpZnkuanMnO1xuZnVuY3Rpb24gdjQob3B0aW9ucywgYnVmLCBvZmZzZXQpIHtcbiAgICBpZiAobmF0aXZlLnJhbmRvbVVVSUQgJiYgIWJ1ZiAmJiAhb3B0aW9ucykge1xuICAgICAgICByZXR1cm4gbmF0aXZlLnJhbmRvbVVVSUQoKTtcbiAgICB9XG4gICAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG4gICAgY29uc3Qgcm5kcyA9IG9wdGlvbnMucmFuZG9tID8/IG9wdGlvbnMucm5nPy4oKSA/PyBybmcoKTtcbiAgICBpZiAocm5kcy5sZW5ndGggPCAxNikge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1JhbmRvbSBieXRlcyBsZW5ndGggbXVzdCBiZSA+PSAxNicpO1xuICAgIH1cbiAgICBybmRzWzZdID0gKHJuZHNbNl0gJiAweDBmKSB8IDB4NDA7XG4gICAgcm5kc1s4XSA9IChybmRzWzhdICYgMHgzZikgfCAweDgwO1xuICAgIGlmIChidWYpIHtcbiAgICAgICAgb2Zmc2V0ID0gb2Zmc2V0IHx8IDA7XG4gICAgICAgIGlmIChvZmZzZXQgPCAwIHx8IG9mZnNldCArIDE2ID4gYnVmLmxlbmd0aCkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IFJhbmdlRXJyb3IoYFVVSUQgYnl0ZSByYW5nZSAke29mZnNldH06JHtvZmZzZXQgKyAxNX0gaXMgb3V0IG9mIGJ1ZmZlciBib3VuZHNgKTtcbiAgICAgICAgfVxuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IDE2OyArK2kpIHtcbiAgICAgICAgICAgIGJ1ZltvZmZzZXQgKyBpXSA9IHJuZHNbaV07XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGJ1ZjtcbiAgICB9XG4gICAgcmV0dXJuIHVuc2FmZVN0cmluZ2lmeShybmRzKTtcbn1cbmV4cG9ydCBkZWZhdWx0IHY0O1xuIiwiaW1wb3J0IHsgQ29tbWFuZCB9IGZyb20gXCIuL2luZGV4XCI7XG5cbmNvbnN0IG5ld1RhYkNvbW1hbmQ6IENvbW1hbmQgPSB7XG4gIGlkOiBcIm5ldy10YWJcIixcbiAgbmFtZTogXCJOZXcgVGFiXCIsXG4gIGRlc2NyaXB0aW9uOiBcIk9wZW4gYSBuZXcgYnJvd3NlciB0YWJcIixcbiAgY29udGV4dDogXCJiYWNrZ3JvdW5kXCIsXG4gIGV4ZWN1dGU6IGFzeW5jICgpID0+IHtcbiAgICBhd2FpdCBicm93c2VyLnRhYnMuY3JlYXRlKHsgdXJsOiBcImFib3V0Om5ld3RhYlwiIH0pO1xuICAgIHJldHVybiBcIk5ldyB0YWIgb3BlbmVkLlwiOyAvLyBPcHRpb25hbCBzdWNjZXNzIG1lc3NhZ2VcbiAgfSxcbiAgbWV0YTogeyB0eXBlOiBcImJyb3dzZXJcIiwgY2F0ZWdvcnk6IFwidGFic1wiIH0sXG4gIGlzRW5hYmxlZDogdHJ1ZSxcbiAgaXNVc2VyRGVmaW5lZDogZmFsc2UsXG59O1xuXG5leHBvcnQgZGVmYXVsdCBuZXdUYWJDb21tYW5kO1xuIiwiaW1wb3J0IHR5cGUgeyBDb21tYW5kIH0gZnJvbSBcIi4vaW5kZXhcIjtcbmltcG9ydCB0eXBlIHsgQnJvd3NlciB9IGZyb20gXCJ3eHQvYnJvd3NlclwiO1xuaW1wb3J0IHsgdjQgfSBmcm9tIFwidXVpZFwiO1xuXG5jb25zdCBjbG9zZVRhYkNvbW1hbmQ6IENvbW1hbmQgPSB7XG4gIGlkOiBcImNsb3NlLXRhYlwiLFxuICBuYW1lOiBcIkNsb3NlIFRhYlwiLFxuICBkZXNjcmlwdGlvbjogXCJDbG9zZSB0aGUgY3VycmVudCB0YWJcIixcbiAgY29udGV4dDogXCJiYWNrZ3JvdW5kXCIsXG4gIC8vIE5vdGU6IEJhY2tncm91bmQgZXhlY3V0b3IgbmVlZHMgdG8gcGFzcyB0aGUgJ3RhYicgb2JqZWN0IGZyb20gdGhlIHNlbmRlclxuICBleGVjdXRlOiBhc3luYyAodGFiPzogQnJvd3Nlci50YWJzLlRhYikgPT4ge1xuICAgIGlmICh0YWI/LmlkKSB7XG4gICAgICBhd2FpdCBicm93c2VyLnRhYnMucmVtb3ZlKHRhYi5pZCk7XG4gICAgICByZXR1cm4gXCJUYWIgY2xvc2VkLlwiO1xuICAgIH1cbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJDb3VsZCBub3QgZGV0ZXJtaW5lIHRoZSBhY3RpdmUgdGFiIHRvIGNsb3NlLlwiKTtcbiAgfSxcbiAgbWV0YTogeyB0eXBlOiBcImJyb3dzZXJcIiwgY2F0ZWdvcnk6IFwidGFic1wiIH0sXG4gIGlzRW5hYmxlZDogdHJ1ZSxcbiAgaXNVc2VyRGVmaW5lZDogZmFsc2UsXG59O1xuXG5leHBvcnQgZGVmYXVsdCBjbG9zZVRhYkNvbW1hbmQ7XG4iLCJpbXBvcnQgeyB2NCBhcyB1dWlkdjQgfSBmcm9tIFwidXVpZFwiO1xuaW1wb3J0IHR5cGUgeyBCcm93c2VyIH0gZnJvbSBcInd4dC9icm93c2VyXCI7XG5pbXBvcnQgeyBDb21tYW5kIH0gZnJvbSBcIi4vaW5kZXhcIjtcblxuY29uc3QgcmVsb2FkVGFiQ29tbWFuZDogQ29tbWFuZCA9IHtcbiAgaWQ6IFwiY21kLXJlbG9hZC10YWJcIixcbiAgbmFtZTogXCJSZWxvYWQgVGFiXCIsXG4gIGRlc2NyaXB0aW9uOiBcIlJlbG9hZCB0aGUgY3VycmVudCB0YWJcIixcbiAgY29udGV4dDogXCJiYWNrZ3JvdW5kXCIsXG4gIGV4ZWN1dGU6IGFzeW5jICh0YWI/OiBCcm93c2VyLnRhYnMuVGFiKSA9PiB7XG4gICAgaWYgKHRhYj8uaWQpIHtcbiAgICAgIGF3YWl0IGJyb3dzZXIudGFicy5yZWxvYWQodGFiLmlkKTtcbiAgICAgIHJldHVybiBcIlRhYiByZWxvYWRlZC5cIjtcbiAgICB9XG4gICAgdGhyb3cgbmV3IEVycm9yKFwiQ291bGQgbm90IGRldGVybWluZSB0aGUgYWN0aXZlIHRhYiB0byByZWxvYWQuXCIpO1xuICB9LFxuICBtZXRhOiB7IHR5cGU6IFwiYnJvd3NlclwiLCBjYXRlZ29yeTogXCJ0YWJzXCIgfSxcbiAgaXNFbmFibGVkOiB0cnVlLFxuICBpc1VzZXJEZWZpbmVkOiBmYWxzZSxcbn07XG5cbmV4cG9ydCBkZWZhdWx0IHJlbG9hZFRhYkNvbW1hbmQ7XG4iLCJpbXBvcnQgeyBDb21tYW5kIH0gZnJvbSBcIi4vaW5kZXhcIjtcblxuY29uc3QgbGlzdEJvb2ttYXJrc0NvbW1hbmQ6IENvbW1hbmQgPSB7XG4gIGlkOiBcImNtZC1saXN0LWJvb2ttYXJrc1wiLFxuICBuYW1lOiBcIkxpc3QgQm9va21hcmtzXCIsXG4gIGRlc2NyaXB0aW9uOiBcIk9wZW4gdGhlIGJvb2ttYXJrcyBzZWN0aW9uIG9mIHRoZSBicm93c2VyXCIsXG4gIGNvbnRleHQ6IFwiYmFja2dyb3VuZFwiLFxuICBleGVjdXRlOiBhc3luYyAoKSA9PiB7XG4gICAgYXdhaXQgYnJvd3Nlci53aW5kb3dzLmNyZWF0ZSh7XG4gICAgICB1cmw6IFwiY2hyb21lOi8vYm9va21hcmtzL1wiLFxuICAgICAgdHlwZTogXCJwb3B1cFwiLFxuICAgIH0pO1xuICB9LFxuICBtZXRhOiB7IHR5cGU6IFwiYnJvd3NlclwiLCBjYXRlZ29yeTogXCJib29rbWFya3NcIiB9LFxuICBpc0VuYWJsZWQ6IHRydWUsXG4gIGlzVXNlckRlZmluZWQ6IGZhbHNlLFxufTtcblxuZXhwb3J0IGRlZmF1bHQgbGlzdEJvb2ttYXJrc0NvbW1hbmQ7XG4iLCJpbXBvcnQgdHlwZSB7IENvbW1hbmQgfSBmcm9tIFwiLi9pbmRleFwiO1xuXG5pbXBvcnQgeyB2NCBhcyB1dWlkdjQgfSBmcm9tIFwidXVpZFwiO1xuXG5jb25zdCBnb0JhY2tDb21tYW5kOiBDb21tYW5kID0ge1xuICBpZDogdXVpZHY0KCksXG4gIG5hbWU6IFwiR28gQmFja1wiLFxuICBkZXNjcmlwdGlvbjogXCJOYXZpZ2F0ZSBiYWNrIGluIGhpc3RvcnlcIixcbiAgY29udGV4dDogXCJjb250ZW50XCIsXG4gIGV4ZWN1dGU6ICgpID0+IHtcbiAgICB3aW5kb3cuaGlzdG9yeS5iYWNrKCk7XG4gICAgcmV0dXJuIFwiTmF2aWdhdGVkIGJhY2suXCI7IC8vIENvbnRlbnQgc2NyaXB0cyBjYW4gcmV0dXJuIHJlc3VsdHMgdG9vXG4gIH0sXG4gIG1ldGE6IHsgdHlwZTogXCJwYWdlXCIsIGNhdGVnb3J5OiBcIm5hdmlnYXRpb25cIiB9LFxufTtcblxuZXhwb3J0IGRlZmF1bHQgZ29CYWNrQ29tbWFuZDtcbiIsImltcG9ydCB0eXBlIHsgQ29tbWFuZCB9IGZyb20gXCIuL2luZGV4XCI7XG5cbmltcG9ydCB7IHY0IGFzIHV1aWR2NCB9IGZyb20gXCJ1dWlkXCI7XG5cbmNvbnN0IGdvRm9yd2FyZENvbW1hbmQ6IENvbW1hbmQgPSB7XG4gIGlkOiB1dWlkdjQoKSxcbiAgbmFtZTogXCJHbyBGb3J3YXJkXCIsXG4gIGRlc2NyaXB0aW9uOiBcIk5hdmlnYXRlIGZvcndhcmQgaW4gaGlzdG9yeVwiLFxuICBjb250ZXh0OiBcImNvbnRlbnRcIixcbiAgZXhlY3V0ZTogKCkgPT4ge1xuICAgIHdpbmRvdy5oaXN0b3J5LmZvcndhcmQoKTtcbiAgICByZXR1cm4gXCJOYXZpZ2F0ZWQgZm9yd2FyZC5cIjtcbiAgfSxcbiAgbWV0YTogeyB0eXBlOiBcInBhZ2VcIiwgY2F0ZWdvcnk6IFwibmF2aWdhdGlvblwiIH0sXG59O1xuXG5leHBvcnQgZGVmYXVsdCBnb0ZvcndhcmRDb21tYW5kO1xuIiwiaW1wb3J0IHR5cGUgeyBDb21tYW5kIH0gZnJvbSBcIi4vaW5kZXhcIjtcblxuaW1wb3J0IHsgdjQgYXMgdXVpZHY0IH0gZnJvbSBcInV1aWRcIjtcblxuY29uc3QgY29weVRpdGxlQ29tbWFuZDogQ29tbWFuZCA9IHtcbiAgaWQ6IHV1aWR2NCgpLFxuICBuYW1lOiBcIkNvcHkgUGFnZSBUaXRsZVwiLFxuICBkZXNjcmlwdGlvbjogXCJDb3B5IHRoZSBjdXJyZW50IHBhZ2UgdGl0bGUgdG8gY2xpcGJvYXJkXCIsXG4gIGNvbnRleHQ6IFwiY29udGVudFwiLFxuICBleGVjdXRlOiBhc3luYyAoKSA9PiB7XG4gICAgY29uc3QgdGl0bGUgPSBkb2N1bWVudC50aXRsZTtcbiAgICBhd2FpdCBuYXZpZ2F0b3IuY2xpcGJvYXJkLndyaXRlVGV4dCh0aXRsZSk7XG4gICAgcmV0dXJuIGBDb3BpZWQgdGl0bGU6IFwiJHt0aXRsZX1cImA7XG4gIH0sXG4gIG1ldGE6IHsgdHlwZTogXCJwYWdlXCIsIGNhdGVnb3J5OiBcImNvbnRlbnRcIiB9LFxufTtcblxuZXhwb3J0IGRlZmF1bHQgY29weVRpdGxlQ29tbWFuZDtcbiIsImltcG9ydCB0eXBlIHsgQ29tbWFuZCB9IGZyb20gXCIuL2luZGV4XCI7XG5cbmNvbnN0IGRvd25sb2FkTWFya2Rvd25Db21tYW5kOiBDb21tYW5kID0ge1xuICBpZDogXCJjbWQtZG93bmxvYWQtbWFya2Rvd25cIixcbiAgbmFtZTogXCJEb3dubG9hZCBhcyBNYXJrZG93blwiLFxuICBkZXNjcmlwdGlvbjogXCJDb252ZXJ0IHBhZ2UgY29udGVudCB0byBNYXJrZG93biBhbmQgZG93bmxvYWRcIixcbiAgY29udGV4dDogXCJjb250ZW50XCIsXG4gIGV4ZWN1dGU6IGFzeW5jICgpID0+IHtcbiAgICB0cnkge1xuICAgICAgLy8gR2V0IHBhZ2UgdGl0bGUgYW5kIGNvbnRlbnRcbiAgICAgIGNvbnN0IHRpdGxlID0gZG9jdW1lbnQudGl0bGUgfHwgXCJwYWdlXCI7XG4gICAgICBjb25zdCBjb250ZW50ID0gZG9jdW1lbnQuYm9keS5pbm5lclRleHQ7XG4gICAgICBcbiAgICAgIC8vIENvbnZlcnQgdG8gbWFya2Rvd24gKHNpbXBsZSBjb252ZXJzaW9uIC0gY2FuIGJlIGVuaGFuY2VkIGxhdGVyKVxuICAgICAgY29uc3QgbWFya2Rvd25Db250ZW50ID0gYCMgJHt0aXRsZX1cXG5cXG4ke2NvbnRlbnRcbiAgICAgICAgLnJlcGxhY2UoL14jK1xccy9nbSwgXCJcIikgLy8gUmVtb3ZlIGV4aXN0aW5nIG1hcmtkb3duIGhlYWRlcnNcbiAgICAgICAgLnJlcGxhY2UoL1xcbnszLH0vZywgXCJcXG5cXG5cIikgLy8gTm9ybWFsaXplIG5ld2xpbmVzXG4gICAgICB9YDtcbiAgICAgIFxuICAgICAgLy8gQ3JlYXRlIGRvd25sb2FkIGxpbmtcbiAgICAgIGNvbnN0IGJsb2IgPSBuZXcgQmxvYihbbWFya2Rvd25Db250ZW50XSwgeyB0eXBlOiBcInRleHQvbWFya2Rvd25cIiB9KTtcbiAgICAgIGNvbnN0IHVybCA9IFVSTC5jcmVhdGVPYmplY3RVUkwoYmxvYik7XG4gICAgICBjb25zdCBhID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImFcIik7XG4gICAgICBhLmhyZWYgPSB1cmw7XG4gICAgICBhLmRvd25sb2FkID0gYCR7dGl0bGUucmVwbGFjZSgvW15hLXowLTldL2dpLCBcIl9cIikudG9Mb3dlckNhc2UoKX0ubWRgO1xuICAgICAgZG9jdW1lbnQuYm9keS5hcHBlbmRDaGlsZChhKTtcbiAgICAgIGEuY2xpY2soKTtcbiAgICAgIFxuICAgICAgLy8gQ2xlYW51cFxuICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgIGRvY3VtZW50LmJvZHkucmVtb3ZlQ2hpbGQoYSk7XG4gICAgICAgIFVSTC5yZXZva2VPYmplY3RVUkwodXJsKTtcbiAgICAgIH0sIDEwMCk7XG4gICAgICBcbiAgICAgIHJldHVybiBgRG93bmxvYWRlZCBcIiR7dGl0bGV9XCIgYXMgbWFya2Rvd25gO1xuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICBjb25zb2xlLmVycm9yKFwiRmFpbGVkIHRvIGRvd25sb2FkIG1hcmtkb3duOlwiLCBlcnJvcik7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXCJGYWlsZWQgdG8gY29udmVydCBwYWdlIHRvIG1hcmtkb3duXCIpO1xuICAgIH1cbiAgfSxcbiAgbWV0YTogeyB0eXBlOiBcInBhZ2VcIiwgY2F0ZWdvcnk6IFwiY29udGVudFwiIH0sXG4gIGlzRW5hYmxlZDogdHJ1ZSxcbiAgaXNVc2VyRGVmaW5lZDogZmFsc2UsXG59O1xuXG5leHBvcnQgZGVmYXVsdCBkb3dubG9hZE1hcmtkb3duQ29tbWFuZDsiLCJpbXBvcnQgdHlwZSB7IENvbW1hbmQgfSBmcm9tICcuL2luZGV4JztcblxuY29uc3QgY2xvc2VUYWJzUmlnaHQ6IENvbW1hbmQgPSB7XG4gIGlkOiAnY2xvc2UtdGFicy1yaWdodCcsXG4gIG5hbWU6ICdDbG9zZSBUYWJzIHRvIHRoZSBSaWdodCcsXG4gIGRlc2NyaXB0aW9uOiAnQ2xvc2UgYWxsIHRhYnMgdG8gdGhlIHJpZ2h0IG9mIHRoZSBjdXJyZW50IHRhYicsXG4gIGNvbnRleHQ6ICdiYWNrZ3JvdW5kJyxcbiAgZXhlY3V0ZTogYXN5bmMgKCkgPT4ge1xuICAgIGNvbnN0IHRhYnMgPSBhd2FpdCBicm93c2VyLnRhYnMucXVlcnkoeyBjdXJyZW50V2luZG93OiB0cnVlIH0pO1xuICAgIGNvbnN0IGN1cnJlbnRUYWIgPSB0YWJzLmZpbmQodGFiID0+IHRhYi5hY3RpdmUpO1xuICAgIFxuICAgIGlmICghY3VycmVudFRhYj8uaWQpIHJldHVybjtcblxuICAgIGNvbnN0IHRhYnNUb0Nsb3NlID0gdGFicy5maWx0ZXIodGFiID0+IFxuICAgICAgdGFiLmluZGV4ID4gY3VycmVudFRhYi5pbmRleCAmJiB0YWIuaWRcbiAgICApO1xuICAgIFxuICAgIGF3YWl0IGJyb3dzZXIudGFicy5yZW1vdmUodGFic1RvQ2xvc2UubWFwKHRhYiA9PiB0YWIuaWQhKSk7XG4gICAgcmV0dXJuIHsgc3VjY2VzczogdHJ1ZSwgbWVzc2FnZTogYENsb3NlZCAke3RhYnNUb0Nsb3NlLmxlbmd0aH0gdGFic2AgfTtcbiAgfSxcbiAgaXNFbmFibGVkOiB0cnVlLFxuICBpc1VzZXJEZWZpbmVkOiBmYWxzZSxcbiAgbWV0YTogeyB0eXBlOiBcImJyb3dzZXJcIiwgY2F0ZWdvcnk6IFwidGFic1wiIH0sXG59O1xuXG5leHBvcnQgZGVmYXVsdCBjbG9zZVRhYnNSaWdodDsiLCJpbXBvcnQgeyB2NCBhcyB1dWlkdjQgfSBmcm9tIFwidXVpZFwiO1xuaW1wb3J0IHsgc3RvcmFnZSB9IGZyb20gXCIjaW1wb3J0c1wiOyAvLyBBc3N1bWluZyAjaW1wb3J0cyByZXNvbHZlcyB3eHQvc3RvcmFnZVxuaW1wb3J0IHR5cGUgeyBCcm93c2VyIH0gZnJvbSBcInd4dC9icm93c2VyXCI7XG5cbi8vIC0tLSBDb3JlIENvbW1hbmQgRGVmaW5pdGlvbiAtLS1cbmV4cG9ydCB0eXBlIENvbW1hbmRFeGVjdXRpb25Db250ZXh0ID0gXCJiYWNrZ3JvdW5kXCIgfCBcImNvbnRlbnRcIjtcblxuZXhwb3J0IGludGVyZmFjZSBDb21tYW5kTWV0YWRhdGEge1xuICBuYW1lOiBzdHJpbmc7XG4gIGRlc2NyaXB0aW9uOiBzdHJpbmc7XG4gIGNvbnRleHQ6IENvbW1hbmRFeGVjdXRpb25Db250ZXh0O1xuICBtZXRhPzogeyBba2V5OiBzdHJpbmddOiBhbnkgfTtcbiAgaXNVc2VyRGVmaW5lZDogYm9vbGVhbjtcbiAgaXNFbmFibGVkOiBib29sZWFuO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIENvbW1hbmQgZXh0ZW5kcyBDb21tYW5kTWV0YWRhdGEge1xuICBpZDogc3RyaW5nO1xuICBleGVjdXRlOiAoLi4uYXJnczogYW55W10pID0+IFByb21pc2U8YW55PiB8IGFueTtcbn1cblxuLy8gLS0tIFN0b3JhZ2UgU3RydWN0dXJlcyAtLS1cbmV4cG9ydCBpbnRlcmZhY2UgU3RvcmVkVXNlckNvbW1hbmQgZXh0ZW5kcyBDb21tYW5kTWV0YWRhdGEge1xuICBpZDogc3RyaW5nO1xuICBleGVjdXRlU2NyaXB0OiBzdHJpbmc7XG59XG5cbmV4cG9ydCB0eXBlIFN0b3JlZFNvdXJjZUNvbW1hbmRPdmVycmlkZSA9IFBhcnRpYWw8XG4gIE9taXQ8Q29tbWFuZE1ldGFkYXRhLCBcImlzVXNlckRlZmluZWRcIiB8IFwiY29udGV4dFwiPlxuPjtcblxuLy8gLS0tIFN0b3JhZ2UgRGVmaW5pdGlvbnMgLS0tXG5jb25zdCBVU0VSX0NPTU1BTkRTX1NUT1JBR0VfS0VZID0gXCJ1c2VyX2NvbW1hbmRzXCI7XG5jb25zdCBTT1VSQ0VfT1ZFUlJJREVTX1NUT1JBR0VfS0VZID0gXCJzb3VyY2VfY29tbWFuZF9vdmVycmlkZXNcIjtcblxuY29uc3QgdXNlckNvbW1hbmRzU3RvcmFnZSA9IHN0b3JhZ2UuZGVmaW5lSXRlbTxTdG9yZWRVc2VyQ29tbWFuZFtdPihcbiAgYGxvY2FsOiR7VVNFUl9DT01NQU5EU19TVE9SQUdFX0tFWX1gLFxuICB7IGZhbGxiYWNrOiBbXSB9LFxuKTtcblxuY29uc3Qgc291cmNlT3ZlcnJpZGVzU3RvcmFnZSA9IHN0b3JhZ2UuZGVmaW5lSXRlbTxcbiAgUmVjb3JkPHN0cmluZywgU3RvcmVkU291cmNlQ29tbWFuZE92ZXJyaWRlPlxuPihgbG9jYWw6JHtTT1VSQ0VfT1ZFUlJJREVTX1NUT1JBR0VfS0VZfWAsIHsgZmFsbGJhY2s6IHt9IH0pO1xuXG4vLyAtLS0gU3RhdGljIFNvdXJjZSBDb21tYW5kIERlZmluaXRpb25zIC0tLVxuLy8gSW1wb3J0IHRoZSAqZXhlY3V0YWJsZSogY29tbWFuZCBkZWZpbml0aW9uc1xuaW1wb3J0IG5ld1RhYkNvbW1hbmREZWYgZnJvbSBcIi4vbmV3LXRhYlwiO1xuaW1wb3J0IGNsb3NlVGFiQ29tbWFuZERlZiBmcm9tIFwiLi9jbG9zZS10YWJcIjtcbmltcG9ydCByZWxvYWRUYWJDb21tYW5kRGVmIGZyb20gXCIuL3JlbG9hZC10YWJcIjtcbmltcG9ydCBsaXN0Qm9va21hcmtzQ29tbWFuZERlZiBmcm9tIFwiLi9saXN0LWJvb2ttYXJrc1wiO1xuaW1wb3J0IGdvQmFja0NvbW1hbmREZWYgZnJvbSBcIi4vZ28tYmFja1wiO1xuaW1wb3J0IGdvRm9yd2FyZENvbW1hbmREZWYgZnJvbSBcIi4vZ28tZm9yd2FyZFwiO1xuaW1wb3J0IGNvcHlUaXRsZUNvbW1hbmREZWYgZnJvbSBcIi4vY29weS10aXRsZVwiO1xuaW1wb3J0IGRvd25sb2FkTWFya2Rvd25Db21tYW5kRGVmIGZyb20gXCIuL2Rvd25sb2FkLW1hcmtkb3duXCI7XG5pbXBvcnQgY2xvc2VUYWJzUmlnaHQgZnJvbSBcIi4vY2xvc2UtdGFicy1yaWdodHNcIjtcbmltcG9ydCB0b2dnbGVEYXJrTW9kZUNvbW1hbmQgZnJvbSBcIi4vdG9nZ2xlLWRhcmstbW9kZVwiO1xuXG4vLyBUaGlzIG1hcCBob2xkcyB0aGUgKm9yaWdpbmFsLCBjb2RlLWRlZmluZWQqIHNvdXJjZSBjb21tYW5kcy5cbmNvbnN0IHNvdXJjZUNvbW1hbmREZWZpbml0aW9uczogUmVhZG9ubHk8XG4gIFJlY29yZDxzdHJpbmcsIE9taXQ8Q29tbWFuZCwgXCJpZFwiIHwgXCJpc1VzZXJEZWZpbmVkXCIgfCBcImlzRW5hYmxlZFwiPj5cbj4gPSB7XG4gIFwiY21kLW5ldy10YWJcIjogbmV3VGFiQ29tbWFuZERlZixcbiAgXCJjbWQtY2xvc2UtdGFiXCI6IGNsb3NlVGFiQ29tbWFuZERlZixcbiAgXCJjbWQtcmVsb2FkLXRhYlwiOiByZWxvYWRUYWJDb21tYW5kRGVmLFxuICBcImNtZC1saXN0LWJvb2ttYXJrc1wiOiBsaXN0Qm9va21hcmtzQ29tbWFuZERlZixcbiAgXCJjbWQtZ28tYmFja1wiOiBnb0JhY2tDb21tYW5kRGVmLFxuICBcImNtZC1nby1mb3J3YXJkXCI6IGdvRm9yd2FyZENvbW1hbmREZWYsXG4gIFwiY21kLWNvcHktdGl0bGVcIjogY29weVRpdGxlQ29tbWFuZERlZixcbiAgXCJjbWQtZG93bmxvYWQtbWFya2Rvd25cIjogZG93bmxvYWRNYXJrZG93bkNvbW1hbmREZWYsXG4gIFwiY21kLWNsb3NlLXRhYnMtcmlnaHRcIjogY2xvc2VUYWJzUmlnaHQsXG4gIC8vIFwiY21kLXRvZ2dsZS1kYXJrLW1vZGVcIjogdG9nZ2xlRGFya01vZGVDb21tYW5kXG59O1xuXG4vLyAtLS0gSGVscGVyIEZ1bmN0aW9ucyAtLS1cblxuLyoqIENyZWF0ZXMgYW4gZXhlY3V0YWJsZSBmdW5jdGlvbiBmcm9tIGEgc2NyaXB0IHN0cmluZyAqL1xuZnVuY3Rpb24gY3JlYXRlRnVuY3Rpb25Gcm9tU3RyaW5nKFxuICBzY3JpcHQ6IHN0cmluZyxcbik6ICguLi5hcmdzOiBhbnlbXSkgPT4gUHJvbWlzZTxhbnk+IHwgYW55IHtcbiAgdHJ5IHtcbiAgICByZXR1cm4gbmV3IEZ1bmN0aW9uKFxuICAgICAgXCIuLi5hcmdzXCIsXG4gICAgICBgcmV0dXJuIChhc3luYyAoLi4uYXJncykgPT4geyAke3NjcmlwdH0gfSkoLi4uYXJncyk7YCxcbiAgICApIGFzIGFueTtcbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICBjb25zb2xlLmVycm9yKFwiRXJyb3IgY3JlYXRpbmcgZnVuY3Rpb24gZnJvbSBzdHJpbmc6XCIsIGVycm9yKTtcbiAgICByZXR1cm4gKCkgPT5cbiAgICAgIFByb21pc2UucmVqZWN0KFxuICAgICAgICBuZXcgRXJyb3IoYEZhaWxlZCB0byBjb21waWxlIHVzZXIgY29tbWFuZCBzY3JpcHQ6ICR7ZXJyb3J9YCksXG4gICAgICApO1xuICB9XG59XG5cbi8qKiBNZXJnZXMgYSBzdGF0aWMgc291cmNlIGNvbW1hbmQgZGVmaW5pdGlvbiB3aXRoIHN0b3JlZCBvdmVycmlkZXMgKi9cbmZ1bmN0aW9uIG1lcmdlU291cmNlV2l0aE92ZXJyaWRlKFxuICBpZDogc3RyaW5nLFxuICBzb3VyY2VEZWY6IE9taXQ8Q29tbWFuZCwgXCJpc1VzZXJEZWZpbmVkXCIgfCBcImlzRW5hYmxlZFwiPixcbiAgb3ZlcnJpZGVEYXRhOiBTdG9yZWRTb3VyY2VDb21tYW5kT3ZlcnJpZGUgfCB1bmRlZmluZWQsXG4pOiBDb21tYW5kIHtcbiAgY29uc3QgYmFzZTogQ29tbWFuZCA9IHtcbiAgICAuLi5zb3VyY2VEZWYsXG4gICAgaWQ6IGlkLFxuICAgIGlzVXNlckRlZmluZWQ6IGZhbHNlLFxuICAgIGlzRW5hYmxlZDogdHJ1ZSwgLy8gRGVmYXVsdCB0byBlbmFibGVkXG4gIH07XG5cbiAgaWYgKG92ZXJyaWRlRGF0YSkge1xuICAgIHJldHVybiB7XG4gICAgICAuLi5iYXNlLFxuICAgICAgbmFtZTogb3ZlcnJpZGVEYXRhLm5hbWUgIT09IHVuZGVmaW5lZCA/IG92ZXJyaWRlRGF0YS5uYW1lIDogYmFzZS5uYW1lLFxuICAgICAgZGVzY3JpcHRpb246XG4gICAgICAgIG92ZXJyaWRlRGF0YS5kZXNjcmlwdGlvbiAhPT0gdW5kZWZpbmVkXG4gICAgICAgICAgPyBvdmVycmlkZURhdGEuZGVzY3JpcHRpb25cbiAgICAgICAgICA6IGJhc2UuZGVzY3JpcHRpb24sXG4gICAgICBpc0VuYWJsZWQ6XG4gICAgICAgIG92ZXJyaWRlRGF0YS5pc0VuYWJsZWQgIT09IHVuZGVmaW5lZFxuICAgICAgICAgID8gb3ZlcnJpZGVEYXRhLmlzRW5hYmxlZFxuICAgICAgICAgIDogYmFzZS5pc0VuYWJsZWQsXG4gICAgICBtZXRhOlxuICAgICAgICBvdmVycmlkZURhdGEubWV0YSAhPT0gdW5kZWZpbmVkXG4gICAgICAgICAgPyB7IC4uLihiYXNlLm1ldGEgfHwge30pLCAuLi5vdmVycmlkZURhdGEubWV0YSB9XG4gICAgICAgICAgOiBiYXNlLm1ldGEsXG4gICAgfTtcbiAgfVxuICByZXR1cm4gYmFzZTtcbn1cblxuLy8gLS0tIFBydW5pbmcgRnVuY3Rpb24gKEV4cG9ydGVkIGZvciB1c2UgaW4gYmFja2dyb3VuZCBzY3JpcHQpIC0tLVxuLyoqXG4gKiBSZW1vdmVzIG92ZXJyaWRlcyBmcm9tIHN0b3JhZ2UgdGhhdCBkb24ndCBjb3JyZXNwb25kIHRvIGFueSBrbm93biBzdGF0aWMgc291cmNlIGNvbW1hbmQgZGVmaW5pdGlvbiBJRC5cbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHBydW5lT3JwaGFuZWRPdmVycmlkZXMoKSB7XG4gIGNvbnNvbGUubG9nKFwiUHJ1bmluZyBvcnBoYW5lZCBjb21tYW5kIG92ZXJyaWRlcy4uLlwiKTtcbiAgY29uc3Qgb3ZlcnJpZGVzID0gYXdhaXQgc291cmNlT3ZlcnJpZGVzU3RvcmFnZS5nZXRWYWx1ZSgpO1xuICBsZXQgb3ZlcnJpZGVzQ2hhbmdlZCA9IGZhbHNlO1xuICBmb3IgKGNvbnN0IGlkIGluIG92ZXJyaWRlcykge1xuICAgIGlmICghc291cmNlQ29tbWFuZERlZmluaXRpb25zW2lkXSkge1xuICAgICAgY29uc29sZS5sb2coYFBydW5pbmcgb3ZlcnJpZGUgZm9yIHVua25vd24gc291cmNlIGNvbW1hbmQgSUQ6ICR7aWR9YCk7XG4gICAgICBkZWxldGUgb3ZlcnJpZGVzW2lkXTtcbiAgICAgIG92ZXJyaWRlc0NoYW5nZWQgPSB0cnVlO1xuICAgIH1cbiAgfVxuICBpZiAob3ZlcnJpZGVzQ2hhbmdlZCkge1xuICAgIGF3YWl0IHNvdXJjZU92ZXJyaWRlc1N0b3JhZ2Uuc2V0VmFsdWUob3ZlcnJpZGVzKTtcbiAgICBjb25zb2xlLmxvZyhcIk9ycGhhbmVkIG92ZXJyaWRlcyBwcnVuZWQuXCIpO1xuICB9IGVsc2Uge1xuICAgIGNvbnNvbGUubG9nKFwiTm8gb3JwaGFuZWQgb3ZlcnJpZGVzIGZvdW5kLlwiKTtcbiAgfVxufVxuXG4vLyAtLS0gUHVibGljIENvbW1hbmQgQVBJIChTdGF0ZWxlc3MgLSBGZXRjaGVzIG9uIGRlbWFuZCkgLS0tXG5cbi8qKlxuICogUmV0cmlldmVzIGFsbCBjb21tYW5kcyAoc291cmNlIG1lcmdlZCB3aXRoIG92ZXJyaWRlcyArIHVzZXIgY29tbWFuZHMpLlxuICogRmV0Y2hlcyBmcm9tIHN0b3JhZ2UgYW5kIG1lcmdlcyB3aXRoIHN0YXRpYyBkZWZpbml0aW9ucyBvbiBlYWNoIGNhbGwuXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBnZXRBbGxDb21tYW5kcygpOiBQcm9taXNlPENvbW1hbmRbXT4ge1xuICBjb25zdCB1c2VyQ21kc1N0b3JlZCA9IGF3YWl0IHVzZXJDb21tYW5kc1N0b3JhZ2UuZ2V0VmFsdWUoKTtcbiAgY29uc3Qgb3ZlcnJpZGVzID0gYXdhaXQgc291cmNlT3ZlcnJpZGVzU3RvcmFnZS5nZXRWYWx1ZSgpO1xuXG4gIGNvbnN0IHByb2Nlc3NlZFNvdXJjZUNvbW1hbmRzOiBDb21tYW5kW10gPSBPYmplY3QuZW50cmllcyhcbiAgICBzb3VyY2VDb21tYW5kRGVmaW5pdGlvbnMsXG4gICkubWFwKChbaWQsIHNvdXJjZURlZl0pID0+XG4gICAgbWVyZ2VTb3VyY2VXaXRoT3ZlcnJpZGUoaWQsIHNvdXJjZURlZiwgb3ZlcnJpZGVzW2lkXSksXG4gICk7XG5cbiAgY29uc3QgcHJvY2Vzc2VkVXNlckNvbW1hbmRzOiBDb21tYW5kW10gPSB1c2VyQ21kc1N0b3JlZC5tYXAoKHN0b3JlZENtZCkgPT4gKHtcbiAgICAuLi5zdG9yZWRDbWQsXG4gICAgZXhlY3V0ZTogY3JlYXRlRnVuY3Rpb25Gcm9tU3RyaW5nKHN0b3JlZENtZC5leGVjdXRlU2NyaXB0KSxcbiAgICBpc1VzZXJEZWZpbmVkOiB0cnVlLFxuICAgIGlzRW5hYmxlZDogc3RvcmVkQ21kLmlzRW5hYmxlZCAhPT0gdW5kZWZpbmVkID8gc3RvcmVkQ21kLmlzRW5hYmxlZCA6IHRydWUsXG4gIH0pKTtcblxuICBjb25zdCBhbGxDb21tYW5kcyA9IFsuLi5wcm9jZXNzZWRTb3VyY2VDb21tYW5kcywgLi4ucHJvY2Vzc2VkVXNlckNvbW1hbmRzXTtcbiAgLy8gY29uc29sZS5sb2coXCJnZXRBbGxDb21tYW5kcyBmaW5hbCBtZXJnZWQ6XCIsIGFsbENvbW1hbmRzKTsgLy8gRGVidWcgbG9nXG4gIHJldHVybiBhbGxDb21tYW5kcztcbn1cblxuLyoqXG4gKiBHZXRzIGEgc2luZ2xlIGNvbW1hbmQgYnkgaXRzIElELCBmZXRjaGluZyBhbmQgbWVyZ2luZyBkYXRhIG9uIGRlbWFuZC5cbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGdldENvbW1hbmRCeUlkKGlkOiBzdHJpbmcpOiBQcm9taXNlPENvbW1hbmQgfCB1bmRlZmluZWQ+IHtcbiAgY29uc3Qgc291cmNlRGVmID0gc291cmNlQ29tbWFuZERlZmluaXRpb25zW2lkXTtcbiAgaWYgKHNvdXJjZURlZikge1xuICAgIGNvbnN0IG92ZXJyaWRlcyA9IGF3YWl0IHNvdXJjZU92ZXJyaWRlc1N0b3JhZ2UuZ2V0VmFsdWUoKTtcbiAgICByZXR1cm4gbWVyZ2VTb3VyY2VXaXRoT3ZlcnJpZGUoaWQsIHNvdXJjZURlZiwgb3ZlcnJpZGVzW2lkXSk7XG4gIH1cblxuICBjb25zdCB1c2VyQ21kc1N0b3JlZCA9IGF3YWl0IHVzZXJDb21tYW5kc1N0b3JhZ2UuZ2V0VmFsdWUoKTtcbiAgY29uc3QgdXNlckNtZFN0b3JlZCA9IHVzZXJDbWRzU3RvcmVkLmZpbmQoKGNtZCkgPT4gY21kLmlkID09PSBpZCk7XG4gIGlmICh1c2VyQ21kU3RvcmVkKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIC4uLnVzZXJDbWRTdG9yZWQsXG4gICAgICBleGVjdXRlOiBjcmVhdGVGdW5jdGlvbkZyb21TdHJpbmcodXNlckNtZFN0b3JlZC5leGVjdXRlU2NyaXB0KSxcbiAgICAgIGlzVXNlckRlZmluZWQ6IHRydWUsXG4gICAgICBpc0VuYWJsZWQ6XG4gICAgICAgIHVzZXJDbWRTdG9yZWQuaXNFbmFibGVkICE9PSB1bmRlZmluZWQgPyB1c2VyQ21kU3RvcmVkLmlzRW5hYmxlZCA6IHRydWUsXG4gICAgfTtcbiAgfVxuICByZXR1cm4gdW5kZWZpbmVkO1xufVxuXG4vKipcbiAqIFNlYXJjaGVzIGNvbW1hbmRzIGJ5IG5hbWUsIGRlc2NyaXB0aW9uLCBvciBJRC4gVXNlcyBnZXRBbGxDb21tYW5kcyBpbnRlcm5hbGx5LlxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gc2VhcmNoQ29tbWFuZHMocXVlcnk6IHN0cmluZyk6IFByb21pc2U8Q29tbWFuZFtdPiB7XG4gIGNvbnN0IGFsbENvbW1hbmRzID0gYXdhaXQgZ2V0QWxsQ29tbWFuZHMoKTtcbiAgY29uc3QgbG93ZXJDYXNlUXVlcnkgPSBxdWVyeS50b0xvd2VyQ2FzZSgpLnRyaW0oKTtcblxuICBpZiAoIWxvd2VyQ2FzZVF1ZXJ5KSB7XG4gICAgcmV0dXJuIGFsbENvbW1hbmRzLmZpbHRlcigoY21kKSA9PiBjbWQuaXNFbmFibGVkKTsgLy8gUmV0dXJuIGFsbCBlbmFibGVkIG9ubHlcbiAgfVxuXG4gIHJldHVybiBhbGxDb21tYW5kcy5maWx0ZXIoXG4gICAgKGNtZCkgPT5cbiAgICAgIGNtZC5pc0VuYWJsZWQgJiZcbiAgICAgIChjbWQubmFtZS50b0xvd2VyQ2FzZSgpLmluY2x1ZGVzKGxvd2VyQ2FzZVF1ZXJ5KSB8fFxuICAgICAgICBjbWQuZGVzY3JpcHRpb24udG9Mb3dlckNhc2UoKS5pbmNsdWRlcyhsb3dlckNhc2VRdWVyeSkgfHxcbiAgICAgICAgY21kLmlkLnRvTG93ZXJDYXNlKCkuaW5jbHVkZXMobG93ZXJDYXNlUXVlcnkpKSxcbiAgKTtcbn1cblxuLyoqXG4gKiBDcmVhdGVzIGEgbmV3IHVzZXItZGVmaW5lZCBjb21tYW5kIGFuZCBzYXZlcyBpdCB0byBzdG9yYWdlLlxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gY3JlYXRlVXNlckNvbW1hbmQoXG4gIGNvbW1hbmREYXRhOiBPbWl0PFN0b3JlZFVzZXJDb21tYW5kLCBcImlkXCIgfCBcImlzVXNlckRlZmluZWRcIiB8IFwiaXNFbmFibGVkXCI+LFxuKTogUHJvbWlzZTxDb21tYW5kPiB7XG4gIGNvbnN0IG5ld1VzZXJDb21tYW5kU3RvcmVkOiBTdG9yZWRVc2VyQ29tbWFuZCA9IHtcbiAgICBpZDogdXVpZHY0KCksXG4gICAgLi4uY29tbWFuZERhdGEsXG4gICAgaXNVc2VyRGVmaW5lZDogdHJ1ZSxcbiAgICBpc0VuYWJsZWQ6IHRydWUsXG4gIH07XG5cbiAgY29uc3QgY3VycmVudENvbW1hbmRzID0gYXdhaXQgdXNlckNvbW1hbmRzU3RvcmFnZS5nZXRWYWx1ZSgpO1xuICBhd2FpdCB1c2VyQ29tbWFuZHNTdG9yYWdlLnNldFZhbHVlKFtcbiAgICAuLi5jdXJyZW50Q29tbWFuZHMsXG4gICAgbmV3VXNlckNvbW1hbmRTdG9yZWQsXG4gIF0pO1xuXG4gIHJldHVybiB7XG4gICAgLi4ubmV3VXNlckNvbW1hbmRTdG9yZWQsXG4gICAgZXhlY3V0ZTogY3JlYXRlRnVuY3Rpb25Gcm9tU3RyaW5nKG5ld1VzZXJDb21tYW5kU3RvcmVkLmV4ZWN1dGVTY3JpcHQpLFxuICB9O1xufVxuXG4vKipcbiAqIFVwZGF0ZXMgYSBjb21tYW5kLiBIYW5kbGVzIGJvdGggdXNlciBjb21tYW5kcyBhbmQgb3ZlcnJpZGVzIGZvciBzb3VyY2UgY29tbWFuZHMuXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiB1cGRhdGVDb21tYW5kKFxuICBpZDogc3RyaW5nLFxuICB1cGRhdGVEYXRhOiBQYXJ0aWFsPFN0b3JlZFVzZXJDb21tYW5kICYgeyBpc0VuYWJsZWQ/OiBib29sZWFuIH0+LFxuKTogUHJvbWlzZTxDb21tYW5kIHwgdW5kZWZpbmVkPiB7XG4gIC8vIFRyeSB1cGRhdGluZyBhIHVzZXIgY29tbWFuZFxuICBjb25zdCB1c2VyQ29tbWFuZHMgPSBhd2FpdCB1c2VyQ29tbWFuZHNTdG9yYWdlLmdldFZhbHVlKCk7XG4gIGNvbnN0IHVzZXJDbWRJbmRleCA9IHVzZXJDb21tYW5kcy5maW5kSW5kZXgoKGNtZCkgPT4gY21kLmlkID09PSBpZCk7XG4gIGlmICh1c2VyQ21kSW5kZXggIT09IC0xKSB7XG4gICAgY29uc3QgdXBkYXRlZFVzZXJDbWQgPSB7XG4gICAgICAuLi51c2VyQ29tbWFuZHNbdXNlckNtZEluZGV4XSxcbiAgICAgIC4uLnVwZGF0ZURhdGEsXG4gICAgICBpc1VzZXJEZWZpbmVkOiB0cnVlLFxuICAgIH07XG4gICAgLy8gRW5zdXJlIG5vbi1wcm92aWRlZCBmaWVsZHMgcmV0YWluIG9yaWdpbmFsIHZhbHVlc1xuICAgIHVwZGF0ZWRVc2VyQ21kLm5hbWUgPVxuICAgICAgdXBkYXRlZFVzZXJDbWQubmFtZSA/PyB1c2VyQ29tbWFuZHNbdXNlckNtZEluZGV4XS5uYW1lO1xuICAgIHVwZGF0ZWRVc2VyQ21kLmRlc2NyaXB0aW9uID1cbiAgICAgIHVwZGF0ZWRVc2VyQ21kLmRlc2NyaXB0aW9uID8/IHVzZXJDb21tYW5kc1t1c2VyQ21kSW5kZXhdLmRlc2NyaXB0aW9uO1xuICAgIHVwZGF0ZWRVc2VyQ21kLmNvbnRleHQgPVxuICAgICAgdXBkYXRlZFVzZXJDbWQuY29udGV4dCA/PyB1c2VyQ29tbWFuZHNbdXNlckNtZEluZGV4XS5jb250ZXh0O1xuICAgIHVwZGF0ZWRVc2VyQ21kLmV4ZWN1dGVTY3JpcHQgPVxuICAgICAgdXBkYXRlZFVzZXJDbWQuZXhlY3V0ZVNjcmlwdCA/PyB1c2VyQ29tbWFuZHNbdXNlckNtZEluZGV4XS5leGVjdXRlU2NyaXB0O1xuICAgIHVwZGF0ZWRVc2VyQ21kLmlzRW5hYmxlZCA9XG4gICAgICB1cGRhdGVkVXNlckNtZC5pc0VuYWJsZWQgPz8gdXNlckNvbW1hbmRzW3VzZXJDbWRJbmRleF0uaXNFbmFibGVkO1xuXG4gICAgdXNlckNvbW1hbmRzW3VzZXJDbWRJbmRleF0gPSB1cGRhdGVkVXNlckNtZDtcbiAgICBhd2FpdCB1c2VyQ29tbWFuZHNTdG9yYWdlLnNldFZhbHVlKHVzZXJDb21tYW5kcyk7XG4gICAgcmV0dXJuIHtcbiAgICAgIC4uLnVwZGF0ZWRVc2VyQ21kLFxuICAgICAgZXhlY3V0ZTogY3JlYXRlRnVuY3Rpb25Gcm9tU3RyaW5nKHVwZGF0ZWRVc2VyQ21kLmV4ZWN1dGVTY3JpcHQpLFxuICAgIH07XG4gIH1cblxuICAvLyBUcnkgdXBkYXRpbmcgb3ZlcnJpZGVzIGZvciBhIHNvdXJjZSBjb21tYW5kXG4gIGNvbnN0IHNvdXJjZURlZiA9IHNvdXJjZUNvbW1hbmREZWZpbml0aW9uc1tpZF07XG4gIGlmIChzb3VyY2VEZWYpIHtcbiAgICBjb25zdCBvdmVycmlkZXMgPSBhd2FpdCBzb3VyY2VPdmVycmlkZXNTdG9yYWdlLmdldFZhbHVlKCk7XG4gICAgY29uc3QgY3VycmVudE92ZXJyaWRlID0gb3ZlcnJpZGVzW2lkXSB8fCB7fTtcblxuICAgIGNvbnN0IG5ld092ZXJyaWRlOiBTdG9yZWRTb3VyY2VDb21tYW5kT3ZlcnJpZGUgPSB7XG4gICAgICBuYW1lOlxuICAgICAgICB1cGRhdGVEYXRhLm5hbWUgIT09IHVuZGVmaW5lZCA/IHVwZGF0ZURhdGEubmFtZSA6IGN1cnJlbnRPdmVycmlkZS5uYW1lLFxuICAgICAgZGVzY3JpcHRpb246XG4gICAgICAgIHVwZGF0ZURhdGEuZGVzY3JpcHRpb24gIT09IHVuZGVmaW5lZFxuICAgICAgICAgID8gdXBkYXRlRGF0YS5kZXNjcmlwdGlvblxuICAgICAgICAgIDogY3VycmVudE92ZXJyaWRlLmRlc2NyaXB0aW9uLFxuICAgICAgbWV0YTpcbiAgICAgICAgdXBkYXRlRGF0YS5tZXRhICE9PSB1bmRlZmluZWRcbiAgICAgICAgICA/IHsgLi4uKGN1cnJlbnRPdmVycmlkZS5tZXRhIHx8IHt9KSwgLi4udXBkYXRlRGF0YS5tZXRhIH1cbiAgICAgICAgICA6IGN1cnJlbnRPdmVycmlkZS5tZXRhLFxuICAgICAgaXNFbmFibGVkOlxuICAgICAgICB1cGRhdGVEYXRhLmlzRW5hYmxlZCAhPT0gdW5kZWZpbmVkXG4gICAgICAgICAgPyB1cGRhdGVEYXRhLmlzRW5hYmxlZFxuICAgICAgICAgIDogY3VycmVudE92ZXJyaWRlLmlzRW5hYmxlZCxcbiAgICB9O1xuXG4gICAgT2JqZWN0LmtleXMobmV3T3ZlcnJpZGUpLmZvckVhY2goXG4gICAgICAoa2V5KSA9PiBuZXdPdmVycmlkZVtrZXldID09PSB1bmRlZmluZWQgJiYgZGVsZXRlIG5ld092ZXJyaWRlW2tleV0sXG4gICAgKTtcblxuICAgIGNvbnN0IGlzTmFtZURlZmF1bHQgPVxuICAgICAgbmV3T3ZlcnJpZGUubmFtZSA9PT0gdW5kZWZpbmVkIHx8IG5ld092ZXJyaWRlLm5hbWUgPT09IHNvdXJjZURlZi5uYW1lO1xuICAgIGNvbnN0IGlzRGVzY0RlZmF1bHQgPVxuICAgICAgbmV3T3ZlcnJpZGUuZGVzY3JpcHRpb24gPT09IHVuZGVmaW5lZCB8fFxuICAgICAgbmV3T3ZlcnJpZGUuZGVzY3JpcHRpb24gPT09IHNvdXJjZURlZi5kZXNjcmlwdGlvbjtcbiAgICBjb25zdCBpc01ldGFEZWZhdWx0ID0gbmV3T3ZlcnJpZGUubWV0YSA9PT0gdW5kZWZpbmVkO1xuICAgIGNvbnN0IGlzRW5hYmxlZERlZmF1bHQgPVxuICAgICAgbmV3T3ZlcnJpZGUuaXNFbmFibGVkID09PSB1bmRlZmluZWQgfHwgbmV3T3ZlcnJpZGUuaXNFbmFibGVkID09PSB0cnVlO1xuXG4gICAgaWYgKGlzTmFtZURlZmF1bHQgJiYgaXNEZXNjRGVmYXVsdCAmJiBpc01ldGFEZWZhdWx0ICYmIGlzRW5hYmxlZERlZmF1bHQpIHtcbiAgICAgIGRlbGV0ZSBvdmVycmlkZXNbaWRdO1xuICAgIH0gZWxzZSB7XG4gICAgICBvdmVycmlkZXNbaWRdID0gbmV3T3ZlcnJpZGU7XG4gICAgfVxuXG4gICAgYXdhaXQgc291cmNlT3ZlcnJpZGVzU3RvcmFnZS5zZXRWYWx1ZShvdmVycmlkZXMpO1xuICAgIHJldHVybiBtZXJnZVNvdXJjZVdpdGhPdmVycmlkZShpZCwgc291cmNlRGVmLCBvdmVycmlkZXNbaWRdKTtcbiAgfVxuXG4gIGNvbnNvbGUuZXJyb3IoYENvbW1hbmQgd2l0aCBJRCAke2lkfSBub3QgZm91bmQgZm9yIHVwZGF0ZS5gKTtcbiAgcmV0dXJuIHVuZGVmaW5lZDtcbn1cblxuLyoqXG4gKiBEZWxldGVzIGEgdXNlci1kZWZpbmVkIGNvbW1hbmQgb3IgcmVzZXRzIG92ZXJyaWRlcyBmb3IgYSBzb3VyY2UgY29tbWFuZC5cbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGRlbGV0ZUNvbW1hbmQoaWQ6IHN0cmluZyk6IFByb21pc2U8Ym9vbGVhbj4ge1xuICAvLyBSZXNldCBvdmVycmlkZXMgZm9yIHNvdXJjZSBjb21tYW5kc1xuICBpZiAoc291cmNlQ29tbWFuZERlZmluaXRpb25zW2lkXSkge1xuICAgIGNvbnN0IG92ZXJyaWRlcyA9IGF3YWl0IHNvdXJjZU92ZXJyaWRlc1N0b3JhZ2UuZ2V0VmFsdWUoKTtcbiAgICBpZiAob3ZlcnJpZGVzW2lkXSkge1xuICAgICAgZGVsZXRlIG92ZXJyaWRlc1tpZF07XG4gICAgICBhd2FpdCBzb3VyY2VPdmVycmlkZXNTdG9yYWdlLnNldFZhbHVlKG92ZXJyaWRlcyk7XG4gICAgICBjb25zb2xlLmxvZyhgT3ZlcnJpZGVzIHJlc2V0IGZvciBzb3VyY2UgY29tbWFuZCAke2lkfS5gKTtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgICBjb25zb2xlLmxvZyhgTm8gb3ZlcnJpZGVzIHRvIHJlc2V0IGZvciBzb3VyY2UgY29tbWFuZCAke2lkfS5gKTtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICAvLyBEZWxldGUgdXNlciBjb21tYW5kXG4gIGNvbnN0IHVzZXJDb21tYW5kcyA9IGF3YWl0IHVzZXJDb21tYW5kc1N0b3JhZ2UuZ2V0VmFsdWUoKTtcbiAgY29uc3QgaW5pdGlhbExlbmd0aCA9IHVzZXJDb21tYW5kcy5sZW5ndGg7XG4gIGNvbnN0IHVwZGF0ZWRDb21tYW5kcyA9IHVzZXJDb21tYW5kcy5maWx0ZXIoKGNtZCkgPT4gY21kLmlkICE9PSBpZCk7XG5cbiAgaWYgKHVwZGF0ZWRDb21tYW5kcy5sZW5ndGggPCBpbml0aWFsTGVuZ3RoKSB7XG4gICAgYXdhaXQgdXNlckNvbW1hbmRzU3RvcmFnZS5zZXRWYWx1ZSh1cGRhdGVkQ29tbWFuZHMpO1xuICAgIGNvbnNvbGUubG9nKGBVc2VyIGNvbW1hbmQgJHtpZH0gZGVsZXRlZC5gKTtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuXG4gIGNvbnNvbGUud2FybihgVXNlciBjb21tYW5kIHdpdGggSUQgJHtpZH0gbm90IGZvdW5kIGZvciBkZWxldGlvbi5gKTtcbiAgcmV0dXJuIGZhbHNlO1xufVxuXG4vLyBFbnN1cmUgY29tbWFuZCBkZWZpbml0aW9uIGZpbGVzIGV4cG9ydCB0aGUgY29ycmVjdCBzdHJ1Y3R1cmVcbi8vIEV4YW1wbGU6IGxpYi9jb21tYW5kcy9uZXctdGFiLnRzIG5lZWRzIHRvIGV4cG9ydCBhbiBvYmplY3QgbWF0Y2hpbmcgT21pdDxDb21tYW5kLCAnaWQnIHwgJ2lzVXNlckRlZmluZWQnIHwgJ2lzRW5hYmxlZCc+XG4vKlxuICBpbXBvcnQgdHlwZSB7IENvbW1hbmQgfSBmcm9tICcuL2luZGV4JztcbiAgaW1wb3J0IHR5cGUgeyBCcm93c2VyIH0gZnJvbSAnd3h0L2Jyb3dzZXInO1xuXG4gIGNvbnN0IG5ld1RhYkNvbW1hbmREZWY6IE9taXQ8Q29tbWFuZCwgJ2lkJyB8ICdpc1VzZXJEZWZpbmVkJyB8ICdpc0VuYWJsZWQnPiA9IHtcbiAgICBuYW1lOiBcIk5ldyBUYWJcIixcbiAgICBkZXNjcmlwdGlvbjogXCJPcGVuIGEgbmV3IGJyb3dzZXIgdGFiXCIsXG4gICAgY29udGV4dDogXCJiYWNrZ3JvdW5kXCIsXG4gICAgZXhlY3V0ZTogYXN5bmMgKHRhYj86IEJyb3dzZXIudGFicy5UYWIsIHVybD86IHN0cmluZykgPT4geyAvLyBVcGRhdGVkIHNpZ25hdHVyZVxuICAgICAgYXdhaXQgYnJvd3Nlci50YWJzLmNyZWF0ZSh7IHVybDogdXJsIHx8IFwiYWJvdXQ6bmV3dGFiXCIgfSk7XG4gICAgICByZXR1cm4gXCJOZXcgdGFiIG9wZW5lZC5cIjtcbiAgICB9LFxuICAgIG1ldGE6IHsgdHlwZTogXCJicm93c2VyXCIsIGNhdGVnb3J5OiBcInRhYnNcIiB9LFxuICB9O1xuICBleHBvcnQgZGVmYXVsdCBuZXdUYWJDb21tYW5kRGVmO1xuKi9cbiIsImltcG9ydCB7IGdldENvbW1hbmRCeUlkIH0gZnJvbSBcIkAvbGliL2NvbW1hbmRzXCI7XG5pbXBvcnQgdHlwZSB7IENvbW1hbmQgfSBmcm9tIFwiQC9saWIvY29tbWFuZHNcIjsgLy8gSW1wb3J0IHR5cGUgaWYgbmVlZGVkXG5cbmNvbnNvbGUubG9nKFwiQmFja2dyb3VuZCBzY3JpcHQgbG9hZGVkLlwiKTtcblxuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQmFja2dyb3VuZChhc3luYyAoKSA9PiB7XG4gIGJyb3dzZXIucnVudGltZS5vbkluc3RhbGxlZC5hZGRMaXN0ZW5lcihhc3luYyAoZGV0YWlscykgPT4ge1xuICAgIGNvbnNvbGUubG9nKFwiRXh0ZW5zaW9uIGluc3RhbGxlZCBvciB1cGRhdGVkLiBMb2FkaW5nIGNvbW1hbmRzLi4uXCIpO1xuICAgIGNvbnNvbGUubG9nKFwiQ29tbWFuZHMgbG9hZGVkLlwiKTtcbiAgICAvLyBFeGFtcGxlOiBMb2cgYSBzcGVjaWZpYyBjb21tYW5kIGFmdGVyIGxvYWRpbmdcbiAgICAvLyBjb25zdCBleGFtcGxlQ21kID0gYXdhaXQgZ2V0Q29tbWFuZEJ5SWQoXCJjbWQtbmV3LXRhYlwiKTtcbiAgICAvLyBjb25zb2xlLmxvZyhcIkV4YW1wbGUgbG9hZGVkIGNvbW1hbmQ6XCIsIGV4YW1wbGVDbWQpO1xuICB9KTtcblxuICAvLyBJZiB5b3UgbmVlZCBjb21tYW5kcyBpbW1lZGlhdGVseSBvbiBzdGFydHVwIChub3QganVzdCBpbnN0YWxsKVxuICAvLyBsb2FkQ29tbWFuZHMoKTsgLy8gQ29uc2lkZXIgaWYgbmVlZGVkIG91dHNpZGUgb25JbnN0YWxsZWRcblxuICAvLyBLZXlib2FyZCBzaG9ydGN1dCBsaXN0ZW5lclxuICBicm93c2VyLmNvbW1hbmRzLm9uQ29tbWFuZC5hZGRMaXN0ZW5lcihhc3luYyAoY29tbWFuZE5hbWUpID0+IHtcbiAgICBjb25zb2xlLmxvZyhgQ29tbWFuZCByZWNlaXZlZDogJHtjb21tYW5kTmFtZX1gKTtcbiAgICBpZiAoY29tbWFuZE5hbWUgPT09IFwidG9nZ2xlX3dlYnByb21wdFwiKSB7XG4gICAgICBjb25zb2xlLmxvZyhcInNob3J0Y3V0IHByZXNzZWRcIik7XG4gICAgICBjb25zdCBbY3VycmVudFRhYl0gPSBhd2FpdCBicm93c2VyLnRhYnMucXVlcnkoe1xuICAgICAgICBhY3RpdmU6IHRydWUsXG4gICAgICAgIGN1cnJlbnRXaW5kb3c6IHRydWUsXG4gICAgICB9KTtcblxuICAgICAgaWYgKGN1cnJlbnRUYWI/LmlkKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKGBTZW5kaW5nIHRvZ2dsZS11aSBtZXNzYWdlIHRvIHRhYiAke2N1cnJlbnRUYWIuaWR9YCk7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgYXdhaXQgYnJvd3Nlci50YWJzLnNlbmRNZXNzYWdlKGN1cnJlbnRUYWIuaWQsIHtcbiAgICAgICAgICAgIGFjdGlvbjogXCJ0b2dnbGUtdWlcIixcbiAgICAgICAgICB9KTtcbiAgICAgICAgICBjb25zb2xlLmxvZyhgTWVzc2FnZSBzZW50IHN1Y2Nlc3NmdWxseSB0byB0YWIgJHtjdXJyZW50VGFiLmlkfWApO1xuICAgICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICAgIGNvbnNvbGUuZXJyb3IoXG4gICAgICAgICAgICBgRXJyb3IgY2hlY2tpbmcvc2VuZGluZyBtZXNzYWdlIHRvIHRhYiAke2N1cnJlbnRUYWIuaWR9OmAsXG4gICAgICAgICAgICBlcnJvcixcbiAgICAgICAgICApO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjb25zb2xlLmxvZyhcIk5vIGFjdGl2ZSB0YWIgZm91bmQgb3IgdGFiIGhhcyBubyBJRC5cIik7XG4gICAgICB9XG4gICAgfVxuICB9KTtcblxuICAvLyBDb21tYW5kIE9yY2hlc3RyYXRpb24gTGlzdGVuZXJcbiAgYnJvd3Nlci5ydW50aW1lLm9uTWVzc2FnZS5hZGRMaXN0ZW5lcihcbiAgICBhc3luYyAobWVzc2FnZSwgc2VuZGVyLCBzZW5kUmVzcG9uc2UpID0+IHtcbiAgICAgIGNvbnNvbGUubG9nKFxuICAgICAgICBcIk1lc3NhZ2UgcmVjZWl2ZWQgaW4gYmFja2dyb3VuZDpcIixcbiAgICAgICAgbWVzc2FnZSxcbiAgICAgICAgXCJmcm9tIHRhYjpcIixcbiAgICAgICAgc2VuZGVyLnRhYj8uaWQsXG4gICAgICApO1xuXG4gICAgICBpZiAobWVzc2FnZS5hY3Rpb24gPT09IFwiZXhlY3V0ZS1jb21tYW5kXCIpIHtcbiAgICAgICAgY29uc3QgeyBjb21tYW5kSWQsIGFyZ3MgfSA9IG1lc3NhZ2UucGF5bG9hZDtcbiAgICAgICAgbGV0IGNvbW1hbmQ6IENvbW1hbmQgfCB1bmRlZmluZWQ7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgY29tbWFuZCA9IGF3YWl0IGdldENvbW1hbmRCeUlkKGNvbW1hbmRJZCk7IC8vIFVzZSBhd2FpdFxuICAgICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICAgIGNvbnNvbGUuZXJyb3IoYEVycm9yIHJldHJpZXZpbmcgY29tbWFuZCAke2NvbW1hbmRJZH06YCwgZXJyb3IpO1xuICAgICAgICAgIHNlbmRSZXNwb25zZSh7XG4gICAgICAgICAgICBzdWNjZXNzOiBmYWxzZSxcbiAgICAgICAgICAgIGVycm9yOiBgRmFpbGVkIHRvIHJldHJpZXZlIGNvbW1hbmQ6ICR7U3RyaW5nKGVycm9yKX1gLFxuICAgICAgICAgIH0pO1xuICAgICAgICAgIHJldHVybiBmYWxzZTsgLy8gU3RvcCBwcm9jZXNzaW5nXG4gICAgICAgIH1cblxuICAgICAgICBpZiAoIWNvbW1hbmQpIHtcbiAgICAgICAgICBjb25zb2xlLmVycm9yKGBDb21tYW5kIG5vdCBmb3VuZDogJHtjb21tYW5kSWR9YCk7XG4gICAgICAgICAgc2VuZFJlc3BvbnNlKHtcbiAgICAgICAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxuICAgICAgICAgICAgZXJyb3I6IGBDb21tYW5kIG5vdCBmb3VuZDogJHtjb21tYW5kSWR9YCxcbiAgICAgICAgICB9KTtcbiAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoIWNvbW1hbmQuaXNFbmFibGVkKSB7XG4gICAgICAgICAgY29uc29sZS5sb2coYENvbW1hbmQgJyR7Y29tbWFuZC5uYW1lfScgKCR7Y29tbWFuZElkfSkgaXMgZGlzYWJsZWQuYCk7XG4gICAgICAgICAgc2VuZFJlc3BvbnNlKHtcbiAgICAgICAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxuICAgICAgICAgICAgZXJyb3I6IGBDb21tYW5kICcke2NvbW1hbmQubmFtZX0nIGlzIGRpc2FibGVkLmAsXG4gICAgICAgICAgfSk7XG4gICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc29sZS5sb2coXG4gICAgICAgICAgYE9yY2hlc3RyYXRpbmcgY29tbWFuZDogJHtjb21tYW5kLm5hbWV9IChjb250ZXh0OiAke2NvbW1hbmQuY29udGV4dH0pYCxcbiAgICAgICAgKTtcblxuICAgICAgICB0cnkge1xuICAgICAgICAgIGlmIChjb21tYW5kLmNvbnRleHQgPT09IFwiYmFja2dyb3VuZFwiKSB7XG4gICAgICAgICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBjb21tYW5kLmV4ZWN1dGUoc2VuZGVyLnRhYiwgLi4uKGFyZ3MgfHwgW10pKTsgLy8gUGFzcyB0YWIgY29udGV4dCwgdXNlIGF3YWl0XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcbiAgICAgICAgICAgICAgYEJhY2tncm91bmQgY29tbWFuZCAnJHtjb21tYW5kLm5hbWV9JyBleGVjdXRlZCBzdWNjZXNzZnVsbHkuYCxcbiAgICAgICAgICAgICk7XG4gICAgICAgICAgICBzZW5kUmVzcG9uc2UoeyBzdWNjZXNzOiB0cnVlLCByZXN1bHQgfSk7XG4gICAgICAgICAgfSBlbHNlIGlmIChjb21tYW5kLmNvbnRleHQgPT09IFwiY29udGVudFwiKSB7XG4gICAgICAgICAgICBpZiAoIXNlbmRlci50YWI/LmlkKSB7XG4gICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgICAgICAgICBcIkNhbm5vdCBleGVjdXRlIGNvbnRlbnQgc2NyaXB0IGNvbW1hbmQ6IHNlbmRlciB0YWIgSUQgaXMgbWlzc2luZy5cIixcbiAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFxuICAgICAgICAgICAgICBgRm9yd2FyZGluZyBjb21tYW5kICcke2NvbW1hbmQubmFtZX0nIHRvIGNvbnRlbnQgc2NyaXB0IGluIHRhYiAke3NlbmRlci50YWIuaWR9YCxcbiAgICAgICAgICAgICk7XG4gICAgICAgICAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IGJyb3dzZXIudGFicy5zZW5kTWVzc2FnZShzZW5kZXIudGFiLmlkLCB7XG4gICAgICAgICAgICAgIC8vIFVzZSBhd2FpdFxuICAgICAgICAgICAgICBhY3Rpb246IFwicnVuLWNvbnRlbnQtY29tbWFuZFwiLFxuICAgICAgICAgICAgICBwYXlsb2FkOiB7IGNvbW1hbmRJZCwgYXJnczogYXJncyB8fCBbXSB9LFxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcbiAgICAgICAgICAgICAgYFJlc3BvbnNlIGZyb20gY29udGVudCBzY3JpcHQgZm9yICcke2NvbW1hbmQubmFtZX0nOmAsXG4gICAgICAgICAgICAgIHJlc3BvbnNlLFxuICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIHNlbmRSZXNwb25zZShyZXNwb25zZSk7IC8vIEZvcndhcmQgdGhlIHJlc3BvbnNlXG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgVW5zdXBwb3J0ZWQgY29tbWFuZCBjb250ZXh0OiAke2NvbW1hbmQuY29udGV4dH1gKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgY29uc29sZS5lcnJvcihcbiAgICAgICAgICAgIGBFcnJvciBkdXJpbmcgY29tbWFuZCBvcmNoZXN0cmF0aW9uL2V4ZWN1dGlvbiBmb3IgJyR7Y29tbWFuZD8ubmFtZSB8fCBjb21tYW5kSWR9JzpgLFxuICAgICAgICAgICAgZXJyb3IsXG4gICAgICAgICAgKTtcbiAgICAgICAgICBzZW5kUmVzcG9uc2Uoe1xuICAgICAgICAgICAgc3VjY2VzczogZmFsc2UsXG4gICAgICAgICAgICBlcnJvcjogU3RyaW5nKGVycm9yKSxcbiAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICAvLyBJbmRpY2F0ZSB0aGF0IHRoZSByZXNwb25zZSBtaWdodCBiZSBzZW50IGFzeW5jaHJvbm91c2x5LlxuICAgICAgICAvLyBXaGlsZSB3ZSB1c2UgYXdhaXQgYWJvdmUsIHJldHVybmluZyB0cnVlIGlzIHN0aWxsIHRoZSBzYWZlc3QgcHJhY3RpY2VcbiAgICAgICAgLy8gZm9yIGNvbXBsZXggYXN5bmMgbWVzc2FnZSBoYW5kbGVycyBpbiBleHRlbnNpb25zLlxuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH1cbiAgICAgIC8vIEhhbmRsZSBvdGhlciBtZXNzYWdlIHR5cGVzIGlmIG5lZWRlZFxuICAgICAgcmV0dXJuIGZhbHNlOyAvLyBJbmRpY2F0ZSBzeW5jaHJvbm91cyBoYW5kbGluZyBpZiBtZXNzYWdlIG5vdCBoYW5kbGVkXG4gICAgfSxcbiAgKTtcbn0pO1xuIiwiLy8gc3JjL2luZGV4LnRzXG52YXIgX01hdGNoUGF0dGVybiA9IGNsYXNzIHtcbiAgY29uc3RydWN0b3IobWF0Y2hQYXR0ZXJuKSB7XG4gICAgaWYgKG1hdGNoUGF0dGVybiA9PT0gXCI8YWxsX3VybHM+XCIpIHtcbiAgICAgIHRoaXMuaXNBbGxVcmxzID0gdHJ1ZTtcbiAgICAgIHRoaXMucHJvdG9jb2xNYXRjaGVzID0gWy4uLl9NYXRjaFBhdHRlcm4uUFJPVE9DT0xTXTtcbiAgICAgIHRoaXMuaG9zdG5hbWVNYXRjaCA9IFwiKlwiO1xuICAgICAgdGhpcy5wYXRobmFtZU1hdGNoID0gXCIqXCI7XG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbnN0IGdyb3VwcyA9IC8oLiopOlxcL1xcLyguKj8pKFxcLy4qKS8uZXhlYyhtYXRjaFBhdHRlcm4pO1xuICAgICAgaWYgKGdyb3VwcyA9PSBudWxsKVxuICAgICAgICB0aHJvdyBuZXcgSW52YWxpZE1hdGNoUGF0dGVybihtYXRjaFBhdHRlcm4sIFwiSW5jb3JyZWN0IGZvcm1hdFwiKTtcbiAgICAgIGNvbnN0IFtfLCBwcm90b2NvbCwgaG9zdG5hbWUsIHBhdGhuYW1lXSA9IGdyb3VwcztcbiAgICAgIHZhbGlkYXRlUHJvdG9jb2wobWF0Y2hQYXR0ZXJuLCBwcm90b2NvbCk7XG4gICAgICB2YWxpZGF0ZUhvc3RuYW1lKG1hdGNoUGF0dGVybiwgaG9zdG5hbWUpO1xuICAgICAgdmFsaWRhdGVQYXRobmFtZShtYXRjaFBhdHRlcm4sIHBhdGhuYW1lKTtcbiAgICAgIHRoaXMucHJvdG9jb2xNYXRjaGVzID0gcHJvdG9jb2wgPT09IFwiKlwiID8gW1wiaHR0cFwiLCBcImh0dHBzXCJdIDogW3Byb3RvY29sXTtcbiAgICAgIHRoaXMuaG9zdG5hbWVNYXRjaCA9IGhvc3RuYW1lO1xuICAgICAgdGhpcy5wYXRobmFtZU1hdGNoID0gcGF0aG5hbWU7XG4gICAgfVxuICB9XG4gIGluY2x1ZGVzKHVybCkge1xuICAgIGlmICh0aGlzLmlzQWxsVXJscylcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIGNvbnN0IHUgPSB0eXBlb2YgdXJsID09PSBcInN0cmluZ1wiID8gbmV3IFVSTCh1cmwpIDogdXJsIGluc3RhbmNlb2YgTG9jYXRpb24gPyBuZXcgVVJMKHVybC5ocmVmKSA6IHVybDtcbiAgICByZXR1cm4gISF0aGlzLnByb3RvY29sTWF0Y2hlcy5maW5kKChwcm90b2NvbCkgPT4ge1xuICAgICAgaWYgKHByb3RvY29sID09PSBcImh0dHBcIilcbiAgICAgICAgcmV0dXJuIHRoaXMuaXNIdHRwTWF0Y2godSk7XG4gICAgICBpZiAocHJvdG9jb2wgPT09IFwiaHR0cHNcIilcbiAgICAgICAgcmV0dXJuIHRoaXMuaXNIdHRwc01hdGNoKHUpO1xuICAgICAgaWYgKHByb3RvY29sID09PSBcImZpbGVcIilcbiAgICAgICAgcmV0dXJuIHRoaXMuaXNGaWxlTWF0Y2godSk7XG4gICAgICBpZiAocHJvdG9jb2wgPT09IFwiZnRwXCIpXG4gICAgICAgIHJldHVybiB0aGlzLmlzRnRwTWF0Y2godSk7XG4gICAgICBpZiAocHJvdG9jb2wgPT09IFwidXJuXCIpXG4gICAgICAgIHJldHVybiB0aGlzLmlzVXJuTWF0Y2godSk7XG4gICAgfSk7XG4gIH1cbiAgaXNIdHRwTWF0Y2godXJsKSB7XG4gICAgcmV0dXJuIHVybC5wcm90b2NvbCA9PT0gXCJodHRwOlwiICYmIHRoaXMuaXNIb3N0UGF0aE1hdGNoKHVybCk7XG4gIH1cbiAgaXNIdHRwc01hdGNoKHVybCkge1xuICAgIHJldHVybiB1cmwucHJvdG9jb2wgPT09IFwiaHR0cHM6XCIgJiYgdGhpcy5pc0hvc3RQYXRoTWF0Y2godXJsKTtcbiAgfVxuICBpc0hvc3RQYXRoTWF0Y2godXJsKSB7XG4gICAgaWYgKCF0aGlzLmhvc3RuYW1lTWF0Y2ggfHwgIXRoaXMucGF0aG5hbWVNYXRjaClcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICBjb25zdCBob3N0bmFtZU1hdGNoUmVnZXhzID0gW1xuICAgICAgdGhpcy5jb252ZXJ0UGF0dGVyblRvUmVnZXgodGhpcy5ob3N0bmFtZU1hdGNoKSxcbiAgICAgIHRoaXMuY29udmVydFBhdHRlcm5Ub1JlZ2V4KHRoaXMuaG9zdG5hbWVNYXRjaC5yZXBsYWNlKC9eXFwqXFwuLywgXCJcIikpXG4gICAgXTtcbiAgICBjb25zdCBwYXRobmFtZU1hdGNoUmVnZXggPSB0aGlzLmNvbnZlcnRQYXR0ZXJuVG9SZWdleCh0aGlzLnBhdGhuYW1lTWF0Y2gpO1xuICAgIHJldHVybiAhIWhvc3RuYW1lTWF0Y2hSZWdleHMuZmluZCgocmVnZXgpID0+IHJlZ2V4LnRlc3QodXJsLmhvc3RuYW1lKSkgJiYgcGF0aG5hbWVNYXRjaFJlZ2V4LnRlc3QodXJsLnBhdGhuYW1lKTtcbiAgfVxuICBpc0ZpbGVNYXRjaCh1cmwpIHtcbiAgICB0aHJvdyBFcnJvcihcIk5vdCBpbXBsZW1lbnRlZDogZmlsZTovLyBwYXR0ZXJuIG1hdGNoaW5nLiBPcGVuIGEgUFIgdG8gYWRkIHN1cHBvcnRcIik7XG4gIH1cbiAgaXNGdHBNYXRjaCh1cmwpIHtcbiAgICB0aHJvdyBFcnJvcihcIk5vdCBpbXBsZW1lbnRlZDogZnRwOi8vIHBhdHRlcm4gbWF0Y2hpbmcuIE9wZW4gYSBQUiB0byBhZGQgc3VwcG9ydFwiKTtcbiAgfVxuICBpc1Vybk1hdGNoKHVybCkge1xuICAgIHRocm93IEVycm9yKFwiTm90IGltcGxlbWVudGVkOiB1cm46Ly8gcGF0dGVybiBtYXRjaGluZy4gT3BlbiBhIFBSIHRvIGFkZCBzdXBwb3J0XCIpO1xuICB9XG4gIGNvbnZlcnRQYXR0ZXJuVG9SZWdleChwYXR0ZXJuKSB7XG4gICAgY29uc3QgZXNjYXBlZCA9IHRoaXMuZXNjYXBlRm9yUmVnZXgocGF0dGVybik7XG4gICAgY29uc3Qgc3RhcnNSZXBsYWNlZCA9IGVzY2FwZWQucmVwbGFjZSgvXFxcXFxcKi9nLCBcIi4qXCIpO1xuICAgIHJldHVybiBSZWdFeHAoYF4ke3N0YXJzUmVwbGFjZWR9JGApO1xuICB9XG4gIGVzY2FwZUZvclJlZ2V4KHN0cmluZykge1xuICAgIHJldHVybiBzdHJpbmcucmVwbGFjZSgvWy4qKz9eJHt9KCl8W1xcXVxcXFxdL2csIFwiXFxcXCQmXCIpO1xuICB9XG59O1xudmFyIE1hdGNoUGF0dGVybiA9IF9NYXRjaFBhdHRlcm47XG5NYXRjaFBhdHRlcm4uUFJPVE9DT0xTID0gW1wiaHR0cFwiLCBcImh0dHBzXCIsIFwiZmlsZVwiLCBcImZ0cFwiLCBcInVyblwiXTtcbnZhciBJbnZhbGlkTWF0Y2hQYXR0ZXJuID0gY2xhc3MgZXh0ZW5kcyBFcnJvciB7XG4gIGNvbnN0cnVjdG9yKG1hdGNoUGF0dGVybiwgcmVhc29uKSB7XG4gICAgc3VwZXIoYEludmFsaWQgbWF0Y2ggcGF0dGVybiBcIiR7bWF0Y2hQYXR0ZXJufVwiOiAke3JlYXNvbn1gKTtcbiAgfVxufTtcbmZ1bmN0aW9uIHZhbGlkYXRlUHJvdG9jb2wobWF0Y2hQYXR0ZXJuLCBwcm90b2NvbCkge1xuICBpZiAoIU1hdGNoUGF0dGVybi5QUk9UT0NPTFMuaW5jbHVkZXMocHJvdG9jb2wpICYmIHByb3RvY29sICE9PSBcIipcIilcbiAgICB0aHJvdyBuZXcgSW52YWxpZE1hdGNoUGF0dGVybihcbiAgICAgIG1hdGNoUGF0dGVybixcbiAgICAgIGAke3Byb3RvY29sfSBub3QgYSB2YWxpZCBwcm90b2NvbCAoJHtNYXRjaFBhdHRlcm4uUFJPVE9DT0xTLmpvaW4oXCIsIFwiKX0pYFxuICAgICk7XG59XG5mdW5jdGlvbiB2YWxpZGF0ZUhvc3RuYW1lKG1hdGNoUGF0dGVybiwgaG9zdG5hbWUpIHtcbiAgaWYgKGhvc3RuYW1lLmluY2x1ZGVzKFwiOlwiKSlcbiAgICB0aHJvdyBuZXcgSW52YWxpZE1hdGNoUGF0dGVybihtYXRjaFBhdHRlcm4sIGBIb3N0bmFtZSBjYW5ub3QgaW5jbHVkZSBhIHBvcnRgKTtcbiAgaWYgKGhvc3RuYW1lLmluY2x1ZGVzKFwiKlwiKSAmJiBob3N0bmFtZS5sZW5ndGggPiAxICYmICFob3N0bmFtZS5zdGFydHNXaXRoKFwiKi5cIikpXG4gICAgdGhyb3cgbmV3IEludmFsaWRNYXRjaFBhdHRlcm4oXG4gICAgICBtYXRjaFBhdHRlcm4sXG4gICAgICBgSWYgdXNpbmcgYSB3aWxkY2FyZCAoKiksIGl0IG11c3QgZ28gYXQgdGhlIHN0YXJ0IG9mIHRoZSBob3N0bmFtZWBcbiAgICApO1xufVxuZnVuY3Rpb24gdmFsaWRhdGVQYXRobmFtZShtYXRjaFBhdHRlcm4sIHBhdGhuYW1lKSB7XG4gIHJldHVybjtcbn1cbmV4cG9ydCB7XG4gIEludmFsaWRNYXRjaFBhdHRlcm4sXG4gIE1hdGNoUGF0dGVyblxufTtcbiJdLCJuYW1lcyI6WyJicm93c2VyIiwiX2Jyb3dzZXIiLCJyZXN1bHQiLCJfYSIsInV1aWR2NCIsIm5ld1RhYkNvbW1hbmREZWYiLCJjbG9zZVRhYkNvbW1hbmREZWYiLCJyZWxvYWRUYWJDb21tYW5kRGVmIiwibGlzdEJvb2ttYXJrc0NvbW1hbmREZWYiLCJnb0JhY2tDb21tYW5kRGVmIiwiZ29Gb3J3YXJkQ29tbWFuZERlZiIsImNvcHlUaXRsZUNvbW1hbmREZWYiLCJkb3dubG9hZE1hcmtkb3duQ29tbWFuZERlZiIsIl9iIl0sIm1hcHBpbmdzIjoiOzs7QUFBTyxXQUFTLGlCQUFpQixLQUFLO0FBQ3BDLFFBQUksT0FBTyxRQUFRLE9BQU8sUUFBUSxXQUFZLFFBQU8sRUFBRSxNQUFNLElBQUs7QUFDbEUsV0FBTztBQUFBLEVBQ1Q7QUNGTyxRQUFNQSxjQUFVLHNCQUFXLFlBQVgsbUJBQW9CLFlBQXBCLG1CQUE2QixNQUNoRCxXQUFXLFVBQ1gsV0FBVztBQ0ZSLFFBQU1BLFlBQVVDO0FDRHZCLE1BQUksTUFBTSxPQUFPLFVBQVU7QUFFcEIsV0FBUyxPQUFPLEtBQUssS0FBSztBQUNoQyxRQUFJLE1BQU07QUFDVixRQUFJLFFBQVEsSUFBSyxRQUFPO0FBRXhCLFFBQUks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QyxhQUFhLFVBQVUsU0FBUyxRQUFRLEtBQUssYUFBYTtBQUM3RCxZQUFNLElBQUk7QUFBQSxRQUNSO0FBQUEsUUFDQSxHQUFHLFFBQVEsMEJBQTBCLGFBQWEsVUFBVSxLQUFLLElBQUksQ0FBQztBQUFBLE1BQ3ZFO0FBQUEsRUFDTDtBQUNBLFdBQVMsaUJBQWlCLGNBQWMsVUFBVTtBQUNoRCxRQUFJLFNBQVMsU0FBUyxHQUFHO0FBQ3ZCLFlBQU0sSUFBSSxvQkFBb0IsY0FBYyxnQ0FBZ0M7QUFDOUUsUUFBSSxTQUFTLFNBQVMsR0FBRyxLQUFLLFNBQVMsU0FBUyxLQUFLLENBQUMsU0FBUyxXQUFXLElBQUk7QUFDNUUsWUFBTSxJQUFJO0FBQUEsUUFDUjtBQUFBLFFBQ0E7QUFBQSxNQUNEO0FBQUEsRUFDTDs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OzsiLCJ4X2dvb2dsZV9pZ25vcmVMaXN0IjpbMCwxLDIsMyw0LDUsNiw3LDgsOSwyMV19
