const db = require('../db');
const { shouldLog } = require('../utils/channelHelper');

module.exports = {
    name: 'messageReactionAdd',
    async execute(reaction, user) {
        if (!(await shouldLog(reaction.message.channel))) return;

        // Fetch the full reaction if it's partial
        if (reaction.partial) {
            try {
                await reaction.fetch();
            } catch (error) {
                console.error('Error fetching reaction:', error);
                return;
            }
        }

        try {
            // Get emoji data
            const emoji = reaction.emoji;
            const emojiString = emoji.id ? `${emoji.name}:${emoji.id}` : emoji.name;

            // Store the reaction
            await db.Reaction.create({
                messageId: reaction.message.id,
                emoji: emojiString,
                authorId: user.id,
                createdAt: new Date()
            });

            console.log(`Reaction added: ${emojiString} to message ${reaction.message.id} by ${user.tag}`);
        } catch (error) {
            console.error('Error storing reaction:', error);
        }
    }
};
