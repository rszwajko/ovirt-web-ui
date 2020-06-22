// @flow

import { fromJS } from 'immutable'

import {
  SET_SSH_KEY,
  SET_OPTION,
  SET_OPTION_TO_VMS,
  SET_OPTIONS_SAVE_RESULTS,
  LOAD_USER_OPTIONS,
  LOAD_USER_OPTIONS_IN_PROGRESS,
  LOAD_USER_OPTIONS_FINISHED,
} from '_/constants'
import { actionReducer } from './utils'
import { locale } from '_/intl'
import { saveToLocalStorage } from '_/storage'
import AppConfiguration from '_/config'
import type { LoadUserOptionsActionType, UserOptionsType } from '_/ovirtapi/types'

const EMPTY_MAP = fromJS({})

const defaultOptions: UserOptionsType = {
  global: {
    updateRate: AppConfiguration.schedulerFixedDelayInSeconds,
    language: locale,
    showNotifications: true,
    notificationsResumeTime: 0,
    preview: false,
  },
  ssh: undefined,
  globalVm: {
    displayUnsavedWarnings: true,
    confirmForceShutdown: true,
    confirmVmDeleting: true,
    confirmVmSuspending: true,
    fullScreenMode: false,
    ctrlAltDel: false,
    smartcard: false,
    autoConnect: false,
    showNotifications: true,
  },
  vms: {},
}

// const optionsFromStorage = JSON.parse(loadFromLocalStorage('options')) || (defaultOptions)

const initialState = fromJS({ ...defaultOptions, results: {} })

const options = actionReducer(initialState, {
  [LOAD_USER_OPTIONS_IN_PROGRESS]: (clientState: any, action: any) => {
    return clientState.setIn(['loadingFinished'], false)
  },
  [LOAD_USER_OPTIONS_FINISHED]: (clientState: any, action: any) => {
    return clientState.setIn(['loadingFinished'], true)
  },
  [LOAD_USER_OPTIONS]: (clientState: any, action: LoadUserOptionsActionType) => {
    const {
      payload: {
        userOptions = {},
      } = {},
    } = action

    const serverState = fromJS(userOptions)

    const choosePrevIfNextUndefined = (prev, next, key) => {
      return next === undefined ? prev : next
    }

    const merged = clientState.mergeWith((client, server, key) => {
      if (key === 'global' || key === 'globalVm') {
        // choose server property if it exists
        // but fallback to client's defaults if missing
        return client.mergeWith(choosePrevIfNextUndefined, server)
      }

      if (key === 'ssh' || key === 'results') {
        return client
      }

      // overwrite all other properties
      return server
    }, serverState)

    const language = merged.getIn(['global', 'language'])
    saveToLocalStorage('options', JSON.stringify({ language }))

    const globalVm = merged.get('globalVm')

    return merged.updateIn(['vms'], vms => {
      // if vm has some property missing then fallback to defaults
      // the code using the property should always check both custom and global
      // however it's easier to treat custom settings as a complete static snapshot
      // taken from global settings at given time (not affected by further changes made to globals)
      return vms.map(vm => globalVm.mergeWith(choosePrevIfNextUndefined, vm))
    })
  },
  [SET_OPTION] (state: any, { payload: { key, value } }: any): any {
    // TODO: check if the same JS value creates diferrent immutable value
    // state should not change if the value has is the same
    return state.setIn(key, fromJS(value))
  },
  [SET_OPTION_TO_VMS]: (state, { payload: { key, value, vmIds, values } }) => {
    let options = state
    if (values) {
      for (let i in values) {
        options = options.updateIn(['vms', i], (options = EMPTY_MAP) => options.set(key, fromJS(values[i])))
      }
    } else {
      for (let vmId of vmIds) {
        options = options.updateIn(['vms', vmId], (options = EMPTY_MAP) => options.set(key, fromJS(value)))
      }
    }
    return options
  },
  [SET_SSH_KEY] (state: any, { payload: { key, id } }: any): any {
    return state.setIn(['ssh'], fromJS({ key: key || '', id }))
  },
  [SET_OPTIONS_SAVE_RESULTS] (state: any, { payload: { correlationId, status, details } }: any): any {
    return state.setIn(['results', correlationId], { status, details })
  },
})

export default options
export {
  initialState,
}
