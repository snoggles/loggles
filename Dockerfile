# Use Node.js LTS as base image
FROM node:24 AS build-env
WORKDIR /app
COPY package*.json /app
ENV NODE_ENV=production
RUN npm ci --omit=dev

FROM gcr.io/distroless/nodejs24-debian12
WORKDIR /app
COPY --from=build-env /app /app
COPY src/ ./src/

VOLUME /data

ENV NODE_ENV=production
ENV DATABASE_URL=sqlite:/data/data.sqlite

# Start the bot
CMD [ "src/bot.js" ]
