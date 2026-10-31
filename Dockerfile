FROM node:25-alpine
# Basis-OS altijd naar laatste beveiligingsupdates (CVE-scan 21-10-2026)
RUN apk upgrade --no-cache

# better-sqlite3 needs a native build toolchain at install time on Alpine.
RUN apk add --no-cache python3 make g++

WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev
COPY . .

USER node
EXPOSE 3000
CMD ["node", "server.js"]
