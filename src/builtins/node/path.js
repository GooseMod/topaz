const resolve = (x) => {
  let ind;
  if (x.startsWith('./')) x = x.substring(2);
  x = x.replaceAll('/./', '/').replaceAll('//', '/'); // example/./test -> example/test

  while ((ind = x.indexOf('../')) !== -1) {
      const priorSlash = x.lastIndexOf('/', ind - 4);
      x = x.slice(0, priorSlash === -1 ? 0 : (priorSlash + 1)) + x.slice(ind + 3); // example/test/../sub -> example/sub
  }

  return x;
};

module.exports = {
  join: (...parts) => resolve(parts.join('/')),
  resolve: (...parts) => resolve(parts.join('/')), // todo: implement resolve properly (root / overwrite)
};