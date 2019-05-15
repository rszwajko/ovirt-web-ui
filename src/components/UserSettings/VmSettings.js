import React, { Component } from 'react'
import PropTypes from 'prop-types'
import Immutable from 'immutable'

import { connect } from 'react-redux'
import { push } from 'connected-react-router'
import { saveVmOptions, resetVmSettings } from '_/actions'
import { generateUnique } from '_/helpers'
import { msg } from '_/intl'
import { Checkbox, Switch } from 'patternfly-react'
import NavigationPrompt from 'react-router-navigation-prompt'
import NavigationConfirmationModal from '../NavigationConfirmationModal'
import Settings from '../Settings'
import SettingsToolbar from './SettingsToolbar'
import CounterAlert from './CounterAlert'

import style from './style.css'
const EMPTY_MAP = Immutable.fromJS({})

const valuesMapper = {
  'dontDisturb': (value) => value,
  'autoConnect': (e) => e.target.checked,
  'ctrlAltDel': (value) => value,
  'smartcard': (value) => value,
  'displayUnsavedWarnings': (e) => e.target.checked,
  'confirmForceShutdown': (e) => e.target.checked,
  'confirmVmDeleting': (e) => e.target.checked,
  'confirmVmSuspending': (e) => e.target.checked,
  'notifications': (value) => value,
}

class VmSettings extends Component {
  constructor (props) {
    super(props)
    console.log(props.options.toJS())
    const globalSettings = props.options.get('options', EMPTY_MAP)
    const vmSettings = props.options.getIn(['vms', props.vm.get('id')], EMPTY_MAP)
    this.state = {
      values: {
        displayUnsavedWarnings: vmSettings.get('displayUnsavedWarnings', globalSettings.get('displayUnsavedWarnings', true)),
        confirmForceShutdown: vmSettings.get('confirmForceShutdown', globalSettings.get('confirmForceShutdown', true)),
        confirmVmDeleting: vmSettings.get('confirmVmDeleting', globalSettings.get('confirmVmDeleting', true)),
        confirmVmSuspending: vmSettings.get('confirmVmSuspending', globalSettings.get('confirmVmSuspending', true)),
        autoConnect: vmSettings.get('autoConnect', globalSettings.get('autoConnect', false)),
        ctrlAltDel: vmSettings.get('ctrlAltDel', globalSettings.get('ctrlAltDel', false)),
        smartcard: vmSettings.get('smartcard', globalSettings.get('smartcard', false)),
        fullScreenMode: vmSettings.get('fullScreenMode', globalSettings.get('fullScreenMode', false)),
        notifications: vmSettings.get('notifications', props.options.getIn(['options', 'allVmsNotifications'], false)),
      },
      saved: false,
      errors: null,
      changed: false,
      updateValues: false,
      changedFields: new Set(),
      correlationId: null,
    }
    this.handleChange = this.handleChange.bind(this)
    this.handleSave = this.handleSave.bind(this)
    this.handleCancel = this.handleCancel.bind(this)
    this.handleReset = this.handleReset.bind(this)
    this.handleSaveNotificationDissmised = this.handleSaveNotificationDissmised.bind(this)
    this.handleErrorNotificationDissmised = this.handleErrorNotificationDissmised.bind(this)
  }

  handleSave () {
    const { saveOptions } = this.props
    const { values, changedFields } = this.state
    const saveFields = [...changedFields].reduce((acc, cur) => ({ ...acc, [cur]: values[cur] }), {})
    this.setState({ correlationId: generateUnique('VmSettings-save_') }, () => saveOptions(saveFields, this.state.correlationId))
  }

