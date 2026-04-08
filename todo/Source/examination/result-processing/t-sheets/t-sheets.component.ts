import { Component, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { ActivatedRoute, Router } from '@angular/router';
import { GridComponent, PdfExportProperties } from '@syncfusion/ej2-angular-grids';
import { ClickEventArgs } from '@syncfusion/ej2-navigations';
import { CONSTANTS } from 'app/main/common/constants';
import { GenericFunctions } from 'app/main/common/generic-functions';
import { College } from 'app/main/models/college';
import { Course } from 'app/main/models/course';
import { CourseGroup } from 'app/main/models/courseGroup';
import { CourseYear } from 'app/main/models/courseYearRegulation';
import { Regulations } from 'app/main/models/Rregulations';
import { CrudService } from 'app/main/services/crud.service';
import { GlobalService } from 'app/main/services/global.service';
import *  as moment from 'moment';

import { SnotifyService } from 'ng-snotify';
import { NgxSpinnerService } from 'ngx-spinner';
import { ReplaySubject, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-t-sheets',
  templateUrl: './t-sheets.component.html',
  styleUrls: ['./t-sheets.component.scss']
})
export class TSheetsComponent implements OnInit {

  panelOpenState = true;

  private collegeCrudUrl = CONSTANTS.collegeCrudUrl;
  private courseCrudUrl = CONSTANTS.courseCrudUrl;
  private courseGroupCrudUrl = CONSTANTS.courseGroupCrudUrl;
  private getDetailsByCollegeIdUrl = CONSTANTS.getDetailsByCollegeIdUrl;
  private getDetailsByCourseIdUrl = CONSTANTS.getDetailsByCourseIdUrl;
  private courseYearCrudUrl = CONSTANTS.courseYearCrudUrl;
  private regulationCrudUrl = CONSTANTS.regulationCrudUrl;
  private examMasterUrl = CONSTANTS.examMasterUrl;
  private examStudentResultsUrl = CONSTANTS.examStudentResultsUrl;
  private isActive = CONSTANTS.isActive;
  private studentSearchUrl = CONSTANTS.studentSearchUrl;
  private academicYearCrudUrl = CONSTANTS.academicYearCrudUrl;
  private getDetailsByAcademicYearIdUrl = CONSTANTS.getDetailsByAcademicYearIdUrl;
  private sortOrder = CONSTANTS.sortOrder;
  tabledataSource1 = new MatTableDataSource<Element>(ELEMENT_DATA);
  displayedColumns1=[]

  staffForm: FormGroup;
  colleges: College[] = [];
  courses: Course[] = [];
  courseGroups: CourseGroup[] = [];
  regulations: Regulations[] = [];
  courseYears: CourseYear[] = [];
  step = 0;  
  examRegisteredStudents: any[] = [];
  defaultAcademicYearId;
  fromDate ;
  toDate;
  startDate;
  studentAttendance = [];
  public searchText: string;
  groupId;
  isGroupId;
  isGroup;
  isCourse;
  check = 1;
  isHOD;
  collegeId;
  dashboard;
  pageParams: any = {};
  searchStudents = [];
  searchExams = [];
  examsList = [];
  academicYears = [];
  collegeCode;
  courseCode;
  exam;
  courseGroupCode;
  courseYearCode;
  regulationCode;
  examYear;
  private getExamEvaluationSubjectCodes = CONSTANTS.getExamEvaluationCodesUrl;

  public gridData: any[];
  public toolbar: string[];
  // tslint:disable-next-line: ban-types
  public pageSettings: Object;
  @ViewChild('grid')
  public grid: GridComponent;
  // tslint:disable-next-line: ban-types
  public initialPage: Object;
  dataDetails = ' ';

  private _onDestroy = new Subject<void>();
  public studentFilterCtrl: FormControl = new FormControl();
  public filteredStudents: ReplaySubject<any[]> = new ReplaySubject<any[]>(1);

