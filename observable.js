/**
 * 1. observable is like an array, can always chain call, because every method will return a array or observable.
 * 2. array can not deal with async task, so we need some technique to deal with it.
 * 3. we must try to write declarative code over imperative code, the declarative code does not have the implement details, so we can do some extensive things, if we write code in imperative mode, we will etch the code into some specific world.
 * 4. In RxJS, subjects are “stateful”, in that they maintain a list of subscribers that they multicast data to, similar to the subject in the classical observer pattern. By contrast, observables are really just functions that set up a context for observation, without holding onto state. 
 * 5. By itself, this Observable doesn’t do anything. It just provides the machinery for setting up observation for observers and their onNext, onError, and onComplete handlers.
 * 6. of, from, and fromEvent are some creational methods
*/

/**
 * observable's execute method is the data create and push area
 * subcribe method to allow data consumer to get the data that pushed from observable executor.
 * */ 

class Observable {
  constructor(subscribe) {
    this._subscribe = subscribe
  }
  subscribe(observer) {
    return this._subscribe(observer)
  }

  //of method is one of the data creator for observable
  static of(...args) {
    return new Observable((obs) => {
      args.forEach((arg) => {
        obs.onNext(arg)
      })
      obs.onComplete && obs.onComplete()

      return {
        unsubscribe: () => {
          obs = {}
        }
      }
    }) 
  }

  //fromEvent is also a data creator, but it can handle some async data
  static fromEvent(source, event) {
    return new Observable((obs) => {
       source.addEventListener(event, (e) => {
         obs.onNext(e)
       })
       return {
         unsubscribe: () => {
           source.removeEventListener(event)
         }
       }
    })
  }

  //from is also deal async method
  static from(asyncThing) {
    return new Observable((obs) => {
      asyncThing.then((data) => {
        obs.onNext(data)
      })
    })
  }

  //map is just a project fn, because this is not a creat method, so this method should be prototype method
  map(projectFn) {
    return new Observable((obs) => {
      /**
       * this code is rxjs's quintessence, this 'this' is bound to map method call this(use arrow function to bind), so who call map method,
       * 'this' is who, in the Test, of method return a observable instance, the instance call map method, so the this is the of method's
       * return observable, so this.subscribe is of method return observable's executor, the executor will use of args and then call onNext
       * with the data, the onNext method is map method pass observer onNext method, so map method can do some thing the map want, so this
       * can extend for other method like filter and so on. And when the of call onNext method, it will inject the data that latter observer
       * need
       * */
      return this.subscribe({
        onNext: (val) => {
          obs.onNext(projectFn(val))
        }
      })
    })
  }

  //filter
  /**
   * so if we use filter after map, this filter this will be the map method return observable, so this.subscribe will be the map method return
   * observable executor, so the core principle is that we add onNext one by one, but call onNext method will be the reverse direction, so this
   * is also an onion model.
  */
  filter(projectFn) {
    return new Observable((obs) => {
      return this.subscribe({
        onNext: (val) => {
          if (projectFn(val)) {
            obs.onNext(val)
          }
        }
      })
    })
  }

  //take
  take(count) {
    let c = 0
    return new Observable((obs) => {
      return this.subscribe({
        onNext: (val) => {
          if (c < count) {
            c++
            obs.onNext(val)
          }
        }
      })
    })
  }

  pipe(...operators) {
    /**
      return operation3(operation2(operation1(this)));
      所有的链式调用，或者compose调用其实就两种实现方式，之前也总结过，一种通过this传递上下文，一种通过闭包
      pipe可以看作是compose，通过闭包实现上下文传递，其实Observable核心是取到最开始of等源的数据，让数据在
     * 所有operators中流转，所以流转逻辑是提前添加上去的，就类似Promise的then方法一样，是提前添加上去的，只不过
     * 拿到数据之后开始推送。对Observable，of开始调用的是离自己最近的observe的onNext方法，所以第一个operator应该
     * 先添加到this上（即of对应的Observable）。Observable不同Operators可以工作的原理是重新定义onNext等方法
     * 
     */
    // 所以pipe return的是最后一个operator返回的Observable
    // pipe解决的问题是如果所有的operator都写在prototype上，那么一个实例的size会很大，所以为了tree shaking等优化，分离operators，用pipe组合
    return operators.reduce((prev, fn) => fn(prev), this)
  }
  //TODO: subject, redux-observable
}

function filter(fn) {
  return (observable) => (
    new Observable(observer => {
      observable.subscribe({
        onNext: val => fn(val) ? observer.onNext(val) : () => { },
        onComplete: () => observer.onComplete(),
      })
    })
  )
}

