//To write the library byself will help to understand it.
//so there are two method to deal the chain call, one is return method, the other one is this method.

/**
 * The following words is definitely explain the composition
 * Composite objects are formed by putting objects together such that each of the latter is ‘part of’ the former
 * 
*/
const middleware1 = function(next) {
  console.log('init middleware 1')
  return (args) => {
    console.log('middleware1 enhance')
    return next(args)
  }
}
const middleware2 = function (next) {
  console.log("init middleware 2");
  return (args) => {
    console.log('middleware2 enhance')
    return next(args)
  }
};
const middleware3 = function(next) {
  console.log('init middleware 3')
  return (args) => {
    console.log('middleware3 enhance')
    return next(args)
  }
}

function compose(...chain) {
  return chain.reduce((a, b) => {
    return (args) => a(b(args))
  })
}

// this place we use redux middleware to show middleware compose logic
// redux middleware's mission is to enhance dispatch, so we must send the
// original dispatch that will be called at last, so we can call the reducers
// and so on that includes all the reudx underlying logic.
function dispatch(args) {
  console.log('this is origin dispatch', args)
}

const composed = compose(middleware1, middleware2, middleware3)
// (args) => m1(m2(m3(args)))
const enhancedDispatch = composed(dispatch)
// (args) => m1(m2(m3(args)))(dispatch) step 1
// m1(m2(m3(dispatch))) step 2
// (args) => {
//   console.log('middleware1, enhance')
//   return (args) => {
//     console.log('middleware2, enhance')
//     return (args) => {
//       console.log('middleware3, enhance')
//       return dispatch(args)
//     }(args)
//   }(args)
// }

//so this place can pass the type: test to all the middleware through args above
enhancedDispatch({
  type: 'test'
})