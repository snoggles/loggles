const path = require("path");
const dotenv = require("dotenv");

// Load environment variables from .env file
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

module.exports = {
  discordToken: process.env.DISCORD_TOKEN,
  discordClientId: process.env.DISCORD_CLIENT_ID,
  dbUrl: process.env.DATABASE_URL || "sqlite:./data.sqlite",
  env: process.env.NODE_ENV || "development",
  logQueries: process.env.LOG_QUERIES ?? process.env.NODE_ENV !== "production",
  ignoredUserIds: [
    // '762217899355013120', // TempVoice
  ],
};

