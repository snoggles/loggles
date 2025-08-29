const config = require('../config');
const snowflake = require('./snowflake.js');
const { Sequelize, DataTypes } = require('sequelize');

const sequelize = new Sequelize(config.dbUrl, {
  dialect: 'sqlite',
  logging: (queryString, queryObject) => {
    console.log(queryString)      // query as string
    if (queryObject.bind) console.log(queryObject.bind) // params as array
  },
  // logging: false,
});

const defaultModelOptions = {
  timestamps: false,
}

function define(name, attributes, options = {}) {
  return sequelize.define(name, attributes, { ...defaultModelOptions, ...options });
}

const User = define('User', {
  id: {
    ...snowflake('id'),
    unique: true,
    primaryKey: true,
  },
  username: DataTypes.STRING,
  globalName: DataTypes.STRING,
  // Discord avatar hash, e.g. '9dff1029d5ad84ed45593b2b60c292f4' or 'a_...'
  avatar: DataTypes.STRING,
});

const Channel = define('Channel', {
  channelId: {
    ...snowflake('channelId'),
    unique: true,
    primaryKey: true,
  },
  guildId: snowflake('guildId'),
  name: DataTypes.STRING,
  isVoiceBased: DataTypes.BOOLEAN,
  createdAt: DataTypes.DATE,
  deletedAt: DataTypes.DATE,
});

const Message = define("Message", {
  messageId: {
    ...snowflake('messageId'),
    unique: true,
    primaryKey: true,
  },
  channelId: snowflake('channelId'),
  authorId: snowflake('authorId'),
});

const MessageVersion = define("MessageVersion", {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  messageId: snowflake('messageId'),
  content: DataTypes.TEXT,
  embeds: {
    // react component expects an array, although we map [] to null to save space in the DB.
    type: DataTypes.JSON,
    allowNull: true,
    get() {
      const dbo = this.getDataValue('embeds');
      return dbo ?? [];
    },
    set(val) {
      const dbo = Array.isArray(val) && val.length > 0 ? val : null;
      this.setDataValue('embeds', dbo);
    }
  },
  createdAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
});

const Reaction = define('Reaction', {
  reactionId: {
    ...snowflake('reactionId'),
    primaryKey: true,
  },
  messageId: snowflake('messageId'),
  emoji: DataTypes.STRING,
  authorId: snowflake('authorId'),
  createdAt: DataTypes.DATE,
});

// Stored, mirrored attachment in the permanent storage channel
const Attachment = define(
  'Attachment',
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    // sha256 hash of the attachment content for deduplication (stored as BLOB for efficiency)
    hash: { type: DataTypes.BLOB, unique: true, allowNull: false },
    // Original filename
    filename: DataTypes.STRING,
    contentType: DataTypes.STRING,
    size: DataTypes.INTEGER,
    // Image dimensions (if applicable)
    width: DataTypes.INTEGER,
    height: DataTypes.INTEGER,
    // Where we mirrored it
    storageChannelId: snowflake('storageChannelId'),
    storageMessageId: snowflake('storageMessageId'),
    storageUrl: DataTypes.STRING,
  },
  {
    indexes: [
      {
        unique: true,
        fields: ['hash'],
      },
    ]
  }
);

// Link table between a specific message version and attachments
const MessageVersionAttachment = define('MessageVersionAttachment', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  messageVersionId: { type: DataTypes.INTEGER, allowNull: false },
  attachmentId: { type: DataTypes.INTEGER, allowNull: false },
});

Channel.hasMany(Message, { foreignKey: 'channelId' });
Message.belongsTo(Channel, { foreignKey: 'channelId' });
Message.hasMany(MessageVersion, { foreignKey: "messageId" });
MessageVersion.belongsTo(Message, { foreignKey: "messageId" });
Message.hasMany(Reaction, { foreignKey: 'messageId' });
Reaction.belongsTo(Message, { foreignKey: 'messageId' });

// Associations for users
User.hasMany(Message, { foreignKey: 'authorId', sourceKey: 'id' });
Message.belongsTo(User, { foreignKey: 'authorId', targetKey: 'id' });

// Associations for attachments
MessageVersion.belongsToMany(Attachment, { through: MessageVersionAttachment, foreignKey: 'messageVersionId' });
Attachment.belongsToMany(MessageVersion, { through: MessageVersionAttachment, foreignKey: 'attachmentId' });

// Guild configuration table
const Guild = define('Guild', {
  guildId: {
    ...snowflake('guildId'),
    unique: true,
    primaryKey: true,
  },
  name: DataTypes.STRING,
  icon: DataTypes.STRING, // Icon hash
  loggingChannelId: {
    ...snowflake('loggingChannelId'),
    allowNull: true,
  },
  storageChannelId: {
    ...snowflake('storageChannelId'),
    allowNull: true,
  }
});

Channel.belongsTo(Guild, { foreignKey: 'guildId' })
Guild.hasMany(Channel, { foreignKey: 'guildId' })

module.exports = { sequelize, User, Channel, Message, MessageVersion, Reaction, Attachment, MessageVersionAttachment, Guild };