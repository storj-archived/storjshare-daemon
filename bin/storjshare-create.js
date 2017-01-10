#!/usr/bin/env node

'use strict';

const editor = require('editor');
const {tmpdir, homedir} = require('os');
const fs = require('fs');
const storj = require('storj-lib');
const path = require('path');
const mkdirp = require('mkdirp');
const config = require('../lib/config/daemon');
const storjshare_create = require('commander');

storjshare_create
  .option('-a, --sjcx <addr>', 'specify the sjcx address (required)')
  .option('-s, --storage <path>', 'specify the storage path')
  .option('-l, --logfile <path>', 'specify the logfile path')
  .option('-k, --privkey <privkey>', 'specify the private key')
  .option('-o, --outfile <writepath>', 'write config to path')
  .parse(process.argv);

if (!storjshare_create.sjcx) {
  console.error('\n  no payment address was given, try --help');
  process.exit(1);
}

if (!storjshare_create.privkey) {
  storjshare_create.privkey = storj.KeyPair().getPrivateKey();
}

if (!storjshare_create.storage) {
  storjshare_create.storage = path.join(
    homedir(),
    '.config/storjshare/shares',
    storj.KeyPair(storjshare_create.privkey).getNodeID()
  );
  mkdirp.sync(storjshare_create.storage);
}

if (!storjshare_create.logfile) {
  storjshare_create.logfile = path.join(
    homedir(),
    '.config/storjshare/logs',
    storj.KeyPair(storjshare_create.privkey).getNodeID() + '.log'
  );
}

let isWritingToTemp = false;

if (!storjshare_create.outfile) {
  isWritingToTemp = true;
  storjshare_create.outfile = path.join(
    tmpdir(),
    storj.KeyPair(storjshare_create.privkey).getNodeID() + '.json'
  );
}

let exampleConfigPath = path.join(__dirname, '../example/farmer.config.json');
let exampleConfigString = fs.readFileSync(exampleConfigPath).toString();

function replaceEmptyConfig(prop, value) {
  value = value.split('\\').join('\\\\'); // NB: Hack windows paths into JSON
  exampleConfigString = exampleConfigString.replace(
    `"${prop}": ""`,
    `"${prop}": "${value}"`
  );
}

replaceEmptyConfig('paymentAddress', storjshare_create.sjcx);
replaceEmptyConfig('networkPrivateKey', storjshare_create.privkey);
replaceEmptyConfig('storagePath', path.normalize(storjshare_create.storage));
replaceEmptyConfig('loggerOutputFile',
                   path.normalize(storjshare_create.logfile));

let outfile = isWritingToTemp || path.isAbsolute(storjshare_create.outfile) ?
                path.normalize(storjshare_create.outfile) :
                path.join(process.cwd(), storjshare_create.outfile);

try {
  fs.writeFileSync(outfile, exampleConfigString);
} catch (err) {
  console.log (`\n  failed to write config, reason: ${err.message}`);
  process.exit(1);
}

console.log(`\n  * configuration written to ${outfile}`);
console.log('  * opening in your favorite editor to tweak before running');
editor(outfile, () => {
  console.log('  ...');
  console.log(`  * use new config: storjshare start --config ${outfile}`);
});
