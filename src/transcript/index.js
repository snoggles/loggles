const { escape } = require('html-escaper');
const db = require('../db');
const fs = require('fs');
const path = require('path');
const discordTranscripts = require('discord-html-transcripts');
const { buildAvatarUrl } = require('../utils/avatar');
const { Collection, ChannelManager } = require('discord.js');
const { createFakeGuild } = require('./fakes');
const { dummyCallbacks } = require('./callbacks');

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
        },
        include: [db.Guild]
    });

    if (!channel) return;

    // Get guild data for the transcript
    const guildData = channel.Guild;
    if (!guildData) {
        console.warn(`No guild data found for channel ${channelId}`);
        return;
    }

    const dbMessages = await db.Message.findAll({
        where: { channelId: channelId },
        include: [
            { 
                model: db.MessageVersion, 
                order: [['createdAt', 'ASC']],
                include: [
                    {
                        model: db.Attachment,
                        through: { attributes: [] }, // Don't include join table attributes
                        as: 'Attachments'
                    }
                ]
            },
            db.Reaction,
            db.User,
        ],
    });

    const reactions = new Map();
    const fakeMessages = [];

    for (const m of dbMessages) {
        const user = m.User;
        const avatarHash = user?.avatar || null;
        const userId = m.authorId;
        


        // Create a message for each version
        for (let index = 0; index < m.MessageVersions.length; index++) {
            const version = m.MessageVersions[index];
            const isEdit = index > 0;
            const messageId = isEdit ? `${m.messageId}-v${index + 1}` : m.messageId;
            
            // Get attachments from this specific message version
            const attachments = new Collection();
            
            if (version.Attachments && version.Attachments.length > 0) {
                version.Attachments.forEach((att) => {
                    attachments.set(att.id, {
                        id: att.id,
                        name: att.filename,
                        url: att.storageUrl,
                        size: att.size,
                        contentType: att.contentType,
                        width: att.width || null,
                        height: att.height || null,
                    });
                });
            }

            // Add version prefix for edited messages
            const content = isEdit ? `version ${index + 1}: ${version.content}` : version.content;

            fakeMessages.push({
                id: messageId,
                author: {
                    id: m.authorId,
                    username: user?.username || 'Unknown',
                    displayName: user?.globalName && user?.username && user?.globalName != user?.username ? `${user.globalName} (${user.username})` : user?.username || user?.globalName || 'Unknown',
                    displayAvatarURL: (opts = {}) => buildAvatarUrl(userId, avatarHash, opts),
                },
                createdAt: new Date(version.createdAt),
                content: content,
                embeds: Array.isArray(version.embeds) ? version.embeds : [],
                editedAt: isEdit ? new Date(version.createdAt) : null,
                components: [],
                mentions: {
                    everyone: false,
                },
                reactions: {
                    cache: reactions,
                },
                attachments: attachments,
            });
        }
    }

    const fakeChannel = {
        name: channel.name,
        isDMBased: () => false,
        isThread: () => false,
        isVoiceBased: () => true, // TODO
        guild: createFakeGuild(guildData)
    }

    return {
        messages: dbMessages ?? [],
        transcript: await discordTranscripts.generateFromMessages(fakeMessages, fakeChannel,
            {
                callbacks: dummyCallbacks,
                ...opts
            }
        ),
    };
}

module.exports = generateTranscript;