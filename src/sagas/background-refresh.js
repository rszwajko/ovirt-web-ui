import {
  resumeNotifications,
  loadUserOptions,
} from './options'

import {
  call,
  put,
  race,
  select,
  take,
  takeEvery,
  takeLatest,
  throttle,
} from 'redux-saga/effects'

import * as Actions from '_/actions'
import * as C from '_/constants'

import AppConfiguration from '_/config'
import { isNumber } from '_/utils'
import { delay } from './utils'

import {
  fetchByPage,
  selectVmDetail,
} from './index'
import { getConsoleOptions } from './console'
import { fetchIsoFiles } from './storageDomains'

/**
 * Change the background refresh type based on the page type, and force a refresh.
 *
 * This should be done at the time of navigation to the page, typically by the page router.
 */
function* changePage (action) {
  yield put(Actions.setCurrentPage(action.payload))
  const delayInSeconds = yield select(state => state.options.getIn(['remoteOptions', 'refreshInterval', 'content'], AppConfiguration.schedulerFixedDelayInSeconds))
  yield put(Actions.startSchedulerFixedDelay({ pageRouterRefresh: true, targetPage: action.payload, startDelayInSeconds: 0, delayInSeconds }))
}

function* refreshManually () {
  const currentPage = yield select(state => state.config.get('currentPage'))
  const delayInSeconds = yield select(state => state.options.getIn(['remoteOptions', 'refreshInterval', 'content'], AppConfiguration.schedulerFixedDelayInSeconds))
  yield put(Actions.startSchedulerFixedDelay({ manualRefresh: true, targetPage: currentPage, startDelayInSeconds: 0, delayInSeconds }))
}

/**
 * Invoke the correct refresh function based on the app's current page type.
 */
function* refreshData ({
  targetPage = { type: C.NO_REFRESH_TYPE },
  pageRouterRefresh,
  schedulerRefresh,
  manualRefresh,
  ...otherPayload
}) {
  const refreshType =
    targetPage.type === C.NO_REFRESH_TYPE
      ? null
      : targetPage.type === undefined
        ? C.LIST_PAGE_TYPE
        : targetPage.type

  console.info('refreshData() 🡒', 'refreshType:', refreshType, 'currentPage:', targetPage, 'payload:', otherPayload)
  if (refreshType) {
    yield pagesRefreshers[refreshType]({
      id: targetPage.id,
      pageRouterRefresh,
      schedulerRefresh,
      manualRefresh,
      ...otherPayload,
    })
  }
  yield put(Actions.updateLastRefresh())
  console.info('refreshData() 🡒 finished')
}

const pagesRefreshers = {
  [C.LIST_PAGE_TYPE]: refreshListPage,
  [C.DETAIL_PAGE_TYPE]: refreshDetailPage,
  [C.CREATE_PAGE_TYPE]: refreshCreatePage,
  [C.CONSOLE_PAGE_TYPE]: refreshConsolePage,
  [C.SETTINGS_PAGE_TYPE]: loadUserOptions,
}

function* refreshListPage () {
  const [vmsPage, vmsExpectMorePages, poolsPage, poolsExpectMorePages] = yield select(st => [
    st.vms.get('vmsPage'), st.vms.get('vmsExpectMorePages'),
    st.vms.get('poolsPage'), st.vms.get('poolsExpectMorePages'),
  ])

  // list page initial state - fetch the first page
  if (vmsPage === 0 && vmsExpectMorePages && poolsPage === 0 && poolsExpectMorePages) {
    yield fetchByPage()
  }
}

function* refreshDetailPage ({ id, manualRefresh }) {
  yield selectVmDetail(Actions.selectVmDetail({ vmId: id }))
  yield getConsoleOptions(Actions.getConsoleOptions({ vmId: id }))

  // Load ISO images on manual refresh click only
  if (manualRefresh) {
    yield fetchIsoFiles(Actions.getIsoFiles())
  }
}

function* refreshCreatePage ({ id, manualRefresh }) {
  if (id) {
    yield selectVmDetail(Actions.selectVmDetail({ vmId: id }))
  }

  // Load ISO images on manual refresh click only
  if (manualRefresh) {
    yield fetchIsoFiles(Actions.getIsoFiles())
  }
}

function* refreshConsolePage ({ id }) {
  if (id) {
    yield selectVmDetail(Actions.selectVmDetail({ vmId: id }))
  }
}

function* startSchedulerWithFixedDelay ({ payload: { delayInSeconds, startDelayInSeconds, ...rest } }) {
  // if a scheduler is already running, stop it
  yield put(Actions.stopSchedulerFixedDelay())

  const lastRefresh = yield select(state => state.config.get('lastRefresh', 0))

  // run a new scheduler
  yield schedulerWithFixedDelay({
    delayInSeconds,
    startDelayInSeconds: calculateStartDelayIfMissing({ delayInSeconds, startDelayInSeconds, lastRefresh }),
    ...rest,
  })
}

/*
  Continue previous wait period (unless immediate refresh is forced).
  Restarting the wait period could lead to irregular, long intervals without refresh
  or prevent the refresh (as long as user will keep changing the interval)

  Example:
    1. previous refresh period is 2 min (1m 30sec already elapsed)
    2. user changes it to 5min
    3. already elapsed time will be taken into consideration and refresh will be
       triggered after 3 m 30sec.

  Result: Wait intervals will be 2min -> 2min -> 5min -> 5min.
  With restarting timers: 2min -> 2min -> 6min 30 sec -> 5min.
*/
function calculateStartDelayIfMissing ({ delayInSeconds, startDelayInSeconds, lastRefresh }) {
  if (startDelayInSeconds !== undefined) {
    return startDelayInSeconds
  }
  const timeFromLastRefresh = ((Date.now() - lastRefresh) / 1000).toFixed(0)
  return timeFromLastRefresh > delayInSeconds ? 0 : delayInSeconds - timeFromLastRefresh
}

