
import { select } from 'redux-saga/effects'

export function* adjustVVFile ({ data, usbFilter, isSpice, vmId }) {
  const options = yield select(state => state.options)
  // __options__ can either be a plain JS object or ImmutableJS Map
  console.log('adjustVVFile options:', options)
  const globalOptions = options.get('global')
  const vmOptions = options.getIn(['vms', vmId])
  const usedOptions = vmOptions || globalOptions
  if (usedOptions.get('fullScreenMode')) {
    data = data.replace(/^fullscreen=0/mg, 'fullscreen=1')
  }

  const pattern = /^secure-attention=.*$/mg
  let text = 'secure-attention=ctrl+alt+del'
  if (usedOptions.get('ctrlAltDel')) {
    text = 'secure-attention=ctrl+alt+end'
  }
  if (data.match(pattern)) {
    console.log('secure-attention found, replacing by ', text)
    data = data.replace(pattern, text)
  } else {
    console.log('secure-attention was not found, inserting ', text)
    data = data.replace(/^\[virt-viewer\]$/mg, `[virt-viewer]\n${text}`) // ending \n is already there
  }

  if (usbFilter) {
    data = data.replace(/^\[virt-viewer\]$/mg, `[virt-viewer]\nusb-filter=${usbFilter}`)
  }

  if (options && isSpice) {
    const smartcardEnabled = usedOptions.get('smartcard')
    data = data.replace(/^enable-smartcard=[01]$/mg, `enable-smartcard=${smartcardEnabled ? 1 : 0}`)
  }

  console.log('adjustVVFile data after adjustment:', data)
  return data
}
