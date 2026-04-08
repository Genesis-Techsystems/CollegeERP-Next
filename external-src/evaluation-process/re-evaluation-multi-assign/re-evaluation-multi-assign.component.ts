import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { FormGroup, FormControl, FormBuilder, Validators } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { Router, ActivatedRoute } from '@angular/router';
import { CONSTANTS } from 'app/main/common/constants';
import { GenericFunctions } from 'app/main/common/generic-functions';
import { ExamMaster } from 'app/main/models/examMaster';
import { CrudService } from 'app/main/services/crud.service';
import { SnotifyService } from 'ng-snotify';
import { NgxSpinnerService } from 'ngx-spinner';
import { ReplaySubject, Subject } from 'rxjs';
import * as _ from 'lodash';
import { StudentAssignedListComponent } from '../multi-evaluator-assign/student-assigned-list/student-assigned-list.component';

@Component({
  selector: 'app-re-evaluation-multi-assign',
  templateUrl: './re-evaluation-multi-assign.component.html',
  styleUrls: ['./re-evaluation-multi-assign.component.scss']
})
export class ReEvaluationMultiAssignComponent implements OnInit {
 
  displayedColumns: string[] = ['id', 'evaluatorName', 'email', 'examEvaluatorsId', 'NumberOfAssignEvaluators', 'NumberOfDueEvaluators'];
  
  dataSource: MatTableDataSource<any>;

  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild(MatSort) sort: MatSort;
  @ViewChild('uploadXl') uploadXl: ElementRef;

  examTimetableList: any[] = []
  private isActive = CONSTANTS.isActive;
  examEvaluationList1 = []
  selectedSubjects = []
  evaluatorsubjectform: FormGroup;
  step = 0;
  flag: boolean;

  private examFiltersByCodeUrl = CONSTANTS.examFiltersByCodeUrl;
  private getevaluatorassignmentUrl=CONSTANTS.getevaluatorassignmentUrl;
  private getExamEvaluationSubjectCodes = CONSTANTS.getExamEvaluationCodesUrl;
  private evaluatorassignmentUrl = CONSTANTS.evaluatorassignmentUrl;
  private EvaluatorRole = CONSTANTS.EvaluatorRole;

  examSubjects: any;
  monthYear = [];
  courseCode: any;
  courseyearcode: any;
  evaluatorForm: FormGroup;
  subjectcode: any;
  getevaluatorList: any;
  ListExamSubjects: any;
  monthYear1 = [];
  collegeCode = [];
  evaluatorName = [];
  configuredData = [];
  NotconfiguredData = [];
  timetable_det_ids: any;
  assignEvaluator = [];
  courseyearcode1 = [];
  subjectcode1 = [];

  examDate = this.genericFunctions.momentWithDateFormatYMD(this.genericFunctions.moment());
  public employeeFilterCtrl: FormControl = new FormControl();
  public examFilterCtrl: FormControl = new FormControl();
  public filteredExam: ReplaySubject<any[]> = new ReplaySubject<any[]>(1);
  public filteredEmployees: ReplaySubject<any[]> = new ReplaySubject<any[]>(1);
  private _onDestroy = new Subject<void>();

  searchExams = [];
  examEvaluationList: any[];
  Barcode: any;
  data: any;
  duplicateCourseGroups: any = [];
  examDetails: ExamMaster;
  examAnswerPapaerList: any = [];
  PaperCount: any;
  check = false;
  examStudentList: any = [];
  examStudentList1: any = [];
  Formdata: FormGroup;
  examStudentListdata: any[];
  selectedCount: number;
  StudentEvaluationAssignment = [];
  UnAssinged: any;
  totalStudents: any;
  omrSerail: any = [];
  assignzero: number;
  UnAssingedList: any = [];
  assigndata: any = [];
  checksubject: boolean;
  searchNameData: any = [];
  examStudentList2 = [];
  NoOfAnswerpapersUploaded: any;
  monthYearDuplicateList = [];
  checkevaluator: boolean;
  examEvaluatorListdata: any = [];
  profileIds1 = [];
  evaluationListData: any[];
  timeTableDetIds = [];
  EvaluationStudents: any;
  examStudentDataList = [];
  maintDataList = [];
  profileTimeTableId: any;
  AssignStudentDataList = [];
  courseCodeFilter: any;
  NoOfAssigned: number;
  searchText=''
  timeTableArry=[];
  profileTimeTableIdS: any;
  maintDataDuplicateList=[];
  profilesList=[]
  filtersDetailsList = [];
  academicYearsList = [];
  academicYears = [];
  examList = [];
  examDataList = [];
  examDuplicateList = [];
  courseYearDetails = [];
  regulationsList = [];
  regulations = [];
  subjectListDetails = [];
  assignedOmrList = [];
  evaluatorsOmrList = [];

