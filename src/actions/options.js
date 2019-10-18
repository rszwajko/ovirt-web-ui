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

export function saveGlobalOptions ({ values }, { correlationId }) {
  return {
    type: SAVE_GLOBAL_OPTIONS,
    payload: {
      values,
    },
    meta: {
      correlationId,
    },
  }
}

export function saveVmsOptions ({ values, vmIds }, { correlationId }) {
  return {
    type: SAVE_VMS_OPTIONS,
    payload: {
      values,
      vmIds,
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
