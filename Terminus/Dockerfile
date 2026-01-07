# Use official Node.js image
FROM node:20-slim

# Create app directory
WORKDIR /usr/src/app

# Copy dependency definitions
COPY package*.json ./

# Install dependencies
RUN npm install --production

# Copy app source
COPY . .

# Environment variable for Port (Cloud Run sets this)
ENV PORT=8080

# Start server
CMD [ "npm", "start" ]
