import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { CONSTANTS } from 'app/main/common/constants';
import { College } from 'app/main/models/college';
import { Course } from 'app/main/models/course';
import { CourseGroup } from 'app/main/models/courseGroup';
import { CourseYear } from 'app/main/models/courseYearRegulation';
import { Router, ActivatedRoute } from '@angular/router';
import { SnotifyService } from 'ng-snotify';
import { CrudService } from 'app/main/services/crud.service';
import { NgxSpinnerService } from 'ngx-spinner';
import { GenericFunctions } from 'app/main/common/generic-functions';
import { GridComponent } from '@syncfusion/ej2-angular-grids';
import { GlobalService } from 'app/main/services/global.service';

@Component({
  selector: 'app-jntu-grafting-analysis-report',
  templateUrl: './jntu-grafting-analysis-report.component.html',
  styleUrls: ['./jntu-grafting-analysis-report.component.scss']
})
export class JntuGraftingAnalysisReportComponent implements OnInit {
  panelOpenState = true;

  private collegeCrudUrl = CONSTANTS.collegeCrudUrl;
  private collegewisedetailsUrl = CONSTANTS.collegewisedetailsUrl;
  private resultprocessingUrl = CONSTANTS.ResultProcessingUrl;
  MINIO = CONSTANTS.MINIO;

  filtersDetailsList = [];
  CollegesListDetails = [];
  CollegeIdData = [];
  staffForm: FormGroup;
  colleges: College[] = [];
  courses: Course[] = [];
  courseGroups: CourseGroup[] = [];
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
  examRegisteredStudents = [];
  searchText = ''

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
  trafoItem = "Grafting Analysis Report";
  collegeName: string;
  examName: any;
  Logo: any;
  orgCode = '';


  constructor(private route: ActivatedRoute, private formBuilder: FormBuilder, private snotifyService: SnotifyService,
    private crudService: CrudService, private spinner: NgxSpinnerService, private router: Router, private _globalService: GlobalService,
    private dialog: MatDialog, private genericFunctions: GenericFunctions) {
    this.dashboard = CONSTANTS.dashboard;
    this.getFiltersList();
    this.isAdmin = JSON.parse(localStorage.getItem('isAdmin'));
    this.orgCode = localStorage.getItem('orgCode');
  }

