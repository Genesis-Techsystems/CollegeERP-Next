



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
import { ViewSubjectsComponent } from '../view-subjects/view-subjects.component';
import { ExamFeePayDialogComponent } from './exam-fee-pay-dialog/exam-fee-pay-dialog.component';
import { DeleteExamReceiptComponent } from './delete-exam-receipt/delete-exam-receipt.component';
import { fuseAnimations } from '@fuse/animations';
import { ParametersService } from 'app/main/services/parameters.service';


@Component({
  selector: 'app-regular-exam-fee-collection',
  templateUrl: './regular-exam-fee-collection.component.html',
  styleUrls: ['./regular-exam-fee-collection.component.scss'],
  animations : fuseAnimations
})

export class RegularExamFeeCollectionComponent implements OnInit {

  @ViewChild('examFeeNtfcAvatar') examFeeNtfcAvatar: ElementRef;

  private collegeCrudUrl = CONSTANTS.collegeCrudUrl;
  private academicYearCrudUrl = CONSTANTS.academicYearCrudUrl;
  private getDetailsByCollegeIdUrl = CONSTANTS.getDetailsByCollegeIdUrl;
  private courseCrudUrl = CONSTANTS.courseCrudUrl;
  private examMasterUrl = CONSTANTS.examMasterUrl;
  private getDetailsByCourseIdUrl = CONSTANTS.getDetailsByCourseIdUrl;
  private courseGroupCrudUrl = CONSTANTS.courseGroupCrudUrl;
  private studentSearchUrl = CONSTANTS.studentSearchUrl;
  private studentExamFeeReceiptDownloadUrl = CONSTANTS.studentExamFeeReceiptDownloadUrl;
  private studentSubjectUrl = CONSTANTS.studentSubjectUrl;
  private examStdCourseyrSubUrl = CONSTANTS.examStdCourseyrSubUrl;
  private examFeeReceiptCrudUrl = CONSTANTS.examFeeReceiptCrudUrl;
  private examStudentRegistrationCrudUrl = CONSTANTS.examStudentRegistrationCrudUrl;
  private examFeeStructureCrudUrl = CONSTANTS.examFeeStructureCrudUrl;
  private getExamMasterDetailsUrl = CONSTANTS.getExamMasterDetailsUrl;
  private isActive = CONSTANTS.isActive;
  private examFeeReceiptUrl = CONSTANTS.examFeeReceiptUrl;
  private generalDetailsUrl = CONSTANTS.generalDetailsUrl;
  private generalDetailsByCodeUrl = CONSTANTS.generalDetailsByCodeUrl;
  private paymentMode = CONSTANTS.paymentMode;
  private examFeeStructureCourseyrUrl = CONSTANTS.examFeeStructureCourseyrUrl;
  private examFeeType = CONSTANTS.examFeeType;
  private subjectsearchUrl = CONSTANTS.subjectsearchUrl;
  private examCourseYearSubjectUrl = CONSTANTS.examCourseYearSubjectUrl;
  private StudentAcademicbatchUrl = CONSTANTS.StudentAcademicbatchUrl;
  private studentSubjectsForRegularExamUrl =CONSTANTS.studentSubjectsForRegularExamUrl
  private endURL = CONSTANTS.MAINAPI;
  private studentSubjectsForSupplyExamUrl =CONSTANTS.studentSubjectsForSupplyExamUrl
  private getStudentExamFeeStructureUrl = CONSTANTS.getStudentExamFeeStructureUrl;
  private ExamMasterDetailsUrl = CONSTANTS.ExamMasterDetailsUrl;
  private getDetailsByGroupUrl = CONSTANTS.getDetailsByGroupUrl;
  private getDetailsByRegulationIdUrl = CONSTANTS.getDetailsByRegulationIdUrl;

  examFeeCollectionForm: FormGroup;
  colleges: College[] = [];
  academicYears: AcademicYear[] = [];
  courses: Course[] = [];
  examsList: ExamMaster[] = [];
  courseGroups: CourseGroup[] = [];
  searchStudents = [];
  selectedStd = [];
  CoursesYearDublicateList=[];
  student: any = {};
  studentSubjects: any[] = [];
  courseYears: any[] = [];
  courseYearsList: any[] = [];
  allCourseYearsList: any[] = [];
  examCourseYearSubjetsList: any[] = [];
  studentFirstName;
  check = 1;
  calculateOnlyAfterAddFee = false;

  checkExam = 1;
  checksubject = true;
  semNo: number;
  examSubjestList: any[] = [];
  count = 0;
  courseYearFee: any = [];
  examsFeeStructures: any = [];
  courseYearsubjectsList: any[] = [];
  selectedCount = 0;
  paymentModes: any[] = [];
  examFeeReceipt: any[] = [];
  examFeeTypes: any[] = [];
  examName;
  examFromDate;
  examToDate;
  courseGroupName;
  totalReceiptAmt = 0;
  examAddtFee=0
  feeReceipts: any[] = [];
  CoursesYearList=[]
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
  feeRegistrations = [];
  selSubs = [];
  params: any = {};
  isSupplyExam:boolean
  isRegularExam:boolean
  selectedValue: any[] = [50431];
  examDetailsList = [];
  examDetailsByStudentCourseYearUrl = CONSTANTS.examDetailsByStudentCourseYearUrl;
  toggleOptions: Array<any> = ['First', 'Second'];
  
  public studentFilterCtrl: FormControl = new FormControl();
  private _onDestroy = new Subject<void>();
  public filteredStudents: ReplaySubject<any[]> = new ReplaySubject<any[]>(1);

  public subjectFilterCtrl: FormControl = new FormControl();
  public filteredSubjects: ReplaySubject<any[]> = new ReplaySubject<any[]>(1);

  public examFilterCtrl: FormControl = new FormControl();
  public filteredExams: ReplaySubject<any[]> = new ReplaySubject<any[]>(1);

