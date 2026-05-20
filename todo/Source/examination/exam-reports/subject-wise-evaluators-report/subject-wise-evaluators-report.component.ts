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
import { takeUntil } from 'rxjs/operators';
import { Location } from '@angular/common';
import { ParametersService } from 'app/main/services/parameters.service';


@Component({
  selector: 'app-subject-wise-evaluators-report',
  templateUrl: './subject-wise-evaluators-report.component.html',
  styleUrls: ['./subject-wise-evaluators-report.component.scss']
})
export class SubjectWiseEvaluatorsReportComponent implements OnInit {


  displayedColumns: string[] = ['id','subject', 'evaluatorName', 'email'];
  dataSource: MatTableDataSource<any>;

  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild(MatSort) sort: MatSort;
  @ViewChild('uploadXl') uploadXl: ElementRef;
  @ViewChild('excelTable', { static: false }) excelTable: ElementRef;
  trafoexternalItem="Subject Wise Evaluators Report";
  examTimetableList: any[] = []
  private isActive = CONSTANTS.isActive;
  examEvaluationList1 = []
  selectedSubjects = []
  evaluatorsubjectform: FormGroup;
  step = 0;
  flag: boolean
  private getExamEvaluationSubjectCodes = CONSTANTS.getExamEvaluationCodesUrl;
  private getExamFiltersBycodeUrl = CONSTANTS.getExamFiltersBycodeUrl;
  private EvaluatorRole = CONSTANTS.EvaluatorRole
  private collegeCrudUrl = CONSTANTS.collegeCrudUrl;
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
  examEvaluationList=[];
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
  orgCode;
  Logo;
  collegesLogoList=[];
  subCode: string;
  backbutton: boolean;
  academicYearData = [];
  academicYears = [];
  examData = [];
  exams = [];
  examFilter = [];
  courseGroupData = [];
  courseGroups = [];
  examsList: any;
  filtersDetailsList: any;
  subjectsDetailList: any;
  subjectsList: any;
  subjectData: any;
  CollegesListDetails: any;
  regulationFilterList: any;
  regulationList: any;
  examRegisteredStudents: any[];
  courseYearsList: any;
  courseYears: any;
  courseGroupList: any;
  colleges: any;
  CollegesListFilterDetails: any;
  examsLists: any[];
  academicYearsList: any;
  courses: any;

