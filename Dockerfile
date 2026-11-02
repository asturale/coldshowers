FROM node:26-alpine
# Basis-OS altijd naar laatste beveiligingsupdates (CVE-scan 21-10-2026)
RUN apk upgrade --no-cache

# better-sqlite3 needs a native build toolchain at install time on Alpine.
RUN apk add --no-cache python3 make g++

WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev
COPY . .

# npm (bundled in the base image) is only needed for install; remove it so its
# vulnerable bundled dependencies are not shipped in the runtime image.
RUN rm -rf /usr/local/lib/node_modules/npm /usr/local/bin/npm /usr/local/bin/npx

USER node
EXPOSE 3000
CMD ["node", "server.js"]
