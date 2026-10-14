# syntax=docker/dockerfile:1
FROM node:22-alpine AS build
WORKDIR /app

ARG VITE_USER_NODE_ENV=prod
ENV VITE_USER_NODE_ENV=$VITE_USER_NODE_ENV

COPY package*.json ./
RUN --mount=type=cache,target=/root/.npm npm ci --ignore-scripts

COPY . .
RUN npm run build

FROM nginx:alpine

COPY --from=build /app/dist /usr/share/nginx/html

COPY ./nginx/default.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]