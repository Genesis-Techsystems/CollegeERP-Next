import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
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
  selector: 'app-exam-student-result-details-report',
  templateUrl: './exam-student-result-details-report.component.html',
  styleUrls: ['./exam-student-result-details-report.component.scss']
})
export class ExamStudentResultDetailsReportComponent implements OnInit {

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
  private getExamFiltersBycodeUrl=CONSTANTS.getExamFiltersBycodeUrl;

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
  examRegisteredStudents: any[] = [];
  defaultAcademicYearId;
  fromDate ;
  toDate;
  startDate;
  studentAttendance = [];
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
  collegeName;
  collegeCode;
  courseCode;
  exam;
  courseGroupCode;
  courseYearCode;
  regulationCode;
  examYear;
  collegeLogo =[];
  Logo;


  public gridData: any[];
  public toolbar: string[];
  // tslint:disable-next-line: ban-types
  public pageSettings: Object;
  @ViewChild('grid')
  public grid: GridComponent;
  // tslint:disable-next-line: ban-types
  public initialPage: Object;
  dataDetails = ' ';
  searchText = '';
  @ViewChild('excelTable', { static: false }) excelTable: ElementRef;
  trafoItem="Student Detailed Result";  

  private _onDestroy = new Subject<void>();
  public studentFilterCtrl: FormControl = new FormControl();
  public filteredStudents: ReplaySubject<any[]> = new ReplaySubject<any[]>(1);

  public examFilterCtrl: FormControl = new FormControl();
  public filteredExams: ReplaySubject<any[]> = new ReplaySubject<any[]>(1);

  empSecurity = [];
  isAdmin = false;
  courseListData=[];
  academicYearsList=[];
  examData: any[];
  examsLists: any[];
  courseYearsList: any[];
  regulationsList: any[];
  groupList: any[];
  orgCode = '';
  collegeList = [];
  regulationList: any[];
  regulationFilterList: any[];
  courseGroupList: any[];
  CollegesListFilterDetails: any[];

  constructor(private route: ActivatedRoute, private formBuilder: FormBuilder, private snotifyService: SnotifyService,
              private crudService: CrudService, private spinner: NgxSpinnerService, private router: Router, private _globalService: GlobalService,
              private dialog: MatDialog, private genericFunctions: GenericFunctions) {
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
          this.dashboard = CONSTANTS.dashboard;
          this.startDate = new Date();
          this.orgCode = localStorage.getItem('orgCode');
  }

