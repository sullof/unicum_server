FROM node:0.10.30

ADD app /usr/src/app
WORKDIR /usr/src/app

# install your application's dependencies
RUN npm install

VOLUME ['/unicum/config','/unicum/log']

# replace this with your application's default port
EXPOSE 6961

# replace this with your main "server" script file
CMD [ "node", "server.js" ]