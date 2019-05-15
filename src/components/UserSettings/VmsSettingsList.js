import React from 'react'
import PropTypes from 'prop-types'

import { connect } from 'react-redux'
import { getByPage } from '_/actions'
import { Checkbox, FormControl } from 'patternfly-react'
import InfiniteScroll from 'react-infinite-scroller'
import naturalCompare from 'string-natural-compare'
import style from './style.css'

class VmsSettingsList extends React.Component {
  constructor (props) {
    super(props)
    this.state = {
      vmsSaveSettings: {},
      isOverflow: false,
      filterValue: '',
    }
    this.ref = React.createRef()
    this.handleChange = this.handleChange.bind(this)
    this.handleFilter = this.handleFilter.bind(this)
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

  handleChange (vmId) {
    const globalOptions = this.props.options.get('options')
    const vmsOptions = this.props.options.get('vms')
    return ({ target: { checked } }) => {
      const hasCustomSettings = !!(globalOptions.getIn(['vmsNotifications', vmId]) || vmsOptions.get(vmId) !== undefined)
      console.log(hasCustomSettings, checked)
      if (hasCustomSettings === checked) {
        this.setState(
          state => ({ vmsSaveSettings: { ...state.vmsSaveSettings, [vmId]: checked } }),
          () => this.props.onChange(this.state.vmsSaveSettings)
        )
      } else {
        if (hasCustomSettings === checked && this.state.vmsSaveSettings[vmId]) {
          let vmsSaveSettings = { ...this.state.vmsSaveSettings }
          delete vmsSaveSettings[vmId]
          this.setState(
            { vmsSaveSettings },
            () => this.props.onChange(this.state.vmsSaveSettings)
          )
        }
      }
    }
  }

  componentDidUpdate () {
    this.updateOverflow()
  }

  handleFilter ({ target: { value } }) {
    this.setState({ filterValue: value })
  }

  render () {
    const { vms, loadAnotherPage, options } = this.props
    const globalOptions = options.get('options')
    const vmsOptions = options.get('vms')
    const loadMore = () => {
      if (vms.get('notAllPagesLoaded')) {
        loadAnotherPage(vms.get('page') + 1)
      }
    }

    let list = null
    const items = vms
      .get('vms')
      .sort((vmA, vmB) => naturalCompare.caseInsensitive(vmA.get('name'), vmB.get('name')))
      .filter(vm => vm.get('name').startsWith(this.state.filterValue))
      .map(vm => {
        const vmId = vm.get('id')
        const hasVmCustomSettings = globalOptions.getIn(['vmsNotifications', vmId]) || vmsOptions.get(vmId)
        const vmChecked = this.state.vmsSaveSettings[vmId] !== undefined ? this.state.vmsSaveSettings[vmId] : !hasVmCustomSettings
        return <Checkbox key={vmId} checked={vmChecked} onChange={this.handleChange(vmId)}>
          {vm.get('name')} {!vmChecked && <span>(you have manual settings)</span>}
        </Checkbox>
      })

    list = (
      <div>
        {items.toArray()}
      </div>
    )

    return (
      <React.Fragment>
        {(this.state.isOverflow || this.state.filterValue) &&
          <div className={style['filter-vms-box']}>
            <FormControl type='text' value={this.state.filterValue} placeholder='Filter VM' onChange={this.handleFilter} />
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

VmsSettingsList.propTypes = {
  vms: PropTypes.object.isRequired,
  options: PropTypes.object.isRequired,

  onChange: PropTypes.func.isRequired,
  loadAnotherPage: PropTypes.func.isRequired,
}

export default connect(
  (state) => ({
    vms: state.vms,
    options: state.options,
  }),
  (dispatch) => ({
    loadAnotherPage: (page) => dispatch(getByPage({ page })),
  })
)(VmsSettingsList)
