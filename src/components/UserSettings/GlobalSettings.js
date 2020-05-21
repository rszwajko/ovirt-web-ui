import React, { Component } from 'react'
import PropTypes from 'prop-types'

import { connect } from 'react-redux'
import { push } from 'connected-react-router'
import { saveGlobalOptions } from '_/actions'
import { FormControl, Switch } from 'patternfly-react'
import { localeWithFullName, msg } from '_/intl'
import style from './style.css'

import Settings from '../Settings'
import SettingsBase from '../Settings/SettingsBase'
import SelectBox from '../SelectBox'

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
    this.state = {
      defaultDontDisturbFor: dontDisturbList[0] && dontDisturbList[0].id,
      config: {
        ...props.config,
      },
      draftValues: {
        ...props.currentValues,
      },
      baseValues: {
        ...props.currentValues,
      },
      sentValues: {},
      names: {
        sshKey: msg.sshKey(),
        language: msg.language(),
        showNotifications: msg.dontDisturb(),
        dontDisturbFor: msg.dontDisturbFor(),
        updateRate: msg.uiRefresh(),
      },
    }
    this.handleCancel = this.handleCancel.bind(this)
    this.buildSections = this.buildSections.bind(this)
    this.saveOptions = this.saveOptions.bind(this)
    this.resetBaseValues = this.resetBaseValues.bind(this)
  }

  resetBaseValues () {
    const { currentValues } = this.props
    const baseValues = { ...currentValues }
    const sentValues = {}
    this.setState({ sentValues, baseValues })
  }

  saveOptions (values, correlationId) {
    this.props.saveOptions(values, correlationId)
    const sentValues = { ...values }
    this.setState({ sentValues })
  }

  handleCancel () {
    this.props.goToMainPage()
  }

  buildSections (onChange) {
    const { draftValues, names, config, defaultDontDisturbFor } = this.state
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
            title: names.language,
            body: <div className={style['half-width']}>
              <SelectBox
                id={`${idPrefix}-language`}
                items={localeWithFullName}
                selected={draftValues.language}
                onChange={onChange('language')}
              />
            </div>,
          },
          {
            title: names.sshKey,
            tooltip: msg.sshKeyTooltip(),
            body: <div className={style['half-width']}>
              <FormControl
                id={`${idPrefix}-ssh-key`}
                componentClass='textarea'
                onChange={e => onChange('sshKey')(e.target.value)}
                value={draftValues.sshKey || ''}
              />
            </div>,
          },
        ],
      },
      refreshInterval: {
        title: msg.refreshInterval(),
        tooltip: msg.globalSettingsWillBeApplied(),
        fields: [
          {
            title: names.updateRate,
            body: <div className={style['half-width']}>
              <SelectBox
                id={`${idPrefix}-update-rate`}
                items={updateRateList}
                selected={draftValues.updateRate}
                onChange={onChange('updateRate')}
              />
            </div>,
          },
        ],
      },
      notifications: {
        title: msg.notifications(),
        tooltip: msg.notificationSettingsAffectAllNotifications(),
        fields: [
          {
            title: names.showNotifications,
            body: <Switch
              id={`${idPrefix}-dont-disturb`}
              bsSize='normal'
              title='normal'
              value={!draftValues.showNotifications}
              onChange={(e, dontDisturb) => {
                onChange('showNotifications', 'dontDisturbFor')(!dontDisturb, draftValues.dontDisturbFor || defaultDontDisturbFor)
              }}
            />,
          },
          {
            title: names.dontDisturbFor,
            body: <div className={style['half-width']}>
              <SelectBox
                id={`${idPrefix}-dont-disturb-for`}
                items={dontDisturbList}
                selected={draftValues.dontDisturbFor || defaultDontDisturbFor}
                onChange={onChange('dontDisturbFor')}
                disabled={draftValues.showNotifications}
              />
            </div>,
          },
        ],
      },
    }
  }

  render () {
    const { lastCorrelationId, currentValues } = this.props
    const { draftValues, baseValues, sentValues, names } = this.state

    const onChange = (field, dependendField) => {
      return (value, dependendValue) => {
        const values = { ...draftValues }
        values[field] = value
        if (dependendField) {
          values[dependendField] = dependendValue
        }
        this.setState({ draftValues: values })
      }
    }

    return (
      <div className='container'>
        <Settings
          draftValues={draftValues}
          baseValues={baseValues}
          currentValues={currentValues}
          sentValues={sentValues}
          names={names}
          lastCorrelationId={lastCorrelationId}
          resetBaseValues={this.resetBaseValues}
          onSave={this.saveOptions}
          onCancel={this.handleCancel}

        >
          <SettingsBase sections={this.buildSections(onChange)} />
        </Settings>
      </div>
    )
  }
}
GlobalSettings.propTypes = {
  currentValues: PropTypes.object.isRequired,
  config: PropTypes.object.isRequired,
  lastCorrelationId: PropTypes.string,
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
      dontDisturbFor: options.getIn(['global', 'dontDisturbFor']),
      updateRate: options.getIn(['global', 'updateRate']),
    },
    lastCorrelationId: options.getIn(['results', 'global', 'correlationId'], ''),
  }),

  (dispatch) => ({
    saveOptions: (values, correlationId) => dispatch(saveGlobalOptions({ values }, { correlationId })),
    goToMainPage: () => dispatch(push('/')),
  })
)(GlobalSettings)
