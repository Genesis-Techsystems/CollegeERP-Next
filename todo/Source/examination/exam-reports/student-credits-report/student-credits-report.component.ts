import { Component, OnInit, ElementRef } from '@angular/core';
import { CONSTANTS } from 'app/main/common/constants';
import { FormGroup, FormControl, FormBuilder, Validators } from '@angular/forms';
import { College } from 'app/main/models/college';
import { Course } from 'app/main/models/course';
import { CourseGroup } from 'app/main/models/courseGroup';
import { Regulations } from 'app/main/models/Rregulations';
import { CourseYear } from 'app/main/models/courseYearRegulation';
import { Subject, ReplaySubject } from 'rxjs';
import { Router } from '@angular/router';
import { SnotifyService } from 'ng-snotify';
import { CrudService } from 'app/main/services/crud.service';
import { NgxSpinnerService } from 'ngx-spinner';
import { GenericFunctions } from 'app/main/common/generic-functions';
import { takeUntil } from 'rxjs/operators';
import *  as moment from 'moment';
import { GridComponent } from '@syncfusion/ej2-angular-grids';
import { ViewChild } from '@angular/core';

@Component({
  selector: 'app-student-credits-report',
  templateUrl: './student-credits-report.component.html',
  styleUrls: ['./student-credits-report.component.scss']
})
export class StudentCreditsReportComponent implements OnInit {

  panelOpenState = true;

  private examFiltersByCodeUrl = CONSTANTS.examFiltersByCodeUrl;
  private collegeCrudUrl = CONSTANTS.collegeCrudUrl;
  private examStudentResultsUrl = CONSTANTS.examStudentResultsUrl;
  private studentSearchUrl = CONSTANTS.studentSearchUrl;
  private _onDestroy = new Subject<void>();
  public studentFilterCtrl: FormControl = new FormControl();
  public filteredStudents: ReplaySubject<any[]> = new ReplaySubject<any[]>(1);

  public examFilterCtrl: FormControl = new FormControl();
  public filteredExams: ReplaySubject<any[]> = new ReplaySubject<any[]>(1);
  public gridData: any[];
  public toolbar: string[];
  public pageSettings: Object;
  public grid: GridComponent;
  @ViewChild('grid')
  public initialPage: Object;

  staffForm: FormGroup;
  colleges: College[] = [];
  courses: Course[] = [];
  courseGroups: CourseGroup[] = [];
  regulations: Regulations[] = [];
  courseYears: CourseYear[] = [];
  step = 0;
  examRegisteredStudents: any[] = [];
  defaultAcademicYearId;
  fromDate;
  toDate;
  check = 1;
  startDate;
  studentAttendance = [];
  groupId;
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
  filtersDetailsList = [];
  CollegesListDetails = [];
  GmListDetails = [];
  CollegeIdData = [];
  courseList = [];
  courseYearList = [];
  empSecurity = [];
  isAdmin = false;
  collegeLogo = [];
  Logo: any;
  regulationsList = [];
  courseYearsList = [];
  groupList = [];
  examData = [];
  examsLists = [];
  academicYearsList = [];
  courseListData = [];
  examsListData = [];
  collegeName;
  collegeList = [];
  dataDetails = ' ';
  orgCode = '';
  trafoItem = "Student Credits Report";
  searchText = '';

  examListDetails = [];
  collegeFilterDetails = [];

  @ViewChild('excelTable', { static: false }) excelTable: ElementRef;

  constructor(private formBuilder: FormBuilder, private snotifyService: SnotifyService,
    private crudService: CrudService, private spinner: NgxSpinnerService, private router: Router,
    private genericFunctions: GenericFunctions) {
    this.isAdmin = JSON.parse(localStorage.getItem('isAdmin'));
    this.dashboard = CONSTANTS.dashboard;
    this.startDate = new Date();
    this.orgCode = localStorage.getItem('orgCode');
  }

