import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { Location } from '@angular/common';
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
  selector: 'app-exam-attendance-marking',
  templateUrl: './exam-attendance-marking.component.html',
  styleUrls: ['./exam-attendance-marking.component.scss']
})
export class ExamAttendanceMarkingComponent implements OnInit {

  displayedColumns: string[] = ['id', 'admissionNumber', 'groupname', 'firstName', 'subjectCode', 'isPresent', 'mark' , 'isufm'];

  dataSource: MatTableDataSource<any>;
  @ViewChild('fileInput') fileInput: ElementRef;
  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild(MatSort) sort: MatSort;

  private examFiltersByCodeUrl = CONSTANTS.examFiltersByCodeUrl;
  private collegeCrudUrl = CONSTANTS.collegeCrudUrl;
  private examStudentDetailsUrl = CONSTANTS.examStudentDetailsUrl;
  private isActive = CONSTANTS.isActive;
  private getExamAllotmentDetailsInvigilatorUrl = CONSTANTS.getExamAllotmentDetailsInvigilatorUrl;
  private buildingdetailsSearchurl = CONSTANTS.buildingdetailsSearchurl;
  private employeeSearchUrl = CONSTANTS.employeeSearchUrl;
  private roomCrudUrl = CONSTANTS.roomCrudUrl;
  miniopath = CONSTANTS.MINIO
  private uploadInvigilatorAttendanceSheetUrl = CONSTANTS.uploadInvigilatorAttendanceSheetUrl;
  private getExamAllotmentInvigilatorsUrl = CONSTANTS.getExamAllotmentInvigilatorsUrl;
  private getExamAllotInvigilatorUrl = CONSTANTS.getExamAllotInvigilatorUrl;

  filtersDetailsList = [];
  CollegesListDetails = [];
  CollegeIdData = [];
  courseList = [];
  courseYearList = [];
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
  examDate = this.genericFunctions.momentWithDateFormatYMD(this.genericFunctions.moment());
  searchExams = [];
  searchRooms = [];
  searchEmployees = [];
  public formData;
  public examFilterCtrl: FormControl = new FormControl();
  private _onDestroy = new Subject<void>();
  public filteredExam: ReplaySubject<any[]> = new ReplaySubject<any[]>(1);

  public roomFilterCtrl: FormControl = new FormControl();
  public filteredRooms: ReplaySubject<any[]> = new ReplaySubject<any[]>(1);

  public employeeFilterCtrl: FormControl = new FormControl();
  public filteredEmployees: ReplaySubject<any[]> = new ReplaySubject<any[]>(1);
  examStudentList1: any[] = [];
  params: any;
  rooms = [];
  rooms1 = [];
  ExamAllotmentInvigilators = [];
  ExamAllotmentInvigilatorsList = [];
  ExamAllotmentList = [];
  roomname = [];
  invigilatorName = [];
  academicYearsList: any[];
  courseListData: any[];
  examData: any[];
  examsLists: any[];
  examSessionsList: any[];
  groupList: any[];
  courseYearsList: any[];
  loginUser: any;
  userroles: any;
  staff: boolean;
  examTimetableSubjectsList = [];
  examTimetableSubjects = [];
  examTimetableSubject = [];
  labbatchsSubjects = [];
  labbatchs = [];
  labBatch: boolean = false;
  roleName: string;
  examFiltersData = [];
  examListDetails = [];
  collegeFilterDetails = [];
  subjectTypeList = [];
  subjectListDetails = [];
  regulationsList = [];
  regulations = [];

