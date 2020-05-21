import React, { Component } from 'react'
import PropTypes from 'prop-types'
import Immutable from 'immutable'

import { connect } from 'react-redux'
import { saveVmsOptions } from '_/actions'
import { msg } from '_/intl'
import Settings from '../Settings'
import SaveConfirmationModal from './SaveConfirmationModal'
import SettingsBase from '../Settings/SettingsBase'
import OptionalCheckbox from './OptionalCheckbox'
import OptionalSwitch from './OptionalSwitch'

import style from './style.css'
const EMPTY_MAP = Immutable.fromJS({})

class VmSettings extends Component {
  constructor (props) {
    super(props)
    this.state = {

      draftValues: {
        ...props.currentValues,
      },
      baseValues: {
        ...props.currentValues,
      },
      sentValues: {},
      names: {
        displayUnsavedWarnings: msg.displayUnsavedChangesWarnings(),
        confirmForceShutdown: msg.confirmForceShutdowns(),
        confirmVmDeleting: msg.confirmDeletingVm(),
        confirmVmSuspending: msg.confirmSuspendingVm(),
        autoConnect: msg.automaticConsoleConnection(),
        ctrlAltDel: msg.ctrlAltDel(),
        smartcard: msg.smartcard(),
        fullScreenMode: msg.fullScreenMode(),
        showNotifications: msg.disableAllNotifications(),
      },
      baseSelectedVms: props.selectedVms,
      showSaveConfirmation: false,
    }

    this.handleSave = this.handleSave.bind(this)
    this.handleCancel = this.handleCancel.bind(this)
    this.buildSections = this.buildSections.bind(this)
    this.handleSaveConfirmation = this.handleSaveConfirmation.bind(this)
    this.resetBaseValues = this.resetBaseValues.bind(this)
  }

  handleSave (values, correlationId) {
    const { selectedVms, saveOptions } = this.props
    saveOptions(values, selectedVms, correlationId)
    const sentValues = { ...values }
    this.setState({ sentValues })
  }

  resetBaseValues () {
    const { currentValues } = this.props
    const baseValues = { ...currentValues }
    const sentValues = {}
    this.setState({ sentValues, baseValues })
  }

  handleCancel () {
    this.props.goToVmPage()
  }

  handleSaveConfirmation (values, correlationId, changedInPrevTransaction) {
    if (this.props.isMultiSelect) {
      this.setState({
        showSaveConfirmation: {
          values,
          correlationId,
          changedInPrevTransaction,
        },
      })
    } else {
      this.handleSave(values, correlationId, changedInPrevTransaction)
    }
  }

  buildSections (onChange) {
    const { canUseConsole, isMultiSelect } = this.props
    const { draftValues, names } = this.state
    const idPrefix = 'vm-user-settings'
    return {
      vm: {
        title: msg.confirmationMessages(),
        fields: [
          {
            title: names.displayUnsavedWarnings,
            body: <OptionalCheckbox
              id={`${idPrefix}-display-unsaved-warnings`}
              value={draftValues.displayUnsavedWarnings}
              onChange={onChange('displayUnsavedWarnings')}
              label={msg.displayUnsavedChangesWarningsDetail()}
              isMultiSelect={isMultiSelect}
            />,
          },
          {
            title: names.confirmForceShutdown,
            body: <OptionalCheckbox
              id={`${idPrefix}-confirm-force-shutdown`}
              value={draftValues.confirmForceShutdown}
              onChange={onChange('confirmForceShutdown')}
              label={msg.confirmForceShutdownsDetails()}
              isMultiSelect={isMultiSelect}
            />,
          },
          {
            title: names.confirmVmDeleting,
            body: <OptionalCheckbox
              id={`${idPrefix}-confirm-deleting-vm`}
              value={draftValues.confirmVmDeleting}
              onChange={onChange('confirmVmDeleting')}
              label={msg.confirmDeletingVmDetails()}
              isMultiSelect={isMultiSelect}
            />,
          },
          {
            title: names.confirmVmSuspending,
            body: <OptionalCheckbox
              id={`${idPrefix}-confirm-suspending-vm`}
              value={draftValues.confirmVmSuspending}
              onChange={onChange('confirmVmSuspending')}
              label={msg.confirmSuspendingVmDetails()}
              isMultiSelect={isMultiSelect}
            />,
          },
        ],
      },
      console: canUseConsole && {
        title: msg.console(),
        fields: [
          {
            title: names.fullScreenMode,
            body: <OptionalSwitch
              id={`${idPrefix}-full-screen`}
              bsSize='normal'
              title='normal'
              value={draftValues.fullScreenMode}
              onChange={onChange('fullScreenMode')}
              isMultiSelect={isMultiSelect}
            />,
          },
          {
            title: names.ctrlAltDel,
            tooltip: msg.ctrlAltDelTooltip(),
            body: <OptionalSwitch
              id={`${idPrefix}-ctrl-alt-del`}
              bsSize='normal'
              title='normal'
              value={draftValues.ctrlAltDel}
              onChange={onChange('ctrlAltDel')}
              isMultiSelect={isMultiSelect}
            />,
          },
          {
            title: names.autoConnect,
            body: <OptionalCheckbox
              id={`${idPrefix}-autoconnect`}
              value={draftValues.autoConnect}
              onChange={onChange('autoConnect')}
              label={msg.automaticConsoleConnectionDetails()}
              isMultiSelect={isMultiSelect}
            />,
          },
          {
            title: names.smartcard,
            tooltip: msg.smartcardTooltip(),
            body: <OptionalCheckbox
              id={`${idPrefix}-smartcard`}
              value={draftValues.smartcard}
              onChange={onChange('smartcard')}
              label={msg.smartcardDetails()}
              isMultiSelect={isMultiSelect}
            />,
          },
        ],
      },
      notifications: {
        title: msg.notifications(),
        tooltip: msg.notificationSettingsAffectAllMetricsNotifications(),
        fields: [
          {
            title: names.showNotifications,
            body: <OptionalSwitch
              id={`${idPrefix}-disable-notifications`}
              bsSize='normal'
              title='normal'
              value={draftValues.showNotifications === undefined ? undefined : !draftValues.showNotifications}
              onChange={(dontDisturb) => onChange('showNotifications')(dontDisturb === undefined ? undefined : !dontDisturb)}
              isMultiSelect={isMultiSelect}
            />,
          },
        ],
      },
    }
  }

