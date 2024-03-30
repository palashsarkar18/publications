# Step 1: Build
# Use the official Node.js 16 as a parent image
FROM node:16-alpine as builder

# Set the working directory in the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json to leverage Docker cache
COPY package*.json ./

# Install dependencies, including 'devDependencies'
RUN npm install

# Copy the rest of your application's code
COPY . .

# Build the project
RUN npm run build

# Step 2: Run
# Use a separate stage to run the application to keep the image small
FROM node:16-alpine

WORKDIR /usr/src/app

# Copy package.json and package-lock.json for installing production dependencies
COPY package*.json ./

# Install only production dependencies
RUN npm install --only=production

# Copy compiled JavaScript from the builder stage
COPY --from=builder /usr/src/app/build ./build

# Expose port 3000.
EXPOSE 3000

# Command to run the app
CMD ["node", "build/app.js"]