import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatDialog } from '@angular/material/dialog';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { CONSTANTS } from 'app/main/common/constants';
import { SnotifyService } from 'ng-snotify';
import { CrudService } from 'app/main/services/crud.service';
import { NgxSpinnerService } from 'ngx-spinner';
import { GenericFunctions } from 'app/main/common/generic-functions';
import { Router } from '@angular/router';
import * as XLSX from 'xlsx';

@Component({
  selector: 'app-examcenter-colleges-report',
  templateUrl: './examcenter-colleges-report.component.html',
  styleUrls: ['./examcenter-colleges-report.component.scss']
})
export class ExamcenterCollegesReportComponent implements OnInit {

  private collegewisedetailsUrl = CONSTANTS.collegewisedetailsUrl;
  private UnivExamCentersUrl = CONSTANTS.UnivExamCentersUrl;
  private isActive = CONSTANTS.isActive;
  private UnivEcCollegesUrl = CONSTANTS.UnivEcCollegesUrl;
  private getExamMasterDetailsUrl = CONSTANTS.getExamMasterDetailsUrl;
  MINIO = CONSTANTS.MINIO;

  filtersDetailsList = [];
  CollegesListDetails = [];
  courses = [];
  academicYears = []
  searchExams = [];
  examsList = [];
  academicYearsList = [];
  examData = [];
  examsLists = [];
  univExamCenters = [];
  colleges = [];
  collegeLists = [];
  examColleges = [];
  examCenterColleges = [];

  staffForm: FormGroup;
  courseName: any;
  academicYearName: any;
  examsName: any;
  examCenterName: any;
  Logo: any;
  panelOpenState = true;
  step = 0;
  flag = false;
  orgCode;

  displayedColumns: string[] = ['id', 'examcenter', 'exam', 'college'];
  dataSource: MatTableDataSource<any>;

  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild(MatSort) sort: MatSort;
  @ViewChild('TABLE') excelTable: ElementRef;

  constructor(private snotifyService: SnotifyService, private genericFunctions: GenericFunctions, private dialog: MatDialog,
    private crudService: CrudService, private spinner: NgxSpinnerService, public router: Router, private formBuilder: FormBuilder,) {

    this.getFiltersList();
    this.orgCode = localStorage.getItem('orgCode');
  }

