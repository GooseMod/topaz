(async () => {
const startTime = performance.now();
const dbReq = indexedDB.open('topaz');

const makeTrans = () => db.transaction([ 'store' ], 'readwrite').objectStore('store');

const debounce = (handler, timeout) => {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => handler(...args), timeout);
  };
};

const save = debounce(() => makeTrans().put(store, 'store').onsuccess = e => topaz.log('storage', 'db saved'), 1000);


let db;
const store = await new Promise(res => {
  dbReq.onerror = e => console.error('topaz failed to open idb db', e);
  dbReq.onsuccess = e => {
    db = e.target.result;

    try {
      makeTrans().get('store').onsuccess = e => {
        res(e.target.result);
      };
    } catch (e) {
      console.error('failed to read from db', e);
    }
  };

  dbReq.onupgradeneeded = e => {
    db = e.target.result;

    const objectStore = db.createObjectStore('store');

    const store = {};

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
Storage.removeItem = Storage.delete;


topaz.log('storage', `loaded ${Object.keys(store).length} keys in ${(performance.now() - startTime).toFixed(2)}ms`);

return Storage; // eval export
})(); //# sourceURL=TopazStorage