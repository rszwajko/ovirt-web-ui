import React from 'react'
import PropTypes from 'prop-types'

import { Icon } from 'patternfly-react'
import ConfirmationModal from '../VmActions/ConfirmationModal'
import { msg } from '_/intl'

const SaveConfirmationModal = ({ show, vms = [], onClose, onConfirm }) => {
  return (
    <ConfirmationModal
      show={show}
      title={msg.confirmChanges()}
      body={
        <React.Fragment>
          <Icon type='pf' name='warning-triangle-o' />
          <div>
            <p className='lead'>{msg.areYouSureYouWantToMakeSettingsChanges()}</p>
            <p>{msg.changesWillBeMadeToFollowingVm()}</p>
            <div>
              <ul>
                {vms.map(({ id, name }) => <li key={id}>{name}</li>)}
              </ul>
            </div>
            <p>{msg.pressYesToConfirm()}</p>
          </div>
        </React.Fragment>
      }
      confirm={{ title: msg.confirmChanges(), onClick: onConfirm }}
      onClose={onClose}
    />
  )
}

SaveConfirmationModal.propTypes = {
  vms: PropTypes.array.isRequired,
  show: PropTypes.bool,
  onClose: PropTypes.func.isRequired,
  onConfirm: PropTypes.func.isRequired,
}

export default SaveConfirmationModal
