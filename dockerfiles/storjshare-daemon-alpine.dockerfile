FROM node:boron-alpine
MAINTAINER Marcel O'Neil <marcel@marceloneil.com>

RUN apk add --no-cache bash g++ git make python vim && \
node --version && \
npm --version && \
python --version && \
npm install --global storjshare-daemon && \
npm cache clean && \
storjshare --version

CMD []
ENTRYPOINT ["/bin/bash"]