  // tslint:disable-next-line:typedef
  ngOnInit() {
    this.staffForm = this.formBuilder.group({
      collegeId: [''],
      courseId: ['', Validators.required],
      creditsCount: [0],
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

    this.studentFilterCtrl.valueChanges
      .pipe(takeUntil(this._onDestroy))
      .subscribe(() => {
        this.filterStd();
      });

    this.searchStudents.push({ firstName: 'Search by student name or rollNo.' });
    this.filteredStudents.next(this.searchStudents.slice());
    this.examFilterCtrl.valueChanges
      .pipe(takeUntil(this._onDestroy))
      .subscribe(() => {
        this.filterExam();
      });
    this.searchExams.push({ examName: 'Search by Exam name.' });
    this.filteredExams.next(this.searchExams.slice());
    this.getFiltersList();
  }

  clear(e): void {
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

  goBack(): void {
    this.router.navigate([this.pageParams.path]);
  }

  /*================= DATE VALIDATION ================*/
  calDay(): void {
    const date1 = new Date(moment(this.staffForm.value.fDate).format()); // new Date(this.data.issueTodate);
    const date2 = new Date(moment(this.staffForm.value.tDate).format()); // new Date(returnDate);
    if (date1.getTime() > date2.getTime()) {
      this.examRegisteredStudents = [];
      this.staffForm.get('tDate').setValue(this.staffForm.value.fDate);
    }
  }
  getFiltersList(): void {
    this.filtersDetailsList = []
    this.CollegesListDetails = []
    this.colleges = []
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
                this.examListDetails = list;
                break;
              }
            }
            /*----------- COURSE -----------*/
            const courseList = this.examListDetails.map(({ fk_course_id }) => fk_course_id);
            this.courses = this.examListDetails.filter(({ fk_course_id }, index) =>
              !courseList.includes(fk_course_id, index + 1));
            if (this.courses.length > 0) {
              this.staffForm.get('courseId').setValue(this.courses[0].fk_course_id);
              this.selectedCourse(this.staffForm.value.courseId);
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
    this.staffForm.get('regulationId').setValue(0);
    this.staffForm.get('courseGroupId').setValue(0);
    this.staffForm.get('courseYearId').setValue(0);
    this.staffForm.get('studentId').setValue(0);
    this.staffForm.get('academicYearId').setValue(0);
    this.examRegisteredStudents = [];
    this.searchExams = [];
    this.searchExams.push({ examName: 'Search by Exam name.' });
    this.filteredExams.next(this.searchExams.slice());
    this.academicYearsList = [];
    this.academicYears = [];
    this.examsLists = [];
    this.examData = [];
    this.examsList = [];
    this.collegeFilterDetails = [];
    this.CollegesListDetails = [];
    this.colleges = [];
    this.groupList = [];
    this.courseGroups = [];
    this.courseYearsList = [];
    this.courseYears = [];
    /*----------- ACADEMIC YEAR -----------*/
    this.academicYearsList = this.examListDetails.filter(x => (x.fk_course_id === this.staffForm.value.courseId))
    if (this.academicYearsList.length > 0) {
      const academicYears = this.academicYearsList.map(({ fk_academic_year_id }) => fk_academic_year_id);
      this.academicYears = this.academicYearsList.filter(({ fk_academic_year_id }, index) => !academicYears.includes(fk_academic_year_id, index + 1));
    }
    if (this.academicYears.length > 0) {
      this.academicYears = this.academicYears.sort((a, b) => parseInt(b.academic_year) - parseInt(a.academic_year));
      this.staffForm.get('academicYearId').setValue(this.academicYears[0].fk_academic_year_id);
      this.selectedAcademicYear(this.staffForm.value.academicYearId)
    }
  }
  // tslint:disable-next-line:typedef
  selectedAcademicYear(academicYearId) {
    this.staffForm.get('examId').setValue(0);
    this.staffForm.get('courseGroupId').setValue(0);
    this.staffForm.get('courseYearId').setValue(0);
    this.staffForm.get('regulationId').setValue(0);
    this.searchExams = [];
    this.examRegisteredStudents = [];
    this.searchExams.push({ examName: 'Search by Exam name.' });
    this.filteredExams.next(this.searchExams.slice());
    this.examsLists = [];
    this.examData = [];
    this.examsList = [];
    this.collegeFilterDetails = [];
    this.CollegesListDetails = [];
    this.colleges = [];
    this.groupList = [];
    this.courseGroups = [];
    this.courseYearsList = [];
    this.courseYears = [];
    /*----------- EXAM LIST -----------*/
    this.examsLists = this.examListDetails.filter(x => (x.fk_course_id === this.staffForm.value.courseId && x.fk_academic_year_id === academicYearId))
    if (this.examsLists.length > 0) {
      const examsLists = this.examsLists.map(({ fk_exam_id }) => fk_exam_id);
      this.examsList = this.examsLists.filter(({ fk_exam_id }, index) => !examsLists.includes(fk_exam_id, index + 1));
      this.examsList = this.examsList.filter(x => !x.is_internal_exam)
      this.examData = this.examsList;
    }
    if (this.examsList.length > 0) {
      this.staffForm.get('examId').setValue(this.examsList[0].fk_exam_id);
      this.selectedExam(this.staffForm.value.examId)
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
    this.staffForm.get('collegeId').setValue(0);
    this.staffForm.get('regulationId').setValue(0);
    this.staffForm.get('courseGroupId').setValue(0);
    this.staffForm.get('courseYearId').setValue(0);
    this.examRegisteredStudents = [];
    this.groupList = [];
    this.courseGroups = [];
    this.regulations = [];
    this.collegeFilterDetails = [];
    this.CollegesListDetails = [];
    this.colleges = [];
    this.courseYearsList = [];
    this.courseYears = [];
    if (examId != null && examId !== undefined) {
      let request = [
        { paramName: 'in_flag', paramValue: 'univ_exam_rest_in_regexamstd' },
        { paramName: 'in_flag_type', paramValue: 'REGSUP' },
        { paramName: 'in_university_id', paramValue: 0 },
        { paramName: 'in_univ_examcenter_id', paramValue: 0 },
        { paramName: 'in_college_id', paramValue: 0 },
        { paramName: 'in_course_id', paramValue: this.staffForm.value.courseId },
        { paramName: 'in_course_group_id', paramValue: 0 },
        { paramName: 'in_course_year_id', paramValue: 0 },
        { paramName: 'in_exam_id', paramValue: this.staffForm.value.examId },
        { paramName: 'in_academic_year_id', paramValue: this.staffForm.value.academicYearId },
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
              /*----------- COLLEGES -----------*/
              const CollegeIdData = this.CollegesListDetails.map(({ fk_college_id }) => fk_college_id);
              this.colleges = this.CollegesListDetails.filter(({ fk_college_id }, index) =>
                !CollegeIdData.includes(fk_college_id, index + 1));
              if (this.colleges && this.colleges.length > 0) {
                this.colleges = this.colleges.sort((a, b) => a.clg_sort_order - b.clg_sort_order);
                this.staffForm.get('collegeId').setValue(this.colleges[0].fk_college_id);
                this.selectedCollege(this.staffForm.value.collegeId);
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
    this.staffForm.get('regulationId').setValue(0);
    this.staffForm.get('courseGroupId').setValue(0);
    this.staffForm.get('courseYearId').setValue(0);
    this.examRegisteredStudents = [];
    this.groupList = [];
    this.courseGroups = [];
    this.courseYearsList = [];
    this.courseYears = [];
    this.searchExams = [];
    this.regulationsList = [];
    this.regulations = [];
    /*----------- COURSE GROUP -----------*/
    this.groupList = this.CollegesListDetails.filter(x => (x.fk_college_id === this.staffForm.value.collegeId))
    if (this.groupList.length > 0) {
      const groupList = this.groupList.map(({ fk_course_group_id }) => fk_course_group_id);
      this.courseGroups = this.groupList.filter(({ fk_course_group_id }, index) => !groupList.includes(fk_course_group_id, index + 1));
    }
    if (this.courseGroups.length > 0) {
      this.staffForm.get('courseGroupId').setValue(this.courseGroups[0].fk_course_group_id);
      this.selectedGroup(this.staffForm.value.courseGroupId);
    } else {
      this.staffForm.get('courseGroupId').setValue(0);
    }
  }
  selectedGroup(courseGroupId): void {
    this.staffForm.get('regulationId').setValue('');
    this.staffForm.get('courseYearId').setValue(0);
    this.examRegisteredStudents = [];
    this.courseYears = [];
    this.courseYearsList = [];
    this.regulationsList = [];
    this.regulations = [];
    /*----------- COURSES YEARS -----------*/
    this.courseYearsList = this.CollegesListDetails.filter(x => (x.fk_college_id === this.staffForm.value.collegeId && x.fk_course_group_id === this.staffForm.value.courseGroupId))
    if (this.courseYearsList.length > 0) {
      const courseYearsList = this.courseYearsList.map(({ fk_course_year_id }) => fk_course_year_id);
      this.courseYears = this.courseYearsList.filter(({ fk_course_year_id }, index) => !courseYearsList.includes(fk_course_year_id, index + 1));
    }
    if (this.courseYears.length > 0) {
      this.staffForm.get('courseYearId').setValue(this.courseYears[0].fk_course_year_id);
      this.selectedYear(this.staffForm.value.courseYearId)
    }
    else {
      this.staffForm.get('courseYearId').setValue(0);
    }
  }
  selectedYear(courseYearId): void {
    this.staffForm.get('regulationId').setValue('');
    this.regulationsList = [];
    this.regulations = [];
    this.examRegisteredStudents = [];
    /*----------- REGULATION -----------*/
    this.regulationsList = this.CollegesListDetails.filter(x => (x.fk_college_id === this.staffForm.value.collegeId && x.fk_course_group_id === this.staffForm.value.courseGroupId
      && x.fk_course_year_id === this.staffForm.value.courseYearId
    ))
    if (this.regulationsList.length > 0) {
      const regulationsList = this.regulationsList.map(({ fk_regulation_id }) => fk_regulation_id);
      this.regulations = this.regulationsList.filter(({ fk_regulation_id }, index) => !regulationsList.includes(fk_regulation_id, index + 1));
    }
    if (this.regulations.length > 0) {
      this.staffForm.get('regulationId').setValue(this.regulations[0].fk_regulation_id);
      this.selectedRegulation();
    }
  }
  selectedRegulation(): void {
    this.examRegisteredStudents = [];
  }
  // tslint:disable-next-line:typedef
  dataRefresh() {
    this.examRegisteredStudents = [];
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
  selectedStd(): void {
    this.examRegisteredStudents = [];
    if (this.check === 2) {
      this.staffForm.get('collegeId').setValue(this.searchStudents.filter(x => (x.studentId === this.staffForm.value.studentId))[0].collegeId);
      this.staffForm.get('courseId').setValue(this.searchStudents.filter(x => (x.studentId === this.staffForm.value.studentId))[0].courseId);
      this.staffForm.get('academicYearId').setValue(this.searchStudents.filter(x => (x.studentId === this.staffForm.value.studentId))[0].academicYearId);
      this.selectedAcademicYear(this.searchStudents.filter(x => (x.studentId === this.staffForm.value.studentId))[0].academicYearId);
    }
  }
  selectedStudent(): void {
    this.examRegisteredStudents = [];
  }
  reset(): void {
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
  getDetails(): void {
    if (this.staffForm.valid) {
      this.spinner.show();
      this.examRegisteredStudents = [];
      this.collegeName = this.colleges.filter(x => x.fk_college_id == this.staffForm.value.collegeId)[0]?.college_name,
        this.collegeCode = this.colleges.filter(x => x.fk_college_id == this.staffForm.value.collegeId)[0]?.college_code,
        this.courseCode = this.courses.filter(x => x.fk_course_id == this.staffForm.value.courseId)[0]?.course_code
      this.examYear = this.academicYears.filter(x => x.fk_academic_year_id == this.staffForm.value.academicYearId)[0]?.academic_year;
      this.courseGroupCode = this.courseGroups.filter(x => x.fk_course_group_id == this.staffForm.value.courseGroupId)[0]?.group_code;
      this.courseYearCode = this.courseYears.filter(x => x.fk_course_year_id == this.staffForm.value.courseYearId)[0]?.course_year_code;
      this.exam = this.examsList.filter(x => x.fk_exam_id == this.staffForm.value.examId)[0]?.exam_name;
      this.regulationCode = this.regulations.filter(x => x.fk_regulation_id == this.staffForm.value.regulationId)[0]?.regulation_code;
      if (this.staffForm.value.studentId === '') {
        this.staffForm.get('studentId').setValue(0);
      }
      if (this.staffForm.value.creditsCount === null) {
        this.staffForm.get('creditsCount').setValue(0);
      }
      this.selectedData();
      this.getColleges();
      /*----------- STUDENTS -----------*/
      // tslint:disable-next-line:max-line-length
      this.crudService.listByTwelveIds(this.examStudentResultsUrl, 'std_summary', this.staffForm.value.examId, this.staffForm.value.courseId,
        this.staffForm.value.courseGroupId, this.staffForm.value.courseYearId, this.staffForm.value.collegeId, this.staffForm.value.studentId,
        this.staffForm.value.regulationId, '-1', 0, '-1', this.staffForm.value.creditsCount,
        'in_flag', 'in_exam_id', 'in_course_id', 'in_course_group_id', 'in_course_year_id', 'in_college_id', 'in_std_id',
        'in_regulation_id', 'in_ispass', 'in_subject_id', 'in_above_fail_subjects', 'in_below_credits')
        .subscribe(result => {
          this.spinner.hide();
          if (result.statusCode === 200) {
            if (result.success) {
              if (result.data.result[0].length > 0) {
                this.examRegisteredStudents = result.data.result[0];
                this.gridData = this.examRegisteredStudents;
                for (let idx = 0; idx < this.gridData.length; idx++) {
                  this.gridData[idx].id = idx + 1;
                  // this.gridData[idx].student_name = this.gridData[idx].student_name + ' ( ' +  this.gridData[idx].hallticket_no + ' ) ' ;
                  if (this.gridData[idx].total_internal_marks === null) {
                    this.gridData[idx].total_internal_marks = ' - ';
                  }
                  if (this.gridData[idx].total_external_marks === null) {
                    this.gridData[idx].total_external_marks = ' - ';
                  }
                  if (this.gridData[idx].total_pass_subjects === null) {
                    this.gridData[idx].total_pass_subjects = ' - ';
                  }
                  if (this.gridData[idx].total_fail_subjects === null) {
                    this.gridData[idx].total_fail_subjects = ' - ';
                  }
                }
              } else {
                this.snotifyService.success('No Records Found.', 'Success!');
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
  getColleges(): void {
    this.collegeLogo = [];
    this.Logo = [];
    /*----------- COLLEGES -----------*/
    this.crudService.listDetailsById(this.collegeCrudUrl, 'true', 'isActive')
      .subscribe(result => {
        if (result.statusCode === 200) {
          if (result.data.resultList && result.data.resultList !== '') {
            this.collegeLogo = result.data.resultList;
            this.Logo = this.collegeLogo.filter(x => (x.collegeId == this.staffForm.value.collegeId))[0].logo
            this.collegeName = this.collegeLogo.filter(x => (x.collegeId == this.staffForm.value.collegeId))[0].collegeName
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
  // tslint:disable-next-line: typedef
  selectedData() {
    if (this.collegeCode) {
      this.dataDetails = this.collegeCode;
    }
    if (this.courseCode) {
      this.dataDetails = this.dataDetails + ' / ' + this.courseCode;
    }
    if (this.examYear) {
      this.dataDetails = this.dataDetails + ' / ' + this.examYear;
    }
    if (this.regulationCode) {
      this.dataDetails = this.dataDetails + ' / ' + this.regulationCode;
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
  // tslint:disable-next-line:typedef
  selectedDate() {
    this.examRegisteredStudents = [];
  }
  selectedPass(): void {
    this.examRegisteredStudents = [];
  }
  selectedFlag(): void {
    this.examRegisteredStudents = [];
  }
  printPage() {
    window.print();
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
}