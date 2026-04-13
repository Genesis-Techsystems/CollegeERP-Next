import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { FormGroup, FormBuilder, Validators, FormControl } from '@angular/forms';
import { SnotifyService } from 'ng-snotify';
import { CrudService } from 'app/main/services/crud.service';
import { NgxSpinnerService } from 'ngx-spinner';
import { Router, ActivatedRoute } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { GenericFunctions } from 'app/main/common/generic-functions';
import { CONSTANTS } from 'app/main/common/constants';
import { College } from 'app/main/models/college';
import { AcademicYear } from 'app/main/models/academicYear';
import { Course } from 'app/main/models/course';
import { ExamMaster } from 'app/main/models/examMaster';
import { CourseGroup } from 'app/main/models/courseGroup';
import { Subject, ReplaySubject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { fuseAnimations } from '@fuse/animations';
import { ExamFeePayDialogComponent } from '../../regular-exam-fee-collection/exam-fee-pay-dialog/exam-fee-pay-dialog.component';
import { ViewSubjectsComponent } from '../../view-subjects/view-subjects.component';
import { ExamFeePayModalComponent } from './exam-fee-pay-modal/exam-fee-pay-modal.component';
import { ViewTransactionsComponent } from '../view-transactions/view-transactions.component';
import { GeneralDetail } from 'app/main/models/generalDetail';

@Component({
  selector: 'app-exam-fee-payment',
  templateUrl: './exam-fee-payment.component.html',
  styleUrls: ['./exam-fee-payment.component.scss'],
  animations : fuseAnimations
})

export class ExamFeePaymentComponent implements OnInit {

  @ViewChild('examFeeRecptAvatar') examFeeRecptAvatar: ElementRef;

  private collegeCrudUrl = CONSTANTS.collegeCrudUrl;
  private getDetailsByCollegeIdUrl = CONSTANTS.getDetailsByCollegeIdUrl;
  private examMasterUrl = CONSTANTS.examMasterUrl;
  private getDetailsByCourseIdUrl = CONSTANTS.getDetailsByCourseIdUrl;
  private studentSearchUrl = CONSTANTS.studentSearchUrl;
  private studentSubjectUrl = CONSTANTS.studentSubjectUrl;
  private examStdCourseyrSubjecturl = CONSTANTS.examStdCourseyrSubjecturl;
  private examStudentRegistrationCrudUrl = CONSTANTS.examStudentRegistrationCrudUrl;
  private examFeeStructureCrudUrl = CONSTANTS.examFeeStructureCrudUrl;
  private getExamMasterDetailsUrl = CONSTANTS.getExamMasterDetailsUrl;
  private isActive = CONSTANTS.isActive;
  private examStudentRegistrationUrl = CONSTANTS.examStudentRegistrationUrl;
  private generalDetailsUrl = CONSTANTS.generalDetailsUrl;
  private generalDetailsByCodeUrl = CONSTANTS.generalDetailsByCodeUrl;
  private transactionType = CONSTANTS.transactionType;
  private examFeeStructureCourseyrUrl = CONSTANTS.examFeeStructureCourseyrUrl;
  private examFeeType = CONSTANTS.examFeeType;
  private examCourseYearSubjectUrl = CONSTANTS.examCourseYearSubjectUrl;
  private StudentAcademicbatchUrl = CONSTANTS.StudentAcademicbatchUrl;
  private examStdTxnUploadUrl = CONSTANTS.examStdTxnUploadUrl;
  private examPayStatus = CONSTANTS.examPayStatus;
  private paymentMode = CONSTANTS.paymentMode;
  private examStudentRegPaymentUrl = CONSTANTS.examStudentRegPaymentUrl;
  private getStudentExamFeeStructureUrl=CONSTANTS.getStudentExamFeeStructureUrl

  examFeeCollectionForm: FormGroup;
  colleges: College[] = [];
  academicYears: AcademicYear[] = [];
  courses: Course[] = [];
  examsList: ExamMaster[] = [];
  courseGroups: CourseGroup[] = [];
  searchStudents = [];
  selectedStd = [];
  student: any = {};
  studentSubjects: any[] = [];
  courseYears: any[] = [];
  courseYearsList: any[] = [];
  allCourseYearsList: any[] = [];
  examCourseYearSubjetsList: any[] = [];
  studentFirstName;
  check = 1;
  checkExam = 1;
  checksubject = true;
  semNo: number;
  examSubjestList: any[] = [];
  count = 0;
  courseYearFee: any = [];
  examsFeeStructures: any = [];
  courseYearsubjectsList: any[] = [];
  selectedCount = 0;
  transactionTypes: any[] = [];
  examFeeReceipt: any[] = [];
  examFeeTypes: any[] = [];
  examName;
  examFromDate;
  examToDate;
  courseGroupName;
  totalReceiptAmt = 0;
  feeReceipts: any[] = [];
  total = 0;
  examFeeReceiptDel: any = {};
  searchSubjects: any[] = [];
  subject: any = {};
  selectedSub: any[] = [];
  studentCurrentCourseYearId;
  flag = false;
  public searchText: string;
  selectedSubjects = [];
  fineAmount = 0;
  fineObject: any = {};
  examFeeFineId;
  stdAcademicYearId: number;
  searchExams = [];
  pending: boolean;
  examFeeStructure = [];
  addTFee: any[] = [];
  transactions = [];
  selectedValue: any[] = [50431];
  examRegister: any = {};
  totalTransAmt = 0;
  examFeeSubjects = [];
  public formData;
  feeRegistrations = [];
  examPayStatuses: GeneralDetail[] = [];
  paymentModes = [];
  params: any = {};
  selSubs = [];
  examPays = [];
  isUpload = false;

  toggleOptions: Array<any> = ['First', 'Second'];
  
  public studentFilterCtrl: FormControl = new FormControl();
  private _onDestroy = new Subject<void>();
  public filteredStudents: ReplaySubject<any[]> = new ReplaySubject<any[]>(1);

  public examFilterCtrl: FormControl = new FormControl();
  public filteredExams: ReplaySubject<any[]> = new ReplaySubject<any[]>(1);

  constructor(private formBuilder: FormBuilder, private snotifyService: SnotifyService,
              private crudService: CrudService, private spinner: NgxSpinnerService, private router: Router, 
              private dialog: MatDialog, private genericFunctions: GenericFunctions, private route: ActivatedRoute) {        
      this.getData();
  }

  ngOnInit(): void {
    this.examFeeCollectionForm = this.formBuilder.group({
      subjectId: [],
      courseYearId: [''],
      fDate: [this.genericFunctions.moment()],
      feeComments: [],
      transactionRefno: ['', Validators.required],
      examFeeAmount: [0],
      transactionAmount: [0],
      transactionAppCatId: ['', Validators.required],
    });

    this.route.queryParams
    .subscribe(params => {
      this.params = params;
    });   

    this.examFeeCollectionForm.get('examFeeAmount').disable();
    this.studentFilterCtrl.valueChanges
    .pipe(takeUntil(this._onDestroy))
    .subscribe(() => {
      this.filterStd();
    });

    this.searchStudents.push({firstName: 'Search by student name or rollno.'});
    this.filteredStudents.next(this.searchStudents.slice());

    this.examFilterCtrl.valueChanges
      .pipe(takeUntil(this._onDestroy))
      .subscribe(() => {
        this.filterExam();
    });

    this.searchExams.push({examName: 'Search by Exam name.'});
    this.filteredExams.next(this.searchExams.slice());

    if (localStorage.getItem('rollNumber') != null){
        this.enteredStudent(localStorage.getItem('rollNumber'), 'student');
    }

  }

   // tslint:disable-next-line: use-lifecycle-interface
   ngOnDestroy(): void {
    this._onDestroy.next();
    this._onDestroy.complete();
  }

  getGeneralDetails(): void{
    /*----------- PAYMENT MODE -----------*/
    this.crudService.listDetailsByTwoIds(this.generalDetailsUrl, this.transactionType , 'true', this.generalDetailsByCodeUrl, this.isActive)
    .subscribe(result => {
        if (result.statusCode === 200){
                  if (result.data.resultList && result.data.resultList !== '') {
                      this.transactionTypes = result.data.resultList;
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
  
  getData(): void{
     /*----------- COLLEGES -----------*/
     this.crudService.listDetailsById(this.collegeCrudUrl, 'true', this.isActive)
     .subscribe(result => {
         this.spinner.hide();
         this.getGeneralDetails();
         if (result.statusCode === 200){
             if (result.data.resultList && result.data.resultList !== '') {
                 this.colleges = result.data.resultList;
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

  selectedSubject(subjectId): void{
    if (subjectId != null && subjectId !== '' && subjectId !== 'undefined'){
      this.subject = {};
      this.selectedSub = [];
      if (this.searchSubjects.filter(x => (x.studentId === subjectId)).length === 0){
        this.selectedSub.push(this.searchSubjects.filter(x => (x.subjectId === subjectId))[0]);
        this.subject = this.selectedSub[0];
        this.subject.courseYearId = this.examFeeCollectionForm.value.courseYearId;
        if (this.courseYearsList.filter(x => (x.courseYearId === this.examFeeCollectionForm.value.courseYearId)).length > 0){
          this.subject.courseYearName = this.courseYearsList.filter(x => (x.courseYearId === this.examFeeCollectionForm.value.courseYearId))[0].courseYearName;
        }
        if (this.studentCurrentCourseYearId !== this.subject.courseYearId){
          this.subject.examType = 'Supple';
        }
        this.subject.subjectTypeCode = this.subject.subjectTypeName;
        this.subject.isSelected = true;
        this.subject.checked = true;
        if (this.studentSubjects.filter(x => (x.subjectId === this.subject.subjectId)).length === 0){
            this.studentSubjects.push(this.subject);
            this.markAll();
            if (this.courseYearFee.length > 0){
              if (this.courseYearFee.filter(x => (x.courseYearId === this.examFeeCollectionForm.value.courseYearId)).length > 0){
                  this.courseYearFee.filter(x => (x.courseYearId === this.examFeeCollectionForm.value.courseYearId))[0].subjects.push(this.subject);
              }
            }
        }else{
            this.snotifyService.info('Already exists for this year.', 'Info!');
        }
    }
      this.examFeeCollectionForm.get('subjectId').setValue('');
  }
  }

  getExamsList(): void{
    this.examsList = [];
    this.courseYearsList = [];
    this.feeReceipts = [];
    this.courseYearFee = [];
    this.searchExams = [];
    this.searchExams.push({examName: 'Search by Exam name.'});
    this.filteredExams.next(this.searchExams.slice());  
    this.flag = false;
  /*----------- Exams List -----------*/      
    this.crudService.listDetailsByThreeIdsWithSort(this.examMasterUrl, this.student.collegeId, this.student.courseId, 'true', 'DESC',
    this.getDetailsByCollegeIdUrl , this.getDetailsByCourseIdUrl, this.isActive, 'createdDt')
  .subscribe(result => {
  this.spinner.hide();
  if (result.statusCode === 200){
        if (result.success) {
            this.examsList = [];
            // tslint:disable-next-line: prefer-for-of
            for (let i = 0; i < result.data.resultList.length; i++){
              if (!result.data.resultList[i].isInternalExam){
                  this.examsList.push(result.data.resultList[i]);
              }
            }
           // if (this.params){
            this.selectedExternalExam(this.params.examId);
           // }
            this.searchExams = this.examsList;
            this.filteredExams.next(this.searchExams.slice());    
        }else{
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

selectedExternalExam(examId): void{
  this.feeReceipts = [];
  this.searchText = '';
 // this.selectedCount = 0;
  this.flag = true;
  this.getExamFeeStructure(this.student.courseYearId);
  if (this.selectedStd.length > 0){
    this.getExamFeeRegistrations(this.student.studentId, examId);
  }
}

enteredStudent(event, name): void{
  if (name === 'admin'){
  if (event.target.value.length > 4){
    this.flag = false;
      /*----------- STUDENTS -----------*/
    this.crudService.listByTwoIds(this.studentSearchUrl, 'true', event.target.value, 
       'isActive', 'q')
          .subscribe(result => {
              if (result.statusCode === 200){
                      if (result.data && result.data !== '') {  
                          this.searchStudents = result.data;
                          this.filteredStudents.next(this.searchStudents.slice());                
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
  }else{
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
                    if (this.searchStudents.length > 0){
                      this.selectedStudent(this.searchStudents[0].studentId);   
                    }           
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

selectedStudent(studentId): void{
  this.courseYearsList = [];
  this.feeReceipts = [];
  this.searchText = '';
  this.courseYearFee = [];
  this.searchExams = [];
  
  this.searchExams.push({examName: 'Search by Exam name.'});
  this.filteredExams.next(this.searchExams.slice());  
  this.selectedCount = 0;
  this.examFeeCollectionForm.get('courseYearId').setValue('');
  if (studentId != null){
    this.selectedStd = [];
    this.flag = false;
    if (this.searchStudents.filter(x => (x.studentId === studentId)).length > 0){
        this.selectedStd.push(this.searchStudents.filter(x => (x.studentId === studentId))[0]);
        this.student = this.selectedStd[0];
        this.studentCurrentCourseYearId = this.student.courseYearId;
        this.student.studentPhotoPath = this.student.studentPhotoPath + '?' + new Date().getTime();
        this.studentFirstName = this.student.firstName + ' ( ' + this.student.rollNumber + ' )';
        this.getExamsList();
     }

    if (this.student.courseId !== '' && studentId != null){
      this.spinner.show();
      /*----------- COURSES Years -----------*/      
      // this.crudService.listDetailsByTwoIds(this.courseYearCrudUrl, this.student.courseId, 'true', this.getDetailsByCourseIdUrl, this.isActive)
      // .subscribe(result => {
      this.crudService.listDetailsByTwoIds(this.StudentAcademicbatchUrl, studentId, 'true', 'studentDetail.studentId', this.isActive )
        .subscribe(result => {
          this.spinner.hide();
          if (result.statusCode === 200) {
              if (result.data.resultList && result.data.resultList !== '') {
                  this.allCourseYearsList = result.data.resultList;
                  /* Remove Duplicate Course Years */ 
                  this.courseYearsList = Object.values(
                    this.allCourseYearsList.reduce((a, c) => {
                      a[c.fromCourseYearId] = c;
                      return a;
                    }, {}));
                    /* end */ 
                  if (this.courseYearsList.length > 0 && this.checkExam === 1){
                    this.supplyCourseYears(this.checkExam);
                  }
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
}

supplyCourseYears(type): void{
  this.courseYears = [];
  this.studentSubjects = [];
  if (type === 1) {
    this.courseYears.push(this.courseYearsList.filter(x => ( x.fromCourseYearId === this.student.courseYearId))[0]);
    this.examFeeCollectionForm.get('courseYearId').setValue(this.student.courseYearId);
    this.getStudentSubjects(this.student.courseYearId);
  }else if (type === 2) {
   // this.semNo = +this.courseYearsList.filter(x => ( x. courseYearCode === this.student.courseYearCode))[0].semNo;
    // tslint:disable-next-line: prefer-for-of
    for ( let i = 0;  i <  this.courseYearsList.length; i++){
      if (this.courseYearsList[i].fromCourseYearId !== this.student.courseYearId){
        this.courseYears.push(this.courseYearsList[i]);
      }
    }
  }
}

getExamFeeRegistrations(studentId, examId): void{
  this.spinner.show();
  /*------------- EXAM FEE REGISTRATIONS ------------*/  
  this.crudService.listDetailsByFourIds(this.examStudentRegistrationCrudUrl, this.student.collegeId, examId,
      studentId, 'true', 'college.collegeId', 'examMaster.examId', 'studentDetail.studentId', 'isActive')
  .subscribe(result => {
     this.spinner.hide();
     if (result.statusCode === 200){
          if (result.success) {
              this.feeRegistrations = result.data.resultList;
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

getStudentSubjects(courseYearId): void{
  this.examFeeStructure = [];
  if (this.checkExam === 1) {
    this.stdAcademicYearId = this.student.academicYearId;
  }else{
    this.stdAcademicYearId = this.courseYearsList.filter(x => (x.fromCourseYearId === courseYearId))[0].academicYearId;
  }
  if (courseYearId != null && courseYearId.length >0 && courseYearId !== 'undefined'){
    this.spinner.show();
    if (this.params.examId != null && this.params.examId !== ''){
      this.getExamFeeStructure(courseYearId);
   }
    if (this.student.courseYearId === courseYearId) {
    /*----------- STUDENTS SUBJECT-----------*/
    this.crudService.listDetailsByFiveIds(this.studentSubjectUrl, this.student.collegeId, this.stdAcademicYearId, this.student.studentId,
      courseYearId, 'true', 'college.collegeId', 'academicYear.academicYearId', 'studentDetail.studentId', 'courseYear.courseYearId', 'isActive')
      .subscribe(result => {
        this.spinner.hide();
        if (result.statusCode === 200){
                  if (result.data.resultList && result.data.resultList !== '') {
                      this.studentSubjects = result.data.resultList;
                      // tslint:disable-next-line: prefer-for-of
                      for (let i = 0; i < this.studentSubjects.length; i++){
                        if (this.studentSubjects[i].shortName === null || this.studentSubjects[i].shortName === ''){
                          this.studentSubjects[i].shortName = this.studentSubjects[i].subjectCode;
                        }
                        this.studentSubjects[i].examType = 'Regular';
                        this.studentSubjects[i].isSelected = true;
                        this.studentSubjects[i].checked = true;
                        this.studentSubjects[i].Subject_name = this.studentSubjects[i].subjectName;
                        this.studentSubjects[i].Subject_code = this.studentSubjects[i].subjectCode;
                        this.studentSubjects[i].credits = this.studentSubjects[i].subCredits;
                        // if (this.studentSubjects.filter(x => (x.subjectId === this.studentSubjects[i].subjectId)).length === 0){
                        //   this.studentSubjects.push(this.studentSubjects[i]);
                        // }
                      }
                      this.markAll();
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
    }else
      if (this.student.courseYearId !== courseYearId) {
     

           /*----------- STUDENTS SUBJECT-----------*/
    // this.crudService.listDetailsByFiveIds(this.examCourseYearSubjectUrl, this.student.collegeId, this.student.academicYearId, this.student.studentId,
    //   courseYearId, 'true', 'college.collegeId', 'academicYear.academicYearId', 'studentDetail.studentId', 'courseYear.courseYearId', 'isActive')
    //   .subscribe(result => {
      this.crudService.listByFourIds(this.examCourseYearSubjectUrl, this.student.collegeId, this.stdAcademicYearId,
        courseYearId, this.student.courseGroupId, 'collegeId', 'academicYearId', 'courseyearId', 'courseGroupId')
        .subscribe(result => {
        this.spinner.hide();
        if (result.statusCode === 200){
                  if (result.data && result.data !== '') {
                      this.studentSubjects = result.data;
                      // tslint:disable-next-line: prefer-for-of
                      for (let i = 0; i < this.studentSubjects.length; i++){
                        
                        this.studentSubjects[i].examType = 'Supple';
                        this.studentSubjects[i].isSelected = true;
                        this.studentSubjects[i].checked = true;
                        this.studentSubjects[i].Subject_name = this.studentSubjects[i].subjectName;
                        this.studentSubjects[i].Subject_code = this.studentSubjects[i].subjectCode;
                        this.studentSubjects[i].subjectTypeCode = this.studentSubjects[i].subjecttypeName;
                        this.studentSubjects[i].credits = this.studentSubjects[i].subjectCredits;
                        if (this.studentSubjects.filter(x => (x.subjectId === this.studentSubjects[i].subjectId)).length === 0){
                          this.studentSubjects.push(this.studentSubjects[i]);
                        }
                      }
                      this.markAll();
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
  }
}

checkedSubjects(check, item): void{
  item.isSelected = check;
  this.selectedCount = 0;
  this.selectedSubjects = [];
  // tslint:disable-next-line: prefer-for-of
  for (let i = 0; i < this.studentSubjects.length; i++){
      if (this.studentSubjects[i].isSelected){
         this.selectedSubjects.push(this.studentSubjects[i]);
         this.selectedCount++;
      }
  }
  if (!item.isSelected){
    // tslint:disable-next-line: prefer-for-of
    for (let n = 0; n < this.courseYearFee.length; n++){
      if (this.courseYearFee[n].courseYearId === item.courseYearId){
        for (let j = 0; j < this.courseYearFee[n].subjects.length; j++){
          if (this.courseYearFee[n].subjects[j].subjectId === item.subjectId){
            this.courseYearFee[n].subjects.splice(j, 1);
          }
        }
      }
    }
  }else{
    if (this.courseYearFee.length > 0){
      if (this.courseYearFee.filter(x => (x.courseYearId === this.examFeeCollectionForm.value.courseYearId)).length > 0){
          this.courseYearFee.filter(x => (x.courseYearId === this.examFeeCollectionForm.value.courseYearId))[0].subjects.push(item);
      }
    }
  }
  this.getMarkStatus();
}

getMarkStatus(): void{
  // tslint:disable-next-line: prefer-for-of
  for (let i = 0; i < this.studentSubjects.length; i++){
      if (!this.studentSubjects[i].isSelected){
          this.checksubject = false;
          break;
      }else{
          this.checksubject = true;
      }
  }
}

/*================ CHECK & CHECKED SUBJECTS FILTERING FUNCTION ============ */
markAll(): void{
  this.selectedCount = 0;
  this.selectedSubjects = [];
  // tslint:disable-next-line: prefer-for-of
  for (let i = 0; i < this.studentSubjects.length; i++){
       if (!this.checksubject){
          this.studentSubjects[i].checked = false;
          this.studentSubjects[i].isSelected = false;
       }else{
        this.studentSubjects[i].checked = true;
        this.studentSubjects[i].isSelected = true;
        this.selectedSubjects.push(this.studentSubjects[i]);
        this.selectedCount++;
       }
    }
}

getExamFeeStructure(courseYearId): void{
    this.examFeeStructure = [];
     /*----------- EXAM FEE AMOUNT-----------*/
    // this.crudService.listDetailsByFourIds(this.examFeeStructureCourseyrUrl, this.params.examId, this.student.courseGroupId,
    //   courseYearId, 'true', 'examFeeStructure.examMaster.examId', 'courseGroup.courseGroupId', 'courseYear.courseYearId', 'isActive')
    //   .subscribe(result => {
    //     this.spinner.hide();
    //     if (result.statusCode === 200){
    //               if (result.data.resultList && result.data.resultList.length > 0) {
    //                  this.examFeeStructure = result.data.resultList;
    //                  if (this.examFeeStructure.length > 0){
      this.crudService.listByFourIds(this.getStudentExamFeeStructureUrl, this.student.collegeId,this.params.examId, this.student.courseGroupId, courseYearId,
        'collegeId', 'examId', 'courseGroupId', 
         'courseYearId')
        .subscribe(result => {
         this.spinner.hide();
         if (result.statusCode === 200){
                   if (result.data) {
                      this.examFeeStructure.push(result.data);
                      if (this.examFeeStructure.length > 0){
                        // tslint:disable-next-line: prefer-for-of
                        for (let i = 0; i < this.examFeeStructure[0].examFeeAdditionalStructureDTOs.length; i++){
                            this.examFeeStructure[0].examFeeAdditionalStructureDTOs[i].examFeeStructureId = this.examFeeStructure[0].examFeeStructureId;
                            if (this.examFeeStructure[0].examFeeAdditionalStructureDTOs[i].fee > 0){
                                this.examFeeStructure[0].examFeeAdditionalStructureDTOs[i].isDisable = true;
                            }else{
                                this.examFeeStructure[0].examFeeAdditionalStructureDTOs[i].isDisable = false;
                            }
                        }
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

/*============ FEE PAYING SUBJECTS LIST FILTERING FUNCTION CALL =======*/
addExamSubjects(): void{
  if (this.examFeeStructure.length > 0){

    if (this.feeRegistrations.filter(x => (x.courseYearId === this.examFeeCollectionForm.value.courseYearId)).length === 0){
      this.fineAmount = 0; 
      this.fineObject = {};
      this.selSubs = [];
      this.examFeeFineId = null;
      /*----------- EXAM FEE AMOUNT-----------*/
      // this.crudService.listDetailsByFourIds(this.examFeeStructureCourseyrUrl, this.examFeeCollectionForm.value.examId, this.student.courseGroupId,
      //   this.studentSubjects[0].courseYearId, 'true', 'examFeeStructure.examMaster.examId', 'courseGroup.courseGroupId', 'courseYear.courseYearId', 'isActive')
      //   .subscribe(result => {
      //     this.spinner.hide();
      //       if (result.statusCode === 200){
      //               if (result.data.resultList && result.data.resultList.length > 0) {
      //                  this.examFeeStructure = result.data.resultList;
                      // this.totalReceiptAmt = 0;
      let addF = 0;
      // tslint:disable-next-line: prefer-for-of
      for (let i = 0; i < this.examFeeStructure[0].examFeeAdditionalStructureDTOs.length; i++){
                          addF = addF + this.examFeeStructure[0].examFeeAdditionalStructureDTOs[i].fee;    
                        }
      this.selSubs = [];
      // tslint:disable-next-line: prefer-for-of
      for ( let i = 0; i < this.studentSubjects.length; i++){
                          if (this.studentSubjects[i].checked ){
                              this.selSubs.push(this.studentSubjects[i]);
                          }
                        }
                       // console.log(this.studentSubjects);
      for ( let i = 0; i < this.studentSubjects.length; i++){
                          if (this.studentSubjects[i].checked ){
                            if (this.courseYearFee.filter(x => ( x.courseYearId === this.studentSubjects[i].courseYearId)).length === 0){
                              
                              let examFeeAmount = this.examFeeStructure[0].regFee;

                              this.studentSubjects[i].examFeeStructureId = this.examFeeStructure[0].examFeeStructureId;
                              if (this.examFeeStructure[0].examFeeFineDTOs != null && this.examFeeStructure[0].examFeeFineDTOs.length > 0){
                                  this.fineObject = this.fineCheck(this.examFeeStructure[0].examFeeFineDTOs);
                              }else{
                                  this.fineAmount = 0; 
                              }

                              if (this.studentCurrentCourseYearId !== this.examFeeCollectionForm.value.courseYearId){
                                if (this.selSubs.length === 1){
                                  examFeeAmount = this.examFeeStructure[0].subject1Fee;
                                }else if (this.selSubs.length === 2){
                                  examFeeAmount = this.examFeeStructure[0].subject2Fee;
                                }else if (this.selSubs.length === 3){
                                  examFeeAmount = this.examFeeStructure[0].subject3Fee;
                                }else if (this.selSubs.length === 4){
                                  examFeeAmount = this.examFeeStructure[0].subject4Fee;
                                }else if (this.selSubs.length === 5){
                                  if (this.examFeeStructure[0].subject5Fee != null){
                                    examFeeAmount = this.examFeeStructure[0].subject5Fee;
                                  }else{
                                    examFeeAmount = this.examFeeStructure[0].supplyFee;
                                  }
                                }else if (this.selSubs.length === 6){
                                  if (this.examFeeStructure[0].subject6Fee != null){
                                    examFeeAmount = this.examFeeStructure[0].subject6Fee;
                                  }else{
                                    examFeeAmount = this.examFeeStructure[0].supplyFee;
                                  }
                                }else if (this.selSubs.length === 7){
                                  if (this.examFeeStructure[0].subject7Fee != null){
                                    examFeeAmount = this.examFeeStructure[0].subject7Fee;
                                  }else{
                                    examFeeAmount = this.examFeeStructure[0].supplyFee;
                                  }
                                }else if (this.selSubs.length > 7){
                                  examFeeAmount = this.examFeeStructure[0].supplyFee;
                                }
                                if (!this.isEmptyObject(this.fineObject)){
                                  this.fineAmount = this.fineObject.supplyFeeFine;
                                //  this.examFeeFineId = this.fineObject.supplyFeeFine;
                                }else{
                                  this.fineAmount = 0;
                                }
                              }else{
                                  if (!this.isEmptyObject(this.fineObject)){
                                    this.fineAmount = this.fineObject.regFeeFine;
                                  }else{
                                    this.fineAmount = 0;
                                  }
                              }
                              
                              this.courseYearFee.push({
                                collegeCode: this.studentSubjects[i].collegeCode,
                                courseYearId: this.studentSubjects[i].courseYearId,
                                courseName: this.studentSubjects[i].courseName,
                                courseYearName: this.studentSubjects[i].courseYearName,
                                examType: this.studentSubjects[i].examType,
                                examFeeAmount: examFeeAmount,
                                examFineAmount: 0, // this.fineAmount,
                                examAddFee: 0, // addF,
                                academicYear: this.studentSubjects[i].academicYear,
                                examFeeStructureId: this.studentSubjects[i].examFeeStructureId,
                                examAdditionalFeeReceiptDTOs: [] // this.examFeeStructure[0].examFeeAdditionalStructureDTOs
                              });
                              this.totalReceiptAmt = this.totalReceiptAmt + examFeeAmount; // + this.fineAmount + addF;
                              this.courseYearFee.filter(x => ( x.courseYearId === this.studentSubjects[i].courseYearId))[0].subjects = [];
                              this.courseYearFee.filter(x => ( x.courseYearId === this.studentSubjects[i].courseYearId))[0].subjects.push(this.studentSubjects[i]);
                            }else{
                              // tslint:disable-next-line: max-line-length
                              if (this.courseYearFee.filter(x => ( x.courseYearId === this.studentSubjects[i].courseYearId))[0].subjects.filter(y => (y.subjectId === this.studentSubjects[i].subjectId)).length === 0){
                                  this.courseYearFee.filter(x => ( x.courseYearId === this.studentSubjects[i].courseYearId))[0].subjects.push(this.studentSubjects[i]);
                              }
                            }
                          }else{
                            if (this.courseYearFee.filter(x => ( x.courseYearId === this.studentSubjects[i].courseYearId)).length > 0){
                                // tslint:disable-next-line: prefer-for-of
                                for (let j = 0; j < this.courseYearFee.filter(x => ( x.courseYearId === this.studentSubjects[i].courseYearId))[0].subjects.length; j++){
                                    // tslint:disable-next-line: max-line-length
                                    if (this.courseYearFee.filter(x => ( x.courseYearId === this.studentSubjects[i].courseYearId))[0].subjects[j].subjectId === this.studentSubjects[i].subjectId){
                                      this.courseYearFee.filter(x => ( x.courseYearId === this.studentSubjects[i].courseYearId))[0].subjects.splice(i, 1);
                                    }
                                }
                            }
                          }
                        }
      //               }else{
      //                 this.snotifyService.info('No Exam Fee Structure for this course Group and Year.', 'Info!');
      //               }
      //           }else{
      //               this.snotifyService.error(result.message, 'Error!');
      //           } 
      //       }, error => {
      //       if (error.error.statusCode === 401){
      //           this.snotifyService.error(error.error.message, 'Error!');
      //           this.genericFunctions.logOut(this.router.url);
      //       }else{
      //           this.snotifyService.error(CONSTANTS.message.CON_ERROR, 'Error!');
      //       }
      // });

    }else{
      this.snotifyService.info('Exam fee has paid for this course year.', 'Info!');
    }
  }else{
      this.snotifyService.info('No Exam Fee Structure for this course Group and Year.', 'Info!');
  } 
 }

  fineCheck(fineList): any{
      const currentDate = this.genericFunctions.momentYMD();
      // tslint:disable-next-line: prefer-for-of
      for (let i = 0; i < fineList.length; i++){
          if (currentDate >= fineList[i].fineFromDate && currentDate <= fineList[i].fineToDate){
              return fineList[i];
          }
      }
      return {};
  }
 
  getExamFeestructures(collegeId): void{
         this.spinner.show();
         /*----------- EXAM FEE STRUCTURES -----------*/
         this.crudService.listDetailsByThreeIds(this.examFeeStructureCrudUrl, collegeId, '', 'true', 
         this.getDetailsByCollegeIdUrl, this.getExamMasterDetailsUrl, this.isActive)
         .subscribe(result => {
            this.spinner.hide();
            if (result.statusCode === 200){
                     if (result.data.resultList && result.data.resultList !== '') {
                         this.examsFeeStructures = result.data.resultList;  
                        
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

  getTotalAmt(courseYearFeeList): any{
    this.total = 0;
    // tslint:disable-next-line: prefer-for-of
    for (let i = 0; i < courseYearFeeList.length; i++){
        this.total = this.total + courseYearFeeList[i].examFeeAmount + courseYearFeeList[i].examFineAmount + courseYearFeeList[i].examAddFee;
    }
    return this.total;
  }

  getRelevantExamSujects(courseYearId): void{
      if (courseYearId != null){
          if (courseYearId === this.student.courseYearId){
             this.getStudentSubjects(courseYearId);
          }else{
             this.getExamCourseYearSubjets(courseYearId);
          }
      }
  }

getExamCourseYearSubjets(courseYearId): void{
  this.studentSubjects = [];
  this.selectedSubjects = [];
  this.examFeeStructure = [];
  this.spinner.show();
   /*-----------EXAM COURSES YEARS  SUBJECTS-----------*/      
  this.crudService.listDetailsByThreeIds(this.examStdCourseyrSubjecturl, this.student.collegeId, courseYearId,  this.student.studentId,
    'examStudentCourseYear.college.collegeId', 'examStudentCourseYear.courseYear.courseYearId', 
    'examStudentCourseYear.studentDetail.studentId')
   .subscribe(result => {
       this.spinner.hide();
       if (this.params.examId != null && this.params.examId !== ''){
          this.getExamFeeStructure(courseYearId);
       }
       if (result.statusCode === 200) {
           if (result.data.resultList && result.data.resultList !== '') {
              this.examCourseYearSubjetsList = [];
              // tslint:disable-next-line: prefer-for-of
              for (let i = 0; i < result.data.resultList.length; i++){
                result.data.resultList[i].examType = 'Supple';
                if (result.data.resultList[i].courseYearId === null){
                    result.data.resultList[i].courseYearId = courseYearId;

                    if (this.courseYears.filter(x => (x.fromCourseYearId === courseYearId)).length > 0){
                      result.data.resultList[i].courseYearName = this.courseYears.filter(x => (x.fromCourseYearId === courseYearId))[0].fromCourseYearName;
                    }
                }
                result.data.resultList[i].Subject_name = result.data.resultList[i].subjectName;
                result.data.resultList[i].Subject_code = result.data.resultList[i].subjectCode;
                if (result.data.resultList[i].examresultCatCode === 'FAIL' || result.data.resultList[i].examresultCatCode === 'ABSENT'){
                    this.examCourseYearSubjetsList.push(result.data.resultList[i]);
                }
              }
              // tslint:disable-next-line: only-arrow-functions tslint:disable-next-line: typedef
              this.examCourseYearSubjetsList = this.examCourseYearSubjetsList.map(function(obj) { 
                obj['credits'] = obj['creditPoints']; // Assign new key 
                delete obj['creditPoints']; // Delete old key 
                return obj; 
              });
              this.studentSubjects = this.examCourseYearSubjetsList;
              this.markAll();
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

  /* ============ Edit exam course year subjects list =============*/
  editExamSubjectsList(data): void{
    this.examFeeCollectionForm.get('courseYearId').setValue(data.courseYearId);
    this.studentSubjects = [];
    this.studentSubjects = this.courseYearFee.filter(x => ( x.courseYearId === data.courseYearId))[0].subjects;
  }

  deleteSubject(courseYearSubject, index): void{
    if ( index > - 1) {
      this.studentSubjects.splice(index, 1);
      // tslint:disable-next-line: prefer-for-of
      for (let i = 0; i < this.courseYearFee.length; i++){
        if (this.courseYearFee[i].courseYearId === courseYearSubject.courseYearId){
          for (let j = 0; j < this.courseYearFee[i].subjects.length; j++){
            if (this.courseYearFee[i].subjects[j].subjectId === courseYearSubject.subjectId){
              this.courseYearFee[i].subjects.splice(j, 1);
            }
          }
        }
      }
      this.markAll();
    }
  }

  deleteCourseYearSubject(courseYearSubject, index): void{
    if ( index > - 1) {
      this.courseYearFee.splice(index, 1);
    }
    this.totalReceiptAmt = this.totalReceiptAmt - courseYearSubject.examFeeAmount - courseYearSubject.examFineAmount - courseYearSubject.examAddFee;
  }

  deleteTransaction(transaction, index): void{
    if ( index > - 1) {
      this.transactions.splice(index, 1);
    }
  }

  addTrans(form): void{
    if (this.examFeeCollectionForm.valid){
      if (this.examFeeRecptAvatar.nativeElement.files.length > 0){
      this.totalTransAmt = 0;
      const tranType = this.transactionTypes.filter(x => (x.generalDetailId === form.transactionAppCatId))[0].generalDetailDisplayName;
      this.transactions.push({
        collegeId: this.student.collegeId,
        examId: this.params.examId,
        studentId: this.student.studentId,
        transactionAppCatId: form.transactionAppCatId,
        isActive: true,
        transactionPath: this.examFeeRecptAvatar.nativeElement.files[0].name,
        transactionFile: this.examFeeRecptAvatar.nativeElement.files[0],
        transactionTypeName: tranType,
        transactionAmount: form.transactionAmount,
        transactionDate: this.genericFunctions.moment(),
        transactionRefno: form.transactionRefno,
      });
      // tslint:disable-next-line: prefer-for-of
      for (let i = 0; i < this.transactions.length; i++){
          this.totalTransAmt = this.totalTransAmt + this.transactions[i].transactionAmount;
          // this.examFeeRecptAvatar.nativeElement.value = '';
      }
     
      this.examFeeCollectionForm.get('transactionAppCatId').setValue('');
      this.examFeeCollectionForm.get('transactionRefno').setValue('');
      this.examFeeCollectionForm.get('transactionAmount').setValue(0);
      this.examFeeRecptAvatar.nativeElement.value = '';
     }else{
        this.snotifyService.info('Please upload transaction receipt.', 'Info!');
     }
     
    }
  }

  payExamFees(): void{
    if (this.transactions.length > 0){
      this.examFeeReceipt = [];
      this.examRegister = {};
      // tslint:disable-next-line: prefer-for-of
      for (let i = 0; i < this.courseYearFee.length; i++){
       if (this.examFeeTypes.filter(x => (x.generalDetailCode === this.courseYearFee[i].examType)).length > 0){
         this.courseYearFee[i].examtypeCatId = this.examFeeTypes.filter(x => (x.generalDetailCode === this.courseYearFee[i].examType))[0].generalDetailId;
       } 

       if (this.examsList.filter(x => (x.examId === +this.params.examId)).length > 0){
         this.examName = this.examsList.filter(x => (x.examId === +this.params.examId))[0].examName;
         this.examFromDate = this.examsList.filter(x => (x.examId === +this.params.examId))[0].fromDate;
         this.examToDate = this.examsList.filter(x => (x.examId === +this.params.examId))[0].toDate;
       } 

       this.examFeeSubjects = [];

       // tslint:disable-next-line: prefer-for-of
       for (let n = 0; n < this.courseYearFee[i].subjects.length; n++){
           if (this.examFeeSubjects.filter(x => (x.subjectId === this.courseYearFee[i].subjects[n].subjectId)).length === 0){
            this.examFeeSubjects.push({
              collegeId: this.student.collegeId,
              subjectId: this.courseYearFee[i].subjects[n].subjectId,
              isActive: true,
            });
           }
       }
 
       this.examFeeReceipt.push({
         collegeCode: this.courseYearFee[i].collegeCode,
         examName: this.examName,
         regulationId: this.student.regulationId,
         examFeeAmount: this.courseYearFee[i].examFeeAmount,
         courseName: this.courseYearFee[i].courseName,
         courseYearName: this.courseYearFee[i].courseYearName,
         examType: this.courseYearFee[i].examType,
         examFromDate: this.examFromDate,
         examToDate: this.examToDate,
         courseGroupName: this.student.groupCode,
         academicYear: this.courseYearFee[i].academicYear,
         studentName: this.student.firstName,
         rollno: this.student.rollNumber,
         collegeId : this.student.collegeId,
         courseYearId : this.courseYearFee[i].courseYearId,
         examFeeStructureId : this.courseYearFee[i].examFeeStructureId,
         examId : this.params.examId,
         examTypeId : this.courseYearFee[i].examtypeCatId,
         studentId : this.student.studentId,
         isActive : true,
         examStdRegSubDTOs: this.examFeeSubjects
        });
      }

      this.examRegister.examStdRegDTOs = this.examFeeReceipt;
      this.examRegister.examStdRegPayDTO = {};
      this.examRegister.examStdRegPayDTO.collegeId = this.student.collegeId;
      this.examRegister.examStdRegPayDTO.examId = this.params.examId;
      this.examRegister.examStdRegPayDTO.paymentModeCatId = 132;
      this.examRegister.examStdRegPayDTO.regPaymentStatusCatId = this.examPayStatuses.filter(x => (x.generalDetailCode === 'PAYMENT PAID'))[0].generalDetailId;
      this.examRegister.examStdRegPayDTO.studentId = this.student.studentId;
      this.examRegister.examStdRegPayDTO.receiptAmount = this.examFeeCollectionForm.value.examFeeAmount;
      this.examRegister.examStdRegPayDTO.settledDate = this.genericFunctions.moment();
      this.examRegister.examStdRegPayDTO.isActive = true;
     // this.examRegister.examStdRegPayDTO.isPaymentSettled = true;
      this.examRegister.examStdRegPayDTO.examStdRegTxnDTOs = this.transactions;
 
      const dialogRef = this.dialog.open(ExamFeePayModalComponent, {
       width: '650px',
       data: this.examFeeReceipt
      });
 
      dialogRef.afterClosed().subscribe(details => {
           if (details === 'PAY'){ 
               this.spinner.show();
               /*---------- EXAM FEE PAY ----------*/
               this.crudService.add(this.examStudentRegistrationUrl, this.examRegister)
               .subscribe(result => {
                   this.spinner.hide();
                   if (result.success){

                    if (result.data.length > 0){
                      this.formData = new FormData();
                      this.spinner.show();
                      // tslint:disable-next-line: prefer-for-of
                      for (let i = 0; i < result.data.length; i++){
                        const transactionFile = this.transactions.filter(x => (x.transactionAppCatId === result.data[i].transactionAppCatId))[0].transactionFile;
                        const transactionPath = this.transactions.filter(x => (x.transactionAppCatId === result.data[i].transactionAppCatId))[0].transactionPath;
                        this.formData.append(result.data[i].examStdRegTransactionId,
                            transactionFile,
                            transactionPath);
                        }
                       
                      /*-------- FILE UPLOAD ---------*/ 
                      this.crudService.upload(this.examStdTxnUploadUrl, this.formData)
                      .subscribe(result1 => {
                          this.spinner.hide();
                          if (result1.statusCode === 200){
                              if (result1.success) {
                                this.snotifyService.success(result.message, 'Success!');
                                this.getExamFeeRegistrations(this.student.studentId, this.params.examId);
                                this.clear();
                              }
                          }else {
                              this.getExamFeeRegistrations(this.student.studentId, this.params.examId);
                              this.clear();
                              this.snotifyService.error(result1.message, 'Error!');
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
                    }else{
                      this.snotifyService.success(result.message, 'Success!');
                      this.getExamFeeRegistrations(this.student.studentId, this.params.examId);
                      this.clear();
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
  }

  clear(): void{
    this.courseYearFee = [];
    this.selectedSubjects = [];
    this.transactions = [];
    this.studentSubjects = [];
    this.examFeeStructure = [];
    this.selectedCount = 0;
    this.examFeeCollectionForm.get('courseYearId').setValue('');
    this.totalTransAmt = 0;
  }

  viewCourseYearSubjectsListDialog(item): void {
    if (!item.regulationName){
      item.regulationName = this.student.regulationName;
    }
   // item.subjects = item.examStdRegSubDTOs;
    // tslint:disable-next-line: prefer-for-of
    for (let i = 0; i < item.subjects.length; i++){
      item.subjects[i].regulationName = item.regulationName;
    }
    const dialogRef = this.dialog.open(ViewSubjectsComponent, {
          width: '750px',
          data: item.subjects
    });
  }

  viewSubjectsListDialog(item): void {
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

  viewTransactions(item): void{
    item.courseCode = this.student.courseCode;
    item.groupCode = this.student.groupCode;
    const dialogRef = this.dialog.open(ViewTransactionsComponent, {
      width: '950px',
      data: item
    });

    dialogRef.afterClosed().subscribe(details => {
      if (details != null && details !== ''){  
          this.spinner.show();
          this.isUpload = false;
          this.formData = new FormData();
          // tslint:disable-next-line: prefer-for-of
          for (let i = 0; i < details.examStdRegTxnDTOs.length; i++){
               if (details.examStdRegTxnDTOs[i].path){
                this.isUpload = true;
                // const transactionFile = this.transactions.filter(x => (x.transactionAppCatId === details.examStdRegTxnDTOs[i].transactionAppCatId))[0].transactionFile;
                // const transactionPath = this.transactions.filter(x => (x.transactionAppCatId === details.examStdRegTxnDTOs[i].transactionAppCatId))[0].transactionPath;
                this.formData.append(details.examStdRegTxnDTOs[i].examStdRegTransactionId,
                    details.examStdRegTxnDTOs[i].path,
                    details.examStdRegTxnDTOs[i].path.name);
               }
               if (details.examStdRegTxnDTOs[i].transactionPath != null){
                   details.examStdRegTxnDTOs[i].transactionPath = details.examStdRegTxnDTOs[i].transactionPath.split('cms/')[1];
               }
          }
                       
          // if (!this.isStatusflag){
          //   details.regPaymentStatusCatId = this.examPayStatuses.filter(x => (x.generalDetailCode === 'PAYMENT REJECTED'))[0].generalDetailId;
          // }else{
          //   details.regPaymentStatusCatId = this.examPayStatuses.filter(x => (x.generalDetailCode === 'PAYMENT APPROVED'))[0].generalDetailId;
          // }

          this.examPays = [];
          this.examPays.push(details);
    
          this.crudService.add(this.examStudentRegPaymentUrl, this.examPays)
          .subscribe(result => {
              this.spinner.hide();
              if (result.statusCode === 200){
                  if (result.success) {
                      
                      if (this.isUpload){
                                              /*-------- FILE UPLOAD ---------*/ 
                      this.crudService.upload(this.examStdTxnUploadUrl, this.formData)
                      .subscribe(result1 => {
                          this.spinner.hide();
                          if (result1.statusCode === 200){
                              if (result1.success) {
                                this.snotifyService.success(result.message, 'Success!');
                                this.getExamFeeRegistrations(this.student.studentId, this.params.examId);
                                this.clear();
                              }
                          }else {
                              this.getExamFeeRegistrations(this.student.studentId, this.params.examId);
                              this.clear();
                              this.snotifyService.error(result1.message, 'Error!');
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

                      } else{
                        this.getExamFeeRegistrations(this.student.studentId, this.params.examId);
                        this.snotifyService.success(result.message, 'Success!');
                        this.clear();
                      }

                      
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

  // tslint:disable-next-line:typedef
  isEmptyObject(obj) {
    return (obj && (Object.keys(obj).length === 0));
  }

  goBack(): void{
    this.router.navigate(['/examination-management/pre-examination/exam-fee-registration'], { queryParams: 
      { 
        examId: this.params.examId
    } });
  }

}
