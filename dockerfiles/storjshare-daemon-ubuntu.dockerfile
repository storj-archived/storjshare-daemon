FROM ubuntu:latest
MAINTAINER Storj Labs (bill@storj.io)

RUN apt-get update && \
apt-get -y install apt-utils curl && \
curl -sL https://deb.nodesource.com/setup_6.x | bash - && \
apt-get -y install build-essential git libssl-dev nodejs python vim && \
npm install --global storjshare-daemon --unsafe-perm && \
apt-get --purge remove -y apt-utils build-essential curl git libssl-dev python vim && \
apt autoremove -y && \
apt-get clean -y && \
rm -rf /var/lib/apt/lists/* && \
rm -rf /tmp/npm* && \
echo npm --version; npm --version && \
echo storjshare --version; storjshare --version

EXPOSE 4000
EXPOSE 4001
EXPOSE 4002
EXPOSE 4003
