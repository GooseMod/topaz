// WIP / unused
const { writeFileSync } = require('fs');
const { join } = require('path');

const pc = {
  plugins: [
    'romdotdog/wpm',
    'TaiAurori/custom-timestamps',
    'RazerMoon/vcTimer',
    '12944qwerty/Slowmode-Counter',
    // 'skullyplugs/collapsible-ui',
    'E-boi/ShowConnections',
    '12944qwerty/betterInvites',
    '12944qwerty/copy-server-icon',
    '12944qwerty/showAllMessageButtons',
    'yuwui/powercord-greentext',
    'Puyodead1/powercord-stafftags',
    'VenPlugs/Unindent',
    'SpoonMcForky/replace-timestamps-pc',
    'powercord-community/channel-typing',
    '12944qwerty/click-mentions',
    'Juby210/user-details',
    'asportnoy/powercord-tone-indicators',
    'https://github.com/powercord-org/powercord/blob/HEAD/src/Powercord/plugins/pc-codeblocks',
    'https://github.com/powercord-org/powercord/blob/HEAD/src/Powercord/plugins/pc-clickableEdits',
  ],

  themes: [
    'leeprky/MaterialYouTheme',
    'eternal404/dark-discord',
    'NYRI4/Comfy',
    'DiscordStyles/Slate',
    'DiscordStyles/HorizontalServerList',
    'DiscordStyles/RadialStatus',
  ]
};

const bd = {
  plugins: [
    'https://github.com/dylan-dang/BetterDiscordPlugins/blob/main/PreviewMessageLinks.plugin.js',
    'https://github.com/bepvte/bd-addons/blob/main/plugins/NoSpotifyPause.plugin.js',
    'https://github.com/ordinall/BetterDiscord-Stuff/blob/master/Plugins/SpotifyListenAlong/SpotifyListenAlong.plugin.js',
    'https://github.com/discord-modifications/better-discord-plugins/blob/master/SpotifyCrack/SpotifyCrack.plugin.js', // alt for above
    'https://github.com/BetterDiscordPlugins/DiscordFreeEmojis/blob/master/DiscordFreeEmojis64px.plugin.js',
    // 'https://github.com/BetterDiscordPlugins/DiscordFreeEmojis/blob/master/DiscordFreeEmojisSplit48px.plugin.js',
    'https://github.com/Zerthox/BetterDiscord-Plugins/blob/master/dist/bd/BetterVolume.plugin.js',
    'https://github.com/Zerthox/BetterDiscord-Plugins/blob/master/dist/bd/BetterFolders.plugin.js',
    'https://github.com/Zerthox/BetterDiscord-Plugins/blob/master/dist/bd/OnlineFriendCount.plugin.js',
    'https://github.com/Zerthox/BetterDiscord-Plugins/blob/master/dist/bd/VoiceEvents.plugin.js',
    'https://github.com/Strencher/BetterDiscordStuff/blob/master/UserDetails/UserDetails.plugin.js',
    'https://github.com/Strencher/BetterDiscordStuff/blob/master/InvisibleTyping/InvisibleTyping.plugin.js',
    'https://github.com/Puv1s/ColorTooltips/blob/main/ColorTooltips.plugin.js',
  ]
};

const gm = {
  plugins: [
    'GooseMod-Modules/IDInAuthor',
    'GooseMod-Modules/CopyAvatarURL',
    'GooseMod-Modules/StatusInAuthor',
    'GooseMod-Modules/UsernameInAuthor',
    'GooseMod-Modules/User-Backgrounds',
  ]
};

let lastRequest = 0;
const userCache = {};

const getDiscordUser = async (id) => {
  if (userCache[id]) return userCache[id];

  while (performance.now() - 500 < lastRequest) { // Has been less than 500ms since last request
    await new Promise((res) => setTimeout(res, 100));
  }

  lastRequest = performance.now();

  return userCache[id] = await (await fetch(`https://discord.com/api/v9/users/${id}`, {
    headers: {
      'Authorization': `Bot ${process.env.TOPAZ_DISCORD}`
    }
  })).json();
};

