/**
 * Callbacks that don't depend on a real Client.
 */
const dummyCallbacks = {
    resolveChannel: (channelId) => channelId == fakeChannel.id ? fakeChannel : null,
    resolveUser: (userId) => null, // template will use `<@${userId}>` which is good enough for now
    resolveRole: (roleId) => null, // handles null the same as user.
};

/**
 * @param {*} channel real discord.js channel backed by a non-fake Client.
 * @returns callbacks for use in discord-html-generator
 */
function channelCallbacks(channel) {
    return {
        resolveChannel: async (id) => channel.client.channels.fetch(id).catch(() => null),
        resolveUser: async (id) => channel.client.users.fetch(id).catch(() => null),
        resolveRole: channel.isDMBased() ? () => null : async (id) => channel.guild?.roles.fetch(id).catch(() => null),
    }
}

module.exports = { dummyCallbacks, channelCallbacks }