  public examFilterCtrl: FormControl = new FormControl();
  public filteredExams: ReplaySubject<any[]> = new ReplaySubject<any[]>(1);
  private getExamResultMemosUrl=CONSTANTS.getExamResultMemosUrl
  empSecurity = [];
  isAdmin = false;
  evaluatorSettingForm: FormGroup;
  evaluatorsettingform: FormGroup;
  examSubjects=[];
  monthYear1: any[];
  monthYear: any[];
  ExamResultMemosList: any[];
  courseName: any;
  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild(MatSort) sort: MatSort;

  constructor(private route: ActivatedRoute, private formBuilder: FormBuilder, private snotifyService: SnotifyService,
              private crudService: CrudService, private spinner: NgxSpinnerService, private router: Router, private _globalService: GlobalService,
              private dialog: MatDialog, private genericFunctions: GenericFunctions) {
     this.isAdmin = JSON.parse(localStorage.getItem('isAdmin'));
                this._globalService.empSecurity$.subscribe(empSecurity => {
                    this.empSecurity = empSecurity;
                    if (this.empSecurity.length > 0){
                      this.colleges = [];
                      for (let i = 0; i < this.empSecurity.length; i++){
                        if (this.colleges.filter(x => (x.collegeId === this.empSecurity[i].collegeId)).length === 0){
                           this.colleges.push(this.empSecurity[i]);
                        } 
                      }  
                    }else{
                        this.getData();
                    }
                  });

     
      this.dashboard = CONSTANTS.dashboard;
      this.startDate = new Date();
  }

  // tslint:disable-next-line:typedef
  ngOnInit() {
    this.staffForm = this.formBuilder.group({
        collegeId: ['', Validators.required],
        courseId: ['', Validators.required],
        isPass: [-1, Validators.required],
        academicYearId: [0], 
        courseGroupId: [0],
        courseYearId: [0],
        studentId: [0],
        regulationId: [0],
        examId: [0],
        courseCode:[],
        examMonthYear:[]

      }); 
      this.evaluatorsettingform = this.formBuilder.group({
        in_orgid:1,
        in_fdate:['1990-01-01'],
        in_tdate:['1990-01-01'],
        in_exam_month_yr:[''],
        in_course_code:[''],
        in_course_year_code:[''],
        in_subject_code:[''],
        in_evalutor_profileid:0,
        in_exam_date:'1990-01-01',
        in_regulation_code:''
      })
    
    this.toolbar = ['ExcelExport', 'PdfExport', 'Search'];
    this.pageSettings = { pageSize: 10 };
    this.initialPage = { pageSizes: true, pageCount: 10 };

      // this.pageParams.path = 'report-catalyst';
      // this.route.queryParams.subscribe(params => {
      //   if (!this.isEmptyObject(params)){
      //     this.pageParams.path = params.path;
      //   }
      // });
      this.getList();
    this.studentFilterCtrl.valueChanges
      .pipe(takeUntil(this._onDestroy))
      .subscribe(() => {
        this.filterStd();
      });

    this.searchStudents.push({firstName: 'Search by student name or rollNo.'});  

    this.filteredStudents.next(this.searchStudents.slice());

    this.examFilterCtrl.valueChanges
      .pipe(takeUntil(this._onDestroy))
      .subscribe(() => {
        this.filterExam();
    });

    this.searchExams.push({examName: 'Search by Exam name.'});
    this.filteredExams.next(this.searchExams.slice());
    this.getData();
  }

