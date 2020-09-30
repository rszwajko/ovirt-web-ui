import { resumeNotifications } from './options'
import {
  all,
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
  fetchPools,
  fetchSinglePool,
  fetchSingleVm,
  fetchVms,
  fetchCurrentUser,
  selectVmDetail,
} from './index'
import { fetchIsoFiles } from './storageDomains'

/**
 * Change the background refresh type based on the page type, and force a refresh.
 *
 * This should be done at the time of navigation to the page, typically by the page router.
 */
function* changePage (action) {
  yield put(Actions.stopSchedulerFixedDelay())
  yield put(Actions.setCurrentPage(action.payload))
  yield put(Actions.refresh({
    onNavigation: true,
    shallowFetch: true,
  }))
  const delayInSeconds = yield select(state => state.options.getIn(['global', 'updateRate'], AppConfiguration.schedulerFixedDelayInSeconds))
  yield put(Actions.startSchedulerFixedDelay({ immediate: true, delayInSeconds }))
}

/**
 * Invoke the correct refresh function based on the app's current page type.
 */
function* refreshData (action) {
  const currentPage = yield select(state => state.config.get('currentPage'))
  const refreshType =
    currentPage.type === C.NO_REFRESH_TYPE ? null
      : currentPage.type === undefined ? C.LIST_PAGE_TYPE
        : currentPage.type

  console.info('refreshData() 🡒', 'refreshType:', refreshType, 'currentPage:', currentPage, 'payload:', action.payload)
  if (refreshType) {
    yield pagesRefreshers[refreshType](Object.assign({ id: currentPage.id }, action.payload))
  }
  yield put(Actions.refreshFinished())
  console.info('refreshData() 🡒 finished')
}

const pagesRefreshers = {
  [C.LIST_PAGE_TYPE]: refreshListPage,
  [C.DETAIL_PAGE_TYPE]: refreshDetailPage,
  [C.CREATE_PAGE_TYPE]: refreshCreatePage,
  [C.CONSOLE_PAGE_TYPE]: refreshConsolePage,
  [C.SETTINGS_PAGE_TYPE]: fetchCurrentUser,
  [C.VM_SETTINGS_PAGE_TYPE]: refreshVmSettingsPage,
  [C.MULTI_VM_SETTINGS_PAGE_TYPE]: refreshMultiVmSettingsPage,
}

function* getIdsByType (type) {
  const ids = Array.from(yield select(state => state.vms.get(type).keys()))
  return ids
}

function* refreshListPage ({ shallowFetch, onNavigation, onSchedule }) {
  const [ vmsPage, poolsPage ] = yield select(st => [ st.vms.get('vmsPage'), st.vms.get('poolsPage') ])

  // Special case for the very first `refreshListPage` of the App .. use fetchByPage()!
  if (vmsPage === 0 && poolsPage === 0) {
    yield call(fetchByPage)
    return
  }

  const [ vmsCount, poolsCount ] = yield all([
    call(function* () {
      // refresh VMs and remove any that haven't been refreshed
      if (vmsPage > 0) {
        const fetchedVmIds = yield fetchVms(Actions.getVmsByCount({
          count: vmsPage * AppConfiguration.pageLimit,
          shallowFetch,
        }))

        const vmsIds = yield getIdsByType('vms')
        const fetchedDirectlyVmIds =
          (yield all(
            vmsIds
              .filter(vmId => !fetchedVmIds.includes(vmId))
              .map(vmId => call(fetchSingleVm, Actions.getSingleVm({ vmId, shallowFetch })))
          ))
            .reduce((vmIds, vm) => { if (vm) vmIds.push(vm.id); return vmIds }, [])

        yield put(Actions.removeMissingVms({ vmIdsToPreserve: [ ...fetchedVmIds, ...fetchedDirectlyVmIds ] }))
      }

      return yield select(state => state.vms.get('vms').size)
    }),

    call(function* () {
      // refresh Pools and remove any that haven't been refreshed
      if (poolsPage > 0) {
        const fetchedPoolIds = yield fetchPools(Actions.getPoolsByCount({
          count: poolsPage * AppConfiguration.pageLimit,
        }))

        const filteredPoolIds = yield getIdsByType('pools')
        const fetchedDirectlyPoolIds =
          (yield all(
            filteredPoolIds
              .filter(poolId => !fetchedPoolIds.includes(poolId))
              .map(poolId => call(fetchSinglePool, Actions.getSinglePool({ poolId })))
          ))
            .reduce((poolIds, pool) => { if (pool) poolIds.push(pool.id); return poolIds }, [])

        yield put(Actions.removeMissingPools({ poolIdsToPreserve: [ ...fetchedPoolIds, ...fetchedDirectlyPoolIds ] }))
      }

      return yield select(state => state.vms.get('pools').size)
    }),
  ])

  //
  // Since it is possible that VMs or Pools have been added since the last refresh,
  // and another page of data could be available, the *ExpectMorePages values need
  // to be updated.  Similar to `fetchByPage()`, assume there is more to fetch if the
  // size of VMs/Pools is full.
  //
  yield put(Actions.updatePagingData({
    vmsExpectMorePages: vmsCount >= vmsPage * AppConfiguration.pageLimit,
    poolsExpectMorePages: poolsCount >= poolsPage * AppConfiguration.pageLimit,
  }))

  // update counts
  yield put(Actions.updateVmsPoolsCount())
}

