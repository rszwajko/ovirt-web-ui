import React from 'react'
import PropTypes from 'prop-types'
import { connect } from 'react-redux'
import { RouterPropTypeShapes } from '_/propTypeShapes'

import { push } from 'connected-react-router'

import { msg } from '_/intl'
import { canUserUseAnyClusters } from '_/utils'

import VmDialog from '../VmDialog'
import VmsList from '../VmsList'
import VmDetails from '../VmDetails'
import VmConsole from '../VmConsole'
import Handler404 from '_/Handler404'
import { GlobalSettings, VmSettings } from '../UserSettings'

import { addUserMessage, selectPoolDetail } from '_/actions'

/**
 * Route component (for PageRouter) to view the list of VMs and Pools
 */
const VmsPage = () => {
  return <VmsList />
}

const GlobalSettingsPage = () => {
  return <GlobalSettings />
}

class VmSettingsPage extends React.Component {
  constructor (props) {
    super(props)
    this.state = {
      vmId: undefined,
    }
  }

  static getDerivedStateFromProps (props, state) {
    if (state.vmId !== props.match.params.id) {
      const vmId = props.match.params.id
      return { vmId }
    }

    return null
  }

  render () {
    const { vms } = this.props
    const { vmId } = this.state

    if (vmId && vms.getIn(['vms', vmId])) {
      return (<VmSettings vm={vms.getIn(['vms', vmId])} />)
    }

    // TODO: Add handling for if the fetch runs but fails (FETCH-FAIL), see issue #631
    console.info(`VmSettingsPage: VM id cannot be found: ${vmId}`)
    return null
  }
}

VmSettingsPage.propTypes = {
  vms: PropTypes.object.isRequired,
  match: RouterPropTypeShapes.match.isRequired,
}
const VmSettingsPageConnected = connect(
  (state) => ({
    vms: state.vms,
  }),
  (dispatch) => ({})
)(VmSettingsPage)

/**
 * Route component (for PageRouter) to view a VM's details
 */
class VmDetailsPage extends React.Component {
  constructor (props) {
    super(props)
    this.state = {
      vmId: undefined,
    }
  }

  static getDerivedStateFromProps (props, state) {
    if (state.vmId !== props.match.params.id) {
      const vmId = props.match.params.id
      return { vmId }
    }

    return null
  }

  componentDidUpdate () {
    const { vms, fetchPool } = this.props
    const { vmId } = this.state
    if (vmId && vms.getIn(['vms', vmId])) {
      const poolId = vms.getIn(['vms', vmId]).getIn(['pool', 'id'])

      if (poolId && !vms.getIn(['pools', poolId])) {
        fetchPool(poolId)
      }
    }
  }

  render () {
    const { vms } = this.props
    const { vmId } = this.state

    if (vmId && vms.getIn(['vms', vmId])) {
      return (<VmDetails vm={vms.getIn(['vms', vmId])} />)
    }
    if (vms.get('missedVms').has(vmId)) {
      console.info(`VmDetailsPage: VM id cannot be found: ${vmId}`)
      return <Handler404 />
    }

    return null
  }
}
VmDetailsPage.propTypes = {
  vms: PropTypes.object.isRequired,
  match: RouterPropTypeShapes.match.isRequired,
  fetchPool: PropTypes.func.isRequired,
}
const VmDetailsPageConnected = connect(
  (state) => ({
    vms: state.vms,
  }),
  (dispatch) => ({
    fetchPool: (poolId) => dispatch(selectPoolDetail({ poolId })),
  })
)(VmDetailsPage)

/**
 * Route component (for PageRouter) to create a new VM
 */
class VmCreatePage extends React.Component {
  componentDidUpdate () {
    // If the user cannot create any VMs (not just the one requested), bump them out
    if (!this.props.canUserCreateVMs) {
      this.props.redirectToMainPage()
      this.props.addUserMessage(msg.permissionsNoCreateVm())
    }
  }

  render () {
    if (!this.props.canUserCreateVMs) {
      return null
    }

    const { previousPath } = this.props
    return <VmDialog previousPath={previousPath} />
  }
}
VmCreatePage.propTypes = {
  canUserCreateVMs: PropTypes.bool.isRequired,
  previousPath: PropTypes.string.isRequired,

  redirectToMainPage: PropTypes.func.isRequired,
  addUserMessage: PropTypes.func.isRequired,
}
const VmCreatePageConnected = connect(
  (state) => ({
    canUserCreateVMs: canUserUseAnyClusters(state.clusters) && state.clusters.size > 0,
  }),
  (dispatch) => ({
    redirectToMainPage: () => dispatch(push('/')),
    addUserMessage: (message) => dispatch(addUserMessage({ message })),
  })
)(VmCreatePage)

class VmConsolePage extends React.Component {
  render () {
    const { vms, match } = this.props
    if (match.params.id && vms.getIn(['vms', match.params.id])) {
      return <VmConsole consoleId={match.params.console} vmId={match.params.id} />
    }
    return null
  }
}

VmConsolePage.propTypes = {
  match: RouterPropTypeShapes.match.isRequired,
  vms: PropTypes.object.isRequired,
}

const VmConsolePageConnected = connect(
  (state) => ({
    vms: state.vms,
  }),
  (dispatch) => ({})
)(VmConsolePage)

export {
  VmDetailsPageConnected as VmDetailsPage,
  VmCreatePageConnected as VmCreatePage,
  VmConsolePageConnected as VmConsolePage,
  VmsPage,
  GlobalSettingsPage,
  VmSettingsPageConnected as VmSettingsPage,
}
