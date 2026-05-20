import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { FuseSidebarService } from '@fuse/components/sidebar/sidebar.service';
import { MaterialModule } from '@fuse/material.module';
import { FuseSharedModule } from '@fuse/shared.module';
import { TranslateModule } from '@ngx-translate/core';
import { GenericFunctions } from 'app/main/common/generic-functions';
import { CrudService } from 'app/main/services/crud.service';
import { MaterialTimeControlModule } from 'app/main/utils/material-time-control.module';
import { NgxMaterialTimepickerModule } from 'ngx-material-timepicker';
import { ExamFeeStructureModalComponent } from './exam-fee-structure/exam-fee-structure-modal/exam-fee-structure-modal.component';
import { ExamFeeStructureComponent } from './exam-fee-structure/exam-fee-structure.component';
import { ViewExamFeeStructureComponent } from './exam-fee-structure/view-exam-fee-structure/view-exam-fee-structure.component';
import { ExamGradesModalComponent } from './exam-grades/exam-grades-modal/exam-grades-modal.component';
import { ExamGradesComponent } from './exam-grades/exam-grades.component';
import { ExamMasterModalComponent } from './exam-master/exam-master-modal/exam-master-modal.component';
import { ExamMasterComponent } from './exam-master/exam-master.component';
import { ExamRoomAllotmentModalComponent } from './exam-room-allotment/exam-room-allotment-modal/exam-room-allotment-modal.component';
import { SeatingOrderComponent } from './exam-room-allotment/exam-room-allotment-modal/seating-order/seating-order.component';
import { ExamRoomAllotmentComponent } from './exam-room-allotment/exam-room-allotment.component';
import { ExamSessionsModalComponent } from './exam-sessions/exam-sessions-modal/exam-sessions-modal.component';
import { ExamSessionsComponent } from './exam-sessions/exam-sessions.component';
import { AddExamTimetableComponent } from './exam-timetable/add-exam-timetable/add-exam-timetable.component';
import { ExamTimetableComponent } from './exam-timetable/exam-timetable.component';
import { MarksSetupComponent } from './marks-setup/marks-setup.component';
import { EditExamTimetableComponent } from './exam-timetable/edit-exam-timetable/edit-exam-timetable.component';
import { ExistingExamTimetableComponent } from './exam-timetable/add-exam-timetable/existing-exam-timetable/existing-exam-timetable.component';
import { MarksSetupModalComponent } from './marks-setup/marks-setup-modal/marks-setup-modal.component';
import { InvigilatorRemunerationComponent } from './invigilator-remuneration/invigilator-remuneration.component';
import { InvigilatorRemunerationModalComponent } from './invigilator-remuneration/invigilator-remuneration-modal/invigilator-remuneration-modal.component';
import { RevisionMasterComponent } from './revision-master/revision-master.component';
import { AddRevisionMasterComponent } from './revision-master/add-revision-master/add-revision-master.component';
import { SetupMasterComponent } from './setup-master/setup-master.component';
import { AddSetupComponent } from './setup-master/add-setup/add-setup.component';
import { RoomAllotmentComponent } from './exam-room-allotment/room-allotment/room-allotment.component';
import { ExistingAllotmentComponent } from './exam-room-allotment/existing-allotment/existing-allotment.component';
import { ExamReValuationFeeSetupComponent } from './exam-re-valuation-fee-setup/exam-re-valuation-fee-setup.component';
import { ViewReValuationFeesetupComponent } from './exam-re-valuation-fee-setup/view-re-valuation-feesetup/view-re-valuation-feesetup.component';
import { ExamReValuationFeeSetupModalComponent } from './exam-re-valuation-fee-setup/exam-re-valuation-fee-setup-modal/exam-re-valuation-fee-setup-modal.component';
import { CheckConflictsModalComponent } from './exam-timetable/check-conflicts-modal/check-conflicts-modal.component';
import { AssignSeatingComponent } from './exam-room-allotment/assign-seating/assign-seating.component';
import { ExamTtNotificationComponent } from './exam-tt-notification/exam-tt-notification.component';
import { SendTtNotificationComponent } from './exam-tt-notification/send-tt-notification/send-tt-notification.component';
import { ExamLabBatchesComponent } from './exam-lab-batches/exam-lab-batches.component';
import { ExamLabBatchModalComponent } from './exam-lab-batches/exam-lab-batch-modal/exam-lab-batch-modal.component';
import { ExamLabTimetableComponent } from './exam-lab-timetable/exam-lab-timetable.component';
import { AddExamTimetablesComponent } from './exam-lab-timetable/add-exam-timetables/add-exam-timetables.component';
import { ExistingExamTimetablesComponent } from './exam-lab-timetable/add-exam-timetables/existing-exam-timetables/existing-exam-timetables.component';
import { EditExamTimetablesComponent } from './exam-lab-timetable/edit-exam-timetables/edit-exam-timetables.component';
import { CheckConflictsModalsComponent } from './exam-lab-timetable/check-conflicts-modals/check-conflicts-modals.component';
import { PrintSeatingStickersComponent } from './exam-room-allotment/exam-room-allotment-modal/print-seating-stickers/print-seating-stickers.component';
import { PrintGroupwiseSeatingStickersComponent } from './exam-room-allotment/exam-room-allotment-modal/print-groupwise-seating-stickers/print-groupwise-seating-stickers.component';
import { ExamMasterDetailsComponent } from './exam-master/exam-master-details/exam-master-details.component';

