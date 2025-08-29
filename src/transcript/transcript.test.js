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

    // Dummy user matching the provided avatar URL
    await db.User.create({
        id: '184516916793049095',
        username: 'Snoggles',
        globalName: 'Snoggles',
        avatar: '9dff1029d5ad84ed45593b2b60c292f4',
    });

    // Create guild first since Channel references it
    await db.Guild.create({
        guildId: 1,
        name: 'Test Guild',
    });

    await db.Channel.create({
        guildId: 1,
        channelId: 1,
        name: "Farming 1 🔵",
        isVoiceBased: true,
        createdAt: Date.now(),
    })
    await db.Message.create({
        messageId: 1,
        channelId: 1,
        authorId: '184516916793049095',
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
    
    // Add a second version to test edit functionality
    await db.MessageVersion.create({
        messageId: 1,
        content: 'Hello world! How are you?',
        createdAt: new Date('2023-01-01T00:01:00Z'),
    });
    
    // Add a third version to test multiline strikethrough
    await db.MessageVersion.create({
        messageId: 1,
        content: 'Hello world!\nHow are you today?',
        createdAt: new Date('2023-01-01T00:02:00Z'),
    });
    
    // Add a fourth version to test chaining references
    await db.MessageVersion.create({
        messageId: 1,
        content: 'Hello world! How are you today?',
        createdAt: new Date('2023-01-01T00:03:00Z'),
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
        filename: `test-transcript.html`,
        footerText: 'end of transcript',
        poweredBy: false,
    }
    const response = await generateTranscript('1', opts);
    const html = response.transcript.toString('utf-8');
    console.log(html);
    const outputPath = path.join(__dirname, `transcript.html`);
    fs.writeFileSync(outputPath, html, 'utf-8');
});