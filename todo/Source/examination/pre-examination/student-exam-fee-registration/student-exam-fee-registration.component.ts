import { Component, OnInit, ViewChild } from '@angular/core';
import { CONSTANTS } from 'app/main/common/constants';
import { FormGroup, FormControl, FormBuilder, Validators } from '@angular/forms';
import { College } from 'app/main/models/college';
import { AcademicYear } from 'app/main/models/academicYear';
import { Course } from 'app/main/models/course';
import { CourseGroup } from 'app/main/models/courseGroup';
import { GeneralDetail } from 'app/main/models/generalDetail';
import { ReplaySubject, Subject } from 'rxjs';
import { SnotifyService } from 'ng-snotify';
import { CrudService } from 'app/main/services/crud.service';
import { NgxSpinnerService } from 'ngx-spinner';
import { Router, ActivatedRoute } from '@angular/router';
import { GenericFunctions } from 'app/main/common/generic-functions';
import { takeUntil } from 'rxjs/operators';
import { TransactionsComponent } from './transactions/transactions.component';
import { ExamFeePayDialogComponent } from '../regular-exam-fee-collection/exam-fee-pay-dialog/exam-fee-pay-dialog.component';
import { ViewSubjectsComponent } from '../view-subjects/view-subjects.component';
import { MatDialog } from '@angular/material/dialog';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';

@Component({
  selector: 'app-student-exam-fee-registration',
  templateUrl: './student-exam-fee-registration.component.html',
  styleUrls: ['./student-exam-fee-registration.component.scss']
})

export class StudentExamFeeRegistrationComponent implements OnInit {

  // tslint:disable-next-line:max-line-length
  displayedColumns: string[] = ['id', 'studentName', 'courseYear', 'receiptNo', 'paymentModeCatDisplayName', 'receiptAmount', 
                                'regPaymentStatusCatDisplayName', 'transactions', 'actions'];
  dataSource: MatTableDataSource<any>;

  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild(MatSort) sort: MatSort;
  panelOpenState = true;

  private getDetailsByUniversityIdUrl = CONSTANTS.getDetailsByUniversityIdUrl;
  private collegeCrudUrl = CONSTANTS.collegeCrudUrl;
  private academicYearCrudUrl = CONSTANTS.academicYearCrudUrl;
  private getDetailsByCollegeIdUrl = CONSTANTS.getDetailsByCollegeIdUrl;
  private courseCrudUrl = CONSTANTS.courseCrudUrl;
  private getExamFiltersBycodeUrl = CONSTANTS.getExamFiltersBycodeUrl;
  private generalDetailsUrl = CONSTANTS.generalDetailsUrl;
  private generalDetailsByCodeUrl = CONSTANTS.generalDetailsByCodeUrl; 
  private examMasterUrl = CONSTANTS.examMasterUrl;
  private examStudentRegistrationPaymentCrudUrl = CONSTANTS.examStudentRegistrationPaymentCrudUrl;
  private isActive = CONSTANTS.isActive;
  private examPayStatus = CONSTANTS.examPayStatus;
  private examStudentRegPaymentUrl = CONSTANTS.examStudentRegPaymentUrl;
  private examStudentRegistrationCrudUrl = CONSTANTS.examStudentRegistrationCrudUrl;
  private examFeeStructureCourseyrUrl = CONSTANTS.examFeeStructureCourseyrUrl;
  private examFeeType = CONSTANTS.examFeeType;
  private examFeeReceiptUrl = CONSTANTS.examFeeReceiptUrl;
  private getStudentExamFeeStructureUrl = CONSTANTS.getStudentExamFeeStructureUrl;


  examFeeRegistrationForm: FormGroup;
  colleges: College[] = [];
  academicYears: AcademicYear[] = [];
  courses: Course[] = [];
  examsList: any[] = [];
  courseGroups: CourseGroup[] = [];
  student: any = {};
  subject: any = {};
  studentSubjects: any[] = [];
  courseYears: any[] = [];
  flag = false;
  isStatusflag = true;
  step = 0;  
  examPayStatuses: GeneralDetail[] = [];
  examFeeTypes: GeneralDetail[] = [];
  searchExams = [];
  feeRegistrationPayments = [];
  examPays = [];
  feeRegistrations = [];
  examFeeStructure = [];
  courseYearFee = [];
  totalReceiptAmt = 0;
  examFeeReceipt = [];
  examName;
  examFromDate;
  examToDate;
  isPay = false;
  universityId;

