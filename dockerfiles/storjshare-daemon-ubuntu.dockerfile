FROM ubuntu:latest
MAINTAINER Storj Labs (bill@storj.io)

#Ubuntu Update
RUN apt-get update
RUN apt-get -y upgrade
RUN apt-get -y dist-upgrade

#Install vim - Text Editor
RUN apt-get -y install vim

#Installs curl
RUN apt-get -y install curl

#Installs Node.js force version 6.x.x
RUN curl -sL https://deb.nodesource.com/setup_6.x | bash -
RUN apt-get -y install nodejs

#Test Node.js and NPM
RUN node --version
RUN npm --version

#Installs Python and Build Tools
RUN apt-get -y install git python build-essential

#Test Python
RUN python --version

#Installs storjshare-daemon
RUN npm install --global storjshare-daemon

#Test storjshare-daemon
RUN storjshare --version

CMD []
ENTRYPOINT ["/bin/bash"]
