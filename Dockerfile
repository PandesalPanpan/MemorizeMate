# --- build stage ---
FROM node:20-alpine AS build
WORKDIR /app

ARG VITE_APP_NAME
ARG VITE_PUSH_ENDPOINT
ARG APP_VERSION
ENV VITE_APP_NAME=$VITE_APP_NAME
ENV VITE_PUSH_ENDPOINT=$VITE_PUSH_ENDPOINT
ENV APP_VERSION=$APP_VERSION

COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# --- serve stage ---
FROM nginx:1.27-alpine AS prod
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
