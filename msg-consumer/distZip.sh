#!/bin/bash
# Produces a new distribution zip in the dist/ subdir.
# Assumes you have already done a typescript build.

ZIP_BASE_NAME=msg-consumer

rm -rf node_modules
npm install --production

if [ -e dist ]; then
    rm -rf dist/*
else
    mkdir dist
fi

cd build
ln -s ../node_modules .
zip -r ../dist/$ZIP_BASE_NAME \
    index.js \
    lib \
    node_modules
rm node_modules # only the symlink
