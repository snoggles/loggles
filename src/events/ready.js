const { Events } = require('discord.js');
const config = require('../config');
const deployCommands = require('../deploy-commands');

module.exports = {
	name: Events.ClientReady,
	once: true,
	async execute(client) {
		console.log(`Ready! Logged in as ${client.user.tag}`);
		if (config.deployCommandsOnStartup) {
			await deployCommands();
		}
	},
};
