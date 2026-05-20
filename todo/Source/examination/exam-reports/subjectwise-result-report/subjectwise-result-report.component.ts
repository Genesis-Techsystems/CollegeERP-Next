import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormControl } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { CONSTANTS } from 'app/main/common/constants';
import { GenericFunctions } from 'app/main/common/generic-functions';
import { CrudService } from 'app/main/services/crud.service';
import { SnotifyService } from 'ng-snotify';
import { NgxSpinnerService } from 'ngx-spinner';
import { ReplaySubject, Subject } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { GlobalService } from 'app/main/services/global.service';
import * as _ from 'lodash';

@Component({
  selector: 'app-subjectwise-result-report',
  templateUrl: './subjectwise-result-report.component.html',
  styleUrls: ['./subjectwise-result-report.component.scss']
})
export class SubjectwiseResultReportComponent implements OnInit {

  displayedColumns: string[] = ['id', 'campusCode', 'campusName', 'orgCode', 'districtName'];
  dataSource: MatTableDataSource<any>;

  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild(MatSort) sort: MatSort;
  @ViewChild('excelTable', { static: false }) excelTable: ElementRef;
  trafoItem="Subject Wise Result Report";

  @ViewChild('uploadXl') uploadXl: ElementRef;
  private staffSubjectsUrl = CONSTANTS.staffSubjectsUrl;
  private employeeDetailUrl=CONSTANTS.employeeDetailUrl
  private collegeCrudUrl = CONSTANTS.collegeCrudUrl;
  private getDetailsByCourseIdUrl = CONSTANTS.getDetailsByCourseIdUrl;
  private generalDetailsUrl = CONSTANTS.generalDetailsUrl;
  private generalDetailsByCodeUrl = CONSTANTS.generalDetailsByCodeUrl;
  private subjectType = CONSTANTS.subjectType;
  private examIdUrl = CONSTANTS.examIdUrl;
  private getDetailsByRegulationIdUrl = CONSTANTS.getDetailsByRegulationIdUrl;
  private employeeSearchUrl = CONSTANTS.employeeSearchUrl;
  private collegeByIdUrl = CONSTANTS.collegeByIdUrl;
  private courseByIdUrl = CONSTANTS.courseByIdUrl;
  private courseGroupByIdUrl = CONSTANTS.courseGroupByIdUrl;
  private courseYearByIdUrl = CONSTANTS.courseYearByIdUrl;
  private examMarksEntryStudentsUrl = CONSTANTS.examMarksEntryStudentsUrl;
  private isActive = CONSTANTS.isActive;
  private examStudentInternalMarksUrl = CONSTANTS.examStudentInternalMarksUrl;
  private examStudentInternalMarkCrudUrl = CONSTANTS.examStudentInternalMarkCrudUrl;
  private examMarksSetupUrl = CONSTANTS.examMarksSetupUrl;
  private exammarksdownloadUrl = CONSTANTS.exammarksdownloadUrl;
  private endURL = CONSTANTS.MAINAPI;
  private uploadexammarksUrl = CONSTANTS.uploadexammarksUrl;
  private OFFLINEEVALUATION= CONSTANTS.OFFLINEEVALUATION;
  private groupYrRegulationUrl = CONSTANTS.groupYrRegulationUrl;
  private getExamFiltersBycodeUrl=CONSTANTS.getExamFiltersBycodeUrl;


  public formData;
  filtersDetailsList=[];
  CollegesListDetails=[];
  examFeeCollectionForm: FormGroup;
  colleges=[];
  academicYears = [];
  courses= [];
  examsList = [];
  courseGroups= [];
  sections = [];
  student: any = {};
  subject: any = {};
  studentSubjects: any[] = [];
  courseYears: any[] = [];
  examCourseYearSubjetsList: any[] = [];
  examSubjestList: any[] = [];
  courseYearFee: any = [];
  examsFeeStructures: any = [];
  courseYearsubjectsList: any[] = [];
  subjectTypes = [];
  examTimetableSubjectsList: any[] = [];
  examStudentsList: any[] = [];
  searchEmployees: any[] = [];
  preStaggings: any[] = [];
  minDate;
  maxDate;
  collegeCode;
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
  // public searchText: string;
  searchText='';
  duplicateexamStudentList = [];
  examMarkSetups: any[] = [];
  examMarks = [];
  private THEORY=CONSTANTS.THEORY
  private ELECTIVE=CONSTANTS.ELECTIVE
  examData = [];
  examDate = '' ;

