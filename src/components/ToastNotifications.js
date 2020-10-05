import React from 'react'
import PropTypes from 'prop-types'
import { connect } from 'react-redux'

import { TimedToastNotification, ToastNotificationList } from 'patternfly-react'
import { setNotificationNotified } from '_/actions'
import AppConfiguration from '_/config'

import style from './sharedStyle.css'

function normalizeType (theType) {
  theType = String(theType).toLowerCase()
  const isExpected = ['error', 'warning', 'success', 'info', 'danger'].includes(theType)
  return isExpected ? theType : 'warning'
}

const ToastNotifications = ({ userMessages, showNotifications, onDismissNotification }) => {
  return <ToastNotificationList>
    { showNotifications && userMessages.get('records')
      .filter(r => !r.get('notified'))
      .map(r =>
        <TimedToastNotification
          className={style['toast-margin-top']}
          type={normalizeType(r.get('type'))}
          onDismiss={() => onDismissNotification(r.get('id'))}
          key={r.get('time')}
          timerdelay={1000 * AppConfiguration.toastNotificationDisplayTimeInSec}
        >
          <span>
            {r.get('message')}
          </span>
        </TimedToastNotification>
      )}
  </ToastNotificationList>
}

ToastNotifications.propTypes = {
  userMessages: PropTypes.object.isRequired,
  showNotifications: PropTypes.bool,
  onDismissNotification: PropTypes.func.isRequired,
}

export default connect(
  ({ userMessages, options }) => ({
    userMessages,
    showNotifications: options.getIn(['global', 'showNotifications'], true),
  }),
  (dispatch) => ({
    onDismissNotification: (eventId) => dispatch(setNotificationNotified({ eventId })),
  })
)(ToastNotifications)
