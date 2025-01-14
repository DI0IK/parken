FROM alpine:3.21.2 AS build

COPY . /app

WORKDIR /app

RUN apk add --no-cache \
    nodejs \
    npm

RUN npm install

RUN npm run build

FROM alpine:3.21.2

COPY --from=build /app/server/index.js /app/server/index.js
COPY --from=build /app/client /app/client
COPY --from=build /app/node_modules /app/node_modules

WORKDIR /app

RUN apk add --no-cache \
    nodejs

EXPOSE 3000
VOLUME /data

CMD ["node", "server/index.js"]
