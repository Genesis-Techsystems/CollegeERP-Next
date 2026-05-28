import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MaterialModule } from '@fuse/material.module';
import { FuseSharedModule } from '@fuse/shared.module';
import { TranslateModule } from '@ngx-translate/core';
import { MaterialTimeControlModule } from 'app/main/utils/material-time-control.module';
import { NgxMaterialTimepickerModule } from 'ngx-material-timepicker';
import { GenericFunctions } from 'app/main/common/generic-functions';
import { CrudService } from 'app/main/services/crud.service';
import { FuseSidebarService } from '@fuse/components/sidebar/sidebar.service';
import { UnivExamRegionalCentersComponent } from './univ-exam-regional-centers/univ-exam-regional-centers.component';
import { UnivExamCentersComponent } from './univ-exam-centers/univ-exam-centers.component';
import { UnivExamcenterCollegesComponent } from './univ-examcenter-colleges/univ-examcenter-colleges.component';
import { UnivExamCenterRoomsComponent } from './univ-exam-center-rooms/univ-exam-center-rooms.component';
import { UnivExamcenterStudentsComponent } from './univ-examcenter-students/univ-examcenter-students.component';
import { UniversityExamCenterProfilesComponent } from './university-exam-center-profiles/university-exam-center-profiles.component';
import { UnivExamBundlesComponent } from './univ-exam-bundles/univ-exam-bundles.component';
import { UnivExamBagsComponent } from './univ-exam-bags/univ-exam-bags.component';
import { UnivExamAnswerPaperBagsComponent } from './univ-exam-answer-paper-bags/univ-exam-answer-paper-bags.component';
import { UnivExamBagTransportationComponent } from './univ-exam-bag-transportation/univ-exam-bag-transportation.component';
import { UnivExamBagCollectionComponent } from './univ-exam-bag-collection/univ-exam-bag-collection.component';
import { UnivExamcenterQuestionPaperConfigComponent } from './univ-examcenter-question-paper-config/univ-examcenter-question-paper-config.component';
import { AddUnivExamRegionalCenterComponent } from './univ-exam-regional-centers/add-univ-exam-regional-center/add-univ-exam-regional-center.component';
import { AddUnivExamCentersComponent } from './univ-exam-centers/add-univ-exam-centers/add-univ-exam-centers.component';
import { AddExamBundlesComponent } from './univ-exam-bundles/add-exam-bundles/add-exam-bundles.component';
import { AddExamBagCollectionComponent } from './univ-exam-bag-collection/add-exam-bag-collection/add-exam-bag-collection.component';
import { ConfigModalComponent } from './univ-examcenter-question-paper-config/config-modal/config-modal.component';
import { UnivExamBagsModalComponent } from './univ-exam-bags/univ-exam-bags-modal/univ-exam-bags-modal.component';
import { ExamBagTrasportationModalComponent } from './univ-exam-bag-transportation/exam-bag-trasportation-modal/exam-bag-trasportation-modal.component';
import { EditUnivExamcenterStudentsComponent } from './univ-examcenter-students/edit-univ-examcenter-students/edit-univ-examcenter-students.component';
import { ConfirmModalComponent } from './univ-exam-answer-paper-bags/confirm-modal/confirm-modal.component';
import { UpdateExamProfilesComponent } from './university-exam-center-profiles/update-exam-profiles/update-exam-profiles.component';
import { ExamCenterRoomsModalComponent } from './univ-exam-center-rooms/exam-center-rooms-modal/exam-center-rooms-modal.component';
import { EditUnivExamcenterCollegesComponent } from './univ-examcenter-colleges/edit-univ-examcenter-colleges/edit-univ-examcenter-colleges.component';
import { EditUnivExamAnswerPaperBagsComponent } from './univ-exam-answer-paper-bags/edit-univ-exam-answer-paper-bags/edit-univ-exam-answer-paper-bags.component';
import { ExamCenterCoursesComponent } from './exam-center-courses/exam-center-courses.component';
import { ExamCenterCoursesModalComponent } from './exam-center-courses/exam-center-courses-modal/exam-center-courses-modal.component';
import { ExamCenterBlocksComponent } from './exam-center-blocks/exam-center-blocks.component';
import { ExamCenterBuildingsComponent } from './exam-center-buildings/exam-center-buildings.component';
import { ExamCenterFloorsComponent } from './exam-center-floors/exam-center-floors.component';
import { ExamCenterRoomTypesComponent } from './exam-center-room-types/exam-center-room-types.component';
import { ExamCenterRoomsComponent } from './exam-center-rooms/exam-center-rooms.component';
import { ExamCenterBlocksModalComponent } from './exam-center-blocks/exam-center-blocks-modal/exam-center-blocks-modal.component';
import { ExamCenterBuildingsModalComponent } from './exam-center-buildings/exam-center-buildings-modal/exam-center-buildings-modal.component';
import { ExamCenterFloorsModalComponent } from './exam-center-floors/exam-center-floors-modal/exam-center-floors-modal.component';
import { ExamCenterRoomTypesModalComponent } from './exam-center-room-types/exam-center-room-types-modal/exam-center-room-types-modal.component';
import { AddExamCenterRoomsComponent } from './exam-center-rooms/add-exam-center-rooms/add-exam-center-rooms.component';
import { ExamCenterRoomAllotmentComponent } from './exam-center-room-allotment/exam-center-room-allotment.component';
import { ExamCenterAssignSeatingComponent } from './exam-center-room-allotment/exam-center-assign-seating/exam-center-assign-seating.component';
import { CenterRoomAllotmentComponent } from './exam-center-room-allotment/center-room-allotment/center-room-allotment.component';
import { ExamCenterExistingAllotmentComponent } from './exam-center-room-allotment/exam-center-existing-allotment/exam-center-existing-allotment.component';
import { ExamCenterRoomAllotmentModalComponent } from './exam-center-room-allotment/exam-center-room-allotment-modal/exam-center-room-allotment-modal.component';
import { ExamCenterSeatingorderComponent } from './exam-center-room-allotment/exam-center-room-allotment-modal/exam-center-seatingorder/exam-center-seatingorder.component';
import { ExamCenterSeatingStickersComponent } from './exam-center-room-allotment/exam-center-room-allotment-modal/exam-center-seating-stickers/exam-center-seating-stickers.component';
import { ExamCenterGroupStickersComponent } from './exam-center-room-allotment/exam-center-room-allotment-modal/exam-center-group-stickers/exam-center-group-stickers.component';
import { ExamScanProfileComponent } from './exam-scan-profile/exam-scan-profile.component';
import { CreateExamScanProfileComponent } from './exam-scan-profile/create-exam-scan-profile/create-exam-scan-profile.component';
import { ProfileDetailsComponent } from './exam-scan-profile/profile-details/profile-details.component';
import { ScanBundlesComponent } from './scan-bundles/scan-bundles.component';
import { ScanBundlesModalComponent } from './scan-bundles/scan-bundles-modal/scan-bundles-modal.component';
import { ScanBundlesStudentsModalComponent } from './scan-bundles/scan-bundles-students-modal/scan-bundles-students-modal.component';
import { ExamGroupComponent } from './exam-group/exam-group.component';
import { ExamGroupModalComponent } from './exam-group/exam-group-modal/exam-group-modal.component';
import { ExamGroupDetailsComponent } from './exam-group/exam-group-details/exam-group-details.component';
import { ScanBundleDetailsComponent } from './scan-bundles/scan-bundle-details/scan-bundle-details.component';
import { ScanBundleDetailsModalComponent } from './scan-bundles/scan-bundle-details/scan-bundle-details-modal/scan-bundle-details-modal.component';
import { ExamCenterBarcodesComponent } from './exam-center-barcodes/exam-center-barcodes.component';
import { PrintExamCenterBarcodesComponent } from './exam-center-barcodes/print-exam-center-barcodes/print-exam-center-barcodes.component';
import { ScanBundlesPrintStickersComponent } from './scan-bundles/scan-bundles-print-stickers/scan-bundles-print-stickers.component';
import { ExamSeatnoBarcodesComponent } from './exam-seatno-barcodes/exam-seatno-barcodes.component';
import { PrintExamSeatnoStickersComponent } from './exam-seatno-barcodes/print-exam-seatno-stickers/print-exam-seatno-stickers.component';
import { ExamScanBundlesPrintComponent } from './exam-scan-bundles-print/exam-scan-bundles-print.component';
import { ExamScanBundlePrintStickersComponent } from './exam-scan-bundles-print/exam-scan-bundle-print-stickers/exam-scan-bundle-print-stickers.component';
import { ExamBundlePrintComponent } from './exam-bundle-print/exam-bundle-print.component';
import { ExamBundlePrintStickersComponent } from './exam-bundle-print/exam-bundle-print-stickers/exam-bundle-print-stickers.component';
import { ExamModalComponentComponent } from './exam-scan-bundles-print/exam-modal-component/exam-modal-component.component';
import { ScanBundleDetailsNewComponent } from './exam-scan-bundles-print/scan-bundle-details-new/scan-bundle-details-new.component';
import { ScanBundleDetailsNewModalComponent } from './exam-scan-bundles-print/scan-bundle-details-new/scan-bundle-details-new-modal/scan-bundle-details-new-modal.component';
import { ExamScanBundlesPrintSticketsGuComponent } from './exam-scan-bundles-print/exam-scan-bundles-print-stickets-gu/exam-scan-bundles-print-stickets-gu.component';
import { ExamSeatnoBarcodesStickersGuComponent } from './exam-seatno-barcodes/exam-seatno-barcodes-stickers-gu/exam-seatno-barcodes-stickers-gu.component';
import { PrintExamCenterBarcodesGuComponent } from './exam-center-barcodes/print-exam-center-barcodes-gu/print-exam-center-barcodes-gu.component';
import { ExamCenterSubjectAttendanceComponent } from './exam-center-subject-attendance/exam-center-subject-attendance.component';
import { ExamBundlePrintStickersGuComponent } from './exam-bundle-print/exam-bundle-print-stickers-gu/exam-bundle-print-stickers-gu.component';


