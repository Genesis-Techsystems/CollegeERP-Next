import type { ErpModuleMirrorConfig, ModuleRouteConfig } from './types'

function r(
  slug: string,
  title: string,
  description: string,
  kind: ModuleRouteConfig['kind'] = 'placeholder',
): ModuleRouteConfig {
  return { slug, title, description, kind, angularPath: slug }
}

export const TRANSPORT_MODULE: ErpModuleMirrorConfig = {
  id: 'transport',
  basePath: '/transport',
  angularSegment: 'transport/',
  defaultSlug: 'transport-dashboard',
  moduleLabel: 'Transport',
  dashboardTitle: 'Transport Dashboard',
  dashboardDescription:
    'Manage vehicles, routes, drivers, transport allocation, and student transport details.',
  labelAliases: {
    // Transport sidebar labels (incl. Angular typos from live menu)
    addroute: 'route',
    mapvechicleroute: 'vehicle-map',
    mapvehicleroute: 'vehicle-map',
    mapvehicledriver: 'vehicle-drivers',
    mapvehicledrivers: 'vehicle-drivers',
    transportdistancefee: 'distance-fee',
    transportdetails: 'transport-details',
    transportallocatedlist: 'transport-allocated-list',
    transportallocation: 'transport-allocation',
    studenttransportdetails: 'student-transport-details',
    vehicledrivers: 'vehicle-drivers',
    vehiclemap: 'vehicle-map',
    distancefee: 'distance-fee',
    routestops: 'route-stops',
  },
  slugAliases: {
    transportdetails: 'transport-details',
    transportallocatedlist: 'transport-allocated-list',
    transportallocation: 'transport-allocation',
    studenttransportdetails: 'student-transport-details',
    vehicledrivers: 'vehicle-drivers',
    vehiclemap: 'vehicle-map',
    mapvehicleroute: 'vehicle-map',
    distancefee: 'distance-fee',
    routestops: 'route-stops',
  },
  routes: [
    r('transport-dashboard', 'Transport Dashboard', 'Overview of transport operations.', 'dashboard'),
    r('transport-details', 'Transport Details', 'Transport service configuration.', 'master'),
    r('vehicle', 'Vehicle', 'Register and maintain vehicles.', 'master'),
    r('driver', 'Driver', 'Driver master data.', 'master'),
    r('helper', 'Helper', 'Transport helper staff.', 'master'),
    r('route', 'Add Route', 'Bus routes and schedules.', 'master'),
    r('route-stops', 'Route Stops', 'Stops along each route.', 'master'),
    r('vehicle-drivers', 'Map Vehicle Driver', 'Assign drivers to vehicles.', 'transaction'),
    r('vehicle-map', 'Map Vehicle Route', 'Assign vehicles to routes (vehicle route mapping).', 'master'),
    r('distance-fee', 'Distance Fee', 'Fee by distance slabs.', 'master'),
    r('transport-allocation', 'Transport Allocation', 'Allocate students to routes.', 'transaction'),
    r('transport-allocated-list', 'Allocated List', 'View and edit allocations.', 'report'),
    r('student-transport-details', 'Student Transport Details', 'Student-wise transport info.', 'report'),
  ],
}

