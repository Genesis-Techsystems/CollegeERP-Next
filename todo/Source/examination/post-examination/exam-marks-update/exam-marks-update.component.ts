import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { ActivatedRoute, Router } from '@angular/router';
import { CONSTANTS } from 'app/main/common/constants';
import { GenericFunctions } from 'app/main/common/generic-functions';
import { AcademicYear } from 'app/main/models/academicYear';
import { College } from 'app/main/models/college';
import { Course } from 'app/main/models/course';
import { CourseGroup } from 'app/main/models/courseGroup';
import { ExamMaster } from 'app/main/models/examMaster';
import { GeneralDetail } from 'app/main/models/generalDetail';
import { Section } from 'app/main/models/section';
import { CrudService } from 'app/main/services/crud.service';
import { SnotifyService } from 'ng-snotify';
import { NgxSpinnerService } from 'ngx-spinner';
import { NotRegisteredStudentsComponent } from './not-registered-students/not-registered-students.component';
import * as FileSaver from 'file-saver';
import * as XLSX from 'xlsx';
import {Location} from '@angular/common';

@Component({
  selector: 'app-exam-marks-update',
  templateUrl: './exam-marks-update.component.html',
  styleUrls: ['./exam-marks-update.component.scss']
})
export class ExamMarksUpdateComponent implements OnInit {

  displayedColumns: string[] = ['id', 'campusCode', 'campusName', 'orgCode', 'districtName'];
  dataSource: MatTableDataSource<any>;

  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild(MatSort) sort: MatSort;

  @ViewChild('uploadXl') uploadXl: ElementRef;

  private collegeCrudUrl = CONSTANTS.collegeCrudUrl;
  private academicYearCrudUrl = CONSTANTS.academicYearCrudUrl;
  private getDetailsByCollegeIdUrl = CONSTANTS.getDetailsByCollegeIdUrl;
  private courseCrudUrl = CONSTANTS.courseCrudUrl;
  private examMasterUrl = CONSTANTS.examMasterUrl;
  private getDetailsByCourseIdUrl = CONSTANTS.getDetailsByCourseIdUrl;
  private courseGroupCrudUrl = CONSTANTS.courseGroupCrudUrl;
  private courseYearCrudUrl = CONSTANTS.courseYearCrudUrl;
  private regulationCrudUrl = CONSTANTS.regulationCrudUrl;
  private getDetailsByAcademicYearIdUrl = CONSTANTS.getDetailsByAcademicYearIdUrl;
  private isActive = CONSTANTS.isActive;
  private addSubjectsUrl = CONSTANTS.addSubjectsUrl;
  private uploadBulkExamMarksUrl = CONSTANTS.uploadBulkExamMarksUrl;
  public formData;
  private examBulkMarksPopUrl = CONSTANTS.examBulkMarksPopUrl;
  private generalDetailsUrl = CONSTANTS.generalDetailsUrl;
  private generalDetailsByCodeUrl = CONSTANTS.generalDetailsByCodeUrl;
  private examFeeType = CONSTANTS.examFeeType;
  private sortOrder = CONSTANTS.sortOrder;

  examFeeCollectionForm: FormGroup;
  colleges: College[] = [];
  academicYears: AcademicYear[] = [];
  courses: Course[] = [];
  examsList: ExamMaster[] = [];
  courseGroups: CourseGroup[] = [];
  sections: Section[] = [];
  student: any = {};
  subject: any = {};
  studentSubjects: any[] = [];
  courseYears: any[] = [];
  examCourseYearSubjetsList: any[] = [];
  examSubjestList: any[] = [];
  courseYearFee: any = [];
  examsFeeStructures: any = [];
  courseYearsubjectsList: any[] = [];
  subjectTypes: GeneralDetail[] = [];
  examTimetableSubjectsList: any[] = [];
  examStudentsList: any[] = [];
  searchEmployees: any[] = [];
  preStaggings: any[] = [];
  minDate;
  maxDate;
  collegeCode = null;
  academicYear;
  course;
  courseGroup;
  courseyear;
  section;
  date;
  subjectTypCode;
  subjectDetails;
  exam;
  postMarksList: any[] = [];
  isInternalExam = false;
  examTypeId;
  regulationId;
  subjectTypeId;
  checkUploadType = 1;
  public searchText: string;
  duplicateexamStudentList = [];
  examMarkSetups: any[] = [];
  keys = [];
  subjectWiseExamMarks = [];
  regulations = [];
  regulation;
  notRegisteredSubjects = [];
  examFeeTypes: GeneralDetail[] = [];
  examData = [];
  
