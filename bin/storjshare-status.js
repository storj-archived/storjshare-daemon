#!/usr/bin/env node

'use strict';

const config = require('../lib/config');
const dnode = require('dnode');
const sock = dnode.connect(config.daemonRpcPort);

sock.on('remote', function(rpc) {
  rpc.status(function(err, shares) {
    // TODO: Format the shares data...
    console.log(shares);
    sock.end();
  });
});
