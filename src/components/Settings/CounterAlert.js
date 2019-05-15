import React from 'react'
import PropTypes from 'prop-types'

import { Alert } from 'patternfly-react'

const TIME_TO_DISPLAY_MODAL = 10 // 10 seconds

class CounterAlert extends React.Component {
  constructor (props) {
    super(props)
    this.state = {
      counter: TIME_TO_DISPLAY_MODAL,
    }

    this.decrementCounter = this.decrementCounter.bind(this)
    this.timer = setInterval(this.decrementCounter, 1000)
  }

  decrementCounter () {
    const state = {
      counter: this.state.counter - 1,
    }
    if (this.state.counter <= 0) {
      clearInterval(this.timer)
      this.timer = null
      this.props.onDismiss()
    }
    this.setState(state)
  }

  componentWillUnmount () {
    clearInterval(this.timer)
  }

  render () {
    const { title, type } = this.props
    return <Alert type={type} onDismiss={this.props.onDismiss}>
      {title}
    </Alert>
  }
}
CounterAlert.propTypes = {
  title: PropTypes.string.isRequired,
  type: PropTypes.string,
  onDismiss: PropTypes.func.isRequired,
}

CounterAlert.defaultProps = {
  type: 'success',
}

export default CounterAlert
