import { Component, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { Router } from '@angular/router';
import { CONSTANTS } from 'app/main/common/constants';
import { GenericFunctions } from 'app/main/common/generic-functions';
import { CrudService } from 'app/main/services/crud.service';
import { SnotifyService } from 'ng-snotify';
import { NgxSpinnerService } from 'ngx-spinner';

@Component({
  selector: 'app-view-exam-omr-sheets',
  templateUrl: './view-exam-omr-sheets.component.html',
  styleUrls: ['./view-exam-omr-sheets.component.scss']
})
export class ViewExamOmrSheetsComponent implements OnInit {

  private examFiltersByCodeUrl = CONSTANTS.examFiltersByCodeUrl;
  private getCollegeExamDetails = CONSTANTS.getCollegeExamDetails;

  filtersDetailsList: any;
  courseCodeList = [];
  evaluatorForm: FormGroup
  academicYear: any[];
  academicYearDuplicateList = [];
  examList: any[];
  ExamDuplicateList: any[];
  ExamListData: any[];
  step = 0
  minDate;
  maxDate;
  examTimetableId: any;
  examDateList: any[];
  ExamDateDuplicateList: any[];
  ExamDateListData: any[];
  summaryDetailsList = [];
  DetailsList = [];

  displayedColumns: string[] = ['id', 'invigilator_emp_name', 'room_name', 'total_students', 'attendance_marked', 'attendance_not_marked', 'presented_Students', 'no_oof_answerpaper_uploaded'];
  displayedColumns1: string[] = ['id', 'course_year_code', 'hallticket_number', 'student_name', 'subject_name', 'invigilator_emp_name', 'room_name', 'is_present_lbl', 'Status'];
  displayedColumnsGroup: string[] = ['id', 'course_year_code', 'group_code', 'total_students', 'attendance_marked', 'attendance_not_marked', 'presented_Students', 'no_oof_answerpaper_uploaded'];


  dataSource: MatTableDataSource<any>;
  dataSource1: MatTableDataSource<any>;
  GroupdataSource1: MatTableDataSource<any>;

  @ViewChild('paginator') paginator: MatPaginator;
  @ViewChild('paginator1') paginator1: MatPaginator;
  @ViewChild('paginator13') paginator3: MatPaginator;
  @ViewChild(MatSort) sort: MatSort;
  @ViewChild(MatSort) sort1: MatSort;

  flag: boolean;
  exam_name: any;
  examSessionsList: any[];
  examSessions: any[];
  GroupDetailsList = [];
  StudentList: any[];
  examSubjects = [];
  examDateSessionList = [];

  constructor(private formBuilder: FormBuilder, private snotifyService: SnotifyService,
    private crudService: CrudService, private spinner: NgxSpinnerService, private router: Router,
    private genericFunctions: GenericFunctions) {
  }

  ngOnInit(): void {
    this.evaluatorForm = this.formBuilder.group({
      courseId: ['', Validators.required],
      academicYearId: ['', Validators.required],
      examId: ['', Validators.required],
      examSessionId: ['', Validators.required],
      ExamDate: ['', Validators.required]
    })
    this.getFiltersList();
  }
  getFiltersList(): void {
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
              this.courseCodeList = this.examSubjects.filter(({ fk_course_id }, index) =>
                !courseCodeData.includes(fk_course_id, index + 1));
            }
            if (this.courseCodeList && this.courseCodeList.length > 0) {
              this.evaluatorForm.get('courseId').setValue(this.courseCodeList[0].fk_course_id);
              this.selectedCourse(this.evaluatorForm.value.courseId);
            }
          }
          else {
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
    this.flag = false
    this.academicYear = [];
    this.academicYearDuplicateList = [];
    this.examDateSessionList = [];
    this.evaluatorForm.get('academicYearId').setValue('')
    this.evaluatorForm.get('examId').setValue('')
    this.evaluatorForm.get('ExamDate').setValue('')
    this.evaluatorForm.get('examSessionId').setValue('')
    /*----------- ACADEMIC YEARS -----------*/
    if (courseId != null && courseId !== undefined) {
      this.academicYear = this.examSubjects.filter(x => (x.fk_course_id === this.evaluatorForm.value.courseId))
      if (this.academicYear.length > 0) {
        const academicYears = this.academicYear.map(({ fk_academic_year_id }) => fk_academic_year_id);
        this.academicYearDuplicateList = this.academicYear.filter(({ fk_academic_year_id }, index) => !academicYears.includes(fk_academic_year_id, index + 1));
      }
      if (this.academicYearDuplicateList.length > 0) {
        this.academicYearDuplicateList = this.academicYearDuplicateList.sort((a, b) => parseInt(b.academic_year) - parseInt(a.academic_year))
        this.evaluatorForm.get('academicYearId').setValue(this.academicYearDuplicateList[0]?.fk_academic_year_id)
        this.selectedAcademicyr(this.evaluatorForm.value.academicYearId)
      }
    }

  }
  selectedAcademicyr(academicYearId) {
    this.flag = false;
    this.examList = [];
    this.ExamDuplicateList = []
    this.ExamListData = []
    this.examDateSessionList = [];
    this.evaluatorForm.get('examId').setValue('')
    this.evaluatorForm.get('ExamDate').setValue('')
    this.evaluatorForm.get('examSessionId').setValue('')
    /*----------- EXAM LIST -----------*/
    if (academicYearId !== null && academicYearId !== undefined) {
      this.ExamListData = this.examSubjects.filter(x => (x.fk_course_id === this.evaluatorForm.value.courseId && x.fk_academic_year_id === this.evaluatorForm.value.academicYearId))
      if (this.ExamListData.length > 0) {
        const examsLists = this.ExamListData.map(({ fk_exam_id }) => fk_exam_id);
        this.examList = this.ExamListData.filter(({ fk_exam_id }, index) =>
          !examsLists.includes(fk_exam_id, index + 1));
      }
      if (this.examList && this.examList.length > 0) {
        this.evaluatorForm.get('examId').setValue(this.examList[0]?.fk_exam_id)
        this.selectedExam(this.evaluatorForm.value.examId)
      }
    }
  }
  selectedExam(examId) {
    this.examDateList = [];
    this.ExamDateDuplicateList = []
    this.ExamDateListData = []
    this.examDateSessionList = [];
    this.evaluatorForm.get('ExamDate').setValue('')
    this.evaluatorForm.get('examSessionId').setValue('')
    if (examId != null && examId !== undefined) {
      this.exam_name = this.examList.filter(x => (x.fk_exam_id === examId))[0].exam_name;
      let request = [
        { paramName: 'in_flag', paramValue: 'univ_exam_rest_in_tt' },
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
              this.examDateSessionList = result.data.result;
              for (const list of this.examDateSessionList) {
                if (list?.length > 0 && list[0].flag === 'univ_exam_rest_filters') {
                  this.examDateList = list;
                  break;  // Stop looping once we find the first match
                }
              }
              /*----------- EXAM DATE -----------*/
              if (this.examDateList.length > 0) {
                const examDateList = this.examDateList.map(({ exam_date }) => exam_date);
                this.ExamDateListData = this.examDateList.filter(({ exam_date }, index) =>
                  !examDateList.includes(exam_date, index + 1));
                this.ExamDateListData = this.ExamDateListData.sort((a, b) => new Date(a.exam_date).getTime() - new Date(b.exam_date).getTime());
                this.ExamDateDuplicateList = this.ExamDateListData.sort((a, b) => new Date(a.exam_date).getTime() - new Date(b.exam_date).getTime());
              }
              if (this.ExamDateListData && this.ExamDateListData.length > 0) {
                this.evaluatorForm.get('ExamDate').setValue(this.ExamDateListData[0]?.exam_date)
                this.selectedExamDate(this.evaluatorForm.value.ExamDate);
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
  selectedExamDate(examdate) {
    this.flag = false
    this.examSessionsList = [];
    this.examSessions = []
    this.evaluatorForm.get('examSessionId').setValue('');
    /*----------- EXAM SESSION -----------*/
    this.examSessionsList = this.examSubjects.filter(x => (x.exam_date === examdate))
    if (this.examSessionsList && this.examSessionsList.length > 0) {
      const examSessions = this.examSessionsList.map(({ exam_session_name }) => exam_session_name);
      this.examSessions = this.examSessionsList.filter(({ exam_session_name }, index) =>
        !examSessions.includes(exam_session_name, index + 1));
    }
    if (this.examSessions && this.examSessions.length > 0) {
      this.evaluatorForm.get('examSessionId').setValue(this.examSessions[0]?.fk_exam_session_id)
      this.selectedSession(this.evaluatorForm.value.examSessionId)
    }
  }
  selectedSession(examSessionIds) {
    this.flag = false
    this.examTimetableId = this.examSessions.filter(x => (x.fk_exam_session_id == examSessionIds))[0].fk_exam_timetable_id;
  }
  searchExamDate(value) {
    this.ExamDateDuplicateList = []
    this.searchExamDates(value);
  }
  searchExamDates(value: string) {
    let filter = value.toLowerCase();
    for (let i = 0; i < this.ExamDateListData.length; i++) {
      let option = this.ExamDateListData[i];
      if (option.exam_date.toLowerCase().indexOf(filter) >= 0) {
        this.ExamDateDuplicateList.push(option);
      }
    }
  }
  getList() {
    this.spinner.show();
    this.flag = true
    this.summaryDetailsList = []
    this.DetailsList = []
    this.GroupDetailsList = []
    this.dataSource = new MatTableDataSource([]);
    this.dataSource1 = new MatTableDataSource([]);
    this.GroupdataSource1 = new MatTableDataSource([]);
    let request = [
      { paramName: 'in_flag', paramValue: 'exam_timetable_answerpaper_details' },
      { paramName: 'in_org_id', paramValue: +localStorage.getItem('organizationId') },
      { paramName: 'in_college_id', paramValue: 0 },
      { paramName: 'in_academic_year_id', paramValue: this.evaluatorForm.value.academicYearId },
      { paramName: 'in_isadmin', paramValue: 0 },
      { paramName: 'in_exam_id', paramValue: this.evaluatorForm.value.examId },
      { paramName: 'in_timetable_id', paramValue: this.examTimetableId },
      { paramName: 'in_exam_date', paramValue: '1990-01-01' },
      { paramName: 'in_loginuser_empid', paramValue: 0 },
      { paramName: 'in_loginuser_roleid', paramValue: 0 },
      { paramName: 'in_subject_id', paramValue: 0 },
    ];
    this.crudService.getDetailsByRequest(this.getCollegeExamDetails, '', request, '&')
      .subscribe(result => {
        this.spinner.hide();
        if (result.statusCode === 200) {
          if (result.data && result.data !== '' && result.data.result.length > 0) {
            this.summaryDetailsList = result.data.result[0];
            this.DetailsList = result.data.result[1];
            this.GroupDetailsList = result.data.result[2];

            this.dataSource = new MatTableDataSource(this.DetailsList);
            setTimeout(() => this.dataSource.paginator = this.paginator);
            this.dataSource.sort = this.sort;

            this.dataSource1 = new MatTableDataSource(this.summaryDetailsList);
            setTimeout(() => this.dataSource1.paginator = this.paginator1);
            this.dataSource1.sort = this.sort;

            this.GroupdataSource1 = new MatTableDataSource(this.GroupDetailsList);
            setTimeout(() => this.GroupdataSource1.paginator = this.paginator1);
            this.GroupdataSource1.sort = this.sort;
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
  getTotalStudents() {
    return this.dataSource1.filteredData.map(t => t.total_students).reduce((acc, value) => acc + value, 0);
  }
  getTotalAttendanceNotMarked() {
    return this.dataSource1.filteredData.map(t => t.attendance_not_marked).reduce((acc, value) => acc + value, 0);
  }
  getTotalAttendancetMarked() {
    return this.dataSource1.filteredData.map(t => t.attendance_marked).reduce((acc, value) => acc + value, 0);
  }
  getPresentedStudents() {
    return this.dataSource1.filteredData.map(t => t.presented_Students).reduce((acc, value) => acc + value, 0);
  }
  getAnswerpaperUploaded() {
    return this.dataSource1.filteredData.map(t => t.no_oof_answerpaper_uploaded).reduce((acc, value) => acc + value, 0);
  }
  applyFilter(filterValue) {
    this.dataSource.filter = filterValue.trim().toLowerCase();
    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
  }
  applySummaryFilter(filterValue) {
    this.dataSource1.filter = filterValue.trim().toLowerCase();
    if (this.dataSource1.paginator) {
      this.dataSource1.paginator.firstPage();
    }
  }
  applyGroupFilter(filterValue) {
    this.GroupdataSource1.filter = filterValue.trim().toLowerCase();
    if (this.GroupdataSource1.paginator) {
      this.GroupdataSource1.paginator.firstPage();
    }
  }
  clickTotalStudent(row, value) {
    this.StudentList = []
    this.dataSource = new MatTableDataSource([]);
    if (value == 'All') {
      this.StudentList = this.DetailsList.filter(x => x.invigilator_emp_name == row.invigilator_emp_name)
      this.dataSource = new MatTableDataSource(this.StudentList);
      setTimeout(() => this.dataSource.paginator = this.paginator);
      this.dataSource.sort = this.sort;
    }
    else {
      this.dataSource = new MatTableDataSource(this.DetailsList);
      setTimeout(() => this.dataSource.paginator = this.paginator);
      this.dataSource.sort = this.sort;
    }
  }
}