  ngOnInit(): void {
    this.staffForm = this.formBuilder.group({
      academicYearId: ['', Validators.required],
      courseId: ['', Validators.required],
      examId: ['', Validators.required],
      univExamcenterId: ['', Validators.required],
    });
    this.dataSource = new MatTableDataSource(this.examCenterColleges);
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
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

            const courseList = this.CollegesListDetails.map(({ fk_course_id }) => fk_course_id);
            this.courses = this.CollegesListDetails.filter(({ fk_course_id }, index) =>
              !courseList.includes(fk_course_id, index + 1));
          }
          if (this.courses.length > 0) {
            this.staffForm.get('courseId').setValue(this.courses[0].fk_course_id);
            this.selectedCourse(this.staffForm.value.courseId);
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
  // tslint:disable-next-line:typedef
  selectedCourse(courseId) {
    this.staffForm.get('examId').setValue(0);
    this.staffForm.get('academicYearId').setValue(0);
    this.academicYears = []
    this.searchExams = [];
    this.examsList = [];
    this.searchExams = [];
    this.academicYearsList = [];
    this.examData = [];
    this.examCenterColleges = [];
    this.flag = false;
    this.academicYearsList = this.CollegesListDetails.filter(x => (x.fk_course_id == this.staffForm.value.courseId))
    if (this.academicYearsList.length > 0) {
      const academicYearsList = this.academicYearsList.map(({ fk_academic_year_id }) => fk_academic_year_id);
      this.academicYears = this.academicYearsList.filter(({ fk_academic_year_id }, index) => !academicYearsList.includes(fk_academic_year_id, index + 1));

    }
    if (this.academicYears.length > 0) {
      this.staffForm.get('academicYearId').setValue(this.academicYears[0].fk_academic_year_id);
      this.selectedAcademicYear(this.staffForm.value.academicYearId)
    }
  }
  selectedAcademicYear(academicYearId) {
    this.staffForm.get('examId').setValue(0);
    this.searchExams = [];
    this.examsList = [];
    this.searchExams = [];
    this.examsLists = [];
    this.examData = [];
    this.examCenterColleges = [];
    this.flag = false;
    this.examsLists = this.CollegesListDetails.filter(x => (x.fk_course_id == this.staffForm.value.courseId && x.fk_academic_year_id == this.staffForm.value.academicYearId))
    if (this.examsLists.length > 0) {
      const examsLists = this.examsLists.map(({ fk_exam_id }) => fk_exam_id);
      this.examsList = this.examsLists.filter(({ fk_exam_id }, index) => !examsLists.includes(fk_exam_id, index + 1));
      this.examsList = this.examsList.filter(x => !x.is_internal_exam)
      this.examData = this.examsList;
    }
    if (this.examsList.length > 0) {
      this.staffForm.get('examId').setValue(this.examsList[0].fk_exam_id);
      this.selectedExam(this.examsList[0].fk_exam_id)
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
    this.spinner.show();
    this.univExamCenters = [];
    this.examCenterColleges = [];
    this.flag = false;
    /*---------- GET Bags --------------*/
    this.crudService.listDetailsById(this.UnivExamCentersUrl, 'true', this.isActive)
      .subscribe(result => {
        this.spinner.hide();
        if (result.statusCode === 200) {
          if (result.data.resultList && result.data.resultList !== '') {
            this.univExamCenters = result.data.resultList;
            if (this.univExamCenters.length > 0) {
              this.staffForm.get('univExamcenterId').setValue(this.univExamCenters[0].univExamcenterId);
              this.headerData();
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
  headerData() {
    this.examsName = this.examsList.filter(x => (x.fk_exam_id == this.staffForm.value.examId))[0]?.exam_name
    this.academicYearName = this.academicYears.filter(x => (x.fk_academic_year_id == this.staffForm.value.academicYearId))[0]?.academic_year
    this.courseName = this.courses.filter(x => (x.fk_course_id == this.staffForm.value.courseId))[0]?.course_code
    this.examCenterName = this.univExamCenters.filter(x => (x.univExamcenterId == this.staffForm.value.univExamcenterId))[0]?.examcenterName
    this.Logo = this.univExamCenters.filter(x => (x.univExamcenterId == this.staffForm.value.univExamcenterId))[0]?.universityLogoFileName
  }
  getexamCenterColleges() {
    this.spinner.show();
    this.examCenterColleges = [];
    this.flag = false;
    this.crudService.listDetailsByThreeIds(this.UnivEcCollegesUrl, this.staffForm.value.univExamcenterId, this.staffForm.value.examId,
      'true', 'univExamCenters.univExamcenterId', this.getExamMasterDetailsUrl, this.isActive)
      .subscribe(result => {
        this.spinner.hide();
        if (result.statusCode === 200) {
          if (result.data && result.data !== '') {
            this.examCenterColleges = result.data.resultList;
            this.dataSource = new MatTableDataSource(this.examCenterColleges);
            this.dataSource.paginator = this.paginator;
            this.dataSource.sort = this.sort;
            this.flag = true;
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
  // tslint:disable-next-line:typedef
  applyFilter(filterValue: string) {
    this.dataSource.filter = filterValue.trim().toLowerCase();

    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
  }
  exportAsExcel() {
    const ws: XLSX.WorkSheet = XLSX.utils.table_to_sheet(this.excelTable.nativeElement);
    const wb: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');

    /* save to file */
    XLSX.writeFile(wb, 'Exam Center Colleges Report.xlsx');

  }
  printPage() {
    window.print()
  }
}