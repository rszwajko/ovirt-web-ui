import React from 'react'
import PropTypes from 'prop-types'
import { connect } from 'react-redux'
import { msg } from '_/intl'
import { generateUnique } from '_/helpers'
import { isNumber, convertValue } from '_/utils'
import { BASIC_DATA_SHAPE, STORAGE_SHAPE } from '../dataPropTypes'

import {
  createDiskTypeList,
  createStorageDomainList,
  sortNicsDisks,
  suggestDiskName,
} from '_/components/utils'

import {
  Button,
  Checkbox,
  DropdownKebab,
  EmptyState,
  FieldLevelHelp,
  FormGroup,
  FormControl,
  MenuItem,
  Table,
  Label,
} from 'patternfly-react'
import _TableInlineEditRow from './_TableInlineEditRow'
import SelectBox from '_/components/SelectBox'

import style from './style.css'
import OverlayTooltip from '_/components/OverlayTooltip'

function getDefaultDiskType (vmOptimizedFor) {
  const diskType =
    vmOptimizedFor === 'highperformance' ? 'pre'
      : vmOptimizedFor === 'server' ? 'pre'
        : 'thin'

  return diskType
}

const TooltipLabel = ({ id, className, bsStyle = 'default', children }) =>
  <Label
    id={id}
    className={`${style['disk-label']} ${className}`}
    bsStyle={bsStyle}
  >
    {children}
  </Label>

TooltipLabel.propTypes = {
  id: PropTypes.string,
  className: PropTypes.string,
  bsStyle: Label.propTypes.bsStyle,
  children: PropTypes.node.isRequired,
}

export const DiskNameWithLabels = ({ id, disk }) => {
  const idPrefix = `${id}-disk-${disk.id}`
  return <React.Fragment>
    <span id={`${idPrefix}-name`}>{ disk.name }</span>
    { disk.isFromTemplate &&
      <OverlayTooltip id={`${idPrefix}-template-defined-badge`} tooltip={msg.templateDefined()} placement='top'>
        <Label id={`${idPrefix}-from-template`} className={`${style['disk-label']}`}>
          T
        </Label>
      </OverlayTooltip>
    }
    { disk.bootable &&
      <Label id={`${idPrefix}-bootable`} className={style['disk-label']} bsStyle='info'>
        { msg.diskLabelBootable() }
      </Label>
    }
  </React.Fragment>
}
DiskNameWithLabels.propTypes = {
  id: PropTypes.string,
  disk: PropTypes.shape({
    id: PropTypes.string,
    name: PropTypes.string,
    isFromTemplate: PropTypes.bool,
    bootable: PropTypes.bool,
  }),
}

/**
 * The disks table cannot be completely a controlled component, some state about rows being
 * edited needs to be held within the component.  Right now only the fact that a row is
 * being edited is being tracked in component state.
 *
 * Input field editing in the table have the same restrictions as the nics table.
 */
