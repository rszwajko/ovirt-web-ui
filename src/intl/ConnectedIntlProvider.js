import React, { useEffect } from 'react'
import PropTypes from 'prop-types'

import { connect } from 'react-redux'

import { locale as estimatedLocale, getSelectedMessages } from '_/intl'

import { IntlProvider } from 'react-intl'

const ConnectedIntlProvider = ({ children, locale, messages }) => {
  useEffect(() => {
    if (locale !== estimatedLocale) {
      window.location.reload()
    }
  }, [locale])
  return (
    <IntlProvider key={locale} locale={locale} messages={messages}>
      {children}
    </IntlProvider>
  )
}

ConnectedIntlProvider.propTypes = {
  children: PropTypes.node,
  locale: PropTypes.string.isRequired,
  messages: PropTypes.object.isRequired,
}

export default connect(
  state => {
    const userLocale = state.options.getIn(['global', 'language'], estimatedLocale)
    return {
      locale: userLocale,
      messages: getSelectedMessages(userLocale),
    }
  }
)(ConnectedIntlProvider)
