import React, { useState, useEffect } from 'react'
import PropTypes from 'prop-types'

import SettingsToolbar from './SettingsToolbar'
import NavigationPrompt from 'react-router-navigation-prompt'
import NavigationConfirmationModal from '../NavigationConfirmationModal'
import CounterAlert from './CounterAlert'
import { generateUnique } from '_/helpers'
import { msg } from '_/intl'

const changedInTheMeantime = ({ currentValues = {}, baseValues = {}, draftValues = {}, sentValues = {} }) => {
  return Object.keys(currentValues).filter(name =>
    currentValues[name] !== baseValues[name] && !(
      // draft is the same as 3rd party change - no risk of losing data
      currentValues[name] === draftValues[name] ||
      // it's your own update but user modified draft in the meantime
      currentValues[name] === sentValues[name]))
}

const pendingUserChanges = ({ currentValues = {}, draftValues = {} }) => {
  return Object.keys(currentValues).filter(name =>
    currentValues[name] !== draftValues[name])
}

const changedInPrevTransaction = ({ currentValues = {}, sentValues = {} }) => {
  return Object.keys(currentValues).filter(name =>
    currentValues[name] === sentValues[name] && currentValues[name] !== undefined)
}

const stillPending = ({ currentValues = {}, sentValues = {} }) => {
  return Object.keys(currentValues).filter(name =>
    sentValues[name] !== undefined &&
      currentValues[name] !== sentValues[name])
}

const Settings = (props) => {
  const [correlationId, setCorrelationId] = useState(null)
  const { draftValues, onSave, lastCorrelationId, onCancel, names, baseValues, sentValues, currentValues, resetBaseValues } = props

  const handleSave = () => {
    const saveFields = pendingUserChanges(props).reduce((acc, cur) => ({ ...acc, [cur]: draftValues[cur] }), {})
    const id = generateUnique('Settings-save_')
    setCorrelationId(id)
    onSave(saveFields, id)
  }

  const conflictingChanges = changedInTheMeantime({ currentValues, baseValues, draftValues, sentValues }).map(field => names[field])

  const fullSuccess = changedInPrevTransaction(props).length !== 0 &&
   stillPending(props).length === 0 &&
   correlationId === lastCorrelationId
  const completeFailure = changedInPrevTransaction(props).length === 0 &&
   stillPending(props).length !== 0 &&
   correlationId === lastCorrelationId
  const partialSuccess = changedInPrevTransaction(props).length !== 0 &&
   stillPending(props).length !== 0 &&
   correlationId === lastCorrelationId

  const pendingChanges = pendingUserChanges(props)

  const [showFullSuccess, setShowFullSuccess] = useState(false)
  const [showCompleteFailure, setShowCompleteFailure] = useState(false)
  const [partialSave, setShowPartialSave] = useState({ show: false, fields: [] })

  useEffect(() => {
    const state = {
      show: partialSuccess,
      fields: pendingChanges.map(e => <p key={names[e]}>{names[e]}</p>),
    }
    if (state.show) { setShowPartialSave(state) }
    if (completeFailure) { setShowCompleteFailure(completeFailure) }
    if (fullSuccess) { setShowFullSuccess(fullSuccess) }
    if (fullSuccess || completeFailure || partialSuccess) {
      // the transaction has finished - remove tracking id
      setCorrelationId(null)
      // reset to new base level that contains last modifications
      resetBaseValues()
    }
  })

  return <React.Fragment>
    <NavigationPrompt when={!!pendingChanges.length}>
      {({ isActive, onConfirm, onCancel }) => (
        <NavigationConfirmationModal show={isActive} onYes={onConfirm} onNo={onCancel} />
      )}
    </NavigationPrompt>
    { showFullSuccess && <CounterAlert title={msg.changesSavedSuccesfully()} type='success' onDismiss={() => setShowFullSuccess(false)} /> }
    { partialSave.show && <CounterAlert type='error' onDismiss={() => setShowPartialSave({ show: false, fields: [] })} title={msg.failedToSaveChangesToFields()} >
      {partialSave.fields}
    </CounterAlert> }
    { showCompleteFailure && <CounterAlert type='error' onDismiss={() => setShowCompleteFailure(false)} title={msg.failedToSaveChanges()} /> }
    <SettingsToolbar onSave={handleSave} onCancel={onCancel} enableSave={!!pendingChanges.length} staleFields={conflictingChanges} />

    {props.children}
  </React.Fragment>
}
Settings.propTypes = {
  draftValues: PropTypes.object.isRequired,
  currentValues: PropTypes.object.isRequired,
  baseValues: PropTypes.object.isRequired,
  sentValues: PropTypes.object.isRequired,
  names: PropTypes.object.isRequired,
  lastCorrelationId: PropTypes.string,
  onSave: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
  children: PropTypes.node,
  resetBaseValues: PropTypes.func.isRequired,
}

export default Settings
