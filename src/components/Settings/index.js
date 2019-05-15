import React, { Component } from 'react'
import PropTypes from 'prop-types'
import { connect } from 'react-redux'

import SettingsBase from './SettingsBase'
import SettingsToolbar from './SettingsToolbar'
import NavigationPrompt from 'react-router-navigation-prompt'
import NavigationConfirmationModal from '../NavigationConfirmationModal'
import CounterAlert from './CounterAlert'
import { generateUnique } from '_/helpers'
import { msg } from '_/intl'

import style from './style.css'

class Settings extends Component {
  constructor (props) {
    super(props)
    this.state = {
      saved: false,
      errors: null,
      changed: false,
      changedFields: new Set(),
      correlationId: null,
    }
    this.handleChange = this.handleChange.bind(this)
    this.handleSave = this.handleSave.bind(this)
    this.handleSaveNotificationDissmised = this.handleSaveNotificationDissmised.bind(this)
    this.handleErrorNotificationDissmised = this.handleErrorNotificationDissmised.bind(this)
  }

  handleSave () {
    const { values, onSave } = this.props
    const { changedFields } = this.state
    const saveFields = [...changedFields].reduce((acc, cur) => ({ ...acc, [cur]: values[cur] }), {})
    this.setState({ correlationId: generateUnique('VmSettings-save_') }, () => onSave(saveFields, this.state.correlationId))
  }

  static getDerivedStateFromProps (props, state) {
    const res = props.options.getIn(['results', state.correlationId])
    if (state.correlationId !== null && res) {
      if (res.status === 'OK') {
        return {
          correlationId: null,
          saved: true,
          changed: false,
        }
      }
      if (res.status === 'ERROR' && res.details) {
        return {
          correlationId: null,
          errors: res.details,
        }
      }
    }
    return null
  }

  handleSaveNotificationDissmised () {
    this.setState({ saved: false })
  }

  handleErrorNotificationDissmised () {
    this.setState({ errors: null })
  }

  handleChange (field, params) {
    const { mapper, onChange } = this.props
    return (value) => {
      const v = typeof value === 'object' ? Object.assign({}, value) : value
      const values = { ...this.props.values }
      values[field] = mapper[field](v, values[field], params)
      this.setState(({ changedFields }) => {
        const changedFieldsClone = changedFields.add(field)
        return { changed: true, saved: false, changedFields: changedFieldsClone }
      }, () => {
        onChange(values)
      })
    }
  }

  render () {
    const { buildSections, onCancel } = this.props
    return <React.Fragment>
      <NavigationPrompt when={this.state.changed}>
        {({ isActive, onConfirm, onCancel }) => (
          <NavigationConfirmationModal show={isActive} onYes={onConfirm} onNo={onCancel} />
        )}
      </NavigationPrompt>
      { this.state.saved && <div className={style['alert-container']}>
        <CounterAlert title={msg.changesWasSavedSuccesfully()} onDismiss={this.handleSaveNotificationDissmised} />
      </div>}
      { this.state.errors && <div className={style['alert-container']}>
        <CounterAlert
          type='error'
          title={
            msg.someFieldsWasNotSaved({
              fields: Object.keys(this.state.errors).map(e => msg[e]()).join(', '),
            })
          }
          onDismiss={this.handleErrorNotificationDissmised}
        />
      </div>}
      <SettingsToolbar onSave={this.handleSave} onCancel={onCancel} />
      <SettingsBase sections={buildSections(this.handleChange)} />
    </React.Fragment>
  }
}
Settings.propTypes = {
  mapper: PropTypes.object.isRequired,
  values: PropTypes.object.isRequired,
  options: PropTypes.object.isRequired,
  buildSections: PropTypes.func.isRequired,
  onChange: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
}

export default connect(
  (state) => ({
    options: state.options,
  }),
)(Settings)
