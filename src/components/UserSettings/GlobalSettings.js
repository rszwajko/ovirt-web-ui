import React, { Component } from 'react'
import PropTypes from 'prop-types'

import { connect } from 'react-redux'
import { push } from 'connected-react-router'
import { saveGlobalOptions } from '_/actions'
import { FormControl, Switch } from 'patternfly-react'
import { msg } from '_/intl'
import localeWithFullName from '_/intl/localeWithFullName'
import style from './style.css'

import { Settings, SettingsBase } from '../Settings'
import SelectBox from '../SelectBox'
import moment from 'moment'

class GlobalSettings extends Component {
  dontDisturbList = [
    {
      id: 10,
      value: moment.duration(10, 'minutes').humanize(),
    },
    {
      id: 60,
      value: moment.duration(1, 'hours').humanize(),
    },
    {
      id: 60 * 24,
      value: moment.duration(1, 'days').humanize(),
    },
    {
      id: Number.MAX_SAFE_INTEGER,
      value: msg.sessionDuration(),
    },
  ]

  updateRateList = [
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

  constructor (props) {
    super(props)
    /**
     * Typical flow (happy path):
     * 1. at the begining:
     *    baseValues == draftValues == currentValues
     * 2. after user edit:
     *    baseValues == currentValues
     *    BUT
     *    baseValues != draftValues
     * 3. after 'save' but before action finished:
     *    baseValues == currentValues
     *    AND
     *    baseValue + sentValues == draftValues
     * 4. successful 'save' triggers re-basing (back to step 1.)
     */
    this.state = {
      // editable by the user (used by the widgets)
      // represent the current state of user work
      draftValues: {
        ...props.currentValues,
      },
      // state before editing
      // allows to detect changes by comparing values (baseValues - draftValues == changes)
      // note that it's perfectly legal to have: baseValues != currentValues
      // store can change i.e. after fetching data from the server
      // or after some action i.e. 'do not disturb' expired
      baseValues: {
        ...props.currentValues,
      },
      // values submitted using 'save' action
      // inlcude both remote(server and store) or local(store only)
      sentValues: {},
      // required for error handling: the case of partial success(only some fields saved)
      // the alert shows the names of the fields that were NOT saved
      translatedLabels: {
        sshKey: msg.sshKey(),
        language: msg.language(),
        showNotifications: msg.dontDisturb(),
        notificationSnoozeDuration: msg.dontDisturbFor(),
        updateRate: msg.uiRefresh(),
      },
    }
    this.handleCancel = this.handleCancel.bind(this)
    this.buildSections = this.buildSections.bind(this)
    this.saveOptions = this.saveOptions.bind(this)
    this.resetBaseValues = this.resetBaseValues.bind(this)
    this.onChange = this.onChange.bind(this)
  }

  resetBaseValues () {
    const { currentValues } = this.props
    this.setState({
      sentValues: {},
      baseValues: { ...currentValues },
    })
  }

  saveOptions (values, transactionId) {
    this.props.saveOptions(values, transactionId)
    this.setState({
      sentValues: { ...values },
    })
  }

  handleCancel () {
    this.props.goToMainPage()
  }

  onChange (field) {
    return (value) => {
      this.setState((state) => ({
        draftValues: {
          ...state.draftValues,
          [field]: value,
        },
      }))
    }
  }

  buildSections (onChange) {
    const { draftValues, translatedLabels } = this.state
    const { config, hasRemoteOptions } = this.props
    const idPrefix = 'global-user-settings'
    return {
      general: {
        title: msg.general(),
        fields: [
          {
            title: msg.username(),
            body: <span>{config.userName}</span>,
          },
          {
            title: msg.email(),
            body: <span>{config.email}</span>,
          },
          {
            title: translatedLabels.language,
            disabled: !hasRemoteOptions,
            body: (
              <div className={style['half-width']}>
                <SelectBox
                  id={`${idPrefix}-language`}
                  items={Object.entries(localeWithFullName).map(([id, value]) => ({ id, value }))}
                  selected={draftValues.language}
                  onChange={onChange('language')}
                />
              </div>
            ),
          },
          {
            title: translatedLabels.sshKey,
            tooltip: msg.sshKeyTooltip(),
            body: (
              <div className={style['half-width']}>
                <FormControl
                  id={`${idPrefix}-ssh-key`}
                  componentClass='textarea'
                  onChange={e => onChange('sshKey')(e.target.value)}
                  value={draftValues.sshKey || ''}
                  rows={8}
                />
              </div>
            ),
          },
        ],
      },
      refreshInterval: {
        title: msg.refreshInterval(),
        tooltip: msg.refreshIntervalTooltip(),
        disabled: !hasRemoteOptions,
        fields: [
          {
            title: translatedLabels.updateRate,
            body: (
              <div className={style['half-width']}>
                <SelectBox
                  id={`${idPrefix}-update-rate`}
                  items={this.updateRateList}
                  selected={draftValues.updateRate}
                  onChange={onChange('updateRate')}
                />
              </div>
            ),
          },
        ],
      },
      notifications: {
        title: msg.notifications(),
        tooltip: msg.notificationSettingsAffectAllNotifications(),
        fields: [
          {
            title: translatedLabels.showNotifications,
            body: (
              <Switch
                id={`${idPrefix}-dont-disturb`}
                bsSize='normal'
                title='normal'
                value={!draftValues.showNotifications}
                onChange={(e, dontDisturb) => {
                  onChange('showNotifications')(!dontDisturb)
                }}
              />
            ),
          },
          {
            title: translatedLabels.notificationSnoozeDuration,
            body: (
              <div className={style['half-width']}>
                <SelectBox
                  id={`${idPrefix}-dont-disturb-for`}
                  items={this.dontDisturbList}
                  selected={draftValues.notificationSnoozeDuration}
                  onChange={onChange('notificationSnoozeDuration')}
                  disabled={draftValues.showNotifications}
                />
              </div>
            ),
          },
        ],
      },
    }
  }

  render () {
    const { lastTransactionId, currentValues } = this.props
    const { draftValues, baseValues, sentValues, translatedLabels } = this.state

    return (
      <div className='container'>
        <Settings
          draftValues={draftValues}
          baseValues={baseValues}
          currentValues={currentValues}
          sentValues={sentValues}
          translatedLabels={translatedLabels}
          lastTransactionId={lastTransactionId}
          resetBaseValues={this.resetBaseValues}
          onSave={this.saveOptions}
          onCancel={this.handleCancel}
        >
          <SettingsBase sections={this.buildSections(this.onChange)} />
        </Settings>
      </div>
    )
  }
}
GlobalSettings.propTypes = {
  currentValues: PropTypes.object.isRequired,
  config: PropTypes.object.isRequired,
  lastTransactionId: PropTypes.string,
  hasRemoteOptions: PropTypes.bool,
  saveOptions: PropTypes.func.isRequired,
  goToMainPage: PropTypes.func.isRequired,
}

export default connect(
  ({ options, config }) => ({
    config: {
      userName: config.getIn(['user', 'name']),
      email: config.getIn(['user', 'email']),
    },
    currentValues: {
      sshKey: options.getIn(['ssh', 'key']),
      language: options.getIn(['global', 'language']),
      showNotifications: options.getIn(['global', 'showNotifications']),
      notificationSnoozeDuration: options.getIn(['global', 'notificationSnoozeDuration']),
      updateRate: options.getIn(['global', 'updateRate']),
    },
    lastTransactionId: options.getIn(['lastTransactions', 'global', 'transactionId'], ''),
    hasRemoteOptions: !!config.getIn(['user', 'receivedOptions']),
  }),

  (dispatch) => ({
    saveOptions: (values, transactionId) => dispatch(saveGlobalOptions({ values }, { transactionId })),
    goToMainPage: () => dispatch(push('/')),
  })
)(GlobalSettings)
