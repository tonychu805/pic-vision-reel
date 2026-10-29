// Render the real client components without live Supabase data or writes.
// Next's router/Script and account Server Actions are stubbed; React, effects, browser
// networking, CSP, and event handlers run normally in Chromium.
const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')
const root = path.resolve(__dirname, '..')

exports.bundleClients = function bundleClients() {
  const modules = [], ids = new Map()
  function add(file) {
    if (ids.has(file)) return ids.get(file)
    const id = modules.length
    ids.set(file, id)
    modules.push('')
    let code
    if (file === 'router') code = 'exports.useRouter=()=>({refresh:()=>{}})'
    else if (file === 'script') code = 'module.exports=()=>null'
    else if (file === 'accountActions') code = `
      exports.updateDisplayName=(value)=>window.runAccountAction('name',value);
      exports.updateEmail=(value)=>window.runAccountAction('email',value);
      exports.updatePassword=(value)=>window.runAccountAction('password',value);`
    else if (file === 'trainingAction') code = "exports.setTrainingConsent=(value)=>window.runAccountAction('training',value)"
    else if (file === 'signOutAction') code = "exports.signOutEverywhere=()=>window.runAccountAction('signout')"
    else if (file.endsWith('.css')) {
      const names = [...fs.readFileSync(file, 'utf8').matchAll(/\.([a-zA-Z][\w-]*)/g)].map((m) => [m[1], m[1]])
      code = 'module.exports=' + JSON.stringify(Object.fromEntries(names))
    } else {
      code = fs.readFileSync(file, 'utf8')
      if (/\.tsx?$/.test(file)) code = ts.transpileModule(code, {
        compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
      }).outputText
      code = code.replace(/require\(["']([^"']+)["']\)/g, (_, name) => {
        let next
        if (name === 'next/navigation') next = 'router'
        else if (name === 'next/script') next = 'script'
        else if (name === '@/lib/auth-actions') next = 'signOutAction'
        else if (name === '@/app/[slug]/[code]/actions') next = 'trainingAction'
        else if (name === './actions' && file.endsWith('/account/account-form.tsx')) next = 'accountActions'
        else {
          const spec = name.startsWith('@/') ? path.join(root, name.slice(2))
            : name.startsWith('.') ? path.resolve(path.dirname(file), name) : name
          next = spec.startsWith('/')
            ? ['', '.tsx', '.ts', '.js', '/index.js'].map((suffix) => spec + suffix).find((p) => fs.existsSync(p) && fs.statSync(p).isFile())
            : require.resolve(spec, { paths: [path.dirname(file), root] })
        }
        if (!next) throw new Error(`Cannot resolve ${name} in ${file}`)
        return `__require(${add(next)})`
      })
    }
    modules[id] = `function(module,exports,__require){${code}\n}`
    return id
  }
  const publicClient = add(path.join(root, 'app/r/[shareId]/reel-share-client.tsx'))
  const verticalClient = add(path.join(root, 'app/r/[shareId]/vertical-client.tsx'))
  const accountClient = add(path.join(root, 'app/account/account-form.tsx'))
  const react = add(require.resolve('react'))
  const dom = add(require.resolve('react-dom/client'))
  return `const process={env:{NODE_ENV:'production',NEXT_PUBLIC_APP_URL:location.origin}};
    const modules=[${modules.join(',')}],cache={};
    function __require(i){if(cache[i])return cache[i].exports;const m=cache[i]={exports:{}};modules[i](m,m.exports,__require);return m.exports;}
    const React=__require(${react}),ReactDOM=__require(${dom});
    window.mount=(kind,props)=>{
      const Component=__require(kind==='account'?${accountClient}:kind==='vertical'?${verticalClient}:${publicClient}).default;
      ReactDOM.createRoot(document.getElementById('app')).render(React.createElement(Component,props));
    };`
}