const githubCache = {};

const getGithubInfo = async (repo) => {
  if (githubCache[repo]) return githubCache[repo];

  const info = await (await fetch(`https://api.github.com/repos/${repo}`, {
    headers: {
      'Authorization': `token ${process.env.TOPAZ_GITHUB}`
    }
  })).json();
  
  if (info.stargazers_count === undefined) console.log('GH', info);

  return githubCache[repo] = info;
};

const getManifest_pc = async (place, theme) => { // just repo or url
  const manifestName = theme ? 'powercord_manifest.json' : 'manifest.json';

  console.log(place);

  let manifestUrl = place + '/' + manifestName;
  if (!place.startsWith('http')) manifestUrl = `https://raw.githubusercontent.com/${place}/HEAD/${manifestName}`;

  return await (await fetch(manifestUrl.replace('github.com', 'raw.githubusercontent.com').replace('blob/', '').replace('tree/', ''))).json();
};

const getManifest_gm = async (place, theme) => { // just repo or url
  const manifestName = 'goosemodModule.json';

  console.log(place);

  let manifestUrl = place + '/' + manifestName;
  if (!place.startsWith('http')) manifestUrl = `https://raw.githubusercontent.com/${place}/HEAD/${manifestName}`;

  const manifest = await (await fetch(manifestUrl.replace('github.com', 'raw.githubusercontent.com').replace('blob/', '').replace('tree/', ''))).json();

  manifest.author = (await Promise.all(manifest.authors.map(async x => x.length === 18 ? (await getDiscordUser(x)).username : x))).join(', ');

  return manifest;
};

const getManifest_bd = async (place, theme) => { // .plugin.js url
  const code = await (await fetch(place.replace('github.com', 'raw.githubusercontent.com').replace('blob/', ''))).text();

  console.log(place);

  return [...code.matchAll(/^ \* @([^ ]*) (.*)/gm)].reduce((a, x) => { a[x[1]] = x[2]; return a; }, {});
};


(async () => {
  let plugins = [];
  let themes = [];

  const makeId = (mod, manifest) => `${mod}%${manifest.name}%${manifest.author}%${manifest.description}`;

  for (const place of pc.plugins) {
    plugins.push(getManifest_pc(place, false).then(manifest => {
      return [makeId('PC', manifest), place];
    }));
  }

  for (const place of pc.themes) {
    themes.push(getManifest_pc(place, true).then(manifest => {
      return [makeId('PC', manifest), place];
    }));
  }

  for (const place of bd.plugins) {
    plugins.push(getManifest_bd(place, false).then(manifest => {
      return [makeId('BD', manifest), place];
    }));
  }

  for (const place of gm.plugins) {
    plugins.push(getManifest_gm(place, false).then(manifest => {
      return [makeId('GM', manifest), place];
    }));
  }

  plugins = await Promise.all(plugins);
  themes = await Promise.all(themes);

  const sortThings = async (things) => (await Promise.all(things.map(async x => [ x[0], x[1], await getGithubInfo(x[1].includes('http') ? x[1].split('/').slice(3, 5).join('/') : x[1])]))).sort((a, b) =>
    b[2].stargazers_count - a[2].stargazers_count
  ).map(x => [ x[0], x[1] ]);

  plugins = await sortThings(plugins);
  themes = await sortThings(themes);

  let out = {
    plugins: (await Promise.all(plugins)).reduce((acc, [ k, v ]) => { acc[k] = v; return acc; }, {}),
    themes: (await Promise.all(themes)).reduce((acc, [ k, v ]) => { acc[k] = v; return acc; }, {})
  };
  
  console.log(out);

  writeFileSync('recommended.json', JSON.stringify(out));
})();