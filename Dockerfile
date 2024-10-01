# Use the official Node.js image (slim version of Node 18)
FROM node:18-slim

# Set the working directory inside the container
WORKDIR /app

# Copy package.json and package-lock.json (if available)
COPY package*.json ./

# Install dependencies
RUN npm install --production

# Copy the rest of the application code to the container
COPY . .

# Expose port 3000 for the application
EXPOSE 3000

# Define the default command to run your application
CMD ["node", "index.js"]

# docker run -d -p 3000:3000 -v /path/to/local/data:/app/data --name port-manager daelinc/port-manager:latest
