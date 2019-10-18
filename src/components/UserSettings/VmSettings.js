import React, { Component } from 'react'
import PropTypes from 'prop-types'
import Immutable from 'immutable'

import { connect } from 'react-redux'
import { push } from 'connected-react-router'
import { saveVmsOptions, getByPage } from '_/actions'
import { msg } from '_/intl'
import naturalCompare from 'string-natural-compare'
import InfiniteScroll from 'react-infinite-scroller'
import { Checkbox, Switch, Card, CardHeading, CardTitle } from 'patternfly-react'
import Settings from '../Settings'
import SaveConfirmationModal from './SaveConfirmationModal'

import style from './style.css'
const EMPTY_MAP = Immutable.fromJS({})

const valuesMapper = {
  'dontDisturb': (value) => value,
  'autoConnect': (e) => e.target.checked,
  'ctrlAltDel': (value) => value,
  'smartcard': (e) => e.target.checked,
  'fullScreenMode': (value) => value,
  'displayUnsavedWarnings': (e) => e.target.checked,
  'confirmForceShutdown': (e) => e.target.checked,
  'confirmVmDeleting': (e) => e.target.checked,
  'confirmVmSuspending': (e) => e.target.checked,
  'disturb': (value) => value,
}

class VmSettings extends Component {
  constructor (props) {
    super(props)
    this.isMultiSelected = props.isMultiSelect
    const globalSettings = props.options.get('options', EMPTY_MAP)
    const vmSettings = !this.isMultiSelected ? props.options.getIn(['vms', props.selectedVms[0]], EMPTY_MAP) : EMPTY_MAP
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
        disturb: !vmSettings.get('disturb', false),
      },
      selectedVms: props.selectedVms,
      showSaveConfirmation: false,
    }
    this.handleSave = this.handleSave.bind(this)
    this.handleChange = this.handleChange.bind(this)
    this.handleCancel = this.handleCancel.bind(this)
    this.buildSections = this.buildSections.bind(this)
    this.handleVmCheck = this.handleVmCheck.bind(this)
    this.handleAllVmsCheck = this.handleAllVmsCheck.bind(this)
    this.handleSaveConfirmation = this.handleSaveConfirmation.bind(this)
  }

  handleSave (values, correlationId) {
    const { saveOptions } = this.props
    const { selectedVms } = this.state
    this.setState({ showSaveConfirmation: false }, () => saveOptions(values, selectedVms, correlationId))
  }

  handleCancel () {
    this.props.goToVmPage()
  }

  handleVmCheck (vmId) {
    return () => {
      this.setState(state => {
        let selectedVms = new Set(state.selectedVms)
        if (selectedVms.has(vmId)) {
          selectedVms.delete(vmId)
        } else {
          selectedVms.add(vmId)
        }
        return {
          selectedVms: [...selectedVms],
        }
      })
    }
  }

  handleAllVmsCheck (e) {
    if (e.target.checked) {
      this.setState({
        selectedVms: this.props.vms.get('vms').keySeq().toJS(),
      })
    } else {
      this.setState({
        selectedVms: [],
      })
    }
  }

  handleSaveConfirmation (values, correlationId) {
    if (this.isMultiSelected) {
      this.saveValues = values
      this.correlationId = correlationId
      this.setState({
        showSaveConfirmation: true,
      })
    } else {
      this.handleSave(values, correlationId)
    }
  }

  handleChange (values) {
    this.setState({ values })
  }

  buildSections (onChange) {
    const { vms } = this.props
    const { values, selectedVms } = this.state
    const idPrefix = 'vm-user-settings'
    return {
      vm: {
        title: msg.confirmationMessages(),
        fields: [
          {
            title: msg.displayUnsavedChangesWarnings(),
            body: <Checkbox
              id={`${idPrefix}-display-unsaved-warnings`}
              checked={values.displayUnsavedWarnings}
              onChange={onChange('displayUnsavedWarnings')}
            >
              {msg.displayUnsavedChangesWarningsDetail()}
            </Checkbox>,
          },
          {
            title: msg.confirmForceShutdowns(),
            body: <Checkbox
              id={`${idPrefix}-confirm-force-shutdown`}
              checked={values.confirmForceShutdown}
              onChange={onChange('confirmForceShutdown')}
            >
              {msg.confirmForceShutdownsDetails()}
            </Checkbox>,
          },
          {
            title: msg.confirmDeletingVm(),
            body: <Checkbox
              id={`${idPrefix}-confirm-deleting-vm`}
              checked={values.confirmVmDeleting}
              onChange={onChange('confirmVmDeleting')}
            >
              {msg.confirmDeletingVmDetails()}
            </Checkbox>,
          },
          {
            title: msg.confirmSuspendingVm(),
            body: <Checkbox
              id={`${idPrefix}-confirm-suspending-vm`}
              checked={values.confirmVmSuspending}
              onChange={onChange('confirmVmSuspending')}
            >
              {msg.confirmSuspendingVmDetails()}
            </Checkbox>,
          },
        ],
      },
      console: (this.isMultiSelected || vms.get('vms').filter(vm => selectedVms.includes(vm.get('id')) && vm.get('canUserUseConsole')).size > 0) && {
        title: msg.console(),
        fields: [
          {
            title: msg.fullScreenMode(),
            body: <Switch
              id={`${idPrefix}-full-screen`}
              bsSize='normal'
              title='normal'
              value={values.fullScreenMode}
              onChange={(e, state) => onChange('fullScreenMode')(state)}
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
              onChange={(e, state) => onChange('ctrlAltDel')(state)}
            />,
          },
          {
            title: msg.automaticConsoleConnection(),
            body: <Checkbox
              id={`${idPrefix}-autoconnect`}
              checked={values.autoConnect}
              onChange={onChange('autoConnect')}
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
              onChange={onChange('smartcard')}
            >
              {msg.smartcardDetails()}
            </Checkbox>,
          },
        ],
      },
      notifications: {
        title: msg.notifications(),
        tooltip: msg.notificationSettingsAffectAllMetricsNotifications(),
        fields: [
          {
            title: msg.disableAllNotifications(),
            body: <Switch
              id={`${idPrefix}-disable-notifications`}
              bsSize='normal'
              title='normal'
              value={values.disturb}
              onChange={(e, state) => onChange('disturb')(state)}
            />,
          },
        ],
      },
    }
  }

  render () {
    const { vms, loadAnotherPage } = this.props
    const { selectedVms } = this.state
    const loadMore = () => {
      if (vms.get('notAllPagesLoaded')) {
        loadAnotherPage(vms.get('page') + 1)
      }
    }
    return (
      <div className='container'>
        <div className={style['vms-settings-box']}>
          <Settings
            buildSections={this.buildSections}
            values={this.state.values}
            mapper={valuesMapper}
            onSave={this.handleSaveConfirmation}
            onCancel={this.handleCancel}
            onChange={this.handleChange}
          />
          { this.isMultiSelected &&
            <Card className={style['vms-card']}>
              <CardHeading>
                <CardTitle>
                  {msg.selectedVirtualMachines()}
                </CardTitle>
              </CardHeading>
              <div>
                <Checkbox
                  onChange={this.handleAllVmsCheck}
                  checked={vms.get('vms').size === selectedVms.length}
                >
                  {msg.selectAllVirtualMachines()}
                </Checkbox>
              </div>
              <div style={{ overflow: 'auto', height: 'calc(100% - 120px)' }}>
                <InfiniteScroll
                  loadMore={loadMore}
                  hasMore={vms.get('notAllPagesLoaded')}
                  useWindow={false}
                  style={{ maxHeight: 0 }}
                >
                  {vms.get('vms')
                    .toList()
                    .sort((vmA, vmB) => naturalCompare.caseInsensitive(vmA.get('name'), vmB.get('name')))
                    .sort((vmA, vmB) => selectedVms.includes(vmA.get('id')) && !selectedVms.includes(vmB.get('id')) ? -1 : 0)
                    .map(vm => <div key={vm.get('id')}>
                      <Checkbox
                        onChange={this.handleVmCheck(vm.get('id'))}
                        checked={selectedVms.includes(vm.get('id'))}
                      >
                        {vm.get('name')}
                      </Checkbox>
                    </div>)}
                </InfiniteScroll>
              </div>
            </Card>
          }
          { this.isMultiSelected &&
            <SaveConfirmationModal
              vms={vms.get('vms').filter(vm => selectedVms.includes(vm.get('id'))).toList()}
              show={this.state.showSaveConfirmation}
              onConfirm={() => this.handleSave(this.saveValues, this.correlationId)}
              onClose={() => this.setState({ showSaveConfirmation: false })}
            />
          }
        </div>
      </div>
    )
  }
}
VmSettings.propTypes = {
  vms: PropTypes.object.isRequired,
  selectedVms: PropTypes.array.isRequired,
  options: PropTypes.object.isRequired,
  isMultiSelect: PropTypes.bool,
  saveOptions: PropTypes.func.isRequired,
  goToVmPage: PropTypes.func.isRequired,
  loadAnotherPage: PropTypes.func.isRequired,
}

export default connect(
  (state) => ({
    config: state.config,
    options: state.options,
    vms: state.vms,
  }),

  (dispatch, { selectedVms }) => ({
    saveOptions: (values, vmIds, correlationId) => dispatch(saveVmsOptions({ values, vmIds }, { correlationId })),
    goToVmPage: () => {
      if (selectedVms.length === 1) {
        dispatch(push(`/vm/${selectedVms[0]}`))
      } else {
        dispatch(push('/'))
      }
    },
    loadAnotherPage: (page) => dispatch(getByPage({ page })),
  })
)(VmSettings)
