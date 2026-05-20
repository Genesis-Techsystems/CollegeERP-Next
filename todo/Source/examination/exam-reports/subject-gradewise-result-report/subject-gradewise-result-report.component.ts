import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { CONSTANTS } from 'app/main/common/constants';
import { Router } from '@angular/router';
import { SnotifyService } from 'ng-snotify';
import { CrudService } from 'app/main/services/crud.service';
import { NgxSpinnerService } from 'ngx-spinner';
import * as XLSX from 'xlsx';
import { GenericFunctions } from 'app/main/common/generic-functions';

@Component({
  selector: 'app-subject-gradewise-result-report',
  templateUrl: './subject-gradewise-result-report.component.html',
  styleUrls: ['./subject-gradewise-result-report.component.scss']
})
export class SubjectGradewiseResultReportComponent implements OnInit {

  displayedColumns: string[] = []
  dataSource = new MatTableDataSource<Element>();

  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild(MatSort) sort: MatSort;
  @ViewChild('TABLE') excelTable: ElementRef;

  private examFiltersByCodeUrl = CONSTANTS.examFiltersByCodeUrl;
  private collegeCrudUrl = CONSTANTS.collegeCrudUrl;
  private generalDetailsUrl = CONSTANTS.generalDetailsUrl;
  private generalDetailsByCodeUrl = CONSTANTS.generalDetailsByCodeUrl;
  private examFeeType = CONSTANTS.examFeeType;
  private isActive = CONSTANTS.isActive;
  private ResultFinalAnalysisUrl = CONSTANTS.ResultFinalAnalysisUrl;

  staffForm: FormGroup;
  dashboard: any
  filtersDetailsList = [];
  marksListDetails = [];
  gradesDetailsList = [];
  CollegesListDetails = [];
  colleges = [];
  examsList = [];
  searchExams = [];
  filteredExams: any;
  examData = [];
  examsLists = [];
  fromDate: string;
  toDate: string;
  panelOpenState = true;
  step = 0;
  collegeCode: any;
  exam: any;
  collegeName: any;
  collegeLogo = [];
  courses = [];
  courseGroups = [];
  courseYears = [];
  courseListData = [];
  groupList = [];
  courseYearsList = [];
  courseGroupname;
  courseYearName;
  orgCode = '';
  Logo: any;
  examName: any;
  collegeLists = [];
  academicYears = [];
  academicYearsList = [];
  examListDetails = [];
  collegeFilterDetails = [];
  examFeeTypesList = [];
  examFeeTypes = [];

  trafoItem = "Subject & GradeWise Report";

  constructor(private formBuilder: FormBuilder, private snotifyService: SnotifyService,
    private crudService: CrudService, private spinner: NgxSpinnerService, private router: Router,
    private genericFunctions: GenericFunctions) {
    this.dashboard = CONSTANTS.dashboard;
    this.orgCode = localStorage.getItem('orgCode');
  }