function* refreshVmSettingsPage ({ id }) {
  yield all([
    fetchSingleVm(Actions.getSingleVm({ vmId: id })),
    fetchCurrentUser(),
  ])
}

function* refreshMultiVmSettingsPage ({ id }) {
  yield all([
    refreshListPage({}),
    fetchCurrentUser(),
  ])
}

function* refreshDetailPage ({ id, onNavigation, onSchedule }) {
  yield selectVmDetail(Actions.selectVmDetail({ vmId: id }))

  // Load ISO images on manual refresh click only
  if (!onNavigation && !onSchedule) {
    yield fetchIsoFiles(Actions.getIsoFiles())
  }
}

function* refreshCreatePage ({ id, onNavigation, onSchedule }) {
  if (id) {
    yield selectVmDetail(Actions.selectVmDetail({ vmId: id }))
  }

  // Load ISO images on manual refresh click only
  if (!onNavigation && !onSchedule) {
    yield fetchIsoFiles(Actions.getIsoFiles())
  }
}

function* refreshConsolePage ({ id, onNavigation, onSchedule }) {
  if (id) {
    yield selectVmDetail(Actions.selectVmDetail({ vmId: id }))
  }
}

function* startSchedulerWithFixedDelay ({ payload: { immediate, delayInSeconds } }) {
  // if a scheduler is already running, stop it
  yield put(Actions.stopSchedulerFixedDelay())

  // Continue previous wait period (unless immediate refresh is forced).
  // Restarting the wait period could lead to irregular, long intervals without refresh
  // or prevent the refresh (as long as user will keep changing the interval)
  // Example:
  // 1. previous refresh period is 2 min (1m 30sec already elapsed)
  // 2. user changes it to 5min
  // 3. already elapsed time will be taken into consideration and refresh will be
  //    triggered after 3 m 30sec.
  // Result: Wait intervals will be 2min -> 2min -> 5min -> 5min.
  // With restarting timers: 2min -> 2min -> 6min 30 sec -> 5min.
  const lastRefresh = yield select(state => state.config.get('lastRefresh', 0))
  const timeFromLastRefresh = (Date.now() - lastRefresh) / 1000
  const startDelayInSeconds = immediate || timeFromLastRefresh > delayInSeconds ? 0 : delayInSeconds - timeFromLastRefresh

  // run a new scheduler
  yield schedulerWithFixedDelay(delayInSeconds, startDelayInSeconds)
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

function* schedulerWithFixedDelay (
  delayInSeconds = AppConfiguration.schedulerFixedDelayInSeconds,
  startDelayInSeconds = AppConfiguration.schedulerFixedDelayInSeconds
) {
  if (!isNumber(delayInSeconds) || delayInSeconds <= 0 ||
  !isNumber(startDelayInSeconds) || startDelayInSeconds < 0) {
    return
  }

  const myId = _SchedulerCount++
  console.log(`⏰ schedulerWithFixedDelay[${myId}] 🡒 starting fixed delay scheduler with start delay ${startDelayInSeconds}`)

  const { stopped: stoppedBeforeStarted } = yield * schedulerWaitFor(startDelayInSeconds)
  if (stoppedBeforeStarted) {
    console.log(`⏰ schedulerWithFixedDelay[${myId}] 🡒 scheduler has been stopped during start delay`)
  }

  let enabled = !stoppedBeforeStarted
  while (enabled) {
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

    yield put(Actions.refresh({
      onSchedule: true,
      shallowFetch: true,
    }))

    console.log(`⏰ schedulerWithFixedDelay[${myId}] 🡒 stoppable delay for: ${delayInSeconds}`)
    const { stopped } = yield * schedulerWaitFor(delayInSeconds)

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
  const { stopped } = yield * schedulerWaitFor(delayInSeconds, C.STOP_SCHEDULER_FOR_RESUMING_NOTIFICATIONS)
  if (stopped) {
    console.log(`notification timer [${myId}] - stopped`)
  } else {
    console.log(`notification timer [${myId}] - resume notifications`)
    yield * resumeNotifications()
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
}

export default [
  takeEvery(C.START_SCHEDULER_FIXED_DELAY, startSchedulerWithFixedDelay),
  throttle(5000, C.REFRESH_DATA, refreshData),
  takeLatest(C.CHANGE_PAGE, changePage),
  takeEvery(C.LOGOUT, logoutAndCancelScheduler),
  takeEvery(C.START_SCHEDULER_FOR_RESUMING_NOTIFICATIONS, scheduleResumingNotifications),
]
