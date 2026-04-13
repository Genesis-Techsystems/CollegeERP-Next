import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FuseSharedModule } from '@fuse/shared.module';
import { TranslateModule } from '@ngx-translate/core';
import { MaterialModule } from '@fuse/material.module';
import { MaterialTimeControlModule } from 'app/main/utils/material-time-control.module';
import { NgxMaterialTimepickerModule } from 'ngx-material-timepicker';
import { CrudService } from 'app/main/services/crud.service';
import { GenericFunctions } from 'app/main/common/generic-functions';
import { FuseSidebarService } from '@fuse/components/sidebar/sidebar.service';
import { InternalMarksEntryComponent } from './internal-marks-entry/internal-marks-entry.component';
import { MarksEditModalComponent } from './internal-marks-entry/marks-edit-modal/marks-edit-modal.component';
import { ExamAttendanceMarkingComponent } from './exam-attendance-marking/exam-attendance-marking.component';
import { InternalExamsAvgComponent } from './internal-exams-avg/internal-exams-avg.component';
import { MarksMemoGenerationComponent } from './marks-memo-generation/marks-memo-generation.component';
import { MarksMemoIssueComponent } from './marks-memo-issue/marks-memo-issue.component';
import { ExamMarksUpdateComponent } from './exam-marks-update/exam-marks-update.component';
import { NotRegisteredStudentsComponent } from './exam-marks-update/not-registered-students/not-registered-students.component';
import { MidMarksEntryComponent } from './mid-marks-entry/mid-marks-entry.component';
import { PostExamReportsComponent } from './post-exam-reports/post-exam-reports.component';
import { ModerationMarksComponent } from './moderation-marks/moderation-marks.component';
import { ViewModerationModalComponent } from './moderation-marks/view-moderation-modal/view-moderation-modal.component';
import { MarksMemoPrintComponent } from './marks-memo-issue/marks-memo-print/marks-memo-print.component';
import { PrintAttendenceMarkingSheetComponent } from './exam-attendance-marking/print-attendence-marking-sheet/print-attendence-marking-sheet.component';
import { PrintBarcodeStickersComponent } from './exam-attendance-marking/print-barcode-stickers/print-barcode-stickers.component';
import { ViewExamMarksComponent } from './view-exam-marks/view-exam-marks.component';
import { InternalExamEntriesComponent } from './internal-exam-entries/internal-exam-entries.component';
import { ReEvaluationMarksEntryComponent } from './re-evaluation-marks-entry/re-evaluation-marks-entry.component';
import { FinalizeReEvaluationMarksEntryComponent } from './finalize-re-evaluation-marks-entry/finalize-re-evaluation-marks-entry.component';
import { GradeMemoIssueComponent } from './grade-memo-issue/grade-memo-issue.component';
import { SecureExamMarksEntryComponent } from './secure-exam-marks-entry/secure-exam-marks-entry.component';
import { EvterSecureCodeComponent } from './secure-exam-marks-entry/evter-secure-code/evter-secure-code.component';
import { ExamMarksEntryComponent } from './exam-marks-entry/exam-marks-entry.component';
import { CompleteExamProcessComponent } from './complete-exam-process/complete-exam-process.component';
import { VerifyExamStatusComponent } from './verify-exam-status/verify-exam-status.component';
import { VerifyExamMarksComponent } from './verify-exam-marks/verify-exam-marks.component';
import { RevaluationResultsSheetsComponent } from './revaluation-results-sheets/revaluation-results-sheets.component';
import { GradeCardModalComponent } from './grade-memo-issue/grade-card-modal/grade-card-modal.component';
import { ExamAttendanceMarksEntryComponent } from './exam-attendance-marks-entry/exam-attendance-marks-entry.component';
import { ExternalExamAttendanceMarkingComponent } from './external-exam-attendance-marking/external-exam-attendance-marking.component';
import { StaffInternalMarksEntryComponent } from './staff-internal-marks-entry/staff-internal-marks-entry.component';
import { StaffInternalAttendanceMarkingComponent } from './staff-internal-attendance-marking/staff-internal-attendance-marking.component';


