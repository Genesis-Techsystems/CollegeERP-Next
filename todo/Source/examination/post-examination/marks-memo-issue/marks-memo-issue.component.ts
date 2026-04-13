import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { CONSTANTS } from 'app/main/common/constants';
import { FormGroup, FormControl, FormBuilder, Validators } from '@angular/forms';
import { ExamMaster } from 'app/main/models/examMaster';
import { Subject, ReplaySubject } from 'rxjs';
import { SnotifyService } from 'ng-snotify';
import { CrudService } from 'app/main/services/crud.service';
import { NgxSpinnerService } from 'ngx-spinner';
import { Router, ActivatedRoute } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { GenericFunctions } from 'app/main/common/generic-functions';
import { takeUntil } from 'rxjs/operators';
import { fuseAnimations } from '@fuse/animations';

@Component({
  selector: 'app-marks-memo-issue',
  templateUrl: './marks-memo-issue.component.html',
  styleUrls: ['./marks-memo-issue.component.scss'],
  animations : fuseAnimations
})

export class MarksMemoIssueComponent implements OnInit {

  private examMarksMemoUrl = CONSTANTS.examMarksMemoUrl;
  private examMemoMasterCrudUrl = CONSTANTS.examMemoMasterCrudUrl;
  private studentSearchUrl = CONSTANTS.studentSearchUrl;
  private collegeCertificateUrl = CONSTANTS.CollegeCertificateUrl;
  private isActive = CONSTANTS.isActive;
  private examStudentCrudUrl = CONSTANTS.examStudentCrudUrl;
  private generalDetailsUrl = CONSTANTS.generalDetailsUrl;
  private generalDetailsByCodeUrl = CONSTANTS.generalDetailsByCodeUrl;
  private examResult = CONSTANTS.examResult;
  private feeCertificateIssueCrudUrl = CONSTANTS.feeCertificateIssueCrudUrl;
  private certificateIssueStatus = CONSTANTS.certificateIssueStatus;
  private feeCertificateIssueUrl = CONSTANTS.feeCertificateIssueUrl;
  private endURL = CONSTANTS.MAINAPI;
  private examMarksMemoDownloadUrl = CONSTANTS.examMarksMemoDownloadUrl;

  examFeeCollectionForm: FormGroup;
  examsList: ExamMaster[] = [];
  searchStudents = [];
  selectedStd = [];
  student: any = {};
  examFeeReceipt: any[] = [];
  examReceipts: any[] = [];
  studentFirstName;
  flag = false;
  exam: any = {};
  courseYears: any[] = [];
  studentMarksMemo: any = {};
  memo: any[] = [];
  examResultTypes = [];
  collegeCertificate = [];
  isPrint = false;
  certificateIssueStatuses: any[] = [];
  issueMemo: any = {};
  feeCertificateIssue: any[] = [];
  pending: boolean;
  examData = [];

  dataSecStaff;
  dataSECPrincipal;
  
  public studentFilterCtrl: FormControl = new FormControl();
  private _onDestroy = new Subject<void>();
  public filteredStudents: ReplaySubject<any[]> = new ReplaySubject<any[]>(1);
    studentid: any;
    examid: any;
    courseyearid: any;
    pageparams: any;

  constructor(private formBuilder: FormBuilder, private snotifyService: SnotifyService,
              private crudService: CrudService, private spinner: NgxSpinnerService, private router: Router, 
              private dialog: MatDialog, private genericFunctions: GenericFunctions, private route: ActivatedRoute) {  
                  
                this.dataSecStaff = this.genericFunctions.dataSecurityLevel();
                this.dataSECPrincipal = this.genericFunctions.dataSecurityLevelPrincipal();
  }

  ngOnInit(): void {
    this.examFeeCollectionForm = this.formBuilder.group({
      examId: ['', Validators.required],
      studentId: ['', Validators.required],
      courseYearId: ['', Validators.required],
      memoNo: ['', Validators.required],
      memoSerialNo: ['', Validators.required],
      memoDate: [this.genericFunctions.moment(), Validators.required],
      dateOfIssue: [this.genericFunctions.moment(), Validators.required],
    });
    this.route.queryParams.subscribe(params => {
        // this.studentid = params['studentId'];
        this.pageparams = params
        // this.examid = params['examId'];
        // this.courseyearid = params['courseYearId'];
        // console.log(this.studentid,"studentid12345");
        
        // this.examFeeCollectionForm.get('studentId').setValue(this.pageparams.studentId)
        // this.getGeneralDetails();
      });

    this.studentFilterCtrl.valueChanges
    .pipe(takeUntil(this._onDestroy))
    .subscribe(() => {
      this.filterStd();
    });

    this.getGeneralDetails();

    this.searchStudents.push({firstName: 'Search by student name or rollno.'});
    this.filteredStudents.next(this.searchStudents.slice());
    


  }
 