  public employeeFilterCtrl: FormControl = new FormControl();
  public filteredEmployees: ReplaySubject<any[]> = new ReplaySubject<any[]>(1);
  private _onDestroy = new Subject<void>();
  isRegularExam: any;
  roleName: string;
  EmployeeData: any;
  staffSubjectsList: any[];
  academicYearsList: any[];
  courseListData: any[];
  examsLists: any[];
  groupList: any[];
  courseYearsList: any[];
  subjectTypeList: any[];
  examTimetableSubjects: any[];
  empNumber: string;
  userName: string;
  empId: any;
  empSecurity: any;
  loginUser: any;
  staff=false;
  admin=false;
  userroles =[];
  semister=false;
  collegeName: string;
  examName=[];
  collegeLists=[];
regulationList: any;
  examRegisteredStudents: any[];
  regulationFilterList: any[];
  courseGroupList: any[];
  CollegesListFilterDetails: any[];
  subjectsList: any;
  subjectsDetailList: any;
  subjectDetailsList: any;
  subjectData: any;
  constructor(private formBuilder: FormBuilder, private snotifyService: SnotifyService,
              private crudService: CrudService, private spinner: NgxSpinnerService, private router: Router, 
              private dialog: MatDialog, private genericFunctions: GenericFunctions, private route: ActivatedRoute, private _globalService:GlobalService) {        
      // this.getData();
      if (this.genericFunctions.getSecuredValue('userDetails') !== null && this.genericFunctions.getSecuredValue('userDetails') !== ''){
        this.loginUser = JSON.parse(this.genericFunctions.getSecuredValue('userDetails'));
        this.userroles=this.loginUser.userRoles
      }
      for(let i=0;i<this.loginUser.userRoles.length;i++){
        if(this.loginUser.userRoles[i]?.roleName==this.OFFLINEEVALUATION || this.loginUser.userRoles[i]?.roleName=='ExamController' || this.loginUser.userRoles[i]?.roleName=='ADMIN'){
           this.semister=true
        }
        if(this.loginUser.userRoles[i].roleName=="MSTAFF" || this.loginUser.userRoles[i].roleName=="STAFF"){
          this.staff=true  
        }
      }
  }

  ngOnInit(): void {
     this.roleName=localStorage.getItem('roleName')
    this.examFeeCollectionForm = this.formBuilder.group({
      courseId: ['', Validators.required],  
      collegeId: ['', Validators.required],  
      academicYearId: ['', Validators.required],  
      courseGroupId: ['', Validators.required],  
      examId: ['', Validators.required],
      examTimetableDetId: [],
      examDate: [this.genericFunctions.moment()],
      courseYearId: ['', Validators.required],
      groupSectionId: [],
      subjectTypeId: ['', Validators.required],
      subjectId: [],
      employeeId: [],
      regulationId: [],
      fDate: [this.genericFunctions.moment()],
    });
   
    this.dataSource = new MatTableDataSource(this.examSubjestList); 
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;

    this.searchEmployees.push({firstName: 'Search by Employee name or Id.'});
    this.filteredEmployees.next(this.searchEmployees.slice());
    // this.getEmloyees();
    if(this.staff==true){
      this.empNumber=localStorage.getItem('empNumber')
      this.userName=localStorage.getItem('userName')
      this.empId=+localStorage.getItem('employeeId')
     this.examFeeCollectionForm.get('employeeId').setValue(this.empId)
     
    }
   
    this.getFiltersList();
  

  }

