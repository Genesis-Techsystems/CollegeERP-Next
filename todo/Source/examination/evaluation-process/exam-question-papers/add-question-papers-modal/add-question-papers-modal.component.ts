import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { FormGroup, FormControl, FormBuilder, Validators } from '@angular/forms';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
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
import { MatSelect } from '@angular/material/select';

@Component({
  selector: 'app-add-question-papers-modal',
  templateUrl: './add-question-papers-modal.component.html',
  styleUrls: ['./add-question-papers-modal.component.scss']
})
export class AddQuestionPapersModalComponent implements OnInit {

 
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
    private getDetailsByCourseYearIdUrl = CONSTANTS.getDetailsByCourseYearIdUrl;
    private groupSectionCrudUrl = CONSTANTS.groupSectionCrudUrl;
    private getDetailsByGroupUrl = CONSTANTS.getDetailsByGroupUrl;
    private getDetailsByAcademicYearIdUrl = CONSTANTS.getDetailsByAcademicYearIdUrl;
    private generalDetailsUrl = CONSTANTS.generalDetailsUrl;
    private generalDetailsByCodeUrl = CONSTANTS.generalDetailsByCodeUrl;
    private subjectType = CONSTANTS.subjectType;
    private examIdUrl = CONSTANTS.examIdUrl;
    private subjectsforexamUrl = CONSTANTS.subjectsforexamUrl;
    private collegeByIdUrl = CONSTANTS.collegeByIdUrl;
    private courseByIdUrl = CONSTANTS.courseByIdUrl;
    private courseGroupByIdUrl = CONSTANTS.courseGroupByIdUrl;
    private courseYearByIdUrl = CONSTANTS.courseYearByIdUrl;
    private examMarksEntryStudentsUrl = CONSTANTS.examMarksEntryStudentsUrl;
    private isActive = CONSTANTS.isActive;
    private getDetailsByRegulationIdUrl = CONSTANTS.getDetailsByRegulationIdUrl;
    private examStudentInternalMarksUrl = CONSTANTS.examStudentInternalMarksUrl;
    private examMarksSetupUrl = CONSTANTS.examMarksSetupUrl;
    private examFCARStudentSubMarkUrl = CONSTANTS.examFCARStudentSubMarkUrl;
    private examFCARStudentSubMarkCrudUrl = CONSTANTS.examFCARStudentSubMarkCrudUrl;
    private examFCARSubjectSyllabusCrudUrl = CONSTANTS.examFCARSubjectSyllabusCrudUrl;
    private examStudentInternalMarkCrudUrl = CONSTANTS.examStudentInternalMarkCrudUrl;
    private sortOrder = CONSTANTS.sortOrder;
    public formData;
   
    addquestionpaperForm: FormGroup;
    colleges: College[] = [];
    academicYears: AcademicYear[] = [];
    courses: Course[] = [];
    examsList: ExamMaster[] = [];
    courseGroups: CourseGroup[] = [];
    sections: Section[] = [];
    student: any = {};
    subject: any = {};
    studentSubjects: any[] = [];
    questionPaperTitle: any[] = [];
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
    
    examQuestionpapers : [];
    private ExamQuestionPaperCrudUrl = CONSTANTS.ExamQuestionPaperCrudUrl;
    private ExamEvaluationAssignmentsCrudUrl = CONSTANTS.ExamEvaluationAssignmentsCrudUrl;
    // examEvaluationList: any[];
   
