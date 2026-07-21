/**
 * Transport module — mirrors Angular `apps/transport/`.
 */

import type {
  DistanceFee,
  Driver,
  Helper,
  RouteStop,
  TransportAllocation,
  TransportAllocationFor,
  TransportDetail,
  TransportDetailPayload,
  TransportRoute,
  VehicleDetail,
  VehicleDriver,
  VehicleRoute,
} from '@/types/transport'
import { ENTITIES } from '@/config/constants/entities'
import { TRANSPORT_API } from '@/config/constants/api'
import {
  angularLowerActiveReason,
  asNullableNumber,
  asString,
} from './angular-payload'
import { domainCreate, domainList, domainUpdate, getAllRecords, postDetails } from './crud'
import { buildQuery } from './query'

// ─── Transport details ───────────────────────────────────────────────────────

type TransportDetailRow = TransportDetail & Record<string, unknown>

function asFiniteId(value: unknown, fallback?: unknown): number {
  const num = Number(value ?? fallback)
  return Number.isFinite(num) ? num : 0
}

function pickNestedId(
  row: Record<string, unknown>,
  flatKey: string,
  nestedKeys: string[],
  nestedIdKey: string,
): number {
  for (const key of nestedKeys) {
    const nested = row[key] as Record<string, unknown> | undefined
    if (nested?.[nestedIdKey] != null) {
      return asFiniteId(nested[nestedIdKey])
    }
  }
  return asFiniteId(row[flatKey])
}

/** Angular `listDetailsByTwoIds(..., 'true', id, 'isActive', 'TransportDetail.transportDetailId')`. */
function buildTransportDetailActiveQuery(transportDetailId: number): string {
  return buildQuery({
    isActive: true,
    'TransportDetail.transportDetailId': transportDetailId,
  })
}

/** Flatten nested Organization / Campus / College FKs Spring returns on list. */
function normalizeTransportDetail(row: TransportDetail): TransportDetail {
  const r = row as TransportDetailRow
  const organization = (r.organization ?? r.Organization) as
    | { organizationId?: number; orgCode?: string; orgName?: string }
    | undefined
  const campus = (r.campus ?? r.Campus) as
    | { campusId?: number; campusCode?: string; campusName?: string }
    | undefined
  const college = (r.college ?? r.College) as
    | { collegeId?: number; collegeCode?: string; collegeName?: string }
    | undefined

  return {
    ...row,
    organizationId:
      pickNestedId(r, 'organizationId', ['organization', 'Organization'], 'organizationId') ||
      row.organizationId,
    campusId:
      pickNestedId(r, 'campusId', ['campus', 'Campus'], 'campusId') || row.campusId,
    collegeId:
      pickNestedId(r, 'collegeId', ['college', 'College'], 'collegeId') || row.collegeId,
    orgCode: row.orgCode ?? organization?.orgCode,
    orgName: row.orgName ?? organization?.orgName,
    campusCode: row.campusCode ?? campus?.campusCode,
    campusName: row.campusName ?? campus?.campusName,
    collegeCode: row.collegeCode ?? college?.collegeCode,
    collegeName: row.collegeName ?? college?.collegeName,
  }
}

/**
 * Angular TransportDetail create/update body — PK + flat IDs + nested FKs.
 * Spring returns success:false ("Unable to process…") when update omits the PK
 * or sends only raw form fields without nested Organization/Campus/College.
 */
function buildTransportDetailPayload(
  data: Partial<TransportDetailPayload>,
  transportDetailId?: number,
): Record<string, unknown> {
  const organizationId = asFiniteId(data.organizationId)
  const campusId = asFiniteId(data.campusId)
  const collegeId = asFiniteId(data.collegeId)
  const isActive = data.isActive !== false

  const payload: Record<string, unknown> = {
    organizationId,
    campusId,
    collegeId,
    organization: { organizationId },
    campus: { campusId },
    college: { collegeId },
    transportName: asString(data.transportName).trim(),
    isActive,
    reason: angularLowerActiveReason(isActive, data.reason),
  }

  if (transportDetailId != null) {
    payload.transportDetailId = transportDetailId
  }

  return payload
}

export async function listTransportDetails(): Promise<TransportDetail[]> {
  const rows = await domainList<TransportDetail>(ENTITIES.TRANSPORT_DETAIL.name)
  return rows.map(normalizeTransportDetail)
}

export async function listTransportDetailsByOrganization(
  organizationId: number,
): Promise<TransportDetail[]> {
  const rows = await domainList<TransportDetail>(
    ENTITIES.TRANSPORT_DETAIL.name,
    buildQuery({ isActive: true, 'Organization.organizationId': organizationId }),
  )
  return rows.map(normalizeTransportDetail)
}

export async function createTransportDetail(data: TransportDetailPayload): Promise<TransportDetail> {
  return domainCreate<TransportDetail>(
    ENTITIES.TRANSPORT_DETAIL.name,
    buildTransportDetailPayload(data),
  )
}

