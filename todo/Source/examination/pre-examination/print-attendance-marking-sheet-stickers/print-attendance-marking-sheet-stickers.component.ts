import { Component, OnInit, ViewChild } from '@angular/core';
import {Location} from '@angular/common';
import { CONSTANTS } from 'app/main/common/constants';
import { FormGroup, FormBuilder, Validators, FormControl } from '@angular/forms';
import { Course } from 'app/main/models/course';
import { ExamMaster } from 'app/main/models/examMaster';
import { SnotifyService } from 'ng-snotify';
import { CrudService } from 'app/main/services/crud.service';
import { NgxSpinnerService } from 'ngx-spinner';
import { Router, ActivatedRoute } from '@angular/router';
import { GenericFunctions } from 'app/main/common/generic-functions';
import { College } from 'app/main/models/college';
import { AcademicYear } from 'app/main/models/academicYear';
import { CourseGroup } from 'app/main/models/courseGroup';
import { CourseYear } from 'app/main/models/courseYear';
import { Subject, ReplaySubject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { isEmpty } from 'lodash';
import { ParametersService } from 'app/main/services/parameters.service';

@Component({
  selector: 'app-print-attendance-marking-sheet-stickers',
  templateUrl: './print-attendance-marking-sheet-stickers.component.html',
  styleUrls: ['./print-attendance-marking-sheet-stickers.component.scss']
})
export class PrintAttendanceMarkingSheetStickersComponent implements OnInit {

  displayedColumns: string[] = ['id', 'admissionNumber', 'firstName', 'subjectCode','isPresent', 'mark'];
  dataSource: MatTableDataSource<any>;

  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild(MatSort) sort: MatSort;

    private collegeCrudUrl = CONSTANTS.collegeCrudUrl;
    private academicYearCrudUrl = CONSTANTS.academicYearCrudUrl;
    private courseCrudUrl = CONSTANTS.courseCrudUrl;
    private getDetailsByCollegeIdUrl = CONSTANTS.getDetailsByCollegeIdUrl;
    private examMasterUrl = CONSTANTS.examMasterUrl;
    private getDetailsByCourseIdUrl = CONSTANTS.getDetailsByCourseIdUrl;
    private examSessionUrl = CONSTANTS.examSessionUrl;
    private courseByIdUrl = CONSTANTS.courseByIdUrl;
    private examStudentDetailsUrl = CONSTANTS.examStudentDetailsUrl;
    private collegeByIdUrl = CONSTANTS.collegeByIdUrl;
    private examIdUrl = CONSTANTS.examIdUrl;
    private isActive = CONSTANTS.isActive;
    private courseGroupCrudUrl = CONSTANTS.courseGroupCrudUrl;
    private courseYearCrudUrl = CONSTANTS.courseYearCrudUrl;
    private getDetailsByAcademicYearIdUrl = CONSTANTS.getDetailsByAcademicYearIdUrl;
    private getExamAllotmentDetailsUrl = CONSTANTS.getExamAllotmentDetailsUrl;
    private buildingdetailsSearchurl = CONSTANTS.buildingdetailsSearchurl;
    private employeeSearchUrl = CONSTANTS.employeeSearchUrl;
    private sortOrder = CONSTANTS.sortOrder;
    private roomCrudUrl = CONSTANTS.roomCrudUrl;

    
    examAttendanceForm: FormGroup;
    colleges: College[] = [];
    academicYears: AcademicYear[] = [];
    courses: Course[] = [];
    courseGroups: CourseGroup[] = [];
    courseYears: CourseYear[] = [];
    examsList: ExamMaster[] = [];
    examSessions: any[] = [];
    examStudentList: any[] = [];
    // students: any[] = [];
    absents = [];
    collegeId;
    minDate;
    maxDate;
    course;
    panelOpenState = true;
    step = 0; 
    collegeCode; 
    examDetails;
    examSessionDetails;
    examType;
    examSessionName;
    dateConvert;
    flag = false;
    check = true;
    examDate = this.genericFunctions.momentWithDateFormatYMD(this.genericFunctions.moment()) ;
    searchExams = [];
    searchRooms = [];
    searchEmployees = [];
    searchText:any;

    public examFilterCtrl: FormControl = new FormControl();
    private _onDestroy = new Subject<void>();
    public filteredExam: ReplaySubject<any[]> = new ReplaySubject<any[]>(1); 

    public roomFilterCtrl: FormControl = new FormControl();
    public filteredRooms: ReplaySubject<any[]> = new ReplaySubject<any[]>(1);

    public employeeFilterCtrl: FormControl = new FormControl();
    public filteredEmployees: ReplaySubject<any[]> = new ReplaySubject<any[]>(1);
    examStudentList1: any[] = [];
  params: any;
  rooms=[];
  rooms1=[];
  PageNoList=[];
  newList=[];
  mainList:any[]=[];
  lastList=[];

    constructor(private formBuilder: FormBuilder, private snotifyService: SnotifyService, private _location: Location,
                private crudService: CrudService, private spinner: NgxSpinnerService, private router: Router,
                private genericFunctions: GenericFunctions, private route: ActivatedRoute,
               private paramaters:ParametersService) {
        this.getData();
    }
    

    // tslint:disable-next-line: typedef
    ngOnInit() {

        this.examAttendanceForm = this.formBuilder.group({
            courseId: ['', Validators.required],
            collegeId: ['', Validators.required],
            academicYearId: ['', Validators.required],
            roomId: [''],
            employeeId: [''],
            courseGroupId: [''],
            courseYearId: [''],
            examId: ['', Validators.required],
            examSessionId: [''],
            examDate: [this.genericFunctions.moment(), Validators.required],
        });
        if (this.paramaters.examAttendanceMarking) {
          this.params = this.paramaters.examAttendanceMarking[0];
          this.examAttendanceForm.get('collegeId').setValue(this.params.collegeId);
          this.examAttendanceForm.get('examId').setValue(this.params.examId);
          this.examAttendanceForm.get('examSessionId').setValue(this.params.examSessionId);
          this.examAttendanceForm.get('employeeId').setValue(this.params.employeeId);
          this.examAttendanceForm.get('roomId').setValue(this.params.roomId);
          this.examAttendanceForm.get('courseGroupId').setValue(this.params.courseGroupId);
          this.examAttendanceForm.get('courseYearId').setValue(this.params.courseYearId);
          this.examAttendanceForm.get('examDate').setValue(this.params.examDate);
        }
        this.examFilterCtrl.valueChanges
        .pipe(takeUntil(this._onDestroy))
        .subscribe(() => {
          this.filterExam();
        });
  
        this.roomFilterCtrl.valueChanges
        .pipe(takeUntil(this._onDestroy))
        .subscribe(() => {
          this.filterRoom();
        });
       
  
        this.searchExams.push({firstName: 'Search by Exam.'});  
        this.filteredExam.next(this.searchExams.slice()); 

        this.searchRooms.push({ roomName: 'Search by Room name or Number.' });
        this.filteredRooms.next(this.searchRooms.slice());

        this.searchEmployees.push({firstName: 'Search by Employee name or Id.'});  
        this.filteredEmployees.next(this.searchEmployees.slice()); 

        this.dataSource = new MatTableDataSource<any>(this.examStudentList);
        this.dataSource.paginator = this.paginator;
        this.dataSource.sort = this.sort;
        this.roomDetails();
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

      filterRoom(): void {
        if (!this.searchRooms) {
          return;
        }
        // get the search keyword
        let search = this.roomFilterCtrl.value;
        if (!search) {
          this.filteredRooms.next(this.searchRooms.slice());
          return;
        } else {
          search = search.toLowerCase();
        }
        // filter the banks
        this.filteredRooms.next(
          this.searchRooms.filter(x => x.firstName.toLowerCase().indexOf(search) > -1)
        );
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
      // tslint:disable-next-line: max-line-length
      this.searchEmployees.filter(x => (x.firstName != null && x.firstName.toLowerCase().indexOf(search) > -1 || x.empNumber != null && x.empNumber.toLowerCase().indexOf(search) > -1))
    );
  }

  enteredEmployee(event, name): void{
    if (name !== 'params'){
        if (event.target.value.length > 4){

        /*----------- EMPLOYEE -----------*/
        this.crudService.listByIds(this.employeeSearchUrl, event.target.value, 'q'  )
            .subscribe(result => {
                if (result.statusCode === 200){
                        if (result.data && result.data !== '') {  
                            this.searchEmployees = result.data;
                            this.filteredEmployees.next(this.searchEmployees.slice());                
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


      enteredRoom(event): void {
        if (event.target.value.length > 2) {
          /*----------- STUDENTS -----------*/
          this.crudService.listByIds(this.buildingdetailsSearchurl, event.target.value, 'q')
            .subscribe(result => {
              if (result.statusCode === 200) {
                if (result.data && result.data !== '') {
                  this.searchRooms = result.data;
                  this.filteredRooms.next(this.searchRooms.slice());
                }
              } else {
                this.snotifyService.error(result.message, 'Error!');
              }
            }, error => {
              if (error.error.statusCode === 401) {
                this.snotifyService.error(error.error.message, 'Error!');
                this.genericFunctions.logOut(this.router.url);
              } else {
                this.snotifyService.error(CONSTANTS.message.CON_ERROR, 'Error!');
              }
            });
        }
        // else{
        //   this.snotifyService.info(' Please search room after selecting the exam timetabel', 'info');
        // }
      }    

    getData(): void{
  
      /*----------- COLLEGES -----------*/
      this.crudService.listDetailsById(this.collegeCrudUrl, 'true', this.isActive)
           .subscribe(result => {
               if (result.statusCode === 200){
                       if (result.data.resultList && result.data.resultList !== '') {
                           this.colleges = result.data.resultList;   
                           if (this.paramaters.examAttendanceMarking)
                           this.selectedCollege(this.examAttendanceForm.value.collegeId)
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
      this.examAttendanceForm.get('academicYearId').setValue('');
      this.examAttendanceForm.get('courseId').setValue('');
      this.examAttendanceForm.get('courseGroupId').setValue('');
      this.examAttendanceForm.get('courseYearId').setValue('');
      this.academicYears = [];
      this.courses = [];
      this.courseGroups = [];
      this.courseYears = [];
      this.examStudentList = [];
      this.dataSource = new MatTableDataSource<any>(this.examStudentList);
    /*----------- ACADEMIC YEARS -----------*/
  //  this.crudService.listDetailsByTwoIdsWithSort(this.academicYearCrudUrl, collegeId, 'true', 'DESC', this.getDetailsByCollegeIdUrl, this.isActive, 'fromDate')
      this.crudService.listDetailsByTwoIdsWithSort(this.academicYearCrudUrl, collegeId, 'true', 'DESC', this.getDetailsByCollegeIdUrl, this.isActive, 'fromDate')
    .subscribe(result => {
        if (result.statusCode === 200) {
            if (result.data.resultList && result.data.resultList !== '') {
                this.academicYears = result.data.resultList;
        if (this.paramaters.examAttendanceMarking){
          this.examAttendanceForm.get('academicYearId').setValue(this.params.academicYearId);
          this.selectedAcademicYear(this.examAttendanceForm.value.academicYearId)
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


    // tslint:disable-next-line:typedef
    selectedAcademicYear(academicYearId) {
      this.examStudentList = [];
      this.dataSource = new MatTableDataSource<any>(this.examStudentList);
        /*----------- COURSES -----------*/
      if (academicYearId != null && academicYearId !== undefined) {
            this.crudService.listDetailsByTwoIds(this.courseCrudUrl, this.examAttendanceForm.value.collegeId, 'true', this.getDetailsByCollegeIdUrl, this.isActive)
                .subscribe(result => {
                    if (result.statusCode === 200) {
                        if (result.data.resultList && result.data.resultList !== '') {
                            this.courses = result.data.resultList;
                            if (this.paramaters.examAttendanceMarking){
                            this.examAttendanceForm.get('courseId').setValue(this.params.courseId)
                            this.selectedCourse(this.examAttendanceForm.value.courseId)
                            }
                                  } else {
                            this.snotifyService.success(result.message, 'Success!');
                        }
                    } else {
                        this.snotifyService.error(result.message, 'Error!');
                    }

                }, error => {
                    if (error.error.statusCode === 401) {
                        this.snotifyService.error(error.error.message, 'Error!');
                        this.genericFunctions.logOut(this.router.url);
                    } else {
                        this.snotifyService.error(CONSTANTS.message.CON_ERROR, 'Error!');
                    }
                });
        }
    }

    selectedCourse(courseId): void {
        this.examAttendanceForm.get('examId').setValue('');
        this.examAttendanceForm.get('examSessionId').setValue('');
        this.examsList = [];
        this.searchExams = this.examsList;
        this.filteredExam.next(this.searchExams.slice()); 
        this.examStudentList = [];
        this.dataSource = new MatTableDataSource<any>(this.examStudentList);
        this.flag = false;
        if (courseId !== null && courseId !== undefined) {
          this.course = this.courses.filter(x => (x.courseId === courseId))[0].courseCode;
            /*----------- Exams List -----------*/
            // this.crudService.listDetailsByThreeIdsWithSort(this.examMasterUrl, this.examAttendanceForm.value.collegeId, courseId, 'true', 'DESC',
            //         this.getDetailsByCollegeIdUrl, this.getDetailsByCourseIdUrl, this.isActive, 'createdDt')
            //     .subscribe(result => {
                // tslint:disable-next-line:max-line-length
          this.crudService.listDetailsByFourIdsWithSortOrder(this.examMasterUrl, this.examAttendanceForm.value.collegeId, this.examAttendanceForm.value.academicYearId, courseId, 'true',
  'DESC', this.getDetailsByCollegeIdUrl , this.getDetailsByAcademicYearIdUrl, this.getDetailsByCourseIdUrl, 'isActive', 'createdDt')
   .subscribe(result => {
                    this.spinner.hide();
                    if (result.statusCode === 200) {
                        if (result.success) {
                            this.examsList = result.data.resultList;
                            this.searchExams = this.examsList;
                            this.filteredExam.next(this.searchExams.slice()); 
                            if (this.paramaters.examAttendanceMarking){
                              this.examAttendanceForm.get('examId').setValue(this.params.examId)
                            this.selectedExam(this.examAttendanceForm.value.examId)
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

                /*----------- COURSES GROUPS -----------*/      
          this.crudService.listDetailsByTwoIds(this.courseGroupCrudUrl, courseId, 'true', this.getDetailsByCourseIdUrl, this.isActive)
    .subscribe(result => {
        if (result.statusCode === 200) {
            if (result.data.resultList && result.data.resultList !== '') {
                this.courseGroups = result.data.resultList;
               
                
            } else {
                this.snotifyService.success(result.message, 'Success!');
            }
        } else {
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

    selectedExam(examId): void{
      this.examStudentList = [];
      this.dataSource = new MatTableDataSource<any>(this.examStudentList);
      this.minDate = this.genericFunctions.momentWithDateFormatYMD(this.examsList.filter(x => (x.examId === examId))[0].fromDate);
      this.examAttendanceForm.get('examDate').setValue( this.minDate);
      this.examDate = this.genericFunctions.momentWithDateFormatYMD(this.examAttendanceForm.value.examDate); // new Date(this.data.issueTodate);
      this.maxDate =  this.genericFunctions.momentWithDateFormatYMD(this.examsList.filter(x => (x.examId === examId))[0].toDate);
      this.flag = false;
      if (examId !== null && examId !== undefined){
        this.examDetails = this.examsList.filter(x => (x.examId === examId))[0];
       /* -------- EXAM SESSIONS -------*/
        this.crudService.listDetailsByTwoIds(this.examSessionUrl, this.examAttendanceForm.value.collegeId, 'true', this.getDetailsByCollegeIdUrl, this.isActive)
       .subscribe(result => {
          this.spinner.hide();
          if (result.statusCode === 200){
               if (result.data && result.data !== '') {
                   this.examSessions = result.data.resultList;
                   if (this.paramaters.examAttendanceMarking){
                    this.examAttendanceForm.get('examSessionId').setValue(this.params.examSessionId)
                   this.selectedSession(this.examAttendanceForm.value.examSessionId)
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

  selectedEmp(): void{
    this.examAttendanceForm.get('roomId').setValue(0);
    this.examStudentList = [];
    this.dataSource = new MatTableDataSource<any>(this.examStudentList);
  }
  getStudentsList(): void{
    if ( this.examAttendanceForm.valid){
      this.flag = false;
      this.examStudentList = [];
      this.PageNoList =[];
      this.mainList=[];
      this.dataSource = new MatTableDataSource<any>(this.examStudentList);
        /* -------- EXAM SESSIONS -------*/
      this.crudService.listByFourteenIds(this.getExamAllotmentDetailsUrl, 
           'invigilator_room_details' ,
         this.examAttendanceForm.value.examId, 
         this.examAttendanceForm.value.collegeId,
         this.examAttendanceForm.value.courseId, 
         this.examAttendanceForm.value.courseGroupId, 
         this.examAttendanceForm.value.courseYearId,
         this.examAttendanceForm.value.roomId, 

         0,  this.examAttendanceForm.value.employeeId?this.examAttendanceForm.value.employeeId:0, 0, this.examDate, this.examDate,0,
         this.examAttendanceForm.value.examSessionId,
         'in_flag', 'in_exam_id','in_college_id', 'in_course_id', 'in_course_group_id', 'in_course_year_id', 'in_room_id','in_std_id', 'in_invgilator_emp_id',
          'in_regulation_id', 'from_exam_date', 'to_exam_date','in_subject_id','in_session_id')
       .subscribe(result => {
           this.spinner.hide();
           if (result.statusCode === 200){
                if (result.data && result.data !== '' && result.data.result.length > 0) {
                    this.examStudentList =  result.data.result[0];
                           this.newList=[];
                    const CourseCode = this.examStudentList.map(({ pageno }) => pageno);
                    this.PageNoList = this.examStudentList.filter(({ pageno }, index) =>
                       !CourseCode.includes(pageno, index + 1));
                       for(let i=0;i<this.PageNoList.length;i++){
                       this.newList=[];
                        for(let j=0;j<this.examStudentList.length;j++){
                              if(this.PageNoList[i].pageno==this.examStudentList[j].pageno){
                                         this.newList.push(this.examStudentList[j])
                              }
                        }
                        this.mainList.push(this.newList);
                       
                    
                      

                       }
                       
                       this.examStudentList
                    this.absents=[];
                    for ( let i = 0 ; i < this.examStudentList.length ; i++) {
                    if(this.examStudentList[i].is_present == false){
                      this.absents.push(this.examStudentList[i])
                    }
                    //  this.examStudentList[i].checked = this.examStudentList[i].is_present;
                    //  this.examStudentList[i].isPresent = true;
                    if(this.examStudentList[i].is_present == null){
                      this.examStudentList[i].is_present = true
                    }
                    }
                    this.dataSource = new MatTableDataSource<any>(this.examStudentList);
                    this.flag = true;
                    this.heading()
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
heading() {
  let h1 = this.colleges.filter(x => (x.collegeId === this.examAttendanceForm.value.collegeId));
  this.collegeCode = h1[0].collegeCode
}

  tConvert(time): any{
    if (time !== null && time !== undefined){
       time = time.toString ().match (/^([01]\d|2[0-3])(:)([0-5]\d)(:[0-5]\d)?$/) || [time];
       if (time.length > 1) { // If time format correct
         time = time.slice (1);  // Remove full string match value
         time[5] = +time[0] < 12 ? 'AM' : 'PM'; // Set AM/PM
         time[0] = +time[0] % 12 || 12; // Adjust hours
       }
       time = time[0] + time[1] + time[2] + ' ' + time[5];
       return time; 
    }
 }

 selectedSession(examSessionId): void{
    this.examAttendanceForm.get('courseGroupId').setValue(0);
    this.examAttendanceForm.get('courseYearId').setValue(0);
    this.examAttendanceForm.get('roomId').setValue(0);
    if ( examSessionId !== null && examSessionId !== undefined){
  this.examSessionDetails = this.examSessions.filter(x => (x.examSessionId === examSessionId))[0];
  this.examStudentList = [];
  this.dataSource = new MatTableDataSource<any>(this.examStudentList);
}
 if (this.paramaters.examAttendanceMarking){
  this.examAttendanceForm.get('courseGroupId').setValue(this.params.courseGroupId);
   this.selectedGroup(this.examAttendanceForm.value.courseGroupId)
 }
 }

selectedRoom(): void{
  this.courseYears = [];
  this.examAttendanceForm.get('courseGroupId').setValue(0);
  this.examAttendanceForm.get('courseYearId').setValue(0);
  this.examStudentList = [];
  this.dataSource = new MatTableDataSource<any>(this.examStudentList);
/*----------- COURSES GROUPS -----------*/      
// this.crudService.listDetailsByTwoIds(this.courseGroupCrudUrl, this.examAttendanceForm.value.courseId, 'true', this.getDetailsByCourseIdUrl, this.isActive)
// .subscribe(result => {
//     if (result.statusCode === 200) {
//         if (result.data.resultList && result.data.resultList !== '') {
//             this.courseGroups = result.data.resultList;
           
//         } else {
//             this.snotifyService.success(result.message, 'Success!');
//         }
//     }else {
//       this.snotifyService.error(result.message, 'Error!');
//   }
// }, error => {
//   if (error.error.statusCode === 401){
//       this.snotifyService.error(error.error.message, 'Error!');
//       this.genericFunctions.logOut(this.router.url);
//   }else{
//       this.snotifyService.error(CONSTANTS.message.CON_ERROR, 'Error!');
//   }
// });
}
 
selectedGroup(courseGroupId): void{
  this.courseYears = [];
  this.examAttendanceForm.get('courseYearId').setValue('');
  this.examStudentList = [];
  this.dataSource = new MatTableDataSource<any>(this.examStudentList);
  if (this.examAttendanceForm.value.collegeId != null && courseGroupId != null){

  /*----------- COURSES Years -----------*/      
  
  this.crudService.listDetailsByTwoIdsWithSortLtd(this.courseYearCrudUrl, this.examAttendanceForm.value.courseId, 'true', 'ASC',
   this.getDetailsByCourseIdUrl, this.isActive, this.sortOrder)
  .subscribe(result => {
      this.spinner.hide();
      if (result.statusCode === 200) {
          if (result.data.resultList && result.data.resultList !== '') {
              this.courseYears = result.data.resultList;
              if (this.paramaters.examAttendanceMarking){
                this.examAttendanceForm.get('courseYearId').setValue(this.params.courseYearId)
                this.getStudentsList()
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


 calDays(): void{
  this.examDate = this.genericFunctions.momentWithDateFormatYMD(this.examAttendanceForm.value.examDate); // new Date(this.data.issueTodate);
  this.examStudentList = [];
  this.dataSource = new MatTableDataSource<any>(this.examStudentList);
 }

 checkedItems(check, index, item): void{ 
  if(isEmpty(this.absents)){
  this.absents = [];
 }

 for(let i =0; i < this.absents.length; i++){
  if(this.absents[i].roll_number == item.roll_number){
    this.absents.splice(i,1)
  }
  }

  if(item.is_present == true){
    this.absents.push(item)
  }
 
  // item.is_present = check;
  // // tslint:disable-next-line: prefer-for-of
  // for (let i = 0; i < this.examStudentList.length; i++){
  //   if(this.examStudentList[i].is_present == false){
  //     this.absents.push(this.examStudentList[i])
  //   }
  // }
 // this.getMarkStatus();
}

markItems(): void{
  this.absents = [];
  // tslint:disable-next-line: prefer-for-of
  for (let i = 0; i < this.examStudentList.length; i++){
     if (!this.check){
        this.examStudentList[i].checked = true;
        this.examStudentList[i].is_present = true;
     }else{
      this.examStudentList[i].checked = false;
      this.examStudentList[i].is_present = false;
      this.absents.push(this.examStudentList[i]);
     }
  }  
}
addAttendance(): void{
  this.examStudentList1 = [];

  for(let i=0;i<this.examStudentList.length;i++){
    this.examStudentList1.push({
      examStdDetId:this.examStudentList[i].pk_exam_std_det_id,
      examId: this.examStudentList[i].fk_exam_id,
      studentId:this.examStudentList[i].fk_student_id,
      examName: this.examStudentList[i].exam_name,
      courseYearName:this.examStudentList[i].course_year_code,
      examTypeCode:this.examStudentList[i].exam_type,
      rollNumber:this.examStudentList[i].roll_number,
      hallticketNo:this.examStudentList[i].roll_number,
      attendanceTakenEmpId:this.examStudentList[i].fk_attendance_taken_emp_id,
      attendanceTakenDate:this.examStudentList[i].attendance_taken_date,
      subjectName:this.examStudentList[i].subject_name,
      isPresent:this.examStudentList[i].is_present,
      isActive:true 
    })
  }

  this.spinner.show();
  this.crudService.update1(this.examStudentDetailsUrl, this.examStudentList1)
  .subscribe(result => {
      this.spinner.hide();
      if (result.success === true){
          if ( result.statusCode === 200){
              this.snotifyService.success(result.message, 'Success!');
              this.getStudentsList();
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
 
goBack(): void{
  this._location.back();
}
printpage(){
  this.examStudentList[0].examSessionName =  this.examSessionDetails.examSessionName,
  this.examStudentList[0].sessionStartTime =  this.examSessionDetails.sessionStartTime,
  this.examStudentList[0].sessionEndTime =  this.examSessionDetails.sessionEndTime
  this.router.navigate(['admin-examination-management/admin-pre-examinations/print-attendance-marking-sheet-stickers/print-exam-attendance-marking-sheet'],
  {queryParams:{
    data: JSON.stringify(this.examStudentList),
  
      }
    }
  )
    let queryparams = [
      {
        courseId: this.examAttendanceForm.value.courseId,
        collegeId: this.examAttendanceForm.value.collegeId,
        academicYearId: this.examAttendanceForm.value.academicYearId,
        roomId: this.examAttendanceForm.value.roomId,
        employeeId: this.examAttendanceForm.value.employeeId,
        courseGroupId: this.examAttendanceForm.value.courseGroupId,
        courseYearId: this.examAttendanceForm.value.courseYearId,
        examId: this.examAttendanceForm.value.examId,
        examSessionId: this.examAttendanceForm.value.examSessionId,
        examDate: this.examAttendanceForm.value.examDate,
      }
    ]
    this.paramaters.examAttendanceMarking = queryparams;
    
}
printStickers(){
  this.router.navigate(['admin-examination-management/admin-pre-examinations/print-attendance-marking-sheet-stickers/print-barcode-stickers'])
    let queryparams = [
      {
        courseId: this.examAttendanceForm.value.courseId,
        collegeId: this.examAttendanceForm.value.collegeId,
        academicYearId: this.examAttendanceForm.value.academicYearId,
        roomId: this.examAttendanceForm.value.roomId,
        employeeId: this.examAttendanceForm.value.employeeId,
        courseGroupId: this.examAttendanceForm.value.courseGroupId,
        courseYearId: this.examAttendanceForm.value.courseYearId,
        examId: this.examAttendanceForm.value.examId,
        examSessionId: this.examAttendanceForm.value.examSessionId,
        examDate: this.examAttendanceForm.value.examDate,
        data: JSON.stringify(this.examStudentList)
      }
    ]
    this.paramaters.examAttendanceMarking = queryparams;
}

roomDetails(): void {
  this.spinner.show();
  this.crudService.listDetailsById(this.roomCrudUrl, 'true', 'isActive')
    .subscribe(result => {
      this.spinner.hide();
      if (result.statusCode === 200) {
        if (result.data.resultList && result.data.resultList !== '') {
          this.rooms = result.data.resultList;
          this.rooms1 = result.data.resultList;
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
searchRoomName(value) {
  this.rooms1 = []
  this.searchNames(value);
}
searchNames(value: string) {
  let filter = value.toLowerCase();
  for (let i = 0; i < this.rooms.length; i++) {
    let option = this.rooms[i];
    if (option.roomCode.toLowerCase().indexOf(filter) >= 0) {
      this.rooms1.push(option);
    }
  }
}
printBulkPage(){
  window.print()
}
}