#
# Dockerfile assumes you have already done the package.json build.
#

FROM node:10.15.3-stretch-slim

RUN mkdir /app

WORKDIR /app

# Unlike Linux cp, Docker copy of directories to the workdir must be done one at a time
COPY "@types" "@types"
COPY build build
COPY lib lib
COPY node_modules node_modules

# And a spare file
COPY package.json .

ENTRYPOINT ["node", "build/lib/index.js"]
# Make sure to override the CMD when starting a container
CMD ["-h"]

