import React from 'react'

import { msg } from '_/intl'
import naturalCompare from 'string-natural-compare'
import InfiniteScroll from 'react-infinite-scroller'
import { Checkbox, Card, CardHeading, CardTitle } from 'patternfly-react'
import style from './style.css'
import PropTypes from 'prop-types'
import { connect } from 'react-redux'
import { getByPage } from '_/actions'

const VmsPicker = ({ handleAllVmsCheck, vms, handleVmCheck, selectedVms, loadAnotherPage }) => {
  const loadMore = () => {
    if (vms.get('notAllPagesLoaded')) {
      loadAnotherPage(vms.get('page') + 1)
    }
  }

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
      <div className={style['vms-list']}>
        <InfiniteScroll
          loadMore={loadMore}
          hasMore={vms.get('notAllPagesLoaded')}
          useWindow={false}
        >
          {vms.get('vms')
            .toList()
            .sort((vmA, vmB) => naturalCompare.caseInsensitive(vmA.get('name'), vmB.get('name')))
            // .sort((vmA, vmB) => selectedVms.includes(vmA.get('id')) && !selectedVms.includes(vmB.get('id')) ? -1 : 0)
            .map(vm => <div key={vm.get('id')}>
              <Checkbox
                onChange={() => handleVmCheck(vm.get('id'))}
                checked={selectedVms.includes(vm.get('id'))}
              >
                {vm.get('name')}
              </Checkbox>
            </div>)}
        </InfiniteScroll>
      </div>
    </Card>
  </React.Fragment>
}

VmsPicker.propTypes = {
  handleAllVmsCheck: PropTypes.func.isRequired,
  vms: PropTypes.object.isRequired,
  selectedVms: PropTypes.array.isRequired,
  handleVmCheck: PropTypes.func.isRequired,
  loadAnotherPage: PropTypes.func.isRequired,
}

export default connect(
  (state, ownProps) => ({}),
  (dispatch) => ({
    loadAnotherPage: (page) => dispatch(getByPage({ page })),
  })
)(VmsPicker)
