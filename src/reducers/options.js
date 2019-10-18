import Immutable from 'immutable'
import {
  SET_SSH_KEY,
  SET_OPTION,
  SET_OPTION_TO_VMS,
  SET_OPTIONS_SAVE_RESULTS,
} from '_/constants'
import { actionReducer } from './utils'
import { locale } from '_/intl'
import { loadFromLocalStorage } from '_/storage'
import AppConfiguration from '_/config'

const EMPTY_MAP = Immutable.fromJS({})

const optionsFromStorage = JSON.parse(loadFromLocalStorage('options')) || (
  {
    options: {
      ssh: {
        key: null,
        id: undefined,
      },
      updateRate: AppConfiguration.schedulerFixedDelayInSeconds,
      language: locale,
    },
    vms: {},
  }
)

const initialState = Immutable.fromJS({ ...optionsFromStorage, results: {} })

const options = actionReducer(initialState, {
  [SET_OPTION] (state, { payload: { key, value, vmId } }) {
    if (!vmId) {
      return state.setIn(['options', key], Immutable.fromJS(value))
    }
    return state.updateIn(['vms', vmId], (options = EMPTY_MAP) => options.set(key, Immutable.fromJS(value)))
  },
  [SET_OPTION_TO_VMS] (state, { payload: { key, value, vmIds, values } }) {
    let options = state
    if (values) {
      for (let i in values) {
        options = options.updateIn(['vms', i], (options = EMPTY_MAP) => options.set(key, Immutable.fromJS(values[i])))
      }
    } else {
      for (let vmId of vmIds) {
        options = options.updateIn(['vms', vmId], (options = EMPTY_MAP) => options.set(key, Immutable.fromJS(value)))
      }
    }
    return options
  },
  [SET_SSH_KEY] (state, { payload: { key, id } }) {
    return state.setIn(['options', 'ssh'], { key: key || null, id })
  },
  [SET_OPTIONS_SAVE_RESULTS] (state, { payload: { correlationId, status, details } }) {
    return state.setIn(['results', correlationId], { status, details })
  },
})

export default options
export {
  initialState,
}
