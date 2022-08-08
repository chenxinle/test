// Based on https://github.com/airbnb/babel-plugin-dynamic-import-webpack
// We've added support for SSR with this version
import * as template from 'babel-template'
import syntax from '@babel/plugin-syntax-dynamic-import'
import { dirname, resolve, sep, join, relative } from 'path'
import * as fs from 'fs'

const TYPE_IMPORT = 'Import'
const TYPE_TEMPLATE = 'TemplateLiteral'

/*
 Added "typeof require.resolveWeak !== 'function'" check instead of
 "typeof window === 'undefined'" to support dynamic impports in non-webpack environments.
 "require.resolveWeak" and "require.ensure" are webpack specific methods.
 They would fail in Node/CommonJS environments.
*/

const buildImport = (name) => (template(`
(
  new (require('@iherb-react-environment/components').SameLoopPromise)((resolve, reject) => {
    const weakId = require.resolveWeak(SOURCE)
    try {
      const weakModule = __webpack_require__(weakId)
      return resolve(weakModule)
    } catch (err) {}
    require.ensure([], (require) => {
      try {
        let m = require(SOURCE)
        m.__webpackChunkName = '${name}'
        resolve(m)
      } catch(error) {
        reject(error)
      }
    }, SOURCE);
  })
)
`))

const buildSwitchCase = (option) => (`
  case '${option.name}': {
    const weakId = require.resolveWeak('${option.chunkName}')
      try {
        const weakModule = __webpack_require__(weakId)
        return resolve(weakModule)
      } catch (err) {}
      require.ensure(['${option.chunkName}'], (require) => {
        try {
          let m = require('${option.chunkName}')

          m.__webpackChunkName = '${option.chunkName}'
          resolve(m)
        } catch(error) {
          reject(error)
        }
      }, '${option.chunkName}');
    }
    break;
    
`) 

// const buildMultiImport = (names) => (template(`
//     require(SOURCE + VARIABLE)
// `))


const buildMultiImport = (names) => (template(`
(
  new (require('@iherb-react-environment/components').SameLoopPromise)((resolve, reject) => {
    switch(VARIABLE) {
      ${names.map(name => buildSwitchCase(name)).join('')}
    }
  })
)
`))

export function resolveModule (sourceFilename, moduleName) {
  const modulePath = (moduleName[0] === '.')
    ? resolve(dirname(sourceFilename), moduleName) : 
      resolve(process.cwd(), 'node_modules', moduleName)
  
  return modulePath
} 

export function getModulePath (sourceFilename, moduleName) {
  // resolve only if it's a local module
  const modulePath = (moduleName[0] === '.')
    ? resolve(dirname(sourceFilename), moduleName) : moduleName

  const cleanedModulePath = modulePath
    .replace(/(index){0,1}\.js$/, '') // remove .js, index.js
    .replace(/[/\\]$/, '')
    .replace(/\\/g, '/') // remove end slash

  return cleanedModulePath
}

const getAllPaths = (directory, regex, globPath) => {
  var files = fs.readdirSync(directory),
      paths = [];

  var match = globPath.match(regex);

  files.forEach(file => {
    // var match = file.match(regex);
    // if(match && match[1]) {
    //   paths.push(match[1])
    // }
    var filePath = resolve(directory, file);

    if(fs.lstatSync(filePath).isDirectory()){
      var hasIndex = false;
      fs.readdirSync(filePath).forEach(child => {
        if(!hasIndex && /index\.|index$/g.test(child)) {
          hasIndex = true
        }
      })

      if(hasIndex) {
        var chunkName = match && match[1] ? globPath.replace(match[1], file) : file;

        paths.push({
          name: file,
          chunkName
        })
      }
    } else if(!/package\.json$|package$/g.test(file)){
      var chunkName = match && match[1] ? globPath.replace(match[1], file) : file;

        paths.push({
          name: file,
          chunkName
        })
    }
  });

  return paths
}

export default () => ({
  inherits: syntax,

  visitor: {
    CallExpression (path, state) {      

      if (path.node.callee.type === TYPE_IMPORT) {
        
        var moduleName = path.node.arguments[0].value;
        // if(!/\.(js|json)$/.test(moduleName))
        //   moduleName += '.js'

        if(!moduleName) {
          
          if(path.node.arguments[0].type === TYPE_TEMPLATE) {
            var regex = '',
                globPath = '',
                base = '';

            path.node.arguments[0].quasis.forEach(element => {
              if(element.value.raw) {
                  regex += element.value.raw + '(.*)'
                  globPath += element.value.raw + '*'
                  base += element.value.raw + 'VARIABLE'
              }
            })
            
            var variable = path.node.arguments[0].expressions;
            var np = resolveModule(state.file.opts.filename, globPath)

            // var modules = [];
            // var regName = new RegExp(regex);
            // var moduleGlob = glob(np).then(mgs => {
            //   modules = mgs.map(m => {
            //     var match = m.match(regName),
            //         name = match && match[1] ? match[1] : '';

            //     return {
            //       name,
            //       chunkName: m
            //     }
            //   })

            //   const newImport = buildMultiImport(modules)({
            //     VARIABLE: variable,
            //     SOURCE: path.node.arguments
            //   })
                
            //   path.replaceWith(newImport)
            // })
            
            var regName = new RegExp(regex);
            var modules = getAllPaths(dirname(np), regName, globPath);

            const newImport = buildMultiImport(modules)({
              VARIABLE: variable
            })
              
            path.replaceWith(newImport)
          }
        } else {
          moduleName = moduleName.replace(/(index){0,1}\.js$/, '').replace(/\\/g, '/')//getModulePath(state.file.opts.filename, moduleName);

          //console.log(moduleName)

          const newImport = buildImport(moduleName)({
            SOURCE: path.node.arguments
          })
            
          path.replaceWith(newImport)
        }
        
        // const sourceFilename = state.file.opts.filename
        
        // const modulePath = getModulePath(sourceFilename, moduleName)
        // const modulePathHash = Crypto.createHash('md5').update(modulePath).digest('hex')

        // const relativeModulePath = modulePath//.replace(`${process.cwd()}${sep}`, '')
        // const name = modulePath.replace(/\\/g, '/')//`${relativeModulePath.replace(/[^\w]/g, '_')}_${modulePathHash}`

        // const newImport = buildImport(moduleName)({
        //   SOURCE: path.node.arguments
        // })
          
        // path.replaceWith(newImport)
      }
    }
  }
})