const routes = [
  {
    path: 'internal-marks-entry',
    component: InternalMarksEntryComponent
  },
  {
    path: 'exam-attendance-marking',
    component: ExamAttendanceMarkingComponent
  },
  {
    path: 'internal-exams-avg',
    component: InternalExamsAvgComponent
  },
  {
    path: 'marks-memo-generation',
    component: MarksMemoGenerationComponent
  },
  {
    path: 'marks-memo-issue',
    component: MarksMemoIssueComponent
  },
  {
    path: 'exam-marks-update',
    component: ExamMarksUpdateComponent
  },
  {
    path: 'mid-marks-entry',
    component: MidMarksEntryComponent
  },
  {
    path:'post-exam-reports',
    component:PostExamReportsComponent
  },
  {
    path:'moderation-marks',
    component:ModerationMarksComponent
  },
  {
    path:'marks-memo-issue/memo-print',
    component:MarksMemoPrintComponent
  },

  {
    path:'exam-attendance-marking-sheet/print-exam-attendance-marking-sheet',
    component:PrintAttendenceMarkingSheetComponent
  },
  {
    path:'exam-attendance-marking-sheet/print-barcode-stickers',
    component:PrintBarcodeStickersComponent
  },
  {
    path:'view-exam-marks',
    component:ViewExamMarksComponent
  }, 
  {
    path: 'internal-exam-entries',
    component: InternalExamEntriesComponent
  },
  {
    path: 're-evaluation-marks-entry',
    component: ReEvaluationMarksEntryComponent
  },
  {
    path: 'finalize-re-evaluation-marks-entry',
    component: FinalizeReEvaluationMarksEntryComponent
  },
  {
    path: 'grade-memo-issue',
    component: GradeMemoIssueComponent
  } , 
  {
    path: 'secure-exam-marks-entry',
    component: SecureExamMarksEntryComponent
  },
  {
    path: 'exam-marks-entry',
    component: ExamMarksEntryComponent
  },
  {
    path: 'complete-exam-process',
    component: CompleteExamProcessComponent
  },
  {
    path: 'verify-exam-status',
    component: VerifyExamStatusComponent
  },
  {
    path: 'verify-exam-marks',
    component: VerifyExamMarksComponent
  },
  {
    path: 'revaluation-results-sheets',
    component: RevaluationResultsSheetsComponent
  },
  {
    path: 'grade-memo-issue/grade-memo-modal',
    component: GradeCardModalComponent
  } ,
  { 
    path: 'exam-attendance-marks-entry',
    component: ExamAttendanceMarksEntryComponent
  },
  {
    path:'external-exam-attendance-marks-entry',
    component: ExternalExamAttendanceMarkingComponent
  },
  {
    path: 'staff-internal-marks-entry',
    component: StaffInternalMarksEntryComponent
  },
  {
    path: 'staff-internal-attendance-marking',
    component: StaffInternalAttendanceMarkingComponent
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
    InternalMarksEntryComponent,
    MarksEditModalComponent,
    ExamAttendanceMarkingComponent,
    InternalExamsAvgComponent,
    MarksMemoGenerationComponent,
    MarksMemoIssueComponent,
    ExamMarksUpdateComponent,
    NotRegisteredStudentsComponent,
    MidMarksEntryComponent,
    PostExamReportsComponent,
    ModerationMarksComponent,
    ViewModerationModalComponent,
    MarksMemoPrintComponent,
    PrintAttendenceMarkingSheetComponent,
    PrintBarcodeStickersComponent,
    ViewExamMarksComponent,
    InternalExamEntriesComponent,
    ReEvaluationMarksEntryComponent,
    FinalizeReEvaluationMarksEntryComponent,
    GradeMemoIssueComponent,
    SecureExamMarksEntryComponent,
    EvterSecureCodeComponent,
    ExamMarksEntryComponent,
    VerifyExamMarksComponent,
    CompleteExamProcessComponent,
    VerifyExamStatusComponent,
    RevaluationResultsSheetsComponent,
    GradeCardModalComponent,
    ExamAttendanceMarksEntryComponent,
    ExternalExamAttendanceMarkingComponent,
    StaffInternalMarksEntryComponent,
    StaffInternalAttendanceMarkingComponent
              ],
  entryComponents: [
    MarksEditModalComponent,
    NotRegisteredStudentsComponent
  ],
  schemas: [
     CUSTOM_ELEMENTS_SCHEMA
  ],
  providers: [CrudService, GenericFunctions, DatePipe]

})
export class PostExaminationModule { 
  constructor(
    private _fuseSidebarService: FuseSidebarService,
)
{
    this._fuseSidebarService.getSidebar('navbar').toggleOpen();
}
 }

