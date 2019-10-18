import React from 'react'
import PropTypes from 'prop-types'

import { Icon } from 'patternfly-react'
import ConfirmationModal from '../VmActions/ConfirmationModal'
import { msg } from '_/intl'

class SaveConfirmationModal extends React.Component {
  constructor (props) {
    super(props)
    this.state = {
      saved: false,
      changed: false,
      updateValues: false,
      checkedVms: {},
    }
    this.handleVmSaveCheck = this.handleVmSaveCheck.bind(this)
  }
  handleVmSaveCheck (checkedVms) {
    this.setState({ checkedVms })
  }
  render () {
    const { show, vms, onClose, onConfirm } = this.props
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
                  {vms.map(vm => <li key={vm.get('id')}>{vm.get('name')}</li>)}
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
}
SaveConfirmationModal.propTypes = {
  vms: PropTypes.object.isRequired,
  show: PropTypes.bool,
  onClose: PropTypes.func.isRequired,
  onConfirm: PropTypes.func.isRequired,
}

export default SaveConfirmationModal
