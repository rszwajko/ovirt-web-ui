import React from 'react'
import PropTypes from 'prop-types'
import { connect } from 'react-redux'
import { push, replace } from 'connected-react-router'

import { selectPoolDetail } from '_/actions'
import { RouterPropTypeShapes } from '_/propTypeShapes'

import VmsList from '../VmsList'
import VmDetails from '../VmDetails'
import VmConsole from '../VmConsole'
import Handler404 from '_/Handler404'
import { GlobalSettings, VmSettings } from '../UserSettings'

import MultiVmSettings from '../UserSettings/MultiVmSettings'
/**
 * Route component (for PageRouter) to view the list of VMs and Pools
 */
const VmsListPage = () => {
  return <VmsList />
}

const GlobalSettingsPage = () => {
  return <GlobalSettings />
}

const VmSettingsPage = ({ vms, goToVmPage, route: { pageProps }, match: { params: { id } } }) => {
  const unknownVms = !vms.get('vms').keySeq().includes(id) ||
    vms.get('missedVms').has(id)

  if (unknownVms) {
    console.info(`VmSettingsPage: VM id cannot be found: ${id}`)
    return <Handler404 />
  }

  return (<VmSettings selectedVms={[id]} vms={vms.get('vms')} goToVmPage={() => goToVmPage(id)} />)
}
VmSettingsPage.propTypes = {
  vms: PropTypes.object.isRequired,
  route: PropTypes.object.isRequired,
  match: RouterPropTypeShapes.match.isRequired,
  goToVmPage: PropTypes.func.isRequired,
}
const VmSettingsPageConnected = connect(
  (state) => ({
    vms: state.vms,
  }),
  (dispatch) => ({
    goToVmPage: (id) => dispatch(push(`/vm/${id}`)),
  })
)(VmSettingsPage)

const MultiVmSettingsPage = ({ vms, updateUrl, goToParent, match: { params: { id: idFromRoute } } }) => {
  const ids = idFromRoute.split('/')

  const unknownVms = [
    ...ids.filter(id => !vms.get('vms').keySeq().includes(id)),
    ...ids.filter(id => vms.get('missedVms').has(id)),
  ]
  if (unknownVms.length) {
    console.info(`VmSettingsPage: VM ids cannot be found: ${unknownVms.join(', ')}`)
    return <Handler404 />
  }
  return (<MultiVmSettings selectedVms={ids} updateUrl={updateUrl} vms={vms} goToParent={goToParent} />)
}

MultiVmSettingsPage.propTypes = {
  vms: PropTypes.object.isRequired,
  match: RouterPropTypeShapes.match.isRequired,
  updateUrl: PropTypes.func.isRequired,
  goToParent: PropTypes.func.isRequired,
}
const MultiVmSettingsPageConnected = connect(
  (state) => ({
    vms: state.vms,
  }),
  (dispatch, { selectedVms }) => ({
    updateUrl: (selectedVms) => dispatch(replace(`/settings/vms/${selectedVms.join('/')}`)),
    goToParent: () => dispatch(push('/')),
  }),
)(MultiVmSettingsPage)

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
  MultiVmSettingsPageConnected as MultiVmSettingsPage,
}
