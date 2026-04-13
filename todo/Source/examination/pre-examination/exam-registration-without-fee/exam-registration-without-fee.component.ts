
import { Component, OnInit, ViewChild } from '@angular/core';
import { CONSTANTS } from 'app/main/common/constants';
import { FormGroup, FormControl, FormBuilder, Validators } from '@angular/forms';
import { College } from 'app/main/models/college';
import { AcademicYear } from 'app/main/models/academicYear';
import { Course } from 'app/main/models/course';
import { ExamMaster } from 'app/main/models/examMaster';
import { CourseGroup } from 'app/main/models/courseGroup';
import { Subject, ReplaySubject } from 'rxjs';
import { SnotifyService } from 'ng-snotify';
import { CrudService } from 'app/main/services/crud.service';
import { NgxSpinnerService } from 'ngx-spinner';
import { Router, ActivatedRoute } from '@angular/router';
import { GenericFunctions } from 'app/main/common/generic-functions';
import { takeUntil } from 'rxjs/operators';
import { GeneralDetail } from 'app/main/models/generalDetail';
import { fuseAnimations } from '@fuse/animations';
import { ConfirmationComponent } from './confirmation/confirmation.component';
import { MatDialog } from '@angular/material/dialog';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';

@Component({
  selector: 'app-exam-registration-without-fee',
  templateUrl: './exam-registration-without-fee.component.html',
  styleUrls: ['./exam-registration-without-fee.component.scss'],
  animations : fuseAnimations
})

export class ExamRegistrationWithoutFeeComponent implements OnInit {

  displayedColumns: string[] = ['id', 'campusCode', 'campusName', 'orgCode', 'districtName'];
  dataSource: MatTableDataSource<any>;

  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild(MatSort) sort: MatSort;

  private collegeCrudUrl = CONSTANTS.collegeCrudUrl;
  private academicYearCrudUrl = CONSTANTS.academicYearCrudUrl;
  private getDetailsByCollegeIdUrl = CONSTANTS.getDetailsByCollegeIdUrl;
  private courseCrudUrl = CONSTANTS.courseCrudUrl;
  private examMasterUrl = CONSTANTS.examMasterUrl;
  private getDetailsByCourseIdUrl = CONSTANTS.getDetailsByCourseIdUrl;
  private courseGroupCrudUrl = CONSTANTS.courseGroupCrudUrl;
  private studentSearchUrl = CONSTANTS.studentSearchUrl;
  private subjectsearchUrl = CONSTANTS.subjectsearchUrl;
  private courseYearCrudUrl = CONSTANTS.courseYearCrudUrl;
  private studentSubjectUrl = CONSTANTS.studentSubjectUrl;

  private examstdcourseyrsubjectsUrl = CONSTANTS.examstdcourseyrsubjectsUrl;
  private examFeeStructureCrudUrl = CONSTANTS.examFeeStructureCrudUrl;
  private examFeeStructureCourseyrUrl = CONSTANTS.examFeeStructureCourseyrUrl;
  private generalDetailsUrl = CONSTANTS.generalDetailsUrl;
  private generalDetailsByCodeUrl = CONSTANTS.generalDetailsByCodeUrl;
  private subjectType = CONSTANTS.subjectType;
  private isActive = CONSTANTS.isActive;
  private examFeeType = CONSTANTS.examFeeType;
  private examStudentPostUrl = CONSTANTS.examStudentPostUrl;
  private examStudentUrl = CONSTANTS.examStudentUrl;
  private examStudentDetailUrl = CONSTANTS.examStudentDetailUrl;
  private examStdCourseyrSubjecturl = CONSTANTS.examStdCourseyrSubjecturl;
  private examStdCourseyrSubUrl = CONSTANTS.examStdCourseyrSubUrl;
  private sortOrder = CONSTANTS.sortOrder;
  private updateExamStudentRegistrationDetailsUrl=CONSTANTS.updateExamStudentRegistrationDetailsUrl;
  private getStudentExamFeeStructureUrl=CONSTANTS.getStudentExamFeeStructureUrl;

