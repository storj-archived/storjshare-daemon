FROM ubuntu:latest
MAINTAINER Storj Labs (bill@storj.io)

#Ubuntu Updates
RUN apt-get update && apt-get -y upgrade

#Install curl
RUN apt-get -y install curl

#Force Nodejs version 6.x.x
#Install vim - Text Editor / libssl / curl / nodejs / git / python / build tools
RUN curl -sL https://deb.nodesource.com/setup_6.x | bash - && \
apt-get -y install vim libssl-dev nodejs git python build-essential

#Test Node.js / NPM / Python
RUN node --version && \
npm --version && \
python --version

#Installs storjshare-daemon
RUN npm install --global storjshare-daemon

#Test storjshare-daemon
RUN storjshare --version

CMD []
ENTRYPOINT ["/bin/bash"]
