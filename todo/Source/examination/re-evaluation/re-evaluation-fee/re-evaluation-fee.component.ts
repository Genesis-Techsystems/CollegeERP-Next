import { Component, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { TimingSlot } from 'app/main/models/timingSlot';
import { CONSTANTS } from 'app/main/common/constants';
import { SnotifyService } from 'ng-snotify';
import { GenericFunctions } from 'app/main/common/generic-functions';
import { CrudService } from 'app/main/services/crud.service';
import { NgxSpinnerService } from 'ngx-spinner';
import { Router, ActivatedRoute } from '@angular/router';
import { Location } from '@angular/common';
import { FormGroup, Validators, FormBuilder, FormControl } from '@angular/forms';
import { College } from 'app/main/models/college';
import { AcademicYear } from 'app/main/models/academicYear';
import { MatDialog } from '@angular/material/dialog';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { ParametersService } from 'app/main/services/parameters.service';
import { ReplaySubject } from 'rxjs/internal/ReplaySubject';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/internal/operators/takeUntil';
import { ViewSubjectsComponent } from '../../pre-examination/view-subjects/view-subjects.component';
import { SubjectsModalComponent } from './subjects-modal/subjects-modal.component';



@Component({
  selector: 'app-re-evaluation-fee',
  templateUrl: './re-evaluation-fee.component.html',
  styleUrls: ['./re-evaluation-fee.component.scss']
})
export class ReEvaluationFeeComponent implements OnInit {

  displayedColumns: string[] = ['mark', 'subject', 'totalAmount', 'grade', 'gradePoints'];
  duplicateDisplayedColumns: string[] = ['id', 'subject', 'totalAmount'];
 // --------------------------
// PHOTO COPY COLUMN CONTROL
// --------------------------
isPhotoCopySelected: boolean = false;

// Columns when Photo Copy is selected → includes "View"
historyColumnsPhotoCopy: string[] = [
  'hallticket_number',
  'course_year_code',
  'gd_code',
  'subject_details',
  'fee_amount',
  'photocopy'
];

// Columns when NOT Photo Copy → hides "View"
historyColumnsNoPhotoCopy: string[] = [
  'hallticket_number',
  'course_year_code',
  'gd_code',
  'subject_details',
  'fee_amount'
];
historyColumns: string[] = []


  dataSource: MatTableDataSource<any>;
  duplicateDataSource: MatTableDataSource<any>;
  timingSetForm: FormGroup;
  hallticketsList = []
 

  revisionHistoryList: any[] = [];

  examsList: any
  @ViewChild(MatPaginator) paginator: MatPaginator;
 @ViewChild('photoCopyDialog') photoCopyDialog!: TemplateRef<any>;
  @ViewChild(MatSort) sort: MatSort;
  flag = false;
  show = false;
  reEvaluationForm: FormGroup;
  step = 0;
  private _onDestroy = new Subject<void>();
  searchStudents = [];
  private studentSearchUrl = CONSTANTS.studentSearchUrl
  private examStudentRevisedDetailsUrl = CONSTANTS.examStudentRevisedDetailsUrl
  private addExamAdditionalFeeReceiptUrl = CONSTANTS.addExamAdditionalFeeReceiptUrl
  private generalDetailsUrl = CONSTANTS.generalDetailsUrl;
  private studentFeeRevaluationUrl = CONSTANTS.studentFeeRevaluationUrl;
  private examFeeType = CONSTANTS.examFeeType;
  private generalDetailsByCodeUrl = CONSTANTS.generalDetailsByCodeUrl;
  private paymentMode = CONSTANTS.paymentMode;
  private isActive = CONSTANTS.isActive;
  public studentFilterCtrl: FormControl = new FormControl();
  public filteredStudents: ReplaySubject<any[]> = new ReplaySubject<any[]>(1);
  private examFeeReceiptCrudUrl = CONSTANTS.examFeeReceiptCrudUrl;
  private getExamFiltersBycodeUrl  = CONSTANTS.getExamFiltersBycodeUrl;
  private revisionType = CONSTANTS.revisionType;
  miniopath = CONSTANTS.MINIO

  DetailsList = [];
  examRevisionStdDetails = [];
  generalDetails = [];
  CoursesList = [];
  checksubject = false;
  SelectedList = [];
  examList: any[];
  photocopyData: any[] = []; 
  paymentData: {};
  examRevisionSubjectDTOs = [];
  student: any;
  examRevisionStdDetailslist: any[];
  selectList: boolean;
  duplicateSelectedList = [];
  examRevisionSubject: any[];
  amount: any;
  errorMsg = []
  SelectedCourseList: any[];
  checkCourse: boolean=true;
  examRevisionStdDetailsList: any[];
  markList: any[];
  Mark:boolean;
  paybutton: boolean;
  reEvaluationList=[];
  reEvaluationDataList=[];
  CoursesYearList=[];
  examFeeTypes: any;
  paymentModes: any;
  examFeeAmount: number;
  subjectIds= [];
  feeReceiptsList: any;
  feeReceiptsData: unknown[];
  feeReceipts: any;
  receipts=[];
  receiptsLists=[];
  mainList=[];
  params: any = {};
  loginUser : any;
  userroles = [];
  isAllowPayment = false;

  constructor(private formBuilder: FormBuilder, private dialog: MatDialog, private snotifyService: SnotifyService, private genericFunctions: GenericFunctions,
    private crudService: CrudService, private spinner: NgxSpinnerService, public router: Router, private route: ActivatedRoute, private paramaters: ParametersService,
    private _location: Location) {
    this.getGeneralDetails();
  }

  // tslint:disable-next-line:typedef
  ngOnInit() {
    this.reEvaluationForm = this.formBuilder.group({
      studentId: ['', Validators.required],
      examId: ['', Validators.required],
      revisionTypeId: ['',],
      amount: [{ value: 0, disabled: true }],
         fDate: [this.genericFunctions.moment()],
         feeComments: [],
         receiptDate: [this.genericFunctions.moment()],
         transactionNo: [],
         examFeeAmount: [0],
         otherPaymentNumber: [],
         referenceNumber: [],
         ddno: [],
         chequeNo: [],
         paymentModeCatId: [131, Validators.required],

    });

    this.dataSource = new MatTableDataSource();
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
    this.studentFilterCtrl.valueChanges
      .pipe(takeUntil(this._onDestroy))
      .subscribe(() => {
        this.filterStd();
      });
this.route.queryParams
    .subscribe(params => {
      this.params = params;
    });   
      if (this.params.stdRollNumber !== null){
        this.enteredStudent(this.params.stdRollNumber, 'student');
    }
    this.searchStudents.push({ firstName: 'Search by student name or hallticket.no' });

    this.filteredStudents.next(this.searchStudents.slice());
    if( this.examRevisionStdDetails){
      this.examRevisionStdDetails.forEach(item => {
        if (item.already_reg === 1) {
          item.disabled = true;
        }
      });
    }
    if (this.genericFunctions.getSecuredValue('userDetails') !== null && this.genericFunctions.getSecuredValue('userDetails') !== ''){
        this.loginUser = JSON.parse(this.genericFunctions.getSecuredValue('userDetails'));
        this.userroles = this.loginUser.userRoles;
      }
      if(this.userroles && this.userroles.length > 0){
        for(let i=0;i<this.loginUser.userRoles.length;i++){
        if(this.loginUser.userRoles[i].roleName=="ADMIN"){
            this.isAllowPayment = true;
        }if(this.loginUser.userRoles[i].roleName=="ExamController"){
            this.isAllowPayment = true;
        }
      }
      }
  }
  enteredStudent(event,name): void {
    this.flag = false;
    this.receipts = [];
    this.receiptsLists = [];
  if(name === 'ADMIN'){
    if (event.target.value.length > 4) {
      /*----------- STUDENTS -----------*/
      this.crudService.listByIds(this.studentSearchUrl, event.target.value, 'q')
        .subscribe(result => {
          if (result.statusCode === 200) {
            if (result.success) {
              this.searchStudents = result.data;
              this.filteredStudents.next(this.searchStudents.slice());
            } else {
              this.snotifyService.info(result.message, 'Info!');
            }
          } else {
            this.snotifyService.error(result.message, 'Error!');
          }
        }, error => {
          if (error.error.statusCode === 401) {
            this.snotifyService.error(error.error.message, 'Error!');
            this.genericFunctions.logOut(this.router.url);
          } else {
            this.snotifyService.error(CONSTANTS.message.CON_ERROR, 'Error!');
          }
        });
    }
  }
    else{
    /*----------- STUDENTS -----------*/
    this.spinner.show();
    this.crudService.listByTwoIds(this.studentSearchUrl, 'true', event, 
       'isActive', 'q')
    .subscribe(result => {
      this.spinner.hide();
      if (result.statusCode === 200){
                if (result.data && result.data !== '') {  
                    this.searchStudents = result.data;
                    this.filteredStudents.next(this.searchStudents.slice());
                    this.reEvaluationForm.get('studentId').setValue(+this.params.studentId);
                      this.selectedStudent();
                }
            }else{
                this.snotifyService.error(result.message, 'Error!');
            } 
        }, error => {
          this.spinner.hide();
          if (error.error.statusCode === 401){
            this.snotifyService.error(error.error.message, 'Error!');
            this.genericFunctions.logOut(this.router.url);
        }else{
            this.snotifyService.error(CONSTANTS.message.CON_ERROR, 'Error!');
        }
    });
  }
  }
  getGeneralDetails(): void{
    /*----------- PAYMENT MODE -----------*/
    this.crudService.listDetailsByTwoIds(this.generalDetailsUrl, this.paymentMode , 'true', this.generalDetailsByCodeUrl, this.isActive)
    .subscribe(result => {
        if (result.statusCode === 200){
                  if (result.data.resultList && result.data.resultList !== '') {
                      this.paymentModes = result.data.resultList;
                  } else {
                      this.snotifyService.success(result.message, 'Success!');
                  }
              }else {
                  this.snotifyService.error(result.message, 'Error!');
              }
      }, error => {
          if (error.error.statusCode === 401){
              this.snotifyService.error(error.error.message, 'Error!');
              this.genericFunctions.logOut(this.router.url);
          }else{
              this.snotifyService.error(CONSTANTS.message.CON_ERROR, 'Error!');
          }
      });

    this.crudService.listDetailsByTwoIds(this.generalDetailsUrl, this.examFeeType , 'true', this.generalDetailsByCodeUrl, this.isActive)
      .subscribe(result => {
          if (result.statusCode === 200){
                    if (result.data.resultList && result.data.resultList !== '') {
                        this.examFeeTypes = result.data.resultList;
                    } else {
                        this.snotifyService.success(result.message, 'Success!');
                    }
                }else {
                    this.snotifyService.error(result.message, 'Error!');
                }
        }, error => {
            if (error.error.statusCode === 401){
                this.snotifyService.error(error.error.message, 'Error!');
                this.genericFunctions.logOut(this.router.url);
            }else{
                this.snotifyService.error(CONSTANTS.message.CON_ERROR, 'Error!');
            }
        });
  }

  filterStd(): void {
    if (!this.searchStudents) {
      return;
    }
    // get the search keyword
    let search = this.studentFilterCtrl.value;
    if (!search) {
      this.filteredStudents.next(this.searchStudents.slice());
      return;
    } else {
      search = search.toLowerCase();
    }
    // filter the banks
    this.filteredStudents.next(
      this.searchStudents.filter(x => x.firstName.toLowerCase().indexOf(search) > -1)
    );
  }
  
  selectedStudent() {
    this.student = this.searchStudents.filter(x => (x.studentId === this.reEvaluationForm.value.studentId))[0];
    this.flag = false;
    this.paybutton = false;
    this.DetailsList = []
    this.generalDetails = []
    this.examRevisionSubject = []
    this.examRevisionStdDetails = []
    this.SelectedList = []
    this.CoursesList = []
    this.SelectedList = [];
    this.duplicateSelectedList = []
    this.examRevisionStdDetailsList=[]
    this.dataSource = new MatTableDataSource<any>([]);
    this.examList = [];
    this.receipts = [];
    this.receiptsLists = [];
    this.reEvaluationForm.get('amount').setValue('')
    this.spinner.show()
    let request = [
      { paramName: 'in_flag', paramValue: 'std_exam_filters' },
      { paramName: 'in_flag_type', paramValue: '' },
      { paramName: 'in_university_id', paramValue: 0 },
      { paramName: 'in_college_id', paramValue: 0 },
      { paramName: 'in_course_id', paramValue: 0 },
      { paramName: 'in_course_group_id', paramValue: 0 },
      { paramName: 'in_course_year_id', paramValue: 0 },
      { paramName: 'in_exam_id', paramValue: 0 },
      { paramName: 'in_academic_year_id', paramValue: 0 },
      { paramName: 'in_regulation_id', paramValue: 0 },
      { paramName: 'in_subject_id', paramValue: 0 },
      { paramName: 'in_loginuser_empid', paramValue: +localStorage.getItem('employeeId') },
      { paramName: 'in_loginuser_roleid', paramValue: 0 },
      { paramName: 'in_sub_flag_type', paramValue: '' },
      { paramName: 'in_param1', paramValue: this.reEvaluationForm.value.studentId },
      { paramName: 'in_param2', paramValue: 0 },
    ];
    this.crudService.getDetailsByRequest(this.getExamFiltersBycodeUrl, '', request, '&')
      .subscribe(result => {
        this.spinner.hide();
        if (result.statusCode === 200) {
          if (result.data && result.data !== '' && result.data.result.length > 0) {
            this.DetailsList = result.data.result[0];
            const ExamData = this.DetailsList.map(({ fk_exam_id }) => fk_exam_id);
            this.examList = this.DetailsList.filter(({ fk_exam_id }, index) =>
              !ExamData.includes(fk_exam_id, index + 1));
            if(this.params.examId !== null){
              this.reEvaluationForm.get('examId').setValue(+this.params.examId)
            this.selectedExam(this.reEvaluationForm.value.examId)
            }else if (this.examList.length > 0) {
            this.reEvaluationForm.get('examId').setValue(this.examList[0].fk_exam_id)
            this.selectedExam(this.reEvaluationForm.value.examId)
          }
          return
              this.examRevisionStdDetailsList=this.examRevisionStdDetails
              for (let index = 0; index < this.examRevisionStdDetails.length; index++) {
                this.examRevisionStdDetails[index].Mark=false
                this.displayedColumns= ['mark', 'subject', 'totalAmount', 'feeReceiptNo', 'grade', 'gradePoints'];
                 }
                 
              if (this.examRevisionSubject.length > 0) {
                for (let index = 0; index < this.examRevisionStdDetails.length; index++) {
              if(this.examRevisionSubject.filter(x=>(x.subject_code === this.examRevisionStdDetails[index].subject_code)).length>0){
                this.examRevisionStdDetails[index].Mark=true
                this.displayedColumns= ['subject', 'totalAmount', 'feeReceiptNo', 'grade', 'gradePoints'];

               }
                 else{
                  this.examRevisionStdDetails[index].Mark=false
                this.displayedColumns= ['mark', 'subject', 'totalAmount', 'feeReceiptNo', 'grade', 'gradePoints'];

                 }
                  
                }
              }
              else{
                for (let index = 0; index < this.examRevisionStdDetails.length; index++) {
                  this.examRevisionStdDetails[index].Mark=false
                  this.displayedColumns= ['mark', 'subject', 'totalAmount', 'feeReceiptNo', 'grade', 'gradePoints'];
                }
              }
              
                this.dataSource = new MatTableDataSource<any>(this.examRevisionStdDetails);
                setTimeout(() => this.dataSource.paginator = this.paginator);
                this.dataSource.sort = this.sort;
                this.SelectedList=this.examRevisionSubject
                 this.duplicateDataSource=new MatTableDataSource(this.SelectedList)
            
            if (this.generalDetails.length > 0) {
              this.reEvaluationForm.get('revisionTypeId').setValue(this.generalDetails.filter(x => (x.revisiontype == "REEVALUATION"))[0].fk_examrevisiontype_catdet_id)
              this.amount = this.generalDetails.filter(x => (x.fk_examrevisiontype_catdet_id == this.reEvaluationForm.value.revisionTypeId && x.fk_course_id == this.student?.courseId))[0]?.subject_reval_amount

            }
            if (this.examRevisionStdDetails.length > 0) {
              const CoursesData = this.examRevisionStdDetailsList.map(({ fk_course_year_id }) => fk_course_year_id);
              this.CoursesList = this.examRevisionStdDetailsList.filter(({ fk_course_year_id }, index) =>
                !CoursesData.includes(fk_course_year_id, index + 1));

              const ExamData = this.examRevisionStdDetails.map(({ fk_exam_id }) => fk_exam_id);
              this.examList = this.examRevisionStdDetails.filter(({ fk_exam_id }, index) =>
                !ExamData.includes(fk_exam_id, index + 1));

            }
            if (this.examList.length > 0) {
              this.reEvaluationForm.get('examId').setValue(this.examList[0].fk_exam_id)
            }
            if(this.CoursesList.length>0){
              this.CoursemarkItems()
            }
            
           
          } else {
            this.snotifyService.success(result.message, 'Success!');
          }
        } else {
          this.snotifyService.error(result.message, 'Error!');
        }
      }, error => {
        this.spinner.hide();
        if (error.error.statusCode === 401) {
          this.snotifyService.error(error.error.message, 'Error!');
          this.genericFunctions.logOut(this.router.url);
        } else {
          this.snotifyService.error(CONSTANTS.message.CON_ERROR, 'Error!');
        }
      });

  }
  selectedExam(examId){
    this.spinner.show();
    this.reEvaluationForm.get('amount').setValue('');
    this.reEvaluationForm.get('revisionTypeId').setValue('');
    this.flag = false;
    this.paybutton = false;
    this.reEvaluationList = []
    this.reEvaluationDataList = []
    this.CoursesYearList = [];
    this.SelectedCourseList = [];
    this.examRevisionStdDetails = [];
    this.receipts = [];
    this.receiptsLists = [];
    this.SelectedList = [];
    this.duplicateSelectedList = [];
    this.duplicateDataSource = new MatTableDataSource([]);
    if(examId !== null){
            this.crudService.listDetailsByTwoIds(this.generalDetailsUrl, this.revisionType, 'true', this.generalDetailsByCodeUrl, this.isActive)
            .subscribe(result => {
              this.spinner.hide();
                if (result.statusCode === 200){
                            if (result.data.resultList && result.data.resultList !== '') {
                                this.reEvaluationDataList = result.data.resultList;
                                if (this.reEvaluationDataList.length > 0) {
                                  // this.reEvaluationForm.get('revisionTypeId').setValue(this.reEvaluationDataList[0].generalDetailId)
                                  // this.selectedRevision(this.reEvaluationForm.value.revisionTypeId)
                                }
                              //  this.examRevisoinFee.examRevisionTypeId=this.revisionTypes[0].generalDetailId
         
                            } else {
                                this.snotifyService.success(result.message, 'Success!');
                            }
                        }else {
                            this.snotifyService.error(result.message, 'Error!');
                        }
                }, error => {
                 this.spinner.hide();
                if (error.error.statusCode === 401){
                    this.snotifyService.error(error.error.message, 'Error!');
                    this.genericFunctions.logOut(this.router.url);
                }else{
                    this.snotifyService.error(CONSTANTS.message.CON_ERROR, 'Error!');
                }
            });
      }
  }
selectedRevision(revisionTypeId: number) {
  console.log(revisionTypeId, "revisionTypeId");
  // Determine if selected revision type is "PHOTOCOPY"
const selectedType = this.reEvaluationDataList.find(
  x => x.generalDetailId === revisionTypeId
);

this.isPhotoCopySelected = selectedType?.generalDetailDisplayName
  ?.toLowerCase()
  ?.includes("photo");

// Switch table columns based on selection
// Switch table columns based on selection
this.historyColumns = this.isPhotoCopySelected
  ? this.historyColumnsPhotoCopy
  : this.historyColumnsNoPhotoCopy;

console.log("Columns used: ", this.historyColumns);


console.log("PhotoCopy Selected: ", this.isPhotoCopySelected);
console.log("Columns used: ", this.historyColumnsPhotoCopy);

  this.reEvaluationForm.get('amount').setValue('');
  this.flag = true;
  this.paybutton = false;

  this.DetailsList = [];
  this.receipts = [];
  this.receiptsLists = [];
  this.CoursesYearList = [];
  this.SelectedCourseList = [];
  this.examRevisionStdDetails = [];
  this.SelectedList = [];
  this.duplicateSelectedList = [];
  this.duplicateDataSource = new MatTableDataSource([]);

  this.spinner.show();

  // *********** FIRST SP REQUEST *************
  let request1 = [
    { paramName: 'in_flag', paramValue: 'examrevision_std_details' },
    { paramName: 'in_exam_id', paramValue: this.reEvaluationForm.value.examId },
    { paramName: 'in_course_id', paramValue: 0 },
    { paramName: 'in_course_group_id', paramValue: 0 },
    { paramName: 'in_course_year_id', paramValue: 0 },
    { paramName: 'in_student_id', paramValue: this.reEvaluationForm.value.studentId },
    { paramName: 'in_loginemp_id', paramValue: 0 },
    { paramName: 'in_subject_id', paramValue: 0 }
  ];

  this.crudService.getDetailsByRequest(
    this.examStudentRevisedDetailsUrl,
    '',
    request1,
    '&'
  )
  .subscribe(result => {

    if (result.statusCode === 200) {

      if (result.data && result.data !== '' && result.data.result.length > 0) {

        this.DetailsList = result.data.result[0];
        this.receipts = result.data.result[1];

        if (this.DetailsList && this.DetailsList.length > 0) {
          this.setCourseYear();
        }

        if (this.receipts && this.receipts.length > 0) {
          this.receiptsLists = Object.values(
            this.receipts.reduce((acc, curr) => {
              const id = curr.fk_exam_addt_fee_receipt_id;

              if (!acc[id]) {
                acc[id] = {
                  fk_exam_addt_fee_receipt_id: id,
                  addt_receipt_no: curr.addt_receipt_no,
                  fk_student_id: curr.fk_student_id,
                  hallticket_number: curr.hallticket_number,
                  course_code: curr.course_code,
                  course_year_code: curr.course_year_code,
                  student_name: curr.student_name,
                  group_code: curr.group_code,
                  year_no: curr.year_no,
                  exam_addt_fee: curr.exam_addt_fee,
                  exam_fee_amount: curr.exam_fee_amount,
                  exam_fine_amount: curr.exam_fine_amount,
                  exam_total_amount: curr.exam_total_amount,
                  fee_receipt_no: curr.fee_receipt_no,
                  payment_mode: curr.payment_mode,
                  exam_type_name: curr.exam_type_name,
                  u_address: curr.u_address,
                  u_logo_filename: curr.u_logo_filename,
                  father_name: curr.father_name,
                  exam_name: curr.exam_name,
                  college_name: curr.college_name,
                  receipt_date: curr.receipt_date,
                  transaction_no: curr.transaction_no,
                  subjects: []
                };
              }

              acc[id].subjects.push({ ...curr });
              return acc;

            }, {})
          );
        }

        // *********** SECOND SP CALL (history) *************
        let request2 = [
          { paramName: 'in_flag', paramValue: 'student_revision_request' },
          { paramName: 'in_exam_id', paramValue: this.reEvaluationForm.value.examId },
          { paramName: 'in_student_id', paramValue: this.reEvaluationForm.value.studentId },
          { paramName: 'in_subject_id', paramValue: 0 }
        ];

        this.callRevisionHistory(request2); // separate function for clarity
      }

    } else {
      this.snotifyService.error(result.message, 'Error!');
    }

    this.spinner.hide();

  }, error => {
    this.spinner.hide();
    if (error.error.statusCode === 401) {
      this.snotifyService.error(error.error.message, 'Error!');
      this.genericFunctions.logOut(this.router.url);
    } else {
      this.snotifyService.error(CONSTANTS.message.CON_ERROR, 'Error!');
    }
  });
}



getPhotocopyDetails(row: any) {

    const request = [
      { paramName: 'in_flag', paramValue: 'student_evaluation_details' },
      { paramName: 'in_exam_id', paramValue: this.reEvaluationForm.value.examId },
      { paramName: 'in_student_id', paramValue: this.reEvaluationForm.value.studentId },
      { paramName: 'in_subject_id', paramValue: 0 }
    ];

    this.crudService.getDetailsByRequest(
        this.studentFeeRevaluationUrl,
        '',
        request,
        '&'
    ).subscribe(res => {

        if (res.statusCode === 200 && res.data?.result?.length > 0) {

            this.photocopyData = res.data.result[0];

            this.dialog.open(this.photoCopyDialog, {
                width: '900px',
                panelClass: 'custom-dialog'
            });
        }
    });

}


callRevisionHistory(request2: any) {

  this.crudService.getDetailsByRequest(
    this.studentFeeRevaluationUrl,
    '',
    request2,
    '&'
  ).subscribe(res => {

    if (res.statusCode === 200) {

      // FIX: Flatten double-nested array
      if (res.data && res.data.result && res.data.result.length > 0) {

        // result looks like: [ [ {...} ] ]
        this.revisionHistoryList = res.data.result[0] || [];
      } else {
        this.revisionHistoryList = [];
      }
    }

  }, err => {
    this.snotifyService.error("Failed to load revision history", "Error");
  });
}


  setCourseYear(){
    // this.CoursesYearList = [];
    // this.SelectedCourseList = [];
    // this.examRevisionStdDetails = [];
  this.markItems();
    this.CoursesList = this.DetailsList.filter(x =>
      x.fk_exam_id === this.reEvaluationForm.value.examId &&
      x.fk_adt_examfeetype_catdet_id === this.reEvaluationForm.value.revisionTypeId
    );
    // Extract unique Course Year records
    const seen = new Set();
    this.CoursesYearList = this.CoursesList.filter(item => {
      const duplicate = seen.has(item.fk_course_year_id);
      seen.add(item.fk_course_year_id);
      return !duplicate;
    });
    if (this.CoursesYearList.length > 0) {
      this.CoursemarkItems();
    }
  }
  CoursemarkItems() {
  this.examRevisionStdDetails = [];
  this.SelectedCourseList = [];
  this.paybutton = false;
  this.receipts = [];
  this.receiptsLists = [];
  this.duplicateSelectedList = [];
  this.examRevisionStdDetails = [];
  this.reEvaluationForm.get('amount')?.setValue('');

  if (this.checkCourse) {
    // Select all distinct course years
    this.CoursesYearList.forEach(course => course.check = true);

    // Get all relevant subjects from DetailsList
    this.examRevisionStdDetails = this.DetailsList.filter(item =>
      this.CoursesYearList.some(course =>
        course.fk_course_year_id === item.fk_course_year_id &&
        course.fk_adt_examfeetype_catdet_id === this.reEvaluationForm.value.revisionTypeId
      )
    );

    this.SelectedCourseList = [...this.examRevisionStdDetails];

    // ✅ Remove duplicates by fk_subject_id
    this.examRevisionStdDetails = this.examRevisionStdDetails.filter(
      (item, index, self) =>
        index === self.findIndex(t => t.fk_subject_id === item.fk_subject_id)
    );

  } else {
    this.CoursesYearList.forEach(course => course.check = false);
    this.examRevisionStdDetails = [];
    this.SelectedCourseList = [];
  }

  // Set disabled state for already registered subjects
  this.examRevisionStdDetails.forEach(item => {
    if (item.already_reg === 1) {
      item.disabled = true;
    }
  });

  // Filter and sort
  this.examRevisionStdDetails = this.examRevisionStdDetails.filter(
    item => item.fk_adt_examfeetype_catdet_id === this.reEvaluationForm.value.revisionTypeId
  );
  this.examRevisionStdDetails = this.examRevisionStdDetails.sort((a, b) => a.order_no - b.order_no);

  console.log(this.examRevisionStdDetails, 'main');

  // Update datasource
  this.dataSource = new MatTableDataSource<any>(this.examRevisionStdDetails);
  setTimeout(() => this.dataSource.paginator = this.paginator);
  this.dataSource.sort = this.sort;

  const total = this.duplicateSelectedList.length * (this.CoursesYearList[0]?.fee || 0);
  this.reEvaluationForm.get('amount')?.setValue(total);
  this.examFeeAmount = total;

  this.markItems();
}

  
 checkedCourseYear(check: boolean, row: any) {
  this.paybutton = false;
  this.receipts = [];
  this.receiptsLists = [];
  this.duplicateSelectedList = [];
  this.examRevisionStdDetails = [];
  this.dataSource = new MatTableDataSource<any>([]);
  this.reEvaluationForm.get('amount').setValue('');

  row.check = check;

  if (check) {
    this.DetailsList.forEach(item => item.checked = false);
    const matchedData = this.DetailsList.filter(
      item => item.fk_course_year_id === row.fk_course_year_id
    );
    this.SelectedCourseList.push(...matchedData);
  } else {
    this.SelectedCourseList = this.SelectedCourseList.filter(item =>
      item.fk_course_year_id !== row.fk_course_year_id
    );
  }

  // Build unique subjects list
  const uniqueSubjects = new Map();
  this.SelectedCourseList.forEach(item => {
    uniqueSubjects.set(item.fk_subject_id, item);
  });
  this.examRevisionStdDetails = Array.from(uniqueSubjects.values());

  // ✅ Remove duplicates by fk_subject_id
  this.examRevisionStdDetails = this.examRevisionStdDetails.filter(
    (item, index, self) =>
      index === self.findIndex(t => t.fk_subject_id === item.fk_subject_id)
  );

  // Sort final list
  this.examRevisionStdDetails = this.examRevisionStdDetails.sort((a, b) => a.order_no - b.order_no);

  console.log(this.examRevisionStdDetails);

  // Update table
  this.dataSource = new MatTableDataSource<any>(this.examRevisionStdDetails);
  setTimeout(() => this.dataSource.paginator = this.paginator);
  this.dataSource.sort = this.sort;

  const total = this.duplicateSelectedList.length * (this.CoursesYearList[0]?.fee || 0);
  this.reEvaluationForm.get('amount')?.setValue(total);
  this.examFeeAmount = total;
}

     viewCourseYearSubjectsListDialog(data, name): void {
      if (name === 'receipt'){
         data.subjects = data.subjects;
      } 
      const dialogRef = this.dialog.open(SubjectsModalComponent, {
      width: '750px',
      data: data.subjects
      });
    }
  
markItems() {
  this.SelectedList = [];
  let totalAmount = 0;
  this.reEvaluationForm.get('amount')?.setValue('');
  this.paybutton = false;
  this.receipts = [];
  this.receiptsLists = [];
  this.duplicateSelectedList = [];

  // Loop through each subject
  this.examRevisionStdDetails.forEach((item) => {
    // No disabling at all
    if (item.already_reg === 1) {
        item.disabled = true;
        item.checked = false;
        return;
      }
    item.checked = this.checksubject;

    if (this.checksubject) {
      this.SelectedList.push(item);
      totalAmount += Number(item.fee) || 0;
    }
  });

  // ✅ Properly set total using SelectedList (not duplicateSelectedList)
  const total = this.SelectedList.length * (this.CoursesYearList[0]?.fee || 0);
  this.reEvaluationForm.get('amount')?.setValue(total);
  this.examFeeAmount = total;
}

  
  
  
checkedItems(check: boolean, i: number, row: any) {
   this.duplicateSelectedList = [];
   this.duplicateDataSource.data = [];
    this.reEvaluationForm.get('amount')?.setValue('');
  if (row.already_reg === 1) {
    row.checked = true;
    return;
  }

  row.checked = check;

  if (!check) {
    // Remove unchecked subjects from both selected lists
    this.SelectedList = this.SelectedList.filter(x => x.fk_subject_id !== row.fk_subject_id);
    this.duplicateSelectedList = this.duplicateSelectedList.filter(x => x.fk_subject_id !== row.fk_subject_id);

    // Refresh bottom table
    this.duplicateDataSource.data = [...this.duplicateSelectedList];
    this.duplicateDataSource._updateChangeSubscription();

    // ✅ Recalculate total only when unchecked (we’re removing)
    // const total = this.duplicateSelectedList.reduce((s, it) => s + (Number(it.fee) || 0), 0);
    // this.reEvaluationForm.get('amount')?.setValue(total);
    // this.examFeeAmount = total;
    const total = this.duplicateSelectedList.length * this.CoursesYearList[0]?.fee;
    this.reEvaluationForm.get('amount')?.setValue(total);
    this.examFeeAmount = total;
  }

  // ❌ DO NOT increase total here when check = true
  // Fee will increase only after clicking Add
}


validExamDate() {
  if (this.isAllowPayment === true) {
    this.AddData();
    return;
  }

  const toDate = this.examList.find(x => x.fk_exam_id === this.reEvaluationForm.value.examId)?.to_date;

  if (toDate) {
    const currentDate = this.genericFunctions.momentYMD();
    if (currentDate > toDate) {
      this.snotifyService.info('Exam Payment Date Had Expired');
    } else {
      this.AddData();
    }
  } else {
    this.snotifyService.info('No Exam To Date For The Selected Exam');
  }
}

AddData() {
  this.reEvaluationForm.get('amount')?.setValue('');
  this.reEvaluationForm.get('transactionNo')?.setValue('');
  this.reEvaluationForm.get('examFeeAmount')?.setValue('');
  this.reEvaluationForm.get('ddno')?.setValue('');
  this.reEvaluationForm.get('chequeNo')?.setValue('');
  this.reEvaluationForm.get('referenceNumber')?.setValue('');
  this.reEvaluationForm.get('otherPaymentNumber')?.setValue('');
  const topList = this.examRevisionStdDetails || [];

  const newlyChecked = topList.filter(row =>
    row.checked === true &&
    !this.duplicateSelectedList.some(d => d.fk_subject_id === row.fk_subject_id)
  );

  if (newlyChecked.length > 0) {
    this.duplicateSelectedList = [...this.duplicateSelectedList, ...newlyChecked];
  }

  this.duplicateDataSource.data = [...this.duplicateSelectedList];
  this.duplicateDataSource._updateChangeSubscription();

  const total = this.duplicateSelectedList.length * this.CoursesYearList[0]?.fee;
  this.reEvaluationForm.get('amount')?.setValue(total);
  this.examFeeAmount = total;

  // ✅ Keep SelectedList in sync for payFee()
  this.SelectedList = [...this.duplicateSelectedList];
}




  
  payFee() {
    this.examRevisionSubjectDTOs=[]
    this.paymentData = {}
    console.log('SelectedList before payFee:', this.SelectedList);

    if (this.SelectedList.length > 0) {
      this.spinner.show()
      for (let index = 0; index < this.SelectedList.length; index++) {
        this.subjectIds.push(this.SelectedList[index].fk_subject_id)
          this.examRevisionSubjectDTOs.push({
            collegeId: this.student.collegeId,
            courseYearId: this.SelectedList[index].fk_course_year_id,
            courseYearCode: this.SelectedList[index].course_year_code,
            addtFeeAmount:this.examFeeAmount,
            examAddtFeeReceiptId: null,
            addtReceiptNo: this.SelectedList[index].addt_receipt_no,
            addtReceiptDate: this.SelectedList[index].receipt_date,
            examId: this.reEvaluationForm.value.examId,
            examStdDetId: this.SelectedList[index].fk_exam_std_det_id,
            examRevisionTypeCatId: this.reEvaluationForm.value.revisionTypeId,
            studentId: this.reEvaluationForm.value.studentId,
            subjectId: this.SelectedList[index].fk_subject_id,
            previousMarks: this.SelectedList[index].subject_marks,
            isPublished: true,
            isActive: true,
          })
      }
      
      this.paymentData = {
        collegeId: this.student.collegeId,
        examFeeReceiptId: null,
        feeReceiptNo: this.examRevisionStdDetails[0].fee_receipt_no,
        feeAddtId: this.examRevisionStdDetails[0].fk_exam_fee_addt_id,
        courseYearId: this.SelectedList[0].fk_course_year_id,
        // addtFeeAmount:this.examRevisionStdDetails[0].addt_fee_amount,
        // examStdDetId: this.examRevisionStdDetails[0].pk_exam_std_det_id,
        examId: this.reEvaluationForm.value.examId,
        addtFeeAmount:this.examFeeAmount,
        examFeeStructureId:this.examRevisionStdDetails[0].pk_exam_fee_structure_id,
        examTotalAmount:this.examFeeAmount, 
        examtypeCatId:this.examRevisionStdDetails[0].fk_adt_examfeetype_catdet_id,
        addtExamFeeTypeCatId: this.examRevisionStdDetails[0].fk_adt_examfeetype_catdet_id,
        examRevisionTypeCatId : this.reEvaluationForm.value.revisionTypeId,
        collectedEmpId: this.examRevisionStdDetails[0].fk_collected_emp_id,
        addtReceiptNo: this.examRevisionStdDetails[0].addt_receipt_no,
        addtReceiptDate: this.examRevisionStdDetails[0].receipt_date,
        isRefund: this.examRevisionStdDetails[0].is_Refund,
        refundEmpId: this.examRevisionStdDetails[0].fk_refund_emp_id,
        refundDate: this.examRevisionStdDetails[0].refund_date,
        refundReason: this.examRevisionStdDetails[0].refund_Reason,
        examFeeAmount:this.examFeeAmount,
        receiptDate:this.reEvaluationForm.value.receiptDate,
        studentId:this.reEvaluationForm.value.studentId,
        paymentModeCatId:this.reEvaluationForm.value.paymentModeCatId,
        referenceNumber:this.reEvaluationForm.value.referenceNumber,
        chequeNo:this.reEvaluationForm.value.chequeNo,
        ddno:this.reEvaluationForm.value.ddno,
        otherPaymentNumber:this.reEvaluationForm.value.otherPaymentNumber,
        transactionNo:this.reEvaluationForm.value.transactionNo,
        feeComments:this.reEvaluationForm.value.feeComments,
        subjectIds:this.subjectIds.join(','),
        isActive: true,
        reason: null,
          examAdditionalFeeReceiptDTOs:[
              {
                collegeId:  this.student.collegeId,
                examFeeReceiptId: null,
                feeAddtId: this.examRevisionStdDetails[0].fk_exam_fee_addt_id,
                addtExamFeeTypeCatId: this.SelectedList[0].fk_adt_examfeetype_catdet_id,
                collectedEmpId: null,
                refundEmpId: null,
                examRevisionSubId: null,
                courseYearId: this.SelectedList[0].fk_course_year_id,
                addtFeeAmount:this.examFeeAmount,
                examAddtFeeReceiptId: null,
                examId: this.reEvaluationForm.value.examId,
                examStdDetId: this.SelectedList[0].fk_exam_std_det_id,
                examRevisionTypeCatId: this.reEvaluationForm.value.revisionTypeId,
                revisedByEmpId: null,
                studentId: this.reEvaluationForm.value.studentId,
                subjectId: null,
                addtReceiptDate:this.reEvaluationForm.value.receiptDate,
                subjectTypeId: null,
                regulationId: null,
                updatedUser: null,
                createdUser: null,
                reevaluationEnteredEmpId: null,
                receiptDate:this.reEvaluationForm.value.receiptDate,
                paymentModeCatId:this.reEvaluationForm.value.paymentModeCatId,
                referenceNumber:this.reEvaluationForm.value.referenceNumber,
                chequeNo:this.reEvaluationForm.value.chequeNo,
                ddno:this.reEvaluationForm.value.ddno,
                otherPaymentNumber:this.reEvaluationForm.value.otherPaymentNumber,
                transactionNo:this.reEvaluationForm.value.transactionNo,
                feeComments:this.reEvaluationForm.value.feeComments,
                isActive: true,
                examRevisionSubjectDTOs:  this.examRevisionSubjectDTOs
            }
           ]
      }
      this.crudService.add(this.addExamAdditionalFeeReceiptUrl, this.paymentData)
        .subscribe(result => {
          this.spinner.hide();
          if (result.statusCode === 200 && result.success == true) {
            // if (result.data && result.data !== '') {
            this.snotifyService.success(result.message, 'Success!');
            // this.selectedStudent()
            this.SelectedList = [];
            this.duplicateSelectedList = [];
            this.duplicateDataSource = new MatTableDataSource([]);
            this.selectedRevision(this.reEvaluationForm.value.revisionTypeId);
            this.reEvaluationForm.get('amount').setValue('');
            // }
          } else {
            this.snotifyService.error(result.message, 'Error!');
          }
        }, error => {
          this.spinner.hide();
          if (error.error.statusCode === 401) {
            this.snotifyService.error(error.error.message, 'Error!');
            this.genericFunctions.logOut(this.router.url);
          } else {
            this.snotifyService.error(CONSTANTS.message.CON_ERROR, 'Error!');
          }
        });
    }
    else {
      this.snotifyService.info('Please Selcet Any Course', '!');

    }
  }
  isEmptyObject(obj) {
    return (obj && (Object.keys(obj).length === 0));
  }

  goBack(): void {
    this._location.back();
  }
  applyFilter(filterValue) {
    this.dataSource.filter = filterValue.trim().toLowerCase();
    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
  }
  getTotal() {
    return this.SelectedList.map(t => t.subject_marks).reduce((acc, value) => acc + value, 0);
  }
  printForm(data){
    this.router.navigate(['admin-examination-management/re-evaluation/re-evaluation-fee/print-Forms'])
    this.paramaters.reEvaluationExamForm =  this.receipts.filter(x => (x.year_no === data.year_no));
  } 
  printreceipt(data){
    this.router.navigate(['admin-examination-management/re-evaluation/re-evaluation-fee/print-reevaluation-receipts'])
    this.paramaters.reEvaluationReceipt = data
  } 

openFile(path: string): void {
 
    window.open(this.miniopath + path, '_blank', 'width=800,height=600');
 
}

}