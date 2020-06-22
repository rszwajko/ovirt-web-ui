// @flow

import Api from '_/ovirtapi'
import { all, put, select, takeLatest, takeEvery, call } from 'redux-saga/effects'

import { saveSSHKey as saveSSHKeyAction, saveUserOptionsOnBackend, setOption, setSSHKey, loadingUserOptionsInProgress, loadingUserOptionsFinished } from '_/actions'
import { callExternalAction } from './utils'
import { processUser } from './index'

import {
  GET_SSH_KEY,
  SAVE_GLOBAL_OPTIONS,
  SAVE_OPTION,
  SAVE_SSH_KEY,
  SAVE_VMS_OPTIONS,
} from '_/constants'

import type { SaveGlobalOptionsActionType, SaveVmsOptionsActionType, VmSettingsType } from '_/ovirtapi/types'
import { fromJS } from 'immutable'

function* fetchSSHKey (action: Object): any {
  const result = yield callExternalAction('getSSHKey', Api.getSSHKey, action)
  if (result.error) {
    return
  }
  if (result.ssh_public_key && result.ssh_public_key.length > 0) {
    yield put(setSSHKey(Api.SSHKeyToInternal({ sshKey: result.ssh_public_key[0] })))
  } else {
    yield put(setSSHKey(Api.SSHKeyToInternal({ sshKey: '' })))
  }
}

export function* saveSSHKey ([ name, value ]: any): any {
  if (value === undefined) {
    // should be possible to clear ssh key by setting to empty string
    return { changes: [] }
  }
  const sshId = yield select((state) => state.options.getIn(['ssh', 'id']))
  const currentKey = yield select((state) => state.options.getIn(['ssh', 'key']))
  if (currentKey === value) {
    return { changes: [name], sameAsCurrent: true }
  }
  const userId = yield select((state) => state.config.getIn(['user', 'id']))
  const result = yield callExternalAction(
    'saveSSHKey',
    Api.saveSSHKey,
    saveSSHKeyAction({ sshId, key: value, userId }),
    true)
  return { ...result, changes: [name] }
}

function* saveOption ({ payload }: any): any {
  yield put(setOption(payload))
}

function mergeWithDefaults (currentOptions: Object, paths: Array<Array<string>>, defaultOptions?: Object): any {
  if (defaultOptions === undefined) {
    return undefined
  }
  const deafultOptionsTemplate = fromJS(defaultOptions)
  const defaultOptionsForAllPaths = paths.reduce((acc, path) => acc.setIn(path, deafultOptionsTemplate), fromJS({}))

  return currentOptions.mergeDeepWith((prev, next, key) => {
    if (next === undefined) {
      console.error(`Unknown property ${key} has no default value`)
    }
    if (prev !== undefined) {
      // use existing property if present
      return prev
    }
    // use default
    return next
  }, defaultOptionsForAllPaths)
}

function* saveRemoteOptions (newOptions: Object, paths: Array<Array<string>>, defaultOptions?: Object): any {
  const updatedProps = Object.entries(newOptions).filter(([ name, value ]) => value !== undefined)
  if (!updatedProps.length) {
    return { changes: [] }
  }
  const updatedPropNames = updatedProps.map(([key, value]) => key)

  const currentOptions = yield select((state) => state.options)
  const mergedWithDefaults = mergeWithDefaults(currentOptions, paths, defaultOptions) || currentOptions

  const newOptionsTemplate = fromJS(Object.fromEntries(updatedProps))
  const newOptionsForAllPaths = paths.reduce((acc, path) => acc.setIn(path, newOptionsTemplate), fromJS({}))
  const mergedWithDefaultsAndNew = mergedWithDefaults.mergeDeepWith((prev, next, key) => {
    if (next === undefined) {
      // no new value for this property so use existing
      return prev
    }
    // use new value
    return next
  }, newOptionsForAllPaths)

  if (mergedWithDefaultsAndNew.equals(currentOptions)) {
    return { changes: updatedPropNames, sameAsCurrent: true }
  }

  const receivedOptions = yield select((state) => state.config.getIn(['user', 'receivedOptions']))
  const mergedWithReceived = Api.userOptionsToApi(mergedWithDefaultsAndNew.toJS(), receivedOptions.toJS())
  const userId = yield select((state) => state.config.getIn(['user', 'id']))

  const result = yield callExternalAction(
    'saveUserOptionsOnBackend',
    Api.saveUserOptionsOnBackend,
    saveUserOptionsOnBackend({ options: mergedWithReceived, userId }),
    true)
  return { ...result, changes: updatedPropNames }
}

