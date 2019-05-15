import React from 'react'
import PropTypes from 'prop-types'

import { Icon } from 'patternfly-react'
import ConfirmationModal from '../VmActions/ConfirmationModal'
import { msg } from '_/intl'

const ResetConfirmationModal = ({ show, onClose, onConfirm }) => {
  return (
    <ConfirmationModal
      show={show}
      title={msg.confirmChanges()}
      body={
        <React.Fragment>
          <Icon type='pf' name='warning-triangle-o' />
          <div>
            <p className='lead'>{msg.areYouSureYouWantToResetSettings()}</p>
            <p>{msg.resettingAccountSettingsWillClearSettings()}</p>
          </div>
        </React.Fragment>
      }
      confirm={{ title: msg.confirmChanges(), onClick: onConfirm }}
      onClose={onClose}
    />
  )
}
ResetConfirmationModal.propTypes = {
  show: PropTypes.bool,
  onClose: PropTypes.func.isRequired,
  onConfirm: PropTypes.func.isRequired,
}

export default ResetConfirmationModal
