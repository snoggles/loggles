const { Events, MessageFlags, AttachmentBuilder } = require('discord.js');
const db = require('../db');
const config = require('../config');
const { Message } = require('discord.js');
const generateTranscript = require('../transcript')

module.exports = {
	name: Events.MessageCreate,
	async execute(message) {
		if (message.channelId === await config.loggingChannelId(message.guildId))
			return;
		
		const channelDbo = {
			guildId: message.channel.guildId,
			channelId: message.channelId,
			name: message.channel.name,
			createdAt: message.channel.createdAt,
		}
		await db.Channel.upsert(channelDbo);

		const msgDbo = {
			messageId: message.id,
			channelId: message.channelId,
			authorId: message.author.id,
			authorUsername: message.author.username,
		}
		await db.Message.upsert(msgDbo);

		const msgVersionDbo = {
			messageId: message.id,
			content: message.content,
			createdAt: message.createdAt,
		}
		await db.MessageVersion.create(msgVersionDbo);
	},
};