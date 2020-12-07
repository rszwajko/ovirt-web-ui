import $ from 'jquery'

import { setLogDebug } from './logger'
import { localeFromUrl } from '_/intl'

const CONFIG_URL = '/ovirt-engine/web-ui/ovirt-web-ui.config'

const AppConfiguration = {
  debug: true,
  applicationContext: '', // url where ovirt is available ('' is web server root)
  applicationURL: '/', // url where this app is available (dev server path or webapp context root)
  applicationLogoutURL: '', // url to invalidate the user's SSO token ('' skips SSO token invalidation)
  pageLimit: 20,
  schedulerFixedDelayInSeconds: 60,
  notificationSnoozeDurationInMinutes: 10,
  toastNotificationDisplayTimeInSec: 8,

  consoleClientResourcesURL: 'https://www.ovirt.org/documentation/admin-guide/virt/console-client-resources/',
  cockpitPort: '9090',

  queryParams: { // from URL
    locale: localeFromUrl,
  },
}

export function readConfiguration () {
  return new Promise((resolve, reject) => {
    $.ajax({
      url: CONFIG_URL,
      success: (result) => {
        Object.assign(AppConfiguration, JSON.parse(result))
      },
      error: (result) => {
        console.log(`Failed to load production configuration, assuming development mode.`)
      },
      complete: () => {
        setLogDebug(AppConfiguration.debug)
        resolve()
      },
      async: true,
    })
  })
}

export default AppConfiguration
