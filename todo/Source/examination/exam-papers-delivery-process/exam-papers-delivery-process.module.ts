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
    ExamCenterGroupStickersComponent
   
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