const routes = [
  {
    path: 'exam-max-marks-setup',
    component: MarksSetupComponent
  },
  {
    path: 'grade-setup',
    component: ExamGradesComponent
  },
  {
    path: 'exam-session',
    component: ExamSessionsComponent
  },
  {
    path: 'exam-fee-setup',
    component: ExamFeeStructureComponent
  }
  , {
    path: 'exam-fee-setup/add-exam-fee-structure',
    component: ExamFeeStructureModalComponent
  }
  , {
    path: 'seating-plan-setup',
    component: ExamRoomAllotmentComponent
  },
  {
    path: 'seating-plan-setup/add-exam-room-allotment',
    component: ExamRoomAllotmentModalComponent
   },
   {
    path: 'seating-plan-setup/add-exam-room-allotment/print-seating-stickers',
    component: PrintSeatingStickersComponent
   },
   {
    path: 'seating-plan-setup/add-exam-room-allotment/print-group-seating-stickers',
    component: PrintGroupwiseSeatingStickersComponent
   },
   {
    path: 'seating-plan-setup/room-allotment',
    component: RoomAllotmentComponent
   },
   {
    path: 'seating-plan-setup/copy-existing-seating',
    component: ExistingAllotmentComponent
    
   },
  {
    path: 'exam-master',
    component: ExamMasterComponent
  },
  {
    path: 'exam-timetable',
    component: ExamTimetableComponent
  }, 
  {
    path: 'invigilator-remuneration',
    component: InvigilatorRemunerationComponent
  },
   {
    path: 'exam-timetable/add-exam-timetable',
    component: AddExamTimetableComponent
  },
  {
    path: 'revision-master',
    component: RevisionMasterComponent
  },
  {
    path: 'setup-master',
    component: SetupMasterComponent
  },
  {
    path: 'revaluation-fee-setup',
    component: ExamReValuationFeeSetupComponent
  },
  {
    path: 'revaluation-fee-setup/revaluation-fee-setup-modal',
    component: ExamReValuationFeeSetupModalComponent
  },
  {
    path: 'exam-timetable-notification',
    component: ExamTtNotificationComponent
  },
  {
    path: 'exam-lab-batches',
    component: ExamLabBatchesComponent
  },
  {
    path: 'exam-lab-timetable',
    component: ExamLabTimetableComponent
  },
  {
    path: 'exam-lab-timetable/add-exam-timetables',
    component: AddExamTimetablesComponent
  },
  {
    path: 'exam-master/exam-master-details',
    component: ExamMasterDetailsComponent
  }
];

@NgModule({
  imports: [
      RouterModule.forChild(routes),
      FuseSharedModule,
      TranslateModule,
      MaterialModule,
      MaterialTimeControlModule,
      NgxMaterialTimepickerModule,
  ],
  declarations: [
    MarksSetupComponent,       
    ExamGradesComponent,  
    ExamGradesModalComponent,  
    ExamSessionsComponent  ,
    ExamSessionsModalComponent,
    ExamFeeStructureComponent,
    ViewExamFeeStructureComponent,
    ExamFeeStructureModalComponent,
    ExamRoomAllotmentComponent,
    SeatingOrderComponent,
    ExamRoomAllotmentModalComponent,
    ExamMasterModalComponent,
    ExamMasterComponent,
    ExamTimetableComponent,
    AddExamTimetableComponent,
    EditExamTimetableComponent,
    ExistingExamTimetableComponent,
    MarksSetupModalComponent,
    InvigilatorRemunerationComponent, 
    InvigilatorRemunerationModalComponent, 
    RevisionMasterComponent, 
    AddRevisionMasterComponent,
    SetupMasterComponent, 
    ExamReValuationFeeSetupComponent,
    AddSetupComponent,
    RoomAllotmentComponent, 
    ExistingAllotmentComponent,
    ViewReValuationFeesetupComponent,
    ExamReValuationFeeSetupModalComponent,
    CheckConflictsModalComponent,
    AssignSeatingComponent,
    ExamTtNotificationComponent,
    SendTtNotificationComponent,
    ExamLabBatchesComponent,
    ExamLabBatchModalComponent,
    ExamLabTimetableComponent,
    AddExamTimetablesComponent,
    ExistingExamTimetablesComponent,
    EditExamTimetablesComponent,
    CheckConflictsModalsComponent,
    PrintSeatingStickersComponent,
    PrintGroupwiseSeatingStickersComponent,
    ExamMasterDetailsComponent
              ],
  entryComponents: [
    ExamGradesModalComponent,
    ExamSessionsModalComponent,
    ViewExamFeeStructureComponent,
    SeatingOrderComponent,
    ExamMasterModalComponent,
    EditExamTimetableComponent,
    ExistingExamTimetableComponent,
    InvigilatorRemunerationModalComponent,  
    AddRevisionMasterComponent,

    AddSetupComponent
  ],
  schemas: [
     CUSTOM_ELEMENTS_SCHEMA
  ],
  providers: [CrudService, GenericFunctions]

})
export class ExamMastersModule { 
  constructor(
    private _fuseSidebarService: FuseSidebarService,
)
{
    this._fuseSidebarService.getSidebar('navbar').toggleOpen();
}
 }
