const { assert, before, test } = require('node:test');
const db = require('../db');
const generateTranscript = require('./index.js');
const fs = require('fs');
const path = require('path');

before(async () => {
    await db.sequelize.sync({ force: true });
})

test('generate html', async (t) => {
    // Insert test data

    await db.Channel.create({
        guildId: 1,
        channelId: 1,
        name: "Farming 1 🔵",
        createdAt: Date.now(),
    })
    await db.Message.create({
        messageId: 1,
        channelId: 1,
        authorId: 1,
        authorUsername: 'Snoggles',
        content: 'Hello world!',
        edited: false,
        deleted: false,
        createdAt: new Date('2023-01-01T00:00:00Z'),
    });
    await db.MessageVersion.create({
        messageId: 1,
        content: 'Hello world!',
        createdAt: new Date('2023-01-01T00:00:00Z'),
    });
    await db.Reaction.create({
        reactionId: 1,
        messageId: 1,
        emoji: '👍',
        authorId: 1,
        createdAt: new Date('2023-01-01T00:01:00Z'),
    });

    const opts = {
        returnType: 'buffer',
        filename: `channel-${channelId}-transcript.html`,
        footerText: 'end of transcript',
        poweredBy: false,
    }
    const buf = await generateTranscript('1', opts);
    const html = buf.toString('utf-8');
    console.log(html);
    const outputPath = path.join(__dirname, `transcript.html`);
    fs.writeFileSync(outputPath, html, 'utf-8');
});