  constructor(private formBuilder: FormBuilder, private snotifyService: SnotifyService, private _location: Location,
    private crudService: CrudService, private spinner: NgxSpinnerService, private router: Router,
    private genericFunctions: GenericFunctions, private route: ActivatedRoute,
    private paramaters: ParametersService) {
    // this.getData();
    if (this.genericFunctions.getSecuredValue('userDetails') !== null && this.genericFunctions.getSecuredValue('userDetails') !== '') {
      this.loginUser = JSON.parse(this.genericFunctions.getSecuredValue('userDetails'));
      this.userroles = this.loginUser.userRoles
    }
    for (let i = 0; i < this.loginUser.userRoles.length; i++) {
      if (this.loginUser.userRoles[i].roleName == "MSTAFF" || this.loginUser.userRoles[i].roleName == "STAFF") {
        this.staff = true
      }
    }
  }
  // tslint:disable-next-line: typedef
  ngOnInit() {
    this.roleName = localStorage.getItem('roleName')
    this.examAttendanceForm = this.formBuilder.group({
      courseId: ['', Validators.required],
      collegeId: ['', Validators.required],
      academicYearId: ['', Validators.required],
      roomId: ['', Validators.required],
      employeeId: [''],
      courseGroupId: ['', Validators.required],
      courseYearId: ['', Validators.required],
      regulationId: ['', Validators.required],
      examId: ['', Validators.required],
      examDate: [this.genericFunctions.moment()],
      labBatchId: [''],
      subjectId: ['', Validators.required]
    });
    if (this.paramaters.examAttendanceMarking) {
      this.params = this.paramaters.examAttendanceMarking[0];
      this.examAttendanceForm.get('collegeId').setValue(this.params.collegeId);
      this.examAttendanceForm.get('examId').setValue(this.params.examId);
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

    this.getExamFiltersList();

    this.searchExams.push({ firstName: 'Search by Exam.' });
    this.filteredExam.next(this.searchExams.slice());

    this.searchRooms.push({ roomName: 'Search by Room name or Number.' });
    this.filteredRooms.next(this.searchRooms.slice());

    this.searchEmployees.push({ firstName: 'Search by Employee name or Id.' });
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

  enteredEmployee(event, name): void {
    if (name !== 'params') {
      if (event.target.value.length > 4) {

        /*----------- EMPLOYEE -----------*/
        this.crudService.listByIds(this.employeeSearchUrl, event.target.value, 'q')
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

  getExamFiltersList(): void {
    this.spinner.show();
    let request = [
      { paramName: 'in_flag', paramValue: 'univ_exam_filters' },
      { paramName: 'in_flag_type', paramValue: 'INT' },
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
                this.examListDetails = list;
                break;
              }
            }
            if (this.examListDetails && this.examListDetails.length > 0) {
              const courseList = this.examListDetails.map(({ fk_course_id }) => fk_course_id);
              this.courses = this.examListDetails.filter(({ fk_course_id }, index) =>
                !courseList.includes(fk_course_id, index + 1));
              if (this.courses && this.courses.length > 0) {
                this.examAttendanceForm.get('courseId').setValue(this.courses[0].fk_course_id);
                this.selectedCourse(this.examAttendanceForm.value.courseId)
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
    this.examAttendanceForm.get('academicYearId').setValue('');
    this.examAttendanceForm.get('examId').setValue('');
    this.examAttendanceForm.get('collegeId').setValue('');
    this.examAttendanceForm.get('courseGroupId').setValue('');
    this.examAttendanceForm.get('courseYearId').setValue('');
    this.examAttendanceForm.get('regulationId').setValue('');
    this.examAttendanceForm.get('subjectId').setValue('');
    this.examAttendanceForm.get('collegeId').setValue('');
    this.examAttendanceForm.get('employeeId').setValue(0)
    this.examAttendanceForm.get('roomId').setValue(0)
    this.collegeFilterDetails = [];
    this.CollegesListDetails = [];
    this.colleges = [];
    this.examsList = [];
    this.courseYears = [];
    this.courseGroups = [];
    this.academicYears = [];
    this.subjectListDetails = [];
    this.subjectTypeList = [];
    this.examTimetableSubjectsList = [];
    this.academicYearsList = [];
    this.regulationsList = [];
    this.regulations = [];
    this.flag = false;
    this.absents = [];
    this.examStudentList = [];
    this.dataSource = new MatTableDataSource<any>(this.examStudentList);
    /*----------- ACADEMIC YEARS -----------*/
    if (courseId != null && courseId !== undefined) {
      this.course = this.courses.filter(x => (x.fk_course_id === courseId))[0].course_code;
      this.academicYearsList = this.examListDetails.filter(x => (x.fk_course_id === this.examAttendanceForm.value.courseId))
      if (this.academicYearsList.length > 0) {
        const academicYears = this.academicYearsList.map(({ fk_academic_year_id }) => fk_academic_year_id);
        this.academicYears = this.academicYearsList.filter(({ fk_academic_year_id }, index) => !academicYears.includes(fk_academic_year_id, index + 1));
      }
      if (this.academicYears.length > 0) {
        const currentAY = this.academicYears?.sort((a, b) => (b.is_curr_ay ?? 0) - (a.is_curr_ay ?? 0))[0];
        if (currentAY?.fk_academic_year_id) {
        this.examAttendanceForm.get('academicYearId')?.setValue(currentAY.fk_academic_year_id);
        }
        // this.academicYears = this.academicYears.sort((a,b)=>parseInt(b?.academic_year) - parseInt(a?.academic_year));
        this.academicYears = this.academicYears.sort((a,b)=>parseInt(b.academic_year)-parseInt(a.academic_year));
        // this.examAttendanceForm.get('academicYearId').setValue(this.academicYears[0].fk_academic_year_id);
        this.selectedAcademicYear(this.examAttendanceForm.value.academicYearId);
      }
    }
  }
  selectedAcademicYear(academicYearId): void {
    this.examAttendanceForm.get('courseGroupId').setValue('');
    this.examAttendanceForm.get('courseYearId').setValue('');
    this.examAttendanceForm.get('regulationId').setValue('');
    this.examAttendanceForm.get('examId').setValue('');
    this.examAttendanceForm.get('subjectId').setValue('');
    this.examAttendanceForm.get('collegeId').setValue('');
    this.examAttendanceForm.get('employeeId').setValue(0)
    this.examAttendanceForm.get('roomId').setValue(0)
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
    this.subjectTypeList = [];
    this.flag = false;
    this.absents = [];
    this.examStudentList = [];
    this.dataSource = new MatTableDataSource<any>(this.examStudentList);
    if (academicYearId !== null && academicYearId !== undefined) {
      /*----------- Exams List -----------*/
      // tslint:disable-next-line:max-line-length
      this.examsLists = this.examListDetails.filter(x => (x.fk_course_id === this.examAttendanceForm.value.courseId && x.fk_academic_year_id === this.examAttendanceForm.value.academicYearId))
      if (this.examsLists.length > 0) {
        const examsLists = this.examsLists.map(({ fk_exam_id }) => fk_exam_id);
        this.examsList = this.examsLists.filter(({ fk_exam_id }, index) => !examsLists.includes(fk_exam_id, index + 1));
      }
      if (this.roleName == 'ADMIN') {
        this.examData = this.examsList;
      }
      else {
        this.examsList = this.examsList.filter(x => (x.is_published == false))
        this.examData = this.examsList;
      }
      if (this.examsList.length > 0) {
        this.examAttendanceForm.get('examId').setValue(this.examsList[0].fk_exam_id);
        this.selectedExam(this.examAttendanceForm.value.examId)
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

  selectedExam(examId): void {
    this.examAttendanceForm.get('employeeId').setValue(0)
    this.examAttendanceForm.get('roomId').setValue(0)
    this.examAttendanceForm.get('subjectId').setValue(0)
    this.examAttendanceForm.get('labBatchId').setValue(0)
    this.examAttendanceForm.get('courseGroupId').setValue(0);
    this.examAttendanceForm.get('courseYearId').setValue(0);
    this.examStudentList = [];
    this.dataSource = new MatTableDataSource<any>(this.examStudentList);
    this.minDate = this.genericFunctions.momentWithDateFormatYMD(this.examsList.filter(x => (x.fk_exam_id === examId))[0].from_date);
    this.examAttendanceForm.get('examDate').setValue(this.minDate);
    this.examDate = this.genericFunctions.momentWithDateFormatYMD(this.examAttendanceForm.value.examDate); // new Date(this.data.issueTodate);
    this.maxDate = this.genericFunctions.momentWithDateFormatYMD(this.examsList.filter(x => (x.fk_exam_id === examId))[0].to_date);
    this.flag = false;
    this.examSessions = []
    this.subjectTypeList = [];
    this.examSessionsList = []
    this.courseYearsList = []
    this.groupList = []
    this.groupList = []
    this.examTimetableSubjectsList = [];
    this.flag = false;
    this.absents = [];
    this.examStudentList = [];
    this.dataSource = new MatTableDataSource<any>(this.examStudentList);
    this.examDetails = this.examsList.filter(x => (x.fk_exam_id === examId))[0];
    /*----------- COURSES GROUPS -----------*/
    if (examId != null && examId !== undefined) {
      let request = [
        { paramName: 'in_flag', paramValue: 'univ_exam_rest_in_regexamstd' },
        { paramName: 'in_flag_type', paramValue: 'ALL' },
        { paramName: 'in_university_id', paramValue: 0 },
        { paramName: 'in_univ_examcenter_id', paramValue: 0 },
        { paramName: 'in_college_id', paramValue: 0 },
        { paramName: 'in_course_id', paramValue: this.examAttendanceForm.value.courseId },
        { paramName: 'in_course_group_id', paramValue: 0 },
        { paramName: 'in_course_year_id', paramValue: 0 },
        { paramName: 'in_exam_id', paramValue: this.examAttendanceForm.value.examId },
        { paramName: 'in_academic_year_id', paramValue: this.examAttendanceForm.value.academicYearId },
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
              this.collegeFilterDetails = result.data.result;
              for (const list of this.collegeFilterDetails) {
                if (list?.length > 0 && list[0].flag === 'univ_exam_rest_filters') {
                  this.CollegesListDetails = list;
                  break;  // Stop looping once we find the first match
                }
              }
              const CollegeIdData = this.CollegesListDetails.map(({ fk_college_id }) => fk_college_id);
              this.colleges = this.CollegesListDetails.filter(({ fk_college_id }, index) =>
                !CollegeIdData.includes(fk_college_id, index + 1));
              if (this.colleges && this.colleges.length > 0) {
                this.colleges = this.colleges.sort((a, b) => a.clg_sort_order - b.clg_sort_order);
                this.examAttendanceForm.get('collegeId').setValue(this.colleges[0].fk_college_id);
                this.selectedCollege(this.examAttendanceForm.value.collegeId)
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
    this.examAttendanceForm.get('courseGroupId').setValue('');
    this.examAttendanceForm.get('courseYearId').setValue('');
    this.examAttendanceForm.get('subjectId').setValue('');
    this.subjectTypeList = [];
    this.collegeFilterDetails = [];
    this.subjectListDetails = [];
    this.courseGroups = [];
    this.courseYears = [];
    this.groupList = [];
    this.regulationsList = [];
    this.regulations = [];
    this.examTimetableSubjectsList = [];
    this.flag = false;
    this.absents = [];
    this.examStudentList = [];
    this.dataSource = new MatTableDataSource<any>(this.examStudentList);
    this.groupList = this.CollegesListDetails.filter(x => (x.fk_college_id === this.examAttendanceForm.value.collegeId))
    if (this.groupList.length > 0) {
      const groupList = this.groupList.map(({ fk_course_group_id }) => fk_course_group_id);
      this.courseGroups = this.groupList.filter(({ fk_course_group_id }, index) => !groupList.includes(fk_course_group_id, index + 1));
    }
    if (this.courseGroups.length > 0) {
      this.examAttendanceForm.get('courseGroupId').setValue(this.courseGroups[0].fk_course_group_id);
      this.selectedCourseGroup(this.examAttendanceForm.value.courseGroupId)
    }
  }

  selectedCourseGroup(courseGroupId): void {
    this.subjectListDetails = [];
    this.subjectTypeList = [];
    this.courseYears = [];
    this.examTimetableSubjectsList = [];
    this.courseYearsList = [];
    this.regulationsList = [];
    this.regulations = [];
    this.flag = false;
    this.absents = [];
    this.examStudentList = [];
    this.dataSource = new MatTableDataSource<any>(this.examStudentList);
    this.examAttendanceForm.get('courseYearId').setValue('');
    this.examAttendanceForm.get('subjectId').setValue('');
    if (this.examAttendanceForm.value.courseGroupId != null && courseGroupId != null) {
      /*----------- COURSES Years -----------*/
      this.courseYearsList = this.CollegesListDetails.filter(x => (x.fk_college_id === this.examAttendanceForm.value.collegeId && x.fk_course_group_id === this.examAttendanceForm.value.courseGroupId))
      if (this.courseYearsList.length > 0) {
        const courseYearsList = this.courseYearsList.map(({ fk_course_year_id }) => fk_course_year_id);
        this.courseYears = this.courseYearsList.filter(({ fk_course_year_id }, index) => !courseYearsList.includes(fk_course_year_id, index + 1));
      }
      if (this.courseYears.length > 0) {
        this.examAttendanceForm.get('courseYearId').setValue(this.courseYears[0].fk_course_year_id);
        this.selectedYear(this.examAttendanceForm.value.courseYearId)
      }
    }
  }

  selectedYear(courseYearId): void {
    this.subjectListDetails = [];
    this.subjectTypeList = [];
    this.regulationsList = [];
    this.regulations = [];
    this.examTimetableSubjectsList = [];
    this.examTimetableSubject = [];
    this.flag = false;
    this.absents = [];
    this.examStudentList = [];
    this.dataSource = new MatTableDataSource<any>(this.examStudentList);
    this.examAttendanceForm.get('subjectId').setValue('');
    this.regulationsList = this.CollegesListDetails.filter(x => (x.fk_college_id === this.examAttendanceForm.value.collegeId && x.fk_course_group_id === this.examAttendanceForm.value.courseGroupId
      && x.fk_course_year_id === this.examAttendanceForm.value.courseYearId
    ))
    if (this.regulationsList && this.regulationsList.length > 0) {
      const regulationsList = this.regulationsList.map(({ fk_regulation_id }) => fk_regulation_id);
      this.regulations = this.regulationsList.filter(({ fk_regulation_id }, index) => !regulationsList.includes(fk_regulation_id, index + 1));
    }
    if (this.regulations && this.regulations.length > 0) {
      this.examAttendanceForm.get('regulationId').setValue(this.regulations[0].fk_regulation_id);
      this.selectedRegulation(this.examAttendanceForm.value.regulationId);
    }
  }

  selectedRegulation(regulationId) {
    this.subjectListDetails = [];
    this.examTimetableSubjectsList = [];
    this.courseYearsList = [];
    this.subjectTypeList = [];
    this.flag = false;
    this.absents = [];
    this.examStudentList = [];
    this.dataSource = new MatTableDataSource<any>(this.examStudentList);
    this.examAttendanceForm.get('subjectId').setValue('');
    if (this.examAttendanceForm.value.regulationId != null && regulationId != null) {
      /*----------- SUBJECTS -----------*/
      let request = [
        { paramName: 'in_flag', paramValue: 'univ_exam_subject_regexamstd' },
        { paramName: 'in_flag_type', paramValue: 'ALL' },
        { paramName: 'in_university_id', paramValue: 0 },
        { paramName: 'in_univ_examcenter_id', paramValue: 0 },
        { paramName: 'in_college_id', paramValue: this.examAttendanceForm.value.collegeId },
        { paramName: 'in_course_id', paramValue: this.examAttendanceForm.value.courseId },
        { paramName: 'in_course_group_id', paramValue: this.examAttendanceForm.value.courseGroupId },
        { paramName: 'in_course_year_id', paramValue: this.examAttendanceForm.value.courseYearId },
        { paramName: 'in_exam_id', paramValue: this.examAttendanceForm.value.examId },
        { paramName: 'in_academic_year_id', paramValue: this.examAttendanceForm.value.academicYearId },
        { paramName: 'in_regulation_id', paramValue: this.examAttendanceForm.value.regulationId },
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
                  break;  // Stop looping once we find the first match
                }
              }
              if (this.subjectTypeList.length > 0) {
                const examTimetableSubjects = this.subjectTypeList.map(({ fk_subject_id }) => fk_subject_id);
                this.examTimetableSubjectsList = this.subjectTypeList.filter(({ fk_subject_id }, index) =>
                  !examTimetableSubjects.includes(fk_subject_id, index + 1));
                this.examTimetableSubject = this.examTimetableSubjectsList
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
  selectedSubject(subject) {
    this.examAttendanceForm.get('roomId').setValue(0);
    this.examAttendanceForm.get('employeeId').setValue(0);
    this.flag = false;
    this.absents = [];
    this.examStudentList = [];
    this.dataSource = new MatTableDataSource<any>(this.examStudentList);
    this.labbatchsSubjects = []
    this.labbatchs = []
    this.examAttendanceForm.get('examDate').setValue(this.examTimetableSubjectsList.filter(x => (x.fk_subject_id === this.examAttendanceForm.value.subjectId))[0]?.exam_date);
    this.examDate = this.genericFunctions.momentWithDateFormatYMD(this.examAttendanceForm.value.examDate);
    if (this.examAttendanceForm.value.courseGroupId == 0) {
      if (this.examTimetableSubject.filter(x => (x.fk_subject_id == this.examAttendanceForm.value.subjectId))[0].subject_type == 'LAB') {
        this.labBatch = true
        this.examAttendanceForm.get('labBatchId').setValue(0);
        if (this.labbatchsSubjects && this.labbatchsSubjects.length > 0) {
          this.labbatchsSubjects = this.CollegesListDetails.filter(x => (x.fk_college_id == this.examAttendanceForm.value.collegeId && x.fk_course_id == this.examAttendanceForm.value.courseId && x.fk_academic_year_id == this.examAttendanceForm.value.academicYearId && x.fk_exam_id == this.examAttendanceForm.value.examId && x.fk_subject_id == this.examAttendanceForm.value.subjectId))
          const labbatchs = this.labbatchsSubjects.map(({ fk_exam_labbatch_id }) => fk_exam_labbatch_id);
          this.labbatchs = this.labbatchsSubjects.filter(({ fk_exam_labbatch_id }, index) => !labbatchs.includes(fk_exam_labbatch_id, index + 1));
          if (this.labbatchs && this.labbatchs.length > 0) {
            this.examAttendanceForm.get('labBatchId').setValue(this.labbatchs[0].fk_exam_labbatch_id);
            this.selectedLab(this.examAttendanceForm.value.labBatchId)
          }
        }
      }
      else {
        this.labBatch = false
        this.examAttendanceForm.get('labBatchId').setValue(0);
      }
    }
    else {
      if (this.examTimetableSubject.filter(x => (x.fk_subject_id === this.examAttendanceForm.value.subjectId))[0].subject_type == 'LAB') {
        this.labBatch = true
        this.examAttendanceForm.get('labBatchId').setValue(0);
        this.labbatchsSubjects = this.subjectTypeList.filter(x => (x.fk_subject_id == this.examAttendanceForm.value.subjectId))
        if (this.labbatchsSubjects.length > 0) {
          const labbatchs = this.labbatchsSubjects.map(({ fk_exam_labbatch_id }) => fk_exam_labbatch_id);
          this.labbatchs = this.labbatchsSubjects.filter(({ fk_exam_labbatch_id }, index) => !labbatchs.includes(fk_exam_labbatch_id, index + 1));
          if (this.labbatchs && this.labbatchs.length > 0) {
            this.examAttendanceForm.get('labBatchId').setValue(this.labbatchs[0].fk_exam_labbatch_id);
            this.selectedLab(this.examAttendanceForm.value.labBatchId)
          }
        }
      }
      else {
        this.labBatch = false
        this.examAttendanceForm.get('labBatchId').setValue(0);
      }
    }
    this.getExamAllotmentInvigilators("new");
  }
  selectedLab(batchid) {
    this.flag = false;
    this.absents = [];
    this.examStudentList = [];
    this.dataSource = new MatTableDataSource<any>(this.examStudentList);
    if (this.examAttendanceForm.value.labBatchId == 0) {
      this.examAttendanceForm.get('examDate').setValue(this.examTimetableSubjectsList.filter(x => (x.fk_subject_id === this.examAttendanceForm.value.subjectId))[0]?.exam_date);
      this.examDate = this.genericFunctions.momentWithDateFormatYMD(this.examAttendanceForm.value.examDate);
    }
    else {
      this.examAttendanceForm.get('examDate').setValue(this.labbatchs.filter(x => (x.fk_exam_labbatch_id === batchid))[0]?.exam_date);
      this.examDate = this.genericFunctions.momentWithDateFormatYMD(this.examAttendanceForm.value.examDate);
    }
  }
  applyFilter(event: string) {
    this.dataSource.filter = event.trim().toLowerCase();
    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
  }
  selectedEmp(empId): void {
    this.invigilatorName = []
    this.ExamAllotmentList = []
    this.examAttendanceForm.get('roomId').setValue(0);
    this.flag = false;
    this.absents = [];
    this.dataSource = new MatTableDataSource<any>(this.examStudentList);
    this.examStudentList = [];
    this.dataSource = new MatTableDataSource<any>(this.examStudentList);
    this.ExamAllotmentList = this.ExamAllotmentInvigilators.filter(x => x.invigilatorEmpId == empId)
    if (this.ExamAllotmentList.length > 0) {
      this.examAttendanceForm.get('roomId').setValue(this.ExamAllotmentList[0]?.roomId)
    }
    else {
      this.examAttendanceForm.get('roomId').setValue(0)
    }

    let InvEmpName = this.ExamAllotmentInvigilatorsList.filter(x => (x.invigilatorEmpId == this.examAttendanceForm.value.employeeId))
    this.invigilatorName = InvEmpName[0].invigilatorEmpName;
    this.selectedroom();
  }
  selectedroom() {
    this.roomname = [];
    this.flag = false;
    this.absents = [];
    this.examStudentList = [];
    this.dataSource = new MatTableDataSource<any>(this.examStudentList);
    let roomName = this.rooms1.filter(x => (x.roomId == this.examAttendanceForm.value.roomId))
    this.roomname = roomName[0].roomCode
  }
  getStudentsList(): void {
    this.flag = false;
    this.absents = [];
    this.examStudentList = [];
    this.dataSource = new MatTableDataSource<any>(this.examStudentList);
    if (this.examAttendanceForm.valid) {
      this.spinner.show();
      /* -------- EXAM SESSIONS -------*/
      this.crudService.listByFiveteenIds(this.getExamAllotmentDetailsInvigilatorUrl,
        'invigilator_room_details',
        this.examAttendanceForm.value.collegeId,
        this.examAttendanceForm.value.examId,
        this.examAttendanceForm.value.courseId,
        this.examAttendanceForm.value.courseGroupId,
        this.examAttendanceForm.value.courseYearId,
        this.examAttendanceForm.value.roomId,
        0, this.examAttendanceForm.value.employeeId ? this.examAttendanceForm.value.employeeId : 0, 0, this.examDate, this.examDate, this.examAttendanceForm.value.subjectId,
        0, this.examAttendanceForm.value.labBatchId,
        'in_flag', 'in_clg_id', 'in_exam_id', 'in_course_id', 'in_course_group_id', 'in_course_year_id', 'in_room_id', 'in_std_id', 'in_invgilator_emp_id',
        'in_regulation_id', 'from_exam_date', 'to_exam_date', 'in_subject_id', 'in_session_id', 'in_exam_labbatch_id')
        .subscribe(result => {
          this.spinner.hide();
          if (result.statusCode === 200) {
            if (result.data && result.data !== '' && result.data.result.length > 0) {
              this.examStudentList = result.data.result[0];
              // tslint:disable-next-line: prefer-for-of
              this.absents = [];
              for (let i = 0; i < this.examStudentList.length; i++) {
                if (this.examStudentList[i].is_present == false) {
                  this.absents.push(this.examStudentList[i])
                }
                if (this.examStudentList[i].is_present == null) {
                  this.examStudentList[i].is_present = true
                }
                if (this.examStudentList[i].isufm == null) {
                  this.examStudentList[i].isufm = false
                }
              }
              this.dataSource = new MatTableDataSource<any>(this.examStudentList);
              this.dataSource.paginator = this.paginator;
              this.dataSource.sort = this.sort;
              this.flag = true;
              this.heading();
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
  heading() {
    let h1 = this.colleges.filter(x => (x.fk_college_id === this.examAttendanceForm.value.collegeId));
    this.collegeCode = h1[0].college_code
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
  getExamAllotmentInvigilators(view) {
    this.ExamAllotmentInvigilators = []
    this.ExamAllotmentInvigilatorsList = []
    if (this.staff == true) {
      this.crudService.listByIds(this.getExamAllotInvigilatorUrl, +localStorage.getItem('employeeId'), 'invigilatorEmpId')
        .subscribe(result => {
          if (result.statusCode === 200) {
            if (result.data && result.data !== '') {
              this.ExamAllotmentInvigilators = result.data;
              const ExamAllotmentInvigilators = this.ExamAllotmentInvigilators.map(({ fk_exam_session_id }) => fk_exam_session_id);
              this.ExamAllotmentInvigilators = this.ExamAllotmentInvigilators.filter(({ fk_exam_session_id }, index) => !ExamAllotmentInvigilators.includes(fk_exam_session_id, index + 1));
              this.ExamAllotmentInvigilatorsList = this.ExamAllotmentInvigilators
              if (view == "view") {
                this.selectedEmp(this.examAttendanceForm.value.employeeId);
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
    else {
      this.crudService.listByTwoIds(this.getExamAllotmentInvigilatorsUrl, this.examAttendanceForm.value.collegeId, this.examAttendanceForm.value.examId, 'collegeId', 'examId')
        .subscribe(result => {
          if (result.statusCode === 200) {
            if (result.data && result.data !== '') {
              this.ExamAllotmentInvigilators = result.data;
              this.ExamAllotmentInvigilatorsList = result.data;
              if (view == "view") {
                this.selectedEmp(this.examAttendanceForm.value.employeeId);
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
  SearchEmployee(value) {
    this.ExamAllotmentInvigilatorsList = []
    this.SearchEmployees(value);
  }
  SearchEmployees(value: string) {
    let filter = value.toLowerCase();
    for (let i = 0; i < this.ExamAllotmentInvigilators.length; i++) {
      let option = this.ExamAllotmentInvigilators[i];
      if (option.invigilatorEmpName.toLowerCase().indexOf(filter) >= 0) {
        this.ExamAllotmentInvigilatorsList.push(option);
      }
      else if (option.invigilatorEmpNumber.toLowerCase().indexOf(filter) >= 0) {
        this.ExamAllotmentInvigilatorsList.push(option);
      }
    }
  }
  selectedRoom(): void {
    this.courseYears = [];
    this.examAttendanceForm.get('courseGroupId').setValue(0);
    this.examAttendanceForm.get('courseYearId').setValue(0);
    this.examStudentList = [];
    this.dataSource = new MatTableDataSource<any>(this.examStudentList);
  }

  calDays(): void {
    this.examDate = this.genericFunctions.momentWithDateFormatYMD(this.examAttendanceForm.value.examDate); // new Date(this.data.issueTodate);
    this.examStudentList = [];
    this.dataSource = new MatTableDataSource<any>(this.examStudentList);
  }

  checkedItems(check, index, item): void {
    if (isEmpty(this.absents)) {
      this.absents = [];
    }
    for (let i = 0; i < this.absents.length; i++) {
      if (this.absents[i].roll_number == item.roll_number) {
        this.absents.splice(i, 1)
      }
    }
    if (item.is_present == true) {
      this.absents.push(item)
    }
  }

  markItems(): void {
    this.absents = [];
    // tslint:disable-next-line: prefer-for-of
    for (let i = 0; i < this.examStudentList.length; i++) {
      if (!this.check) {
        this.examStudentList[i].checked = true;
        this.examStudentList[i].is_present = true;
      } else {
        this.examStudentList[i].checked = false;
        this.examStudentList[i].is_present = false;
        this.absents.push(this.examStudentList[i]);
      }
    }
  }
  addAttendance(): void {
    this.examStudentList1 = [];

    for (let i = 0; i < this.examStudentList.length; i++) {
      this.examStudentList1.push({
        examStdDetId: this.examStudentList[i].pk_exam_std_det_id,
        examId: this.examStudentList[i].fk_exam_id,
        studentId: this.examStudentList[i].fk_student_id,
        examName: this.examStudentList[i].exam_name,
        courseYearName: this.examStudentList[i].course_year_code,
        examTypeCode: this.examStudentList[i].exam_type,
        rollNumber: this.examStudentList[i].roll_number,
        hallticketNo: this.examStudentList[i].roll_number,
        attendanceTakenEmpId: this.examStudentList[i].fk_attendance_taken_emp_id,
        attendanceTakenDate: this.examStudentList[i].attendance_taken_date,
        subjectName: this.examStudentList[i].subject_name,
        isPresent: this.examStudentList[i].is_present,
        isufm: this.examStudentList[i].isufm,
        isActive: true
      })
    }
    this.spinner.show();
    this.crudService.update1(this.examStudentDetailsUrl, this.examStudentList1)
      .subscribe(result => {
        this.spinner.hide();
        if (result.success === true) {
          if (result.statusCode === 200) {
            this.snotifyService.success(result.message, 'Success!');
            this.getStudentsList();
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

  goBack(): void {
    this._location.back();
  }
  printpage() {
    this.examStudentList[0].examSessionName = this.examSessionDetails?.examSessionName,
      this.examStudentList[0].sessionStartTime = this.examSessionDetails?.sessionStartTime,
      this.examStudentList[0].sessionEndTime = this.examSessionDetails?.sessionEndTime
    this.router.navigate(['admin-examination-management/admin-post-examination/exam-attendance-marking-sheet/print-exam-attendance-marking-sheet'],
      {
        queryParams: {
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
        // examSessionId: this.examAttendanceForm.value.examSessionId,
        examDate: this.examAttendanceForm.value.examDate,
      }
    ]
    this.paramaters.examAttendanceMarking = queryparams;

  }
  printStickers() {
    this.router.navigate(['admin-examination-management/admin-post-examination/exam-attendance-marking-sheet/print-barcode-stickers'])
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
        // examSessionId: this.examAttendanceForm.value.examSessionId,
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
            this.rooms = this.rooms.sort((a, b) => (a.roomCode < b.roomCode ? -1 : 1));
            this.rooms1 = this.rooms
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
  uploadFiles() {
    this.formData = new FormData();
    if (this.fileInput.nativeElement.files.length > 0) {
      this.formData.append('examInvEmployeeId',
        this.examAttendanceForm.value.employeeId,
      );
      this.formData.append('examTimetableId',
        this.ExamAllotmentList[0]?.examTimeTableId,
      );
      this.formData.append('studentAttendance',
        this.fileInput.nativeElement.files[0],
        this.fileInput.nativeElement.files[0].name);
    }
    this.crudService.upload(this.uploadInvigilatorAttendanceSheetUrl, this.formData)
      .subscribe(result => {
        this.spinner.hide();
        if (result.statusCode === 200) {
          if (result.data && result.data) {
            this.snotifyService.success(result.message, 'Success!');
            this.getExamAllotmentInvigilators("view");
            this.getStudentsList();

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
  openFile(path): void {
    window.open(this.miniopath + path, '_blank', 'width=700,height=600');
  }
}
