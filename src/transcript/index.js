const { escape } = require('html-escaper');
const db = require('../db');
const fs = require('fs');
const path = require('path');
const discordTranscripts = require('discord-html-transcripts');

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

    if (!channel.name) return;

    const dbMessages = await db.Message.findAll({
        where: { channelId: channelId },
        include: [
            { model: db.MessageVersion, order: [['createdAt', 'ASC']] },
            db.Reaction
        ],
    });

    const reactions = new Map();
    const attachments = new Map();
    const fakeMessages = dbMessages.map((m) => {
        return {
            id: m.messageId,
            author: {
                id: m.authorId,
                username: m.authorUsername,
                displayName: m.authorUsername,
                displayAvatarURL: (opts) => '', // { size: 64 }
            },
            createdAt: new Date(m.MessageVersions[0].createdAt),
            content: m.MessageVersions[0].content,
            embeds: [],
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

    return await discordTranscripts.generateFromMessages(fakeMessages, fakeChannel, opts);
}

module.exports = generateTranscript;