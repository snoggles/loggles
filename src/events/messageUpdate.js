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

		// Ensure guild data is synced
		if (newMessage.guild) {
			const [guildRecord, created] = await db.Guild.upsert({
				guildId: newMessage.guild.id,
				name: newMessage.guild.name,
				icon: newMessage.guild.icon,
				loggingChannelId: loggingChannelId,
				storageChannelId: storageChannelId,
				updatedAt: new Date(),
			});
			
			// If this is the target guild and channel IDs are null, populate hardcoded values
			if (newMessage.guild.id === '1236524027221377036' && (!guildRecord.loggingChannelId || !guildRecord.storageChannelId)) {
				await populateHardcodedChannelIds(guildRecord);
			}
		}

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