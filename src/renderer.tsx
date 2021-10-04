import React from 'react'
import ReactDOM from 'react-dom'

interface AppExports {
  App: React.ComponentType
}

const render = () => {
  const { App } = require('@app') as AppExports
  ReactDOM.render(<App />, document.getElementById('root'))
}

render()

if (module.hot) {
  module.hot.accept('@app', function () {
    console.log('Accepting the updated module!')
    render()
  })
}
