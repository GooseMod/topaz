// WIP / unused
const { writeFileSync } = require('fs');
const { join } = require('path');

const [ GITHUB_TOKEN, DISCORD_TOKEN ] = process.argv.slice(2);

const pc = {
  plugins: [
    'romdotdog/wpm',
    'AnthonyFuller/custom-timestamps', // 'TaiAurori/custom-timestamps',
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
    'discord-modifications/show-hidden-channels',
    'FifiTheBulldog/token',
    'CanadaHonk/message-translate|cyyynthia/message-translate', // fork as waiting for PR to merge
    'katlyn/pronoundb-powercord|cyyynthia/pronoundb-powercord', // fork as waiting for PR to merge
    'PandaDriver156/Custom-Volume-Range',
    'NurMarvin/guild-profile',
    'GriefMoDz/better-status-indicators',
    '12944qwerty/no-admin-abuse',
    'BenSegal855/powerclock',
    'jaimeadf/who-reacted',
    'BluSpring/Spotify-No-Pause',
    'Rodentman87/stonks',
    'BenSegal855/webhook-tag',
    'BenSegal855/powerclock',
    'yatsukiko/dm-typing-indicator|zt64/dm-typing-indicator',
    'NurMarvin/SnowflakeInfo',
    'FC5570/powercord-random-dadjoke',
    'SomeAspy/NekosCord',
    'yoon4027/pc-friend-link',
    '12944qwerty/profile-stats',
    'DavidNyan10/UnicodeFractions',
    'asportnoy/CanaryLinks',
    'PikaDude/show-customid',
    'Captain8771/raw',
    'SammCheese/AFK-on-exit',
    'SammCheese/Do-Not-Slowmode-Me',
    'Juby210/game-activity-toggle',
    'discord-modifications/force-owner-crown',
    'discord-modifications/quick-delete',
    'discord-modifications/screenshare-crack',
    'discord-modifications/hide-dm-buttons',
    'discord-modifications/no-friend-badges',
    'discord-modifications/picture-link',
    'discord-modifications/double-click-vc',
    'asportnoy/powercord-role-dividers',
    'cyyynthia/total-members',
    '12944qwerty/badges-everywhere|powercord-community/badges-everywhere',
    'E-boi/Powercord-BlurNSFW',
    'Juby210/view-raw',
    'ShadiestGoat/Powercord-googleit-plugin',
    'powercord-community/cutecord',
    'notKnei/quickChatReply',
    'Juby210/better-folders',
    'Vap0r1ze/vpc-shiki',
    '12944qwerty/profile-stats',
    'pythonmcpi/simple-eval',
    'Luna-devv/rp.replace-discord-link',
  ],

  themes: [
    'leeprky/MaterialYouTheme',
    'eternal404/dark-discord',
    'DiscordStyles/Slate@deploy',
    'DiscordStyles/HorizontalServerList',
    'DiscordStyles/RadialStatus@deploy',
    'Lavender-Discord/Lavender',
    'CapnKitten/Material-Discord',
    'catppuccin/discord',
    'LuckFire/amoled-cord',
    'discord-extensions/essence',
    'slowstab/dracula',
    'NatesWorld-Projects/Native',
    'SlippingGitty/surCord',
    'kawaiizenbo/OptimalTheme',
    'qube-03/minimaless',
    'DiscordStyles/Fluent',
    'CreArts-Community/Mention-Links',
    'Slddev/SpotiCord',
    'stickfab/pc-fluenticons',
    'Captain8771-themes/oneshot-bg',
    'DavidNyan10/GoogleMaterialIcons',
    'discord-extensions/bubble-bar',
    'orblazer/discord-nordic',
    'CreArts-Community/Settings-Icons',
    'solonovamax/ServerColumns-PowercordFix',
    'DiscordStyles/SoftX@deploy',
    'PhoenixColors/phoenix-discord',
    'CreArts-Community/Friends-Grid',
    'Dedsd/DarkBlue-Ice-for-customdiscord',
    'CreArts-Community/Context-Icons',
    'CreArts-Community/CreArts-Discord',
    'ClearVision/ClearVision-v6',
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
    'https://github.com/Farcrada/DiscordPlugins/blob/master/Double-click-to-edit/DoubleClickToEdit.plugin.js',
    'https://github.com/Strencher/BetterDiscordStuff/blob/master/PlatformIndicators/APlatformIndicators.plugin.js',
    'https://github.com/Neodymium7/BetterDiscordStuff/blob/main/VoiceActivity/VoiceActivity.plugin.js',
    // 'https://raw.githubusercontent.com/NomadNaomie/BD-Tone-Indicators/main/ToneIndicator.plugin.js',
    'https://github.com/Farcrada/DiscordPlugins/blob/master/Double-click-to-edit/DoubleClickToEdit.plugin.js',
    'https://github.com/QbDesu/BetterDiscordAddons/blob/potato/Plugins/RemoveChatButtons/RemoveChatButtons.plugin.js',
  ],

  themes: [
    'https://github.com/CelestialReaver/BetterDiscord/blob/main/themes/Synthwave84/Synthwave84.theme.css',
    'https://github.com/codedotspectra/themes/blob/master/themes-files/neutron.theme.css',
    'https://github.com/codedotspectra/themes/blob/master/themes-files/nocturnal.theme.css',
    'https://github.com/przemec/Novum/blob/master/Novum.theme.css',
    'https://github.com/TakosThings/Fluent-Discord/blob/gh-pages/Fluent-Discord.theme.css',
    'https://github.com/Comfy-Themes/Discord/blob/master/betterdiscord/comfy.theme.css',
  ]
};