    Barcode: any;
       allEvents: unknown[];
    dialogTitle: string;
    uploadedFiles: any[];
    constructor(private formBuilder: FormBuilder, private snotifyService: SnotifyService,private dialogRef: MatDialogRef<AddQuestionPapersModalComponent>,
                private crudService: CrudService, private spinner: NgxSpinnerService, private router: Router, 
                private dialog: MatDialog, private genericFunctions: GenericFunctions, private route: ActivatedRoute,) {        
        this.getData();
    }
  ngOnInit(): void {
    this.dialogTitle = 'Create Question paper';
    this.addquestionpaperForm = this.formBuilder.group({
      courseId: ['', Validators.required],  
      collegeId: ['', Validators.required],  
      academicYearId: ['', Validators.required],  
      courseGroupId: ['', Validators.required],  
      examId: ['', Validators.required],
      examTimetableDetId: [],
      examDate: [this.genericFunctions.moment(), Validators.required],
      courseYearId: ['', Validators.required],
      groupSectionId: [],
      subjectTypeId: ['', Validators.required],
      subjectId: [],    
      questionPaperTitle: ['', Validators.required],
      setNumber: ['', Validators.required],
      passMarks: ['', Validators.required],
      totalMarks: ['', Validators.required],
      totalQuestions: ['', Validators.required],
      questionPaper: ['', Validators.required],
      questionpaperPath: ['', Validators.required],
      modelanswersheet: ['', Validators.required],
      modelanswersheetPath: ['', Validators.required],
        isnewemp: [],
        isActive: ['', Validators.required],
        reason: []
    });
    
    this.addquestionpaperForm.get('isActive').setValue(true);
    this.addquestionpaperForm.get('reason').setValue('active');
    this.getData();
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
 uploadFiles(files) {
    this.uploadedFiles=[]
    this.formData = new FormData();
 }


 selectedCollege(collegeId): void{
   this.addquestionpaperForm.get('academicYearId').setValue('');
   this.addquestionpaperForm.get('courseId').setValue('');
   this.addquestionpaperForm.get('examId').setValue('');
   this.addquestionpaperForm.get('courseGroupId').setValue('');
   this.addquestionpaperForm.get('courseYearId').setValue('');
   this.addquestionpaperForm.get('subjectTypeId').setValue('');
   this.addquestionpaperForm.get('subjectId').setValue('');
   this.addquestionpaperForm.get('examTimetableDetId').setValue('');
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
 this.addquestionpaperForm.get('courseId').setValue('');
 this.addquestionpaperForm.get('examId').setValue('');
 this.addquestionpaperForm.get('courseGroupId').setValue('');
 this.addquestionpaperForm.get('courseYearId').setValue('');
 this.addquestionpaperForm.get('subjectTypeId').setValue('');
 this.addquestionpaperForm.get('subjectId').setValue('');
 this.addquestionpaperForm.get('examTimetableDetId').setValue('');
 this.courses = [];
 this.examsList = [];
 this.courseGroups = []; 
 this.courseYears = [];
 this.examTimetableSubjectsList = [];
 this.academicYear = this.academicYears.filter(x => (x.academicYearId === academicYearId))[0].academicYear;
/*----------- COURSES -----------*/
 if (academicYearId != null && academicYearId !== undefined ){
this.crudService.listDetailsByTwoIds(this.courseCrudUrl, this.addquestionpaperForm.value.collegeId, 'true', this.getDetailsByCollegeIdUrl, this.isActive)
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
 this.addquestionpaperForm.get('courseGroupId').setValue('');
 this.addquestionpaperForm.get('courseYearId').setValue('');
 this.addquestionpaperForm.get('examId').setValue('');
 this.addquestionpaperForm.get('subjectTypeId').setValue('');
 this.addquestionpaperForm.get('subjectId').setValue('');
 this.addquestionpaperForm.get('examTimetableDetId').setValue('');
 this.examsList = [];
 this.courseYears = [];
 this.courseGroups = [];
 this.examTimetableSubjectsList = [];
 if (courseId !== null && courseId !== undefined){
   this.course = this.courses.filter(x => (x.courseId === courseId))[0].courseCode;
 /*----------- Exams List -----------*/      
 // tslint:disable-next-line:max-line-length
   this.crudService.listDetailsByFourIdsWithSortOrder(this.examMasterUrl, this.addquestionpaperForm.value.collegeId, this.addquestionpaperForm.value.academicYearId, courseId, 'true',
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
 this.addquestionpaperForm.get('courseGroupId').setValue('');
 this.addquestionpaperForm.get('courseYearId').setValue('');
 this.addquestionpaperForm.get('subjectTypeId').setValue('');
 this.addquestionpaperForm.get('subjectId').setValue('');
 this.addquestionpaperForm.get('examTimetableDetId').setValue('');
 this.courseGroups = [];
 this.courseYears = [];
 this.examTimetableSubjectsList = [];
 this.minDate = this.genericFunctions.momentWithDateFormatYMD(this.examsList.filter(x => (x.examId === examId))[0].fromDate);
 this.addquestionpaperForm.get('examDate').setValue(this.minDate);
 this.maxDate =  this.genericFunctions.momentWithDateFormatYMD(this.examsList.filter(x => (x.examId === examId))[0].toDate);
 this.isInternalExam = false;
 if (this.examsList.filter(x => (x.examId === examId)).length > 0){
     if (this.examsList.filter(x => (x.examId === examId))[0].isInternalExam){
         this.isInternalExam = true;
     }
 }

/*----------- COURSES GROUPS -----------*/      
 if (examId != null && examId !== undefined ){
 this.exam = this.examsList.filter(x => (x.examId === this.addquestionpaperForm.value.examId))[0].examName +
  '( ' + this.genericFunctions.momentWithDateFormatYMD(this.examsList.filter(x => (x.examId === this.addquestionpaperForm.value.examId))[0].fromDate) + ' - ' + 
  this.genericFunctions.momentWithDateFormatYMD(this.examsList.filter(x => (x.examId === this.addquestionpaperForm.value.examId))[0].toDate)
    + ')';
 this.crudService.listDetailsByTwoIds(this.courseGroupCrudUrl, this.addquestionpaperForm.value.courseId, 'true', this.getDetailsByCourseIdUrl, this.isActive)
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
 this.addquestionpaperForm.get('courseYearId').setValue('');
 this.addquestionpaperForm.get('groupSectionId').setValue('');  
 this.addquestionpaperForm.get('subjectTypeId').setValue('');
 this.addquestionpaperForm.get('subjectId').setValue('');
 this.addquestionpaperForm.get('examTimetableDetId').setValue('');
 if (this.addquestionpaperForm.value.collegeId != null && courseGroupId != null){
 this.courseGroup = this.courseGroups.filter(x => (x.courseGroupId === courseGroupId))[0].groupCode;
 /*----------- COURSES Years -----------*/      
 
 this.crudService.listDetailsByTwoIdsWithSortLtd(this.courseYearCrudUrl, this.addquestionpaperForm.value.courseId, 'true', 'ASC',
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
    this.addquestionpaperForm.get('groupSectionId').setValue('');
    this.addquestionpaperForm.get('subjectTypeId').setValue('');
    this.addquestionpaperForm.get('subjectId').setValue('');
    this.addquestionpaperForm.get('examTimetableDetId').setValue('');
    if (this.addquestionpaperForm.value.collegeId != null && courseYearId != null){
    this.courseyear = this.courseYears.filter(x => (x.courseYearId === courseYearId))[0].courseYearName;
    /*----------- COURSES YEARS -----------*/      
    
    // tslint:disable-next-line:max-line-length
    this.crudService.listDetailsByFourIds(this.groupSectionCrudUrl, courseYearId, this.addquestionpaperForm.value.academicYearId, this.addquestionpaperForm.value.courseGroupId, 'true', this.getDetailsByCourseYearIdUrl, 
      this.getDetailsByAcademicYearIdUrl, this.getDetailsByGroupUrl, this.isActive)
    .subscribe(result => {
        this.spinner.hide();
        this.selectedSection();
        if (result.statusCode === 200) {
            if (result.data.resultList && !_.isEmpty(result.data.resultList)) {
                this.sections = result.data.resultList;
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
    this.addquestionpaperForm.get('subjectTypeId').setValue('');
    this.addquestionpaperForm.get('subjectId').setValue('');
    this.addquestionpaperForm.get('examTimetableDetId').setValue('');
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
    this.addquestionpaperForm.get('subjectId').setValue('');
    this.addquestionpaperForm.get('examTimetableDetId').setValue('');
    if (subjectTypeId !== null){  
      this.examTimetableSubjectsList = [];
      const dateConvert = this.genericFunctions.momentFormatYMD(this.addquestionpaperForm.value.examDate);
        /*----------- EXAM TIMETABLES -----------*/
      this.crudService.listBySixIds(this.subjectsforexamUrl, this.addquestionpaperForm.value.collegeId, 
                                                               this.addquestionpaperForm.value.courseId, 
                                                               this.addquestionpaperForm.value.examId, 
                                                               dateConvert, 
                                                               this.addquestionpaperForm.value.courseGroupId, 
                                                               this.addquestionpaperForm.value.courseYearId, 
   
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
   selectedSubject(examTimetableDetId, list): void{
    this.examStudentsList = [];
    if (examTimetableDetId !== null){
      this.subjectDetails = '';
      const dateConvert = this.genericFunctions.momentFormatYMD(this.addquestionpaperForm.value.examDate);
      this.subjectDetails =  this.examTimetableSubjectsList.filter(x => (x.examTimetableDetId === examTimetableDetId))[0].subjectName + ' (' +
      this.examTimetableSubjectsList.filter(x => (x.examTimetableDetId === examTimetableDetId))[0].regulationCode + ')';
   
      if (this.examTimetableSubjectsList.filter(x => (x.examTimetableDetId === this.addquestionpaperForm.value.examTimetableDetId)).length > 0){
            this.examTypeId = this.examTimetableSubjectsList.filter(x => (x.examTimetableDetId === this.addquestionpaperForm.value.examTimetableDetId))[0].examTypeCatId;
            // tslint:disable-next-line: max-line-length
            this.addquestionpaperForm.get('subjectId').setValue(this.examTimetableSubjectsList.filter(x => (x.examTimetableDetId === this.addquestionpaperForm.value.examTimetableDetId))[0].subjectId);
            this.regulationId = this.examTimetableSubjectsList.filter(x => (x.examTimetableDetId === this.addquestionpaperForm.value.examTimetableDetId))[0].regulationId;
            this.subjectTypeId = this.examTimetableSubjectsList.filter(x => (x.examTimetableDetId === this.addquestionpaperForm.value.examTimetableDetId))[0].subjectTypeId;
            this.subjectTypCode = this.examTimetableSubjectsList.filter(x => (x.examTimetableDetId === this.addquestionpaperForm.value.examTimetableDetId))[0].subjectTypeName;
            this.examTypeCatCode = this.examTimetableSubjectsList.filter(x => (x.examTimetableDetId === this.addquestionpaperForm.value.examTimetableDetId))[0].examTypeCatCode;
        }
   
      
        /*----------- EXAM TIMETABLES -----------*/
      this.crudService.listByEightIds(this.examMarksEntryStudentsUrl, this.addquestionpaperForm.value.collegeId, 
          this.addquestionpaperForm.value.courseId, 
          this.addquestionpaperForm.value.examId, 
          dateConvert, 
          this.addquestionpaperForm.value.courseGroupId, 
          this.addquestionpaperForm.value.courseYearId, 
          this.addquestionpaperForm.value.subjectId, 
          this.examTypeId,
          this.collegeByIdUrl, this.courseByIdUrl, this.examIdUrl, 'examDate', this.courseGroupByIdUrl, this.courseYearByIdUrl, 'subjectId', 'examTypeId')
          .subscribe(result => {
            if (result.statusCode === 200){
                    if (result.data && !_.isEmpty(result.data) && result.data.length > 0) {
                      // console.log([...new Set(result.data)]);
                      
                      this.examStudentsList = [...new Map(result.data.map(item =>
                        [item['rollNumber'], item])).values()]
                      
                      // this.examStudentsList = result.data;
                      // this.getSubjectSyllabus(this.addquestionpaperForm.value.subjectId);
                      // tslint:disable-next-line: prefer-for-of
                      // for (let i = 0; i < this.examStudentsList.length; i++){
                      //   if (this.examStudentsList[i].marks === null){
                      //       this.examStudentsList[i].marks = 0;
                      //   }
                      //   if (this.examStudentsList[i].isPresent === false){
                      //       this.examStudentsList[i].isPass = false;
                      //   }
                      //   this.enteredMarks(this.examStudentsList[i]);
                      // }
   
                     
   
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


isEmptyObject(obj) {
  return (obj && (Object.keys(obj).length === 0));
}

submit(): void {
    const Obj = {
        collegeId : this.addquestionpaperForm.value.collegeId,
        examTimetableDetId : this.addquestionpaperForm.value.examTimetableDetId,
        questionPaperTitle : this.addquestionpaperForm.value.questionPaperTitle,
        setNumber :  this.addquestionpaperForm.value.setNumber,
        passMarks : this.addquestionpaperForm.value.passMarks,
        totalMarks : this.addquestionpaperForm.value.totalMarks,
        totalQuestions : this.addquestionpaperForm.value.totalQuestions,
        isActive : this.addquestionpaperForm.value.isActive,

    }
    this.dialogRef.close(Obj);
//     if (this.addquestionpaperForm.invalid) {
//         return;
//     } else {
//         this.dialogRef.close(Obj);
//     }
  }

}