class Storage extends React.Component {
  constructor (props) {
    super(props)
    this.handleCellChange = this.handleCellChange.bind(this)
    this.handleRowCancelChange = this.handleRowCancelChange.bind(this)
    this.handleRowConfirmChange = this.handleRowConfirmChange.bind(this)
    this.onCreateDisk = this.onCreateDisk.bind(this)
    this.onDeleteRow = this.onDeleteRow.bind(this)
    this.onEditDisk = this.onEditDisk.bind(this)
    this.rowRenderProps = this.rowRenderProps.bind(this)
    this.bootableInfo = this.bootableInfo.bind(this)
    this.isBootableDiskTemplate = this.isBootableDiskTemplate.bind(this)
    this.isEditingMode = this.isEditingMode.bind(this)

    this.state = {
      editing: {},
      creating: false,
    }

    const {
      id: idPrefix = 'create-vm-wizard-storage',
    } = this.props

    // ---- Table Row Editing Controller
    this.inlineEditController = {
      isEditing: ({ rowData, column, property }) => this.state.editing[rowData.id] !== undefined,
      onActivate: ({ rowData }) => this.onEditDisk(rowData),
      onConfirm: ({ rowData }) => this.handleRowConfirmChange(rowData),
      onCancel: ({ rowData }) => this.handleRowCancelChange(rowData),
    }

    // ----- Table Cell Renderers
    const headerFormatText = (label, { column }) => <Table.Heading {...column.header.props}>{label}</Table.Heading>

    const inlineEditFormatter = Table.inlineEditFormatterFactory({
      isEditing: additionalData => this.inlineEditController.isEditing(additionalData),

      renderValue: (value, additionalData) => {
        const { column } = additionalData

        return (
          <Table.Cell>
            { column.valueView ? column.valueView(value, additionalData) : value }
          </Table.Cell>
        )
      },

      renderEdit: (value, additionalData) => {
        const { column } = additionalData
        return (
          <Table.Cell className='editable editing'>
            { column.editView ? column.editView(value, additionalData) : value }
          </Table.Cell>
        )
      },
    })

    // ---- Table Column Definitions
    this.columns = [
      // name
      {
        header: {
          label: msg.createVmStorageTableHeaderName(),
          formatters: [headerFormatText],
          props: {
            style: {
              width: '30%',
            },
          },
        },
        cell: {
          formatters: [inlineEditFormatter],
        },
        valueView: (value, { rowData }) => {
          return <DiskNameWithLabels id={idPrefix} disk={rowData} />
        },
        editView: (value, { rowData }) => {
          const row = this.state.editing[rowData.id]

          return row.isFromTemplate
            ? this.columns[0].valueView(value, { rowData })
            : (
              <FormControl
                id={`${idPrefix}-${value}-name-edit`}
                type='text'
                defaultValue={row.name}
                onBlur={e => this.handleCellChange(rowData, 'name', e.target.value)}
              />
            )
        },
      },

      // Bootable column - displayed only when editing disk
      // Note: only one disk can be bootable at a time
      {
        header: {
          label: msg.createVmStorageTableHeaderBootable(),
          formatters: [(...formatArgs) => this.isEditingMode() && headerFormatText(...formatArgs)],
          props: {
            style: {
              width: '5%',
            },
          },
        },
        cell: {
          formatters: [(...formatArgs) => this.isEditingMode() && inlineEditFormatter(...formatArgs)],
        },
        valueView: null,
        editView: (value, { rowData }) => {
          return <div className={style['disk-bootable-edit']}>
            { !this.isBootableDiskTemplate() &&
              <Checkbox
                aria-label='bootable checkbox'
                checked={this.state.editing[rowData.id].bootable}
                id={`${idPrefix}-bootable`}
                onChange={e => this.handleCellChange(rowData, 'bootable', e.target.checked)}
                title='Bootable flag'
              />
            }
            <FieldLevelHelp
              content={this.bootableInfo(rowData.bootable)}
              inline
              className={style['disk-size-edit-label']}
            />
          </div>
        },
      },

      // size
      {
        header: {
          label: msg.createVmStorageTableHeaderSize(),
          formatters: [headerFormatText],
          props: {
            style: {
              width: '15%',
            },
          },
        },
        cell: {
          formatters: [inlineEditFormatter],
        },
        valueView: (value, { rowData }) => {
          return <React.Fragment>
            { rowData.sized.value } { rowData.sized.unit }
          </React.Fragment>
        },
        editView: (value, { rowData }) => {
          const row = this.state.editing[rowData.id]
          const sizeGiB = row.size / (1024 ** 3)
          const { invalidSizeValue } = row

          return <div className={style['disk-size-edit']}>
            <FormGroup
              validationState={invalidSizeValue && 'error'}
              className={style['form-group-edit']}
            >
              <FormControl
                id={`${idPrefix}-${value}-size-edit`}
                type='number'
                min={this.props.minDiskSizeInGiB}
                max={this.props.maxDiskSizeInGiB}
                step={1}
                value={sizeGiB}
                className={style['disk-size-form-control-edit']}
                onChange={e => this.handleCellChange(rowData, 'size', e.target.value)}
              />
            </FormGroup>
            <span className={style['disk-size-edit-label']}>GiB</span>
            <FieldLevelHelp
              inline
              content={msg.diskEditorSizeCreateHelp()}
            />
          </div>
        },
      },

      // storage domain
      {
        header: {
          label: msg.createVmStorageTableHeaderStorageDomain(),
          formatters: [headerFormatText],
          props: {
            style: {
              width: '25%',
            },
          },
        },
        cell: {
          formatters: [inlineEditFormatter],
        },
        valueView: (value, { rowData }) => {
          const {
            storageDomainId: id,
            storageDomain: sd,
          } = rowData

          // TODO: if the disk's storage domain is not available to the user, highlight it
          // TODO: like a validation error and force editing the SD before allowing the user to move
          // TODO: forward to the next wizard step
          return <React.Fragment>
            { id === '_'
              ? `-- ${msg.createVmStorageSelectStorageDomain()} --`
              : sd.isOk
                ? sd.name
                : msg.createVmStorageUnknownStorageDomain()
            }
          </React.Fragment>
        },
        editView: (value, { rowData }) => {
          const { storageDomains, dataCenterId } = props
          const storageDomainList = createStorageDomainList(storageDomains, dataCenterId, true)
          const row = this.state.editing[rowData.id]

          if (storageDomainList.length > 1 || row.storageDomain === '_') {
            storageDomainList.unshift({ id: '_', value: `-- ${msg.createVmStorageSelectStorageDomain()} --` })
          }

          return (
            <SelectBox
              id={`${idPrefix}-${value}-storage-domain-edit`}
              items={storageDomainList}
              selected={row.storageDomainId}
              onChange={value => this.handleCellChange(rowData, 'storageDomainId', value)}
            />
          )
        },
      },

      // disk type (thin/sparse/cow vs preallocated/raw)
      {
        header: {
          label: msg.createVmStorageTableHeaderType(),
          formatters: [headerFormatText],
          props: {
            style: {
              width: '20%',
            },
          },
        },
        property: 'diskTypeLabel',
        cell: {
          formatters: [inlineEditFormatter],
        },
        editView: (value, { rowData }) => {
          const row = this.state.editing[rowData.id]

          const typeList = createDiskTypeList()
          if (!row.diskType || row.diskType === '_') {
            typeList.unshift({ id: '_', value: `-- ${msg.createVmStorageSelectDiskType()} --` })
          }

          return (
            <SelectBox
              id={`${idPrefix}-${value}-diskType-edit`}
              items={typeList}
              selected={row.diskType || '_'}
              onChange={value => this.handleCellChange(rowData, 'diskType', value)}
            />
          )
        },
      },

      // actions
      {
        header: {
          label: '',
          formatters: [headerFormatText],

          props: {
            style: {
              width: '20px',
            },
          },
        },
        type: 'actions',
        cell: {
          formatters: [
            (value, { rowData, rowIndex }) => {
              const hideKebab = this.state.creating === rowData.id
              const actionsDisabled = !!this.state.creating || this.isEditingMode() || rowData.isFromTemplate
              const templateDefined = rowData.isFromTemplate
              const kebabId = `${idPrefix}-kebab-${rowData.name}`

              return <React.Fragment>
                { hideKebab && <Table.Cell /> }

                { templateDefined &&
                  <Table.Cell className={style['disk-from-template']}>
                    <FieldLevelHelp content={msg.createVmStorageNoEditHelpMessage()} inline />
                  </Table.Cell>
                }

                { !hideKebab && !templateDefined &&
                  <Table.Cell className={style['kebab-menu-cell']}>
                    <DropdownKebab
                      id={kebabId}
                      className={style['action-kebab']}
                      title={msg.createVmStorageEditActions()}
                      pullRight
                    >
                      <MenuItem
                        id={`${kebabId}-edit`}
                        onSelect={() => { this.inlineEditController.onActivate({ rowIndex, rowData }) }}
                        disabled={actionsDisabled}
                      >
                        {msg.edit()}
                      </MenuItem>
                      <MenuItem
                        id={`${kebabId}-delete`}
                        onSelect={() => { this.onDeleteRow(rowData) }}
                        disabled={actionsDisabled}
                      >
                        {msg.delete()}
                      </MenuItem>
                    </DropdownKebab>
                  </Table.Cell>
                }
              </React.Fragment>
            },
          ],
        },
      },
    ]
  }

