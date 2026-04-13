import { DatePipe } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormGroup, FormControl, FormBuilder, Validators } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { Router, ActivatedRoute } from '@angular/router';
import { CONSTANTS } from 'app/main/common/constants';
import { GenericFunctions } from 'app/main/common/generic-functions';
import { AcademicYear } from 'app/main/models/academicYear';
import { College } from 'app/main/models/college';
import { Course } from 'app/main/models/course';
import { CourseGroup } from 'app/main/models/courseGroup';
import { GeneralDetail } from 'app/main/models/generalDetail';
import { CrudService } from 'app/main/services/crud.service';
import { GlobalService } from 'app/main/services/global.service';
import { isNull } from 'lodash';
import { SnotifyService } from 'ng-snotify';
import { NgxSpinnerService } from 'ngx-spinner';
import { ReplaySubject, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-exam-naac-report',
  templateUrl: './exam-naac-report.component.html',
  styleUrls: ['./exam-naac-report.component.scss']
})
export class ExamNaacReportComponent implements OnInit {

  private collegeCrudUrl = CONSTANTS.collegeCrudUrl;
  private academicYearCrudUrl = CONSTANTS.academicYearCrudUrl;
  private getDetailsByCollegeIdUrl = CONSTANTS.getDetailsByCollegeIdUrl;
  private courseCrudUrl = CONSTANTS.courseCrudUrl;
  private examFCARStudentSubMarkCrudUrl = CONSTANTS.examFCARStudentSubMarkCrudUrl;
  private getDetailsByCourseIdUrl = CONSTANTS.getDetailsByCourseIdUrl;
  private courseGroupCrudUrl = CONSTANTS.courseGroupCrudUrl;
  private courseYearCrudUrl = CONSTANTS.courseYearCrudUrl;
  private generalDetailsUrl = CONSTANTS.generalDetailsUrl;
  private generalDetailsByCodeUrl = CONSTANTS.generalDetailsByCodeUrl;
  private subjectType = CONSTANTS.subjectType;
  private examStudentUrl = CONSTANTS.examStudentUrl;
  private internalExamMarksType = CONSTANTS.internalExamMarksType;
  private finalInternalMarksUrl = CONSTANTS.finalInternalMarksUrl;
  private regulationCrudUrl = CONSTANTS.regulationCrudUrl;
  private isActive = CONSTANTS.isActive;
  private sortOrder = CONSTANTS.sortOrder;
  dateFormate = CONSTANTS.dateFormate;
  filtersDetailsList=[];
    CollegesListDetails=[];
    CollegeIdData=[];
    courseList=[];
    courseYearList=[];
	    private collegewisedetailsUrl=CONSTANTS.collegewisedetailsUrl;
  internalMarksCalForm: FormGroup;
  colleges: College[] = [];
  academicYears: AcademicYear[] = [];
  courses: Course[] = [];
  examsList: any[] = [];
  courseGroups: CourseGroup[] = [];
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
  selectedExamslist: any[] = [];
  regulations: any[] = [];
  marksCalTypes = CONSTANTS.examMarksCalType; 
  searchExams = [];
  subRegulations: any[] = [];
  searchSubjects = [];
  finalInternalMarks = [];
  midExamMarks = [];
  examIntMarks = [];
  tempV: any;
  selectedData: any;


  collegeCode;
  academicYear;
  course;
  courseGroup;
  courseyear;
  regulation;
  date;
  subjectTypCode;
  subjectDetails;
  examcalType;
  postMarksList: any[] = [];
  flag = false;
  examTypeId;
  internalExamTypes: GeneralDetail[] = [];
  keys = [];
  stdSubjects = [];
  duplicateKeys = [];
  intExams = [];
  examNames = [];
  regulationId;
  examIntMarkTypeId;
  regulationCode;
  internalType;
  subjects = [];
  dashboard;
  
  empSecurity = [];
  isAdmin = false;
  public examsMultiCtrl: FormControl = new FormControl();
  public examsFilterCtrl: FormControl = new FormControl();
  public filteredExamsList: ReplaySubject<any[]> = new ReplaySubject<any[]>(1);

  public subjectsFilterCtrl: FormControl = new FormControl();
  private _onDestroy = new Subject<void>();
  public filteredSubjects: ReplaySubject<any[]> = new ReplaySubject<any[]>(1);
  academicYearsList: any[];
  courseListData: any[];
  groupList: any[];
  courseYearsList: any[];
  examsLists: any[];
  examTimetableSubjects: any[];