  examFeeCollectionForm: FormGroup;
  colleges: College[] = [];
  academicYears: AcademicYear[] = [];
  courses: Course[] = [];
  examsList: ExamMaster[] = [];
  courseGroups: CourseGroup[] = [];
  searchStudents = [];
  searchSubjects = [];
  selectedStd = [];
  selectedSub = [];
  student: any = {};
  subject: any = {};
  studentSubjects: any[] = [];
  courseYears: any[] = [];
  examCourseYearSubjetsList: any[] = [];
  studentFirstName;
  subjectName;
  courseYearCheck;
  checksubject = true;
  semNo: number;
  examSubjestList: any[] = [];
  count = 0;
  courseYearFee: any = [];
  examsFeeStructures: any = [];
  courseYearsubjectsList: any[] = [];
  subjectTypes: GeneralDetail[] = [];
  selectedCount = 0;
  allStudentSubects: any[] = [];
  courseYearId;
  examtypeCatId;
  examRegister: any[] = [];
  examFeeTypes: any[] = [];
  registeredExamSubjects: any[] = [];
  flag = false;
  selectedSubjects = [];
  allow = false;
  examFeeStructure = [];
  examDuplicateList= [];
  
  public studentFilterCtrl: FormControl = new FormControl();
  private _onDestroy = new Subject<void>();
  public filteredStudents: ReplaySubject<any[]> = new ReplaySubject<any[]>(1);

  public subjectFilterCtrl: FormControl = new FormControl();
  public filteredSubjects: ReplaySubject<any[]> = new ReplaySubject<any[]>(1);

  constructor(private formBuilder: FormBuilder, private snotifyService: SnotifyService,
              private crudService: CrudService, private spinner: NgxSpinnerService, private router: Router, 
              private dialog: MatDialog, private genericFunctions: GenericFunctions, private route: ActivatedRoute) {        
      this.getGeneralDetails();
  }

