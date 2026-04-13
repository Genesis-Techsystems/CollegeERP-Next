import { Component, OnInit } from '@angular/core';
import { CONSTANTS } from 'app/main/common/constants';
import { FormGroup, FormControl, FormBuilder, Validators } from '@angular/forms';
import { College } from 'app/main/models/college';
import { Course } from 'app/main/models/course';
import { CourseGroup } from 'app/main/models/courseGroup';
import { Regulations } from 'app/main/models/Rregulations';
import { CourseYear } from 'app/main/models/courseYearRegulation';
import { Subject, ReplaySubject } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';
import { SnotifyService } from 'ng-snotify';
import { CrudService } from 'app/main/services/crud.service';
import { NgxSpinnerService } from 'ngx-spinner';
import { MatDialog } from '@angular/material/dialog';
import { GenericFunctions } from 'app/main/common/generic-functions';
import { takeUntil } from 'rxjs/operators';
import *  as moment from 'moment';

import { GlobalService } from 'app/main/services/global.service';

@Component({
  selector: 'app-course-year-timetable-report',
  templateUrl: './course-year-timetable-report.component.html',
  styleUrls: ['./course-year-timetable-report.component.scss']
})
export class CourseYearTimetableReportComponent implements OnInit {

  panelOpenState = true;

  private collegeCrudUrl = CONSTANTS.collegeCrudUrl;
  private courseCrudUrl = CONSTANTS.courseCrudUrl;
  private courseGroupCrudUrl = CONSTANTS.courseGroupCrudUrl;
  private getDetailsByCollegeIdUrl = CONSTANTS.getDetailsByCollegeIdUrl;
  private getDetailsByCourseIdUrl = CONSTANTS.getDetailsByCourseIdUrl;
  private courseYearCrudUrl = CONSTANTS.courseYearCrudUrl;
  private examMasterUrl = CONSTANTS.examMasterUrl;
  private examAllotmentDetailsUrl = CONSTANTS.examAllotmentDetailsUrl;
  private isActive = CONSTANTS.isActive;
  private regulationCrudUrl = CONSTANTS.regulationCrudUrl;
  private getDetailsByAcademicYearIdUrl = CONSTANTS.getDetailsByAcademicYearIdUrl;
  private academicYearCrudUrl = CONSTANTS.academicYearCrudUrl;
  private sortOrder = CONSTANTS.sortOrder;

  staffForm: FormGroup;
  colleges: College[] = [];
  courses: Course[] = [];
  courseGroups: CourseGroup[] = [];
  regulations: Regulations[] = [];
  courseYears: CourseYear[] = [];
  step = 0;  
  subjectCourseYears: any[] = [];
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
  isHOD;
  collegeId;
  dashboard;
  pageParams: any = {};
  searchEmployees = [];
  searchExams = [];
  examsList = [];
  academicYears = [];
  dateArray = [];
  groupWiseTimetable = [];
  groupArray = [];

  empSecurity = [];
  isAdmin = false;
  private _onDestroy = new Subject<void>();

