const { Events, MessageFlags, AttachmentBuilder } = require('discord.js');
const config = require('../config');
const db = require('../db');
const { createEmbeds } = require('../transcript/fakes');

module.exports = {
	name: Events.MessageUpdate,
	async execute(oldMessage, newMessage) {
		if (newMessage.id === await config.loggingChannelId(newMessage.guildId)) return;

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
		await db.MessageVersion.create(msgVersionDbo);
	},
};