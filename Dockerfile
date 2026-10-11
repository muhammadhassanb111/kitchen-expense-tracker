FROM node:20-alpine

# Install build tools for better-sqlite3 and git for cloud auto-backup
RUN apk add --no-cache python3 make g++ git tzdata

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev

COPY . .

ENV PORT=3000
ENV NODE_ENV=production

EXPOSE 3000

CMD ["node", "server.js"]
