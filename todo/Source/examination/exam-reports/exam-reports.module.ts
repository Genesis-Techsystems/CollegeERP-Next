import { Component, NgModule } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { StudentExamReportsComponent } from './student-exam-reports/student-exam-reports.component';
import { RouterModule } from '@angular/router';
import { FuseSharedModule } from '@fuse/shared.module';
import { TranslateModule } from '@ngx-translate/core';
import { MaterialModule } from '@fuse/material.module';
import { CrudService } from 'app/main/services/crud.service';
import { GenericFunctions } from 'app/main/common/generic-functions';
import { ExamTimetableReportComponent } from './exam-timetable-report/exam-timetable-report.component';
import { ExamResultReportComponent } from './exam-result-report/exam-result-report.component';
import { InvigilatorAllotmentReportComponent } from './invigilator-allotment-report/invigilator-allotment-report.component';
import { ExamStudentRegistrationReportComponent } from './exam-student-registration-report/exam-student-registration-report.component';
import { ExamStudentSummaryReportComponent } from './exam-student-summary-report/exam-student-summary-report.component';
import { ExamStudentResultDetailsReportComponent } from './exam-student-result-details-report/exam-student-result-details-report.component';
import { StudentBacklogReportComponent } from './student-backlog-report/student-backlog-report.component';
import { StudentCreditsReportComponent } from './student-credits-report/student-credits-report.component';
import { CourseYearTimetableReportComponent } from './course-year-timetable-report/course-year-timetable-report.component';
import { PivotViewModule, ToolbarService } from '@syncfusion/ej2-angular-pivotview';
import { GridModule } from '@angular/flex-layout/grid';
import { PageService, SortService, FilterService, GridAllModule, GroupService, PdfExportService } from '@syncfusion/ej2-angular-grids';
 
