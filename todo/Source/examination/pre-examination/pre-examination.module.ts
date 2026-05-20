import { CommonModule } from '@angular/common';
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
import { ExamDashboardComponent } from './exam-dashboard/exam-dashboard.component';
import { ExamFeeStructureModalComponent } from './exam-fee-structure/exam-fee-structure-modal/exam-fee-structure-modal.component';
import { ExamFeeStructureComponent } from './exam-fee-structure/exam-fee-structure.component';
import { ViewExamFeeStructureComponent } from './exam-fee-structure/view-exam-fee-structure/view-exam-fee-structure.component';
import { ExamRegistrationWithoutFeeComponent } from './exam-registration-without-fee/exam-registration-without-fee.component';
import { InternalExamRegistrationMultipleComponent } from './internal-exam-registration-multiple/internal-exam-registration-multiple.component';
import { AllocateRoomModalComponent } from './invigilator-allotment/allocate-room-modal/allocate-room-modal.component';
import { InvigilatorAllotmentModalComponent } from './invigilator-allotment/invigilator-allotment-modal/invigilator-allotment-modal.component';
import { InvigilatorAllotmentComponent } from './invigilator-allotment/invigilator-allotment.component';
import { RegularExamFeeCollectionComponent } from './regular-exam-fee-collection/regular-exam-fee-collection.component';
import { ViewSubjectsComponent } from './view-subjects/view-subjects.component';
import { ExamFeePayDialogComponent } from './regular-exam-fee-collection/exam-fee-pay-dialog/exam-fee-pay-dialog.component';
import { ConfirmationComponent } from './exam-registration-without-fee/confirmation/confirmation.component';
import { DeleteExamReceiptComponent } from './regular-exam-fee-collection/delete-exam-receipt/delete-exam-receipt.component';
import { StudentRoomAllotmentComponent } from './student-room-allotment/student-room-allotment.component';
import { AllotmentComponent } from './student-room-allotment/allotment/allotment.component';
import { ExamHallticketComponent } from './exam-hallticket/exam-hallticket.component';
import { ViewExistInvigilatorComponent } from './invigilator-allotment/view-exist-invigilator/view-exist-invigilator.component';
import { AdditionalExamFeesComponent } from './additional-exam-fees/additional-exam-fees.component';
import { AddAdditionalFeeComponent } from './additional-exam-fees/add-additional-fee/add-additional-fee.component';
import { ExamFeeRegistrationComponent } from './exam-fee-registration/exam-fee-registration.component';
import { StudentExamFeeRegistrationComponent } from './student-exam-fee-registration/student-exam-fee-registration.component';
import { ExamFeePaymentComponent } from './exam-fee-registration/exam-fee-payment/exam-fee-payment.component';
import { ExamFeePayModalComponent } from './exam-fee-registration/exam-fee-payment/exam-fee-pay-modal/exam-fee-pay-modal.component';
import { ViewTransactionsComponent } from './exam-fee-registration/view-transactions/view-transactions.component';
import { TransactionsComponent } from './student-exam-fee-registration/transactions/transactions.component';
import { PatymRedirectComponent } from './patym-redirect/patym-redirect.component';
import { PatymRequestComponent } from './patym-request/patym-request.component';
import { WelcomePatymComponent } from './welcome-patym/welcome-patym.component';
import { NotRegisteredStudentsComponent } from './exam-marks-update/not-registered-students/not-registered-students.component';
import { ExamSetupDetailsComponent } from './exam-setup-details/exam-setup-details.component';
import { AddSetupDetailsComponent } from './exam-setup-details/add-setup-details/add-setup-details.component';
import { SubjectSourceOutComeMappingComponent } from './subject-source-out-come-mapping/subject-source-out-come-mapping.component';
import { ExamStudentBarcodeGenerationComponent } from './exam-student-barcode-generation/exam-student-barcode-generation.component';
import { ExamSubjectBarcodeGenerationComponent } from './exam-subject-barcode-generation/exam-subject-barcode-generation.component';
import { OmrSheetsDesignComponent } from './omr-sheets-design/omr-sheets-design.component';
import { UploadExamOmrComponent } from './upload-exam-omr/upload-exam-omr.component';
import { OmrSinglePageDesignComponent } from './omr-single-page-design/omr-single-page-design.component';
import { PreExamReportsComponent } from './pre-exam-reports/pre-exam-reports.component';
import { CompleteExamFeeRegistrationComponent } from './complete-exam-fee-registration/complete-exam-fee-registration.component';
import { RevaluationFeeCollectionComponent } from './revaluation-fee-collection/revaluation-fee-collection.component';
import { DeleteExamRecieptComponent } from './revaluation-fee-collection/delete-exam-reciept/delete-exam-reciept.component';
import { PrintExamHallticketComponent } from './exam-hallticket/print-exam-hallticket/print-exam-hallticket.component';
import { CreateQuestionPaperComponent } from './create-question-paper/create-question-paper.component';
import { PrintBarcodeStickersComponent } from './print-barcode-stickers/print-barcode-stickers.component';
import { ManageQuestionsComponent } from './create-question-paper/manage-questions/manage-questions.component';
import { QuestionBankComponent } from './create-question-paper/manage-questions/question-bank/question-bank.component';
import { ManualQuestionsComponent } from './create-question-paper/manage-questions/manual-questions/manual-questions.component';
import { PrintAttendanceMarkingSheetStickersComponent } from './print-attendance-marking-sheet-stickers/print-attendance-marking-sheet-stickers.component';
import { PrintBarcodesStickersComponent } from './print-attendance-marking-sheet-stickers/print-barcodes-stickers/print-barcodes-stickers.component';
import { PrintAttendenceMarksheetComponent } from './print-attendance-marking-sheet-stickers/print-attendence-marksheet/print-attendence-marksheet.component';
import { PrintDformsComponent } from './exam-subject-barcode-generation/print-dforms/print-dforms.component';
import { ExamLabBatchesStudentsComponent } from './exam-lab-batches-students/exam-lab-batches-students.component';
import { StudentExamLabBatchesComponent } from './student-exam-lab-batches/student-exam-lab-batches.component';
import { UpdateExamLabBatchesComponent } from './student-exam-lab-batches/update-exam-lab-batches/update-exam-lab-batches.component';
import { PrintFormAComponent } from './exam-subject-barcode-generation/print-form-a/print-form-a.component';
import { ExamFormsComponent } from './exam-forms/exam-forms.component';
import { PrintRegularExamFeeReceiptComponent } from './regular-exam-fee-collection/print-regular-exam-fee-receipt/print-regular-exam-fee-receipt.component';
import { ExamRegistrationManualFeelessComponent } from './exam-registration-manual-feeless/exam-registration-manual-feeless.component';
import { PayDialogComponent } from './exam-registration-manual-feeless/pay-dialog/pay-dialog.component';
import { CollegeExamTimetableViewComponent } from './college-exam-timetable-view/college-exam-timetable-view.component';
import { ExamFormComponent } from './regular-exam-fee-collection/exam-form/exam-form.component';
import { PrintExamFormComponent } from './exam-forms/print-exam-form/print-exam-form.component';
import { ExamAttendancewiseSubjectBarcodeComponent } from './exam-attendancewise-subject-barcode/exam-attendancewise-subject-barcode.component';
import { AttendancePrintDformsComponent } from './exam-attendancewise-subject-barcode/attendance-print-dforms/attendance-print-dforms.component';
import { AttendancePrintFormAComponent } from './exam-attendancewise-subject-barcode/attendance-print-form-a/attendance-print-form-a.component';
import { UploadPapersComponent } from './exam-registration-manual-feeless/upload-papers/upload-papers.component';
import { AdditionalExamFeeCollectionComponent } from './additional-exam-fee-collection/additional-exam-fee-collection.component';
import { PrintAdditionalExamFeeReceiptComponent } from './additional-exam-fee-collection/print-additional-exam-fee-receipt/print-additional-exam-fee-receipt.component';
import { DeleteAdditionalExamReceiptComponent } from './additional-exam-fee-collection/delete-additional-exam-receipt/delete-additional-exam-receipt.component';
import { AdditionalExamFormComponent } from './additional-exam-fee-collection/additional-exam-form/additional-exam-form.component';
import { AdditionalExamFeePayDialogComponent } from './additional-exam-fee-collection/additional-exam-fee-pay-dialog/additional-exam-fee-pay-dialog.component';
import { ExamSchedulingFormsComponent } from './exam-scheduling-forms/exam-scheduling-forms.component';
import { AddExamSchedulingFormsComponent } from './exam-scheduling-forms/add-exam-scheduling-forms/add-exam-scheduling-forms.component';
import { PrintSchedulingSeatingStickersComponent } from './exam-scheduling-forms/add-exam-scheduling-forms/print-scheduling-seating-stickers/print-scheduling-seating-stickers.component';
import { PrintSchedulingGroupStickersComponent } from './exam-scheduling-forms/add-exam-scheduling-forms/print-scheduling-group-stickers/print-scheduling-group-stickers.component';

