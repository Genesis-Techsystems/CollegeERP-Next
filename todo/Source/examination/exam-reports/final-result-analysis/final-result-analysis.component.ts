import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { FormGroup, FormBuilder, Validators, FormControl } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { CONSTANTS } from 'app/main/common/constants';
import { Router, ActivatedRoute } from '@angular/router';
import { SnotifyService } from 'ng-snotify';
import { CrudService } from 'app/main/services/crud.service';
import { NgxSpinnerService } from 'ngx-spinner';
import * as XLSX from 'xlsx';
import * as moment from 'moment';
import { GenericFunctions } from 'app/main/common/generic-functions';
import { GlobalService } from 'app/main/services/global.service';

@Component({
  selector: 'app-final-result-analysis',
  templateUrl: './final-result-analysis.component.html',
  styleUrls: ['./final-result-analysis.component.scss']
})
export class FinalResultAnalysisComponent implements OnInit {

  displayedColumns: string[] = ['sno', 'course', 'courseGroup', 'courseyear', 'section', 'Subject', 'enrolled', 'present', 'internalmarks'];
  dataSource: MatTableDataSource<any>;

  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild(MatSort) sort: MatSort;
  @ViewChild('TABLE') excelTable: ElementRef;


  private collegeCrudUrl = CONSTANTS.collegeCrudUrl;
  private getExamFiltersBycodeUrl = CONSTANTS.getExamFiltersBycodeUrl;
  private generalDetailsUrl = CONSTANTS.generalDetailsUrl;
  private generalDetailsByCodeUrl = CONSTANTS.generalDetailsByCodeUrl;
  private examFeeType = CONSTANTS.examFeeType;
  private isActive = CONSTANTS.isActive;
  private ResultFinalAnalysisUrl = CONSTANTS.ResultFinalAnalysisUrl;

  staffForm: FormGroup;
  dashboard: any
  filtersDetailsList = [];
  marksListDetails = [];
  marksDetailsList = [];
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
  trafoItem = " Internal Marks Report";
  collegeCode: any;
  exam: any;
  searchText = '';
  courses = [];
  courseListData = [];
  courseGroups = [];
  courseYears = [];
  groupList = [];
  courseYearsList = [];
  collegeName: string;
  courseGroup;
  courseCode;
  courseGroupName;
  courseYearName;
  orgCode = '';
  collegeLogo = [];
  Logo: any;
  examName: any;
  collegeLists = [];
  academicYearsList = [];
  academicYears = [];
  courseGroupList: any[];
  regulationFilterList: any[];
  CollegesListFilterDetails: any[];
  examFeeTypesList = [];
  examFeeTypes = [];


  constructor(private route: ActivatedRoute, private formBuilder: FormBuilder, private snotifyService: SnotifyService,
    private crudService: CrudService, private spinner: NgxSpinnerService, private router: Router, private _globalService: GlobalService,
    private dialog: MatDialog, private genericFunctions: GenericFunctions) {
    this.dashboard = CONSTANTS.dashboard;
    this.orgCode = localStorage.getItem('orgCode');
  }