const gm = {
  plugins: [
    'GooseMod-Modules/IDInAuthor',
    'GooseMod-Modules/CopyAvatarURL',
    'GooseMod-Modules/StatusInAuthor',
    'GooseMod-Modules/UsernameInAuthor',
    'GooseMod-Modules/User-Backgrounds',
    'https://github.com/GooseMod/MS2Porter/tree/main/modules/devMode',
    'https://github.com/GooseMod/MS2Porter/tree/main/modules/discordDebug',
  ]
};

const vel = {
  plugins: [
    'https://github.com/TheCommieAxolotl/Velocity-Plugins/tree/main/BetterSyntax',
    'https://github.com/TheCommieAxolotl/Velocity-Plugins/tree/main/NoCanaryLinks',
    'https://github.com/TheCommieAxolotl/Velocity-Plugins/tree/main/NoReplyMention',
  ]
};

const un = {
  plugins: [
    'https://github.com/unbound-addons/disable-sticker-suggestions/tree/rewrite',
    'https://github.com/unbound-addons/picture-link/tree/rewrite',
    'https://github.com/unbound-addons/hide-dm-buttons/tree/rewrite',
    'https://github.com/unbound-addons/no-bandwidth-kick/tree/rewrite',
  ]
};

const ast = {
  plugins: [
    'AlyPlugs/DevMode',
    'toastythetoaster/DiscordExperiments',
    'SpoonMcForky/SilentBlock',
    'toastythetoaster/NoTypingIndicator',
    'toastythetoaster/SpotifyAntiPause',
    'SpoonMcForky/replace-timestamps',
  ]
};

const dr = {
  plugins: [
    'https://github.com/doggybootsy/Dr-Plugins/blob/main/developerMode/developerMode.plugin.js'
  ]
};

