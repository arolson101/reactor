import { configureStore, Reducer } from '@reduxjs/toolkit'
import React from 'react'
import ReactDOM from 'react-dom'
import { Provider } from 'react-redux'

interface AppExports {
  App: React.ComponentType
  rootReducer: Reducer
}

const { App, rootReducer } = require('@app') as AppExports

const store =
  rootReducer &&
  configureStore({
    reducer: rootReducer!,
  })

const root = document.getElementById('root')
if (store) {
  ReactDOM.render(
    <Provider store={store}>
      <App />
    </Provider>,
    root,
  )
} else {
  ReactDOM.render(<App />, root)
}

if (process.env.NODE_ENV !== 'production' && module.hot) {
  module.hot.accept('@app', async function () {
    const { rootReducer } = require('@app') as AppExports
    store?.replaceReducer(rootReducer!)
  })
}
