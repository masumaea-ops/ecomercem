#!/bin/bash
set -e

echo "🚀 Starting Production Build & PM2 Deployment..."

# 1. Install dependencies
echo "📦 Installing root dependencies..."
npm install

echo "📦 Installing server dependencies..."
cd server && npm install && cd ..

# Ensure binaries have execution permissions on Linux
chmod +x -R node_modules/.bin server/node_modules/.bin 2>/dev/null || true

# 2. Build Frontend with Vite
echo "🏗️ Building Frontend Bundle into /dist..."
npm run build

# 3. Build Backend TypeScript into /server/dist
echo "🏗️ Building Backend TypeScript into /server/dist..."
cd server && npm run build && cd ..

# Ensure static data assets (CRSP templates) are present in server/dist/data
mkdir -p server/dist/data
cp -r server/src/data/* server/dist/data/ 2>/dev/null || true

# 4. Restart or Start with PM2
echo "🔄 Starting / Reloading PM2 process..."
pm2 startOrReload ecosystem.config.cjs --update-env

echo "💾 Saving PM2 process list for server reboots..."
pm2 save

echo "✅ Deployment Successful! Platform is live."
