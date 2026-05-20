import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { FormGroup, FormControl, FormBuilder, Validators } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { CONSTANTS } from 'app/main/common/constants';
import { College } from 'app/main/models/college';
import { Course } from 'app/main/models/course';
import { CourseGroup } from 'app/main/models/courseGroup';
import { AcademicYear } from 'app/main/models/academicYear';
import { CourseYear } from 'app/main/models/courseYearRegulation';
import { Subject, ReplaySubject } from 'rxjs';
import { Router, ActivatedRoute } from '@angular/router';
import { SnotifyService } from 'ng-snotify';
import { CrudService } from 'app/main/services/crud.service';
import { NgxSpinnerService } from 'ngx-spinner';
import { GenericFunctions } from 'app/main/common/generic-functions';
import { takeUntil } from 'rxjs/operators';
import * as moment from 'moment';
import { Regulations } from 'app/main/models/Rregulations';
import { ClickEventArgs } from '@syncfusion/ej2-navigations';
import { GridComponent, PdfExportProperties } from '@syncfusion/ej2-angular-grids';
import { columnsTotalWidth } from '@swimlane/ngx-datatable';
import { GlobalService } from 'app/main/services/global.service';

@Component({
  selector: 'app-tabulation-registration',
  templateUrl: './tabulation-registration.component.html',
  styleUrls: ['./tabulation-registration.component.scss']
})
export class TabulationRegistrationComponent implements OnInit {
  panelOpenState = true;

  private getExamFiltersBycodeUrl = CONSTANTS.getExamFiltersBycodeUrl;
  private generalDetailsUrl = CONSTANTS.generalDetailsUrl;
  private examFeeType = CONSTANTS.examFeeType;
  private getexamresultsbycode = CONSTANTS.getexamresultsbycode;
  private generalDetailsByCodeUrl = CONSTANTS.generalDetailsByCodeUrl;
  private isActive = CONSTANTS.isActive;
  private studentSearchUrl = CONSTANTS.studentSearchUrl;
  MINIO = CONSTANTS.MINIO;

  filtersDetailsList = [];
  CollegesListDetails = [];
  CollegeIdData = [];
  staffForm: FormGroup;
  colleges: College[] = [];
  courses = [];
  courseGroups: CourseGroup[] = [];
  regulations: Regulations[] = [];
  courseYears: CourseYear[] = [];
  step = 0;
  groupId;
  check = 1;
  isGroupId;
  isGroup;
  isCourse;
  isHOD;
  collegeId;
  dashboard;
  pageParams: any = {};
  searchStudents = [];
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
  isAdmin = false;

  courseListData = [];
  academicYearsList = [];
  examsLists = [];
  examData = [];
  groupList = [];
  courseYearsList = [];
  regulationsList = [];
  tabulationRegisterList = [];
  examRegisteredStudents = [];
  subjects = [];
  subjectCodes = [];
  searchText = ''
  isPrintMode: boolean = false;


  public gridData: any[];
  public toolbar: string[];
  // tslint:disable-next-line: ban-types
  public pageSettings: Object;
  @ViewChild('grid')
  public grid: GridComponent;
  // tslint:disable-next-line: ban-types
  public initialPage: Object;
  dataDetails = ' ';
  @ViewChild('excelTable', { static: false }) excelTable: ElementRef;
  trafoItem = "Tabulation Register Report";
  collegeName: string;
  examName: any;
  newList = [];
  studentsList: any[];
  mainList = [];
  private _onDestroy = new Subject<void>();

  public studentFilterCtrl: FormControl = new FormControl();
  public filteredStudents: ReplaySubject<any[]> = new ReplaySubject<any[]>(1);
  params: any;
  singleStudent = [];
  orgCode: any;
  myDate: Date;
  deptName = [];
  org_logo: any;
  deptCode: any;
  groupDetails = [];
  dataFlag: boolean;
  org_name: any;
  CollegesListFilterDetails: any[];
  regulationFilterList: any[];
  courseGroupList: any[];
  examFeeTypesList = [];
  examFeeTypes = [];

