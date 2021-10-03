import React from 'react'
import ReactDOM from 'react-dom'

interface AppExports {
  default: React.ComponentType
}

const render = () => {
  const { default: App } = require('./App') as AppExports
  ReactDOM.render(<App />, document.getElementById('root'))
}

render()

if (module.hot) {
  module.hot.accept('./App', function () {
    console.log('Accepting the updated module!')
    render()
  })
}
