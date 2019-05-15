import {
  GET_SSH_KEY,
  SAVE_OPTION,
  SAVE_GLOBAL_OPTIONS,
  SAVE_OPTION_TO_VMS,
  SAVE_SSH_KEY,
  SAVE_VM_OPTIONS,
  SET_SSH_KEY,
  SET_OPTION,
  SET_OPTION_TO_VMS,
  SET_OPTIONS_SAVE_RESULTS,
  RESET_GLOBAL_SETTINGS,
  RESET_OPTIONS,
  RESET_VM_SETTINGS,
} from '_/constants'

export function getSSHKey ({ userId }) {
  return {
    type: GET_SSH_KEY,
    payload: {
      userId,
    },
  }
}

export function setSSHKey ({ key, id }) {
  return {
    type: SET_SSH_KEY,
    payload: {
      key,
      id,
    },
  }
}

export function setOption ({ key, value, vmId }) {
  return {
    type: SET_OPTION,
    payload: {
      key,
      value,
      vmId,
    },
  }
}

export function setOptionToVms ({ key, value, vmIds, values }) {
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

export function saveOption ({ key, value, vmId }) {
  return {
    type: SAVE_OPTION,
    payload: {
      key,
      value,
      vmId,
    },
  }
}

export function saveGlobalOptions ({ values, checkedVms }, { correlationId }) {
  return {
    type: SAVE_GLOBAL_OPTIONS,
    payload: {
      values,
      checkedVms,
    },
    meta: {
      correlationId,
    },
  }
}

export function saveVmOptions ({ values, vmId }, { correlationId }) {
  return {
    type: SAVE_VM_OPTIONS,
    payload: {
      values,
      vmId,
    },
    meta: {
      correlationId,
    },
  }
}

export function setOptionsSaveResults ({ correlationId, status, details }) {
  return {
    type: SET_OPTIONS_SAVE_RESULTS,
    payload: {
      correlationId,
      status,
      details,
    },
  }
}

export function saveOptionToVms ({ key, value, vmIds, values }) {
  return {
    type: SAVE_OPTION_TO_VMS,
    payload: {
      key,
      value,
      vmIds,
      values,
    },
  }
}

export function resetGlobalSettings () {
  return {
    type: RESET_GLOBAL_SETTINGS,
  }
}

export function resetVmSettings ({ vmId }) {
  return {
    type: RESET_VM_SETTINGS,
    payload: {
      vmId,
    },
  }
}

export function resetOptions ({ vmId } = {}) {
  return {
    type: RESET_OPTIONS,
    payload: {
      vmId,
    },
  }
}

export function saveSSHKey ({ key, userId, sshId }) {
  return {
    type: SAVE_SSH_KEY,
    payload: {
      key,
      userId,
      sshId,
    },
  }
}
