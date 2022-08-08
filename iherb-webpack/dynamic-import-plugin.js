"use strict";
exports.__esModule = true;
exports.getModulePath = exports.resolveModule = void 0;
// Based on https://github.com/airbnb/babel-plugin-dynamic-import-webpack
// We've added support for SSR with this version
var template = require("babel-template");
var plugin_syntax_dynamic_import_1 = require("@babel/plugin-syntax-dynamic-import");
var path_1 = require("path");
var fs = require("fs");
var TYPE_IMPORT = 'Import';
var TYPE_TEMPLATE = 'TemplateLiteral';
/*
 Added "typeof require.resolveWeak !== 'function'" check instead of
 "typeof window === 'undefined'" to support dynamic impports in non-webpack environments.
 "require.resolveWeak" and "require.ensure" are webpack specific methods.
 They would fail in Node/CommonJS environments.
*/
var buildImport = function (name) { return (template("\n(\n  new (require('@iherb-react-environment/components').SameLoopPromise)((resolve, reject) => {\n    const weakId = require.resolveWeak(SOURCE)\n    try {\n      const weakModule = __webpack_require__(weakId)\n      return resolve(weakModule)\n    } catch (err) {}\n    require.ensure([], (require) => {\n      try {\n        let m = require(SOURCE)\n        m.__webpackChunkName = '".concat(name, "'\n        resolve(m)\n      } catch(error) {\n        reject(error)\n      }\n    }, SOURCE);\n  })\n)\n"))); };
var buildSwitchCase = function (option) { return ("\n  case '".concat(option.name, "': {\n    const weakId = require.resolveWeak('").concat(option.chunkName, "')\n      try {\n        const weakModule = __webpack_require__(weakId)\n        return resolve(weakModule)\n      } catch (err) {}\n      require.ensure(['").concat(option.chunkName, "'], (require) => {\n        try {\n          let m = require('").concat(option.chunkName, "')\n\n          m.__webpackChunkName = '").concat(option.chunkName, "'\n          resolve(m)\n        } catch(error) {\n          reject(error)\n        }\n      }, '").concat(option.chunkName, "');\n    }\n    break;\n    \n")); };
// const buildMultiImport = (names) => (template(`
//     require(SOURCE + VARIABLE)
// `))
var buildMultiImport = function (names) { return (template("\n(\n  new (require('@iherb-react-environment/components').SameLoopPromise)((resolve, reject) => {\n    switch(VARIABLE) {\n      ".concat(names.map(function (name) { return buildSwitchCase(name); }).join(''), "\n    }\n  })\n)\n"))); };
function resolveModule(sourceFilename, moduleName) {
    var modulePath = (moduleName[0] === '.')
        ? (0, path_1.resolve)((0, path_1.dirname)(sourceFilename), moduleName) :
        (0, path_1.resolve)(process.cwd(), 'node_modules', moduleName);
    return modulePath;
}
exports.resolveModule = resolveModule;
function getModulePath(sourceFilename, moduleName) {
    // resolve only if it's a local module
    var modulePath = (moduleName[0] === '.')
        ? (0, path_1.resolve)((0, path_1.dirname)(sourceFilename), moduleName) : moduleName;
    var cleanedModulePath = modulePath
        .replace(/(index){0,1}\.js$/, '') // remove .js, index.js
        .replace(/[/\\]$/, '')
        .replace(/\\/g, '/'); // remove end slash
    return cleanedModulePath;
}
exports.getModulePath = getModulePath;
var getAllPaths = function (directory, regex, globPath) {
    var files = fs.readdirSync(directory), paths = [];
    var match = globPath.match(regex);
    files.forEach(function (file) {
        // var match = file.match(regex);
        // if(match && match[1]) {
        //   paths.push(match[1])
        // }
        var filePath = (0, path_1.resolve)(directory, file);
        if (fs.lstatSync(filePath).isDirectory()) {
            var hasIndex = false;
            fs.readdirSync(filePath).forEach(function (child) {
                if (!hasIndex && /index\.|index$/g.test(child)) {
                    hasIndex = true;
                }
            });
            if (hasIndex) {
                var chunkName = match && match[1] ? globPath.replace(match[1], file) : file;
                paths.push({
                    name: file,
                    chunkName: chunkName
                });
            }
        }
        else if (!/package\.json$|package$/g.test(file)) {
            var chunkName = match && match[1] ? globPath.replace(match[1], file) : file;
            paths.push({
                name: file,
                chunkName: chunkName
            });
        }
    });
    return paths;
};
exports["default"] = (function () { return ({
    inherits: plugin_syntax_dynamic_import_1["default"],
    visitor: {
        CallExpression: function (path, state) {
            console.log('plugins working')
            if (path.node.callee.type === TYPE_IMPORT) {
                var moduleName = path.node.arguments[0].value;
                // if(!/\.(js|json)$/.test(moduleName))
                //   moduleName += '.js'
                if (!moduleName) {
                    if (path.node.arguments[0].type === TYPE_TEMPLATE) {
                        var regex = '', globPath = '', base = '';
                        path.node.arguments[0].quasis.forEach(function (element) {
                            if (element.value.raw) {
                                regex += element.value.raw + '(.*)';
                                globPath += element.value.raw + '*';
                                base += element.value.raw + 'VARIABLE';
                            }
                        });
                        var variable = path.node.arguments[0].expressions;
                        var np = resolveModule(state.file.opts.filename, globPath);
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
                        var modules = getAllPaths((0, path_1.dirname)(np), regName, globPath);
                        var newImport = buildMultiImport(modules)({
                            VARIABLE: variable
                        });
                        path.replaceWith(newImport);
                    }
                }
                else {
                    moduleName = moduleName.replace(/(index){0,1}\.js$/, '').replace(/\\/g, '/'); //getModulePath(state.file.opts.filename, moduleName);
                    //console.log(moduleName)
                    var newImport = buildImport(moduleName)({
                        SOURCE: path.node.arguments
                    });
                    path.replaceWith(newImport);
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
}); });
//# sourceMappingURL=dynamic-import-plugin.js.map