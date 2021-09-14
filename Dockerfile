FROM node:latest

COPY . /src

RUN cd /src && npm i

WORKDIR /src
ENTRYPOINT /bin/bash
CMD npm run migration
