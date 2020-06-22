// @flow

import {
  GET_SSH_KEY,
  SAVE_OPTION,
  SAVE_GLOBAL_OPTIONS,
  SAVE_SSH_KEY,
  SAVE_VMS_OPTIONS,
  SET_SSH_KEY,
  SET_OPTION,
  SET_OPTION_TO_VMS,
  SET_OPTIONS_SAVE_RESULTS,
  LOAD_USER_OPTIONS,
  LOAD_USER_OPTIONS_IN_PROGRESS,
  LOAD_USER_OPTIONS_FINISHED,
  SAVE_OPTIONS_ON_BACKEND,
} from '_/constants'

import type { UserOptionsType, SshKeyType, LoadUserOptionsActionType, SaveGlobalOptionsActionType, SaveVmsOptionsActionType } from '_/ovirtapi/types'

export function getSSHKey ({ userId }: Object): Object {
  return {
    type: GET_SSH_KEY,
    payload: {
      userId,
    },
  }
}

export function setSSHKey ({ key, id }: SshKeyType): Object {
  return {
    type: SET_SSH_KEY,
    payload: {
      key,
      id,
    },
  }
}

export function setOption ({ key, value }: Object): Object {
  return {
    type: SET_OPTION,
    payload: {
      key,
      value,
    },
  }
}

export function setOptionToVms ({ key, value, vmIds, values }: Object): Object {
  return {
    type: SET_OPTION_TO_VMS,
    payload: {
      key,
      value,
      vmIds,
      values,
    },
  }
}

export function saveOption ({ key, value, vmId }: Object): Object {
  return {
    type: SAVE_OPTION,
    payload: {
      key,
      value,
      vmId,
    },
  }
}

export function loadUserOptions (userOptions: UserOptionsType): LoadUserOptionsActionType {
  return {
    type: LOAD_USER_OPTIONS,
    payload: {
      userOptions,
    },
  }
}

export function loadingUserOptionsInProgress (): Object {
  return {
    type: LOAD_USER_OPTIONS_IN_PROGRESS,
  }
}

export function loadingUserOptionsFinished (): Object {
  return {
    type: LOAD_USER_OPTIONS_FINISHED,
  }
}

export function saveGlobalOptions ({ values: { sshKey, language, showNotifications, dontDisturbFor, updateRate } = {} }: Object, { correlationId }: Object): SaveGlobalOptionsActionType {
  return {
    type: SAVE_GLOBAL_OPTIONS,
    payload: {
      sshKey,
      language,
      showNotifications,
      dontDisturbFor,
      updateRate,
    },
    meta: {
      correlationId,
    },
  }
}

export function saveVmsOptions ({ values: {
  displayUnsavedWarnings,
  confirmForceShutdown,
  confirmVmDeleting,
  confirmVmSuspending,
  fullScreenMode,
  ctrlAltDel,
  smartcard,
  autoConnect,
  showNotifications }, vmIds }: Object, { correlationId }: Object): SaveVmsOptionsActionType {
  return {
    type: SAVE_VMS_OPTIONS,
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
  }
}

export function setOptionsSaveResults ({ correlationId, status, details }: Object): Object {
  return {
    type: SET_OPTIONS_SAVE_RESULTS,
    payload: {
      correlationId,
      status,
      details,
    },
  }
}

export function saveSSHKey ({ key, userId, sshId }: Object): Object {
  return {
    type: SAVE_SSH_KEY,
    payload: {
      key,
      userId,
      sshId,
    },
  }
}

export function saveUserOptionsOnBackend ({ options, userId }: Object): Object {
  return {
    type: SAVE_OPTIONS_ON_BACKEND,
    payload: {
      options,
      userId,
    },
  }
}
