import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormControl } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { CONSTANTS } from 'app/main/common/constants';
import { GenericFunctions } from 'app/main/common/generic-functions';
import { AcademicYear } from 'app/main/models/academicYear';
import { College } from 'app/main/models/college';
import { Course } from 'app/main/models/course';
import { CourseGroup } from 'app/main/models/courseGroup';
import { ExamMaster } from 'app/main/models/examMaster';
import { GeneralDetail } from 'app/main/models/generalDetail';
import { CrudService } from 'app/main/services/crud.service';
import { SnotifyService } from 'ng-snotify';
import { NgxSpinnerService } from 'ngx-spinner';
import { fuseAnimations } from '@fuse/animations';
import { ReplaySubject, Subject } from 'rxjs';
// import { MarksEditModalComponent } from './marks-edit-modal/marks-edit-modal.component';
import { MatDialog } from '@angular/material/dialog';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { Section } from 'app/main/models/section';
import * as _ from 'lodash';
import { GlobalService } from 'app/main/services/global.service';

@Component({
  selector: 'app-evaluation-marks',
  templateUrl: './evaluation-marks.component.html',
  styleUrls: ['./evaluation-marks.component.scss']
})
export class EvaluationMarksComponent implements OnInit {
 
  displayedColumns: string[] = ['id', 'campusCode', 'campusName', 'orgCode', 'districtName'];
  dataSource: MatTableDataSource<any>;

  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild(MatSort) sort: MatSort;

  @ViewChild('uploadXl') uploadXl: ElementRef;
  private staffSubjectsUrl = CONSTANTS.staffSubjectsUrl;
  private employeeDetailUrl=CONSTANTS.employeeDetailUrl
  private collegeCrudUrl = CONSTANTS.collegeCrudUrl;
  private academicYearCrudUrl = CONSTANTS.academicYearCrudUrl;
  private getDetailsByCollegeIdUrl = CONSTANTS.getDetailsByCollegeIdUrl;
  private courseCrudUrl = CONSTANTS.courseCrudUrl;
  private examMasterUrl = CONSTANTS.examMasterUrl;
  private getDetailsByCourseIdUrl = CONSTANTS.getDetailsByCourseIdUrl;
  private courseGroupCrudUrl = CONSTANTS.courseGroupCrudUrl;
  private courseYearCrudUrl = CONSTANTS.courseYearCrudUrl;
  private getDetailsByCourseYearIdUrl = CONSTANTS.getDetailsByCourseYearIdUrl;
  private groupSectionCrudUrl = CONSTANTS.groupSectionCrudUrl;
  private getDetailsByGroupUrl = CONSTANTS.getDetailsByGroupUrl;
  private getDetailsByAcademicYearIdUrl = CONSTANTS.getDetailsByAcademicYearIdUrl;
  private generalDetailsUrl = CONSTANTS.generalDetailsUrl;
  private generalDetailsByCodeUrl = CONSTANTS.generalDetailsByCodeUrl;
  private subjectType = CONSTANTS.subjectType;
  private examIdUrl = CONSTANTS.examIdUrl;
  private getDetailsByRegulationIdUrl = CONSTANTS.getDetailsByRegulationIdUrl;
  private employeeSearchUrl = CONSTANTS.employeeSearchUrl;
  private subjectsforexamUrl = CONSTANTS.subjectsforexamUrl;
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
  private sortOrder = CONSTANTS.sortOrder;
  private OFFLINEEVALUATION= CONSTANTS.OFFLINEEVALUATION;
  private groupYrRegulationUrl = CONSTANTS.groupYrRegulationUrl;

