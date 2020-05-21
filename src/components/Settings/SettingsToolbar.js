import React from 'react'
import ReactDOM from 'react-dom'
import PropTypes from 'prop-types'
import { Toolbar, Icon } from 'patternfly-react'
import { msg } from '_/intl'
import ConfirmationModal from '../VmActions/ConfirmationModal'

import style from './style.css'

class SettingsToolbar extends React.Component {
  constructor (props) {
    super(props)
    this.el = document.createElement('div')
    this.state = { showConflictingChangesModal: false }
  }

  componentDidMount () {
    const root = document.getElementById('settings-toolbar')
    if (root) {
      root.appendChild(this.el)
    }
  }

  componentWillUnmount () {
    const root = document.getElementById('settings-toolbar')
    if (root) {
      root.removeChild(this.el)
    }
  }
  render () {
    const { onSave, onCancel, enableSave, staleFields = [] } = this.props

    const conflictingChanges = !!staleFields.length

    const hideModal = () => this.setState({ showConflictingChangesModal: false })

    const modalBody = () => {
      return <React.Fragment>
        <Icon type='pf' name='warning-triangle-o' />
        <div>
          <p>{msg.conflictingChangesDetails()}</p>
          <p>{msg.conflictingChangesList()}</p>
          <ul>
            { staleFields.map(label => <li key={label}>{label}</li>) }
          </ul>
        </div>
      </React.Fragment>
    }

    const body = <Toolbar className={style['toolbar']}>
      <Toolbar.RightContent>
        <button
          onClick={e => {
            e.preventDefault()
            onCancel()
          }}
          className='btn btn-default'
        >
          {msg.cancel()}
        </button>
        <button
          disabled={!enableSave}
          onClick={e => {
            e.preventDefault()
            if (!conflictingChanges) {
              onSave()
            } else {
              this.setState({ showConflictingChangesModal: true })
            }
          }}
          className='btn btn-primary'
        >
          {msg.save()}
        </button>
        <ConfirmationModal
          show={this.state.showConflictingChangesModal}
          confirm={{
            onClick: onSave,
            title: msg.ok(),
            type: 'warning' }}
          onClose={hideModal}
          title={msg.conflictingChanges()}
          body={modalBody()} />
      </Toolbar.RightContent>
    </Toolbar>
    return ReactDOM.createPortal(
      body,
      this.el
    )
  }
}

SettingsToolbar.propTypes = {
  onSave: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
  enableSave: PropTypes.bool,
  staleFields: PropTypes.array,
}

export default SettingsToolbar
