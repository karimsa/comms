const fs = require('fs')
const fldsmdfr = require('../')
const sock = fldsmdfr.createClient('localhost:8080', {
  user: 'bob',
  key: fs.readFileSync(__dirname + '/keys/bob.key'),
  server_key: fs.readFileSync(__dirname + '/keys/alice.pub')
})

sock.on('error', console.log)

sock.model('reply', { message: 'string' })
sock.on('reply', ({ message }) => {
  console.log('server says: %j', message)
})

sock.connect(() => {
  sock.emit('message', { message: 'Hello, world' })
})