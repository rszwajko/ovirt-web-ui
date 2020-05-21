import React from 'react'
import PropTypes from 'prop-types'
import { connect } from 'react-redux'
import { withRouter } from 'react-router-dom'
import { Checkbox } from 'patternfly-react'

import { startVm } from '_/actions'
import { enumMsg } from '_/intl'
import { getOsHumanName, getVmIcon } from '_/components/utils'

import BaseCard from './BaseCard'
import VmActions from '../VmActions'
import VmStatusIcon from '../VmStatusIcon'

import sharedStyle from '../sharedStyle.css'
import style from './style.css'

/**
 * Single icon-card in the list for a VM
 */
const Vm = ({ vm, checked, icons, os, vms, onStart, onCheck, preview = false }) => {
  const idPrefix = `vm-${vm.get('name')}`
  const osName = getOsHumanName(vm.getIn(['os', 'type']))
  const icon = getVmIcon(icons, os, vm)
  const status = vm.get('status')
  const statusValue = enumMsg('VmStatus', status)

  const poolId = vm.getIn(['pool', 'id'])
  const isPoolVm = !!poolId
  const pool = isPoolVm ? vms.getIn(['pools', poolId]) : null

  return (
    <BaseCard idPrefix={idPrefix}>
      <BaseCard.Header>
        { preview && <Checkbox className={style['vm-checkbox']} checked={checked} onChange={onCheck} /> }
        <span className={sharedStyle['operating-system-label']} id={`${idPrefix}-os`}>{osName}</span>
        {isPoolVm && pool && <span className={style['pool-vm-label']} style={{ backgroundColor: pool.get('color') }}>{ pool.get('name') }</span>}
      </BaseCard.Header>
      <BaseCard.Icon url={`/vm/${vm.get('id')}`} icon={icon} />
      <BaseCard.Title url={`/vm/${vm.get('id')}`} name={vm.get('name')} />
      <BaseCard.Status>
        <VmStatusIcon status={status} />&nbsp;{statusValue}
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
  preview: PropTypes.bool,
}

export default withRouter(connect(
  (state) => ({
    icons: state.icons,
    vms: state.vms,
    os: state.operatingSystems, // deep immutable, {[id: string]: OperatingSystem}
    preview: state.options.getIn(['global', 'preview'], false),
  }),
  (dispatch, { vm }) => ({
    onStart: () => dispatch(startVm({ vmId: vm.get('id') })),
  })
)(Vm))
