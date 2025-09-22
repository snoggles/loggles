const config = require("./config");
const fs = require('node:fs');
const path = require('node:path');
const db = require('./db');

const { Client, Collection, Events, GatewayIntentBits, MessageFlags, OAuth2Scopes, PermissionFlagsBits } = require('discord.js');
const token = config.discordToken;
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.MessageContent,
    ]
});


client.commands = new Collection();

// client.ws.on('MESSAGE_CREATE', (data, shard) => console.log(JSON.stringify(data)));

const foldersPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(foldersPath);

for (const folder of commandFolders) {
    const commandsPath = path.join(foldersPath, folder);
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
    for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file);
        const command = require(filePath);
        // Set a new item in the Collection with the key as the command name and the value as the exported module
        if ('data' in command && 'execute' in command) {
            console.log(`Command: /${command.data.name}`)
            client.commands.set(command.data.name, command);
        } else {
            console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
        }
    }
}

const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

for (const file of eventFiles) {
    const filePath = path.join(eventsPath, file);
    const event = require(filePath);

    console.log(`Event listener: ${event.name}`)
    const dispatchEvent = async (...args) => {
        try {
            await event.execute(...args);
        } catch (error) {
            console.log(`Event ${event.name} | `, args[0]);
            console.error(`Error executing event ${event.name}:`, error);
        }
    };
    if (event.once) {
        client.once(event.name, dispatchEvent);
    } else {
        client.on(event.name, dispatchEvent);
    }
}

(async () => {
    const opts = { alter: true };
    await db.sequelize.sync(opts);
    await client.login(token);
})();