  constructor(private formBuilder: FormBuilder, private snotifyService: SnotifyService,
    private crudService: CrudService, private spinner: NgxSpinnerService, private router: Router,
    private dialog: MatDialog, private genericFunctions: GenericFunctions, private route: ActivatedRoute,private location:Location,private parameterservice:ParametersService ) {
    this.orgCode = localStorage.getItem('orgCode');
    if(this.parameterservice.back){
      this.backbutton=true
    }
    else{
      this.backbutton=false

    }

  }
  ngOnInit(): void {
    this.Formdata = this.formBuilder.group({
      examEvaluatorProfileId: [''],

    })

    this.evaluatorForm = this.formBuilder.group({
      courseId: ['', Validators.required],
      academicYearId: ['', Validators.required],
      examId: ['', Validators.required],
      courseGroupId:['',Validators.required],
      courseYearId:['',Validators.required],
      subjectId: ['', Validators.required],
      collegeId: ['', Validators.required],
      regulationId: ['', Validators.required],

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
    this.getFiltersList();
    this.getCollegeLogo();
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
  getCollegeLogo(): void {
    this.collegesLogoList = [];
    /*----------- COLLEGES -----------*/
    this.crudService.listDetailsById(this.collegeCrudUrl, 'true', this.isActive)
      .subscribe(result => {
        if (result.statusCode === 200) {
          if (result.data.resultList && result.data.resultList !== '') {
            this.collegesLogoList = result.data.resultList;
            //  for(let i=0; i<this.colleges.length; i++){
            this.Logo = this.collegesLogoList[0].logo
            //  }    

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
                 this.evaluatorForm.get('courseId').setValue(this.courses[0].fk_course_id);
                 this.selectedCourse(this.evaluatorForm.value.courseId)
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
         this.evaluatorForm.get('academicYearId').setValue('')
         this.evaluatorForm.get('examId').setValue('');
         this.evaluatorForm.get('collegeId').setValue('');
         this.evaluatorForm.get('courseGroupId').setValue('');
         this.evaluatorForm.get('courseYearId').setValue('');
         this.academicYears = []
         this.examsList = [];
         this.filtersDetailsList = []
         this.colleges = []
         this.courseGroups = []
         this.courseYearsList = []
         this.courseYears = []
         this.regulationList = []
         this.academicYearsList = []
         this.academicYearsList = this.CollegesListFilterDetails.filter(x => (x.fk_course_id == this.evaluatorForm.value.courseId))
      
   
         if (this.academicYearsList.length > 0) {
           const academicYears = this.academicYearsList.map(({ fk_academic_year_id }) => fk_academic_year_id);
           this.academicYears = this.academicYearsList.filter(({ fk_academic_year_id }, index) => !academicYears.includes(fk_academic_year_id, index + 1));
         }
         if (this.academicYears.length > 0) {
           this.evaluatorForm.get('academicYearId').setValue(this.academicYears[0].fk_academic_year_id);
           this.selectedAcademicYear(this.evaluatorForm.value.academicYearId)
         }
   
       }
     }
   
   
   
   
     selectedAcademicYear(academicYearId): void {
       this.evaluatorForm.get('examId').setValue('');
       this.evaluatorForm.get('collegeId').setValue('');
       this.evaluatorForm.get('courseGroupId').setValue('');
       this.evaluatorForm.get('courseYearId').setValue('');
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
         this.examsLists = this.CollegesListFilterDetails.filter(x => (x.fk_course_id === this.evaluatorForm.value.courseId && x.fk_academic_year_id == this.evaluatorForm.value.academicYearId))
         if (this.examsLists.length > 0) {
           const examsLists = this.examsLists.map(({ fk_exam_id }) => fk_exam_id);
           this.examsList = this.examsLists.filter(({ fk_exam_id }, index) => !examsLists.includes(fk_exam_id, index + 1));
           this.examData = this.examsList;
         }
         if (this.examsList.length > 0) {
           this.evaluatorForm.get('examId').setValue(this.examsList[0].fk_exam_id);
           this.selectedExam(this.evaluatorForm.value.examId);
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
    
       this.evaluatorForm.get('collegeId').setValue('');
       this.evaluatorForm.get('courseGroupId').setValue('');
       this.evaluatorForm.get('courseYearId').setValue('');
       let request = [
         { paramName: 'in_flag', paramValue: 'univ_exam_rest_in_regexamstd' },
         { paramName: 'in_flag_type', paramValue: 'ALL' },
         { paramName: 'in_university_id', paramValue: 0 },
         { paramName: 'in_college_id', paramValue: 0 },
         { paramName: 'in_course_id', paramValue: this.evaluatorForm.value.courseId },
         { paramName: 'in_course_group_id', paramValue: 0 },
         { paramName: 'in_course_year_id', paramValue: 0 },
         { paramName: 'in_exam_id', paramValue: this.evaluatorForm.value.examId },
         { paramName: 'in_academic_year_id', paramValue: this.evaluatorForm.value.academicYearId },
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
                   this.evaluatorForm.get('collegeId').setValue(this.colleges[0].fk_college_id);
                   this.selectedCollege(this.evaluatorForm.value.collegeId);
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
       this.evaluatorForm.get('courseGroupId').setValue('');
       this.evaluatorForm.get('courseYearId').setValue('');
       if (collegeId != null) {
         this.courseGroupList = []
         this.courseGroups = []
         this.courseGroupList = this.CollegesListDetails.filter(x => (x.fk_college_id == this.evaluatorForm.value.collegeId))
         if (this.courseGroupList.length > 0) {
           const courseGroups = this.courseGroupList.map(({ fk_course_group_id }) => fk_course_group_id);
           this.courseGroups = this.courseGroupList.filter(({ fk_course_group_id }, index) => !courseGroups.includes(fk_course_group_id, index + 1));
         }
         if (this.courseGroups.length > 0) {
           this.evaluatorForm.get('courseGroupId').setValue(this.courseGroups[0].fk_course_group_id);
           this.selectedGroup(this.evaluatorForm.value.courseGroupId)
         }
       }
   
   
     }
   
   
   
     selectedGroup(courseGroupId): void {
       this.evaluatorForm.get('courseYearId').setValue('');
       this.courseYearsList = []
       this.courseYears = []
       this.regulationList = []
   
       /*----------- COURSES Years -----------*/
       this.courseYearsList = this.CollegesListDetails.filter(x => (x.fk_college_id == this.evaluatorForm.value.collegeId && x.fk_course_group_id == courseGroupId))
       if (this.courseYearsList.length > 0) {
         const courseYearsList = this.courseYearsList.map(({ fk_course_year_id }) => fk_course_year_id);
         this.courseYears = this.courseYearsList.filter(({ fk_course_year_id }, index) => !courseYearsList.includes(fk_course_year_id, index + 1));
       }
   
       if (this.courseYears.length > 0) {
         this.evaluatorForm.get('courseYearId').setValue(this.courseYears[0].fk_course_year_id);
         this.selectedYear(this.evaluatorForm.value.courseYearId);
       }
     }


   selectedYear(courseYearId){
     this.examRegisteredStudents = [];
     this.evaluatorForm.get('regulationId').setValue('');
    this.regulationList = []
    if (courseYearId) {

      this.regulationFilterList = this.CollegesListDetails.filter(x => (x.fk_course_id == this.evaluatorForm.value.courseId))

      if (this.regulationFilterList.length > 0) {
        const regulationDetailList = this.regulationFilterList.map(({ fk_regulation_id }) => fk_regulation_id);
        this.regulationList = this.regulationFilterList.filter(({ fk_regulation_id }, index) => !regulationDetailList.includes(fk_regulation_id, index + 1));
      }
    
      if (this.regulationList.length > 0) {
        // this.bulkHallticketDetails =[]
        // this.bulkTable=false
        this.evaluatorForm.get('regulationId').setValue(this.regulationList[0].fk_regulation_id);
        this.selectedRegulation(this.evaluatorForm.value.regulationId);
      }

    }
  }
selectedRegulation(regulationId): void {
 this.evaluatorForm.get('subjectId').setValue('');
   this.subjectsDetailList = []
   this.subjectData = []
   this.subjectsList =[]
   let request = [
     { paramName: 'in_flag', paramValue: 'univ_exam_subject_uc' },
     { paramName: 'in_flag_type', paramValue: 'ALL' },
     { paramName: 'in_university_id', paramValue: 0 },
     { paramName: 'in_college_id', paramValue: this.evaluatorForm.value.collegeId },
     { paramName: 'in_course_id', paramValue: this.evaluatorForm.value.courseId },
     { paramName: 'in_course_group_id', paramValue: this.evaluatorForm.value.courseGroupId },
     { paramName: 'in_course_year_id', paramValue: this.evaluatorForm.value.courseYearId },
     { paramName: 'in_exam_id', paramValue: this.evaluatorForm.value.examId },
     { paramName: 'in_academic_year_id', paramValue: this.evaluatorForm.value.academicYearId },
     { paramName: 'in_regulation_id', paramValue:  this.evaluatorForm.value.regulationId },
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
             if (this.filtersDetailsList[i].length > 0 && this.filtersDetailsList[i][0].flag === 'univ_exam_sub_uc') {
               this.subjectsDetailList = this.filtersDetailsList[i];
             }
           }
           if (this.subjectsDetailList ) {
             if (this.subjectsDetailList.length > 0) {
               const subjectsDetailList = this.subjectsDetailList.map(({ fk_subject_id }) => fk_subject_id);
               this.subjectsList = this.subjectsDetailList.filter(({ fk_subject_id }, index) => !subjectsDetailList.includes(fk_subject_id, index + 1));
               this.subjectData = this.subjectsList;
             }
             //     if (!this.isEmptyObject(this.pageParams) && this.examsList.length > 0){
             //       this.evaluatorForm.get('examId').setValue(+this.pageParams.examId);
             //       this.getHallTickets();
             // } 
             //    else 
             console.log( this.subjectsList ,' this.subjectsList');
             
             if (this.subjectsList.length > 0) {
               // this.bulkHallticketDetails =[]
               // this.bulkTable=false
               this.evaluatorForm.get('subjectId').setValue(this.subjectsList[0].fk_subject_id);
             }
       
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
selectedSubject(){
  this.flag = false;
  this.Formdata.get('examEvaluatorProfileId').setValue('')
}


searchexam(value) {
 this.examData = [];
 this.searchExam(value)
}

searchExam(value: string) {
 let filter = value.toLowerCase();
 for (let i = 0; i < this.examsList.length; i++) {
   let option = this.examsList[i];
   if (option.exam_name.toLowerCase().indexOf(filter) >= 0) {
     this.examData.push(option);
   }
 }
}

searchSubject(value) {
 this.subjectData = [];
 this.searchsubject(value)
}

searchsubject(value: string) {
 let filter = value.toLowerCase();
 for (let i = 0; i < this.subjectsDetailList.length; i++) {
   let option = this.subjectsDetailList[i];
   if (option.subject_name.toLowerCase().indexOf(filter) >= 0) {
     this.subjectData.push(option);
   } else
     if (option.subject_code.toLowerCase().indexOf(filter) >= 0) {
       this.subjectData.push(option);
     }
 }
}
 
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
    this.maintDataList=[]
    this.flag = true;
    this.examStudentDataList=[]
    this.selectedCount = 0
    this.Formdata.get('examEvaluatorProfileId').setValue('')
      if(this.evaluatorForm.value.courseId==0){
        this.courseCodeFilter=''
      }
      else{
        this.courseCodeFilter=this.evaluatorForm.value.courseId
      }
      if(this.evaluatorForm.value.subjectId==0){
        this.subCode=''
      }
      else{
        this.subCode=this.evaluatorForm.value.subjectId
      }
    if (this.evaluatorsubjectform.valid) {
      let empId = +localStorage.getItem('employeeId');
      // this.flag = false;
      /* -------- EXAM SESSIONS -------*/
      // this.crudService.listByEighteenIds(this.getExamEvaluationSubjectCodes,
      //   'list_evaluatorassignment_list',
      //   this.evaluatorsubjectform.value.in_orgid,
      //   this.evaluatorsubjectform.value.in_fdate,
      //   this.evaluatorsubjectform.value.in_tdate,
      //   this.evaluatorForm.value.ExamMonthYear,
      //   this.courseCodeFilter,
      //   this.evaluatorForm.value.CourseYear,
      //   this.subCode,
      //   this.evaluatorsubjectform.value.in_evalutor_profileid,
      //   this.evaluatorsubjectform.value.in_exam_date,
      //   this.evaluatorsubjectform.value.in_regulation_code,
      //   0, 0, this.EvaluatorRole, '', '', 1,empId,

      //   'in_flag', 'in_orgid', 'in_fdate', 'in_tdate', 'in_exam_month_yr', 'in_course_code', 'in_course_year_code', 'in_subject_code', 'in_evalutor_profileid', 'in_exam_date', 'in_regulation_code', 'in_emp_id', 'in_questionpaper_id', 'in_evaluator_role_id', 'in_academic_year', 'in_exam_short_name', 'in_affiliatedto_catdet_id',
      //   'in_loginuser_empid'
      // )
      let request = [
        {paramName: 'in_flag', paramValue: 'list_evaluatorassignment_list'},
        {paramName: 'in_orgid', paramValue:+localStorage.getItem('organizationId')},
        {paramName: 'in_fdate', paramValue: '1990-01-01'},
        {paramName: 'in_tdate', paramValue: '1990-01-01'},
        {paramName: 'in_evalutor_profileid', paramValue: 0},
        {paramName: 'in_exam_date', paramValue: '1990-01-01'},
        {paramName: 'in_emp_id', paramValue: 0},
        {paramName: 'in_questionpaper_id', paramValue: 0},
        {paramName: 'in_evaluator_role_id', paramValue: 0},
        {paramName: 'in_academic_year', paramValue: ''},
        {paramName: 'in_exam_short_name', paramValue: ''},
        {paramName: 'in_affiliatedto_catdet_id', paramValue: 0},
        {paramName: 'in_exam_id', paramValue: this.evaluatorForm.value.examId},
        {paramName: 'in_course_year_id', paramValue: this.evaluatorForm.value.courseYearId},
        {paramName: 'in_subject_id', paramValue:this.evaluatorForm.value.subjectId},
        {paramName: 'in_regulation_id', paramValue:0},
        {paramName: 'in_course_id', paramValue:this.evaluatorForm.value.courseId},
        {paramName: 'in_academic_year_id', paramValue:this.evaluatorForm.value.academicYearId},
        {paramName: 'in_loginuser_empid', paramValue:+localStorage.getItem('employeeId')}
      ];
      this.crudService.getDetailsByRequest(this.getExamEvaluationSubjectCodes, '', request, '&')
        .subscribe(result => {
          this.spinner.hide();
          if (result.statusCode === 200) {
            this.flag = true;

            if (result.data && result.data !== '' && result.data.result.length > 0) {
              if(result.data.result[0].length>0){
                this.snotifyService.success('No Records Found', 'Success!');
                this.examEvaluationList = result.data.result[0];
                this.dataSource = new MatTableDataSource(this.examEvaluationList);
                this.dataSource.paginator = this.paginator;
                this.dataSource.sort = this.sort;
              }
              else{
                   this.snotifyService.success('No Records Found', 'Success!');
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
  searchdata(value) {
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

  exportAsExcel() 
  {
      const uri = 'data:application/vnd.ms-excel;base64,';
      const template = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40"><head><!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>{worksheet}</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]--></head><body><table>{table}</table></body></html>`;
      const base64 = function(s) { return window.btoa(unescape(encodeURIComponent(s))) };
      const format = function(s, c) { return s.replace(/{(\w+)}/g, function(m, p) { return c[p]; }) };
      const table = this.excelTable.nativeElement;
      const ctx = { worksheet: 'Worksheet', table: table.innerHTML };
      const link = document.createElement('a');
          link.download = `${this.trafoexternalItem}.xls`;
          link.href = uri + base64(format(template, ctx));
          link.click();
  
}
printPage() {
    window.print();
}
goBack(){
  this.location.back()
}
}