const routes = [
    {
      path: 'exam-dashboard',
      component: ExamDashboardComponent
    },
    
    {
      path: 'exam-fee-structure',
      component : ExamFeeStructureComponent
    },
      {
      path: 'exam-dashboard',
      component: ExamDashboardComponent
    }, 
      {
      path: 'invigilator-allotment',
      component: InvigilatorAllotmentComponent
    }, 
    {
      path: 'exam-fee-structure/add-exam-fee-structure',
      component: ExamFeeStructureModalComponent
    }, 
    // {
    //   path: 'exam-fee-collection',
    //   component: AdditionalExamFeeCollectionComponent
    // }, 
    {
      path: 'exam-fee-collection',
      component: RegularExamFeeCollectionComponent
    }, 
    {
      path: 'exam-fee-registration',
      component: ExamFeeRegistrationComponent
    }, 
    {
      path: 'exam-fee-registration/exam-fee-payment',
      component: ExamFeePaymentComponent
    }, 
    {
      path: 'exam-registration-without-fees',
      component: ExamRegistrationWithoutFeeComponent
    }, 
    {
      path: 'internal-exam-registration',
      component: InternalExamRegistrationMultipleComponent
    }, 
    {
      path: 'student-room-allotment',
      component: StudentRoomAllotmentComponent
    }, 
    {
      path: 'student-room-allotment/allotment',
      component: AllotmentComponent
    }, 
    {
      path: 'exam-hallticket',
      component: ExamHallticketComponent
    }, {
      path: 'exam-setup-details',
      component: ExamSetupDetailsComponent
    },
    {
      path: 'student-barcode',
      component: ExamStudentBarcodeGenerationComponent
    },
    {
      path: 'omr-sheets-design',
      component: OmrSheetsDesignComponent
    },
    {
      path: 'subject-barcode',
      component: ExamSubjectBarcodeGenerationComponent
    },
    {
      path: 'subject-source-outcome',
      component: SubjectSourceOutComeMappingComponent
    }, 
    // {
    //   path: 'additional-exam-fees',
    //   component: AdditionalExamFeesComponent
    // },
     {
      path: 'additional-exam-fees',
      component: AdditionalExamFeeCollectionComponent
    },   
     {
      path: 'student-fee-registrations',
      component: StudentExamFeeRegistrationComponent
    },   {
    path: 'patym-redirect',
    component: PatymRedirectComponent
  }, {
    path: 'patym-request',
    component: PatymRequestComponent
  }, {
    path: 'patym-success',
    component: WelcomePatymComponent
  }, 
  {
    path: 'print-omr-sheets',
    component: UploadExamOmrComponent
  }, 
  {
    path: 'omr-single-page-design',
    component: OmrSinglePageDesignComponent
  }, 
  {
    path: 'print-Dform',
    component: PrintDformsComponent
  }, 
  {
    path:'preexam-reports',
    component:PreExamReportsComponent
  }, {
    path:'complete-examfee-registration',
    component:CompleteExamFeeRegistrationComponent
  },
  {
    path:'revaluation-fee-collection',
    component:RevaluationFeeCollectionComponent
  },
  {
    path: 'exam-fee-collection/print-examform',
    component: ExamFormComponent
  }, 
  {
    path:'exam-hallticket/print-exam-hallticket',
    component:PrintExamHallticketComponent
  },
  {
    path:'print-barcode-stickers',
    component:PrintBarcodeStickersComponent
  },
  {
    path:'create-question-paper',
    component:CreateQuestionPaperComponent
  },
  {
    path:'create-question-paper/manage-questions',
    component:ManageQuestionsComponent
  },
  {
    path:'create-question-paper/manage-questions/question-bank',
    component:QuestionBankComponent
  },
  {
    path:'create-question-paper/manage-questions/manual-questions',
    component:ManualQuestionsComponent
  },
  {
    path:'print-attendance-marking-sheet-stickers',
    component:PrintAttendanceMarkingSheetStickersComponent
  },
  {
    path:'print-attendance-marking-sheet-stickers/print-barcode-stickers',
    component:PrintBarcodesStickersComponent
  },
  {
    path:'print-attendance-marking-sheet-stickers/print-exam-attendance-marking-sheet',
    component:PrintAttendenceMarksheetComponent
  },
  {
    path:'exam-lab-batches-students',
    component:ExamLabBatchesStudentsComponent
  },
  {
    path:'student-exam-lab-batches',
    component:StudentExamLabBatchesComponent
  },
  {
    path:'print-formA',
    component:PrintFormAComponent
  },
  {
    path:'print-form',
    component:PrintExamFormComponent
  },
  {
    path:'exam-forms',
    component:ExamFormsComponent
  },
  {
    path: 'exam-fee-collection/print-examfee-receipt',
    component: PrintRegularExamFeeReceiptComponent
  }, 
  {
    path: 'exam-registration-manual-feeless',
    component: ExamRegistrationManualFeelessComponent
  },
  {
    path: 'college-exam-timetable-view',
    component: CollegeExamTimetableViewComponent
  },
  {
    path: 'exam-attendancewise-subject-barcode',
    component: ExamAttendancewiseSubjectBarcodeComponent
  }, 
  {
    path: 'attendance-print-Dform',
    component: AttendancePrintDformsComponent
  }, 
  {
    path : 'attendance-print-formA',
    component:AttendancePrintFormAComponent
  },
  {
    path: 'exam-scheduling-forms',
    component : ExamSchedulingFormsComponent
  },
  {
    path: 'exam-scheduling-forms/add-exam-scheduling-forms',
    component : AddExamSchedulingFormsComponent
  },
  {
    path: 'exam-scheduling-forms/add-exam-scheduling-forms/print-scheduling-seating-stickers',
    component : PrintSchedulingSeatingStickersComponent
  },
  {
    path: 'exam-scheduling-forms/add-exam-scheduling-forms/print-scheduling-group-seating-stickers',
    component : PrintSchedulingGroupStickersComponent
  }
  ];
  
