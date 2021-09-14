FROM node:latest

COPY . /code

WORKDIR /code

RUN npm i
RUN wget https://s3.amazonaws.com/rds-downloads/rds-combined-ca-bundle.pem

ENTRYPOINT ["/bin/bash", "-c"]
CMD ["npm run migration"]
