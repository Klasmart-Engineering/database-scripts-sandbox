FROM node:latest

COPY . /home

WORKDIR /home

RUN npm i
RUN wget https://s3.amazonaws.com/rds-downloads/rds-combined-ca-bundle.pem

ENTRYPOINT ["/bin/bash", "-c"]
CMD ["npm run migration"]