  static getDerivedStateFromProps (props, state) {
    if (state.updateValues) {
      const globalSettings = props.options.get('options', EMPTY_MAP)
      const vmSettings = props.options.getIn(['vms', props.vm.get('id')], EMPTY_MAP)
      return {
        values: {
          displayUnsavedWarnings: vmSettings.get('displayUnsavedWarnings', globalSettings.get('displayUnsavedWarnings', true)),
          confirmForceShutdown: vmSettings.get('confirmForceShutdown', globalSettings.get('confirmForceShutdown', true)),
          confirmVmDeleting: vmSettings.get('confirmVmDeleting', globalSettings.get('confirmVmDeleting', true)),
          confirmVmSuspending: vmSettings.get('confirmVmSuspending', globalSettings.get('confirmVmSuspending', true)),
          autoConnect: vmSettings.get('autoConnect', globalSettings.get('autoConnect', false)),
          ctrlAltDel: vmSettings.get('ctrlAltDel', globalSettings.get('ctrlAltDel', false)),
          smartcard: vmSettings.get('smartcard', globalSettings.get('smartcard', false)),
          fullScreenMode: vmSettings.get('fullScreenMode', globalSettings.get('fullScreenMode', false)),
          notifications: vmSettings.get('notifications', props.options.getIn(['options', 'allVmsNotifications'], false)),
        },
        updateValues: false,
      }
    }
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
          corellationId: null,
          errors: res.details,
        }
      }
    }
    return null
  }

  handleChange (field, params) {
    return (value) => {
      const v = typeof value === 'object' ? Object.assign({}, value) : value
      this.setState((state) => {
        const { values, changedFields } = this.state
        const changedFieldsClone = changedFields.add(field)
        values[field] = valuesMapper[field](v, values[field], params)
        return { values, changed: true, saved: false, changedFields: changedFieldsClone }
      })
    }
  }

  handleSaveNotificationDissmised () {
    this.setState({ saved: false })
  }

  handleErrorNotificationDissmised () {
    this.setState({ errors: null })
  }

  handleCancel () {
    this.props.goToVmPage()
  }

  handleReset () {
    this.setState({ saved: true, changed: false, updateValues: true })
    this.props.resetSettings()
  }

  render () {
    const { vm } = this.props
    const { values } = this.state
    const idPrefix = 'vm-user-settings'
    const sections = {
      vm: {
        title: msg.virtualMachine(),
        tooltip: msg.settingsWillBeAppliedToVm({ name: vm.get('name') }),
        fields: [
          {
            title: msg.displayUnsavedChangesWarnings(),
            body: <Checkbox
              id={`${idPrefix}-display-unsaved-warnings`}
              checked={values.displayUnsavedWarnings}
              onChange={this.handleChange('displayUnsavedWarnings')}
            >
              {msg.displayUnsavedChangesWarningsDetail()}
            </Checkbox>,
          },
          {
            title: msg.confirmForceShutdowns(),
            body: <Checkbox
              id={`${idPrefix}-confirm-force-shutdown`}
              checked={values.confirmForceShutdown}
              onChange={this.handleChange('confirmForceShutdown')}
            >
              {msg.confirmForceShutdownsDetails()}
            </Checkbox>,
          },
          {
            title: msg.confirmDeletingVm(),
            body: <Checkbox
              id={`${idPrefix}-confirm-deleting-vm`}
              checked={values.confirmVmDeleting}
              onChange={this.handleChange('confirmVmDeleting')}
            >
              {msg.confirmDeletingVmDetails()}
            </Checkbox>,
          },
          {
            title: msg.confirmSuspendingVm(),
            body: <Checkbox
              id={`${idPrefix}-confirm-suspending-vm`}
              checked={values.confirmVmSuspending}
              onChange={this.handleChange('confirmVmSuspending')}
            >
              {msg.confirmSuspendingVmDetails()}
            </Checkbox>,
          },
        ],
      },
      console: vm.get('canUserUseConsole') && {
        title: msg.console(),
        tooltip: msg.settingsWillBeAppliedToVm({ name: vm.get('name') }),
        fields: [
          {
            title: msg.fullScreenMode(),
            body: <Switch
              id={`${idPrefix}-full-screen`}
              bsSize='normal'
              title='normal'
              value={values.fullScreenMode}
              onChange={(e, state) => this.handleChange('fullScreenMode')(state)}
            />,
          },
          {
            title: msg.ctrlAltDel(),
            tooltip: msg.ctrlAltDelTooltip(),
            body: <Switch
              id={`${idPrefix}-ctrl-alt-del`}
              bsSize='normal'
              title='normal'
              value={values.ctrlAltDel}
              onChange={(e, state) => this.handleChange('ctrlAltDel')(state)}
            />,
          },
          {
            title: msg.automaticConsoleConnection(),
            body: <Checkbox
              id={`${idPrefix}-autoconnect`}
              checked={values.autoConnect}
              onChange={this.handleChange('autoConnect')}
            >
              {msg.automaticConsoleConnectionDetails()}
            </Checkbox>,
          },
          {
            title: msg.smartcard(),
            tooltip: msg.smartcardTooltip(),
            body: <Checkbox
              id={`${idPrefix}-smartcard`}
              checked={values.smartcard}
              onChange={this.handleChange('smartcard')}
            >
              {msg.smartcardDetails()}
            </Checkbox>,
          },
        ],
      },
      notifications: {
        title: msg.notifications(),
        tooltip: msg.settingsWillBeAppliedToVm({ name: vm.get('name') }),
        fields: [
          {
            title: msg.disableAllNotifications(),
            body: <Switch
              id={`${idPrefix}-disable-notifications`}
              bsSize='normal'
              title='normal'
              value={values.notifications}
              onChange={(e, state) => this.handleChange('notifications')(state)}
            />,
          },
        ],
      },
    }
    return (
      <div className='container'>
        <NavigationPrompt when={this.state.changed}>
          {({ isActive, onConfirm, onCancel }) => (
            <NavigationConfirmationModal show={isActive} onYes={onConfirm} onNo={onCancel} />
          )}
        </NavigationPrompt>
        { this.state.saved && <div className={style['alert-container']}>
          <CounterAlert
            title={msg.changesWasSavedSuccesfully()}
            onDismiss={this.handleSaveNotificationDissmised} />
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
        <SettingsToolbar onSave={this.handleSave} onCancel={this.handleCancel} onReset={this.handleReset} />
        <Settings sections={sections} />
      </div>
    )
  }
}
VmSettings.propTypes = {
  vm: PropTypes.object.isRequired,
  options: PropTypes.object.isRequired,
  saveOptions: PropTypes.func.isRequired,
  resetSettings: PropTypes.func.isRequired,
  goToVmPage: PropTypes.func.isRequired,
}

export default connect(
  (state) => ({
    config: state.config,
    options: state.options,
  }),

  (dispatch, { vm }) => ({
    saveOptions: (values, correlationId) => dispatch(saveVmOptions({ values, vmId: vm.get('id') }, { correlationId })),
    goToVmPage: () => dispatch(push(`/vm/${vm.get('id')}`)),
    resetSettings: () => dispatch(resetVmSettings({ vmId: vm.get('id') })),
  })
)(VmSettings)
