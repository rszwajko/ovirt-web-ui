import React, { useContext } from 'react'
import PropTypes from 'prop-types'

import { connect } from 'react-redux'
import { withRouter } from 'react-router-dom'

import { EmptyState } from 'patternfly-react'
import VmCardList from './VmCardList'
import { MsgContext } from '_/intl'

/**
 * Component displayed when VMs or Pools exist but the data is still loading.
 */
const VmLoading = () => {
  return <div />
}

/**
 * Component displayed when no VMs or Pools could be loaded for the current user.
 */
const NoVmAvailable = () => {
  const { msg } = useContext(MsgContext)
  const idPrefix = 'no-vm'
  return (
    <EmptyState>
      <EmptyState.Icon id={`${idPrefix}-icon`} />
      <EmptyState.Title id={`${idPrefix}-title`}>{msg.noVmAvailable()}</EmptyState.Title>
      <EmptyState.Info id={`${idPrefix}-text`}>{msg.noVmAvailableForLoggedUser()}</EmptyState.Info>
    </EmptyState>
  )
}

const VmsList = ({ vms, waitForFirstFetch }) => {
  const haveVms = (vms.get('vms') && !vms.get('vms').isEmpty())
  const havePools = (vms.get('pools') && !vms.get('pools').isEmpty())

  let el = null

  if (waitForFirstFetch) {
    el = <VmLoading />
  } else if (haveVms || havePools) {
    el = <VmCardList />
  } else {
    el = <NoVmAvailable />
  }

  return el
}
VmsList.propTypes = {
  vms: PropTypes.object.isRequired,
  waitForFirstFetch: PropTypes.bool.isRequired,
}

export default withRouter(connect(
  (state) => ({
    vms: state.vms,
    waitForFirstFetch: (
      state.vms.get('vmsPage') === 0 && !!state.vms.get('vmsExpectMorePages') &&
      state.vms.get('poolsPage') === 0 && !!state.vms.get('poolsExpectMorePages')
    ),
  })
)(VmsList))