function withLoadingUserOptions (delegateGenerator: (any) => Generator<any, any, any>): any {
  return function* (action: any): any {
    yield put(loadingUserOptionsInProgress())
    try {
      yield call(delegateGenerator, action)
    } finally {
      yield put(loadingUserOptionsFinished())
    }
  }
}

export function* saveGlobalOptions ({ payload: { sshKey, showNotifications, dontDisturbFor, language, updateRate }, meta: { correlationId } }: SaveGlobalOptionsActionType): Generator<any, any, any> {
  const [
    { error: sshError, changes: sshChanges = [], sameAsCurrent: keySameAsCurrent, ...sshData },
    { error: remoteOptionsError, changes: remoteOptionChanges = [], sameAsCurrent: remoteOptionsSameAsCurrent, ...userData },
  ] = yield all([
    saveSSHKey(...Object.entries({ sshKey })),
    saveRemoteOptions({ language, updateRate, dontDisturbFor, showNotifications }, [['global']]),
  ])

  if (!remoteOptionsError && remoteOptionChanges.length && !remoteOptionsSameAsCurrent) {
    yield processUser(userData)
  }

  if (!sshError && sshChanges.length && !keySameAsCurrent) {
    yield put(setSSHKey(Api.SSHKeyToInternal({ sshKey: sshData })))
  }

  yield put(setOption({ key: ['results', 'global'], value: { correlationId } }))
}

export function* saveVmsOptions (action: SaveVmsOptionsActionType): Generator<any, any, any> {
  const {
    payload: {
      values: {
        displayUnsavedWarnings,
        confirmForceShutdown,
        confirmVmDeleting,
        confirmVmSuspending,
        fullScreenMode,
        ctrlAltDel,
        smartcard,
        autoConnect,
        showNotifications,
      },
      vmIds,
    },
    meta: {
      correlationId,
    },
  } = action

  const typeSafeData : VmSettingsType = {
    displayUnsavedWarnings,
    confirmForceShutdown,
    confirmVmDeleting,
    confirmVmSuspending,
    fullScreenMode,
    ctrlAltDel,
    smartcard,
    autoConnect,
    showNotifications,
  }

  const paths = vmIds.map(id => ['vms', id])
  const globalVm = yield select((state) => state.options.getIn(['globalVm']).toJS())

  const { error, changes = [], sameAsCurrent, ...userData } = yield saveRemoteOptions(typeSafeData, paths, globalVm)

  const successfullyChanged = []

  if (!error && changes.length) {
    if (!sameAsCurrent) {
      yield processUser(userData)
    }
    successfullyChanged.push(...changes)
  }

  yield put(setOption({ key: ['results', 'vms'], value: { successfullyChanged, correlationId, vmIds } }))
}

export default [
  takeEvery(SAVE_OPTION, saveOption),
  takeEvery(SAVE_SSH_KEY, saveSSHKey),
  takeLatest(SAVE_GLOBAL_OPTIONS, withLoadingUserOptions(saveGlobalOptions)),
  takeLatest(SAVE_VMS_OPTIONS, withLoadingUserOptions(saveVmsOptions)),
  takeLatest(GET_SSH_KEY, fetchSSHKey),
]
