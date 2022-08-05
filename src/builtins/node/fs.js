module.exports = {
  readdirSync: path => [],
  writeFile: (path, data, cb) => {},

  readFileSync: (path, encoding) => {
    const isRepo = __entityID.split('/').length === 2;

    if (isRepo) {
      const url = `https://raw.githubusercontent.com/${__entityID}/HEAD/${path}`;
      console.log('fs read', url);

      /* const request = new XMLHttpRequest();
      request.open('GET', url, false);
      request.send(null);

      if (request.status === 200) {
        console.log(request.responseText);
      } */
    }
  }
};