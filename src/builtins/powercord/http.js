class HTTPError extends Error {
  constructor (message, res) {
    super(message);
    Object.assign(this, res);
    this.name = this.constructor.name;
  }
}

class Request {
  constructor(method, url) {
    this.method = method;
    this.url = url;

    this.data = null;
    this.headers = {};
    this.query = {};
  }

  set(key, value) { // set header
    this.headers[key] = value;
    return this;
  }

  query(key, value) { // set query param
    this.query[key] = value;
    return this;
  }

  send(body) { // set post data
    this.body = body;
    return this;
  }

  execute() {
    return new Promise(async (res, _rej) => {
      const rej = err => console.error(err) || _rej(err);

      let url = this.url;

      if (Object.keys(this.query).length > 0) {
        url += '?' + new URLSearchParams(this.query).toString();
      }

      const opts = {
        method: this.method,
        headers: this.headers
      };

      if (this.body) opts.body = this.headers['Content-Type'] === 'application/x-www-form-urlencoded' ? new URLSearchParams(this.body) : JSON.stringify(this.body);

      topaz.log('powercord.http', 'fetch', url, opts);

      const corsDont = [ 'api.spotify.com' ];
      const resp = await fetch((corsDont.some(x => url.includes(x)) ? '' : `https://topaz-cors.goosemod.workers.dev/?`) + url, opts).catch(rej);

      const body = await resp.text().catch(rej);

      topaz.log('powercord.http', 'fetch', resp, body);

      const ret = {
        raw: body,
        body: resp.headers.get('Content-Type').includes('application/json') ? JSON.parse(body) : body,

        ok: resp.status >= 200 && resp.status < 400,
        statusCode: resp.status,
        statusText: resp.statusText,
        headers: Object.fromEntries(resp.headers)
      };

      if (ret.ok) res(ret);
        else rej(Object.assign(new Error(resp.status + ' ' + resp.statusText), ret));
    });
  }

  then(res, rej) {
    if (this._res) return this._res.then(res, rej);

    return this._res = this.execute().then(res, rej);
  }

  catch(rej) {
    return this.then(null, rej);
  }
}

module.exports = [ 'get', 'post', 'put', 'del', 'head' ].reduce((acc, x) => { acc[x] = (url) => new Request(x === 'del' ? 'DELETE' : x.toUpperCase(), url); return acc; }, {});