export const TC_NO_DUE_MODULE: ErpModuleMirrorConfig = {
  id: 'tc-no-due-approval',
  basePath: '/tc-no-due-approval',
  angularSegment: 'certificates/',
  defaultSlug: 'transfer-certificate',
  moduleLabel: 'TC and NO Due Approval',
  dashboardTitle: 'TC & No Due Approval',
  dashboardDescription:
    'Transfer certificate workflow, no-due clearance requests, and certificate request approvals.',
  labelAliases: {
    transfercertificate: 'transfer-certificate',
    nodueapprovalrequest: 'send-no-due-approval-request',
    nodueapproval: 'send-no-due-approval-request',
    sendnodueapprovalrequest: 'send-no-due-approval-request',
    certificaterequests: 'certificate-requests',
    certificatesissued: 'certificates-issued-list',
    certificatesissuedlist: 'certificates-issued-list',
    certificaterequestreport: 'certificate-request-report',
    printtc: 'certificate-requests/printTc',
  },
  slugAliases: {
    printtc: 'certificate-requests/printTc',
    nodue: 'send-no-due-approval-request',
    nodueapproval: 'send-no-due-approval-request',
    transfercertificate: 'transfer-certificate',
    certificaterequests: 'certificate-requests',
    certificatesissuedlist: 'certificates-issued-list',
  },
  routes: [
    r('transfer-certificate', 'Transfer Certificate', 'TC application and processing.', 'transaction'),
    r(
      'send-no-due-approval-request',
      'No Due Approval Request',
      'Send departments for no-due clearance.',
      'transaction',
    ),
    r('certificate-requests', 'Certificate Requests', 'Pending certificate approvals.', 'transaction'),
    r(
      'certificate-requests/printTc',
      'Print TC',
      'Print transfer certificate.',
      'transaction',
    ),
    r('certificates-issued-list', 'Certificates Issued', 'Issued certificates list.', 'report'),
    r('certificate-request-report', 'Certificate Request Report', 'Request status report.', 'report'),
  ],
}

export const HOSTEL_MODULE: ErpModuleMirrorConfig = {
  id: 'hostel',
  basePath: '/hostel',
  angularSegment: 'hostel/',
  defaultSlug: 'hostel-dashboard',
  moduleLabel: 'Hostel',
  dashboardTitle: 'Hostel Dashboard',
  dashboardDescription:
    'Hostel types, rooms, allocation, visitors, payments, and occupancy reports.',
  labelAliases: {
    hosteltypes: 'hostel-types',
    hosteldetails: 'hostel-details',
    roomcharges: 'room-charges',
    roomslist: 'rooms-list',
    roomallocation: 'rooms-list',
    hostelroomallocation: 'rooms-list',
    viewroomdetails: 'view-room-details',
    hosteldiscounts: 'hostel-discounts',
    hostelregister: 'hostel-register',
    hostelvisitor: 'hostel-visitor',
    hostelpayment: 'hostel-payment',
    monthlyvisitorsummaryreport: 'monthly-visitor-summary-report',
    monthlyvisitorsummary: 'monthly-visitor-summary-report',
  },
  slugAliases: {
    hosteltypes: 'hostel-types',
    hosteldetails: 'hostel-details',
    roomcharges: 'room-charges',
    roomslist: 'rooms-list',
    roomallocation: 'rooms-list',
    hostelroomallocation: 'rooms-list',
    hosteldiscounts: 'hostel-discounts',
    hostelregister: 'hostel-register',
    hostelvisitor: 'hostel-visitor',
    hostelpayment: 'hostel-payment',
  },
  routes: [
    r('hostel-dashboard', 'Hostel Dashboard', 'Hostel overview.', 'dashboard'),
    r('hostel-types', 'Hostel Types', 'Categories of hostel accommodation.', 'master'),
    r('hostel-details', 'Hostel Details', 'Hostel buildings and blocks.', 'master'),
    r('room-charges', 'Room Charges', 'Room fee structures.', 'master'),
    r('rooms', 'Rooms', 'Room inventory.', 'master'),
    r('rooms-list', 'Hostel Room Allocation', 'Select hostel and allocate students to rooms.', 'transaction'),
    r('room-allocation', 'Allocate to Room', 'Assign student or employee to a room bed.', 'transaction'),
    r('view-room-details', 'View Room Details', 'Room occupancy details.', 'report'),
    r('hostel-discounts', 'Hostel Discounts', 'Discount rules for hostel fees.', 'master'),
    r('hostel-register', 'Hostel Register', 'Hostel register entries.', 'transaction'),
    r('hostel-visitor', 'Hostel Visitor', 'Visitor log.', 'transaction'),
    r('hostel-payment', 'Hostel Payment', 'Hostel fee collection.', 'transaction'),
    r(
      'monthly-visitor-summary-report',
      'Monthly Visitor Summary',
      'Visitor summary report.',
      'report',
    ),
  ],
}

