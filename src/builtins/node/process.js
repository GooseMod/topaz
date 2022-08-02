module.exports = {
  platform: 'linux',
  env: {
    HOME: '/home/topaz'
  },

  hrtime: (toDiff) => {
    const stamp = Math.floor(performance.now());
    const sec = Math.floor(stamp / 1000);
    const nano = (stamp % 1000) * 1000 * 1000;

    if (!toDiff) return [ sec, nano ];

    return [ Math.abs(sec - toDiff[0]), Math.abs(nano - toDiff[1]) ]
  }
};