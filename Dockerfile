FROM node:8-slim
COPY . /deploy
WORKDIR /deploy
RUN npm install
WORKDIR /data
CMD cd /deploy; npx forever app.js
