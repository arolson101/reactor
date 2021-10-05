import {
  Action, AnyAction,
  CombinedState,
  configureStore,
  Reducer
} from '@reduxjs/toolkit'
import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux'

export const getAppFunctions = <S, A extends Action = AnyAction>(
  rootReducer: Reducer<CombinedState<S>, A>,
) => {
  const createStore = () => configureStore({ reducer: rootReducer })

  type Store = ReturnType<typeof createStore>
  type RootState = ReturnType<Store['getState']>
  type AppDispatch = Store['dispatch']

  // Use throughout your app instead of plain `useDispatch` and `useSelector`
  const useAppDispatch = () => useDispatch<AppDispatch>()
  const useAppSelector: TypedUseSelectorHook<RootState> = useSelector
  return { useAppDispatch, useAppSelector }
}
