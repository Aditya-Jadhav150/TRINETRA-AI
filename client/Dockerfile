FROM node:20-alpine

WORKDIR /app

# Copy dependencies list
COPY package.json .

# Install dependencies
RUN npm install

# Copy source files
COPY . .

# Expose Vite port
EXPOSE 5173

# Run Vite dev server
CMD ["npm", "run", "dev"]
