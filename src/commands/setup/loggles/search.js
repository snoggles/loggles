const {
  AttachmentBuilder,
  MessageFlags,
  PermissionFlagsBits,
} = require("discord.js");
const db = require("../../../db");

const DISCORD_EPOCH = 1420070400000n;

module.exports = async function searchMessages(interaction) {
  const user = interaction.options.getUser("user");
  const days = interaction.options.getInteger("days");
  const cutoff = days === null ? null : Date.now() - days * 24 * 60 * 60 * 1000;

  const everyoneRole = interaction.guild?.roles.everyone;
  const everyoneCanView = everyoneRole
    ? interaction.channel
        .permissionsFor(everyoneRole)
        ?.has(PermissionFlagsBits.ViewChannel)
    : false;
  await interaction.deferReply({
    flags: everyoneCanView ? MessageFlags.Ephemeral : undefined,
  });

  const messages = await db.Message.findAll({
    where: { authorId: user.id },
    include: [
      {
        model: db.Channel,
        where: { guildId: interaction.guildId },
        required: true,
      },
      db.User,
      {
        model: db.MessageVersion,
        include: [
          {
            model: db.Attachment,
            as: "Attachments",
            through: { attributes: [] },
          },
        ],
      },
    ],
  });

  const matchingMessages = messages
    .filter(
      (message) =>
        cutoff === null || messageTimestamp(message.messageId) >= cutoff,
    )
    .sort((left, right) => compareSnowflakes(left.messageId, right.messageId));

  const channels = new Map();
  for (const message of matchingMessages) {
    const channel = message.Channel;
    if (!channels.has(channel.channelId))
      channels.set(channel.channelId, { channel, messages: [] });
    channels.get(channel.channelId).messages.push(message);
  }

  const orderedChannels = [...channels.values()].sort((left, right) => {
    const leftCreatedAt = left.channel.createdAt
      ? new Date(left.channel.createdAt).getTime()
      : 0;
    const rightCreatedAt = right.channel.createdAt
      ? new Date(right.channel.createdAt).getTime()
      : 0;
    return (
      leftCreatedAt - rightCreatedAt ||
      compareSnowflakes(left.channel.channelId, right.channel.channelId)
    );
  });

  const range =
    days === null
      ? "all"
      : `within the past ${days} ${days === 1 ? "day" : "days"}`;
  const title = `${matchingMessages.length} messages sent by @${user.username} <@${user.id}> (${range})`;
  const sections = orderedChannels.map(
    ({ channel, messages: channelMessages }) => {
      const createdAt = channel.createdAt
        ? new Date(channel.createdAt).toISOString()
        : "unknown";
      const lines = channelMessages.map((message) => {
        const versions = [...message.MessageVersions].sort((left, right) => {
          const dateDifference =
            new Date(left.createdAt).getTime() -
            new Date(right.createdAt).getTime();
          return dateDifference || left.id - right.id;
        });
        const latestVersion = versions[versions.length - 1];
        const content = (latestVersion?.content || "").replace(
          /\r\n|\n|\r/g,
          "$&   ",
        );
        const attachments = latestVersion?.Attachments || [];
        const attachmentText = attachments
          .map(
            (attachment) =>
              `${backtick(attachment.filename)} ${backtick(message.messageId)}`,
          )
          .join(" ");
        return `- ${content}${attachmentText ? ` ${attachmentText}` : ""}`;
      });
      return `## #${channel.name} <#${channel.channelId}>\nCreated: ${createdAt} UTC\n\n${lines.join("\n")}`;
    },
  );
  const markdown = `# ${title}\n\n${sections.join("\n\n")}`;
  const file = new AttachmentBuilder(Buffer.from(markdown, "utf8"), {
    name: `search-${user.id}.md`,
  });

  await interaction.editReply({
    content: title,
    files: [file],
    allowedMentions: { parse: [] },
  });
};

function messageTimestamp(messageId) {
  return Number((BigInt(messageId) >> 22n) + DISCORD_EPOCH);
}
const backtick = (s) => "`" + s + "`";

function compareSnowflakes(left, right) {
  const leftId = BigInt(left);
  const rightId = BigInt(right);
  return leftId < rightId ? -1 : leftId > rightId ? 1 : 0;
}
