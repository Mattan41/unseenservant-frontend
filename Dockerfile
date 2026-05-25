# Steg 1: Byggfasen (Använd Node 22 LTS)
FROM node:22-alpine AS build
WORKDIR /app

# Kopiera package-filer och installera beroenden
COPY package*.json ./
RUN npm ci

# Kopiera resten av källkoden och bygg applikationen
COPY . .
RUN npm run build

# Steg 2: Körfasen (Nginx)
FROM nginx:alpine

# Kopiera det färdiga bygget från föregående steg
COPY --from=build /app/dist /usr/share/nginx/html

# Kopiera din Nginx-konfiguration
COPY ./nginx/default.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]