  constructor(private formBuilder: FormBuilder, private snotifyService: SnotifyService,
              private crudService: CrudService, private spinner: NgxSpinnerService, private router: Router, private _globalService: GlobalService,
              private dialog: MatDialog, private genericFunctions: GenericFunctions, private route: ActivatedRoute,
              private datePipe: DatePipe) {        
                this.isAdmin = JSON.parse(localStorage.getItem('isAdmin'));
                // this._globalService.empSecurity$.subscribe(empSecurity => {
                //     this.empSecurity = empSecurity;
                //     if (this.empSecurity.length > 0){
                //       this.colleges = [];
                //       for (let i = 0; i < this.empSecurity.length; i++){
                //         if (this.colleges.filter(x => (x.collegeId === this.empSecurity[i].collegeId)).length === 0){
                //            this.colleges.push(this.empSecurity[i]);
                //         } 
                //       }  
                //     }else{
                //         this.getData();
                //     }
                //   });

     
      this.dashboard = CONSTANTS.dashboard
  }

  ngOnInit(): void {
    this.internalMarksCalForm = this.formBuilder.group({
      courseId: ['', Validators.required],  
      collegeId: ['', Validators.required],  
      academicYearId: ['', Validators.required],  
      courseGroupId: ['', Validators.required],
      courseYearId: ['', Validators.required],
      subjectId: ['', Validators.required],
    });

    this.subjectsFilterCtrl.valueChanges
    .pipe(takeUntil(this._onDestroy))
    .subscribe(() => {
      this.filterSub();
    });
    if (this.colleges.length > 0){
        this.internalMarksCalForm.get('collegeId').setValue(this.colleges[0].collegeId);
        this.selectedCollege(this.internalMarksCalForm.value.collegeId); 
     }
     this.getFiltersList(); 
  }

  filterSub(): void {
    if (!this.searchSubjects) {
      return;
    }
    // get the search keyword
    let search = this.subjectsFilterCtrl.value;
    if (!search) {
      this.filteredSubjects.next(this.searchSubjects.slice());
      return;
    } else {
      search = search.toLowerCase();
    }
    // filter the banks
    this.filteredSubjects.next(
      // this.searchSubjects.filter(x => x.subjectName.toLowerCase().indexOf(search) > -1)
      // tslint:disable-next-line: max-line-length
      this.searchSubjects.filter(x => ((x.subjectName != null && x.subjectName.toLowerCase().indexOf(search) > -1) || (x.subjectCode != null && x.subjectCode.toLowerCase().indexOf(search) > -1)))
    );
  }