export const CERTIFICATES_MODULE: ErpModuleMirrorConfig = {
  id: 'certificates',
  basePath: '/certificates',
  angularSegment: 'certificates/',
  defaultSlug: 'certificates-dashboard',
  moduleLabel: 'Certificates',
  dashboardTitle: 'Certificates Dashboard',
  dashboardDescription: 'Issue and track bonafide, TC, custodian, and other certificates.',
  slugAliases: {
    bonafide: 'bonafied-certificate',
    bonafied: 'bonafied-certificate',
  },
  routes: [
    r('certificates-dashboard', 'Certificates Dashboard', 'Certificates overview.', 'dashboard'),
    r('bonafied-certificate', 'Bonafide Certificate', 'Bonafide certificate requests.', 'transaction'),
    r(
      'bonafide-conduct-certificate',
      'Bonafide Conduct Certificate',
      'Conduct certificate.',
      'transaction',
    ),
    r('transfer-certificate', 'Transfer Certificate', 'Transfer certificate.', 'transaction'),
    r('custodian-certificate', 'Custodian Certificate', 'Custodian certificate.', 'transaction'),
    r(
      'course-completion-certificate',
      'Course Completion Certificate',
      'Course completion certificate.',
      'transaction',
    ),
    r(
      'medium-of-instruction-certificate',
      'Medium of Instruction',
      'Medium of instruction certificate.',
      'transaction',
    ),
    r('no-objection-certificate', 'No Objection Certificate', 'NOC certificate.', 'transaction'),
    r('certificate-requests', 'Certificate Requests', 'All certificate requests.', 'transaction'),
    r('certificates-issued-list', 'Certificates Issued List', 'Issued certificates.', 'report'),
    r(
      'send-no-due-approval-request',
      'No Due Approval',
      'No-due approval workflow.',
      'transaction',
    ),
    r('certificate-request-report', 'Certificate Request Report', 'Request analytics.', 'report'),
    r(
      'certificate-requests/print-certificate-receipt',
      'Print Certificate Receipt',
      'Print fee receipt.',
      'transaction',
    ),
    r('certificate-requests/printTc', 'Print TC', 'Print transfer certificate.', 'transaction'),
  ],
}

export const CAMPUS_MAINTENANCE_MODULE: ErpModuleMirrorConfig = {
  id: 'campus-maintenance',
  basePath: '/campus-maintenance',
  angularSegment: 'campus-maintenance/',
  defaultSlug: 'campus-maintendance-dashboard',
  moduleLabel: 'Campus Maintenance',
  dashboardTitle: 'Campus Maintenance Dashboard',
  dashboardDescription: 'Log complaints, track status, and maintain campus facilities.',
  slugAliases: {
    dashboard: 'campus-maintendance-dashboard',
    campusmaintenancedashboard: 'campus-maintendance-dashboard',
  },
  routes: [
    r(
      'campus-maintendance-dashboard',
      'Maintenance Dashboard',
      'Complaints overview.',
      'dashboard',
    ),
    r('complaints-list', 'Complaints List', 'All maintenance complaints.', 'report'),
    r('new-complaints', 'New Complaints', 'Raise a new complaint.', 'transaction'),
    r('add-complaints', 'Add Complaints', 'Add complaint details.', 'transaction'),
    r('complaint-status', 'Complaint Status', 'Update complaint status.', 'transaction'),
  ],
}

