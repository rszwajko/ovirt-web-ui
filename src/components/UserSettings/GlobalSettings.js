import React, { Component } from 'react'
import PropTypes from 'prop-types'

import { connect } from 'react-redux'
import { push } from 'connected-react-router'
import { saveGlobalOptions } from '_/actions'
import { FormControl, Switch } from 'patternfly-react'
import { localeWithFullName, locale, msg } from '_/intl'
import style from './style.css'

import Settings from '../Settings'
import SelectBox from '../SelectBox'

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
    this.state = {
      values: {
        sshKey: props.options.getIn(['options', 'ssh', 'key']),
        language: props.options.getIn(['options', 'language']) || locale,
        dontDisturb: props.options.getIn(['options', 'dontDisturb']) || false,
        dontDisturbFor: props.options.getIn(['options', 'dontDisturbFor']) || dontDisturbList[0].id,
        updateRate: props.options.getIn(['options', 'updateRate']) || 60,
      },
    }
    this.handleChange = this.handleChange.bind(this)
    this.handleCancel = this.handleCancel.bind(this)
    this.buildSections = this.buildSections.bind(this)
    this.updateSshKey = this.updateSshKey.bind(this)
  }

  handleChange (values) {
    this.setState({ values })
  }

  updateSshKey (prevProps, prevState) {
    const { options } = prevProps
    const prevSshKey = options.getIn(['options', 'ssh', 'key'])
    if (!prevSshKey && prevSshKey !== this.props.options.getIn(['options', 'ssh', 'key']) && prevState.values.sshKey === prevSshKey) {
      this.setState(state => {
        const values = { ...state.values }
        values.sshKey = this.props.options.getIn(['options', 'ssh', 'key'])
        return { values }
      })
    }
  }

  componentDidUpdate (prevProps, prevState) {
    this.updateSshKey(prevProps, prevState)
  }

  handleCancel () {
    this.props.goToMainPage()
  }

  buildSections (onChange) {
    const { config } = this.props
    const { values } = this.state
    const idPrefix = 'global-user-settings'
    return {
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
            body: <div className={style['half-width']}>
              <SelectBox
                id={`${idPrefix}-language`}
                items={localeWithFullName}
                selected={values.language}
                onChange={onChange('language')}
              />
            </div>,
          },
          {
            title: msg.sshKey(),
            tooltip: msg.sshKeyTooltip(),
            body: <div className={style['half-width']}>
              <FormControl
                id={`${idPrefix}-ssh-key`}
                componentClass='textarea'
                onChange={e => onChange('sshKey')(e.target.value)}
                value={values.sshKey}
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
            title: msg.uiRefresh(),
            body: <div className={style['half-width']}>
              <SelectBox
                id={`${idPrefix}-update-rate`}
                items={updateRateList}
                selected={values.updateRate}
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
            title: msg.dontDisturb(),
            body: <Switch
              id={`${idPrefix}-dont-disturb`}
              bsSize='normal'
              title='normal'
              value={values.dontDisturb}
              onChange={(e, state) => onChange('dontDisturb')(state)}
            />,
          },
          {
            title: msg.dontDisturbFor(),
            body: <div className={style['half-width']}>
              <SelectBox
                id={`${idPrefix}-dont-disturb-for`}
                items={dontDisturbList}
                selected={values.dontDisturbFor}
                onChange={onChange('dontDisturbFor')}
                disabled={!values.dontDisturb}
              />
            </div>,
          },
        ],
      },
    }
  }

  render () {
    const { saveOptions } = this.props
    return (
      <div className='container'>
        <Settings
          buildSections={this.buildSections}
          values={this.state.values}
          mapper={valuesMapper}
          onSave={saveOptions}
          onCancel={this.handleCancel}
          onChange={this.handleChange}
        />
      </div>
    )
  }
}
GlobalSettings.propTypes = {
  config: PropTypes.object.isRequired,
  options: PropTypes.object.isRequired,
  saveOptions: PropTypes.func.isRequired,
  goToMainPage: PropTypes.func.isRequired,
}

export default connect(
  (state) => ({
    config: state.config,
    options: state.options,
  }),

  (dispatch) => ({
    saveOptions: (values, correlationId) => dispatch(saveGlobalOptions({ values }, { correlationId })),
    goToMainPage: () => dispatch(push('/')),
  })
)(GlobalSettings)
