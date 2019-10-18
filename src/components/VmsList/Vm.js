import React from 'react'
import PropTypes from 'prop-types'

import { connect } from 'react-redux'
import { withRouter } from 'react-router-dom'
import { Checkbox } from 'patternfly-react'
import BaseCard from './BaseCard'

import sharedStyle from '../sharedStyle.css'
import style from './style.css'

import VmActions from '../VmActions'
import VmStatusIcon from '../VmStatusIcon'

import { startVm } from '_/actions'

import { getOsHumanName, getVmIcon } from '../utils'
import { enumMsg } from '_/intl'

/**
 * Single icon-card in the list for a VM
 */
const Vm = ({ vm, checked, icons, os, vms, onStart, onCheck }) => {
  const idPrefix = `vm-${vm.get('name')}`
  const state = vm.get('status')
  const stateValue = enumMsg('VmStatus', state)
  const osName = getOsHumanName(vm.getIn(['os', 'type']))
  const icon = getVmIcon(icons, os, vm)
  const poolId = vm.getIn(['pool', 'id'])
  const isPoolVm = !!poolId
  let pool = null
  if (isPoolVm) {
    pool = vms.getIn(['pools', poolId])
  }

  return (
    <BaseCard idPrefix={idPrefix}>
      <BaseCard.Header>
        <Checkbox className={style['vm-checkbox']} checked={checked} onChange={onCheck} />
        <span className={sharedStyle['operating-system-label']} id={`${idPrefix}-os`}>{osName}</span>
        {isPoolVm && pool && <span className={style['pool-vm-label']} style={{ backgroundColor: pool.get('color') }}>{ pool.get('name') }</span>}
      </BaseCard.Header>
      <BaseCard.Icon url={`/vm/${vm.get('id')}`} icon={icon} />
      <BaseCard.Title url={`/vm/${vm.get('id')}`} name={vm.get('name')} />
      <BaseCard.Status>
        <VmStatusIcon state={state} />&nbsp;{stateValue}
      </BaseCard.Status>
      <VmActions isOnCard vm={vm} pool={pool} onStart={onStart} idPrefix={idPrefix} />
    </BaseCard>
  )
}

Vm.propTypes = {
  vm: PropTypes.object.isRequired,
  icons: PropTypes.object.isRequired,
  vms: PropTypes.object.isRequired,
  os: PropTypes.object.isRequired,
  checked: PropTypes.bool,
  onStart: PropTypes.func.isRequired,
  onCheck: PropTypes.func.isRequired,
}

export default withRouter(connect(
  (state) => ({
    icons: state.icons,
    vms: state.vms,
    os: state.operatingSystems, // deep immutable, {[id: string]: OperatingSystem}
  }),
  (dispatch, { vm }) => ({
    onStart: () => dispatch(startVm({ vmId: vm.get('id') })),
  })
)(Vm))
