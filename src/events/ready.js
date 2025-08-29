const { Events } = require('discord.js');
const db = require('../db');

module.exports = {
	name: Events.ClientReady,
	once: true,
	async execute(client) {
		console.log(`Ready! Logged in as ${client.user.tag}`);
		
		// Sync all guilds to the database
		for (const guild of client.guilds.cache.values()) {
			await syncGuildToDatabase(guild);
		}
		
		// Populate previously hardcoded channel IDs for the specific guild
		await populateHardcodedChannelIds();
		
		console.log(`Synced ${client.guilds.cache.size} guilds to database`);
	},
};

async function syncGuildToDatabase(guild) {
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
	} catch (error) {
		console.error(`Error syncing guild ${guild.name}:`, error);
	}
}

async function populateHardcodedChannelIds() {
	try {
		const targetGuildId = '1236524027221377036';
		const previouslyHardcodedLoggingChannelId = '1383630551298080778';
		const previouslyHardcodedStorageChannelId = '1410921412968976465';
		
		// Find the guild record
		const guildRecord = await db.Guild.findByPk(targetGuildId);
		if (guildRecord) {
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
				console.log(`✅ Populated hardcoded channel IDs for guild ${targetGuildId}:`, updates);
			} else {
				console.log(`ℹ️ Guild ${targetGuildId} already has channel IDs configured`);
			}
		} else {
			console.log(`⚠️ Guild ${targetGuildId} not found in database, cannot populate hardcoded values`);
		}
	} catch (error) {
		console.error('Error populating hardcoded channel IDs:', error);
	}
}