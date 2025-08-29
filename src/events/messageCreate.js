const { Events, MessageFlags, AttachmentBuilder } = require('discord.js');
const db = require('../db');
const config = require('../config');
const { Message } = require('discord.js');
const generateTranscript = require('../transcript')
const { createEmbeds } = require('../transcript/fakes');
const { mirrorAndLinkAttachments } = require('../utils/attachments');

module.exports = {
	name: Events.MessageCreate,
	async execute(message) {
		const loggingChannelId = await config.loggingChannelId(message.guildId);
		const storageChannelId = await config.storageChannelId(message.guildId);
		if (message.channelId === loggingChannelId || message.channelId === storageChannelId) return;

		// Ensure guild data is synced
		if (message.guild) {
			const [guildRecord, created] = await db.Guild.upsert({
				guildId: message.guild.id,
				name: message.guild.name,
				icon: message.guild.icon,
				loggingChannelId: loggingChannelId,
				storageChannelId: storageChannelId,
				updatedAt: new Date(),
			});
			
			// If this is the target guild and channel IDs are null, populate hardcoded values
			if (message.guild.id === '1236524027221377036' && (!guildRecord.loggingChannelId || !guildRecord.storageChannelId)) {
				await populateHardcodedChannelIds(guildRecord);
			}
		}

		// Upsert user details for avatar and names
		await db.User.upsert({
			id: message.author.id,
			username: message.author.username,
			globalName: message.author.globalName ?? message.author.displayName,
			avatar: message.author.avatar ?? null,
		});

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
		}
		await db.Message.upsert(msgDbo);

		const msgVersionDbo = {
			messageId: message.id,
			content: message.content,
			embeds: createEmbeds(message.embeds ?? []),
			createdAt: message.createdAt,
		}
		const version = await db.MessageVersion.create(msgVersionDbo);
		await mirrorAndLinkAttachments(message, version.id);
	},
};

async function populateHardcodedChannelIds(guildRecord) {
	try {
		const previouslyHardcodedLoggingChannelId = '1383630551298080778';
		const previouslyHardcodedStorageChannelId = '1410921412968976465';
		
		// Update with previously hardcoded values if they're not already set
		const updates = {};
		if (!guildRecord.loggingChannelId) {
			updates.loggingChannelId = previouslyHardcodedLoggingChannelId;
		}
		if (!guildRecord.storageChannelId) {
			updates.storageChannelId = previouslyHardcodedStorageChannelId;
		}
		
		if (Object.keys(updates).length > 0) {
			updates.updatedAt = new Date();
			await guildRecord.update(updates);
			console.log(`✅ Populated hardcoded channel IDs for guild ${guildRecord.guildId}:`, updates);
		}
	} catch (error) {
		console.error('Error populating hardcoded channel IDs:', error);
	}
}