import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { ActivatedRoute, Router } from '@angular/router';
import { CONSTANTS } from 'app/main/common/constants';
import { GenericFunctions } from 'app/main/common/generic-functions';
import { CrudService } from 'app/main/services/crud.service';
import { GlobalService } from 'app/main/services/global.service';
import { SnotifyService } from 'ng-snotify';
import { NgxSpinnerService } from 'ngx-spinner';

@Component({
  selector: 'app-invigilators-remuneration-report',
  templateUrl: './invigilators-remuneration-report.component.html',
  styleUrls: ['./invigilators-remuneration-report.component.scss']
})
export class InvigilatorsRemunerationReportComponent implements OnInit {

  @ViewChild(MatPaginator, { static: false }) paginator!: MatPaginator;
  @ViewChild(MatSort) sort: MatSort;
  @ViewChild('excelTable', { static: false }) excelTable: ElementRef;
  searchText = ''
  staffForm: FormGroup;

  private collegeCrudUrl = CONSTANTS.collegeCrudUrl;
  private getExamFiltersBycodeUrl = CONSTANTS.getExamFiltersBycodeUrl;
  private generalDetailsUrl = CONSTANTS.generalDetailsUrl;
  private examFeeType = CONSTANTS.examFeeType;
  private generalDetailsByCodeUrl = CONSTANTS.generalDetailsByCodeUrl;
  private isActive = CONSTANTS.isActive;
  private resultprocessingUrl = CONSTANTS.ResultProcessingUrl;
  private finalInternalMarksUrl = CONSTANTS.finalInternalMarksUrl;
  private ouresultsheetUrl = CONSTANTS.ouresultsheetUrl;
  private InvigilatorRemunerationUrl = CONSTANTS.InvigilatorRemunerationUrl;

  dashboard: any
  filtersDetailsList = [];
  subjectWiseresult = [];
  CollegesListDetails = [];
  fullData: any[] = [];
  colleges = [];
  examsList = [];
  searchExams = [];
  dynamicColumns: string[] = [];
  displayedColumns: string[] = [];
  dataSource = new MatTableDataSource<any>();
  filteredExams: any;
  examData = [];
  examsLists = [];
  panelOpenState = true;
  step = 0;
  trafoItem = "Invigilation Remuneration Report";
  collegeCode: any;
  exam: any;
  dataDetails;
  courses = [];
  courseListData = [];
  courseGroups = [];
  courseYears = [];

  groupList = [];
  courseYearsList = [];
  isAdmin = false;
  courseGroup;
  courseCode;
  courseYear;
  collegeName;
  collegeLogo = [];
  orgCode = '';
  Logo: any;
  examName: any;
  academicYearsList = [];
  academicYears = [];
  collegeLists = [];
  CollegesListFilterDetails: any;
  regulationFilterList: any;
  courseGroupList: any[];
  examFeeTypesList = [];
  examFeeTypes = [];
  examRegisteredStudents = [];
  studentsList = [];
  subjects = [];
  subjectCodes = [];
  mainList = [];
  newList = [];

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
      examId: ['', Validators.required],

