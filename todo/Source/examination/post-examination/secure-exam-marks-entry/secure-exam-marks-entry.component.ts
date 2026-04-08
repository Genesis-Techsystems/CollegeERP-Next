import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormControl } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { CONSTANTS } from 'app/main/common/constants';
import { GenericFunctions } from 'app/main/common/generic-functions';
import { AcademicYear } from 'app/main/models/academicYear';
import { College } from 'app/main/models/college';
import { Course } from 'app/main/models/course';
import { CourseGroup } from 'app/main/models/courseGroup';
import { CrudService } from 'app/main/services/crud.service';
import { SnotifyService } from 'ng-snotify';
import { NgxSpinnerService } from 'ngx-spinner';
import { ReplaySubject, Subject } from 'rxjs';
// import { MarksEditModalComponent } from './marks-edit-modal/marks-edit-modal.component';
import { MatDialog } from '@angular/material/dialog';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { Section } from 'app/main/models/section';
import * as _ from 'lodash';
import { GlobalService } from 'app/main/services/global.service';
import { EvterSecureCodeComponent } from './evter-secure-code/evter-secure-code.component';


@Component({
  selector: 'app-secure-exam-marks-entry',
  templateUrl: './secure-exam-marks-entry.component.html',
  styleUrls: ['./secure-exam-marks-entry.component.scss']
})
export class SecureExamMarksEntryComponent implements OnInit {

  displayedColumns: string[] = ['id', 'campusCode', 'campusName', 'orgCode', 'districtName'];
  dataSource: MatTableDataSource<any>;

  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild(MatSort) sort: MatSort;
  @ViewChild('uploadXl') uploadXl: ElementRef;

  private examFiltersByCodeUrl = CONSTANTS.examFiltersByCodeUrl;
  private collegewisedetailsUrl = CONSTANTS.collegewisedetailsUrl;
  private staffSubjectsUrl = CONSTANTS.staffSubjectsUrl;
  private employeeDetailUrl = CONSTANTS.employeeDetailUrl
  private collegeCrudUrl = CONSTANTS.collegeCrudUrl;
  private generateSecretCodeForMarksEntryUrl = CONSTANTS.generateSecretCodeForMarksEntryUrl;
  private validateSecretCodeForMarksEntryUrl = CONSTANTS.validateSecretCodeForMarksEntryUrl;
  private getDetailsByCourseIdUrl = CONSTANTS.getDetailsByCourseIdUrl;
  private getDetailsByRegulationIdUrl = CONSTANTS.getDetailsByRegulationIdUrl;
  private employeeSearchUrl = CONSTANTS.employeeSearchUrl;
  private isActive = CONSTANTS.isActive;
  private examStudentInternalMarksUrl = CONSTANTS.examStudentInternalMarksUrl;
  private examStudentInternalMarkCrudUrl = CONSTANTS.examStudentInternalMarkCrudUrl;
  private examMarksSetupUrl = CONSTANTS.examMarksSetupUrl;
  private exammarksdownloadUrl = CONSTANTS.exammarksdownloadUrl;
  private endURL = CONSTANTS.MAINAPI;
  private uploadexammarksUrl = CONSTANTS.uploadexammarksUrl;
  private OFFLINEEVALUATION = CONSTANTS.OFFLINEEVALUATION;
  private groupYrRegulationUrl = CONSTANTS.groupYrRegulationUrl;
  private getExamMarkDetailsUrl = CONSTANTS.getExamMarkDetailsUrl;
  private THEORY = CONSTANTS.THEORY;
  private ELECTIVE = CONSTANTS.ELECTIVE;

  public formData;
  public employeeFilterCtrl: FormControl = new FormControl();
  public filteredEmployees: ReplaySubject<any[]> = new ReplaySubject<any[]>(1);
  private _onDestroy = new Subject<void>();

  filtersDetailsList = [];
  CollegesListDetails = [];
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
  searchText = '';
  duplicateexamStudentList = [];
  examMarkSetups: any[] = [];
  examMarks = [];
  examData = [];
  examDate = this.genericFunctions.momentWithDateFormatYMD(this.genericFunctions.moment());
  SemisterList = [
    { id: 'ISEM', value: 'FIRST' },
    { id: 'IISEM', value: 'SECOND' },
    { id: 'IIISEM', value: 'THIRD' },
    { id: 'IVSEM', value: 'FOURTH' },
    { id: 'VSEM', value: 'FIFTH' },
    { id: 'VISEM', value: 'SIXTH' },
    { id: 'VIISEM', value: 'SEVENTH' },
    { id: 'VIIISEM', value: 'EIGHTH' },

  ];
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
  staff = false;
  admin = false;
  userroles = [];
  semister = false;
  minvalue: number
  maxValue: number
  saveButton: boolean = false;
  userId: number;
  UserRole: string;
  ap: boolean;
  ApproveButton: boolean = false;
  labbatchsSubjects: any[];
  labbatchs: any[];
  labBatch: boolean;
  totalPresents: number;
  totalAbsents: number;
  internalEvaluatorName = [];
  externalEvaluatorName = [];
  examTimetableSubject: any[];
  orgCode;
  examFiltersData = [];
  examListDetails = [];
  collegeFilterDetails = [];
  subjectListDetails = [];
  regulationsList = [];
  regulations = [];


  constructor(private formBuilder: FormBuilder, private snotifyService: SnotifyService,
    private crudService: CrudService, private spinner: NgxSpinnerService, private router: Router,
    private dialog: MatDialog, private genericFunctions: GenericFunctions, private route: ActivatedRoute, private _globalService: GlobalService) {
    if (this.genericFunctions.getSecuredValue('userDetails') !== null && this.genericFunctions.getSecuredValue('userDetails') !== '') {
      this.loginUser = JSON.parse(this.genericFunctions.getSecuredValue('userDetails'));
      this.userroles = this.loginUser.userRoles
    }
    for (let i = 0; i < this.loginUser.userRoles.length; i++) {
      if (this.loginUser.userRoles[i]?.roleName == this.OFFLINEEVALUATION || this.loginUser.userRoles[i]?.roleName == 'ExamController'
         || this.loginUser.userRoles[i]?.roleName == 'ADMIN' || this.loginUser.userRoles[i]?.roleName == 'EXTERNAL EVALUATOR'
         || this.loginUser.userRoles[i]?.roleName == 'Offline External Evaluator') {
            this.semister = true
      }
      if (this.loginUser.userRoles[i].roleName == "MSTAFF" || this.loginUser.userRoles[i].roleName == "STAFF" || this.loginUser.userRoles[i].roleName == "EXTERNAL EVALUATOR") {
        this.staff = true
      }
    }
  }

