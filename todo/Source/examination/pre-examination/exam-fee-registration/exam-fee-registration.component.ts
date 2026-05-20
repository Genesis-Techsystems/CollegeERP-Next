import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormControl } from '@angular/forms';
import { SnotifyService } from 'ng-snotify';
import { CrudService } from 'app/main/services/crud.service';
import { NgxSpinnerService } from 'ngx-spinner';
import { Router, ActivatedRoute } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { GenericFunctions } from 'app/main/common/generic-functions';
import { CONSTANTS } from 'app/main/common/constants';
import { fuseAnimations } from '@fuse/animations';
import { Subject, ReplaySubject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ViewSubjectsComponent } from '../view-subjects/view-subjects.component';
import { ViewTransactionsComponent } from './view-transactions/view-transactions.component';
import { GeneralDetail } from 'app/main/models/generalDetail';

@Component({
  selector: 'app-exam-fee-registration',
  templateUrl: './exam-fee-registration.component.html',
  styleUrls: ['./exam-fee-registration.component.scss'],
  animations : fuseAnimations
})

export class ExamFeeRegistrationComponent implements OnInit {

  private studentSearchUrl = CONSTANTS.studentSearchUrl;
  private examStudentRegistrationCrudUrl = CONSTANTS.examStudentRegistrationCrudUrl;
  private examMasterUrl = CONSTANTS.examMasterUrl;
  private getDetailsByCollegeIdUrl = CONSTANTS.getDetailsByCollegeIdUrl;
  private getDetailsByCourseIdUrl = CONSTANTS.getDetailsByCourseIdUrl;
  private isActive = CONSTANTS.isActive;
  private examStdTxnUploadUrl = CONSTANTS.examStdTxnUploadUrl;
  private examStudentRegPaymentUrl = CONSTANTS.examStudentRegPaymentUrl;
  private generalDetailsUrl = CONSTANTS.generalDetailsUrl;
  private generalDetailsByCodeUrl = CONSTANTS.generalDetailsByCodeUrl;
  private examPayStatus = CONSTANTS.examPayStatus;

  selectedStd = [];
  student: any = {};
  feeRegistrations: any[] = [];
  searchStudents: any[] = [];
  studentFirstName;
  examFeeCollectionForm: FormGroup;
  examsList = [];
  searchExams = [];
  flag = false;
  params: any = {};
  isUpload = false;
  examPays = [];
  examPayStatuses: GeneralDetail[] = [];
  public formData;

  public examFilterCtrl: FormControl = new FormControl();
  private _onDestroy = new Subject<void>();
  public filteredExams: ReplaySubject<any[]> = new ReplaySubject<any[]>(1);

  constructor(private formBuilder: FormBuilder, private snotifyService: SnotifyService,
              private crudService: CrudService, private spinner: NgxSpinnerService, private router: Router, 
              private dialog: MatDialog, private genericFunctions: GenericFunctions, private route: ActivatedRoute) {        
    this.generalDetails();
  }

  ngOnInit(): void {

    this.examFeeCollectionForm = this.formBuilder.group({
      examId: ['', Validators.required]
    });

    this.examFilterCtrl.valueChanges
      .pipe(takeUntil(this._onDestroy))
      .subscribe(() => {
        this.filterExam();
    });

    this.route.queryParams
    .subscribe(params => {
        this.params = params;
    });

    this.searchExams.push({examName: 'Search by Exam name.'});
    this.filteredExams.next(this.searchExams.slice());

    if (localStorage.getItem('rollNumber') != null){
        this.enteredStudent(localStorage.getItem('rollNumber'));
    }

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

 enteredStudent(event): void{
    /*----------- STUDENTS -----------*/
    this.spinner.show();
    this.crudService.listByTwoIds(this.studentSearchUrl, 'true', event, 
       'isActive', 'q')
    .subscribe(result => {
        this.spinner.hide();
        if (result.statusCode === 200){
                if (result.data && result.data !== '') {   
                  this.searchStudents = result.data;
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

 generalDetails(): void{
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
 }

 selectedStudent(studentId): void{
  this.feeRegistrations = [];
  if (studentId != null){
    this.selectedStd = [];
    if (this.searchStudents.filter(x => (x.studentId === studentId)).length > 0){
        this.selectedStd.push(this.searchStudents.filter(x => (x.studentId === studentId))[0]);
        this.student = this.selectedStd[0];
        this.student.studentPhotoPath = this.student.studentPhotoPath + '?' + new Date().getTime();
        this.studentFirstName = this.student.firstName + ' ( ' + this.student.rollNumber + ' )';
        this.getExamsList();
     }
  }  
 }

 getExamsList(): void{
    this.examFeeCollectionForm.get('examId').setValue('');
    this.examsList = [];
    this.feeRegistrations = [];
    this.searchExams = [];
    this.searchExams.push({examName: 'Search by Exam name.'});
    this.filteredExams.next(this.searchExams.slice()); 
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
            this.searchExams = this.examsList;
            this.filteredExams.next(this.searchExams.slice()); 
            if (!this.isEmptyObject(this.params)){
               this.examFeeCollectionForm.get('examId').setValue(+this.params.examId);
               this.selectedExternalExam(this.params.examId);
            }   
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
    this.feeRegistrations = [];
    this.flag = true;
    if (this.selectedStd.length > 0){
      this.getExamFeeRegistrations(this.student.studentId, examId);
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
          details.regPaymentStatusCatId = this.examPayStatuses.filter(x => (x.generalDetailCode === 'PAYMENT PAID'))[0].generalDetailId;
                       
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
                                this.getExamFeeRegistrations(this.student.studentId, this.examFeeCollectionForm.value.examId);
                                
                              }
                          }else {
                              this.getExamFeeRegistrations(this.student.studentId, this.examFeeCollectionForm.value.examId);
                              
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
                        this.getExamFeeRegistrations(this.student.studentId, this.examFeeCollectionForm.value.examId);
                        this.snotifyService.success(result.message, 'Success!');
                      
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

 goToPayment(): void{
    this.router.navigate(['/examination-management/pre-examination/exam-fee-registration/exam-fee-payment'], { queryParams: 
      { 
        examId: this.examFeeCollectionForm.value.examId,
        examName: this.examsList.filter(x => (x.examId === this.examFeeCollectionForm.value.examId))[0].examName,
        fromDate: this.examsList.filter(x => (x.examId === this.examFeeCollectionForm.value.examId))[0].fromDate,
        toDate: this.examsList.filter(x => (x.examId === this.examFeeCollectionForm.value.examId))[0].toDate,
        isInternalExam: this.examsList.filter(x => (x.examId === this.examFeeCollectionForm.value.examId))[0].isInternalExam,
        isRegularExam: this.examsList.filter(x => (x.examId === this.examFeeCollectionForm.value.examId))[0].isRegularExam,
        isSupplyExam: this.examsList.filter(x => (x.examId === this.examFeeCollectionForm.value.examId))[0].isSupplyExam
    } });
 }

 // tslint:disable-next-line:typedef
 isEmptyObject(obj) {
  return (obj && (Object.keys(obj).length === 0));
 }

}
