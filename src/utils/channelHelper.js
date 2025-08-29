const db = require('../db');

/**
 * Determines if a message in the given channel should be logged
 * @param {import('discord.js').Channel} channel - The Discord channel object
 * @returns {Promise<boolean>} - True if the channel should be logged, false otherwise
 */
async function shouldLog(channel) {
    if (!channel?.guildId) {
        return false;
    }

    const guild = await db.Guild.findByPk(channel.guildId);
    
    if (!guild?.loggingChannelId || !guild?.storageChannelId) {
        return false;
    }

    // Don't log if this is the logging or storage channel
    return channel.id !== guild.loggingChannelId && channel.id !== guild.storageChannelId;
}

module.exports = {
    shouldLog
};