  // tslint:disable-next-line:typedef
  ngOnInit() {
    this.staffForm = this.formBuilder.group({
        collegeId: [''],
        courseId: ['', Validators.required],
        isPass: [-1, Validators.required],
        academicYearId: [0], 
        courseGroupId: [0],
        courseYearId: [0],
        studentId: [0],
        regulationId: [0],
        examId: [0],
      }); 

    this.toolbar = ['ExcelExport', 'PdfExport', 'Search'];
    this.pageSettings = { pageSize: 10 };
    this.initialPage = { pageSizes: true, pageCount: 10 };

      // this.pageParams.path = 'report-catalyst';
      // this.route.queryParams.subscribe(params => {
      //   if (!this.isEmptyObject(params)){
      //     this.pageParams.path = params.path;
      //   }
      // });
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
    this.getFiltersList();
    // this.getData();
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
            this.examsList = [];
            this.filtersDetailsList = []
            this.colleges = []
            this.courseGroups = []
            this.courseYearsList = []
            this.courseYears = []
            this.regulationList = []
            this.academicYearsList = []
            this.academicYearsList = this.CollegesListFilterDetails.filter(x => (x.fk_course_id == this.staffForm.value.courseId))
         
      
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
          this.filtersDetailsList = []
          this.colleges = []
          this.courseGroups = []
          this.courseYearsList = []
          this.courseYears = []
          this.regulationList = []
          if (academicYearId) {
            this.examsLists = []
            this.examData = []
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
          this.colleges = []
          this.courseGroups = []
          this.courseYearsList = []
          this.courseYears = []
          this.regulationList = []
       
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
                    this.courseYearsList = []
                    this.courseYears = []
                    this.regulationList = []
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
          this.courseYearsList = []
          this.courseYears = []
          this.regulationList = []
          this.staffForm.get('courseGroupId').setValue('');
          this.staffForm.get('courseYearId').setValue('');
          if (collegeId != null) {
            this.courseGroupList = []
            this.courseGroups = []
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
          this.regulationList = []
      
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
   
   
      selectedYear(courseYearId){
        this.examRegisteredStudents = [];
        this.staffForm.get('regulationId').setValue('');
       this.regulationList = []
       if (courseYearId) {
   
         this.regulationFilterList = this.CollegesListDetails.filter(x => (x.fk_course_id == this.staffForm.value.courseId))
   
         if (this.regulationFilterList.length > 0) {
           const regulationDetailList = this.regulationFilterList.map(({ fk_regulation_id }) => fk_regulation_id);
           this.regulationList = this.regulationFilterList.filter(({ fk_regulation_id }, index) => !regulationDetailList.includes(fk_regulation_id, index + 1));
         }
       
         if (this.regulationList.length > 0) {
           // this.bulkHallticketDetails =[]
           // this.bulkTable=false
           this.staffForm.get('regulationId').setValue(this.regulationList[0].fk_regulation_id);
           this.selectedRegulation(this.staffForm.value.regulationId);
         }
   
       }
     }
     selectedRegulation(regulationId){
   
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
  this.examsLists = [];
  this.examData = [];
  this.examsList = [];
}

  getDetails(): void{ 
    if (this.staffForm.valid){
        this.spinner.show();
        this.examRegisteredStudents = [];
      this.collegeName =this.colleges.filter(x=>x.fk_college_id==this.staffForm.value.collegeId)[0]?.college_name, 
      this.courseCode = this.courses.filter(x=>x.fk_course_id==this.staffForm.value.courseId)[0]?.course_code
      this.examYear =this.academicYears.filter(x=>x.fk_academic_year_id==this.staffForm.value.academicYearId)[0]?.academic_year;
      this.courseGroupCode =this.courseGroups.filter(x=>x.fk_course_group_id==this.staffForm.value.courseGroupId)[0]?.group_code;
      this.courseYearCode = this.courseYears.filter(x=>x.fk_course_year_id==this.staffForm.value.courseYearId)[0]?.course_year_name;
      this.exam = this.examsList.filter(x=>x.fk_exam_id==this.staffForm.value.examId)[0]?.exam_name;
      this.regulationCode =this.regulations.filter(x=>x.fk_regulation_id==this.staffForm.value.regulationId)[0]?.regulation_code;
        if (this.staffForm.value.studentId === ''){
          this.staffForm.get('studentId').setValue(0);
        }
        this.selectedData();
        this.getColleges();
        /*----------- STUDENTS -----------*/
       // tslint:disable-next-line:max-line-length
        this.crudService.listByTwelveIds(this.examStudentResultsUrl, 'exam_std_result_detail', this.staffForm.value.examId, this.staffForm.value.courseId, 
        this.staffForm.value.courseGroupId, this.staffForm.value.courseYearId, this.staffForm.value.collegeId, this.staffForm.value.studentId, 
        this.staffForm.value.regulationId, this.staffForm.value.isPass, 0, '-1', '-1',
       'in_flag', 'in_exam_id', 'in_course_id', 'in_course_group_id', 'in_course_year_id','in_college_id','in_std_id', 
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
                              if(this.gridData[idx].internal_marks!=' - ' || this.gridData[idx].external_marks != ' - '){
                                this.gridData[idx].Total=this.gridData[idx].internal_marks+this.gridData[idx].external_marks
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
    this.dataDetails = '';
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
getColleges(): void{
  this.collegeLogo =[];
  this.Logo = [];
  /*----------- COLLEGES -----------*/
  this.crudService.listDetailsById(this.collegeCrudUrl, 'true', 'isActive')
       .subscribe(result => {
           if (result.statusCode === 200){
                   if (result.data.resultList && result.data.resultList !== '') {
                       this.collegeLogo = result.data.resultList;  
                       this.Logo = this.collegeLogo.filter(x=> (x.collegeId == this.staffForm.value.collegeId))[0].logo
                       this.collegeName = this.collegeLogo.filter(x=> (x.collegeId == this.staffForm.value.collegeId))[0].collegeName
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
printPage(){
  window.print();
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
}


