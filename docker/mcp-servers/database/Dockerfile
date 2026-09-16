FROM node:20-alpine
WORKDIR /app

# کپی فایل‌های مربوط به MCP سرور دیتابیس
COPY src/main/java/com/bako/backend/mcp-servers/database/package*.json ./
RUN npm install

COPY src/main/java/com/bako/backend/mcp-servers/database/ ./

EXPOSE 3001
CMD ["node", "server.js"]