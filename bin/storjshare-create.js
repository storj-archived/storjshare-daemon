#!/usr/bin/env node

'use strict';

const blindfold = require('blindfold');
const editor = require('editor');
const {homedir} = require('os');
const fs = require('fs');
const storj = require('storj-lib');
const path = require('path');
const mkdirp = require('mkdirp');
const stripJsonComments = require('strip-json-comments');
const storjshare_create = require('commander');
const {execSync} = require('child_process');

const defaultConfig = JSON.parse(stripJsonComments(fs.readFileSync(
  path.join(__dirname, '../example/farmer.config.json')
).toString()));

function vimIsInstalled() {
  try {
    execSync('which vim');
  } catch (err) {
    return false;
  }

  return true;
}

storjshare_create
  .description('generates a new share configuration')
  .option('--sjcx <addr>', 'specify the sjcx address (required)')
  .option('--key <privkey>', 'specify the private key')
  .option('--storage <path>', 'specify the storage path')
  .option('--size <maxsize>', 'specify share size (ex: 10GB, 1TB)')
  .option('--rpcport <port>', 'specify the rpc port number')
  .option('--rpcaddress <addr>', 'specify the rpc address')
  .option('--maxtunnels <tunnels>', 'specify the max tunnels')
  .option('--tunnelportmin <port>', 'specify min gateway port')
  .option('--tunnelportmax <port>', 'specify max gateway port')
  .option('--manualforwarding', 'do not use nat traversal strategies')
  .option('--logdir <path>', 'specify the log directory')
  .option('--noedit', 'do not open generated config in editor')
  .option('-o, --outfile <writepath>', 'write config to path')
  .parse(process.argv);

if (!storjshare_create.sjcx) {
  console.error('\n  no payment address was given, try --help');
  process.exit(1);
}

if (!storjshare_create.key) {
  storjshare_create.key = storj.KeyPair().getPrivateKey();
}

if (!storjshare_create.storage) {
  storjshare_create.storage = path.join(
    homedir(),
    '.config/storjshare/shares',
    storj.KeyPair(storjshare_create.key).getNodeID()
  );
  mkdirp.sync(storjshare_create.storage);
}

if (!storjshare_create.outfile) {
  storjshare_create.outfile = path.join(
    homedir(),
    '.config/storjshare/configs',
    storj.KeyPair(storjshare_create.key).getNodeID() + '.json'
  );
}

if (!storjshare_create.logdir) {
  storjshare_create.logdir = path.join(
    homedir(),
    '.config/storjshare/logs'
  );
}

let exampleConfigPath = path.join(__dirname, '../example/farmer.config.json');
let exampleConfigString = fs.readFileSync(exampleConfigPath).toString();

function getDefaultConfigValue(prop) {
  return {
    value: blindfold(defaultConfig, prop),
    type: typeof blindfold(defaultConfig, prop)
  };
}

function replaceDefaultConfigValue(prop, value) {
  let defaultValue = getDefaultConfigValue(prop);

  function toStringReplace(prop, value, type) {
    switch (type) {
      case 'string':
        value = value.split('\\').join('\\\\'); // NB: Hack windows paths
        return`"${prop}": "${value}"`;
      case 'boolean':
      case 'number':
        return `"${prop}": ${value}`;
      default:
        return '';
    }
  }

  prop = prop.split('.').pop();
  exampleConfigString = exampleConfigString.replace(
    toStringReplace(prop, defaultValue.value, defaultValue.type),
    toStringReplace(prop, value, defaultValue.type)
  );
}

replaceDefaultConfigValue('paymentAddress', storjshare_create.sjcx);
replaceDefaultConfigValue('networkPrivateKey', storjshare_create.key);
replaceDefaultConfigValue('storagePath',
                          path.normalize(storjshare_create.storage));
replaceDefaultConfigValue('loggerOutputDirectory',
                          path.normalize(storjshare_create.logdir));

const optionalReplacements = [
  { option: storjshare_create.size, name: 'storageAllocation' },
  { option: storjshare_create.rpcaddress, name: 'rpcAddress' },
  { option: storjshare_create.rpcport, name: 'rpcPort' },
  { option: storjshare_create.maxtunnels, name: 'maxTunnels' },
  { option: storjshare_create.tunnelportmin, name: 'tunnelGatewayRange.min' },
  { option: storjshare_create.tunnelportmax, name: 'tunnelGatewayRange.max' },
  { option: storjshare_create.manualforwarding, name: 'doNotTraverseNat' }
];

optionalReplacements.forEach((repl) => {
  if (repl.option) {
    replaceDefaultConfigValue(repl.name, repl.option);
  }
});

let outfile = path.isAbsolute(storjshare_create.outfile) ?
                path.normalize(storjshare_create.outfile) :
                path.join(process.cwd(), storjshare_create.outfile);

try {
  fs.writeFileSync(outfile, exampleConfigString);
} catch (err) {
  console.log (`\n  failed to write config, reason: ${err.message}`);
  process.exit(1);
}

console.log(`\n  * configuration written to ${outfile}`);

if (!storjshare_create.noedit) {
  console.log('  * opening in your favorite editor to tweak before running');
  editor(outfile, {
    // NB: Not all distros ship with vim, so let's use GNU Nano
    editor: process.platform === 'win32'
            ? null
            : (vimIsInstalled() ? 'vim' : 'nano')
  }, () => {
    console.log('  ...');
    console.log(`  * use new config: storjshare start --config ${outfile}`);
  });
}
