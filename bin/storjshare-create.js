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
const utils = require('../lib/utils');

const defaultConfig = JSON.parse(stripJsonComments(fs.readFileSync(
  path.join(__dirname, '../example/farmer.config.json')
).toString()));

function whichEditor() {

  const editors = ['vi', 'nano'];

  function checkIsInstalled(editor) {
    try {
      execSync('which ' + editor);
    } catch (err) {
      return false;
    }

    return true;
  }

  for (let i = 0; i < editors.length; i++) {
    if (checkIsInstalled(editors[i])) {
      return editors[i];
    }
  }

  return null;
}

storjshare_create
  .description('generates a new share configuration')
  .option('--storj <addr>', 'specify the STORJ address (required)')
  .option('--key <privkey>', 'specify the private key')
  .option('--storage <path>', 'specify the storage path')
  .option('--size <maxsize>', 'specify share size (ex: 10GB, 1TB)')
  .option('--rpcport <port>', 'specify the rpc port number')
  .option('--rpcaddress <addr>', 'specify the rpc address')
  .option('--maxtunnels <tunnels>', 'specify the max tunnels')
  .option('--tunnelportmin <port>', 'specify min gateway port')
  .option('--tunnelportmax <port>', 'specify max gateway port')
  .option('--manualforwarding', 'do not use nat traversal strategies')
  .option('--verbosity <verbosity>', 'specify the logger verbosity')
  .option('--logdir <path>', 'specify the log directory')
  .option('--noedit', 'do not open generated config in editor')
  .option('-o, --outfile <writepath>', 'write config to path')
  .parse(process.argv);

if (!storjshare_create.storj) {
  console.error('\n  no payment address was given, try --help');
  process.exit(1);
}

if (!utils.isValidEthereumAddress(storjshare_create.storj)) {
  console.error('\n SJCX addresses are no longer supported. \
Please enter ERC20 compatible ETH wallet address');
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

if (storjshare_create.size &&
    !storjshare_create.size.match(/[0-9]+(T|M|G|K)?B/g)) {
  console.error('\n Invalid storage size specified: '+
                storjshare_create.size);
  process.exit(1);
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

let validVerbosities = new RegExp(/^[0-4]$/);
if (storjshare_create.verbosity &&
  !validVerbosities.test(storjshare_create.verbosity)) {
  console.error('\n  * Invalid verbosity.\n  * Accepted values: 4 - DEBUG | \
3 - INFO | 2 - WARN | 1 - ERROR | 0 - SILENT\n  * Default value of %s \
will be used.', getDefaultConfigValue('loggerVerbosity').value);
  storjshare_create.verbosity = null;
}

  prop = prop.split('.').pop();
  exampleConfigString = exampleConfigString.replace(
    toStringReplace(prop, defaultValue.value, defaultValue.type),
    toStringReplace(prop, value, defaultValue.type)
  );
}

replaceDefaultConfigValue('paymentAddress', storjshare_create.storj);
replaceDefaultConfigValue('networkPrivateKey', storjshare_create.key);
replaceDefaultConfigValue('storagePath',
                          path.normalize(storjshare_create.storage));
replaceDefaultConfigValue('loggerOutputFile',
                          path.normalize(storjshare_create.logdir));

const optionalReplacements = [
  { option: storjshare_create.size, name: 'storageAllocation' },
  { option: storjshare_create.rpcaddress, name: 'rpcAddress' },
  { option: storjshare_create.rpcport, name: 'rpcPort' },
  { option: storjshare_create.maxtunnels, name: 'maxTunnels' },
  { option: storjshare_create.tunnelportmin, name: 'tunnelGatewayRange.min' },
  { option: storjshare_create.tunnelportmax, name: 'tunnelGatewayRange.max' },
  { option: storjshare_create.manualforwarding, name: 'doNotTraverseNat' },
  { option: storjshare_create.verbosity, name: 'loggerVerbosity' }
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
  let currPath = path.dirname(outfile);
  let createIfNotExists = (dir) => {
	let curr = path.dirname(dir);
	if (!fs.existsSync(curr)) { createIfNotExists(curr) };
	if (!fs.existsSync(dir)) { fs.mkdirSync(dir) };
  };
  createIfNotExists(currPath);
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
            : whichEditor()
  }, () => {
    console.log('  ...');
    console.log(`  * use new config: storjshare start --config ${outfile}`);
  });
}
