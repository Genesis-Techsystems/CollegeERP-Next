import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { ActivatedRoute, Router } from '@angular/router';
import { CONSTANTS } from 'app/main/common/constants';
import { GenericFunctions } from 'app/main/common/generic-functions';
import { AcademicYear } from 'app/main/models/academicYear';
import { College } from 'app/main/models/college';
import { FeeCategory } from 'app/main/models/feeCategory';
import { CrudService } from 'app/main/services/crud.service';
import { SnotifyService } from 'ng-snotify';
import { NgxSpinnerService } from 'ngx-spinner';

@Component({
  selector: 'app-batchwise-sgpa-report',
  templateUrl: './batchwise-sgpa-report.component.html',
  styleUrls: ['./batchwise-sgpa-report.component.scss']
})
export class BatchwiseSgpaReportComponent implements OnInit {

  dataSource: MatTableDataSource<any>;

  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild(MatSort) sort: MatSort;
  @ViewChild('excelTable', { static: false }) excelTable!: ElementRef;
  trafoItem = "Detention Report";

  private collegeWiseDetails = CONSTANTS.collegeWiseDetailsUrl;
  private collegeCrudUrl = CONSTANTS.collegeCrudUrl;
  private batchCrudUrl = CONSTANTS.batchCrudUrl;
  private getDetailsByUniversityIdUrl = CONSTANTS.getDetailsByUniversityIdUrl;
  private FeeStructureUrl = CONSTANTS.FeeStructureUrl;
  private academicYearCrudUrl = CONSTANTS.academicYearCrudUrl;
  private getDetailsByCollegeIdUrl = CONSTANTS.getDetailsByCollegeIdUrl;
  private isActive = CONSTANTS.isActive;

  staffForm: FormGroup;
  filtersDetailsList = [];
  filtersdata = [];
  academicyears = [];
  academicYearData = [];
  feeStructures: any[] = [];
  colleges: College[] = [];
  defaultAcademicYear: number;
  academicYears: AcademicYear[] = [];
  totalCount = 0;
  pageIndex = 0;
  collegeLogo = [];
  courseYearsList: any[] = [];
  courseYears: any[] = [];
  subjectWiseresult: any[] = [];
  examRegisteredStudents: any[] = [];
  studentsList: any[] = [];
  subjects: any[] = [];
  subjectCodes: any[] = [];
  newList: any[] = [];
  CollegesListDetails: any[] = [];
  courseGroups: any[] = [];
  courseGroupList: any[] = [];
  dynamicColumns: string[] = [];
  displayedColumns: string[] = [];
  Logo: any;
  collegeName;
  isPrintMode: boolean = false;
  pageSize = 0;
  panelOpenState = true;
  step = 0;
  examSubjectStats = [];
  params: any = {};
  check = 1;
  batches = [];
  mainList = [];
  courseData = [];
  courses = [];
  batchesFilter = [];
  batchesData = [];
  flag = false;
  isAcademicFee: any;

  constructor(private route: ActivatedRoute, private formBuilder: FormBuilder, private dialog: MatDialog,
    private snotifyService: SnotifyService, private genericFunctions: GenericFunctions,
    private crudService: CrudService, private spinner: NgxSpinnerService, public router: Router) {
    this.defaultAcademicYear = +localStorage.getItem('academicYearId');
    // this.getFeeStructures();

    this.route.queryParams
      .subscribe(params => {
        if (!this.isEmptyObject(params)) {
          this.params = params;
          this.isAcademicFee = this.params.isAcademicFee === 'true';
        }
      });


  }

  // tslint:disable-next-line:typedef
  ngOnInit() {
    this.staffForm = this.formBuilder.group({
      collegeId: ['', Validators.required],
      courseId: [''],
      batchId: ['', Validators.required],
      academicYearId: [''],
      courseGroupId: [''],
      regulationId: [0],
    });

    // this.getData();
    this.getfilterDetails();
    this.dataSource = new MatTableDataSource(this.feeStructures);
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }


  // tslint:disable-next-line:typedef
  isEmptyObject(obj) {
    return (obj && (Object.keys(obj).length === 0));
  }
  clearReportData() {
  this.examSubjectStats = [];
  this.subjectCodes = [];
  this.displayedColumns = [];
  this.dataSource = new MatTableDataSource([]);
}