export async function updateTransportDetail(
  transportDetailId: number,
  data: Partial<TransportDetailPayload>,
): Promise<TransportDetail> {
  return domainUpdate<TransportDetail>(
    ENTITIES.TRANSPORT_DETAIL.name,
    ENTITIES.TRANSPORT_DETAIL.pk,
    transportDetailId,
    buildTransportDetailPayload(data, transportDetailId),
  )
}

// ─── Vehicles ────────────────────────────────────────────────────────────────

type VehicleDetailRow = VehicleDetail & Record<string, unknown>

/** Flatten nested Organization / TransportDetail / GeneralDetail FKs Spring returns on list. */
function normalizeVehicleDetail(row: VehicleDetail): VehicleDetail {
  const r = row as VehicleDetailRow
  return {
    ...row,
    organizationId:
      pickNestedId(r, 'organizationId', ['organization', 'Organization'], 'organizationId') ||
      row.organizationId,
    transportDetailId:
      pickNestedId(
        r,
        'transportDetailId',
        ['transportDetail', 'TransportDetail'],
        'transportDetailId',
      ) || row.transportDetailId,
    generalDetailId:
      pickNestedId(r, 'generalDetailId', ['generalDetail', 'GeneralDetail'], 'generalDetailId') ||
      row.generalDetailId,
  }
}

/**
 * Angular VehicleDetail create/update body — PK on update + flat IDs + nested FKs.
 * Spring returns success:false ("Unable to process…") when update omits vehicleDetailId
 * or sends NaN / invalid FK shapes from raw form coercion.
 */
function buildVehicleDetailPayload(
  data: Partial<VehicleDetail>,
  vehicleDetailId?: number,
): Record<string, unknown> {
  const organizationId = asFiniteId(data.organizationId)
  const transportDetailId = asNullableNumber(data.transportDetailId)
  const generalDetailId = asNullableNumber(data.generalDetailId)
  const isActive = data.isActive !== false

  const payload: Record<string, unknown> = {
    organizationId,
    organization: { organizationId },
    vehicleName: asString(data.vehicleName).trim(),
    vehicleNumber: asString(data.vehicleNumber).trim(),
    vehicleModel: asString(data.vehicleModel),
    vehicleMaker: asString(data.vehicleMaker),
    trackId: asString(data.trackId),
    speedometerReading: asNullableNumber(data.speedometerReading),
    roadTaxAmount: asNullableNumber(data.roadTaxAmount),
    registrationDate: data.registrationDate ?? null,
    registrationAuthority: asString(data.registrationAuthority),
    rcNumber: asString(data.rcNumber),
    pollutionCheckRenewalDate: data.pollutionCheckRenewalDate ?? null,
    noOfSeats: asNullableNumber(data.noOfSeats),
    nextServiceDate: data.nextServiceDate ?? null,
    maximumAllowed: asNullableNumber(data.maximumAllowed),
    insuranceRenewalDate: data.insuranceRenewalDate ?? null,
    insuranceProvider: asString(data.insuranceProvider),
    engineNo: asString(data.engineNo),
    currentAddress: asString(data.currentAddress),
    contactPersonName: asString(data.contactPersonName),
    chasisNo: asString(data.chasisNo),
    availableSeats: asNullableNumber(data.availableSeats),
    yearOfManufacture: data.yearOfManufacture ?? null,
    isActive,
    reason: angularLowerActiveReason(isActive, data.reason),
  }

  if (transportDetailId != null && transportDetailId > 0) {
    payload.transportDetailId = transportDetailId
    payload.transportDetail = { transportDetailId }
  }

  if (generalDetailId != null && generalDetailId > 0) {
    payload.generalDetailId = generalDetailId
    payload.generalDetail = { generalDetailId }
  }

  if (vehicleDetailId != null) {
    payload.vehicleDetailId = vehicleDetailId
  }

  return payload
}

export async function listVehicles(): Promise<VehicleDetail[]> {
  const rows = await domainList<VehicleDetail>(ENTITIES.VEHICLE_DETAIL.name)
  return rows.map(normalizeVehicleDetail)
}

export async function listVehiclesByTransportDetail(
  transportDetailId: number,
): Promise<VehicleDetail[]> {
  const rows = await domainList<VehicleDetail>(
    ENTITIES.VEHICLE_DETAIL.name,
    buildTransportDetailActiveQuery(transportDetailId),
  )
  return rows.map(normalizeVehicleDetail)
}

export async function createVehicle(data: Partial<VehicleDetail>): Promise<VehicleDetail> {
  return domainCreate<VehicleDetail>(
    ENTITIES.VEHICLE_DETAIL.name,
    buildVehicleDetailPayload(data),
  )
}

export async function updateVehicle(
  vehicleDetailId: number,
  data: Partial<VehicleDetail>,
): Promise<VehicleDetail> {
  return domainUpdate<VehicleDetail>(
    ENTITIES.VEHICLE_DETAIL.name,
    ENTITIES.VEHICLE_DETAIL.pk,
    vehicleDetailId,
    buildVehicleDetailPayload(data, vehicleDetailId),
  )
}

