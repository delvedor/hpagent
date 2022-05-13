'use strict'

const got = require('got')
const test = require('ava')
const { testCaseMatrix, createServer, createProxy, SERVER_HOSTNAME, PROXY_HOSTNAME } = require('./utils')

testCaseMatrix.forEach(({ description, AgentUnderTest, secureServer, secureProxy }) => {
  test(`${description}`, async t => {
    const server = await createServer(secureServer)
    const proxy = await createProxy(secureProxy)
    server.on('request', (req, res) => res.end('ok'))

    const response = await got(`${secureServer ? 'https' : 'http'}://${SERVER_HOSTNAME}:${server.address().port}`, {
      agent: {
        http: new AgentUnderTest({
          keepAlive: true,
          keepAliveMsecs: 1000,
          maxSockets: 256,
          maxFreeSockets: 256,
          scheduling: 'lifo',
          proxy: `${secureProxy ? 'https' : 'http'}://${PROXY_HOSTNAME}:${proxy.address().port}`
        })
      }
    })

    t.is(response.body, 'ok')
    t.is(response.statusCode, 200)

    server.close()
    proxy.close()
  })
})