  ngOnInit(): void {

    this.examFeeCollectionForm = this.formBuilder.group({
      courseId: [''],  
      collegeId: [''],  
      academicYearId: [''],  
      courseGroupId: [''],  
      examId: ['', Validators.required],
      studentId: ['', Validators.required],
      courseYearId: [''],
      subjectTypeId: [],
      subjectId: [''],
      regulationId: [],
      fDate: [this.genericFunctions.moment()]      
    });

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

    this.searchStudents.push({firstName: 'Search by student name or rollno.'});
    this.filteredStudents.next(this.searchStudents.slice());

    this.searchSubjects.push({subjectName: 'Search by Subject name or code.'});
    this.filteredSubjects.next(this.searchSubjects.slice());

    this.dataSource = new MatTableDataSource(this.examSubjestList); 
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;

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

  getGeneralDetails(): void{
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

      /*----------- SUBJECT TYPE -----------*/
    this.crudService.listDetailsByTwoIds(this.generalDetailsUrl, this.subjectType, 'true', this.generalDetailsByCodeUrl, this.isActive)
      .subscribe(result => {
          if (result.statusCode === 200){
                      if (result.data.resultList && result.data.resultList !== '') {
                          this.subjectTypes = result.data.resultList;
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

  enteredStudent(event): void{
    if (event.target.value.length > 4){
        /*----------- STUDENTS -----------*/
        // tslint:disable-next-line: max-line-length
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
    this.courseYears = [];
    this.examSubjestList = [];
    this.registeredExamSubjects = [];
    this.student = {};
    this.flag = false;
    this.examFeeCollectionForm.get('courseYearId').setValue('');
    if (studentId != null && studentId !== '' && studentId !== 'undefined'){
      this.selectedStd = [];
      if (this.searchStudents.filter(x => (x.studentId === studentId)).length > 0){
          this.selectedStd.push(this.searchStudents.filter(x => (x.studentId === studentId))[0]);
          this.student = this.selectedStd[0];
          if (this.examsList.filter(x => (x.examId === this.examFeeCollectionForm.value.examId)).length > 0){
            if (this.examsList.filter(x => (x.examId === this.examFeeCollectionForm.value.examId))[0].isInternalExam){
                this.examFeeCollectionForm.get('courseYearId').setValue(this.student.courseYearId);
                this.examFeeCollectionForm.get('courseYearId').disable();
            }else if (this.examsList.filter(x => (x.examId === this.examFeeCollectionForm.value.examId))[0].isRegularExam){
                this.examFeeCollectionForm.get('courseYearId').setValue(this.student.courseYearId);
                this.examFeeCollectionForm.get('courseYearId').enable();
            }else if (this.examsList.filter(x => (x.examId === this.examFeeCollectionForm.value.examId))[0].isSupplyExam){
              this.examFeeCollectionForm.get('courseYearId').setValue(this.student.courseYearId);
              this.examFeeCollectionForm.get('courseYearId').enable();
            }
        }
          this.student.studentPhotoPath = this.student.studentPhotoPath + '?' + new Date().getTime();
          this.studentFirstName = this.student.firstName + ' ( ' + this.student.hallticketNumber + ' )';
          this.getExamsList();
       }
  
      if (this.student.courseId !== '' && studentId != null){
        this.spinner.show();
        /*----------- COURSES Years -----------*/      
        
        this.crudService.listDetailsByTwoIdsWithSortLtd(this.courseYearCrudUrl, this.student.courseId, 'true', 'ASC',
         this.getDetailsByCourseIdUrl, this.isActive, this.sortOrder)
        .subscribe(result => {
            this.spinner.hide();
            if (result.statusCode === 200) {
                if (result.data.resultList && result.data.resultList !== '') {
                    this.courseYears = result.data.resultList;
                    if (this.courseYears.length > 0){
                      this.examFeeCollectionForm.get('courseYearId').setValue(this.student.courseYearId);
                      this.courseYearCheck = this.student.courseYearId;
                      this.getStudentSubjects(this.courseYearCheck);
                      this.semNo = +this.courseYears.filter(x => ( x. courseYearCode === this.student.courseYearCode))[0].semNo;
                      for ( let i = 0;  i <  this.courseYears.length; i++){
                       if (this.courseYears[i].semNo > this.semNo){
                        this.courseYears.splice(i, 1);
                        i--;
                       }
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
    }  
  }

  getExamsList(): void{
  this.examFeeCollectionForm.get('examId').setValue('');
  this.examsList = [];
  this.courseYears = [];
  this.examSubjestList = [];
  this.registeredExamSubjects = [];
  this.examDuplicateList = [];
  /*----------- Exams List -----------*/      
  this.crudService.listDetailsByTwoIdsWithSort(this.examMasterUrl, this.student.courseId, true,'DESC',
  this.getDetailsByCourseIdUrl,this.isActive,'createdDt')
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
  this.examSubjestList = [];
  this.registeredExamSubjects = [];
  this.flag = true;
  this.getExamFeeStructure(this.student.courseYearId);
  if (!this.isEmptyObject(this.student)){
    this.getExamStudents(this.student.studentId);
  }
}

getExamFeeStructure(courseYearId): void{
  this.examFeeStructure = [];
   /*----------- EXAM FEE AMOUNT-----------*/
  // this.crudService.listDetailsByFourIds(this.examFeeStructureCourseyrUrl, this.examFeeCollectionForm.value.examId, this.student.courseGroupId,
  //   courseYearId, 'true', 'examFeeStructure.examMaster.examId', 'courseGroup.courseGroupId', 'courseYear.courseYearId', 'isActive')
  //   .subscribe(result => {
  //     this.spinner.hide();
  //     if (result.statusCode === 200){
  //               if (result.data.resultList && result.data.resultList.length > 0) {
  //                  this.examFeeStructure = result.data.resultList;
  //                  if (this.examFeeStructure.length > 0){
    this.crudService.listByFourIds(this.getStudentExamFeeStructureUrl, this.student.collegeId,this.examFeeCollectionForm.value.examId, this.student.courseGroupId, courseYearId,
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

selectedSubject(subjectId): void{
  if (subjectId != null && subjectId !== '' && subjectId !== 'undefined'){
    this.subject = {};
    this.selectedSub = [];
    if (this.searchSubjects.filter(x => (x.studentId === subjectId)).length === 0){
    this.selectedSub.push(this.searchSubjects.filter(x => (x.subjectId === subjectId))[0]);
    this.subject = this.selectedSub[0];
    this.courseYearId = this.examFeeCollectionForm.value.courseYearId;
    this.subject.courseYearId = this.courseYearId;
    this.subjectName = this.subject.subjectName;
  }
 }
}

addExamSubject(): void{
  if (this.examsList.filter(x => (x.examId === this.examFeeCollectionForm.value.examId)).length > 0){
    if (this.examsList.filter(x => (x.examId === this.examFeeCollectionForm.value.examId))[0].isInternalExam){
       this.courseYearId = this.student.courseYearId;
    }else if (this.examsList.filter(x => (x.examId === this.examFeeCollectionForm.value.examId))[0].isRegularExam){
      this.courseYearId = this.examFeeCollectionForm.value.courseYearId;
    }
  }
  if (this.examSubjestList.filter(x => (x.subjectCode === this.subject.subjectCode && x.courseYearId === this.subject.courseYearId )).length === 0){
    this.subject.subjectTypeCode = this.subject.subjectTypeName;
    this.subject.courseYearId = this.courseYearId;
    if (this.courseYears.filter(x => (x.courseYearId === this.courseYearId)).length > 0){
      this.subject.courseYearName = this.courseYears.filter(x => (x.courseYearId === this.courseYearId))[0].courseYearName;
    }
    this.examSubjestList.push(
      this.subject
      );
  }else{
    this.snotifyService.info('Subject alredy added in same course year', 'Info');
  }
  this.searchSubjects = [];
  this.examFeeCollectionForm.get('subjectId').setValue('');
  this.searchSubjects.push({subjectName: 'Search by Subject name or code.'});
  this.filteredSubjects.next(this.searchSubjects.slice());
}

getExamStudents(studentId): void{
   if (studentId != null && this.examFeeCollectionForm.value.examId != null){
      // tslint:disable-next-line: max-line-length
      this.crudService.listDetailsByThreeIds(this.examStudentUrl, studentId, this.examFeeCollectionForm.value.examId, 'true', 'studentDetail.studentId', 'examMaster.examId', this.isActive)
      .subscribe(result => {
          if (result.statusCode === 200) {
              if (result.data.resultList && result.data.resultList !== '' && result.data.count !== 0) {
                  this.registeredExamSubjects = [];
                  // tslint:disable-next-line: prefer-for-of
                  for (let i = 0; i < result.data.resultList.length; i++){
                     if (result.data.resultList[i].examStudentDetailDTOs != null){
                      // tslint:disable-next-line: prefer-for-of
                      for (let j = 0; j < result.data.resultList[i].examStudentDetailDTOs.length; j++){
                        result.data.resultList[i].examStudentDetailDTOs[j].courseYearName = result.data.resultList[i].courseYearName;
                        result.data.resultList[i].examStudentDetailDTOs[j].examtypeCatCode = result.data.resultList[i].examtypeCatCode;
                        result.data.resultList[i].examStudentDetailDTOs[j].courseYearId = result.data.resultList[i].courseYearId;
                        this.registeredExamSubjects.push(result.data.resultList[i].examStudentDetailDTOs[j]);
                      }
                     }
                  }
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

getStudentSubjects(courseYearId): void{
  if (courseYearId != null && courseYearId !== 'undefined'){
    if (this.examFeeCollectionForm.value.examId != null && this.examFeeCollectionForm.value.examId !== ''){
      this.getExamFeeStructure(courseYearId);
   }
    if (this.student.courseYearId === courseYearId){
      
      /*----------- STUDENTS SUBJECT-----------*/
      this.crudService.listDetailsByFiveIds(this.studentSubjectUrl, this.student.collegeId, this.student.academicYearId, this.student.studentId,
        courseYearId, 'true', 'college.collegeId', 'academicYear.academicYearId', 'studentDetail.studentId', 'courseYear.courseYearId', 'isActive')
        .subscribe(result => {
          this.spinner.hide();
          if (result.statusCode === 200){
                    if (result.data.resultList && result.data.resultList !== '') {
                        this.allStudentSubects = result.data.resultList;
                        if ( this.allStudentSubects.length > 0){
                          this.studentSubjects = this.allStudentSubects;    
                          // tslint:disable-next-line: prefer-for-of
                          for (let i = 0; i < this.studentSubjects.length; i++){
                            this.studentSubjects[i].isSelected = true;
                            this.studentSubjects[i].checked = true;
                            this.studentSubjects[i].Subject_name = this.studentSubjects[i].subjectName;
                            this.studentSubjects[i].Subject_code = this.studentSubjects[i].subjectCode;
                          }                 
                          this.examFeeCollectionForm.get('subjectTypeId').setValue(0);
                          this.markAll();
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
    }else{
      // this.crudService.listDetailsByThreeIds(this.examStdCourseyrSubjecturl, this.student.collegeId, courseYearId,  this.examFeeCollectionForm.value.studentId, 
      //   'college.collegeId', 'courseYear.courseYearId', 'studentDetail.studentId')
      //   .subscribe(result => {
        this.crudService.listByThreeIds(this.examStdCourseyrSubUrl, this.student.collegeId, courseYearId,  this.examFeeCollectionForm.value.studentId,
          'collegeId', 'courseYearId', 
          'studentId')
         .subscribe(result => {
            this.spinner.hide();
            if (result.statusCode === 200) {
                if (result.data && result.data !== '') {
                    this.examCourseYearSubjetsList = result.data;
                    // tslint:disable-next-line: prefer-for-of
                    for (let i = 0; i < this.examCourseYearSubjetsList.length; i++){
                       this.examCourseYearSubjetsList[i].examType = 'Supple';
                       this.examCourseYearSubjetsList[i].Subject_name = this.examCourseYearSubjetsList[i].subjectName;
                       this.examCourseYearSubjetsList[i].Subject_code = this.examCourseYearSubjetsList[i].subjectCode;
                    }
                    // tslint:disable-next-line: only-arrow-functions tslint:disable-next-line: typedef
                    this.examCourseYearSubjetsList = this.examCourseYearSubjetsList.map(function(obj) { 
                     obj['subCredits'] = obj['creditPoints']; // Assign new key 
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
    
  }
}

/* ===================== STUDENT SUBJECTS FILTERED  BASED ON SUBJECT TYPE ============== */
selectedSubjectType(subjectTypeId): void{
  this.studentSubjects = [];
  this.spinner.show();
  if (subjectTypeId !== 0){
    this.studentSubjects = this.allStudentSubects.filter(x => ( x.subjectTypeId === subjectTypeId));
    this.spinner.hide();
  }
  else
  if (subjectTypeId === 0){
    this.studentSubjects = this.allStudentSubects;
    this.spinner.hide();
  }
  this.markAll();
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

unMark(): void{
  // tslint:disable-next-line: prefer-for-of
  for (let i = 0; i < this.studentSubjects.length; i++){
       this.studentSubjects[i].checked = false;
       this.studentSubjects[i].isSelected = false;
  }
}

/*============ FEE PAYING SUBJECTS LIST FILTERING FUNCTION CALL =======*/
addExamSubjects(): void{
  // tslint:disable-next-line: prefer-for-of
  for ( let i = 0; i < this.studentSubjects.length; i++){
    if (this.studentSubjects[i].checked ){
      if (this.registeredExamSubjects.filter(x => (x.subjectCode === this.studentSubjects[i].subjectCode && x.courseYearId === this.studentSubjects[i].courseYearId)).length === 0){
        if (this.examSubjestList.filter(x => (x.subjectCode === this.studentSubjects[i].subjectCode && x.courseYearId === this.studentSubjects[i].courseYearId )).length === 0){
          this.examSubjestList.push(
            this.studentSubjects[i]
            );
        }
      }
    }
  }
  if (this.examSubjestList.length === 0){
      this.snotifyService.info('Subject alredy added in same course year', 'Info!');
  }
}

checkedSubjects(check, item): void{
  this.count = 0;
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

addInternalSubjects(): void{
  // this.allow = false; 
  this.allow = true; 
  // tslint:disable-next-line: max-line-length
  if (this.examsList.filter(x => (x.examId === this.examFeeCollectionForm.value.examId))[0].isSupplyExam || this.examsList.filter(x => (x.examId === this.examFeeCollectionForm.value.examId))[0].isRegularExam){
    this.courseYearId = this.examFeeCollectionForm.value.courseYearId;
    if (this.registeredExamSubjects.filter(x => (x.courseYearId === this.courseYearId)).length > 0){
        this.allow = true; 
    }
  }else{
    this.allow = true; 
  }
  if (this.allow){
  this.examSubjestList = [];
  // tslint:disable-next-line: prefer-for-of
  for ( let i = 0; i < this.studentSubjects.length; i++){
    if (this.studentSubjects[i].checked ){
      if (this.registeredExamSubjects.filter(x => (x.subjectCode === this.studentSubjects[i].subjectCode && x.courseYearId === this.studentSubjects[i].courseYearId)).length === 0){
        if (this.examSubjestList.filter(x => (x.subjectCode === this.studentSubjects[i].subjectCode && x.courseYearId === this.studentSubjects[i].courseYearId )).length === 0){
          this.examSubjestList.push(
            this.studentSubjects[i]
            );
        }
      }
    }
  }
  if (this.examSubjestList.length === 0){
      this.snotifyService.info('Subject alredy added in same course year', 'Info!');
  }else{
    if (this.examsList.filter(x => (x.examId === this.examFeeCollectionForm.value.examId)).length > 0){
      if (this.examsList.filter(x => (x.examId === this.examFeeCollectionForm.value.examId))[0].isInternalExam){
         this.courseYearId = this.student.courseYearId;
         if (this.examFeeTypes.filter(x => (x.generalDetailCode === 'Internal')).length > 0){
            this.examtypeCatId = this.examFeeTypes.filter(x => (x.generalDetailCode === 'Internal'))[0].generalDetailId;
         } 
      }else if (this.examsList.filter(x => (x.examId === this.examFeeCollectionForm.value.examId))[0].isRegularExam){
        this.courseYearId = this.examFeeCollectionForm.value.courseYearId;
        if (this.examFeeTypes.filter(x => (x.generalDetailCode === 'Regular')).length > 0){
          this.examtypeCatId = this.examFeeTypes.filter(x => (x.generalDetailCode === 'Regular'))[0].generalDetailId;
        } 
      }else if (this.examsList.filter(x => (x.examId === this.examFeeCollectionForm.value.examId))[0].isSupplyExam){
        this.courseYearId = this.examFeeCollectionForm.value.courseYearId;
        if (this.examFeeTypes.filter(x => (x.generalDetailCode === 'Supple')).length > 0){
          this.examtypeCatId = this.examFeeTypes.filter(x => (x.generalDetailCode === 'Supple'))[0].generalDetailId;
        } 
      }
    }
    this.examRegister = [];
    if (this.examFeeCollectionForm.valid){
          // tslint:disable-next-line: prefer-for-of
          for (let i = 0; i < this.examSubjestList.length; i++){
               if (this.examRegister.filter(x => (x.courseYearId = this.examSubjestList[i].courseYearId)).length === 0){
                    if (this.registeredExamSubjects.filter(x => (x.courseYearId === this.examSubjestList[i].courseYearId)).length > 0){
                        this.examSubjestList[i].examStdId = this.registeredExamSubjects.filter(x => (x.courseYearId === this.examSubjestList[i].courseYearId))[0].exexamStdId;
                        this.examSubjestList[i].examFeeAmount = this.registeredExamSubjects.filter(x => (x.courseYearId === this.examSubjestList[i].courseYearId))[0].examFeeAmount;
                    }else{
                        this.examSubjestList[i].examStdId = null;
                        this.examSubjestList[i].examFeeAmount = 0;
                    }
                    this.examRegister.push({
                      feeComments : this.examFeeCollectionForm.value.feeComments,
                      collegeId : this.student.collegeId,
                      courseGroupId : this.student.courseGroupId,
                      courseYearId : this.examSubjestList[i].courseYearId,
                      examFeeAmount : this.examSubjestList[i].examFeeAmount,
                      examStdId: this.examSubjestList[i].examStdId,
                      examtypeCatId : this.examtypeCatId,
                      regulationId: this.student.regulationId,
                      studentId : this.examFeeCollectionForm.value.studentId,
                      isActive : true,
                      isFeePaid : false,
                      registrationDate : this.genericFunctions.moment(),
                      examId : this.examFeeCollectionForm.value.examId,
                      examStudentDetailDTOs: [this.examSubjestList[i]]
                    });
               }else{
                  this.examRegister.filter(x => (x.courseYearId = this.examSubjestList[i].courseYearId))[0].examStudentDetailDTOs.push(this.examSubjestList[i]);
               }
          }
          this.spinner.show();
                 /*---------- EXAM REGISTRATION ----------*/
          this.crudService.add(this.examStudentPostUrl, this.examRegister)
                 .subscribe(result => {
                     this.spinner.hide();
                     if (result.success){
                            this.snotifyService.success(result.message, 'Success!');
                            this.examSubjestList = [];
                            this.selectedSubjects = [];
                           // this.studentSubjects = [];
                            this.checksubject = false;
                            this.unMark();
                            this.getExamStudents(this.student.studentId);
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
}else{
  this.snotifyService.info('Please pay exam fee to update exam subjects.', 'Info!');
}
}

deleteExamSubject(item): void{
  const dialogRef = this.dialog.open(ConfirmationComponent, {
        width: '700px',
        data: item
  });

  dialogRef.afterClosed().subscribe(details => {
    if (details.name === 'delete'){
      this.spinner.show();
      let reqbody={
        isActive:false,
        examStdDetId:item.examStdDetId

      }
      item.reason = details.reason;
      item.isActive = false; 
        this.crudService.update(this.updateExamStudentRegistrationDetailsUrl, reqbody )
      .subscribe(result => {
      // this.crudService.updateDetails(this.examStudentDetailUrl, item, item.examStdDetId, 'examStdDetId')
      // .subscribe(result => {
          this.spinner.hide();
          if (result.success){
                 this.snotifyService.success(result.message, 'Success!');
                 this.getExamStudents(this.student.studentId);
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

deleteExamSubjectNotReg(item, index): void {
  if ( index > - 1) { 
    this.examSubjestList.splice(index, 1);
  }
  this.dataSource = new MatTableDataSource(this.examSubjestList);  
  this.dataSource.paginator = this.paginator;
  this.dataSource.sort = this.sort;
}

// tslint:disable-next-line:typedef
isEmptyObject(obj) {
  return (obj && (Object.keys(obj).length === 0));
}

}
