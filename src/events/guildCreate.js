const { Events } = require('discord.js');
const db = require('../db');

module.exports = {
	name: Events.GuildCreate,
	once: false,
	async execute(guild) {
		console.log(`Joined guild: ${guild.name} (${guild.id})`);
		
		try {
			const [guildRecord, created] = await db.Guild.findOrCreate({
				where: { guildId: guild.id },
				defaults: {
					guildId: guild.id,
					name: guild.name,
					icon: guild.icon,
					loggingChannelId: null, // Will be set by setup command or hardcoded values
					storageChannelId: null, // Will be set by setup command or hardcoded values
				}
			});
			
			if (!created) {
				// Update existing guild record
				await guildRecord.update({
					name: guild.name,
					icon: guild.icon,
					updatedAt: new Date(),
				});
			}
			
			console.log(`${created ? 'Created' : 'Updated'} guild record for ${guild.name}`);
			
			// If this is the target guild, populate hardcoded values
			if (guild.id === '1236524027221377036') {
				await populateHardcodedChannelIds(guildRecord);
			}
		} catch (error) {
			console.error(`Error syncing guild ${guild.name}:`, error);
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
