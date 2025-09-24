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

    const fakeChannel = {
        name: channel.name,
        isDMBased: () => false,
        isThread: () => false,
        isVoiceBased: () => channel.isVoiceBased || false,
        guild: createFakeGuild(guildData)
    }

    const dbMessages = await db.Message.findAll({
        where: { channelId: channelId },
        include: [
            {
                model: db.MessageVersion,
                include: [
                    {
                        model: db.Attachment,
                        through: { attributes: [] }, // Don't include join table attributes
                        as: 'Attachments'
                    }
                ]
            },
            {
                model: db.Reaction,
                include: [db.User]
            },
            db.User,
        ],
        order: [[{ model: db.MessageVersion }, 'createdAt', 'ASC']], // https://stackoverflow.com/a/65268641
    });

    const fakeMessages = [];

    for (const m of dbMessages) {
        const user = m.User;
        const avatarHash = user?.avatar || null;
        const userId = m.authorId;
        const isEdit = m.MessageVersions.length > 1;

        // Create a message for each version
        for (let index = 0; index < m.MessageVersions.length; index++) {
            const version = m.MessageVersions[index];

            const isFinalVersion = index === m.MessageVersions.length - 1
            const messageId = isFinalVersion ? m.messageId : `${m.messageId}.${index}`;

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

            // Process reactions for this message
            const messageReactions = new Collection();
            if (m.Reactions && m.Reactions.length > 0) {
                // Group reactions by emoji
                const reactionGroups = {};
                m.Reactions.forEach(reaction => {
                    const emojiKey = reaction.emoji;
                    if (!reactionGroups[emojiKey]) {
                        reactionGroups[emojiKey] = {
                            count: 0,
                            users: new Collection(),
                            emoji: reaction.emoji
                        };
                    }
                    reactionGroups[emojiKey].count++;
                    if (reaction.User) {
                        reactionGroups[emojiKey].users.set(reaction.User.id, reaction.User);
                    }
                });

                // Convert to discord.js reaction format
                Object.entries(reactionGroups).forEach(([emojiKey, group]) => {
                    const [emojiName, emojiId] = emojiKey.includes(':') ? emojiKey.split(':') : [emojiKey, null];

                    messageReactions.set(emojiKey, {
                        emoji: {
                            id: emojiId,
                            name: emojiName,
                            animated: emojiId ? false : false, // We'll need to determine this from the emoji data
                        },
                        count: group.count,
                        users: {
                            cache: group.users
                        }
                    });
                });
            }

            const content = isFinalVersion ? version.content : `~~${version.content}~~`;

            const messageObj = {
                id: messageId,
                author: {
                    id: m.authorId,
                    username: user?.username || 'Unknown',
                    displayName: user?.globalName && user?.username && user?.globalName != user?.username ? `${user.globalName} (${user.username})` : user?.username || user?.globalName || 'Unknown',
                    displayAvatarURL: (opts = {}) => buildAvatarUrl(userId, avatarHash, opts),
                    avatarURL: (opts = {}) => buildAvatarUrl(userId, avatarHash, opts),
                },
                channel: fakeChannel,
                createdAt: new Date(version.createdAt),
                content: content,
                embeds: Array.isArray(version.embeds) ? version.embeds : [],
                editedAt: isEdit ? new Date(version.createdAt) : null,
                guild: {
                    id: guildData.guildId
                },
                components: [],
                mentions: {
                    everyone: false,
                },
                reactions: {
                    cache: messageReactions,
                },
                attachments: attachments,
            };

            fakeMessages.push(messageObj);
        }
    }

    const transcriptBuffer = await discordTranscripts.generateFromMessages(fakeMessages, fakeChannel,
        {
            callbacks: dummyCallbacks,
            ...opts
        }
    );

    let plaintextHeader = createPlaintextHeader(dbMessages)
    const result = Buffer.concat([
        Buffer.from(plaintextHeader, 'utf8'),
        transcriptBuffer
    ]);

    return {
        messages: dbMessages ?? [],
        transcript: result,
    };
}

function createPlaintextHeader(dbMessages) {
    /**
     * A skimmable (duplicate) plaintext header version of the messages.
     */
    let plaintextHeader = "<!--\n";
    try {
        for (const m of dbMessages) {
            for (let index = 0; index < m.MessageVersions.length; index++) {
                const mv = m.MessageVersions[index];
                const isFinalVersion = index === m.MessageVersions.length - 1

                let content = mv.content ?? "";
                const attachments = mv.Attachments
                if (attachments && attachments.length > 0) {
                    content += " " + attachments.map(a => a.filename).join(', ');
                }
                content = content.replaceAll('\n', ' ').replaceAll('-->', '');

                if (isFinalVersion) {
                    plaintextHeader += `${m.User.username}: ${content}\n`;
                } else {
                    plaintextHeader += `  ${m.User.username} (edit): ~~${content}~~\n`;
                }
            }
        }
    } catch (error) {
        // ignore. not worth blowing up the HTML over a bug in the summary.
    }
    plaintextHeader += "-->\n";
    return plaintextHeader;
}

module.exports = generateTranscript;