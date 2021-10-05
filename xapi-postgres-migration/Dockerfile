FROM node:latest

COPY . /home

WORKDIR /home

RUN wget https://s3.amazonaws.com/rds-downloads/rds-combined-ca-bundle.pem
RUN npm install -g typescript ts-node
RUN npm i

ENTRYPOINT ["/bin/bash", "-c"]
CMD ["npm run migration"]
