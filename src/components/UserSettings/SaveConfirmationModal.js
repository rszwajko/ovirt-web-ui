import React from 'react'
import PropTypes from 'prop-types'

import { Icon } from 'patternfly-react'
import ConfirmationModal from '../VmActions/ConfirmationModal'
import VmsSettingsList from './VmsSettingsList'
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
    const { show, onClose, onSave } = this.props
    return (
      <ConfirmationModal
        show={show}
        title={msg.confirmChanges()}
        body={
          <React.Fragment>
            <Icon type='pf' name='warning-triangle-o' />
            <div>
              <p className='lead'>{msg.areYouSureYouWantToMakeSettingsChanges()}</p>
              <p>{msg.defaultSettingsWillBeApplied()}</p>
              <VmsSettingsList onChange={this.handleVmSaveCheck} />
            </div>
          </React.Fragment>
        }
        confirm={{ title: msg.confirmChanges(), onClick: () => onSave(true, this.state.checkedVms) }}
        onClose={onClose}
      />
    )
  }
}
SaveConfirmationModal.propTypes = {
  show: PropTypes.bool,
  onClose: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
}

export default SaveConfirmationModal
