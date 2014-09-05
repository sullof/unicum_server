#!/bin/bash

# THE DATA CONTAINER
# checking if the data container has been already started
ID=$(docker inspect --format '{{ .Id }}' unicum_data)
# only if it doesn't exist
if [ -z "$ID" ]; then
docker run \
    --name unicum_data \
    -v /data \
    -v /unicum/log \
    busybox \
    true
fi
# notice that this is a pure data container that is shown only with
#   docker ps -a
# because it starts and stops immediately

# THE REDIS CONTAINER
# if the unicum_redis container is running we stop and delete it
ID=$(docker inspect --format '{{ .Id }}' unicum_redis)
if [ ! -z "$ID" ]; then
    docker stop unicum_redis
    docker rm unicum_redis
fi
# we don't loose data because they are stored in unicum_data

# we run the redis server.
# If you want to allow the access not only locally, you would set the port like
#   -p 6379:6379
# and you should set a password uncommenting the requirepass command
docker run -d \
    --volumes-from unicum_data \
    --name unicum_redis \
    dockerfile/redis \
    redis-server /etc/redis/redis.conf \
    --appendonly yes #--requirepass <password>

ID=$(docker inspect --format '{{ .Id }}' unicum)
if [ ! -z "$ID" ]; then
    docker stop unicum
    docker rm unicum
fi

# THE UNICUM CONTAINER
# if you put the unicum-config.js file not in the current folder change the
#   -v .:/config
# to
#   -v /your/path/to/config:config
#
# if the config file doesn't exist the server will generate
# only keys according the default configuration
#

docker run -d \
    --name unicum \
    -v "$PWD":/unicum_config \
    --link unicum_redis:unicum_redis \
    --volumes-from unicum_data \
    sullof/unicum
# If you are using a password for redis, you have to communicate this to the unicum server
# in the variable $PASSWORD. For example you can do this changing the line
#   -p 6961 \
# to
#   -p 6961 -e PASSWORD=<password> \
#

# When you add new key types in the unicum_config.js file you just need to run
# this script again to restart correctly the server