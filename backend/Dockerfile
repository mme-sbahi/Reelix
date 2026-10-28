# ---- Base ----
FROM node:20-alpine AS base
WORKDIR /usr/src/app
COPY package*.json ./

# ---- Development ----
FROM base AS development
RUN npm install
COPY . .
EXPOSE 3001
CMD ["npm", "run", "start:dev"]

# ---- Build ----
FROM base AS build
RUN npm install
COPY . .
RUN npm run build

# ---- Production ----
FROM node:20-alpine AS production
WORKDIR /usr/src/app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm install --omit=dev
COPY --from=build /usr/src/app/dist ./dist
EXPOSE 3001
CMD ["node", "dist/main"]