export const TRAININGS_MODULE: ErpModuleMirrorConfig = {
  id: 'trainings',
  basePath: '/trainings',
  angularSegment: 'trainings/',
  defaultSlug: 'training',
  moduleLabel: 'Trainings',
  dashboardTitle: 'Trainings',
  dashboardDescription:
    'Placement trainings, sessions, registration, attendance, and registered students.',
  slugAliases: {
    trainings: 'training',
    placementtrainings: 'training',
  },
  routes: [
    r('training', 'Trainings', 'Training programmes list.', 'dashboard'),
    r('training-details', 'Training Details', 'Training programme details.', 'master'),
    r('training-detail', 'Add Training Details', 'Create or edit training.', 'transaction'),
    r('training-sessions', 'Training Sessions', 'Schedule sessions.', 'transaction'),
    r(
      'student-training-registration',
      'Student Registration',
      'Register students for training.',
      'transaction',
    ),
    r('training-registered-list', 'Registered List', 'Students registered.', 'report'),
    r('attendance', 'Mark Attendance', 'Session attendance marking.', 'transaction'),
    r('view-training-attendance', 'View Attendance', 'Attendance reports.', 'report'),
    r('training-attendance', 'Training Classes', 'Classes list for attendance.', 'report'),
  ],
}

export const PLACEMENTS_MODULE: ErpModuleMirrorConfig = {
  id: 'placements-achievements',
  basePath: '/placements-achievements',
  angularSegment: 'placements-achievements/',
  defaultSlug: 'placements',
  moduleLabel: 'Placements & Achievements',
  dashboardTitle: 'Placements & Achievements',
  dashboardDescription: 'Record student placements and co-curricular achievements.',
  routes: [
    r('placements', 'Placements', 'Placement records and employers.', 'transaction'),
    r('achievements', 'Achievements', 'Student achievements and awards.', 'transaction'),
  ],
}

export const COMMITTEES_MODULE: ErpModuleMirrorConfig = {
  id: 'committees',
  basePath: '/committees',
  angularSegment: 'committe/',
  defaultSlug: 'create-committee',
  moduleLabel: 'Committees',
  dashboardTitle: 'Committees',
  dashboardDescription:
    'Committee setup, members, meetings, remuneration, and approval workflows.',
  slugAliases: {
    committee: 'create-committee',
    committe: 'create-committee',
  },
  routes: [
    r('create-committee', 'Create Committee', 'Define committees.', 'master'),
    r('add-committee-members', 'Committee Members', 'Add members to committees.', 'master'),
    r('create-committee-position', 'Committee Positions', 'Positions and roles.', 'master'),
    r('remuneration-payment', 'Remuneration Payment', 'Process remuneration.', 'transaction'),
    r('remuneration-approvals', 'Remuneration Approvals', 'Approve remuneration.', 'transaction'),
    r('schedule-committee-meeting', 'Schedule Meeting', 'Schedule committee meetings.', 'transaction'),
    r(
      'schedule-committee-meeting/add-meeting',
      'Add Meeting',
      'Add meeting details.',
      'transaction',
    ),
    r('finalise-profiles', 'Finalise Profiles', 'Finalise member profiles.', 'transaction'),
    r('finalised-profiles', 'Finalised Profiles', 'View finalised profiles.', 'report'),
    r('remuneration-settings', 'Remuneration Settings', 'Remuneration rules.', 'master'),
    r('committee-meeting', 'Committee Meeting', 'Meeting records.', 'report'),
  ],
}

export const ERP_MODULE_REGISTRY: ErpModuleMirrorConfig[] = [
  TRANSPORT_MODULE,
  TC_NO_DUE_MODULE,
  HOSTEL_MODULE,
  CERTIFICATES_MODULE,
  CAMPUS_MAINTENANCE_MODULE,
  TRAININGS_MODULE,
  PLACEMENTS_MODULE,
  COMMITTEES_MODULE,
]

export const ERP_MODULE_BY_ID = Object.fromEntries(
  ERP_MODULE_REGISTRY.map((m) => [m.id, m]),
) as Record<string, ErpModuleMirrorConfig>
