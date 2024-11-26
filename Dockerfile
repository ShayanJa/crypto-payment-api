FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.server.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Build TypeScript files
RUN npm run build:server

# Expose the port
EXPOSE 3000

# Start the server
CMD ["node", "dist/index.js"]