import { ExamNaacReportComponent } from './exam-naac-report/exam-naac-report.component';
import { ConsolidatedMarksReportComponent } from './consolidated-marks-report/consolidated-marks-report.component';
import { AssignmentPendingListComponent } from './assignment-pending-list/assignment-pending-list.component';
import { PrintConsolidatedMemoComponent } from './consolidated-marks-report/print-consolidated-memo/print-consolidated-memo.component';
import { ExamDetailStatusComponent } from './exam-detail-status/exam-detail-status.component';
import { ExamRoomAllotmentReportComponent } from './exam-room-allotment-report/exam-room-allotment-report.component';
import { ExamModerationReportsComponent } from './exam-moderation-reports/exam-moderation-reports.component';
import { ExamGracemarksReportsComponent } from './exam-gracemarks-reports/exam-gracemarks-reports.component';
import { InternalMarksEntryComponent } from './internal-marks-entry/internal-marks-entry.component';
import { GroupSubjectwiseResultReportComponent } from './group-subjectwise-result-report/group-subjectwise-result-report.component';
import { SubjectGradewiseResultReportComponent } from './subject-gradewise-result-report/subject-gradewise-result-report.component';
import { FinalResultAnalysisComponent } from './final-result-analysis/final-result-analysis.component';
import { ExternalLabMarksEnteredComponent } from './external-lab-marks-entered/external-lab-marks-entered.component';
import { FinalMarksPremoderationComponent } from './final-marks-premoderation/final-marks-premoderation.component';
import { SubjectwiseResultReportComponent } from './subjectwise-result-report/subjectwise-result-report.component';
import { GroupYearwiseResultReportComponent } from './group-yearwise-result-report/group-yearwise-result-report.component';
import { ExamResultSheetComponent } from './exam-result-sheet/exam-result-sheet.component';
import { TabulationRegistrationComponent } from './tabulation-registration/tabulation-registration.component';
import { ReevaluationStudentsReportComponent } from './reevaluation-students-report/reevaluation-students-report.component';
import { EvaluatorsBankCopyReportComponent } from './evaluators-bank-copy-report/evaluators-bank-copy-report.component';
import { DailyEvaluatedReportComponent } from './daily-evaluated-report/daily-evaluated-report.component';
import { EvaluatorAnswerSheetsComponent } from './daily-evaluated-report/evaluator-answer-sheets/evaluator-answer-sheets.component';
import { ExamAnswerSheetsReportComponent } from './exam-answer-sheets-report/exam-answer-sheets-report.component';
import { ExamEvaluationReportComponent } from './exam-evaluation-report/exam-evaluation-report.component';
import { ViewAnswerSheetsComponent } from './exam-evaluation-report/view-answer-sheets/view-answer-sheets.component';
import { ExamVerificationComponent } from './exam-verification/exam-verification.component';
import { SubjectWiseEvaluatorsReportComponent } from './subject-wise-evaluators-report/subject-wise-evaluators-report.component';
import { JntuBeforeModerationReportComponent } from './jntu-before-moderation-report/jntu-before-moderation-report.component';
import { JntuAfterModerationReportComponent } from './jntu-after-moderation-report/jntu-after-moderation-report.component';
import { JntuModerationAnalysisReportComponent } from './jntu-moderation-analysis-report/jntu-moderation-analysis-report.component';
import { JntuModerationBenefitedListComponent } from './jntu-moderation-benefited-list/jntu-moderation-benefited-list.component';
import { JntuGraftingListComponent } from './jntu-grafting-list/jntu-grafting-list.component';
import { JntuGraftingAnalysisReportComponent } from './jntu-grafting-analysis-report/jntu-grafting-analysis-report.component';
import { JntuResultAnalysisReportComponent } from './jntu-result-analysis-report/jntu-result-analysis-report.component';
import { JntuTrMarksBeforeModerationComponent } from './jntu-tr-marks-before-moderation/jntu-tr-marks-before-moderation.component';
import { JntuTrMarksBeforeGraftingComponent } from './jntu-tr-marks-before-grafting/jntu-tr-marks-before-grafting.component';
import { JntuTSheetComponent } from './jntu-t-sheet/jntu-t-sheet.component';
import { ExamcenterCollegesReportComponent } from './examcenter-colleges-report/examcenter-colleges-report.component';
import { ExamcenterRoomsReportComponent } from './examcenter-rooms-report/examcenter-rooms-report.component';
import { ExamcenterStudentsReportComponent } from './examcenter-students-report/examcenter-students-report.component';
import { ExamcenterProfilesReportComponent } from './examcenter-profiles-report/examcenter-profiles-report.component';
import { ExamcenterAnswerpaperBagsReportComponent } from './examcenter-answerpaper-bags-report/examcenter-answerpaper-bags-report.component';
import { CurriculumReportComponent } from './curriculum-report/curriculum-report.component';
import { ExamEvaluationSummaryReportComponent } from './exam-evaluation-summary-report/exam-evaluation-summary-report.component';
import { ExamRegisteredStudentsCountComponent } from './exam-registered-students-count/exam-registered-students-count.component';
import { ExamRegistrationStudentReportComponent } from './exam-registration-student-report/exam-registration-student-report.component';
import { ExamStudentRegistrationTtReportComponent } from './exam-student-registration-tt-report/exam-student-registration-tt-report.component';
import { ExamStudentNotRegisteredCountComponent } from './exam-student-not-registered-count/exam-student-not-registered-count.component';
import { GenderWiseExamReportComponent } from './gender-wise-exam-report/gender-wise-exam-report.component';
import { BranchWisePassesResultSheetsComponent } from './branch-wise-passes-result-sheets/branch-wise-passes-result-sheets.component';
import { BranchWiseFailedResultSheetsComponent } from './branch-wise-failed-result-sheets/branch-wise-failed-result-sheets.component';
import { ModerationBenefitedStudentsReportComponent } from './moderation-benefited-students-report/moderation-benefited-students-report.component';
import { GraceBenefitedStudentsReportComponent } from './grace-benefited-students-report/grace-benefited-students-report.component';
import { SubjectWiseResultPassPercentReportComponent } from './subject-wise-result-pass-percent-report/subject-wise-result-pass-percent-report.component';
import { ExamAbsenteesReportComponent } from './exam-absentees-report/exam-absentees-report.component';
import { ExamEvaluationUnAssignedReportComponent } from './exam-evaluation-un-assigned-report/exam-evaluation-un-assigned-report.component';
import { StudentWiseGradePointReportComponent } from './student-wise-grade-point-report/student-wise-grade-point-report.component';
import { StudentBacklogDataComponent } from './student-backlog-data/student-backlog-data.component';
import { DetentionReportComponent } from './detention-report/detention-report.component';
import { ConsolidatedExamReportComponent } from './consolidated-exam-report/consolidated-exam-report.component';
import { ReEvaluationResultReportComponent } from './re-evaluation-result-report/re-evaluation-result-report.component';
import { ReEvaluationBranchWiseResultAnalysisReportComponent } from './re-evaluation-branch-wise-result-analysis-report/re-evaluation-branch-wise-result-analysis-report.component';
import { ReEvaluationResultComparisionReportComponent } from './re-evaluation-result-comparision-report/re-evaluation-result-comparision-report.component';
import { InternalMarksEntryReportComponent } from './internal-marks-entry-report/internal-marks-entry-report.component';
import { AcademicYearCurriculumReportComponent } from './academic-year-curriculum-report/academic-year-curriculum-report.component';
import { BatchwiseSgpaReportComponent } from './batchwise-sgpa-report/batchwise-sgpa-report.component';
import { OuResultSheetComponent } from './ou-result-sheet/ou-result-sheet.component';
import { LabExternalRemunerationReportComponent } from './lab-external-remuneration-report/lab-external-remuneration-report.component';
import { InvigilatorsRemunerationReportComponent } from './invigilators-remuneration-report/invigilators-remuneration-report.component';

