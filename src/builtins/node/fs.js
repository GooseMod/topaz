const strToBuf = str => {
  const buf = new ArrayBuffer(str.length);
  const bufView = new Uint8Array(buf);

  for (let i = 0; i < str.length; i++) {
    bufView[i] = str.charCodeAt(i);
  }

  return buf;
};

const syncRequest = (url, useBuffer) => {
  let resp = topaz.internal.fetchCache.get(url);

  if (!resp) {
    const request = new XMLHttpRequest();
    request.open('GET', url, false);
    if (useBuffer) request.overrideMimeType('text\/plain; charset=x-user-defined');
    request.send(null);

    if (request.status !== 200) return;

    resp = request.responseText;
    topaz.internal.fetchCache.set(url, resp);
  }

  return resp;
};

module.exports = {
  readdirSync: path => {
    const isRepo = __entityID.split('/').length === 2;

    topaz.log('fs.readdirSync', path);

    if (isRepo) {
      const url = `https://api.github.com/repos/${__entityID}/contents/${path}`;

      const resp = syncRequest(url, false);

      if (!resp) return [];

      return JSON.parse(resp).map(x => x.name);
    }

    return [];
  },
  writeFile: (path, data, cb) => {},

  readFileSync: (path, encoding) => {
    const isRepo = __entityID.split('/').length === 2;

    topaz.log('fs.readFileSync', path, encoding);

    if (isRepo) {
      const url = `https://raw.githubusercontent.com/${__entityID}/HEAD/${path}`;
      const useBuffer = encoding == null;

      const resp = syncRequest(url, useBuffer);

      if (useBuffer) {
        const buffer = strToBuf(resp);

        buffer.toString = function() { return new TextDecoder().decode(this); };
        buffer.buffer = buffer;

        return buffer;
      } else return resp;
    }
  },

  promises: {
    readFile: async (path, encoding) => {
      topaz.log('fs.promises.readFile', path, encoding);

      const isRepo = __entityID.split('/').length === 2;

      if (isRepo) {
        const url = `https://raw.githubusercontent.com/${__entityID}/HEAD/${path}`;

        return await (await fetch(url)).text();
      }
    }
  }
};