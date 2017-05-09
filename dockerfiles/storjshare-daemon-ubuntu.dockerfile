FROM ubuntu:latest
MAINTAINER Storj Labs (bill@storj.io)

RUN apt-get update && apt-get -y upgrade && \
apt-get -y install apt-utils curl && \
curl -sL https://deb.nodesource.com/setup_6.x | bash - && \
apt-get -y install vim libssl-dev nodejs git python build-essential && \
node --version && \
npm --version && \
python --version && \
npm install --global storjshare-daemon && \
storjshare --version

CMD []
ENTRYPOINT ["/bin/bash"]