/**
 * Starts a cancellable timer.
 * Timer can be cancelled by dispatching configurable action.
 */
function* schedulerWaitFor (timeInSeconds, cancelActionType = C.STOP_SCHEDULER_FIXED_DELAY) {
  if (!timeInSeconds) {
    return {}
  }

  const { stopped } = yield race({
    stopped: take(cancelActionType),
    fixedDelay: delay(timeInSeconds * 1000),
  })
  return { stopped: !!stopped }
}

let _SchedulerCount = 0

function* schedulerWithFixedDelay ({
  delayInSeconds = AppConfiguration.schedulerFixedDelayInSeconds,
  startDelayInSeconds = AppConfiguration.schedulerFixedDelayInSeconds,
  targetPage,
  pageRouterRefresh = false,
  manualRefresh = false,
}) {
  if (!isNumber(delayInSeconds) || delayInSeconds <= 0 ||
  !isNumber(startDelayInSeconds) || startDelayInSeconds < 0) {
    console.error(`⏰ schedulerWithFixedDelay 🡒 invalid arguments: delayInSeconds=${delayInSeconds} startDelayInSeconds=${startDelayInSeconds}`)
    return
  }
  let firstRun = true
  const myId = ++_SchedulerCount
  console.log(`⏰ schedulerWithFixedDelay[${myId}] 🡒 starting fixed delay scheduler with start delay ${startDelayInSeconds}`)

  const { stopped: stoppedBeforeStarted } = yield call(schedulerWaitFor, startDelayInSeconds)
  if (stoppedBeforeStarted) {
    console.log(`⏰ schedulerWithFixedDelay[${myId}] 🡒 scheduler has been stopped during start delay`)
  }

  let enabled = !stoppedBeforeStarted
  while (enabled) {
    if (myId !== _SchedulerCount) {
      enabled = false
      console.log(`⏰ schedulerWithFixedDelay[${myId}] 🡒 scheduler has been stopped due to newer scheduler detected [${_SchedulerCount}]`)
      continue
    }

    const isTokenExpired = yield select(state => state.config.get('isTokenExpired'))
    if (isTokenExpired) {
      enabled = false
      console.log(`⏰ schedulerWithFixedDelay[${myId}] 🡒 scheduler has been stopped due to SSO token expiration`)
      continue
    }

    const oVirtVersion = yield select(state => state.config.get('oVirtApiVersion'))
    if (!oVirtVersion.get('passed')) {
      console.log(`⏰ schedulerWithFixedDelay[${myId}] 🡒 event skipped since oVirt API version does not match`)
      continue
    }

    yield refreshData({
      pageRouterRefresh: pageRouterRefresh && firstRun,
      manualRefresh: manualRefresh && firstRun,
      targetPage,
      schedulerRefresh: true,
    })
    firstRun = false

    console.log(`⏰ schedulerWithFixedDelay[${myId}] 🡒 stoppable delay for: ${delayInSeconds}`)
    const { stopped } = yield call(schedulerWaitFor, delayInSeconds)

    if (stopped) {
      enabled = false
      console.log(`⏰ schedulerWithFixedDelay[${myId}] 🡒 scheduler has been stopped`)
      continue
    }

    console.log(`⏰ schedulerWithFixedDelay[${myId}] 🡒 running after delay of: ${delayInSeconds}`)
  }
}

let _SchedulerForNotificationsCount = 0
function* scheduleResumingNotifications ({ payload: { delayInSeconds } }) {
  yield put(Actions.stopSchedulerForResumingNotifications())
  const myId = _SchedulerForNotificationsCount++
  console.log(`notification timer [${myId}] - delay [${delayInSeconds}] sec`)
  const { stopped } = yield call(schedulerWaitFor, delayInSeconds, C.STOP_SCHEDULER_FOR_RESUMING_NOTIFICATIONS)
  if (stopped) {
    console.log(`notification timer [${myId}] - stopped`)
  } else {
    console.log(`notification timer [${myId}] - resume notifications`)
    yield call(resumeNotifications)
  }
}

/**
 * When ovirt-web-ui is installed to ovirt-engine, a logout should push the user to the
 * base ovirt welcome page.  But when running in dev mode or via container, the logout
 * page is displayed.  In that case, we want to make sure the page is set to something
 * appropriate and that background refreshing is no longer done.
 */
function* logoutAndCancelScheduler () {
  yield put(Actions.setCurrentPage({ type: C.NO_REFRESH_TYPE }))
  yield put(Actions.stopSchedulerFixedDelay())
  yield put(Actions.stopSchedulerForResumingNotifications())
}

export default [
  // only process the 1st manual refresh received in a 5 second window
  throttle(5000, C.MANUAL_REFRESH, refreshManually),

  /*
   * Note: If a user goes crazy swapping between pages very quickly, a lot of `CHANGE_PAGE`
   *       actions will be fired.  Since changePage() puts `START_SCHEDULER_FIXED_DELAY`
   *       to refresh the new page data each time, it is possible to get to a point where
   *       multiple page refresh sagas are running at the same time.  That can cause
   *       problems and slow down the app.  Not much to be done to prevent this from
   *       happening without slowing down the responsiveness of the app.
   */
  takeLatest(C.CHANGE_PAGE, changePage),

  takeEvery(C.START_SCHEDULER_FIXED_DELAY, startSchedulerWithFixedDelay),
  takeEvery(C.START_SCHEDULER_FOR_RESUMING_NOTIFICATIONS, scheduleResumingNotifications),
  takeEvery(C.LOGOUT, logoutAndCancelScheduler),
]
