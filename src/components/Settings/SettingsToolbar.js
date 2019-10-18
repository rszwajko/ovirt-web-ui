import React from 'react'
import ReactDOM from 'react-dom'
import PropTypes from 'prop-types'
import { Toolbar } from 'patternfly-react'
import { msg } from '_/intl'

import style from './style.css'

class SettingsToolbar extends React.Component {
  constructor (props) {
    super(props)
    this.el = document.createElement('div')
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
    const { onSave, onCancel } = this.props
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
          onClick={e => {
            e.preventDefault()
            onSave()
          }}
          className='btn btn-primary'
        >
          {msg.save()}
        </button>
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
}

export default SettingsToolbar