  public formData;
  filtersDetailsList=[];
  CollegesListDetails=[];
    private collegewisedetailsUrl=CONSTANTS.collegewisedetailsUrl;
  examFeeCollectionForm: FormGroup;
  colleges: College[] = [];
  academicYears: AcademicYear[] = [];
  courses: Course[] = [];
  examsList = [];
  courseGroups: CourseGroup[] = [];
  sections: Section[] = [];
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
  examDate = this.genericFunctions.momentWithDateFormatYMD(this.genericFunctions.moment()) ;

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
  minvalue: number
  maxValue: number
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
      examDate: [this.genericFunctions.moment(), Validators.required],
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
         {paramName: 'in_gm_codes', paramValue:'SUBTYPE'},
        
         
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
          if(this.colleges.length>0){
            this.colleges = this.colleges.sort((a,b)=>a.clg_sort_order-b.clg_sort_order);
            this.examFeeCollectionForm.get('collegeId').setValue(this.colleges[0].fk_college_id);
            this.selectedCollege(this.examFeeCollectionForm.value.collegeId)
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
    this.examFeeCollectionForm.get('academicYearId').setValue('');
    this.examFeeCollectionForm.get('courseId').setValue('');
    this.examFeeCollectionForm.get('examId').setValue('');
    this.examFeeCollectionForm.get('courseGroupId').setValue('');
    this.examFeeCollectionForm.get('courseYearId').setValue('');
    this.examFeeCollectionForm.get('subjectTypeId').setValue('');
    this.examFeeCollectionForm.get('subjectId').setValue('');
    this.examFeeCollectionForm.get('examTimetableDetId').setValue('');
    this.courses = [];
    this.examsList = [];
    this.courseYears = [];
    this.courseGroups = [];
    this.academicYears = []; 
    this.examTimetableSubjectsList = [];
    this.collegeCode = this.colleges.filter(x => (x.fk_college_id === collegeId))[0].college_code;
    /*----------- ACADEMIC YEARS -----------*/
    if (collegeId != null && collegeId !== undefined ){
      this.academicYearsList=[]
      this.academicYearsList=this.CollegesListDetails.filter(x=>(x.fk_college_id==collegeId))
          if(this.academicYearsList.length>0){
          const academicYears = this.academicYearsList.map(({ fk_academic_year_id }) => fk_academic_year_id);
          this.academicYears = this.academicYearsList.filter(({ fk_academic_year_id }, index) => !academicYears.includes(fk_academic_year_id, index + 1));
          }
          if(this.academicYears.length>0){
            this.examFeeCollectionForm.get('academicYearId').setValue(this.academicYears[0].fk_academic_year_id);
            this.selectedAcademicYear(this.examFeeCollectionForm.value.academicYearId)
          }
  //  this.crudService.listDetailsByTwoIdsWithSort(this.academicYearCrudUrl, collegeId, 'true', 'DESC', this.getDetailsByCollegeIdUrl, this.isActive, 'fromDate')
  // this.crudService.listDetailsByTwoIdsWithSort(this.academicYearCrudUrl, collegeId, 'true', 'DESC', this.getDetailsByCollegeIdUrl, this.isActive, 'fromDate')
  //  .subscribe(result => {
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
   }
  }

// tslint:disable-next-line:typedef
selectedAcademicYear(academicYearId){
  this.examFeeCollectionForm.get('courseId').setValue('');
  this.examFeeCollectionForm.get('examId').setValue('');
  this.examFeeCollectionForm.get('courseGroupId').setValue('');
  this.examFeeCollectionForm.get('courseYearId').setValue('');
  this.examFeeCollectionForm.get('subjectTypeId').setValue('');
  this.examFeeCollectionForm.get('subjectId').setValue('');
  this.examFeeCollectionForm.get('examTimetableDetId').setValue('');
  this.courses = [];
  this.examsList = [];
  this.courseGroups = []; 
  this.courseYears = [];
  this.examTimetableSubjectsList = [];
  this.courseListData=[]
  this.academicYear = this.academicYears.filter(x => (x.fk_academic_year_id === academicYearId))[0].academic_year;
/*----------- COURSES -----------*/
  if (academicYearId != null && academicYearId !== undefined ){
    this.courseListData=this.CollegesListDetails.filter(x=>(x.fk_college_id==this.examFeeCollectionForm.value.collegeId && x.fk_academic_year_id == academicYearId))
    if(this.courseListData.length>0){
  const courseList = this.courseListData.map(({ fk_course_id }) => fk_course_id);
  this.courses = this.courseListData.filter(({ fk_course_id }, index) =>
    !courseList.includes(fk_course_id, index + 1));
}
if(this.courses.length>0){
  this.examFeeCollectionForm.get('courseId').setValue(this.courses[0].fk_course_id);
  this.selectedCourse(this.examFeeCollectionForm.value.courseId)
}
// this.crudService.listDetailsByTwoIds(this.courseCrudUrl, this.examFeeCollectionForm.value.collegeId, 'true', this.getDetailsByCollegeIdUrl, this.isActive)
// .subscribe(result => {
//     if (result.statusCode === 200){
//             if (result.data.resultList && result.data.resultList !== '') {
//                 this.courses = result.data.resultList; 
//             } else {
//                 this.snotifyService.success(result.message, 'Success!');
//             }
//         }else {
//           this.snotifyService.error(result.message, 'Error!');
//       }
    
// }, error => {
//   if (error.error.statusCode === 401){
//       this.snotifyService.error(error.error.message, 'Error!');
//       this.genericFunctions.logOut(this.router.url);
//   }else{
//       this.snotifyService.error(CONSTANTS.message.CON_ERROR, 'Error!');
//   }
// });
}
}

selectedCourse(courseId): void{
  this.examFeeCollectionForm.get('courseGroupId').setValue('');
  this.examFeeCollectionForm.get('courseYearId').setValue('');
  this.examFeeCollectionForm.get('examId').setValue('');
  this.examFeeCollectionForm.get('subjectTypeId').setValue('');
  this.examFeeCollectionForm.get('subjectId').setValue('');
  this.examFeeCollectionForm.get('examTimetableDetId').setValue('');
  this.examsList = [];
  this.courseYears = [];
  this.courseGroups = [];
  this.examTimetableSubjectsList = [];
  this.examsLists=[]
  if (courseId !== null && courseId !== undefined){
    this.course = this.courses.filter(x => (x.fk_course_id === courseId))[0].course_code;
  /*----------- Exams List -----------*/      
  // tslint:disable-next-line:max-line-length
  this.examsLists=this.CollegesListDetails.filter(x=>(x.fk_college_id== this.examFeeCollectionForm.value.collegeId && x.fk_course_id==this.examFeeCollectionForm.value.courseId && x.fk_academic_year_id==this.examFeeCollectionForm.value.academicYearId))
  if(this.examsLists.length>0){
  const examsLists = this.examsLists.map(({ fk_exam_id }) => fk_exam_id);
  this.examsList = this.examsLists.filter(({ fk_exam_id }, index) => !examsLists.includes(fk_exam_id, index + 1));
  this.examData = this.examsList;
  }
  if(this.examsList.length>0){
    this.examFeeCollectionForm.get('examId').setValue(this.examsList[0].fk_exam_id);
    this.selectedExam(this.examFeeCollectionForm.value.examId)
  }
  //   this.crudService.listDetailsByFourIdsWithSortOrder(this.examMasterUrl, this.examFeeCollectionForm.value.collegeId, this.examFeeCollectionForm.value.academicYearId, courseId, 'true',
  //  'DESC', this.getDetailsByCollegeIdUrl , this.getDetailsByAcademicYearIdUrl, this.getDetailsByCourseIdUrl, 'isActive', 'createdDt')
  //   .subscribe(result => {
  //   this.spinner.hide();
  //   if (result.statusCode === 200){
  //       if (result.success) {
  //           this.examsList = result.data.resultList;
  //           this.examData = result.data.resultList;
  //       }else{
  //         this.snotifyService.success(result.message, 'Success!');
  //       }
  //   }else {
  //   this.snotifyService.error(result.message, 'Error!');
  //   }
  //   }, error => {
  //   this.spinner.hide();
  //   if (error.error.statusCode === 401){
  //       this.snotifyService.error(error.error.message, 'Error!');
  //       this.genericFunctions.logOut(this.router.url);
  //   }else{
  //     this.snotifyService.error(CONSTANTS.message.CON_ERROR, 'Error!');
  //   }
  //   });
  }
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
  this.examFeeCollectionForm.get('courseGroupId').setValue('');
  this.examFeeCollectionForm.get('courseYearId').setValue('');
  this.examFeeCollectionForm.get('subjectTypeId').setValue('');
  this.examFeeCollectionForm.get('subjectId').setValue('');
  this.examFeeCollectionForm.get('examTimetableDetId').setValue('');
  this.courseGroups = [];
  this.courseYears = [];
  this.subjectTypes=[]
  this.groupList=[]
  this.examTimetableSubjectsList = [];
  this.minDate = this.genericFunctions.momentWithDateFormatYMD(this.examsList.filter(x => (x.fk_exam_id === examId))[0].from_date);
  this.examFeeCollectionForm.get('examDate').setValue(this.minDate);
  this.maxDate =  this.genericFunctions.momentWithDateFormatYMD(this.examsList.filter(x => (x.fk_exam_id === examId))[0].to_date);
  this.isInternalExam = false;
  if (this.examsList.filter(x => (x.fk_exam_id === examId)).length > 0){
      if (this.examsList.filter(x => (x.fk_exam_id === examId))[0].is_internal_exam){
          this.isInternalExam = true;
      }
  }

/*----------- COURSES GROUPS -----------*/      
  if (examId != null && examId !== undefined ){
  this.exam = this.examsList.filter(x => (x.fk_exam_id === this.examFeeCollectionForm.value.examId))[0].exam_name +
   '( ' + this.genericFunctions.momentWithDateFormatYMD(this.examsList.filter(x => (x.fk_exam_id === this.examFeeCollectionForm.value.examId))[0].from_date) + ' - ' + 
   this.genericFunctions.momentWithDateFormatYMD(this.examsList.filter(x => (x.fk_exam_id === this.examFeeCollectionForm.value.examId))[0].to_date)
     + ')';

     this.groupList=this.CollegesListDetails.filter(x=>(x.fk_college_id== this.examFeeCollectionForm.value.collegeId && x.fk_course_id==this.examFeeCollectionForm.value.courseId && x.fk_academic_year_id==this.examFeeCollectionForm.value.academicYearId &&  x.fk_exam_id==this.examFeeCollectionForm.value.examId))
     if(this.groupList.length>0){
     const groupList = this.groupList.map(({ fk_course_group_id }) => fk_course_group_id);
     this.courseGroups = this.groupList.filter(({ fk_course_group_id }, index) => !groupList.includes(fk_course_group_id, index + 1));
     }
     if(this.courseGroups.length>0){
      this.examFeeCollectionForm.get('courseGroupId').setValue(this.courseGroups[0].fk_course_group_id);
      this.selectedCourseGroup(this.examFeeCollectionForm.value.courseGroupId)
    }
  // this.crudService.listDetailsByTwoIds(this.courseGroupCrudUrl, this.examFeeCollectionForm.value.courseId, 'true', this.getDetailsByCourseIdUrl, this.isActive)
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
}

selectedCourseGroup(courseGroupId): void{
  this.courseYears = [];
  this.sections = [];
  this.subjectTypes=[]
  this.examTimetableSubjectsList = [];
  this.courseYearsList = [];
  this.examFeeCollectionForm.get('courseYearId').setValue('');
  this.examFeeCollectionForm.get('groupSectionId').setValue('');  
  this.examFeeCollectionForm.get('subjectTypeId').setValue('');
  this.examFeeCollectionForm.get('subjectId').setValue('');
  this.examFeeCollectionForm.get('examTimetableDetId').setValue('');
  if (this.examFeeCollectionForm.value.collegeId != null && courseGroupId != null){
  this.courseGroup = this.courseGroups.filter(x => (x.fk_course_group_id === courseGroupId))[0].group_code;
  /*----------- COURSES Years -----------*/      
  this.courseYearsList=this.CollegesListDetails.filter(x=>(x.fk_college_id== this.examFeeCollectionForm.value.collegeId && x.fk_course_id==this.examFeeCollectionForm.value.courseId && x.fk_academic_year_id==this.examFeeCollectionForm.value.academicYearId && x.fk_exam_id==this.examFeeCollectionForm.value.examId && x.fk_course_group_id==this.examFeeCollectionForm.value.courseGroupId))
     if(this.courseYearsList.length>0){
     const courseYearsList = this.courseYearsList.map(({ fk_course_year_id }) => fk_course_year_id);
     this.courseYears = this.courseYearsList.filter(({ fk_course_year_id }, index) => !courseYearsList.includes(fk_course_year_id, index + 1));
     }
     if(this.courseYears.length>0){
      this.examFeeCollectionForm.get('courseYearId').setValue(this.courseYears[0].fk_course_year_id);
      this.selectedYear(this.examFeeCollectionForm.value.courseYearId)
    }
  // this.crudService.listDetailsByTwoIdsWithSortLtd(this.courseYearCrudUrl, this.examFeeCollectionForm.value.courseId, 'true', 'ASC',
  //  this.getDetailsByCourseIdUrl, this.isActive, this.sortOrder)
  // .subscribe(result => {
  //     this.spinner.hide();
  //     if (result.statusCode === 200) {
  //         if (result.data.resultList && result.data.resultList !== '') {
  //             this.courseYears = result.data.resultList;
              
  //         } else {
  //             this.snotifyService.success(result.message, 'Success!');
  //         }
  //     }else {
  //         this.snotifyService.error(result.message, 'Error!');
  //     }
  // }, error => {
  //     this.spinner.hide();
  //     if (error.error.statusCode === 401){
  //         this.snotifyService.error(error.error.message, 'Error!');
  //         this.genericFunctions.logOut(this.router.url);
  //     }else{
  //         this.snotifyService.error(CONSTANTS.message.CON_ERROR, 'Error!');
  //     }
  // });
}
}

selectedYear(courseYearId): void{
  this.sections = [];
  this.subjectTypeList=[]
  this.subjectTypes=[]
  this.examTimetableSubjectsList = [];
  this.examFeeCollectionForm.get('groupSectionId').setValue('');
  this.examFeeCollectionForm.get('subjectTypeId').setValue('');
  this.examFeeCollectionForm.get('subjectId').setValue('');
  this.examFeeCollectionForm.get('examTimetableDetId').setValue('');
  if (this.examFeeCollectionForm.value.collegeId != null && courseYearId != null){
  this.courseyear = this.courseYears.filter(x => (x.fk_course_year_id === courseYearId))[0].course_year_name;
  /*----------- COURSES YEARS -----------*/      
  this.subjectTypeList=this.CollegesListDetails.filter(x=>(x.fk_college_id== this.examFeeCollectionForm.value.collegeId && x.fk_course_id==this.examFeeCollectionForm.value.courseId && x.fk_academic_year_id==this.examFeeCollectionForm.value.academicYearId && x.fk_exam_id==this.examFeeCollectionForm.value.examId && x.fk_course_group_id==this.examFeeCollectionForm.value.courseGroupId && x.fk_course_year_id==this.examFeeCollectionForm.value.courseYearId))
  if(this.subjectTypeList.length>0){
  const subjectTypeList = this.subjectTypeList.map(({ fk_subjecttype_catdet_id }) => fk_subjecttype_catdet_id);
  this.subjectTypes = this.subjectTypeList.filter(({ fk_subjecttype_catdet_id }, index) => !subjectTypeList.includes(fk_subjecttype_catdet_id, index + 1));
  }
  
//  if(this.semister==false){
//   if (this.examsList.filter(x => x.fk_exam_id === this.examFeeCollectionForm.value.examId)[0].is_regular_exam){
//     this.subjectTypes =this.subjectTypes.filter(x=>x.fk_subjecttype_catdet_id!=this.ELECTIVE && x.fk_subjecttype_catdet_id!=this.THEORY)
//     }
//  }
 
    if(this.subjectTypes.length>0){
      this.examFeeCollectionForm.get('subjectTypeId').setValue(this.subjectTypes[0].fk_subjecttype_catdet_id);
      this.selectedSubjectType(this.examFeeCollectionForm.value.subjectTypeId)
    }

}
}

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

selectedSubjectType(subjectTypeId): void{
  
  this.examFeeCollectionForm.get('subjectId').setValue('');
  this.examFeeCollectionForm.get('examTimetableDetId').setValue('');
  this.examTimetableSubjectsList = [];
this.examTimetableSubjects=[]
  if (subjectTypeId !== null){  
    this.examTimetableSubjects=this.CollegesListDetails.filter(x=>(x.fk_college_id== this.examFeeCollectionForm.value.collegeId && x.fk_course_id==this.examFeeCollectionForm.value.courseId && x.fk_academic_year_id==this.examFeeCollectionForm.value.academicYearId && x.fk_exam_id==this.examFeeCollectionForm.value.examId && x.fk_course_group_id==this.examFeeCollectionForm.value.courseGroupId && x.fk_course_year_id==this.examFeeCollectionForm.value.courseYearId && x.fk_subjecttype_catdet_id==this.examFeeCollectionForm.value.subjectTypeId))
    if(this.examTimetableSubjects.length>0){
    const examTimetableSubjects = this.examTimetableSubjects.map(({ fk_subject_id }) => fk_subject_id);
    this.examTimetableSubjectsList = this.examTimetableSubjects.filter(({ fk_subject_id }, index) => !examTimetableSubjects.includes(fk_subject_id, index + 1));
    }
  //   if(this.examTimetableSubjectsList.length>0){
  // // this.examFeeCollectionForm.get('examTimetableDetId').setValue(this.examTimetableSubjectsList[0].fk_exam_timetable_det_id);
  //   }
    if (subjectTypeId !== 0){
      this.examTimetableSubjectsList = this.examTimetableSubjectsList.filter(x => (x.fk_subjecttype_catdet_id === subjectTypeId));
      // this.subjectTypCode = this.subjectTypes.filter(x => (x.generalDetailId === subjectTypeId))[0].generalDetailCode;
     }
     else if (subjectTypeId === 0){
      this.examTimetableSubjectsList =  this.examTimetableSubjectsList
    // this.subjectTypCode = 'All';
     }
     this.getMarksSetup( this.examTimetableSubjectsList);
    // const dateConvert = this.genericFunctions.momentFormatYMD(this.examFeeCollectionForm.value.examDate);
      /*----------- EXAM TIMETABLES -----------*/
    // this.crudService.listBySixIds(this.subjectsforexamUrl, this.examFeeCollectionForm.value.collegeId, 
    //                                                          this.examFeeCollectionForm.value.courseId, 
    //                                                          this.examFeeCollectionForm.value.examId, 
    //                                                          dateConvert, 
    //                                                          this.examFeeCollectionForm.value.courseGroupId, 
    //                                                          this.examFeeCollectionForm.value.courseYearId, 

    //                                                          this.collegeByIdUrl, this.courseByIdUrl, this.examIdUrl, 'examDate', this.courseGroupByIdUrl, this.courseYearByIdUrl)
    //   .subscribe(result => {
    //       if (result.statusCode === 200){
    //               if (result.data && result.data !== '' && result.data.length > 0) {
    //                // this.examTimetableSubjectsList = result.data;
    //                  if (subjectTypeId !== 0){
    //                   this.examTimetableSubjectsList = result.data.filter(x => (x.subjectTypeId === subjectTypeId));
    //                   // this.subjectTypCode = this.subjectTypes.filter(x => (x.generalDetailId === subjectTypeId))[0].generalDetailCode;
    //                  }
    //                  else if (subjectTypeId === 0){
    //                   this.examTimetableSubjectsList = result.data;
    //                 // this.subjectTypCode = 'All';
    //                  }
    //                  this.getMarksSetup(result.data);
    //               } else {
    //                   this.snotifyService.success(result.message, 'Success!');
    //               }
    //       }else {
    //             this.snotifyService.error(result.message, 'Error!');
    //       }
    //   }, error => {
    //     if (error.error.statusCode === 401){
    //         this.snotifyService.error(error.error.message, 'Error!');
    //         this.genericFunctions.logOut(this.router.url);
    //     }else{
    //         this.snotifyService.error(CONSTANTS.message.CON_ERROR, 'Error!');
    //     }
    //   });
  }
}

getMarksSetup(data): void{
  if (data.length > 0){
    this.crudService.getGroupSubjectsByRegulation(this.groupYrRegulationUrl, data[0].fk_college_id, 
      data[0].fk_course_group_id,  data[0].fk_course_year_id, data[0].fk_regulation_id)
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
    this.crudService.listDetailsByThreeIds(this.examMarksSetupUrl, data[0].fk_course_id, data[0].fk_regulation_id, 'true',
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
}

selectedSubject(examTimetableDetId, list): void{
  this.examStudentsList = [];
  if (examTimetableDetId !== null){
    this.subjectDetails = '';
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

    postExamMarks(): void{
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
                  // if (this.examStudentsList[i].isPresent){
                  //   this.examStudentsList[i].isMarksPublished = true;
                  // }
                 
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
                //   this.examStudentsList[i].isMarksPublished = true;
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
    
}