  universityCode = '';

  constructor(private route: ActivatedRoute, private formBuilder: FormBuilder, private snotifyService: SnotifyService,
    private crudService: CrudService, private spinner: NgxSpinnerService, private router: Router, private _globalService: GlobalService,
    private dialog: MatDialog, private genericFunctions: GenericFunctions) {
    this.dashboard = CONSTANTS.dashboard;
    this.getFiltersList();
    this.isAdmin = JSON.parse(localStorage.getItem('isAdmin'));
  }

  ngOnInit(): void {
    this.staffForm = this.formBuilder.group({
      collegeId: ['', Validators.required],
      academicYearId: ['', Validators.required],
      courseId: ['', Validators.required],
      courseGroupId: ['', Validators.required],
      courseYearId: ['', Validators.required],
      examId: ['', Validators.required],
      examTypeCatdetId: ['', Validators.required],
      studentId: [''],
      isReevaluation:[false]
    });

    this.studentFilterCtrl.valueChanges
      .pipe(takeUntil(this._onDestroy))
      .subscribe(() => {
        this.filterStd();
      });
    this.searchStudents.push({ firstName: 'Search by student name or hallticket.no' });

    this.filteredStudents.next(this.searchStudents.slice());

    this.route.queryParams
      .subscribe(params => {
        if (!this.isEmptyObject(params)) {
          this.params = params;
        }
      });
    this.orgCode = localStorage.getItem('orgCode')
    this.myDate = new Date();


  }
  getFiltersList(): void {
    this.filtersDetailsList = []
    this.CollegesListDetails = []
    this.groupDetails = []
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
      this.staffForm.get('examTypeCatdetId').setValue('');
      this.examFeeTypesList = [];
      this.examFeeTypes = [];
      this.academicYears = []
      this.academicYearsList = []
      this.academicYearsList = this.CollegesListFilterDetails.filter(x => (x.fk_course_id == this.staffForm.value.courseId))
      this.tabulationRegisterList = [];
      this.examRegisteredStudents = [];
      this.subjects = [];
      this.subjectCodes = [];
      this.courseCode = this.courses.filter(x => x.fk_course_id == this.staffForm.value.courseId)[0]?.course_code;
      this.universityCode = this.courses.filter(x => x.fk_course_id == this.staffForm.value.courseId)[0]?.university_code;
      if (this.courseCode == 'DPHARM') {
        this.dataFlag = false
      } else {
        this.dataFlag = true
      }

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
    this.staffForm.get('examTypeCatdetId').setValue('');
    this.examsLists = []
    this.examData = []
    this.colleges = []
    this.courseGroups = []
    this.courseYears = []
    this.examFeeTypesList = [];
    this.examFeeTypes = [];
    this.examsList = [];
    if (academicYearId) {
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
    this.staffForm.get('examTypeCatdetId').setValue('');
    this.examFeeTypesList = [];
    this.examFeeTypes = [];
    this.colleges = []
    this.courseGroups = []
    this.courseYears = []
    this.getExamTypes(this.staffForm.value.examId);
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
                this.regulationFilterList = this.filtersDetailsList[i];
              }
            }
            if (this.CollegesListDetails) {
              /*----------- Colleges -----------*/
             
              this.colleges = this.CollegesListDetails
              const CollegeIdData = this.colleges.map(({ fk_college_id }) => fk_college_id);
              this.colleges = this.colleges.filter(({ fk_college_id }, index) => !CollegeIdData.includes(fk_college_id, index + 1));
              if (this.colleges.length > 0) {
                this.staffForm.get('collegeId').setValue(this.colleges[0].fk_college_id);
                this.selectedCollege(this.staffForm.value.collegeId);
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
  getExamTypes(examId){
    this.staffForm.get('examTypeCatdetId').setValue('');
    this.examFeeTypesList = [];
    this.examFeeTypes = [];
    if (examId != null && examId !== undefined) {
      this.crudService.listDetailsByTwoIds(this.generalDetailsUrl, this.examFeeType, 'true', this.generalDetailsByCodeUrl, this.isActive)
      .subscribe(result => {
          if (result.statusCode === 200){
                      if (result.data.resultList && result.data.resultList !== '') {
                        this.examFeeTypesList = result.data.resultList;
                        if(this.examFeeTypesList && this.examFeeTypesList.length > 0){
                          for (let i = 0; i < this.examFeeTypesList.length; i++){
                              if(this.examsList.filter(x => (x.fk_exam_id === this.staffForm.value.examId))[0]?.is_regular_exam){
                                if (this.examFeeTypesList[i].generalDetailCode === 'Regular'){
                                  this.examFeeTypes.push(this.examFeeTypesList[i]);
                              }
                              }
                              if(this.examsList.filter(x => (x.fk_exam_id === this.staffForm.value.examId))[0]?.is_supply_exam){
                                if (this.examFeeTypesList[i].generalDetailCode === 'Supple'){
                                  this.examFeeTypes.push(this.examFeeTypesList[i]);
                              }
                              }
                              if(this.examsList.filter(x => (x.fk_exam_id === this.staffForm.value.examId))[0]?.is_internal_exam){
                                if (this.examFeeTypesList[i].generalDetailCode === 'Internal'){
                                  this.examFeeTypes.push(this.examFeeTypesList[i]);
                              }
                              }
                            }
                        }
                        if(this.examFeeTypes && this.examFeeTypes.length > 0){
                            this.staffForm.get('examTypeCatdetId').setValue(this.examFeeTypes[0]?.generalDetailId);
                            this.selectedExamType();
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
  selectedExamType(){
    this.tabulationRegisterList = [];
    this.examRegisteredStudents = [];
    this.subjects = [];
    this.subjectCodes = [];
    this.mainList = [];
    this.newList = [];
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
  selectedYear(examId): void {
    //  this.memo = [];
    //  this.feeCertificateIssue = [];
    //  this.isPrint = false;
    //  if (this.selectedStd.length > 0) {
    //    // this.getExamFeeReceipts(this.student.studentId);
    //    // this.getMemo(this.student.studentId, examId);
    //    this.getResultList();
    //  }
    //  if (this.examsList.filter(x => (x.examId === examId)).length > 0) {
    //    this.exam = this.examsList.filter(x => (x.examId === examId))[0];
    //  }
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
  // tslint:disable-next-line:typedef
  reset(): void {
    this.staffForm.get('courseId').setValue('');
    this.staffForm.get('examId').setValue('');
    this.staffForm.get('courseGroupId').setValue('');
    this.staffForm.get('courseYearId').setValue('');
    this.tabulationRegisterList = [];
    this.examRegisteredStudents = [];
    this.subjects = [];
    this.subjectCodes = [];
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

  // tslint:disable-next-line:typedef
  isEmptyObject(obj) {
    return (obj && (Object.keys(obj).length === 0));
  }
  enteredStudent(event): void {
    if (event.target.value.length > 4) {
      /*----------- STUDENTS -----------*/
      this.crudService.listByIds(this.studentSearchUrl, event.target.value, 'q')
        .subscribe(result => {
          if (result.statusCode === 200) {
            if (result.success) {
              this.searchStudents = result.data;
              this.filteredStudents.next(this.searchStudents.slice());
            } else {
              this.snotifyService.info(result.message, 'Info!');
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

  selectedStd(studentId): void {
    this.mainList = [];
    if (this.searchStudents.filter(x => (x.studentId === studentId)).length > 0) {
      this.collegeCode = this.searchStudents.filter(x => (x.studentId === studentId))[0].collegeCode;
      this.courseCode = this.searchStudents.filter(x => (x.studentId === studentId))[0].courseCode;
      this.courseGroupCode = this.searchStudents.filter(x => (x.studentId === studentId))[0].groupCode;

    }
  }
selectedFlag(){
  this.tabulationRegisterList = [];
  this.examRegisteredStudents = [];
  this.subjects = [];
  this.subjectCodes = [];
  this.mainList = [];
  this.newList = [];
}
  getDetails() {
    this.tabulationRegisterList = [];
    this.examRegisteredStudents = [];
    this.subjects = [];
    this.subjectCodes = [];
    this.mainList = [];
    this.newList = [];
    if (this.staffForm.value.studentId == 0) {
      this.staffForm.get('studentId').setValue('')
    }
    if (this.staffForm.valid) {
      this.spinner.show();
      this.collegeCode = this.colleges.filter(x => (x.fk_college_id == this.staffForm.value.collegeId))[0]?.college_code
      this.courseCode = this.courses.filter(x => x.fk_course_id == this.staffForm.value.courseId)[0]?.course_code


      this.courseGroupCode = this.courseGroups.filter(x => x.fk_course_group_id == this.staffForm.value.courseGroupId)[0]?.group_code;
      this.courseYearCode = this.courseYears.filter(x => x.fk_course_year_id == this.staffForm.value.courseYearId)[0]?.course_year_name;
      this.exam = this.examsList.filter(x => x.fk_exam_id == this.staffForm.value.examId)[0]?.exam_name;
      this.selectedData();
      let flag;
      if(this.staffForm.value.isReevaluation === true){
          flag = 'tabulation_register_re_evaluation';
      }else{
          flag = 'tabulation_register';
      }
      let request = [
        { paramName: 'in_flag', paramValue: flag },
        // {paramName: 'in_exam_id', paramValue: this.staffForm.value.examId},
        // {paramName: 'in_college_id', paramValue: this.staffForm.value.collegeId},
        // {paramName: 'in_course_id', paramValue: this.staffForm.value.collegeId},
        // {paramName: 'in_course_group_id', paramValue: this.staffForm.value.courseGroupId},
        // {paramName: 'in_courseyear_id', paramValue: this.staffForm.value.courseYearId},
        { paramName: 'in_exam_id', paramValue: this.staffForm.value.examId },
        { paramName: 'in_college_id', paramValue: this.staffForm.value.collegeId },
        { paramName: 'in_course_id', paramValue: this.staffForm.value.courseId },
        { paramName: 'in_course_group_id', paramValue: this.staffForm.value.courseGroupId },
        { paramName: 'in_course_year_id', paramValue: this.staffForm.value.courseYearId },
        { paramName: 'in_hallticket_no', paramValue: this.staffForm.value.studentId },
        { paramName: 'in_examtype', paramValue: this.staffForm.value.examTypeCatdetId },
        // {paramName: 'in_hallticket_no', paramValue: '1058-24-538-001'},

      ];
      this.crudService.getDetailsByRequest(this.getexamresultsbycode, '', request, '&')
        .subscribe(result => {
          this.spinner.hide();
          if (result.statusCode === 200) {
            if (result.data && result.data !== '' && result.data.result.length > 0) {
                  if(this.universityCode === 'SUK'){
                  this.tabulationRegisterList = result.data.result[0];
                  if(this.tabulationRegisterList && this.tabulationRegisterList.length > 0){
                  this.mainList = [];
                  this.newList = [];
                  const students = this.tabulationRegisterList.map(({ hallticket_number }) => hallticket_number);
                  this.studentsList = this.tabulationRegisterList.filter(({ hallticket_number }, index) =>
                    !students.includes(hallticket_number, index + 1));
                  for (let i = 0; i < this.studentsList.length; i++) {
                    this.newList = [];
                    for (let j = 0; j < this.tabulationRegisterList.length; j++) {
                      if (this.studentsList[i].hallticket_number == this.tabulationRegisterList[j].hallticket_number) {
                        this.newList.push(this.tabulationRegisterList[j])
                      }
                    }
                    this.mainList.push(this.newList);
                    for (let i = 0; i < this.mainList.length; i++) {
                      this.mainList[i].semList = [];
                      this.mainList[i].semList = this.semWiseOrder(this.mainList[i]);
                    }
                    this.singleStudent = this.mainList[0]
                    this.deptName = this.mainList[0][0].group_name
                    this.deptCode = this.mainList[0][0].group_code
                    this.org_logo = this.mainList[0][0].org_logo
                    this.org_name = this.mainList[0][0].org_name
                  }
              }
              }else{
                  this.examRegisteredStudents = result.data.result[0];
                  if(this.examRegisteredStudents && this.examRegisteredStudents.length > 0){
                    for(let i = 0;i < this.examRegisteredStudents.length;i++){
                        this.subjects.push({
                        'subject_code' : this.examRegisteredStudents[i]?.subject_code
                        })
                    }
                  if(this.subjects && this.subjects.length > 0){
                    const subjectcode = this.subjects.map(({ subject_code }) => subject_code);
                    this.subjectCodes = this.subjects.filter(({ subject_code }, index) =>
                    !subjectcode.includes(subject_code, index + 1));
                  }
                  this.mainList=[];
                  this.newList=[];
                  const students = this.examRegisteredStudents.map(({ hallticket_number }) => hallticket_number);
                  this.studentsList = this.examRegisteredStudents.filter(({ hallticket_number }, index) =>
                    !students.includes(hallticket_number, index + 1));
                    for(let i=0;i<this.studentsList.length;i++){
                    this.newList=[];
                      for(let j=0;j<this.examRegisteredStudents.length;j++){
                            if(this.studentsList[i].hallticket_number===this.examRegisteredStudents[j].hallticket_number){
                                      this.newList.push(this.examRegisteredStudents[j])
                            }
                      }
                    this.mainList.push(this.newList);
                    }
            }
              }
              // this.snotifyService.success(result.message, 'Success!');
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
  semWiseOrder(array: any): any {
    const grouped = array.reduce((acc, { hallticket_number, sname, student_name, father_name, mother_name, group_code, course_code, order_no, sem_no, subject_code, subject_name, subject_max_marks, sub_pass_marks, internal_max_marks, internal_marks, external_max_marks, external_pass_marks, moderation_marks, grace_marks, external_marks,
      external_marks_secured, subject_total, oldmarks, oldres, oldexamyear, grade, credits, is_pass, subject_result, total_internal_marks,
      total_external_marks, total_credits, total_pass_subjects, total_fail_subjects, grade_points, credit_points, sgpa, cgpa, final_sem_result, final_sem_status, final_sem_total_marks, exam_month_year }) => {
      if (!acc[sem_no]) {
        acc[sem_no] = [];
      }
      acc[sem_no].push({
        hallticket_number, sname, student_name, father_name, mother_name, group_code, course_code, order_no, sem_no, subject_code, subject_name, subject_max_marks, sub_pass_marks, internal_max_marks, internal_marks, external_max_marks, external_pass_marks, moderation_marks, grace_marks, external_marks,
        external_marks_secured, subject_total, oldmarks, oldres, oldexamyear, grade, credits, is_pass, subject_result, total_internal_marks,
        total_external_marks, total_credits, total_pass_subjects, total_fail_subjects, grade_points, credit_points, sgpa, cgpa, final_sem_result, final_sem_status, final_sem_total_marks, exam_month_year
      });
      return acc;
    }, {});

    return Object.values(grouped);
  }
  selectedData() {
    if (this.collegeCode) {
      this.dataDetails = this.collegeCode;
    }
    if (this.courseCode) {
      this.dataDetails = this.dataDetails + ' / ' + this.courseCode;
    }
    if (this.courseGroupCode) {
      this.dataDetails = this.dataDetails + ' / ' + this.courseGroupCode;
    }
    if (this.courseYearCode) {
      this.dataDetails = this.dataDetails + ' / ' + this.courseYearCode;
    }
    if (this.exam) {
      this.dataDetails = this.dataDetails + ' / ' + this.exam;
    }
  }
  numToWords(num: any): any {
    var a = ['', 'one ', 'two ', 'three ', 'four ', 'five ', 'six ', 'seven ', 'eight ', 'nine ', 'ten ', 'eleven ', 'twelve ', 'thirteen ', 'fourteen ', 'fifteen ', 'sixteen ', 'seventeen ', 'eighteen ', 'nineteen '];
    var b = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];

    if ((num = num.toString()).length > 9) return 'overflow';
    let n: any = ('000000000' + num).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
    if (!n) return; var str = '';
    str += (n[1] != 0) ? (a[Number(n[1])] || b[n[1][0]] + ' ' + a[n[1][1]]) + 'crore ' : '';
    str += (n[2] != 0) ? (a[Number(n[2])] || b[n[2][0]] + ' ' + a[n[2][1]]) + 'lakh ' : '';
    str += (n[3] != 0) ? (a[Number(n[3])] || b[n[3][0]] + ' ' + a[n[3][1]]) + 'thousand ' : '';
    str += (n[4] != 0) ? (a[Number(n[4])] || b[n[4][0]] + ' ' + a[n[4][1]]) + 'hundred ' : '';
    str += (n[5] != 0) ? ((str != '') ? 'and ' : '') + (a[Number(n[5])] || b[n[5][0]] + ' ' + a[n[5][1]]) : '';
    return str;
  }


  ngAfterViewInit() {
    window.addEventListener('beforeprint', this.beforePrintHandler);
    window.addEventListener('afterprint', this.afterPrintHandler);
  }

  ngOnDestroy() {
    window.removeEventListener('beforeprint', this.beforePrintHandler);
    window.removeEventListener('afterprint', this.afterPrintHandler);
  }

  beforePrintHandler = () => {
    this.addPageNumbers();
  }

  afterPrintHandler = () => {
    // Optionally clean up page numbers if necessary
  }


  Print() {
    this.isPrintMode = true;
    setTimeout(() => {
      window.print();
      this.isPrintMode = false;
    }, 500);
  }

  formattedGradePoints(grade_points): string {
    return parseFloat(grade_points).toFixed(0);  // Converts to integer format
  }

  addPageNumbers() {
    const content = document.getElementById('print-content');
    if (!content) return;

    // Get the height of the content
    const contentHeight = content.scrollHeight;
    const pageHeight = window.innerHeight - 150; // Adjust for header and footer height

    const totalPages = Math.ceil(contentHeight / pageHeight);

    const pageNumbers = document.querySelectorAll('.page-number');
    const totalPageSpans = document.querySelectorAll('.total-pages');

    pageNumbers.forEach((span, index) => {
      span.textContent = (index + 1).toString();
    });

    totalPageSpans.forEach(span => {
      span.textContent = totalPages.toString();
    });

    // Force reflow to ensure styles are applied
    window.getComputedStyle(document.body).height;
  }
  exportAsExcel() {
    const uri = 'data:application/vnd.ms-excel;base64,';
    const template = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40"><head><!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>{worksheet}</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]--></head><body><table>{table}</table></body></html>`;
    const base64 = function (s) { return window.btoa(unescape(encodeURIComponent(s))) };
    const format = function (s, c) { return s.replace(/{(\w+)}/g, function (m, p) { return c[p]; }) };

    const table = this.excelTable.nativeElement;
    const ctx = { worksheet: 'Worksheet', table: table.innerHTML };

    const link = document.createElement('a');
    link.download = `${this.trafoItem}.xls`;
    link.href = uri + base64(format(template, ctx));
    link.click();
  }
findMarks(subjectList: any[], subjectCode: string, markType: string): string | number {
    const subject = subjectList.find(item => item.subject_code === subjectCode);
    return subject ? subject[markType] : ' ';
  }
}
