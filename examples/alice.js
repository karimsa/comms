const fs = require('fs')
const fldsmdfr = require('../')
const server = fldsmdfr({
  key: fs.readFileSync(__dirname + '/keys/alice.key'),
  clients: {
    bob: fs.readFileSync(__dirname + '/keys/bob.pub')
  }
})

server.on('error', console.log)
server.on('invalidRoute', console.log)
server.on('unauthorizedRequest', console.log)
server.model('message', { message: 'string' })

server.on('connection', (sock, who) => {
  sock.on('error', console.log)
  sock.on('message', ({ message }) => {
    console.log('%s (from %s:%s) says "%s"', who.user, who.address, who.port, message)
    sock.emit('reply', { message: '"' + message + '" to you too' })
  })
})

server.listen(8080, () => console.log('Listening :8080'))
