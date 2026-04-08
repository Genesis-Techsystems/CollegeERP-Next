import { Component, OnInit } from '@angular/core';
import { CONSTANTS } from 'app/main/common/constants';
import { FormGroup, FormControl, FormBuilder, Validators } from '@angular/forms';
import { Subject, ReplaySubject } from 'rxjs';
import { SnotifyService } from 'ng-snotify';
import { CrudService } from 'app/main/services/crud.service';
import { NgxSpinnerService } from 'ngx-spinner';
import { Router, ActivatedRoute } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { GenericFunctions } from 'app/main/common/generic-functions';
import { takeUntil } from 'rxjs/operators';
import { ViewSubjectsComponent } from '../view-subjects/view-subjects.component';
import { fuseAnimations } from '@fuse/animations';
import { AddAdditionalFeeComponent } from './add-additional-fee/add-additional-fee.component';

@Component({
  selector: 'app-additional-exam-fees',
  templateUrl: './additional-exam-fees.component.html',
  styleUrls: ['./additional-exam-fees.component.scss'],
  animations : fuseAnimations
})

export class AdditionalExamFeesComponent implements OnInit {

  private studentSearchUrl = CONSTANTS.studentSearchUrl;
  private examFeeReceiptCrudUrl = CONSTANTS.examFeeReceiptCrudUrl;
  private academicYearCrudUrl = CONSTANTS.academicYearCrudUrl;
  private getDetailsByCollegeIdUrl = CONSTANTS.getDetailsByCollegeIdUrl;
  private isActive = CONSTANTS.isActive;
  private examMasterUrl = CONSTANTS.examMasterUrl;
  private getDetailsByAcademicYearIdUrl = CONSTANTS.getDetailsByAcademicYearIdUrl;
  private getDetailsByCourseIdUrl = CONSTANTS.getDetailsByCourseIdUrl;
  private examFeeReceiptUrl = CONSTANTS.examFeeReceiptUrl;
  private revaluationUrl = CONSTANTS.revaluationUrl;

  examFeeCollectionForm: FormGroup;
  searchStudents = [];
  selectedStd = [];
  student: any = {};
  studentFirstName;
  examFeeReceipt: any[] = [];
  feeReceipts: any[] = [];
  flag = false;
  pending: boolean;
  academicYears: any[] = [];
  examsList: any[] = [];
  examDuplicateList = [];
  
  public studentFilterCtrl: FormControl = new FormControl();
  private _onDestroy = new Subject<void>();
  public filteredStudents: ReplaySubject<any[]> = new ReplaySubject<any[]>(1);

  constructor(private formBuilder: FormBuilder, private snotifyService: SnotifyService,
              private crudService: CrudService, private spinner: NgxSpinnerService, private router: Router, 
              private dialog: MatDialog, private genericFunctions: GenericFunctions, private route: ActivatedRoute) {        
 
  }

  ngOnInit(): void {
    this.examFeeCollectionForm = this.formBuilder.group({
      studentId: ['', Validators.required],
      academicYearId: ['', Validators.required],
      examId: ['', Validators.required],
    });

    this.studentFilterCtrl.valueChanges
    .pipe(takeUntil(this._onDestroy))
    .subscribe(() => {
      this.filterStd();
    });

    this.searchStudents.push({firstName: 'Search by student name or rollno.'});
    this.filteredStudents.next(this.searchStudents.slice());

  }

