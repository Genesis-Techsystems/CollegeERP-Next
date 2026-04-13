import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { FormGroup, FormControl, FormBuilder, Validators } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { Router, ActivatedRoute } from '@angular/router';
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
import { ReplaySubject, Subject } from 'rxjs';
import * as _ from 'lodash';
import { takeUntil } from 'rxjs/operators';
import { AddExmAnswerpaperComponent } from './add-exm-answerpaper/add-exm-answerpaper.component';

@Component({
  selector: 'app-exam-std-answerpaper',
  templateUrl: './exam-std-answerpaper.component.html',
  styleUrls: ['./exam-std-answerpaper.component.scss']
})
export class ExamStdAnswerpaperComponent implements OnInit {

  displayedColumns: string[] = ['id', 'ExamTimetable', 'ExamQuestionPaper', 'Student', 'AnswerPages', 'OmrSerialNo' ,'PagePath','Status'];
  
   dataSource: MatTableDataSource<any>;

  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild(MatSort) sort: MatSort;

  @ViewChild('uploadXl') uploadXl: ElementRef;




  exmstdanswerpaper: FormGroup;
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
  step = 0; 
  maxDate;
  collegeCode;
  flag:boolean
  academicYear;
  course;
  courseGroup;
  courseyear;
  section;
  date;
  subjectTypCode;
  examTypeCatCode;
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
  syllabusDetails = [];
  postMarksList1 = [];
  
  examDate = this.genericFunctions.momentWithDateFormatYMD(this.genericFunctions.moment()) ;

  public employeeFilterCtrl: FormControl = new FormControl();
  public examFilterCtrl: FormControl = new FormControl();

  public filteredEmployees: ReplaySubject<any[]> = new ReplaySubject<any[]>(1);
  public filteredExam: ReplaySubject<any[]> = new ReplaySubject<any[]>(1); 

  private _onDestroy = new Subject<void>();
  searchExams=[];
  
  StdAnswerPaperpages = [
    {
      fk_exam_timetable_det_id:'JNTUH IYr-ISEM Regular',fk_exam_questionpaper_id:'MatElectronic Devices',fk_exam_std_det_id:'Juthi Veena',StudentAnswerPaperPage:'30',omr_serial_no:'23234567654',studentanswer_path:'pdf/path',Status:true
    },
    {
      fk_exam_timetable_det_id:'JNTUH IYr-ISEM Regular',fk_exam_questionpaper_id:'Chemistry',fk_exam_std_det_id:'Bhuvana',StudentAnswerPaperPage:'30',omr_serial_no:'234564899866',studentanswer_path:'pdf/path',Status:false
    },
  ]


  private collegeCrudUrl = CONSTANTS.collegeCrudUrl;
  private academicYearCrudUrl = CONSTANTS.academicYearCrudUrl;
  private getDetailsByCollegeIdUrl = CONSTANTS.getDetailsByCollegeIdUrl;
  private courseCrudUrl = CONSTANTS.courseCrudUrl;
  private examMasterUrl = CONSTANTS.examMasterUrl;
  private getDetailsByCourseIdUrl = CONSTANTS.getDetailsByCourseIdUrl;
  private courseGroupCrudUrl = CONSTANTS.courseGroupCrudUrl;
  private courseYearCrudUrl = CONSTANTS.courseYearCrudUrl;
  private getDetailsByCourseYearIdUrl = CONSTANTS.getDetailsByCourseYearIdUrl;
  private groupSectionCrudUrl = CONSTANTS.groupSectionCrudUrl;
  private getDetailsByGroupUrl = CONSTANTS.getDetailsByGroupUrl;
  private getDetailsByAcademicYearIdUrl = CONSTANTS.getDetailsByAcademicYearIdUrl;
  private generalDetailsUrl = CONSTANTS.generalDetailsUrl;
  private generalDetailsByCodeUrl = CONSTANTS.generalDetailsByCodeUrl;
  private subjectType = CONSTANTS.subjectType;
  private examIdUrl = CONSTANTS.examIdUrl;
  private getDetailsByRegulationIdUrl = CONSTANTS.getDetailsByRegulationIdUrl;
  private examStudentInternalMarksUrl = CONSTANTS.examStudentInternalMarksUrl;
  private subjectsforexamUrl = CONSTANTS.subjectsforexamUrl;
  private collegeByIdUrl = CONSTANTS.collegeByIdUrl;
  private courseByIdUrl = CONSTANTS.courseByIdUrl;
  private courseGroupByIdUrl = CONSTANTS.courseGroupByIdUrl;
  private courseYearByIdUrl = CONSTANTS.courseYearByIdUrl;
  private examMarksEntryStudentsUrl = CONSTANTS.examMarksEntryStudentsUrl;
  private isActive = CONSTANTS.isActive;
  private examMarksSetupUrl = CONSTANTS.examMarksSetupUrl;
  private examFCARStudentSubMarkUrl = CONSTANTS.examFCARStudentSubMarkUrl;
  private examFCARStudentSubMarkCrudUrl = CONSTANTS.examFCARStudentSubMarkCrudUrl;
  private examFCARSubjectSyllabusCrudUrl = CONSTANTS.examFCARSubjectSyllabusCrudUrl;
  private examStudentInternalMarkCrudUrl = CONSTANTS.examStudentInternalMarkCrudUrl;
  private sortOrder = CONSTANTS.sortOrder;
  public formData;