const routes = [
  {
    path:'univ-exam-regional-centers',
    component:UnivExamRegionalCentersComponent,
  },
  {
    path:'univ-exam-centers',
    component:UnivExamCentersComponent,
  },
  {
    path:'univ-examcenter-colleges',
    component:UnivExamcenterCollegesComponent,
  },
  {
    path:'univ-exam-center-rooms',
    component:UnivExamCenterRoomsComponent,
  },
  {
    path:'univ-examcenter-students',
    component:UnivExamcenterStudentsComponent,
  },
  {
    path:'university-exam-center-profiles',
    component:UniversityExamCenterProfilesComponent,
  },
  {
    path:'univ-exam-bundles',
    component:UnivExamBundlesComponent,
  },
  {
    path:'univ-exam-bags',
    component:UnivExamBagsComponent,
  },
  {
    path:'univ-exam-answer-paper-bags',
    component:UnivExamAnswerPaperBagsComponent,
  },
  {
    path:'univ-exam-bag-transportation',
    component:UnivExamBagTransportationComponent,
  },
  {
    path:'univ-exam-bag-collection',
    component:UnivExamBagCollectionComponent,
  },
  {
    path:'univ-examcenter-question-paper-config',
    component:UnivExamcenterQuestionPaperConfigComponent,
  },
  {
    path:'exam-center-courses',
    component:ExamCenterCoursesComponent,
  },
  {
    path: 'buildings',
    component:ExamCenterBuildingsComponent
  },
  {
    path:'blocks',
    component: ExamCenterBlocksComponent
  },
  {
    path:'floors',
    component: ExamCenterFloorsComponent
  },
  {
    path:'rooms-type',
    component:ExamCenterRoomTypesComponent
  },
  {
    path:'rooms',
    component:ExamCenterRoomsComponent
  },
  {
    path: 'exam-center-seating-plan',
    component: ExamCenterRoomAllotmentComponent
  },
  {
    path: 'exam-center-seating-plan/add-exam-center-allotment',
    component: ExamCenterRoomAllotmentModalComponent
   },
   {
    path: 'exam-center-seating-plan/add-exam-center-allotment/print-seating-stickers',
    component: ExamCenterSeatingStickersComponent
   },
   {
    path: 'exam-center-seating-plan/add-exam-center-allotment/print-group-seating-stickers',
    component: ExamCenterGroupStickersComponent
   },
   {
    path: 'exam-center-seating-plan/center-room-allotment',
    component: CenterRoomAllotmentComponent
   },
   {
    path: 'exam-center-seating-plan/copy-existing-seating',
    component: ExamCenterExistingAllotmentComponent
   },
   {
    path: 'exam-scan-profile',
    component: ExamScanProfileComponent
   },
   {
    path: 'exam-scan-profile/profile-details',
    component: ProfileDetailsComponent
   },
   {
    path: 'scan-bundles',
    component: ScanBundlesComponent
   },
   {
    path: 'exam-group',
    component: ExamGroupComponent
   },
   {
    path: 'exam-group/exam-group-details',
    component: ExamGroupDetailsComponent
   },
   {
    path: 'scan-bundle-details',
    component: ScanBundleDetailsComponent
   },
   {
    path: 'exam-center-barcodes',
    component: ExamCenterBarcodesComponent
   },
   {
    path: 'exam-center-barcodes/print-barcodes',
    component: PrintExamCenterBarcodesComponent
   },
   {
    path: 'scan-bundles/print-stickers',
    component: ScanBundlesPrintStickersComponent
   },
   {
    path: 'exam-seatno-barcodes',
    component: ExamSeatnoBarcodesComponent
   },
   {
    path: 'exam-seatno-barcodes/print-exam-seatno-stickers',
    component: PrintExamSeatnoStickersComponent
   },
   {
    path: 'exam-scan-bundle-print',
    component: ExamScanBundlesPrintComponent
   },
   {
    path: 'exam-scan-bundle-print/exam-scan-bundle-print-stickers',
    component: ExamScanBundlePrintStickersComponent
   },
   {
    path: 'exam-bundle-print',
    component: ExamBundlePrintComponent
   },
   {
    path: 'exam-bundle-print/exam-bundle-print-stickers',
    component: ExamBundlePrintStickersComponent
   },
   {
    path: 'scan-bundle-details-new',
    component: ScanBundleDetailsNewComponent
   },
   {
    path: 'exam-scan-bundle-print/exam-scan-bundle-print-stickers-gu',
    component: ExamScanBundlesPrintSticketsGuComponent
   },
   {
    path: 'exam-seatno-barcodes/print-exam-seatno-stickers-gu',
    component:ExamSeatnoBarcodesStickersGuComponent
   },
   {
    path: 'exam-center-barcodes/print-barcodes-gu',
    component: PrintExamCenterBarcodesGuComponent
   },
   {
    path: 'exam-center-subject-attendance',
    component: ExamCenterSubjectAttendanceComponent
   },
   {
    path: 'exam-bundle-print/exam-bundle-print-stickers-gu',
    component: ExamBundlePrintStickersGuComponent
   }
]
@NgModule({
  declarations: [
    UnivExamRegionalCentersComponent,
    AddUnivExamRegionalCenterComponent,
    AddUnivExamCentersComponent,
    UnivExamCentersComponent,
    UnivExamBundlesComponent,
    AddExamBundlesComponent,
    UnivExamBagCollectionComponent,
    AddExamBagCollectionComponent,
    UnivExamcenterQuestionPaperConfigComponent,
    ConfigModalComponent,
    UnivExamBagsModalComponent,
    UnivExamBagsComponent,
    ExamBagTrasportationModalComponent,
    UnivExamAnswerPaperBagsComponent,
    UnivExamBagTransportationComponent,
    UniversityExamCenterProfilesComponent,
    UnivExamcenterStudentsComponent,
    EditUnivExamcenterStudentsComponent,
    UnivExamcenterCollegesComponent,
    UnivExamCenterRoomsComponent,
    ConfirmModalComponent,
    UpdateExamProfilesComponent,
    EditUnivExamcenterCollegesComponent,
    EditUnivExamAnswerPaperBagsComponent,
    ExamCenterRoomsModalComponent,
    ExamCenterCoursesComponent,
    ExamCenterCoursesModalComponent,
    ExamCenterBlocksComponent,
    ExamCenterBuildingsComponent,
    ExamCenterFloorsComponent,
    ExamCenterRoomTypesComponent,
    ExamCenterRoomsComponent,
    ExamCenterBlocksModalComponent,
    ExamCenterBuildingsModalComponent,
    ExamCenterFloorsModalComponent,
    ExamCenterRoomTypesModalComponent,
    AddExamCenterRoomsComponent,
    ExamCenterRoomAllotmentComponent,
    ExamCenterAssignSeatingComponent,
    CenterRoomAllotmentComponent,
    ExamCenterExistingAllotmentComponent,
    ExamCenterRoomAllotmentModalComponent,
    ExamCenterSeatingorderComponent,
    ExamCenterSeatingStickersComponent,
    ExamCenterGroupStickersComponent,
    ExamScanProfileComponent,
    CreateExamScanProfileComponent,
    ProfileDetailsComponent,
    ScanBundlesComponent,
    ScanBundlesModalComponent,
    ScanBundlesStudentsModalComponent,
    ExamGroupComponent,
    ExamGroupModalComponent,
    ExamGroupDetailsComponent,
    ScanBundleDetailsComponent,
    ScanBundleDetailsModalComponent,
    ExamCenterBarcodesComponent,
    PrintExamCenterBarcodesComponent,
    ScanBundlesPrintStickersComponent,
    ExamSeatnoBarcodesComponent,
    PrintExamSeatnoStickersComponent,
    ExamScanBundlesPrintComponent,
    ExamScanBundlePrintStickersComponent,
    ExamBundlePrintComponent,
    ExamModalComponentComponent,
    ScanBundleDetailsNewComponent,
    ScanBundleDetailsNewModalComponent,
    ExamBundlePrintStickersComponent,
    ExamScanBundlesPrintSticketsGuComponent,
    ExamSeatnoBarcodesStickersGuComponent,
    ExamCenterSubjectAttendanceComponent,
    ExamBundlePrintStickersGuComponent
      ],
  imports: [
    RouterModule.forChild(routes),
    FuseSharedModule,
    TranslateModule,
    MaterialModule,
    MaterialTimeControlModule,
    NgxMaterialTimepickerModule,
],
schemas: [
  CUSTOM_ELEMENTS_SCHEMA
],
providers: [CrudService, GenericFunctions, DatePipe]

})
export class ExamPapersDeliveryProcessModule { 
  constructor(
    private _fuseSidebarService: FuseSidebarService,
)
{
    this._fuseSidebarService.getSidebar('navbar').toggleOpen();
}
}
