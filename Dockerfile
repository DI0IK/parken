FROM alpine:3.21.3 AS build

COPY . /app

WORKDIR /app

RUN apk add --no-cache \
    nodejs \
    npm

RUN npm install

RUN npx tsc

FROM alpine:3.21.3

COPY --from=build /app/dist /app/dist
COPY --from=build /app/client /app/client
COPY --from=build /app/node_modules /app/node_modules

WORKDIR /app

RUN apk add --no-cache \
    nodejs

EXPOSE 3000
VOLUME /data

CMD ["node", "dist/index.js"]
