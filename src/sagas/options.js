import Api from '_/ovirtapi'
import Selectors from '_/selectors'
import { all, put, select, takeLatest, takeEvery } from 'redux-saga/effects'

import { saveSSHKey as saveSSHKeyAction, setOptionsSaveResults, setOption, setOptionToVms, getSSHKey, setSSHKey } from '_/actions'
import { saveToLocalStorage } from '_/storage'
import { callExternalAction } from './utils'

import {
  GET_SSH_KEY,
  SAVE_GLOBAL_OPTIONS,
  SAVE_OPTION,
  SAVE_SSH_KEY,
  SAVE_VMS_OPTIONS,
} from '_/constants'

function* saveOptionsToLocalStorage () {
  const options = yield select(state => state.options.delete('results').toJS())
  saveToLocalStorage('options', JSON.stringify(options))
}

export function* refreshUserSettingsPage () {
  yield fetchSSHKey(getSSHKey({ userId: Selectors.getUserId() }))
}

function* fetchSSHKey (action) {
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

export function* saveSSHKey (action) {
  const res = yield callExternalAction('saveSSHKey', Api.saveSSHKey, action)
  return res
}

function* saveOption (payload) {
  yield put(setOption(payload))
  yield saveOptionsToLocalStorage()
}

function* saveOptionToVms (value, { vmIds, key }) {
  yield put(setOptionToVms({ key, value, vmIds }))
  yield saveOptionsToLocalStorage()
}

const saveGlobalMapper = {
  'language': function* (value) { yield saveOption({ key: 'language', value }) },
  'sshKey': function* (value, { sshId, userId }) { const res = yield saveSSHKey(saveSSHKeyAction({ sshId, key: value, userId })); return res },
  'dontDisturb': function* (value) { yield saveOption({ key: 'dontDisturb', value }) },
  'updateRate': function* (value) { yield saveOption({ key: 'updateRate', value }) },
  'dontDisturbFor': function* (value) {
    yield saveOption({ key: 'dontDisturbFor', value })
    yield saveOption({ key: 'dontDisturbStart', value: Date.now() })
  },
}

const saveVmMapper = {
  'displayUnsavedWarnings': saveOptionToVms,
  'confirmForceShutdown': saveOptionToVms,
  'confirmVmDeleting': saveOptionToVms,
  'confirmVmSuspending': saveOptionToVms,
  'fullScreenMode': saveOptionToVms,
  'ctrlAltDel': saveOptionToVms,
  'smartcard': saveOptionToVms,
  'autoConnect': saveOptionToVms,
  'disturb': saveOptionToVms,
}

function* handleSavingResults (results, meta) {
  const filteredRes = Object.entries(results).filter(([key, value]) => value !== undefined)
  if (filteredRes.length > 0 && meta && meta.correlationId) {
    const details = filteredRes.reduce((acc, cur) => ({ ...acc, [cur[0]]: cur[1].error }), {})
    yield put(setOptionsSaveResults({ correlationId: meta.correlationId, status: 'ERROR', details }))
  } else {
    yield put(setOptionsSaveResults({ correlationId: meta.correlationId, status: 'OK' }))
  }
}

export function* saveGlobalOptions (action) {
  const sshId = yield select((state) => state.options.getIn(['global', 'ssh', 'id']))
  const userId = yield select((state) => state.config.getIn(['user', 'id']))

  const res = yield all(
    Object.entries(action.payload.values)
      .reduce((acc, [key, value]) =>
        ({
          ...acc,
          [key]: saveGlobalMapper[key](value, { sshId, userId, key }),
        }),
      {})
  )
  yield handleSavingResults(res, action.meta)
  if (action.payload.values['language']) {
    window.location.reload()
  }
}

export function* saveVmsOptions (action) {
  const res = yield all(
    Object.entries(action.payload.values)
      .reduce((acc, [key, value]) =>
        ({
          ...acc,
          [key]: saveVmMapper[key](value, { vmIds: action.payload.vmIds, key }),
        }),
      {})
  )
  yield handleSavingResults(res, action.meta)
}

export default [
  takeEvery(SAVE_OPTION, saveOption),
  takeEvery(SAVE_SSH_KEY, saveSSHKey),
  takeLatest(SAVE_GLOBAL_OPTIONS, saveGlobalOptions),
  takeLatest(SAVE_VMS_OPTIONS, saveVmsOptions),
  takeLatest(GET_SSH_KEY, fetchSSHKey),
]
