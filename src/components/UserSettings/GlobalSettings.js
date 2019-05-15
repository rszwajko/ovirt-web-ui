import React, { Component } from 'react'
import PropTypes from 'prop-types'
import Immutable from 'immutable'

import { connect } from 'react-redux'
import { push } from 'connected-react-router'
import { resetGlobalSettings, saveGlobalOptions } from '_/actions'
import { FormControl, Checkbox, Switch } from 'patternfly-react'
import { localeWithFullName, locale, msg } from '_/intl'

import { generateUnique } from '_/helpers'
import Settings from '../Settings'
import SelectBox from '../SelectBox'
import NavigationPrompt from 'react-router-navigation-prompt'
import NavigationConfirmationModal from '../NavigationConfirmationModal'
import VmsNotificationsList from './VmsNotificationsList'
import SettingsToolbar from './SettingsToolbar'
import style from './style.css'
import CounterAlert from './CounterAlert'
import SaveConfirmationModal from './SaveConfirmationModal'
import ResetConfirmationModal from './ResetConfirmationModal'

const EMPTY_MAP = Immutable.fromJS({})

const valuesMapper = {
  'language': (value) => value,
  'sshKey': (value) => value,
  'dontDisturb': (value) => value,
  'updateRate': (value) => value,
  'ctrlAltDel': (value) => value,
  'fullScreenMode': (value) => value,
  'disableNotifications': (e) => e.target.checked,
  'displayUnsavedWarnings': (e) => e.target.checked,
  'confirmForceShutdown': (e) => e.target.checked,
  'confirmVmDeleting': (e) => e.target.checked,
  'confirmVmSuspending': (e) => e.target.checked,
  'autoConnect': (e) => e.target.checked,
  'smartcard': (e) => e.target.checked,
  'allVmsNotifications': (value) => value,
  'vmsNotifications': (e, prevValue, params) => {
    if (params && params.vmId) {
      return Object.assign({}, prevValue, { [params.vmId]: e.target.checked })
    }
    return e
  },
}

const dontDisturbList = [
  {
    id: 5,
    value: msg.numberOfMinutes({ minute: 5 }),
  },
  {
    id: 15,
    value: msg.numberOfMinutes({ minute: 15 }),
  },
  {
    id: 30,
    value: msg.numberOfMinutes({ minute: 30 }),
  },
  {
    id: 60,
    value: msg.numberOfMinutes({ minute: 60 }),
  },
]

const updateRateList = [
  {
    id: 30,
    value: msg.every30Seconds(),
  },
  {
    id: 60,
    value: msg.everyMinute(),
  },
  {
    id: 120,
    value: msg.every2Minute(),
  },
  {
    id: 300,
    value: msg.every5Minute(),
  },
]

class GlobalSettings extends Component {
  constructor (props) {
    super(props)
    const vmsNotifications = props.options.get('vms', EMPTY_MAP).map(v => v.get('notifications', null)).filter(v => v !== null).toJS()
    this.state = {
      values: {
        sshKey: props.options.getIn(['options', 'ssh', 'key']),
        language: props.options.getIn(['options', 'language']) || locale,
        dontDisturb: props.options.getIn(['options', 'dontDisturb']) || false,
        dontDisturbFor: props.options.getIn(['options', 'dontDisturbFor']) || dontDisturbList[0].id,
        vmsNotifications: vmsNotifications || {},
        allVmsNotifications: props.options.getIn(['options', 'allVmsNotifications']) || false,
        updateRate: props.options.getIn(['options', 'updateRate']) || 60,
        autoConnect: props.options.getIn(['options', 'autoConnect']) || false,
        displayUnsavedWarnings: props.options.getIn(['options', 'displayUnsavedWarnings'], true),
        confirmForceShutdown: props.options.getIn(['options', 'confirmForceShutdown'], true),
        confirmVmDeleting: props.options.getIn(['options', 'confirmVmDeleting'], true),
        confirmVmSuspending: props.options.getIn(['options', 'confirmVmSuspending'], true),
        ctrlAltDel: props.options.getIn(['options', 'ctrlAltDel']) || false,
        smartcard: props.options.getIn(['options', 'smartcard']) || false,
        fullScreenMode: props.options.getIn(['options', 'fullScreenMode']) || false,
      },
      saved: false,
      errors: null,
      changed: false,
      updateValues: false,
      showSaveConfirmation: false,
      showResetConfirmation: false,
      changedFields: new Set(),
      correlationId: null,
    }
    this.handleChange = this.handleChange.bind(this)
    this.handleSave = this.handleSave.bind(this)
    this.handleCancel = this.handleCancel.bind(this)
    this.handleReset = this.handleReset.bind(this)
    this.handleSaveNotificationDissmised = this.handleSaveNotificationDissmised.bind(this)
    this.handleErrorNotificationDissmised = this.handleErrorNotificationDissmised.bind(this)
    this.handleResetConfirmation = this.handleResetConfirmation.bind(this)
  }

