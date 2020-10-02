// @flow

import Api, { Transforms } from '_/ovirtapi'
import { all, put, select, takeLatest, call } from 'redux-saga/effects'

import * as A from '_/actions'
import { callExternalAction } from './utils'
import { processUser } from './index'

import {
  GET_SSH_KEY,
  SAVE_GLOBAL_OPTIONS,
  SAVE_SSH_KEY,
} from '_/constants'

import type { SaveGlobalOptionsActionType } from '_/actions/types'
import { fromJS } from 'immutable'

/**
 * Internal type to formalize result returned from
 * saveSSHKey and saveRemoteOptions sagas.
 */
type ResultType = {
  // list of field names submitted as changed
  changes: Array<string>,
  // true if no changes were detected
  // all submitted values are the same as currently stored
  sameAsCurrent: boolean,
  // true if error was reported by ovirtapi query
  error: boolean,
  // query specific data packed into one object
  data: Object
}

/**
 * Simple mapper providing default values and type safety.
 */
function toResult ({ error = false, changes = [], sameAsCurrent = false, ...data }: Object = {}): ResultType {
  return {
    changes,
    sameAsCurrent,
    error,
    data,
  }
}

function* fetchSSHKey (action: Object): any {
  const result = yield call(callExternalAction, 'getSSHKey', Api.getSSHKey, action)
  if (result.error) {
    return
  }

  yield put(A.setSSHKey(Api.SSHKeyToInternal({ sshKey: result })))
}

function* saveSSHKey ([ sshPropName, submittedKey ]: any): any | ResultType {
  if (submittedKey === undefined) {
    // check strictly for undefined
    // it should be possible to clear ssh key by setting to empty string
    return toResult()
  }
  const sshId = yield select((state) => state.options.getIn(['ssh', 'id']))
  const currentKey = yield select((state) => state.options.getIn(['ssh', 'key']))
  if (currentKey === submittedKey) {
    return toResult({ changes: [sshPropName], sameAsCurrent: true })
  }
  const userId = yield select((state) => state.config.getIn(['user', 'id']))
  const result = yield call(
    callExternalAction,
    'saveSSHKey',
    Api.saveSSHKey,
    A.saveSSHKey({ sshId, key: submittedKey, userId }),
    true)

  return toResult({ ...result, changes: [sshPropName] })
}

/**
 * Remote options are options that are persisted on the server as JSON blob.
 * Note that there are also client-only options that do not need uploading.
 * Exception: SSH keys are remote but are handled separately.
 *
 * @param {*} newOptions options declared as new
  */
function* saveRemoteOptions (submittedOptions: Object): any | ResultType {
  const updatedProps = Object.entries(submittedOptions).filter(([ name, value ]) => value !== undefined)
  if (!updatedProps.length) {
    // no values were submitted
    return toResult()
  }
  // names are needed for reporting result
  const updatedPropNames = updatedProps.map(([key, value]) => key)

  const currentOptions = yield select((state) => state.options)

  // put submitted options under the right path to allow automated merge
  // right now all options are in 'global' map
  const newOptions = fromJS({}).setIn(['global'], fromJS(Object.fromEntries(updatedProps)))

  // calculate new store state ('options' slice only) by adding submitted options
  const newOrCurrent = currentOptions.mergeDeepWith((prev, next, key) => {
    if (next === undefined) {
      // no new value for this property so use current
      return prev
    }
    // use new value
    return next
  }, newOptions)

  if (newOrCurrent.equals(currentOptions)) {
    return toResult({ changes: updatedPropNames, sameAsCurrent: true })
  }

  const receivedOptions = yield select((state) => state.config.getIn(['user', 'receivedOptions']))
  const mergedWithReceived = Transforms.UserOptions.toApi(newOrCurrent.toJS(), receivedOptions.toJS())
  const userId = yield select((state) => state.config.getIn(['user', 'id']))

  const result = (yield call(
    callExternalAction,
    'persistUserOptions',
    Api.persistUserOptions,
    A.persistUserOptions({ options: mergedWithReceived, userId }),
    true,
  ))

  return toResult({ ...result, changes: updatedPropNames })
}

/**
 * Required to delay destructive side effects of user option changes.
 * Effect should wait until 'finish' event was dispatched.
 * Primary use case is page reload after locale change.
 */
function withLoadingUserOptions (delegateGenerator: (any) => Generator<any, any, any>): any {
  return function* (action: any): any {
    yield put(A.loadingUserOptionsInProgress())
    try {
      yield call(delegateGenerator, action)
    } finally {
      yield put(A.loadingUserOptionsFinished())
    }
  }
}

function* saveGlobalOptions ({ payload: { sshKey, showNotifications, notificationSnoozeDuration, language, updateRate }, meta: { transactionId } }: SaveGlobalOptionsActionType): Generator<any, any, any> {
  const { ssh, remote } = yield all({
    ssh: call(saveSSHKey, ...Object.entries({ sshKey })),
    remote: call(saveRemoteOptions, { language, updateRate }),
  })

  if (!remote.error && remote.changes.length && !remote.sameAsCurrent) {
    yield call(processUser, remote.data)
  }

  if (!ssh.error && ssh.changes.length && !ssh.sameAsCurrent) {
    yield put(A.setSSHKey(Api.SSHKeyToInternal({ sshKey: ssh.data })))
  }

  if (showNotifications !== undefined || notificationSnoozeDuration !== undefined) {

  }

  yield put(
    A.setOption(
      { key: ['lastTransactions', 'global'], value: { transactionId } },
    ),
  )
}

export default [
  takeLatest(SAVE_SSH_KEY, saveSSHKey),
  takeLatest(SAVE_GLOBAL_OPTIONS, withLoadingUserOptions(saveGlobalOptions)),
  takeLatest(GET_SSH_KEY, fetchSSHKey),
]
