import React from 'react'
import PropTypes from 'prop-types'
import { connect } from 'react-redux'

import { selectPoolDetail } from '_/actions'
import { RouterPropTypeShapes } from '_/propTypeShapes'

import VmsList from '../VmsList'
import VmDetails from '../VmDetails'
import VmConsole from '../VmConsole'
import Handler404 from '_/Handler404'
import { GlobalSettings, VmSettings } from '../UserSettings'

/**
 * Route component (for PageRouter) to view the list of VMs and Pools
 */
const VmsListPage = () => {
  return <VmsList />
}

const GlobalSettingsPage = () => {
  return <GlobalSettings />
}

class VmSettingsPage extends React.Component {
  constructor (props) {
    super(props)
    this.state = {
      vmIds: [],
    }
  }

  static getDerivedStateFromProps (props, state) {
    const ids = props.match.params.id.split('/')
    if (ids.filter(n => !state.vmIds.includes(n)).length > 0) {
      return { vmIds: ids }
    }

    return null
  }

  render () {
    const { vms, route } = this.props
    const { vmIds } = this.state

    if (vmIds.length > 0 && vmIds.filter(n => !vms.get('vms').keySeq().includes(n)).length === 0) {
      return (<VmSettings selectedVms={vmIds} {...route.pageProps} />)
    }

    const inersection = vmIds.filter(n => vms.get('missedVms').has(n))
    if (inersection.length > 0) {
      console.info(`VmSettingsPage: VM ids cannot be found: ${inersection.join(', ')}`)
      return <Handler404 />
    }

    return null
  }
}

VmSettingsPage.propTypes = {
  vms: PropTypes.object.isRequired,
  route: PropTypes.object.isRequired,
  match: RouterPropTypeShapes.match.isRequired,
}
const VmSettingsPageConnected = connect(
  (state) => ({
    vms: state.vms,
  }),
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
 * Route component (for PageRouter) to view a VM's console (with webVNC)
 */
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
  VmConsolePageConnected as VmConsolePage,
  VmDetailsPageConnected as VmDetailsPage,
  VmsListPage,
  GlobalSettingsPage,
  VmSettingsPageConnected as VmSettingsPage,
}