const cc = {
  plugins: [
    'https://github.com/yellowsink/cc-plugins/tree/master/plugins/svg-embeds',
    'https://cumcordplugins.github.io/Condom/yellowsink.github.io/c7-cc-plugs/Greentext',
    'https://cumcordplugins.github.io/Condom/yellowsink.github.io/c7-cc-plugs/MessageLogger',
    'https://cumcordplugins.github.io/Condom/yellowsink.github.io/c7-cc-plugs/MessageLinkPreview/',
    'https://cumcordplugins.github.io/Condom/yellowsink.github.io/c7-cc-plugs/ChannelTypingIndicator/',
    'https://cumcordplugins.github.io/Condom/yellowsink.github.io/c7-cc-plugs/RoleColoredMessages/',
    'https://cumcordplugins.github.io/Condom/yellowsink.github.io/c7-cc-plugs/TimeBarAllActivities/',
    'https://github.com/Cr3atable/CumcordPlugins/tree/master/open-in-app',
    'https://cumcordplugins.github.io/Condom/cc.nova-vps.ml/hide-message/',
    'https://cumcordplugins.github.io/Condom/cc.nova-vps.ml/devmode/',
    'https://cumcordplugins.github.io/Condom/cc.nova-vps.ml/hideblockedmessages/',
    'https://cumcordplugins.github.io/Condom/cumcord.ruthenic.com/noReplyMention/',
    'https://cumcordplugins.github.io/Condom/cumcord.xirreal.dev/hiddenChannels/',
    'https://cumcordplugins.github.io/Condom/yellowsink.github.io/cc-plugins/who-reacted/',
    'https://cumcordplugins.github.io/Condom/yellowsink.github.io/cc-plugins/usrbg/',
    'https://cumcordplugins.github.io/Condom/yellowsink.github.io/cc-plugins/show-username/',
    'https://cumcordplugins.github.io/Condom/yellowsink.github.io/cc-plugins/channel-activity/',
    'https://github.com/E-boi/cumcord-plugins/tree/master/UserVolumeBooster',
    'https://github.com/E-boi/cumcord-plugins/tree/master/linkchannels',
    'https://github.com/7ih/ReallyBadPasscodeLockPlugin/tree/master',
    'https://github.com/E-boi/cumcord-plugins/tree/master/userdetails',
    // 'https://github.com/E-boi/cumcord-plugins/blob/master/showconnections,
    'https://github.com/E-boi/cumcord-plugins/tree/master/betterfriendslist',
    // 'https://github.com/E-boi/cumcord-plugins/tree/master/blurnsfw',
  ]
};

const rk = {
  plugins: [
    'CanadaHonk/owocord@update|V3L0C1T13S/owocord', // fork as waiting for PR to merge
  ]
};

const vz = {
  plugins: [
    'Pukimaa/vizality-together'
  ]
};

const em = {
  plugins: [
    'https://github.com/discord-modifications/enmity-addons/tree/main/Plugins/SplitMessages',
    'https://github.com/FifiTheBulldog/enmity-plugins/tree/master/NoReplyMention',
  ]
};

const dc = {
  plugins: [
    'https://git.ruthenic.com/ruthenic/demoncord-noReplyMention/raw/branch/master/src/index.js',
    'https://git.ruthenic.com/ruthenic/demoncord-GrammarNazi/raw/branch/master/src/index.js',
  ]
};

const ac = {
  plugins: [
    // 'https://github.com/lexisother/Aliucord-RN-Plugins/tree/master/NoReplyMention',
    'https://github.com/c10udburst-discord/Aliucord-RightNow-Plugins/tree/master/SilentTyping',
    'https://github.com/c10udburst-discord/Aliucord-RightNow-Plugins/tree/master/EmbedMessageLinks',
    'https://github.com/c10udburst-discord/Aliucord-RightNow-Plugins/tree/master/MessageLogger',
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
      'Authorization': `Bot ${DISCORD_TOKEN}`
    }
  })).json();
};

const githubCache = {};

const getGithubInfo = async (repo) => {
  if (githubCache[repo]) return githubCache[repo];

  const info = await (await fetch(`https://api.github.com/repos/${repo}`, {
    headers: {
      'Authorization': `token ${GITHUB_TOKEN}`
    }
  })).json();

  if (info.stargazers_count === undefined) console.log('GH', repo, info);

  return githubCache[repo] = info;
};