   // tslint:disable-next-line: use-lifecycle-interface
   ngOnDestroy(): void {
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
    // this.searchEmployeess.filter(x => x.firstName.toLowerCase().indexOf(search) > -1)
    );
}

  getData(): void{
     /*----------- COLLEGES -----------*/
     this.crudService.listDetailsById(this.collegeCrudUrl, 'true', this.isActive)
     .subscribe(result => {
         this.spinner.hide();
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
  //Get Filters
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
                       this.examFeeCollectionForm.get('courseId').setValue(this.courses[0].fk_course_id);
                       this.selectedCourse(this.examFeeCollectionForm.value.courseId)
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
               this.examFeeCollectionForm.get('academicYearId').setValue('')
               this.examFeeCollectionForm.get('examId').setValue('');
               this.examFeeCollectionForm.get('collegeId').setValue('');
               this.examFeeCollectionForm.get('courseGroupId').setValue('');
               this.examFeeCollectionForm.get('courseYearId').setValue('');
               this.academicYears = []
               this.examsList = [];
               this.filtersDetailsList = []
               this.colleges = []
               this.courseGroups = []
               this.courseYearsList = []
               this.courseYears = []
               this.regulationList = []
               this.academicYearsList = []
               this.academicYearsList = this.CollegesListFilterDetails.filter(x => (x.fk_course_id == this.examFeeCollectionForm.value.courseId))
            
         
               if (this.academicYearsList.length > 0) {
                 const academicYears = this.academicYearsList.map(({ fk_academic_year_id }) => fk_academic_year_id);
                 this.academicYears = this.academicYearsList.filter(({ fk_academic_year_id }, index) => !academicYears.includes(fk_academic_year_id, index + 1));
               }
               if (this.academicYears.length > 0) {
                 this.examFeeCollectionForm.get('academicYearId').setValue(this.academicYears[0].fk_academic_year_id);
                 this.selectedAcademicYear(this.examFeeCollectionForm.value.academicYearId)
               }
         
             }
           }
         
         
         
         
           selectedAcademicYear(academicYearId): void {
             this.examFeeCollectionForm.get('examId').setValue('');
             this.examFeeCollectionForm.get('collegeId').setValue('');
             this.examFeeCollectionForm.get('courseGroupId').setValue('');
             this.examFeeCollectionForm.get('courseYearId').setValue('');
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
               this.examsLists = this.CollegesListFilterDetails.filter(x => (x.fk_course_id === this.examFeeCollectionForm.value.courseId && x.fk_academic_year_id == this.examFeeCollectionForm.value.academicYearId))
               if (this.examsLists.length > 0) {
                 const examsLists = this.examsLists.map(({ fk_exam_id }) => fk_exam_id);
                 this.examsList = this.examsLists.filter(({ fk_exam_id }, index) => !examsLists.includes(fk_exam_id, index + 1));
                 this.examData = this.examsList;
               }
               if (this.examsList.length > 0) {
                 this.examFeeCollectionForm.get('examId').setValue(this.examsList[0].fk_exam_id);
                 this.selectedExam(this.examFeeCollectionForm.value.examId);
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
          
             this.examFeeCollectionForm.get('collegeId').setValue('');
             this.examFeeCollectionForm.get('courseGroupId').setValue('');
             this.examFeeCollectionForm.get('courseYearId').setValue('');
             let request = [
               { paramName: 'in_flag', paramValue: 'univ_exam_rest_in_regexamstd' },
               { paramName: 'in_flag_type', paramValue: 'ALL' },
               { paramName: 'in_university_id', paramValue: 0 },
               { paramName: 'in_college_id', paramValue: 0 },
               { paramName: 'in_course_id', paramValue: this.examFeeCollectionForm.value.courseId },
               { paramName: 'in_course_group_id', paramValue: 0 },
               { paramName: 'in_course_year_id', paramValue: 0 },
               { paramName: 'in_exam_id', paramValue: this.examFeeCollectionForm.value.examId },
               { paramName: 'in_academic_year_id', paramValue: this.examFeeCollectionForm.value.academicYearId },
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
                         this.examFeeCollectionForm.get('collegeId').setValue(this.colleges[0].fk_college_id);
                         this.selectedCollege(this.examFeeCollectionForm.value.collegeId);
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
             this.examFeeCollectionForm.get('courseGroupId').setValue('');
             this.examFeeCollectionForm.get('courseYearId').setValue('');
             if (collegeId != null) {
               this.courseGroupList = []
               this.courseGroups = []
               this.courseGroupList = this.CollegesListDetails.filter(x => (x.fk_college_id == this.examFeeCollectionForm.value.collegeId))
               if (this.courseGroupList.length > 0) {
                 const courseGroups = this.courseGroupList.map(({ fk_course_group_id }) => fk_course_group_id);
                 this.courseGroups = this.courseGroupList.filter(({ fk_course_group_id }, index) => !courseGroups.includes(fk_course_group_id, index + 1));
               }
               if (this.courseGroups.length > 0) {
                 this.examFeeCollectionForm.get('courseGroupId').setValue(this.courseGroups[0].fk_course_group_id);
                 this.selectedGroup(this.examFeeCollectionForm.value.courseGroupId)
               }
             }
         
         
           }
         
         
         
           selectedGroup(courseGroupId): void {
             this.examFeeCollectionForm.get('courseYearId').setValue('');
             this.courseYearsList = []
             this.courseYears = []
             this.regulationList = []
         
             /*----------- COURSES Years -----------*/
             this.courseYearsList = this.CollegesListDetails.filter(x => (x.fk_college_id == this.examFeeCollectionForm.value.collegeId && x.fk_course_group_id == courseGroupId))
             if (this.courseYearsList.length > 0) {
               const courseYearsList = this.courseYearsList.map(({ fk_course_year_id }) => fk_course_year_id);
               this.courseYears = this.courseYearsList.filter(({ fk_course_year_id }, index) => !courseYearsList.includes(fk_course_year_id, index + 1));
             }
         
             if (this.courseYears.length > 0) {
               this.examFeeCollectionForm.get('courseYearId').setValue(this.courseYears[0].fk_course_year_id);
               this.selectedYear(this.examFeeCollectionForm.value.courseYearId);
             }
           }
      
      
         selectedYear(courseYearId){
           this.examRegisteredStudents = [];
           this.examFeeCollectionForm.get('regulationId').setValue('');
          this.regulationList = []
          if (courseYearId) {
      
            this.regulationFilterList = this.CollegesListDetails.filter(x => (x.fk_course_id == this.examFeeCollectionForm.value.courseId))
      
            if (this.regulationFilterList.length > 0) {
              const regulationDetailList = this.regulationFilterList.map(({ fk_regulation_id }) => fk_regulation_id);
              this.regulationList = this.regulationFilterList.filter(({ fk_regulation_id }, index) => !regulationDetailList.includes(fk_regulation_id, index + 1));
            }
          
            if (this.regulationList.length > 0) {
              // this.bulkHallticketDetails =[]
              // this.bulkTable=false
              this.examFeeCollectionForm.get('regulationId').setValue(this.regulationList[0].fk_regulation_id);
              this.selectedRegulation(this.examFeeCollectionForm.value.regulationId);
            }
      
          }
        }
//  if(this.semister==false){
//   if (this.examsList.filter(x => x.fk_exam_id === this.examFeeCollectionForm.value.examId)[0].is_regular_exam){
//     this.subjectTypes =this.subjectTypes.filter(x=>x.fk_subjecttype_catdet_id!=this.ELECTIVE && x.fk_subjecttype_catdet_id!=this.THEORY)
//     }
//  }
 
selectedRegulation(regulationId): void {
  this.examFeeCollectionForm.get('subjectId').setValue('');
    this.subjectsDetailList = []
    this.subjectData = []
    this.subjectsList =[]
    let request = [
      { paramName: 'in_flag', paramValue: 'univ_exam_subject_uc' },
      { paramName: 'in_flag_type', paramValue: 'ALL' },
      { paramName: 'in_university_id', paramValue: 0 },
      { paramName: 'in_college_id', paramValue: this.examFeeCollectionForm.value.collegeId },
      { paramName: 'in_course_id', paramValue: this.examFeeCollectionForm.value.courseId },
      { paramName: 'in_course_group_id', paramValue: this.examFeeCollectionForm.value.courseGroupId },
      { paramName: 'in_course_year_id', paramValue: this.examFeeCollectionForm.value.courseYearId },
      { paramName: 'in_exam_id', paramValue: this.examFeeCollectionForm.value.examId },
      { paramName: 'in_academic_year_id', paramValue: this.examFeeCollectionForm.value.academicYearId },
      { paramName: 'in_regulation_id', paramValue:  this.examFeeCollectionForm.value.regulationId },
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
                const subjectsDetailList = this.subjectsDetailList.map(({ fk_subjecttype_catdet_id }) => fk_subjecttype_catdet_id);
                this.subjectTypes = this.subjectsDetailList.filter(({ fk_subjecttype_catdet_id }, index) => !subjectsDetailList.includes(fk_subjecttype_catdet_id, index + 1));
              }
              if (this.subjectTypes.length > 0) {
                this.examFeeCollectionForm.get('subjectTypeId').setValue(this.subjectTypes[0].fk_subjecttype_catdet_id);
                this.selectedSubjectType( this.examFeeCollectionForm.value.subjectTypeId)
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
selectedSubjectType(subjectTypeId): void{

  this.subjectsList = this.subjectsDetailList.filter(x=>x.fk_subjecttype_catdet_id == this.examFeeCollectionForm.value.subjectTypeId)
  if (this.subjectsList.length > 0) {
    const subjectsDetailList = this.subjectsList.map(({ fk_subject_id }) => fk_subject_id);
    this.subjectDetailsList = this.subjectsList.filter(({ fk_subject_id }, index) => !subjectsDetailList.includes(fk_subject_id, index + 1));
  }
  this.subjectData = this.subjectDetailsList;


  if (this.subjectDetailsList.length > 0) {
    this.examFeeCollectionForm.get('subjectId').setValue(this.subjectDetailsList[0].fk_subject_id);
    this.selectedSubject( this.examFeeCollectionForm.value.subjectId,[])
   this.getMarksSetup( );

  }
}
searchexam(value) {
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

// searchSubject(value) {
//   this.subjectData = [];
//   this.searchsubject(value)
// }

// searchsubject(value: string) {
//   let filter = value.toLowerCase();
//   for (let i = 0; i < this.subjectsDetailList.length; i++) {
//     let option = this.subjectsDetailList[i];
//     if (option.subject_name.toLowerCase().indexOf(filter) >= 0) {
//       this.subjectData.push(option);
//     } else
//       if (option.subject_code.toLowerCase().indexOf(filter) >= 0) {
//         this.subjectData.push(option);
//       }
//   }
// }

selectedSection(): void{
  this.subjectTypes=[]
  this.examFeeCollectionForm.get('subjectTypeId').setValue('');
  this.examFeeCollectionForm.get('subjectId').setValue('');
  this.examFeeCollectionForm.get('examTimetableDetId').setValue('');
  //  this.section = this.sections.filter(x => (x.groupSectionId === groupSectionId))[0].section;
  /*----------- SUBJECT TYPE -----------*/
  this.crudService.listDetailsByTwoIds(this.generalDetailsUrl, this.subjectType, 'true', this.generalDetailsByCodeUrl, this.isActive)
  .subscribe(result => {
      if (result.statusCode === 200){
                  if (result.data.resultList && result.data.resultList !== '') {
                      this.subjectTypes = result.data.resultList;
                      this.isRegularExam=this.examsList.filter((x=>x.fk_exam_id==this.examFeeCollectionForm.value.examId))[0].isRegularExam
                      if(this.isRegularExam==true){
                        this.subjectTypes= this.subjectTypes.filter(x=>(x.generalDetailId!=this.THEORY && x.generalDetailId!=this.ELECTIVE))
                      }
                      else{

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

// selectedSubjectType(subjectTypeId): void{
  
//   this.examFeeCollectionForm.get('subjectId').setValue('');
//   this.examFeeCollectionForm.get('examTimetableDetId').setValue('');
//   this.examTimetableSubjectsList = [];
// this.examTimetableSubjects=[]
//   if (subjectTypeId !== null){  
//     this.examTimetableSubjects=this.CollegesListDetails.filter(x=>(x.fk_college_id== this.examFeeCollectionForm.value.collegeId && x.fk_course_id==this.examFeeCollectionForm.value.courseId && x.fk_academic_year_id==this.examFeeCollectionForm.value.academicYearId && x.fk_exam_id==this.examFeeCollectionForm.value.examId && x.fk_course_group_id==this.examFeeCollectionForm.value.courseGroupId && x.fk_course_year_id==this.examFeeCollectionForm.value.courseYearId && x.fk_subjecttype_catdet_id==this.examFeeCollectionForm.value.subjectTypeId))
//     if(this.examTimetableSubjects.length>0){
//     const examTimetableSubjects = this.examTimetableSubjects.map(({ fk_subject_id }) => fk_subject_id);
//     this.examTimetableSubjectsList = this.examTimetableSubjects.filter(({ fk_subject_id }, index) => !examTimetableSubjects.includes(fk_subject_id, index + 1));
//     }
 
  
// }

getMarksSetup(): void{
    this.crudService.getGroupSubjectsByRegulation(this.groupYrRegulationUrl, this.examFeeCollectionForm.value.collegeId, 
      this.examFeeCollectionForm.value.courseGroupId,   this.examFeeCollectionForm.value.courseYearId,  this.examFeeCollectionForm.value.regulationId)
    .subscribe(result => {
        this.spinner.hide();
        if (result.statusCode === 200) {
            if (result.data && result.data !== '') {
                this.examMarks = result.data;
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
    this.crudService.listDetailsByThreeIds(this.examMarksSetupUrl,  this.examFeeCollectionForm.value.courseId, this.examFeeCollectionForm.value.regulationId, 'true',
    this.getDetailsByCourseIdUrl, this.getDetailsByRegulationIdUrl, 'isActive')
    .subscribe(result => {
      this.spinner.hide();
      if (result.statusCode === 200) {
          if (result.data.resultList && result.data.resultList !== '') {
              this.examMarkSetups = result.data.resultList;
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

selectedSubject(examTimetableDetId, list): void{
  this.examStudentsList = [];
  if (examTimetableDetId !== null){
    this.subjectDetails = '';
    // this.examFeeCollectionForm.get('examDate').setValue(this.examTimetableSubjectsList.filter(x => (x.fk_exam_timetable_det_id === this.examFeeCollectionForm.value.examTimetableDetId))[0].exam_date);
    const dateConvert = this.genericFunctions.momentFormatYMD(this.examFeeCollectionForm.value.examDate);
    this.subjectDetails =  this.examTimetableSubjectsList.filter(x => (x.fk_exam_timetable_det_id === examTimetableDetId))[0].subject_name + ' (' +
    this.examTimetableSubjectsList.filter(x => (x.fk_exam_timetable_det_id === examTimetableDetId))[0].regulation_code + ')';

    if (this.examTimetableSubjectsList.filter(x => (x.fk_exam_timetable_det_id === this.examFeeCollectionForm.value.examTimetableDetId)).length > 0){
          this.examTypeId = this.examTimetableSubjectsList.filter(x => (x.fk_exam_timetable_det_id === this.examFeeCollectionForm.value.examTimetableDetId))[0].fk_examtype_catdet_id;
          // tslint:disable-next-line: max-line-length
          this.examFeeCollectionForm.get('subjectId').setValue(this.examTimetableSubjectsList.filter(x => (x.fk_exam_timetable_det_id === this.examFeeCollectionForm.value.examTimetableDetId))[0].fk_subject_id);
          this.regulationId = this.examTimetableSubjectsList.filter(x => (x.fk_exam_timetable_det_id === this.examFeeCollectionForm.value.examTimetableDetId))[0].fk_regulation_id;
          this.subjectTypeId = this.examTimetableSubjectsList.filter(x => (x.fk_exam_timetable_det_id === this.examFeeCollectionForm.value.examTimetableDetId))[0].fk_subjecttype_catdet_id;
          this.subjectTypCode = this.examTimetableSubjectsList.filter(x => (x.fk_exam_timetable_det_id === this.examFeeCollectionForm.value.examTimetableDetId))[0].subject_type;
          this.examTypeCatCode = this.examTimetableSubjectsList.filter(x => (x.fk_exam_timetable_det_id === this.examFeeCollectionForm.value.examTimetableDetId))[0].ttd_exam_type;
      }
      /*----------- EXAM TIMETABLES -----------*/
    this.crudService.listByEightIds(this.examMarksEntryStudentsUrl, this.examFeeCollectionForm.value.collegeId, 
        this.examFeeCollectionForm.value.courseId, 
        this.examFeeCollectionForm.value.examId, 
        dateConvert, 
        this.examFeeCollectionForm.value.courseGroupId, 
        this.examFeeCollectionForm.value.courseYearId, 
        this.examFeeCollectionForm.value.subjectId, 
        this.examTypeId,
        this.collegeByIdUrl, this.courseByIdUrl, this.examIdUrl, 'examDate', this.courseGroupByIdUrl, this.courseYearByIdUrl, 'subjectId', 'examTypeId')
        .subscribe(result => {
          if (result.statusCode === 200){
            if (result.data && !_.isEmpty(result.data) && result.data.length > 0) {

              this.examStudentsList = [...new Map(result.data.map(item =>
                [item['rollNumber'], item])).values()]
                
                  //  this.examStudentsList = result.data;

                    // tslint:disable-next-line: prefer-for-of
                    for (let i = 0; i < this.examStudentsList.length; i++){
                      if (this.examStudentsList[i].marks === null){
                          this.examStudentsList[i].marks = 0;
                      }
                      if (this.examStudentsList[i].isMarksPublished === null){
                        this.examStudentsList[i].isMarksPublished = false;
                      }
                      if (this.examStudentsList[i].isPresent === false){
                          this.examStudentsList[i].isPass = false;
                      }
                      this.enteredMarks(this.examStudentsList[i]);
                    }

                    if (this.examsList.filter(x => (x.fk_exam_id === this.examFeeCollectionForm.value.examId)).length > 0){
                      if (this.examsList.filter(x => (x.fk_exam_id === this.examFeeCollectionForm.value.examId))[0].is_internal_exam){
                          this.crudService.listDetailsByThreeIds(this.examStudentInternalMarkCrudUrl, this.examFeeCollectionForm.value.collegeId,
                            this.examFeeCollectionForm.value.examId,
                            this.examFeeCollectionForm.value.subjectId, 
                            'college.collegeId', 'examMaster.examId', 'subject.subjectId')
                          .subscribe(result1 => {
                              if (result1.statusCode === 200){
                                      if (result1.data.resultList && result1.data.resultList !== '' && result1.data.resultList.length > 0) {
                                         // tslint:disable-next-line: prefer-for-of
                                         for (let i = 0; i < result1.data.resultList.length; i++){
                                              if (this.examStudentsList.filter(x => (x.studentId === result1.data.resultList[i].studentId)).length > 0){
                                                 // tslint:disable-next-line: max-line-length
                                                 this.examStudentsList.filter(x => (x.studentId === result1.data.resultList[i].studentId))[0].marks = result1.data.resultList[i].marks;
                                                 this.examStudentsList.filter(x => (x.studentId === result1.data.resultList[i].studentId))[0].extMarks = 0;
                                                 // tslint:disable-next-line: max-line-length
                                                 this.examStudentsList.filter(x => (x.studentId === result1.data.resultList[i].studentId))[0].examStdInternalMarkId = result1.data.resultList[i].examStdInternalMarkId;
                                              }
                                         }
                                         // tslint:disable-next-line: prefer-for-of
                                         for (let i = 0; i < list.length; i++){
                                             if (this.examStudentsList.filter(x => (x.studentId === list[i].studentId)).length > 0){
                                                 this.examStudentsList.filter(x => (x.studentId === list[i].studentId))[0].isvalidate = list[i].isvalidate;
                                                 this.examStudentsList.filter(x => (x.studentId === list[i].studentId))[0].marks = list[i].marks;
                                                 this.examStudentsList.filter(x => (x.studentId === list[i].studentId))[0].reason = list[i].reason;
                                                 if (!list[i].isvalidate){
                                                    this.examStudentsList.filter(x => (x.studentId === list[i].studentId))[0].color = '#ff7777';
                                                 }else{
                                                    this.examStudentsList.filter(x => (x.studentId === list[i].studentId))[0].color = null;
                                                 }
                                             } 
                                         }
                                      } else {
                                          // tslint:disable-next-line: prefer-for-of
                                          for (let i = 0; i < list.length; i++){
                                            if (this.examStudentsList.filter(x => (x.studentId === list[i].studentId)).length > 0){
                                                this.examStudentsList.filter(x => (x.studentId === list[i].studentId))[0].extMarks = 0;
                                                this.examStudentsList.filter(x => (x.studentId === list[i].studentId))[0].marks = list[i].marks;
                                                this.examStudentsList.filter(x => (x.studentId === list[i].studentId))[0].isvalidate = list[i].isvalidate;
                                                this.examStudentsList.filter(x => (x.studentId === list[i].studentId))[0].reason = list[i].reason;
                                                if (!list[i].isvalidate){
                                                   this.examStudentsList.filter(x => (x.studentId === list[i].studentId))[0].color = '#ff7070';
                                                }else{
                                                   this.examStudentsList.filter(x => (x.studentId === list[i].studentId))[0].color = null;
                                                }
                                            } 
                                        }
                                         // this.snotifyService.success(result1.message, 'Success!');
                                      }
                                      this.duplicateexamStudentList = this.examStudentsList;
                              }else {
                                    this.snotifyService.error(result1.message, 'Error!');
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
                      this.duplicateexamStudentList = this.examStudentsList;
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
}

enteredEmployee(event): void{
  if (event.target.value.length > 4){
      /*----------- EMPLOYEE -----------*/
      this.crudService.listByTwoIds(this.employeeSearchUrl, event.target.value, 'ACTV', 'q', 'empStatus')
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

    selectedEmployee(marksEnteredEmpId): void{
      
    }

    download(): void{
      if (this.examFeeCollectionForm.valid){
      /*---------- Print call  ----------*/
      const xhr = new XMLHttpRequest();
      // tslint:disable-next-line:max-line-length
      xhr.open('GET', this.endURL + this.exammarksdownloadUrl + '?collegeId=' + this.examFeeCollectionForm.value.collegeId + '&subjectId=' + this.examFeeCollectionForm.value.subjectId +
      // tslint:disable-next-line:max-line-length
      '&examId=' + this.examFeeCollectionForm.value.examId + '&courseGroupId=' + this.examFeeCollectionForm.value.courseGroupId + '&courseYearId=' + this.examFeeCollectionForm.value.courseYearId + '&examdate=' + this.genericFunctions.momentFormatYMD(this.examFeeCollectionForm.value.examDate), true);
      xhr.setRequestHeader('Authorization', 'Bearer ' + localStorage.getItem('token'));
      xhr.responseType = 'blob';
      // tslint:disable-next-line: only-arrow-functions
      xhr.onreadystatechange = function( ): any {
         if (xhr.readyState === XMLHttpRequest.DONE) {
              
             const url = window.URL.createObjectURL(new Blob([xhr.response], {type: 'application/vnd.ms-excel'}));
             const a = document.createElement('a');
             a.href = url;
             a.download = 'Marks Sheet';
             a.click();
         }
      };
      xhr.send(null); 
     }        
   }

    uploadFile(): void{
      if (this.uploadXl.nativeElement.files.length > 0){
        this.formData = new FormData();
        this.formData.append('file',
        this.uploadXl.nativeElement.files[0],
        this.uploadXl.nativeElement.files[0].name);
        this.formData.append('collegeId', this.examFeeCollectionForm.value.collegeId);
        this.formData.append('courseId', this.examFeeCollectionForm.value.courseId);
        this.formData.append('courseYearId', this.examFeeCollectionForm.value.courseYearId);
        this.formData.append('subjectId', this.examFeeCollectionForm.value.subjectId);
        this.formData.append('examId', this.examFeeCollectionForm.value.examId);
        this.formData.append('regulationId', this.regulationId);
        // tslint:disable-next-line: max-line-length
        this.formData.append('subjectCategoryId', this.examTimetableSubjectsList.filter(x => (x.fk_exam_timetable_det_id === this.examFeeCollectionForm.value.examTimetableDetId))[0].fk_subjectcategory_catdet_id);
        // tslint:disable-next-line: max-line-length
        this.formData.append('subjectTypeId', this.examTimetableSubjectsList.filter(x => (x.fk_exam_timetable_det_id === this.examFeeCollectionForm.value.examTimetableDetId))[0].fk_subjecttype_catdet_id);
        this.spinner.show();
        /*-------- FILE UPLOAD ---------*/ 
        this.crudService.upload(this.uploadexammarksUrl, this.formData)
        .subscribe(result1 => {
            this.spinner.hide();
            if (result1.statusCode === 200){
                if (result1.success) {
                    this.snotifyService.success(result1.message, 'Success!');
                    this.examStudentsList = this.duplicateexamStudentList;
                    // tslint:disable-next-line: prefer-for-of
                    for (let i = 0; i < result1.data.length; i++){
                      if (this.examStudentsList.filter(x => (x.studentId === result1.data[i].studentId)).length > 0){
                         // tslint:disable-next-line: max-line-length
                         this.examStudentsList.filter(x => (x.studentId === result1.data[i].studentId))[0].marks = result1.data[i].examMarks;
                         this.examStudentsList.filter(x => (x.studentId === result1.data[i].studentId))[0].isvalidate = result1.data[i].isvalidate;
                         this.examStudentsList.filter(x => (x.studentId === result1.data[i].studentId))[0].reason = result1.data[i].reason;
                         if (!result1.data[i].isvalidate){
                              this.examStudentsList.filter(x => (x.studentId === result1.data[i].studentId))[0].color = '#ff7070';
                         }else{
                              this.examStudentsList.filter(x => (x.studentId === result1.data[i].studentId))[0].color = null;
                         }
                      }
                    }
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
      }else{
        this.snotifyService.info('Please choose a file.', 'Info!');
      }
  }

    calDays(): void{
      this.courseYears = [];
      this.sections = [];
      this.examFeeCollectionForm.get('courseGroupId').setValue('');
      this.examFeeCollectionForm.get('courseYearId').setValue('');
      this.examFeeCollectionForm.get('groupSectionId').setValue('');
      this.examFeeCollectionForm.get('subjectTypeId').setValue('');
      this.examFeeCollectionForm.get('subjectId').setValue('');
      this.examFeeCollectionForm.get('employeeId').setValue('');
      this.searchEmployees = [];
      this.examStudentsList = [];
      // this.searchEmployees.push({firstName: 'Search by Employee name or Id.'});
      // this.filteredEmployees.next(this.searchEmployees.slice());
      this.examDate = this.genericFunctions.momentWithDateFormatYMD(this.examFeeCollectionForm.value.examDate); // new Date(this.data.issueTodate);
    }

    /*---------- EDIT MARKS -----------*/
   

    clear(): void{
      if (this.checkUploadType === 2){
          this.selectedSubject(this.examFeeCollectionForm.value.examTimetableDetId, []);
      }else{
          this.examStudentsList = [];
      }
    }

    enteredMarks(item): void{
      const isMarks = (this.examMarks.filter(x => (x.subjectId === item.subjectId))[0].externalmarks * this.examMarkSetups.filter(x => (x.subjectTypeCatId === item.subjecttypeId))[0].externalPassPercentage / 100) > item.marks;
      if (this.examMarks.filter(x => (x.subjectId === item.subjectId)).length > 0){
        if (item.examTypeCode === 'Internal' && item.isPresent != null){
           // if (item.isMarksPublished){
                item.isPass = true; 
           // }
        }else{
          if (item.isPresent != null){

          // tslint:disable-next-line:max-line-length
          if (isMarks ){
             // item.isPass = false;
            //  if (item.isMarksPublished){
                item.isPass = false; 
            //  }
          }
          else{
           // if (item.isMarksPublished){
              item.isPass = true; 
          //  }
          }  
          
        }
        }
     }
    }

   
    publishExamMarks(): void{
      if (this.examFeeCollectionForm.valid){
        this.postMarksList = [];
        if (this.examsList.filter(x => (x.fk_exam_id === this.examFeeCollectionForm.value.examId)).length > 0){
           if (this.examsList.filter(x => (x.fk_exam_id === this.examFeeCollectionForm.value.examId))[0].is_internal_exam){
              // tslint:disable-next-line: prefer-for-of
              for (let i = 0; i < this.examStudentsList.length; i++){
                  this.examStudentsList[i].marksEnteredEmpId = this.examFeeCollectionForm.value.employeeId;
                  this.examStudentsList[i].courseId = this.examFeeCollectionForm.value.courseId;
                  this.examStudentsList[i].regulationId = this.regulationId;
                  this.examStudentsList[i].subjectTypeId = this.subjectTypeId;
                //  if (this.examStudentsList[i].isPresent){
                    this.examStudentsList[i].isMarksPublished = true;
                //  }
                  if (this.examStudentsList[i].isPass){
                    this.examStudentsList[i].credits = this.examTimetableSubjectsList.filter(x => (x.fk_subject_id === this.examFeeCollectionForm.value.subjectId))[0].sub_credits;
                  }else if (!this.examStudentsList[i].isPass){
                    this.examStudentsList[i].credits = 0;
                  }
                  this.postMarksList.push({
                      examStudentDetailDTO: this.examStudentsList[i],
                      examStudentInternalMarkDTO: {
                        examDate: this.examFeeCollectionForm.value.examDate,
                        isActive: true,
                        isPresent: this.examStudentsList[i].isPresent,
                        isPublished: false,
                        marks: this.examStudentsList[i].marks,
                        collegeId: this.examFeeCollectionForm.value.collegeId,
                        studentId: this.examStudentsList[i].studentId,
                        courseYearId: this.examFeeCollectionForm.value.courseYearId,
                        subjectId: this.examFeeCollectionForm.value.subjectId,
                        examId: this.examFeeCollectionForm.value.examId,
                        // tslint:disable-next-line: max-line-length
                        examTimetableId: this.examTimetableSubjectsList.filter(x => (x.fk_exam_timetable_det_id === this.examFeeCollectionForm.value.examTimetableDetId))[0].fk_exam_timetable_id,
                        examTimetableDetId: this.examFeeCollectionForm.value.examTimetableDetId,
                        employeeId: this.examFeeCollectionForm.value.employeeId,
                        createdDt: this.genericFunctions.moment(),
                        examStdInternalMarkId: this.examStudentsList[i].examStdInternalMarkId,
                      }
                  });
              }
              this.spinner.show();
              /*---------- EXAM INTERNAL MARKS ----------*/
              this.crudService.add(this.examStudentInternalMarksUrl, this.postMarksList)
              .subscribe(result => {
                  this.spinner.hide();
                  if (result.success){
                        this.snotifyService.success(result.message, 'Success!');
                        if (result.data){
                          this.selectedSubject(this.examFeeCollectionForm.value.examTimetableDetId, result.data);
                        }else{
                          this.selectedSubject(this.examFeeCollectionForm.value.examTimetableDetId, []);
                        }
                  }else {
                      if (result.data){
                        this.selectedSubject(this.examFeeCollectionForm.value.examTimetableDetId, result.data);
                      }else{
                        this.selectedSubject(this.examFeeCollectionForm.value.examTimetableDetId, []);
                      }
                      this.snotifyService.info(result.message, 'Info!');
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
           }else if (this.examsList.filter(x => (x.fk_exam_id === this.examFeeCollectionForm.value.examId))[0].is_regular_exam 
                                               || this.examsList.filter(x => (x.fk_exam_id === this.examFeeCollectionForm.value.examId))[0].is_supply_exam){
              // tslint:disable-next-line: prefer-for-of
              for (let i = 0; i < this.examStudentsList.length; i++){
                this.examStudentsList[i].marksEnteredEmpId = this.examFeeCollectionForm.value.employeeId;
                this.examStudentsList[i].courseId = this.examFeeCollectionForm.value.courseId;
                this.examStudentsList[i].regulationId = this.regulationId;
                this.examStudentsList[i].subjectTypeId = this.subjectTypeId;
               // if (this.examStudentsList[i].isPresent){
                  this.examStudentsList[i].isMarksPublished = true;
               // }
                if (this.examStudentsList[i].isPass){
                  this.examStudentsList[i].credits = this.examTimetableSubjectsList.filter(x => (x.fk_subject_id === this.examFeeCollectionForm.value.subjectId))[0].sub_credits;
                }else if (!this.examStudentsList[i].isPass){
                  this.examStudentsList[i].credits = 0;
                }
                this.postMarksList.push({
                  examStudentDetailDTO: this.examStudentsList[i],
                  examStudentInternalMarkDTO: null
                });
              }
              this.spinner.show();
              /*---------- EXAM Regular MARKS ----------*/
              this.crudService.add(this.examStudentInternalMarksUrl, this.postMarksList)
              .subscribe(result => {
                  this.spinner.hide();
                  if (result.success){
                        this.snotifyService.success(result.message, 'Success!');
                        if (result.data){
                          this.selectedSubject(this.examFeeCollectionForm.value.examTimetableDetId, result.data);
                        }else{
                          this.selectedSubject(this.examFeeCollectionForm.value.examTimetableDetId, []);
                        }
                  }else {
                    if (result.data){
                      this.selectedSubject(this.examFeeCollectionForm.value.examTimetableDetId, result.data);
                    }else{
                      this.selectedSubject(this.examFeeCollectionForm.value.examTimetableDetId, []);
                    }
                    this.snotifyService.info(result.message, 'Info!');
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
    }
    getEmloyees(){
      this.crudService.listDetailsById(this.employeeDetailUrl, +localStorage.getItem('employeeId'), 'employeeId')
              .subscribe(result => {
                  if (result.statusCode === 200) {
                      if (result.data && result.data !== '') {
                          this.EmployeeData = result.data.resultList;
                          this.examFeeCollectionForm.get('employeeId').setValue(+localStorage.getItem('employeeId'))
                          this.getReportingManagers(this.examFeeCollectionForm.value.employeeId)
                          // this.getLiveSchedules();
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
  getReportingManagers(employeeId): void{
    this.staffSubjectsList = [];
    if (employeeId !== null && employeeId !== undefined){
    this.spinner.show();          
    this.crudService.listByTwoIds(this.staffSubjectsUrl,
        employeeId,  'true','employeeId', 'status')
        .subscribe(result => {
       this.spinner.hide();
       if (result.statusCode === 200){
            if (result.data && result.data !== '') {
                this.staffSubjectsList = result.data;             
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


