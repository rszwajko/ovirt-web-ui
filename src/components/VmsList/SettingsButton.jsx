import React from 'react'
import ReactDOM from 'react-dom'
import PropTypes from 'prop-types'
import { Link } from 'react-router-dom'
import { Icon, Button } from 'patternfly-react'

import sharedStyle from '_/components/sharedStyle.css'

import { msg } from '_/intl'

export const VmsSettingsButton = ({ checkedVms = [] }) => {
  const container = document.getElementById('vm-settings-btn-box')
  if (container) {
    const link = checkedVms.length > 0
      ? <Link to={`/vms-settings/${checkedVms.join('/')}`} className={`btn btn-default ${sharedStyle['settings-icon']}`} disabled={checkedVms.length === 0}>
        <Icon
          name='cog'
          type='fa'
        />
        {msg.vmSettings()}
      </Link>
      : <span className={`btn btn-default ${sharedStyle['settings-icon']} disabled`}>
        <Icon
          name='cog'
          type='fa'
        />
        {msg.vmSettings()}
      </span>
    return ReactDOM.createPortal(
      link,
      container
    )
  }
  return null
}

VmsSettingsButton.propTypes = {
  checkedVms: PropTypes.array,
}

export const SelectAllVmsButton = ({ onClick }) => {
  const container = document.getElementById('select-all-vms-btn-box')
  if (container) {
    return ReactDOM.createPortal(
      <Button onClick={onClick} bsStyle='default'>{msg.selectAllVms()}</Button>,
      container
    )
  }
  return null
}

SelectAllVmsButton.propTypes = {
  onClick: PropTypes.func.isRequired,
}
