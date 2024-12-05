# Use official Node.js image as a base
FROM node:18-alpine

# Set the working directory inside the container
WORKDIR /app

# Copy package.json and package-lock.json (for faster builds)
COPY package.json package-lock.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application files into the container
COPY . ./

# Build the app for production
RUN npm run build

# Expose the port that the app will run on
EXPOSE 3000

# Command to start the React app
CMD ["npm", "start"]
