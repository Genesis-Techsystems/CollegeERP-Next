import { CreateEvaluatorComponent } from './create-evaluator/create-evaluator.component';
import { ViewevaluatorsComponent } from './create-evaluator/viewevaluators/viewevaluators.component';
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
import { AssignEvaluatorComponent } from './assign-evaluator/assign-evaluator.component';
import { EditEvaluatorsComponent } from './create-evaluator/edit-evaluators/edit-evaluators.component';
import { ViewBarcodeModalComponent } from './assign-evaluator/view-barcode-modal/view-barcode-modal.component';
import { AddQuestionPapersModalComponent } from './exam-question-papers/add-question-papers-modal/add-question-papers-modal.component';
import { AddExamQuestionPaperMarksModelComponent } from './exam-question-paper-marks/add-exam-question-paper-marks-model/add-exam-question-paper-marks-model.component';
import { AddExamQuestionGroupsModalComponent } from './exam-question-groups/add-exam-question-groups-modal/add-exam-question-groups-modal.component';
import { ManualAssignEvaluatorComponent } from './assign-evaluator/manual-assign-evaluator/manual-assign-evaluator.component';
import { ExamEvaluationSettingsComponent } from './exam-evaluation-settings/exam-evaluation-settings.component';
import { AddEvaluationSettingsComponent } from './exam-evaluation-settings/add-evaluation-settings/add-evaluation-settings.component';
import { ExamStudentEvaluationPageComponent } from './exam-student-evaluation-page/exam-student-evaluation-page.component';
import { AddExamStudentEvaluationComponent } from './exam-student-evaluation-page/add-exam-student-evaluation/add-exam-student-evaluation.component';
import { ExamQuestionPaperMarksComponent } from './exam-question-paper-marks/exam-question-paper-marks.component';
import { ExamQuestionGroupsComponent } from './exam-question-groups/exam-question-groups.component';
import { ExamQuestionPapersComponent } from './exam-question-papers/exam-question-papers.component';
import { ExamEvaluationComponent } from './exam-evaluation/exam-evaluation.component';
import { UploadExamOmrComponent } from './upload-exam-omr/upload-exam-omr.component';
import { ExamStdAnswerPaperpagesComponent } from './exam-std-answer-paperpages/exam-std-answer-paperpages.component';
import { ExamStdAnswerpaperComponent } from './exam-std-answerpaper/exam-std-answerpaper.component';
import { AddStdAnswerPaperpagesComponent } from './exam-std-answer-paperpages/add-std-answer-paperpages/add-std-answer-paperpages.component';
import { AddExmAnswerpaperComponent } from './exam-std-answerpaper/add-exm-answerpaper/add-exm-answerpaper.component';
import { ViewModalComponent } from './upload-exam-omr/view-modal/view-modal.component';
import { ViewAnswerSheetsComponent } from './upload-exam-omr/view-answer-sheets/view-answer-sheets.component';
import { ManageQuestionsComponent } from './exam-question-paper-marks/manage-questions/manage-questions.component';
import { QuestionBankComponent } from './exam-question-paper-marks/question-bank/question-bank.component';
import { AddManualQuestionsComponent } from './exam-question-paper-marks/add-manual-questions/add-manual-questions.component';
import { ViewQuestionsComponent } from './exam-question-paper-marks/view-questions/view-questions.component';
import { EvaluatorSubjectsComponent } from './evaluator-subjects/evaluator-subjects.component';
import { EvaluatorAssignedAnspapersComponent } from './evaluator-assigned-anspapers/evaluator-assigned-anspapers.component';
import { AssignEvaluatorSubjectComponent } from './create-evaluator/assign-evaluator-subject/assign-evaluator-subject.component';
import { ViewEvaluatorSubjectsComponent } from './create-evaluator/view-evaluator-subjects/view-evaluator-subjects.component';
import { EvaluationSubjectsListComponent } from './evaluation-subjects-list/evaluation-subjects-list.component';
import { ManualViewModelComponent } from './assign-evaluator/manual-assign-evaluator/manual-view-model/manual-view-model.component';
import { AddQuestionpaperModalComponent } from './exam-question-paper-marks/add-questionpaper-modal/add-questionpaper-modal.component';
import { UploadPapersComponent } from './exam-question-paper-marks/upload-papers/upload-papers.component';
import { EvaluationApprovalsComponent } from './evaluation-approvals/evaluation-approvals.component';
import { UpdateStatusComponent } from './evaluation-approvals/update-status/update-status.component';
import { QuillModule } from 'ngx-quill';
import { EvaluationReportsComponent } from './evaluation-reports/evaluation-reports.component';
import { ExamFinalQuestionPaperComponent } from './exam-final-question-paper/exam-final-question-paper.component';
import { ReAssignEvaluavatorComponent } from './re-assign-evaluavator/re-assign-evaluavator.component';
import { ModeratorEvaluatorsComponent } from './moderator-evaluators/moderator-evaluators.component';
import { ViewQuestionsModalComponent } from './exam-question-paper-marks/view-questions-modal/view-questions-modal.component';
import { PrintQuestionModalanswersComponent } from './exam-question-paper-marks/print-question-modalanswers/print-question-modalanswers.component';
import { ViewExFinQnPaperComponent } from './view-ex-fin-qn-paper/view-ex-fin-qn-paper.component';
import { PublishedExamQuestionPaperComponent } from './published-exam-question-paper/published-exam-question-paper.component';
import { ConfirmModalComponent } from './view-ex-fin-qn-paper/confirm-modal/confirm-modal.component';
import { RecordingsIframeComponent } from './recordings-iframe/recordings-iframe.component';
import { AssignQuestionTemplateComponent } from './exam-question-paper-marks/assign-question-template/assign-question-template.component';
import { ManageQuestionsPaperComponent } from './exam-question-paper-marks/manage-questions-paper/manage-questions-paper.component';
import { ViewTemplateModalComponent } from './exam-question-paper-marks/view-template-modal/view-template-modal.component';
import { ViewTemplateComponent } from './exam-question-paper-marks/view-template/view-template.component';
import { ViewTemplateQuestionsComponent } from './exam-question-paper-marks/view-template-questions/view-template-questions.component';
import { EditQuestionsComponent } from './exam-question-paper-marks/edit-questions/edit-questions.component';
import { PrintQAComponent } from './exam-question-paper-marks/print-qa/print-qa.component';
import { AddEvaluatorBankdetailsComponent } from './create-evaluator/add-evaluator-bankdetails/add-evaluator-bankdetails.component';
import { ViewPublishedListComponent } from './view-ex-fin-qn-paper/view-published-list/view-published-list.component';
import { SecurityCodeComponent } from './published-exam-question-paper/security-code/security-code.component';
import { ViewExamOmrSheetsComponent } from './upload-exam-omr/view-exam-omr-sheets/view-exam-omr-sheets.component';
import { ScanUploadPapersComponent } from './scan-upload-papers/scan-upload-papers.component';
import { RunConfirmModalComponent } from './assign-evaluator/run-confirm-modal/run-confirm-modal.component';
import { EditorModule, TINYMCE_SCRIPT_SRC } from '@tinymce/tinymce-angular';
import { ReEvaluationAssignComponent } from './re-evaluation-assign/re-evaluation-assign.component';
import { EvaluationMarksComponent } from './evaluation-marks/evaluation-marks.component';
import { MultiEvaluatorAssignComponent } from './multi-evaluator-assign/multi-evaluator-assign.component';
import { AssignReEvaluatorComponent } from './assign-re-evaluator/assign-re-evaluator.component';
import { NotifyModalComponent } from './create-evaluator/viewevaluators/notify-modal/notify-modal.component';
import { AddEvaluatorBankDetailsComponent } from './create-evaluator/viewevaluators/add-evaluator-bank-details/add-evaluator-bank-details.component';
import { StudentAssignedListComponent } from './multi-evaluator-assign/student-assigned-list/student-assigned-list.component';
import { EvaluatedMarksReportComponent } from './evaluated-marks-report/evaluated-marks-report.component';
import { UpdateEvaluatorAnswerPapersStatusComponent } from './update-evaluator-answer-papers-status/update-evaluator-answer-papers-status.component';
import { UpdateAnswerpaperStatusComponent } from './update-evaluator-answer-papers-status/update-answerpaper-status/update-answerpaper-status.component';
import { EvaluatorSubjectsModalComponent } from './create-evaluator/viewevaluators/evaluator-subjects-modal/evaluator-subjects-modal.component';
import { ReEvaluationMultiAssignComponent } from './re-evaluation-multi-assign/re-evaluation-multi-assign.component';
import { QuestionTypeModalComponent } from './exam-question-paper-marks/question-bank/question-type-modal/question-type-modal.component';
import { AssignEvaluatorSubjectrolesComponent } from './create-evaluator/viewevaluators/assign-evaluator-subjectroles/assign-evaluator-subjectroles.component';
import { AssignQuestionpaperTemplateComponent } from './assign-questionpaper-template/assign-questionpaper-template.component';
import { CreateTemplateComponent } from './create-template/create-template.component';
import { EvaluatorPreferencesModalComponent } from './create-evaluator/viewevaluators/evaluator-preferences-modal/evaluator-preferences-modal.component';
import { AssignSubjectsEvaluatorComponent } from './assign-subjects-evaluator/assign-subjects-evaluator.component';
import { AssignEvaluatorExamComponent } from './assign-evaluator-exam/assign-evaluator-exam.component';
import { EvaluationModerationComponent } from './evaluation-moderation/evaluation-moderation.component';
import { EvaluationTemplatesComponent } from './evaluation-templates/evaluation-templates.component';
import { AssignQpTemplateComponent } from './assign-qp-template/assign-qp-template.component';
import { AssignQuestionTemplateNewComponent } from './exam-question-paper-marks/assign-question-template-new/assign-question-template-new.component';
import { ExamQuestionPaperMarksNewComponent } from './exam-question-paper-marks-new/exam-question-paper-marks-new.component';
import { ManageQuestionsNewComponent } from './exam-question-paper-marks-new/manage-questions-new/manage-questions-new.component';
import { ViewTemplateModalNewComponent } from './exam-question-paper-marks-new/view-template-modal-new/view-template-modal-new.component';
import { AddQuestionpaperModalNewComponent } from './exam-question-paper-marks-new/add-questionpaper-modal-new/add-questionpaper-modal-new.component';
import { ViewTemplateNewComponent } from './exam-question-paper-marks-new/view-template-new/view-template-new.component';
import { QuestionBankNewComponent } from './exam-question-paper-marks-new/question-bank-new/question-bank-new.component';
import { ChiefEvaluationPagesComponent } from './chief-evaluation-pages/chief-evaluation-pages.component';

