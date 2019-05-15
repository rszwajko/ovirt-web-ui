import Api from '_/ovirtapi'
import Selectors from '_/selectors'
import { all, put, select, takeLatest, takeEvery } from 'redux-saga/effects'

import { saveSSHKey as saveSSHKeyAction, setOptionsSaveResults, resetOptions, setOption, setOptionToVms, getSSHKey, setSSHKey, resetVmSettings } from '_/actions'
import { saveToLocalStorage } from '_/storage'
import { callExternalAction } from './utils'

import {
  GET_SSH_KEY,
  RESET_GLOBAL_SETTINGS,
  RESET_VM_SETTINGS,
  SAVE_GLOBAL_OPTIONS,
  SAVE_OPTION,
  SAVE_OPTION_TO_VMS,
  SAVE_SSH_KEY,
  SAVE_VM_OPTIONS,
} from '_/constants'

function* saveOptionsToLocalStorage () {
  const options = yield select(state => state.options.delete('results').toJS())
  saveToLocalStorage(`options`, JSON.stringify(options))
}

function* checkVmNotifications () {
  let vms = yield select(state => state.options.get('vms'))
  const vmIds = Object.keys(vms.toJS())
  const vmsCheck = yield all(
    vmIds.reduce(
      (acc, vmId) =>
        ({ ...acc, [vmId]: callExternalAction('isVmExist', Api.isVmExist, { payload: { vmId } }, true) }),
      {}
    )
  )
  yield all(vms.filter((value, vmId) => vmsCheck[vmId] === undefined).map((vm, vmId) => put(resetVmSettings({ vmId }))))
  yield saveOptionsToLocalStorage()
}

export function* refreshUserSettingsPage () {
  yield checkVmNotifications()
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

function* saveOptionToVms (payload) {
  yield put(setOptionToVms(payload))
  yield saveOptionsToLocalStorage()
}

export function* resetGlobalOptions () {
  yield put(resetOptions())
  const options = yield select(state => state.options.toJS())
  saveToLocalStorage(`options`, JSON.stringify(options))
}

export function* resetVmOptions (actions) {
  yield put(resetOptions(actions.payload))
  yield saveOptionsToLocalStorage()
}

function* saveGlobalOptionWithVmsOption (value, { checkedVms, key }) {
  const prevValue = yield select(state => state.options.getIn(['options', key]))
  yield saveOption({ key, value })
  if (checkedVms) {
    const checkedVmIds = Object.keys(checkedVms).filter(k => checkedVms[k])
    yield saveOptionToVms({ key, value, vmIds: checkedVmIds })
    const uncheckedVmIds = Object.keys(checkedVms).filter(k => !checkedVms[k])
    yield saveOptionToVms({ key, value: prevValue, vmIds: uncheckedVmIds })
  }
}

function* saveVmOption (value, { vmId, key }) {
  yield saveOption({ key, value, vmId })
}

const saveGlobalMapper = {
  'language': function* (value) { yield saveOption({ key: 'language', value }) },
  'sshKey': function* (value, { sshId, userId }) { const res = yield saveSSHKey(saveSSHKeyAction({ sshId, key: value, userId })); return res },
  'dontDisturb': function* (value) { yield saveOption({ key: 'dontDisturb', value }) },
  'vmsNotifications': function* (values) {
    yield saveOptionToVms({ key: 'notifications', values })
    const allVmsNotifications = Object.values(values).reduce((acc, cur) => acc && cur, true)
    if (!allVmsNotifications) {
      yield saveOption({ key: 'allVmsNotifications', value: false })
    }
  },
  'updateRate': function* (value) { yield saveOption({ key: 'updateRate', value }) },
  'dontDisturbFor': function* (value) {
    yield saveOption({ key: 'dontDisturbFor', value })
    yield saveOption({ key: 'dontDisturbStart', value: Date.now() })
  },
  'allVmsNotifications': function* (value) { yield saveOption({ key: 'allVmsNotifications', value }) },
  'displayUnsavedWarnings': saveGlobalOptionWithVmsOption,
  'confirmForceShutdown': saveGlobalOptionWithVmsOption,
  'confirmVmDeleting': saveGlobalOptionWithVmsOption,
  'confirmVmSuspending': saveGlobalOptionWithVmsOption,
  'fullScreenMode': saveGlobalOptionWithVmsOption,
  'ctrlAltDel': saveGlobalOptionWithVmsOption,
  'smartcard': saveGlobalOptionWithVmsOption,
  'autoConnect': saveGlobalOptionWithVmsOption,
}

const saveVmMapper = {
  'displayUnsavedWarnings': saveVmOption,
  'confirmForceShutdown': saveVmOption,
  'confirmVmDeleting': saveVmOption,
  'confirmVmSuspending': saveVmOption,
  'fullScreenMode': saveVmOption,
  'ctrlAltDel': saveVmOption,
  'smartcard': saveVmOption,
  'autoConnect': saveVmOption,
  'notifications': function* (value, { vmId }) {
    yield saveOption({ key: 'notifications', value, vmId })
    if (!value) {
      yield saveOption({ key: 'allVmsNotifications', value: false })
    }
  },
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
  const sshId = yield select((state) => state.options.getIn(['options', 'ssh', 'id']))
  const userId = yield select((state) => state.config.getIn(['user', 'id']))

  const res = yield all(
    Object.entries(action.payload.values)
      .reduce((acc, [key, value]) =>
        ({
          ...acc,
          [key]: saveGlobalMapper[key](value, { sshId, userId, checkedVms: action.payload.checkedVms, key }),
        }),
      {})
  )
  yield handleSavingResults(res, action.meta)
}

export function* saveVmOptions (action) {
  const res = yield all(
    Object.entries(action.payload.values)
      .reduce((acc, [key, value]) =>
        ({
          ...acc,
          [key]: saveVmMapper[key](value, { vmId: action.payload.vmId, key }),
        }),
      {})
  )
  yield handleSavingResults(res, action.meta)
}

export default [
  takeEvery(SAVE_OPTION, saveOption),
  takeEvery(SAVE_OPTION_TO_VMS, saveOptionToVms),
  takeEvery(RESET_GLOBAL_SETTINGS, resetGlobalOptions),
  takeEvery(RESET_VM_SETTINGS, resetVmOptions),
  takeEvery(SAVE_SSH_KEY, saveSSHKey),
  takeLatest(SAVE_GLOBAL_OPTIONS, saveGlobalOptions),
  takeLatest(SAVE_VM_OPTIONS, saveVmOptions),
  takeLatest(GET_SSH_KEY, fetchSSHKey),
]
