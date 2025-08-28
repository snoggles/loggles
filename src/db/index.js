const config = require('../config');
const snowflake = require('./snowflake.js');
const { Sequelize, DataTypes } = require('sequelize');

const sequelize = new Sequelize(config.dbUrl, {
  dialect: 'sqlite',
  // logging: (queryString, queryObject) => {
  //   console.log(queryString)      // outputs a string
  //   console.log(queryObject.bind) // outputs an array
  // },
  logging: false,
});

const modelOptions = {
  timestamps: false,
}

function define(name, attributes) {
  return sequelize.define(name, attributes, modelOptions);
}

const Channel = define('Channel', {
  guildId: DataTypes.BIGINT,
  channelId: {
    ...snowflake('channelId'),
    unique: true,
    primaryKey: true,
  },
  name: DataTypes.STRING,
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
  authorUsername: DataTypes.STRING,
});

const MessageVersion = define("MessageVersion", {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  messageId: snowflake('messageId'),
  content: DataTypes.TEXT,
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

Channel.hasMany(Message, { foreignKey: 'channelId' });
Message.belongsTo(Channel, { foreignKey: 'channelId' });
Message.hasMany(MessageVersion, { foreignKey: "messageId" });
MessageVersion.belongsTo(Message, { foreignKey: "messageId" });
Message.hasMany(Reaction, { foreignKey: 'messageId' });
Reaction.belongsTo(Message, { foreignKey: 'messageId' });

module.exports = { sequelize, Channel, Message, MessageVersion, Reaction };