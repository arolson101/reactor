import { configureStore, Reducer } from '@reduxjs/toolkit'
import React from 'react'
import ReactDOM from 'react-dom'
import { Provider } from 'react-redux'

interface AppExports {
  App: React.ComponentType
  rootReducer: Reducer
  stateSanitizer?: <S>(state: S, index: number) => S
}

const { App, rootReducer, stateSanitizer } = require('@app') as AppExports

const store =
  rootReducer &&
  configureStore({
    reducer: rootReducer!,
    devTools: process.env.NODE_ENV === 'development' && {
      stateSanitizer,
    },
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
