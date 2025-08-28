const { Events, MessageFlags, AttachmentBuilder } = require('discord.js');
const config = require('../config');
const db = require('../db');

module.exports = {
	name: Events.MessageUpdate,
	async execute(oldMessage, newMessage) {
		if (newMessage.id === await config.loggingChannelId(newMessage.guildId)) return;

		const msgVersionDbo = {
			messageId: newMessage.id,
			content: newMessage.content,
			createdAt: newMessage.createdAt,
		}
		await db.MessageVersion.create(msgVersionDbo);
	},
};