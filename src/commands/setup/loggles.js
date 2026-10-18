const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const searchMessages = require('./loggles/search');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('loggles')
        .setDescription('Loggles server commands')
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
                .addStringOption(option =>
                    option.setName('visibility')
                        .setDescription('Who can see the search response')
                        .addChoices(
                            { name: 'Only me', value: 'ephemeral' },
                            { name: 'Everyone in this channel', value: 'public' }
                        )
                        .setRequired(false))
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    async execute(interaction) {
        await searchMessages(interaction);
    },
};