  ngOnInit(): void {
    this.staffForm = this.formBuilder.group({
      collegeId: ['', Validators.required],
      academicYearId: ['', Validators.required],
      courseId: ['', Validators.required],
      courseGroupId: [0],
      courseYearId: [0],
      examId: ['', Validators.required],
      examTypeCatdetId: ['', Validators.required],
    });
    this.getFiltersList();
    this.dataSource = new MatTableDataSource<any>(this.marksDetailsList);
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
    this.collegeName = localStorage.getItem('currentCollege')
  }
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
    this.staffForm.get('academicYearId').setValue('')
    this.staffForm.get('examId').setValue('');
    this.staffForm.get('collegeId').setValue('');
    this.staffForm.get('courseGroupId').setValue('');
    this.staffForm.get('courseYearId').setValue('');
    this.staffForm.get('examTypeCatdetId').setValue(0);
    this.examFeeTypesList = [];
    this.examFeeTypes = [];
    this.examsList = [];
    this.filtersDetailsList = []
    this.courseGroups = []
    this.courseYearsList = []
    this.regulationFilterList = []
    this.academicYears = []
    this.academicYearsList = []
    if (courseId != null) {
      this.academicYearsList = this.CollegesListFilterDetails.filter(x => (x.fk_course_id == this.staffForm.value.courseId));
      this.courseCode = this.courses.filter(x => x.fk_course_id == this.staffForm.value.courseId)[0]?.course_code;
      if (this.academicYearsList.length > 0) {
        const academicYears = this.academicYearsList.map(({ fk_academic_year_id }) => fk_academic_year_id);
        this.academicYears = this.academicYearsList.filter(({ fk_academic_year_id }, index) => !academicYears.includes(fk_academic_year_id, index + 1));
      }
      if (this.academicYears.length > 0) {
        this.academicYears = this.academicYears.sort((a, b) => parseInt(b?.academic_year) - parseInt(a?.academic_year));
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
    this.staffForm.get('examTypeCatdetId').setValue(0);
    this.examFeeTypesList = [];
    this.examFeeTypes = [];
    this.examsList = [];
    this.examsLists = []
    this.examData = []
    this.filtersDetailsList = []
    this.courseGroups = []
    this.courseYearsList = []
    this.regulationFilterList = []
    this.marksDetailsList = [];
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
    this.staffForm.get('collegeId').setValue('');
    this.staffForm.get('courseGroupId').setValue('');
    this.staffForm.get('courseYearId').setValue('');
    this.staffForm.get('examTypeCatdetId').setValue(0);
    this.examFeeTypesList = [];
    this.examFeeTypes = [];
    this.filtersDetailsList = [];
    this.courseGroups = [];
    this.courseYearsList = [];
    this.regulationFilterList = [];
    this.marksDetailsList = [];
    if (examId !== null && examId !== undefined) {
      this.getExamTypes(examId);
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
                this.colleges = []
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
  }
  getExamTypes(examId) {
    this.staffForm.get('examTypeCatdetId').setValue(0);
    this.examFeeTypesList = [];
    this.examFeeTypes = [];
    this.marksDetailsList = [];
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
    this.marksDetailsList = [];
  }
  selectedCollege(collegeId): void {
    this.staffForm.get('courseGroupId').setValue('');
    this.staffForm.get('courseYearId').setValue('');
    this.courseGroups = [];
    this.courseGroupList = [];
    this.courseGroups = [];
    this.courseYearsList = [];
    this.marksDetailsList = [];
    if (collegeId != null) {
      this.collegeCode = this.colleges.filter(x => (x.fk_college_id === collegeId))[0].college_code;
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
    this.courseYearsList = [];
    this.courseYears = [];
    this.marksDetailsList = [];
    if (courseGroupId !== 0) {
      this.courseYearsList = this.CollegesListDetails.filter(x => (x.fk_college_id == this.staffForm.value.collegeId && x.fk_course_group_id == courseGroupId));
    } else {
      this.courseYearsList = this.CollegesListDetails.filter(x => (x.fk_college_id == this.staffForm.value.collegeId));
    }
    /*----------- COURSES Years -----------*/
    if (this.courseYearsList.length > 0) {
      const courseYearsList = this.courseYearsList.map(({ fk_course_year_id }) => fk_course_year_id);
      this.courseYears = this.courseYearsList.filter(({ fk_course_year_id }, index) => !courseYearsList.includes(fk_course_year_id, index + 1));
    }
    if (this.courseYears.length > 0) {
      this.courseYears = this.courseYears.sort((a, b) => a.year_order - b.year_order);
      this.staffForm.get('courseYearId').setValue(this.courseYears[0].fk_course_year_id);
      this.selectedYear(this.staffForm.value.courseYearId);
    }
  }
  selectedYear(courseYearId): void {
    this.marksDetailsList = [];
  }
  searchExam(value) {
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
  getMarksList(): void {
    this.marksDetailsList = [];
    if (this.staffForm.valid) {
      this.spinner.show();
      this.collegeCode = this.colleges.filter(x => (x.fk_college_id == this.staffForm.value.collegeId))[0]?.college_code;
      this.collegeName = this.colleges.filter(x => (x.fk_college_id == this.staffForm.value.collegeId))[0]?.college_name;
      this.courseCode = this.courses.filter(x => (x.fk_course_id == this.staffForm.value.courseId))[0]?.course_code;
      // this.exam = this.examsList.filter(x => x.fk_exam_id == this.staffForm.value.examId)[0]?.exam_name;
      this.courseGroupName = this.courseGroups.filter(x => (x.fk_course_group_id == this.staffForm.value.courseGroupId))[0]?.group_code;
      this.courseYearName = this.courseYears.filter(x => (x.fk_course_year_id == this.staffForm.value.courseYearId))[0]?.course_year_name;
      let request = [
        { paramName: 'in_flag', paramValue: 'final_result_analysis' },
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
              this.getColleges();
              this.marksDetailsList = result.data.result[0];
              this.exam = this.marksDetailsList[0]?.exam_label_name;
              this.dataSource = new MatTableDataSource<any>(this.marksDetailsList);
              this.dataSource.paginator = this.paginator;
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
    XLSX.writeFile(wb, 'Final Result Analysis.xlsx');

  }
  printPage() {
    window.print()
  }
}
