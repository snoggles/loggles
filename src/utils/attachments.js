const crypto = require('node:crypto');
const db = require('../db');
const config = require('../config');
const { Attachment } = require('discord.js');

async function bufferSha256(buffer) {
  const hash = crypto.createHash('sha256');
  hash.update(buffer);
  return hash.digest(); // Buffer for BLOB storage
}

async function fetchBuffer(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch attachment: ${res.status} ${res.statusText}`);
  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Mirrors message attachments to a permanent storage channel, de-duplicating by content hash,
 * saves attachment metadata in the DB, and links them to the provided MessageVersion id.
 *
 * @param {import('discord.js').Message | import('discord.js').Message<boolean>} message
 * @param {number} messageVersionId
 */
async function mirrorAndLinkAttachments(message, messageVersionId) {
  const attachments = message.attachments;
  if (!attachments || attachments.size === 0) return;

  const guildId = message.guildId || message.guild?.id;
  const storageChannelId = await config.storageChannelId(guildId);
  const storageChannel = await message.client.channels.fetch(storageChannelId);

  for (const [, att] of attachments) {
    try {
      const url = att.proxyURL || att.url;
      const buffer = await fetchBuffer(url);
      const hash = await bufferSha256(buffer);

      // Check for existing attachment by hash
      let attachmentRow = await db.Attachment.findOne({ where: { hash } });
      if (!attachmentRow) {
        // Mirror to storage channel
        const sent = await storageChannel.send({ files: [{ attachment: buffer, name: att.name, description: `Mirrored from ${message.channel?.name || message.channelId}` }] });
        const sentAttachment = sent.attachments.first();

        // Extract image dimensions if it's an image
        let width = null;
        let height = null;
        
        // First try to get dimensions from the original Discord attachment
        if (att.width && att.height) {
          width = att.width;
          height = att.height;
        }
        
        attachmentRow = await db.Attachment.create({
          hash,
          filename: att.name,
          contentType: att.contentType || null,
          size: att.size || buffer.length,
          width,
          height,
          storageChannelId: storageChannelId,
          storageMessageId: sent.id,
          storageUrl: sentAttachment?.url || null,
        });
      }

      // Link to the MessageVersion via the join table
      await db.MessageVersionAttachment.create({
        messageVersionId: messageVersionId,
        attachmentId: attachmentRow.id,
      });
    } catch (err) {
      console.error('Attachment mirror/link failed:', err);
    }
  }
}

module.exports = { mirrorAndLinkAttachments };