   // tslint:disable-next-line: use-lifecycle-interface
   ngOnDestroy(): void {
    this._onDestroy.next();
    this._onDestroy.complete();
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
}

selectedStudent(studentId): void{
  this.feeReceipts = [];
  if (studentId != null && studentId !== '' && studentId !== 'undefined'){
    this.selectedStd = [];
    this.flag = false;
    if (this.searchStudents.filter(x => (x.studentId === studentId)).length > 0){
        this.selectedStd.push(this.searchStudents.filter(x => (x.studentId === studentId))[0]);
        this.student = this.selectedStd[0];
        this.student.studentPhotoPath = this.student.studentPhotoPath + '?' + new Date().getTime();
        this.studentFirstName = this.student.firstName + ' ( ' + this.student.rollNumber + ' )';
        this.selectedCollege(this.student.collegeId);
     }
  }  
}

selectedCollege(collegeId): void{
  this.examFeeCollectionForm.get('academicYearId').setValue('');
  this.examFeeCollectionForm.get('examId').setValue('');
  this.academicYears = []; 
  /*----------- ACADEMIC YEARS -----------*/
  if (collegeId != null && collegeId !== undefined ){
//  this.crudService.listDetailsByTwoIdsWithSort(this.academicYearCrudUrl, collegeId, 'true', 'DESC', this.getDetailsByCollegeIdUrl, this.isActive, 'fromDate')
this.crudService.listDetailsByTwoIdsWithSort(this.academicYearCrudUrl, collegeId, 'true', 'DESC', this.getDetailsByCollegeIdUrl, this.isActive, 'fromDate')
 .subscribe(result => {
      if (result.statusCode === 200) {
          if (result.data.resultList && result.data.resultList !== '') {
              this.academicYears = result.data.resultList;
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
}

selectedAcademicYear(academicYearId): void{
  this.examFeeCollectionForm.get('examId').setValue('');
  this.examsList = [];
  this.examDuplicateList = [];
  this.feeReceipts = [];
  if (academicYearId !== null && academicYearId !== undefined){
  /*----------- Exams List -----------*/      
  // tslint:disable-next-line:max-line-length
  this.crudService.listDetailsByFourIdsWithSortOrder(this.examMasterUrl, this.student.collegeId, academicYearId, this.student.courseId, 'true',
   'DESC', this.getDetailsByCollegeIdUrl , this.getDetailsByAcademicYearIdUrl, this.getDetailsByCourseIdUrl, 'isActive', 'createdDt')
    .subscribe(result => {
    this.spinner.hide();
    if (result.statusCode === 200){
        if (result.success) {
            this.examsList = [];
            // tslint:disable-next-line: prefer-for-of
            for (let i = 0; i < result.data.resultList.length; i++){
              if (!result.data.resultList[i].isInternalExam){
                  this.examsList.push(result.data.resultList[i]);
                  this.examDuplicateList.push(result.data.resultList[i]);

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
}
searchExam(value) {
  this.examDuplicateList = []
  this.searchExamList(value);
}
searchExamList(value: string) {
  let filter = value.toLowerCase();
  for (let i = 0; i < this.examsList.length; i++) {
    let option = this.examsList[i];
    if (option.examName.toLowerCase().indexOf(filter) >= 0) {
      this.examDuplicateList.push(option);
    }
  }
}
selectedExam(examId): void{
  this.flag = true;
  this.feeReceipts = [];
  this.getExamFeeReceipts(this.student.studentId);
}

getExamFeeReceipts(studentId): void{
  /*------------- FEE RECEIPTS ------------*/  
  this.crudService.listDetailsByThreeIds(this.examFeeReceiptCrudUrl, 
      studentId, this.examFeeCollectionForm.value.examId, 'true', 'studentDetail.studentId', 'exam.examId', 'isActive')
  .subscribe(result => {
     this.spinner.hide();
     if (result.statusCode === 200){
          if (result.success) {
              this.feeReceipts = result.data.resultList;
              // tslint:disable-next-line: prefer-for-of
              for (let i = 0; i < this.feeReceipts.length; i++){
                  // tslint:disable-next-line: prefer-for-of
                  for (let j = 0; j < this.feeReceipts[i].examStudentDTOs[0].examStudentDetailDTOs.length; j++){
                    // tslint:disable-next-line: max-line-length
                    this.feeReceipts[i].examStudentDTOs[0].examStudentDetailDTOs[j].subjectTypeCode = this.feeReceipts[i].examStudentDTOs[0].examStudentDetailDTOs[j].subjecttypeCode;
                    this.feeReceipts[i].examStudentDTOs[0].examStudentDetailDTOs[j].subCredits = this.feeReceipts[i].examStudentDTOs[0].examStudentDetailDTOs[j].credits;
                  }
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

  addFeeStructure(row): void{
    row.groupCode = this.student.groupCode;
    row.courseId = this.student.courseId;
    row.studentCourseYearId = this.student.courseYearId;
    const dialogRef = this.dialog.open(AddAdditionalFeeComponent, {
      width: '750px',
      data: row
    });

    dialogRef.afterClosed().subscribe(details => {
      if (details !== ''){ 
          this.spinner.show();
          if (details.type === 'REVISION'){
              /*---------- EXAM REVISION ----------*/
              this.crudService.add(this.revaluationUrl, details)
              .subscribe(result => {
                  this.spinner.hide();
                  if (result.success){
                        this.snotifyService.success(result.message, 'Success!');
                        this.getExamFeeReceipts(this.student.studentId);
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
          }else {
            this.examFeeReceipt = [];
            this.examFeeReceipt.push(details);
            /*---------- EXAM FEE PAY ----------*/
            this.crudService.add(this.examFeeReceiptUrl, this.examFeeReceipt)
            .subscribe(result => {
                this.spinner.hide();
                if (result.success){
                      this.snotifyService.success(result.message, 'Success!');
                      this.getExamFeeReceipts(this.student.studentId);
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
 });
  }

   /*---------- View Subjects-----------*/
   viewCourseYearSubjectsListDialog(data, name): void {
    if (name === 'receipt'){
       data.subjects = data.examStudentDTOs[0].examStudentDetailDTOs;
    } 
    const dialogRef = this.dialog.open(ViewSubjectsComponent, {
    width: '750px',
    data: data.subjects
    });
  }

  /*---------- View Revised Subjects-----------*/
  viewRevisedSubjects(data): void {
    const dialogRef = this.dialog.open(ViewSubjectsComponent, {
    width: '750px',
    data: data.examRevisionSubjectDTOs
    });
  }

 // tslint:disable-next-line:typedef
 isEmptyObject(obj) {
  return (obj && (Object.keys(obj).length === 0));
 }

}
