FROM node:22-alpine

# better-sqlite3 needs a native build toolchain at install time on Alpine.
RUN apk add --no-cache python3 make g++

WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev
COPY . .

USER node
EXPOSE 3000
CMD ["node", "server.js"]
