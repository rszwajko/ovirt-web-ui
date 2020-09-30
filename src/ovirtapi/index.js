// @flow
import type {
  CdRomType,
  DiskType,
  NicType,
  SnapshotType,
  VmType,
} from './types'

import Selectors from '../selectors'
import AppConfiguration from '../config'

import {
  addHttpListener as transportAddHttpListener,
  assertLogin,
  httpGet,
  httpPost,
  httpPut,
  httpDelete,
} from './transport'

import * as Transforms from './transform'

type VmIdType = { vmId: string }
type PoolIdType = { poolId: string }

const zeroUUID: string = '00000000-0000-0000-0000-000000000000'

const OvirtApi = {
  addHttpListener: transportAddHttpListener,

  //
  //
  // ---- Data transform functions (API -> internal, internal -> API)
  //
  //
  poolToInternal: Transforms.Pool.toInternal,

  diskToInternal: Transforms.DiskAttachment.toInternal,

  nicToInternal: Transforms.Nic.toInternal,

  sessionsToInternal: Transforms.VmSessions.toInternal,

  iconToInternal: Transforms.Icon.toInternal,

  cdRomToInternal: Transforms.CdRom.toInternal,

  SSHKeyToInternal: Transforms.SSHKey.toInternal,

  consolesToInternal: Transforms.VmConsoles.toInternal,

  snapshotToInternal: Transforms.Snapshot.toInternal,

  permissionsToInternal: Transforms.Permissions.toInternal,

  eventToInternal: Transforms.Event.toInternal,

  userToInternal: Transforms.User.toInternal,

  userOptionsToInternal: Transforms.UserOptions.toInternal,

  userOptionsToApi: Transforms.UserOptions.toApi,

  //
  //
  // ---- API interaction functions
  //
  //
  getOvirtApiMeta (): Promise<Object> {
    assertLogin({ methodName: 'getOvirtApiMeta' })
    const url = `${AppConfiguration.applicationContext}/api/`
    return httpGet({ url })
  },
  icon ({ id }: { id: string }): Promise<Object> {
    assertLogin({ methodName: 'icon' })
    return httpGet({ url: `${AppConfiguration.applicationContext}/api/icons/${id}` })
  },
  user ({ userId }: { userId: string }): Promise<Object> {
    assertLogin({ methodName: 'user' })
    return httpGet({ url: `${AppConfiguration.applicationContext}/api/users/${userId}` })
  },
  groups ({ userId }: { userId: string }): Promise<Object> {
    assertLogin({ methodName: 'groups' })
    return httpGet({ url: `${AppConfiguration.applicationContext}/api/users/${userId}/groups` })
  },
  getRoles (): Promise<Object> {
    assertLogin({ methodName: 'getRoles' })
    const url = `${AppConfiguration.applicationContext}/api/roles?follow=permits`
    return httpGet({ url })
  },

  getAllClusters (): Promise<Object> {
    assertLogin({ methodName: 'getAllClusters' })
    const url = `${AppConfiguration.applicationContext}/api/clusters?follow=networks,permissions`
    return httpGet({ url })
  },
  getAllDataCenters ({ additional }: { additional: Array<string> }): Promise<Object> {
    assertLogin({ methodName: 'getAllDataCenters' })
    const url = `${AppConfiguration.applicationContext}/api/datacenters` +
      (additional && additional.length > 0 ? `?follow=${additional.join(',')}` : '')
    return httpGet({ url })
  },
  getAllHosts (): Promise<Object> {
    assertLogin({ methodName: 'getAllHosts' })
    const url = `${AppConfiguration.applicationContext}/api/hosts`
    return httpGet({ url })
  },
  getAllOperatingSystems (): Promise<Object> {
    assertLogin({ methodName: 'getAllOperatingSystems' })
    const url = `${AppConfiguration.applicationContext}/api/operatingsystems`
    return httpGet({ url })
  },
  getAllTemplates (): Promise<Object> {
    assertLogin({ methodName: 'getAllTemplates' })
    const url = `${AppConfiguration.applicationContext}/api/templates?follow=nics,disk_attachments.disk,permissions`
    return httpGet({ url })
  },

  // TODO: Convert to use frontend based role to permission mapping
  getDiskPermissions ({ id }: { id: string }): Promise<Object> {
    assertLogin({ methodName: 'getDiskPermissions' })
    const url = `${AppConfiguration.applicationContext}/api/disks/${id}/permissions?follow=role.permits`
    return httpGet({ url, custHeaders: { Filter: true } })
  },
  // TODO: Convert to use frontend based role to permission mapping
  getVmPermissions ({ vmId }: VmIdType): Promise<Object> {
    assertLogin({ methodName: 'getVmPermissions' })
    const url = `${AppConfiguration.applicationContext}/api/vms/${vmId}/permissions?follow=role.permits`
    return httpGet({ url, custHeaders: { Filter: true } })
  },

  // ---- VM fetching
  getVm ({ vmId, additional }: { vmId: string, additional: Array<string> }): Promise<Object> {
    assertLogin({ methodName: 'getVm' })
    let url = `${AppConfiguration.applicationContext}/api/vms/${vmId}`
    if (additional && additional.length > 0) {
      url += `?follow=${additional.join(',')}`
    }
    return httpGet({ url })
  },
  getVms ({ count, page, additional }: { count?: number, page?: number, additional?: Array<string> }): Promise<Object> {
    assertLogin({ methodName: 'getAllVms' })
    const max = count ? `;max=${count}` : ''
    const params =
      [
        page ? 'search=' + encodeURIComponent(`SORTBY NAME ASC page ${page}`) : '',
        additional && additional.length > 0 ? 'follow=' + encodeURIComponent(`${additional.join(',')}`) : '',
      ]
        .filter(p => !!p)
        .join('&')

    const url = `${AppConfiguration.applicationContext}/api/vms${max}${params ? '?' : ''}${params}`
    return httpGet({ url })
  },

  // ---- VM actions
  addNewVm ({
    vm,
    transformInput = true,
    clone = false,
    clonePermissions,
  }: {
    vm: VmType | Object,
    transformInput: boolean,
    clone: boolean,
    clonePermissions?: boolean
  }): Promise<Object> {
    assertLogin({ methodName: 'addNewVm' })
    const input = JSON.stringify(transformInput ? Transforms.VM.toApi({ vm }) : vm)
    console.log(`OvirtApi.addNewVm(): ${input}`)

    return httpPost({
      url:
        `${AppConfiguration.applicationContext}/api/vms` +
        `?clone=${clone ? 'true' : 'false'}` +
        (clonePermissions === undefined ? '' : `&clone_permissions=${clonePermissions ? 'true' : 'false'}`),
      input,
    })
  },
  editVm ({
    vm, nextRun = false, transformInput = true,
  }: {
    vm: VmType | Object, nextRun: boolean, transformInput: boolean
  }): Promise<Object> {
    assertLogin({ methodName: 'editVm' })
    const input = JSON.stringify(transformInput ? Transforms.VM.toApi({ vm }) : vm)
    console.log(`OvirtApi.editVm(): ${input}`, 'nextRun?', nextRun)

    const suffix = nextRun ? '?next_run=true' : ''

    return httpPut({
      url: `${AppConfiguration.applicationContext}/api/vms/${vm.id}${suffix}`,
      input,
    })
  },
  remove ({ vmId, preserveDisks }: { vmId: string, preserveDisks: boolean }): Promise<Object> {
    assertLogin({ methodName: 'remove' })
    let url = `${AppConfiguration.applicationContext}/api/vms/${vmId}`
    if (preserveDisks) {
      url = url + ';detach_only=true'
    }
    return httpDelete({
      url,
      custHeaders: {
        'Accept': 'application/json',
      },
    })
  },
  shutdown ({ vmId, force }: { vmId: string, force: boolean }): Promise<Object> {
    assertLogin({ methodName: 'shutdown' })
    let restMethod = 'shutdown'
    if (force) {
      restMethod = 'stop'
    }
    return httpPost({
      url: `${AppConfiguration.applicationContext}/api/vms/${vmId}/${restMethod}`,
      input: '{}',
    })
  },
  start ({ vmId }: VmIdType): Promise<Object> {
    assertLogin({ methodName: 'start' })
    return httpPost({
      url: `${AppConfiguration.applicationContext}/api/vms/${vmId}/start`,
      input: '{}' })
  },
  suspend ({ vmId }: VmIdType): Promise<Object> {
    assertLogin({ methodName: 'suspend' })
    return httpPost({
      url: `${AppConfiguration.applicationContext}/api/vms/${vmId}/suspend`,
      input: '{}',
    })
  },
  restart ({ vmId }: VmIdType): Promise<Object> { // 'force' is not exposed by oVirt API
    assertLogin({ methodName: 'restart' })
    return httpPost({
      url: `${AppConfiguration.applicationContext}/api/vms/${vmId}/reboot`,
      input: '{}',
    })
  },

  // ---- Snapshots
  addNewSnapshot ({ vmId, snapshot }: { vmId: string, snapshot: SnapshotType }): Promise<Object> {
    assertLogin({ methodName: 'addNewSnapshot' })
    const input = JSON.stringify(Transforms.Snapshot.toApi({ snapshot }))
    console.log(`OvirtApi.addNewSnapshot(): ${input}`)
    return httpPost({
      url: `${AppConfiguration.applicationContext}/api/vms/${vmId}/snapshots`,
      input,
    })
  },
  deleteSnapshot ({ snapshotId, vmId }: { snapshotId: string, vmId: string }): Promise<Object> {
    assertLogin({ methodName: 'deleteSnapshot' })
    return httpDelete({
      url: `${AppConfiguration.applicationContext}/api/vms/${vmId}/snapshots/${snapshotId}?async=true`,
    })
  },
  restoreSnapshot ({ snapshotId, vmId }: { snapshotId: string, vmId: string }): Promise<Object> {
    assertLogin({ methodName: 'restoreSnapshot' })
    return httpPost({
      url: `${AppConfiguration.applicationContext}/api/vms/${vmId}/snapshots/${snapshotId}/restore`,
      input: '<action />',
      contentType: 'application/xml',
    })
  },
  snapshotDisks ({ vmId, snapshotId }: { vmId: string, snapshotId: string }): Promise<Object> {
    assertLogin({ methodName: 'snapshotDisks' })
    return httpGet({ url: `${AppConfiguration.applicationContext}/api/vms/${vmId}/snapshots/${snapshotId}/disks` })
  },
  snapshotNics ({ vmId, snapshotId }: { vmId: string, snapshotId: string }): Promise<Object> {
    assertLogin({ methodName: 'snapshotNics' })
    return httpGet({ url: `${AppConfiguration.applicationContext}/api/vms/${vmId}/snapshots/${snapshotId}/nics` })
  },
  snapshot ({ vmId, snapshotId }: { vmId: string, snapshotId: string }): Promise<Object> {
    assertLogin({ methodName: 'snapshot' })
    return httpGet({ url: `${AppConfiguration.applicationContext}/api/vms/${vmId}/snapshots/${snapshotId}` })
  },
  snapshots ({ vmId }: { vmId: string }): Promise<Object> {
    assertLogin({ methodName: 'snapshots' })
    return httpGet({ url: `${AppConfiguration.applicationContext}/api/vms/${vmId}/snapshots` })
  },

  diskattachment ({ vmId, attachmentId }: { vmId: string, attachmentId: string}): Promise<Object> {
    assertLogin({ methodName: 'diskattachment' })
    return httpGet({ url: `${AppConfiguration.applicationContext}/api/vms/${vmId}/diskattachments/${attachmentId}?follow=disk` })
  },
  diskattachments ({ vmId }: VmIdType): Promise<Object> {
    assertLogin({ methodName: 'diskattachments' })
    return httpGet({ url: `${AppConfiguration.applicationContext}/api/vms/${vmId}/diskattachments` })
  },
  disk ({ diskId }: { diskId: string }): Promise<Object> {
    assertLogin({ methodName: 'disk' })
    return httpGet({ url: `${AppConfiguration.applicationContext}/api/disks/${diskId}` })
  },

  consoles ({ vmId }: VmIdType): Promise<Object> {
    assertLogin({ methodName: 'consoles' })
    return httpGet({ url: `${AppConfiguration.applicationContext}/api/vms/${vmId}/graphicsconsoles` })
  },
  console ({ vmId, consoleId }: { vmId: string, consoleId: string }): Promise<Object> {
    assertLogin({ methodName: 'console' })
    return httpGet({
      url: `${AppConfiguration.applicationContext}/api/vms/${vmId}/graphicsconsoles/${consoleId}`,
      custHeaders: { Accept: 'application/x-virt-viewer', Filter: Selectors.getFilter() } })
  },

  consoleProxyTicket ({ vmId, consoleId }: { vmId: string, consoleId: string }): Promise<Object> {
    assertLogin({ methodName: 'consoleProxyTicket' })
    const input = JSON.stringify({ async: false })
    return httpPost({
      url: `${AppConfiguration.applicationContext}/api/vms/${vmId}/graphicsconsoles/${consoleId}/proxyticket`,
      input,
    })
  },

  consoleTicket ({ vmId, consoleId }: {vmId: string, consoleId: string}): Promise<Object> {
    assertLogin({ methodName: 'consoleTicket' })
    const input = JSON.stringify({ async: false })
    return httpPost({
      url: `${AppConfiguration.applicationContext}/api/vms/${vmId}/graphicsconsoles/${consoleId}/ticket`,
      input,
    })
  },

  vmLogon ({ vmId }: { vmId: string }): Promise<Object> {
    assertLogin({ methodName: 'vmLogon' })
    return httpPost({
      url: `${AppConfiguration.applicationContext}/api/vms/${vmId}/logon`,
      input: JSON.stringify({}),
    })
  },

  events (): Promise<Object> {
    assertLogin({ methodName: 'events' })
    return httpGet({ url: `${AppConfiguration.applicationContext}/api/events?search=severity%3Derror` })
  },
  dismissEvent ({ eventId }: { eventId: string }): Promise<Object> {
    assertLogin({ methodName: 'dismissEvent' })
    return httpDelete({ url: `${AppConfiguration.applicationContext}/api/events/${eventId}` })
  },

  checkFilter (): Promise<Object> {
    assertLogin({ methodName: 'checkFilter' })
    return httpGet({
      url: `${AppConfiguration.applicationContext}/api/permissions`,
      custHeaders: {
        Filter: false,
        Accept: 'application/json',
      },
    })
  },

  getPool ({ poolId }: PoolIdType): Promise<Object> {
    assertLogin({ methodName: 'getPool' })
    const url = `${AppConfiguration.applicationContext}/api/vmpools/${poolId}`
    return httpGet({ url })
  },
  getPools ({ count, page, additional }: { count?: number, page?: number, additional?: Array<string> }): Promise<Object> {
    assertLogin({ methodName: 'getPools' })
    const max = count ? `;max=${count}` : ''
    const params =
      [
        page ? 'search=' + encodeURIComponent(`SORTBY NAME ASC page ${page}`) : '',
        additional && additional.length > 0 ? 'follow=' + encodeURIComponent(`${additional.join(',')}`) : '',
      ]
        .filter(p => !!p)
        .join('&')

    const url = `${AppConfiguration.applicationContext}/api/vmpools${max}${params ? '?' : ''}${params}`
    return httpGet({ url })
  },
  startPool ({ poolId }: PoolIdType): Promise<Object> {
    assertLogin({ methodName: 'startPool' })
    return httpPost({
      url: `${AppConfiguration.applicationContext}/api/vmpools/${poolId}/allocatevm`,
      input: '<action />',
      contentType: 'application/xml',
    })
  },

  sessions ({ vmId }: VmIdType): Promise<Object> {
    assertLogin({ methodName: 'sessions' })
    return httpGet({ url: `${AppConfiguration.applicationContext}/api/vms/${vmId}/sessions` })
  },

  getStorages (): Promise<Object> {
    assertLogin({ methodName: 'getStorages' })
    return httpGet({ url: `${AppConfiguration.applicationContext}/api/storagedomains?follow=permissions` })
  },
  getStorageFiles ({ storageId }: { storageId: string }): Promise<Object> {
    assertLogin({ methodName: 'getStorageFiles' })
    return httpGet({ url: `${AppConfiguration.applicationContext}/api/storagedomains/${storageId}/files` })
  },
  getIsoImages (): Promise<Object> {
    assertLogin({ methodName: 'getIsoImages' })
    const search = 'disk_type=image and disk_content_type=iso'
    return httpGet({
      url: `${AppConfiguration.applicationContext}/api/disks?search=${encodeURIComponent(search)}`,
    })
  },

  getCdRom ({ vmId, current = true }: { vmId: string, current?: boolean }): Promise<Object> {
    assertLogin({ methodName: 'getCdRom' })
    return httpGet({ url: `${AppConfiguration.applicationContext}/api/vms/${vmId}/cdroms/${zeroUUID}?current=${current ? 'true' : 'false'}` })
  },
  changeCdRom ({ cdrom, vmId, current = true }: { cdrom: CdRomType, vmId: string, current?: boolean }): Promise<Object> {
    assertLogin({ methodName: 'changeCdRom' })
    const input = JSON.stringify(Transforms.CdRom.toApi({ cdrom }))
    console.log(`OvirtApi.changeCdRom(): ${input}`)
    return httpPut({
      url: `${AppConfiguration.applicationContext}/api/vms/${vmId}/cdroms/${zeroUUID}?current=${current ? 'true' : 'false'}`,
      input,
    })
  },

  addNicToVm ({ nic, vmId }: { nic: NicType, vmId: string }): Promise<Object> {
    assertLogin({ methodName: 'addNicToVm' })
    const input = JSON.stringify(Transforms.Nic.toApi({ nic }))
    return httpPost({
      url: `${AppConfiguration.applicationContext}/api/vms/${vmId}/nics`,
      input,
    })
  },
  deleteNicFromVm ({ nicId, vmId }: { nicId: string, vmId: string }): Promise<Object> {
    assertLogin({ methodName: 'deleteNicFromVm' })
    return httpDelete({
      url: `${AppConfiguration.applicationContext}/api/vms/${vmId}/nics/${nicId}`,
    })
  },
  editNicInVm ({ nic, vmId }: { nic: NicType, vmId: string }): Promise<Object> {
    assertLogin({ methodName: 'editNicInVm' })
    const input = JSON.stringify(Transforms.Nic.toApi({ nic }))
    return httpPut({
      url: `${AppConfiguration.applicationContext}/api/vms/${vmId}/nics/${nic.id}`,
      input,
    })
  },

  getUSBFilter (): Promise<Object> {
    assertLogin({ methodName: 'getUSBFilter' })
    return httpGet({
      url: `${AppConfiguration.applicationContext}/services/files/usbfilter.txt`,
      custHeaders: {
        'Accept': 'text/plain',
      },
    })
  },

  // async operation
  removeDisk (diskId: string): Promise<Object> {
    assertLogin({ methodName: 'removeDisk' })
    const url = `${AppConfiguration.applicationContext}/api/disks/${diskId}?async=true`
    return httpDelete({ url })
  },

  // async operation
  addDiskAttachment ({ vmId, disk }: { vmId: string, disk: DiskType }): Promise<Object> {
    assertLogin({ methodName: 'addDiskAttachment' })

    const payload = Transforms.DiskAttachment.toApi({ disk })
    const input = JSON.stringify(payload)

    return httpPost({
      url: `${AppConfiguration.applicationContext}/api/vms/${vmId}/diskattachments`,
      input,
    })
  },

  // disk update is async
  // http://ovirt.github.io/ovirt-engine-api-model/master/#services/disk/methods/update
  // http://ovirt.github.io/ovirt-engine-api-model/master/#services/disk_attachment/methods/update
  updateDiskAttachment ({ vmId, disk, attachmentOnly = false }: { vmId: string, disk: DiskType, attachmentOnly: boolean }): Promise<Object> {
    assertLogin({ methodName: 'updateDiskAttachment' })

    const attachmentId = disk.attachmentId
    if (!attachmentId) {
      throw new Error('DiskType.attachmentId is required to update the disk')
    }

    const payload = Transforms.DiskAttachment.toApi({ disk, attachmentOnly })
    const input = JSON.stringify(payload)

    return httpPut({
      url: `${AppConfiguration.applicationContext}/api/vms/${vmId}/diskattachments/${attachmentId}`,
      input,
    })
  },

  saveSSHKey ({ key, userId, sshId }: { key: string, userId: string, sshId: ?string }): Promise<Object> {
    assertLogin({ methodName: 'saveSSHKey' })
    const input = JSON.stringify({ content: key })
    if (sshId !== undefined && sshId !== null) {
      /**
       * This will work if an entry in user_profile table exists.
       * Note that (as of today):
       * 1. ANY valid GUID will work i.e. '00000000-0000-0000-0000-000000000000'
       * 2. each update re-generates ssh key id
       * 3. there can be only one key (as it's stored in user_profile entry)
       */
      return httpPut({
        url: `${AppConfiguration.applicationContext}/api/users/${userId}/sshpublickeys/${sshId}`,
        input,
      })
    } else {
      /**
       * This will work if:
       * 1. there is no entry in user_profile table OR
       * 2. previously used key was wiped out (set to empty string)
       * Otherwise it will fail with 400 and message
       * [Cannot add User Profile. User profile already created.]
       */
      return httpPost({
        url: `${AppConfiguration.applicationContext}/api/users/${userId}/sshpublickeys`,
        input,
      })
    }
  },

  getSSHKey ({ userId }: { userId: string }): Promise<Object> {
    assertLogin({ methodName: 'getSSHKey' })
    return httpGet({ url: `${AppConfiguration.applicationContext}/api/users/${userId}/sshpublickeys` })
  },

  saveUserOptionsOnBackend ({ options, userId }: Object): Promise<Object> {
    assertLogin({ methodName: 'saveUserOptionsOnBackend' })
    const input = JSON.stringify(options)
    return httpPut({
      url: `${AppConfiguration.applicationContext}/api/users/${userId}`,
      input,
    })
  },

  /**
   * @return {Promise.<?string>} promise of option value if options exists, promise of null otherwise.
   *                             If default value is provided, the method never returns rejected promise and the default
   *                             value is returned in case of missing option or any error.
   */
  getOption ({ optionName, version, defaultValue }: {optionName: string, version: string, defaultValue?: string}): Promise<?string> {
    const rawPromise = getOptionWithoutDefault(optionName, version)

    if (!defaultValue) {
      return rawPromise
    }

    return rawPromise
      .then(result => result === null ? defaultValue : result)
      .catch(() => defaultValue)
  },

  getAllVnicProfiles (): Promise<Object> {
    assertLogin({ methodName: 'getVnicProfiles' })
    return httpGet({ url: `${AppConfiguration.applicationContext}/api/vnicprofiles?follow=network,permissions` })
  },

  getVmNic ({ vmId }: { vmId: string }): Promise<Object> {
    assertLogin({ methodName: 'getVmNic' })
    return httpGet({ url: `${AppConfiguration.applicationContext}/api/vms/${vmId}/nics` })
  },
  getAllNetworks (): Promise<Object> {
    assertLogin({ methodName: 'getNetworks' })
    return httpGet({ url: `${AppConfiguration.applicationContext}/api/networks` })
  },
}

