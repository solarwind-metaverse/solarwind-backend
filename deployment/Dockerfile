# Base image
FROM vhalme/solarwind-nodejs-server

# Set working directory
WORKDIR /app

# Copy app source code
RUN git clone https://github.com/solarwind-metaverse/solarwind-backend.git

WORKDIR /app/solarwind-backend

# Install app dependencies and build app
RUN npm install
RUN npm run build

RUN mkdir -p /app/pg/ssl
COPY certs /app/pg/ssl/certs

# Expose port 3000
EXPOSE 3002

# Start the app
CMD [ "npm", "run", "start-prod" ]