const getManifest_pc = async (place, theme) => { // just repo or url
  const manifestName = theme ? 'powercord_manifest.json' : 'manifest.json';

  console.log(place);

  const [ repo, branch ] = place.split('@');

  let manifestUrl = repo + '/' + manifestName;
  if (!place.startsWith('http')) manifestUrl = `https://raw.githubusercontent.com/${repo}/${branch ?? 'HEAD'}/${manifestName}`;

  return await (await fetch(manifestUrl.replace('github.com', 'raw.githubusercontent.com').replace('blob/', '').replace('tree/', ''))).json();
};

const getManifest_gm = async (place, theme) => { // just repo or url
  const manifestName = 'goosemodModule.json';

  console.log(place);

  let manifestUrl = place + '/' + manifestName;
  if (!place.startsWith('http')) manifestUrl = `https://raw.githubusercontent.com/${place}/HEAD/${manifestName}`;

  const manifest = await (await fetch(manifestUrl.replace('github.com', 'raw.githubusercontent.com').replace('blob/', '').replace('tree/', ''))).json();

  if (typeof manifest.authors === 'string') manifest.authors = [ manifest.authors.split(' (')[0] ];
  manifest.author = (await Promise.all(manifest.authors.map(async x => x.length === 18 ? (await getDiscordUser(x)).username : x))).join(', ');

  return manifest;
};

