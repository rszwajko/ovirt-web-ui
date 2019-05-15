import React from 'react'
import PropTypes from 'prop-types'

import { connect } from 'react-redux'
import { getByPage } from '_/actions'
import { Checkbox, FormControl } from 'patternfly-react'
import InfiniteScroll from 'react-infinite-scroller'
import naturalCompare from 'string-natural-compare'
import { msg } from '_/intl'
import style from './style.css'

function createCheckList ({ vmsNotifications, vms, defaultValue = false }) {
  return vms.get('vms').map((v, k) => vmsNotifications[k] || defaultValue)
}

class VmsNotificationsList extends React.Component {
  constructor (props) {
    super(props)
    const allChecked = createCheckList(props).reduce((acc, curr) => acc && curr, props.defaultValue)
    this.state = {
      allChecked,
      isOverflow: false,
      filterValue: '',
    }
    this.ref = React.createRef()
    this.handleCheckAll = this.handleCheckAll.bind(this)
    this.handleCheck = this.handleCheck.bind(this)
    this.updateOverflow = this.updateOverflow.bind(this)
    this.handleFilter = this.handleFilter.bind(this)
  }
  handleCheckAll (e) {
    let vmsNotifications = createCheckList(this.props).map(() => e.target.checked).toJS()
    this.props.handleChange('vmsNotifications')(vmsNotifications)
    this.props.handleChange('allVmsNotifications')(e.target.checked)
  }

  updateOverflow () {
    const state = { isOverflow: false }
    if (this.ref.current.offsetHeight < this.ref.current.scrollHeight) {
      state.isOverflow = true
    }
    if (this.state.isOverflow !== state.isOverflow) {
      this.setState(state)
    }
  }

  handleCheck (vmId) {
    const { handleChange } = this.props
    return ({ target: { checked } }) => {
      handleChange('vmsNotifications', { vmId })(checked)
      if (!checked) {
        handleChange('allVmsNotifications')(false)
      }
    }
  }

  handleFilter ({ target: { value } }) {
    this.setState({ filterValue: value })
  }

  static getDerivedStateFromProps (props, state) {
    const allChecked = createCheckList(props).reduce((acc, curr) => acc && curr, true)
    return { allChecked }
  }

  componentDidUpdate (prevProps, prevState) {
    if (prevState.allChecked !== this.state.allChecked) {
      this.props.handleChange('allVmsNotifications')(this.state.allChecked, false)
    }
    this.updateOverflow()
  }

  render () {
    const { vmsNotifications, vms, handleChange, loadAnotherPage } = this.props
    const loadMore = () => {
      if (vms.get('notAllPagesLoaded')) {
        loadAnotherPage(vms.get('page') + 1)
      }
    }

    let list = null
    const sortedVms = vms.get('vms')
      .sort((vmA, vmB) => naturalCompare.caseInsensitive(vmA.get('name'), vmB.get('name')))
      .filter(vm => vm.get('name').startsWith(this.state.filterValue))

    const items = sortedVms.map(vm => {
      return (
        <Checkbox checked={vmsNotifications[vm.get('id')] || this.state.allChecked} onChange={handleChange('vmsNotifications', { vmId: vm.get('id') })}>
          {vm.get('name')}
        </Checkbox>
      )
    }) // ImmutableJS OrderedMap

    list = (
      <div>
        {[
          <Checkbox checked={this.state.allChecked} onChange={this.handleCheckAll}>
            {msg.allVirtualMachines()}
          </Checkbox>,
          ...items.toArray(),
        ]}
      </div>
    )

    return (
      <React.Fragment>
        {(this.state.isOverflow || this.state.filterValue) &&
          <div className={style['filter-vms-box']}>
            <FormControl type='text' value={this.state.filterValue} placeholder={msg.filterVm()} onChange={this.handleFilter} />
          </div>
        }
        <div className={style['scrolling-viewport']} ref={this.ref}>
          <InfiniteScroll
            loadMore={loadMore}
            hasMore={vms.get('notAllPagesLoaded')}
            useWindow={false}
          >
            {list || (<div />)}
          </InfiniteScroll>
        </div>
      </React.Fragment>
    )
  }
}

VmsNotificationsList.propTypes = {
  vmsNotifications: PropTypes.object.isRequired,
  vms: PropTypes.object.isRequired,
  defaultValue: PropTypes.bool,

  handleChange: PropTypes.func.isRequired,
  loadAnotherPage: PropTypes.func.isRequired,
}

export default connect(
  (state) => ({
    vms: state.vms,
  }),
  (dispatch) => ({
    loadAnotherPage: (page) => dispatch(getByPage({ page })),
  })
)(VmsNotificationsList)