/**
 * @param {string} optionName
 * @param {'general' | '4.2' | '4.1' | '4.0'} version
 * @return {Promise.<?string>} promise of option value if options exists, promise of null otherwise.
 */
function getOptionWithoutDefault (optionName: string, version: string): Promise<?string> {
  assertLogin({ methodName: 'getOption' })
  return httpGet({
    url: `${AppConfiguration.applicationContext}/api/options/${optionName}`,
    custHeaders: {
      Accept: 'application/json',
      Filter: true,
    },
  })
    .then(response => {
      let result
      try {
        result = response.values.system_option_value
          .filter((valueAndVersion) => valueAndVersion.version === version)
          .map(valueAndVersion => valueAndVersion.value)[0]
      } catch (error) {
        if (error instanceof TypeError) {
          console.log(`Response to getting option '${optionName}' has unexpected format:`, response)
        }
        throw error
      }
      if (result === undefined) {
        console.log(`Config option '${optionName}' was not found for version '${version}'.`)
        return null
      }
      return result
    }, error => {
      if (error.status === 404) {
        console.log(`Config option '${optionName}' doesn't exist in any version.`)
        return null
      }
      throw error
    })
}

// export default new Proxy(OvirtApi, {
//   get (target: Object, prop: string, receiver: Object): any {
//     if (typeof target[prop] === 'function') {
//       console.info(`getting OvirtApi.${prop}`)
//     }
//     return Reflect.get(...arguments)
//   },
// })
export default OvirtApi
export {
  Transforms,
}
