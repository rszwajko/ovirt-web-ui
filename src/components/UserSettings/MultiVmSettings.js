import VmsPicker from './VmsPicker'
import React, { useState } from 'react'
import { VmSettings } from '.'
import PropTypes from 'prop-types'

const MultiVmSettings = ({ vms, selectedVms: initiallySelectedVms = [], updateUrl, goToParent }) => {
  const [selectedVms, setSelectedVms] = useState(initiallySelectedVms)

  const setSelectedVmsWithSideEffects = (array) => {
    setSelectedVms(array)
    if (!array.length) {
      goToParent()
    } else {
      updateUrl(array)
    }
  }

  const handleVmCheck = (vmId) => {
    const set = new Set(selectedVms)
    if (set.has(vmId)) {
      set.delete(vmId)
    } else {
      set.add(vmId)
    }
    setSelectedVmsWithSideEffects([...set])
  }

  const handleAllVmsCheck = (e) => {
    if (e.target.checked) {
      setSelectedVmsWithSideEffects(vms.get('vms').keySeq().toJS())
    } else {
      setSelectedVmsWithSideEffects([])
    }
  }

  return (
    <React.Fragment >
      <VmSettings selectedVms={selectedVms} vms={vms.get('vms')} goToVmPage={goToParent}>
        <VmsPicker
          handleAllVmsCheck={handleAllVmsCheck}
          vms={vms}
          handleVmCheck={handleVmCheck}
          selectedVms={selectedVms} />
      </VmSettings>

    </React.Fragment>
  )
}

MultiVmSettings.propTypes = {
  vms: PropTypes.object.isRequired,
  selectedVms: PropTypes.array.isRequired,
  updateUrl: PropTypes.func.isRequired,
  goToParent: PropTypes.func.isRequired,
}

export default MultiVmSettings