  public examFilterCtrl: FormControl = new FormControl();
  private _onDestroy = new Subject<void>();
  public filteredExams: ReplaySubject<any[]> = new ReplaySubject<any[]>(1);
  CollegesListFilterDetails: any;
  filtersDetailsList: any;
  academicYearsList: any;
  examsLists: any;
  examData: any[];
  CollegesListDetails: any;
  regulationFilterList: any;
  public ExamMasterFilterCtrl: FormControl = new FormControl();

  constructor(private formBuilder: FormBuilder, private snotifyService: SnotifyService,
              private crudService: CrudService, private spinner: NgxSpinnerService, private router: Router, 
              private dialog: MatDialog, private genericFunctions: GenericFunctions, private route: ActivatedRoute) {        
      this.getFiltersList();
  }

  ngOnInit(): void {
    this.examFeeRegistrationForm = this.formBuilder.group({
      courseId: ['', Validators.required],  
      collegeId: ['', Validators.required],  
      academicYearId: ['', Validators.required],  
      examId: ['', Validators.required],
    });
    this.getGeneralDetails();

    this.examFilterCtrl.valueChanges
      .pipe(takeUntil(this._onDestroy))
      .subscribe(() => {
        this.filterExam();
    });

    this.dataSource = new MatTableDataSource<any>(this.feeRegistrationPayments);
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;

    this.searchExams.push({examName: 'Search by Exam name.'});
    this.filteredExams.next(this.searchExams.slice());
  }

  filterExam(): void {
    if (!this.searchExams) {
      return;
    }
    // get the search keyword
    let search = this.examFilterCtrl.value;
    if (!search) {
      this.filteredExams.next(this.searchExams.slice());
      return;
    } else {
      search = search.toLowerCase();
    }
    // filter the banks
    this.filteredExams.next(
      this.searchExams.filter(x => x.examName.toLowerCase().indexOf(search) > -1)
    );
  }

   // tslint:disable-next-line: use-lifecycle-interface
   ngOnDestroy(): void {
   }

 

