# Loggles

A Discord bot that creates HTML transcripts of channels when they're deleted, perfect for capturing what happens in temporary channels like TempVoice, tickets, or any other ephemeral channels.

<img src="assets/profile.png" alt="Profile Picture" width="300">

## Features

- **Real-time logging**: Captures all messages, attachments, and reactions in real-time
- **HTML transcripts**: Generates beautiful HTML transcripts when channels are deleted
- **Attachment storage**: Safely stores and retrieves file attachments
- **Self-hosted**: Full control over your data and bot behavior
- **Easy setup**: Simple slash command configuration

## Status
Loggles is a low-effort, unpolished project in development. It may:
- Make breaking changes to the database on updates
- Crash in unexpected ways due to lack of testing

## Self-Hosted Only
Loggles is designed as a self-hosted solution. This ensures:
- Your data stays on your own infrastructure
- No external services have access to your Discord server content
- You are in control of your uptime and storage resources

## Instructions

### 1. Create Discord Bot App
1. Go to your Discord application's OAuth2 settings
2. Add the following scopes:
   - `bot`
   - `applications.commands`
3. Add the following bot permissions:
   - View Channels
   - Read Message History
   - Send Messages
   - Attach Files
4. Save the client id and discord token to give to the bot
5. Save the generated OAuth2 URL

### 2. Start the bot
#### docker-cli
```bash
docker run -it -e DISCORD_CLIENT_ID=... -e DISCORD_TOKEN=... -v loggles-data:/data ghcr.io/snoggles/loggles:latest
```

#### docker-compose
```dotenv file=.env
DISCORD_CLIENT_ID=...
DISCORD_TOKEN=...
```

```yaml file=docker-compose.yml
services:
  loggles:
    image: ghcr.io/snoggles/loggles:latest
    container_name: loggles
    environment:
      - DISCORD_CLIENT_ID=${DISCORD_CLIENT_ID}
      - DISCORD_TOKEN=${DISCORD_TOKEN}
    volumes:
      - loggles-data:/data
```

### 3. Add the bot to your server
Use the generated OAuth2 URL to add the bot to your server.

### 4. Configuration
Once the bot is added to your server, run the setup command:

```
/loggles setup
```

You'll need to specify two channels:

#### #logging Channel
- **Purpose**: Where the bot will post message logs and activity summaries
- **Content**: Real-time logs of all messages, edits, and deletions
- **Permissions**: The bot needs to send messages and embed links here
- **Recommendation**: Create a dedicated `#bot-logs` or `#audit-log` channel

#### #storage Channel
- **Purpose**: Where the bot stores file attachments and media
- **Content**: All files, images, videos, and other attachments from logged channels
- **Permissions**: The bot needs to send messages and attach files here
- **Recommendation**: Create a dedicated `#file-storage` or `#media-archive` channel

## How It Works

1. **Message Logging**: The bot continuously logs all messages, edits, and deletions to a local SQLite database
2. **Attachment Storage**: Files are stored in the designated storage channel for easy retrieval
3. **Channel Deletion**: When a channel is deleted, the bot generates an HTML transcript
4. **Transcript Generation**: Creates a comprehensive HTML file containing all logged content with proper formatting

## Configuration

The bot automatically configures itself based on your Discord server permissions. Set the bot's role permissions so it only sees the channels you want logged.

### Database

- Uses SQLite for local data storage
- Automatically creates necessary tables on first run
- Data is stored in `data.sqlite` in the project root

## Security Considerations

- The bot only logs channels it has access to
- All data is stored locally on your infrastructure
- No data is transmitted to external services
- Configure bot permissions carefully to control logging scope

## Troubleshooting

- **Bot not responding**: Check that slash commands were deployed successfully
- **Permission errors**: Ensure the bot has the required permissions in both logging and storage channels
- **Database issues**: Verify the bot has write access to the project directory

## License

ISC License - see LICENSE file for details.

## Contributing

If you'd like to contribute improvements, please fork the repository and submit a pull request.
