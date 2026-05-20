import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
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
import { MatDialog } from '@angular/material/dialog';
import { GenericFunctions } from 'app/main/common/generic-functions';
import { Subject, ReplaySubject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { GridComponent, PdfExportProperties } from '@syncfusion/ej2-angular-grids';
import { ClickEventArgs } from '@syncfusion/ej2-navigations';
import { GlobalService } from 'app/main/services/global.service';

@Component({
  selector: 'app-invigilator-allotment-report',
  templateUrl: './invigilator-allotment-report.component.html',
  styleUrls: ['./invigilator-allotment-report.component.scss']
})

export class InvigilatorAllotmentReportComponent implements OnInit {

  panelOpenState = true;

  private collegeCrudUrl = CONSTANTS.collegeCrudUrl;
  private examAllotmentDetailsUrl = CONSTANTS.examAllotmentDetailsUrl;
  private buildingdetailsSearchurl = CONSTANTS.buildingdetailsSearchurl;
  private isActive = CONSTANTS.isActive;
  private employeeSearchUrl = CONSTANTS.employeeSearchUrl;
  private sortOrder = CONSTANTS.sortOrder;
  private getExamFiltersBycodeUrl=CONSTANTS.getExamFiltersBycodeUrl;

  @ViewChild('excelTable') excelTable: ElementRef;
  trafoItem="Invigilator Allotment Report";

  filtersDetailsList=[];
  CollegesListDetails=[];
  CollegeIdData=[];
  courseList=[];
  courseYearList=[];
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
  collegeCode;
  courseCode;
  exam;
  courseGroupCode;
  courseYearCode;
  regulationCode;
  examYear;
  orgCode = '';


  public gridData: any[];
    public toolbar: string[];
    // tslint:disable-next-line: ban-types
    public pageSettings: Object;
    @ViewChild('grid')
    public grid: GridComponent;
    // tslint:disable-next-line: ban-types
    public initialPage: Object;
    dataDetails = ' ';
    isAdmin = false;
    empSecurity = [];
  public employeeFilterCtrl: FormControl = new FormControl();
  private _onDestroy = new Subject<void>();
  public filteredEmployees: ReplaySubject<any[]> = new ReplaySubject<any[]>(1);

  public examFilterCtrl: FormControl = new FormControl();
  public filteredExams: ReplaySubject<any[]> = new ReplaySubject<any[]>(1);
  public roomFilterCtrl: FormControl = new FormControl();

  courseListData: any[];
  academicYearsList: any[];
  examData: any[];
  examsLists: any[];
  groupList: any[];
  courseYearsList: any[];
  collegesLogoList = [];
  Logo:any;
  collegeName;
  examName: any;
  collegeLists: any[];
  courseGroupList: any[];
  regulationFilterList: any;
  CollegesListFilterDetails: any;
  tabulationRegisterList: any[];
  

  constructor(private route: ActivatedRoute, private formBuilder: FormBuilder, private snotifyService: SnotifyService,
              private crudService: CrudService, private spinner: NgxSpinnerService, private router: Router, private _globalService: GlobalService,
              private dialog: MatDialog, private genericFunctions: GenericFunctions) {
     
                this.isAdmin =JSON.parse(localStorage.getItem('isAdmin')) ;
                this.startDate = new Date();
                this.orgCode = localStorage.getItem('orgCode');
  }
  public filteredRooms: ReplaySubject<any[]> = new ReplaySubject<any[]>(1);
  searchRooms = [];
  // tslint:disable-next-line:typedef
  ngOnInit() {
    this.staffForm = this.formBuilder.group({
        collegeId: ['', Validators.required],
        courseId: ['', Validators.required],
        courseGroupId: [0],
        courseYearId: [0],
        empId: [0],
        roomId: ['', Validators.required],
        examId: [0],
        academicYearId: [0], 
        fDate: [this.genericFunctions.moment()],
        tDate: [this.genericFunctions.moment()],
        isDisable: [false],
      }); 
    this.clear();
    this.toolbar = ['ExcelExport', 'PdfExport', 'Search'];
    this.pageSettings = { pageSize: 10 };
    this.initialPage = { pageSizes: true, pageCount: 10 };
      // this.pageParams.path = 'report-catalyst';
      // this.route.queryParams.subscribe(params => {
      //   if (!this.isEmptyObject(params)){
      //     this.pageParams.path = params.path;
      //   }
      // });
    this.employeeFilterCtrl.valueChanges
      .pipe(takeUntil(this._onDestroy))
      // tslint:disable-next-line: deprecation
      .subscribe(() => {
        this.filterEmp();
      });

    this.searchEmployees.push({firstName: 'Search by Employee name or Id.'});  
    this.filteredEmployees.next(this.searchEmployees.slice()); 

    this.examFilterCtrl.valueChanges
      .pipe(takeUntil(this._onDestroy))
      // tslint:disable-next-line: deprecation
      .subscribe(() => {
        this.filterExam();
    });

    this.searchExams.push({examName: 'Search by Exam name.'});
    this.filteredExams.next(this.searchExams.slice());
    this.getFiltersList();
  }

  clear(): void{
    if (this.staffForm.value.isDisable){
      this.fromDate = this.genericFunctions.moment();
      this.toDate = this.genericFunctions.moment();
    }else{
      this.fromDate = new Date('1990-01-01');
      this.toDate = new Date('9999-12-31');
    }
    this.subjectCourseYears = [];
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
    const date1 = new Date(moment(this.fromDate).format()); // new Date(this.data.issueTodate);
    const date2 = new Date(moment(this.toDate).format()); // new Date(returnDate);
    if (date1.getTime() > date2.getTime()){   
      this.subjectCourseYears = [];
      this.toDate = this.fromDate;
     // this.staffForm.get('tDate').setValue(this.staffForm.value.fDate);
    }
  }

  tConvert(time): void{
    time = time.toString ().match (/^([01]\d|2[0-3])(:)([0-5]\d)(:[0-5]\d)?$/) || [time];

    if (time.length > 1) { // If time format correct
      time = time.slice (1);  // Remove full string match value
      time[5] = +time[0] < 12 ? 'AM' : 'PM'; // Set AM/PM
      time[0] = +time[0] % 12 || 12; // Adjust hours
    }
    time = time[0] + time[1] + time[2] + ' ' + time[5];
    return time; 
  }

  getFiltersList(): void {
    this.filtersDetailsList = []
       this.CollegesListDetails = []
       this.colleges = []
       this.spinner.show()
       let request = [
         { paramName: 'in_flag', paramValue: 'univ_exam_filters' },
         { paramName: 'in_flag_type', paramValue: 'REGSUP' },
         { paramName: 'in_university_id', paramValue: 0 },
         { paramName: 'in_college_id', paramValue: 0 },
         { paramName: 'in_course_id', paramValue: 0 },
         { paramName: 'in_course_group_id', paramValue: 0 },
         { paramName: 'in_course_year_id', paramValue: 0 },
         { paramName: 'in_exam_id', paramValue: 0 },
         { paramName: 'in_academic_year_id', paramValue: 0 },
         { paramName: 'in_regulation_id', paramValue: 0 },
         { paramName: 'in_subject_id', paramValue: 0 },
         { paramName: 'in_loginuser_empid', paramValue: +localStorage.getItem('employeeId') },
         { paramName: 'in_loginuser_roleid', paramValue: 0 },
         { paramName: 'in_sub_flag_type', paramValue: 'ALL' },
         { paramName: 'in_param1', paramValue: 0 },
         { paramName: 'in_param2', paramValue: 0 },
       ];
       this.crudService.getDetailsByRequest(this.getExamFiltersBycodeUrl, '', request, '&')
         .subscribe(result => {
           this.spinner.hide();
           if (result.statusCode === 200) {
             if (result.data && result.data !== '' && result.data.result.length > 0) {
               this.filtersDetailsList = result.data.result;
               for (let i = 0; i < this.filtersDetailsList.length; i++) {
                 if (this.filtersDetailsList[i].length > 0 && this.filtersDetailsList[i][0].flag === 'univ_exam_filters') {
                   this.CollegesListFilterDetails = this.filtersDetailsList[i];
                 }
               }
               const Course_Id = this.CollegesListFilterDetails.map(({ fk_course_id }) => fk_course_id);
               this.courses = this.CollegesListFilterDetails.filter(({ fk_course_id }, index) =>
                 !Course_Id.includes(fk_course_id, index + 1));
               if (this.courses.length > 0) {
                 this.staffForm.get('courseId').setValue(this.courses[0].fk_course_id);
                 this.selectedCourse(this.staffForm.value.courseId)
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
   
     selectedCourse(courseId): void {
       if (courseId != null) {
         this.staffForm.get('academicYearId').setValue('')
         this.staffForm.get('examId').setValue('');
         this.staffForm.get('collegeId').setValue('');
         this.staffForm.get('courseGroupId').setValue('');
         this.staffForm.get('courseYearId').setValue('');
         this.academicYears = []
         this.academicYearsList = []
         this.examData = []
         this.colleges = []
         this.courseGroups = []
         this.courseYears = []
         this.academicYearsList = this.CollegesListFilterDetails.filter(x => (x.fk_course_id == this.staffForm.value.courseId))
         this.tabulationRegisterList = [];
         this.tabulationRegisterList = [];
         this.courseCode = this.courses.filter(x => x.fk_course_id == this.staffForm.value.courseId)[0]?.course_code
        //  if (this.courseCode == 'DPHARM') {
        //    this.dataFlag = false
        //  } else {
        //    this.dataFlag = true
        //  }
   
         if (this.academicYearsList.length > 0) {
           const academicYears = this.academicYearsList.map(({ fk_academic_year_id }) => fk_academic_year_id);
           this.academicYears = this.academicYearsList.filter(({ fk_academic_year_id }, index) => !academicYears.includes(fk_academic_year_id, index + 1));
         }
         if (this.academicYears.length > 0) {
           this.staffForm.get('academicYearId').setValue(this.academicYears[0].fk_academic_year_id);
           this.selectedAcademicYear(this.staffForm.value.academicYearId)
         }
   
       }
     }
   
   
   
   
     selectedAcademicYear(academicYearId): void {
       this.staffForm.get('examId').setValue('');
       this.staffForm.get('collegeId').setValue('');
       this.staffForm.get('courseGroupId').setValue('');
       this.staffForm.get('courseYearId').setValue('');
       this.examsList = [];
       if (academicYearId) {
         this.examsLists = []
         this.examData = []
         this.colleges = []
         this.courseGroups = []
         this.courseYears = []
         this.examsLists = this.CollegesListFilterDetails.filter(x => (x.fk_course_id === this.staffForm.value.courseId && x.fk_academic_year_id == this.staffForm.value.academicYearId))
         if (this.examsLists.length > 0) {
           const examsLists = this.examsLists.map(({ fk_exam_id }) => fk_exam_id);
           this.examsList = this.examsLists.filter(({ fk_exam_id }, index) => !examsLists.includes(fk_exam_id, index + 1));
           this.examData = this.examsList;
         }
         if (this.examsList.length > 0) {
           this.staffForm.get('examId').setValue(this.examsList[0].fk_exam_id);
           this.selectedExam(this.staffForm.value.examId);
         }
       }
   
     }
     selectedExam(examId): void {
       this.filtersDetailsList = []
       this.staffForm.get('collegeId').setValue('');
       this.staffForm.get('courseGroupId').setValue('');
       this.staffForm.get('courseYearId').setValue('');
       let request = [
         { paramName: 'in_flag', paramValue: 'univ_exam_rest_in_regexamstd' },
         { paramName: 'in_flag_type', paramValue: 'ALL' },
         { paramName: 'in_university_id', paramValue: 0 },
         { paramName: 'in_college_id', paramValue: 0 },
         { paramName: 'in_course_id', paramValue: this.staffForm.value.courseId },
         { paramName: 'in_course_group_id', paramValue: 0 },
         { paramName: 'in_course_year_id', paramValue: 0 },
         { paramName: 'in_exam_id', paramValue: this.staffForm.value.examId },
         { paramName: 'in_academic_year_id', paramValue: this.staffForm.value.academicYearId },
         { paramName: 'in_regulation_id', paramValue: 0 },
         { paramName: 'in_subject_id', paramValue: 0 },
         { paramName: 'in_loginuser_empid', paramValue: +localStorage.getItem('employeeId') },
         { paramName: 'in_loginuser_roleid', paramValue: 0 },
         { paramName: 'in_sub_flag_type', paramValue: 'ALL' },
         { paramName: 'in_param1', paramValue: 0 },
         { paramName: 'in_param2', paramValue: 0 },
       ];
       this.crudService.getDetailsByRequest(this.getExamFiltersBycodeUrl, '', request, '&')
         .subscribe(result => {
           this.spinner.hide();
           if (result.statusCode === 200) {
             if (result.data && result.data !== '' && result.data.result.length > 0) {
               this.filtersDetailsList = result.data.result;
               for (let i = 0; i < this.filtersDetailsList.length; i++) {
                 if (this.filtersDetailsList[i].length > 0 && this.filtersDetailsList[i][0].flag === 'univ_exam_rest_filters') {
                   this.CollegesListDetails = this.filtersDetailsList[i];
                 }
                 else if (this.filtersDetailsList[i].length > 0 && this.filtersDetailsList[i][0].flag === 'regulations') {
                   console.log(this.filtersDetailsList[i]);
   
                   this.regulationFilterList = this.filtersDetailsList[i];
                 }
   
               }
   
               if (this.CollegesListDetails) {
                 /*----------- Colleges -----------*/
                 this.colleges = []
                 this.courseGroups = []
                 this.courseYears = []
                 this.colleges = this.CollegesListDetails
                 const CollegeIdData = this.colleges.map(({ fk_college_id }) => fk_college_id);
                 this.colleges = this.colleges.filter(({ fk_college_id }, index) => !CollegeIdData.includes(fk_college_id, index + 1));
                 if (this.colleges.length > 0) {
                   this.staffForm.get('collegeId').setValue(this.colleges[0].fk_college_id);
                   this.selectedCollege(this.staffForm.value.collegeId);
                 }
                 //     /*----------- COURSES Years -----------*/      
   
   
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
     selectedCollege(collegeId): void {
       this.collegeCode = this.colleges.filter(x => (x.fk_college_id === collegeId))[0].college_code;
       this.courseGroups = []
       this.staffForm.get('courseGroupId').setValue('');
       this.staffForm.get('courseYearId').setValue('');
       if (collegeId != null) {
         this.courseGroupList = []
         this.courseGroups = []
         this.courseYears = []
         this.courseGroupList = this.CollegesListDetails.filter(x => (x.fk_college_id == this.staffForm.value.collegeId))
         if (this.courseGroupList.length > 0) {
           const courseGroups = this.courseGroupList.map(({ fk_course_group_id }) => fk_course_group_id);
           this.courseGroups = this.courseGroupList.filter(({ fk_course_group_id }, index) => !courseGroups.includes(fk_course_group_id, index + 1));
         }
         if (this.courseGroups.length > 0) {
           this.staffForm.get('courseGroupId').setValue(this.courseGroups[0].fk_course_group_id);
           this.selectedGroup(this.staffForm.value.courseGroupId)
         }
       }
   
   
     }
   
   
   
     selectedGroup(courseGroupId): void {
       this.staffForm.get('courseYearId').setValue('');
       this.courseYearsList = []
       this.courseYears = []
   
       /*----------- COURSES Years -----------*/
       this.courseYearsList = this.CollegesListDetails.filter(x => (x.fk_college_id == this.staffForm.value.collegeId && x.fk_course_group_id == courseGroupId))
       if (this.courseYearsList.length > 0) {
         const courseYearsList = this.courseYearsList.map(({ fk_course_year_id }) => fk_course_year_id);
         this.courseYears = this.courseYearsList.filter(({ fk_course_year_id }, index) => !courseYearsList.includes(fk_course_year_id, index + 1));
       }
   
       if (this.courseYears.length > 0) {
         this.staffForm.get('courseYearId').setValue(this.courseYears[0].fk_course_year_id);
         this.selectedYear(this.staffForm.value.courseYearId);
       }
     }


  selectedYear(courseYearId): void{
    this.staffForm.get('empId').setValue(0);
    this.subjectCourseYears = [];
    if (this.staffForm.value.collegeId != null && courseYearId != null){
      /*----------- COURSES YEARS -----------*/      
    }
  }
  searchExam(value) {
    this.examData = [];
    this.search(value)
  }

  search(value: string) {
    let filter = value.toLowerCase();
    for (let i = 0; i < this.examsList.length; i++) {
      let option = this.examsList[i];
      if (option.exam_name.toLowerCase().indexOf(filter) >= 0) {
        this.examData.push(option);
      }
    }
  }


   // tslint:disable-next-line:typedef
   dataRefresh(){
    this.subjectCourseYears = [];
  }

  selectedEmp(): void{
    this.subjectCourseYears = [];
  }
 enteredEmployee(event): void{
    if (event.target.value.length > 4 && this.staffForm.value.collegeId != null && this.staffForm.value.collegeId !== ''){
        /*----------- EMPLOYEE -----------*/
        this.crudService.listByTwoIds(this.employeeSearchUrl, this.staffForm.value.collegeId, event.target.value, 'collegeId' , 'q'  )
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

  reset(): void{
    this.staffForm.get('examId').setValue(0);
    this.staffForm.get('academicYearId').setValue(0);
    this.staffForm.get('courseGroupId').setValue(0);
    this.staffForm.get('courseYearId').setValue(0);
    this.staffForm.get('regulationId').setValue(0);
    this.staffForm.get('empId').setValue(0);
    this.subjectCourseYears = [];
  }
j
  getDetails(): void{ 
    if (this.staffForm.valid){
      this.collegeName = this.colleges.filter(x=>x.fk_college_id==this.staffForm.value.collegeId)[0]?.college_name,
      this.collegeCode = this.colleges.filter(x=>x.fk_college_id==this.staffForm.value.collegeId)[0]?.college_code, 
      this.courseCode = this.courses.filter(x=>x.fk_course_id==this.staffForm.value.courseId)[0]?.course_code
      this.examYear =this.academicYears.filter(x=>x.fk_academic_year_id==this.staffForm.value.academicYearId)[0]?.academic_year;
      this.courseGroupCode =this.courseGroups.filter(x=>x.fk_course_group_id==this.staffForm.value.courseGroupId)[0]?.group_code;
      this.courseYearCode = this.courseYears.filter(x=>x.fk_course_year_id==this.staffForm.value.courseYearId)[0]?.course_year_name;
      this.exam = this.examsList.filter(x=>x.fk_exam_id==this.staffForm.value.examId)[0]?.exam_name;
      this.regulationCode =this.courseYears.filter(x=>x.fk_course_year_id==this.staffForm.value.courseYearId)[0]?.regulation_code;
      this.fromDate = moment(this.fromDate).format('YYYY-MM-DD');
      this.toDate = moment(this.toDate).format('YYYY-MM-DD');
      this.spinner.show();
      this.subjectCourseYears = [];
      if (this.staffForm.value.empId === ''){
          this.staffForm.get('empId').setValue(0);
        }
      this.selectedData();
      this.getCollegeLogo();
        /*----------- STUDENTS -----------*/
       // tslint:disable-next-line:max-line-length
      this.crudService.listByFourteenIds(this.examAllotmentDetailsUrl, 'invigilator_allotment', this.staffForm.value.examId, this.staffForm.value.courseId,this.staffForm.value.collegeId, 
        this.staffForm.value.courseGroupId, this.staffForm.value.courseYearId, 0, this.staffForm.value.empId, 0,
         this.staffForm.value.roomId,this.fromDate, this.toDate,0,0,
       'in_flag', 'in_exam_id', 'in_course_id', 'in_college_id', 'in_course_group_id', 'in_course_year_id' ,'in_std_id', 'in_invgilator_emp_id', 
       'in_regulation_id', 'in_room_id','from_exam_date', 'to_exam_date','in_subject_id','in_session_id')
         .subscribe(result => {
              this.spinner.hide();
              if (result.statusCode === 200){
                   if (result.success) {
                       if (result.data.result[0].length > 0){
                            this.subjectCourseYears = result.data.result[0]; 
                            this.gridData = this.subjectCourseYears;
                            for ( let idx = 0; idx < this.gridData.length; idx++) {
                              this.gridData[idx].id = idx + 1;
                              this.gridData[idx].invigilator_name = this.gridData[idx].invigilator_name + ' - ' + this.gridData[idx].invigilator_type ;
                              // tslint:disable-next-line: max-line-length
                              // this.gridData[idx].session_start_time = this.tConvert(this.gridData[idx].session_start_time) + ' - ' + this.tConvert(this.gridData[idx].session_end_time) ;
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
       this.grid.excelExport(this.genericFunctions.getExcelExportProperties(this.dataDetails, 'Invigilator Allotment Report'));
            // this.grid.excelExport('Invigilator Allotment Report');
    } else
    if (args.item.text === 'PDF Export') {
      const exportProperties: PdfExportProperties = this.genericFunctions.getPdfExportPropertiesLandscape(this.dataDetails, 'Invigilator Allotment Report');
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
}
getCollegeLogo(): void{
    /*----------- COLLEGES -----------*/
    this.crudService.listDetailsById(this.collegeCrudUrl, 'true', this.isActive)
         .subscribe(result => {
             if (result.statusCode === 200){
                     if (result.data.resultList && result.data.resultList !== '') {
                         this.collegesLogoList = result.data.resultList;    
                        //  for(let i=0; i<this.colleges.length; i++){
                          this.Logo = this.collegesLogoList.filter(x=> (x.collegeId == this.staffForm.value.collegeId))[0].logo
                        //  }    
                                      
                     } else {
                         this.snotifyService.success(result.message, 'Success!');
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
  exportAsExcel() {
    const uri = 'data:application/vnd.ms-excel;base64,';
    const template = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40"><head><!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>{worksheet}</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]--></head><body><table>{table}</table></body></html>`;
    const base64 = function(s) { return window.btoa(unescape(encodeURIComponent(s))) };
    const format = function(s, c) { return s.replace(/{(\w+)}/g, function(m, p) { return c[p]; }) };
  
    const table = this.excelTable.nativeElement;
    const ctx = { worksheet: 'Worksheet', table: table.innerHTML };
  
    const link = document.createElement('a');
    link.download = `${this.trafoItem}.xls`;
    link.href = uri + base64(format(template, ctx));
    link.click();
  }
  printPage(){
    window.print()
  }
}