function map(fn) {
  return (observable) => (
    new Observable(observer => {
      observable.subscribe({
        onNext: val => observer.onNext(fn(val)),
        onComplete: () => observer.onComplete(),
      })
    })
  )
}

/**
 * merge的原理较为简单，把所有传入的observable进行for循环, 一般来说传入的observable都是自己链条的开始
 * 比如pipe返回的结果是最外层operator返回的observable，调用这个observable会触发此observable pipe中的所有operator
 * 所以这也是redux-observable实现遍历所有combined epic的原理，每一个epic都会pipe自己相关的逻辑
 * */
function merge(...observables) {
  return (observable) => {
    let onCompleteNum = 0;
    if (observable) {
      observables = [observable, ...observables];
    }
    return new Observable(observer => {
      observables.forEach(observable => {
        observable.subscribe({
          onNext: val => observer.onNext(val),
          onComplete: () => {
            onCompleteNum++;
            if (onCompleteNum === observables.length) {
              observer.onComplete()
            }
          },
        })
      })
    })
  }
}

/**
 * A Subject is a special type of Observable that allows values to be
 * multicasted to many Observers. Subjects are like EventEmitters.
 *
 * Every Subject is an Observable and an Observer. You can subscribe to a
 * Subject, and you can call next to feed values as well as error and complete.
 */
class Subject extends Observable {
  constructor() {
    super();
    this.observers = []; // 观察者列表
    this.closed = false;
    this.isStopped = false;
  }

  next(value) {
    if (this.closed) {
      throw new ObjectUnsubscribedError();
    }
    if (!this.isStopped) {
      const { observers } = this;
      const len = observers.length;
      const copy = observers.slice();
      for (let i = 0; i < len; i++) { // 循环调用观察者next方法，通知观察者
        copy[i].next(value);
      }
    }
  }
  complete() {
    if (this.closed) {
      throw new ObjectUnsubscribedError();
    }
    this.isStopped = true;
    const { observers } = this;
    const len = observers.length;
    const copy = observers.slice();
    for (let i = 0; i < len; i++) { // 循环调用观察者complete方法
      copy[i].complete();
    }
    this.observers.length = 0; // 清空内部观察者列表
  }
}


var observer = {
  onNext: function(val) {
    console.log('on Next ' + val)
  },
  onComplete: function() {
    console.log('on complete')
  }
}

//Test
let obs = Observable.of(1,2,3)
// obs.pipe(
//   map(x => x * 2),
//   filter(x => x === 4)
// )
// .subscribe(observer)

//merge
let obsMergeData = Observable.of(1,2,3)
let merged = merge(
  obsMergeData.pipe(map(x => x * 2)),
  obsMergeData.pipe(filter(x => x === 1))
)
merged().subscribe(observer)

//redux observable
/**
 * 这里其实是redux observable最外层的核心代码，epic$经过pipe后返回一个observable，这个observable订阅了store原生的dispatch用来触发原声redux的reducer
 * 所以pipe这里的代码可以翻译成{
 *  onNext: store.dispatch(fn(val))
 * }
 * 
 * fn即(epic) => {
 *  return epic(action$)
 * }
 * 所以意思就是epic先处理所有数据，把最终得到的值传给原生的dispatch 
 * 
 * fn的参数val是epic$的onNext方法注入的，因为map是pipe的最后一个operator，所以map中的observable就是调用pipe的observable实例，也就是epic$。
 */
var store = {
  dispatch: (action) => {
    console.log('this is original dispatch', action.type)
  }
}
let epic$ = new Subject()
let action$ = new Subject()
/**
 * map((epic) => {
    return epic(action$)
  })
  执行结果： (observable) => (
    new Observable(observer => {
      observable.subscribe({
        onNext: val => observer.onNext(fn(val)),
        onComplete: () => observer.onComplete(),
      })
    })
  )
  fn即(epic) => {
    return epic(action$)
  }

  在pipe中进行compose
  return值是    
    new Observable(observer => {
      this.subscribe({
        onNext: val => observer.onNext(fn(val)),
        onComplete: () => observer.onComplete(),
      })
    })
    这里的this就是epic$

  return的observable（即result$）进行subscribe
  即执行
    observer => {
      this.subscribe({
        onNext: val => observer.onNext(fn(val)),
        onComplete: () => observer.onComplete(),
      })
    } 
  执行结果是执行this.subscribe({
    onNext: val => store.dispatch(fn(val))
  })
  由于subject的_subscribe方法是向subject的observers数组里面push observer
  所以这里执行结果会想epic$的observer数组中push{
    onNext: val => store.dispatch((val) => {
      val(action$)
    })
  }

 * */