const routes = [
  {
    path: 'create-evaluators',
    component: ViewevaluatorsComponent
  }
  ,
  {
    path: 'assign-evaluators',
    component: AssignEvaluatorComponent
  },
  {
    path: 'exam-question-papers',
    component: ExamQuestionPapersComponent
  },
  {
    path: 'exam-question-paper-marks-new',
    component: ExamQuestionPaperMarksNewComponent
  },
  {
    path: 'exam-question-paper-marks',
    // component: ExamQuestionPaperMarksNewComponent
    component: ExamQuestionPaperMarksComponent
  },
  {
    path: 'exam-question-groups',
    component: ExamQuestionGroupsComponent,

  }, {
    path: 'exam-evaluation-settings',
    component: ExamEvaluationSettingsComponent
  },
  {

    path: 'exam-std-answerpaper-pages',
    component: ExamStdAnswerPaperpagesComponent,

  },
  {
    path: 'exam-student-answer-paper',
    component: ExamStdAnswerpaperComponent
  },
  {
    path: 'upload-answer-sheets',
    component: UploadExamOmrComponent
  },
  {
    path: 'view-answer-sheets',
    component: ViewExamOmrSheetsComponent
  },
  {
    path: 'exam-question-paper-marks/manage-questions',
    component: ManageQuestionsComponent
  },
  {
    path: 'exam-question-paper-marks-new/manage-questions-new',
    component: ManageQuestionsNewComponent
  },
  {
    path: 'exam-question-paper-marks/manage-questions-paper',
    //  component: ManageQuestionsNewComponent
    component: ManageQuestionsPaperComponent
  },
  {
    path: 'exam-question-paper-marks/question-bank',
    component: QuestionBankComponent
  },
  {
    path: 'exam-question-paper-marks-new/question-bank-new',
    component: QuestionBankNewComponent
  },
  {
    path: 'exam-question-paper-marks/add-exam-question-paper-marks-model',
    component: AddExamQuestionPaperMarksModelComponent
  },
  {
    path: 'exam-question-paper-marks/add-manual-questions',
    component: AddManualQuestionsComponent
  },
  {
    path: 'exam-question-paper-marks/print-question-modalanswers',
    component: PrintQuestionModalanswersComponent
  },
  {
    path: 'exam-question-paper-marks/view-questions',
    component: ViewQuestionsComponent
  },
  {
    path:'exam-question-papers/add-question-papers-modal',
    component : AddQuestionPapersModalComponent
  },

  {
    path: 'evaluator-exam-subject',
    component: EvaluatorSubjectsComponent
  },
  {
    path: 'evaluator-assigned-answer-papers',
    component: EvaluatorAssignedAnspapersComponent
  },
  // {
  //   path: 'evaluation-process/evaluator-assigned-answer-papers',
  //   component: EvaluatorAssignedAnspapersComponent
  // },
  {
    path:'evaluator-subjects',
    component:EvaluationSubjectsListComponent
  },
  
  {
    path:'assign-evaluators-manual',
    component:ManualAssignEvaluatorComponent
  },
  {
    path:'evaluation-approvals',
    component:EvaluationApprovalsComponent
  },
  {
    path:'evaluation-reports',
    component:EvaluationReportsComponent
  },
  {
    path:'exam-final-question-paper',
    component:ExamFinalQuestionPaperComponent
  },
  {
    path:'re-assign-evaluators',
    component:ReAssignEvaluavatorComponent
  },
  {
    path:'moderator-evaluators',
    component:ModeratorEvaluatorsComponent
  },
  {
    path:'view-ex-fin-qn-paper',
    component:ViewExFinQnPaperComponent
  },
  {
    path:'published-exam-question-paper',
    component:PublishedExamQuestionPaperComponent
  },
  {
    path: 'recordings-frame',
    component:RecordingsIframeComponent
  },
  {
    path: 'exam-question-paper-marks/assign-question-template',
    component: AssignQuestionTemplateComponent
  },
  {
    path: 'exam-question-paper-marks/assign-question-template-new',
    component: AssignQuestionTemplateNewComponent
  },
  {
    path: 'exam-question-paper-marks/view-template',
    component: ViewTemplateComponent
  },
  {
    path: 'exam-question-paper-marks/print-qa',
    component: PrintQAComponent
  },
  {
    path:'scan-upload-process',
    component:ScanUploadPapersComponent
  },
  {
    path:'re-evaluation-assign',
    component:ReEvaluationAssignComponent
  },
  {
    path:'evaluation-marks',
    component:EvaluationMarksComponent
  },
  {
    path:'multi-evaluator-assign',
    component:MultiEvaluatorAssignComponent
  },
  {
    path:'assign-reevaluator',
    component:AssignReEvaluatorComponent
  },
  {
    path:'evaluated-marks-report',
    component:EvaluatedMarksReportComponent
  },
  {
    path:'update-evaluator-answer-papers-status',
    component:UpdateEvaluatorAnswerPapersStatusComponent
  },
  {
    path:'re-evaluation-multi-assign',
    component:ReEvaluationMultiAssignComponent
  },
  {
    path:'create-evaluators/evaluator-subject-roles',
    component:AssignEvaluatorSubjectrolesComponent
  },
  // { 
  //   path:'assign-questionpaper-template',
  //   component:AssignQpTemplateComponent
  // },
  { 
    path:'assign-questionpaper-template',
    component:AssignQuestionpaperTemplateComponent
  },
  { 
    path:'assign-questionpaper-template-new',
    component:AssignQpTemplateComponent
  },
  { 
    path:'assign-qp-template',
    component:AssignQuestionpaperTemplateComponent
  },
   { 
    path:'create-questionpaper-template',
    component:CreateTemplateComponent
  },
  { 
    path:'create-questionpaper-template-new',
    component:EvaluationTemplatesComponent
  },
  {
    path : 'assign-subjects-evaluator',
    component:AssignSubjectsEvaluatorComponent
  },
  {
    path : 'assign-evaluator-exam',
    component : AssignEvaluatorExamComponent
  },
  {
    path : 'evaluation-moderation',
    component : EvaluationModerationComponent
  },
  { 
    path:'questionpaper-template',
    component:CreateTemplateComponent
  },
  {
    path : 'chief-evaluation-pages',
    component: ChiefEvaluationPagesComponent
  }

];

