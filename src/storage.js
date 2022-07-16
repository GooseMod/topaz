(async () => {
const startTime = performance.now();
const dbReq = indexedDB.open('topaz');

const getTrans = () => db.transaction([ 'store' ], 'readwrite').objectStore('store');
const save = () => getTrans().put(store, 'store').onsuccess = e => topaz.log('storage', 'db saved');

let db;
const store = await new Promise(res => {
  dbReq.onerror = e => console.error('topaz failed to open idb db', e);
  dbReq.onsuccess = e => {
    db = e.target.result;
    topaz.log('storage', 'opened db');

    try {
      getTrans().get('store').onsuccess = e => {
        res(e.target.result);
      };
    } catch (e) {
      console.error('failed to read from db', e);
    }
  };

  dbReq.onupgradeneeded = e => {
    topaz.log('storage', 'upgraded db', e);

    db = e.target.result;

    const objectStore = db.createObjectStore('store');

    const store = {};

    topaz.log('storage', 'trying to port local storage -> idb');
    for (const key of Object.keys(localStorage).filter(x => x.startsWith('topaz_'))) {
      console.log(key);
      store[key.slice('topaz_'.length)] = localStorage.getItem(key);
      localStorage.removeItem(key);
    }

    objectStore.add(store, 'store');

    topaz.log('storage', 'inited db', store);

    res(store);
  };
});


const Storage = {
  set: (key, value) => {
    store[key] = value;
    save();
  },

  get: (key, def) => {
    return store[key] ?? def;
  },

  delete: (key) => {
    delete store[key];
    save();
  },

  keys: () => Object.keys(store),

  store
};

// local storage compat
Storage.setItem = Storage.set;
Storage.getItem = Storage.get;
Storage.deleteItem = Storage.delete;

topaz.log('storage', `loaded ${Object.keys(store).length} keys in ${(performance.now() - startTime).toFixed(2)}ms`);

return Storage; // eval export
})(); //# sourceURL=TopazStorage