const { Events, AttachmentBuilder, MessageFlags } = require('discord.js');
const generateTranscript = require('../transcript');
const fs = require('fs');
const config = require('../config');
const { channelCallbacks } = require('../transcript/callbacks');
const db = require('../db');

module.exports = {
	name: Events.ChannelDelete,
	async execute(channel) {
		const guild = await db.Guild.findByPk(channel.guildId);

		// Ignore if we're not configured yet.
		if (!guild?.loggingChannelId || !guild?.storageChannelId) return;

		if (channel.id === guild.loggingChannelId) {
			// Logging channel deleted means no more logging until /loggles setup is run again.
			guild.loggingChannelId = null;
			guild.save();
			return;
		}

		const response = await generateTranscript(
			channel.id,
			{
				returnType: 'buffer',
				footerText: 'end of transcript',
				poweredBy: false,
				callbacks: channelCallbacks(channel)
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

		const header = `<#${channel.id}> ${channel.name}`;
		const messageContent = `${header}\n${authorList}`;

		const loggingChannel = await channel.client.channels.fetch(guild.loggingChannelId);

		const sendLog = async (content, description) => {
			await loggingChannel.send({
				content: content.slice(0, 2000),
				files: [
					{
						attachment: response.transcript,
						name: `#${channel.id} ${channel.name} transcript.html`,
						description: description.slice(0, 1024),
					}
				],
				allowedMentions: {
					parse: [],
				},
				flags: MessageFlags.SuppressNotifications,
			});
		};

		try {
			await sendLog(messageContent, messageContent);
		} catch (error) {
			if (error.code === 50035) {
				console.warn(`[channelDelete] Failed to send transcript with author list for #${channel.id}, retrying without author list. Error: ${error.message}`);
				await sendLog(header, header);
			} else {
				throw error;
			}
		}
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