  examDate = this.genericFunctions.momentWithDateFormatYMD(this.genericFunctions.moment()) ;

  constructor(private formBuilder: FormBuilder, private snotifyService: SnotifyService,
              private crudService: CrudService, private spinner: NgxSpinnerService, private router: Router, 
              private dialog: MatDialog, private genericFunctions: GenericFunctions, private route: ActivatedRoute) {        
      this.getData();
  }

  ngOnInit(): void {
    this.examFeeCollectionForm = this.formBuilder.group({
      courseId: ['', Validators.required],  
      collegeId: ['', Validators.required],  
      academicYearId: ['', Validators.required],  
      courseGroupId: ['', Validators.required],  
      examId: ['', Validators.required],
      courseYearId: ['', Validators.required],
      regulationId: ['', Validators.required],
      examTypeCatId: ['', Validators.required],
      isRevised: [false]
    });
   
    this.dataSource = new MatTableDataSource(this.examSubjestList); 
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;

  }

  getData(): void{
     /*----------- COLLEGES -----------*/
     this.crudService.listDetailsById(this.collegeCrudUrl, 'true', this.isActive)
     .subscribe(result => {
         this.spinner.hide();
         this.generalDetails();
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

  generalDetails(): void{
    this.crudService.listDetailsByTwoIds(this.generalDetailsUrl, this.examFeeType, 'true', this.generalDetailsByCodeUrl, this.isActive)
    .subscribe(result => {
        if (result.statusCode === 200){
                    if (result.data.resultList && result.data.resultList !== '') {
                        this.examFeeTypes = [];
                        // tslint:disable-next-line: prefer-for-of
                        for (let i = 0; i < result.data.resultList.length; i++){
                            if (result.data.resultList[i].generalDetailCode !== 'Internal'){
                                this.examFeeTypes.push(result.data.resultList[i]);
                            }
                        }
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

  selectedCollege(collegeId): void{
    this.examFeeCollectionForm.get('academicYearId').setValue('');
    this.examFeeCollectionForm.get('courseId').setValue('');
    this.examFeeCollectionForm.get('examId').setValue('');
    this.examFeeCollectionForm.get('courseGroupId').setValue('');
    this.examFeeCollectionForm.get('courseYearId').setValue('');
    this.examFeeCollectionForm.get('regulationId').setValue('');
    this.courses = [];
    this.preStaggings = [];
    this.examsList = [];
    this.courseYears = [];
    this.courseGroups = [];
    this.academicYears = []; 
    this.collegeCode = this.colleges.filter(x => (x.collegeId === collegeId))[0].collegeCode;
    /*----------- ACADEMIC YEARS -----------*/
    if (collegeId != null && collegeId !== undefined ){

    this.crudService.listDetailsByTwoIds(this.courseCrudUrl, this.examFeeCollectionForm.value.collegeId, 'true', this.getDetailsByCollegeIdUrl, this.isActive)
  .subscribe(result => {
      if (result.statusCode === 200){
              if (result.data.resultList && result.data.resultList !== '') {
                  this.courses = result.data.resultList; 
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

  selectedCourse(courseId): void{
    this.examFeeCollectionForm.get('courseGroupId').setValue('');
    this.examFeeCollectionForm.get('courseYearId').setValue('');
    this.examFeeCollectionForm.get('examId').setValue('');
    this.examFeeCollectionForm.get('regulationId').setValue('');
    this.examsList = [];
    this.preStaggings = [];
    this.courseYears = [];
    this.courseGroups = [];
    this.examsList = [];
    if (courseId !== null && courseId !== undefined){
      this.course = this.courses.filter(x => (x.courseId === courseId))[0].courseCode;
    /*----------- Exams List -----------*/      
    // tslint:disable-next-line:max-line-length
      this.crudService.listDetailsByTwoIds(this.courseGroupCrudUrl, courseId, 'true', this.getDetailsByCourseIdUrl, this.isActive)
    .subscribe(result => {
        if (result.statusCode === 200) {
            if (result.data.resultList && result.data.resultList !== '') {
                this.courseGroups = result.data.resultList;
                
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

      this.crudService.listDetailsByTwoIdsWithSortLtd(this.courseYearCrudUrl, courseId, 'true', 'ASC',
     this.getDetailsByCourseIdUrl, this.isActive, this.sortOrder)
  .subscribe(result => {
      this.spinner.hide();
      if (result.statusCode === 200) {
          if (result.data.resultList && result.data.resultList !== '') {
              this.courseYears = result.data.resultList;
              
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

      this.crudService.listDetailsByTwoIdsWithSort(this.regulationCrudUrl, courseId, 'true', 'desc', this.getDetailsByCourseIdUrl, this.isActive, 'regulationCode')
  .subscribe(result => {
      if (result.statusCode === 200) {
          if (result.data.resultList && result.data.resultList !== '') {
              this.regulations = result.data.resultList;
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

// tslint:disable-next-line:typedef
selectedAcademicYear(academicYearId){
  this.examFeeCollectionForm.get('examId').setValue('');
  this.examFeeCollectionForm.get('courseGroupId').setValue('');
  this.examFeeCollectionForm.get('courseYearId').setValue('');
  this.examFeeCollectionForm.get('regulationId').setValue('');
  this.examsList = [];
  this.preStaggings = [];
  this.academicYear = this.academicYears.filter(x => (x.academicYearId === academicYearId))[0].academicYear;
  // tslint:disable-next-line:max-line-length
  this.crudService.listDetailsByFourIdsWithSortOrder(this.examMasterUrl, this.examFeeCollectionForm.value.collegeId, academicYearId, this.examFeeCollectionForm.value.courseId, 'true',
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
                    this.examData.push(result.data.resultList[i]);
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
selectedExam(examId): void{
  this.examFeeCollectionForm.get('courseGroupId').setValue('');
  this.examFeeCollectionForm.get('courseYearId').setValue('');
  this.examFeeCollectionForm.get('regulationId').setValue('');
  this.preStaggings = [];
  /*----------- COURSES GROUPS -----------*/      
  if (examId != null && examId !== undefined ){
  this.exam = this.examsList.filter(x => (x.examId === this.examFeeCollectionForm.value.examId))[0].examName;
  //  '( ' + this.genericFunctions.momentWithDateFormatYMD(this.examsList.filter(x => (x.examId === this.examFeeCollectionForm.value.examId))[0].fromDate) + ' - ' + 
  //  this.genericFunctions.momentWithDateFormatYMD(this.examsList.filter(x => (x.examId === this.examFeeCollectionForm.value.examId))[0].toDate)
  //    + ')';

  }
}

selectedCourseGroup(courseGroupId): void{
  this.preStaggings = [];
}

selectedYear(courseYearId): void{
  this.preStaggings = [];
  if (this.examFeeCollectionForm.value.collegeId != null && courseYearId != null){
    this.courseyear = this.courseYears.filter(x => (x.courseYearId === courseYearId))[0].courseYearCode;
    /*----------- COURSES YEARS -----------*/      
  }
}

    uploadFile(): void{
      if (this.uploadXl.nativeElement.files.length > 0){
        this.formData = new FormData();
        this.preStaggings = [];
        this.notRegisteredSubjects = [];
        this.courseGroup = this.courseGroups.filter(x => (x.courseGroupId === this.examFeeCollectionForm.value.courseGroupId))[0].groupCode;
        this.regulation = this.regulations.filter(x => (x.regulationId === this.examFeeCollectionForm.value.regulationId))[0].regulationName;
        
        this.formData.append('file',
        this.uploadXl.nativeElement.files[0],
        this.uploadXl.nativeElement.files[0].name);
        this.formData.append('collegeId', this.examFeeCollectionForm.value.collegeId);
        this.formData.append('courseId', this.examFeeCollectionForm.value.courseId);
        this.formData.append('courseGroupId', this.examFeeCollectionForm.value.courseGroupId);
        this.formData.append('courseYearId', this.examFeeCollectionForm.value.courseYearId);
        this.formData.append('regulationId', this.examFeeCollectionForm.value.regulationId);
        this.formData.append('examId', this.examFeeCollectionForm.value.examId);
        this.formData.append('isRevaluation', this.examFeeCollectionForm.value.isRevised);
        this.formData.append('examTypeCatId', this.examFeeCollectionForm.value.examTypeCatId);
        this.spinner.show();
        /*-------- FILE UPLOAD ---------*/ 
        this.crudService.upload(this.uploadBulkExamMarksUrl, this.formData)
        .subscribe(result1 => {
            this.spinner.hide();
            if (result1.statusCode === 200){
                if (result1.success) {
                    this.snotifyService.success(result1.message, 'Success!');
                    this.preStaggings = result1.data.result[0];
                   // this.notRegisteredSubjects = result1.data.result[1];
                    // if (result1.data.examBulkStgMarksNaDTO != null && result1.data.examBulkStgMarksNaDTO.length > 0){
                    //   const dialogRef = this.dialog.open(NotRegisteredStudentsComponent, {
                    //     width: '650px',
                    //     data: result1.data.examBulkStgMarksNaDTO
                    //   }); 
                    // }
         
                }else{
                    this.snotifyService.info(result1.message, 'Info!');
                }
            }else {
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
        this.snotifyService.info('Please choose a file.', 'Info!');
      }
  }

  addSubjects(item): void{
    // item.section = this.student.section;
    //     item.collegeId = this.student.collegeId;
    //     item.collegeCode = this.student.collegeCode;
        
        const dialogRef = this.dialog.open(NotRegisteredStudentsComponent, {
            width: '900px',
            data: item
        });

        dialogRef.afterClosed().subscribe(details => {
          if (details.length > 0){
              this.spinner.show();

              /*---------- ADD SUBJECTS ----------*/
              this.crudService.add(this.addSubjectsUrl, details)
                  .subscribe(result => {
                      this.spinner.hide();
                      if (result.statusCode === 200){
                          if (result.success) {
                             // this.snotifyService.success(result.message, 'Success!');
                              this.uploadFile();
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

    postExamMarks(): void{
      if (this.examFeeCollectionForm.valid){
              this.spinner.show();
              /*---------- EXAM BULK UPLOAD ----------*/
              this.crudService.listByIds(this.examBulkMarksPopUrl, this.preStaggings[0].uniquecode, 'in_uniquecode')
              .subscribe(result => {
                  this.spinner.hide();
                  if (result.success){
                        this.preStaggings = [];
                        this.notRegisteredSubjects = [];
                        this.snotifyService.success('Students are uploaded successfully in ' 
                        + this.collegeCode + ' / ' + this.course + ' / ' + this.academicYear + ' / ' +  this.courseGroup + ' / ' + 
                        this.courseyear + ' / ' + this.regulation + ' / ' + this.exam, 'Success!');
                        window.scrollTo(0, 0);
                        this.router.navigate(['admin-examination-management/post-examination/exam-marks-update']);
                  }else {
                        this.preStaggings = [];
                        this.notRegisteredSubjects = [];
                        this.uploadXl.nativeElement.value = '';
                        this.snotifyService.success('Students are uploaded successfully in ' 
                        + this.collegeCode + ' / ' + this.course + ' / ' + this.academicYear + ' / ' +  this.courseGroup + ' / ' + 
                        this.courseyear + ' / ' + this.regulation + ' / ' + this.exam, 'Success!');
                        window.scrollTo(0, 0);
                        this.router.navigate(['admin-examination-management/post-examination/exam-marks-update']);
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
    download(): void{
        if(this.colleges.filter(x => (x.collegeId === this.examFeeCollectionForm.value.collegeId))[0].collegeCode === 'VEC'){
            FileSaver.saveAs('assets/docs/Intermarks_Bulk_Upload_Sample.xlsx');
        }
       
      }
}