  clear(e): void{
    this.reset();
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

  // tslint:disable-next-line:typedef
  isEmptyObject(obj) {
    return (obj && (Object.keys(obj).length === 0));
  }

  goBack(): void{
    this.router.navigate([this.pageParams.path]);
  }
  
    /*================= DATE VALIDATION ================*/ 
  calDay(): void{
    const date1 = new Date(moment(this.staffForm.value.fDate).format()); // new Date(this.data.issueTodate);
    const date2 = new Date(moment(this.staffForm.value.tDate).format()); // new Date(returnDate);
    if (date1.getTime() > date2.getTime()){   
      this.examRegisteredStudents = [];
      this.staffForm.get('tDate').setValue(this.staffForm.value.fDate);
    }
  }
  getList(): void{
    let empId = +localStorage.getItem('employeeId');
    this.crudService.listByEighteenIds(this.getExamEvaluationSubjectCodes, 
         'list_evaluationsettings_filter' ,
         this.evaluatorsettingform.value.in_orgid, 
       this.evaluatorsettingform.value.in_fdate, 
       this.evaluatorsettingform.value.in_tdate, 
       this.evaluatorsettingform.value.in_exam_month_yr, 
       this.evaluatorsettingform.value.in_course_code,
       this.evaluatorsettingform.value.in_course_year_code, 
       this.evaluatorsettingform.value.in_subject_code,
       this.evaluatorsettingform.value.in_evalutor_profileid,
       this.evaluatorsettingform.value.in_exam_date,
       this.evaluatorsettingform.value.in_regulation_code,
       0,0,0,'','',1,empId,
       'in_flag', 'in_orgid' ,'in_fdate', 'in_tdate', 'in_exam_month_yr', 'in_course_code', 'in_course_year_code','in_subject_code', 'in_evalutor_profileid','in_exam_date','in_regulation_code','in_emp_id','in_questionpaper_id','in_evaluator_role_id'
       ,'in_academic_year','in_exam_short_name','in_affiliatedto_catdet_id','in_loginuser_empid'
        )
     .subscribe(result => {
         this.spinner.hide();
         if (result.statusCode === 200){
              if (result.data && result.data !== '' && result.data.result.length > 0) {
                  this.examSubjects =  result.data.result[0];
                  // this.monthYear=this.examSubjects
                     const courseCodeData = this.examSubjects.map(({ course_code }) => course_code);
                     this.courseCode = this.examSubjects.filter(({ course_code }, index) =>
                        !courseCodeData.includes(course_code, index + 1));
                        this.staffForm.get('courseCode').setValue(this.courseCode[0].course_code)
                        this.selectedCourse1(this.courseCode[0].course_code);

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
selectedCourse1(courseCodeId){
  this.monthYear=[];
  this.monthYear1=[]
  // this.evaluatorSettingForm.get('examMonthYear').setValue('')
  for(let i=0;i<this.examSubjects.length;i++){
            if(this.examSubjects[i].course_code==courseCodeId){
                  this.monthYear1.push(this.examSubjects[i])
                  const exam_month_yrData = this.monthYear1.map(({ exam_month_yr }) => exam_month_yr);
                  this.monthYear = this.monthYear1.filter(({ exam_month_yr }, index) =>
                  !exam_month_yrData.includes(exam_month_yr, index + 1));
                  this.monthYear = this.monthYear.sort((a, b) => a.exam_month_yr - b.exam_month_yr);
              this.staffForm.get('examMonthYear').setValue(this.monthYear[0].exam_month_yr)

                
                  
            }
  }
  
}
  getData(): void{
    /*----------- COLLEGES -----------*/
    this.crudService.listDetailsById(this.collegeCrudUrl, 'true', this.isActive)
         .subscribe(result => {
             if (result.statusCode === 200){
                     if (result.data.resultList && result.data.resultList !== '') {
                         this.colleges = result.data.resultList;   
                         if (localStorage.getItem('isHOD') === 'true'){
                          this.isHOD = true;
                          this.staffForm.get('collegeId').setValue(+localStorage.getItem('collegeId'));
                          this.selectedCollege(localStorage.getItem('collegeId'));
                       }   
                       this.staffForm.get('collegeId').setValue(+localStorage.getItem('collegeId'));   
                       this.selectedCollege(localStorage.getItem('collegeId'));
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
      this.staffForm.get('courseId').setValue('');
      this.staffForm.get('regulationId').setValue(0);
      this.staffForm.get('courseGroupId').setValue(0);
      this.staffForm.get('courseYearId').setValue(0);
      this.staffForm.get('studentId').setValue(0);
      this.staffForm.get('academicYearId').setValue(0);
      this.examRegisteredStudents = [];
      this.courses = [];
      this.courseGroups = [];
      this.courseYears = [];
      this.searchExams = [];
      this.searchExams.push({examName: 'Search by Exam name.'});
      this.filteredExams.next(this.searchExams.slice());
      if (this.empSecurity.length > 0){
        let courses = this.empSecurity.filter(x => (x.collegeId === this.staffForm.value.collegeId));
        for (let i = 0; i < courses.length; i++){
          if (courses[i].courseId != null){
              if (this.courses.filter(x => (x.courseId === courses[i].courseId)).length === 0){
                  this.courses.push(courses[i]);
              } 
          }
        }
        if (this.courses.length > 0){
            this.staffForm.get('courseId').setValue(this.courses[0].courseId);
            this.selectedCourse(this.staffForm.value.courseId,this.courses[0].courseCode); 
         }
    }
    if (this.courses.length === 0){
   /*----------- COURSES -----------*/
      this.crudService.listDetailsByTwoIds(this.courseCrudUrl, collegeId, 'true', this.getDetailsByCollegeIdUrl, this.isActive)
   .subscribe(result => {
       if (result.statusCode === 200){
               if (result.data.resultList && result.data.resultList !== '') {
                   this.courses = result.data.resultList; 
                   if (this.courses.length > 0){
                     this.staffForm.get('courseId').setValue(this.courses[0].courseId);
                     this.selectedCourse(this.staffForm.value.courseId,this.courses[0].courseCode); 
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

  selectedCourse(courseId,event): void{
    this.courseName=event
    // this.courseName=event.source.triggerValue
      this.courseGroups = [];
      this.courseYears = [];
      this.staffForm.get('regulationId').setValue(0);
      this.staffForm.get('courseGroupId').setValue(0);
      this.staffForm.get('courseYearId').setValue(0);
      this.examRegisteredStudents = [];
      this.searchExams = [];
      this.searchExams.push({examName: 'Search by Exam name.'});
      this.filteredExams.next(this.searchExams.slice());
      this.crudService.listDetailsByThreeIdsWithSort(this.examMasterUrl, this.staffForm.value.collegeId, courseId, 'true', 'DESC',
    this.getDetailsByCollegeIdUrl , this.getDetailsByCourseIdUrl, this.isActive, 'createdDt')
  .subscribe(result => {
  this.spinner.hide();
  if (result.statusCode === 200){
        if (result.success) {
            this.examsList = result.data.resultList;
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

    /*----------- COURSES GROUPS -----------*/      
    if (this.empSecurity.length > 0){
        let courseGroups1 = this.empSecurity.filter(x => (x.collegeId === this.staffForm.value.collegeId));
        let courseGroups = courseGroups1.filter(x => (x.courseId === courseId));
        for (let i = 0; i < courseGroups.length; i++){
          if (courseGroups[i].courseGroupId != null){
              if (this.courseGroups.filter(x => (x.courseGroupId === courseGroups[i].courseGroupId)).length === 0){
                  courseGroups[i].groupCode = courseGroups[i].courseGroupCode;
                  this.courseGroups.push(courseGroups[i]);
              } 
          }
        }
        
      }
      if (this.courseGroups.length === 0){
      this.crudService.listDetailsByTwoIds(this.courseGroupCrudUrl, courseId, 'true', this.getDetailsByCourseIdUrl, this.isActive)
    .subscribe(result => {
        if (result.statusCode === 200) {
            if (result.data.resultList && result.data.resultList !== '') {
                this.courseGroups = result.data.resultList;
              //   if (this.courseGroups.length > 0){
              //     this.staffForm.get('courseGroupId').setValue(this.courseGroups[0].courseGroupId);
              //      this.selectedGroup(this.staffForm.value.courseGroupId); 
              //  }
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

     /*----------- COURSES Years -----------*/      
     if (this.empSecurity.length > 0){
        let courseYear1 = this.empSecurity.filter(x => (x.collegeId === this.staffForm.value.collegeId));
        let courseGroups = courseYear1.filter(x => (x.courseId === this.staffForm.value.courseId));
        for (let i = 0; i < courseGroups.length; i++){
          if (courseGroups[i].courseYearId != null){
              if (this.courseYears.filter(x => (x.courseYearId === courseGroups[i].courseYearId)).length === 0){
                  courseGroups[i].courseYearCode = courseGroups[i].courseYearCode;
                  this.courseYears.push(courseGroups[i]);
              } 
          }
        }
      }
      if (this.courseYears.length === 0){
      
      this.crudService.listDetailsByTwoIdsWithSortLtd(this.courseYearCrudUrl, this.staffForm.value.courseId, 'true', 'ASC',
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
    }

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

  // tslint:disable-next-line:typedef
selectedAcademicYear(academicYearId){
this.staffForm.get('examId').setValue(0);
this.examsList = [];
this.searchExams = [];
this.examRegisteredStudents = [];
this.searchExams.push({examName: 'Search by Exam name.'});
this.filteredExams.next(this.searchExams.slice());
// this.preStaggings = [];
// this.academicYear = this.academicYears.filter(x => (x.academicYearId === academicYearId))[0].academicYear;
// tslint:disable-next-line:max-line-length
this.crudService.listDetailsByFourIdsWithSortOrder(this.examMasterUrl, this.staffForm.value.collegeId, academicYearId, this.staffForm.value.courseId, 'true',
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
              }
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

  selectedRegulation(): void{
    this.examRegisteredStudents = [];
  }

  selectedGroup(courseGroupId): void{
      this.examRegisteredStudents = [];
  }

  selectedYear(courseYearId): void{
    this.examRegisteredStudents = [];
    if (this.staffForm.value.collegeId != null && courseYearId != null){
      /*----------- COURSES YEARS -----------*/      
    }
  }

   // tslint:disable-next-line:typedef
   dataRefresh(){
    this.examRegisteredStudents = [];
  }

  enteredStudent(event): void{
    if (event.target.value.length > 4){
        /*----------- STUDENTS -----------*/
        this.crudService.listByIds(this.studentSearchUrl, event.target.value, 'q')
            .subscribe(result => {
                if (result.statusCode === 200){
                        if (result.success) {  
                            this.searchStudents = result.data;
                            this.filteredStudents.next(this.searchStudents.slice()); 
                                           
                        }else{
                            this.snotifyService.info(result.message, 'Info!');
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

 selectedStd(): void{
  this.examRegisteredStudents = [];
  if (this.check === 2){
    this.staffForm.get('collegeId').setValue(this.searchStudents.filter(x => (x.studentId === this.staffForm.value.studentId))[0].collegeId);
    this.staffForm.get('courseId').setValue(this.searchStudents.filter(x => (x.studentId === this.staffForm.value.studentId))[0].courseId);
    this.staffForm.get('academicYearId').setValue(this.searchStudents.filter(x => (x.studentId === this.staffForm.value.studentId))[0].academicYearId);
    this.selectedAcademicYear(this.searchStudents.filter(x => (x.studentId === this.staffForm.value.studentId))[0].academicYearId);
  }
 }

 selectedStudent(): void{
  this.examRegisteredStudents = [];
 }

 reset(): void{
  this.staffForm.get('examId').setValue(0);
  this.staffForm.get('academicYearId').setValue(0);
  this.staffForm.get('courseGroupId').setValue(0);
  this.staffForm.get('courseYearId').setValue(0);
  this.staffForm.get('regulationId').setValue(0);
  this.staffForm.get('studentId').setValue(0);
  this.examRegisteredStudents = [];
}

  getDetails(): void{ 
    if (this.staffForm.valid){
        this.spinner.show();
        this.examRegisteredStudents = [];
        this.collegeCode = this.genericFunctions.getCollegeCode(this.colleges, this.staffForm.value.collegeId);
        this.courseCode = this.genericFunctions.getCourse(this.courses, this.staffForm.value.courseId);
        this.examYear = this.genericFunctions.getAcademicYear(this.academicYears, this.staffForm.value.academicYearId);
        this.courseGroupCode = this.genericFunctions.getCourseGroup(this.courseGroups, this.staffForm.value.courseGroupId);
        this.courseYearCode = this.genericFunctions.getCourseYear(this.courseYears, this.staffForm.value.courseYearId);
        this.exam = this.genericFunctions.getExam(this.examsList, this.staffForm.value.examId);
        this.regulationCode = this.genericFunctions.getRegulations(this.regulations, this.staffForm.value.regulationId);
        if (this.staffForm.value.studentId === ''){
          this.staffForm.get('studentId').setValue(0);
        }
        this.selectedData();
        /*----------- STUDENTS -----------*/
       // tslint:disable-next-line:max-line-length
        this.crudService.listByElevenIds(this.getExamResultMemosUrl, 'list_exam_tsheet', this.staffForm.value.examId, this.staffForm.value.courseId, 
        this.staffForm.value.courseGroupId, this.staffForm.value.courseYearId, this.staffForm.value.studentId, 
        this.staffForm.value.regulationId, this.staffForm.value.isPass, 0, '-1', '-1',
       'in_flag', 'in_exam_id', 'in_course_id', 'in_course_group_id', 'in_course_year_id', 'in_std_id', 
       'in_regulation_id', 'in_ispass', 'in_subject_id', 'in_above_fail_subjects', 'in_below_credits')
         .subscribe(result => {
              this.spinner.hide();
              if (result.statusCode === 200){
                   if (result.success) {
                       if (result.data.result[0].length > 0){
                            this.examRegisteredStudents = result.data.result[0];
                            this.gridData = this.examRegisteredStudents;
                            for ( let idx = 0; idx < this.gridData.length; idx++) {
                              this.gridData[idx].id = idx + 1;
                              if (this.gridData[idx].internal_marks === null){
                                this.gridData[idx].internal_marks = ' - ';
                              }
                              if (this.gridData[idx].external_marks === null){
                                this.gridData[idx].external_marks = ' - ';
                              }
                              if (this.gridData[idx].grade === null){
                                this.gridData[idx].grade = ' - ';
                              }
                              if (this.gridData[idx].grade_points === null){
                                this.gridData[idx].grade_points = ' - ';
                              }
                              // tslint:disable-next-line: max-line-length
                              this.gridData[idx].college_code = this.gridData[idx].college_code + ' / ' + this.gridData[idx].course_code + ' / ' + this.gridData[idx].regulation_code + ' / ' + this.gridData[idx].group_code + ' / ' + this.gridData[idx].course_year_code ;
                          }
                       }else{
                         this.snotifyService.success('No Records Found.', 'Success!');
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
  newGetDetails(){
    this.selectedData();

    this.crudService.listByThirteenIds(this.getExamResultMemosUrl, 
      'list_exam_tsheet',
      this.evaluatorsettingform.value.in_orgid, 
    this.evaluatorsettingform.value.in_fdate, 
    this.evaluatorsettingform.value.in_tdate, 
    this.staffForm.value.examMonthYear, 
    this.staffForm.value.courseCode,
    '', 
    '',
    this.evaluatorsettingform.value.in_evalutor_profileid,
    this.evaluatorsettingform.value.in_exam_date,
    this.evaluatorsettingform.value.in_regulation_code,
 0,0,
 
    'in_flag', 'in_orgid' ,'in_fdate', 'in_tdate', 'in_exam_month_yr', 'in_course_code', 'in_course_year_code','in_subject_code', 'in_evalutor_profileid','in_exam_date','in_regulation_code','in_emp_id','in_questionpaper_id'
     )
  .subscribe(result => {
      this.spinner.hide();
      if (result.statusCode === 200){
        if (result.success) {
            if (result.data.result[0].length > 0){
                 this.examRegisteredStudents = result.data.result[0];
                 this.gridData = this.examRegisteredStudents;
                 this.tabledataSource1 = new MatTableDataSource<any>(this.examRegisteredStudents);
                 this.displayedColumns1 = Object.keys(this.examRegisteredStudents[0]);
            this.displayedColumns1.splice(0, 3);
            this.displayedColumns1.splice(1, 1);
            this.displayedColumns1.splice(2, 6);
            this.displayedColumns1.splice(5, 1);
                 setTimeout(()=>
this.tabledataSource1.paginator = this.paginator);
    this.tabledataSource1.sort = this.sort;
                 for ( let idx = 0; idx < this.gridData.length; idx++) {
                   this.gridData[idx].id = idx + 1;
                   if (this.gridData[idx].internal_marks === null){
                     this.gridData[idx].internal_marks = ' - ';
                   }
                   if (this.gridData[idx].external_marks === null){
                     this.gridData[idx].external_marks = ' - ';
                   }
                   if (this.gridData[idx].grade === null){
                     this.gridData[idx].grade = ' - ';
                   }
                   if (this.gridData[idx].grade_points === null){
                     this.gridData[idx].grade_points = ' - ';
                   }
                   // tslint:disable-next-line: max-line-length
                   this.gridData[idx].college_code = this.gridData[idx].college_code + ' / ' + this.gridData[idx].course_code + ' / ' + this.gridData[idx].regulation_code + ' / ' + this.gridData[idx].group_code + ' / ' + this.gridData[idx].course_year_code ;
               }
            }else{
              this.snotifyService.success('No Records Found.', 'Success!');
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

  // tslint:disable-next-line:typedef
  selectedDate(){
    this.examRegisteredStudents = [];
   // this.staffForm.get('groupSectionId').setValue('');
  }

  selectedPass(): void{
      this.examRegisteredStudents = [];
  }

  selectedFlag(): void{
      this.examRegisteredStudents = [];
  }
  // tslint:disable-next-line: typedef
  selectedData(){
    if (this.collegeCode){
      this.dataDetails = this.collegeCode;
    }
    if (this.courseCode){
      this.dataDetails =  this.dataDetails + ' / ' + this.courseCode;
    }
    if (this.examYear){
      this.dataDetails =  this.dataDetails + ' / ' + this.examYear;
    }
    if (this.regulationCode){
      this.dataDetails = this.dataDetails + ' / ' + this.regulationCode;
    }
    if (this.courseGroupCode){
      this.dataDetails = this.dataDetails + ' / ' + this.courseGroupCode;
    }
    if (this.courseYearCode){
      this.dataDetails = this.dataDetails + ' / ' + this.courseYearCode;
    }
    if (this.exam){
      this.dataDetails = this.dataDetails + ' / ' + this.exam;
    }
   
  }
  toolbarClick(args: ClickEventArgs): void {
    if (args.item.text === 'Excel Export') {
       this.grid.excelExport(this.genericFunctions.getExcelExportProperties( this.dataDetails, 'Student Detailed Result'));
            // this.grid.excelExport();
    } else
    if(args.item.text === 'PDF Export') {
      const exportProperties: PdfExportProperties = this.genericFunctions.getPdfExportPropertiesLandscape(this.dataDetails, 'Student Detailed Result');
      this.grid.pdfExport(exportProperties);
      // this.grid.pdfExport();
    }
    // switch (args.item.text) {
    //     /* tslint:disable */
    //     case 'Excel Export':
    //         // this.grid.excelExport(this.getExcelExportProperties());
    //         // this.grid.excelExport();
    //         break;
    //     /* tslint:enable */
    //     case 'PDF Export':
    //         this.grid.pdfExport(this.getPdfExportProperties());
    //         this.grid.pdfExport();
    //         break;
    // }
}
}
const ELEMENT_DATA: Element[] = []





