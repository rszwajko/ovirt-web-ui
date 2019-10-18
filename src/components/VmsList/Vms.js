import React from 'react'
import ReactDOM from 'react-dom'
import PropTypes from 'prop-types'
import { Link } from 'react-router-dom'
import { Icon, Button } from 'patternfly-react'

import { connect } from 'react-redux'

import style from './style.css'
import sharedStyle from '_/components/sharedStyle.css'
import Vm from './Vm'
import Pool from './Pool'
import ScrollPositionHistory from '../ScrollPositionHistory'
import { getByPage } from '_/actions'
import { filterVms, sortFunction } from '_/utils'
import { msg } from '_/intl'
import InfiniteScroll from 'react-infinite-scroller'
import Loader, { SIZES } from '../Loader'

const VmsSettingsButton = ({ checkedVms = [] }) => {
  const container = document.getElementById('vm-settings-btn-box')
  if (container) {
    return ReactDOM.createPortal(
      <Link to={`/vms-settings/${checkedVms.join('/')}`} className={`btn btn-default ${sharedStyle['settings-icon']}`} disabled={checkedVms.length === 0}>
        <Icon
          name='cog'
          type='fa'
        />
        {msg.vmSettings()}
      </Link>,
      container
    )
  }
  return null
}

VmsSettingsButton.propTypes = {
  checkedVms: PropTypes.array,
}

const SelectAllVmsButton = ({ onClick }) => {
  const container = document.getElementById('select-all-vms-btn-box')
  if (container) {
    return ReactDOM.createPortal(
      <Button onClick={onClick} bsStyle='default'>Select All VMs</Button>,
      container
    )
  }
  return null
}

SelectAllVmsButton.propTypes = {
  onClick: PropTypes.func.isRequired,
}

/**
 * Use Patternfly 'Single Select Card View' pattern to show every VM and Pool
 * available to the current user.
 */
class Vms extends React.Component {
  constructor (props) {
    super(props)
    this.state = { checkedVms: new Set() }
    this.loadMore = this.loadMore.bind(this)
    this.checkVm = this.checkVm.bind(this)
    this.selectAll = this.selectAll.bind(this)
  }

  loadMore () {
    if (this.props.vms.get('notAllPagesLoaded')) {
      this.props.onUpdate(this.props.vms.get('page') + 1)
    }
  }

  checkVm (vmId) {
    this.setState((state) => {
      const checkedVms = new Set(state.checkedVms)
      if (!checkedVms.has(vmId)) {
        checkedVms.add(vmId)
      } else {
        checkedVms.delete(vmId)
      }
      return { checkedVms }
    })
  }

  selectAll () {
    const { vms } = this.props
    this.setState({
      checkedVms: new Set(vms.get('vms').keySeq().toJS()),
    })
  }

  render () {
    const { vms, alwaysShowPoolCard } = this.props

    const sort = vms.get('sort').toJS()

    const filters = vms.get('filters').toJS()

    const sortedVms = vms.get('vms').filter(vm => filterVms(vm, filters)).toList().map(vm => vm.set('isVm', true))
    const sortedPools = vms.get('pools')
      .filter(pool =>
        pool.get('vm') &&
        (
          alwaysShowPoolCard ||
          (
            pool.get('vmsCount') < pool.get('maxUserVms') &&
            pool.get('size') > 0 &&
            filterVms(pool, filters)
          )
        )
      )
      .toList()

    const vmsPoolsMerge = [ ...sortedVms, ...sortedPools ].sort(sortFunction(sort))

    return (
      <InfiniteScroll
        loadMore={this.loadMore}
        isReverse={!sort.isAsc}
        hasMore={vms.get('notAllPagesLoaded')}
        loader={<Loader key='infinite-scroll-loader' size={SIZES.LARGE} />}
        useWindow={false}
      >
        <VmsSettingsButton checkedVms={Array.from(this.state.checkedVms)} />
        <SelectAllVmsButton onClick={this.selectAll} />
        <ScrollPositionHistory uniquePrefix='vms-list' scrollContainerSelector='#page-router-render-component'>
          <div className='container-fluid container-cards-pf'>
            <div className={`row row-cards-pf ${style['cards-container']}`}>
              {vmsPoolsMerge.map(instance =>
                instance.get('isVm')
                  ? <Vm
                    vm={instance}
                    key={instance.get('id')}
                    checked={this.state.checkedVms.has(instance.get('id'))}
                    onCheck={() => this.checkVm(instance.get('id'))}
                  />
                  : <Pool pool={instance} key={instance.get('id')} />
              )}
            </div>
            <div className={style['overlay']} />
          </div>
        </ScrollPositionHistory>
      </InfiniteScroll>
    )
  }
}
Vms.propTypes = {
  vms: PropTypes.object.isRequired,
  alwaysShowPoolCard: PropTypes.bool,
  onUpdate: PropTypes.func.isRequired,
}

export default connect(
  (state) => ({
    vms: state.vms,
    alwaysShowPoolCard: !state.config.get('filter'),
  }),
  (dispatch) => ({
    onUpdate: (page) => dispatch(getByPage({ page })),
  })
)(Vms)
