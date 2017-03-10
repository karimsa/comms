const fs = require('fs')
const fldsmdfr = require('../')
const sock = fldsmdfr.connect('localhost:8080', {
  user: 'bob',
  key: fs.readFileSync(__dirname + '/keys/bob.key'),
  server_key: fs.readFileSync(__dirname + '/keys/alice.pub')
})

sock.on('error', console.log)

sock.on('ready', () => {
  sock.emit('message', { message: 'Hello, world' })
})
