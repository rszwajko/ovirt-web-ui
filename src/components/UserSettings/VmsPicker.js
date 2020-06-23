import React, { useEffect } from 'react'

import useInfiniteScroll from '@closeio/use-infinite-scroll'
import { msg } from '_/intl'
import naturalCompare from 'string-natural-compare'
import { Checkbox, Card, CardHeading, CardTitle } from 'patternfly-react'
import style from './style.css'
import PropTypes from 'prop-types'
import { connect } from 'react-redux'
import { getByPage } from '_/actions'

const VmsPicker = ({ handleAllVmsCheck, vms, handleVmCheck, selectedVms, fetchMoreVmsAndPools }) => {
  const hasMore = vms.get('vmsExpectMorePages') || vms.get('poolsExpectMorePages')
  const [ page, sentinelRef, scrollerRef ] = useInfiniteScroll({ hasMore, distance: 0 })

  useEffect(() => {
    if (page > 0) {
      fetchMoreVmsAndPools()
    }
  }, [ page ])

  return <React.Fragment>
    <Card className={style['vms-card']}>
      <CardHeading>
        <CardTitle>
          {msg.selectedVirtualMachines()}
        </CardTitle>
      </CardHeading>
      <div>
        <Checkbox
          onChange={handleAllVmsCheck}
          checked={vms.get('vms').size === selectedVms.length}
        >
          {msg.selectAllVirtualMachines()}
        </Checkbox>
      </div>
      <div ref={scrollerRef} className={style['vms-list']}>
        {vms.get('vms')
          .toList()
          .sort((vmA, vmB) => naturalCompare.caseInsensitive(vmA.get('name'), vmB.get('name')))
          .map(vm => <div key={vm.get('id')}>
            <Checkbox
              onChange={() => handleVmCheck(vm.get('id'))}
              checked={selectedVms.includes(vm.get('id'))}
            >
              {vm.get('name')}
            </Checkbox>
          </div>)}
        {hasMore && <div ref={sentinelRef} className={style['infinite-scroll-sentinel']}>{msg.loadingTripleDot()}</div>}
      </div>
    </Card>
  </React.Fragment>
}

VmsPicker.propTypes = {
  handleAllVmsCheck: PropTypes.func.isRequired,
  vms: PropTypes.object.isRequired,
  selectedVms: PropTypes.array.isRequired,
  handleVmCheck: PropTypes.func.isRequired,
  fetchMoreVmsAndPools: PropTypes.func.isRequired,
}

export default connect(
  (state, ownProps) => ({}),
  (dispatch) => ({
    fetchMoreVmsAndPools: () => dispatch(getByPage()),
  })
)(VmsPicker)
