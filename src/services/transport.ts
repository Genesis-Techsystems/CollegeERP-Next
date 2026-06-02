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
import { domainCreate, domainList, domainUpdate, getAllRecords, postDetails } from './crud'
import { buildQuery } from './query'

// ─── Transport details ───────────────────────────────────────────────────────

export async function listTransportDetails(): Promise<TransportDetail[]> {
  return domainList<TransportDetail>(ENTITIES.TRANSPORT_DETAIL.name)
}

export async function listTransportDetailsByOrganization(
  organizationId: number,
): Promise<TransportDetail[]> {
  return domainList<TransportDetail>(
    ENTITIES.TRANSPORT_DETAIL.name,
    buildQuery({ isActive: true, 'Organization.organizationId': organizationId }),
  )
}

export async function createTransportDetail(data: TransportDetailPayload): Promise<TransportDetail> {
  return domainCreate<TransportDetail>(ENTITIES.TRANSPORT_DETAIL.name, data)
}

export async function updateTransportDetail(
  transportDetailId: number,
  data: Partial<TransportDetailPayload>,
): Promise<TransportDetail> {
  return domainUpdate<TransportDetail>(
    ENTITIES.TRANSPORT_DETAIL.name,
    ENTITIES.TRANSPORT_DETAIL.pk,
    transportDetailId,
    data,
  )
}

// ─── Vehicles ────────────────────────────────────────────────────────────────

export async function listVehicles(): Promise<VehicleDetail[]> {
  return domainList<VehicleDetail>(ENTITIES.VEHICLE_DETAIL.name)
}

export async function listVehiclesByTransportDetail(
  transportDetailId: number,
): Promise<VehicleDetail[]> {
  return domainList<VehicleDetail>(
    ENTITIES.VEHICLE_DETAIL.name,
    buildQuery({ transportDetailId, isActive: true }),
  )
}

export async function createVehicle(data: Partial<VehicleDetail>): Promise<VehicleDetail> {
  return domainCreate<VehicleDetail>(ENTITIES.VEHICLE_DETAIL.name, data)
}

export async function updateVehicle(
  vehicleDetailId: number,
  data: Partial<VehicleDetail>,
): Promise<VehicleDetail> {
  return domainUpdate<VehicleDetail>(
    ENTITIES.VEHICLE_DETAIL.name,
    ENTITIES.VEHICLE_DETAIL.pk,
    vehicleDetailId,
    data,
  )
}

// ─── Drivers ─────────────────────────────────────────────────────────────────

export async function listDrivers(): Promise<Driver[]> {
  return domainList<Driver>(ENTITIES.DRIVER.name)
}

export async function listDriversByTransportDetail(transportDetailId: number): Promise<Driver[]> {
  return domainList<Driver>(
    ENTITIES.DRIVER.name,
    buildQuery({ transportDetailId, isActive: true }),
  )
}

export async function createDriver(data: Partial<Driver>): Promise<Driver> {
  return domainCreate<Driver>(ENTITIES.DRIVER.name, data)
}