  static getDerivedStateFromProps (props, state) {
    if (state.updateValues) {
      const vmsNotifications = props.options.get('vms', EMPTY_MAP).map(v => v.get('notifications', null)).filter(v => v !== null).toJS()
      return {
        values: {
          sshKey: props.options.getIn(['options', 'ssh', 'key']),
          language: props.options.getIn(['options', 'language']) || locale,
          dontDisturb: props.options.getIn(['options', 'dontDisturb']) || false,
          dontDisturbFor: props.options.getIn(['options', 'dontDisturbFor']) || dontDisturbList[0].id,
          vmsNotifications: vmsNotifications || {},
          allVmsNotifications: props.options.getIn(['options', 'allVmsNotifications']) || false,
          updateRate: props.options.getIn(['options', 'updateRate']) || 60,
          autoConnect: props.options.getIn(['options', 'autoConnect']) || false,
          displayUnsavedWarnings: props.options.getIn(['options', 'displayUnsavedWarnings'], true),
          confirmForceShutdown: props.options.getIn(['options', 'confirmForceShutdown'], true),
          confirmVmDeleting: props.options.getIn(['options', 'confirmVmDeleting'], true),
          confirmVmSuspending: props.options.getIn(['options', 'confirmVmSuspending'], true),
          ctrlAltDel: props.options.getIn(['options', 'ctrlAltDel']) || false,
          smartcard: props.options.getIn(['options', 'smartcard']) || false,
          fullScreenMode: props.options.getIn(['options', 'fullScreenMode']) || false,
        },
        updateValues: false,
      }
    }
    const res = props.options.getIn(['results', state.correlationId])
    if (state.correlationId !== null && res) {
      if (res.status === 'OK') {
        if (state.changedFields.has('language')) {
          document.location.href = '/settings'
        }
        return {
          correlationId: null,
          saved: true,
          changed: false,
          changedFields: new Set(),
        }
      }
      if (res.status === 'ERROR' && res.details) {
        return {
          correlationId: null,
          errors: res.details,
          changedFields: new Set(),
        }
      }
    }
    return null
  }

  handleSave (avoidConfirmation = false, checkedVms) {
    const { options, saveOptions } = this.props
    if (options.get('vms').size > 0 && !avoidConfirmation) {
      this.setState({ showSaveConfirmation: true })
    } else {
      const { values, changedFields } = this.state
      const saveFields = [...changedFields].reduce((acc, cur) => ({ ...acc, [cur]: values[cur] }), {})
      this.setState({ correlationId: generateUnique('GlobalSettings-save_') }, () => saveOptions(saveFields, checkedVms, this.state.correlationId))
    }
  }

  handleChange (field, params) {
    return (value, changeState = true) => {
      const v = typeof value === 'object' ? Object.assign({}, value) : value
      this.setState((state) => {
        const { values, changedFields } = this.state
        const changedFieldsClone = changedFields.add(field)
        values[field] = valuesMapper[field](v, values[field], params)
        if (changeState) {
          return { values, changed: true, saved: false, changedFields: changedFieldsClone }
        }
        return { values }
      })
    }
  }

  handleSaveNotificationDissmised () {
    this.setState({ saved: false })
  }

  handleErrorNotificationDissmised () {
    this.setState({ errors: null })
  }

  componentDidUpdate (prevProps, prevState) {
    const { options } = prevProps
    const prevSshKey = options.getIn(['options', 'ssh', 'key'])
    if (!prevSshKey && prevSshKey !== this.props.options.getIn(['options', 'ssh', 'key']) && prevState.values.sshKey === prevSshKey) {
      this.handleChange('sshKey')(this.props.options.getIn(['options', 'ssh', 'key']), false)
    }
  }

  handleCancel () {
    this.props.goToMainPage()
  }

  handleResetConfirmation () {
    this.setState({ showResetConfirmation: true })
  }

  handleReset () {
    this.setState({ saved: true, changed: false, updateValues: true, showResetConfirmation: false })
    this.props.resetSettings()
  }

