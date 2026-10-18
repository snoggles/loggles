const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../../db');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setup')
        .setDescription('Configure and inspect logging settings')
        .addSubcommand(subcommand =>
            subcommand
                .setName('configure')
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
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'status') {
            const guildConfig = await db.Guild.findOne({
                where: { guildId: interaction.guildId }
            });

            await interaction.reply({
                content: await createStatusReport(interaction, guildConfig),
                ephemeral: true
            });
            return;
        }

        try {
            const loggingChannel = interaction.options.getChannel('logging_channel');
            const storageChannel = interaction.options.getChannel('storage_channel');
            const guildId = interaction.guildId;
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
        }
    },
};

async function createStatusReport(interaction, guildConfig) {
    if (!guildConfig || !guildConfig.loggingChannelId) {
        return '❌ Loggles is not configured for this server.\n' +
            '👉 Use `/setup configure` to configure logging channels.\n\n';
    }

    const accessibleChannels = interaction.guild.channels.cache
        .filter(channel => channel.permissionsFor(interaction.client.user)?.has('ViewChannel'))
        .map(channel => `- ${channel}`);

    return `📝 **Logging Channel:** <#${guildConfig.loggingChannelId}>\n` +
        `💾 **Storage Channel:** <#${guildConfig.storageChannelId}>\n\n` +
        `👀 **Visible Channels:**\n${accessibleChannels.join('\n')}`;
}