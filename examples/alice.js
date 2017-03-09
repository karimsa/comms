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
server.on('message', ({ message }, { address, port }) =>
  console.log('%s:%s says "%s"', address, port, message)
)

server.listen(8080, () => console.log('Listening :8080'))