const getManifest_bd = async (place, theme) => { // .plugin.js url
  const code = await (await fetch(place.replace('github.com', 'raw.githubusercontent.com').replace('blob/', ''))).text();

  console.log(place);

  const manifest = [...code.matchAll(/^ *\* @([^ ]*) (.*)/gm)].reduce((a, x) => { a[x[1]] = x[2]; return a; }, {});

  if (!manifest.name) manifest.name = code.match(/info: *\{[\s\S]*?name: *['"](.*?)['"],/)?.[1];
  if (!manifest.description) manifest.description = code.match(/info: *\{[\s\S]*?description: *['"](.*?)['"],/)?.[1];
  if (!manifest.version) manifest.version = code.match(/info: *\{[\s\S]*?version: *['"](.*?)['"],/)?.[1];
  if (!manifest.author) manifest.author = code.match(/authors: *\[[\s\S]*?name: *['"](.*?)['"],/)?.[1];

  return manifest;
};

const getManifest_vel = async (place) => {
  console.log(place);
  return await (await fetch((place + '/velocity_manifest.json').replace('github.com', 'raw.githubusercontent.com').replace('blob/', '').replace('tree/', ''))).json();
};

const getManifest_un = async (place) => {
  const manifestName = 'manifest.json';

  console.log(place);

  const [ repo, branch ] = place.split('@');

  let manifestUrl = repo + '/' + manifestName;
  if (!place.startsWith('http')) manifestUrl = `https://raw.githubusercontent.com/${repo}/${branch ?? 'HEAD'}/${manifestName}`;

  const manifest = await (await fetch(manifestUrl.replace('github.com', 'raw.githubusercontent.com').replace('blob/', '').replace('tree/', ''))).json();

  manifest.author = manifest.authors.map(x => x.name).join(', ');

  return manifest;
};

const getManifest_ast = async (place) => {
  const manifestName = 'manifest.json';

  console.log(place);

  const [ repo, branch ] = place.split('@');

  let manifestUrl = repo + '/' + manifestName;
  if (!place.startsWith('http')) manifestUrl = `https://raw.githubusercontent.com/${repo}/${branch ?? 'HEAD'}/${manifestName}`;

  const manifest = await (await fetch(manifestUrl.replace('github.com', 'raw.githubusercontent.com').replace('blob/', '').replace('tree/', ''))).json();

  if (typeof manifest.author === 'object') manifest.author = manifest.author.name;

  return manifest;
};

const getManifest_dr = async (place, theme) => { // .plugin.js url
  const code = await (await fetch(place.replace('github.com', 'raw.githubusercontent.com').replace('blob/', ''))).text();

  console.log(place);

  return [...code.matchAll(/^ \* @([^ ]*) (.*)/gm)].reduce((a, x) => { a[x[1]] = x[2]; return a; }, {});
};

const getManifest_cc = async (place, theme) => { // just repo or url
  const manifestName = place.includes('/Condom/') ? 'plugin.json' : 'cumcord_manifest.json';

  console.log(place);

  const [ repo, branch ] = place.split('@');

  let manifestUrl = repo + (repo.endsWith('/') ? '' : '/') + manifestName;
  if (!place.startsWith('http')) manifestUrl = `https://raw.githubusercontent.com/${repo}/${branch ?? 'HEAD'}/${manifestName}`;

  return await (await fetch(manifestUrl.replace('github.com', 'raw.githubusercontent.com').replace('blob/', '').replace('tree/', ''))).json();
};

const getManifest_rk = async (place, theme) => { // just repo or url
  const manifestName = 'manifest.json';

  console.log(place);

  const [ repo, branch ] = place.split('@');

  let manifestUrl = repo + '/' + manifestName;
  if (!place.startsWith('http')) manifestUrl = `https://raw.githubusercontent.com/${repo}/${branch ?? 'HEAD'}/${manifestName}`;

  const manifest = await (await fetch(manifestUrl.replace('github.com', 'raw.githubusercontent.com').replace('blob/', '').replace('tree/', ''))).json();

  if (typeof manifest.author === 'object') manifest.author = manifest.author.name;

  return manifest;
};

const getManifest_vz = async (place, theme) => { // just repo or url
  const manifestName = 'manifest.json';

  console.log(place);

  const [ repo, branch ] = place.split('@');

  let manifestUrl = repo + '/' + manifestName;
  if (!place.startsWith('http')) manifestUrl = `https://raw.githubusercontent.com/${repo}/${branch ?? 'HEAD'}/${manifestName}`;

  const manifest = await (await fetch(manifestUrl.replace('github.com', 'raw.githubusercontent.com').replace('blob/', '').replace('tree/', ''))).json();

  if (typeof manifest.author === 'object') manifest.author = manifest.author.name;

  return manifest;
};

const getManifest_em = async (place) => {
  const manifestName = 'manifest.json';

  console.log(place);

  const [ repo, branch ] = place.split('@');

  let manifestUrl = repo + '/' + manifestName;
  if (!place.startsWith('http')) manifestUrl = `https://raw.githubusercontent.com/${repo}/${branch ?? 'HEAD'}/${manifestName}`;

  const manifest = await (await fetch(manifestUrl.replace('github.com', 'raw.githubusercontent.com').replace('blob/', '').replace('tree/', ''))).json();

  manifest.author = manifest.authors.map(x => x.name).join(', ');

  return manifest;
};

const getManifest_dc = async (place) => {
  const indexCode = await (await fetch(place)).text();

  return indexCode.match(/meta: {([\s\S]*?)}/)[1].split('\n').slice(1, -1)
  .reduce((acc, x) => {
    let [ key, val ] = x.split(':');

    key = key.trim();
    val = val.trim();

    if (val.endsWith(',')) val = val.slice(0, -1);
    if (val.startsWith('\'') || val.startsWith('"')) val = val.slice(1, -1);

    if (key === 'desc') key = 'description';

    acc[key] = val;

    return acc;
  }, {});
};

const getManifest_ac = async (place) => {
  const manifestName = 'manifest.json';

  console.log(place);

  const [ repo, branch ] = place.split('@');

  let manifestUrl = repo + '/' + manifestName;
  if (!place.startsWith('http')) manifestUrl = `https://raw.githubusercontent.com/${repo}/${branch ?? 'HEAD'}/${manifestName}`;

  const manifest = await (await fetch(manifestUrl.replace('github.com', 'raw.githubusercontent.com').replace('blob/', '').replace('tree/', ''))).json();

  const code = await (await fetch(manifestUrl.replace('github.com', 'raw.githubusercontent.com').replace('blob/', '').replace('tree/', '').replace(manifestName, 'index.ts'))).text();

  manifest.name = code.match(/default class (.*?) extends/)[1];
  manifest.author = repo.split('/')[3];

  return manifest;
};

(async () => {
  let plugins = [];
  let themes = [];

  const makeId = (mod, manifest) => `${mod}%${manifest.name}%${manifest.author}%${manifest.description}`;

  for (const place of pc.plugins) {
    plugins.push(getManifest_pc(place.split('|')[0], false).then(manifest => {
      return [makeId('PC', manifest), place];
    }));
  }

  for (const place of pc.themes) {
    themes.push(getManifest_pc(place.split('|')[0], true).then(manifest => {
      return [makeId('PC', manifest), place];
    }));
  }

  for (const place of bd.plugins) {
    plugins.push(getManifest_bd(place.split('|')[0], false).then(manifest => {
      return [makeId('BD', manifest), place];
    }));
  }

  for (const place of bd.themes) {
    themes.push(getManifest_bd(place.split('|')[0], false).then(manifest => {
      return [makeId('BD', manifest), place];
    }));
  }

  for (const place of gm.plugins) {
    plugins.push(getManifest_gm(place.split('|')[0], false).then(manifest => {
      return [makeId('GM', manifest), place];
    }));
  }

  for (const place of vel.plugins) {
    plugins.push(getManifest_vel(place.split('|')[0], false).then(manifest => {
      return [makeId('VEL', manifest), place];
    }));
  }

  for (const place of un.plugins) {
    plugins.push(getManifest_un(place.split('|')[0], false).then(manifest => {
      return [makeId('UN', manifest), place];
    }));
  }

  for (const place of ast.plugins) {
    plugins.push(getManifest_ast(place.split('|')[0], false).then(manifest => {
      return [makeId('AST', manifest), place];
    }));
  }

  for (const place of dr.plugins) {
    plugins.push(getManifest_dr(place.split('|')[0], false).then(manifest => {
      return [makeId('DR', manifest), place];
    }));
  }

  for (const place of cc.plugins) {
    plugins.push(getManifest_cc(place.split('|')[0], false).then(manifest => {
      return [makeId('CC', manifest), place];
    }));
  }

  for (const place of rk.plugins) {
    plugins.push(getManifest_rk(place.split('|')[0], false).then(manifest => {
      return [makeId('RK', manifest), place];
    }));
  }

  for (const place of vz.plugins) {
    plugins.push(getManifest_vz(place.split('|')[0], false).then(manifest => {
      return [makeId('VZ', manifest), place];
    }));
  }

  for (const place of em.plugins) {
    plugins.push(getManifest_em(place.split('|')[0], false).then(manifest => {
      return [makeId('EM', manifest), place];
    }));
  }

  for (const place of dc.plugins) {
    plugins.push(getManifest_dc(place.split('|')[0], false).then(manifest => {
      return [makeId('DC', manifest), place];
    }));
  }

  for (const place of ac.plugins) {
    plugins.push(getManifest_ac(place.split('|')[0], false).then(manifest => {
      return [makeId('AC', manifest), place];
    }));
  }

  plugins = await Promise.all(plugins);
  themes = await Promise.all(themes);

  const sortThings = async (things) => (await Promise.all(things.map(async x => [ x[0], x[1], await getGithubInfo(x[1].split('|')[1] ?? (x[1].includes('http') ? x[1].split('/').slice(3, 5).join('/') : x[1].split('@')[0]))]))).sort((a, b) =>
    b[2].stargazers_count - a[2].stargazers_count
  ).map(x => [ x[0], x[1].split('|')[0] ]);

  plugins = await sortThings(plugins);
  themes = await sortThings(themes);

  let out = {
    plugins: (await Promise.all(plugins)).reduce((acc, [ k, v ]) => { acc[k] = v; return acc; }, {}),
    themes: (await Promise.all(themes)).reduce((acc, [ k, v ]) => { acc[k] = v; return acc; }, {})
  };

  const mods = [];
  out.stats = {
    mods: Object.keys(out.plugins).reduce((acc, x) => {
      const mod = x.split('%')[0];
      if (mods.includes(mod)) return acc;
      mods.push(mod);

      return acc + 1;
    }, 0),

    plugins: plugins.length,
    themes: themes.length
  };

  console.log(out);

  writeFileSync('popular.json', JSON.stringify(out));
})();