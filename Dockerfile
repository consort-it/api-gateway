FROM node:7.4
MAINTAINER Meik Minks "meik.minks@consort-it.de"

# Create app directory
RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

RUN npm install forever -g

# Install app dependencies
COPY package.json /usr/src/app/
RUN npm install

# Bundle app source
COPY . /usr/src/app

EXPOSE 81
EXPOSE 82

CMD [ "forever", "app/api-gateway2.js" ]