const { Events, MessageFlags, AttachmentBuilder } = require('discord.js');
const config = require('../config');
const db = require('../db');
const { createEmbeds } = require('../transcript/fakes');
const { mirrorAndLinkAttachments } = require('../utils/attachments');

module.exports = {
	name: Events.MessageUpdate,
	async execute(oldMessage, newMessage) {
		const loggingChannelId = await config.loggingChannelId(newMessage.guildId);
		const storageChannelId = await config.storageChannelId(newMessage.guildId);
		if (newMessage.channelId === loggingChannelId || newMessage.channelId === storageChannelId) return;

		// Ensure we have up-to-date user info on edits too
		if (newMessage.author) {
			await db.User.upsert({
				id: newMessage.author.id,
				username: newMessage.author.username,
				globalName: newMessage.author.globalName ?? null,
				avatar: newMessage.author.avatar ?? null,
			});
		}

		const msgVersionDbo = {
			messageId: newMessage.id,
			content: newMessage.content,
			embeds: createEmbeds(newMessage.embeds ?? []),
			createdAt: newMessage.createdAt,
		}
		const version = await db.MessageVersion.create(msgVersionDbo);
		await mirrorAndLinkAttachments(newMessage, version.id);
	},
};