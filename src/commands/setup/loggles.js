const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../../db');
const searchMessages = require('./loggles/search');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('loggles')
        .setDescription('Loggles server commands')
        .addSubcommand(subcommand =>
            subcommand
                .setName('setup')
                .setDescription('Configure discord channel logging')
                .addChannelOption(option =>
                    option.setName('logging_channel')
                        .setDescription('The channel where message logs will be posted')
                        .setRequired(true))
                .addChannelOption(option =>
                    option.setName('storage_channel')
                        .setDescription('The channel where attachments will be stored')
                        .setRequired(true))
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('status')
                .setDescription('Check current logging configuration and accessible channels')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('search')
                .setDescription('Search messages sent by a user in this server')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('The author to search for')
                        .setRequired(true))
                .addIntegerOption(option =>
                    option.setName('days')
                        .setDescription('Only include messages sent within the past number of days')
                        .setMinValue(1)
                        .setRequired(false))
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const guildId = interaction.guildId;

        if (subcommand === 'setup') {
            try {
                const loggingChannel = interaction.options.getChannel('logging_channel');
                const storageChannel = interaction.options.getChannel('storage_channel');
                // Update or create guild configuration
                const [guildRecord, created] = await db.Guild.findOrCreate({
                    where: { guildId: guildId },
                    defaults: {
                        guildId: guildId,
                        name: interaction.guild.name,
                        icon: interaction.guild.icon,
                        loggingChannelId: loggingChannel.id,
                        storageChannelId: storageChannel.id,
                    }
                });

                if (!created) {
                    // Update existing guild record
                    await guildRecord.update({
                        name: interaction.guild.name,
                        icon: interaction.guild.icon,
                        loggingChannelId: loggingChannel.id,
                        storageChannelId: storageChannel.id
                    });
                }

                await interaction.reply({
                    content: `✅ Loggles configuration updated for **${interaction.guild.name}**!\n\n` +
                        await createStatusReport(interaction, guildRecord),
                    ephemeral: true
                });

            } catch (error) {
                console.error('Error updating guild configuration:', error);
                await interaction.reply({
                    content: '❌ Failed to update configuration. Please try again.',
                    ephemeral: true
                });
                return;
            }
        }

        if (subcommand === 'status') {
            // Get current guild configuration
            const guildConfig = await db.Guild.findOne({
                where: { guildId: guildId }
            });

            await interaction.reply({
                content: await createStatusReport(interaction, guildConfig),
                ephemeral: true
            });
            return;
        }

        if (subcommand === 'search') {
            await searchMessages(interaction);
            return;
        }
    },
};

async function createStatusReport(interaction, guildConfig) {
    if (!guildConfig || !guildConfig.loggingChannelId) {
        return '❌ Loggles is not configured for this server.\n' +
            '👉 Use `/loggles setup` to configure logging channels.\n\n';
    }

    // Get all channels the bot can see in the current guild
    const accessibleChannels = interaction.guild.channels.cache
        .filter(channel => channel.permissionsFor(interaction.client.user)?.has('ViewChannel'))
        .map(channel => `- ${channel}`);

    return `📝 **Logging Channel:** <#${guildConfig.loggingChannelId}>\n` +
        `💾 **Storage Channel:** <#${guildConfig.storageChannelId}>\n\n` +
        `👀 **Visible Channels:**\n${accessibleChannels.join('\n')}`;
}