  constructor(private formBuilder: FormBuilder, private snotifyService: SnotifyService,
              private crudService: CrudService, private spinner: NgxSpinnerService, private router: Router, 
              private dialog: MatDialog, private genericFunctions: GenericFunctions, private route: ActivatedRoute,
              private parameterservice:ParametersService) {        
      this.getData();
  }

  ngOnInit(): void {
    this.examFeeCollectionForm = this.formBuilder.group({
      courseId: [''],  
      collegeId: [''],  
      academicYearId: [''],  
      courseGroupId: [''],  
      examId: ['', Validators.required],
      studentId: ['', Validators.required],
      subjectId: [],
      courseYearId: [''],
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

    this.examFeeCollectionForm.get('examFeeAmount').disable();
    this.studentFilterCtrl.valueChanges
    .pipe(takeUntil(this._onDestroy))
    .subscribe(() => {
      this.filterStd();
    });

    this.subjectFilterCtrl.valueChanges
    .pipe(takeUntil(this._onDestroy))
    .subscribe(() => {
      this.filterSubject();
    });

    this.route.queryParams.subscribe(params=>{
      this.params = params;
      this.enteredStudent(this.params.stdRollNumber);
    });

    this.searchSubjects.push({subjectName: 'Search by Course name or code.'});
    this.filteredSubjects.next(this.searchSubjects.slice());

    this.searchStudents.push({firstName: 'Search by student name or rollno.'});
    this.filteredStudents.next(this.searchStudents.slice());

    this.examFilterCtrl.valueChanges
      .pipe(takeUntil(this._onDestroy))
      .subscribe(() => {
        this.filterExam();
    });

    this.searchExams.push({examName: 'Search by Exam name.'});
    this.filteredExams.next(this.searchExams.slice());

  }

   // tslint:disable-next-line: use-lifecycle-interface
   ngOnDestroy(): void {
    this._onDestroy.next();
    this._onDestroy.complete();
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

  filterSubject(): void {
    if (!this.searchSubjects) {
      return;
    }
    // get the search keyword
    let search = this.subjectFilterCtrl.value;
    if (!search) {
      this.filteredSubjects.next(this.searchSubjects.slice());
      return;
    } else {
      search = search.toLowerCase();
    }
    // filter the banks
    this.filteredSubjects.next(
      this.searchSubjects.filter(x => x.subjectName.toLowerCase().indexOf(search) > -1)
    );
  }

  enteredSubjects(event): void{
      if (event.target.value.length > 4){ 
        /*----------- STUDENTS -----------*/
        this.crudService.listByThreeIds(this.subjectsearchUrl, this.student.collegeId, 'true', event.target.value,
            'collegeId',  'isActive', 'q')
            .subscribe(result => {
                if (result.statusCode === 200){
                        if (result.data && result.data !== '') {  
                            this.searchSubjects = result.data;
                            this.filteredSubjects.next(this.searchSubjects.slice());                
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
      this.searchSubjects = [];
      this.searchSubjects.push({subjectName: 'Search by Course name or code.'});
      this.filteredSubjects.next(this.searchSubjects.slice());
      this.examFeeCollectionForm.get('subjectId').setValue('');
  }
  }

  getExamsList(): void{
    this.examFeeCollectionForm.get('examId').setValue('');
    this.examsList = [];
    this.courseYearsList = [];
    this.feeReceipts = [];
    this.courseYearFee = [];
    this.searchExams = [];
    this.searchExams.push({examName: 'Search by Exam name.'});
    this.filteredExams.next(this.searchExams.slice());  
    this.flag = false;
    this.examDetailsList = [];
  /*----------- Exams List -----------*/      
  this.crudService.listDetailsByTwoIdsWithSort(this.examMasterUrl, this.student.courseId, 'true', 'DESC',
    this.getDetailsByCourseIdUrl, this.isActive, 'createdDt')
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
            if(this.params && this.params.examId != null){
              this.examFeeCollectionForm.get('examId').setValue(parseInt(this.params.examId));
              this.selectedExternalExam();
            } 
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

selectedExternalExam(): void{
  this.flag = false;
  // this.isSupplyExam=this.examsList.filter(x=>(x.examId==this.examFeeCollectionForm.value.examId))[0]?.isSupplyExam
  // this.isRegularExam=this.examsList.filter(x=>(x.examId==this.examFeeCollectionForm.value.examId))[0]?.isRegularExam
  // if(this.isRegularExam){
  //  this.checkExam=1
  // }
  // else{
  //   this.checkExam=2

  // }
  this.feeReceipts = [];
  this.searchText = '';
 // this.selectedCount = 0;
  this.flag = true;
  this.examDetailsList = [];
  this.courseYears = [];
  this.studentSubjects = [];
  this.getExamFeeStructure(this.student.courseYearId);
  this.getExamDetails(1);
  // this.supplyCourseYears(1);
 // this.getExamFeeRegistrations(this.student.studentId, this.examFeeCollectionForm.value.examId);
  if (this.selectedStd.length > 0){
    this.getExamFeeReceipts(this.student.studentId);
  }
  // if(this.params.examId == null){    
  // } 
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
              // this.courseYearFee.push({
              //   collegeCode: this.studentSubjects[i].collegeCode,
              //   courseYearId: this.studentSubjects[i].courseYearId,
              //   courseName: this.studentSubjects[i].courseName,
              //   courseYearName: this.studentSubjects[i].courseYearName,
              //   examType: this.studentSubjects[i].examType,
              //   examFeeAmount: examFeeAmount,
              //   examFineAmount: this.fineAmount,
              //   examAddFee: addF,
              //   academicYear: this.studentSubjects[i].academicYear,
              //   examFeeStructureId: this.studentSubjects[i].examFeeStructureId,
              //   examAdditionalFeeReceiptDTOs: this.examFeeStructure[0].examFeeAdditionalStructureDTOs
              // });
              // this.totalReceiptAmt = this.totalReceiptAmt + examFeeAmount + this.fineAmount + addF;
              // this.courseYearFee.filter(x => ( x.courseYearId === this.studentSubjects[i].courseYearId))[0].subjects = [];
              // this.courseYearFee.filter(x => ( x.courseYearId === this.studentSubjects[i].courseYearId))[0].subjects.push(this.studentSubjects[i]);
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

enteredStudent(event): void{
  if (event.length > 4){
    this.flag = false;
      /*----------- STUDENTS -----------*/
    this.crudService.listByTwoIds(this.studentSearchUrl, 'true', event, 
       'isActive', 'q')
          .subscribe(result => {
              if (result.statusCode === 200){
                      if (result.data && result.data !== '') {  
                          this.searchStudents = result.data;
                          this.filteredStudents.next(this.searchStudents.slice());  
                          if(this.params && this.params.studentId != null){
                            this.examFeeCollectionForm.get('studentId').setValue(parseInt(this.params.studentId));
                            this.selectedStudent(this.examFeeCollectionForm.value.studentId);
                          }               
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

selectedStudent(studentId): void{
  this.totalReceiptAmt = 0
  this.courseYearsList = [];
  this.feeReceipts = [];
  this.searchText = '';
  this.courseYearFee = [];
  this.searchExams = [];
  this.selectedSubjects = [];
  this.studentSubjects = [];
  this.examDetailsList = [];
  this.searchExams.push({examName: 'Search by Exam name.'});
  this.filteredExams.next(this.searchExams.slice());  
  this.selectedCount = 0;
  this.examFeeCollectionForm.get('courseYearId').setValue('');
  if (studentId != null){
    this.selectedStd = [];
    this.flag = false;
 

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
                    // this.supplyCourseYears(this.checkExam);
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
    if (this.searchStudents.filter(x => (x.studentId === studentId)).length > 0){
      this.selectedStd.push(this.searchStudents.filter(x => (x.studentId === studentId))[0]);
      this.student = this.selectedStd[0];
      this.studentCurrentCourseYearId = this.student.courseYearId;
      this.student.studentPhotoPath = this.student.studentPhotoPath + '?' + new Date().getTime();
      this.studentFirstName = this.student.firstName + ' ( ' + this.student.hallticketNumber + ' )';
      this.getExamsList();
   }
  }  
}
getExamDetails(type){
  this.examDetailsList = [];
  this.crudService.listDetailsByFourIds(this.ExamMasterDetailsUrl, this.examFeeCollectionForm.value.examId, 
      this.student.courseGroupId, this.student.regulationId, 'true', this.getExamMasterDetailsUrl, this.getDetailsByGroupUrl,
      this.getDetailsByRegulationIdUrl, 'isActive')
  .subscribe(result => {
     this.spinner.hide();
     if (result.statusCode === 200){
          if (result.success) {
              this.examDetailsList = result.data.resultList;
              this.supplyCourseYears(type);
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
supplyCourseYears(type): void{
  this.courseYears = [];
  this.studentSubjects = [];
  if(this.examDetailsList && this.examDetailsList.length > 0){
      if (type === 1) {
        this.examDetailsList = this.examDetailsList.filter(x => (x.examTypeCatCode === 'Regular'));
        this.courseYears.push(this.courseYearsList.filter(x => ( x.fromCourseYearId === this.student.courseYearId))[0]);
        console.log(this.courseYears,"this.courseYears");
        this.courseYears = this.courseYears.filter(cy =>
          this.examDetailsList.some(ed => ed.courseYearId === cy.courseYearId)
        );
        if(this.courseYears && this.courseYears.length > 0){
          this.examFeeCollectionForm.get('courseYearId').setValue(this.courseYears[0]?.courseYearId);
          this.getStudentSubjects(this.student.courseYearId);
        }else{
             this.snotifyService.info('No Course Years in Exam Details', 'Info!');
        }
      }else if (type === 2) {
      // this.semNo = +this.courseYearsList.filter(x => ( x. courseYearCode === this.student.courseYearCode))[0].semNo;
        // tslint:disable-next-line: prefer-for-of
        this.examDetailsList = this.examDetailsList.filter(x => (x.examTypeCatCode === 'Supple'));
        for ( let i = 0;  i <  this.courseYearsList.length; i++){
          if (this.courseYearsList[i].fromCourseYearId !== this.student.courseYearId){
            this.courseYears.push(this.courseYearsList[i]);
          }
        }
        console.log(this.courseYears,"this.courseYears");
        this.courseYears = this.courseYears.filter(cy =>
        this.examDetailsList.some(ed => ed.courseYearId === cy.courseYearId)
      );
        if(this.courseYears && this.courseYears.length > 0){

        }else{
             this.snotifyService.info('No Course Years in Exam Details', 'Info!');
        }
      }
    }
}

getExamFeeReceipts(studentId): void{
  this.CoursesYearDublicateList=[]
  /*------------- FEE RECEIPTS ------------*/  
  this.crudService.listDetailsByThreeIds(this.examFeeReceiptCrudUrl, this.examFeeCollectionForm.value.examId, 
      studentId, 'true', 'exam.examId', 'studentDetail.studentId', 'isActive')
  .subscribe(result => {
     this.spinner.hide();
     if (result.statusCode === 200){
          if (result.success) {
              this.feeReceipts = result.data.resultList;
              // tslint:disable-next-line: prefer-for-of
              for (let i = 0; i < this.feeReceipts.length; i++){
                  // tslint:disable-next-line: prefer-for-of
                  for (let j = 0; j < this.feeReceipts[i]?.examStudentDTOs[0]?.examStudentDetailDTOs.length; j++){
                    // tslint:disable-next-line: max-line-length
                    this.feeReceipts[i].examStudentDTOs[0].examStudentDetailDTOs[j].subjectTypeCode = this.feeReceipts[i].examStudentDTOs[0].examStudentDetailDTOs[j].subjecttypeCode;
                    this.feeReceipts[i].examStudentDTOs[0].examStudentDetailDTOs[j].credits = this.feeReceipts[i].examStudentDTOs[0].examStudentDetailDTOs[j].credits;
                    this.CoursesYearDublicateList.push(this.feeReceipts[i])
                  }
              }
              if( this.CoursesYearDublicateList.length>0){
                this.CoursesYearList=[]
                const CoursesData = this.CoursesYearDublicateList.map(({ courseYearId }) => courseYearId);
                this.CoursesYearList = this.CoursesYearDublicateList.filter(({ courseYearId }, index) =>
                  !CoursesData.includes(courseYearId, index + 1));
              }

              
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
  if (courseYearId != null && courseYearId !== 'undefined'){
    this.spinner.show();
    if (this.examFeeCollectionForm.value.examId != null && this.examFeeCollectionForm.value.examId !== ''){
      this.getExamFeeStructure(courseYearId);
   }
    if (this.student.courseYearId === courseYearId) {
    /*----------- STUDENTS SUBJECT-----------*/
    // this.crudService.listDetailsByFiveIds(this.studentSubjectUrl, this.student.collegeId, this.stdAcademicYearId, this.student.studentId,
    //   courseYearId, 'true', 'college.collegeId', 'academicYear.academicYearId', 'studentDetail.studentId', 'courseYear.courseYearId', 'isActive')
    //   .subscribe(result => {
      http://localhost:9090/cms/studentsubjectsforregularexam?collegeId=51&courseYearId=25&studentId=333&academicYearId=5&examId=121
      this.crudService.listByFiveIds(this.studentSubjectsForRegularExamUrl, this.student.collegeId, this.stdAcademicYearId, this.student.studentId,
      courseYearId,this.examFeeCollectionForm.value.examId, 'collegeId', 'academicYearId', 'studentId', 'courseYearId', 'examId')
      .subscribe(result => {
        this.spinner.hide();
        if (result.statusCode === 200){
                  if (result.data && result.data !== '') {
                      this.studentSubjects = result.data;
                      if(this.studentSubjects && this.studentSubjects.length > 0){
                      const isBridgeCourse = this.examDetailsList
                      .find(e => e.courseYearId === courseYearId)?.isBridgeCourse;
                      this.studentSubjects = this.studentSubjects.filter(
                      s => s.isBridgeCourse === isBridgeCourse
                      );
                      }
                      for (let i = 0; i < result.data.length; i++){
                        if (this.studentSubjects[i].shortName === null || this.studentSubjects[i].shortName === ''){
                          this.studentSubjects[i].shortName = this.studentSubjects[i].subjectCode;
                        }
                        this.studentSubjects[i].examType = 'Regular';
                        this.studentSubjects[i].isSelected = true;
                        this.studentSubjects[i].checked = true;
                        this.studentSubjects[i].Subject_name = this.studentSubjects[i].subjectName;
                        this.studentSubjects[i].Subject_code = this.studentSubjects[i].subjectCode;
                        this.studentSubjects[i].credits = this.studentSubjects[i].subCredits;
                        if (this.studentSubjects.filter(x => (x.subjectId === this.studentSubjects[i].subjectId)).length === 0){
                          this.studentSubjects.push(this.studentSubjects[i]);
                        }
                      }
                      this.studentSubjects = this.studentSubjects.sort((a, b) =>
                        a.subjAlreadyRegistered === b.subjAlreadyRegistered ? 0 : a.subjAlreadyRegistered ? 1 : -1
                      );
                    
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
      // this.crudService.listByFourIds(this.examCourseYearSubjectUrl, this.student.collegeId, this.stdAcademicYearId,
      //   courseYearId, this.student.courseGroupId, 'collegeId', 'academicYearId', 'courseyearId', 'courseGroupId')
      //   .subscribe(result => {
        this.crudService.listByFourIds(this.studentSubjectsForSupplyExamUrl, this.student.collegeId, courseYearId,this.examFeeCollectionForm.value.studentId,this.examFeeCollectionForm.value.examId,
          'collegeId', 'courseYearId', 
          'studentId','examId')
         .subscribe(result => {
        this.spinner.hide();
        if (result.statusCode === 200){
                  if (result.data && result.data !== '') {
                      this.studentSubjects = result.data;
                      if(this.studentSubjects && this.studentSubjects.length > 0){
                      const isBridgeCourse = this.examDetailsList
                      .find(e => e.courseYearId === courseYearId)?.isBridgeCourse;
                      this.studentSubjects = this.studentSubjects.filter(
                      s => s.isBridgeCourse === isBridgeCourse
                      );
                      }
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
                      this.studentSubjects = this.studentSubjects.sort((a, b) =>
                        a.subjAlreadyRegistered === b.subjAlreadyRegistered ? 0 : a.subjAlreadyRegistered ? 1 : -1
                      );
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

checkedSubjects(check, item): void {
  item.isSelected = check;
  this.selectedCount = 0;
  this.selectedSubjects = [];

  for (let i = 0; i < this.studentSubjects.length; i++) {
    if (this.studentSubjects[i].isSelected) {
      this.selectedSubjects.push(this.studentSubjects[i]);
      this.selectedCount++;
    }
  }

  // REMOVE subject from added fee (UN-CHECK)
  if (!item.isSelected) {
    for (let n = 0; n < this.courseYearFee.length; n++) {
      if (this.courseYearFee[n].courseYearId === item.courseYearId) {
        this.courseYearFee[n].subjects =
          this.courseYearFee[n].subjects.filter(s => s.subjectId !== item.subjectId);
      }
    }

    // IMPORTANT → Only on UNCHECK: recalc fee
    this.recalculateFee();
  }

  // CHECKED → DO NOTHING  
  // (wait until Add Fee button is pressed)
   if (!check) {
    const cy = this.courseYearFee.find(x => x.courseYearId === item.courseYearId);
    if (cy) {
      cy.subjects = cy.subjects.filter(s => s.subjectId !== item.subjectId);
      this.recalculateFee();
    }
  }
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
        if(!this.studentSubjects[i].subjAlreadyRegistered){
        this.studentSubjects[i].checked = true;
        this.studentSubjects[i].isSelected = true;
        this.selectedSubjects.push(this.studentSubjects[i]);
        this.selectedCount++;
       }
       else{
        this.studentSubjects[i].checked = false;
        this.studentSubjects[i].isSelected = false;
       }
      }
    }
    
// Update courseYearFee.subjects
const cy = this.courseYearFee.find(x =>
  x.courseYearId === this.examFeeCollectionForm.value.courseYearId
);
if (cy) {
  cy.subjects = this.studentSubjects.filter(s => s.isSelected);
  this.recalculateFee();
}

}


getExamFeeStructure(courseYearId): void{
    this.examFeeStructure = [];
    // this.crudService.listByTwoIds(this.examDetailsByStudentCourseYearUrl, this.examFeeCollectionForm.value.studentId, courseYearId, 'studentId', 'courseYearId')
    // .subscribe(result => {
    //     this.spinner.hide();
    //     if (result.statusCode === 200) {
    //         if (result.data && result.data !== '') {
                //this.exams = result.data;
                    /*----------- EXAM FEE AMOUNT-----------*/
                    this.crudService.listByFourIds(this.getStudentExamFeeStructureUrl, this.student.collegeId,this.examFeeCollectionForm.value.examId, this.student.courseGroupId, courseYearId,
                      'collegeId', 'examId', 'courseGroupId', 
                       'courseYearId')
                      .subscribe(result => {
                       this.spinner.hide();
                       if (result.statusCode === 200){
                                 if (result.data) {
                                    this.examFeeStructure.push(result.data);
                     if (this.examFeeStructure.length > 0){
                        this.examFeeStructure[0].examFeeAdditionalStructures = this.examFeeStructure[0].examFeeAdditionalStructureDTOs;
                        this.examFeeStructure[0].examFeeAdditionalStructureDTOs = [];
                        // tslint:disable-next-line: prefer-for-of
                        for (let i = 0; i < this.examFeeStructure[0].examFeeAdditionalStructures.length; i++){
                             if (this.checkExam === 1){
                                 if (this.examFeeStructure[0].examFeeAdditionalStructures[i].examTypeCatDisplayCode === 'Regular'){
                                    this.examFeeStructure[0].examFeeAdditionalStructureDTOs.push(this.examFeeStructure[0].examFeeAdditionalStructures[i]);
                                 }
                             }else{
                                if (this.examFeeStructure[0].examFeeAdditionalStructures[i].examTypeCatDisplayCode === 'Supple'){
                                  this.examFeeStructure[0].examFeeAdditionalStructureDTOs.push(this.examFeeStructure[0].examFeeAdditionalStructures[i]);
                                }
                             }
                        }
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
                      // this.snotifyService.info('No Exam Fee Structure for this branch and Year.', 'Info!');
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
        //     } else {
        //         this.snotifyService.success(result.message, 'Success!');
        //     }
        // }else {
        //     this.snotifyService.error(result.message, 'Error!');
        // }
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
getSupplyFeeAmount(count) {
  if (count === 1) return this.examFeeStructure[0].subject1Fee;
  if (count === 2) return this.examFeeStructure[0].subject2Fee;
  if (count === 3) return this.examFeeStructure[0].subject3Fee;
  if (count === 4) return this.examFeeStructure[0].subject4Fee;
  if (count === 5) return this.examFeeStructure[0].subject5Fee || this.examFeeStructure[0].supplyFee;
  if (count === 6) return this.examFeeStructure[0].subject6Fee || this.examFeeStructure[0].supplyFee;
  if (count >= 7) return this.examFeeStructure[0].supplyFee;
  return 0;
}

/*============ FEE PAYING SUBJECTS LIST FILTERING FUNCTION CALL =======*/
addExamSubjects(): void {
  this.courseYearFee = [];
  this.totalReceiptAmt = 0;
  if (this.examFeeStructure.length === 0) {
    this.snotifyService.info('No Exam Fee Structure for this branch and Year.', 'Info!');
    return;
  }

  this.fineAmount = 0;
  this.fineObject = {};
  this.selSubs = [];
  this.examFeeFineId = null;

  // Additional Fee Calculation
  let addF = 0;
  for (let i = 0; i < this.examFeeStructure[0].examFeeAdditionalStructureDTOs.length; i++) {
    if (this.examFeeStructure[0].examFeeAdditionalStructureDTOs[i].applyToAll) {
      addF += this.examFeeStructure[0].examFeeAdditionalStructureDTOs[i].fee;
    }
  }

  // Collect selected subjects
  this.selSubs = this.studentSubjects.filter(s => s.checked);

  // Loop through subjects
  for (let i = 0; i < this.studentSubjects.length; i++) {

    const sub = this.studentSubjects[i];

    // Only process subjects that are checked
    if (!sub.checked) {
      continue;
    }

    const courseYearId = sub.courseYearId;

    // If this is the FIRST time adding for this courseYear
    let existingCY = this.courseYearFee.find(x => x.courseYearId === courseYearId);

    // Set structure ID
    sub.examFeeStructureId = this.examFeeStructure[0].examFeeStructureId;

    // Evaluate fine
    if (this.examFeeStructure[0].examFeeFineDTOs?.length > 0) {
      this.fineObject = this.fineCheck(this.examFeeStructure[0].examFeeFineDTOs);
    }

    // ============================
    //       FEE CALCULATION
    // ============================

    let examFeeAmount = 0;

    const isRegular = this.studentCurrentCourseYearId === this.examFeeCollectionForm.value.courseYearId;

    if (isRegular) {
      // REGULAR
      examFeeAmount = this.examFeeStructure[0].regFee;

      this.fineAmount = !this.isEmptyObject(this.fineObject)
        ? this.fineObject.regFeeFine
        : 0;

    } else {
      // SUPPLY — BASED ON NUMBER OF SELECTED SUBJECTS
      examFeeAmount = this.getSupplyFeeAmount(this.selSubs.length);

      this.fineAmount = !this.isEmptyObject(this.fineObject)
        ? this.fineObject.supplyFeeFine
        : 0;
    }

    // ============================
    //   ADD / UPDATE courseYearFee
    // ============================

    if (!existingCY) {

      // Create new entry
      this.courseYearFee.push({
        collegeCode: sub.collegeCode,
        courseYearId: courseYearId,
        courseName: sub.courseName,
        courseYearName: sub.courseYearName,
        examType: sub.examType,
        examFeeAmount: examFeeAmount,
        examFineAmount: this.fineAmount,
        examAddFee: addF,
        academicYear: sub.academicYear,
        examFeeStructureId: sub.examFeeStructureId,
        examAdditionalFeeReceiptDTOs: this.examFeeStructure[0].examFeeAdditionalStructureDTOs,
        subjects: [sub]
      });

      // Add to total amount
      this.totalReceiptAmt += examFeeAmount + this.fineAmount + addF;

    } else {
      // Add subject only if not already added
      if (!existingCY.subjects.some(s => s.subjectId === sub.subjectId)) {
        existingCY.subjects.push(sub);
      }
    }
  }
}

recalculateFee() {
  if (this.courseYearFee.length === 0) return;

  const cy = this.courseYearFee.find(x =>
    x.courseYearId === this.examFeeCollectionForm.value.courseYearId
  );

  if (!cy) return;

  const selectedCount = cy.subjects.length;

  // SUPPLY FEE
  cy.examFeeAmount = this.getSupplyFeeAmount(selectedCount);

  // FINE
  if (this.examFeeStructure[0].examFeeFineDTOs?.length > 0) {
    this.fineObject = this.fineCheck(this.examFeeStructure[0].examFeeFineDTOs);
  }

  cy.examFineAmount = !this.isEmptyObject(this.fineObject)
    ? this.fineObject.supplyFeeFine
    : 0;

  // ADDITIONAL FEE
  let addF = 0;
  for (let f of this.examFeeStructure[0].examFeeAdditionalStructureDTOs) {
    if (f.applyToAll) addF += f.fee;
  }
  cy.examAddFee = addF;

  // TOTAL UPDATE
  this.totalReceiptAmt = cy.examFeeAmount + cy.examFineAmount + addF;
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
    return this.totalReceiptAmt = this.total;

    // return this.total;
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
  this.examFeeStructure = [];
  this.selectedSubjects = [];
  this.spinner.show();
   /*-----------EXAM COURSES YEARS  SUBJECTS-----------*/      
  // this.crudService.listByThreeIds(this.examStdCourseyrSubUrl, this.student.collegeId, courseYearId,  this.examFeeCollectionForm.value.studentId,
  //   'collegeId', 'courseYearId', 
  //   'studentId')
  //  .subscribe(result => {
    this.crudService.listByFourIds(this.studentSubjectsForSupplyExamUrl, this.student.collegeId, courseYearId,this.examFeeCollectionForm.value.studentId,this.examFeeCollectionForm.value.examId,
      'collegeId', 'courseYearId', 
      'studentId','examId')
     .subscribe(result => {
       this.spinner.hide();
       if (this.examFeeCollectionForm.value.examId != null && this.examFeeCollectionForm.value.examId !== ''){
          this.getExamFeeStructure(courseYearId);
       }
       if (result.statusCode === 200) {
           if (result.data && result.data !== '') {
              this.examCourseYearSubjetsList = [];
              // tslint:disable-next-line: prefer-for-of
              for (let i = 0; i < result.data.length; i++){
                result.data[i].examType = 'Supple';
                if (result.data[i].courseYearId === null){
                    result.data[i].courseYearId = courseYearId;

                    result.data[i].regulationName = result.data[i].regName;

                    if (this.courseYears.filter(x => (x.fromCourseYearId === courseYearId)).length > 0){
                      result.data[i].courseYearName = this.courseYears.filter(x => (x.fromCourseYearId === courseYearId))[0]?.fromCourseYearName;
                    }
                }
                result.data[i].Subject_name = result.data[i].subjectName;
                result.data[i].Subject_code = result.data[i].subjectCode;
                if (result.data[i].examresultCatCode === 'FAIL' || result.data[i].examresultCatCode === 'ABSENT'){
                    this.examCourseYearSubjetsList.push(result.data[i]);
                }
              }
              
              // tslint:disable-next-line: only-arrow-functions   tslint:disable-next-line: typedef
              this.examCourseYearSubjetsList = this.examCourseYearSubjetsList.map(function(obj) { 
                obj['credits'] = obj['creditPoints']; // Assign new key 
                delete obj['creditPoints']; // Delete old key 
                return obj; 
              });
              this.studentSubjects = this.examCourseYearSubjetsList;
              this.studentSubjects = this.studentSubjects.sort((a, b) =>
                a.subjAlreadyRegistered === b.subjAlreadyRegistered ? 0 : a.subjAlreadyRegistered ? 1 : -1
              );
              if(this.studentSubjects && this.studentSubjects.length > 0){
                      const isBridgeCourse = this.examDetailsList
                      .find(e => e.courseYearId === courseYearId)?.isBridgeCourse;
                      this.studentSubjects = this.studentSubjects.filter(
                      s => s.isBridgeCourse === isBridgeCourse
                      );
                      }
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

  /* ============ Edit exam semester subjects list =============*/
  editExamSubjectsList(data): void{
    this.examFeeCollectionForm.get('courseYearId').setValue(data.courseYearId);
    this.studentSubjects = [];
    this.studentSubjects = this.courseYearFee.filter(x => ( x.courseYearId === data.courseYearId))[0].subjects;
  }

   /*---------- View Subjects-----------*/
   viewCourseYearSubjectsListDialog(data, name): void {
    if (name === 'receipt'){
       data.subjects = data.examStudentDTOs[0].examStudentDetailDTOs;
    } 
    this.courseYearsubjectsList = [];
    const dialogRef = this.dialog.open(ViewSubjectsComponent, {
    width: '750px',
    data: data.subjects
    });
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

  deleteExamFeeAmount(item, i): void{
     this.totalReceiptAmt = this.totalReceiptAmt - item.examFeeAmount;
     item.examFeeAmount = 0;
  }

  deleteExamFeeReceipt(item): void{
    const dialogRef = this.dialog.open(DeleteExamReceiptComponent, {
      width: '650px',
      data: item
    });

    dialogRef.afterClosed().subscribe(details => {
      if (details.name === 'delete'){
        this.spinner.show();
        item.reason = details.reason;
        item.isActive = false; 
        this.examFeeReceiptDel = {};
        this.examFeeReceiptDel.chequeNo = item.chequeNo;
        this.examFeeReceiptDel.collegeId = item.collegeId;
        this.examFeeReceiptDel.courseYearId = item.courseYearId;
        this.examFeeReceiptDel.createdDt = item.createdDt;
        this.examFeeReceiptDel.ddno = item.ddno;
        this.examFeeReceiptDel.employeeId = item.employeeId;
        this.examFeeReceiptDel.examAddtFee = item.examAddtFee;
        this.examFeeReceiptDel.examFeeAddtIds = item.examFeeAddtIds;
        this.examFeeReceiptDel.examFeeAmount = item.examFeeAmount;
        this.examFeeReceiptDel.examFeeFineId = item.examFeeFineId;
        this.examFeeReceiptDel.examFineAmount = item.examFineAmount;
        this.examFeeReceiptDel.examFeeReceiptId = item.examFeeReceiptId;
        this.examFeeReceiptDel.examFeeStructureId = item.examFeeStructureId;
        this.examFeeReceiptDel.examId = item.examId;
        this.examFeeReceiptDel.examtypeCatId = item.examtypeCatId;
        this.examFeeReceiptDel.feeComments = item.feeComments;
        this.examFeeReceiptDel.feeReceiptNo = item.feeReceiptNo;
        this.examFeeReceiptDel.isActive = item.isActive;
        this.examFeeReceiptDel.otherPaymentNumber = item.otherPaymentNumber;
        this.examFeeReceiptDel.paymentModeCatId = item.paymentModeCatId;
        this.examFeeReceiptDel.reason = item.reason;
        this.examFeeReceiptDel.receiptDate = item.receiptDate;
        this.examFeeReceiptDel.referenceNumber = item.referenceNumber;
        this.examFeeReceiptDel.studentId = item.studentId;
        this.crudService.deleteWithName(this.examFeeReceiptUrl, item.examFeeReceiptId, 'examFeeReceiptId')
        .subscribe(result => {
            this.spinner.hide();
            if (result.success){
                  this.snotifyService.success(result.message, 'Success!');
                  this.getExamFeeReceipts(this.examFeeCollectionForm.value.studentId);
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

  payExamFees(): void{
    if (this.examFeeCollectionForm.valid){
      this.examFeeReceipt = [];
      let addFeeAmt = 0;
      // tslint:disable-next-line: prefer-for-of
      for (let i = 0; i < this.courseYearFee.length; i++){
       if (this.examFeeTypes.filter(x => (x.generalDetailCode === this.courseYearFee[i].examType)).length > 0){
         this.courseYearFee[i].examtypeCatId = this.examFeeTypes.filter(x => (x.generalDetailCode === this.courseYearFee[i].examType))[0].generalDetailId;
       } 
       this.addTFee = [];
       if (this.examsList.filter(x => (x.examId === this.examFeeCollectionForm.value.examId)).length > 0){
         this.examName = this.examsList.filter(x => (x.examId === this.examFeeCollectionForm.value.examId))[0].examName;
         this.examFromDate = this.examsList.filter(x => (x.examId === this.examFeeCollectionForm.value.examId))[0].fromDate;
         this.examToDate = this.examsList.filter(x => (x.examId === this.examFeeCollectionForm.value.examId))[0].toDate;
       } 

                        // tslint:disable-next-line: prefer-for-of
       for (let n = 0; n < this.courseYearFee[i].examAdditionalFeeReceiptDTOs.length; n++){
           if (this.courseYearFee[i].examAdditionalFeeReceiptDTOs[n].fee > 0){
            this.courseYearFee[i].examAdditionalFeeReceiptDTOs[n].collegeId = this.student.collegeId;
            // this.courseYearFee[i].examAdditionalFeeReceiptDTOs[n].feeAddtId = this.student.collegeId;
            this.courseYearFee[i].examAdditionalFeeReceiptDTOs[n].addtFeeAmount = this.courseYearFee[i].examAdditionalFeeReceiptDTOs[n].fee;
            this.courseYearFee[i].examAdditionalFeeReceiptDTOs[n].isActive = true;
            this.courseYearFee[i].examAdditionalFeeReceiptDTOs[n].addtExamFeeTypeCatId = this.courseYearFee[i].examAdditionalFeeReceiptDTOs[n].adtExamfeetypeCatId;
            this.courseYearFee[i].examAdditionalFeeReceiptDTOs[n].collectedEmpId = +localStorage.getItem('employeeId');
            this.courseYearFee[i].examAdditionalFeeReceiptDTOs[n].addtReceiptDate = this.examFeeCollectionForm.value.receiptDate;
            if(this.courseYearFee[i].examAdditionalFeeReceiptDTOs[n].applyToAll==true){
              addFeeAmt = addFeeAmt + this.courseYearFee[i].examAdditionalFeeReceiptDTOs[n].fee;
            }
            else{
              addFeeAmt=0;
            }
            this.addTFee.push(this.courseYearFee[i].examAdditionalFeeReceiptDTOs[n]);
           }
       }
 
       this.examFeeReceipt.push({
         chequeNo : this.examFeeCollectionForm.value.chequeNo,
         ddno : this.examFeeCollectionForm.value.ddno,
         examFeeAmount : this.courseYearFee[i].examFeeAmount,
         examFineAmount: this.courseYearFee[i].examFineAmount,
         examAddtFee: addFeeAmt,
         examTotalAmount: this.courseYearFee[i].examFeeAmount + this.courseYearFee[i].examFineAmount + addFeeAmt,
         collegeCode: this.courseYearFee[i].collegeCode,
         examName: this.examName,
         courseName: this.courseYearFee[i].courseName,
         courseYearName: this.courseYearFee[i].courseYearName,
         examType: this.courseYearFee[i].examType,
         examFromDate: this.examFromDate,
         examToDate: this.examToDate,
         courseGroupName: this.student.groupCode,
         academicYear: this.courseYearFee[i].academicYear,
         studentName: this.student.firstName,
         rollno: this.student.hallticketNumber,
         feeComments : this.examFeeCollectionForm.value.feeComments,
         employeeId : +localStorage.getItem('employeeId'),
         collegeId : this.student.collegeId,
         courseYearId : this.courseYearFee[i].courseYearId,
         examFeeFineId : this.examFeeFineId,
         examFeeStructureId : this.courseYearFee[i].examFeeStructureId,
         examId : this.examFeeCollectionForm.value.examId,
         examtypeCatId : this.courseYearFee[i].examtypeCatId,
         paymentModeCatId : this.examFeeCollectionForm.value.paymentModeCatId,
         studentId : this.examFeeCollectionForm.value.studentId,
         isActive : true,
         otherPaymentNumber : this.examFeeCollectionForm.value.otherPaymentNumber,
         receiptDate : this.examFeeCollectionForm.value.receiptDate,
         referenceNumber : this.examFeeCollectionForm.value.referenceNumber,
         transactionNo : this.examFeeCollectionForm.value.transactionNo,
         examAdditionalFeeReceiptDTOs: this.addTFee,
         examStudentDTOs: [{
               feeComments : this.examFeeCollectionForm.value.feeComments,
               collegeId : this.student.collegeId,
               courseYearId : this.courseYearFee[i].courseYearId,
               examFeeAmount : this.courseYearFee[i].examFeeAmount,
               examtypeCatId : this.courseYearFee[i].examtypeCatId,
               regulationId: this.student.regulationId,
               studentId : this.examFeeCollectionForm.value.studentId,
               isActive : true,
               isFeePaid : true,
               registrationDate : this.examFeeCollectionForm.value.receiptDate,
               examId : this.examFeeCollectionForm.value.examId,
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
                          this.getExamFeeReceipts(this.examFeeCollectionForm.value.studentId);
                          this.clear();
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

  print(details): void{
    if (details != null && details !== ''){
      /*---------- Print call  ----------*/
      // Xhr creates new context so we need to create reference to this
      const self = this;

      // Status flag used in the template.
      this.pending = true;

      // Create the Xhr request object
      const xhr = new XMLHttpRequest();
      xhr.open('GET', this.endURL + this.studentExamFeeReceiptDownloadUrl + '?' + 'examFeeReceiptId=' + details.examFeeReceiptId, true);
      xhr.setRequestHeader('Authorization', 'Bearer ' + localStorage.getItem('token'));
      xhr.responseType = 'blob';
      // Xhr callback when we get a result back
      // We are not using arrow function because we need the 'this' context
      // tslint:disable-next-line:typedef
      xhr.onreadystatechange = function() {

          // We use setTimeout to trigger change detection in Zones
          setTimeout( () => { self.pending = false; }, 0);

          if (xhr.readyState === 4 && xhr.status === 200) {
              const blob = new Blob([this.response], {type: 'application/pdf'});
              // FileSaver.saveAs(blob, 'Report.pdf');
              
              const blobUrl = URL.createObjectURL(blob);
              const iframe = document.createElement('iframe');
              iframe.style.display = 'none';
              iframe.src = blobUrl;
              document.body.appendChild(iframe);
              iframe.contentWindow.print();
          }
      };

      // Start the Ajax request
      xhr.send();
  }
  }
  printreceipt(data){
    this.router.navigate(['admin-examination-management/admin-pre-examinations/exam-fee-collection/print-examfee-receipt'])
    this.parameterservice.Studentexamfeereceipt = data
} 
printForm(data){
  this.router.navigate(['admin-examination-management/admin-pre-examinations/exam-fee-collection/print-examform'])
  this.parameterservice.Studentexamfeereceipt = data
} 
  clear(): void{
    this.courseYearFee = [];
    this.selectedSubjects = [];
    this.studentSubjects = [];
    this.examFeeStructure = [];
    this.selectedCount = 0;
    this.examFeeCollectionForm.get('courseYearId').setValue('');
    this.examFeeCollectionForm.get('chequeNo').setValue('');
    this.examFeeCollectionForm.get('referenceNumber').setValue('');
    this.examFeeCollectionForm.get('otherPaymentNumber').setValue('');
    this.examFeeCollectionForm.get('transactionNo').setValue('');
    this.examFeeCollectionForm.get('feeComments').setValue('');
    this.totalReceiptAmt = 0;
  }
 // tslint:disable-next-line:typedef
 isEmptyObject(obj) {
  return (obj && (Object.keys(obj).length === 0));
}
}