let result$ = epic$.pipe(
  map(epic => {
    return epic(action$)
  })
)
result$.subscribe({
  onNext: store.dispatch
})

//call on enhanced dispatch
action$.next({
  type: 'original action'
})

//call on init
/**
 * 在epicmiddleware.run中会执行next方法，就是取出上面push的observer，并执行onNext方法
 * {
    onNext: val => store.dispatch((val) => {
      val(action$)
    })
  }
 * 这个时候val就是epic$.next传入的rootEpic, 即rootEpic(action$)
 * rootEpic其实就是封装好的一个merge方法，调用rxjs的merge方法，给action$上挂上所有epic的pipe逻辑
 * 由于调用pipe的是同一个action$，所以会把所有的子epic逻辑都push都这个subject，即action$的observers数组中
 * 当调用action$.next的时候会遍历observers数组，即所有的子epic，并将原始action{
 *  type: 'original action'
 * }传递给所有子epic
 * 
 * 所有的子epic之所以只会有一个进入原生dispatch，是因为ofType operator，ofType 会用底层的filter，底层filter如果不满足条件
 * 会调用一个空函数，而不是继续调用onNext方法，onNext方法才会继续到store dispatch
 * */
const rootEpic = (...args) => merge(
  ...epics.map(epic => {
    const output$ = epic(...args);
    return output$;
  })
);
epic$.next(rootEpic)

//fromEvent
let obsFromEvent = Observable.fromEvent(document.body, 'click')
// obsFromEvent.subscribe(observer)

//operator
var obs1 = Observable.of(1,2,3)
  .map((val) => {
    return val * 10
  })
  .filter((val) => {
    return val === 10
  })
// obs1.subscribe(observer)

//from
var pro = new Promise((resolve, reject) => {
  setTimeout(() => {
    resolve(4)
  }, 2000)
})
var obs2 = Observable.from(pro)
  .map((val) => {
    return val * 10
  })
  .filter((val) => {
    return val === 40
  })
// obs2.subscribe(observer)

//take
var obs3 = Observable.of(1,2,3)
  .map((val) => {
    return val * 2
  })
  .take(2)
// obs3.subscribe(observer)

//mergeMap
/**
 * mergeMap主要是处理高阶Observable, 即一个observable的map返回的不是一个基本类型，而是一个observable
 * 之所以会有这个需求，可以举一个简单的例子来解释
 * 在web前端中经常会有用户点击一个按钮后发起一个http请求，请求回来后更新视图
 * 如果没有mergeMap，那么用rxjs写这段代码将会变得很冗余
 * Observable.fromEvent(button, 'click').subscribe(event => {
 
    Observable.interval(1000).subscribe(num => {
        console.log(num);
    });
    
  });
 * 
 * 用map进行改进
 *  const click$ = Observable.fromEvent(button, 'click');
    const interval$ = Observable.interval(1000);

    const clicksToInterval$ = click$.map(event => { 
      //此处就是高阶Observable
      return interval$;
    });

    clicksToInterval$.subscribe(intervalObservable$ => {
      
      intervalObservable$.subscribe(num => {
        console.log(num);
      });
      
    });
  * 这里看起来代码非常冗余，原因是observable是lazy的，必须订阅后observer才可以接收到推送的数据
  * 为了忽略这些内部的observable，直接到达外部的observer，可以使用mergeMap
  * 
  * const click$ = Observable.fromEvent(button, ‘click’);
    const interval$ = Observable.interval(1000);

    const observable$ = click$.mergeMap(event => { 
      return interval$;
    });

    observable$.subscribe(num => console.log(num));
  * 所以总结来说mergeMap有两个作用
  * 1. 让内部的observable不再需要subscribe
  * 2. 让observable之间的转换变得容易  
*/

/**
 * 这个简易版本的mergeMap写的非常清晰, 帮助内部observable subscribe, 并同时注入source，即调用mergeMap的observable注入的数据
 * 其次，实现原理与observable的链式调用原理基本类似，都是用this作为媒介
*/
function mergeMap(innerObservable) {

  /** the click observable, in our case */
  const source = this; 
  
  return new Observable(observer => {
    source.subscribe(outerValue => {
    
      /** innerObservable — the interval observable, in our case */
      innerObservable(outerValue).subscribe(innerValue => {
        observer.next(innerValue);
      });
      
   });
  });
 }