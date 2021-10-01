import React from 'react'
import ReactDOM from 'react-dom'

interface AppExports {
  App: React.ComponentType
}

declare var __webpack_require__: any
const { App } = __webpack_require__('./src/index.ts') as AppExports

ReactDOM.render(<App />, document.getElementById('root'))
