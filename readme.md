# Loggles
A discord bot that sends HTML transcripts of channels when they're deleted.

## Motivation
Useful for capturing what happens in temporary channels (TempVoice, tickets, etc.).

## Configuration
The bot will log everything it sees. Use discord permissions to scope it down to only what you want logged.

## Implementation
Bot logs events to a local sqlite database. When a channel is deleted, it creates a transcript and dumps the messages.

## Features
- [x] Post transcripts (in a hardcoded channel)
- [ ] Configure the channel id
- [ ] Delete old data
- [ ] Capture/render more data
  - [ ] reactions
  - [ ] message edits
  - [ ] attachments (mirror to #storage channel)
  - [ ] embeds
  - [ ] role colors