  constructor(private formBuilder: FormBuilder, private snotifyService: SnotifyService,
    private crudService: CrudService, private spinner: NgxSpinnerService, private router: Router, 
    private dialog: MatDialog, private genericFunctions: GenericFunctions, private route: ActivatedRoute,) {        

}

  ngOnInit(): void {
    this.exmstdanswerpaper = this.formBuilder.group({
      courseId: ['', Validators.required],  
      collegeId: ['', Validators.required],  
      academicYearId: ['', Validators.required],  
      courseGroupId: ['', Validators.required],  
      examId: ['', Validators.required],
      examTimetableDetId: [],
      examDate: [this.genericFunctions.moment(), Validators.required],
      courseYearId: ['', Validators.required],
      groupSectionId: [],
      subjectTypeId: 0,
      subjectId: [],
      employeeId: [],
      regulationId: [],
      fDate: [this.genericFunctions.moment()],
  })
  this.examFilterCtrl.valueChanges
  .pipe(takeUntil(this._onDestroy))
  .subscribe(() => {
    this.filterExam();
  });
  this.searchExams.push({firstName: 'Search by Exam.'});  
  this.filteredExam.next(this.searchExams.slice()); 
  
  this.dataSource = new MatTableDataSource<any>(this.StdAnswerPaperpages);
  this.dataSource.paginator = this.paginator;
  this.dataSource.sort = this.sort;

    this.getData();
}
applyFilter(filterValue: string) {
  this.dataSource.filter = filterValue.trim().toLowerCase();

  if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
  }
}
filterEmp(): void {
  if (!this.searchEmployees) {
  return;
  }
  // get the search keyword
  let search = this.employeeFilterCtrl.value;
  if (!search) {
  this.filteredEmployees.next(this.searchEmployees.slice());
  return;
  } else {
  search = search.toLowerCase();
  }
  // filter the banks
  this.filteredEmployees.next(
  // this.searchEmployeess.filter(x => x.firstName.toLowerCase().indexOf(search) > -1)
  );
}
filterExam(): void {
if (!this.searchExams) {
  return;
}
// get the search keyword
let search = this.examFilterCtrl.value;
if (!search) {
  this.filteredExam.next(this.searchExams.slice());
  return;
} else {
  search = search.toLowerCase();
}
// filter the banks
this.filteredExam.next(
 this.searchExams.filter(x => (x.examName.toLowerCase().indexOf(search) > -1))
);
}



