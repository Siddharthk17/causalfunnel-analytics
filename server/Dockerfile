FROM node:20-alpine
WORKDIR /app
COPY server/package.json ./
RUN npm install --omit=dev
COPY server/src ./src
COPY tracker /tracker
COPY demo /demo
ENV PORT=4000
EXPOSE 4000
CMD ["node", "src/server.js"]
