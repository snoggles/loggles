const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../../db');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('loggles')
        .setDescription('Loggles configuration commands')
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
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    async execute(interaction) {
        const loggingChannel = interaction.options.getChannel('logging_channel');
        const storageChannel = interaction.options.getChannel('storage_channel');
        const guildId = interaction.guildId;

        try {
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
                    storageChannelId: storageChannel.id,
                    updatedAt: new Date(),
                });
            }

            await interaction.reply({
                content: `✅ Loggles configuration updated for **${interaction.guild.name}**!\n\n` +
                    `📝 **Logging Channel:** ${loggingChannel}\n` +
                    `💾 **Storage Channel:** ${storageChannel}`,
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