  public examFilterCtrl: FormControl = new FormControl();
  public filteredExams: ReplaySubject<any[]> = new ReplaySubject<any[]>(1);

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
        courseGroupId: ['', Validators.required],
        courseYearId: ['', Validators.required],
        regulationId: [0], 
        academicYearId: ['', Validators.required], 
        empId: [0],
        examId: ['', Validators.required],
      }); 

    this.examFilterCtrl.valueChanges
      .pipe(takeUntil(this._onDestroy))
      .subscribe(() => {
        this.filterExam();
    });
    if (this.colleges.length > 0){
        this.staffForm.get('collegeId').setValue(this.colleges[0].collegeId);
        this.selectedCollege(this.staffForm.value.collegeId); 
     } 

    this.searchExams.push({examName: 'Search by Exam name.'});
    this.filteredExams.next(this.searchExams.slice());
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

  getData(): void{
    /*----------- COLLEGES -----------*/
    this.crudService.listDetailsById(this.collegeCrudUrl, 'true', this.isActive)
         .subscribe(result => {
             if (result.statusCode === 200){
                     if (result.data.resultList && result.data.resultList !== '') {
                         this.colleges = result.data.resultList;                   
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
      this.staffForm.get('courseGroupId').setValue(0);
      this.staffForm.get('courseYearId').setValue('');
      this.staffForm.get('empId').setValue(0);
      this.staffForm.get('regulationId').setValue('');
      this.staffForm.get('academicYearId').setValue('');
      this.groupWiseTimetable = [];
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
            this.selectedCourse(this.staffForm.value.courseId); 
         }
    }
    if (this.courses.length === 0){
   /*----------- COURSES -----------*/
      this.crudService.listDetailsByTwoIds(this.courseCrudUrl, collegeId, 'true', this.getDetailsByCollegeIdUrl, this.isActive)
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

  selectedCourse(courseId): void{
      this.courseGroups = [];
      this.courseYears = [];
      this.staffForm.get('courseGroupId').setValue(0);
      this.staffForm.get('academicYearId').setValue('');
      this.staffForm.get('courseYearId').setValue('');
      this.staffForm.get('empId').setValue(0);
      this.staffForm.get('regulationId').setValue('');
      this.groupWiseTimetable = [];
      this.searchExams = [];
      this.searchExams.push({examName: 'Search by Exam name.'});
      this.filteredExams.next(this.searchExams.slice());

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
  this.staffForm.get('empId').setValue(0);
  this.examsList = [];
  this.searchExams = [];
  this.groupWiseTimetable = [];
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

  selectedGroup(courseGroupId): void{
      this.groupWiseTimetable = [];
  }

  selectedRegulation(regulationId): void{
    this.groupWiseTimetable = [];
  }

  selectedYear(courseYearId): void{
    this.groupWiseTimetable = [];
  }

   // tslint:disable-next-line:typedef
   dataRefresh(){
    this.groupWiseTimetable = [];
  }

  selectedExam(examId): void{
    this.groupWiseTimetable = [];
  }

  getWeekdayName(no): any{
    if (CONSTANTS.weekdays.filter(x => (x.sno === no)).length > 0){
        return CONSTANTS.weekdays.filter(x => (x.sno === no))[0].name;
    }
  }

  getDetails(): void{ 
    if (this.staffForm.valid){
      this.fromDate = '1990-01-01';
      this.toDate = '9999-12-31';
      this.dateArray = [];
      this.groupArray = [];
      this.groupWiseTimetable = [];
      this.spinner.show();
      this.subjectCourseYears = [];
        /*----------- STUDENTS -----------*/
       // tslint:disable-next-line:max-line-length
      this.crudService.listByThirteenIds(this.examAllotmentDetailsUrl, 'exam_timetable', this.staffForm.value.examId, this.staffForm.value.courseId, 
        this.staffForm.value.courseGroupId, this.staffForm.value.courseYearId, 0, 0, this.staffForm.value.regulationId, this.fromDate,
         this.toDate,0,0,0,
       'in_flag', 'in_exam_id', 'in_course_id', 'in_course_group_id', 'in_course_year_id', 'in_std_id', 'in_invgilator_emp_id', 
       'in_regulation_id', 'from_exam_date', 'to_exam_date','in_subject_id','in_room_id','in_session_id')
         .subscribe(result => {
              this.spinner.hide();
              if (result.statusCode === 200){
                   if (result.success) {
                       if (result.data.result[0].length > 0){
                            this.subjectCourseYears = result.data.result[0];  

                            // tslint:disable-next-line: prefer-for-of
                            for (let i = 0; i < this.subjectCourseYears.length; i++){
                                 if (this.dateArray.filter(x => (x.date === this.subjectCourseYears[i].exam_date)).length === 0){
                                     this.dateArray.push({
                                        date: this.subjectCourseYears[i].exam_date,
                                        dayName: this.getWeekdayName(this.genericFunctions.momentFormatW(this.subjectCourseYears[i].exam_date)),
                                     });
                                 }
                                //  if (this.groupArray.filter(x => (x.group === this.subjectCourseYears[i].group_code)).length === 0){
                                //     this.groupArray.push({
                                //       group: this.subjectCourseYears[i].group_code
                                //     });
                                //  }
                            }


                            // tslint:disable-next-line: prefer-for-of
                            for (let i = 0; i < this.subjectCourseYears.length; i++){

                                 // tslint:disable-next-line: prefer-for-of
                                 for (let j = 0; j < this.dateArray.length; j++){
                                    if (this.groupWiseTimetable.filter(x => (x.group === this.subjectCourseYears[i].group_code)).length > 0){
                                      if (this.groupWiseTimetable.filter(x => (x.group === this.subjectCourseYears[i].group_code))[0].
                                      schedule.filter(y => (y.date === this.dateArray[j].date)).length === 0){
                                      if (this.groupWiseTimetable.filter(x => (x.group === this.subjectCourseYears[i].group_code))[0].
                                      schedule.filter(y => (y.subject_code === this.subjectCourseYears[i].subject_code)).length === 0){
                                        this.groupWiseTimetable.filter(x => (x.group === this.subjectCourseYears[i].group_code))[0].schedule.push({
                                          date: this.dateArray[j].date,
                                          subject: this.subjectCourseYears[i].subject_name,
                                          subject_code: this.subjectCourseYears[i].subject_code,
                                          exam_type: this.subjectCourseYears[i].exam_type,
                                        });
                                      }
                                    }
                                    }else{
                                       this.groupWiseTimetable.push({
                                         group: this.subjectCourseYears[i].group_code,
                                         session: this.subjectCourseYears[i].exam_session_name,
                                         schedule: [{
                                           date: this.dateArray[j].date,
                                           subject: this.subjectCourseYears[i].subject_name,
                                           subject_code: this.subjectCourseYears[i].subject_code,
                                           exam_type: this.subjectCourseYears[i].exam_type,
                                         }],
                                       });
                                    }
                                 } 
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

  // tslint:disable-next-line:typedef
  selectedDate(){
    this.subjectCourseYears = [];
   // this.staffForm.get('groupSectionId').setValue('');
  }

}
