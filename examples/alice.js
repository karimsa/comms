const fs = require('fs')
const comms = require('../')
const server = comms({
  key: fs.readFileSync(__dirname + '/keys/alice.key'),
  clients: {
    bob: fs.readFileSync(__dirname + '/keys/bob.pub')
  }
})

server.on('error', console.log)
server.model('message', { message: 'string' })

server.on('connection', (sock, who) => {
  sock.on('message', ({ message }) => {
    console.log('%s (from %s:%s) says "%s"', who.user, who.address, who.port, message)
  })
})

server.listen(8080, () => console.log('Listening :8080'))