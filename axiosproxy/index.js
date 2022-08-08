var axios = require('axios').default

const testHost = 'test'
const preProdHost = 'preprod'
const SocksProxyAgent = require('socks-proxy-agent');

axios.get(`https://catalog.app.iherbtest.com/domains/US`, {
  // socketPath: 'socks5://172.16.80.136:3389'
  httpsAgent: new SocksProxyAgent(`socks5://172.16.80.136:3389`),
  timeout: 1000
}).then((data) => {
  console.log(data.data)
}).catch((err) => {
  console.log(err)
})