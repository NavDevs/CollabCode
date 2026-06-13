# CollabCode Dockerfile — Multi-language support
FROM node:20-bookworm

# Install all language runtimes
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    python3-pip \
    g++ \
    gcc \
    golang-go \
    default-jdk \
    rustc \
    ruby \
    php-cli \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy package files first (for layer caching)
COPY package*.json ./
COPY server/package*.json ./server/
COPY client/package*.json ./client/

# Install all dependencies
RUN npm install --include=dev
RUN cd server && npm install --include=dev
RUN cd client && npm install --include=dev

# Copy the rest of the source code
COPY . .

# Write VITE_ env vars to client/.env and build the frontend
RUN node -e "\
  const fs=require('fs');\
  const vars=Object.entries(process.env)\
    .filter(([k])=>k.startsWith('VITE_'))\
    .map(([k,v])=>k+'='+v).join('\n');\
  fs.writeFileSync('./client/.env',vars);\
  console.log('Wrote',vars.split('\n').length,'VITE_ vars to client/.env');"

RUN cd client && npm run build

# Expose the server port
EXPOSE 5000

# Start the server
CMD ["node", "server/index.js"]
