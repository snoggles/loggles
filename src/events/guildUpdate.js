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
				// Only update if the guild is already in the database
				// This means it was either set up or synced during ready event
				await guildRecord.update({
					name: newGuild.name,
					icon: newGuild.icon,
					updatedAt: new Date(),
				});
				console.log(`Updated guild record for ${newGuild.name}`);
			}
			// If guild is not in database, don't create it - wait for setup command
		} catch (error) {
			console.error(`Error updating guild ${newGuild.name}:`, error);
		}
	},
};