  // return boolean value to answer if we are editing a Disk or not
  isEditingMode () {
    return Object.keys(this.state.editing).length > 0
  }

  // return true if there's any disk set as bootable and if it's a template disk
  isBootableDiskTemplate () {
    const bootableDisk = this.props.disks.find(disk => disk.bootable)
    const templateDisk = this.props.disks.find(disk => disk.isFromTemplate)

    return bootableDisk && templateDisk && bootableDisk === templateDisk
  }

  // set appropriate tooltip message regarding setting bootable flag
  bootableInfo (isActualDiskBootable) {
    const bootableDisk = this.props.disks.find(disk => disk.bootable)

    if (this.isBootableDiskTemplate()) {
      // template based disk cannot be edited so bootable flag cannot be removed from it
      return msg.createVmStorageNoEditBootableMessage({ diskName: bootableDisk.name })
    } else if (bootableDisk && !isActualDiskBootable) {
      // actual bootable disk isn't template based or the disk which is being edited, moving bootable flag from the bootable disk allowed
      return msg.diskEditorBootableChangeMessage({ diskName: bootableDisk.name })
    }

    // no any bootable disk yet (or the disk which is being edited is bootable but not a template disk), adding/editing bootable flag allowed
    return msg.createVmStorageBootableMessage()
  }