      studentId: [0],
    });
    this.getFiltersList();
    this.isAdmin = JSON.parse(localStorage.getItem('isAdmin'));

  }
  getFiltersList(): void {

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
    this.examFeeTypesList = [];
    this.examFeeTypes = [];
    this.academicYears = []
    this.examsList = [];


    this.courseGroups = []
    this.courseYearsList = []
    this.courseYears = []
    this.academicYearsList = []
    this.subjectWiseresult = [];
    this.examRegisteredStudents = [];
    this.studentsList = [];
    this.subjects = [];
    this.subjectCodes = [];
    this.mainList = [];
    this.newList = [];
    if (courseId != null) {
      this.academicYearsList = this.CollegesListFilterDetails.filter(x => (x.fk_course_id == this.staffForm.value.courseId));
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

    this.examFeeTypesList = [];
    this.examFeeTypes = [];
    this.examsList = [];


    this.courseGroups = []
    this.courseYearsList = []
    this.courseYears = []
    this.examsLists = []
    this.examData = []
    this.subjectWiseresult = [];
    this.examRegisteredStudents = [];
    this.studentsList = [];
    this.subjects = [];
    this.subjectCodes = [];
    this.mainList = [];
    this.newList = [];
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

    this.examFeeTypesList = [];
    this.examFeeTypes = [];

    this.colleges = []
    this.courseGroups = []
    this.courseYearsList = []
    this.courseYears = []
    this.subjectWiseresult = [];
    this.examRegisteredStudents = [];
    this.studentsList = [];
    this.subjects = [];
    this.subjectCodes = [];
    this.mainList = [];
    this.newList = [];
    if (examId != null && examId !== undefined) {
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
                this.courseGroups = []
                this.courseYearsList = []
                this.courseYears = []
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
  selectedCollege(collegeId): void {
    this.collegeCode = this.colleges.filter(x => (x.fk_college_id === collegeId))[0].college_code;
    this.courseGroups = []
    this.courseYearsList = []
    this.courseYears = []
    this.subjectWiseresult = [];
    this.examRegisteredStudents = [];
    this.studentsList = [];
    this.subjects = [];
    this.subjectCodes = [];
    this.mainList = [];
    this.newList = [];

    if (collegeId != null) {
      this.courseGroupList = []
      this.courseGroups = []
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
    this.subjectWiseresult = [];
    this.examRegisteredStudents = [];
    this.studentsList = [];
    this.subjects = [];
    this.subjectCodes = [];
    this.mainList = [];
    this.newList = [];
    if (courseGroupId === 0) {
      this.courseYearsList = this.CollegesListDetails.filter(x => (x.fk_college_id == this.staffForm.value.collegeId));
    } else {
      this.courseYearsList = this.CollegesListDetails.filter(x => (x.fk_college_id == this.staffForm.value.collegeId && x.fk_course_group_id == courseGroupId));
    }
    /*----------- COURSES Years -----------*/
    if (this.courseYearsList.length > 0) {
      const courseYearsList = this.courseYearsList.map(({ fk_course_year_id }) => fk_course_year_id);
      this.courseYears = this.courseYearsList.filter(({ fk_course_year_id }, index) => !courseYearsList.includes(fk_course_year_id, index + 1));
      this.courseYears = this.courseYears.sort((a, b) => a.cy_sort_order - b.cy_sort_order);
    }
    if (this.courseYears.length > 0) {
      this.staffForm.get('courseYearId').setValue(this.courseYears[0].fk_course_year_id);
    }
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

  reset(): void {
    this.staffForm.get('collegeId').setValue('');
    this.staffForm.get('courseId').setValue('');
    this.staffForm.get('examId').setValue('');

    this.subjectWiseresult = [];
    this.examRegisteredStudents = [];
    this.studentsList = [];
    this.subjects = [];
    this.subjectCodes = [];
    this.mainList = [];
    this.newList = [];
  }
  selectedData() {
    if (this.collegeCode) {
      this.dataDetails = this.collegeCode;
    }
    if (this.courseCode) {
      this.dataDetails = this.dataDetails + ' / ' + this.courseCode;
    }
    if (this.courseGroup) {
      this.dataDetails = this.dataDetails + ' / ' + this.courseGroup;
    }
    if (this.courseYear) {
      this.dataDetails = this.dataDetails + ' / ' + this.courseYear;
    }
    if (this.exam) {
      this.dataDetails = this.dataDetails + ' / ' + this.exam;
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
  getDetails() {

    this.examRegisteredStudents = [];
    this.studentsList = [];
    this.subjects = [];
    this.subjectCodes = [];
    this.mainList = [];
    this.newList = [];

    if (this.staffForm.valid) {

      this.spinner.show();

      this.collegeCode = this.colleges.find(x => x.fk_college_id == this.staffForm.value.collegeId)?.college_code;
      this.courseCode = this.courses.find(x => x.fk_course_id == this.staffForm.value.courseId)?.course_code;
      this.exam = this.examsList.find(x => x.fk_exam_id == this.staffForm.value.examId)?.exam_name;
      this.courseGroup = this.courseGroups.find(x => x.fk_course_group_id == this.staffForm.value.courseGroupId)?.group_code;
      this.courseYear = this.courseYears.find(x => x.fk_course_year_id == this.staffForm.value.courseYearId)?.course_year_code;

      this.getColleges();
      this.selectedData();

      let request = [

        { paramName: 'in_flag', paramValue: 'invigilators_remuneration' },

        { paramName: 'in_fdate', paramValue: '1990-01-01' },
        { paramName: 'in_tdate', paramValue: '1990-01-01' },

        { paramName: 'in_exam_id', paramValue: this.staffForm.value.examId },

        { paramName: 'in_subject_id', paramValue: 0 },
        { paramName: 'in_evalutor_profileid', paramValue: 0 },

        { paramName: 'in_exam_date', paramValue: '1990-01-01' },

        { paramName: 'in_emp_id', paramValue: 0 },
        { paramName: 'in_questionpaper_id', paramValue: 0 },

        { paramName: 'in_evaluator_role_id', paramValue: 0 },

        { paramName: 'in_academic_year', paramValue: 0 },
        { paramName: 'in_exam_short_name', paramValue: 0 },

        { paramName: 'in_affiliatedto_catdet_id', paramValue: 1 }

      ];

      this.crudService.getDetailsByRequest(
        this.InvigilatorRemunerationUrl,
        '',
        request,
        '&'
      ).subscribe(result => {

        this.spinner.hide();

        if (result.statusCode === 200) {

          if (result.data && result.data.result.length > 0) {

            this.examRegisteredStudents = result.data.result[0];
            this.fullData = this.examRegisteredStudents;
            if (this.examRegisteredStudents && this.examRegisteredStudents.length > 0) {
              // Get dynamic keys from first object
              this.dynamicColumns = Object.keys(this.examRegisteredStudents[0]);

              // Add S.No as first column
              this.displayedColumns = ['sno', ...this.dynamicColumns];
              this.dataSource = new MatTableDataSource<any>(this.examRegisteredStudents);
              setTimeout(() => {
                this.dataSource.paginator = this.paginator;
                this.dataSource.sort = this.sort;
              });
              this.dataSource = new MatTableDataSource<any>(this.examRegisteredStudents);
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

  }
  findMarks(subjectList: any[], subjectCode: string, markType: string): string | number {
    const subject = subjectList.find(item => item.subject_code === subjectCode);
    return subject ? subject[markType] : ' ';
  }
  getSerialNumber(index: number): number {
    if (!this.paginator) {
      return index + 1;
    }

    return (this.paginator.pageIndex * this.paginator.pageSize) + index + 1;
  }

  getRowTotal(list: any[]): number {
    return this.subjectCodes.reduce((sum, subj) => {
      const mark = Number(this.findMarks(list, subj.subject_code, 'marks'));
      return sum + (isNaN(mark) ? 0 : mark);
    }, 0);
  }
  Print() {
    window.print();
  }
  exportAsExcel() {

    const uri = 'data:application/vnd.ms-excel;base64,';

    const template = `
   <html xmlns:o="urn:schemas-microsoft-com:office:office"
         xmlns:x="urn:schemas-microsoft-com:office:excel"
         xmlns="http://www.w3.org/TR/REC-html40">
   <head>
   <!--[if gte mso 9]>
   <xml>
   <x:ExcelWorkbook>
   <x:ExcelWorksheets>
   <x:ExcelWorksheet>
   <x:Name>{worksheet}</x:Name>
   <x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions>
   </x:ExcelWorksheet>
   </x:ExcelWorksheets>
   </x:ExcelWorkbook>
   </xml>
   <![endif]-->
   </head>
   <body>
   <table border="1">{table}</table>
   </body>
   </html>`;

    const base64 = (s: string) => window.btoa(unescape(encodeURIComponent(s)));
    const format = (s: string, c: any) =>
      s.replace(/{(\w+)}/g, (m, p) => c[p]);

    /* -------- BUILD TABLE FROM FULL DATA -------- */

    let tableHTML = '<tr>';

    /* headers */

    this.displayedColumns.forEach(col => {
      tableHTML += `<th>${col}</th>`;
    });

    tableHTML += '</tr>';

    /* rows */

    const allRows = this.dataSource.data; // full dataset

    allRows.forEach((row, index) => {

      tableHTML += '<tr>';

      tableHTML += `<td>${index + 1}</td>`;

      this.dynamicColumns.forEach(col => {
        tableHTML += `<td>${row[col] ?? ''}</td>`;
      });

      tableHTML += '</tr>';

    });

    const ctx = {
      worksheet: 'Invigilator Remuneration Report',
      table: tableHTML
    };

    const link = document.createElement('a');
    link.download = `${this.trafoItem}.xls`;
    link.href = uri + base64(format(template, ctx));
    link.click();
  }
  applyFilter(filterValue: string) {

    if (!this.dataSource) return;

    this.dataSource.filter = filterValue.trim().toLowerCase();

    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }

  }

}
