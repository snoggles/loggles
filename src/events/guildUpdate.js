const { Events } = require('discord.js');
const db = require('../db');

module.exports = {
	name: Events.GuildUpdate,
	once: false,
	async execute(oldGuild, newGuild) {
		console.log(`Guild updated: ${newGuild.name} (${newGuild.id})`);
		
		try {
			const guildRecord = await db.Guild.findByPk(newGuild.id);
			if (guildRecord) {
				// Update existing guild record
				await guildRecord.update({
					name: newGuild.name,
					icon: newGuild.icon,
					updatedAt: new Date(),
				});
				console.log(`Updated guild record for ${newGuild.name}`);
			} else {
				// Guild not in database, create it
				const [newGuildRecord, created] = await db.Guild.findOrCreate({
					where: { guildId: newGuild.id },
					defaults: {
						guildId: newGuild.id,
						name: newGuild.name,
						icon: newGuild.icon,
						loggingChannelId: null, // Will be set by setup command or hardcoded values
						storageChannelId: null, // Will be set by setup command or hardcoded values
					}
				});
				console.log(`Created guild record for ${newGuild.name}`);
				
				// If this is the target guild, populate hardcoded values
				if (newGuild.id === '1236524027221377036') {
					await populateHardcodedChannelIds(newGuildRecord);
				}
			}
		} catch (error) {
			console.error(`Error updating guild ${newGuild.name}:`, error);
		}
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
