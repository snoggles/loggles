const { Events, AttachmentBuilder } = require('discord.js');
const generateTranscript = require('../transcript');
const fs = require('fs');
const config = require('../config');

module.exports = {
	name: Events.ChannelDelete,
	async execute(channel) {
		const loggingChannelId = await config.loggingChannelId(channel.guildId)
		if (channel.id === loggingChannelId) return;


		const buffer = await generateTranscript(
			channel.id,
			{
				returnType: 'buffer',
				footerText: 'end of transcript',
				poweredBy: false,
			}
		)

		const loggingChannel = await channel.client.channels.fetch(loggingChannelId);
		const description = `Transcript of ${channel.name}`
		await loggingChannel.send({
			content: description,
			files: [
				{
					attachment: buffer,
					name: `#${channel.id} ${channel.name} transcript.html`,
					description: description,
				}
			]
		});
	},
};