// ─── Drivers ─────────────────────────────────────────────────────────────────

type DriverRow = Driver & Record<string, unknown>

/** Flatten nested Organization / TransportDetail FKs Spring returns on list. */
function normalizeDriver(row: Driver): Driver {
  const r = row as DriverRow
  return {
    ...row,
    organizationId:
      pickNestedId(r, 'organizationId', ['organization', 'Organization'], 'organizationId') ||
      row.organizationId,
    transportDetailId:
      pickNestedId(
        r,
        'transportDetailId',
        ['transportDetail', 'TransportDetail'],
        'transportDetailId',
      ) || row.transportDetailId,
  }
}

/**
 * Angular Driver create/update body — PK on update + flat IDs + nested FKs.
 * Spring returns success:false ("Unable to process…") when update omits driverId
 * or sends NaN / invalid FK shapes from raw form coercion.
 */
function buildDriverPayload(data: Partial<Driver>, driverId?: number): Record<string, unknown> {
  const organizationId = asFiniteId(data.organizationId)
  const transportDetailId = asNullableNumber(data.transportDetailId)
  const genderId = asNullableNumber(data.genderId)
  const bloodgroupId = asNullableNumber(data.bloodgroupId)
  const maritalStatusId = asNullableNumber(data.maritalStatusId)
  const isActive = data.isActive !== false

  const payload: Record<string, unknown> = {
    organizationId,
    organization: { organizationId },
    driverName: asString(data.driverName).trim(),
    mobileNumber: asString(data.mobileNumber).trim(),
    phone: asString(data.phone),
    emailId: asString(data.emailId).trim() || null,
    licenseNumber: asString(data.licenseNumber),
    licenseValidUpto: data.licenseValidUpto ?? null,
    dateOfBirth: data.dateOfBirth ?? null,
    dateOfJoining: data.dateOfJoining ?? null,
    experience: asString(data.experience),
    presentAddress: asString(data.presentAddress),
    permanentAddress: asString(data.permanentAddress),
    photoPath: asString(data.photoPath),
    drivingLicencePath: asString(data.drivingLicencePath),
    isActive,
    reason: angularLowerActiveReason(isActive, data.reason),
  }

  if (transportDetailId != null && transportDetailId > 0) {
    payload.transportDetailId = transportDetailId
    payload.transportDetail = { transportDetailId }
  }

  if (genderId != null && genderId > 0) {
    payload.genderId = genderId
  }

  if (bloodgroupId != null && bloodgroupId > 0) {
    payload.bloodgroupId = bloodgroupId
  }

  if (maritalStatusId != null && maritalStatusId > 0) {
    payload.maritalStatusId = maritalStatusId
  }

  if (driverId != null) {
    payload.driverId = driverId
  }

  return payload
}

export async function listDrivers(): Promise<Driver[]> {
  const rows = await domainList<Driver>(ENTITIES.DRIVER.name)
  return rows.map(normalizeDriver)
}

export async function listDriversByTransportDetail(transportDetailId: number): Promise<Driver[]> {
  const rows = await domainList<Driver>(
    ENTITIES.DRIVER.name,
    buildTransportDetailActiveQuery(transportDetailId),
  )
  return rows.map(normalizeDriver)
}

export async function createDriver(data: Partial<Driver>): Promise<Driver> {
  return domainCreate<Driver>(ENTITIES.DRIVER.name, buildDriverPayload(data))
}