@NgModule({
  declarations: [
    CreateEvaluatorComponent,
    AssignEvaluatorComponent,
    ViewevaluatorsComponent,
    EditEvaluatorsComponent,
    ViewBarcodeModalComponent,
    AddQuestionPapersModalComponent,
    AddExamQuestionGroupsModalComponent,
    ManualAssignEvaluatorComponent,
    ExamEvaluationSettingsComponent,
    AddEvaluationSettingsComponent,
    ExamStudentEvaluationPageComponent,
    AddExamStudentEvaluationComponent,
    ExamStdAnswerPaperpagesComponent,
    AddStdAnswerPaperpagesComponent,
    AddExmAnswerpaperComponent,
    ExamStdAnswerpaperComponent,
    UploadExamOmrComponent,
    ExamQuestionPapersComponent,
    ExamEvaluationComponent,
    ExamQuestionPaperMarksComponent,
    ExamQuestionGroupsComponent,
    ExamQuestionPaperMarksComponent,
    ViewAnswerSheetsComponent,
    ViewModalComponent,
    ManageQuestionsComponent,
    QuestionBankComponent,
    AddExamQuestionPaperMarksModelComponent,
    AddManualQuestionsComponent,
    ViewQuestionsComponent,
    EvaluatorSubjectsComponent,
    EvaluatorAssignedAnspapersComponent,
    AssignEvaluatorSubjectComponent,
    ViewEvaluatorSubjectsComponent,
    EvaluationSubjectsListComponent,
    ManualViewModelComponent,
    AddQuestionpaperModalComponent,
    UploadPapersComponent,
    EvaluationApprovalsComponent,
    UpdateStatusComponent,
    EvaluationReportsComponent,
    ExamFinalQuestionPaperComponent,
    ReAssignEvaluavatorComponent,
    ModeratorEvaluatorsComponent,
    ViewQuestionsModalComponent,
    PrintQuestionModalanswersComponent,
    ViewExFinQnPaperComponent,
    PublishedExamQuestionPaperComponent,
    ConfirmModalComponent,
    RecordingsIframeComponent,
    AssignQuestionTemplateComponent,
    ManageQuestionsPaperComponent,
    ViewTemplateModalComponent,
    ViewTemplateComponent,
    ViewTemplateQuestionsComponent,
    EditQuestionsComponent,
    PrintQAComponent,
    AddEvaluatorBankdetailsComponent,
    ViewPublishedListComponent,
    SecurityCodeComponent,
    ViewExamOmrSheetsComponent,
    ScanUploadPapersComponent,
    RunConfirmModalComponent,
    ReEvaluationAssignComponent,
    EvaluationMarksComponent,
    MultiEvaluatorAssignComponent,
    AssignReEvaluatorComponent,
    NotifyModalComponent,
    AddEvaluatorBankDetailsComponent,
    StudentAssignedListComponent,
    EvaluatedMarksReportComponent,
    UpdateEvaluatorAnswerPapersStatusComponent,
    UpdateAnswerpaperStatusComponent,
    EvaluatorSubjectsModalComponent,
    ReEvaluationMultiAssignComponent,
    QuestionTypeModalComponent,
    AssignQuestionpaperTemplateComponent,
    CreateTemplateComponent,
    AssignEvaluatorSubjectrolesComponent,
    AssignQuestionpaperTemplateComponent,
    EvaluatorPreferencesModalComponent,
    AssignSubjectsEvaluatorComponent,
    AssignEvaluatorExamComponent,
    EvaluationModerationComponent,
    EvaluationTemplatesComponent,
    AssignQpTemplateComponent,
    AssignQuestionTemplateNewComponent,
    ExamQuestionPaperMarksNewComponent,
    ManageQuestionsNewComponent,
    ViewTemplateModalNewComponent,
    AddQuestionpaperModalNewComponent,
    ViewTemplateNewComponent,
    QuestionBankNewComponent,
    ChiefEvaluationPagesComponent


    
  ],
  imports: [
    // CommonModule,
    RouterModule.forChild(routes),
    FuseSharedModule,
    TranslateModule,
    MaterialModule,
    MaterialTimeControlModule,
    NgxMaterialTimepickerModule,
    EditorModule,
    QuillModule.forRoot(),
  ],
  exports: [
  ],
  schemas: [
    CUSTOM_ELEMENTS_SCHEMA
  ],
  providers: [CrudService, GenericFunctions, DatePipe]
})
export class EvaluationProcessModule {
  constructor(
    private _fuseSidebarService: FuseSidebarService,
  ) {
    this._fuseSidebarService.getSidebar('navbar').toggleOpen();
  }
}