  getGeneralDetails(): void{
    this.crudService.listDetailsByTwoIds(this.generalDetailsUrl, this.examPayStatus , 'true', this.generalDetailsByCodeUrl, this.isActive)
    .subscribe(result => {
        if (result.statusCode === 200){
                  if (result.data.resultList && result.data.resultList !== '') {
                      this.examPayStatuses = result.data.resultList;
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

  getFiltersList(): void {
    this.spinner.show()
    let request = [
      { paramName: 'in_flag', paramValue: 'univ_exam_filters' },
      { paramName: 'in_flag_type', paramValue: 'REGSUP' },
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
      { paramName: 'in_sub_flag_type', paramValue: 'ALL' },
      { paramName: 'in_param1', paramValue: 0 },
      { paramName: 'in_param2', paramValue: 0 },
    ];
    this.crudService.getDetailsByRequest(this.getExamFiltersBycodeUrl, '', request, '&')
      .subscribe(result => {
        this.spinner.hide(); 
        if (result.statusCode === 200) {
          if (result.data && result.data !== '' && result.data.result.length > 0) {
            this.filtersDetailsList = result.data.result;
            for (let i = 0; i < this.filtersDetailsList.length; i++) {
              if (this.filtersDetailsList[i].length > 0 && this.filtersDetailsList[i][0].flag === 'univ_exam_filters') {
                this.CollegesListFilterDetails = this.filtersDetailsList[i];
              }
              

            }

            const Course_Id = this.CollegesListFilterDetails.map(({ fk_course_id }) => fk_course_id);
            this.courses = this.CollegesListFilterDetails.filter(({ fk_course_id }, index) =>
              !Course_Id.includes(fk_course_id, index + 1));
            if (this.courses.length > 0) {
              this.examFeeRegistrationForm.get('courseId').setValue(this.courses[0].fk_course_id);
              this.selectedCourse(this.examFeeRegistrationForm.value.courseId)
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

  selectedCourse(courseId): void {
    if (courseId != null) {
      this.examFeeRegistrationForm.get('academicYearId').setValue('')
      this.examFeeRegistrationForm.get('examId').setValue('');
      this.examFeeRegistrationForm.get('collegeId').setValue('');
      this.academicYears=[]
      this.academicYearsList=[]
      this.examsList = [];
      this.colleges = []
      
      this.academicYearsList = this.CollegesListFilterDetails.filter(x => (x.fk_course_id == this.examFeeRegistrationForm.value.courseId))
      
      if (this.academicYearsList.length > 0) {
        const academicYears = this.academicYearsList.map(({ fk_academic_year_id }) => fk_academic_year_id);
        this.academicYears = this.academicYearsList.filter(({ fk_academic_year_id }, index) => !academicYears.includes(fk_academic_year_id, index + 1));
      }
      if (this.academicYears && this.academicYears.length > 0) {
        const currentAY = this.academicYears?.sort((a, b) => (b.is_curr_ay ?? 0) - (a.is_curr_ay ?? 0))[0];
        if (currentAY?.fk_academic_year_id) {
        this.examFeeRegistrationForm.get('academicYearId')?.setValue(currentAY.fk_academic_year_id);
        }
        this.academicYears = this.academicYears.sort((a,b)=>parseInt(b?.academic_year) - parseInt(a?.academic_year));
        // this.examFeeRegistrationForm.get('academicYearId').setValue(this.academicYears[0].fk_academic_year_id);
        this.selectedAcademicYear(this.examFeeRegistrationForm.value.academicYearId);
      }
    }
  }

  selectedAcademicYear(academicYearId): void {
    this.examFeeRegistrationForm.get('examId').setValue('');
    this.examFeeRegistrationForm.get('collegeId').setValue('');
    this.examsList = [];
    this.colleges = []
    if (academicYearId) {
      this.examsLists = []
      this.examData = []
      this.examsLists = this.CollegesListFilterDetails.filter(x => (x.fk_course_id === this.examFeeRegistrationForm.value.courseId && x.fk_academic_year_id == this.examFeeRegistrationForm.value.academicYearId))
      if (this.examsLists.length > 0) {
        const examsLists = this.examsLists.map(({ fk_exam_id }) => fk_exam_id);
        this.examsList = this.examsLists.filter(({ fk_exam_id }, index) => !examsLists.includes(fk_exam_id, index + 1));
        this.examData = this.examsList;
      }
      if (this.examsList.length > 0) {
        this.examFeeRegistrationForm.get('examId').setValue(this.examsList[0].fk_exam_id);
        this.selectedExam(this.examFeeRegistrationForm.value.examId);
      }
    }

  }
  selectedExam(examId): void {
    this.filtersDetailsList = []
    this.examFeeRegistrationForm.get('collegeId').setValue('');


    let request = [
      { paramName: 'in_flag', paramValue: 'univ_exam_rest_no_tt' },
      { paramName: 'in_flag_type', paramValue: 'ALL' },
      { paramName: 'in_university_id', paramValue: 0 },
      { paramName: 'in_college_id', paramValue: 0 },
      { paramName: 'in_course_id', paramValue: this.examFeeRegistrationForm.value.courseId },
      { paramName: 'in_course_group_id', paramValue: 0 },
      { paramName: 'in_course_year_id', paramValue: 0 },
      { paramName: 'in_exam_id', paramValue: this.examFeeRegistrationForm.value.examId },
      { paramName: 'in_academic_year_id', paramValue: this.examFeeRegistrationForm.value.academicYearId },
      { paramName: 'in_regulation_id', paramValue: 0 },
      { paramName: 'in_subject_id', paramValue: 0 },
      { paramName: 'in_loginuser_empid', paramValue: +localStorage.getItem('employeeId') },
      { paramName: 'in_loginuser_roleid', paramValue: 0 },
      { paramName: 'in_sub_flag_type', paramValue: 'ALL' },
      { paramName: 'in_param1', paramValue: 0 },
      { paramName: 'in_param2', paramValue: 0 },
    ];
    this.crudService.getDetailsByRequest(this.getExamFiltersBycodeUrl, '', request, '&')
      .subscribe(result => {
        this.spinner.hide(); 
        if (result.statusCode === 200) {
          if (result.data && result.data !== '' && result.data.result.length > 0) {
            this.filtersDetailsList = result.data.result;
            for (let i = 0; i < this.filtersDetailsList.length; i++) {
              if (this.filtersDetailsList[i].length > 0 && this.filtersDetailsList[i][0].flag === 'univ_exam_rest_filters') {
                this.CollegesListDetails = this.filtersDetailsList[i];
              }
              else if (this.filtersDetailsList[i].length > 0 && this.filtersDetailsList[i][0].flag === 'regulations') {
                this.regulationFilterList = this.filtersDetailsList[i];
              }

            }
            this.colleges = []
            if (this.CollegesListDetails) {
              /*----------- Colleges -----------*/
       
              this.colleges = this.CollegesListDetails
              const CollegeIdData = this.colleges.map(({ fk_college_id }) => fk_college_id);
              this.colleges = this.colleges.filter(({ fk_college_id }, index) => !CollegeIdData.includes(fk_college_id, index + 1));
              if (this.colleges.length > 0) {
                this.examFeeRegistrationForm.get('collegeId').setValue(this.colleges[0].fk_college_id);
                this.selectedCollege( this.examFeeRegistrationForm.value.collegeId)
              }
              //     /*----------- COURSES Years -----------*/      
        
        
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
  searchexam(value) {
    this.examData = [];
    this.search(value)
  }

  search(value: string) {
    let filter = value.toLowerCase();
    for (let i = 0; i < this.examsList.length; i++) {
      let option = this.examsList[i];
      if (option.exam_name.toLowerCase().indexOf(filter) >= 0) {
        this.examData.push(option);
      }
    }
  }






 






  selectedCollege(examId): void{
    this.feeRegistrationPayments = [];
  }

  getFeePayments(): void{
     this.flag = true;
     this.spinner.show();
     this.feeRegistrationPayments = [];
     this.dataSource = new MatTableDataSource<any>(this.feeRegistrationPayments);
     /*------------- EXAM FEE REGISTRATION PAYNENTS ------------*/  
     this.crudService.listDetailsByThreeIds(this.examStudentRegistrationPaymentCrudUrl, this.examFeeRegistrationForm.value.collegeId, 
      this.examFeeRegistrationForm.value.examId,
      'true', 'college.collegeId', 'examMaster.examId', 'isActive')
    .subscribe(result => {
      this.spinner.hide();
      if (result.statusCode === 200){
            if (result.success) {
               this.feeRegistrationPayments = result.data.resultList;
               this.dataSource = new MatTableDataSource<any>(this.feeRegistrationPayments);
               this.dataSource.paginator = this.paginator;
               this.dataSource.sort = this.sort;
            } else {
              // this.snotifyService.success(result.message, 'Success!');
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

  viewTransactions(item): void{
    this.isStatusflag = true;
    const dialogRef = this.dialog.open(TransactionsComponent, {
      width: '850px',
      data: item
    });

    dialogRef.afterClosed().subscribe(details => {
      if (details != null && details !== ''){  
          this.spinner.show();
          // tslint:disable-next-line: prefer-for-of
          for (let i = 0; i < details.examStdRegTxnDTOs.length; i++){
               if (details.examStdRegTxnDTOs[i].isTransactionVerified != null && !details.examStdRegTxnDTOs[i].isTransactionVerified){
                   this.isStatusflag = false;
                   
               }
               if (details.examStdRegTxnDTOs[i].transactionPath != null){
                details.examStdRegTxnDTOs[i].transactionPath = details.examStdRegTxnDTOs[i].transactionPath.split('cms/')[1];
               }
          }
          if (!this.isStatusflag){
            details.regPaymentStatusCatId = this.examPayStatuses.filter(x => (x.generalDetailCode === 'PAYMENT REJECTED'))[0].generalDetailId;
          }else{
            details.regPaymentStatusCatId = this.examPayStatuses.filter(x => (x.generalDetailCode === 'PAYMENT APPROVED'))[0].generalDetailId;
          }

          this.examPays = [];
          this.examPays.push(details);
    
          this.crudService.add(this.examStudentRegPaymentUrl, this.examPays)
          .subscribe(result => {
              this.spinner.hide();
              if (result.statusCode === 200){
                  if (result.success) {
                      this.getFeePayments();
                      this.snotifyService.success(result.message, 'Success!');
                  }else{
                      this.snotifyService.info(result.message, 'Info!');
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
    });
  }

  register(item): void{
   this.examFeeStructure = [];
   this.spinner.show();
   this.courseYearFee = [];
   this.isPay = false;
  // /*------------- EXAM FEE REGISTRATIONS ------------*/  
  // this.crudService.listDetailsByFourIds(this.examStudentRegistrationCrudUrl, item.collegeId, item.examId,
  //   item.studentId, 'true', 'college.collegeId', 'examMaster.examId', 'studentDetail.studentId', 'isActive')
  // .subscribe(result => {
  //   // this.spinner.hide();
  //    if (result.statusCode === 200){
  //         if (result.success) {
   this.feeRegistrations = item.examStdRegDTOs;
   // tslint:disable-next-line: prefer-for-of
   for (let i = 0; i < this.feeRegistrations.length; i++){
                  /*----------- EXAM FEE AMOUNT-----------*/
                  // this.crudService.listDetailsByFourIds(this.examFeeStructureCourseyrUrl, item.examId, item.courseGroupId,
                  //   this.feeRegistrations[i].courseYearId, 'true', 'examFeeStructure.examMaster.examId', 'courseGroup.courseGroupId', 'courseYear.courseYearId', 'isActive')
                  //   .subscribe(result1 => {
                  //    // this.spinner.hide();
                  //       if (result1.statusCode === 200){
                  //               if (result1.data.resultList && result1.data.resultList.length > 0) {
                  //                   this.examFeeStructure = result1.data.resultList;
                  //                   if (this.examFeeStructure.length > 0){
                    this.crudService.listByFourIds(this.getStudentExamFeeStructureUrl, this.examFeeRegistrationForm.value.collegeId,item.examId, item.courseGroupId, this.feeRegistrations[i].courseYearId,
                      'collegeId', 'examId', 'courseGroupId', 
                       'courseYearId')
                      .subscribe(result => {
                       this.spinner.hide();
                       if (result.statusCode === 200){
                                 if (result.data) {
                                    this.examFeeStructure.push(result.data);
                                    if (this.examFeeStructure.length > 0){
                                      let examFeeAmount = this.examFeeStructure[0].regFee;

                                      this.feeRegistrations[i].examFeeStructureId = this.examFeeStructure[0].examFeeStructureId;
                                      // if (this.examFeeStructure[0].examFeeFineDTOs != null && this.examFeeStructure[0].examFeeFineDTOs.length > 0){
                                      //     this.fineObject = this.fineCheck(this.examFeeStructure[0].examFeeFineDTOs);
                                      // }else{
                                      //     this.fineAmount = 0; 
                                      // }
        
                                      if (this.feeRegistrations[i].currCourseYrId !== this.feeRegistrations[i].courseYearId){
                                          if (this.feeRegistrations[i].examStdRegSubDTOs.length === 1){
                                            examFeeAmount = this.examFeeStructure[0].subject1Fee;
                                          }else if (this.feeRegistrations[i].examStdRegSubDTOs.length === 2){
                                            examFeeAmount = this.examFeeStructure[0].subject2Fee;
                                          }else if (this.feeRegistrations[i].examStdRegSubDTOs.length === 3){
                                            examFeeAmount = this.examFeeStructure[0].subject3Fee;
                                          }else if (this.feeRegistrations[i].examStdRegSubDTOs.length === 4){
                                            examFeeAmount = this.examFeeStructure[0].subject4Fee;
                                          }else if (this.feeRegistrations[i].examStdRegSubDTOs.length === 5){
                                            examFeeAmount = this.examFeeStructure[0].subject5Fee;
                                          }else if (this.feeRegistrations[i].examStdRegSubDTOs.length === 6){
                                            examFeeAmount = this.examFeeStructure[0].subject6Fee;
                                          }else if (this.feeRegistrations[i].examStdRegSubDTOs.length === 7){
                                            examFeeAmount = this.examFeeStructure[0].subject7Fee;
                                          }else if (this.feeRegistrations[i].examStdRegSubDTOs.length > 7){
                                            examFeeAmount = this.examFeeStructure[0].supplyFee;
                                          }
                                          // if (!this.isEmptyObject(this.fineObject)){
                                          //   this.fineAmount = this.fineObject.supplyFeeFine;
                                          // //  this.examFeeFineId = this.fineObject.supplyFeeFine;
                                          // }else{
                                          //   this.fineAmount = 0;
                                          // }
                                      }else{
                                          // if (!this.isEmptyObject(this.fineObject)){
                                          //   this.fineAmount = this.fineObject.regFeeFine;
                                          // }else{
                                          //   this.fineAmount = 0;
                                          // }
                                      }
                                      this.courseYearFee.push({
                                        collegeCode: this.feeRegistrations[i].collegeCode,
                                        courseYearId: this.feeRegistrations[i].courseYearId,
                                        courseName: item.courseCode,
                                        groupCode: item.groupCode,
                                        courseYearName: this.feeRegistrations[i].courseYearName,
                                        examType: this.feeRegistrations[i].examTypeCode,
                                        examFeeAmount: examFeeAmount,
                                        regulationId: this.feeRegistrations[i].regulationId,
                                        examFineAmount: 0,
                                        examAddFee: 0,
                                        academicYear: '',
                                        examFeeStructureId: this.feeRegistrations[i].examFeeStructureId,
                                        examAdditionalFeeReceiptDTOs: []
                                      });
                                      this.totalReceiptAmt = this.totalReceiptAmt + examFeeAmount; // + this.fineAmount + addF;
                                      this.courseYearFee.filter(x => ( x.courseYearId === this.feeRegistrations[i].courseYearId))[0].subjects = [];
                                      this.courseYearFee.filter(x => ( x.courseYearId === this.feeRegistrations[i].courseYearId))[0].subjects = 
                                      this.feeRegistrations[i].examStdRegSubDTOs;     
                                    }
                                  }else{
    
                                    // this.snotifyService.info('No Exam Fee Structure for this course Group and Year.', 'Info!');
                                  }
                              }else{
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
   setInterval(() => { 
                if (!this.isPay){
                   this.pay(item);
                }
              }, 3000);

  //         } else {
  //            this.snotifyService.success(result.message, 'Success!');
  //         }
  //    }else {
  //         this.snotifyService.error(result.message, 'Error!');
  //  }
  // }, error => {
  //     this.spinner.hide();
  //     if (error.error.statusCode === 401){
  //         this.snotifyService.error(error.error.message, 'Error!');
  //         this.genericFunctions.logOut(this.router.url);
  //     }else{
  //         this.snotifyService.error(CONSTANTS.message.CON_ERROR, 'Error!');
  //     }
  // });
 }

 pay(item): void{
   this.isPay = true;
 // if (this.courseYearFee.length > 0){
   this.examFeeReceipt = [];
   // let addFeeAmt = 0;
   this.spinner.hide();
   // tslint:disable-next-line: prefer-for-of
   for (let i = 0; i < this.courseYearFee.length; i++){
     if (this.examFeeTypes.filter(x => (x.generalDetailCode === this.courseYearFee[i].examType)).length > 0){
       this.courseYearFee[i].examtypeCatId = this.examFeeTypes.filter(x => (x.generalDetailCode === this.courseYearFee[i].examType))[0].generalDetailId;
     } 
     // this.addTFee = [];
     if (this.examsList.filter(x => (x.examId === item.examId)).length > 0){
       this.examName = this.examsList.filter(x => (x.examId === item.examId))[0].examName;
       this.examFromDate = this.examsList.filter(x => (x.examId === item.examId))[0].fromDate;
       this.examToDate = this.examsList.filter(x => (x.examId === item.examId))[0].toDate;
     } 

     let examStdRegPaymentIds;
     let examStdRegTransactionIds;
     this.feeRegistrationPayments = item.examStdRegDTOs;
    // for (let j = 0; j < this.feeRegistrationPayments.length; j++){
     examStdRegPaymentIds = item.examStdRegPaymentId;
     examStdRegTransactionIds = item.examStdRegTransactionIds;
    // }

     this.examFeeReceipt.push({
       chequeNo : null,
       ddno : null,
       examFeeAmount : this.courseYearFee[i].examFeeAmount,
       courseGroupName : this.courseYearFee[i].groupCode,
       examFineAmount: 0,
       examAddtFee: 0,
       examTotalAmount: this.courseYearFee[i].examFeeAmount, // + this.courseYearFee[i].examFineAmount + addFeeAmt,
       collegeCode: this.courseYearFee[i].collegeCode,
       examName: this.examName,
       examStdRegPaymentIds: examStdRegPaymentIds,
       examStdRegTxnIds: examStdRegTransactionIds,
       courseName: this.courseYearFee[i].courseName,
       courseYearName: this.courseYearFee[i].courseYearName,
       examType: this.courseYearFee[i].examType,
       examFromDate: this.examFromDate,
       examToDate: this.examToDate,
      // courseGroupName: this.feeRegistrationPayments[0].groupCode,
       academicYear: this.courseYearFee[i].academicYear,
       studentName: item.studentName,
       rollno: item.rollNumber,
       feeComments : null,
       employeeId : +localStorage.getItem('employeeId'),
       collegeId : item.collegeId,
       courseYearId : this.courseYearFee[i].courseYearId,
       examFeeFineId : null,
       examFeeStructureId : this.courseYearFee[i].examFeeStructureId,
       examId : item.examId,
       examtypeCatId : this.courseYearFee[i].examtypeCatId,
       paymentModeCatId : item.paymentModeCatId,
       studentId : item.studentId,
       isActive : true,
       otherPaymentNumber : null,
       receiptDate : this.genericFunctions.moment(),
       referenceNumber : null,
       transactionNo : null,
       examAdditionalFeeReceiptDTOs: [],
       examStudentDTOs: [{
             feeComments : null,
             collegeId : item.collegeId,
             courseYearId : this.courseYearFee[i].courseYearId,
             examFeeAmount : this.courseYearFee[i].examFeeAmount,
             examtypeCatId : this.courseYearFee[i].examtypeCatId,
             regulationId: this.courseYearFee[i].regulationId,
             studentId : item.studentId,
             isActive : true,
             isFeePaid : true,
             registrationDate : this.genericFunctions.moment(),
             examId : item.examId,
             examStudentDetailDTOs: this.courseYearFee[i].subjects
       }]
      });
    }

   const dialogRef = this.dialog.open(ExamFeePayDialogComponent, {
     width: '650px',
     data: this.examFeeReceipt
    });

   dialogRef.afterClosed().subscribe(details => {
         if (details === 'PAY'){ 
             this.spinner.show();
             /*---------- EXAM FEE PAY ----------*/
             this.crudService.add(this.examFeeReceiptUrl, this.examFeeReceipt)
             .subscribe(result => {
                 this.spinner.hide();
                 if (result.success){
                        this.snotifyService.success(result.message, 'Success!');
                        this.getFeePayments();
                       // this.updateExamRegistrationPayment(item);
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
    });
  // }
 }

 updateExamRegistrationPayment(item): void{
    /*------------- EXAM FEE REGISTRATION PAYNENTS ------------*/  
    item.isPaymentSettled = true;
    this.crudService.addDetails(this.examStudentRegistrationPaymentCrudUrl, item)
    .subscribe(result => {
      this.spinner.hide();
      if (result.statusCode === 200){
            if (result.success) {
                this.getFeePayments();
            } else {
              // this.snotifyService.success(result.message, 'Success!');
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

 // tslint:disable-next-line:typedef
 applyFilter(filterValue: string) {
  this.dataSource.filter = filterValue.trim().toLowerCase();

  if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
  }
}

  /*---------- View Subjects-----------*/
  viewCourseYearSubjectsListDialog(item): void {
    item.subjects = item.examStdRegSubDTOs;
    // tslint:disable-next-line: prefer-for-of
    for (let i = 0; i < item.subjects.length; i++){
      item.subjects[i].regulationName = item.regulationName;
    }
    const dialogRef = this.dialog.open(ViewSubjectsComponent, {
          width: '750px',
          data: item.subjects
    });
  }

}