  ngOnInit(): void {
    this.staffForm = this.formBuilder.group({
      collegeId: ['', Validators.required],
      academicYearId: ['', Validators.required],
      examId: ['', Validators.required],
      examTypeCatdetId: ['', Validators.required],
      courseId: ['', Validators.required],
      courseGroupId: [0],
      courseYearId: [0],
    });
    this.getFiltersList();
    this.dataSource = new MatTableDataSource<any>(this.gradesDetailsList);
    setTimeout(() => this.dataSource.paginator = this.paginator);
    this.dataSource.sort = this.sort;
  }
  reset(): void {
    this.staffForm.get('collegeId').setValue('');
    this.staffForm.get('examId').setValue('');
    this.staffForm.get('courseId').setValue('');
    this.staffForm.get('courseGroupId').setValue('');
    this.staffForm.get('courseYearId').setValue('');
    this.gradesDetailsList = [];
  }
  getFiltersList(): void {
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
  // tslint:disable-next-line:typedef
  selectedCourse(courseId) {
    this.staffForm.get('courseGroupId').setValue(0);
    this.staffForm.get('courseYearId').setValue(0);
    this.staffForm.get('examId').setValue(0);
    this.staffForm.get('collegeId').setValue(0);
    this.staffForm.get('academicYearId').setValue(0);
    this.staffForm.get('examTypeCatdetId').setValue(0);
    this.examFeeTypesList = [];
    this.examFeeTypes = [];
    this.academicYears = [];
    this.collegeFilterDetails = [];
    this.CollegesListDetails = [];
    this.colleges = []
    this.courseGroups = [];
    this.courseYears = [];
    this.searchExams = [];
    this.examsList = [];
    this.searchExams = [];
    this.academicYearsList = [];
    this.examData = [];
    this.groupList = [];
    this.courseYearsList = [];
    this.gradesDetailsList = [];
    /*----------- ACADEMIC YEAR -----------*/
    this.academicYearsList = this.examListDetails.filter(x => (x.fk_course_id === this.staffForm.value.courseId))
    if (this.academicYearsList.length > 0) {
      const academicYearsList = this.academicYearsList.map(({ fk_academic_year_id }) => fk_academic_year_id);
      this.academicYears = this.academicYearsList.filter(({ fk_academic_year_id }, index) => !academicYearsList.includes(fk_academic_year_id, index + 1));
    }
    if (this.academicYears.length > 0) {
      this.academicYears = this.academicYears.sort((a, b) => parseInt(b.academic_year) - parseInt(a.academic_year));
      this.staffForm.get('academicYearId').setValue(this.academicYears[0].fk_academic_year_id);
      this.selectedAcademicYear(this.staffForm.value.academicYearId)
    }
  }
  selectedAcademicYear(academicYearId) {
    this.staffForm.get('courseGroupId').setValue(0);
    this.staffForm.get('courseYearId').setValue(0);
    this.staffForm.get('examId').setValue(0);
    this.staffForm.get('collegeId').setValue(0);
    this.staffForm.get('examTypeCatdetId').setValue(0);
    this.examFeeTypesList = [];
    this.examFeeTypes = [];
    this.collegeFilterDetails = [];
    this.CollegesListDetails = [];
    this.colleges = []
    this.courseGroups = [];
    this.courseYears = [];
    this.searchExams = [];
    this.examsList = [];
    this.searchExams = [];
    this.examsLists = [];
    this.examData = [];
    this.groupList = [];
    this.courseYearsList = [];
    this.gradesDetailsList = [];
    /*----------- EXAM LIST -----------*/
    this.examsLists = this.examListDetails.filter(x => (x.fk_course_id === this.staffForm.value.courseId && x.fk_academic_year_id === this.staffForm.value.academicYearId))
    if (this.examsLists.length > 0) {
      const examsLists = this.examsLists.map(({ fk_exam_id }) => fk_exam_id);
      this.examsList = this.examsLists.filter(({ fk_exam_id }, index) => !examsLists.includes(fk_exam_id, index + 1));
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
    this.staffForm.get('collegeId').setValue(0);
    this.staffForm.get('examTypeCatdetId').setValue(0);
    this.examFeeTypesList = [];
    this.examFeeTypes = [];
    this.collegeFilterDetails = [];
    this.CollegesListDetails = [];
    this.colleges = [];
    this.groupList = [];
    this.courseGroups = [];
    this.courseYears = [];
    this.courseYearsList = [];
    this.gradesDetailsList = [];
    if (examId != null && examId !== undefined) {
      this.getExamTypes(examId);
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
  getExamTypes(examId) {
    this.staffForm.get('examTypeCatdetId').setValue(0);
    this.examFeeTypesList = [];
    this.examFeeTypes = [];
    this.gradesDetailsList = [];
    if (examId != null && examId !== undefined) {
      this.crudService.listDetailsByTwoIds(this.generalDetailsUrl, this.examFeeType, 'true', this.generalDetailsByCodeUrl, this.isActive)
        .subscribe(result => {
          if (result.statusCode === 200) {
            if (result.data.resultList && result.data.resultList !== '') {
              this.examFeeTypesList = result.data.resultList;
              if (this.examFeeTypesList && this.examFeeTypesList.length > 0) {
                for (let i = 0; i < this.examFeeTypesList.length; i++) {
                  if (this.examsList.filter(x => (x.fk_exam_id === this.staffForm.value.examId))[0]?.is_regular_exam) {
                    if (this.examFeeTypesList[i].generalDetailCode === 'Regular') {
                      this.examFeeTypes.push(this.examFeeTypesList[i]);
                    }
                  }
                  if (this.examsList.filter(x => (x.fk_exam_id === this.staffForm.value.examId))[0]?.is_supply_exam) {
                    if (this.examFeeTypesList[i].generalDetailCode === 'Supple') {
                      this.examFeeTypes.push(this.examFeeTypesList[i]);
                    }
                  }
                  if (this.examsList.filter(x => (x.fk_exam_id === this.staffForm.value.examId))[0]?.is_internal_exam) {
                    if (this.examFeeTypesList[i].generalDetailCode === 'Internal') {
                      this.examFeeTypes.push(this.examFeeTypesList[i]);
                    }
                  }
                }
              }
              if (this.examFeeTypes && this.examFeeTypes.length > 0) {
                this.staffForm.get('examTypeCatdetId').setValue(this.examFeeTypes[0]?.generalDetailId);
                this.selectedExamType(this.staffForm.value.examTypeCatdetId);
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
  selectedExamType(examTypeCatdetId) {
    this.gradesDetailsList = [];
  }
  selectedYear(courseYearId): void {
    this.gradesDetailsList = [];
  }
  selectedCollege(collegeId): void {
    this.staffForm.get('courseGroupId').setValue(0);
    this.staffForm.get('courseYearId').setValue(0);
    this.groupList = [];
    this.courseGroups = [];
    this.courseYears = [];
    this.courseYearsList = [];
    this.gradesDetailsList = [];
    /*----------- COURSE GROUP -----------*/
    this.collegeName = this.colleges.filter(x => x.fk_college_id == this.staffForm.value.collegeId)[0].college_name
    this.examName = this.examsList.filter(x => (x.fk_exam_id == this.staffForm.value.examId))[0].exam_name;
    this.groupList = this.CollegesListDetails.filter(x => (x.fk_college_id === this.staffForm.value.collegeId))
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
    this.gradesDetailsList = [];
    /*----------- COURSES YEARS -----------*/
    if(courseGroupId !== 0){
        this.courseYearsList = this.CollegesListDetails.filter(x => (x.fk_college_id === this.staffForm.value.collegeId && x.fk_course_group_id == this.staffForm.value.courseGroupId));
    }else{
        this.courseYearsList = this.CollegesListDetails.filter(x => (x.fk_college_id === this.staffForm.value.collegeId));
    }
    if (this.courseYearsList.length > 0) {
      const courseYearsList = this.courseYearsList.map(({ fk_course_year_id }) => fk_course_year_id);
      this.courseYears = this.courseYearsList.filter(({ fk_course_year_id }, index) => !courseYearsList.includes(fk_course_year_id, index + 1));
      this.courseYears = this.courseYears.sort((a, b) => a.year_order - b.year_order)
    }
    if (this.courseYears.length > 0) {
      this.staffForm.get('courseYearId').setValue(this.courseYears[0].fk_course_year_id);
    }
  }
  selectedCourseYear() {
    this.gradesDetailsList = [];
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
  getGradeList(): void {
    this.marksListDetails = []
    if (this.staffForm.valid) {
      this.collegeName = this.colleges.filter(x => x.fk_college_id == this.staffForm.value.collegeId)[0]?.college_name
      this.exam = this.examsList.filter(x => (x.fk_exam_id == this.staffForm.value.examId))[0]?.exam_name;
      this.courseGroupname = this.courseGroups.filter(x => (x.fk_course_group_id == this.staffForm.value.courseGroupId))[0]?.group_code;
      this.courseYearName = this.courseYears.filter(x => (x.fk_course_year_id == this.staffForm.value.courseYearId))[0]?.course_year_code;
      this.spinner.show();
      let request = [
        { paramName: 'in_flag', paramValue: 'final_group_subject_grade_results' },
        { paramName: 'in_exam_id', paramValue: this.staffForm.value.examId },
        { paramName: 'in_college_id', paramValue: this.staffForm.value.collegeId },
        { paramName: 'in_course_id', paramValue: this.staffForm.value.courseId },
        { paramName: 'in_course_group_id', paramValue: this.staffForm.value.courseGroupId },
        { paramName: 'in_course_year_id', paramValue: this.staffForm.value.courseYearId },
        { paramName: 'in_examtypecate_det_id', paramValue: this.staffForm.value.examTypeCatdetId },
      ];
      this.crudService.getDetailsByRequest(this.ResultFinalAnalysisUrl, '', request, '&')
        .subscribe(result => {
          this.spinner.hide();
          if (result.statusCode === 200) {
            if (result.data && result.data !== '' && result.data.result.length > 0) {
              this.getColleges()
              this.gradesDetailsList = result.data.result[0];
              this.dataSource = new MatTableDataSource<any>(this.gradesDetailsList);
              this.displayedColumns = Object.keys(this.gradesDetailsList[0]);
              this.displayedColumns.splice(0, 1);
              this.displayedColumns.splice(1, 1);
              this.dataSource.sort = this.sort;
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
    XLSX.writeFile(wb, 'Subject & GradeWise  Report.xlsx');

  }
  printPage() {
    window.print()
  }
}