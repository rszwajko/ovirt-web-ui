import React from 'react'
import PropTypes from 'prop-types'
import { connect } from 'react-redux'
import { withMsg } from '_/intl'
// import moment from 'moment'

import {
  TableComposable,
  Tbody,
  Th,
  Thead,
  Td,
  Tr,
} from '@patternfly/react-table'

import {
  Button,
  //   ButtonVariant,
  EmptyState,
  EmptyStateIcon,
  EmptyStateBody,
  //   EmptyStateSecondaryActions,
  //   HelperText,
  //   HelperTextItem,
  Spinner,
  Title,
//   TextInput,
//   Tooltip,
} from '@patternfly/react-core'

import {
  SearchIcon,
} from '@patternfly/react-icons/dist/esm/icons'

import { EventStatus } from './EventStatus'

import style from './style.css'
import { localeCompare, toJS } from '_/helpers'

import { saveEventFilters } from '_/actions'

import { SEVERITY, DATE, MESSAGE, EVENT_SEVERITY, UNKNOWN } from './EventFilters'
import moment from 'moment'

const sortEvents = (events = [], { id, isAsc } = {}, locale) => {
  if (!id) {
    return
  }
  const direction = isAsc ? 1 : -1
  const getField = (event, id) => {
    switch (id) {
      case SEVERITY:
        return '' + EVENT_SEVERITY[event?.severity ?? UNKNOWN] ?? EVENT_SEVERITY[UNKNOWN]
      case DATE:
        return '' + event?.time ?? ''
      case MESSAGE:
        return event?.description
    }
  }

  events.sort((a, b) => direction * localeCompare(getField(a, id), getField(b, id), locale))
}

const EventsTable = ({
  msg,
  locale,
  events,
  eventFilters: { [SEVERITY]: severityFilters, [DATE]: dateFilters, [MESSAGE]: messageFilters },
  eventSort,
  clearAllFilters,
}) => {
  const columnNames = {
    [SEVERITY]: msg.severity(),
    [DATE]: msg.date(),
    [MESSAGE]: msg.message(),
  }

  const filteredEvents = events?.filter(({ severity, time, description }) => {
    const ackFromSeverity = !severityFilters?.length || severityFilters?.some(level => level === severity)
    const ackFromTime = !dateFilters?.length || dateFilters?.some(isoDateStr => moment(time).isSame(isoDateStr, 'day'))
    const ackFromMessage = !messageFilters?.length || messageFilters?.some(str => description?.includes(str))
    return ackFromSeverity && ackFromTime && ackFromMessage
  })

  sortEvents(filteredEvents, eventSort, locale)

  return (
    <div className={style.container}>
      { !filteredEvents && (
        <EmptyState variant="xl" isFullHeight>
          <EmptyStateIcon variant="container" component={Spinner} />
        </EmptyState>
      ) }

      { filteredEvents?.length === 0 && (
        <EmptyState variant="xl" isFullHeight>
          <EmptyStateIcon icon={SearchIcon} />
          <Title size="lg" headingLevel="h4">
            {msg.noEventsFound()}
          </Title>
          <EmptyStateBody>{msg.clearAllFiltersAndTryAgain()}</EmptyStateBody>
          <Button variant="link" onClick={clearAllFilters}>{msg.clearAllFilters()}</Button>
        </EmptyState>
      ) }

      { filteredEvents?.length > 0 && (
        <>
          <TableComposable
            aria-label={msg.events()}
            variant='compact'
            isStriped
          >
            <Thead>
              <Tr>
                <Th>{columnNames[SEVERITY]}</Th>
                <Th>{columnNames[DATE]}</Th>
                <Th>{columnNames[MESSAGE]}</Th>
              </Tr>
            </Thead>
            <Tbody>
              {filteredEvents.map(({ id, severity, time, description }) => {
                return (
                  <Tr key={id}>
                    <Td dataLabel={columnNames[SEVERITY]}>   <EventStatus severity={severity}/>                 </Td>
                    <Td dataLabel={columnNames[DATE]}>       {new Date(time).toLocaleString(locale)}             </Td>
                    <Td dataLabel={columnNames[MESSAGE]}>    {description}                </Td>
                  </Tr>
                )
              })}
            </Tbody>
          </TableComposable>
        </>
      ) }
    </div>
  )
}

EventsTable.propTypes = {
  msg: PropTypes.object.isRequired,
  locale: PropTypes.string.isRequired,
  events: PropTypes.array,
  eventFilters: PropTypes.object.isRequired,
  eventSort: PropTypes.shape({
    id: PropTypes.string.isRequired,
    messageDescriptor: PropTypes.object.isRequired,
    isAsc: PropTypes.bool,
  }),
  clearAllFilters: PropTypes.func.isRequired,

}

export default connect(
  ({ userMessages }, { vmId }) => ({
    events: toJS(userMessages.getIn(['events', vmId])),
    eventFilters: toJS(userMessages.getIn(['eventFilters'], {})),
    eventSort: toJS(userMessages.getIn(['eventSort'])),
  }),
  (dispatch) => ({
    clearAllFilters: () => dispatch(saveEventFilters({ filters: {} })),
  })
)(withMsg(EventsTable))
