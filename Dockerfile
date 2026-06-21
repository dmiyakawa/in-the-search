FROM node:20-bookworm-slim AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM httpd:2.4 AS web

COPY --from=build /app/dist/ /usr/local/apache2/htdocs/