   // tslint:disable-next-line: use-lifecycle-interface
   ngOnDestroy(): void {
    this._onDestroy.next();
    this._onDestroy.complete();
  }

  getGeneralDetails(): void{
    /*----------- EXAM RESULT TYPES -----------*/
    this.crudService.listDetailsByTwoIds(this.generalDetailsUrl, this.examResult, 'true', this.generalDetailsByCodeUrl, this.isActive)
    .subscribe(result => {
        if (result.statusCode === 200){
                    if (result.data.resultList && result.data.resultList !== '') {
                        this.examResultTypes = result.data.resultList;
        //                 if(!this.isEmptyObject(this.pageparams)){
                        
        // this.examFeeCollectionForm.get('studentId').setValue(this.pageparams.studentId)
        //                 }

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

    /*----------- CERTIFICATE ISSUE -----------*/
    // tslint:disable-next-line:max-line-length
    this.crudService.listDetailsByTwoIds(this.generalDetailsUrl, this.certificateIssueStatus , 'true', this.generalDetailsByCodeUrl, this.isActive)
    .subscribe(result => {
        if (result.statusCode === 200){
                  if (result.data.resultList && result.data.resultList !== '') {
                      this.certificateIssueStatuses = result.data.resultList;
                     
                  } else {
                      // this.snotifyService.success(result.message, 'Success!');
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

enteredStudent(event): void{
    if (this.dataSECPrincipal) {
        if (event.target.value.length > 4){
            /*----------- STUDENTS -----------*/
            this.crudService.listByTwoIds(this.studentSearchUrl, +localStorage.getItem('collegeId'), 
                event.target.value, 'collegeId', 'q')
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
    } else 
    if (this.dataSecStaff && localStorage.getItem('isAdmin') === 'false'){
        if ( event.target.value.length > 4){
            /*----------- STUDENTS -----------*/
            this.crudService.listByThreeIds(this.studentSearchUrl, +localStorage.getItem('collegeId'), +localStorage.getItem('courseGroupId'), 
                event.target.value, 'collegeId', 'courseGroupId', 'q')
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
    }
    else{
        if ( event.target.value.length > 4){
            /*----------- STUDENTS -----------*/
            this.crudService.listByIds(this.studentSearchUrl,  
                event.target.value, 'q')
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
    }
}

selectedStudent(studentId): void{
  this.memo = [];
  this.feeCertificateIssue = [];
  this.isPrint = false;
  if(this.isEmptyObject(this.pageparams)){
  this.examFeeCollectionForm.get('examId').setValue('');
  }
  this.examFeeCollectionForm.get('courseYearId').setValue('');
  if (studentId != null && studentId !== '' && studentId !== 'undefined'){
    this.selectedStd = [];
    if (this.searchStudents.filter(x => (x.studentId === studentId)).length > 0){
        this.selectedStd.push(this.searchStudents.filter(x => (x.studentId === studentId))[0]);
        this.student = this.selectedStd[0];
        if (this.student.studentPhotoPath === null){
          this.student.studentPhotoPath = 'assets/images/avatars/default_Student.png';
        }
        this.student.studentPhotoPath = this.student.studentPhotoPath + '?' + new Date().getTime();
        this.studentFirstName = this.student.firstName + ' ( ' + this.student.rollNumber + ' )';
        if(!this.isEmptyObject(this.pageparams)){
            this.examFeeCollectionForm.get('examId').setValue(this.pageparams.examId)

        }
        this.getStudentExams();
        this.getCollegeCertificates(this.student.collegeId);
     }
  }  
}

getStudentExams(): void{
    if(this.isEmptyObject(this.pageparams)){
  this.examFeeCollectionForm.get('examId').setValue('');
    }
  this.examFeeCollectionForm.get('courseYearId').setValue('');
  this.examsList = [];
  this.memo = [];
  this.feeCertificateIssue = [];
  /*----------- Exams List -----------*/      
  this.crudService.listDetailsByTwoIdsWithSort(this.examStudentCrudUrl, this.student.studentId, 'true', 'DESC',
  'studentDetail.studentId' , this.isActive, 'createdDt')
  .subscribe(result => {
  this.spinner.hide();
  if (result.statusCode === 200){
        if (result.success) {
            this.examsList = [];
            // tslint:disable-next-line: prefer-for-of
            for (let i = 0; i < result.data.resultList.length; i++){
              if (!result.data.resultList[i].isInternalExam){
                  this.examsList.push(result.data.resultList[i]);
                  this.examData.push(result.data.resultList[i]);
                  if(!this.isEmptyObject(this.pageparams)){
                        
                    this.examFeeCollectionForm.get('examId').setValue(this.pageparams.examId)
                                    }
              }
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
searchExam(value) {
    this.examData = [];
    this.examSearch(value);
  }
  examSearch(value: string) {
    let filter = value.toLowerCase()
    for (let i = 0; i < this.examsList.length; i++) {
        let option = this.examsList[i];
        if (option.examName.toLowerCase().indexOf(filter) >= 0) {
            this.examData.push(option);
        }
    }
  }
getCollegeCertificates(collegeId): void{
     /*---------- COLLEGE CERTIFICATE ----------*/
     this.crudService.listDetailsByThreeIds(this.collegeCertificateUrl, 'MARKSMEMO', 'true', collegeId, 'certifcateCode', 'isActive', 'College.collegeId')
     .subscribe(result => {
         this.getGeneralDetails();
         if (result.statusCode === 200){
                 if (result.success) {  
                     this.collegeCertificate = result.data.resultList;
                 }
             }else{
                // this.snotifyService.error(result.message, 'Error!');
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

selectedExternalExam(examId): void{
  this.courseYears = [];
  this.isPrint = false;
  this.memo = [];
  this.feeCertificateIssue = [];
  this.examFeeCollectionForm.get('courseYearId').setValue('');
  if (this.examsList.filter(x => (x.examId === examId)).length > 0){
      this.courseYears.push(this.examsList.filter(x => (x.examId === examId))[0]);
  }
}

selectedYear(examId): void{
  this.memo = [];
  this.feeCertificateIssue = [];
  this.isPrint = false;
  if (this.selectedStd.length > 0){
   // this.getExamFeeReceipts(this.student.studentId);
    this.getMemo(this.student.studentId, examId);
  }
  if (this.examsList.filter(x => (x.examId === examId)).length > 0){
     this.exam = this.examsList.filter(x => (x.examId === examId))[0];
  }
}

getMemo(studentId, examId): void{
  this.flag = true;
  this.feeCertificateIssue = [];
  this.isPrint = false;
  this.crudService.listDetailsByThreeIds(this.examMemoMasterCrudUrl, studentId, examId, this.examFeeCollectionForm.value.courseYearId, 
    'studentDetail.studentId', 'examMaster.examId', 'courseYear.courseYearId')
        .subscribe(result => {
            this.spinner.hide();
            if (result.statusCode === 200) {
                if (result.data.resultList && result.data.resultList !== '') {
                    this.memo = result.data.resultList;
                    if (this.memo.length > 0){
                        this.examFeeCollectionForm.get('memoNo').setValue(this.memo[0].memoNo);
                        this.examFeeCollectionForm.get('memoSerialNo').setValue(this.memo[0].memoSerialNo);
                        this.examFeeCollectionForm.get('memoDate').setValue(this.genericFunctions.momentWithDate(this.memo[0].memoDate));
                        this.examFeeCollectionForm.get('dateOfIssue').setValue(this.memo[0].dateOfIssue);

                        // tslint:disable-next-line: prefer-for-of
                        for (let i = 0; i < this.memo[0].examStudentMemoSubjectDTO.length; i++){
                            if (this.memo[0].examStudentMemoSubjectDTO[i].internalMarks === null || this.memo[0].examStudentMemoSubjectDTO[i].externalMarks === null){
                                this.memo[0].examStudentMemoSubjectDTO[i].totalMarks = '-';
                            }else{
                               // tslint:disable-next-line:max-line-length
                               this.memo[0].examStudentMemoSubjectDTO[i].totalMarks = this.memo[0].examStudentMemoSubjectDTO[i].internalMarks + this.memo[0].examStudentMemoSubjectDTO[i].externalMarks;
                            }
                        }
                        
                        if (this.memo[0].memoSerialNo != null){
                          this.getCerticateIssues(this.memo[0].memoSerialNo, studentId);
                        }
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

getCerticateIssues(memoSerialNo, studentId): void{
    if (this.collegeCertificate.length > 0){
      /*----------- FEE CERTIFICATE ISSUE -----------*/
     this.crudService.listDetailsByThreeIds(this.feeCertificateIssueUrl, studentId, this.collegeCertificate[0].collegeCertificateId, memoSerialNo, 'studentDetail.studentId', 
     'CollegeCertificate.collegeCertificateId', 'certificateNumber')
     .subscribe(result => {
         this.spinner.hide();
         if (result.statusCode === 200){
             if (result.success) {
                 this.feeCertificateIssue = result.data.resultList;
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

 updateMemo(): void{
    if (this.examFeeCollectionForm.valid){
        this.spinner.show();
        this.studentMarksMemo = {};
        if (this.memo.length > 0){
           this.memo[0].memoNo = this.examFeeCollectionForm.value.memoNo;
           this.memo[0].memoSerialNo = this.examFeeCollectionForm.value.memoSerialNo;
           this.memo[0].memoDate = this.examFeeCollectionForm.value.memoDate;
           this.memo[0].dateOfIssue = this.examFeeCollectionForm.value.dateOfIssue;
        
           this.crudService.add(this.examMarksMemoUrl, this.memo[0])
              .subscribe(result => {
                  this.spinner.hide();
                  if (result.success){
                        this.snotifyService.success(result.message, 'Success!');
                        this.getMemo(this.student.studentId, this.examFeeCollectionForm.value.examId);
                  }else {
                      this.snotifyService.info(result.message, 'Info!');
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

  issue(): void{
     this.isPrint = true;
     this.issueMemo = {};
     if (this.collegeCertificate.length > 0){
        this.spinner.show();
        if (this.certificateIssueStatuses.filter(x => (x.generalDetailCode === 'TCISSUED')).length > 0){
            this.issueMemo.applicationStatusId = this.certificateIssueStatuses.filter(x => (x.generalDetailCode === 'TCISSUED'))[0].generalDetailId;
        } else{
            this.issueMemo.applicationStatusId = null;
        }
        this.issueMemo.academicYearId = this.student.academicYearId;
        this.issueMemo.applicationComments = null;
        this.issueMemo.appliedOn = this.genericFunctions.moment();
        this.issueMemo.certificateFor = 'Marks Memo';
        this.issueMemo.certificateForValue = null;
        this.issueMemo.certificateNumber = this.memo[0].memoSerialNo;
        this.issueMemo.collegeCertificateId = this.collegeCertificate[0].collegeCertificateId;
        this.issueMemo.collegeId = this.student.collegeId;
        this.issueMemo.conduct = null;
        this.issueMemo.isActive = true;
        this.issueMemo.isApproved = true;
        this.issueMemo.issuedOn = this.genericFunctions.moment();
        this.issueMemo.studentId = this.student.studentId;
   
             /*---------- ADD  ----------*/
        this.crudService.addDetails(this.feeCertificateIssueCrudUrl, this.issueMemo)
             .subscribe(result => {
                 this.spinner.hide();
                 if (result.statusCode === 200){
                     if (result.data && result.data !== '') {
                         this.snotifyService.success(result.message, 'Success!');
                         this.getCerticateIssues(this.memo[0].memoSerialNo, this.student.studentId);
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

  print(): void{
        /*---------- Print call  ----------*/
        // Xhr creates new context so we need to create reference to this
        const self = this;

        // Status flag used in the template.
        this.pending = true;

        // Create the Xhr request object
        const xhr = new XMLHttpRequest();
        xhr.open('GET', this.endURL + this.examMarksMemoDownloadUrl + '?examId=' + this.examFeeCollectionForm.value.examId + 
        '&studentId=' + this.examFeeCollectionForm.value.studentId + '&courseYearId=' + this.examFeeCollectionForm.value.courseYearId, true);
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

 // tslint:disable-next-line:typedef
 isEmptyObject(obj) {
  return (obj && (Object.keys(obj).length === 0));
 }
 printmemo(){
    this.router.navigate(['admin-examination-management/admin-post-examination/marks-memo-issue/memo-print'],
    {queryParams:{
        data:JSON.stringify(this.memo)
    }});
    
 }

}
