const resolve = (x) => {
  let ind;
  x = x.replaceAll('./', '/').replaceAll('//', ''); // example/./test -> example/test

  while (ind = x.indexOf('../') !== -1) x = x.slice(0, ind) + x.slice(ind + 3); // example/test/../sub -> example/sub

  return x;
};

module.exports = {
  join: (...parts) => resolve(parts.join('/')),
  resolve
};