  ngOnInit(): void {
    this.staffForm = this.formBuilder.group({
      collegeId: ['', Validators.required],
      courseId: ['', Validators.required],
      courseGroupId: ['', Validators.required],
      courseYearId: ['', Validators.required],
      examId: ['', Validators.required],
    });
  }
  getFiltersList(): void {
    this.spinner.show();
    let request = [
      { paramName: 'in_flag', paramValue: 'clg_exam_timetable_filters' },
      { paramName: 'in_org_id', paramValue: +localStorage.getItem('organizationId') },
      { paramName: 'in_college_id', paramValue: 0 },
      { paramName: 'in_course_id', paramValue: 0 },
      { paramName: 'in_course_group_id', paramValue: 0 },
      { paramName: 'in_course_year_id', paramValue: 0 },
      { paramName: 'in_group_section_id', paramValue: 0 },
      { paramName: 'in_academic_year_id', paramValue: 0 },
      { paramName: 'in_dept_id', paramValue: 0 },
      { paramName: 'in_isadmin', paramValue: 0 },
      { paramName: 'in_loginuser_empid', paramValue: +localStorage.getItem('employeeId') },
      { paramName: 'in_loginuser_roleid', paramValue: 0 },
      { paramName: 'in_employee', paramValue: '' },
      { paramName: 'in_subject', paramValue: '' },
      { paramName: 'in_gm_codes', paramValue: '' },
    ];
    this.crudService.getDetailsByRequest(this.collegewisedetailsUrl, '', request, '&')
      .subscribe(result => {
        this.spinner.hide();
        if (result.statusCode === 200) {
          if (result.data && result.data !== '' && result.data.result.length > 0) {
            this.filtersDetailsList = result.data.result;
            for (let i = 0; i < this.filtersDetailsList.length; i++) {
              if (this.filtersDetailsList[i].length > 0 && this.filtersDetailsList[i][0].flag === 'clg_exam_timetable_filters') {
                this.CollegesListDetails = this.filtersDetailsList[i];
              }
            }
            const CollegeIdData = this.CollegesListDetails.map(({ fk_college_id }) => fk_college_id);
            this.colleges = this.CollegesListDetails.filter(({ fk_college_id }, index) =>
              !CollegeIdData.includes(fk_college_id, index + 1));
            if (this.colleges.length > 0) {
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
  selectedCollege(collegeId): void {
    this.staffForm.get('courseId').setValue('');
    this.staffForm.get('courseGroupId').setValue(0);
    this.staffForm.get('courseYearId').setValue(0);
    this.courses = [];
    this.courseGroups = [];
    this.courseYears = [];
    this.searchExams = [];
    this.courseListData = [];
    this.academicYearsList = [];
    this.examRegisteredStudents = [];
    /*----------- COURSES -----------*/
    this.courseListData = this.CollegesListDetails.filter(x => (x.fk_college_id == collegeId))
    if (this.courseListData.length > 0) {
      const courseList = this.courseListData.map(({ fk_course_id }) => fk_course_id);
      this.courses = this.courseListData.filter(({ fk_course_id }, index) =>
        !courseList.includes(fk_course_id, index + 1));
    }
    if (this.courses.length > 0) {
      this.staffForm.get('courseId').setValue(this.courses[0].fk_course_id);
      this.selectedCourse(this.staffForm.value.courseId);
    }
  }

  // tslint:disable-next-line:typedef
  selectedCourse(courseId) {
    this.staffForm.get('courseGroupId').setValue(0);
    this.staffForm.get('courseYearId').setValue(0);
    this.staffForm.get('examId').setValue(0);
    this.courseGroups = [];
    this.courseYears = [];
    this.searchExams = [];
    this.examsList = [];
    this.searchExams = [];
    this.examsLists = [];
    this.examData = [];
    this.examRegisteredStudents = [];
    this.examsLists = this.CollegesListDetails.filter(x => (x.fk_college_id == this.staffForm.value.collegeId && x.fk_course_id == this.staffForm.value.courseId))
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
    this.staffForm.get('courseGroupId').setValue(0);
    this.staffForm.get('courseYearId').setValue(0);
    this.courseGroups = [];
    this.courseYears = [];
    this.groupList = [];
    this.examRegisteredStudents = [];
    this.collegeName = this.colleges.filter(x => x.fk_college_id == this.staffForm.value.collegeId)[0].college_name
    this.examName = this.examsList.filter(x => (x.fk_exam_id == this.staffForm.value.examId))[0].exam_name;
    this.groupList = this.CollegesListDetails.filter(x => (x.fk_college_id == this.staffForm.value.collegeId && x.fk_course_id == this.staffForm.value.courseId && x.fk_exam_id == this.staffForm.value.examId))
    if (this.groupList.length > 0) {
      const groupList = this.groupList.map(({ fk_course_group_id }) => fk_course_group_id);
      this.courseGroups = this.groupList.filter(({ fk_course_group_id }, index) => !groupList.includes(fk_course_group_id, index + 1));
    }
    if (this.courseGroups.length > 0) {
      this.staffForm.get('courseGroupId').setValue(this.courseGroups[0].fk_course_group_id);
      this.selectedGroup(this.staffForm.value.courseGroupId);
    }
  }
  selectedGroup(courseGroupId): void {
    this.staffForm.get('courseYearId').setValue(0);
    this.courseYears = [];
    this.courseYearsList = [];
    this.examRegisteredStudents = [];
    /*----------- COURSES Years -----------*/
    this.courseYearsList = this.CollegesListDetails.filter(x => (x.fk_college_id == this.staffForm.value.collegeId && x.fk_course_id == this.staffForm.value.courseId && x.fk_exam_id == this.staffForm.value.examId && x.fk_course_group_id == this.staffForm.value.courseGroupId))
    if (this.courseYearsList.length > 0) {
      const courseYearsList = this.courseYearsList.map(({ fk_course_year_id }) => fk_course_year_id);
      this.courseYears = this.courseYearsList.filter(({ fk_course_year_id }, index) => !courseYearsList.includes(fk_course_year_id, index + 1));
      this.courseYears = this.courseYears.sort((a, b) => a.year_order - b.year_order)
    }
    if (this.courseYears.length > 0) {
      this.staffForm.get('courseYearId').setValue(this.courseYears[0].fk_course_year_id);
    }
  }
  selectedYear() {
    this.examRegisteredStudents = [];
  }
  // tslint:disable-next-line:typedef
  reset(): void {
    this.staffForm.get('courseId').setValue('');
    this.staffForm.get('examId').setValue('');
    this.staffForm.get('courseGroupId').setValue('');
    this.staffForm.get('courseYearId').setValue('');
    this.examRegisteredStudents = [];
  }
  getDetails() {
    if (this.staffForm.valid) {
      this.examRegisteredStudents = [];
      this.spinner.show();
      this.collegeCode = this.colleges.filter(x => (x.fk_college_id == this.staffForm.value.collegeId))[0]?.college_code;
      this.Logo = this.colleges.filter(x => (x.fk_college_id == this.staffForm.value.collegeId))[0]?.logo_filename;
      this.courseCode = this.courses.filter(x => x.fk_course_id == this.staffForm.value.courseId)[0]?.course_code;
      this.courseGroupCode = this.courseGroups.filter(x => x.fk_course_group_id == this.staffForm.value.courseGroupId)[0]?.group_code;
      this.courseYearCode = this.courseYears.filter(x => x.fk_course_year_id == this.staffForm.value.courseYearId)[0]?.course_year_name;
      this.exam = this.examsList.filter(x => x.fk_exam_id == this.staffForm.value.examId)[0]?.exam_name;
      this.selectedData();
      let request = [
        { paramName: 'in_flag', paramValue: 'exam_analysis_by_subject_grafting' },
        { paramName: 'in_exam_id', paramValue: this.staffForm.value.examId },
        { paramName: 'in_examtype', paramValue: 0 },
        { paramName: 'in_college_id', paramValue: this.staffForm.value.collegeId },
        { paramName: 'in_course_id', paramValue: this.staffForm.value.courseId },
        { paramName: 'in_course_group_id', paramValue: this.staffForm.value.courseGroupId },
        { paramName: 'in_course_year_id', paramValue: this.staffForm.value.courseYearId },
      ];
      this.crudService.getDetailsByRequest(this.resultprocessingUrl, '', request, '&')
        .subscribe(result => {
          this.spinner.hide();
          if (result.statusCode === 200) {
            if (result.data && result.data !== '' && result.data.result.length > 0) {
              this.examRegisteredStudents = result.data.result[0];
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
  Print() {
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
