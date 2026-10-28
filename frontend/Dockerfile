# ---- Base ----
FROM node:20-alpine AS base
WORKDIR /usr/src/app
COPY package*.json ./

# ---- Development ----
FROM base AS development
RUN npm install
COPY . .
EXPOSE 3000
CMD ["npm", "run", "dev"]

# ---- Build ----
FROM base AS build
RUN npm install
COPY . .
RUN npm run build

# ---- Production ----
FROM nginx:alpine AS production
COPY --from=build /usr/src/app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]