  render () {
    const { selectedVmsWithDetails, lastCorrelationId, currentValues, isMultiSelect } = this.props
    const { showSaveConfirmation, draftValues, baseValues, sentValues, names } = this.state

    const dismissConfirmation = () => this.setState({ showSaveConfirmation: false })
    const saveAndDismissConfirmation = () => {
      const { showSaveConfirmation: { values, correlationId, changedInPrevTransaction } } = this.state
      this.handleSave(values, correlationId, changedInPrevTransaction)
      dismissConfirmation()
    }

    const onChange = (field, params) => {
      return (value) => {
        const values = { ...draftValues }
        values[field] = value
        this.setState({ draftValues: values })
      }
    }

    return (
      <div className='container'>
        <div className={style['vms-settings-box']}>
          <Settings
            draftValues={draftValues}
            baseValues={baseValues}
            currentValues={currentValues}
            sentValues={sentValues}
            names={names}
            lastCorrelationId={lastCorrelationId}
            resetBaseValues={this.resetBaseValues}
            onSave={this.handleSaveConfirmation}
            onCancel={this.handleCancel}
          >
            <SettingsBase sections={this.buildSections(onChange)} />
          </Settings>
          {this.props.children}
        </div>
        {isMultiSelect && <SaveConfirmationModal
          vms={selectedVmsWithDetails}
          show={!!showSaveConfirmation}
          onConfirm={saveAndDismissConfirmation}
          onClose={dismissConfirmation}
        />}
      </div>
    )
  }
}
VmSettings.propTypes = {
  children: PropTypes.node,
  currentValues: PropTypes.object.isRequired,
  lastCorrelationId: PropTypes.string,
  isMultiSelect: PropTypes.bool,
  canUseConsole: PropTypes.bool,
  selectedVmsWithDetails: PropTypes.array.isRequired,
  selectedVms: PropTypes.array.isRequired,
  saveOptions: PropTypes.func.isRequired,
  goToVmPage: PropTypes.func.isRequired,
}

export default connect(
  (state, ownProps) => {
    const { selectedVms, vms } = ownProps
    const isMultiSelect = selectedVms.length > 1
    const defaultValues = isMultiSelect ? {} : state.options.get('globalVm').toJS()
    const vmsOptions = state.options.getIn(['vms'], EMPTY_MAP)

    const intersect = (field) => {
      const defaultValue = defaultValues[field]
      const values = selectedVms.map(id => vmsOptions.getIn([id, field])).filter(value => value !== undefined)
      if (values.length !== selectedVms.length) {
        console.warn(`Property ${field} is undefined for some vms: ${selectedVms.join(' | ')}`)
        return defaultValue
      }
      const unique = new Set(values)
      if (unique.size === 1) {
        return unique.values().next().value
      }

      console.warn(`No common property ${field} found for ${selectedVms.join(' | ')}`)
      return defaultValue
    }

    const set = new Set(selectedVms)
    const onlySelected = vms.filter(vm => set.has(vm.get('id'))).toList().toJS()

    return {
      currentValues: {
        displayUnsavedWarnings: intersect('displayUnsavedWarnings'),
        confirmForceShutdown: intersect('confirmForceShutdown'),
        confirmVmDeleting: intersect('confirmVmDeleting'),
        confirmVmSuspending: intersect('confirmVmSuspending'),
        autoConnect: intersect('autoConnect'),
        ctrlAltDel: intersect('ctrlAltDel'),
        smartcard: intersect('smartcard'),
        fullScreenMode: intersect('fullScreenMode'),
        showNotifications: intersect('showNotifications'),
      },
      lastCorrelationId: state.options.getIn(['results', 'vms', 'correlationId'], ''),
      selectedVmsWithDetails: onlySelected,
      isMultiSelect,
      canUseConsole: isMultiSelect || onlySelected.filter(({ canUserUseConsole }) => canUserUseConsole).size > 0,
    }
  },

  (dispatch, { selectedVms }) => ({
    saveOptions: (values, vmIds, correlationId) => dispatch(saveVmsOptions({ values, vmIds }, { correlationId })),
  })
)(VmSettings)
