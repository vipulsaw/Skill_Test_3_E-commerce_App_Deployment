# frontend/Dockerfile
FROM node:16
 
WORKDIR /app
 
COPY package.json . 
RUN npm install
 
COPY . .
 
EXPOSE 3004
 
CMD ["npm", "start"]