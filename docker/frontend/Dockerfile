# مرحله 1: ساخت با Node.js
FROM node:20-alpine AS build
WORKDIR /app

# کپی package.json و نصب وابستگی‌ها
COPY src/main/resources/frontend/package*.json ./
RUN npm install

# کپی کل سورس فرانت‌اند
COPY src/main/resources/frontend/ ./

# ساخت پروژه (خروجی در پوشه dist)
RUN npm run build

# مرحله 2: سروینگ با Nginx
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]