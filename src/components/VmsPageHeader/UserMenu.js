import React from 'react'
import PropTypes from 'prop-types'
import { connect } from 'react-redux'

import { logout } from '_/actions'

import { msg } from '_/intl'
import AboutDialog from '../About'
import OverlayTooltip from '_/components/OverlayTooltip'

const UserMenu = ({ config, onLogout }) => {
  const idPrefix = 'usermenu'
  return (
    <li className='dropdown'>
      <OverlayTooltip id={`${idPrefix}-tooltip`} tooltip={config.getIn(['user', 'name'])} placement='bottom'>
        <a className='dropdown-toggle nav-item-iconic' href='#' data-toggle='dropdown' id={`${idPrefix}-user`}>
          <i className='fa fa-user' /><span className='caret' />
        </a>
      </OverlayTooltip>
      <ul className='dropdown-menu'>
        <li>
          <AboutDialog />
        </li>
        <li>
          <a href='#' onClick={e => { e.preventDefault(); onLogout() }} id={`${idPrefix}-logout`}>{msg.logOut()}</a>
        </li>
      </ul>
    </li>
  )
}

UserMenu.propTypes = {
  config: PropTypes.object.isRequired,
  onLogout: PropTypes.func.isRequired,
}

export default connect(
  (state) => ({
    config: state.config,
  }),
  (dispatch) => ({
    onLogout: () => dispatch(logout(true)),
  })
)(UserMenu)
