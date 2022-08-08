// read the official promise implement and it is similar to our implement that use this to connect the former with the latter promise.
class MyPromise {
  constructor(exec) {
    this.resolveCbs = []
    this.latterResolve = null
    exec(this.resolve.bind(this))
  }
  resolve(data) {
    this.resolveCbs.forEach((cb) => {
      let res = cb(data)
      if (res instanceof MyPromise) {
        res.then((d) => {
          this.latterResolve(d)
        })
      } else {
        this.latterResolve(res)
      }
    })
  }
  then(success, error) {
    this.resolveCbs.push(success)
    return new MyPromise((resolve, reject) => {
      // this is the core code, 'this' is the former promise instance
      // so this concept is similar to the observable chain
      this.latterResolve = resolve
    })
  }
}


//Test
var pro = new MyPromise((resolve, reject) => {
  setTimeout(() => {
    resolve(1)
  }, 1000)
})

// pro
//   .then((data) => {
//     console.log('this is first promise data ' + data)
//     return 2
//   })
//   .then((data) => {
//     console.log('this is second promise data ' + data)
//     return new MyPromise((resolve, reject) => {
//       setTimeout(() => {
//         resolve(3)
//       }, 1000)
//     })
//   })
//   .then((data) => {
//     console.log('this is third promise data ' + data)
//   })

pro.then((data) => {
  console.log('first instance data' + data)
  return new MyPromise((resolve, reject) => {
    setTimeout(() => {
      resolve(3) 
    }, 1000)
  })
}).then((data) => {
  console.log('first instance second promise' + data)
})

pro.then((data) => {
  console.log('second instance data' + data)
  return 4
}).then((data) => {
  console.log('second instance second promise' + data)
})