@NgModule({
    imports: [
        RouterModule.forChild(routes),
        FuseSharedModule,
        TranslateModule,
        MaterialModule,
        MaterialTimeControlModule,
        CommonModule,
        NgxMaterialTimepickerModule,
    ],
    declarations: [
       ExamDashboardComponent,
       ExamFeeStructureComponent,
       ExamFeeStructureModalComponent,  
       ExamDashboardComponent,
       InvigilatorAllotmentComponent,
       InvigilatorAllotmentModalComponent,
       ViewExamFeeStructureComponent,
       AllocateRoomModalComponent,
       RegularExamFeeCollectionComponent,
       ViewSubjectsComponent,
       ExamRegistrationWithoutFeeComponent,
       InternalExamRegistrationMultipleComponent,
       ExamFeePayDialogComponent,
       ConfirmationComponent,
       DeleteExamReceiptComponent,
       StudentRoomAllotmentComponent,
       AllotmentComponent,
       ExamHallticketComponent,
       ViewExistInvigilatorComponent,
       AdditionalExamFeesComponent,
       AddAdditionalFeeComponent,
       ExamFeeRegistrationComponent,
       StudentExamFeeRegistrationComponent,
       ExamFeePaymentComponent,
       ExamFeePayModalComponent,
       ViewTransactionsComponent,
       TransactionsComponent,
       PatymRedirectComponent,
       PatymRequestComponent,
       WelcomePatymComponent,
       NotRegisteredStudentsComponent,
       ExamSetupDetailsComponent,
       AddSetupDetailsComponent,
       SubjectSourceOutComeMappingComponent,
       ExamStudentBarcodeGenerationComponent,
       ExamSubjectBarcodeGenerationComponent,
       OmrSheetsDesignComponent,
       UploadExamOmrComponent,
       OmrSinglePageDesignComponent,
       PreExamReportsComponent,
       CompleteExamFeeRegistrationComponent,
       RevaluationFeeCollectionComponent,
       DeleteExamRecieptComponent,
       PrintExamHallticketComponent,
       CreateQuestionPaperComponent,
       PrintBarcodeStickersComponent,
       ManageQuestionsComponent,
       QuestionBankComponent,
       ManualQuestionsComponent,
       PrintAttendanceMarkingSheetStickersComponent,
       PrintAttendenceMarksheetComponent,
       PrintDformsComponent,
       ExamLabBatchesStudentsComponent,
       StudentExamLabBatchesComponent,
       UpdateExamLabBatchesComponent,
       PrintFormAComponent,
       ExamFormsComponent,
       PrintRegularExamFeeReceiptComponent,
       ExamRegistrationManualFeelessComponent,
       PayDialogComponent,
       CollegeExamTimetableViewComponent,
       ExamFormComponent,
       PrintExamFormComponent,
       ExamAttendancewiseSubjectBarcodeComponent,
       AttendancePrintDformsComponent,
       AttendancePrintFormAComponent,
       UploadPapersComponent,
       AdditionalExamFeeCollectionComponent,
       PrintAdditionalExamFeeReceiptComponent,
       DeleteAdditionalExamReceiptComponent,
       AdditionalExamFormComponent,
       AdditionalExamFeePayDialogComponent,
       ExamSchedulingFormsComponent,
       AddExamSchedulingFormsComponent,
       PrintSchedulingSeatingStickersComponent,
       PrintSchedulingGroupStickersComponent
    ],
    entryComponents: [
       InvigilatorAllotmentModalComponent,
       ViewExamFeeStructureComponent,
       AllocateRoomModalComponent,
       ViewSubjectsComponent,
       ExamFeePayDialogComponent,
       ConfirmationComponent,
       DeleteExamReceiptComponent,
       ViewExistInvigilatorComponent,
       AddAdditionalFeeComponent,
       ExamFeePayModalComponent,
       ViewTransactionsComponent,
       TransactionsComponent,
       AddSetupDetailsComponent
    ],
    schemas: [
       CUSTOM_ELEMENTS_SCHEMA
    ],
    providers: [CrudService, GenericFunctions]
  
  })
export class PreExaminationModule { 
  constructor(
    private _fuseSidebarService: FuseSidebarService,
)
{
    this._fuseSidebarService.getSidebar('navbar').toggleOpen();
}
 }
