const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
const { getOwnerInstance } = goosemod.reactUtils;

const { FluxDispatcher, constants: { Routes } } = goosemod.webpackModules.common;


module.exports = {
  sleep,

  waitFor: async (query) => {
    while (true) {
      const el = document.querySelector(query);
      if (el) return el;

      await sleep(5);
    }
  },

  forceUpdateElement: (query, all = false) => {
    for (const x of (all ? document.querySelectorAll(query) : [ document.querySelector(query) ])) {
      if (!x) continue;
      getOwnerInstance(x)?.forceUpdate?.();
    }
  },

  gotoOrJoinServer: async (inviteCode, channelId) => {
    const invite = goosemod.webpackModules.findByProps('getInvite').getInvite(inviteCode) ?? (await goosemod.webpackModules.findByProps('resolveInvite').resolveInvite(inviteCode)).invite;

    if (goosemod.webpackModules.findByProps('getGuilds').getGuilds()[invite.guild.id]) goosemod.webpackModules.findByProps('transitionTo').transitionTo(Routes.CHANNEL(invite.guild.id, channelId ? channelId : goosemod.webpackModules.findByProps('getLastSelectedChannelId').getChannelId(invite.guild.id)));
      else FluxDispatcher.dispatch({
      type: 'INVITE_MODAL_OPEN',
      context: 'APP',
      invite,
      code
    });
  },

  injectContextMenu: (injectionId, displayName, patch, before = false) => { // todo: implement

  },

  ...goosemod.reactUtils // Export GooseMod React utils
};