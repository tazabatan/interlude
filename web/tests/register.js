const fs = require('fs')
const path = require('path')
const Module = require('module')
const ts = require('typescript')

const stubDir = path.join(__dirname, 'stubs')

const originalRequire = Module.prototype.require
Module.prototype.require = function patchedRequire(request) {
  if (request === 'next/server') {
    return originalRequire.call(this, path.join(stubDir, 'next-server.js'))
  }
  if (request === '@supabase/ssr') {
    return originalRequire.call(this, path.join(stubDir, 'supabase-ssr.js'))
  }
  if (request === 'next/link') {
    return originalRequire.call(this, path.join(stubDir, 'next-link.js'))
  }
  if (request === 'next/navigation') {
    return originalRequire.call(this, path.join(stubDir, 'next-navigation.js'))
  }
  if (request === 'next/font/google') {
    return originalRequire.call(this, path.join(stubDir, 'next-font-google.js'))
  }
  if (request === 'next/headers') {
    return originalRequire.call(this, path.join(stubDir, 'next-headers.js'))
  }
  return originalRequire.apply(this, arguments)
}

function compile(module, filename) {
  const source = fs.readFileSync(filename, 'utf8')
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2019,
      module: ts.ModuleKind.CommonJS,
      jsx: ts.JsxEmit.ReactJSX,
      esModuleInterop: true,
    },
    fileName: filename,
  })
  module._compile(outputText, filename)
}

Module._extensions['.ts'] = compile
Module._extensions['.tsx'] = compile
Module._extensions['.css'] = function noop(module) {
  module._compile('', module.filename)
}