export async function updateDriver(driverId: number, data: Partial<Driver>): Promise<Driver> {
  return domainUpdate<Driver>(
    ENTITIES.DRIVER.name,
    ENTITIES.DRIVER.pk,
    driverId,
    buildDriverPayload(data, driverId),
  )
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

type HelperRow = Helper & Record<string, unknown>

/** Flatten nested Organization / TransportDetail FKs Spring returns on list. */
function normalizeHelper(row: Helper): Helper {
  const r = row as HelperRow
  return {
    ...row,
    organizationId:
      pickNestedId(r, 'organizationId', ['organization', 'Organization'], 'organizationId') ||
      row.organizationId,
    transportDetailId:
      pickNestedId(
        r,
        'transportDetailId',
        ['transportDetail', 'TransportDetail'],
        'transportDetailId',
      ) || row.transportDetailId,
  }
}

/**
 * Angular Helper create/update body — PK on update + flat IDs + nested FKs.
 * Spring returns success:false ("Unable to process…") when update omits helperId
 * or sends NaN / invalid FK shapes from raw form coercion.
 */
function buildHelperPayload(data: Partial<Helper>, helperId?: number): Record<string, unknown> {
  const organizationId = asFiniteId(data.organizationId)
  const transportDetailId = asNullableNumber(data.transportDetailId)
  const genderId = asNullableNumber(data.genderId)
  const bloodgroupId = asNullableNumber(data.bloodgroupId)
  const maritalStatusId = asNullableNumber(data.maritalStatusId)
  const isActive = data.isActive !== false

  const payload: Record<string, unknown> = {
    organizationId,
    organization: { organizationId },
    helperName: asString(data.helperName).trim(),
    mobileNumber: asString(data.mobileNumber).trim(),
    phone: asString(data.phone),
    emailId: asString(data.emailId).trim() || null,
    dateOfBirth: data.dateOfBirth ?? null,
    dateOfJoining: data.dateOfJoining ?? null,
    experience: asString(data.experience),
    presentAddress: asString(data.presentAddress),
    permanentAddress: asString(data.permanentAddress),
    photoPath: asString(data.photoPath),
    isActive,
    reason: angularLowerActiveReason(isActive, data.reason),
  }

  if (transportDetailId != null && transportDetailId > 0) {
    payload.transportDetailId = transportDetailId
    payload.transportDetail = { transportDetailId }
  }

  if (genderId != null && genderId > 0) {
    payload.genderId = genderId
  }

  if (bloodgroupId != null && bloodgroupId > 0) {
    payload.bloodgroupId = bloodgroupId
  }

  if (maritalStatusId != null && maritalStatusId > 0) {
    payload.maritalStatusId = maritalStatusId
  }

  if (helperId != null) {
    payload.helperId = helperId
  }

  return payload
}

export async function listHelpers(): Promise<Helper[]> {
  const rows = await domainList<Helper>(ENTITIES.HELPER.name)
  return rows.map(normalizeHelper)
}

export async function listHelpersByTransportDetail(transportDetailId: number): Promise<Helper[]> {
  const rows = await domainList<Helper>(
    ENTITIES.HELPER.name,
    buildTransportDetailActiveQuery(transportDetailId),
  )
  return rows.map(normalizeHelper)
}

export async function createHelper(data: Partial<Helper>): Promise<Helper> {
  return domainCreate<Helper>(ENTITIES.HELPER.name, buildHelperPayload(data))
}

export async function updateHelper(helperId: number, data: Partial<Helper>): Promise<Helper> {
  return domainUpdate<Helper>(
    ENTITIES.HELPER.name,
    ENTITIES.HELPER.pk,
    helperId,
    buildHelperPayload(data, helperId),
  )
}

// ─── Routes ──────────────────────────────────────────────────────────────────

type TransportRouteRow = TransportRoute & Record<string, unknown>

/** Flatten nested Organization / TransportDetail FKs Spring returns on list. */
function normalizeTransportRoute(row: TransportRoute): TransportRoute {
  const r = row as TransportRouteRow
  return {
    ...row,
    organizationId:
      pickNestedId(r, 'organizationId', ['organization', 'Organization'], 'organizationId') ||
      row.organizationId,
    transportDetailId:
      pickNestedId(
        r,
        'transportDetailId',
        ['transportDetail', 'TransportDetail'],
        'transportDetailId',
      ) || row.transportDetailId,
  }
}

/**
 * Angular Route create/update body — PK on update + flat IDs + nested FKs.
 * Spring returns success:false ("Unable to process…") when update omits routeId
 * or sends only raw form fields without nested Organization/TransportDetail.
 */
function buildRoutePayload(
  data: Partial<TransportRoute>,
  routeId?: number,
): Record<string, unknown> {
  const organizationId = asFiniteId(data.organizationId)
  const transportDetailId = asNullableNumber(data.transportDetailId)
  const isActive = data.isActive !== false

  const payload: Record<string, unknown> = {
    organizationId,
    organization: { organizationId },
    serviceNumber: asString(data.serviceNumber).trim(),
    routeCode: asString(data.routeCode),
    routePickupPlace: asString(data.routePickupPlace),
    routeDropPlace: asString(data.routeDropPlace),
    isActive,
    reason: angularLowerActiveReason(isActive, data.reason),
  }

  if (transportDetailId != null && transportDetailId > 0) {
    payload.transportDetailId = transportDetailId
    payload.transportDetail = { transportDetailId }
  }

  if (routeId != null) {
    payload.routeId = routeId
  }

  return payload
}

/** Merge latest RouteStop rows into Route list rows (Angular nested routeStops parity). */
function mergeStopsIntoRoutes(
  routes: TransportRoute[],
  stopRows: RouteStop[],
): TransportRoute[] {
  const byRouteId = new Map<number, RouteStop[]>()
  for (const raw of stopRows) {
    const r = raw as RouteStop & Record<string, unknown>
    const routeId =
      pickNestedId(r, 'routeId', ['route', 'Route'], 'routeId') || raw.routeId
    if (routeId == null) continue
    const bucket = byRouteId.get(routeId) ?? []
    bucket.push(raw)
    byRouteId.set(routeId, bucket)
  }
  return routes.map((route) => {
    if (route.routeId == null) return route
    const merged = byRouteId.get(route.routeId)
    return merged?.length ? { ...route, routeStops: merged } : route
  })
}

export async function listRoutes(): Promise<TransportRoute[]> {
  const rows = await domainList<TransportRoute>(
    ENTITIES.ROUTE.name,
    buildQuery({}, { field: 'createdDt', direction: 'DESC' }),
  )
  const routes = rows.map(normalizeTransportRoute)
  try {
    const stopRows = await domainList<RouteStop>(ENTITIES.ROUTE_STOP.name)
    return mergeStopsIntoRoutes(routes, stopRows)
  } catch {
    return routes
  }
}

export async function listRoutesByTransportDetail(
  transportDetailId: number,
): Promise<TransportRoute[]> {
  const rows = await domainList<TransportRoute>(
    ENTITIES.ROUTE.name,
    buildTransportDetailActiveQuery(transportDetailId),
  )
  return rows.map(normalizeTransportRoute)
}

export async function getRouteById(routeId: number): Promise<TransportRoute | null> {
  const rows = await domainList<TransportRoute>(
    ENTITIES.ROUTE.name,
    buildQuery({ routeId }),
  )
  const row = rows[0]
  return row ? normalizeTransportRoute(row) : null
}

export async function createRoute(data: Partial<TransportRoute>): Promise<TransportRoute> {
  return domainCreate<TransportRoute>(ENTITIES.ROUTE.name, buildRoutePayload(data))
}

export async function updateRoute(
  routeId: number,
  data: Partial<TransportRoute>,
): Promise<TransportRoute> {
  return domainUpdate<TransportRoute>(
    ENTITIES.ROUTE.name,
    ENTITIES.ROUTE.pk,
    routeId,
    buildRoutePayload(data, routeId),
  )
}

// ─── Route stops ─────────────────────────────────────────────────────────────

type RouteStopRow = RouteStop & Record<string, unknown>

/** Flatten nested FKs Spring returns on RouteStop list rows. */
function normalizeRouteStop(row: RouteStop): RouteStop {
  const r = row as RouteStopRow
  return {
    ...row,
    organizationId:
      pickNestedId(r, 'organizationId', ['organization', 'Organization'], 'organizationId') ||
      row.organizationId,
    transportDetailId:
      pickNestedId(
        r,
        'transportDetailId',
        ['transportDetail', 'TransportDetail'],
        'transportDetailId',
      ) || row.transportDetailId,
    feeFrequencyId:
      pickNestedId(r, 'feeFrequencyId', ['feeFrequency', 'FeeFrequency'], 'generalDetailId') ||
      row.feeFrequencyId,
    routeId:
      pickNestedId(r, 'routeId', ['route', 'Route'], 'routeId') || row.routeId,
    distanceFeeId:
      pickNestedId(r, 'distanceFeeId', ['distanceFee', 'DistanceFee'], 'distanceFeeId') ||
      row.distanceFeeId,
  }
}

/**
 * Angular RouteStop create/update body — PK on update + flat IDs + nested FKs.
 * Spring returns success:false ("Unable to process…") when update omits routeStopId
 * or sends only raw form fields without nested Organization/TransportDetail/feeFrequency/Route.
 */
function buildRouteStopPayload(
  data: Partial<RouteStop>,
  routeStopId?: number,
): Record<string, unknown> {
  const organizationId = asFiniteId(data.organizationId)
  const transportDetailId = asFiniteId(data.transportDetailId)
  const feeFrequencyId = asFiniteId(data.feeFrequencyId)
  const routeId = asFiniteId(data.routeId)
  const distanceFeeId = asFiniteId(data.distanceFeeId)
  const isActive = data.isActive !== false

  const payload: Record<string, unknown> = {
    organizationId,
    organization: { organizationId },
    transportDetailId,
    transportDetail: { transportDetailId },
    feeFrequencyId,
    feeFrequency: { generalDetailId: feeFrequencyId },
    routeId,
    route: { routeId },
    distanceFeeId,
    distanceFee: { distanceFeeId },
    stopName: asString(data.stopName).trim(),
    distanceFromSchoolKm: asNullableNumber(data.distanceFromSchoolKm),
    amount: asNullableNumber(data.amount),
    pickTime: data.pickTime ?? null,
    dropTime: data.dropTime ?? null,
    isActive,
    reason: angularLowerActiveReason(isActive, data.reason),
  }

  if (routeStopId != null) {
    payload.routeStopId = routeStopId
  }

  return payload
}

export async function listRouteStopsByRoute(routeId: number): Promise<RouteStop[]> {
  const rows = await domainList<RouteStop>(
    ENTITIES.ROUTE_STOP.name,
    buildQuery({ 'Route.routeId': routeId }),
  )
  return rows.map(normalizeRouteStop)
}

export async function createRouteStop(data: Partial<RouteStop>): Promise<RouteStop> {
  return domainCreate<RouteStop>(
    ENTITIES.ROUTE_STOP.name,
    buildRouteStopPayload(data),
  )
}

export async function updateRouteStop(
  routeStopId: number,
  data: Partial<RouteStop>,
): Promise<RouteStop> {
  return domainUpdate<RouteStop>(
    ENTITIES.ROUTE_STOP.name,
    ENTITIES.ROUTE_STOP.pk,
    routeStopId,
    buildRouteStopPayload(data, routeStopId),
  )
}

// ─── Vehicle drivers ─────────────────────────────────────────────────────────

type VehicleDriverRow = VehicleDriver & Record<string, unknown>

/** Flatten nested FKs Spring returns on VehicleDriver list rows. */
function normalizeVehicleDriver(row: VehicleDriver): VehicleDriver {
  const r = row as VehicleDriverRow
  return {
    ...row,
    organizationId:
      pickNestedId(r, 'organizationId', ['organization', 'Organization'], 'organizationId') ||
      row.organizationId,
    transportDetailId:
      pickNestedId(
        r,
        'transportDetailId',
        ['transportDetail', 'TransportDetail'],
        'transportDetailId',
      ) || row.transportDetailId,
    vehicleDetailId:
      pickNestedId(
        r,
        'vehicleDetailId',
        ['vehicleDetail', 'VehicleDetail'],
        'vehicleDetailId',
      ) || row.vehicleDetailId,
    driverId:
      pickNestedId(r, 'driverId', ['driver', 'Driver'], 'driverId') || row.driverId,
    helperId: pickNestedId(r, 'helperId', ['helper', 'Helper'], 'helperId') || row.helperId,
  }
}

/**
 * Angular VehicleDriver create/update body — PK on update + flat IDs + nested FKs.
 * Spring returns success:false ("Unable to process…") when update omits vehicleDriverId
 * or sends only raw form fields without nested Organization/TransportDetail/VehicleDetail/Driver/Helper.
 */
function buildVehicleDriverPayload(
  data: Partial<VehicleDriver>,
  vehicleDriverId?: number,
): Record<string, unknown> {
  const organizationId = asFiniteId(data.organizationId)
  const transportDetailId = asFiniteId(data.transportDetailId)
  const vehicleDetailId = asNullableNumber(data.vehicleDetailId)
  const driverId = asNullableNumber(data.driverId)
  const helperId = asNullableNumber(data.helperId)
  const isActive = data.isActive !== false

  const payload: Record<string, unknown> = {
    organizationId,
    organization: { organizationId },
    transportDetailId,
    transportDetail: { transportDetailId },
    isActive,
    reason: angularLowerActiveReason(isActive, data.reason),
  }

  if (vehicleDetailId != null && vehicleDetailId > 0) {
    payload.vehicleDetailId = vehicleDetailId
    payload.vehicleDetail = { vehicleDetailId }
  }

  if (driverId != null && driverId > 0) {
    payload.driverId = driverId
    payload.driver = { driverId }
  }

  if (helperId != null && helperId > 0) {
    payload.helperId = helperId
    payload.helper = { helperId }
  }

  // Some Spring controllers also expect the PK inside body on update (Angular edits do this too).
  if (vehicleDriverId != null) {
    payload.vehicleDriverId = vehicleDriverId
  }

  return payload
}

export async function listVehicleDrivers(): Promise<VehicleDriver[]> {
  const rows = await domainList<VehicleDriver>(ENTITIES.VEHICLE_DRIVER.name)
  return rows.map(normalizeVehicleDriver)
}

export async function createVehicleDriver(data: Partial<VehicleDriver>): Promise<VehicleDriver> {
  return domainCreate<VehicleDriver>(
    ENTITIES.VEHICLE_DRIVER.name,
    buildVehicleDriverPayload(data),
  )
}

export async function updateVehicleDriver(
  vehicleDriverId: number,
  data: Partial<VehicleDriver>,
): Promise<VehicleDriver> {
  return domainUpdate<VehicleDriver>(
    ENTITIES.VEHICLE_DRIVER.name,
    ENTITIES.VEHICLE_DRIVER.pk,
    vehicleDriverId,
    buildVehicleDriverPayload(data, vehicleDriverId),
  )
}

// ─── Vehicle route map ───────────────────────────────────────────────────────

type VehicleRouteRow = VehicleRoute & Record<string, unknown>

/** Flatten nested FKs Spring returns on VechicleRoute list rows. */
function normalizeVehicleRoute(row: VehicleRoute): VehicleRoute {
  const r = row as VehicleRouteRow
  return {
    ...row,
    organizationId:
      pickNestedId(r, 'organizationId', ['organization', 'Organization'], 'organizationId') ||
      row.organizationId,
    transportDetailId:
      pickNestedId(
        r,
        'transportDetailId',
        ['transportDetail', 'TransportDetail'],
        'transportDetailId',
      ) || row.transportDetailId,
    routeId: pickNestedId(r, 'routeId', ['route', 'Route'], 'routeId') || row.routeId,
    vehicleDetailId:
      pickNestedId(
        r,
        'vehicleDetailId',
        ['vehicleDetail', 'VehicleDetail'],
        'vehicleDetailId',
      ) || row.vehicleDetailId,
    driverId: pickNestedId(r, 'driverId', ['driver', 'Driver'], 'driverId') || row.driverId,
    helperId: pickNestedId(r, 'helperId', ['helper', 'Helper'], 'helperId') || row.helperId,
  }
}

/**
 * Angular VechicleRoute create/update body — PK on update + flat IDs + nested FKs.
 * Spring returns success:false ("Unable to process…") when update omits vechicleRouteId
 * or sends NaN / invalid FK shapes from raw form coercion.
 */
function buildVehicleRoutePayload(
  data: Partial<VehicleRoute>,
  vechicleRouteId?: number,
): Record<string, unknown> {
  const organizationId = asFiniteId(data.organizationId)
  const transportDetailId = asNullableNumber(data.transportDetailId)
  const routeId = asNullableNumber(data.routeId)
  const vehicleDetailId = asNullableNumber(data.vehicleDetailId)
  const driverId = asNullableNumber(data.driverId)
  const helperId = asNullableNumber(data.helperId)
  const isActive = data.isActive !== false

  const payload: Record<string, unknown> = {
    organizationId,
    organization: { organizationId },
    serviceNumber: asString(data.serviceNumber).trim(),
    fromDate: data.fromDate ?? null,
    toDate: data.toDate ?? null,
    status: asString(data.status) || null,
    isActive,
    reason: angularLowerActiveReason(isActive, data.reason),
  }

  if (transportDetailId != null && transportDetailId > 0) {
    payload.transportDetailId = transportDetailId
    payload.transportDetail = { transportDetailId }
  }

  if (routeId != null && routeId > 0) {
    payload.routeId = routeId
    payload.route = { routeId }
  }

  if (vehicleDetailId != null && vehicleDetailId > 0) {
    payload.vehicleDetailId = vehicleDetailId
    payload.vehicleDetail = { vehicleDetailId }
  }

  if (driverId != null && driverId > 0) {
    payload.driverId = driverId
    payload.driver = { driverId }
  }

  if (helperId != null && helperId > 0) {
    payload.helperId = helperId
    payload.helper = { helperId }
  }

  if (vechicleRouteId != null) {
    payload.vechicleRouteId = vechicleRouteId
  }

  return payload
}

export async function listVehicleRoutes(): Promise<VehicleRoute[]> {
  const rows = await domainList<VehicleRoute>(ENTITIES.VEHICLE_ROUTE.name)
  return rows.map(normalizeVehicleRoute)
}

export async function createVehicleRoute(data: Partial<VehicleRoute>): Promise<VehicleRoute> {
  return domainCreate<VehicleRoute>(
    ENTITIES.VEHICLE_ROUTE.name,
    buildVehicleRoutePayload(data),
  )
}

export async function updateVehicleRoute(
  vechicleRouteId: number,
  data: Partial<VehicleRoute>,
): Promise<VehicleRoute> {
  return domainUpdate<VehicleRoute>(
    ENTITIES.VEHICLE_ROUTE.name,
    ENTITIES.VEHICLE_ROUTE.pk,
    vechicleRouteId,
    buildVehicleRoutePayload(data, vechicleRouteId),
  )
}

// ─── Distance fee ──────────────────────────────────────────────────────────────

type DistanceFeeRow = DistanceFee & Record<string, unknown>

/** Flatten nested Organization / TransportDetail / feeFrequency FKs Spring returns on list. */
function normalizeDistanceFee(row: DistanceFeeRow): DistanceFee {
  return {
    ...row,
    organizationId:
      pickNestedId(row, 'organizationId', ['organization', 'Organization'], 'organizationId') ||
      row.organizationId,
    transportDetailId:
      pickNestedId(
        row,
        'transportDetailId',
        ['transportDetail', 'TransportDetail'],
        'transportDetailId',
      ) || row.transportDetailId,
    feeFrequencyId:
      pickNestedId(row, 'feeFrequencyId', ['feeFrequency', 'FeeFrequency'], 'generalDetailId') ||
      row.feeFrequencyId,
  }
}

/**
 * Angular DistanceFee create/update body — PK on update + flat IDs + nested FKs.
 * Spring returns success:false ("Unable to process…") when update omits distanceFeeId
 * or sends only raw form fields without nested Organization/TransportDetail/feeFrequency.
 */
function buildDistanceFeePayload(
  data: Partial<DistanceFee>,
  distanceFeeId?: number,
): Record<string, unknown> {
  const organizationId = asFiniteId(data.organizationId)
  const transportDetailId = asFiniteId(data.transportDetailId)
  const feeFrequencyId = asNullableNumber(data.feeFrequencyId)
  const isActive = data.isActive !== false

  const payload: Record<string, unknown> = {
    organizationId,
    organization: { organizationId },
    transportDetailId,
    transportDetail: { transportDetailId },
    fromKm: asNullableNumber(data.fromKm),
    toKm: asNullableNumber(data.toKm),
    amount: asNullableNumber(data.amount),
    fromDate: data.fromDate ?? null,
    toDate: data.toDate ?? null,
    isActive,
    reason: angularLowerActiveReason(isActive, data.reason),
  }

  if (feeFrequencyId != null && feeFrequencyId > 0) {
    payload.feeFrequencyId = feeFrequencyId
    payload.feeFrequency = { generalDetailId: feeFrequencyId }
  }

  if (distanceFeeId != null) {
    payload.distanceFeeId = distanceFeeId
  }

  return payload
}

function filterDistanceFeesByTransportAndFrequency(
  rows: DistanceFeeRow[],
  transportDetailId: number,
  feeFrequencyId: number,
): DistanceFee[] {
  const transportId = Number(transportDetailId)
  const frequencyId = Number(feeFrequencyId)
  return rows
    .map(normalizeDistanceFee)
    .filter(
      (d) =>
        Number(d.transportDetailId) === transportId &&
        Number(d.feeFrequencyId) === frequencyId &&
        d.isActive !== false &&
        d.distanceFeeId != null,
    )
}

export async function listDistanceFees(): Promise<DistanceFee[]> {
  const rows = await domainList<DistanceFeeRow>(ENTITIES.DISTANCE_FEE.name)
  return rows.map(normalizeDistanceFee)
}

/**
 * Angular route-stops modal: DistanceFee by transport + fee frequency.
 * Tries nested Hibernate keys first, then flat fields, then client-side filter.
 */
export async function listDistanceFeesByTransportAndFrequency(
  transportDetailId: number,
  feeFrequencyId: number,
): Promise<DistanceFee[]> {
  if (!transportDetailId || !feeFrequencyId) return []

  const queries = [
    buildQuery({
      'TransportDetail.transportDetailId': transportDetailId,
      'feeFrequency.generalDetailId': feeFrequencyId,
      isActive: true,
    }),
    buildQuery({
      transportDetailId,
      feeFrequencyId,
      isActive: true,
    }),
    buildQuery({
      'TransportDetail.transportDetailId': transportDetailId,
      feeFrequencyId,
      isActive: true,
    }),
    buildQuery({
      transportDetailId,
      'feeFrequency.generalDetailId': feeFrequencyId,
      isActive: true,
    }),
    buildQuery({
      'TransportDetail.transportDetailId': transportDetailId,
      'feeFrequency.generalDetailId': feeFrequencyId,
    }),
    buildQuery({ transportDetailId, feeFrequencyId }),
  ]

  for (const q of queries) {
    try {
      const rows = await domainList<DistanceFeeRow>(ENTITIES.DISTANCE_FEE.name, q)
      const matched = filterDistanceFeesByTransportAndFrequency(
        rows,
        transportDetailId,
        feeFrequencyId,
      )
      if (matched.length > 0) return matched
    } catch {
      // try next query shape
    }
  }

  const all = await domainList<DistanceFeeRow>(ENTITIES.DISTANCE_FEE.name)
  return filterDistanceFeesByTransportAndFrequency(all, transportDetailId, feeFrequencyId)
}

export async function createDistanceFee(data: Partial<DistanceFee>): Promise<DistanceFee> {
  return domainCreate<DistanceFee>(
    ENTITIES.DISTANCE_FEE.name,
    buildDistanceFeePayload(data),
  )
}

export async function updateDistanceFee(
  distanceFeeId: number,
  data: Partial<DistanceFee>,
): Promise<DistanceFee> {
  return domainUpdate<DistanceFee>(
    ENTITIES.DISTANCE_FEE.name,
    ENTITIES.DISTANCE_FEE.pk,
    distanceFeeId,
    buildDistanceFeePayload(data, distanceFeeId),
  )
}

// ─── Transport allocation ────────────────────────────────────────────────────

export async function listTransportAllocations(
  allocationFor: TransportAllocationFor,
  personId?: number,
): Promise<TransportAllocation[]> {
  const filters: Record<string, string | number> = personId
    ? allocationFor === 'S'
      ? { 'studentDetail.studentId': personId }
      : { 'employeeDetail.employeeId': personId }
    : { allocationFor }
  return domainList<TransportAllocation>(
    ENTITIES.TRANSPORT_ALLOCATION.name,
    buildQuery(
      filters,
      { field: 'createdDt', direction: 'DESC' },
    ),
  )
}

export async function updateTransportAllocation(
  transportAllocationId: number,
  data: Partial<TransportAllocation>,
): Promise<TransportAllocation> {
  const isActive = data.isActive !== false
  return domainUpdate<TransportAllocation>(
    ENTITIES.TRANSPORT_ALLOCATION.name,
    ENTITIES.TRANSPORT_ALLOCATION.pk,
    transportAllocationId,
    {
      ...data,
      transportAllocationId,
      isActive,
      reason: angularLowerActiveReason(isActive, data.reason),
    },
  )
}

export async function allocateTransportForStudent(
  payload: Record<string, unknown>,
): Promise<unknown> {
  return postDetails(TRANSPORT_API.TRANSPORT_ALLOCATION, payload)
}

export async function getStudentTransportReport(
  params: Record<string, string | number>,
): Promise<unknown[]> {
  const rows = await getAllRecords<unknown[] | { resultList?: unknown[] }>(
    TRANSPORT_API.GET_STUDENT_TRANSPORT,
    params,
  )
  if (Array.isArray(rows)) return rows
  if (rows && typeof rows === 'object' && Array.isArray((rows as { resultList?: unknown[] }).resultList)) {
    return (rows as { resultList: unknown[] }).resultList
  }
  return []
}