const routes = [
  {
    path: 'student-exam-report',
    component: StudentExamReportsComponent
  },
  {
    path: 'exam-timetable-report',
    component: ExamTimetableReportComponent
  },
  {
    path: 'exam-result-report',
    component: ExamResultReportComponent
  },
  {
    path: 'exam-invigilator-allotment-report',
    component: InvigilatorAllotmentReportComponent
  },
  {
    path: 'exam-student-registration-report',
    component: ExamStudentRegistrationReportComponent
  },
  {
    path: 'student-summary-result-report',
    component: ExamStudentSummaryReportComponent
  },
  {
    path: 'student-result-details-report',
    component: ExamStudentResultDetailsReportComponent
  },
  {
    path: 'student-backlog-report',
    component: StudentBacklogReportComponent
  },
  {
    path: 'student-credits-report',
    component: StudentCreditsReportComponent
  },
  {
    path: 'course-year-timetable-report',
    component: CourseYearTimetableReportComponent
  },
  {
    path: 're-evaluation-branch-wise-reslut-analysis-report',
    component: ReEvaluationBranchWiseResultAnalysisReportComponent
  },
  {
    path: 'exam-naac-report',
    component: ExamNaacReportComponent
  },
  {
    path: 'exam-room-allotment-report',
    component: ExamRoomAllotmentReportComponent
  },
  {
    path: 'consolidated-marks-report',
    component: ConsolidatedMarksReportComponent
  },
  {
    path: 'consolidated-marks-report/print-consolidated-memo',
    component: PrintConsolidatedMemoComponent
  },
  {
    path: 'assignment-pending-list-report',
    component: AssignmentPendingListComponent
  },
  {
    path: 'exam-detail-status',
    component: ExamDetailStatusComponent
  },
  {
    path:'exam-moderation-reports',
    component:ExamModerationReportsComponent
  },
  {
    path:'exam-gracemarks-reports',
    component:ExamGracemarksReportsComponent
  },
  {
    path:'internal-marks-entered',
    component:InternalMarksEntryComponent
  },
  {
    path:'group-subjectwise-result-report',
    component:GroupSubjectwiseResultReportComponent
  },
  {
    path:'subject-gradewise-result-report',
    component:SubjectGradewiseResultReportComponent
  },
  {
    path:'final-result-analysis-report',
    component:FinalResultAnalysisComponent
  },
  {
    path:'external-lab-marks-entered',
    component:ExternalLabMarksEnteredComponent
  }, 
  {
    path:'final-marks-premoderation',
    component:FinalMarksPremoderationComponent
  }, 
  {
    path:'subjectwise-result-report',
    component:SubjectwiseResultReportComponent
  },
  {
    path:'group-yearwise-result-report',
    component:GroupYearwiseResultReportComponent
  },
  {
    path:'exam_results_sheets',
    component:ExamResultSheetComponent
  }, 
  {
    path:'tabulation_register',
    component:TabulationRegistrationComponent
  },
  {
    path:'reevaluation-students-report',
    component:ReevaluationStudentsReportComponent
  },
  {
    path:'daily-evaluated-report',
    component:DailyEvaluatedReportComponent
  },
  {
    path:'evaluators-bank-copy-report',
    component:EvaluatorsBankCopyReportComponent
  },
  {
    path:'exam-answer-sheets-report',
    component:ExamAnswerSheetsReportComponent
  },
  {
   path:'exam-evaluation-report',
   component:ExamEvaluationReportComponent
 },
 {
  path: 'exam-evaluation-report/view-answer-sheets',
  component: ViewAnswerSheetsComponent
},
{
  path: 'subject-wise-evaluators-report',
  component: SubjectWiseEvaluatorsReportComponent
},
{
  path: 'exam-verification',
  component: ExamVerificationComponent
},
{
  path:'jntu-before-moderation-report',
  component:JntuBeforeModerationReportComponent
 },
 {
  path:'jntu-after-moderation-report',
  component:JntuAfterModerationReportComponent
 },
 {
  path:'jntu-moderation-analysis-report',
  component:JntuModerationAnalysisReportComponent
 },
 {
  path:'jntu-moderation-benefited-list',
  component:JntuModerationBenefitedListComponent
 },
 {
  path:'jntu-grafting-list',
  component:JntuGraftingListComponent
 },
 {
  path:'jntu-grafting-analysis-report',
  component:JntuGraftingAnalysisReportComponent
 },
 {
  path:'jntu-result-analysis-report',
  component:JntuResultAnalysisReportComponent
 },
 {
  path:'jntu-tr-marks-before-moderation',
  component:JntuTrMarksBeforeModerationComponent
 },
 {
  path:'jntu-tr-marks-before-grafting',
  component:JntuTrMarksBeforeGraftingComponent
 },
 {
  path:'jntu-t-sheet',
  component:JntuTSheetComponent
 },
 {
  path:'examcenter-colleges-report',
  component:ExamcenterCollegesReportComponent
 },
 {
  path:'examcenter-students-report',
  component:ExamcenterStudentsReportComponent
 },
 {
  path:'examcenter-rooms-report',
  component:ExamcenterRoomsReportComponent
 },
 {
  path:'examcenter-profiles-report',
  component:ExamcenterProfilesReportComponent
 },
 {
  path:'examcenter-answerpaper-bags-report',
  component:ExamcenterAnswerpaperBagsReportComponent
 },
 {
  path: 'curriculum-report',
  component: CurriculumReportComponent
 },
 {
  path: 'academic-year-curriculum-report',
  component: AcademicYearCurriculumReportComponent
 },
 {
  path: 'exam-registered-students-count',
  component: ExamRegisteredStudentsCountComponent
 },
 {
  path: 'exam-student-registration-tt-report',
  component: ExamRegistrationStudentReportComponent
 },
 {
  path: 'exam-registration-student-report',
  component: ExamStudentRegistrationTtReportComponent
 },
 {
  path: 'exam-not-registration-student-report',
  component: ExamStudentNotRegisteredCountComponent
 },
 {
  path: 'gender-wise-exam-report',
  component: GenderWiseExamReportComponent
 },
 {
  path: 'group-wise-passed-result-sheets',
  component: BranchWisePassesResultSheetsComponent
 },
 {
  path: 'group-wise-failed-result-sheets',
  component: BranchWiseFailedResultSheetsComponent
 },
 {
  path: 'moderation-benefited-students-report',
  component: ModerationBenefitedStudentsReportComponent
 },
 {
  path: 'grace-marks-benefited-students-report',
  component: GraceBenefitedStudentsReportComponent
 },
 {
  path: 'subject-wise-result-pass-percentage-report',
  component: SubjectWiseResultPassPercentReportComponent
 },
 {
  path:'exam-absentees-report',
  component:ExamAbsenteesReportComponent
 },
 {
  path: 'student-wise-grade-point-report',
  component: StudentWiseGradePointReportComponent
 },
 {
  path:'exam-evaluation-un-assigned-report',
  component:ExamEvaluationUnAssignedReportComponent
 },
 {
  path:'student-backlog-data',
  component:StudentBacklogDataComponent
 },
 {
  path:'detention-report',
  component:DetentionReportComponent
 },
 {
  path: 'consolidated-exam-report',
  component: ConsolidatedExamReportComponent
 },
 {
  path: 're-evaluation-exam-report',
  component: ReEvaluationResultReportComponent
 },
 {
  path: 're-evaluation-comparision-report',
  component: ReEvaluationResultComparisionReportComponent
 },
 {
  path: 'internal-marks-report',
  component: InternalMarksEntryReportComponent
 },
 {
  path: 'batchwise-sgpa-report',
  component: BatchwiseSgpaReportComponent
 },
 {
  path: 'ou-result-sheet',
  component: OuResultSheetComponent
 },
 {
  path: 'lab-remuneration-report',
  component: LabExternalRemunerationReportComponent
 },
 {
  path: 'invigilators-remuneration-report',
  component: InvigilatorsRemunerationReportComponent
 }
];

