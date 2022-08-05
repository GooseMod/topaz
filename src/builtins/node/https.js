const request = (...args) => {
  topaz.log('node.https', ...args);

  let opts, cb;
  if (args.length === 2) {
    opts = args[0];
    cb = args[1];
  }

  if (args.length === 3) {
    const url = new URL(args[0]);

    opts = {
      hostname: url.hostname,
      path: url.pathname,
      port: url.protocol === 'https:' ? 443 : 80,
      ...args[1]
    };

    cb = args[2];
  }

  const { method, headers, timeout, hostname, path, port } = opts;

  const url = `${port === 443 ? 'https' : 'http'}://${hostname}${path}`;

  const listeners = {};

  return {
    write: (body) => {},
    end: async () => {
      const req = await fetch(url, {
        method,
        headers
      });

      cb({
        statusCode: req.status,
        headers: req.headers,

        on: (ev, handler) => listeners[ev] = handler
      });

      const data = await req.arrayBuffer();

      listeners.data(data);

      listeners.end();
    },
    on: (ev, handler) => listeners[ev] = handler
  };
};

module.exports = {
  request
};