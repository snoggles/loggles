const { escape } = require('html-escaper');
const db = require('../db');
const fs = require('fs');
const path = require('path');
const discordTranscripts = require('discord-html-transcripts');
const { buildAvatarUrl } = require('../utils/avatar');

/**
 * Generates an HTML transcript from messages saved in the database.
 * 
 * discord-html-transcripts expects the discord.js data model as input.
 * 
 * It would be complicated to use the discord.js classes directly since
 * they have caches and accessors that go across the wire.
 * Instead we fake the structure with dumb JS objects.
 * 
 * @param {string} channelId 
 * @param {*} opts see https://github.com/ItzDerock/discord-html-transcripts?tab=readme-ov-file#%EF%B8%8F-configuration
 * @returns 
 */
async function generateTranscript(channelId, opts) {
    const channel = await db.Channel.findOne({
        where: {
            channelId: channelId
        }
    });

    if (!channel) return;

    const dbMessages = await db.Message.findAll({
        where: { channelId: channelId },
        include: [
            { model: db.MessageVersion, order: [['createdAt', 'ASC']] },
            db.Reaction,
            db.User,
        ],
    });

    const reactions = new Map();
    const attachments = new Map();
    const fakeMessages = dbMessages.map((m) => {
        const user = m.User;
        const avatarHash = user?.avatar || null;
        const userId = m.authorId;
        return {
            id: m.messageId,
            author: {
                id: m.authorId,
                username: user?.username || 'Unknown',
                displayName: user?.globalName && user?.username && user?.globalName != user?.username ? `${user.globalName} (${user.username})` : user?.username || user?.globalName || 'Unknown',
                displayAvatarURL: (opts = {}) => buildAvatarUrl(userId, avatarHash, opts),
            },
            createdAt: new Date(m.MessageVersions[0].createdAt),
            content: m.MessageVersions[0].content,
            embeds: Array.isArray(m.MessageVersions[0].embeds) ? m.MessageVersions[0].embeds : [],
            editedAt: null, // TODO
            components: [],
            mentions: {
                everyone: false,
            },
            reactions: {
                cache: reactions,
            },
            attachments: attachments,
        }
    });

    const fakeChannel = {
        isDMBased: () => false,
        isThread: () => false,
        isVoiceBased: () => true, // TODO
        guild: {
            name: channel.name,
            iconURL: (opts) => '', // { size: 128 }
        }
    }

    return {
        messages: dbMessages ?? [],
        transcript: await discordTranscripts.generateFromMessages(fakeMessages, fakeChannel, opts),
    };
}

module.exports = generateTranscript;