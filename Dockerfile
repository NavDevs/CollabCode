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

# Make start script executable and fix line endings
RUN sed -i 's/\r$//' start.sh && chmod +x start.sh

# Expose the server port
EXPOSE 5000

# Start: write env vars → build client → start server
CMD ["bash", "./start.sh"]
