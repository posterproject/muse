# Build stage
FROM node:23.10.0-alpine AS builder

# Get project directory from build argument
ARG PROJECT_DIR
ENV PROJECT_DIR=$PROJECT_DIR

WORKDIR /app

# Copy package files
COPY $PROJECT_DIR/package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY $PROJECT_DIR/ .

# Build the application
RUN npm run build

# Production stage
FROM nginx:alpine

# Get docker directory from build argument
ARG DOCKER_DIR
ENV DOCKER_DIR=$DOCKER_DIR

# Copy built assets from builder
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY $DOCKER_DIR/nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"] 