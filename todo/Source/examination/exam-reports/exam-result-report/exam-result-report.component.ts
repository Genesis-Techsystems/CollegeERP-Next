import { Component, OnInit, ViewChild } from '@angular/core';
import *  as moment from 'moment';

import { CONSTANTS } from 'app/main/common/constants';
import { FormGroup, FormBuilder, Validators, FormControl } from '@angular/forms';
import { College } from 'app/main/models/college';
import { Course } from 'app/main/models/course';
import { CourseGroup } from 'app/main/models/courseGroup';
import { Regulations } from 'app/main/models/Rregulations';
import { CourseYear } from 'app/main/models/courseYearRegulation';
import { ActivatedRoute, Router } from '@angular/router';
import { SnotifyService } from 'ng-snotify';
import { CrudService } from 'app/main/services/crud.service';
import { NgxSpinnerService } from 'ngx-spinner';
import { GenericFunctions } from 'app/main/common/generic-functions';
import { Subject, ReplaySubject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { PivotView, IDataSet, IDataOptions } from '@syncfusion/ej2-angular-pivotview';
import { Button } from 'protractor';
import { MatDialog } from '@angular/material/dialog';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { GlobalService } from 'app/main/services/global.service';

@Component({
  selector: 'app-exam-result-report',
  templateUrl: './exam-result-report.component.html',
  styleUrls: ['./exam-result-report.component.scss']
})

export class ExamResultReportComponent implements OnInit {

    displayedValues: string[] = [];
    displayedColumns: string[] = [];
    columns = [];

    panelOpenState = true;
   // dataSource: MatTableDataSource<any>;

    @ViewChild(MatPaginator) paginator: MatPaginator;
    @ViewChild(MatSort) sort: MatSort;
    private collegeCrudUrl = CONSTANTS.collegeCrudUrl;
    private examStudentResultsUrl = CONSTANTS.examStudentResultsUrl;
    private isActive = CONSTANTS.isActive;
    private studentSearchUrl = CONSTANTS.studentSearchUrl;
    private sortOrder = CONSTANTS.sortOrder;
    private collegewisedetailsUrl=CONSTANTS.collegewisedetailsUrl;
    filtersDetailsList=[];
    CollegesListDetails=[];
    CollegeIdData=[];
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
    check = 1;
    isCourse;
    isHOD;
    collegeId;
    dashboard;
    pageParams: any = {};
    searchStudents = [];
    searchExams = [];
    examsList = [];
    academicYears = [];
    keys = [];
    collegeCode;
    courseCode;
    exam;
    courseGroupCode;
    courseYearCode;
    regulationCode;
    private _onDestroy = new Subject<void>();
    public studentFilterCtrl: FormControl = new FormControl();
    public filteredStudents: ReplaySubject<any[]> = new ReplaySubject<any[]>(1);
    public examFilterCtrl: FormControl = new FormControl();
    public filteredExams: ReplaySubject<any[]> = new ReplaySubject<any[]>(1);

  public pivotData: any[];
  public dataSource: any;
  public width: string;
  public button: any;
  public height: string;
  empSecurity = [];
  isAdmin = false;
  courseListData=[];
  academicYearsList=[];
  examsLists=[];
  examData=[];
  groupList=[];
  courseYearsList=[];
  regulationsList=[];
    @ViewChild('pivotview')
  public pivotGridObj: PivotView;
  
    constructor(private route: ActivatedRoute, private formBuilder: FormBuilder, private snotifyService: SnotifyService,
                private crudService: CrudService, private spinner: NgxSpinnerService, private router: Router, private _globalService: GlobalService,
                private dialog: MatDialog, private genericFunctions: GenericFunctions) {
                    this.isAdmin = JSON.parse( localStorage.getItem('isAdmin'));
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
        }); 
        // this.pageParams.path = 'report-catalyst';
        // this.route.queryParams.subscribe(params => {
        //   if (!this.isEmptyObject(params)){
        //     this.pageParams.path = params.path;
        //   }
        // });
        this.getFiltersList();
      this.studentFilterCtrl.valueChanges
        .pipe(takeUntil(this._onDestroy))
        .subscribe(() => {
          this.filterStd();
        });
  
        if (this.colleges.length > 0){
            this.staffForm.get('collegeId').setValue(this.colleges[0].collegeId);
            this.selectedCollege(this.staffForm.value.collegeId); 
         } 
         
      this.searchStudents.push({firstName: 'Search by student name or rollNo.'});  
  
      this.filteredStudents.next(this.searchStudents.slice());
  
      this.examFilterCtrl.valueChanges
        .pipe(takeUntil(this._onDestroy))
        .subscribe(() => {
          this.filterExam();
      });
  
      this.searchExams.push({examName: 'Search by Exam name.'});
      this.filteredExams.next(this.searchExams.slice());
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
  
    getData(): void{
      /*----------- COLLEGES -----------*/
      this.crudService.listDetailsById(this.collegeCrudUrl, 'true', this.isActive)
           .subscribe(result => {
               if (result.statusCode === 200){
                       if (result.data.resultList && result.data.resultList !== '') {
                           this.colleges = result.data.resultList;   
                           if (localStorage.getItem('isHOD') === 'true'){
                            this.isHOD = true;
                            this.staffForm.get('collegeId').setValue(localStorage.getItem('collegeId'));
                            this.selectedCollege(localStorage.getItem('collegeId'));
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
    getFiltersList(): void {
      this.filtersDetailsList=[]
      this.CollegesListDetails=[]
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
           {paramName: 'in_gm_codes', paramValue:''},
          
           
      ];
      this.crudService.getDetailsByRequest(this.collegewisedetailsUrl, '', request, '&')
    .subscribe(result =>  {
            this.spinner.hide();
            if (result.statusCode === 200) {
              if (result.data && result.data !== '' && result.data.result.length > 0) {
                this.filtersDetailsList = result.data.result;
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
              this.staffForm.get('collegeId').setValue(this.colleges[0].fk_college_id);
              this.selectedCollege(this.staffForm.value.collegeId); 
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
        this.courseListData=[]
        this.searchExams.push({examName: 'Search by Exam name.'});
        this.filteredExams.next(this.searchExams.slice());
     /*----------- COURSES -----------*/
     this.courseListData=this.CollegesListDetails.filter(x=>(x.fk_college_id==collegeId))
          if(this.courseListData.length>0){
              const courseList = this.courseListData.map(({ fk_course_id }) => fk_course_id);
              this.courses = this.courseListData.filter(({ fk_course_id }, index) =>
              !courseList.includes(fk_course_id, index + 1));
          }
          if (this.courses.length > 0){
            this.staffForm.get('courseId').setValue(this.courses[0].fk_course_id);
            this.selectedCourse(this.staffForm.value.courseId); 
         }     
//      if (this.empSecurity.length > 0){
//         let courses = this.empSecurity.filter(x => (x.collegeId === this.staffForm.value.collegeId));
//         for (let i = 0; i < courses.length; i++){
//           if (courses[i].courseId != null){
//               if (this.courses.filter(x => (x.courseId === courses[i].courseId)).length === 0){
//                   this.courses.push(courses[i]);
//               } 
//           }
//         }
//         if (this.courses.length > 0){
//             this.staffForm.get('courseId').setValue(this.courses[0].courseId);
//             this.selectedCourse(this.staffForm.value.courseId); 
//          }
//     }
//     if (this.courses.length === 0){

//         this.crudService.listDetailsByTwoIds(this.courseCrudUrl, collegeId, 'true', this.getDetailsByCollegeIdUrl, this.isActive)
//      .subscribe(result => {
//          if (result.statusCode === 200){
//                  if (result.data.resultList && result.data.resultList !== '') {
//                      this.courses = result.data.resultList; 
//                      if (this.courses.length > 0){
//                        this.staffForm.get('courseId').setValue(this.courses[0].courseId);
//                        this.selectedCourse(this.staffForm.value.courseId); 
//                     }                    
//                  } else {
//                      this.snotifyService.success(result.message, 'Success!');
//                  }
//              }else {
//                this.snotifyService.error(result.message, 'Error!');
//            }
         
//      }, error => {
//        if (error.error.statusCode === 401){
//            this.snotifyService.error(error.error.message, 'Error!');
//            this.genericFunctions.logOut(this.router.url);
//        }else{
//            this.snotifyService.error(CONSTANTS.message.CON_ERROR, 'Error!');
//        }
//   });
// }

//     //  this.crudService.listDetailsByTwoIdsWithSort(this.academicYearCrudUrl, collegeId, 'true', 'DESC', this.getDetailsByCollegeIdUrl, this.isActive, 'fromDate')
//         this.crudService.listDetailsByTwoIdsWithSort(this.academicYearCrudUrl, collegeId, 'true', 'DESC', this.getDetailsByCollegeIdUrl, this.isActive, 'fromDate')
//     .subscribe(result => {
//          if (result.statusCode === 200) {
//              if (result.data.resultList && result.data.resultList !== '') {
//                  this.academicYears = result.data.resultList;
//              } else {
//                  this.snotifyService.success(result.message, 'Success!');
//              }
//          }else {
//            this.snotifyService.error(result.message, 'Error!');
//        }
//      }, error => {
//        if (error.error.statusCode === 401){
//            this.snotifyService.error(error.error.message, 'Error!');
//            this.genericFunctions.logOut(this.router.url);
//        }else{
//            this.snotifyService.error(CONSTANTS.message.CON_ERROR, 'Error!');
//        }
//      });
    }
  
    selectedCourse(courseId): void{
        this.courseGroups = [];
        this.courseYears = [];
        this.staffForm.get('academicYearId').setValue(0);
        this.staffForm.get('regulationId').setValue(0);
        this.staffForm.get('courseGroupId').setValue(0);
        this.staffForm.get('courseYearId').setValue(0);
        this.examRegisteredStudents = [];
        this.searchExams = [];
        this.academicYears=[]
        this.academicYearsList=[]
        this.searchExams.push({examName: 'Search by Exam name.'});
        this.filteredExams.next(this.searchExams.slice());
        this.academicYearsList=this.CollegesListDetails.filter(x=>(x.fk_college_id==this.staffForm.value.collegeId && x.fk_college_id==this.staffForm.value.collegeId))
        if(this.academicYearsList.length>0){
        const academicYears = this.academicYearsList.map(({ fk_academic_year_id }) => fk_academic_year_id);
        this.academicYears = this.academicYearsList.filter(({ fk_academic_year_id }, index) => !academicYears.includes(fk_academic_year_id, index + 1));
        }

if(this.academicYears.length>0){
  this.staffForm.get('academicYearId').setValue(this.academicYears[0].fk_academic_year_id);
  this.selectedAcademicYear( this.staffForm.value.academicYearId)
}
    //     this.crudService.listDetailsByThreeIdsWithSort(this.examMasterUrl, this.staffForm.value.collegeId, courseId, 'true', 'DESC',
    //   this.getDetailsByCollegeIdUrl , this.getDetailsByCourseIdUrl, this.isActive, 'createdDt')
    // .subscribe(result => {
    // this.spinner.hide();
    // if (result.statusCode === 200){
    //       if (result.success) {
    //           this.examsList = result.data.resultList;
    //           this.searchExams = this.examsList;
    //           this.filteredExams.next(this.searchExams.slice());    
    //       }else{
    //         this.snotifyService.success(result.message, 'Success!');
    //       }
    // }else {
    //   this.snotifyService.error(result.message, 'Error!');
    // }
    // }, error => {
    //   this.spinner.hide();
    //   if (error.error.statusCode === 401){
    //       this.snotifyService.error(error.error.message, 'Error!');
    //       this.genericFunctions.logOut(this.router.url);
    // }else{
    //     this.snotifyService.error(CONSTANTS.message.CON_ERROR, 'Error!');
    // }
    // });
  
    //   /*----------- COURSES GROUPS -----------*/   
    //   if (this.empSecurity.length > 0){
    //     let courseGroups1 = this.empSecurity.filter(x => (x.collegeId === this.staffForm.value.collegeId));
    //     let courseGroups = courseGroups1.filter(x => (x.courseId === courseId));
    //     for (let i = 0; i < courseGroups.length; i++){
    //       if (courseGroups[i].courseGroupId != null){
    //           if (this.courseGroups.filter(x => (x.courseGroupId === courseGroups[i].courseGroupId)).length === 0){
    //               courseGroups[i].groupCode = courseGroups[i].courseGroupCode;
    //               this.courseGroups.push(courseGroups[i]);
    //           } 
    //       }
    //     }
        
    //   }
    //   if (this.courseGroups.length === 0){   
    //     this.crudService.listDetailsByTwoIds(this.courseGroupCrudUrl, courseId, 'true', this.getDetailsByCourseIdUrl, this.isActive)
    //   .subscribe(result => {
    //       if (result.statusCode === 200) {
    //           if (result.data.resultList && result.data.resultList !== '') {
    //               this.courseGroups = result.data.resultList;
    //             //   if (this.courseGroups.length > 0){
    //             //     this.staffForm.get('courseGroupId').setValue(this.courseGroups[0].courseGroupId);
    //             //      this.selectedGroup(this.staffForm.value.courseGroupId); 
    //             //  }
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
    //   /*----------- COURSES Years -----------*/      
        
    //   if (this.empSecurity.length > 0){
    //     let courseYear1 = this.empSecurity.filter(x => (x.collegeId === this.staffForm.value.collegeId));
    //     let courseGroups = courseYear1.filter(x => (x.courseId === this.staffForm.value.courseId));
    //     for (let i = 0; i < courseGroups.length; i++){
    //       if (courseGroups[i].courseYearId != null){
    //           if (this.courseYears.filter(x => (x.courseYearId === courseGroups[i].courseYearId)).length === 0){
    //               courseGroups[i].courseYearCode = courseGroups[i].courseYearCode;
    //               this.courseYears.push(courseGroups[i]);
    //           } 
    //       }
    //     }
    //   }
    //   if (this.courseYears.length === 0){
    //     this.crudService.listDetailsByTwoIdsWithSortLtd(this.courseYearCrudUrl, courseId, 'true', 'ASC',
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
    //     this.crudService.listDetailsByTwoIdsWithSort(this.regulationCrudUrl, courseId, 'true', 'desc', this.getDetailsByCourseIdUrl, this.isActive, 'regulationCode')
    //   .subscribe(result => {
    //       if (result.statusCode === 200) {
    //           if (result.data.resultList && result.data.resultList !== '') {
    //               this.regulations = result.data.resultList;
    //           } else {
    //               this.snotifyService.success(result.message, 'Success!');
    //           }
    //       }else {
    //       this.snotifyService.error(result.message, 'Error!');
    //   }
    //   }, error => {
    //   if (error.error.statusCode === 401){
    //       this.snotifyService.error(error.error.message, 'Error!');
    //       this.genericFunctions.logOut(this.router.url);
    //   }else{
    //       this.snotifyService.error(CONSTANTS.message.CON_ERROR, 'Error!');
    //   }
    //   });
    }

    // tslint:disable-next-line:typedef
selectedAcademicYear(academicYearId){
  this.staffForm.get('examId').setValue(0);
  this.examsList = [];
  this.searchExams = [];
  this.examRegisteredStudents = [];
  this.searchExams.push({examName: 'Search by Exam name.'});
  this.filteredExams.next(this.searchExams.slice());
  this.examData = []
  this.examsList = []
  this.examsLists=this.CollegesListDetails.filter(x=>(x.fk_college_id== this.staffForm.value.collegeId && x.fk_course_id==this.staffForm.value.courseId && x.fk_academic_year_id==academicYearId))
if(this.examsLists.length>0){
const examsLists = this.examsLists.map(({ fk_exam_id }) => fk_exam_id);
this.examsList = this.examsLists.filter(({ fk_exam_id }, index) => !examsLists.includes(fk_exam_id, index + 1));
this.examsList  = this.examsList.filter(x=>!x.is_internal_exam)
this.examData = this.examsList;
}
if(this.examsList.length>0){
  this.staffForm.get('examId').setValue(this.examsList[0].fk_exam_id);
  this.selectedExam(this.staffForm.value.examId)
}
  // this.preStaggings = [];
  // this.academicYear = this.academicYears.filter(x => (x.academicYearId === academicYearId))[0].academicYear;
  // tslint:disable-next-line:max-line-length
  // this.crudService.listDetailsByFourIdsWithSortOrder(this.examMasterUrl, this.staffForm.value.collegeId, academicYearId, this.staffForm.value.courseId, 'true',
  //    'DESC', this.getDetailsByCollegeIdUrl , this.getDetailsByAcademicYearIdUrl, this.getDetailsByCourseIdUrl, 'isActive', 'createdDt')
  //     .subscribe(result => {
  //     this.spinner.hide();
  //     if (result.statusCode === 200){
  //         if (result.success) {
  //             this.examsList = [];
  //             // tslint:disable-next-line: prefer-for-of
  //             for (let i = 0; i < result.data.resultList.length; i++){
  //               if (!result.data.resultList[i].isInternalExam){
  //                   this.examsList.push(result.data.resultList[i]);
  //               }
  //             }
  //             this.searchExams = this.examsList;
  //             this.filteredExams.next(this.searchExams.slice());
  //         }else{
  //           this.snotifyService.success(result.message, 'Success!');
  //         }
  //     }else {
  //     this.snotifyService.error(result.message, 'Error!');
  //     }
  //     }, error => {
  //     this.spinner.hide();
  //     if (error.error.statusCode === 401){
  //         this.snotifyService.error(error.error.message, 'Error!');
  //         this.genericFunctions.logOut(this.router.url);
  //     }else{
  //       this.snotifyService.error(CONSTANTS.message.CON_ERROR, 'Error!');
  //     }
  //     });
}
searchExam(value) {
  this.examData = [];
  this.examSearch(value);
}
examSearch(value: string) {
  let filter = value.toLowerCase()
  for (let i = 0; i < this.examsList.length; i++) {
      let option = this.examsList[i];
      if (option.exam_name.toLowerCase().indexOf(filter) >= 0) {
          this.examData.push(option);
      }
  }
}
selectedExam(examId): void{
  this.staffForm.get('regulationId').setValue(0);
      this.staffForm.get('courseGroupId').setValue(0);
      this.staffForm.get('courseYearId').setValue(0);
      this.examRegisteredStudents = [];
      this.courseGroups = [];
      this.courseYears = [];
      this.groupList=[]
      this.regulations=[]
      this.groupList=this.CollegesListDetails.filter(x=>(x.fk_college_id== this.staffForm.value.collegeId && x.fk_course_id==this.staffForm.value.courseId && x.fk_academic_year_id==this.staffForm.value.academicYearId &&  x.fk_exam_id==this.staffForm.value.examId))
     if(this.groupList.length>0){
     const groupList = this.groupList.map(({ fk_course_group_id }) => fk_course_group_id);
     this.courseGroups = this.groupList.filter(({ fk_course_group_id }, index) => !groupList.includes(fk_course_group_id, index + 1));
     }
     if (this.courseGroups.length > 0){
      this.staffForm.get('courseGroupId').setValue(this.courseGroups[0].fk_course_group_id);
       this.selectedGroup(this.staffForm.value.courseGroupId); 
   }
}
selectedRegulation(): void{
  this.examRegisteredStudents = [];
}

selectedGroup(courseGroupId): void{
    this.staffForm.get('regulationId').setValue(0);
    this.staffForm.get('courseYearId').setValue(0);
    this.examRegisteredStudents = [];
    this.courseYears = [];
    this.regulations=[]
    this.courseYearsList=[]
    /*----------- COURSES Years -----------*/      
    this.courseYearsList=this.CollegesListDetails.filter(x=>(x.fk_college_id== this.staffForm.value.collegeId && x.fk_course_id==this.staffForm.value.courseId && x.fk_academic_year_id==this.staffForm.value.academicYearId && x.fk_exam_id==this.staffForm.value.examId && x.fk_course_group_id==this.staffForm.value.courseGroupId))
       if(this.courseYearsList.length>0){
       const courseYearsList = this.courseYearsList.map(({ fk_course_year_id }) => fk_course_year_id);
       this.courseYears = this.courseYearsList.filter(({ fk_course_year_id }, index) => !courseYearsList.includes(fk_course_year_id, index + 1));
       }
       if(this.courseYears.length>0){
        this.staffForm.get('courseYearId').setValue(this.courseYears[0].fk_course_year_id);
        this.selectedYear(this.staffForm.value.courseYearId)
      }
}

selectedYear(courseYearId): void{
  this.examRegisteredStudents = [];
  this.regulationsList=[]
  this.staffForm.get('regulationId').setValue(0);
  this.regulationsList=this.CollegesListDetails.filter(x=>(x.fk_college_id== this.staffForm.value.collegeId && x.fk_course_id==this.staffForm.value.courseId && x.fk_academic_year_id==this.staffForm.value.academicYearId && x.fk_exam_id==this.staffForm.value.examId && x.fk_course_group_id==this.staffForm.value.courseGroupId && x.fk_course_year_id==this.staffForm.value.courseYearId))
  if(this.regulationsList.length>0){
  const regulationsList = this.regulationsList.map(({ fk_regulation_id }) => fk_regulation_id);
  this.regulations = this.regulationsList.filter(({ fk_regulation_id }, index) => !regulationsList.includes(fk_regulation_id, index + 1));
  }
  if(this.regulations.length>0){
   this.staffForm.get('regulationId').setValue(this.regulations[0].fk_regulation_id);
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

  // tslint:disable-next-line:typedef
  // applyFilter(filterValue: string) {
  //   this.dataSource.filter = filterValue.trim().toLowerCase();
  //   if (this.dataSource.paginator) {
  //       this.dataSource.paginator.firstPage();
  //   }
  // }

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
          this.columns = [];
          this.examRegisteredStudents = [];

          this.collegeCode =this.colleges.filter(x=>x.fk_college_id==this.staffForm.value.collegeId)[0].college_code, 
      this.courseCode = this.courses.filter(x=>x.fk_course_id==this.staffForm.value.courseId)[0].course_code
      this.courseGroupCode =this.courseGroups.filter(x=>x.fk_course_group_id==this.staffForm.value.courseGroupId)[0].group_code;
      this.courseYearCode = this.courseYears.filter(x=>x.fk_course_year_id==this.staffForm.value.courseYearId)[0].course_year_name;
      this.exam = this.examsList.filter(x=>x.fk_exam_id==this.staffForm.value.examId)[0].exam_name;
      this.regulationCode =this.regulations.filter(x=>x.fk_regulation_id==this.staffForm.value.regulationId)[0].regulation_code;

          // this.dataSource = new MatTableDataSource<any>(this.examRegisteredStudents);
          // this.dataSource.paginator = this.paginator;
          // this.dataSource.sort = this.sort;
          if (this.staffForm.value.studentId === ''){
            this.staffForm.get('studentId').setValue(0);
          }
          /*----------- STUDENTS -----------*/
         // tslint:disable-next-line:max-line-length
          this.crudService.listByTwelveIds(this.examStudentResultsUrl, 'std_yearly', this.staffForm.value.examId, this.staffForm.value.courseId, 
            this.staffForm.value.collegeId,this.staffForm.value.courseGroupId, this.staffForm.value.courseYearId, this.staffForm.value.studentId, 
          this.staffForm.value.regulationId, this.staffForm.value.isPass, 0, '-1', '-1',
         'in_flag', 'in_exam_id', 'in_course_id', 'in_college_id', 'in_course_group_id', 'in_course_year_id', 'in_std_id', 
         'in_regulation_id', 'in_ispass', 'in_subject_id', 'in_above_fail_subjects', 'in_below_credits')
           .subscribe(result => {
                this.spinner.hide();
                if (result.statusCode === 200){
                     if (result.success) {
                         if (result.data.result[0].length > 0){
                              this.examRegisteredStudents = result.data.result[0];

                              this.pivotData = result.data.result[0];
                              this.showPivotTable();
              
              

                              this.keys = Object.keys(this.examRegisteredStudents[0]);
                
                              // tslint:disable-next-line: prefer-for-of
                              // for (let i = 0; i < this.keys.length; i++){
                              //     const key = this.keys[i];
                              //     this.columns.push({
                              //         columnDef: this.keys[i], header: this.keys[i]
                              //      });
                              // }
              
                              // this.displayedColumns = this.columns.map(c => c.columnDef);
                              // this.dataSource = new MatTableDataSource<any>(this.examRegisteredStudents);
                              // this.dataSource.paginator = this.paginator;
                              // this.dataSource.sort = this.sort;
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

     // Structure of the pivot table
  showPivotTable(): void {
    this.dataSource = {
      dataSource: this.pivotData,
      expandAll: false,
      rows: [{ name: 'student_name', caption: 'Student Name' }, { name: 'subject_code', caption: 'Subject Code' }],
      columns: [
        { name: 'course_year_code', caption: 'Course Year' },
      ],
      values: [
        { name: 'internal_marks', caption: 'Internal Marks' },
        { name: 'external_marks', caption: 'External Marks' },
        { name: 'grade', caption: 'Grade' },
        { name: 'grade_points', caption: 'Grade Points' },
        { name: 'credits', caption: 'Credits' },
        { name: 'is_pass', caption: 'Result' }
      ],
      filters: [],
      // more options like conditional formatting and filters are there as per the business requirement.
    };

    this.width = '100%';
    this.height = '100%';
  }

  // Export the table data into excel sheet xlsx file format is supported
  exportToExcel(): void {
    this.pivotGridObj.excelExport();
  }

  // Export the table data into pdf format 
  exportToPDF(): void {
    this.pivotGridObj.pdfExport();
  }


}