@NgModule({
  imports: [
    CommonModule,
    RouterModule.forChild(routes),
    FuseSharedModule,
    TranslateModule,
    MaterialModule,
    PivotViewModule,
    GridModule,
    GridAllModule,
  ],
  declarations: [
    StudentExamReportsComponent,
    ExamTimetableReportComponent,
    ExamResultReportComponent,
    InvigilatorAllotmentReportComponent,
    ExamStudentRegistrationReportComponent,
    ExamStudentSummaryReportComponent,
    ExamStudentResultDetailsReportComponent,
    StudentBacklogReportComponent,
    StudentCreditsReportComponent,
    CourseYearTimetableReportComponent,
    ExamNaacReportComponent,
    ConsolidatedMarksReportComponent,
    AssignmentPendingListComponent,
    PrintConsolidatedMemoComponent,
    ExamDetailStatusComponent,
    ExamRoomAllotmentReportComponent,
    ExamModerationReportsComponent,
    ExamGracemarksReportsComponent,
    InternalMarksEntryComponent,
    GroupSubjectwiseResultReportComponent,
    SubjectGradewiseResultReportComponent,
    FinalResultAnalysisComponent,
    ExternalLabMarksEnteredComponent,
    FinalMarksPremoderationComponent,
    SubjectwiseResultReportComponent,
    GroupYearwiseResultReportComponent,
    ExamResultSheetComponent,
    TabulationRegistrationComponent,
    ReevaluationStudentsReportComponent,
    EvaluatorsBankCopyReportComponent,
    DailyEvaluatedReportComponent,
    EvaluatorAnswerSheetsComponent,
    ExamAnswerSheetsReportComponent,
    ExamEvaluationReportComponent,
    ViewAnswerSheetsComponent,
    SubjectWiseEvaluatorsReportComponent,
    ExamVerificationComponent,
    JntuBeforeModerationReportComponent,
    JntuAfterModerationReportComponent,
    JntuModerationAnalysisReportComponent,
    JntuModerationBenefitedListComponent,
    JntuGraftingListComponent,
    JntuGraftingAnalysisReportComponent,
    JntuResultAnalysisReportComponent,
    JntuTrMarksBeforeModerationComponent,
    JntuTrMarksBeforeGraftingComponent,
    JntuTSheetComponent,
    ExamcenterCollegesReportComponent,
    ExamcenterRoomsReportComponent,
    ExamcenterStudentsReportComponent,
    ExamcenterProfilesReportComponent,
    ExamcenterAnswerpaperBagsReportComponent,
    CurriculumReportComponent,
    ExamEvaluationSummaryReportComponent,
    ExamRegisteredStudentsCountComponent,
    ExamRegistrationStudentReportComponent,
    ExamStudentRegistrationTtReportComponent,
    ExamStudentNotRegisteredCountComponent,
    GenderWiseExamReportComponent,
    BranchWisePassesResultSheetsComponent,
    BranchWiseFailedResultSheetsComponent,
    ModerationBenefitedStudentsReportComponent,
    GraceBenefitedStudentsReportComponent,
    SubjectWiseResultPassPercentReportComponent,
    ExamAbsenteesReportComponent,
    ExamEvaluationUnAssignedReportComponent,
    StudentWiseGradePointReportComponent,
    StudentBacklogDataComponent,
    DetentionReportComponent,
    ConsolidatedExamReportComponent,
    ReEvaluationResultReportComponent,
    ReEvaluationBranchWiseResultAnalysisReportComponent,
    ReEvaluationResultComparisionReportComponent,
    InternalMarksEntryReportComponent,
    AcademicYearCurriculumReportComponent,
    BatchwiseSgpaReportComponent,
    OuResultSheetComponent,
    LabExternalRemunerationReportComponent,
    InvigilatorsRemunerationReportComponent
  ],
  providers: [CrudService, GenericFunctions, PdfExportService,
    ToolbarService,
    PageService, SortService, FilterService, GroupService, DatePipe]
})
export class ExamReportsModule { }
