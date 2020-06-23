import React from 'react'
import PropTypes from 'prop-types'

import { Alert } from 'patternfly-react'
import style from './style.css'
const TIME_TO_DISPLAY_MODAL = 10 * 1000 // 10 seconds

class CounterAlert extends React.Component {
  constructor (props) {
    super(props)
    this.timer = setTimeout(this.props.onDismiss, TIME_TO_DISPLAY_MODAL)
  }

  componentWillUnmount () {
    clearTimeout(this.timer)
  }

  render () {
    const dismiss = () => {
      clearTimeout(this.timer)
      this.props.onDismiss()
    }
    const { title, type, children } = this.props
    return <div className={style['alert-container']}>
      <Alert type={type} onDismiss={dismiss}>
        <p>{title}</p>
        {children}
      </Alert>
    </div>
  }
}
CounterAlert.propTypes = {
  title: PropTypes.string.isRequired,
  type: PropTypes.string,
  children: PropTypes.node,
  onDismiss: PropTypes.func.isRequired,
}

CounterAlert.defaultProps = {
  type: 'success',
}

export default CounterAlert
