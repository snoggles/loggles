const { Events, AttachmentBuilder } = require('discord.js');
const generateTranscript = require('../transcript');
const fs = require('fs');
const config = require('../config');

module.exports = {
	name: Events.ChannelDelete,
	async execute(channel) {
		const loggingChannelId = await config.loggingChannelId(channel.guildId)
		if (channel.id === loggingChannelId) return;


		const response = await generateTranscript(
			channel.id,
			{
				returnType: 'buffer',
				footerText: 'end of transcript',
				poweredBy: false,
			}
		)
		if (!response) return;

		const humanAuthors = findHumanAuthors(response.messages);
		if (humanAuthors.size === 0) {
			return;
		}

		const authorList = Array.from(humanAuthors.values())
			.map(u => `- <@${u.id}> ${u.username}` + (u.globalName && u.globalName != u.username ? ` (${u.globalName})` : ''))
			.join('\n');

		const messageContent = `<#${channel.id}> ${channel.name}\n${authorList}`;


		const loggingChannel = await channel.client.channels.fetch(loggingChannelId);
		await loggingChannel.send({
			content: messageContent,
			files: [
				{
					attachment: response.transcript,
					name: `#${channel.id} ${channel.name} transcript.html`,
					description: messageContent,
				}
			]
		});
	},
};

function findHumanAuthors(messages) {
	const authorsMap = new Map();
	for (const msg of (messages ?? [])) {
		const user = msg.User;
		if (!user) continue;
		if (!authorsMap.has(user.id)) {
			authorsMap.set(user.id, {
				id: user.id,
				username: user.username,
				globalName: user.globalName,
			});
		}
	}

	const ignoredUserIds = config.ignoredUserIds || [];
	for (ignored of ignoredUserIds) {
		authorsMap.delete(ignored);
	}
	return authorsMap;
}