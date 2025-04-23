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
    id: v4(),
    name: "Download as Markdown",
    description: "Convert page content to Markdown and download",
    context: "content",
    execute: async () => {
      console.log("Downloading as markdown (implementation needed)...");
      await new Promise((res) => setTimeout(res, 50));
      return "Markdown download not yet implemented.";
    },
    meta: { type: "page", category: "content" }
  };
  background;
  const listBookmarksCommand = {
    id: v4(),
    // Example - Implement actual logic later
    name: "List Bookmarks",
    description: "Search and list bookmarks",
    context: "background",
    execute: async (query) => {
      console.log("Listing bookmarks (implementation needed)... Query:", query);
      await new Promise((res) => setTimeout(res, 50));
      return "Bookmark listing not yet implemented.";
    },
    meta: { type: "browser", category: "bookmarks" }
  };
  background;
  const newTabCommand = {
    id: v4(),
    name: "New Tab",
    description: "Open a new browser tab",
    context: "background",
    execute: async (url) => {
      await browser$1.tabs.create({ url: url || "about:newtab" });
      return "New tab opened.";
    },
    // args: [{ name: 'url', type: 'string', description: '(Optional) URL to open' }]
    meta: { type: "browser", category: "tabs" }
  };
  background;
  const reloadTabCommand = {
    id: v4(),
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
    meta: { type: "browser", category: "tabs" }
  };
  background;
  const closeTabCommand = {
    id: v4(),
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
    meta: { type: "browser", category: "tabs" }
  };
  background;
  const defaultCommands = [
    newTabCommand,
    closeTabCommand,
    reloadTabCommand,
    listBookmarksCommand,
    goBackCommand,
    goForwardCommand,
    copyTitleCommand,
    downloadMarkdownCommand
  ];
  const COMMANDS_STORAGE_KEY = "commands";
  const saved_commands = storage.defineItem(
    `local:${COMMANDS_STORAGE_KEY}`,
    {
      fallback: []
    }
  );
  async function loadCommands() {
    saveCommands(defaultCommands);
    console.log(await getAllCommands(), "allCommands after loading");
  }
  async function saveCommands(commands) {
    try {
      const commandsWithSerializedFunctions = commands.map((command) => ({
        ...command,
        execute: command.execute.toString()
      }));
      await saved_commands.setValue(commandsWithSerializedFunctions);
    } catch (error) {
      console.error("Error saving commands to storage:", error);
    }
  }
  async function getAllCommands() {
    return await saved_commands.getValue();
  }
  async function getCommandById(id) {
    const allCommands = await getAllCommands();
    return allCommands.find((command) => command.id === id);
  }
  background;
  console.log("Background script loaded.");
  const definition = defineBackground(() => {
    browser$1.runtime.onInstalled.addListener(() => {
      console.log("Extension installed or updated. Loading commands...");
      loadCommands();
      console.log(getAllCommands());
    });
    console.log(getCommandById("9e8a309c-dba2-4116-a937-50af7716e1b3"));
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
              `Error sending message to tab ${currentTab.id}:`,
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
          const command = await getCommandById(commandId);
          console.log(command);
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
            browser$1.tabs.sendMessage(sender.tab.id, {
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYmFja2dyb3VuZC5qcyIsInNvdXJjZXMiOlsiLi4vLi4vbm9kZV9tb2R1bGVzLy5wbnBtL3d4dEAwLjIwLjNfQHR5cGVzK25vZGVAMjIuMTQuMV9qaXRpQDIuNC4yX2xpZ2h0bmluZ2Nzc0AxLjI5LjJfcm9sbHVwQDQuNDAuMC9ub2RlX21vZHVsZXMvd3h0L2Rpc3QvdXRpbHMvZGVmaW5lLWJhY2tncm91bmQubWpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzLy5wbnBtL0B3eHQtZGV2K2Jyb3dzZXJAMC4wLjMxNS9ub2RlX21vZHVsZXMvQHd4dC1kZXYvYnJvd3Nlci9zcmMvaW5kZXgubWpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzLy5wbnBtL3d4dEAwLjIwLjNfQHR5cGVzK25vZGVAMjIuMTQuMV9qaXRpQDIuNC4yX2xpZ2h0bmluZ2Nzc0AxLjI5LjJfcm9sbHVwQDQuNDAuMC9ub2RlX21vZHVsZXMvd3h0L2Rpc3QvYnJvd3Nlci5tanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvLnBucG0vZGVxdWFsQDIuMC4zL25vZGVfbW9kdWxlcy9kZXF1YWwvbGl0ZS9pbmRleC5tanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvLnBucG0vYXN5bmMtbXV0ZXhAMC41LjAvbm9kZV9tb2R1bGVzL2FzeW5jLW11dGV4L2luZGV4Lm1qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy8ucG5wbS9Ad3h0LWRlditzdG9yYWdlQDEuMS4xL25vZGVfbW9kdWxlcy9Ad3h0LWRldi9zdG9yYWdlL2Rpc3QvaW5kZXgubWpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzLy5wbnBtL3V1aWRAMTEuMS4wL25vZGVfbW9kdWxlcy91dWlkL2Rpc3QvZXNtLWJyb3dzZXIvc3RyaW5naWZ5LmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzLy5wbnBtL3V1aWRAMTEuMS4wL25vZGVfbW9kdWxlcy91dWlkL2Rpc3QvZXNtLWJyb3dzZXIvcm5nLmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzLy5wbnBtL3V1aWRAMTEuMS4wL25vZGVfbW9kdWxlcy91dWlkL2Rpc3QvZXNtLWJyb3dzZXIvbmF0aXZlLmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzLy5wbnBtL3V1aWRAMTEuMS4wL25vZGVfbW9kdWxlcy91dWlkL2Rpc3QvZXNtLWJyb3dzZXIvdjQuanMiLCIuLi8uLi9saWIvY29tbWFuZHMvZ28tYmFjay50cyIsIi4uLy4uL2xpYi9jb21tYW5kcy9nby1mb3J3YXJkLnRzIiwiLi4vLi4vbGliL2NvbW1hbmRzL2NvcHktdGl0bGUudHMiLCIuLi8uLi9saWIvY29tbWFuZHMvZG93bmxvYWQtbWFya2Rvd24udHMiLCIuLi8uLi9saWIvY29tbWFuZHMvbGlzdC1ib29rbWFya3MudHMiLCIuLi8uLi9saWIvY29tbWFuZHMvbmV3LXRhYi50cyIsIi4uLy4uL2xpYi9jb21tYW5kcy9yZWxvYWQtdGFiLnRzIiwiLi4vLi4vbGliL2NvbW1hbmRzL2Nsb3NlLXRhYi50cyIsIi4uLy4uL2xpYi9jb21tYW5kcy9pbmRleC50cyIsIi4uLy4uL2VudHJ5cG9pbnRzL2JhY2tncm91bmQudHMiLCIuLi8uLi9ub2RlX21vZHVsZXMvLnBucG0vQHdlYmV4dC1jb3JlK21hdGNoLXBhdHRlcm5zQDEuMC4zL25vZGVfbW9kdWxlcy9Ad2ViZXh0LWNvcmUvbWF0Y2gtcGF0dGVybnMvbGliL2luZGV4LmpzIl0sInNvdXJjZXNDb250ZW50IjpbImV4cG9ydCBmdW5jdGlvbiBkZWZpbmVCYWNrZ3JvdW5kKGFyZykge1xuICBpZiAoYXJnID09IG51bGwgfHwgdHlwZW9mIGFyZyA9PT0gXCJmdW5jdGlvblwiKSByZXR1cm4geyBtYWluOiBhcmcgfTtcbiAgcmV0dXJuIGFyZztcbn1cbiIsIi8vICNyZWdpb24gc25pcHBldFxuZXhwb3J0IGNvbnN0IGJyb3dzZXIgPSBnbG9iYWxUaGlzLmJyb3dzZXI/LnJ1bnRpbWU/LmlkXG4gID8gZ2xvYmFsVGhpcy5icm93c2VyXG4gIDogZ2xvYmFsVGhpcy5jaHJvbWU7XG4vLyAjZW5kcmVnaW9uIHNuaXBwZXRcbiIsImltcG9ydCB7IGJyb3dzZXIgYXMgX2Jyb3dzZXIgfSBmcm9tIFwiQHd4dC1kZXYvYnJvd3NlclwiO1xuZXhwb3J0IGNvbnN0IGJyb3dzZXIgPSBfYnJvd3NlcjtcbmV4cG9ydCB7fTtcbiIsInZhciBoYXMgPSBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5O1xuXG5leHBvcnQgZnVuY3Rpb24gZGVxdWFsKGZvbywgYmFyKSB7XG5cdHZhciBjdG9yLCBsZW47XG5cdGlmIChmb28gPT09IGJhcikgcmV0dXJuIHRydWU7XG5cblx0aWYgKGZvbyAmJiBiYXIgJiYgKGN0b3I9Zm9vLmNvbnN0cnVjdG9yKSA9PT0gYmFyLmNvbnN0cnVjdG9yKSB7XG5cdFx0aWYgKGN0b3IgPT09IERhdGUpIHJldHVybiBmb28uZ2V0VGltZSgpID09PSBiYXIuZ2V0VGltZSgpO1xuXHRcdGlmIChjdG9yID09PSBSZWdFeHApIHJldHVybiBmb28udG9TdHJpbmcoKSA9PT0gYmFyLnRvU3RyaW5nKCk7XG5cblx0XHRpZiAoY3RvciA9PT0gQXJyYXkpIHtcblx0XHRcdGlmICgobGVuPWZvby5sZW5ndGgpID09PSBiYXIubGVuZ3RoKSB7XG5cdFx0XHRcdHdoaWxlIChsZW4tLSAmJiBkZXF1YWwoZm9vW2xlbl0sIGJhcltsZW5dKSk7XG5cdFx0XHR9XG5cdFx0XHRyZXR1cm4gbGVuID09PSAtMTtcblx0XHR9XG5cblx0XHRpZiAoIWN0b3IgfHwgdHlwZW9mIGZvbyA9PT0gJ29iamVjdCcpIHtcblx0XHRcdGxlbiA9IDA7XG5cdFx0XHRmb3IgKGN0b3IgaW4gZm9vKSB7XG5cdFx0XHRcdGlmIChoYXMuY2FsbChmb28sIGN0b3IpICYmICsrbGVuICYmICFoYXMuY2FsbChiYXIsIGN0b3IpKSByZXR1cm4gZmFsc2U7XG5cdFx0XHRcdGlmICghKGN0b3IgaW4gYmFyKSB8fCAhZGVxdWFsKGZvb1tjdG9yXSwgYmFyW2N0b3JdKSkgcmV0dXJuIGZhbHNlO1xuXHRcdFx0fVxuXHRcdFx0cmV0dXJuIE9iamVjdC5rZXlzKGJhcikubGVuZ3RoID09PSBsZW47XG5cdFx0fVxuXHR9XG5cblx0cmV0dXJuIGZvbyAhPT0gZm9vICYmIGJhciAhPT0gYmFyO1xufVxuIiwiY29uc3QgRV9USU1FT1VUID0gbmV3IEVycm9yKCd0aW1lb3V0IHdoaWxlIHdhaXRpbmcgZm9yIG11dGV4IHRvIGJlY29tZSBhdmFpbGFibGUnKTtcbmNvbnN0IEVfQUxSRUFEWV9MT0NLRUQgPSBuZXcgRXJyb3IoJ211dGV4IGFscmVhZHkgbG9ja2VkJyk7XG5jb25zdCBFX0NBTkNFTEVEID0gbmV3IEVycm9yKCdyZXF1ZXN0IGZvciBsb2NrIGNhbmNlbGVkJyk7XG5cbnZhciBfX2F3YWl0ZXIkMiA9ICh1bmRlZmluZWQgJiYgdW5kZWZpbmVkLl9fYXdhaXRlcikgfHwgZnVuY3Rpb24gKHRoaXNBcmcsIF9hcmd1bWVudHMsIFAsIGdlbmVyYXRvcikge1xuICAgIGZ1bmN0aW9uIGFkb3B0KHZhbHVlKSB7IHJldHVybiB2YWx1ZSBpbnN0YW5jZW9mIFAgPyB2YWx1ZSA6IG5ldyBQKGZ1bmN0aW9uIChyZXNvbHZlKSB7IHJlc29sdmUodmFsdWUpOyB9KTsgfVxuICAgIHJldHVybiBuZXcgKFAgfHwgKFAgPSBQcm9taXNlKSkoZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xuICAgICAgICBmdW5jdGlvbiBmdWxmaWxsZWQodmFsdWUpIHsgdHJ5IHsgc3RlcChnZW5lcmF0b3IubmV4dCh2YWx1ZSkpOyB9IGNhdGNoIChlKSB7IHJlamVjdChlKTsgfSB9XG4gICAgICAgIGZ1bmN0aW9uIHJlamVjdGVkKHZhbHVlKSB7IHRyeSB7IHN0ZXAoZ2VuZXJhdG9yW1widGhyb3dcIl0odmFsdWUpKTsgfSBjYXRjaCAoZSkgeyByZWplY3QoZSk7IH0gfVxuICAgICAgICBmdW5jdGlvbiBzdGVwKHJlc3VsdCkgeyByZXN1bHQuZG9uZSA/IHJlc29sdmUocmVzdWx0LnZhbHVlKSA6IGFkb3B0KHJlc3VsdC52YWx1ZSkudGhlbihmdWxmaWxsZWQsIHJlamVjdGVkKTsgfVxuICAgICAgICBzdGVwKChnZW5lcmF0b3IgPSBnZW5lcmF0b3IuYXBwbHkodGhpc0FyZywgX2FyZ3VtZW50cyB8fCBbXSkpLm5leHQoKSk7XG4gICAgfSk7XG59O1xuY2xhc3MgU2VtYXBob3JlIHtcbiAgICBjb25zdHJ1Y3RvcihfdmFsdWUsIF9jYW5jZWxFcnJvciA9IEVfQ0FOQ0VMRUQpIHtcbiAgICAgICAgdGhpcy5fdmFsdWUgPSBfdmFsdWU7XG4gICAgICAgIHRoaXMuX2NhbmNlbEVycm9yID0gX2NhbmNlbEVycm9yO1xuICAgICAgICB0aGlzLl9xdWV1ZSA9IFtdO1xuICAgICAgICB0aGlzLl93ZWlnaHRlZFdhaXRlcnMgPSBbXTtcbiAgICB9XG4gICAgYWNxdWlyZSh3ZWlnaHQgPSAxLCBwcmlvcml0eSA9IDApIHtcbiAgICAgICAgaWYgKHdlaWdodCA8PSAwKVxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBpbnZhbGlkIHdlaWdodCAke3dlaWdodH06IG11c3QgYmUgcG9zaXRpdmVgKTtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IHRhc2sgPSB7IHJlc29sdmUsIHJlamVjdCwgd2VpZ2h0LCBwcmlvcml0eSB9O1xuICAgICAgICAgICAgY29uc3QgaSA9IGZpbmRJbmRleEZyb21FbmQodGhpcy5fcXVldWUsIChvdGhlcikgPT4gcHJpb3JpdHkgPD0gb3RoZXIucHJpb3JpdHkpO1xuICAgICAgICAgICAgaWYgKGkgPT09IC0xICYmIHdlaWdodCA8PSB0aGlzLl92YWx1ZSkge1xuICAgICAgICAgICAgICAgIC8vIE5lZWRzIGltbWVkaWF0ZSBkaXNwYXRjaCwgc2tpcCB0aGUgcXVldWVcbiAgICAgICAgICAgICAgICB0aGlzLl9kaXNwYXRjaEl0ZW0odGFzayk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICB0aGlzLl9xdWV1ZS5zcGxpY2UoaSArIDEsIDAsIHRhc2spO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9XG4gICAgcnVuRXhjbHVzaXZlKGNhbGxiYWNrXzEpIHtcbiAgICAgICAgcmV0dXJuIF9fYXdhaXRlciQyKHRoaXMsIGFyZ3VtZW50cywgdm9pZCAwLCBmdW5jdGlvbiogKGNhbGxiYWNrLCB3ZWlnaHQgPSAxLCBwcmlvcml0eSA9IDApIHtcbiAgICAgICAgICAgIGNvbnN0IFt2YWx1ZSwgcmVsZWFzZV0gPSB5aWVsZCB0aGlzLmFjcXVpcmUod2VpZ2h0LCBwcmlvcml0eSk7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIHJldHVybiB5aWVsZCBjYWxsYmFjayh2YWx1ZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBmaW5hbGx5IHtcbiAgICAgICAgICAgICAgICByZWxlYXNlKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH1cbiAgICB3YWl0Rm9yVW5sb2NrKHdlaWdodCA9IDEsIHByaW9yaXR5ID0gMCkge1xuICAgICAgICBpZiAod2VpZ2h0IDw9IDApXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYGludmFsaWQgd2VpZ2h0ICR7d2VpZ2h0fTogbXVzdCBiZSBwb3NpdGl2ZWApO1xuICAgICAgICBpZiAodGhpcy5fY291bGRMb2NrSW1tZWRpYXRlbHkod2VpZ2h0LCBwcmlvcml0eSkpIHtcbiAgICAgICAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUoKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSkgPT4ge1xuICAgICAgICAgICAgICAgIGlmICghdGhpcy5fd2VpZ2h0ZWRXYWl0ZXJzW3dlaWdodCAtIDFdKVxuICAgICAgICAgICAgICAgICAgICB0aGlzLl93ZWlnaHRlZFdhaXRlcnNbd2VpZ2h0IC0gMV0gPSBbXTtcbiAgICAgICAgICAgICAgICBpbnNlcnRTb3J0ZWQodGhpcy5fd2VpZ2h0ZWRXYWl0ZXJzW3dlaWdodCAtIDFdLCB7IHJlc29sdmUsIHByaW9yaXR5IH0pO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgaXNMb2NrZWQoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl92YWx1ZSA8PSAwO1xuICAgIH1cbiAgICBnZXRWYWx1ZSgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3ZhbHVlO1xuICAgIH1cbiAgICBzZXRWYWx1ZSh2YWx1ZSkge1xuICAgICAgICB0aGlzLl92YWx1ZSA9IHZhbHVlO1xuICAgICAgICB0aGlzLl9kaXNwYXRjaFF1ZXVlKCk7XG4gICAgfVxuICAgIHJlbGVhc2Uod2VpZ2h0ID0gMSkge1xuICAgICAgICBpZiAod2VpZ2h0IDw9IDApXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYGludmFsaWQgd2VpZ2h0ICR7d2VpZ2h0fTogbXVzdCBiZSBwb3NpdGl2ZWApO1xuICAgICAgICB0aGlzLl92YWx1ZSArPSB3ZWlnaHQ7XG4gICAgICAgIHRoaXMuX2Rpc3BhdGNoUXVldWUoKTtcbiAgICB9XG4gICAgY2FuY2VsKCkge1xuICAgICAgICB0aGlzLl9xdWV1ZS5mb3JFYWNoKChlbnRyeSkgPT4gZW50cnkucmVqZWN0KHRoaXMuX2NhbmNlbEVycm9yKSk7XG4gICAgICAgIHRoaXMuX3F1ZXVlID0gW107XG4gICAgfVxuICAgIF9kaXNwYXRjaFF1ZXVlKCkge1xuICAgICAgICB0aGlzLl9kcmFpblVubG9ja1dhaXRlcnMoKTtcbiAgICAgICAgd2hpbGUgKHRoaXMuX3F1ZXVlLmxlbmd0aCA+IDAgJiYgdGhpcy5fcXVldWVbMF0ud2VpZ2h0IDw9IHRoaXMuX3ZhbHVlKSB7XG4gICAgICAgICAgICB0aGlzLl9kaXNwYXRjaEl0ZW0odGhpcy5fcXVldWUuc2hpZnQoKSk7XG4gICAgICAgICAgICB0aGlzLl9kcmFpblVubG9ja1dhaXRlcnMoKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBfZGlzcGF0Y2hJdGVtKGl0ZW0pIHtcbiAgICAgICAgY29uc3QgcHJldmlvdXNWYWx1ZSA9IHRoaXMuX3ZhbHVlO1xuICAgICAgICB0aGlzLl92YWx1ZSAtPSBpdGVtLndlaWdodDtcbiAgICAgICAgaXRlbS5yZXNvbHZlKFtwcmV2aW91c1ZhbHVlLCB0aGlzLl9uZXdSZWxlYXNlcihpdGVtLndlaWdodCldKTtcbiAgICB9XG4gICAgX25ld1JlbGVhc2VyKHdlaWdodCkge1xuICAgICAgICBsZXQgY2FsbGVkID0gZmFsc2U7XG4gICAgICAgIHJldHVybiAoKSA9PiB7XG4gICAgICAgICAgICBpZiAoY2FsbGVkKVxuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIGNhbGxlZCA9IHRydWU7XG4gICAgICAgICAgICB0aGlzLnJlbGVhc2Uod2VpZ2h0KTtcbiAgICAgICAgfTtcbiAgICB9XG4gICAgX2RyYWluVW5sb2NrV2FpdGVycygpIHtcbiAgICAgICAgaWYgKHRoaXMuX3F1ZXVlLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgZm9yIChsZXQgd2VpZ2h0ID0gdGhpcy5fdmFsdWU7IHdlaWdodCA+IDA7IHdlaWdodC0tKSB7XG4gICAgICAgICAgICAgICAgY29uc3Qgd2FpdGVycyA9IHRoaXMuX3dlaWdodGVkV2FpdGVyc1t3ZWlnaHQgLSAxXTtcbiAgICAgICAgICAgICAgICBpZiAoIXdhaXRlcnMpXG4gICAgICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgICAgIHdhaXRlcnMuZm9yRWFjaCgod2FpdGVyKSA9PiB3YWl0ZXIucmVzb2x2ZSgpKTtcbiAgICAgICAgICAgICAgICB0aGlzLl93ZWlnaHRlZFdhaXRlcnNbd2VpZ2h0IC0gMV0gPSBbXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIGNvbnN0IHF1ZXVlZFByaW9yaXR5ID0gdGhpcy5fcXVldWVbMF0ucHJpb3JpdHk7XG4gICAgICAgICAgICBmb3IgKGxldCB3ZWlnaHQgPSB0aGlzLl92YWx1ZTsgd2VpZ2h0ID4gMDsgd2VpZ2h0LS0pIHtcbiAgICAgICAgICAgICAgICBjb25zdCB3YWl0ZXJzID0gdGhpcy5fd2VpZ2h0ZWRXYWl0ZXJzW3dlaWdodCAtIDFdO1xuICAgICAgICAgICAgICAgIGlmICghd2FpdGVycylcbiAgICAgICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICAgICAgY29uc3QgaSA9IHdhaXRlcnMuZmluZEluZGV4KCh3YWl0ZXIpID0+IHdhaXRlci5wcmlvcml0eSA8PSBxdWV1ZWRQcmlvcml0eSk7XG4gICAgICAgICAgICAgICAgKGkgPT09IC0xID8gd2FpdGVycyA6IHdhaXRlcnMuc3BsaWNlKDAsIGkpKVxuICAgICAgICAgICAgICAgICAgICAuZm9yRWFjaCgod2FpdGVyID0+IHdhaXRlci5yZXNvbHZlKCkpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbiAgICBfY291bGRMb2NrSW1tZWRpYXRlbHkod2VpZ2h0LCBwcmlvcml0eSkge1xuICAgICAgICByZXR1cm4gKHRoaXMuX3F1ZXVlLmxlbmd0aCA9PT0gMCB8fCB0aGlzLl9xdWV1ZVswXS5wcmlvcml0eSA8IHByaW9yaXR5KSAmJlxuICAgICAgICAgICAgd2VpZ2h0IDw9IHRoaXMuX3ZhbHVlO1xuICAgIH1cbn1cbmZ1bmN0aW9uIGluc2VydFNvcnRlZChhLCB2KSB7XG4gICAgY29uc3QgaSA9IGZpbmRJbmRleEZyb21FbmQoYSwgKG90aGVyKSA9PiB2LnByaW9yaXR5IDw9IG90aGVyLnByaW9yaXR5KTtcbiAgICBhLnNwbGljZShpICsgMSwgMCwgdik7XG59XG5mdW5jdGlvbiBmaW5kSW5kZXhGcm9tRW5kKGEsIHByZWRpY2F0ZSkge1xuICAgIGZvciAobGV0IGkgPSBhLmxlbmd0aCAtIDE7IGkgPj0gMDsgaS0tKSB7XG4gICAgICAgIGlmIChwcmVkaWNhdGUoYVtpXSkpIHtcbiAgICAgICAgICAgIHJldHVybiBpO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiAtMTtcbn1cblxudmFyIF9fYXdhaXRlciQxID0gKHVuZGVmaW5lZCAmJiB1bmRlZmluZWQuX19hd2FpdGVyKSB8fCBmdW5jdGlvbiAodGhpc0FyZywgX2FyZ3VtZW50cywgUCwgZ2VuZXJhdG9yKSB7XG4gICAgZnVuY3Rpb24gYWRvcHQodmFsdWUpIHsgcmV0dXJuIHZhbHVlIGluc3RhbmNlb2YgUCA/IHZhbHVlIDogbmV3IFAoZnVuY3Rpb24gKHJlc29sdmUpIHsgcmVzb2x2ZSh2YWx1ZSk7IH0pOyB9XG4gICAgcmV0dXJuIG5ldyAoUCB8fCAoUCA9IFByb21pc2UpKShmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICAgIGZ1bmN0aW9uIGZ1bGZpbGxlZCh2YWx1ZSkgeyB0cnkgeyBzdGVwKGdlbmVyYXRvci5uZXh0KHZhbHVlKSk7IH0gY2F0Y2ggKGUpIHsgcmVqZWN0KGUpOyB9IH1cbiAgICAgICAgZnVuY3Rpb24gcmVqZWN0ZWQodmFsdWUpIHsgdHJ5IHsgc3RlcChnZW5lcmF0b3JbXCJ0aHJvd1wiXSh2YWx1ZSkpOyB9IGNhdGNoIChlKSB7IHJlamVjdChlKTsgfSB9XG4gICAgICAgIGZ1bmN0aW9uIHN0ZXAocmVzdWx0KSB7IHJlc3VsdC5kb25lID8gcmVzb2x2ZShyZXN1bHQudmFsdWUpIDogYWRvcHQocmVzdWx0LnZhbHVlKS50aGVuKGZ1bGZpbGxlZCwgcmVqZWN0ZWQpOyB9XG4gICAgICAgIHN0ZXAoKGdlbmVyYXRvciA9IGdlbmVyYXRvci5hcHBseSh0aGlzQXJnLCBfYXJndW1lbnRzIHx8IFtdKSkubmV4dCgpKTtcbiAgICB9KTtcbn07XG5jbGFzcyBNdXRleCB7XG4gICAgY29uc3RydWN0b3IoY2FuY2VsRXJyb3IpIHtcbiAgICAgICAgdGhpcy5fc2VtYXBob3JlID0gbmV3IFNlbWFwaG9yZSgxLCBjYW5jZWxFcnJvcik7XG4gICAgfVxuICAgIGFjcXVpcmUoKSB7XG4gICAgICAgIHJldHVybiBfX2F3YWl0ZXIkMSh0aGlzLCBhcmd1bWVudHMsIHZvaWQgMCwgZnVuY3Rpb24qIChwcmlvcml0eSA9IDApIHtcbiAgICAgICAgICAgIGNvbnN0IFssIHJlbGVhc2VyXSA9IHlpZWxkIHRoaXMuX3NlbWFwaG9yZS5hY3F1aXJlKDEsIHByaW9yaXR5KTtcbiAgICAgICAgICAgIHJldHVybiByZWxlYXNlcjtcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIHJ1bkV4Y2x1c2l2ZShjYWxsYmFjaywgcHJpb3JpdHkgPSAwKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9zZW1hcGhvcmUucnVuRXhjbHVzaXZlKCgpID0+IGNhbGxiYWNrKCksIDEsIHByaW9yaXR5KTtcbiAgICB9XG4gICAgaXNMb2NrZWQoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9zZW1hcGhvcmUuaXNMb2NrZWQoKTtcbiAgICB9XG4gICAgd2FpdEZvclVubG9jayhwcmlvcml0eSA9IDApIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3NlbWFwaG9yZS53YWl0Rm9yVW5sb2NrKDEsIHByaW9yaXR5KTtcbiAgICB9XG4gICAgcmVsZWFzZSgpIHtcbiAgICAgICAgaWYgKHRoaXMuX3NlbWFwaG9yZS5pc0xvY2tlZCgpKVxuICAgICAgICAgICAgdGhpcy5fc2VtYXBob3JlLnJlbGVhc2UoKTtcbiAgICB9XG4gICAgY2FuY2VsKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fc2VtYXBob3JlLmNhbmNlbCgpO1xuICAgIH1cbn1cblxudmFyIF9fYXdhaXRlciA9ICh1bmRlZmluZWQgJiYgdW5kZWZpbmVkLl9fYXdhaXRlcikgfHwgZnVuY3Rpb24gKHRoaXNBcmcsIF9hcmd1bWVudHMsIFAsIGdlbmVyYXRvcikge1xuICAgIGZ1bmN0aW9uIGFkb3B0KHZhbHVlKSB7IHJldHVybiB2YWx1ZSBpbnN0YW5jZW9mIFAgPyB2YWx1ZSA6IG5ldyBQKGZ1bmN0aW9uIChyZXNvbHZlKSB7IHJlc29sdmUodmFsdWUpOyB9KTsgfVxuICAgIHJldHVybiBuZXcgKFAgfHwgKFAgPSBQcm9taXNlKSkoZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xuICAgICAgICBmdW5jdGlvbiBmdWxmaWxsZWQodmFsdWUpIHsgdHJ5IHsgc3RlcChnZW5lcmF0b3IubmV4dCh2YWx1ZSkpOyB9IGNhdGNoIChlKSB7IHJlamVjdChlKTsgfSB9XG4gICAgICAgIGZ1bmN0aW9uIHJlamVjdGVkKHZhbHVlKSB7IHRyeSB7IHN0ZXAoZ2VuZXJhdG9yW1widGhyb3dcIl0odmFsdWUpKTsgfSBjYXRjaCAoZSkgeyByZWplY3QoZSk7IH0gfVxuICAgICAgICBmdW5jdGlvbiBzdGVwKHJlc3VsdCkgeyByZXN1bHQuZG9uZSA/IHJlc29sdmUocmVzdWx0LnZhbHVlKSA6IGFkb3B0KHJlc3VsdC52YWx1ZSkudGhlbihmdWxmaWxsZWQsIHJlamVjdGVkKTsgfVxuICAgICAgICBzdGVwKChnZW5lcmF0b3IgPSBnZW5lcmF0b3IuYXBwbHkodGhpc0FyZywgX2FyZ3VtZW50cyB8fCBbXSkpLm5leHQoKSk7XG4gICAgfSk7XG59O1xuZnVuY3Rpb24gd2l0aFRpbWVvdXQoc3luYywgdGltZW91dCwgdGltZW91dEVycm9yID0gRV9USU1FT1VUKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgICAgYWNxdWlyZTogKHdlaWdodE9yUHJpb3JpdHksIHByaW9yaXR5KSA9PiB7XG4gICAgICAgICAgICBsZXQgd2VpZ2h0O1xuICAgICAgICAgICAgaWYgKGlzU2VtYXBob3JlKHN5bmMpKSB7XG4gICAgICAgICAgICAgICAgd2VpZ2h0ID0gd2VpZ2h0T3JQcmlvcml0eTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIHdlaWdodCA9IHVuZGVmaW5lZDtcbiAgICAgICAgICAgICAgICBwcmlvcml0eSA9IHdlaWdodE9yUHJpb3JpdHk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAod2VpZ2h0ICE9PSB1bmRlZmluZWQgJiYgd2VpZ2h0IDw9IDApIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYGludmFsaWQgd2VpZ2h0ICR7d2VpZ2h0fTogbXVzdCBiZSBwb3NpdGl2ZWApO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IF9fYXdhaXRlcih0aGlzLCB2b2lkIDAsIHZvaWQgMCwgZnVuY3Rpb24qICgpIHtcbiAgICAgICAgICAgICAgICBsZXQgaXNUaW1lb3V0ID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgY29uc3QgaGFuZGxlID0gc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGlzVGltZW91dCA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgIHJlamVjdCh0aW1lb3V0RXJyb3IpO1xuICAgICAgICAgICAgICAgIH0sIHRpbWVvdXQpO1xuICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHRpY2tldCA9IHlpZWxkIChpc1NlbWFwaG9yZShzeW5jKVxuICAgICAgICAgICAgICAgICAgICAgICAgPyBzeW5jLmFjcXVpcmUod2VpZ2h0LCBwcmlvcml0eSlcbiAgICAgICAgICAgICAgICAgICAgICAgIDogc3luYy5hY3F1aXJlKHByaW9yaXR5KSk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChpc1RpbWVvdXQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHJlbGVhc2UgPSBBcnJheS5pc0FycmF5KHRpY2tldCkgPyB0aWNrZXRbMV0gOiB0aWNrZXQ7XG4gICAgICAgICAgICAgICAgICAgICAgICByZWxlYXNlKCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjbGVhclRpbWVvdXQoaGFuZGxlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlc29sdmUodGlja2V0KTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBjYXRjaCAoZSkge1xuICAgICAgICAgICAgICAgICAgICBpZiAoIWlzVGltZW91dCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY2xlYXJUaW1lb3V0KGhhbmRsZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICByZWplY3QoZSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KSk7XG4gICAgICAgIH0sXG4gICAgICAgIHJ1bkV4Y2x1c2l2ZShjYWxsYmFjaywgd2VpZ2h0LCBwcmlvcml0eSkge1xuICAgICAgICAgICAgcmV0dXJuIF9fYXdhaXRlcih0aGlzLCB2b2lkIDAsIHZvaWQgMCwgZnVuY3Rpb24qICgpIHtcbiAgICAgICAgICAgICAgICBsZXQgcmVsZWFzZSA9ICgpID0+IHVuZGVmaW5lZDtcbiAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCB0aWNrZXQgPSB5aWVsZCB0aGlzLmFjcXVpcmUod2VpZ2h0LCBwcmlvcml0eSk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChBcnJheS5pc0FycmF5KHRpY2tldCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlbGVhc2UgPSB0aWNrZXRbMV07XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4geWllbGQgY2FsbGJhY2sodGlja2V0WzBdKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlbGVhc2UgPSB0aWNrZXQ7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4geWllbGQgY2FsbGJhY2soKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBmaW5hbGx5IHtcbiAgICAgICAgICAgICAgICAgICAgcmVsZWFzZSgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9LFxuICAgICAgICByZWxlYXNlKHdlaWdodCkge1xuICAgICAgICAgICAgc3luYy5yZWxlYXNlKHdlaWdodCk7XG4gICAgICAgIH0sXG4gICAgICAgIGNhbmNlbCgpIHtcbiAgICAgICAgICAgIHJldHVybiBzeW5jLmNhbmNlbCgpO1xuICAgICAgICB9LFxuICAgICAgICB3YWl0Rm9yVW5sb2NrOiAod2VpZ2h0T3JQcmlvcml0eSwgcHJpb3JpdHkpID0+IHtcbiAgICAgICAgICAgIGxldCB3ZWlnaHQ7XG4gICAgICAgICAgICBpZiAoaXNTZW1hcGhvcmUoc3luYykpIHtcbiAgICAgICAgICAgICAgICB3ZWlnaHQgPSB3ZWlnaHRPclByaW9yaXR5O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgd2VpZ2h0ID0gdW5kZWZpbmVkO1xuICAgICAgICAgICAgICAgIHByaW9yaXR5ID0gd2VpZ2h0T3JQcmlvcml0eTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICh3ZWlnaHQgIT09IHVuZGVmaW5lZCAmJiB3ZWlnaHQgPD0gMCkge1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgaW52YWxpZCB3ZWlnaHQgJHt3ZWlnaHR9OiBtdXN0IGJlIHBvc2l0aXZlYCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0IGhhbmRsZSA9IHNldFRpbWVvdXQoKCkgPT4gcmVqZWN0KHRpbWVvdXRFcnJvciksIHRpbWVvdXQpO1xuICAgICAgICAgICAgICAgIChpc1NlbWFwaG9yZShzeW5jKVxuICAgICAgICAgICAgICAgICAgICA/IHN5bmMud2FpdEZvclVubG9jayh3ZWlnaHQsIHByaW9yaXR5KVxuICAgICAgICAgICAgICAgICAgICA6IHN5bmMud2FpdEZvclVubG9jayhwcmlvcml0eSkpLnRoZW4oKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBjbGVhclRpbWVvdXQoaGFuZGxlKTtcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSgpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0sXG4gICAgICAgIGlzTG9ja2VkOiAoKSA9PiBzeW5jLmlzTG9ja2VkKCksXG4gICAgICAgIGdldFZhbHVlOiAoKSA9PiBzeW5jLmdldFZhbHVlKCksXG4gICAgICAgIHNldFZhbHVlOiAodmFsdWUpID0+IHN5bmMuc2V0VmFsdWUodmFsdWUpLFxuICAgIH07XG59XG5mdW5jdGlvbiBpc1NlbWFwaG9yZShzeW5jKSB7XG4gICAgcmV0dXJuIHN5bmMuZ2V0VmFsdWUgIT09IHVuZGVmaW5lZDtcbn1cblxuLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saXNuZSBAdHlwZXNjcmlwdC1lc2xpbnQvZXhwbGljaXQtbW9kdWxlLWJvdW5kYXJ5LXR5cGVzXG5mdW5jdGlvbiB0cnlBY3F1aXJlKHN5bmMsIGFscmVhZHlBY3F1aXJlZEVycm9yID0gRV9BTFJFQURZX0xPQ0tFRCkge1xuICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tZXhwbGljaXQtYW55XG4gICAgcmV0dXJuIHdpdGhUaW1lb3V0KHN5bmMsIDAsIGFscmVhZHlBY3F1aXJlZEVycm9yKTtcbn1cblxuZXhwb3J0IHsgRV9BTFJFQURZX0xPQ0tFRCwgRV9DQU5DRUxFRCwgRV9USU1FT1VULCBNdXRleCwgU2VtYXBob3JlLCB0cnlBY3F1aXJlLCB3aXRoVGltZW91dCB9O1xuIiwiaW1wb3J0IHsgZGVxdWFsIH0gZnJvbSAnZGVxdWFsL2xpdGUnO1xuaW1wb3J0IHsgTXV0ZXggfSBmcm9tICdhc3luYy1tdXRleCc7XG5cbmNvbnN0IGJyb3dzZXIgPSAoXG4gIC8vIEB0cy1leHBlY3QtZXJyb3JcbiAgZ2xvYmFsVGhpcy5icm93c2VyPy5ydW50aW1lPy5pZCA9PSBudWxsID8gZ2xvYmFsVGhpcy5jaHJvbWUgOiAoXG4gICAgLy8gQHRzLWV4cGVjdC1lcnJvclxuICAgIGdsb2JhbFRoaXMuYnJvd3NlclxuICApXG4pO1xuY29uc3Qgc3RvcmFnZSA9IGNyZWF0ZVN0b3JhZ2UoKTtcbmZ1bmN0aW9uIGNyZWF0ZVN0b3JhZ2UoKSB7XG4gIGNvbnN0IGRyaXZlcnMgPSB7XG4gICAgbG9jYWw6IGNyZWF0ZURyaXZlcihcImxvY2FsXCIpLFxuICAgIHNlc3Npb246IGNyZWF0ZURyaXZlcihcInNlc3Npb25cIiksXG4gICAgc3luYzogY3JlYXRlRHJpdmVyKFwic3luY1wiKSxcbiAgICBtYW5hZ2VkOiBjcmVhdGVEcml2ZXIoXCJtYW5hZ2VkXCIpXG4gIH07XG4gIGNvbnN0IGdldERyaXZlciA9IChhcmVhKSA9PiB7XG4gICAgY29uc3QgZHJpdmVyID0gZHJpdmVyc1thcmVhXTtcbiAgICBpZiAoZHJpdmVyID09IG51bGwpIHtcbiAgICAgIGNvbnN0IGFyZWFOYW1lcyA9IE9iamVjdC5rZXlzKGRyaXZlcnMpLmpvaW4oXCIsIFwiKTtcbiAgICAgIHRocm93IEVycm9yKGBJbnZhbGlkIGFyZWEgXCIke2FyZWF9XCIuIE9wdGlvbnM6ICR7YXJlYU5hbWVzfWApO1xuICAgIH1cbiAgICByZXR1cm4gZHJpdmVyO1xuICB9O1xuICBjb25zdCByZXNvbHZlS2V5ID0gKGtleSkgPT4ge1xuICAgIGNvbnN0IGRlbGltaW5hdG9ySW5kZXggPSBrZXkuaW5kZXhPZihcIjpcIik7XG4gICAgY29uc3QgZHJpdmVyQXJlYSA9IGtleS5zdWJzdHJpbmcoMCwgZGVsaW1pbmF0b3JJbmRleCk7XG4gICAgY29uc3QgZHJpdmVyS2V5ID0ga2V5LnN1YnN0cmluZyhkZWxpbWluYXRvckluZGV4ICsgMSk7XG4gICAgaWYgKGRyaXZlcktleSA9PSBudWxsKVxuICAgICAgdGhyb3cgRXJyb3IoXG4gICAgICAgIGBTdG9yYWdlIGtleSBzaG91bGQgYmUgaW4gdGhlIGZvcm0gb2YgXCJhcmVhOmtleVwiLCBidXQgcmVjZWl2ZWQgXCIke2tleX1cImBcbiAgICAgICk7XG4gICAgcmV0dXJuIHtcbiAgICAgIGRyaXZlckFyZWEsXG4gICAgICBkcml2ZXJLZXksXG4gICAgICBkcml2ZXI6IGdldERyaXZlcihkcml2ZXJBcmVhKVxuICAgIH07XG4gIH07XG4gIGNvbnN0IGdldE1ldGFLZXkgPSAoa2V5KSA9PiBrZXkgKyBcIiRcIjtcbiAgY29uc3QgbWVyZ2VNZXRhID0gKG9sZE1ldGEsIG5ld01ldGEpID0+IHtcbiAgICBjb25zdCBuZXdGaWVsZHMgPSB7IC4uLm9sZE1ldGEgfTtcbiAgICBPYmplY3QuZW50cmllcyhuZXdNZXRhKS5mb3JFYWNoKChba2V5LCB2YWx1ZV0pID0+IHtcbiAgICAgIGlmICh2YWx1ZSA9PSBudWxsKSBkZWxldGUgbmV3RmllbGRzW2tleV07XG4gICAgICBlbHNlIG5ld0ZpZWxkc1trZXldID0gdmFsdWU7XG4gICAgfSk7XG4gICAgcmV0dXJuIG5ld0ZpZWxkcztcbiAgfTtcbiAgY29uc3QgZ2V0VmFsdWVPckZhbGxiYWNrID0gKHZhbHVlLCBmYWxsYmFjaykgPT4gdmFsdWUgPz8gZmFsbGJhY2sgPz8gbnVsbDtcbiAgY29uc3QgZ2V0TWV0YVZhbHVlID0gKHByb3BlcnRpZXMpID0+IHR5cGVvZiBwcm9wZXJ0aWVzID09PSBcIm9iamVjdFwiICYmICFBcnJheS5pc0FycmF5KHByb3BlcnRpZXMpID8gcHJvcGVydGllcyA6IHt9O1xuICBjb25zdCBnZXRJdGVtID0gYXN5bmMgKGRyaXZlciwgZHJpdmVyS2V5LCBvcHRzKSA9PiB7XG4gICAgY29uc3QgcmVzID0gYXdhaXQgZHJpdmVyLmdldEl0ZW0oZHJpdmVyS2V5KTtcbiAgICByZXR1cm4gZ2V0VmFsdWVPckZhbGxiYWNrKHJlcywgb3B0cz8uZmFsbGJhY2sgPz8gb3B0cz8uZGVmYXVsdFZhbHVlKTtcbiAgfTtcbiAgY29uc3QgZ2V0TWV0YSA9IGFzeW5jIChkcml2ZXIsIGRyaXZlcktleSkgPT4ge1xuICAgIGNvbnN0IG1ldGFLZXkgPSBnZXRNZXRhS2V5KGRyaXZlcktleSk7XG4gICAgY29uc3QgcmVzID0gYXdhaXQgZHJpdmVyLmdldEl0ZW0obWV0YUtleSk7XG4gICAgcmV0dXJuIGdldE1ldGFWYWx1ZShyZXMpO1xuICB9O1xuICBjb25zdCBzZXRJdGVtID0gYXN5bmMgKGRyaXZlciwgZHJpdmVyS2V5LCB2YWx1ZSkgPT4ge1xuICAgIGF3YWl0IGRyaXZlci5zZXRJdGVtKGRyaXZlcktleSwgdmFsdWUgPz8gbnVsbCk7XG4gIH07XG4gIGNvbnN0IHNldE1ldGEgPSBhc3luYyAoZHJpdmVyLCBkcml2ZXJLZXksIHByb3BlcnRpZXMpID0+IHtcbiAgICBjb25zdCBtZXRhS2V5ID0gZ2V0TWV0YUtleShkcml2ZXJLZXkpO1xuICAgIGNvbnN0IGV4aXN0aW5nRmllbGRzID0gZ2V0TWV0YVZhbHVlKGF3YWl0IGRyaXZlci5nZXRJdGVtKG1ldGFLZXkpKTtcbiAgICBhd2FpdCBkcml2ZXIuc2V0SXRlbShtZXRhS2V5LCBtZXJnZU1ldGEoZXhpc3RpbmdGaWVsZHMsIHByb3BlcnRpZXMpKTtcbiAgfTtcbiAgY29uc3QgcmVtb3ZlSXRlbSA9IGFzeW5jIChkcml2ZXIsIGRyaXZlcktleSwgb3B0cykgPT4ge1xuICAgIGF3YWl0IGRyaXZlci5yZW1vdmVJdGVtKGRyaXZlcktleSk7XG4gICAgaWYgKG9wdHM/LnJlbW92ZU1ldGEpIHtcbiAgICAgIGNvbnN0IG1ldGFLZXkgPSBnZXRNZXRhS2V5KGRyaXZlcktleSk7XG4gICAgICBhd2FpdCBkcml2ZXIucmVtb3ZlSXRlbShtZXRhS2V5KTtcbiAgICB9XG4gIH07XG4gIGNvbnN0IHJlbW92ZU1ldGEgPSBhc3luYyAoZHJpdmVyLCBkcml2ZXJLZXksIHByb3BlcnRpZXMpID0+IHtcbiAgICBjb25zdCBtZXRhS2V5ID0gZ2V0TWV0YUtleShkcml2ZXJLZXkpO1xuICAgIGlmIChwcm9wZXJ0aWVzID09IG51bGwpIHtcbiAgICAgIGF3YWl0IGRyaXZlci5yZW1vdmVJdGVtKG1ldGFLZXkpO1xuICAgIH0gZWxzZSB7XG4gICAgICBjb25zdCBuZXdGaWVsZHMgPSBnZXRNZXRhVmFsdWUoYXdhaXQgZHJpdmVyLmdldEl0ZW0obWV0YUtleSkpO1xuICAgICAgW3Byb3BlcnRpZXNdLmZsYXQoKS5mb3JFYWNoKChmaWVsZCkgPT4gZGVsZXRlIG5ld0ZpZWxkc1tmaWVsZF0pO1xuICAgICAgYXdhaXQgZHJpdmVyLnNldEl0ZW0obWV0YUtleSwgbmV3RmllbGRzKTtcbiAgICB9XG4gIH07XG4gIGNvbnN0IHdhdGNoID0gKGRyaXZlciwgZHJpdmVyS2V5LCBjYikgPT4ge1xuICAgIHJldHVybiBkcml2ZXIud2F0Y2goZHJpdmVyS2V5LCBjYik7XG4gIH07XG4gIGNvbnN0IHN0b3JhZ2UyID0ge1xuICAgIGdldEl0ZW06IGFzeW5jIChrZXksIG9wdHMpID0+IHtcbiAgICAgIGNvbnN0IHsgZHJpdmVyLCBkcml2ZXJLZXkgfSA9IHJlc29sdmVLZXkoa2V5KTtcbiAgICAgIHJldHVybiBhd2FpdCBnZXRJdGVtKGRyaXZlciwgZHJpdmVyS2V5LCBvcHRzKTtcbiAgICB9LFxuICAgIGdldEl0ZW1zOiBhc3luYyAoa2V5cykgPT4ge1xuICAgICAgY29uc3QgYXJlYVRvS2V5TWFwID0gLyogQF9fUFVSRV9fICovIG5ldyBNYXAoKTtcbiAgICAgIGNvbnN0IGtleVRvT3B0c01hcCA9IC8qIEBfX1BVUkVfXyAqLyBuZXcgTWFwKCk7XG4gICAgICBjb25zdCBvcmRlcmVkS2V5cyA9IFtdO1xuICAgICAga2V5cy5mb3JFYWNoKChrZXkpID0+IHtcbiAgICAgICAgbGV0IGtleVN0cjtcbiAgICAgICAgbGV0IG9wdHM7XG4gICAgICAgIGlmICh0eXBlb2Yga2V5ID09PSBcInN0cmluZ1wiKSB7XG4gICAgICAgICAga2V5U3RyID0ga2V5O1xuICAgICAgICB9IGVsc2UgaWYgKFwiZ2V0VmFsdWVcIiBpbiBrZXkpIHtcbiAgICAgICAgICBrZXlTdHIgPSBrZXkua2V5O1xuICAgICAgICAgIG9wdHMgPSB7IGZhbGxiYWNrOiBrZXkuZmFsbGJhY2sgfTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBrZXlTdHIgPSBrZXkua2V5O1xuICAgICAgICAgIG9wdHMgPSBrZXkub3B0aW9ucztcbiAgICAgICAgfVxuICAgICAgICBvcmRlcmVkS2V5cy5wdXNoKGtleVN0cik7XG4gICAgICAgIGNvbnN0IHsgZHJpdmVyQXJlYSwgZHJpdmVyS2V5IH0gPSByZXNvbHZlS2V5KGtleVN0cik7XG4gICAgICAgIGNvbnN0IGFyZWFLZXlzID0gYXJlYVRvS2V5TWFwLmdldChkcml2ZXJBcmVhKSA/PyBbXTtcbiAgICAgICAgYXJlYVRvS2V5TWFwLnNldChkcml2ZXJBcmVhLCBhcmVhS2V5cy5jb25jYXQoZHJpdmVyS2V5KSk7XG4gICAgICAgIGtleVRvT3B0c01hcC5zZXQoa2V5U3RyLCBvcHRzKTtcbiAgICAgIH0pO1xuICAgICAgY29uc3QgcmVzdWx0c01hcCA9IC8qIEBfX1BVUkVfXyAqLyBuZXcgTWFwKCk7XG4gICAgICBhd2FpdCBQcm9taXNlLmFsbChcbiAgICAgICAgQXJyYXkuZnJvbShhcmVhVG9LZXlNYXAuZW50cmllcygpKS5tYXAoYXN5bmMgKFtkcml2ZXJBcmVhLCBrZXlzMl0pID0+IHtcbiAgICAgICAgICBjb25zdCBkcml2ZXJSZXN1bHRzID0gYXdhaXQgZHJpdmVyc1tkcml2ZXJBcmVhXS5nZXRJdGVtcyhrZXlzMik7XG4gICAgICAgICAgZHJpdmVyUmVzdWx0cy5mb3JFYWNoKChkcml2ZXJSZXN1bHQpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGtleSA9IGAke2RyaXZlckFyZWF9OiR7ZHJpdmVyUmVzdWx0LmtleX1gO1xuICAgICAgICAgICAgY29uc3Qgb3B0cyA9IGtleVRvT3B0c01hcC5nZXQoa2V5KTtcbiAgICAgICAgICAgIGNvbnN0IHZhbHVlID0gZ2V0VmFsdWVPckZhbGxiYWNrKFxuICAgICAgICAgICAgICBkcml2ZXJSZXN1bHQudmFsdWUsXG4gICAgICAgICAgICAgIG9wdHM/LmZhbGxiYWNrID8/IG9wdHM/LmRlZmF1bHRWYWx1ZVxuICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIHJlc3VsdHNNYXAuc2V0KGtleSwgdmFsdWUpO1xuICAgICAgICAgIH0pO1xuICAgICAgICB9KVxuICAgICAgKTtcbiAgICAgIHJldHVybiBvcmRlcmVkS2V5cy5tYXAoKGtleSkgPT4gKHtcbiAgICAgICAga2V5LFxuICAgICAgICB2YWx1ZTogcmVzdWx0c01hcC5nZXQoa2V5KVxuICAgICAgfSkpO1xuICAgIH0sXG4gICAgZ2V0TWV0YTogYXN5bmMgKGtleSkgPT4ge1xuICAgICAgY29uc3QgeyBkcml2ZXIsIGRyaXZlcktleSB9ID0gcmVzb2x2ZUtleShrZXkpO1xuICAgICAgcmV0dXJuIGF3YWl0IGdldE1ldGEoZHJpdmVyLCBkcml2ZXJLZXkpO1xuICAgIH0sXG4gICAgZ2V0TWV0YXM6IGFzeW5jIChhcmdzKSA9PiB7XG4gICAgICBjb25zdCBrZXlzID0gYXJncy5tYXAoKGFyZykgPT4ge1xuICAgICAgICBjb25zdCBrZXkgPSB0eXBlb2YgYXJnID09PSBcInN0cmluZ1wiID8gYXJnIDogYXJnLmtleTtcbiAgICAgICAgY29uc3QgeyBkcml2ZXJBcmVhLCBkcml2ZXJLZXkgfSA9IHJlc29sdmVLZXkoa2V5KTtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICBrZXksXG4gICAgICAgICAgZHJpdmVyQXJlYSxcbiAgICAgICAgICBkcml2ZXJLZXksXG4gICAgICAgICAgZHJpdmVyTWV0YUtleTogZ2V0TWV0YUtleShkcml2ZXJLZXkpXG4gICAgICAgIH07XG4gICAgICB9KTtcbiAgICAgIGNvbnN0IGFyZWFUb0RyaXZlck1ldGFLZXlzTWFwID0ga2V5cy5yZWR1Y2UoKG1hcCwga2V5KSA9PiB7XG4gICAgICAgIG1hcFtrZXkuZHJpdmVyQXJlYV0gPz89IFtdO1xuICAgICAgICBtYXBba2V5LmRyaXZlckFyZWFdLnB1c2goa2V5KTtcbiAgICAgICAgcmV0dXJuIG1hcDtcbiAgICAgIH0sIHt9KTtcbiAgICAgIGNvbnN0IHJlc3VsdHNNYXAgPSB7fTtcbiAgICAgIGF3YWl0IFByb21pc2UuYWxsKFxuICAgICAgICBPYmplY3QuZW50cmllcyhhcmVhVG9Ecml2ZXJNZXRhS2V5c01hcCkubWFwKGFzeW5jIChbYXJlYSwga2V5czJdKSA9PiB7XG4gICAgICAgICAgY29uc3QgYXJlYVJlcyA9IGF3YWl0IGJyb3dzZXIuc3RvcmFnZVthcmVhXS5nZXQoXG4gICAgICAgICAgICBrZXlzMi5tYXAoKGtleSkgPT4ga2V5LmRyaXZlck1ldGFLZXkpXG4gICAgICAgICAgKTtcbiAgICAgICAgICBrZXlzMi5mb3JFYWNoKChrZXkpID0+IHtcbiAgICAgICAgICAgIHJlc3VsdHNNYXBba2V5LmtleV0gPSBhcmVhUmVzW2tleS5kcml2ZXJNZXRhS2V5XSA/PyB7fTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgfSlcbiAgICAgICk7XG4gICAgICByZXR1cm4ga2V5cy5tYXAoKGtleSkgPT4gKHtcbiAgICAgICAga2V5OiBrZXkua2V5LFxuICAgICAgICBtZXRhOiByZXN1bHRzTWFwW2tleS5rZXldXG4gICAgICB9KSk7XG4gICAgfSxcbiAgICBzZXRJdGVtOiBhc3luYyAoa2V5LCB2YWx1ZSkgPT4ge1xuICAgICAgY29uc3QgeyBkcml2ZXIsIGRyaXZlcktleSB9ID0gcmVzb2x2ZUtleShrZXkpO1xuICAgICAgYXdhaXQgc2V0SXRlbShkcml2ZXIsIGRyaXZlcktleSwgdmFsdWUpO1xuICAgIH0sXG4gICAgc2V0SXRlbXM6IGFzeW5jIChpdGVtcykgPT4ge1xuICAgICAgY29uc3QgYXJlYVRvS2V5VmFsdWVNYXAgPSB7fTtcbiAgICAgIGl0ZW1zLmZvckVhY2goKGl0ZW0pID0+IHtcbiAgICAgICAgY29uc3QgeyBkcml2ZXJBcmVhLCBkcml2ZXJLZXkgfSA9IHJlc29sdmVLZXkoXG4gICAgICAgICAgXCJrZXlcIiBpbiBpdGVtID8gaXRlbS5rZXkgOiBpdGVtLml0ZW0ua2V5XG4gICAgICAgICk7XG4gICAgICAgIGFyZWFUb0tleVZhbHVlTWFwW2RyaXZlckFyZWFdID8/PSBbXTtcbiAgICAgICAgYXJlYVRvS2V5VmFsdWVNYXBbZHJpdmVyQXJlYV0ucHVzaCh7XG4gICAgICAgICAga2V5OiBkcml2ZXJLZXksXG4gICAgICAgICAgdmFsdWU6IGl0ZW0udmFsdWVcbiAgICAgICAgfSk7XG4gICAgICB9KTtcbiAgICAgIGF3YWl0IFByb21pc2UuYWxsKFxuICAgICAgICBPYmplY3QuZW50cmllcyhhcmVhVG9LZXlWYWx1ZU1hcCkubWFwKGFzeW5jIChbZHJpdmVyQXJlYSwgdmFsdWVzXSkgPT4ge1xuICAgICAgICAgIGNvbnN0IGRyaXZlciA9IGdldERyaXZlcihkcml2ZXJBcmVhKTtcbiAgICAgICAgICBhd2FpdCBkcml2ZXIuc2V0SXRlbXModmFsdWVzKTtcbiAgICAgICAgfSlcbiAgICAgICk7XG4gICAgfSxcbiAgICBzZXRNZXRhOiBhc3luYyAoa2V5LCBwcm9wZXJ0aWVzKSA9PiB7XG4gICAgICBjb25zdCB7IGRyaXZlciwgZHJpdmVyS2V5IH0gPSByZXNvbHZlS2V5KGtleSk7XG4gICAgICBhd2FpdCBzZXRNZXRhKGRyaXZlciwgZHJpdmVyS2V5LCBwcm9wZXJ0aWVzKTtcbiAgICB9LFxuICAgIHNldE1ldGFzOiBhc3luYyAoaXRlbXMpID0+IHtcbiAgICAgIGNvbnN0IGFyZWFUb01ldGFVcGRhdGVzTWFwID0ge307XG4gICAgICBpdGVtcy5mb3JFYWNoKChpdGVtKSA9PiB7XG4gICAgICAgIGNvbnN0IHsgZHJpdmVyQXJlYSwgZHJpdmVyS2V5IH0gPSByZXNvbHZlS2V5KFxuICAgICAgICAgIFwia2V5XCIgaW4gaXRlbSA/IGl0ZW0ua2V5IDogaXRlbS5pdGVtLmtleVxuICAgICAgICApO1xuICAgICAgICBhcmVhVG9NZXRhVXBkYXRlc01hcFtkcml2ZXJBcmVhXSA/Pz0gW107XG4gICAgICAgIGFyZWFUb01ldGFVcGRhdGVzTWFwW2RyaXZlckFyZWFdLnB1c2goe1xuICAgICAgICAgIGtleTogZHJpdmVyS2V5LFxuICAgICAgICAgIHByb3BlcnRpZXM6IGl0ZW0ubWV0YVxuICAgICAgICB9KTtcbiAgICAgIH0pO1xuICAgICAgYXdhaXQgUHJvbWlzZS5hbGwoXG4gICAgICAgIE9iamVjdC5lbnRyaWVzKGFyZWFUb01ldGFVcGRhdGVzTWFwKS5tYXAoXG4gICAgICAgICAgYXN5bmMgKFtzdG9yYWdlQXJlYSwgdXBkYXRlc10pID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGRyaXZlciA9IGdldERyaXZlcihzdG9yYWdlQXJlYSk7XG4gICAgICAgICAgICBjb25zdCBtZXRhS2V5cyA9IHVwZGF0ZXMubWFwKCh7IGtleSB9KSA9PiBnZXRNZXRhS2V5KGtleSkpO1xuICAgICAgICAgICAgY29uc29sZS5sb2coc3RvcmFnZUFyZWEsIG1ldGFLZXlzKTtcbiAgICAgICAgICAgIGNvbnN0IGV4aXN0aW5nTWV0YXMgPSBhd2FpdCBkcml2ZXIuZ2V0SXRlbXMobWV0YUtleXMpO1xuICAgICAgICAgICAgY29uc3QgZXhpc3RpbmdNZXRhTWFwID0gT2JqZWN0LmZyb21FbnRyaWVzKFxuICAgICAgICAgICAgICBleGlzdGluZ01ldGFzLm1hcCgoeyBrZXksIHZhbHVlIH0pID0+IFtrZXksIGdldE1ldGFWYWx1ZSh2YWx1ZSldKVxuICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIGNvbnN0IG1ldGFVcGRhdGVzID0gdXBkYXRlcy5tYXAoKHsga2V5LCBwcm9wZXJ0aWVzIH0pID0+IHtcbiAgICAgICAgICAgICAgY29uc3QgbWV0YUtleSA9IGdldE1ldGFLZXkoa2V5KTtcbiAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICBrZXk6IG1ldGFLZXksXG4gICAgICAgICAgICAgICAgdmFsdWU6IG1lcmdlTWV0YShleGlzdGluZ01ldGFNYXBbbWV0YUtleV0gPz8ge30sIHByb3BlcnRpZXMpXG4gICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIGF3YWl0IGRyaXZlci5zZXRJdGVtcyhtZXRhVXBkYXRlcyk7XG4gICAgICAgICAgfVxuICAgICAgICApXG4gICAgICApO1xuICAgIH0sXG4gICAgcmVtb3ZlSXRlbTogYXN5bmMgKGtleSwgb3B0cykgPT4ge1xuICAgICAgY29uc3QgeyBkcml2ZXIsIGRyaXZlcktleSB9ID0gcmVzb2x2ZUtleShrZXkpO1xuICAgICAgYXdhaXQgcmVtb3ZlSXRlbShkcml2ZXIsIGRyaXZlcktleSwgb3B0cyk7XG4gICAgfSxcbiAgICByZW1vdmVJdGVtczogYXN5bmMgKGtleXMpID0+IHtcbiAgICAgIGNvbnN0IGFyZWFUb0tleXNNYXAgPSB7fTtcbiAgICAgIGtleXMuZm9yRWFjaCgoa2V5KSA9PiB7XG4gICAgICAgIGxldCBrZXlTdHI7XG4gICAgICAgIGxldCBvcHRzO1xuICAgICAgICBpZiAodHlwZW9mIGtleSA9PT0gXCJzdHJpbmdcIikge1xuICAgICAgICAgIGtleVN0ciA9IGtleTtcbiAgICAgICAgfSBlbHNlIGlmIChcImdldFZhbHVlXCIgaW4ga2V5KSB7XG4gICAgICAgICAga2V5U3RyID0ga2V5LmtleTtcbiAgICAgICAgfSBlbHNlIGlmIChcIml0ZW1cIiBpbiBrZXkpIHtcbiAgICAgICAgICBrZXlTdHIgPSBrZXkuaXRlbS5rZXk7XG4gICAgICAgICAgb3B0cyA9IGtleS5vcHRpb25zO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGtleVN0ciA9IGtleS5rZXk7XG4gICAgICAgICAgb3B0cyA9IGtleS5vcHRpb25zO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IHsgZHJpdmVyQXJlYSwgZHJpdmVyS2V5IH0gPSByZXNvbHZlS2V5KGtleVN0cik7XG4gICAgICAgIGFyZWFUb0tleXNNYXBbZHJpdmVyQXJlYV0gPz89IFtdO1xuICAgICAgICBhcmVhVG9LZXlzTWFwW2RyaXZlckFyZWFdLnB1c2goZHJpdmVyS2V5KTtcbiAgICAgICAgaWYgKG9wdHM/LnJlbW92ZU1ldGEpIHtcbiAgICAgICAgICBhcmVhVG9LZXlzTWFwW2RyaXZlckFyZWFdLnB1c2goZ2V0TWV0YUtleShkcml2ZXJLZXkpKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgICBhd2FpdCBQcm9taXNlLmFsbChcbiAgICAgICAgT2JqZWN0LmVudHJpZXMoYXJlYVRvS2V5c01hcCkubWFwKGFzeW5jIChbZHJpdmVyQXJlYSwga2V5czJdKSA9PiB7XG4gICAgICAgICAgY29uc3QgZHJpdmVyID0gZ2V0RHJpdmVyKGRyaXZlckFyZWEpO1xuICAgICAgICAgIGF3YWl0IGRyaXZlci5yZW1vdmVJdGVtcyhrZXlzMik7XG4gICAgICAgIH0pXG4gICAgICApO1xuICAgIH0sXG4gICAgY2xlYXI6IGFzeW5jIChiYXNlKSA9PiB7XG4gICAgICBjb25zdCBkcml2ZXIgPSBnZXREcml2ZXIoYmFzZSk7XG4gICAgICBhd2FpdCBkcml2ZXIuY2xlYXIoKTtcbiAgICB9LFxuICAgIHJlbW92ZU1ldGE6IGFzeW5jIChrZXksIHByb3BlcnRpZXMpID0+IHtcbiAgICAgIGNvbnN0IHsgZHJpdmVyLCBkcml2ZXJLZXkgfSA9IHJlc29sdmVLZXkoa2V5KTtcbiAgICAgIGF3YWl0IHJlbW92ZU1ldGEoZHJpdmVyLCBkcml2ZXJLZXksIHByb3BlcnRpZXMpO1xuICAgIH0sXG4gICAgc25hcHNob3Q6IGFzeW5jIChiYXNlLCBvcHRzKSA9PiB7XG4gICAgICBjb25zdCBkcml2ZXIgPSBnZXREcml2ZXIoYmFzZSk7XG4gICAgICBjb25zdCBkYXRhID0gYXdhaXQgZHJpdmVyLnNuYXBzaG90KCk7XG4gICAgICBvcHRzPy5leGNsdWRlS2V5cz8uZm9yRWFjaCgoa2V5KSA9PiB7XG4gICAgICAgIGRlbGV0ZSBkYXRhW2tleV07XG4gICAgICAgIGRlbGV0ZSBkYXRhW2dldE1ldGFLZXkoa2V5KV07XG4gICAgICB9KTtcbiAgICAgIHJldHVybiBkYXRhO1xuICAgIH0sXG4gICAgcmVzdG9yZVNuYXBzaG90OiBhc3luYyAoYmFzZSwgZGF0YSkgPT4ge1xuICAgICAgY29uc3QgZHJpdmVyID0gZ2V0RHJpdmVyKGJhc2UpO1xuICAgICAgYXdhaXQgZHJpdmVyLnJlc3RvcmVTbmFwc2hvdChkYXRhKTtcbiAgICB9LFxuICAgIHdhdGNoOiAoa2V5LCBjYikgPT4ge1xuICAgICAgY29uc3QgeyBkcml2ZXIsIGRyaXZlcktleSB9ID0gcmVzb2x2ZUtleShrZXkpO1xuICAgICAgcmV0dXJuIHdhdGNoKGRyaXZlciwgZHJpdmVyS2V5LCBjYik7XG4gICAgfSxcbiAgICB1bndhdGNoKCkge1xuICAgICAgT2JqZWN0LnZhbHVlcyhkcml2ZXJzKS5mb3JFYWNoKChkcml2ZXIpID0+IHtcbiAgICAgICAgZHJpdmVyLnVud2F0Y2goKTtcbiAgICAgIH0pO1xuICAgIH0sXG4gICAgZGVmaW5lSXRlbTogKGtleSwgb3B0cykgPT4ge1xuICAgICAgY29uc3QgeyBkcml2ZXIsIGRyaXZlcktleSB9ID0gcmVzb2x2ZUtleShrZXkpO1xuICAgICAgY29uc3QgeyB2ZXJzaW9uOiB0YXJnZXRWZXJzaW9uID0gMSwgbWlncmF0aW9ucyA9IHt9IH0gPSBvcHRzID8/IHt9O1xuICAgICAgaWYgKHRhcmdldFZlcnNpb24gPCAxKSB7XG4gICAgICAgIHRocm93IEVycm9yKFxuICAgICAgICAgIFwiU3RvcmFnZSBpdGVtIHZlcnNpb24gY2Fubm90IGJlIGxlc3MgdGhhbiAxLiBJbml0aWFsIHZlcnNpb25zIHNob3VsZCBiZSBzZXQgdG8gMSwgbm90IDAuXCJcbiAgICAgICAgKTtcbiAgICAgIH1cbiAgICAgIGNvbnN0IG1pZ3JhdGUgPSBhc3luYyAoKSA9PiB7XG4gICAgICAgIGNvbnN0IGRyaXZlck1ldGFLZXkgPSBnZXRNZXRhS2V5KGRyaXZlcktleSk7XG4gICAgICAgIGNvbnN0IFt7IHZhbHVlIH0sIHsgdmFsdWU6IG1ldGEgfV0gPSBhd2FpdCBkcml2ZXIuZ2V0SXRlbXMoW1xuICAgICAgICAgIGRyaXZlcktleSxcbiAgICAgICAgICBkcml2ZXJNZXRhS2V5XG4gICAgICAgIF0pO1xuICAgICAgICBpZiAodmFsdWUgPT0gbnVsbCkgcmV0dXJuO1xuICAgICAgICBjb25zdCBjdXJyZW50VmVyc2lvbiA9IG1ldGE/LnYgPz8gMTtcbiAgICAgICAgaWYgKGN1cnJlbnRWZXJzaW9uID4gdGFyZ2V0VmVyc2lvbikge1xuICAgICAgICAgIHRocm93IEVycm9yKFxuICAgICAgICAgICAgYFZlcnNpb24gZG93bmdyYWRlIGRldGVjdGVkICh2JHtjdXJyZW50VmVyc2lvbn0gLT4gdiR7dGFyZ2V0VmVyc2lvbn0pIGZvciBcIiR7a2V5fVwiYFxuICAgICAgICAgICk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGN1cnJlbnRWZXJzaW9uID09PSB0YXJnZXRWZXJzaW9uKSB7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGNvbnNvbGUuZGVidWcoXG4gICAgICAgICAgYFtAd3h0LWRldi9zdG9yYWdlXSBSdW5uaW5nIHN0b3JhZ2UgbWlncmF0aW9uIGZvciAke2tleX06IHYke2N1cnJlbnRWZXJzaW9ufSAtPiB2JHt0YXJnZXRWZXJzaW9ufWBcbiAgICAgICAgKTtcbiAgICAgICAgY29uc3QgbWlncmF0aW9uc1RvUnVuID0gQXJyYXkuZnJvbShcbiAgICAgICAgICB7IGxlbmd0aDogdGFyZ2V0VmVyc2lvbiAtIGN1cnJlbnRWZXJzaW9uIH0sXG4gICAgICAgICAgKF8sIGkpID0+IGN1cnJlbnRWZXJzaW9uICsgaSArIDFcbiAgICAgICAgKTtcbiAgICAgICAgbGV0IG1pZ3JhdGVkVmFsdWUgPSB2YWx1ZTtcbiAgICAgICAgZm9yIChjb25zdCBtaWdyYXRlVG9WZXJzaW9uIG9mIG1pZ3JhdGlvbnNUb1J1bikge1xuICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICBtaWdyYXRlZFZhbHVlID0gYXdhaXQgbWlncmF0aW9ucz8uW21pZ3JhdGVUb1ZlcnNpb25dPy4obWlncmF0ZWRWYWx1ZSkgPz8gbWlncmF0ZWRWYWx1ZTtcbiAgICAgICAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBNaWdyYXRpb25FcnJvcihrZXksIG1pZ3JhdGVUb1ZlcnNpb24sIHtcbiAgICAgICAgICAgICAgY2F1c2U6IGVyclxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGF3YWl0IGRyaXZlci5zZXRJdGVtcyhbXG4gICAgICAgICAgeyBrZXk6IGRyaXZlcktleSwgdmFsdWU6IG1pZ3JhdGVkVmFsdWUgfSxcbiAgICAgICAgICB7IGtleTogZHJpdmVyTWV0YUtleSwgdmFsdWU6IHsgLi4ubWV0YSwgdjogdGFyZ2V0VmVyc2lvbiB9IH1cbiAgICAgICAgXSk7XG4gICAgICAgIGNvbnNvbGUuZGVidWcoXG4gICAgICAgICAgYFtAd3h0LWRldi9zdG9yYWdlXSBTdG9yYWdlIG1pZ3JhdGlvbiBjb21wbGV0ZWQgZm9yICR7a2V5fSB2JHt0YXJnZXRWZXJzaW9ufWAsXG4gICAgICAgICAgeyBtaWdyYXRlZFZhbHVlIH1cbiAgICAgICAgKTtcbiAgICAgIH07XG4gICAgICBjb25zdCBtaWdyYXRpb25zRG9uZSA9IG9wdHM/Lm1pZ3JhdGlvbnMgPT0gbnVsbCA/IFByb21pc2UucmVzb2x2ZSgpIDogbWlncmF0ZSgpLmNhdGNoKChlcnIpID0+IHtcbiAgICAgICAgY29uc29sZS5lcnJvcihcbiAgICAgICAgICBgW0B3eHQtZGV2L3N0b3JhZ2VdIE1pZ3JhdGlvbiBmYWlsZWQgZm9yICR7a2V5fWAsXG4gICAgICAgICAgZXJyXG4gICAgICAgICk7XG4gICAgICB9KTtcbiAgICAgIGNvbnN0IGluaXRNdXRleCA9IG5ldyBNdXRleCgpO1xuICAgICAgY29uc3QgZ2V0RmFsbGJhY2sgPSAoKSA9PiBvcHRzPy5mYWxsYmFjayA/PyBvcHRzPy5kZWZhdWx0VmFsdWUgPz8gbnVsbDtcbiAgICAgIGNvbnN0IGdldE9ySW5pdFZhbHVlID0gKCkgPT4gaW5pdE11dGV4LnJ1bkV4Y2x1c2l2ZShhc3luYyAoKSA9PiB7XG4gICAgICAgIGNvbnN0IHZhbHVlID0gYXdhaXQgZHJpdmVyLmdldEl0ZW0oZHJpdmVyS2V5KTtcbiAgICAgICAgaWYgKHZhbHVlICE9IG51bGwgfHwgb3B0cz8uaW5pdCA9PSBudWxsKSByZXR1cm4gdmFsdWU7XG4gICAgICAgIGNvbnN0IG5ld1ZhbHVlID0gYXdhaXQgb3B0cy5pbml0KCk7XG4gICAgICAgIGF3YWl0IGRyaXZlci5zZXRJdGVtKGRyaXZlcktleSwgbmV3VmFsdWUpO1xuICAgICAgICByZXR1cm4gbmV3VmFsdWU7XG4gICAgICB9KTtcbiAgICAgIG1pZ3JhdGlvbnNEb25lLnRoZW4oZ2V0T3JJbml0VmFsdWUpO1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAga2V5LFxuICAgICAgICBnZXQgZGVmYXVsdFZhbHVlKCkge1xuICAgICAgICAgIHJldHVybiBnZXRGYWxsYmFjaygpO1xuICAgICAgICB9LFxuICAgICAgICBnZXQgZmFsbGJhY2soKSB7XG4gICAgICAgICAgcmV0dXJuIGdldEZhbGxiYWNrKCk7XG4gICAgICAgIH0sXG4gICAgICAgIGdldFZhbHVlOiBhc3luYyAoKSA9PiB7XG4gICAgICAgICAgYXdhaXQgbWlncmF0aW9uc0RvbmU7XG4gICAgICAgICAgaWYgKG9wdHM/LmluaXQpIHtcbiAgICAgICAgICAgIHJldHVybiBhd2FpdCBnZXRPckluaXRWYWx1ZSgpO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gYXdhaXQgZ2V0SXRlbShkcml2ZXIsIGRyaXZlcktleSwgb3B0cyk7XG4gICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICBnZXRNZXRhOiBhc3luYyAoKSA9PiB7XG4gICAgICAgICAgYXdhaXQgbWlncmF0aW9uc0RvbmU7XG4gICAgICAgICAgcmV0dXJuIGF3YWl0IGdldE1ldGEoZHJpdmVyLCBkcml2ZXJLZXkpO1xuICAgICAgICB9LFxuICAgICAgICBzZXRWYWx1ZTogYXN5bmMgKHZhbHVlKSA9PiB7XG4gICAgICAgICAgYXdhaXQgbWlncmF0aW9uc0RvbmU7XG4gICAgICAgICAgcmV0dXJuIGF3YWl0IHNldEl0ZW0oZHJpdmVyLCBkcml2ZXJLZXksIHZhbHVlKTtcbiAgICAgICAgfSxcbiAgICAgICAgc2V0TWV0YTogYXN5bmMgKHByb3BlcnRpZXMpID0+IHtcbiAgICAgICAgICBhd2FpdCBtaWdyYXRpb25zRG9uZTtcbiAgICAgICAgICByZXR1cm4gYXdhaXQgc2V0TWV0YShkcml2ZXIsIGRyaXZlcktleSwgcHJvcGVydGllcyk7XG4gICAgICAgIH0sXG4gICAgICAgIHJlbW92ZVZhbHVlOiBhc3luYyAob3B0czIpID0+IHtcbiAgICAgICAgICBhd2FpdCBtaWdyYXRpb25zRG9uZTtcbiAgICAgICAgICByZXR1cm4gYXdhaXQgcmVtb3ZlSXRlbShkcml2ZXIsIGRyaXZlcktleSwgb3B0czIpO1xuICAgICAgICB9LFxuICAgICAgICByZW1vdmVNZXRhOiBhc3luYyAocHJvcGVydGllcykgPT4ge1xuICAgICAgICAgIGF3YWl0IG1pZ3JhdGlvbnNEb25lO1xuICAgICAgICAgIHJldHVybiBhd2FpdCByZW1vdmVNZXRhKGRyaXZlciwgZHJpdmVyS2V5LCBwcm9wZXJ0aWVzKTtcbiAgICAgICAgfSxcbiAgICAgICAgd2F0Y2g6IChjYikgPT4gd2F0Y2goXG4gICAgICAgICAgZHJpdmVyLFxuICAgICAgICAgIGRyaXZlcktleSxcbiAgICAgICAgICAobmV3VmFsdWUsIG9sZFZhbHVlKSA9PiBjYihuZXdWYWx1ZSA/PyBnZXRGYWxsYmFjaygpLCBvbGRWYWx1ZSA/PyBnZXRGYWxsYmFjaygpKVxuICAgICAgICApLFxuICAgICAgICBtaWdyYXRlXG4gICAgICB9O1xuICAgIH1cbiAgfTtcbiAgcmV0dXJuIHN0b3JhZ2UyO1xufVxuZnVuY3Rpb24gY3JlYXRlRHJpdmVyKHN0b3JhZ2VBcmVhKSB7XG4gIGNvbnN0IGdldFN0b3JhZ2VBcmVhID0gKCkgPT4ge1xuICAgIGlmIChicm93c2VyLnJ1bnRpbWUgPT0gbnVsbCkge1xuICAgICAgdGhyb3cgRXJyb3IoXG4gICAgICAgIFtcbiAgICAgICAgICBcIid3eHQvc3RvcmFnZScgbXVzdCBiZSBsb2FkZWQgaW4gYSB3ZWIgZXh0ZW5zaW9uIGVudmlyb25tZW50XCIsXG4gICAgICAgICAgXCJcXG4gLSBJZiB0aHJvd24gZHVyaW5nIGEgYnVpbGQsIHNlZSBodHRwczovL2dpdGh1Yi5jb20vd3h0LWRldi93eHQvaXNzdWVzLzM3MVwiLFxuICAgICAgICAgIFwiIC0gSWYgdGhyb3duIGR1cmluZyB0ZXN0cywgbW9jayAnd3h0L2Jyb3dzZXInIGNvcnJlY3RseS4gU2VlIGh0dHBzOi8vd3h0LmRldi9ndWlkZS9nby1mdXJ0aGVyL3Rlc3RpbmcuaHRtbFxcblwiXG4gICAgICAgIF0uam9pbihcIlxcblwiKVxuICAgICAgKTtcbiAgICB9XG4gICAgaWYgKGJyb3dzZXIuc3RvcmFnZSA9PSBudWxsKSB7XG4gICAgICB0aHJvdyBFcnJvcihcbiAgICAgICAgXCJZb3UgbXVzdCBhZGQgdGhlICdzdG9yYWdlJyBwZXJtaXNzaW9uIHRvIHlvdXIgbWFuaWZlc3QgdG8gdXNlICd3eHQvc3RvcmFnZSdcIlxuICAgICAgKTtcbiAgICB9XG4gICAgY29uc3QgYXJlYSA9IGJyb3dzZXIuc3RvcmFnZVtzdG9yYWdlQXJlYV07XG4gICAgaWYgKGFyZWEgPT0gbnVsbClcbiAgICAgIHRocm93IEVycm9yKGBcImJyb3dzZXIuc3RvcmFnZS4ke3N0b3JhZ2VBcmVhfVwiIGlzIHVuZGVmaW5lZGApO1xuICAgIHJldHVybiBhcmVhO1xuICB9O1xuICBjb25zdCB3YXRjaExpc3RlbmVycyA9IC8qIEBfX1BVUkVfXyAqLyBuZXcgU2V0KCk7XG4gIHJldHVybiB7XG4gICAgZ2V0SXRlbTogYXN5bmMgKGtleSkgPT4ge1xuICAgICAgY29uc3QgcmVzID0gYXdhaXQgZ2V0U3RvcmFnZUFyZWEoKS5nZXQoa2V5KTtcbiAgICAgIHJldHVybiByZXNba2V5XTtcbiAgICB9LFxuICAgIGdldEl0ZW1zOiBhc3luYyAoa2V5cykgPT4ge1xuICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgZ2V0U3RvcmFnZUFyZWEoKS5nZXQoa2V5cyk7XG4gICAgICByZXR1cm4ga2V5cy5tYXAoKGtleSkgPT4gKHsga2V5LCB2YWx1ZTogcmVzdWx0W2tleV0gPz8gbnVsbCB9KSk7XG4gICAgfSxcbiAgICBzZXRJdGVtOiBhc3luYyAoa2V5LCB2YWx1ZSkgPT4ge1xuICAgICAgaWYgKHZhbHVlID09IG51bGwpIHtcbiAgICAgICAgYXdhaXQgZ2V0U3RvcmFnZUFyZWEoKS5yZW1vdmUoa2V5KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGF3YWl0IGdldFN0b3JhZ2VBcmVhKCkuc2V0KHsgW2tleV06IHZhbHVlIH0pO1xuICAgICAgfVxuICAgIH0sXG4gICAgc2V0SXRlbXM6IGFzeW5jICh2YWx1ZXMpID0+IHtcbiAgICAgIGNvbnN0IG1hcCA9IHZhbHVlcy5yZWR1Y2UoXG4gICAgICAgIChtYXAyLCB7IGtleSwgdmFsdWUgfSkgPT4ge1xuICAgICAgICAgIG1hcDJba2V5XSA9IHZhbHVlO1xuICAgICAgICAgIHJldHVybiBtYXAyO1xuICAgICAgICB9LFxuICAgICAgICB7fVxuICAgICAgKTtcbiAgICAgIGF3YWl0IGdldFN0b3JhZ2VBcmVhKCkuc2V0KG1hcCk7XG4gICAgfSxcbiAgICByZW1vdmVJdGVtOiBhc3luYyAoa2V5KSA9PiB7XG4gICAgICBhd2FpdCBnZXRTdG9yYWdlQXJlYSgpLnJlbW92ZShrZXkpO1xuICAgIH0sXG4gICAgcmVtb3ZlSXRlbXM6IGFzeW5jIChrZXlzKSA9PiB7XG4gICAgICBhd2FpdCBnZXRTdG9yYWdlQXJlYSgpLnJlbW92ZShrZXlzKTtcbiAgICB9LFxuICAgIGNsZWFyOiBhc3luYyAoKSA9PiB7XG4gICAgICBhd2FpdCBnZXRTdG9yYWdlQXJlYSgpLmNsZWFyKCk7XG4gICAgfSxcbiAgICBzbmFwc2hvdDogYXN5bmMgKCkgPT4ge1xuICAgICAgcmV0dXJuIGF3YWl0IGdldFN0b3JhZ2VBcmVhKCkuZ2V0KCk7XG4gICAgfSxcbiAgICByZXN0b3JlU25hcHNob3Q6IGFzeW5jIChkYXRhKSA9PiB7XG4gICAgICBhd2FpdCBnZXRTdG9yYWdlQXJlYSgpLnNldChkYXRhKTtcbiAgICB9LFxuICAgIHdhdGNoKGtleSwgY2IpIHtcbiAgICAgIGNvbnN0IGxpc3RlbmVyID0gKGNoYW5nZXMpID0+IHtcbiAgICAgICAgY29uc3QgY2hhbmdlID0gY2hhbmdlc1trZXldO1xuICAgICAgICBpZiAoY2hhbmdlID09IG51bGwpIHJldHVybjtcbiAgICAgICAgaWYgKGRlcXVhbChjaGFuZ2UubmV3VmFsdWUsIGNoYW5nZS5vbGRWYWx1ZSkpIHJldHVybjtcbiAgICAgICAgY2IoY2hhbmdlLm5ld1ZhbHVlID8/IG51bGwsIGNoYW5nZS5vbGRWYWx1ZSA/PyBudWxsKTtcbiAgICAgIH07XG4gICAgICBnZXRTdG9yYWdlQXJlYSgpLm9uQ2hhbmdlZC5hZGRMaXN0ZW5lcihsaXN0ZW5lcik7XG4gICAgICB3YXRjaExpc3RlbmVycy5hZGQobGlzdGVuZXIpO1xuICAgICAgcmV0dXJuICgpID0+IHtcbiAgICAgICAgZ2V0U3RvcmFnZUFyZWEoKS5vbkNoYW5nZWQucmVtb3ZlTGlzdGVuZXIobGlzdGVuZXIpO1xuICAgICAgICB3YXRjaExpc3RlbmVycy5kZWxldGUobGlzdGVuZXIpO1xuICAgICAgfTtcbiAgICB9LFxuICAgIHVud2F0Y2goKSB7XG4gICAgICB3YXRjaExpc3RlbmVycy5mb3JFYWNoKChsaXN0ZW5lcikgPT4ge1xuICAgICAgICBnZXRTdG9yYWdlQXJlYSgpLm9uQ2hhbmdlZC5yZW1vdmVMaXN0ZW5lcihsaXN0ZW5lcik7XG4gICAgICB9KTtcbiAgICAgIHdhdGNoTGlzdGVuZXJzLmNsZWFyKCk7XG4gICAgfVxuICB9O1xufVxuY2xhc3MgTWlncmF0aW9uRXJyb3IgZXh0ZW5kcyBFcnJvciB7XG4gIGNvbnN0cnVjdG9yKGtleSwgdmVyc2lvbiwgb3B0aW9ucykge1xuICAgIHN1cGVyKGB2JHt2ZXJzaW9ufSBtaWdyYXRpb24gZmFpbGVkIGZvciBcIiR7a2V5fVwiYCwgb3B0aW9ucyk7XG4gICAgdGhpcy5rZXkgPSBrZXk7XG4gICAgdGhpcy52ZXJzaW9uID0gdmVyc2lvbjtcbiAgfVxufVxuXG5leHBvcnQgeyBNaWdyYXRpb25FcnJvciwgc3RvcmFnZSB9O1xuIiwiaW1wb3J0IHZhbGlkYXRlIGZyb20gJy4vdmFsaWRhdGUuanMnO1xuY29uc3QgYnl0ZVRvSGV4ID0gW107XG5mb3IgKGxldCBpID0gMDsgaSA8IDI1NjsgKytpKSB7XG4gICAgYnl0ZVRvSGV4LnB1c2goKGkgKyAweDEwMCkudG9TdHJpbmcoMTYpLnNsaWNlKDEpKTtcbn1cbmV4cG9ydCBmdW5jdGlvbiB1bnNhZmVTdHJpbmdpZnkoYXJyLCBvZmZzZXQgPSAwKSB7XG4gICAgcmV0dXJuIChieXRlVG9IZXhbYXJyW29mZnNldCArIDBdXSArXG4gICAgICAgIGJ5dGVUb0hleFthcnJbb2Zmc2V0ICsgMV1dICtcbiAgICAgICAgYnl0ZVRvSGV4W2FycltvZmZzZXQgKyAyXV0gK1xuICAgICAgICBieXRlVG9IZXhbYXJyW29mZnNldCArIDNdXSArXG4gICAgICAgICctJyArXG4gICAgICAgIGJ5dGVUb0hleFthcnJbb2Zmc2V0ICsgNF1dICtcbiAgICAgICAgYnl0ZVRvSGV4W2FycltvZmZzZXQgKyA1XV0gK1xuICAgICAgICAnLScgK1xuICAgICAgICBieXRlVG9IZXhbYXJyW29mZnNldCArIDZdXSArXG4gICAgICAgIGJ5dGVUb0hleFthcnJbb2Zmc2V0ICsgN11dICtcbiAgICAgICAgJy0nICtcbiAgICAgICAgYnl0ZVRvSGV4W2FycltvZmZzZXQgKyA4XV0gK1xuICAgICAgICBieXRlVG9IZXhbYXJyW29mZnNldCArIDldXSArXG4gICAgICAgICctJyArXG4gICAgICAgIGJ5dGVUb0hleFthcnJbb2Zmc2V0ICsgMTBdXSArXG4gICAgICAgIGJ5dGVUb0hleFthcnJbb2Zmc2V0ICsgMTFdXSArXG4gICAgICAgIGJ5dGVUb0hleFthcnJbb2Zmc2V0ICsgMTJdXSArXG4gICAgICAgIGJ5dGVUb0hleFthcnJbb2Zmc2V0ICsgMTNdXSArXG4gICAgICAgIGJ5dGVUb0hleFthcnJbb2Zmc2V0ICsgMTRdXSArXG4gICAgICAgIGJ5dGVUb0hleFthcnJbb2Zmc2V0ICsgMTVdXSkudG9Mb3dlckNhc2UoKTtcbn1cbmZ1bmN0aW9uIHN0cmluZ2lmeShhcnIsIG9mZnNldCA9IDApIHtcbiAgICBjb25zdCB1dWlkID0gdW5zYWZlU3RyaW5naWZ5KGFyciwgb2Zmc2V0KTtcbiAgICBpZiAoIXZhbGlkYXRlKHV1aWQpKSB7XG4gICAgICAgIHRocm93IFR5cGVFcnJvcignU3RyaW5naWZpZWQgVVVJRCBpcyBpbnZhbGlkJyk7XG4gICAgfVxuICAgIHJldHVybiB1dWlkO1xufVxuZXhwb3J0IGRlZmF1bHQgc3RyaW5naWZ5O1xuIiwibGV0IGdldFJhbmRvbVZhbHVlcztcbmNvbnN0IHJuZHM4ID0gbmV3IFVpbnQ4QXJyYXkoMTYpO1xuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gcm5nKCkge1xuICAgIGlmICghZ2V0UmFuZG9tVmFsdWVzKSB7XG4gICAgICAgIGlmICh0eXBlb2YgY3J5cHRvID09PSAndW5kZWZpbmVkJyB8fCAhY3J5cHRvLmdldFJhbmRvbVZhbHVlcykge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdjcnlwdG8uZ2V0UmFuZG9tVmFsdWVzKCkgbm90IHN1cHBvcnRlZC4gU2VlIGh0dHBzOi8vZ2l0aHViLmNvbS91dWlkanMvdXVpZCNnZXRyYW5kb212YWx1ZXMtbm90LXN1cHBvcnRlZCcpO1xuICAgICAgICB9XG4gICAgICAgIGdldFJhbmRvbVZhbHVlcyA9IGNyeXB0by5nZXRSYW5kb21WYWx1ZXMuYmluZChjcnlwdG8pO1xuICAgIH1cbiAgICByZXR1cm4gZ2V0UmFuZG9tVmFsdWVzKHJuZHM4KTtcbn1cbiIsImNvbnN0IHJhbmRvbVVVSUQgPSB0eXBlb2YgY3J5cHRvICE9PSAndW5kZWZpbmVkJyAmJiBjcnlwdG8ucmFuZG9tVVVJRCAmJiBjcnlwdG8ucmFuZG9tVVVJRC5iaW5kKGNyeXB0byk7XG5leHBvcnQgZGVmYXVsdCB7IHJhbmRvbVVVSUQgfTtcbiIsImltcG9ydCBuYXRpdmUgZnJvbSAnLi9uYXRpdmUuanMnO1xuaW1wb3J0IHJuZyBmcm9tICcuL3JuZy5qcyc7XG5pbXBvcnQgeyB1bnNhZmVTdHJpbmdpZnkgfSBmcm9tICcuL3N0cmluZ2lmeS5qcyc7XG5mdW5jdGlvbiB2NChvcHRpb25zLCBidWYsIG9mZnNldCkge1xuICAgIGlmIChuYXRpdmUucmFuZG9tVVVJRCAmJiAhYnVmICYmICFvcHRpb25zKSB7XG4gICAgICAgIHJldHVybiBuYXRpdmUucmFuZG9tVVVJRCgpO1xuICAgIH1cbiAgICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcbiAgICBjb25zdCBybmRzID0gb3B0aW9ucy5yYW5kb20gPz8gb3B0aW9ucy5ybmc/LigpID8/IHJuZygpO1xuICAgIGlmIChybmRzLmxlbmd0aCA8IDE2KSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignUmFuZG9tIGJ5dGVzIGxlbmd0aCBtdXN0IGJlID49IDE2Jyk7XG4gICAgfVxuICAgIHJuZHNbNl0gPSAocm5kc1s2XSAmIDB4MGYpIHwgMHg0MDtcbiAgICBybmRzWzhdID0gKHJuZHNbOF0gJiAweDNmKSB8IDB4ODA7XG4gICAgaWYgKGJ1Zikge1xuICAgICAgICBvZmZzZXQgPSBvZmZzZXQgfHwgMDtcbiAgICAgICAgaWYgKG9mZnNldCA8IDAgfHwgb2Zmc2V0ICsgMTYgPiBidWYubGVuZ3RoKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgUmFuZ2VFcnJvcihgVVVJRCBieXRlIHJhbmdlICR7b2Zmc2V0fToke29mZnNldCArIDE1fSBpcyBvdXQgb2YgYnVmZmVyIGJvdW5kc2ApO1xuICAgICAgICB9XG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgMTY7ICsraSkge1xuICAgICAgICAgICAgYnVmW29mZnNldCArIGldID0gcm5kc1tpXTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gYnVmO1xuICAgIH1cbiAgICByZXR1cm4gdW5zYWZlU3RyaW5naWZ5KHJuZHMpO1xufVxuZXhwb3J0IGRlZmF1bHQgdjQ7XG4iLCJpbXBvcnQgdHlwZSB7IENvbW1hbmQgfSBmcm9tIFwiLi9pbmRleFwiO1xuXG5pbXBvcnQgeyB2NCBhcyB1dWlkdjQgfSBmcm9tIFwidXVpZFwiO1xuXG5jb25zdCBnb0JhY2tDb21tYW5kOiBDb21tYW5kID0ge1xuICBpZDogdXVpZHY0KCksXG4gIG5hbWU6IFwiR28gQmFja1wiLFxuICBkZXNjcmlwdGlvbjogXCJOYXZpZ2F0ZSBiYWNrIGluIGhpc3RvcnlcIixcbiAgY29udGV4dDogXCJjb250ZW50XCIsXG4gIGV4ZWN1dGU6ICgpID0+IHtcbiAgICB3aW5kb3cuaGlzdG9yeS5iYWNrKCk7XG4gICAgcmV0dXJuIFwiTmF2aWdhdGVkIGJhY2suXCI7IC8vIENvbnRlbnQgc2NyaXB0cyBjYW4gcmV0dXJuIHJlc3VsdHMgdG9vXG4gIH0sXG4gIG1ldGE6IHsgdHlwZTogXCJwYWdlXCIsIGNhdGVnb3J5OiBcIm5hdmlnYXRpb25cIiB9LFxufTtcblxuZXhwb3J0IGRlZmF1bHQgZ29CYWNrQ29tbWFuZDtcbiIsImltcG9ydCB0eXBlIHsgQ29tbWFuZCB9IGZyb20gXCIuL2luZGV4XCI7XG5cbmltcG9ydCB7IHY0IGFzIHV1aWR2NCB9IGZyb20gXCJ1dWlkXCI7XG5cbmNvbnN0IGdvRm9yd2FyZENvbW1hbmQ6IENvbW1hbmQgPSB7XG4gIGlkOiB1dWlkdjQoKSxcbiAgbmFtZTogXCJHbyBGb3J3YXJkXCIsXG4gIGRlc2NyaXB0aW9uOiBcIk5hdmlnYXRlIGZvcndhcmQgaW4gaGlzdG9yeVwiLFxuICBjb250ZXh0OiBcImNvbnRlbnRcIixcbiAgZXhlY3V0ZTogKCkgPT4ge1xuICAgIHdpbmRvdy5oaXN0b3J5LmZvcndhcmQoKTtcbiAgICByZXR1cm4gXCJOYXZpZ2F0ZWQgZm9yd2FyZC5cIjtcbiAgfSxcbiAgbWV0YTogeyB0eXBlOiBcInBhZ2VcIiwgY2F0ZWdvcnk6IFwibmF2aWdhdGlvblwiIH0sXG59O1xuXG5leHBvcnQgZGVmYXVsdCBnb0ZvcndhcmRDb21tYW5kO1xuIiwiaW1wb3J0IHR5cGUgeyBDb21tYW5kIH0gZnJvbSBcIi4vaW5kZXhcIjtcblxuaW1wb3J0IHsgdjQgYXMgdXVpZHY0IH0gZnJvbSBcInV1aWRcIjtcblxuY29uc3QgY29weVRpdGxlQ29tbWFuZDogQ29tbWFuZCA9IHtcbiAgaWQ6IHV1aWR2NCgpLFxuICBuYW1lOiBcIkNvcHkgUGFnZSBUaXRsZVwiLFxuICBkZXNjcmlwdGlvbjogXCJDb3B5IHRoZSBjdXJyZW50IHBhZ2UgdGl0bGUgdG8gY2xpcGJvYXJkXCIsXG4gIGNvbnRleHQ6IFwiY29udGVudFwiLFxuICBleGVjdXRlOiBhc3luYyAoKSA9PiB7XG4gICAgY29uc3QgdGl0bGUgPSBkb2N1bWVudC50aXRsZTtcbiAgICBhd2FpdCBuYXZpZ2F0b3IuY2xpcGJvYXJkLndyaXRlVGV4dCh0aXRsZSk7XG4gICAgcmV0dXJuIGBDb3BpZWQgdGl0bGU6IFwiJHt0aXRsZX1cImA7XG4gIH0sXG4gIG1ldGE6IHsgdHlwZTogXCJwYWdlXCIsIGNhdGVnb3J5OiBcImNvbnRlbnRcIiB9LFxufTtcblxuZXhwb3J0IGRlZmF1bHQgY29weVRpdGxlQ29tbWFuZDtcbiIsImltcG9ydCB0eXBlIHsgQ29tbWFuZCB9IGZyb20gXCIuL2luZGV4XCI7XG5cbmltcG9ydCB7IHY0IGFzIHV1aWR2NCB9IGZyb20gXCJ1dWlkXCI7XG5cbmNvbnN0IGRvd25sb2FkTWFya2Rvd25Db21tYW5kOiBDb21tYW5kID0ge1xuICBpZDogdXVpZHY0KCksXG4gIG5hbWU6IFwiRG93bmxvYWQgYXMgTWFya2Rvd25cIixcbiAgZGVzY3JpcHRpb246IFwiQ29udmVydCBwYWdlIGNvbnRlbnQgdG8gTWFya2Rvd24gYW5kIGRvd25sb2FkXCIsXG4gIGNvbnRleHQ6IFwiY29udGVudFwiLFxuICBleGVjdXRlOiBhc3luYyAoKSA9PiB7XG4gICAgY29uc29sZS5sb2coXCJEb3dubG9hZGluZyBhcyBtYXJrZG93biAoaW1wbGVtZW50YXRpb24gbmVlZGVkKS4uLlwiKTtcbiAgICAvLyBQbGFjZWhvbGRlcjogQWRkIEhUTUwtdG8tTWFya2Rvd24gY29udmVyc2lvbiBsb2dpYyBoZXJlXG4gICAgYXdhaXQgbmV3IFByb21pc2UoKHJlcykgPT4gc2V0VGltZW91dChyZXMsIDUwKSk7XG4gICAgcmV0dXJuIFwiTWFya2Rvd24gZG93bmxvYWQgbm90IHlldCBpbXBsZW1lbnRlZC5cIjtcbiAgfSxcbiAgbWV0YTogeyB0eXBlOiBcInBhZ2VcIiwgY2F0ZWdvcnk6IFwiY29udGVudFwiIH0sXG59O1xuXG5leHBvcnQgZGVmYXVsdCBkb3dubG9hZE1hcmtkb3duQ29tbWFuZDtcbiIsImltcG9ydCB7IHY0IGFzIHV1aWR2NCB9IGZyb20gXCJ1dWlkXCI7XG5pbXBvcnQgdHlwZSB7IEJyb3dzZXIgfSBmcm9tIFwid3h0L2Jyb3dzZXJcIjtcbmltcG9ydCB7IENvbW1hbmQgfSBmcm9tIFwiLi9pbmRleFwiO1xuXG5jb25zdCBsaXN0Qm9va21hcmtzQ29tbWFuZDogQ29tbWFuZCA9IHtcbiAgaWQ6IHV1aWR2NCgpLCAvLyBFeGFtcGxlIC0gSW1wbGVtZW50IGFjdHVhbCBsb2dpYyBsYXRlclxuICBuYW1lOiBcIkxpc3QgQm9va21hcmtzXCIsXG4gIGRlc2NyaXB0aW9uOiBcIlNlYXJjaCBhbmQgbGlzdCBib29rbWFya3NcIixcbiAgY29udGV4dDogXCJiYWNrZ3JvdW5kXCIsXG4gIGV4ZWN1dGU6IGFzeW5jIChxdWVyeT86IHN0cmluZykgPT4ge1xuICAgIGNvbnNvbGUubG9nKFwiTGlzdGluZyBib29rbWFya3MgKGltcGxlbWVudGF0aW9uIG5lZWRlZCkuLi4gUXVlcnk6XCIsIHF1ZXJ5KTtcbiAgICAvLyBQbGFjZWhvbGRlcjogUmVwbGFjZSB3aXRoIGFjdHVhbCBicm93c2VyLmJvb2ttYXJrcy5zZWFyY2goLi4uKVxuICAgIGF3YWl0IG5ldyBQcm9taXNlKChyZXMpID0+IHNldFRpbWVvdXQocmVzLCA1MCkpOyAvLyBTaW11bGF0ZSBhc3luYyB3b3JrXG4gICAgcmV0dXJuIFwiQm9va21hcmsgbGlzdGluZyBub3QgeWV0IGltcGxlbWVudGVkLlwiO1xuICB9LFxuICBtZXRhOiB7IHR5cGU6IFwiYnJvd3NlclwiLCBjYXRlZ29yeTogXCJib29rbWFya3NcIiB9LFxufTtcblxuZXhwb3J0IGRlZmF1bHQgbGlzdEJvb2ttYXJrc0NvbW1hbmQ7XG4iLCJpbXBvcnQgeyB2NCBhcyB1dWlkdjQgfSBmcm9tIFwidXVpZFwiO1xuaW1wb3J0IHR5cGUgeyBCcm93c2VyIH0gZnJvbSBcInd4dC9icm93c2VyXCI7XG5pbXBvcnQgeyBDb21tYW5kIH0gZnJvbSBcIi4vaW5kZXhcIjtcblxuY29uc3QgbmV3VGFiQ29tbWFuZDogQ29tbWFuZCA9IHtcbiAgaWQ6IHV1aWR2NCgpLFxuICBuYW1lOiBcIk5ldyBUYWJcIixcbiAgZGVzY3JpcHRpb246IFwiT3BlbiBhIG5ldyBicm93c2VyIHRhYlwiLFxuICBjb250ZXh0OiBcImJhY2tncm91bmRcIixcbiAgZXhlY3V0ZTogYXN5bmMgKHVybD86IHN0cmluZykgPT4ge1xuICAgIGF3YWl0IGJyb3dzZXIudGFicy5jcmVhdGUoeyB1cmw6IHVybCB8fCBcImFib3V0Om5ld3RhYlwiIH0pO1xuICAgIHJldHVybiBcIk5ldyB0YWIgb3BlbmVkLlwiOyAvLyBPcHRpb25hbCBzdWNjZXNzIG1lc3NhZ2VcbiAgfSxcbiAgLy8gYXJnczogW3sgbmFtZTogJ3VybCcsIHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJyhPcHRpb25hbCkgVVJMIHRvIG9wZW4nIH1dXG4gIG1ldGE6IHsgdHlwZTogXCJicm93c2VyXCIsIGNhdGVnb3J5OiBcInRhYnNcIiB9LFxufTtcblxuZXhwb3J0IGRlZmF1bHQgbmV3VGFiQ29tbWFuZDtcbiIsImltcG9ydCB7IHY0IGFzIHV1aWR2NCB9IGZyb20gXCJ1dWlkXCI7XG5pbXBvcnQgdHlwZSB7IEJyb3dzZXIgfSBmcm9tIFwid3h0L2Jyb3dzZXJcIjtcbmltcG9ydCB7IENvbW1hbmQgfSBmcm9tIFwiLi9pbmRleFwiO1xuXG5jb25zdCByZWxvYWRUYWJDb21tYW5kOiBDb21tYW5kID0ge1xuICBpZDogdXVpZHY0KCksXG4gIG5hbWU6IFwiUmVsb2FkIFRhYlwiLFxuICBkZXNjcmlwdGlvbjogXCJSZWxvYWQgdGhlIGN1cnJlbnQgdGFiXCIsXG4gIGNvbnRleHQ6IFwiYmFja2dyb3VuZFwiLFxuICBleGVjdXRlOiBhc3luYyAodGFiPzogQnJvd3Nlci50YWJzLlRhYikgPT4ge1xuICAgIGlmICh0YWI/LmlkKSB7XG4gICAgICBhd2FpdCBicm93c2VyLnRhYnMucmVsb2FkKHRhYi5pZCk7XG4gICAgICByZXR1cm4gXCJUYWIgcmVsb2FkZWQuXCI7XG4gICAgfVxuICAgIHRocm93IG5ldyBFcnJvcihcIkNvdWxkIG5vdCBkZXRlcm1pbmUgdGhlIGFjdGl2ZSB0YWIgdG8gcmVsb2FkLlwiKTtcbiAgfSxcbiAgbWV0YTogeyB0eXBlOiBcImJyb3dzZXJcIiwgY2F0ZWdvcnk6IFwidGFic1wiIH0sXG59O1xuXG5leHBvcnQgZGVmYXVsdCByZWxvYWRUYWJDb21tYW5kO1xuIiwiaW1wb3J0IHR5cGUgeyBDb21tYW5kIH0gZnJvbSBcIi4vaW5kZXhcIjtcbmltcG9ydCB0eXBlIHsgQnJvd3NlciB9IGZyb20gXCJ3eHQvYnJvd3NlclwiO1xuaW1wb3J0IHsgdjQgfSBmcm9tIFwidXVpZFwiO1xuXG5jb25zdCBjbG9zZVRhYkNvbW1hbmQ6IENvbW1hbmQgPSB7XG4gIGlkOiB2NCgpLFxuICBuYW1lOiBcIkNsb3NlIFRhYlwiLFxuICBkZXNjcmlwdGlvbjogXCJDbG9zZSB0aGUgY3VycmVudCB0YWJcIixcbiAgY29udGV4dDogXCJiYWNrZ3JvdW5kXCIsXG4gIC8vIE5vdGU6IEJhY2tncm91bmQgZXhlY3V0b3IgbmVlZHMgdG8gcGFzcyB0aGUgJ3RhYicgb2JqZWN0IGZyb20gdGhlIHNlbmRlclxuICBleGVjdXRlOiBhc3luYyAodGFiPzogQnJvd3Nlci50YWJzLlRhYikgPT4ge1xuICAgIGlmICh0YWI/LmlkKSB7XG4gICAgICBhd2FpdCBicm93c2VyLnRhYnMucmVtb3ZlKHRhYi5pZCk7XG4gICAgICByZXR1cm4gXCJUYWIgY2xvc2VkLlwiO1xuICAgIH1cbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJDb3VsZCBub3QgZGV0ZXJtaW5lIHRoZSBhY3RpdmUgdGFiIHRvIGNsb3NlLlwiKTtcbiAgfSxcbiAgbWV0YTogeyB0eXBlOiBcImJyb3dzZXJcIiwgY2F0ZWdvcnk6IFwidGFic1wiIH0sXG59O1xuXG5leHBvcnQgZGVmYXVsdCBjbG9zZVRhYkNvbW1hbmQ7XG4iLCJpbXBvcnQgeyB2NCBhcyB1dWlkdjQgfSBmcm9tIFwidXVpZFwiO1xuaW1wb3J0IHsgc3RvcmFnZSB9IGZyb20gXCIjaW1wb3J0c1wiO1xuXG4vKipcbiAqIERlZmluZXMgdGhlIGV4ZWN1dGlvbiBjb250ZXh0IGZvciBhIGNvbW1hbmQuXG4gKiAtICdiYWNrZ3JvdW5kJzogRXhlY3V0ZXMgaW4gdGhlIGJhY2tncm91bmQgc2NyaXB0IChTZXJ2aWNlIFdvcmtlcikuIEhhcyBmdWxsIGV4dGVuc2lvbiBBUEkgYWNjZXNzLCBubyBkaXJlY3QgRE9NIGFjY2Vzcy5cbiAqIC0gJ2NvbnRlbnQnOiBFeGVjdXRlcyBpbiB0aGUgY29udGVudCBzY3JpcHQgb2YgdGhlIGFjdGl2ZSB0YWIuIEhhcyBET00gYWNjZXNzLCBsaW1pdGVkIGV4dGVuc2lvbiBBUEkgYWNjZXNzLlxuICovXG5leHBvcnQgdHlwZSBDb21tYW5kRXhlY3V0aW9uQ29udGV4dCA9IFwiYmFja2dyb3VuZFwiIHwgXCJjb250ZW50XCI7XG5cbmV4cG9ydCBpbnRlcmZhY2UgQ29tbWFuZCB7XG4gIGlkOiBzdHJpbmc7IC8vIFVuaXF1ZSBpZGVudGlmaWVyXG4gIG5hbWU6IHN0cmluZzsgLy8gVXNlci1mYWNpbmcgbmFtZVxuICBkZXNjcmlwdGlvbjogc3RyaW5nO1xuICBjb250ZXh0OiBDb21tYW5kRXhlY3V0aW9uQ29udGV4dDsgLy8gV2hlcmUgdGhlIGNvcmUgbG9naWMgcnVuc1xuICAvLyBUaGUgYWN0dWFsIGZ1bmN0aW9uIHRvIGV4ZWN1dGUuIEFyZ3VtZW50cyBhcmUgcGFzc2VkIGZyb20gdGhlIFVJL2lucHV0LlxuICAvLyBDb250ZXh0LXNwZWNpZmljIGFyZ3VtZW50cyAobGlrZSB0aGUgVGFiIGZvciBiYWNrZ3JvdW5kIG9yIG1heWJlIGN0eCBmb3IgY29udGVudCkgYXJlIGFkZGVkIGJ5IHRoZSBvcmNoZXN0cmF0b3IuXG4gIGV4ZWN1dGU6IChhbnk6IGFueSkgPT4gYW55O1xuICAvLyBPcHRpb25hbDogRGVmaW5lIGV4cGVjdGVkIGFyZ3VtZW50cyBmb3IgaGVscC92YWxpZGF0aW9uIGxhdGVyXG4gIC8vIGFyZ3M/OiB7IG5hbWU6IHN0cmluZzsgZGVzY3JpcHRpb24/OiBzdHJpbmc7IHR5cGU6IHN0cmluZyB9W107XG4gIG1ldGE/OiB7XG4gICAgW2tleTogc3RyaW5nXTogYW55O1xuICB9O1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIFN0b3JlZENvbW1hbmQge1xuICBpZDogc3RyaW5nOyAvLyBVbmlxdWUgaWRlbnRpZmllclxuICBuYW1lOiBzdHJpbmc7IC8vIFVzZXItZmFjaW5nIG5hbWVcbiAgZGVzY3JpcHRpb246IHN0cmluZztcbiAgY29udGV4dDogQ29tbWFuZEV4ZWN1dGlvbkNvbnRleHQ7IC8vIFdoZXJlIHRoZSBjb3JlIGxvZ2ljIHJ1bnNcbiAgLy8gVGhlIGFjdHVhbCBmdW5jdGlvbiB0byBleGVjdXRlLiBBcmd1bWVudHMgYXJlIHBhc3NlZCBmcm9tIHRoZSBVSS9pbnB1dC5cbiAgLy8gQ29udGV4dC1zcGVjaWZpYyBhcmd1bWVudHMgKGxpa2UgdGhlIFRhYiBmb3IgYmFja2dyb3VuZCBvciBtYXliZSBjdHggZm9yIGNvbnRlbnQpIGFyZSBhZGRlZCBieSB0aGUgb3JjaGVzdHJhdG9yLlxuICBleGVjdXRlOiBzdHJpbmc7XG4gIC8vIE9wdGlvbmFsOiBEZWZpbmUgZXhwZWN0ZWQgYXJndW1lbnRzIGZvciBoZWxwL3ZhbGlkYXRpb24gbGF0ZXJcbiAgLy8gYXJncz86IHsgbmFtZTogc3RyaW5nOyBkZXNjcmlwdGlvbj86IHN0cmluZzsgdHlwZTogc3RyaW5nIH1bXTtcbiAgbWV0YT86IHtcbiAgICBba2V5OiBzdHJpbmddOiBhbnk7XG4gIH07XG59XG5cbmltcG9ydCBnb0JhY2tDb21tYW5kIGZyb20gXCIuL2dvLWJhY2tcIjtcbmltcG9ydCBnb0ZvcndhcmRDb21tYW5kIGZyb20gXCIuL2dvLWZvcndhcmRcIjtcbmltcG9ydCBjb3B5VGl0bGVDb21tYW5kIGZyb20gXCIuL2NvcHktdGl0bGVcIjtcbmltcG9ydCBkb3dubG9hZE1hcmtkb3duQ29tbWFuZCBmcm9tIFwiLi9kb3dubG9hZC1tYXJrZG93blwiO1xuaW1wb3J0IGxpc3RCb29rbWFya3NDb21tYW5kIGZyb20gXCIuL2xpc3QtYm9va21hcmtzXCI7XG5pbXBvcnQgbmV3VGFiQ29tbWFuZCBmcm9tIFwiLi9uZXctdGFiXCI7XG5pbXBvcnQgcmVsb2FkVGFiQ29tbWFuZCBmcm9tIFwiLi9yZWxvYWQtdGFiXCI7XG5pbXBvcnQgY2xvc2VUYWJDb21tYW5kIGZyb20gXCIuL2Nsb3NlLXRhYlwiO1xuXG4vLyBJbml0aWFsIGRlZmF1bHQgY29tbWFuZHNcbmNvbnN0IGRlZmF1bHRDb21tYW5kczogQ29tbWFuZFtdID0gW1xuICBuZXdUYWJDb21tYW5kLFxuICBjbG9zZVRhYkNvbW1hbmQsXG4gIHJlbG9hZFRhYkNvbW1hbmQsXG4gIGxpc3RCb29rbWFya3NDb21tYW5kLFxuICBnb0JhY2tDb21tYW5kLFxuICBnb0ZvcndhcmRDb21tYW5kLFxuICBjb3B5VGl0bGVDb21tYW5kLFxuICBkb3dubG9hZE1hcmtkb3duQ29tbWFuZCxcbl07XG5cbi8vIC0tLSBSZWdpc3RyeSBMb2dpYyAtLS1cblxuY29uc3QgQ09NTUFORFNfU1RPUkFHRV9LRVkgPSBcImNvbW1hbmRzXCI7XG5cbmNvbnN0IHNhdmVkX2NvbW1hbmRzID0gc3RvcmFnZS5kZWZpbmVJdGVtPFN0b3JlZENvbW1hbmRbXT4oXG4gIGBsb2NhbDoke0NPTU1BTkRTX1NUT1JBR0VfS0VZfWAsXG4gIHtcbiAgICBmYWxsYmFjazogW10sXG4gIH0sXG4pO1xuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gbG9hZENvbW1hbmRzKCkge1xuICBzYXZlQ29tbWFuZHMoZGVmYXVsdENvbW1hbmRzKTtcbiAgY29uc29sZS5sb2coYXdhaXQgZ2V0QWxsQ29tbWFuZHMoKSwgXCJhbGxDb21tYW5kcyBhZnRlciBsb2FkaW5nXCIpO1xufVxuXG5hc3luYyBmdW5jdGlvbiBzYXZlQ29tbWFuZHMoY29tbWFuZHM6IENvbW1hbmRbXSkge1xuICB0cnkge1xuICAgIGNvbnN0IGNvbW1hbmRzV2l0aFNlcmlhbGl6ZWRGdW5jdGlvbnMgPSBjb21tYW5kcy5tYXAoKGNvbW1hbmQpID0+ICh7XG4gICAgICAuLi5jb21tYW5kLFxuICAgICAgZXhlY3V0ZTogY29tbWFuZC5leGVjdXRlLnRvU3RyaW5nKCksXG4gICAgfSkpO1xuICAgIGF3YWl0IHNhdmVkX2NvbW1hbmRzLnNldFZhbHVlKGNvbW1hbmRzV2l0aFNlcmlhbGl6ZWRGdW5jdGlvbnMpO1xuICB9IGNhdGNoIChlcnJvcikge1xuICAgIGNvbnNvbGUuZXJyb3IoXCJFcnJvciBzYXZpbmcgY29tbWFuZHMgdG8gc3RvcmFnZTpcIiwgZXJyb3IpO1xuICB9XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBjcmVhdGVDb21tYW5kKFxuICBjb21tYW5kOiBPbWl0PENvbW1hbmQsIFwiaWRcIj4sXG4pOiBQcm9taXNlPENvbW1hbmQ+IHtcbiAgY29uc3QgbmV3Q29tbWFuZDogQ29tbWFuZCA9IHsgaWQ6IHV1aWR2NCgpLCAuLi5jb21tYW5kIH07XG4gIGNvbnN0IGFsbENvbW1hbmRzID0gYXdhaXQgZ2V0QWxsQ29tbWFuZHMoKTtcbiAgY29uc3QgdXBkYXRlZENvbW1hbmRzID0gWy4uLmFsbENvbW1hbmRzLCBuZXdDb21tYW5kXTtcbiAgYXdhaXQgc2F2ZUNvbW1hbmRzKHVwZGF0ZWRDb21tYW5kcyk7XG4gIHJldHVybiBuZXdDb21tYW5kO1xufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gdXBkYXRlQ29tbWFuZChjb21tYW5kOiBDb21tYW5kKTogUHJvbWlzZTxDb21tYW5kPiB7XG4gIGNvbnN0IGFsbENvbW1hbmRzID0gYXdhaXQgZ2V0QWxsQ29tbWFuZHMoKTtcbiAgY29uc3QgdXBkYXRlZENvbW1hbmRzID0gYWxsQ29tbWFuZHMubWFwKChjKSA9PlxuICAgIGMuaWQgPT09IGNvbW1hbmQuaWQgPyBjb21tYW5kIDogYyxcbiAgKTtcbiAgYXdhaXQgc2F2ZUNvbW1hbmRzKHVwZGF0ZWRDb21tYW5kcyk7XG4gIHJldHVybiBjb21tYW5kO1xufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZGVsZXRlQ29tbWFuZChpZDogc3RyaW5nKTogUHJvbWlzZTxzdHJpbmc+IHtcbiAgY29uc3QgYWxsQ29tbWFuZHMgPSBhd2FpdCBnZXRBbGxDb21tYW5kcygpO1xuICBjb25zdCB1cGRhdGVkQ29tbWFuZHMgPSBhbGxDb21tYW5kcy5maWx0ZXIoKGNvbW1hbmQpID0+IGNvbW1hbmQuaWQgIT09IGlkKTtcbiAgYXdhaXQgc2F2ZUNvbW1hbmRzKHVwZGF0ZWRDb21tYW5kcyk7XG4gIHJldHVybiBpZDtcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGdldEFsbENvbW1hbmRzKCk6IFByb21pc2U8Q29tbWFuZFtdPiB7XG4gIHJldHVybiBhd2FpdCBzYXZlZF9jb21tYW5kcy5nZXRWYWx1ZSgpO1xufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZ2V0Q29tbWFuZEJ5SWQoaWQ6IHN0cmluZyk6IFByb21pc2U8Q29tbWFuZCB8IHVuZGVmaW5lZD4ge1xuICBjb25zdCBhbGxDb21tYW5kcyA9IGF3YWl0IGdldEFsbENvbW1hbmRzKCk7XG4gIHJldHVybiBhbGxDb21tYW5kcy5maW5kKChjb21tYW5kKSA9PiBjb21tYW5kLmlkID09PSBpZCk7XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBzZWFyY2hDb21tYW5kcyhxdWVyeTogc3RyaW5nKTogUHJvbWlzZTxDb21tYW5kW10+IHtcbiAgY29uc3QgYWxsQ29tbWFuZHMgPSBhd2FpdCBnZXRBbGxDb21tYW5kcygpO1xuICBjb25zb2xlLmxvZyhhbGxDb21tYW5kcywgXCJhbGxDb21tYW5kc1wiKTtcbiAgY29uc3QgbG93ZXJDYXNlUXVlcnkgPSBxdWVyeS50b0xvd2VyQ2FzZSgpLnRyaW0oKTtcbiAgaWYgKCFsb3dlckNhc2VRdWVyeSkgcmV0dXJuIGFsbENvbW1hbmRzO1xuXG4gIHJldHVybiBhbGxDb21tYW5kcy5maWx0ZXIoXG4gICAgKGNtZCkgPT5cbiAgICAgIGNtZC5uYW1lLnRvTG93ZXJDYXNlKCkuaW5jbHVkZXMobG93ZXJDYXNlUXVlcnkpIHx8XG4gICAgICBjbWQuZGVzY3JpcHRpb24udG9Mb3dlckNhc2UoKS5pbmNsdWRlcyhsb3dlckNhc2VRdWVyeSkgfHxcbiAgICAgIGNtZC5pZC50b0xvd2VyQ2FzZSgpLmluY2x1ZGVzKGxvd2VyQ2FzZVF1ZXJ5KSxcbiAgKTtcbn1cbiIsImltcG9ydCB7IGdldEFsbENvbW1hbmRzLCBnZXRDb21tYW5kQnlJZCB9IGZyb20gXCJAL2xpYi9jb21tYW5kc1wiO1xuaW1wb3J0IHsgbG9hZENvbW1hbmRzIH0gZnJvbSBcIkAvbGliL2NvbW1hbmRzXCI7XG5cbmNvbnNvbGUubG9nKFwiQmFja2dyb3VuZCBzY3JpcHQgbG9hZGVkLlwiKTtcblxuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQmFja2dyb3VuZCgoKSA9PiB7XG4gIGJyb3dzZXIucnVudGltZS5vbkluc3RhbGxlZC5hZGRMaXN0ZW5lcigoKSA9PiB7XG4gICAgY29uc29sZS5sb2coXCJFeHRlbnNpb24gaW5zdGFsbGVkIG9yIHVwZGF0ZWQuIExvYWRpbmcgY29tbWFuZHMuLi5cIik7XG4gICAgbG9hZENvbW1hbmRzKCk7XG4gICAgY29uc29sZS5sb2coZ2V0QWxsQ29tbWFuZHMoKSk7XG4gIH0pO1xuXG4gIGNvbnNvbGUubG9nKGdldENvbW1hbmRCeUlkKFwiOWU4YTMwOWMtZGJhMi00MTE2LWE5MzctNTBhZjc3MTZlMWIzXCIpKTtcbiAgLy8gQ29tbWFuZCBsaXN0ZW5lciAoZm9yIGtleWJvYXJkIHNob3J0Y3V0KSByZW1haW5zIHRoZSBzYW1lXG4gIGJyb3dzZXIuY29tbWFuZHMub25Db21tYW5kLmFkZExpc3RlbmVyKGFzeW5jIChjb21tYW5kTmFtZSkgPT4ge1xuICAgIGNvbnNvbGUubG9nKGBDb21tYW5kIHJlY2VpdmVkOiAke2NvbW1hbmROYW1lfWApO1xuICAgIGlmIChjb21tYW5kTmFtZSA9PT0gXCJ0b2dnbGVfd2VicHJvbXB0XCIpIHtcbiAgICAgIGNvbnNvbGUubG9nKFwic2hvcnRjdXQgcHJlc3NlZFwiKTtcbiAgICAgIGNvbnN0IFtjdXJyZW50VGFiXSA9IGF3YWl0IGJyb3dzZXIudGFicy5xdWVyeSh7XG4gICAgICAgIGFjdGl2ZTogdHJ1ZSxcbiAgICAgICAgY3VycmVudFdpbmRvdzogdHJ1ZSxcbiAgICAgIH0pO1xuXG4gICAgICBpZiAoY3VycmVudFRhYj8uaWQpIHtcbiAgICAgICAgY29uc29sZS5sb2coYFNlbmRpbmcgdG9nZ2xlLXVpIG1lc3NhZ2UgdG8gdGFiICR7Y3VycmVudFRhYi5pZH1gKTtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICBhd2FpdCBicm93c2VyLnRhYnMuc2VuZE1lc3NhZ2UoY3VycmVudFRhYi5pZCwge1xuICAgICAgICAgICAgYWN0aW9uOiBcInRvZ2dsZS11aVwiLFxuICAgICAgICAgIH0pO1xuICAgICAgICAgIGNvbnNvbGUubG9nKGBNZXNzYWdlIHNlbnQgc3VjY2Vzc2Z1bGx5IHRvIHRhYiAke2N1cnJlbnRUYWIuaWR9YCk7XG4gICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgY29uc29sZS5lcnJvcihcbiAgICAgICAgICAgIGBFcnJvciBzZW5kaW5nIG1lc3NhZ2UgdG8gdGFiICR7Y3VycmVudFRhYi5pZH06YCxcbiAgICAgICAgICAgIGVycm9yLFxuICAgICAgICAgICk7XG4gICAgICAgICAgLy8gVE9ETzogQ29uc2lkZXIgaW5qZWN0aW5nIGNvbnRlbnQgc2NyaXB0IGlmIGl0IGRvZXNuJ3QgZXhpc3RcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY29uc29sZS5sb2coXCJObyBhY3RpdmUgdGFiIGZvdW5kIG9yIHRhYiBoYXMgbm8gSUQuXCIpO1xuICAgICAgfVxuICAgIH1cbiAgfSk7XG5cbiAgLy8gLS0tIENvbW1hbmQgT3JjaGVzdHJhdGlvbiAtLS1cbiAgYnJvd3Nlci5ydW50aW1lLm9uTWVzc2FnZS5hZGRMaXN0ZW5lcihcbiAgICBhc3luYyAobWVzc2FnZSwgc2VuZGVyLCBzZW5kUmVzcG9uc2UpID0+IHtcbiAgICAgIGNvbnNvbGUubG9nKFxuICAgICAgICBcIk1lc3NhZ2UgcmVjZWl2ZWQgaW4gYmFja2dyb3VuZDpcIixcbiAgICAgICAgbWVzc2FnZSxcbiAgICAgICAgXCJmcm9tIHRhYjpcIixcbiAgICAgICAgc2VuZGVyLnRhYj8uaWQsXG4gICAgICApO1xuXG4gICAgICBpZiAobWVzc2FnZS5hY3Rpb24gPT09IFwiZXhlY3V0ZS1jb21tYW5kXCIpIHtcbiAgICAgICAgY29uc3QgeyBjb21tYW5kSWQsIGFyZ3MgfSA9IG1lc3NhZ2UucGF5bG9hZDtcbiAgICAgICAgY29uc3QgY29tbWFuZCA9IGF3YWl0IGdldENvbW1hbmRCeUlkKGNvbW1hbmRJZCk7XG4gICAgICAgIGNvbnNvbGUubG9nKGNvbW1hbmQpO1xuXG4gICAgICAgIGlmICghY29tbWFuZCkge1xuICAgICAgICAgIGNvbnNvbGUuZXJyb3IoYENvbW1hbmQgbm90IGZvdW5kOiAke2NvbW1hbmRJZH1gKTtcbiAgICAgICAgICBzZW5kUmVzcG9uc2Uoe1xuICAgICAgICAgICAgc3VjY2VzczogZmFsc2UsXG4gICAgICAgICAgICBlcnJvcjogYENvbW1hbmQgbm90IGZvdW5kOiAke2NvbW1hbmRJZH1gLFxuICAgICAgICAgIH0pO1xuICAgICAgICAgIHJldHVybiBmYWxzZTsgLy8gU3luY2hyb25vdXMgcmVzcG9uc2VcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnNvbGUubG9nKFxuICAgICAgICAgIGBPcmNoZXN0cmF0aW5nIGNvbW1hbmQ6ICR7Y29tbWFuZC5uYW1lfSAoY29udGV4dDogJHtjb21tYW5kLmNvbnRleHR9KWAsXG4gICAgICAgICk7XG5cbiAgICAgICAgaWYgKGNvbW1hbmQuY29udGV4dCA9PT0gXCJiYWNrZ3JvdW5kXCIpIHtcbiAgICAgICAgICAvLyBFeGVjdXRlIGRpcmVjdGx5IGluIGJhY2tncm91bmRcbiAgICAgICAgICBQcm9taXNlLnJlc29sdmUoKSAvLyBFbnN1cmUgYXN5bmMgaGFuZGxpbmdcbiAgICAgICAgICAgIC50aGVuKCgpID0+IGNvbW1hbmQuZXhlY3V0ZShzZW5kZXIudGFiLCAuLi4oYXJncyB8fCBbXSkpKSAvLyBQYXNzIHRhYiBjb250ZXh0XG4gICAgICAgICAgICAudGhlbigocmVzdWx0KSA9PiB7XG4gICAgICAgICAgICAgIGNvbnNvbGUubG9nKFxuICAgICAgICAgICAgICAgIGBCYWNrZ3JvdW5kIGNvbW1hbmQgJyR7Y29tbWFuZC5uYW1lfScgZXhlY3V0ZWQgc3VjY2Vzc2Z1bGx5LmAsXG4gICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgIHNlbmRSZXNwb25zZSh7IHN1Y2Nlc3M6IHRydWUsIHJlc3VsdCB9KTtcbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAuY2F0Y2goKGVycm9yKSA9PiB7XG4gICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoXG4gICAgICAgICAgICAgICAgYEVycm9yIGV4ZWN1dGluZyBiYWNrZ3JvdW5kIGNvbW1hbmQgJyR7Y29tbWFuZC5uYW1lfSc6YCxcbiAgICAgICAgICAgICAgICBlcnJvcixcbiAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgc2VuZFJlc3BvbnNlKHtcbiAgICAgICAgICAgICAgICBzdWNjZXNzOiBmYWxzZSxcbiAgICAgICAgICAgICAgICBlcnJvcjogZXJyb3I/Lm1lc3NhZ2UgfHwgU3RyaW5nKGVycm9yKSxcbiAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICByZXR1cm4gdHJ1ZTsgLy8gSW5kaWNhdGVzIGFzeW5jIHJlc3BvbnNlXG4gICAgICAgIH0gZWxzZSBpZiAoY29tbWFuZC5jb250ZXh0ID09PSBcImNvbnRlbnRcIikge1xuICAgICAgICAgIC8vIEZvcndhcmQgdG8gdGhlIGNvbnRlbnQgc2NyaXB0IHRoYXQgc2VudCB0aGUgbWVzc2FnZVxuICAgICAgICAgIGlmICghc2VuZGVyLnRhYj8uaWQpIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoXG4gICAgICAgICAgICAgIFwiQ2Fubm90IGV4ZWN1dGUgY29udGVudCBzY3JpcHQgY29tbWFuZDogc2VuZGVyIHRhYiBJRCBpcyBtaXNzaW5nLlwiLFxuICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIHNlbmRSZXNwb25zZSh7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogXCJNaXNzaW5nIHNlbmRlciB0YWIgSUQuXCIgfSk7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgfVxuICAgICAgICAgIGNvbnNvbGUubG9nKFxuICAgICAgICAgICAgYEZvcndhcmRpbmcgY29tbWFuZCAnJHtjb21tYW5kLm5hbWV9JyB0byBjb250ZW50IHNjcmlwdCBpbiB0YWIgJHtzZW5kZXIudGFiLmlkfWAsXG4gICAgICAgICAgKTtcbiAgICAgICAgICBicm93c2VyLnRhYnNcbiAgICAgICAgICAgIC5zZW5kTWVzc2FnZShzZW5kZXIudGFiLmlkLCB7XG4gICAgICAgICAgICAgIGFjdGlvbjogXCJydW4tY29udGVudC1jb21tYW5kXCIsXG4gICAgICAgICAgICAgIHBheWxvYWQ6IHsgY29tbWFuZElkLCBhcmdzOiBhcmdzIHx8IFtdIH0sXG4gICAgICAgICAgICB9KVxuICAgICAgICAgICAgLnRoZW4oKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICAgIGNvbnNvbGUubG9nKFxuICAgICAgICAgICAgICAgIGBSZXNwb25zZSBmcm9tIGNvbnRlbnQgc2NyaXB0IGZvciAnJHtjb21tYW5kLm5hbWV9JzpgLFxuICAgICAgICAgICAgICAgIHJlc3BvbnNlLFxuICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAvLyBGb3J3YXJkIHRoZSBjb250ZW50IHNjcmlwdCdzIHJlc3BvbnNlIGJhY2sgdG8gdGhlIG9yaWdpbmFsIFVJIGNhbGxlclxuICAgICAgICAgICAgICBzZW5kUmVzcG9uc2UocmVzcG9uc2UpO1xuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIC5jYXRjaCgoZXJyb3IpID0+IHtcbiAgICAgICAgICAgICAgY29uc29sZS5lcnJvcihcbiAgICAgICAgICAgICAgICBgRXJyb3IgZm9yd2FyZGluZy9yZWNlaXZpbmcgZnJvbSBjb250ZW50IHNjcmlwdCBmb3IgJyR7Y29tbWFuZC5uYW1lfSc6YCxcbiAgICAgICAgICAgICAgICBlcnJvcixcbiAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgc2VuZFJlc3BvbnNlKHtcbiAgICAgICAgICAgICAgICBzdWNjZXNzOiBmYWxzZSxcbiAgICAgICAgICAgICAgICBlcnJvcjpcbiAgICAgICAgICAgICAgICAgIGVycm9yPy5tZXNzYWdlIHx8IGBFcnJvciBjb21tdW5pY2F0aW5nIHdpdGggY29udGVudCBzY3JpcHQuYCxcbiAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICByZXR1cm4gdHJ1ZTsgLy8gSW5kaWNhdGVzIGFzeW5jIHJlc3BvbnNlXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgY29uc29sZS5lcnJvcihgVW5zdXBwb3J0ZWQgY29tbWFuZCBjb250ZXh0OiAke2NvbW1hbmQuY29udGV4dH1gKTtcbiAgICAgICAgICBzZW5kUmVzcG9uc2Uoe1xuICAgICAgICAgICAgc3VjY2VzczogZmFsc2UsXG4gICAgICAgICAgICBlcnJvcjogYFVuc3VwcG9ydGVkIGNvbW1hbmQgY29udGV4dDogJHtjb21tYW5kLmNvbnRleHR9YCxcbiAgICAgICAgICB9KTtcbiAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIC8vIEhhbmRsZSBvdGhlciBtZXNzYWdlIHR5cGVzIGlmIG5lZWRlZFxuICAgICAgcmV0dXJuIGZhbHNlOyAvLyBJbmRpY2F0ZSBzeW5jaHJvbm91cyBoYW5kbGluZyBpZiBubyByZXNwb25zZSBuZWVkZWQgb3IgaGFuZGxlZCBhYm92ZVxuICAgIH0sXG4gICk7XG59KTtcbiIsIi8vIHNyYy9pbmRleC50c1xudmFyIF9NYXRjaFBhdHRlcm4gPSBjbGFzcyB7XG4gIGNvbnN0cnVjdG9yKG1hdGNoUGF0dGVybikge1xuICAgIGlmIChtYXRjaFBhdHRlcm4gPT09IFwiPGFsbF91cmxzPlwiKSB7XG4gICAgICB0aGlzLmlzQWxsVXJscyA9IHRydWU7XG4gICAgICB0aGlzLnByb3RvY29sTWF0Y2hlcyA9IFsuLi5fTWF0Y2hQYXR0ZXJuLlBST1RPQ09MU107XG4gICAgICB0aGlzLmhvc3RuYW1lTWF0Y2ggPSBcIipcIjtcbiAgICAgIHRoaXMucGF0aG5hbWVNYXRjaCA9IFwiKlwiO1xuICAgIH0gZWxzZSB7XG4gICAgICBjb25zdCBncm91cHMgPSAvKC4qKTpcXC9cXC8oLio/KShcXC8uKikvLmV4ZWMobWF0Y2hQYXR0ZXJuKTtcbiAgICAgIGlmIChncm91cHMgPT0gbnVsbClcbiAgICAgICAgdGhyb3cgbmV3IEludmFsaWRNYXRjaFBhdHRlcm4obWF0Y2hQYXR0ZXJuLCBcIkluY29ycmVjdCBmb3JtYXRcIik7XG4gICAgICBjb25zdCBbXywgcHJvdG9jb2wsIGhvc3RuYW1lLCBwYXRobmFtZV0gPSBncm91cHM7XG4gICAgICB2YWxpZGF0ZVByb3RvY29sKG1hdGNoUGF0dGVybiwgcHJvdG9jb2wpO1xuICAgICAgdmFsaWRhdGVIb3N0bmFtZShtYXRjaFBhdHRlcm4sIGhvc3RuYW1lKTtcbiAgICAgIHZhbGlkYXRlUGF0aG5hbWUobWF0Y2hQYXR0ZXJuLCBwYXRobmFtZSk7XG4gICAgICB0aGlzLnByb3RvY29sTWF0Y2hlcyA9IHByb3RvY29sID09PSBcIipcIiA/IFtcImh0dHBcIiwgXCJodHRwc1wiXSA6IFtwcm90b2NvbF07XG4gICAgICB0aGlzLmhvc3RuYW1lTWF0Y2ggPSBob3N0bmFtZTtcbiAgICAgIHRoaXMucGF0aG5hbWVNYXRjaCA9IHBhdGhuYW1lO1xuICAgIH1cbiAgfVxuICBpbmNsdWRlcyh1cmwpIHtcbiAgICBpZiAodGhpcy5pc0FsbFVybHMpXG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICBjb25zdCB1ID0gdHlwZW9mIHVybCA9PT0gXCJzdHJpbmdcIiA/IG5ldyBVUkwodXJsKSA6IHVybCBpbnN0YW5jZW9mIExvY2F0aW9uID8gbmV3IFVSTCh1cmwuaHJlZikgOiB1cmw7XG4gICAgcmV0dXJuICEhdGhpcy5wcm90b2NvbE1hdGNoZXMuZmluZCgocHJvdG9jb2wpID0+IHtcbiAgICAgIGlmIChwcm90b2NvbCA9PT0gXCJodHRwXCIpXG4gICAgICAgIHJldHVybiB0aGlzLmlzSHR0cE1hdGNoKHUpO1xuICAgICAgaWYgKHByb3RvY29sID09PSBcImh0dHBzXCIpXG4gICAgICAgIHJldHVybiB0aGlzLmlzSHR0cHNNYXRjaCh1KTtcbiAgICAgIGlmIChwcm90b2NvbCA9PT0gXCJmaWxlXCIpXG4gICAgICAgIHJldHVybiB0aGlzLmlzRmlsZU1hdGNoKHUpO1xuICAgICAgaWYgKHByb3RvY29sID09PSBcImZ0cFwiKVxuICAgICAgICByZXR1cm4gdGhpcy5pc0Z0cE1hdGNoKHUpO1xuICAgICAgaWYgKHByb3RvY29sID09PSBcInVyblwiKVxuICAgICAgICByZXR1cm4gdGhpcy5pc1Vybk1hdGNoKHUpO1xuICAgIH0pO1xuICB9XG4gIGlzSHR0cE1hdGNoKHVybCkge1xuICAgIHJldHVybiB1cmwucHJvdG9jb2wgPT09IFwiaHR0cDpcIiAmJiB0aGlzLmlzSG9zdFBhdGhNYXRjaCh1cmwpO1xuICB9XG4gIGlzSHR0cHNNYXRjaCh1cmwpIHtcbiAgICByZXR1cm4gdXJsLnByb3RvY29sID09PSBcImh0dHBzOlwiICYmIHRoaXMuaXNIb3N0UGF0aE1hdGNoKHVybCk7XG4gIH1cbiAgaXNIb3N0UGF0aE1hdGNoKHVybCkge1xuICAgIGlmICghdGhpcy5ob3N0bmFtZU1hdGNoIHx8ICF0aGlzLnBhdGhuYW1lTWF0Y2gpXG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgY29uc3QgaG9zdG5hbWVNYXRjaFJlZ2V4cyA9IFtcbiAgICAgIHRoaXMuY29udmVydFBhdHRlcm5Ub1JlZ2V4KHRoaXMuaG9zdG5hbWVNYXRjaCksXG4gICAgICB0aGlzLmNvbnZlcnRQYXR0ZXJuVG9SZWdleCh0aGlzLmhvc3RuYW1lTWF0Y2gucmVwbGFjZSgvXlxcKlxcLi8sIFwiXCIpKVxuICAgIF07XG4gICAgY29uc3QgcGF0aG5hbWVNYXRjaFJlZ2V4ID0gdGhpcy5jb252ZXJ0UGF0dGVyblRvUmVnZXgodGhpcy5wYXRobmFtZU1hdGNoKTtcbiAgICByZXR1cm4gISFob3N0bmFtZU1hdGNoUmVnZXhzLmZpbmQoKHJlZ2V4KSA9PiByZWdleC50ZXN0KHVybC5ob3N0bmFtZSkpICYmIHBhdGhuYW1lTWF0Y2hSZWdleC50ZXN0KHVybC5wYXRobmFtZSk7XG4gIH1cbiAgaXNGaWxlTWF0Y2godXJsKSB7XG4gICAgdGhyb3cgRXJyb3IoXCJOb3QgaW1wbGVtZW50ZWQ6IGZpbGU6Ly8gcGF0dGVybiBtYXRjaGluZy4gT3BlbiBhIFBSIHRvIGFkZCBzdXBwb3J0XCIpO1xuICB9XG4gIGlzRnRwTWF0Y2godXJsKSB7XG4gICAgdGhyb3cgRXJyb3IoXCJOb3QgaW1wbGVtZW50ZWQ6IGZ0cDovLyBwYXR0ZXJuIG1hdGNoaW5nLiBPcGVuIGEgUFIgdG8gYWRkIHN1cHBvcnRcIik7XG4gIH1cbiAgaXNVcm5NYXRjaCh1cmwpIHtcbiAgICB0aHJvdyBFcnJvcihcIk5vdCBpbXBsZW1lbnRlZDogdXJuOi8vIHBhdHRlcm4gbWF0Y2hpbmcuIE9wZW4gYSBQUiB0byBhZGQgc3VwcG9ydFwiKTtcbiAgfVxuICBjb252ZXJ0UGF0dGVyblRvUmVnZXgocGF0dGVybikge1xuICAgIGNvbnN0IGVzY2FwZWQgPSB0aGlzLmVzY2FwZUZvclJlZ2V4KHBhdHRlcm4pO1xuICAgIGNvbnN0IHN0YXJzUmVwbGFjZWQgPSBlc2NhcGVkLnJlcGxhY2UoL1xcXFxcXCovZywgXCIuKlwiKTtcbiAgICByZXR1cm4gUmVnRXhwKGBeJHtzdGFyc1JlcGxhY2VkfSRgKTtcbiAgfVxuICBlc2NhcGVGb3JSZWdleChzdHJpbmcpIHtcbiAgICByZXR1cm4gc3RyaW5nLnJlcGxhY2UoL1suKis/XiR7fSgpfFtcXF1cXFxcXS9nLCBcIlxcXFwkJlwiKTtcbiAgfVxufTtcbnZhciBNYXRjaFBhdHRlcm4gPSBfTWF0Y2hQYXR0ZXJuO1xuTWF0Y2hQYXR0ZXJuLlBST1RPQ09MUyA9IFtcImh0dHBcIiwgXCJodHRwc1wiLCBcImZpbGVcIiwgXCJmdHBcIiwgXCJ1cm5cIl07XG52YXIgSW52YWxpZE1hdGNoUGF0dGVybiA9IGNsYXNzIGV4dGVuZHMgRXJyb3Ige1xuICBjb25zdHJ1Y3RvcihtYXRjaFBhdHRlcm4sIHJlYXNvbikge1xuICAgIHN1cGVyKGBJbnZhbGlkIG1hdGNoIHBhdHRlcm4gXCIke21hdGNoUGF0dGVybn1cIjogJHtyZWFzb259YCk7XG4gIH1cbn07XG5mdW5jdGlvbiB2YWxpZGF0ZVByb3RvY29sKG1hdGNoUGF0dGVybiwgcHJvdG9jb2wpIHtcbiAgaWYgKCFNYXRjaFBhdHRlcm4uUFJPVE9DT0xTLmluY2x1ZGVzKHByb3RvY29sKSAmJiBwcm90b2NvbCAhPT0gXCIqXCIpXG4gICAgdGhyb3cgbmV3IEludmFsaWRNYXRjaFBhdHRlcm4oXG4gICAgICBtYXRjaFBhdHRlcm4sXG4gICAgICBgJHtwcm90b2NvbH0gbm90IGEgdmFsaWQgcHJvdG9jb2wgKCR7TWF0Y2hQYXR0ZXJuLlBST1RPQ09MUy5qb2luKFwiLCBcIil9KWBcbiAgICApO1xufVxuZnVuY3Rpb24gdmFsaWRhdGVIb3N0bmFtZShtYXRjaFBhdHRlcm4sIGhvc3RuYW1lKSB7XG4gIGlmIChob3N0bmFtZS5pbmNsdWRlcyhcIjpcIikpXG4gICAgdGhyb3cgbmV3IEludmFsaWRNYXRjaFBhdHRlcm4obWF0Y2hQYXR0ZXJuLCBgSG9zdG5hbWUgY2Fubm90IGluY2x1ZGUgYSBwb3J0YCk7XG4gIGlmIChob3N0bmFtZS5pbmNsdWRlcyhcIipcIikgJiYgaG9zdG5hbWUubGVuZ3RoID4gMSAmJiAhaG9zdG5hbWUuc3RhcnRzV2l0aChcIiouXCIpKVxuICAgIHRocm93IG5ldyBJbnZhbGlkTWF0Y2hQYXR0ZXJuKFxuICAgICAgbWF0Y2hQYXR0ZXJuLFxuICAgICAgYElmIHVzaW5nIGEgd2lsZGNhcmQgKCopLCBpdCBtdXN0IGdvIGF0IHRoZSBzdGFydCBvZiB0aGUgaG9zdG5hbWVgXG4gICAgKTtcbn1cbmZ1bmN0aW9uIHZhbGlkYXRlUGF0aG5hbWUobWF0Y2hQYXR0ZXJuLCBwYXRobmFtZSkge1xuICByZXR1cm47XG59XG5leHBvcnQge1xuICBJbnZhbGlkTWF0Y2hQYXR0ZXJuLFxuICBNYXRjaFBhdHRlcm5cbn07XG4iXSwibmFtZXMiOlsiYnJvd3NlciIsIl9icm93c2VyIiwicmVzdWx0IiwiX2EiLCJ1dWlkdjQiLCJfYiJdLCJtYXBwaW5ncyI6Ijs7O0FBQU8sV0FBUyxpQkFBaUIsS0FBSztBQUNwQyxRQUFJLE9BQU8sUUFBUSxPQUFPLFFBQVEsV0FBWSxRQUFPLEVBQUUsTUFBTSxJQUFLO0FBQ2xFLFdBQU87QUFBQSxFQUNUO0FDRk8sUUFBTUEsY0FBVSxzQkFBVyxZQUFYLG1CQUFvQixZQUFwQixtQkFBNkIsTUFDaEQsV0FBVyxVQUNYLFdBQVc7QUNGUixRQUFNQSxZQUFVQztBQ0R2QixNQUFJLE1BQU0sT0FBTyxVQUFVO0FBRXBCLFdBQVMsT0FBTyxLQUFLLEtBQUs7QUFDaEMsUUFBSSxNQUFNO0FBQ1YsUUFBSSxRQUFRLElBQUssUUFBTztBQUV4QixRQUFJLE9BQU8sUUFBUSxPQUFLLElBQUksaUJBQWlCLElBQUksYUFBYTtBQUM3RCxVQUFJLFNBQVMsS0FBTSxRQUFPLElBQUksUUFBUyxNQUFLLElBQUksUUFBUztBQUN6RCxVQUFJLFNBQVMsT0FBUSxRQUFPLElBQUksU0FBVSxNQUFL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UUFDUjtBQUFBLFFBQ0EsR0FBRyxRQUFRLDBCQUEwQixhQUFhLFVBQVUsS0FBSyxJQUFJLENBQUM7QUFBQSxNQUN2RTtBQUFBLEVBQ0w7QUFDQSxXQUFTLGlCQUFpQixjQUFjLFVBQVU7QUFDaEQsUUFBSSxTQUFTLFNBQVMsR0FBRztBQUN2QixZQUFNLElBQUksb0JBQW9CLGNBQWMsZ0NBQWdDO0FBQzlFLFFBQUksU0FBUyxTQUFTLEdBQUcsS0FBSyxTQUFTLFNBQVMsS0FBSyxDQUFDLFNBQVMsV0FBVyxJQUFJO0FBQzVFLFlBQU0sSUFBSTtBQUFBLFFBQ1I7QUFBQSxRQUNBO0FBQUEsTUFDRDtBQUFBLEVBQ0w7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7IiwieF9nb29nbGVfaWdub3JlTGlzdCI6WzAsMSwyLDMsNCw1LDYsNyw4LDksMjBdfQ==
