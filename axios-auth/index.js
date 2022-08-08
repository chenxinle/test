const axios = require('axios')

var headers = {
  'Authorization': 'Basic eGlubGVjaGVuX2loZXJiOmpkbVFVaHdxYkV3TnZwSzlWZHZl',
};

axios({
  method: 'POST',
  url: `https://api.bitbucket.org/2.0/repositories/iherbllc/catalog.mobile/refs/branches`,
  headers,
  data: {
    "name": "test-remote-create-branch",
    "target": {
      "hash": "master"
    }
  }
}).then((res) => {
  console.log(res.data)
}).catch((err) => {
  console.log(err.response.data)
})