export async function updateDriver(driverId: number, data: Partial<Driver>): Promise<Driver> {
  return domainUpdate<Driver>(ENTITIES.DRIVER.name, ENTITIES.DRIVER.pk, driverId, data)
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

export async function listHelpers(): Promise<Helper[]> {
  return domainList<Helper>(ENTITIES.HELPER.name)
}

export async function listHelpersByTransportDetail(transportDetailId: number): Promise<Helper[]> {
  return domainList<Helper>(
    ENTITIES.HELPER.name,
    buildQuery({ transportDetailId, isActive: true }),
  )
}

export async function createHelper(data: Partial<Helper>): Promise<Helper> {
  return domainCreate<Helper>(ENTITIES.HELPER.name, data)
}

export async function updateHelper(helperId: number, data: Partial<Helper>): Promise<Helper> {
  return domainUpdate<Helper>(ENTITIES.HELPER.name, ENTITIES.HELPER.pk, helperId, data)
}

// ─── Routes ──────────────────────────────────────────────────────────────────

export async function listRoutes(): Promise<TransportRoute[]> {
  return domainList<TransportRoute>(ENTITIES.ROUTE.name)
}

export async function listRoutesByTransportDetail(
  transportDetailId: number,
): Promise<TransportRoute[]> {
  return domainList<TransportRoute>(
    ENTITIES.ROUTE.name,
    buildQuery({ transportDetailId, isActive: true }),
  )
}

export async function createRoute(data: Partial<TransportRoute>): Promise<TransportRoute> {
  return domainCreate<TransportRoute>(ENTITIES.ROUTE.name, data)
}

export async function updateRoute(
  routeId: number,
  data: Partial<TransportRoute>,
): Promise<TransportRoute> {
  return domainUpdate<TransportRoute>(ENTITIES.ROUTE.name, ENTITIES.ROUTE.pk, routeId, data)
}

// ─── Route stops ─────────────────────────────────────────────────────────────

export async function listRouteStopsByRoute(routeId: number): Promise<RouteStop[]> {
  return domainList<RouteStop>(
    ENTITIES.ROUTE_STOP.name,
    buildQuery({ 'Route.routeId': routeId }),
  )
}

export async function createRouteStop(data: Partial<RouteStop>): Promise<RouteStop> {
  return domainCreate<RouteStop>(ENTITIES.ROUTE_STOP.name, data)
}

export async function updateRouteStop(
  routeStopId: number,
  data: Partial<RouteStop>,
): Promise<RouteStop> {
  return domainUpdate<RouteStop>(
    ENTITIES.ROUTE_STOP.name,
    ENTITIES.ROUTE_STOP.pk,
    routeStopId,
    data,
  )
}

// ─── Vehicle drivers ─────────────────────────────────────────────────────────

export async function listVehicleDrivers(): Promise<VehicleDriver[]> {
  return domainList<VehicleDriver>(ENTITIES.VEHICLE_DRIVER.name)
}

export async function createVehicleDriver(data: Partial<VehicleDriver>): Promise<VehicleDriver> {
  return domainCreate<VehicleDriver>(ENTITIES.VEHICLE_DRIVER.name, data)
}

export async function updateVehicleDriver(
  vehicleDriverId: number,
  data: Partial<VehicleDriver>,
): Promise<VehicleDriver> {
  return domainUpdate<VehicleDriver>(
    ENTITIES.VEHICLE_DRIVER.name,
    ENTITIES.VEHICLE_DRIVER.pk,
    vehicleDriverId,
    data,
  )
}

// ─── Vehicle route map ───────────────────────────────────────────────────────

export async function listVehicleRoutes(): Promise<VehicleRoute[]> {
  return domainList<VehicleRoute>(ENTITIES.VEHICLE_ROUTE.name)
}

export async function createVehicleRoute(data: Partial<VehicleRoute>): Promise<VehicleRoute> {
  return domainCreate<VehicleRoute>(ENTITIES.VEHICLE_ROUTE.name, data)
}

export async function updateVehicleRoute(
  vechicleRouteId: number,
  data: Partial<VehicleRoute>,
): Promise<VehicleRoute> {
  return domainUpdate<VehicleRoute>(
    ENTITIES.VEHICLE_ROUTE.name,
    ENTITIES.VEHICLE_ROUTE.pk,
    vechicleRouteId,
    data,
  )
}

// ─── Distance fee ──────────────────────────────────────────────────────────────

export async function listDistanceFees(): Promise<DistanceFee[]> {
  return domainList<DistanceFee>(ENTITIES.DISTANCE_FEE.name)
}

export async function createDistanceFee(data: Partial<DistanceFee>): Promise<DistanceFee> {
  return domainCreate<DistanceFee>(ENTITIES.DISTANCE_FEE.name, data)
}

export async function updateDistanceFee(
  distanceFeeId: number,
  data: Partial<DistanceFee>,
): Promise<DistanceFee> {
  return domainUpdate<DistanceFee>(
    ENTITIES.DISTANCE_FEE.name,
    ENTITIES.DISTANCE_FEE.pk,
    distanceFeeId,
    data,
  )
}

// ─── Transport allocation ────────────────────────────────────────────────────

export async function listTransportAllocations(
  allocationFor: TransportAllocationFor,
): Promise<TransportAllocation[]> {
  return domainList<TransportAllocation>(
    ENTITIES.TRANSPORT_ALLOCATION.name,
    buildQuery(
      { allocationFor },
      { field: 'createdDt', direction: 'DESC' },
    ),
  )
}

export async function updateTransportAllocation(
  transportAllocationId: number,
  data: Partial<TransportAllocation>,
): Promise<TransportAllocation> {
  return domainUpdate<TransportAllocation>(
    ENTITIES.TRANSPORT_ALLOCATION.name,
    ENTITIES.TRANSPORT_ALLOCATION.pk,
    transportAllocationId,
    data,
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
