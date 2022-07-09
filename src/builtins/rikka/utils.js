module.exports = {
  log: (...args) => console.log(...args),

  strings: {
    owoify: {
      owoifyText: x => x.replaceAll('r', 'w').replaceAll('l', 'w').replaceAll('R', 'W').replaceAll('L', 'W')
    }
  }
};