  getfilterDetails() {
    this.spinner.show()
    let request = [
      { paramName: 'in_flag', paramValue: 'clg_filters' },
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
      { paramName: 'in_subject', paramValue: '' },
      { paramName: 'in_employee', paramValue: '' },
      { paramName: 'in_gm_codes', paramValue: '' },
    ];
    this.crudService.getDetailsByRequest(this.collegeWiseDetails, '', request, '&')
      .subscribe(result => {
        if (result.statusCode === 200) {
          this.spinner.hide()
          if (result.data && result.data !== '' && result.data.result.length > 0) {
            this.filtersDetailsList = result.data.result;
            for (let i = 0; i < this.filtersDetailsList.length; i++) {
              if (this.filtersDetailsList[i].length > 0 && this.filtersDetailsList[i][0].flag === 'clg_filters') {
                this.filtersdata = this.filtersDetailsList[i];
              } else if (this.filtersDetailsList[i].length > 0 && this.filtersDetailsList[i][0].clg_filters_ay === 'clg_filters_ay') {
                this.academicYearData = this.filtersDetailsList[i];
              } else if (this.filtersDetailsList[i].length > 0 && this.filtersDetailsList[i][0].clg_filters_batches === 'clg_filters_batches') {
                this.batchesFilter = this.filtersDetailsList[i];
              }
            }
            /*----------- DISTINCT COLLEGE-----------*/
            const collegeList = this.filtersdata.map(({ fk_college_id }) => fk_college_id);
            this.colleges = this.filtersdata.filter(({ fk_college_id }, index) =>
              !collegeList.includes(fk_college_id, index + 1));
            if (!this.isEmptyObject(this.params) && this.colleges.length > 0) {
              this.staffForm.get('collegeId').setValue(+this.params.cId);
              this.selectedCollege(this.staffForm.value.collegeId);
            } else
              if (this.colleges && this.colleges.length > 0) {
                this.colleges = this.colleges.sort((a, b) => a.clg_sort_order - b.clg_sort_order);
                this.staffForm.get('collegeId').setValue(this.colleges[0].fk_college_id);
                this.selectedCollege(this.staffForm.value.collegeId);
              }
          } else {
            this.snotifyService.success(result.message, 'Success!');
          }
        } else {
          this.spinner.hide()
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

  this.examSubjectStats = [];
  this.subjectCodes = [];
  this.displayedColumns = [];

  if (this.staffForm.valid) {

    this.spinner.show();

    const request = [
      { paramName: 'in_flag', paramValue: 'batch_wise' },
      { paramName: 'in_college_id', paramValue: this.staffForm.value.collegeId },
      { paramName: 'in_course_id', paramValue: this.staffForm.value.courseId },
      { paramName: 'in_course_group_id', paramValue: this.staffForm.value.courseGroupId },
      { paramName: 'in_course_year_id', paramValue: 0 },
      { paramName: 'in_exam_id', paramValue: 0 },
      { paramName: 'in_batch_id', paramValue: this.staffForm.value.batchId },
      { paramName: 'in_regulation_id', paramValue: 0 }
    ];

    this.crudService
      .getDetailsByRequest('getAllRecords/s_get_batchwise_sgpa', '', request, '&')
      .subscribe({

        next: (result) => {

          this.spinner.hide();

          if (result.statusCode === 200) {

            const resultData = result.data?.result;

            /* ---------- CHECK SECOND RESULT SET ---------- */

            if (!resultData || !Array.isArray(resultData[1]) || resultData[1].length === 0) {

              this.snotifyService.success('No Records Found', 'Success!');
              this.dataSource = new MatTableDataSource([]);
              return;

            }

            /* ---------- RESULT SET 1 : SEMESTERS ---------- */

            if (Array.isArray(resultData[0])) {
              this.subjectCodes = resultData[0];
            }

            /* ---------- RESULT SET 2 : STUDENT SGPA ---------- */

            if (Array.isArray(resultData[1])) {
              this.examSubjectStats = resultData[1];
            }

            /* ---------- PIVOT DATA ---------- */

            const studentMap: any = {};

            this.examSubjectStats.forEach(row => {

              if (!studentMap[row.hallticket_number]) {

                studentMap[row.hallticket_number] = {
                  hallticket_number: row.hallticket_number,
                  first_name: row.first_name
                };

              }

              const semester = this.subjectCodes.find(
                x => x.pk_course_year_id === row.fk_course_year_id
              );

              if (semester) {
                studentMap[row.hallticket_number][semester.course_year_code] = row.sgpa;
              }

            });

            const pivotData = Object.values(studentMap);

            this.dataSource = new MatTableDataSource(pivotData);

            setTimeout(() => {
              this.dataSource.paginator = this.paginator;
              this.dataSource.sort = this.sort;
            });

            /* ---------- TABLE COLUMNS ---------- */

            this.displayedColumns = [
              'sno',
              'hallticket_number',
              'first_name',
              ...this.subjectCodes.map(x => x.course_year_code)
            ];

          } else {

            this.snotifyService.error(result.message, 'Error!');

          }

        },

        error: (error) => {

          this.spinner.hide();

          if (error.error?.statusCode === 401) {
            this.snotifyService.error(error.error.message, 'Error!');
            this.genericFunctions.logOut(this.router.url);
          } else {
            this.snotifyService.error(CONSTANTS.message.CON_ERROR, 'Error!');
          }

        }

      });

  } else {

    this.snotifyService.warning('Please select all required fields.', 'Warning');

  }

}
  selectedCourse(courseId) {
this.clearReportData();
    this.staffForm.get('batchId').setValue('');
    this.staffForm.get('courseGroupId').setValue('');

    this.batchesData = [];
    this.batches = [];
    this.courseGroups = [];
    this.courseGroupList = [];

    this.flag = false;
    this.mainList = [];
    this.feeStructures = [];

    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;

    /* ---------------- COURSE GROUP FILTER ---------------- */

    this.courseGroupList = this.filtersdata.filter(
      x => (x.fk_course_id == this.staffForm.value.courseId)
    );

    if (this.courseGroupList && this.courseGroupList.length > 0) {

      const groupList = this.courseGroupList.map(
        ({ fk_course_group_id }) => fk_course_group_id
      );

      this.courseGroups = this.courseGroupList.filter(
        ({ fk_course_group_id }, index) =>
          !groupList.includes(fk_course_group_id, index + 1)
      );
    }

    /* ---------------- BATCH FILTER ---------------- */

    this.batchesData = this.batchesFilter.filter(
      x => (x.fk_course_id === this.staffForm.value.courseId)
    );

    if (this.batchesData && this.batchesData.length > 0) {

      const batchList = this.batchesData.map(
        ({ fk_batch_id }) => fk_batch_id
      );

      this.batches = this.batchesData.filter(
        ({ fk_batch_id }, index) =>
          !batchList.includes(fk_batch_id, index + 1)
      );
    }

    /* ---------------- DEFAULT VALUES ---------------- */

    if (!this.isEmptyObject(this.params) && this.batches.length > 0) {

      this.mainList = [];

      this.batches = this.batches.sort(
        (a, b) => parseInt(b.batch_name) - parseInt(a.batch_name)
      );

      this.staffForm.get('batchId').setValue(+this.params.batchId);

      this.selectedBatch(this.staffForm.value.batchId);

    }
    else if (this.batches && this.batches.length > 0) {

      this.batches = this.batches.sort(
        (a, b) => parseInt(b.batch_name) - parseInt(a.batch_name)
      );

      this.staffForm.get('batchId').setValue(this.batches[0].fk_batch_id);

      this.selectedBatch(this.staffForm.value.batchId);

    }

  }
  
  selectedGroup(courseGroupId): void {
    this.clearReportData(); 
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
  selectedBatch(batchId) {
    this.clearReportData();
    this.flag = true;
    this.feeStructures = [];
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;

  }
  selectedCollege(collegeId): void {
    this.clearReportData();
    this.batches = [];
    this.flag = false;
    this.feeStructures = [];
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
    /*----------- ACADEMIC YEARS -----------*/
    // this.batchesData = this.batchesFilter.filter(x=>(x.fk_course_id === this.staffForm.value.courseId));
    this.courseData = this.filtersdata.filter(x => (x.fk_college_id == this.staffForm.value.collegeId));
    if (this.courseData.length > 0) {
      const Course_Id = this.courseData.map(({ fk_course_id }) => fk_course_id);
      this.courses = this.courseData.filter(({ fk_course_id }, index) =>
        !Course_Id.includes(fk_course_id, index + 1));
    }
    if (!this.isEmptyObject(this.params) && this.courses.length > 0) {
      this.staffForm.get('courseId').setValue(+this.params.courseId);
      this.selectedCourse(this.staffForm.value.courseId);
    } else if (this.courses.length > 0) {
      this.staffForm.get('courseId').setValue(this.courses[0].fk_course_id);
      this.selectedCourse(this.staffForm.value.courseId);
    }

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


  }      // tslint:disable-next-line:typedef
  applyFilter(filterValue: string) {
    this.dataSource.filter = filterValue.trim().toLowerCase();

    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
  }


  //print functions(excel,print)

 exportAsExcel(): void {

  if (!this.excelTable) {
    console.error('Excel table not found');
    return;
  }

  const uri = 'data:application/vnd.ms-excel;base64,';

  const template = `
  <html xmlns:o="urn:schemas-microsoft-com:office:office"
        xmlns:x="urn:schemas-microsoft-com:office:excel"
        xmlns="http://www.w3.org/TR/REC-html40">
  <head>
  <meta charset="UTF-8">
  </head>
  <body>
  <table>{table}</table>
  </body>
  </html>`;

  const base64 = (s: string) =>
    window.btoa(unescape(encodeURIComponent(s)));

  const format = (s: string, c: any) =>
    s.replace(/{(\w+)}/g, (m, p) => c[p]);

  const ctx = {
    worksheet: 'BatchWiseSGPA',
    table: this.excelTable.nativeElement.innerHTML
  };

  const link = document.createElement('a');

  link.href = uri + base64(format(template, ctx));
  link.download = 'BatchWiseSGPA_Report.xls';
  link.click();
}

  Print() {
    this.isPrintMode = true;
    setTimeout(() => {
      window.print();
      this.isPrintMode = false;
    }, 500);
  }

}
