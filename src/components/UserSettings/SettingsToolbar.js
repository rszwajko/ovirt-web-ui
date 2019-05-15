import React from 'react'
import ReactDOM from 'react-dom'
import PropTypes from 'prop-types'
import { Toolbar } from 'patternfly-react'
import { msg } from '_/intl'

import style from './style.css'

const SettingsToolbar = ({ onSave, onCancel, onReset }) => {
  const body = <Toolbar className={style['toolbar']}>
    <button onClick={onReset} className='btn btn-default'>
      {msg.resetSettings()}
    </button>
    <Toolbar.RightContent>
      <button onClick={onCancel} className='btn btn-default'>
        {msg.cancel()}
      </button>
      <button onClick={onSave} className='btn btn-primary'>
        {msg.save()}
      </button>
    </Toolbar.RightContent>
  </Toolbar>
  if (document.getElementById('settings-toolbar')) {
    return ReactDOM.createPortal(
      body,
      document.getElementById('settings-toolbar')
    )
  }
  return null
}

SettingsToolbar.propTypes = {
  onSave: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
  onReset: PropTypes.func.isRequired,
}

export default SettingsToolbar
