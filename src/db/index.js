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
  guildId: snowflake('guildId'),
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

Channel.hasMany(Message, { foreignKey: 'channelId' });
Message.belongsTo(Channel, { foreignKey: 'channelId' });
Message.hasMany(MessageVersion, { foreignKey: "messageId" });
MessageVersion.belongsTo(Message, { foreignKey: "messageId" });
Message.hasMany(Reaction, { foreignKey: 'messageId' });
Reaction.belongsTo(Message, { foreignKey: 'messageId' });

// Associations for users
User.hasMany(Message, { foreignKey: 'authorId', sourceKey: 'id' });
Message.belongsTo(User, { foreignKey: 'authorId', targetKey: 'id' });

module.exports = { sequelize, User, Channel, Message, MessageVersion, Reaction };