   // tslint:disable-next-line: use-lifecycle-interface
   ngOnDestroy(): void {
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
  getFiltersList(): void {
    this.CollegesListDetails=[]
    this.filtersDetailsList=[]
    this.colleges=[]
    this.spinner.show();
    let request = [
      {paramName: 'in_flag', paramValue: 'clg_exam_timetable_filters'},
      {paramName: 'in_org_id', paramValue:+localStorage.getItem('organizationId')},
      {paramName: 'in_college_id', paramValue: 0},
      {paramName: 'in_course_id', paramValue: 0},
      {paramName: 'in_course_group_id', paramValue: 0},
      {paramName: 'in_course_year_id', paramValue: 0},
      {paramName: 'in_group_section_id', paramValue: 0},
      {paramName: 'in_academic_year_id', paramValue: 0},
      {paramName: 'in_dept_id', paramValue: 0},
       {paramName: 'in_isadmin', paramValue: 0},
        {paramName: 'in_loginuser_empid', paramValue: +localStorage.getItem('employeeId')},
         {paramName: 'in_loginuser_roleid', paramValue: 0},
         {paramName: 'in_employee', paramValue: ''},
         {paramName: 'in_subject', paramValue: ''},
         {paramName: 'in_gm_codes', paramValue:'QUOTA,GENDER'},
       
         
    ];
    this.crudService.getDetailsByRequest(this.collegewisedetailsUrl, '', request, '&')
  .subscribe(result =>  {
          this.spinner.hide();
          if (result.statusCode === 200) {
            if (result.data && result.data !== '' && result.data.result.length > 0) {
              this.filtersDetailsList = result.data.result;
              this.generalDetails();
              for(let i=0; i<this.filtersDetailsList.length; i++){
                if(this.filtersDetailsList[i].length>0 && this.filtersDetailsList[i][0].flag === 'clg_exam_timetable_filters'){
                  this.CollegesListDetails  = this.filtersDetailsList[i];
                  }
          }
          const CollegeIdData = this.CollegesListDetails.map(({ fk_college_id }) => fk_college_id);
          this.colleges = this.CollegesListDetails.filter(({ fk_college_id }, index) => 
          !CollegeIdData.includes(fk_college_id, index + 1));
           if (this.colleges.length > 0){
            this.colleges = this.colleges.sort((a,b)=>a.clg_sort_order-b.clg_sort_order);
            this.internalMarksCalForm.get('collegeId').setValue(this.colleges[0].fk_college_id);
            this.selectedCollege(this.internalMarksCalForm.value.collegeId);
     
         }       
          
            } else {
              this.snotifyService.success(result.message, 'Success!');
            }
          } else {
            this.snotifyService.error(result.message, 'Error!');
          }
        }, error => {
          this.spinner.hide();
          if (error.error.statusCode === 401) {
            this.snotifyService.error(error.error.message, 'Error!');
            this.genericFunctions.logOut(this.router.url);
          } else {
            this.snotifyService.error(CONSTANTS.message.CON_ERROR, 'Error!');
          }
        });
  }
  generalDetails(): void{
    /*----------- SUBJECT TYPES -----------*/
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

  selectedCollege(collegeId): void{
    this.internalMarksCalForm.get('academicYearId').setValue('');
    this.internalMarksCalForm.get('courseId').setValue('');
    this.internalMarksCalForm.get('courseGroupId').setValue('');
    this.internalMarksCalForm.get('courseYearId').setValue('');
    this.internalMarksCalForm.get('subjectId').setValue('');
    this.courses = [];
    this.examsList = [];
    this.courseYears = [];
    this.courseGroups = [];
    this.academicYears = []; 
    this.midExamMarks = [];
    this.academicYearsList=[]
    this.examTimetableSubjectsList = [];
    this.collegeCode = this.colleges.filter(x => (x.fk_college_id === collegeId))[0].college_code;
    this.academicYearsList=this.CollegesListDetails.filter(x=>(x.fk_college_id==this.internalMarksCalForm.value.collegeId))
    if(this.academicYearsList.length>0){
    const academicYears = this.academicYearsList.map(({ fk_academic_year_id }) => fk_academic_year_id);
    this.academicYears = this.academicYearsList.filter(({ fk_academic_year_id }, index) => !academicYears.includes(fk_academic_year_id, index + 1));
    }
    if(this.academicYears.length>0){
    this.internalMarksCalForm.get('academicYearId').setValue(this.academicYears[0].fk_academic_year_id);
      this.selectedAYear()

    }
      /*----------- COURSES -----------*/
    //   if (this.empSecurity.length > 0){
    //     let courses = this.empSecurity.filter(x => (x.collegeId === this.internalMarksCalForm.value.collegeId));
    //     for (let i = 0; i < courses.length; i++){
    //       if (courses[i].courseId != null){
    //           if (this.courses.filter(x => (x.courseId === courses[i].courseId)).length === 0){
    //               this.courses.push(courses[i]);
    //           } 
    //       }
    //     }
    //     if (this.courses.length > 0){
    //         this.internalMarksCalForm.get('courseId').setValue(this.courses[0].courseId);
    //         this.selectedCourse(this.internalMarksCalForm.value.courseId); 
    //      }
    // }
    // if (this.courses.length === 0){
    // if (collegeId != null && collegeId !== undefined ){
    //   this.crudService.listDetailsByTwoIds(this.courseCrudUrl, this.internalMarksCalForm.value.collegeId, 'true', this.getDetailsByCollegeIdUrl, this.isActive)
    //   .subscribe(result => {
    //       if (result.statusCode === 200){
    //               if (result.data.resultList && result.data.resultList !== '') {
    //                   this.courses = result.data.resultList; 
    //               } else {
    //                   this.snotifyService.success(result.message, 'Success!');
    //               }
    //           }else {
    //             this.snotifyService.error(result.message, 'Error!');
    //         }
          
    //   }, error => {
    //     if (error.error.statusCode === 401){
    //         this.snotifyService.error(error.error.message, 'Error!');
    //         this.genericFunctions.logOut(this.router.url);
    //     }else{
    //         this.snotifyService.error(CONSTANTS.message.CON_ERROR, 'Error!');
    //     }
    //   });
    // }
    //   // tslint:disable-next-line:max-line-length
    //   this.crudService.listDetailsByTwoIdsWithSort(this.academicYearCrudUrl, this.internalMarksCalForm.value.collegeId, 'true', 'DESC', this.getDetailsByCollegeIdUrl, this.isActive, 'fromDate')
    //   .subscribe(result => {
    //       if (result.statusCode === 200) {
    //           if (result.data.resultList && result.data.resultList !== '') {
    //               this.academicYears = result.data.resultList;
    //           } else {
    //               this.snotifyService.success(result.message, 'Success!');
    //           }
    //       }else {
    //         this.snotifyService.error(result.message, 'Error!');
    //     }
    //   }, error => {
    //     if (error.error.statusCode === 401){
    //         this.snotifyService.error(error.error.message, 'Error!');
    //         this.genericFunctions.logOut(this.router.url);
    //     }else{
    //         this.snotifyService.error(CONSTANTS.message.CON_ERROR, 'Error!');
    //     }
    //   });
    // }
  }

  selectedCourse(courseId): void{
    this.internalMarksCalForm.get('subjectId').setValue('');
    this.internalMarksCalForm.get('courseGroupId').setValue('');
    this.internalMarksCalForm.get('courseYearId').setValue('');
    this.courseYears = [];
    this.courseGroups = []; 
    this.examsList = []; 
    this.midExamMarks = [];
    this.examTimetableSubjectsList = [];
    this.searchExams = []; 
    this.selectedExamslist = []; 
    this.examNames = [];
    this.examsMultiCtrl.setValue([]);
    this.flag = false;
    this.groupList=[]
   this.course = this.courses.filter(x => (x.fk_course_id === courseId))[0].course_code;
    this.groupList=this.CollegesListDetails.filter(x=>(x.fk_college_id== this.internalMarksCalForm.value.collegeId && x.fk_course_id==this.internalMarksCalForm.value.courseId && x.fk_academic_year_id==this.internalMarksCalForm.value.academicYearId))
    if(this.groupList.length>0){
    const groupList = this.groupList.map(({ fk_course_group_id }) => fk_course_group_id);
    this.courseGroups = this.groupList.filter(({ fk_course_group_id }, index) => !groupList.includes(fk_course_group_id, index + 1));
    }
    if (this.courseGroups.length > 0){
     this.internalMarksCalForm.get('courseGroupId').setValue(this.courseGroups[0].fk_course_group_id);
      this.selectedCourseGroup(this.internalMarksCalForm.value.courseGroupId); 
  }
  //   if (this.empSecurity.length > 0){
  //       let courseGroups1 = this.empSecurity.filter(x => (x.collegeId === this.internalMarksCalForm.value.collegeId));
  //       let courseGroups = courseGroups1.filter(x => (x.courseId === courseId));
  //       for (let i = 0; i < courseGroups.length; i++){
  //         if (courseGroups[i].courseGroupId != null){
  //             if (this.courseGroups.filter(x => (x.courseGroupId === courseGroups[i].courseGroupId)).length === 0){
  //                 courseGroups[i].groupCode = courseGroups[i].courseGroupCode;
  //                 this.courseGroups.push(courseGroups[i]);
  //             } 
  //         }
  //       }
        
  //     }
  //     if (this.courseGroups.length === 0){
  //   if (courseId !== null && courseId !== undefined){
  //     this.course = this.courses.filter(x => (x.courseId === courseId))[0].courseCode;
  //     this.crudService.listDetailsByTwoIds(this.courseGroupCrudUrl, this.internalMarksCalForm.value.courseId, 'true', this.getDetailsByCourseIdUrl, this.isActive)
  //   .subscribe(result => {
  //       if (result.statusCode === 200) {
  //           if (result.data.resultList && result.data.resultList !== '') {
  //               this.courseGroups = result.data.resultList;
  //           } else {
  //               this.snotifyService.success(result.message, 'Success!');
  //           }
  //       }else {
  //         this.snotifyService.error(result.message, 'Error!');
  //     }
  //   }, error => {
  //     if (error.error.statusCode === 401){
  //         this.snotifyService.error(error.error.message, 'Error!');
  //         this.genericFunctions.logOut(this.router.url);
  //     }else{
  //         this.snotifyService.error(CONSTANTS.message.CON_ERROR, 'Error!');
  //     }
  //   });
  //   }
  // }
  }

  selectedCourseGroup(courseGroupId): void{
    this.courseYears = []; 
    this.midExamMarks = [];
    this.examsList = []; 
    this.examTimetableSubjectsList = [];
    this.internalMarksCalForm.get('courseYearId').setValue('');
    this.internalMarksCalForm.get('subjectId').setValue('');

    this.searchExams = []; 
    this.selectedExamslist = []; 
    this.examNames = [];
    this.examsMultiCtrl.setValue([]);
    this.courseYearsList=[]
    this.flag = false;
    this.courseGroup = this.courseGroups.filter(x => (x.fk_course_group_id === courseGroupId))[0].group_code;
    this.courseYearsList=this.CollegesListDetails.filter(x=>(x.fk_college_id== this.internalMarksCalForm.value.collegeId && x.fk_course_id==this.internalMarksCalForm.value.courseId && x.fk_academic_year_id==this.internalMarksCalForm.value.academicYearId && x.fk_course_group_id==this.internalMarksCalForm.value.courseGroupId))
    if(this.courseYearsList.length>0){
    const courseYearsList = this.courseYearsList.map(({ fk_course_year_id }) => fk_course_year_id);
    this.courseYears = this.courseYearsList.filter(({ fk_course_year_id }, index) => !courseYearsList.includes(fk_course_year_id, index + 1));
    }
    if(this.courseYears.length>0){
     this.internalMarksCalForm.get('courseYearId').setValue(this.courseYears[0].fk_course_year_id);
     this.selectedYear(this.internalMarksCalForm.value.courseYearId)
   }
  //   if (this.empSecurity.length > 0){
  //       let courseYear1 = this.empSecurity.filter(x => (x.collegeId === this.internalMarksCalForm.value.collegeId));
  //       let courseGroups = courseYear1.filter(x => (x.courseId === this.internalMarksCalForm.value.courseId));
  //       for (let i = 0; i < courseGroups.length; i++){
  //         if (courseGroups[i].courseYearId != null){
  //             if (this.courseYears.filter(x => (x.courseYearId === courseGroups[i].courseYearId)).length === 0){
  //                 courseGroups[i].courseYearCode = courseGroups[i].courseYearCode;
  //                 this.courseYears.push(courseGroups[i]);
  //             } 
  //         }
  //       }
  //     }
  //     if (this.courseYears.length === 0){
  //   if (this.internalMarksCalForm.value.collegeId != null && courseGroupId != null){
  //   this.courseGroup = this.courseGroups.filter(x => (x.courseGroupId === courseGroupId))[0].groupCode;
  //   /*----------- COURSES Years -----------*/      
    
  //   this.crudService.listDetailsByTwoIdsWithSortLtd(this.courseYearCrudUrl, this.internalMarksCalForm.value.courseId, 'true', 'ASC',
  //    this.getDetailsByCourseIdUrl, this.isActive, this.sortOrder)
  //   .subscribe(result => {
  //       this.spinner.hide();
  //       if (result.statusCode === 200) {
  //           if (result.data.resultList && result.data.resultList !== '') {
  //               this.courseYears = result.data.resultList;
                
  //           } else {
  //               this.snotifyService.success(result.message, 'Success!');
  //           }
  //       }else {
  //           this.snotifyService.error(result.message, 'Error!');
  //       }
  //   }, error => {
  //       this.spinner.hide();
  //       if (error.error.statusCode === 401){
  //           this.snotifyService.error(error.error.message, 'Error!');
  //           this.genericFunctions.logOut(this.router.url);
  //       }else{
  //           this.snotifyService.error(CONSTANTS.message.CON_ERROR, 'Error!');
  //       }
  //   });
  // }
  // }
  }
  
  selectedYear(courseYearId): void{
    this.searchExams = []; 
    this.selectedExamslist = []; 
    this.examNames = [];
    this.examsMultiCtrl.setValue([]);
    this.flag = false;
    this.examTimetableSubjectsList = []; 
    this.midExamMarks = [];
    if (this.internalMarksCalForm.value.collegeId != null && courseYearId != null){
      this.courseyear = this.courseYears.filter(x => (x.fk_course_year_id === courseYearId))[0].course_year_name;
    }
    this.selectedAcademicYear(this.internalMarksCalForm.value.academicYearId);
  }

  selectedAYear(): void{
    this.internalMarksCalForm.get('courseGroupId').setValue('');
    this.internalMarksCalForm.get('courseYearId').setValue('');
    this.internalMarksCalForm.get('courseId').setValue('');
    this.internalMarksCalForm.get('subjectId').setValue('');

    this.courseYears = [];
    this.courseGroups = []; 
    this.examsList = []; 
    this.searchExams = []; 
    this.midExamMarks = [];
    this.examTimetableSubjectsList = [];
    this.selectedExamslist = []; 
    this.examNames = [];
    this.courseListData=[]
    this.examsMultiCtrl.setValue([]);
    this.flag = false;
    this.courseListData=this.CollegesListDetails.filter(x=>(x.fk_college_id==this.internalMarksCalForm.value.collegeId && x.fk_academic_year_id==this.internalMarksCalForm.value.academicYearId))
if(this.courseListData.length>0){
const courseList = this.courseListData.map(({ fk_course_id }) => fk_course_id);
this.courses = this.courseListData.filter(({ fk_course_id }, index) =>
!courseList.includes(fk_course_id, index + 1));
}
if(this.courses.length>0){
  this.internalMarksCalForm.get('courseId').setValue(this.courses[0].fk_course_id);
  this.selectedCourse(this.internalMarksCalForm.value.courseId)
}
  }

  // tslint:disable-next-line:typedef
  selectedAcademicYear(academicYearId){
    this.examsList = []; 
    this.midExamMarks = [];
    this.examsLists=[]
    this.examTimetableSubjectsList = [];
    // this.academicYear = this.academicYears.filter(x => (x.academicYearId === academicYearId))[0].academicYear;
    if (academicYearId != null){
      this.examsLists=this.CollegesListDetails.filter(x=>(x.fk_college_id== this.internalMarksCalForm.value.collegeId && x.fk_course_id==this.internalMarksCalForm.value.courseId && x.fk_academic_year_id==this.internalMarksCalForm.value.academicYearId && x.fk_course_group_id==this.internalMarksCalForm.value.courseGroupId  && x.fk_course_year_id==this.internalMarksCalForm.value.courseYearId))
      if(this.examsLists.length>0){
      const examsLists = this.examsLists.map(({ fk_exam_id }) => fk_exam_id);
      this.examsList = this.examsLists.filter(({ fk_exam_id }, index) => !examsLists.includes(fk_exam_id, index + 1));
      // this.examData = this.examsList;
      this.searchExams = this.examsList;
      this.filteredExamsList.next(this.searchExams.slice());
      }

       /*----------- Exams List -----------*/      
      // this.crudService.listDetailsBySevenIdsOrderBy(this.examStudentUrl, 
      //                                        this.internalMarksCalForm.value.collegeId, 
      //                                        this.internalMarksCalForm.value.courseId, 
      //                                        this.internalMarksCalForm.value.academicYearId,
      //                                        this.internalMarksCalForm.value.courseGroupId,
      //                                        this.internalMarksCalForm.value.courseYearId, 
      //                                        'Internal',
      //                                        'true',
      //                                        'DESC',
      //                                        this.getDetailsByCollegeIdUrl, 
      //                                        'examMaster.course.courseId', 
      //                                        'examMaster.academicYear.academicYearId',
      //                                        'studentDetail.courseGroup.courseGroupId',
      //                                        'courseYear.courseYearId',
      //                                        'examtypeCat.generalDetailCode',
      //                                        'isActive',
      //                                        'createdDt')
      // .subscribe(result => {
      // this.spinner.hide();
      // if (result.statusCode === 200){
      //     if (result.success && result.data.resultList.length > 0) {
      //       // tslint:disable-next-line: prefer-for-of
      //       for (let i = 0; i < result.data.resultList.length; i++){
      //          if (this.examsList.filter(x => (x.examId === result.data.resultList[i].examId)).length === 0){
      //             this.examsList.push(result.data.resultList[i]);
      //          }
      //       }
      //       this.subjects = result.data.resultList[0].examStudentDetailDTOs;
      //       this.searchExams = this.examsList;
      //       this.filteredExamsList.next(this.searchExams.slice());
      //     }else{
      //       this.snotifyService.success(result.message, 'Success!');
      //     }
      // }else {
      // this.snotifyService.error(result.message, 'Error!');
      // }
      // }, error => {
      // this.spinner.hide();
      // if (error.error.statusCode === 401){
      //     this.snotifyService.error(error.error.message, 'Error!');
      //     this.genericFunctions.logOut(this.router.url);
      // }else{
      //   this.snotifyService.error(CONSTANTS.message.CON_ERROR, 'Error!');
      // }
      // });
    }
  }

  selectedSubject(): void{
    this.examStudentsList = [];
  }

  selectedExamsList(): void{
    this.internalMarksCalForm.get('subjectId').setValue('');

    this.selectedExamslist = []; 
    this.examNames = [];
    this.flag = true;
    this.midExamMarks = [];
    this.subjects=[]
    this.examTimetableSubjects=[]
    if (this.examsMultiCtrl.value != null){
      const examsIds = this.examsMultiCtrl.value;
      // tslint:disable-next-line: prefer-for-of
      for (let i = 0; i < examsIds.length; i++) {
        this.examTimetableSubjects=this.CollegesListDetails.filter(x=>(x.fk_college_id== this.internalMarksCalForm.value.collegeId && x.fk_course_id==this.internalMarksCalForm.value.courseId && x.fk_academic_year_id==this.internalMarksCalForm.value.academicYearId && x.fk_exam_id==examsIds[i] && x.fk_course_group_id==this.internalMarksCalForm.value.courseGroupId && x.fk_course_year_id==this.internalMarksCalForm.value.courseYearId))
        if(this.examTimetableSubjects.length>0){
        const examTimetableSubjects = this.examTimetableSubjects.map(({ fk_subject_id }) => fk_subject_id);
        this.subjects = this.examTimetableSubjects.filter(({ fk_subject_id }, index) => !examTimetableSubjects.includes(fk_subject_id, index + 1));
        }
                this.selectedExamslist.push (this.examsList.filter(x => ( x.fk_exam_id === examsIds[i]))[0]);
                this.regulationId = this.examsList.filter(x => ( x.fk_exam_id === examsIds[i]))[0].fk_regulation_id;
                this.regulationCode = this.examsList.filter(x => ( x.fk_exam_id === examsIds[i]))[0].regulation_code;
                if (this.examsList.filter(x => ( x.fk_exam_id === examsIds[i]))[0].examShortName != null){
                  this.examNames.push(this.examsList.filter(x => ( x.fk_exam_id === examsIds[i]))[0]?.examShortName);
                } else{
                  this.examNames.push(this.examsList.filter(x => ( x.fk_exam_id === examsIds[i]))[0].exam_name);
                }
              }
    }
  }

  getList(): void{
    if (this.internalMarksCalForm.valid){
        this.spinner.show();
        this.keys = [];
        
        this.stdSubjects = [];
        this.intExams = [];
        this.midExamMarks = [];
        this.examStudentsList = [];
        this.selectedData = this.colleges.filter(x => (x.fk_college_id === this.internalMarksCalForm.value.collegeId))[0].college_code;
        this.selectedData = this.selectedData + ' / ' + this.academicYears.filter(x => (x.fk_academic_year_id === this.internalMarksCalForm.value.academicYearId))[0].academic_year;
        this.selectedData = this.selectedData + ' / ' + this.courses.filter(x => (x.fk_course_id === this.internalMarksCalForm.value.courseId))[0].course_code;
        this. selectedData = this.selectedData + ' / ' + this.courseGroups.filter(x => (x.fk_course_group_id === this.internalMarksCalForm.value.courseGroupId))[0].group_code;
        this.selectedData = this.selectedData + ' / ' + this.courseYears.filter(x => (x.fk_course_year_id === this.internalMarksCalForm.value.courseYearId))[0].course_year_name;
      
        for (let index = 0; index <  this.sortOrderByMarks(this.selectedExamslist).length; index++) {
            const  element =  this.selectedExamslist[index].exam_name + ' ( ' + this.datePipe.transform(this.selectedExamslist[index].from_date, this.dateFormate) + '-' +
            this.datePipe.transform(this.selectedExamslist[index].to_date, this.dateFormate) + ' ) ' ; 
            if ( index > 0){
              this.tempV = this.tempV + ' && ' + element;
            }else{
              this.tempV = element;
            }

            this.crudService.listDetailsByThreeIds(this.examFCARStudentSubMarkCrudUrl, this.selectedExamslist[index].fk_college_id,
              this.selectedExamslist[index].fk_exam_id,
              this.internalMarksCalForm.value.subjectId,
              'college.collegeId', 'examMaster.examId',
              'subject.subjectId')
            .subscribe(result1 => {
              this.spinner.hide();
                if (result1.statusCode === 200){
                        if (result1.data.resultList && result1.data.resultList !== '' && result1.data.resultList.length > 0) {
                          for (let i = 0; i < result1.data.resultList.length; i++){
                            if (this.keys.filter(x => (x.detailCode === result1.data.resultList[i].detailCode && x.examId === result1.data.resultList[i].examId)).length === 0){
                              if (result1.data.resultList[i].courseOutcomeCatdetCode != null){
                                this.keys.push({
                                  detailCode: result1.data.resultList[i].detailCode,
                                  examId : result1.data.resultList[i].examId,
                                  detailMarks: result1.data.resultList[i].detailMarks,
                                  courseOutcomeCatdetCode: result1.data.resultList[i].courseOutcomeCatdetCode,
                               });
                              }else{
                                this.keys.push({
                                  detailCode: result1.data.resultList[i].detailCode,
                                  examId : result1.data.resultList[i].examId,
                                  detailMarks: result1.data.resultList[i].detailMarks,
                                  courseOutcomeCatdetCode: '',
                               });
                              }
                             
                              if (result1.data.resultList[i].detailCode === 'Assignment'){
                                this.keys.push({
                                  detailCode: 'Total of Mid ' + (index + +1),
                                  examId : result1.data.resultList[i].examId,
                                  detailMarks: '',
                                  courseOutcomeCatdetCode: '',
                               });
                              }  
                            }
                           if (this.examStudentsList.filter(x => (x.studentId === result1.data.resultList[i].studentId)).length === 0){
                               let marks;
                               if (result1.data.resultList[i].marks != null){
                                marks = result1.data.resultList[i].marks;
                               }else{
                                marks = '-';
                               }
                            this.examStudentsList.push({
                                 studentId: result1.data.resultList[i].studentId,
                                 firstName: result1.data.resultList[i].firstName,
                                 rollNumber: result1.data.resultList[i].studentRollnumber,
                                 mids: [{
                                      marks: marks,
                                      name: result1.data.resultList[i].detailCode
                                 }],
                               })
                           }else {
                            let marks;
                            if (result1.data.resultList[i].marks != null){
                             marks = result1.data.resultList[i].marks;
                            }else{
                             marks = '-';
                            }
                            this.examStudentsList.filter(x => (x.studentId === result1.data.resultList[i].studentId))[0].mids.push({
                              marks: marks,
                              name: result1.data.resultList[i].detailCode
                            })
                            if (result1.data.resultList[i].detailCode === 'Assignment'){
                              this.examStudentsList.filter(x => (x.studentId === result1.data.resultList[i].studentId))[0].mids.push({
                                marks: result1.data.resultList[i].reason,
                                name: 'Total'
                              })
                            }  
                           }
                          }
                         // console.log(this.examStudentsList);
                        } else {
                            // tslint:disable-next-line: prefer-for-of
                           
                           // this.snotifyService.success(result1.message, 'Success!');
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
            
          }
        
         
    }
  }

  cal(obj): any{
    let total = 0;
    for (let i = 0; i < obj.mids.length; i++){
      if (obj.mids[i].name === 'Total'){
          if (+obj.mids[i].marks > total){
            total = +obj.mids[i].marks;
          }
      }
    }
    return total;
  }

  sortOrderByMarks(data): any {
    return data.sort((a, b) => {
      return a.examId-b.examId;
    });
  }

  print(): void{
     // tslint:disable-next-line: one-variable-per-declaration
     this.collegeCode = this.colleges.filter(x => (x.collegeId === this.internalMarksCalForm.value.collegeId))[0].collegeName;
    this.academicYear = this.academicYears.filter(x => (x.academicYearId === this.internalMarksCalForm.value.academicYearId))[0].academicYear;
    this.course = this.courses.filter(x => (x.courseId === this.internalMarksCalForm.value.courseId))[0].courseName;
    this.courseGroup = this.courseGroups.filter(x => (x.courseGroupId === this.internalMarksCalForm.value.courseGroupId))[0].groupCode;
     let printContents, popupWin;
     printContents = '<div class="mat-elevation-z8">\n' +
     '<p style="text-align: center !important;color: #000 !important;font-size: 24px !important;margin: 10px;">' + this.collegeCode + '</p>\n' +
     '<p style="text-align: center !important;color: #000 !important;font-size: 20px !important;margin: 10px;"> DEPARTMENT OF ' 
     + this.courseGroup + ' MId MARKS' + ',' + this.course + ' ' +  this.courseYears.filter(x => (x.courseYearId === this.internalMarksCalForm.value.courseYearId))[0].courseYearName + ' (' + this.academicYear +')' + '</p>\n' +
     '<p style="text-align: center !important;color: #000 !important;font-size: 18px !important;margin: 10px;">' + this.subjects.filter(x => (x.subjectId === this.internalMarksCalForm.value.subjectId))[0].subjectName + '</p>\n' +
     '<div >\n' +
     '<table class="mar">\n' +
     '<thead>\n' +
         '<tr>\n' +
         '<th class="table-th" style="width: 5%;text-align: center;">SI.No</th>\n' +
         '<th class="table-th" style="width: 5%;text-align: center;">Roll No.</th>\n' +
         '<th class="table-th" style="width: 10%;text-align: center;">Student Name</th>';
     popupWin = window.open('?', '_blank', '');
     popupWin.document.open();
     popupWin.document.write(`
       <html>
         <head>
         <link href="assets/css/print.scss" rel="stylesheet">
          <!-- <title>Print tab</title>-->
         </head>
     <body onload="window.print();window.close()">${printContents}`);
     // tslint:disable-next-line: prefer-for-of
     for (let j = 0; j < this.keys.length; j++) {
       popupWin.document.write(`
       <th class="table-th" style="width: 4%;text-align: center;padding: 0 !important;
       margin: 0;">
       <p class="p-had">${this.keys[j].detailCode}</p>
       <p class="p-had" >${this.keys[j].courseOutcomeCatdetCode}</p>
       <p class="p-had" >${this.keys[j].detailMarks}</p>
             </th>`
             );
     }
     popupWin.document.write(`
     <th class="table-th" style="width: 5%;text-align: center;">Best of II</th>
             </tr>
             </thead>
             <tbody>
       `);
       // tslint:disable-next-line: prefer-for-of
     for (let i = 0; i < this.examStudentsList.length; i++) {
       popupWin.document.write(`<tr >
             <td style="width: 5%;">${i+1}</td>
             <td style="text-align: left;width: 5%;">${this.examStudentsList[i].rollNumber}</td>
             <td style="width: 10%;text-align: left;">${this.examStudentsList[i].firstName}</td>
             `);
 
                        // tslint:disable-next-line: prefer-for-of
       for (let k = 0; k < this.examStudentsList[i].mids.length; k++) {
         popupWin.document.write(`
         <td style="width: 4%;text-align: center;" >
         ${this.examStudentsList[i].mids[k].marks}
     </td>
         `);
       }
       popupWin.document.write(`
       <td style="width: 5%;text-align: center;">${this.cal(this.examStudentsList[i])}</td>
             </tr>
         `);
     }
    
     popupWin.document.write(`</tbody>
       </table>     
       </div>
      
       </div>
       </body>
        </html>`);
     popupWin.document.close();
  }

}
