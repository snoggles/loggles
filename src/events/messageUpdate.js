const { Events, MessageFlags, AttachmentBuilder } = require('discord.js');
const config = require('../config');
const db = require('../db');
const { createEmbeds } = require('../transcript/fakes');
const { mirrorAndLinkAttachments } = require('../utils/attachments');
const { shouldLog } = require('../utils/channelHelper');

module.exports = {
	name: Events.MessageUpdate,
	async execute(oldMessage, newMessage) {
		// Check if we should log this message
		if (!(await shouldLog(newMessage.channel))) return;

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
			createdAt: newMessage.editedAt,
		}
		const version = await db.MessageVersion.create(msgVersionDbo);
		await mirrorAndLinkAttachments(newMessage, version.id);
	},
};
