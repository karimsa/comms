#!/usr/bin/env node

/**
 * scripts/gen.js - fldsmdfr
 * 
 * Licensed under MIT.
 * Copyright (C) 2017 Karim Alibhai.
 */

const fs = require('fs')
const path = require('path')
const crypto = require('crypto')

const program =
  require('commander')
    .version(require('../package.json').version)
    .description('Generates a new ECDH key pair.')
    .option('-a, --algo [algo]', 'Use [algo] curve algorithm to generate key pair.', 'secp256k1')
    .option('-o, --out [directory]', 'Export key pair in [directory].', process.cwd())
    .option('-l, --list', 'List all algorithms.')
    .parse(process.argv)

// list algorithms if asked for
if ( program.list ) {
  console.log('Supported curves:')
  console.log(crypto.getCurves().map(c => `  - ${c}`).join('\n'))

  process.exit(0)
}

// verify that algorithm is supported
if ( crypto.getCurves().indexOf(program.algo) === -1 ) {
  program.help()
}

// fix directory, to support relative paths
const outputDir = path.resolve(process.cwd(), program.out)

// keypair name
const keyName = program.args[0] || 'server'

// create ecdh handle
const ecdh = crypto.createECDH(program.algo)

// write public key + generate key pair
fs.writeFileSync(path.resolve(outputDir, keyName + '.pub'), ecdh.generateKeys().toString('base64'))

// write private key
fs.writeFileSync(path.resolve(outputDir, keyName + '.key'), ecdh.getPrivateKey().toString('base64'))