  onCreateDisk () {
    const newId = generateUnique('NEW_')
    const {
      minDiskSizeInGiB: diskInitialSizeInGib,
      storageDomains,
      dataCenterId,
      vmName,
      disks,
      optimizedFor,
    } = this.props

    // If only 1 storage domain is available, select it automatically
    const storageDomainList = createStorageDomainList(storageDomains, dataCenterId)
    const storageDomainId = storageDomainList.length === 1 ? storageDomainList[0].id : '_'

    // Setup a new disk in the editing hash
    this.setState(state => ({
      creating: newId,
      editing: {
        ...state.editing,
        [newId]: {
          id: newId,
          name: suggestDiskName(vmName, disks),

          diskId: '_',
          storageDomainId,

          bootable: false,
          iface: 'virtio_scsi',
          type: 'image',
          diskType: getDefaultDiskType(optimizedFor),

          size: (diskInitialSizeInGib * 1024 ** 3),
        },
      },
    }))
    this.props.onUpdate({ valid: false })
  }

  onEditDisk (rowData) {
    this.setState(state => ({
      editing: {
        ...state.editing,
        [rowData.id]: rowData,
      },
    }))
    this.props.onUpdate({ valid: false })
  }

  onDeleteRow (rowData) {
    this.props.onUpdate({ remove: rowData.id })
  }

  handleCellChange (rowData, field, value) {
    const editingRow = this.state.editing[rowData.id]
    if (field === 'size') {
      if (!isNumber(value)) return

      const { minDiskSizeInGiB, maxDiskSizeInGiB } = this.props
      if (value >= minDiskSizeInGiB && value <= maxDiskSizeInGiB) {
        delete editingRow.invalidSizeValue
      } else {
        editingRow.invalidSizeValue = true
      }
      value = +value * (1024 ** 3) // GiB to B
    }

    if (editingRow) {
      editingRow[field] = value
      this.setState(state => ({
        editing: {
          ...state.editing,
          [rowData.id]: editingRow,
        },
      }))
    }
  }

  // Push the new or editing row up via __onUpdate__
  handleRowConfirmChange (rowData) {
    const actionCreate = !!this.state.creating && this.state.creating === rowData.id
    const editedRow = this.state.editing[rowData.id]

    if (editedRow.invalidSizeValue) return

    // if the edited disk is set bootable, make sure to remove bootable from the other disks
    if (editedRow.bootable) {
      const previousBootableDisk = this.props.disks.find(disk => disk.bootable)
      if (previousBootableDisk) {
        this.props.onUpdate({
          update: { id: previousBootableDisk.id, bootable: false },
        })
      }
    }

    // TODO: Add field level validation for the edit or create fields

    this.props.onUpdate({ [actionCreate ? 'create' : 'update']: editedRow })
    this.handleRowCancelChange(rowData)
  }

  // Cancel the creation or editing of a row by throwing out edit state
  handleRowCancelChange (rowData) {
    this.components = undefined
    this.setState(state => {
      const editing = state.editing
      delete editing[rowData.id]
      return {
        creating: false,
        editing,
      }
    })
    this.props.onUpdate({ valid: true })
  }