  render () {
    const { config } = this.props
    const { values } = this.state
    const idPrefix = 'global-user-settings'
    const sections = {
      general: {
        title: msg.general(),
        fields: [
          {
            title: msg.username(),
            body: <span>{config.getIn(['user', 'name'])}</span>,
          },
          {
            title: msg.email(),
            body: <span>{config.getIn(['user', 'email'])}</span>,
          },
          {
            title: msg.language(),
            body: <SelectBox
              id={`${idPrefix}-language`}
              items={localeWithFullName}
              selected={values.language}
              onChange={this.handleChange('language')}
            />,
          },
        ],
      },
      vm: [{
        title: msg.virtualMachines(),
        tooltip: msg.globalSettingsWillBeApplied(),
        fields: [
          {
            title: msg.uiRefresh(),
            body: <SelectBox
              id={`${idPrefix}-update-rate`}
              items={updateRateList}
              selected={values.updateRate}
              onChange={this.handleChange('updateRate')}
            />,
          },
        ],
      },
      {
        title: msg.confirmationMessages(),
        fields: [
          {
            title: msg.displayUnsavedChangesWarnings(),
            body: <Checkbox id={`${idPrefix}-display-unsaved-warnings`} checked={values.displayUnsavedWarnings} onChange={this.handleChange('displayUnsavedWarnings')}>
              {msg.displayUnsavedChangesWarningsDetail()}
            </Checkbox>,
          },
          {
            title: msg.confirmForceShutdowns(),
            body: <Checkbox id={`${idPrefix}-confirm-force-shutdown`} checked={values.confirmForceShutdown} onChange={this.handleChange('confirmForceShutdown')}>
              {msg.confirmForceShutdownsDetails()}
            </Checkbox>,
          },
          {
            title: msg.confirmDeletingVm(),
            body: <Checkbox id={`${idPrefix}-confirm-deleting-vm`} checked={values.confirmVmDeleting} onChange={this.handleChange('confirmVmDeleting')}>
              {msg.confirmDeletingVmDetails()}
            </Checkbox>,
          },
          {
            title: msg.confirmSuspendingVm(),
            body: <Checkbox id={`${idPrefix}-confirm-suspending-vm`} checked={values.confirmVmSuspending} onChange={this.handleChange('confirmVmSuspending')}>
              {msg.confirmSuspendingVmDetails()}
            </Checkbox>,
          },
        ],
      }],
      console: {
        title: msg.console(),
        tooltip: msg.globalSettingsWillBeApplied(),
        fields: [
          {
            title: msg.sshKey(),
            tooltip: msg.sshKeyTooltip(),
            body: <FormControl
              id={`${idPrefix}-ssh-key`}
              componentClass='textarea'
              onChange={e => this.handleChange('sshKey')(e.target.value)}
              value={values.sshKey}
            />,
          },
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
            body: <Checkbox id={`${idPrefix}-autoconnect`} checked={values.autoConnect} onChange={this.handleChange('autoConnect')}>
              {msg.automaticConsoleConnectionDetails()}
            </Checkbox>,
          },
          {
            title: msg.smartcard(),
            tooltip: msg.smartcardTooltip(),
            body: <Checkbox id={`${idPrefix}-smartcard`} checked={values.smartcard} onChange={this.handleChange('smartcard')}>
              {msg.smartcardDetails()}
            </Checkbox>,
          },
        ],
      },
      notifications: {
        title: msg.notifications(),
        fields: [
          {
            title: msg.dontDisturb(),
            body: <Switch
              id={`${idPrefix}-dont-disturb`}
              bsSize='normal'
              title='normal'
              value={values.dontDisturb}
              onChange={(e, state) => this.handleChange('dontDisturb')(state)}
            />,
          },
          {
            title: msg.dontDisturbFor(),
            body: <SelectBox
              id={`${idPrefix}-dont-disturb-for`}
              items={dontDisturbList}
              selected={values.dontDisturbFor}
              onChange={this.handleChange('dontDisturbFor')}
              disabled={!values.dontDisturb}
            />,
          },
          {
            title: msg.disableVmNotifications(),
            body: <VmsNotificationsList vmsNotifications={values.vmsNotifications} defaultValue={values.allVmsNotifications} handleChange={this.handleChange} />,
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
        <SaveConfirmationModal
          show={this.state.showSaveConfirmation}
          onClose={() => this.setState({ showSaveConfirmation: false })}
          onSave={this.handleSave}
        />
        <ResetConfirmationModal
          show={this.state.showResetConfirmation}
          onConfirm={this.handleReset}
          onClose={() => this.setState({ showResetConfirmation: false })}
        />
        <SettingsToolbar onSave={() => this.handleSave()} onCancel={this.handleCancel} onReset={this.handleResetConfirmation} />
        <Settings sections={sections} />
      </div>
    )
  }
}
GlobalSettings.propTypes = {
  config: PropTypes.object.isRequired,
  options: PropTypes.object.isRequired,
  saveOptions: PropTypes.func.isRequired,
  goToMainPage: PropTypes.func.isRequired,
  resetSettings: PropTypes.func.isRequired,
}

export default connect(
  (state) => ({
    config: state.config,
    options: state.options,
  }),

  (dispatch) => ({
    saveOptions: (values, checkedVms, correlationId) => dispatch(saveGlobalOptions({ values, checkedVms }, { correlationId })),
    goToMainPage: () => dispatch(push('/')),
    resetSettings: () => dispatch(resetGlobalSettings()),
  })
)(GlobalSettings)
