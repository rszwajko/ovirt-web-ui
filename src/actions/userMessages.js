import {
  ADD_USER_MESSAGE,
  CLEAR_OLD_LOG_ENTRIES,
  CLEAR_USER_MSGS,
  DISMISS_EVENT,
  DISMISS_USER_MSG,
  SET_USERMSG_NOTIFIED,
  SET_USER_MESSAGES,
  GET_ALL_EVENTS,
} from '_/constants'

export function addUserMessage ({ message, shortMessage, type = '' }) {
  return {
    type: ADD_USER_MESSAGE,
    payload: {
      message,
      shortMessage,
      type,
    },
  }
}

export function clearUserMessages () {
  return { type: CLEAR_USER_MSGS }
}

export function clearOldLogEntries () {
  return { type: CLEAR_OLD_LOG_ENTRIES }
}

export function setNotificationNotified ({ eventId }) {
  return {
    type: SET_USERMSG_NOTIFIED,
    payload: {
      eventId,
    },
  }
}

export function dismissUserMessage ({ eventId }) {
  return {
    type: DISMISS_USER_MSG,
    payload: {
      eventId,
    },
  }
}

export function dismissEvent ({ event }) {
  return {
    type: DISMISS_EVENT,
    payload: {
      event,
    },
  }
}

export function setUserMessages ({ messages }) {
  return {
    type: SET_USER_MESSAGES,
    payload: {
      messages,
    },
  }
}

export function getAllEvents () {
  return { type: GET_ALL_EVENTS }
}