  constructor(private formBuilder: FormBuilder, private snotifyService: SnotifyService,
    private crudService: CrudService, private spinner: NgxSpinnerService, private router: Router,
    private dialog: MatDialog, private genericFunctions: GenericFunctions, private route: ActivatedRoute,) {
  }
  ngOnInit(): void {
    this.Formdata = this.formBuilder.group({
      examEvaluatorProfileId: [''],

    })

    this.evaluatorForm = this.formBuilder.group({
      // CourseCode: ['', Validators.required],
      // ExamMonthYear: ['', Validators.required],
      // CourseYear: ['', Validators.required],
      // subjectCode: ['', Validators.required],
      courseId: ['', Validators.required],
      academicYearId: ['', Validators.required],
      examId: ['', Validators.required],
      courseYearId: ['', Validators.required],
      regulationId: ['', Validators.required],
      subjectId: ['', Validators.required],
    })
    this.evaluatorsubjectform = this.formBuilder.group({
      in_orgid: 1,
      in_fdate: ['1990-01-01'],
      in_tdate: ['1990-01-01'],
      in_exam_month_yr: [''],
      in_course_code: [''],
      in_course_year_code: [''],
      in_subject_code: [''],
      in_evalutor_profileid: 0,
      in_exam_date: '1990-01-01',
      in_regulation_code: ''
    })
    // this.getList();
    this.getFiltersData();
    this.dataSource = new MatTableDataSource<any>(this.examEvaluationList);
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  applyFilter(filterValue) {
    this.dataSource.filter = filterValue.trim().toLowerCase();

    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
  }
  // getList(): void {
  //   if (this.evaluatorsubjectform.valid) {
  //     this.flag = false;
  //     let empId = +localStorage.getItem('employeeId');
  //     /* -------- EXAM SESSIONS -------*/
  //     this.crudService.listByEighteenIds(this.getExamEvaluationSubjectCodes,
  //       'list_exam_subjects',
  //       this.evaluatorsubjectform.value.in_orgid,
  //       this.evaluatorsubjectform.value.in_fdate,
  //       this.evaluatorsubjectform.value.in_tdate,
  //       this.evaluatorsubjectform.value.in_exam_month_yr,
  //       this.evaluatorsubjectform.value.in_course_code,
  //       this.evaluatorsubjectform.value.in_course_year_code,
  //       this.evaluatorsubjectform.value.in_subject_code,
  //       this.evaluatorsubjectform.value.in_evalutor_profileid,
  //       this.evaluatorsubjectform.value.in_exam_date,
  //       this.evaluatorsubjectform.value.in_regulation_code,
  //       0, 0, 0, '', '', 1,empId,
  //       'in_flag', 'in_orgid', 'in_fdate', 'in_tdate', 'in_exam_month_yr', 'in_course_code', 'in_course_year_code', 'in_subject_code', 'in_evalutor_profileid', 'in_exam_date', 'in_regulation_code', 'in_emp_id', 'in_questionpaper_id', 'in_evaluator_role_id', 'in_academic_year', 'in_exam_short_name', 'in_affiliatedto_catdet_id',
  //       'in_loginuser_empid'
  //     )
  //       .subscribe(result => {
  //         this.spinner.hide();
  //         if (result.statusCode === 200) {
  //           if (result.data && result.data !== '' && result.data.result.length > 0) {
  //             this.examSubjects = result.data.result[0];
  //             // this.monthYear=this.examSubjects
  //             const courseCodeData = this.examSubjects.map(({ course_code }) => course_code);
  //             this.courseCode = this.examSubjects.filter(({ course_code }, index) =>
  //               !courseCodeData.includes(course_code, index + 1));
  //              this.evaluatorForm.get('CourseCode').setValue(this.courseCode[0]?.course_code)
  //             // this.evaluatorForm.get('CourseCode').setValue(0)
  //             this.selectedCourse(this.evaluatorForm.value.CourseCode);

  //           } else {
  //             this.snotifyService.success(result.message, 'Success!');
  //           }
  //         } else {
  //           this.snotifyService.error(result.message, 'Error!');
  //         }
  //       }, error => {
  //         this.spinner.hide();
  //         if (error.error.statusCode === 401) {
  //           this.snotifyService.error(error.error.message, 'Error!');
  //           this.genericFunctions.logOut(this.router.url);
  //         } else {
  //           this.snotifyService.error(CONSTANTS.message.CON_ERROR, 'Error!');
  //         }
  //       });

  //   }

  // }
  // selectedCourse(courseCodeId) {
  //   this.flag = false;
  //   this.monthYear = [];
  //   this.monthYear1 = []
  //   this.monthYearDuplicateList = []
  //   this.evaluatorForm.get('ExamMonthYear').setValue('')
  //   this.evaluatorForm.get('CourseYear').setValue('')
  //   this.evaluatorForm.get('subjectCode').setValue('')
  //   if (courseCodeId != 0) {
  //     for (let i = 0; i < this.examSubjects.length; i++) {
  //       if (this.examSubjects[i].course_code == courseCodeId) {
  //         this.monthYear1.push(this.examSubjects[i])
  //         const exam_month_yrData = this.monthYear1.map(({ exam_month_yr }) => exam_month_yr);
  //         this.monthYear = this.monthYear1.filter(({ exam_month_yr }, index) =>
  //           !exam_month_yrData.includes(exam_month_yr, index + 1));
  //         this.monthYear = this.monthYear.sort((a, b) => new Date(b.exam_month_yr).getTime() - new Date(a.exam_month_yr).getTime());
  //         this.monthYearDuplicateList = this.monthYear.sort((a, b) => new Date(b.exam_month_yr).getTime() - new Date(a.exam_month_yr).getTime());
  //       }
  //     }
  //     this.evaluatorForm.get('ExamMonthYear').setValue(this.monthYear[0]?.exam_month_yr)
  //     this.selectedMonthyr(this.evaluatorForm.value.ExamMonthYear)
  //   }


  //   else {
  //     const exam_month_yrData = this.examSubjects.map(({ exam_month_yr }) => exam_month_yr);
  //     this.monthYear = this.examSubjects.filter(({ exam_month_yr }, index) =>
  //       !exam_month_yrData.includes(exam_month_yr, index + 1));
  //     this.monthYear = this.monthYear.sort((a, b) => new Date(b.exam_month_yr).getTime() - new Date(a.exam_month_yr).getTime());
  //     this.monthYearDuplicateList = this.monthYear.sort((a, b) => new Date(b.exam_month_yr).getTime() - new Date(a.exam_month_yr).getTime());
  //     this.evaluatorForm.get('ExamMonthYear').setValue(this.monthYear[0]?.exam_month_yr)
  //     this.selectedMonthyr(this.evaluatorForm.value.ExamMonthYear)
  //   }

  // }
  // selectedMonthyr(exam_month_yr) {
  //   this.flag = false;
  //   this.courseyearcode1 = []
  //   this.courseyearcode = []
  //   this.evaluatorForm.get('CourseYear').setValue('')
  //   this.evaluatorForm.get('subjectCode').setValue('')
  //   if (this.evaluatorForm.value.CourseCode != 0) {
  //     for (let i = 0; i < this.examSubjects.length; i++) {
  //       if (this.examSubjects[i].exam_month_yr == exam_month_yr && this.examSubjects[i].course_code == this.evaluatorForm.value.CourseCode) {
  //         this.courseyearcode1.push(this.examSubjects[i])
  //         const courseyearcode = this.courseyearcode1.map(({ course_year_code }) => course_year_code);
  //         this.courseyearcode = this.courseyearcode1.filter(({ course_year_code }, index) =>
  //           !courseyearcode.includes(course_year_code, index + 1));
  //       }
  //     }
  //     this.evaluatorForm.get('CourseYear').setValue(this.courseyearcode[0]?.course_year_code)
  //     this.selectedCourseYr(this.evaluatorForm.value.CourseYear);
  //   }
  //   else {
  //     for (let i = 0; i < this.examSubjects.length; i++) {
  //       if (this.examSubjects[i].exam_month_yr == exam_month_yr) {
  //         this.courseyearcode1.push(this.examSubjects[i])
  //         const courseyearcode = this.courseyearcode1.map(({ course_year_code }) => course_year_code);
  //         this.courseyearcode = this.courseyearcode1.filter(({ course_year_code }, index) =>
  //           !courseyearcode.includes(course_year_code, index + 1));
  //       }
  //     }
  //     this.evaluatorForm.get('CourseYear').setValue(this.courseyearcode[0]?.course_year_code)
  //     this.selectedCourseYr(this.evaluatorForm.value.CourseYear);
  //   }

  // }


  // selectedCourseYr(courseYr) {
  //   this.flag = false;
  //   this.subjectcode1 = []
  //   this.subjectcode = []
  //   this.evaluatorForm.get('subjectCode').setValue('')
  //   if (this.evaluatorForm.value.CourseCode != 0) {
  //     for (let i = 0; i < this.examSubjects.length; i++) {
  //       if (this.examSubjects[i].course_year_code == courseYr && this.examSubjects[i].course_code == this.evaluatorForm.value.CourseCode && this.examSubjects[i].exam_month_yr == this.evaluatorForm.value.ExamMonthYear) {
  //         this.subjectcode1.push(this.examSubjects[i])
  //         const subjectcode = this.subjectcode1.map(({ subject_code }) => subject_code);
  //         this.subjectcode = this.subjectcode1.filter(({ subject_code }, index) =>
  //           !subjectcode.includes(subject_code, index + 1));
  //         this.subjectcode=this.subjectcode.filter(x=>(x.subject_type!='LAB'))
  //         this.selectedSubjects = this.subjectcode; 
  //       }
  //     }
  //     this.evaluatorForm.get('subjectCode').setValue(this.subjectcode[0]?.subject_code)
  //   }
  //   else {
  //     for (let i = 0; i < this.examSubjects.length; i++) {
  //       if (this.examSubjects[i].course_year_code == courseYr && this.examSubjects[i].exam_month_yr == this.evaluatorForm.value.ExamMonthYear) {
  //         this.subjectcode1.push(this.examSubjects[i])
  //         const subjectcode = this.subjectcode1.map(({ subject_code }) => subject_code);
  //         this.subjectcode = this.subjectcode1.filter(({ subject_code }, index) =>
  //           !subjectcode.includes(subject_code, index + 1));
  //         this.subjectcode=this.subjectcode.filter(x=>(x.subject_type!='LAB'))
  //         this.selectedSubjects = this.subjectcode; 
  //         this.evaluatorForm.get('subjectCode').setValue(this.subjectcode[0]?.subject_code)

  //       }
  //     }
  //   }
  // }
  // selectedName(selectedName) {
  //   // console.log(selectedName);

  // }
  // selectedsubject() {
  //   this.flag = false;
  //   this.Formdata.get('examEvaluatorProfileId').setValue('')

  // }
  getEvaluationList() {
    // this.getstudentList();
    this.spinner.show();
    this.evaluationListData = []
    this.profileIds1 = [];
    this.timeTableDetIds = [];
    this.examStudentListdata = []
    this.examEvaluationList = []
    this.UnAssingedList = []
    this.searchNameData = []
    this.StudentEvaluationAssignment = []
    this.assignedOmrList = [];
    this.maintDataList = []
    this.flag = true;
    this.examStudentDataList = []
    this.evaluatorsOmrList = []
    this.selectedCount = 0
    this.Formdata.get('examEvaluatorProfileId').setValue('')
    if (this.evaluatorForm.valid) {
      let request = [
        { paramName: 'in_flag', paramValue: 'list_evaluatorassignment_list_reevaluation' },
        { paramName: 'in_orgid', paramValue: +localStorage.getItem('organizationId') },
        { paramName: 'in_fdate', paramValue: '1990-01-01' },
        { paramName: 'in_tdate', paramValue: '1990-01-01' },
        { paramName: 'in_evalutor_profileid', paramValue: 0 },
        { paramName: 'in_exam_date', paramValue: '1990-01-01' },
        { paramName: 'in_emp_id', paramValue: 0 },
        { paramName: 'in_questionpaper_id', paramValue: 0 },
        { paramName: 'in_evaluator_role_id', paramValue: 64 },
        { paramName: 'in_academic_year', paramValue: '' },
        { paramName: 'in_exam_short_name', paramValue: '' },
        { paramName: 'in_affiliatedto_catdet_id', paramValue: 0 },
        { paramName: 'in_exam_id', paramValue: this.evaluatorForm.value.examId },
        { paramName: 'in_course_year_id', paramValue: this.evaluatorForm.value.courseYearId },
        { paramName: 'in_subject_id', paramValue: this.evaluatorForm.value.subjectId },
        { paramName: 'in_regulation_id', paramValue: this.evaluatorForm.value.regulationId },
        { paramName: 'in_course_id', paramValue: this.evaluatorForm.value.courseId },
        { paramName: 'in_academic_year_id', paramValue: this.evaluatorForm.value.academicYearId },
        { paramName: 'in_loginuser_empid', paramValue: +localStorage.getItem('employeeId') }
      ];
      this.crudService.getDetailsByRequest(this.getExamEvaluationSubjectCodes, '', request, '&')
        .subscribe(result => {
          this.spinner.hide();
          if (result.statusCode === 200) {
            this.flag = true;
            if (result.data && result.data !== '' && result.data.result.length > 0) {
              this.examEvaluationList = result.data.result[0];
              this.evaluatorsOmrList = result.data.result[2];
              for (let i = 0; i < this.examEvaluationList.length; i++) {
                // this.assignzero=this.examEvaluationList[i].no_of_students_assigned-this.examEvaluationList[i].no_of_evaluations_completed
                //     if(this.assignzero==0){
                this.UnAssingedList.push(this.examEvaluationList[i])
                //   }
              }
              this.searchNameData = this.UnAssingedList
              if (this.searchNameData && this.searchNameData.length > 0) {
                // this.Formdata.get('examEvaluatorProfileId').setValue(this.searchNameData[0].pk_exam_evaluator_profile_id)
                // this.radioChange(this.searchNameData[0])
              }
              this.StudentEvaluationAssignment = result.data.result[1];
              this.UnAssinged = this.StudentEvaluationAssignment[0]?.UnAssinged;
              this.EvaluationStudents = this.StudentEvaluationAssignment[0]?.UnAssinged;
              this.totalStudents = this.StudentEvaluationAssignment[0]?.totalStudents;
              this.NoOfAnswerpapersUploaded = this.StudentEvaluationAssignment[0]?.NoOfAnswerpapersUploaded;
              this.NoOfAssigned = this.NoOfAnswerpapersUploaded - this.UnAssinged

              this.dataSource = new MatTableDataSource(this.examEvaluationList);
              this.dataSource.paginator = this.paginator;
              this.dataSource.sort = this.sort;
              //             this.examEvaluationList = result.data.result[0];
              // for (let i = 0; i < this.examEvaluationList.length; i++) {
              //   this.UnAssingedList.push(this.examEvaluationList[i]);
              // }
              // this.searchNameData = this.UnAssingedList
              // if (this.searchNameData && this.searchNameData.length > 0) {
              //   this.Formdata.get('examEvaluatorProfileId').setValue(this.searchNameData[0].pk_exam_evaluator_profile_id)
              //   this.radioChange(this.searchNameData[0])
              // }
              // this.StudentEvaluationAssignment = result.data.result[1];
              // this.UnAssinged = this.StudentEvaluationAssignment[0]?.UnAssinged;
              // this.EvaluationStudents = this.StudentEvaluationAssignment[0]?.UnAssinged;
              // this.totalStudents = this.StudentEvaluationAssignment[0]?.totalStudents;
              // this.NoOfAnswerpapersUploaded = this.StudentEvaluationAssignment[0]?.NoOfAnswerpapersUploaded;
              // this.NoOfAssigned=this.NoOfAnswerpapersUploaded-this.UnAssinged

              // this.dataSource = new MatTableDataSource(this.examEvaluationList);
              // this.dataSource.paginator = this.paginator;
              // this.dataSource.sort = this.sort;
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
  }
  // getEvaluationList() {
  //   // this.getstudentList();
  //   this.spinner.show();
  //   this.evaluationListData = []
  //   this.profileIds1 = [];
  //   this.timeTableDetIds = [];
  //   this.examStudentListdata = []
  //   this.examEvaluationList = []
  //   this.UnAssingedList = []
  //   this.searchNameData = []
  //   this.StudentEvaluationAssignment = []
  //   this.maintDataList=[]
  //   this.flag = true;
  //   this.examStudentDataList=[]
  //   this.selectedCount = 0
  //   this.Formdata.get('examEvaluatorProfileId').setValue('')
  //     if(this.evaluatorForm.value.CourseCode==0){
  //       this.courseCodeFilter=''
  //     }
  //     else{
  //       this.courseCodeFilter=this.evaluatorForm.value.CourseCode
  //     }
  //   if (this.evaluatorsubjectform.valid) {
  //     let empId = +localStorage.getItem('employeeId');
  //     // this.flag = false;
  //     /* -------- EXAM SESSIONS -------*/
  //     this.crudService.listByEighteenIds(this.getExamEvaluationSubjectCodes,
  //       'list_evaluatorassignment_list_reevaluation',
  //       this.evaluatorsubjectform.value.in_orgid,
  //       this.evaluatorsubjectform.value.in_fdate,
  //       this.evaluatorsubjectform.value.in_tdate,
  //       this.evaluatorForm.value.ExamMonthYear,
  //       this.courseCodeFilter,
  //       this.evaluatorForm.value.CourseYear,
  //       this.evaluatorForm.value.subjectCode,
  //       this.evaluatorsubjectform.value.in_evalutor_profileid,
  //       this.evaluatorsubjectform.value.in_exam_date,
  //       this.evaluatorsubjectform.value.in_regulation_code,
  //       0, 0, this.EvaluatorRole, '', '', 1,empId,

  //       'in_flag', 'in_orgid', 'in_fdate', 'in_tdate', 'in_exam_month_yr', 'in_course_code', 'in_course_year_code', 'in_subject_code', 'in_evalutor_profileid', 'in_exam_date', 'in_regulation_code', 'in_emp_id', 'in_questionpaper_id', 'in_evaluator_role_id', 'in_academic_year', 'in_exam_short_name', 'in_affiliatedto_catdet_id',
  //       'in_loginuser_empid'
  //     )
  //       .subscribe(result => {
  //         this.spinner.hide();
  //         if (result.statusCode === 200) {
  //           this.flag = true;

  //           if (result.data && result.data !== '' && result.data.result.length > 0) {
  //             this.examEvaluationList = result.data.result[0];
  //             for (let i = 0; i < this.examEvaluationList.length; i++) {
  //               // this.assignzero=this.examEvaluationList[i].no_of_students_assigned-this.examEvaluationList[i].no_of_evaluations_completed
  //               //     if(this.assignzero==0){
  //               this.UnAssingedList.push(this.examEvaluationList[i])

  //               //   }
  //             }
            
  //             this.searchNameData = this.UnAssingedList
  //             if (this.searchNameData && this.searchNameData.length > 0) {
  //               this.Formdata.get('examEvaluatorProfileId').setValue(this.searchNameData[0].pk_exam_evaluator_profile_id)
  //               this.radioChange(this.searchNameData[0])
  //             }
  //             this.StudentEvaluationAssignment = result.data.result[1];
  //             this.UnAssinged = this.StudentEvaluationAssignment[0]?.UnAssinged;
  //             this.EvaluationStudents = this.StudentEvaluationAssignment[0]?.UnAssinged;
  //             this.totalStudents = this.StudentEvaluationAssignment[0]?.totalStudents;
  //             this.NoOfAnswerpapersUploaded = this.StudentEvaluationAssignment[0]?.NoOfAnswerpapersUploaded;
  //             this.NoOfAssigned=this.NoOfAnswerpapersUploaded-this.UnAssinged

  //             this.dataSource = new MatTableDataSource(this.examEvaluationList);
  //             this.dataSource.paginator = this.paginator;
  //             this.dataSource.sort = this.sort;
            


  //           } else {
  //             this.snotifyService.success(result.message, 'Success!');
  //           }
  //         } else {
  //           this.snotifyService.error(result.message, 'Error!');
  //         }
  //       }, error => {
  //         this.spinner.hide();
  //         if (error.error.statusCode === 401) {
  //           this.snotifyService.error(error.error.message, 'Error!');
  //           this.genericFunctions.logOut(this.router.url);
  //         } else {
  //           this.snotifyService.error(CONSTANTS.message.CON_ERROR, 'Error!');
  //         }
  //       });

  //   }
  // }
  getstudentList() {
    this.examStudentList1 = []
    this.examStudentList2 = []
    this.examStudentList = []
    this.flag = true;
    if (this.evaluatorForm.valid) {
      this.spinner.show();
      let request = [
        { paramName: 'in_flag', paramValue: 'list_evaluationstudent_list_revision' },
        { paramName: 'in_orgid', paramValue: +localStorage.getItem('organizationId') },
        { paramName: 'in_fdate', paramValue: '1990-01-01' },
        { paramName: 'in_tdate', paramValue: '1990-01-01' },
        { paramName: 'in_evalutor_profileid', paramValue: 0 },
        { paramName: 'in_exam_date', paramValue: '1990-01-01' },
        { paramName: 'in_emp_id', paramValue: 0 },
        { paramName: 'in_questionpaper_id', paramValue: 0 },
        { paramName: 'in_evaluator_role_id', paramValue: 0 },
        { paramName: 'in_academic_year', paramValue: '' },
        { paramName: 'in_exam_short_name', paramValue: '' },
        { paramName: 'in_affiliatedto_catdet_id', paramValue: 0 },
        { paramName: 'in_exam_id', paramValue: this.evaluatorForm.value.examId },
        { paramName: 'in_course_year_id', paramValue: this.evaluatorForm.value.courseYearId },
        { paramName: 'in_subject_id', paramValue: this.evaluatorForm.value.subjectId },
        { paramName: 'in_regulation_id', paramValue: this.evaluatorForm.value.regulationId },
        { paramName: 'in_course_id', paramValue: this.evaluatorForm.value.courseId },
        { paramName: 'in_academic_year_id', paramValue: this.evaluatorForm.value.academicYearId },
        { paramName: 'in_loginuser_empid', paramValue: +localStorage.getItem('employeeId') }
      ];
      this.crudService.getDetailsByRequest(this.getExamEvaluationSubjectCodes, '', request, '&')
        .subscribe(result => {
          this.spinner.hide();
          if (result.statusCode === 200) {
            if (result.data && result.data !== '' && result.data.result.length > 0) {
              this.examStudentList = result.data.result[0];
              for (let i = 0; i < this.examStudentList.length; i++) {
                // if(this.examStudentList[i].rnk==1 && this.examStudentList[i].is_answerpaper_uploaded==1){
                if (this.examStudentList[i].is_answerpaper_uploaded == 1) {
                  this.examStudentList1.push(this.examStudentList[i])
                  this.examStudentList2 = this.examStudentList1
                }
              }
              this.getEvaluationList();
            } else {
              this.snotifyService.success(result.message, 'Success!');
              this.getEvaluationList();
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
  }

  // getstudentList() {
  //   this.examStudentList1 = []
  //   this.examStudentList2 = []
  //   this.examStudentList=[]
  //   this.flag = true;
  //   if(this.evaluatorForm.value.CourseCode==0){
  //     this.courseCodeFilter=''
  //   }
  //   else{
  //     this.courseCodeFilter=this.evaluatorForm.value.CourseCode
  //   }
  //   if (this.evaluatorsubjectform.valid) {
  //     let empId = +localStorage.getItem('employeeId');
  //     // this.flag = false;
  //     /* -------- EXAM SESSIONS -------*/
  //     // this.crudService.listByEighteenIds(this.getExamEvaluationSubjectCodes,
  //     //   'list_evaluationstudent_list',
  //     //   this.evaluatorsubjectform.value.in_orgid,
  //     //   this.evaluatorsubjectform.value.in_fdate,
  //     //   this.evaluatorsubjectform.value.in_tdate,
  //     //   this.evaluatorForm.value.ExamMonthYear,
  //     //   this.courseCodeFilter,
  //     //   this.evaluatorForm.value.CourseYear,
  //     //   this.evaluatorForm.value.subjectCode,
  //     //   this.evaluatorsubjectform.value.in_evalutor_profileid,
  //     //   this.evaluatorsubjectform.value.in_exam_date,
  //     //   this.evaluatorsubjectform.value.in_regulation_code,
  //     //   0, 0, 0, '', '', 1,empId,

       
  //     //   'in_flag', 'in_orgid', 'in_fdate', 'in_tdate', 'in_exam_month_yr', 'in_course_code', 'in_course_year_code', 'in_subject_code', 'in_evalutor_profileid', 'in_exam_date', 'in_regulation_code', 'in_emp_id', 'in_questionpaper_id', 'in_evaluator_role_id', 'in_academic_year', 'in_exam_short_name', 'in_affiliatedto_catdet_id',
  //     //   'in_loginuser_empid'
  //     // )
  //     // .subscribe(result => {
  //     this.crudService.listByEighteenIds(this.getExamEvaluationSubjectCodes, 
  //       'list_evaluationstudent_list_revision',
  //       this.evaluatorsubjectform.value.in_orgid, 
  //     this.evaluatorsubjectform.value.in_fdate, 
  //     this.evaluatorsubjectform.value.in_tdate, 
  //     this.evaluatorForm.value.ExamMonthYear, 
  //     this.evaluatorForm.value.CourseCode,
  //     this.evaluatorForm.value.CourseYear, 
  //     this.evaluatorForm.value.subjectCode,
  //     this.evaluatorsubjectform.value.in_evalutor_profileid,
  //     this.evaluatorsubjectform.value.in_exam_date,
  //     this.evaluatorsubjectform.value.in_regulation_code,
  //  0,0,0,'','',1,empId,
     
  //    //  this.evaluatorsubjectform.value.in_exam_date,
  //    //  this.evaluatorsubjectform.value.in_regulation_code,
  //     'in_flag', 'in_orgid' ,'in_fdate', 'in_tdate', 'in_exam_month_yr', 'in_course_code', 'in_course_year_code','in_subject_code', 'in_evalutor_profileid','in_exam_date','in_regulation_code','in_emp_id','in_questionpaper_id','in_evaluator_role_id','in_academic_year','in_exam_short_name',
  //     'in_affiliatedto_catdet_id','in_loginuser_empid'
  //      )
 
  //       .subscribe(result => {
  //         this.spinner.hide();
  //         if (result.statusCode === 200) {
  //           if (result.data && result.data !== '' && result.data.result.length > 0) {
  //             this.examStudentList = result.data.result[0];
  //             for (let i = 0; i < this.examStudentList.length; i++) {
  //               // if(this.examStudentList[i].rnk==1 && this.examStudentList[i].is_answerpaper_uploaded==1){
  //               if (this.examStudentList[i].is_answerpaper_uploaded == 1) {
  //                 this.examStudentList1.push(this.examStudentList[i])
  //                 this.examStudentList2 = this.examStudentList1
  //               }
  //             }
  //             this.getEvaluationList();

  //           } else {
  //             this.snotifyService.success(result.message, 'Success!');
  //             this.getEvaluationList();

  //           }
  //         } else {
  //           this.snotifyService.error(result.message, 'Error!');
  //         }
  //       }, error => {
  //         this.spinner.hide();
  //         if (error.error.statusCode === 401) {
  //           this.snotifyService.error(error.error.message, 'Error!');
  //           this.genericFunctions.logOut(this.router.url);
  //         } else {
  //           this.snotifyService.error(CONSTANTS.message.CON_ERROR, 'Error!');
  //         }
  //       });
  //   }
  // }

  // searchdata(value) {
  //   this.selectedSubjects = []
  //   this.search(value);
  // }
  // search(value: string) {
  //   let filter = value.toLowerCase();
  //   for (let i = 0; i < this.subjectcode.length; i++) {
  //     let option = this.subjectcode[i];
  //     if (option.subject_name.toLowerCase().indexOf(filter) >= 0) {
  //       this.selectedSubjects.push(option);
  //     }
  //     else if (option.subject_code.toLowerCase().indexOf(filter) >= 0) {
  //       this.selectedSubjects.push(option);
  //     }
  //   }
  // }

  searchName(value) {
    this.searchNameData = []
    this.searchNames(value);
  }
  searchNames(value: string) {
    let filter = value.toLowerCase();
    for (let i = 0; i < this.UnAssingedList.length; i++) {
      let option = this.UnAssingedList[i];
      if (option.evaluator_name.toLowerCase().indexOf(filter) >= 0) {
        this.searchNameData.push(option);
      }
    }
  }
  searchOmrNo(value) {
    this.examStudentList2 = []
    this.searchOmrNos(value);
  }
  searchOmrNos(value: string) {
    let filter = value.toLowerCase();
    for (let i = 0; i < this.examStudentList1.length; i++) {
      let option = this.examStudentList1[i];
      if (option.omr_serial_no.toLowerCase().indexOf(filter) >= 0) {
        this.examStudentList2.push(option);
      }

    }
  }
  searchMonthYear(value) {
    this.monthYearDuplicateList = []
    this.searchMonthYears(value);
  }
  searchMonthYears(value: string) {
    let filter = value.toLowerCase();
    for (let i = 0; i < this.monthYear.length; i++) {
      let option = this.monthYear[i];
      if (option.exam_month_yr.toLowerCase().indexOf(filter) >= 0) {
        this.monthYearDuplicateList.push(option);
      }
    }
  }

  checkedserialNo(check, item) {
    item.isSelected = check;
    this.selectedCount = 0;
    this.examStudentListdata = [];
    for (let i = 0; i < this.maintDataList.length; i++) {
      if (this.maintDataList[i].isSelected) {
        this.examStudentListdata.push(this.maintDataList[i]);
        this.selectedCount++;
      }
      else {

      }
    }
  }
  markItems(): void {
    this.selectedCount = 0;
    this.examStudentListdata = [];
    // for (let i = 0; i < this.maintDataList.length; i++) {
    //   if (this.checksubject) {
    //     this.maintDataList[i].checked = true;
    //     this.maintDataList[i].isSelected = true;
    //     this.examStudentListdata.push(this.maintDataList[i]);
    //     this.selectedCount++;

    //   } else {
    //     this.maintDataList[i].checked = false;
    //     this.maintDataList[i].isSelected = false;
    //     this.checksubject = false
    //     this.examStudentListdata = []
    //     // this.examStudentList1=[]
    //   }
    // }
    for (let i = 0; i < this.maintDataList.length; i++) {
      if (this.checksubject) {
        if (!this.maintDataList[i].disable) {
          this.maintDataList[i].checked = true;
          this.maintDataList[i].isSelected = true;
          this.examStudentListdata.push(this.maintDataList[i]);
          this.selectedCount++;
        }
      } else {
        this.maintDataList[i].checked = false;
        this.maintDataList[i].isSelected = false;
        this.checksubject = false
        this.examStudentListdata = []
        // this.examStudentList1=[]
      }
    }
  }
  // markItems(): void {
  //   this.selectedCount = 0;
  //   this.examStudentListdata = [];
  //   for (let i = 0; i < this.maintDataList.length; i++) {
  //     if (this.checksubject) {
  //       this.maintDataList[i].checked = true;
  //       this.maintDataList[i].isSelected = true;
  //       this.examStudentListdata.push(this.maintDataList[i]);
  //       this.selectedCount++;

  //     } else {
  //       this.maintDataList[i].checked = false;
  //       this.maintDataList[i].isSelected = false;
  //       this.checksubject = false
  //       this.examStudentListdata = [];
  //     }
  //   }
  // }
  checkedevaluator(check, item) {
    this.evaluationListData = []
    // if(check==true){
    this.evaluationListData.push(item)
    // }

    for (let i = 0; i < this.evaluationListData.length; i++) {
      if (check == false) {
        for (let j = 0; j < this.profileIds1.length; j++) {
          for (let index = 0; index < this.timeTableDetIds.length; index++) {
            if (this.evaluationListData[i].pk_exam_evaluator_profile_id == this.profileIds1[j]) {
              this.profileIds1.splice(j, 1);
              this.timeTableDetIds.splice(index, 1)
            }
          }
        }
      }
      else {
        this.profileIds1.push(this.evaluationListData[i].pk_exam_evaluator_profile_id);
        this.timeTableDetIds.push(this.evaluationListData[i].pk_examevaluator_profiledet_id);

      }

    }

  }
  markEvaluators() {
    this.profileIds1 = [];
    for (let i = 0; i < this.searchNameData.length; i++) {
      if (this.checkevaluator) {
        this.searchNameData[i].checked = true;
        // this.profileIds1.push(this.searchNameData[i]);
        this.profileIds1.push(this.searchNameData[i].pk_exam_evaluator_profile_id);
        this.timeTableDetIds.push(this.searchNameData[i].pk_examevaluator_profiledet_id);

      } else {
        this.searchNameData[i].checked = false;
        this.checkevaluator = false
        this.profileIds1 = []
        this.timeTableDetIds = []
        // this.examStudentList1=[]
      }
    }

  }
  radioChange(row) {
    this.profileTimeTableId = row.pk_exam_timetable_det_ids
    this.examStudentDataList = []
    this.maintDataList = []
    this.examStudentListdata = []
    this.assignedOmrList = []
    this.checksubject = false
    this.selectedCount = 0
    // this.examStudentDataList = this.examStudentList2.filter(x => (x.fk_exam_evaluator_profile_id === row.pk_exam_evaluator_profile_id || x.rnk > 1));
    // for (let index = 0; index < this.examStudentList2.length; index++) {
    //   if (this.examStudentDataList.filter(x => (x.omr_serial_no === this.examStudentList2[index].omr_serial_no)).length === 1) {
    //     if (this.examStudentList2[index].rnk == 1) {
    //       this.maintDataList.push(this.examStudentList2[index]
    //     }
    //   }
    // }
    // 15/01/2024
    // this.examStudentDataList = this.examStudentList2.filter(x => (x.fk_exam_evaluator_profile_id === row.pk_exam_evaluator_profile_id || x.omr_mapped < 2  ));
    // for (let index = 0; index < this.examStudentDataList.length; index++) {
    //   if (this.examStudentList2.filter(x => (x.omr_serial_no === this.[index].omr_serial_no
    //      && x.fk_exam_evaluator_profile_id === row.pk_exam_evaluator_profile_id)).length == 0) {examStudentDataList
    //     if (this.examStudentDataList[index].rnk == 1) {
    //       this.maintDataList.push(this.examStudentDataList[index])
    //     }
    //   }
    //   else{
    //     this.assignedOmrList.push(this.examStudentDataList[index])
    //   }
    // }
    for (let ind = 0; ind < this.examStudentList2.length; ind++) {
      this.examStudentList2[ind].disable = false
      this.examStudentList2[ind].checked = false
      this.examStudentList2[ind].isSelected = false
      const excludedProfiles = this.examStudentList2[ind].exclude_fk_exam_evaluator_profile_id
        ? this.examStudentList2[ind].exclude_fk_exam_evaluator_profile_id.split(',')
        : []; // Default to an empty array if null or undefined
      const isExcluded = excludedProfiles.includes(row?.pk_exam_evaluator_profile_id.toString());
      const isOmrDisabled = this.examStudentList2[ind].disable_omr === 1;
      if (isExcluded) {
        this.assignedOmrList.push(this.examStudentList2[ind]);
      }
      if (isExcluded || isOmrDisabled) {
        this.examStudentList2[ind].disable = true;
      } else {
        this.examStudentList2[ind].disable = false;
      }
    }
    this.maintDataList = this.examStudentList2
    this.maintDataList = [...this.maintDataList].sort((a, b) => {
      if (a.disable !== b.disable) {
        return a.disable ? 1 : -1;
      }
    })
    this.maintDataList.sort((a, b) => a.omr_mapped - b.omr_mapped);
  }
  // radioChange(row) {
  //   console.log(row,'row')
  //   this.profileTimeTableId = row.pk_examevaluator_profiledet_id;
  //   // let timeTableArry = this.profileTimeTableId.includes(',') ? this.profileTimeTableId.split(',') : [this.profileTimeTableId];
  //   let timeTableArry = typeof this.profileTimeTableId === 'string' && this.profileTimeTableId.includes(',')
  // ? this.profileTimeTableId.split(',').map(id => Number(id))
  // : [Number(this.profileTimeTableId)];
  // console.log(timeTableArry,'timeTableArry');
  //   this.examStudentDataList = [];
  //   this.maintDataDuplicateList = [];
  //   this.examStudentListdata = [];
  //   this.maintDataList = [];
  //   this.checksubject = false;
  //   this.selectedCount = 0;
  //   // this.examStudentDataList = this.examStudentList2.filter(x => (x.fk_exam_evaluator_profile_id === row.pk_exam_evaluator_profile_id || x.omr_revision_cnt<2 ));
  //   // this.examStudentDataList = this.examStudentList2.filter(x => (x.fk_exam_evaluator_profile_id === row.pk_exam_evaluator_profile_id ));
  //   this.examStudentDataList = this.examStudentList2;
  //   for (let index = 0; index < this.examStudentDataList.length; index++) {
  //     if (this.examStudentList2.filter(x => (x.omr_serial_no === this.examStudentDataList[index].omr_serial_no  
  //        && x.fk_exam_evaluator_profile_id === row.pk_exam_evaluator_profile_id)).length == 0) {
  //       if (this.examStudentDataList[index].rnk == 1) {
  //         this.maintDataDuplicateList.push(this.examStudentDataList[index]);
  //       }
  //     }
  //   }
  
   
  //   if(this.maintDataDuplicateList && this.maintDataDuplicateList.length > 0){
  //     const maintDataDuplicateList = this.maintDataDuplicateList.map(({ omr_serial_no }) => omr_serial_no);
  //     this.maintDataDuplicateList = this.maintDataDuplicateList.filter(({ omr_serial_no }, index) =>
  //     !maintDataDuplicateList.includes(omr_serial_no, index + 1));
  //             }
              
  //             for (let i = 0; i < timeTableArry.length; i++) {
  //               for (let j = 0; j < this.maintDataDuplicateList.length; j++) {
  //                 if(timeTableArry[i]==this.maintDataDuplicateList[j].pk_examevaluator_profiledet_id){
  //                   this.maintDataList.push(this.maintDataDuplicateList[j])
  //                 }
  //               }
               
  //             }

              
  //   // for (let index = 0; index < this.examStudentList2.length; index++) {
  //   //   if (this.examStudentDataList.filter(x => (x.omr_serial_no === this.examStudentList2[index].omr_serial_no)).length == 0) {
  //   //     if (this.examStudentList2[index].rnk == 1) {
  //   //       this.maintDataList.push(this.examStudentList2[index])

  //   //     }
  //   //   }

  //   // }

  // }

  Assign() {
    // this.spinner.show();
    this.assigndata = []
    this.assignEvaluator = []
    // for (let j = 0; j < this.UnAssingedList.length; j++) {
    //   if (this.UnAssingedList[j].pk_exam_evaluator_profile_id == this.Formdata.value.examEvaluatorProfileId) {
    //     this.assigndata.push(this.UnAssingedList[j])
    //   }
    // }
    
    for (let i = 0; i < this.examStudentListdata.length; i++) {
      this.assignEvaluator.push(this.examStudentListdata[i].omr_serial_no)
    }
    let request = [
      { paramName: 'in_flag', paramValue: 'MultipleUpdateEvaluationAssignment_revision' },
      { paramName: 'in_profileids', paramValue: this.Formdata.value.examEvaluatorProfileId },
      { paramName: 'in_exam_evaluationassignment_ids', paramValue: '' },
      { paramName: 'in_omr_serial_nos', paramValue: this.assignEvaluator.join(',') },
      { paramName: 'in_timetable_det_ids', paramValue: '' },
      { paramName: 'in_exam_id', paramValue: this.evaluatorForm.value.examId },
      { paramName: 'in_subject_id', paramValue: this.evaluatorForm.value.subjectId },
      { paramName: 'in_course_year_id', paramValue: this.evaluatorForm.value.courseYearId }
    ];
    this.crudService.getDetailsByRequest(this.evaluatorassignmentUrl, '', request, '&')
      .subscribe(result => {
        this.spinner.hide();
        if (result.statusCode === 200) {
          this.flag = false;
          if (result.data && result.data !== '' && result.data.result.length > 0) {
            this.snotifyService.success(result.message, 'Success!');
            // this.getEvaluationList();
            this.getstudentList()
            this.evaluationListData = [];
          } else {
            this.snotifyService.success(result.message, 'Success!');
            this.getstudentList();
            this.evaluationListData = [];

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
  clickEvent(row, list) {
    this.AssignStudentDataList = [];
    // if (list === 'CompletedList') {
    //   this.AssignStudentDataList = this.examStudentList2.filter(x => (x.fk_exam_evaluator_profile_id === row.pk_exam_evaluator_profile_id && x.evaluated_totalmarks!=null));
    // }
    // else if (list == 'DueList') {
    //   this.AssignStudentDataList = this.examStudentList2.filter(x => (x.fk_exam_evaluator_profile_id === row.pk_exam_evaluator_profile_id && x.evaluated_totalmarks===null));
    // }
    // else{
    //   this.AssignStudentDataList = this.examStudentList2.filter(x => (x.fk_exam_evaluator_profile_id === row.pk_exam_evaluator_profile_id));
    // }
    if (list === 'CompletedList') {
      this.AssignStudentDataList = this.evaluatorsOmrList.filter(x => (x.pk_exam_evaluator_profile_id === row.pk_exam_evaluator_profile_id && x.evaluated_totalmarks != null && x.omr_serial_no != null));
    }
    else if (list == 'DueList') {
      this.AssignStudentDataList = this.evaluatorsOmrList.filter(x => (x.pk_exam_evaluator_profile_id === row.pk_exam_evaluator_profile_id && x.evaluated_totalmarks === null && x.omr_serial_no != null));
    }
    else {
      this.AssignStudentDataList = this.evaluatorsOmrList.filter(x => (x.pk_exam_evaluator_profile_id === row.pk_exam_evaluator_profile_id && x.omr_serial_no != null));
    }
    // this.Barcode = row;
    const dialogRef = this.dialog.open(StudentAssignedListComponent, {
      width: '750px',
      data: this.AssignStudentDataList
    });
    dialogRef.afterClosed().subscribe(details => {
    });
  }
  rundata(){
    this.spinner.show();
    this.crudService.listByNineIds(this.getevaluatorassignmentUrl, 
      're_evaluation_assignment_pop',
      '',
      '',
      this.evaluatorForm.value.ExamMonthYear, 
      '', 
     '' ,
      this.evaluatorForm.value.CourseCode,
      '' ,
      '' ,
      'in_flag', 'in_profileids' ,'in_subject_code', 'in_exam_month_yr', 'in_coursegroup','in_courseyear','in_coursecode','in_exam_evaluationassignment_ids','in_timetable_det_ids'
     )
  .subscribe(result => {
    this.spinner.hide();
      if (result.statusCode === 200){
        if(result.success==true){
          //  if (result.data && result.data !== '' && result.data.result.length > 0) {
            this.snotifyService.success(result.message, 'Success!');  
  
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
  getFiltersData(): void {
    this.flag = false;
    this.spinner.show();
    let request = [
      { paramName: 'in_flag', paramValue: 'univ_exam_filters' },
      { paramName: 'in_flag_type', paramValue: 'REGSUP' },
      { paramName: 'in_university_id', paramValue: 0 },
      { paramName: 'in_univ_examcenter_id', paramValue: 0 },
      { paramName: 'in_college_id', paramValue: 0 },
      { paramName: 'in_course_id', paramValue: 0 },
      { paramName: 'in_course_group_id', paramValue: 0 },
      { paramName: 'in_course_year_id', paramValue: 0 },
      { paramName: 'in_exam_id', paramValue: 0 },
      { paramName: 'in_academic_year_id', paramValue: 0 },
      { paramName: 'in_regulation_id', paramValue: 0 },
      { paramName: 'in_subject_id', paramValue: 0 },
      { paramName: 'in_sub_flag_type', paramValue: '' },
      { paramName: 'in_param1', paramValue: 0 },
      { paramName: 'in_param2', paramValue: 0 },
      { paramName: 'in_loginuser_roleid', paramValue: 0 },
      { paramName: 'in_loginuser_empid', paramValue: +localStorage.getItem('employeeId') },
    ];
    this.crudService.getDetailsByRequest(this.examFiltersByCodeUrl, '', request, '&')
      .subscribe(result => {
        this.spinner.hide();
        if (result.statusCode === 200) {
          if (result.data && result.data !== '' && result.data.result.length > 0) {
            this.filtersDetailsList = result.data.result;
            for (const list of this.filtersDetailsList) {
              if (list?.length > 0 && list[0].flag === 'univ_exam_filters') {
                this.examSubjects = list;
                break;
              }
            }
            /*----------- COURSE -----------*/
            if (this.examSubjects && this.examSubjects.length > 0) {
              const courseCodeData = this.examSubjects.map(({ fk_course_id }) => fk_course_id);
              this.courseCode = this.examSubjects.filter(({ fk_course_id }, index) =>
                !courseCodeData.includes(fk_course_id, index + 1));
            }
            if (this.courseCode && this.courseCode.length > 0) {
              this.evaluatorForm.get('courseId').setValue(this.courseCode[0].fk_course_id);
              this.selectedCourse(this.evaluatorForm.value.courseId);
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
  selectedCourse(courseId) {
    this.flag = false;
    this.academicYearsList = [];
    this.academicYears = [];
    this.examList = [];
    this.examDataList = []
    this.examDuplicateList = []
    this.courseYearDetails = [];
    this.courseyearcode1 = [];
    this.courseyearcode = [];
    this.regulationsList = [];
    this.regulations = [];
    this.subjectListDetails = [];
    this.evaluatorForm.get('academicYearId').setValue('')
    this.evaluatorForm.get('examId').setValue('')
    this.evaluatorForm.get('courseYearId').setValue('')
    this.evaluatorForm.get('regulationId').setValue('')
    this.evaluatorForm.get('subjectId').setValue('')
    /*----------- ACADEMIC YEARS -----------*/
    if (courseId != null && courseId !== undefined) {
      this.academicYearsList = this.examSubjects.filter(x => (x.fk_course_id === this.evaluatorForm.value.courseId))
      if (this.academicYearsList.length > 0) {
        const academicYears = this.academicYearsList.map(({ fk_academic_year_id }) => fk_academic_year_id);
        this.academicYears = this.academicYearsList.filter(({ fk_academic_year_id }, index) => !academicYears.includes(fk_academic_year_id, index + 1));
      }
      if (this.academicYears.length > 0) {
        this.academicYears = this.academicYears.sort((a, b) => parseInt(b.academic_year) - parseInt(a.academic_year))
        this.evaluatorForm.get('academicYearId').setValue(this.academicYears[0].fk_academic_year_id);
        this.selectedAcademicYear(this.evaluatorForm.value.academicYearId)
      }
    }
  }
  selectedAcademicYear(academicYearId) {
    this.flag = false;
    this.examList = [];
    this.examDataList = [];
    this.examDuplicateList = [];
    this.courseYearDetails = [];
    this.courseyearcode1 = [];
    this.courseyearcode = [];
    this.regulationsList = [];
    this.regulations = [];
    this.subjectListDetails = [];
    this.evaluatorForm.get('examId').setValue('')
    this.evaluatorForm.get('courseYearId').setValue('')
    this.evaluatorForm.get('regulationId').setValue('')
    this.evaluatorForm.get('subjectId').setValue('')
    this.evaluatorForm.get('regulationId').setValue('');
    /*----------- Exams List -----------*/
    if (academicYearId !== null && academicYearId !== undefined) {
      this.examDataList = this.examSubjects.filter(x => (x.fk_course_id === this.evaluatorForm.value.courseId && x.fk_academic_year_id === this.evaluatorForm.value.academicYearId))
      if (this.examDataList.length > 0) {
        const examsLists = this.examDataList.map(({ fk_exam_id }) => fk_exam_id);
        this.examList = this.examDataList.filter(({ fk_exam_id }, index) =>
          !examsLists.includes(fk_exam_id, index + 1));
        this.examDuplicateList = this.examList;
      }
      if (this.examDuplicateList && this.examDuplicateList.length > 0) {
        this.evaluatorForm.get('examId').setValue(this.examList[0].fk_exam_id)
        this.selectedExam(this.evaluatorForm.value.examId)
      }
    }
  }
  searchExam(value) {
    this.examDuplicateList = []
    this.searchExamData(value);
  }
  searchExamData(value: string) {
    let filter = value.toLowerCase();
    for (let i = 0; i < this.examList.length; i++) {
      let option = this.examList[i];
      if (option.exam_name.toLowerCase().indexOf(filter) >= 0) {
        this.examDuplicateList.push(option);
      }
    }
  }
  selectedExam(examId) {
    this.flag = false;
    this.courseYearDetails = [];
    this.courseyearcode1 = [];
    this.courseyearcode = [];
    this.regulationsList = [];
    this.regulations = [];
    this.subjectListDetails = [];
    this.evaluatorForm.get('courseYearId').setValue('')
    this.evaluatorForm.get('regulationId').setValue('')
    this.evaluatorForm.get('subjectId').setValue('')
    if (examId != null && examId !== undefined) {
      let request = [
        { paramName: 'in_flag', paramValue: 'univ_exam_rest_in_regexamstd' },
        { paramName: 'in_flag_type', paramValue: 'REGSUP' },
        { paramName: 'in_university_id', paramValue: 0 },
        { paramName: 'in_univ_examcenter_id', paramValue: 0 },
        { paramName: 'in_college_id', paramValue: 0 },
        { paramName: 'in_course_id', paramValue: this.evaluatorForm.value.courseId },
        { paramName: 'in_course_group_id', paramValue: 0 },
        { paramName: 'in_course_year_id', paramValue: 0 },
        { paramName: 'in_exam_id', paramValue: this.evaluatorForm.value.examId },
        { paramName: 'in_academic_year_id', paramValue: this.evaluatorForm.value.academicYearId },
        { paramName: 'in_regulation_id', paramValue: 0 },
        { paramName: 'in_subject_id', paramValue: 0 },
        { paramName: 'in_sub_flag_type', paramValue: '' },
        { paramName: 'in_param1', paramValue: 0 },
        { paramName: 'in_param2', paramValue: 0 },
        { paramName: 'in_loginuser_roleid', paramValue: 0 },
        { paramName: 'in_loginuser_empid', paramValue: +localStorage.getItem('employeeId') },
      ];
      this.crudService.getDetailsByRequest(this.examFiltersByCodeUrl, '', request, '&')
        .subscribe(result => {
          this.spinner.hide();
          if (result.statusCode === 200) {
            if (result.data && result.data !== '' && result.data.result.length > 0) {
              this.courseYearDetails = result.data.result;
              for (const list of this.courseYearDetails) {
                if (list?.length > 0 && list[0].flag === 'univ_exam_rest_filters') {
                  this.courseyearcode1 = list;
                  break;  // Stop looping once we find the first match
                }
              }
              /*----------- COURSE YEAR -----------*/
              if (this.courseyearcode1.length > 0) {
                const courseYearsList = this.courseyearcode1.map(({ fk_course_year_id }) => fk_course_year_id);
                this.courseyearcode = this.courseyearcode1.filter(({ fk_course_year_id }, index) =>
                  !courseYearsList.includes(fk_course_year_id, index + 1));
              }
              if (this.courseyearcode && this.courseyearcode.length > 0) {
                this.evaluatorForm.get('courseYearId').setValue(this.courseyearcode[0].fk_course_year_id)
                this.selectedCourseYr(this.evaluatorForm.value.courseYearId);
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
  }
  selectedCourseYr(courseYrId) {
    this.flag = false;
    this.regulationsList = [];
    this.regulations = [];
    this.subjectListDetails = [];
    this.subjectcode1 = [];
    this.subjectcode = [];
    this.evaluatorForm.get('regulationId').setValue('')
    this.evaluatorForm.get('subjectId').setValue('')
    /*----------- REGULATION -----------*/
    this.regulationsList = this.courseyearcode1.filter(x => (x.fk_course_year_id === this.evaluatorForm.value.courseYearId))
    if (this.regulationsList && this.regulationsList.length > 0) {
      const regulationsList = this.regulationsList.map(({ fk_regulation_id }) => fk_regulation_id);
      this.regulations = this.regulationsList.filter(({ fk_regulation_id }, index) => !regulationsList.includes(fk_regulation_id, index + 1));
    }
    if (this.regulations && this.regulations.length > 0) {
      this.evaluatorForm.get('regulationId').setValue(this.regulations[0].fk_regulation_id);
      this.selectedRegulation(this.evaluatorForm.value.regulationId);
    }
  }
  selectedRegulation(regulationId) {
    this.subjectListDetails = [];
    this.subjectcode1 = [];
    this.subjectcode = [];
    this.evaluatorForm.get('subjectId').setValue('');
    if (this.evaluatorForm.value.regulationId != null && regulationId != null) {
      /*----------- SUBJECTS -----------*/
      let request = [
        { paramName: 'in_flag', paramValue: 'univ_exam_subject_regexamstd' },
        { paramName: 'in_flag_type', paramValue: 'REGSUP' },
        { paramName: 'in_university_id', paramValue: 0 },
        { paramName: 'in_univ_examcenter_id', paramValue: 0 },
        { paramName: 'in_college_id', paramValue: 0 },
        { paramName: 'in_course_id', paramValue: this.evaluatorForm.value.courseId },
        { paramName: 'in_course_group_id', paramValue: 0 },
        { paramName: 'in_course_year_id', paramValue: this.evaluatorForm.value.courseYearId },
        { paramName: 'in_exam_id', paramValue: this.evaluatorForm.value.examId },
        { paramName: 'in_academic_year_id', paramValue: this.evaluatorForm.value.academicYearId },
        { paramName: 'in_regulation_id', paramValue: this.evaluatorForm.value.regulationId },
        { paramName: 'in_sub_flag_type', paramValue: 'NoLAB' },
        { paramName: 'in_subject_id', paramValue: 0 },
        { paramName: 'in_param1', paramValue: 0 },
        { paramName: 'in_param2', paramValue: 0 },
        { paramName: 'in_loginuser_roleid', paramValue: 0 },
        { paramName: 'in_loginuser_empid', paramValue: +localStorage.getItem('employeeId') },
      ];
      this.crudService.getDetailsByRequest(this.examFiltersByCodeUrl, '', request, '&')
        .subscribe(result => {
          this.spinner.hide();
          if (result.statusCode === 200) {
            if (result.data && result.data !== '' && result.data.result.length > 0) {
              this.subjectListDetails = result.data.result;
              for (const list of this.subjectListDetails) {
                if (list?.length > 0 && list[0].flag === 'univ_exam_sub_regexamstd') {
                  this.subjectcode1 = list;
                  break;
                }
              }
              if (this.subjectcode1 && this.subjectcode1.length > 0) {
                const subjectList = this.subjectcode1.map(({ fk_subject_id }) => fk_subject_id);
                this.subjectcode = this.subjectcode1.filter(({ fk_subject_id }, index) =>
                  !subjectList.includes(fk_subject_id, index + 1));
                this.selectedSubjects = this.subjectcode;
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
  }
  searchSubject(value) {
    this.selectedSubjects = []
    this.search(value);
  }
  search(value: string) {
    let filter = value.toLowerCase();
    for (let i = 0; i < this.subjectcode.length; i++) {
      let option = this.subjectcode[i];
      if (option.subject_name.toLowerCase().indexOf(filter) >= 0) {
        this.selectedSubjects.push(option);
      }
      else if (option.subject_code.toLowerCase().indexOf(filter) >= 0) {
        this.selectedSubjects.push(option);
      }
    }
  }
  selectedsubject() {
    this.flag = false;
    this.Formdata.get('examEvaluatorProfileId').setValue('')
  }
  getTooltipText(examEvaluationList: any): string {
    return `${examEvaluationList.evaluator_name} / ${examEvaluationList.no_of_students_assigned}`;
  }
}