getData(): void{
  /*----------- COLLEGES -----------*/
  this.crudService.listDetailsById(this.collegeCrudUrl, 'true', this.isActive)
  .subscribe(result => {
      this.spinner.hide();
      if (result.statusCode === 200){
          if (result.data.resultList && !_.isEmpty(result.data.resultList)) {
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

selectedCollege(collegeId): void{
 this.exmstdanswerpaper.get('academicYearId').setValue('');
 this.exmstdanswerpaper.get('courseId').setValue('');
 this.exmstdanswerpaper.get('examId').setValue('');
 this.exmstdanswerpaper.get('courseGroupId').setValue('');
 this.exmstdanswerpaper.get('courseYearId').setValue('');
 this.exmstdanswerpaper.get('subjectTypeId').setValue('');
 this.exmstdanswerpaper.get('subjectId').setValue('');
 this.exmstdanswerpaper.get('examTimetableDetId').setValue('');
 this.courses = [];
 this.examsList = [];
 this.courseYears = [];
 this.courseGroups = [];
 this.academicYears = []; 
 this.examTimetableSubjectsList = [];
 this.collegeCode = this.colleges.filter(x => (x.collegeId === collegeId))[0].collegeCode;
 /*----------- ACADEMIC YEARS -----------*/
 if (collegeId != null && collegeId !== undefined ){
//  this.crudService.listDetailsByTwoIdsWithSort(this.academicYearCrudUrl, collegeId, 'true', 'DESC', this.getDetailsByCollegeIdUrl, this.isActive, 'fromDate')
this.crudService.listDetailsByTwoIdsWithSort(this.academicYearCrudUrl, collegeId, 'true', 'DESC', this.getDetailsByCollegeIdUrl, this.isActive, 'fromDate')
.subscribe(result => {
     if (result.statusCode === 200) {
         if (result.data.resultList && !_.isEmpty(result.data.resultList)) {
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

// tslint:disable-next-line:typedef
selectedAcademicYear(academicYearId){
this.exmstdanswerpaper.get('courseId').setValue('');
this.exmstdanswerpaper.get('examId').setValue('');
this.exmstdanswerpaper.get('courseGroupId').setValue('');
this.exmstdanswerpaper.get('courseYearId').setValue('');
this.exmstdanswerpaper.get('subjectTypeId').setValue('');
this.exmstdanswerpaper.get('subjectId').setValue('');
this.exmstdanswerpaper.get('examTimetableDetId').setValue('');
this.courses = [];
this.examsList = [];
this.courseGroups = []; 
this.courseYears = [];
this.examTimetableSubjectsList = [];
this.academicYear = this.academicYears.filter(x => (x.academicYearId === academicYearId))[0].academicYear;
/*----------- COURSES -----------*/
if (academicYearId != null && academicYearId !== undefined ){
this.crudService.listDetailsByTwoIds(this.courseCrudUrl, this.exmstdanswerpaper.value.collegeId, 'true', this.getDetailsByCollegeIdUrl, this.isActive)
.subscribe(result => {
 if (result.statusCode === 200){
         if (result.data.resultList && !_.isEmpty(result.data.resultList)) {
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
}
}

selectedCourse(courseId): void{
this.exmstdanswerpaper.get('courseGroupId').setValue('');
this.exmstdanswerpaper.get('courseYearId').setValue('');
this.exmstdanswerpaper.get('examId').setValue('');
this.exmstdanswerpaper.get('subjectTypeId').setValue('');
this.exmstdanswerpaper.get('subjectId').setValue('');
this.exmstdanswerpaper.get('examTimetableDetId').setValue('');
this.examsList = [];
this.courseYears = [];
this.courseGroups = [];
this.examTimetableSubjectsList = [];
if (courseId !== null && courseId !== undefined){
 this.course = this.courses.filter(x => (x.courseId === courseId))[0].courseCode;
/*----------- Exams List -----------*/      
// tslint:disable-next-line:max-line-length
 this.crudService.listDetailsByFourIdsWithSortOrder(this.examMasterUrl, this.exmstdanswerpaper.value.collegeId, this.exmstdanswerpaper.value.academicYearId, courseId, 'true',
'DESC', this.getDetailsByCollegeIdUrl , this.getDetailsByAcademicYearIdUrl, this.getDetailsByCourseIdUrl, 'isActive', 'createdDt')
 .subscribe(result => {
 this.spinner.hide();
 if (result.statusCode === 200){
     if (result.success) {
       this.examsList = [];
     this.examsList = result.data.resultList;
        this.searchExams = this.examsList;
       // this.examsList = [];
       // for(let i = 0; i < result.data.resultList.length; i++){
       //     if(result.data.resultList[i].isRegularExam){
       //       this.examsList.push(result.data.resultList[i]);
       //       this.searchExams.push(result.data.resultList[i]);
       //     }
       // }
             this.filteredExam.next(this.searchExams.slice()); 
         } else {
             this.snotifyService.success(result.message, 'Success!');
         } 
         //for(let i = 0; i < result.data.resultList.length; i++){
           // if(result.data.resultList[i].isInternalExam){
           //   this.examsList.push(result.data.resultList[i]);
           //   this.filteredExam.next(this.searchExams.slice()); 
           // }
       // }
     // }else{
     //   this.snotifyService.success(result.message, 'Success!');
     // }
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

selectedExam(examId): void{
this.exmstdanswerpaper.get('courseGroupId').setValue('');
this.exmstdanswerpaper.get('courseYearId').setValue('');
this.exmstdanswerpaper.get('subjectTypeId').setValue('');
this.exmstdanswerpaper.get('subjectId').setValue('');
this.exmstdanswerpaper.get('examTimetableDetId').setValue('');
this.courseGroups = [];
this.courseYears = [];
this.examTimetableSubjectsList = [];
this.minDate = this.genericFunctions.momentWithDateFormatYMD(this.examsList.filter(x => (x.examId === examId))[0].fromDate);
this.exmstdanswerpaper.get('examDate').setValue(this.minDate);
this.maxDate =  this.genericFunctions.momentWithDateFormatYMD(this.examsList.filter(x => (x.examId === examId))[0].toDate);
this.isInternalExam = false;
if (this.examsList.filter(x => (x.examId === examId)).length > 0){
   if (this.examsList.filter(x => (x.examId === examId))[0].isInternalExam){
       this.isInternalExam = true;
   }
}

/*----------- COURSES GROUPS -----------*/      
if (examId != null && examId !== undefined ){
this.exam = this.examsList.filter(x => (x.examId === this.exmstdanswerpaper.value.examId))[0].examName +
'( ' + this.genericFunctions.momentWithDateFormatYMD(this.examsList.filter(x => (x.examId === this.exmstdanswerpaper.value.examId))[0].fromDate) + ' - ' + 
this.genericFunctions.momentWithDateFormatYMD(this.examsList.filter(x => (x.examId === this.exmstdanswerpaper.value.examId))[0].toDate)
  + ')';
this.crudService.listDetailsByTwoIds(this.courseGroupCrudUrl, this.exmstdanswerpaper.value.courseId, 'true', this.getDetailsByCourseIdUrl, this.isActive)
.subscribe(result => {
   if (result.statusCode === 200) {
       if (result.data.resultList && !_.isEmpty(result.data.resultList)) {
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
}
}

selectedCourseGroup(courseGroupId): void{
this.courseYears = [];
this.sections = [];
this.examTimetableSubjectsList = [];
this.exmstdanswerpaper.get('courseYearId').setValue('');
this.exmstdanswerpaper.get('groupSectionId').setValue('');  
this.exmstdanswerpaper.get('subjectTypeId').setValue('');
this.exmstdanswerpaper.get('subjectId').setValue('');
this.exmstdanswerpaper.get('examTimetableDetId').setValue('');
if (this.exmstdanswerpaper.value.collegeId != null && courseGroupId != null){
this.courseGroup = this.courseGroups.filter(x => (x.courseGroupId === courseGroupId))[0].groupCode;
/*----------- COURSES Years -----------*/      

this.crudService.listDetailsByTwoIdsWithSortLtd(this.courseYearCrudUrl, this.exmstdanswerpaper.value.courseId, 'true', 'ASC',
this.getDetailsByCourseIdUrl, this.isActive, this.sortOrder)
.subscribe(result => {
   this.spinner.hide();
   if (result.statusCode === 200) {
       if (result.data.resultList && !_.isEmpty(result.data.resultList)) {
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
}
}

selectedYear(courseYearId): void{
this.sections = [];
this.examTimetableSubjectsList = [];
this.exmstdanswerpaper.get('groupSectionId').setValue('');
this.exmstdanswerpaper.get('subjectTypeId').setValue(0);
this.exmstdanswerpaper.get('subjectId').setValue('');
this.exmstdanswerpaper.get('examTimetableDetId').setValue('');
if (this.exmstdanswerpaper.value.collegeId != null && courseYearId != null){
this.courseyear = this.courseYears.filter(x => (x.courseYearId === courseYearId))[0].courseYearName;
/*----------- COURSES YEARS -----------*/      

// tslint:disable-next-line:max-line-length
this.crudService.listDetailsByFourIds(this.groupSectionCrudUrl, courseYearId, this.exmstdanswerpaper.value.academicYearId, this.exmstdanswerpaper.value.courseGroupId, 'true', this.getDetailsByCourseYearIdUrl, 
 this.getDetailsByAcademicYearIdUrl, this.getDetailsByGroupUrl, this.isActive)
.subscribe(result => {
   this.spinner.hide();
   this.selectedSection();
   if (result.statusCode === 200) {
       if (result.data.resultList && !_.isEmpty(result.data.resultList)) {
           this.sections = result.data.resultList;
           this.selectedSubjectType(this.exmstdanswerpaper.value.subjectTypeId)
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

selectedSection(): void{
this.exmstdanswerpaper.get('subjectTypeId').setValue('');
this.exmstdanswerpaper.get('subjectId').setValue('');
this.exmstdanswerpaper.get('examTimetableDetId').setValue('');
//  this.section = this.sections.filter(x => (x.groupSectionId === groupSectionId))[0].section;
/*----------- SUBJECT TYPE -----------*/
this.crudService.listDetailsByTwoIds(this.generalDetailsUrl, this.subjectType, 'true', this.generalDetailsByCodeUrl, this.isActive)
.subscribe(result => {
   if (result.statusCode === 200){
               if (result.data.resultList && !_.isEmpty(result.data.resultList)) {
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

selectedSubjectType(subjectTypeId): void{
this.exmstdanswerpaper.get('subjectId').setValue('');
this.exmstdanswerpaper.get('examTimetableDetId').setValue('');
if (subjectTypeId !== null){  
 this.examTimetableSubjectsList = [];
 const dateConvert = this.genericFunctions.momentFormatYMD(this.exmstdanswerpaper.value.examDate);
   /*----------- EXAM TIMETABLES -----------*/
 this.crudService.listBySixIds(this.subjectsforexamUrl, this.exmstdanswerpaper.value.collegeId, 
                                                          this.exmstdanswerpaper.value.courseId, 
                                                          this.exmstdanswerpaper.value.examId, 
                                                          dateConvert, 
                                                          this.exmstdanswerpaper.value.courseGroupId, 
                                                          this.exmstdanswerpaper.value.courseYearId, 

                                                          this.collegeByIdUrl, this.courseByIdUrl, this.examIdUrl, 'examDate', this.courseGroupByIdUrl, this.courseYearByIdUrl)
   .subscribe(result => {
       if (result.statusCode === 200){
               if (result.data && !_.isEmpty(result.data) && result.data.length > 0) {
                // this.examTimetableSubjectsList = result.data;
                  if (subjectTypeId !== 0){
                   this.examTimetableSubjectsList = result.data.filter(x => (x.subjectTypeId === subjectTypeId));
                   // this.subjectTypCode = this.subjectTypes.filter(x => (x.generalDetailId === subjectTypeId))[0].generalDetailCode;
                  }
                  else if (subjectTypeId === 0){
                   this.examTimetableSubjectsList = result.data;
                 // this.subjectTypCode = 'All';
                  }
                 //  this.getMarksSetup(result.data);
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

openDialog(): void {
  const dialogRef = this.dialog.open(AddExmAnswerpaperComponent, {
      width: '750px',
      data: {}
  });

  dialogRef.afterClosed().subscribe(details => {
      if (details != null && details !== '') {
      //     this.spinner.show();

      //     /*---------- ADD StoreMaster ----------*/
      //     this.crudService.addDetails(this.storesMasterCrudUrl, details)
      //         .subscribe(result => {
      //             this.spinner.hide();
      //             if (result.statusCode === 200) {
      //                 if (result.data && result.data !== '') {
      //                     this.snotifyService.success(result.message, 'Success!');
      //                     this.getStoreMasters();
      //                 }
      //             } else {
      //                 this.snotifyService.error(result.message, 'Error!');
      //             }
      //         }, error => {
      //             this.spinner.hide();
      //             if (error.error.statusCode === 401) {
      //                 this.snotifyService.error(error.error.message, 'Error!');
      //                 this.genericFunctions.logOut(this.router.url);
      //             } else {
      //                 this.snotifyService.error(CONSTANTS.message.CON_ERROR, 'Error!');
      //             }
      //         });

      // }
      }
  });
}


getanswerpages(){
  this.flag = true;
  this.dataSource = new MatTableDataSource<any>(this.StdAnswerPaperpages);
}


}