  // Create props for each row that will be passed to the row component (TableInlineEditRow)
  rowRenderProps (nicList, rowData, { rowIndex }) {
    const actionButtonsTop =
      rowIndex > 5 &&
      rowIndex === nicList.length - 1

    return {
      role: 'row',

      isEditing: () => this.inlineEditController.isEditing({ rowData }),
      onConfirm: () => this.inlineEditController.onConfirm({ rowData, rowIndex }),
      onCancel: () => this.inlineEditController.onCancel({ rowData, rowIndex }),
      last: actionButtonsTop, // last === if the confirm/cancel buttons should go above the row
    }
  }

  render () {
    const {
      id: idPrefix = 'create-vm-wizard-disks',
      storageDomains,
      disks,
      dataCenterId,
    } = this.props

    const storageDomainList = createStorageDomainList(storageDomains)
    const filteredStorageDomainList = createStorageDomainList(storageDomains, dataCenterId)
    const enableCreate = storageDomainList.length > 0 && !this.isEditingMode()

    const diskList = sortNicsDisks([...disks])
      .concat(this.state.creating ? [ this.state.editing[this.state.creating] ] : [])
      .map(disk => {
        disk = this.state.editing[disk.id] ? this.state.editing[disk.id] : disk // update editing changes from state after sorting
        const sd = storageDomainList.find(sd => sd.id === disk.storageDomainId)
        const isSdOk = sd && filteredStorageDomainList.find(filtered => filtered.id === sd.id) !== undefined

        return {
          ...disk,

          // compose raw disk info to be used for table render data
          sized: convertValue('B', disk.size),
          storageDomain: {
            isOk: isSdOk,
            name: sd && sd.value,
          },
          diskTypeLabel: disk.diskType === 'thin' ? msg.diskEditorDiskTypeOptionThin()
            : disk.diskType === 'pre' ? msg.diskEditorDiskTypeOptionPre()
              : disk.diskType,
        }
      })
    const components = {
      body: {
        row: _TableInlineEditRow, // Table.InlineEditRow,
      },
    }
    this.components = this.components || components // if the table should (re)render the value of this.components should be undefined

    return <div className={style['settings-container']} id={idPrefix}>
      { diskList.length === 0 && <React.Fragment>
        <EmptyState>
          <EmptyState.Icon />
          <EmptyState.Title>{msg.createVmStorageEmptyTitle()}</EmptyState.Title>
          <EmptyState.Info>{msg.createVmStorageEmptyInfo()}</EmptyState.Info>
          <EmptyState.Action>
            <Button bsStyle='primary' bsSize='large' onClick={this.onCreateDisk}>
              {msg.diskActionCreateNew()}
            </Button>
          </EmptyState.Action>
        </EmptyState>
      </React.Fragment> }

      { diskList.length > 0 && <React.Fragment>
        <div className={style['action-buttons']}>
          <Button bsStyle='default' disabled={!enableCreate} onClick={this.onCreateDisk}>
            {msg.diskActionCreateNew()}
          </Button>
        </div>
        <div className={style['disk-table']}>
          <Table.PfProvider
            striped
            bordered
            hover
            dataTable
            inlineEdit
            columns={this.columns}
            components={this.components}
          >
            <Table.Header />
            <Table.Body
              rows={diskList}
              rowKey='id'
              onRow={(...rest) => this.rowRenderProps(diskList, ...rest)}
            />
          </Table.PfProvider>
        </div>
      </React.Fragment> }
    </div>
  }
}

Storage.propTypes = {
  id: PropTypes.string,
  vmName: BASIC_DATA_SHAPE.name.isRequired,
  optimizedFor: BASIC_DATA_SHAPE.optimizedFor,
  disks: PropTypes.arrayOf(PropTypes.shape(STORAGE_SHAPE)).isRequired,

  clusterId: PropTypes.string.isRequired, // eslint-disable-line react/no-unused-prop-types
  dataCenterId: PropTypes.string.isRequired,

  cluster: PropTypes.object.isRequired,
  storageDomains: PropTypes.object.isRequired,
  maxDiskSizeInGiB: PropTypes.number.isRequired,
  minDiskSizeInGiB: PropTypes.number.isRequired,
  onUpdate: PropTypes.func.isRequired,
}

export default connect(
  (state, { dataCenterId, clusterId }) => ({
    cluster: state.clusters.get(clusterId),
    storageDomains: state.storageDomains,
    maxDiskSizeInGiB: 4096, // TODO: 4TiB, no config option pulled as of 2019-Mar-22
    minDiskSizeInGiB: 1,
  })
)(Storage)