  ngOnInit(): void {
    this.roleName = localStorage.getItem('roleName')
    this.UserRole = localStorage.getItem('userRole')
    this.orgCode = localStorage.getItem('orgCode')
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
      regulationId: ['', Validators.required],
      fDate: [this.genericFunctions.moment()],
      labBatchId: [0]
    });

    this.dataSource = new MatTableDataSource(this.examSubjestList);
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;

    this.searchEmployees.push({ firstName: 'Search by Employee name or Id.' });
    this.filteredEmployees.next(this.searchEmployees.slice());
    // this.getEmloyees();
    if (this.staff == true) {
      this.empNumber = localStorage.getItem('empNumber')
      this.userName = localStorage.getItem('userName')
      this.empId = +localStorage.getItem('employeeId')
      this.examFeeCollectionForm.get('employeeId').setValue(this.empId)

    }
    this.getExamFiltersList();
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
  getExamFiltersList(): void {
    this.spinner.show();
    let request = [
      { paramName: 'in_flag', paramValue: 'univ_exam_inep_filters' },
      { paramName: 'in_flag_type', paramValue: 'OFF_EXT_EVAL' },
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
      { paramName: 'in_param2', paramValue: 'REGSUP' },
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
              if (list?.length > 0 && list[0].flag === 'univ_exam_inep_filters') {
                this.examListDetails = list;
                break;
              }
            }
            if (this.examListDetails && this.examListDetails.length > 0) {
              const courseList = this.examListDetails.map(({ fk_course_id }) => fk_course_id);
              this.courses = this.examListDetails.filter(({ fk_course_id }, index) =>
                !courseList.includes(fk_course_id, index + 1));
              if (this.courses && this.courses.length > 0) {
                this.examFeeCollectionForm.get('courseId').setValue(this.courses[0].fk_course_id);
                this.selectedCourse(this.examFeeCollectionForm.value.courseId)
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
  selectedCourse(courseId) {
    this.examFeeCollectionForm.get('academicYearId').setValue('');
    this.examFeeCollectionForm.get('examId').setValue('');
    this.examFeeCollectionForm.get('collegeId').setValue('');
    this.examFeeCollectionForm.get('courseGroupId').setValue('');
    this.examFeeCollectionForm.get('courseYearId').setValue('');
    this.examFeeCollectionForm.get('regulationId').setValue('');
    this.examFeeCollectionForm.get('subjectTypeId').setValue('');
    this.examFeeCollectionForm.get('subjectId').setValue('');
    this.examFeeCollectionForm.get('collegeId').setValue('');
    this.collegeFilterDetails = [];
    this.CollegesListDetails = [];
    this.colleges = [];
    this.examsList = [];
    this.courseYears = [];
    this.courseGroups = [];
    this.academicYears = [];
    this.subjectListDetails = [];
    this.examTimetableSubjectsList = [];
    this.academicYearsList = [];
    this.regulationsList = [];
    this.regulations = [];
    /*----------- ACADEMIC YEARS -----------*/
    if (courseId != null && courseId !== undefined) {
      this.course = this.courses.filter(x => (x.fk_course_id === courseId))[0].course_code;
      this.academicYearsList = this.examListDetails.filter(x => (x.fk_course_id === this.examFeeCollectionForm.value.courseId))
      if (this.academicYearsList.length > 0) {
        const academicYears = this.academicYearsList.map(({ fk_academic_year_id }) => fk_academic_year_id);
        this.academicYears = this.academicYearsList.filter(({ fk_academic_year_id }, index) => !academicYears.includes(fk_academic_year_id, index + 1));
      }
      if (this.academicYears && this.academicYears.length > 0) {
        const currentAY = this.academicYears?.sort((a, b) => (b.is_curr_ay ?? 0) - (a.is_curr_ay ?? 0))[0];
        if (currentAY?.fk_academic_year_id) {
        this.examFeeCollectionForm.get('academicYearId')?.setValue(currentAY.fk_academic_year_id);
        }
        this.academicYears = this.academicYears.sort((a,b)=>parseInt(b?.academic_year) - parseInt(a?.academic_year));
        // this.academicYears = this.academicYears.sort((a,b)=>parseInt(b.academic_year)-parseInt(a.academic_year))
        // this.examFeeCollectionForm.get('academicYearId').setValue(this.academicYears[0].fk_academic_year_id);
        this.selectedAcademicYear(this.examFeeCollectionForm.value.academicYearId)
      }
    }
  }
  selectedAcademicYear(academicYearId): void {
    this.examFeeCollectionForm.get('courseGroupId').setValue('');
    this.examFeeCollectionForm.get('courseYearId').setValue('');
    this.examFeeCollectionForm.get('regulationId').setValue('');
    this.examFeeCollectionForm.get('examId').setValue('');
    this.examFeeCollectionForm.get('subjectTypeId').setValue('');
    this.examFeeCollectionForm.get('subjectId').setValue('');
    this.examFeeCollectionForm.get('collegeId').setValue('');
    this.collegeFilterDetails = [];
    this.CollegesListDetails = [];
    this.colleges = [];
    this.subjectListDetails = [];
    this.examsList = [];
    this.courseYears = [];
    this.courseGroups = [];
    this.examTimetableSubjectsList = [];
    this.examsLists = [];
    this.regulationsList = [];
    this.regulations = [];
    if (academicYearId !== null && academicYearId !== undefined) {
      this.academicYear = this.academicYears.filter(x => (x.fk_academic_year_id === academicYearId))[0].academic_year;
      /*----------- Exams List -----------*/
      // tslint:disable-next-line:max-line-length
      this.examsLists = this.examListDetails.filter(x => (x.fk_course_id === this.examFeeCollectionForm.value.courseId && x.fk_academic_year_id === this.examFeeCollectionForm.value.academicYearId))
      if (this.examsLists.length > 0) {
        const examsLists = this.examsLists.map(({ fk_exam_id }) => fk_exam_id);
        this.examsList = this.examsLists.filter(({ fk_exam_id }, index) => !examsLists.includes(fk_exam_id, index + 1));
      }
      if (this.roleName == 'ADMIN') {
        this.examData = this.examsList;
      }
      else {
        this.examsList = this.examsList.filter(x => (x.is_published === false))
        this.examData = this.examsList;

      }
      if (this.examsList.length > 0) {
        this.examFeeCollectionForm.get('examId').setValue(this.examsList[0]?.fk_exam_id);
        this.selectedExam(this.examFeeCollectionForm.value.examId)
      }
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
  selectedExam(examId): void {
    this.examFeeCollectionForm.get('courseGroupId').setValue('');
    this.examFeeCollectionForm.get('courseYearId').setValue('');
    this.examFeeCollectionForm.get('subjectTypeId').setValue('');
    this.examFeeCollectionForm.get('subjectId').setValue('');
    this.courseGroups = [];
    this.courseYears = [];
    this.subjectTypes = []
    this.groupList = []
    this.examTimetableSubjectsList = [];
    this.minDate = this.genericFunctions.momentWithDateFormatYMD(this.examsList.filter(x => (x.fk_exam_id === examId))[0].from_date);
    this.examFeeCollectionForm.get('examDate').setValue(this.minDate);
    this.maxDate = this.genericFunctions.momentWithDateFormatYMD(this.examsList.filter(x => (x.fk_exam_id === examId))[0].to_date);
    this.isInternalExam = false;
    if (this.examsList.filter(x => (x.fk_exam_id === examId)).length > 0) {
      if (this.examsList.filter(x => (x.fk_exam_id === examId))[0].is_internal_exam) {
        this.isInternalExam = true;
      }
    }
    /*----------- COURSES GROUPS -----------*/
    if (examId != null && examId !== undefined) {
      this.exam = this.examsList.filter(x => (x.fk_exam_id === this.examFeeCollectionForm.value.examId))[0].exam_name +
        '( ' + this.genericFunctions.momentWithDateFormatYMD(this.examsList.filter(x => (x.fk_exam_id === this.examFeeCollectionForm.value.examId))[0].from_date) + ' - ' +
        this.genericFunctions.momentWithDateFormatYMD(this.examsList.filter(x => (x.fk_exam_id === this.examFeeCollectionForm.value.examId))[0].to_date)
        + ')';
      let request = [
        { paramName: 'in_flag', paramValue: 'univ_exam_rest_inep_uc' },
        { paramName: 'in_flag_type', paramValue: 'OFF_EXT_EVAL' },
        { paramName: 'in_university_id', paramValue: 0 },
        { paramName: 'in_univ_examcenter_id', paramValue: 0 },
        { paramName: 'in_college_id', paramValue: 0 },
        { paramName: 'in_course_id', paramValue: this.examFeeCollectionForm.value.courseId },
        { paramName: 'in_course_group_id', paramValue: 0 },
        { paramName: 'in_course_year_id', paramValue: 0 },
        { paramName: 'in_exam_id', paramValue: this.examFeeCollectionForm.value.examId },
        { paramName: 'in_academic_year_id', paramValue: this.examFeeCollectionForm.value.academicYearId },
        { paramName: 'in_regulation_id', paramValue: 0 },
        { paramName: 'in_subject_id', paramValue: 0 },
        { paramName: 'in_sub_flag_type', paramValue: '' },
        { paramName: 'in_param1', paramValue: 0 },
        { paramName: 'in_param2', paramValue: 'REGSUP' },
        { paramName: 'in_loginuser_roleid', paramValue: 0 },
        { paramName: 'in_loginuser_empid', paramValue: +localStorage.getItem('employeeId') },
      ];
      this.crudService.getDetailsByRequest(this.examFiltersByCodeUrl, '', request, '&')
        .subscribe(result => {
          this.spinner.hide();
          if (result.statusCode === 200) {
            if (result.data && result.data !== '' && result.data.result.length > 0) {
              this.collegeFilterDetails = result.data.result;
              for (const list of this.collegeFilterDetails) {
                if (Array.isArray(list) && list.length > 0) {
                  if (list[0].flag === 'univ_exam_rest_filters') {
                    this.CollegesListDetails = list;
                  } else if (list[0].flag === 'regulations') {
                    this.regulationsList = list;
                  }
                }
              }
              const CollegeIdData = this.CollegesListDetails.map(({ fk_college_id }) => fk_college_id);
              this.colleges = this.CollegesListDetails.filter(({ fk_college_id }, index) =>
                !CollegeIdData.includes(fk_college_id, index + 1));
              if (this.colleges && this.colleges.length > 0) {
                this.colleges = this.colleges.sort((a, b) => a.clg_sort_order - b.clg_sort_order);
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
  }
  selectedCollege(collegeId): void {
    this.examFeeCollectionForm.get('courseGroupId').setValue('');
    this.examFeeCollectionForm.get('courseYearId').setValue('');
    this.examFeeCollectionForm.get('subjectTypeId').setValue('');
    this.examFeeCollectionForm.get('subjectId').setValue('');
    this.collegeFilterDetails = [];
    this.subjectListDetails = [];
    this.courseGroups = [];
    this.courseYears = [];
    this.subjectTypes = [];
    this.groupList = [];
    this.regulations = [];
    this.examTimetableSubjectsList = [];
    this.groupList = this.CollegesListDetails.filter(x => (x.fk_college_id === this.examFeeCollectionForm.value.collegeId))
    if (this.groupList.length > 0) {
      const groupList = this.groupList.map(({ fk_course_group_id }) => fk_course_group_id);
      this.courseGroups = this.groupList.filter(({ fk_course_group_id }, index) => !groupList.includes(fk_course_group_id, index + 1));
    }
    if (this.courseGroups.length > 0) {
      this.examFeeCollectionForm.get('courseGroupId').setValue(this.courseGroups[0].fk_course_group_id);
      this.selectedCourseGroup(this.examFeeCollectionForm.value.courseGroupId)
    }
  }

  selectedCourseGroup(courseGroupId): void {
    this.subjectListDetails = [];
    this.courseYears = [];
    this.sections = [];
    this.subjectTypes = []
    this.examTimetableSubjectsList = [];
    this.courseYearsList = [];
    this.regulations = [];
    this.examFeeCollectionForm.get('courseYearId').setValue('');
    this.examFeeCollectionForm.get('groupSectionId').setValue('');
    this.examFeeCollectionForm.get('subjectTypeId').setValue('');
    this.examFeeCollectionForm.get('subjectId').setValue('');
    if (this.examFeeCollectionForm.value.courseGroupId != null && courseGroupId != null) {
      this.courseGroup = this.courseGroups.filter(x => (x.fk_course_group_id === courseGroupId))[0].group_code;
      /*----------- COURSES Years -----------*/
      this.courseYearsList = this.CollegesListDetails.filter(x => (x.fk_college_id === this.examFeeCollectionForm.value.collegeId && x.fk_course_group_id === this.examFeeCollectionForm.value.courseGroupId))
      if (this.courseYearsList.length > 0) {
        const courseYearsList = this.courseYearsList.map(({ fk_course_year_id }) => fk_course_year_id);
        this.courseYears = this.courseYearsList.filter(({ fk_course_year_id }, index) => !courseYearsList.includes(fk_course_year_id, index + 1));
      }
      if (this.courseYears.length > 0) {
        this.examFeeCollectionForm.get('courseYearId').setValue(this.courseYears[0].fk_course_year_id);
        this.selectedYear(this.examFeeCollectionForm.value.courseYearId)
      }
    }
  }
  selectedYear(courseYearId): void {
    this.subjectListDetails = [];
    this.regulations = [];
    this.sections = [];
    this.subjectTypeList = []
    this.subjectTypes = []
    this.examTimetableSubjectsList = [];
    this.examTimetableSubject = []
    this.examFeeCollectionForm.get('groupSectionId').setValue('');
    this.examFeeCollectionForm.get('subjectTypeId').setValue('');
    this.examFeeCollectionForm.get('subjectId').setValue('');
    this.courseyear = this.courseYears.filter(x => (x.fk_course_year_id === courseYearId))[0].course_year_code;
    if (this.regulationsList && this.regulationsList.length > 0) {
      const regulationsList = this.regulationsList.map(({ fk_regulation_id }) => fk_regulation_id);
      this.regulations = this.regulationsList.filter(({ fk_regulation_id }, index) => !regulationsList.includes(fk_regulation_id, index + 1));
    }
    if (this.regulations && this.regulations.length > 0) {
      this.examFeeCollectionForm.get('regulationId').setValue(this.regulations[0].fk_regulation_id);
      this.selectedRegulation(this.examFeeCollectionForm.value.regulationId);
    }
  }
  selectedRegulation(regulationId) {
    this.subjectListDetails = [];
    this.sections = [];
    this.subjectTypes = []
    this.examTimetableSubjectsList = [];
    this.courseYearsList = [];
    this.examFeeCollectionForm.get('groupSectionId').setValue('');
    this.examFeeCollectionForm.get('subjectTypeId').setValue('');
    this.examFeeCollectionForm.get('subjectId').setValue('');
    if (this.examFeeCollectionForm.value.regulationId != null && regulationId != null) {
      /*----------- SUBJECTS -----------*/
      let request = [
        { paramName: 'in_flag', paramValue: 'univ_exam_subject_regexamstd' },
        { paramName: 'in_flag_type', paramValue: 'REGSUP' },
        { paramName: 'in_university_id', paramValue: 0 },
        { paramName: 'in_univ_examcenter_id', paramValue: 0 },
        { paramName: 'in_college_id', paramValue: this.examFeeCollectionForm.value.collegeId },
        { paramName: 'in_course_id', paramValue: this.examFeeCollectionForm.value.courseId },
        { paramName: 'in_course_group_id', paramValue: this.examFeeCollectionForm.value.courseGroupId },
        { paramName: 'in_course_year_id', paramValue: this.examFeeCollectionForm.value.courseYearId },
        { paramName: 'in_exam_id', paramValue: this.examFeeCollectionForm.value.examId },
        { paramName: 'in_academic_year_id', paramValue: this.examFeeCollectionForm.value.academicYearId },
        { paramName: 'in_regulation_id', paramValue: this.examFeeCollectionForm.value.regulationId },
        { paramName: 'in_sub_flag_type', paramValue: 'ALL' },
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
                  this.subjectTypeList = list;
                  break; 
                }
              }
              console.log(this.subjectTypeList,"subjectTypeList");
              if (this.subjectTypeList && this.subjectTypeList.length > 0) {
                const subjectTypeList = this.subjectTypeList.map(({ fk_subjecttype_catdet_id }) => fk_subjecttype_catdet_id);
                this.subjectTypes = this.subjectTypeList.filter(({ fk_subjecttype_catdet_id }, index) =>
                  !subjectTypeList.includes(fk_subjecttype_catdet_id, index + 1));
              }
              console.log(this.subjectTypes,"this.subjectTypes");
              if (this.semister === false) {
                  this.subjectTypes = this.subjectTypes.filter(x => x.fk_subjecttype_catdet_id != this.ELECTIVE && x.fk_subjecttype_catdet_id != this.THEORY);
              }
              if (this.subjectTypes && this.subjectTypes.length > 0) {
                this.examFeeCollectionForm.get('subjectTypeId').setValue(this.subjectTypes[0].fk_subjecttype_catdet_id);
                this.selectedSubjectType(this.examFeeCollectionForm.value.subjectTypeId)
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
  selectedSubjectType(subjectTypeId): void {
    this.examFeeCollectionForm.get('subjectId').setValue('');
    this.examTimetableSubjectsList = [];
    this.examTimetableSubjects = []
    if (subjectTypeId !== null) {
      this.examTimetableSubjects = this.subjectTypeList.filter(x => (x.fk_subjecttype_catdet_id === this.examFeeCollectionForm.value.subjectTypeId))
      if (this.examTimetableSubjects && this.examTimetableSubjects.length > 0) {
        const examTimetableSubjects = this.examTimetableSubjects.map(({ fk_subject_id }) => fk_subject_id);
        this.examTimetableSubjectsList = this.examTimetableSubjects.filter(({ fk_subject_id }, index) => !examTimetableSubjects.includes(fk_subject_id, index + 1));
      }
      if (subjectTypeId !== 0) {
        this.examTimetableSubjectsList = this.examTimetableSubjectsList.filter(x => (x.fk_subjecttype_catdet_id === subjectTypeId));
      }
      else if (subjectTypeId === 0) {
        this.examTimetableSubjectsList = this.examTimetableSubjectsList
      }
      this.examTimetableSubject = this.examTimetableSubjectsList
      this.getMarksSetup(this.examTimetableSubjectsList);
    }
  }
  getMarksSetup(data): void {
    if (data.length > 0) {
      this.crudService.getGroupSubjectsByRegulation(this.groupYrRegulationUrl, this.examFeeCollectionForm.value.collegeId,
        this.examFeeCollectionForm.value.courseGroupId, this.examFeeCollectionForm.value.courseYearId, this.examFeeCollectionForm.value.regulationId)
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
      this.crudService.listDetailsByThreeIds(this.examMarksSetupUrl, this.examFeeCollectionForm.value.courseId, this.examFeeCollectionForm.value.regulationId, 'true',
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
  searchsubject(value) {
    this.examTimetableSubject = [];
    this.searchSubject(value);
  }
  searchSubject(value: string) {
    let filter = value.toLowerCase()
    for (let i = 0; i < this.examTimetableSubjectsList.length; i++) {
      let option = this.examTimetableSubjectsList[i];
      if (option.subject_name.toLowerCase().indexOf(filter) >= 0) {
        this.examTimetableSubject.push(option);
      }
    }
  }
  getStudentsList(list) {
    this.spinner.show();
    this.examStudentsList = []
    this.ApproveButton = false
    if (this.examFeeCollectionForm.value.subjectId !== null) {
      this.subjectDetails = '';
      // const dateConvert = this.genericFunctions.momentFormatYMD(this.examFeeCollectionForm.value.examDate);
      const dateConvert = this.genericFunctions.momentFormatYMD1(this.examFeeCollectionForm.value.examDate);

      this.subjectDetails = this.examTimetableSubjectsList.filter(x => (x.fk_subject_id === this.examFeeCollectionForm.value.subjectId))[0].subject_name + ' (' +
        this.regulations.filter(x => (x.fk_regulation_id === this.examFeeCollectionForm.value.regulationId))[0].regulation_code + ')';

      if (this.examTimetableSubjectsList.filter(x => (x.fk_subject_id === this.examFeeCollectionForm.value.subjectId)).length > 0) {
        this.examTypeId = this.examTimetableSubjectsList.filter(x => (x.fk_subject_id === this.examFeeCollectionForm.value.subjectId))[0].fk_examtype_catdet_id;
        // tslint:disable-next-line: max-line-length
        this.regulationId = this.examFeeCollectionForm.value.regulationId;
        this.subjectTypeId = this.examTimetableSubjectsList.filter(x => (x.fk_subject_id === this.examFeeCollectionForm.value.subjectId))[0].fk_subjecttype_catdet_id;
        this.subjectTypCode = this.examTimetableSubjectsList.filter(x => (x.fk_subject_id === this.examFeeCollectionForm.value.subjectId))[0].subject_type;
        this.examTypeCatCode = this.examTimetableSubjectsList.filter(x => (x.fk_subject_id === this.examFeeCollectionForm.value.subjectId))[0].ttd_exam_type;
      }
      // /----------- EXAM TIMETABLES -----------/
      let request = [
        { paramName: 'in_flag', paramValue: 'marks_entry' },
        // {paramName: 'in_org_id', paramValue:+localStorage.getItem('organizationId')},
        { paramName: 'in_college_id', paramValue: this.examFeeCollectionForm.value.collegeId },
        { paramName: 'in_course_id', paramValue: this.examFeeCollectionForm.value.courseId },
        { paramName: 'in_exam_id', paramValue: this.examFeeCollectionForm.value.examId },
        { paramName: 'in_course_group_id', paramValue: this.examFeeCollectionForm.value.courseGroupId },
        { paramName: 'in_course_year_id', paramValue: this.examFeeCollectionForm.value.courseYearId },
        { paramName: 'in_regulation_id', paramValue: this.examFeeCollectionForm.value.regulationId },
        { paramName: 'in_subject_id', paramValue: this.examFeeCollectionForm.value.subjectId },
        { paramName: 'in_eaxm_labbatch_id', paramValue: this.examFeeCollectionForm.value.labBatchId },
        { paramName: 'is_extenalperson_approve', paramValue: 0 },
        { paramName: 'in_exam_date', paramValue: dateConvert },

      ];
      this.crudService.getDetailsByRequest(this.getExamMarkDetailsUrl, '', request, '&')
        .subscribe(result => {
          this.spinner.hide();
          if (result.statusCode === 200) {
            if (result.data && result.data !== '' && result.data.result.length > 0) {
              this.examStudentsList = [...new Map(result.data.result[0].map(item =>
                [item['hallticketNumber'], item])).values()]
              this.externalEvaluatorName = result.data.result[1]
              this.internalEvaluatorName = result.data.result[2]
              let presents = this.examStudentsList.filter(detail => detail.isPresent === true);
              let absents = this.examStudentsList.filter(detail => detail.isPresent !== true);
              this.totalPresents = presents.length;
              this.totalAbsents = absents.length;
              //  this.examStudentsList = result.data;
              // tslint:disable-next-line: prefer-for-of
              for (let i = 0; i < this.examStudentsList.length; i++) {
                if (this.examStudentsList[i].marks === null) {
                  this.examStudentsList[i].marks = 0;
                }
                if (this.examStudentsList[i].isMarksPublished === null) {
                  this.examStudentsList[i].isMarksPublished = false;
                }
                if (this.examStudentsList[i].isPresent === false) {
                  this.examStudentsList[i].isPass = false;
                }
                this.enteredMarks(this.examStudentsList[i]);
              }

              if (this.examsList.filter(x => (x.fk_exam_id === this.examFeeCollectionForm.value.examId)).length > 0) {
                if (this.examsList.filter(x => (x.fk_exam_id === this.examFeeCollectionForm.value.examId))[0].is_internal_exam) {
                  this.crudService.listDetailsByThreeIds(this.examStudentInternalMarkCrudUrl, this.examFeeCollectionForm.value.collegeId,
                    this.examFeeCollectionForm.value.examId,
                    this.examFeeCollectionForm.value.subjectId,
                    'college.collegeId', 'examMaster.examId', 'subject.subjectId')
                    .subscribe(result1 => {
                      if (result1.statusCode === 200) {
                        if (result1.data.resultList && result1.data.resultList !== '' && result1.data.resultList.length > 0) {
                          // tslint:disable-next-line: prefer-for-of
                          for (let i = 0; i < result1.data.resultList.length; i++) {
                            if (this.examStudentsList.filter(x => (x.studentId === result1.data.resultList[i].studentId)).length > 0) {
                              // tslint:disable-next-line: max-line-length
                              this.examStudentsList.filter(x => (x.studentId === result1.data.resultList[i].studentId))[0].marks = result1.data.resultList[i].marks;
                              this.examStudentsList.filter(x => (x.studentId === result1.data.resultList[i].studentId))[0].extMarks = 0;
                              // tslint:disable-next-line: max-line-length
                              this.examStudentsList.filter(x => (x.studentId === result1.data.resultList[i].studentId))[0].examStdInternalMarkId = result1.data.resultList[i].examStdInternalMarkId;
                            }
                          }
                          // tslint:disable-next-line: prefer-for-of
                          for (let i = 0; i < list.length; i++) {
                            if (this.examStudentsList.filter(x => (x.studentId === list[i].studentId)).length > 0) {
                              this.examStudentsList.filter(x => (x.studentId === list[i].studentId))[0].isvalidate = list[i].isvalidate;
                              this.examStudentsList.filter(x => (x.studentId === list[i].studentId))[0].marks = list[i].marks;
                              this.examStudentsList.filter(x => (x.studentId === list[i].studentId))[0].reason = list[i].reason;
                              if (!list[i].isvalidate) {
                                this.examStudentsList.filter(x => (x.studentId === list[i].studentId))[0].color = '#ff7777';
                              } else {
                                this.examStudentsList.filter(x => (x.studentId === list[i].studentId))[0].color = null;
                              }
                            }
                          }
                        } else {
                          // tslint:disable-next-line: prefer-for-of
                          for (let i = 0; i < list.length; i++) {
                            if (this.examStudentsList.filter(x => (x.studentId === list[i].studentId)).length > 0) {
                              this.examStudentsList.filter(x => (x.studentId === list[i].studentId))[0].extMarks = 0;
                              this.examStudentsList.filter(x => (x.studentId === list[i].studentId))[0].marks = list[i].marks;
                              this.examStudentsList.filter(x => (x.studentId === list[i].studentId))[0].isvalidate = list[i].isvalidate;
                              this.examStudentsList.filter(x => (x.studentId === list[i].studentId))[0].reason = list[i].reason;
                              if (!list[i].isvalidate) {
                                this.examStudentsList.filter(x => (x.studentId === list[i].studentId))[0].color = '#ff7070';
                              } else {
                                this.examStudentsList.filter(x => (x.studentId === list[i].studentId))[0].color = null;
                              }
                            }
                          }
                          // this.snotifyService.success(result1.message, 'Success!');
                        }
                        this.duplicateexamStudentList = this.examStudentsList;
                      } else {
                        this.snotifyService.error(result1.message, 'Error!');
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
                this.duplicateexamStudentList = this.examStudentsList;
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
  selectedSubject(subjectId): void {
    this.examStudentsList = []
    this.duplicateexamStudentList = []
    this.labbatchsSubjects = []
    this.labbatchs = []
    this.examFeeCollectionForm.get('examDate').setValue(this.examTimetableSubjectsList.filter(x => (x.fk_subject_id === this.examFeeCollectionForm.value.subjectId))[0]?.exam_date);
    this.examDate = this.genericFunctions.momentWithDateFormatYMD(this.examFeeCollectionForm.value.examDate);
    if (this.examTimetableSubjectsList.filter(x => (x.fk_subject_id === this.examFeeCollectionForm.value.subjectId))[0].subject_type == 'LAB') {
      this.labBatch = true;
      this.examFeeCollectionForm.get('labBatchId').setValue(0);
      this.labbatchsSubjects = this.subjectTypeList.filter(x => (x.fk_subject_id == this.examFeeCollectionForm.value.subjectId))
      if (this.labbatchsSubjects.length > 0) {
        const labbatchs = this.labbatchsSubjects.map(({ fk_exam_labbatch_id }) => fk_exam_labbatch_id);
        this.labbatchs = this.labbatchsSubjects.filter(({ fk_exam_labbatch_id }, index) => !labbatchs.includes(fk_exam_labbatch_id, index + 1));
        if (this.labbatchs.length > 0) {
          // this.examFeeCollectionForm.get('labBatchId').setValue(this.labbatchs[0].fk_exam_labbatch_id);
        }
      }
    }
    else {
      this.examFeeCollectionForm.get('labBatchId').setValue(0);
      this.labBatch = false;
    }
  }
  selectedLab(batchid) {
  if (this.examFeeCollectionForm.value.labBatchId !== 0) {
    this.examFeeCollectionForm.get('examDate').setValue(this.labbatchs.filter(x => (x.fk_exam_labbatch_id === batchid))[0]?.exam_date);
  }
  }

  enteredEmployee(event): void {
    if (event.target.value.length > 4) {
      /*----------- EMPLOYEE -----------*/
      this.crudService.listByTwoIds(this.employeeSearchUrl, event.target.value, 'ACTV', 'q', 'empStatus')
        .subscribe(result => {
          if (result.statusCode === 200) {
            if (result.data && result.data !== '') {
              this.searchEmployees = result.data;
              this.filteredEmployees.next(this.searchEmployees.slice());
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
  selectedEmployee(marksEnteredEmpId): void {

  }
  download(): void {
    if (this.examFeeCollectionForm.valid) {
      /*---------- Print call  ----------*/
      const xhr = new XMLHttpRequest();
      // tslint:disable-next-line:max-line-length
      xhr.open('GET', this.endURL + this.exammarksdownloadUrl + '?collegeId=' + this.examFeeCollectionForm.value.collegeId + '&subjectId=' + this.examFeeCollectionForm.value.subjectId +
        // tslint:disable-next-line:max-line-length
        '&examId=' + this.examFeeCollectionForm.value.examId + '&courseGroupId=' + this.examFeeCollectionForm.value.courseGroupId + '&courseYearId=' + this.examFeeCollectionForm.value.courseYearId + '&examdate=' + this.genericFunctions.momentFormatYMD(this.examFeeCollectionForm.value.examDate), true);
      xhr.setRequestHeader('Authorization', 'Bearer ' + localStorage.getItem('token'));
      xhr.responseType = 'blob';
      // tslint:disable-next-line: only-arrow-functions
      xhr.onreadystatechange = function (): any {
        if (xhr.readyState === XMLHttpRequest.DONE) {

          const url = window.URL.createObjectURL(new Blob([xhr.response], { type: 'application/vnd.ms-excel' }));
          const a = document.createElement('a');
          a.href = url;
          a.download = 'Marks Sheet';
          a.click();
        }
      };
      xhr.send(null);
    }
  }

  uploadFile(): void {
    if (this.uploadXl.nativeElement.files.length > 0) {
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
      this.formData.append('subjectCategoryId', this.examTimetableSubjectsList.filter(x => (x.fk_subject_id === this.examFeeCollectionForm.value.subjectId))[0].fk_subjectcategory_catdet_id);
      // tslint:disable-next-line: max-line-length
      this.formData.append('subjectTypeId', this.examTimetableSubjectsList.filter(x => (x.fk_subject_id === this.examFeeCollectionForm.value.subjectId))[0].fk_subjecttype_catdet_id);
      this.spinner.show();
      /*-------- FILE UPLOAD ---------*/
      this.crudService.upload(this.uploadexammarksUrl, this.formData)
        .subscribe(result1 => {
          this.spinner.hide();
          if (result1.statusCode === 200) {
            if (result1.success) {
              this.snotifyService.success(result1.message, 'Success!');
              this.examStudentsList = this.duplicateexamStudentList;
              // tslint:disable-next-line: prefer-for-of
              for (let i = 0; i < result1.data.length; i++) {
                if (this.examStudentsList.filter(x => (x.studentId === result1.data[i].studentId)).length > 0) {
                  // tslint:disable-next-line: max-line-length
                  this.examStudentsList.filter(x => (x.studentId === result1.data[i].studentId))[0].marks = result1.data[i].examMarks;
                  this.examStudentsList.filter(x => (x.studentId === result1.data[i].studentId))[0].isvalidate = result1.data[i].isvalidate;
                  this.examStudentsList.filter(x => (x.studentId === result1.data[i].studentId))[0].reason = result1.data[i].reason;
                  if (!result1.data[i].isvalidate) {
                    this.examStudentsList.filter(x => (x.studentId === result1.data[i].studentId))[0].color = '#ff7070';
                  } else {
                    this.examStudentsList.filter(x => (x.studentId === result1.data[i].studentId))[0].color = null;
                  }
                }
              }
            }
          } else {
            this.snotifyService.error(result1.message, 'Error!');
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
    } else {
      this.snotifyService.info('Please choose a file.', 'Info!');
    }
  }

  calDays(): void {
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
    this.examDate = this.genericFunctions.momentWithDateFormatYMD(this.examFeeCollectionForm.value.examDate); // new Date(this.data.issueTodate);
  }

  clear(): void {
    if (this.checkUploadType === 2) {
      this.getStudentsList([])
    } else {
      this.examStudentsList = [];
    }
  }
  enteredMarks(item): void {
    this.minvalue = 0
    if (this.isInternalExam) {
      if (this.examMarks.filter(x => (x.subjectId === item.subjectId))[0].internalmarks != null) {
        this.maxValue = this.examMarks.filter(x => (x.subjectId === item.subjectId))[0].internalmarks

      } else {
        this.maxValue = this.examMarkSetups.filter(x => (x.subjectTypeCatId === item.subjecttypeId))[0].internalMarks
      }
    }
    else {
      if (this.examMarks.filter(x => (x.subjectId === item.subjectId))[0].externalmarks != null) {
        this.maxValue = this.examMarks.filter(x => (x.subjectId === item.subjectId))[0].externalmarks

      } else {
        this.maxValue = this.examMarkSetups.filter(x => (x.subjectTypeCatId === item.subjecttypeId))[0].externalMarks
      }
    }
    if (item.marks != "") {
      if (parseInt(item.marks) < this.minvalue) {
        item.marks = this.minvalue;
      }
      if (parseInt(item.marks) > this.maxValue) {
        this.snotifyService.info('Entered Marks Should Less Than ' + this.maxValue + 'Marks', 'Info!');
        item.marks = ''
      }
    }
    let isMarks;
    if (this.examMarks.filter(x => (x.subjectId === item.subjectId))[0].externalmarks !== null) {
      isMarks = (this.examMarks.filter(x => (x.subjectId === item.subjectId))[0].externalmarks * this.examMarkSetups.filter(x => (x.subjectTypeCatId === item.subjecttypeId))[0].externalPassPercentage / 100) > item.marks;
    }
    else {
      isMarks = (this.examMarkSetups.filter(x => (x.subjectTypeCatId === item.subjecttypeId))[0].externalMarks * this.examMarkSetups.filter(x => (x.subjectTypeCatId === item.subjecttypeId))[0].externalPassPercentage / 100) > item.marks;
    }
    if (this.examMarks.filter(x => (x.subjectId === item.subjectId)).length > 0) {
      if (item.examTypeCode === 'Internal' && item.isPresent != null) {
        item.isPass = true;
      } else {
        if (item.isPresent != null) {
          if (isMarks) {
            item.isPass = false;
          }
          else {
            item.isPass = true;
          }
        }
      }
    } else {
      if (item.examTypeCode === 'Internal' && item.isPresent != null) {
        item.isPass = true;
      } else {
        if (item.isPresent != null) {
          if (isMarks) {
            item.isPass = false;
          }
          else {
            item.isPass = true;
          }
        }
      }
    }
  }
  postExamMarks(): void {
    if (this.examFeeCollectionForm.valid) {
      this.postMarksList = [];
      if (this.examsList.filter(x => (x.fk_exam_id === this.examFeeCollectionForm.value.examId)).length > 0) {
        if (this.examsList.filter(x => (x.fk_exam_id === this.examFeeCollectionForm.value.examId))[0].is_internal_exam) {
          // tslint:disable-next-line: prefer-for-of
          for (let i = 0; i < this.examStudentsList.length; i++) {
            this.examStudentsList[i].marksEnteredEmpId = this.examFeeCollectionForm.value.employeeId;
            this.examStudentsList[i].courseId = this.examFeeCollectionForm.value.courseId;
            this.examStudentsList[i].regulationId = this.regulationId;
            this.examStudentsList[i].subjectTypeId = this.subjectTypeId;
            if (localStorage.getItem('userRole') == 'EXTERNAL EVALUATOR') {
              this.examStudentsList[i].isExtenalpersonApprove = true;
              this.examStudentsList[i].examEvaluatorProfileId = +localStorage.getItem('examEvaluatorProfileId')
            }
            else {
              this.examStudentsList[i].isExtenalpersonApprove = false;
              this.examStudentsList[i].examEvaluatorProfileId = null
            }
            if (this.examStudentsList[i].isPass) {
              this.examStudentsList[i].credits = this.examTimetableSubjectsList.filter(x => (x.fk_subject_id === this.examFeeCollectionForm.value.subjectId))[0].sub_credits;
            } else if (!this.examStudentsList[i].isPass) {
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
                // examTimetableId: this.examTimetableSubjectsList.filter(x => (x.fk_exam_timetable_det_id === this.examFeeCollectionForm.value.examTimetableDetId))[0].fk_exam_timetable_id,
                // examTimetableDetId: this.examFeeCollectionForm.value.examTimetableDetId,
                employeeId: this.examFeeCollectionForm.value.employeeId,
                createdDt: this.genericFunctions.moment(),
                examStdInternalMarkId: this.examStudentsList[i].examStdInternalMarkId,
              }
            });
          }
          this.spinner.show();
          // /---------- EXAM INTERNAL MARKS ----------/
          this.crudService.add(this.examStudentInternalMarksUrl, this.postMarksList)
            .subscribe(result => {
              this.spinner.hide();
              if (result.success) {
                this.snotifyService.success(result.message, 'Success!');
                this.getStudentsList(result.data)
                if (result.data) {
                  this.getStudentsList(result.data)
                } else {
                  this.getStudentsList([])
                }
              } else {
                if (result.data) {
                  this.getStudentsList(result.data)
                } else {
                  this.getStudentsList([])
                }
                this.snotifyService.info(result.message, 'Info!');
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
        } else if (this.examsList.filter(x => (x.fk_exam_id === this.examFeeCollectionForm.value.examId))[0].is_regular_exam
          || this.examsList.filter(x => (x.fk_exam_id === this.examFeeCollectionForm.value.examId))[0].is_supply_exam) {
          // tslint:disable-next-line: prefer-for-of
          for (let i = 0; i < this.examStudentsList.length; i++) {
            this.examStudentsList[i].marksEnteredEmpId = this.examFeeCollectionForm.value.employeeId;
            this.examStudentsList[i].courseId = this.examFeeCollectionForm.value.courseId;
            this.examStudentsList[i].regulationId = this.regulationId;
            this.examStudentsList[i].subjectTypeId = this.subjectTypeId;
            if (localStorage.getItem('userRole') == 'EXTERNAL EVALUATOR') {
              this.examStudentsList[i].isExtenalpersonApprove = true;
              // this.examStudentsList[i].externalpersonApprovedon = new Date();
              this.examStudentsList[i].examEvaluatorProfileId = +localStorage.getItem('examEvaluatorProfileId')
            }
            else {
              this.examStudentsList[i].isExtenalpersonApprove = false;
              // this.examStudentsList[i].externalpersonApprovedon = new Date();
              this.examStudentsList[i].examEvaluatorProfileId = null
            }
            // if (this.examStudentsList[i].isPresent){
            //   this.examStudentsList[i].isMarksPublished = true;
            // }
            if (this.examStudentsList[i].isPass) {
              this.examStudentsList[i].credits = this.examTimetableSubjectsList.filter(x => (x.fk_subject_id === this.examFeeCollectionForm.value.subjectId))[0].sub_credits;
            } else if (!this.examStudentsList[i].isPass) {
              this.examStudentsList[i].credits = 0;
            }
            this.postMarksList.push({
              examStudentDetailDTO: this.examStudentsList[i],
              examStudentInternalMarkDTO: null
            });
          }
          this.spinner.show();
          // /---------- EXAM Regular MARKS ----------//
          this.crudService.add(this.examStudentInternalMarksUrl, this.postMarksList)
            .subscribe(result => {
              this.spinner.hide();
              if (result.success) {
                this.snotifyService.success(result.message, 'Success!');
                this.getStudentsList(result.data)

                if (result.data) {
                  this.getStudentsList(result.data)
                } else {
                  this.selectedSubject([]);
                }
              } else {
                if (result.data) {
                  this.getStudentsList(result.data)
                } else {
                  this.getStudentsList([])
                }
                this.snotifyService.info(result.message, 'Info!');
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
    }
  }
  publishExamMarks(): void {
    if (this.examFeeCollectionForm.valid) {
      this.postMarksList = [];
      if (this.examsList.filter(x => (x.fk_exam_id === this.examFeeCollectionForm.value.examId)).length > 0) {
        if (this.examsList.filter(x => (x.fk_exam_id === this.examFeeCollectionForm.value.examId))[0].is_internal_exam) {
          // tslint:disable-next-line: prefer-for-of
          for (let i = 0; i < this.examStudentsList.length; i++) {
            this.examStudentsList[i].marksEnteredEmpId = this.examFeeCollectionForm.value.employeeId;
            this.examStudentsList[i].courseId = this.examFeeCollectionForm.value.courseId;
            this.examStudentsList[i].regulationId = this.regulationId;
            this.examStudentsList[i].subjectTypeId = this.subjectTypeId;
            //  if (this.examStudentsList[i].isPresent){
            this.examStudentsList[i].isMarksPublished = true;
            //  }
            if (this.examStudentsList[i].isPass) {
              this.examStudentsList[i].credits = this.examTimetableSubjectsList.filter(x => (x.fk_subject_id === this.examFeeCollectionForm.value.subjectId))[0].sub_credits;
            } else if (!this.examStudentsList[i].isPass) {
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
                // examTimetableId: this.examTimetableSubjectsList.filter(x => (x.fk_exam_timetable_det_id === this.examFeeCollectionForm.value.examTimetableDetId))[0].fk_exam_timetable_id,
                // examTimetableDetId: this.examFeeCollectionForm.value.examTimetableDetId,
                employeeId: this.examFeeCollectionForm.value.employeeId,
                createdDt: this.genericFunctions.moment(),
                examStdInternalMarkId: this.examStudentsList[i].examStdInternalMarkId,
              }
            });
          }
          this.spinner.show();
          /---------- EXAM INTERNAL MARKS ----------/
          this.crudService.add(this.examStudentInternalMarksUrl, this.postMarksList)
            .subscribe(result => {
              this.spinner.hide();
              if (result.success) {
                this.snotifyService.success(result.message, 'Success!');
                if (result.data) {
                  this.getStudentsList(result.data);
                } else {
                  this.getStudentsList([]);
                }
              } else {
                if (result.data) {
                  this.getStudentsList(result.data);
                } else {
                  this.getStudentsList([]);
                }
                this.snotifyService.info(result.message, 'Info!');
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
        } else if (this.examsList.filter(x => (x.fk_exam_id === this.examFeeCollectionForm.value.examId))[0].is_regular_exam
          || this.examsList.filter(x => (x.fk_exam_id === this.examFeeCollectionForm.value.examId))[0].is_supply_exam) {
          // tslint:disable-next-line: prefer-for-of
          for (let i = 0; i < this.examStudentsList.length; i++) {
            this.examStudentsList[i].marksEnteredEmpId = this.examFeeCollectionForm.value.employeeId;
            this.examStudentsList[i].courseId = this.examFeeCollectionForm.value.courseId;
            this.examStudentsList[i].regulationId = this.regulationId;
            this.examStudentsList[i].subjectTypeId = this.subjectTypeId;
            // if (this.examStudentsList[i].isPresent){
            this.examStudentsList[i].isMarksPublished = true;
            // }
            if (this.examStudentsList[i].isPass) {
              this.examStudentsList[i].credits = this.examTimetableSubjectsList.filter(x => (x.fk_subject_id === this.examFeeCollectionForm.value.subjectId))[0].sub_credits;
            } else if (!this.examStudentsList[i].isPass) {
              this.examStudentsList[i].credits = 0;
            }
            this.postMarksList.push({
              examStudentDetailDTO: this.examStudentsList[i],
              examStudentInternalMarkDTO: null
            });
          }
          this.spinner.show();
          /---------- EXAM Regular MARKS ----------/
          this.crudService.add(this.examStudentInternalMarksUrl, this.postMarksList)
            .subscribe(result => {
              this.spinner.hide();
              if (result.success) {
                this.snotifyService.success(result.message, 'Success!');
                if (result.data) {
                  this.getStudentsList(result.data)

                } else {
                  this.getStudentsList([]);
                }
              } else {
                if (result.data) {
                  this.getStudentsList(result.data);
                } else {
                  this.getStudentsList([]);
                }
                this.snotifyService.info(result.message, 'Info!');
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
    }
  }
  getEmloyees() {
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
  getReportingManagers(employeeId): void {
    this.staffSubjectsList = [];
    if (employeeId !== null && employeeId !== undefined) {
      this.spinner.show();
      this.crudService.listByTwoIds(this.staffSubjectsUrl,
        employeeId, 'true', 'employeeId', 'status')
        .subscribe(result => {
          this.spinner.hide();
          if (result.statusCode === 200) {
            if (result.data && result.data !== '') {
              this.staffSubjectsList = result.data;
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
  genrateSecretCode() {
    this.userId = +localStorage.getItem('userId')
    this.crudService.GenerateSecretCode(this.generateSecretCodeForMarksEntryUrl, '/' + this.userId)
      .subscribe(result => {
        this.spinner.hide();
        if (result.statusCode === 200) {
          if (result.data && result.data !== '') {
            this.snotifyService.success(result.message, 'Success!');
            const dialogRef = this.dialog.open(EvterSecureCodeComponent, {
              width: '30%',
              data: {}
            });
            dialogRef.afterClosed().subscribe(details => {
              if (details != null && details !== '') {
                const obj = {
                  // code:details,
                  userId: this.userId,
                  code: btoa(details),
                }
                this.validateCOde(obj)
              }
            })
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
  validateCOde(obj) {
    let request = [
      { paramName: 'userId', paramValue: obj.userId },
      { paramName: 'secretCode', paramValue: obj.code },
    ];
    this.crudService.getDetailsByRequestApi(this.validateSecretCodeForMarksEntryUrl, '', request, '&')
      .subscribe(result => {
        this.spinner.hide();
        if (result.statusCode === 200) {
          if (result.data && result.data !== '') {
            this.snotifyService.success(result.message, 'Success!');
            if (result.data == true) {
              if (this.UserRole != 'EXTERNAL EVALUATOR') {
                this.saveButton = true
              }
              else {
                this.ApproveButton = true
                this.saveButton = false
              }
            }
            else {
              this.ApproveButton = false
              this.saveButton = false
            }

          }
          else {
            this.ApproveButton = false
            this.saveButton = false

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
  tConvert(time): any {
    if (time !== null && time !== undefined) {
      time = time.toString().match(/^([01]\d|2[0-3])(:)([0-5]\d)(:[0-5]\d)?$/) || [time];
      if (time.length > 1) { // If time format correct
        time = time.slice(1);  // Remove full string match value
        time[5] = +time[0] < 12 ? 'AM' : 'PM'; // Set AM/PM
        time[0] = +time[0] % 12 || 12; // Adjust hours
      }
      time = time[0] + time[1] + time[2] + ' ' + time[5];
      return time;
    }
  }
  Print() {
    window.print();
  }
}