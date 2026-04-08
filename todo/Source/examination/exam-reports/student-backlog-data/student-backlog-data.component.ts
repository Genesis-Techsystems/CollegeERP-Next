import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { SnotifyService } from 'ng-snotify';
import { NgxSpinnerService } from 'ngx-spinner';
import { ActivatedRoute, Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { RouterModule } from '@angular/router';
import { ChangeDetectorRef } from '@angular/core';


import { CONSTANTS } from 'app/main/common/constants';
import { CrudService } from 'app/main/services/crud.service';
import { FeeCategory } from 'app/main/models/feeCategory';
import { College } from 'app/main/models/college';
import { AcademicYear } from 'app/main/models/academicYear';
import { MatDialog } from '@angular/material/dialog';
import { GenericFunctions } from 'app/main/common/generic-functions';
import { MatRadioChange } from '@angular/material/radio';
import { EditStructureComponent } from 'app/main/apps/accounts-and-fees/fee-masters/fee-structure/edit-structure/edit-structure.component';
import { ViewStructureComponent } from 'app/main/apps/accounts-and-fees/fee-masters/fee-structure/view-structure/view-structure.component';

@Component({
  selector: 'app-student-backlog-data',
  templateUrl: './student-backlog-data.component.html',
  styleUrls: ['./student-backlog-data.component.scss']
})
export class StudentBacklogDataComponent implements OnInit {
  displayedColumns: string[] = [
    'siNo',
    'hallticket_number',
    'course_year_code',
    'failed_subjects',
    'semester_failed_count',
    'total_failed_count'
  ];

  dataSource: MatTableDataSource<FeeCategory>;

  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild(MatSort) sort: MatSort;
  @ViewChild('excelTable', { static: false }) excelTable!: ElementRef;
  trafoItem = "Student Backlog Data";

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
  examsList = [];
  defaultAcademicYear: number;
  academicYears: AcademicYear[] = [];
  totalCount = 0;
  pageIndex = 0;
  collegeLogo = [];
  isPrintMode: boolean = false;
  pageSize = 0;
  panelOpenState = true;
  step = 0;
  collegeName;
  examSubjectStats = [];
  params: any = {};
  exam: any;
  Logo: any;
  check = 1;
  batches = [];
  courseCodes = [];
  subjects = [];
  examRegisteredStudents = [];
  mainList = [];
  courseData = [];
  courses = [];
  batchesFilter = [];
  batchesData = [];
  flag = false;
  isAcademicFee: any;

  constructor(private route: ActivatedRoute, private formBuilder: FormBuilder, private dialog: MatDialog,
    private snotifyService: SnotifyService, private genericFunctions: GenericFunctions,
    private crudService: CrudService, private spinner: NgxSpinnerService, public router: Router, private cdr: ChangeDetectorRef) {
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
    this.examRegisteredStudents = [];
    this.mainList = [];
    this.courseCodes = [];

    if (this.staffForm.valid) {
      this.spinner.show();

      const request = [
        { paramName: 'in_flag', paramValue: 'STUDENT_FAILURE_SUMMARY' },
        { paramName: 'in_college_id', paramValue: this.staffForm.value.collegeId },
        { paramName: 'in_course_id', paramValue: this.staffForm.value.courseId },
        { paramName: 'in_course_group_id', paramValue: 0 },
        { paramName: 'in_course_year_id', paramValue: 0 },
        { paramName: 'in_exam_id', paramValue: 0 },
        { paramName: 'in_batch_id', paramValue: this.staffForm.value.batchId }
      ];

      this.crudService.getDetailsByRequest('getAllRecords/s_generate_exam_reports', '', request, '&')
        .subscribe({
          next: (result) => {
            this.spinner.hide();

            if (result.statusCode === 200) {
              const resultData = result.data?.result;
              if (Array.isArray(resultData) && Array.isArray(resultData[0])) {
                const flatRows = resultData[0] as any[];        // 2760 flat records

                // 1) Build dynamic semester columns from ALL rows
                const uniqueCourseYears = [...new Set(flatRows.map(x => x.course_year_code))];
                this.courseCodes = uniqueCourseYears.map(code => ({ course_year_code: code }));

                // 2) Group rows by hallticket_number => each table row is an ARRAY of that student's semester objects
                const groups: Record<string, any[]> = {};
                for (const r of flatRows) {
                  const key = r.hallticket_number;
                  if (!groups[key]) groups[key] = [];
                  groups[key].push(r);
                }
                this.mainList = Object.values(groups);          // Array< Array<semesterObj> >
                this.examRegisteredStudents = flatRows;         // keep for any other uses
                this.examSubjectStats = flatRows;               // if you gate rendering on this

                this.cdr.detectChanges();
              } else {
                this.mainList = [];
                this.examRegisteredStudents = [];
                this.courseCodes = [];
              }



              // ✅ Build dynamic columns (unique course_year_code)
              if (this.examRegisteredStudents?.length > 0) {
                const courseYearList = this.examRegisteredStudents.map(x => x.course_year_code);
                const uniqueCourseYears = [...new Set(courseYearList)];

                this.courseCodes = uniqueCourseYears.map(code => ({
                  course_year_code: code
                }));
              }

              if (this.mainList.length === 0) {
                this.snotifyService.info('No data found for selected filters.', 'Info');
              }
            } else {
              this.snotifyService.error(result.message, 'Error!');
            }
          },
          error: () => {
            this.spinner.hide();
            this.snotifyService.error(CONSTANTS.message.CON_ERROR, 'Error!');
          }
        });

    } else {
      this.snotifyService.warning('Please select all required fields.', 'Warning');
    }
  }

  findMarks(list: any[], courseYearCode: string, field: string) {
    if (Array.isArray(list)) {
      const item = list.find(x => x.course_year_code === courseYearCode);
      return item ? (item[field] ?? '-') : '-';
    }
    return '-';
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

  selectedCourse(courseId) {
    this.staffForm.get('batchId').setValue('')
    this.batchesData = [];
    this.batches = [];
    this.flag = false;
    this.mainList = [];
    this.feeStructures = [];
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
    this.batchesData = this.batchesFilter.filter(x => (x.fk_course_id === this.staffForm.value.courseId));
    if (this.batchesData && this.batchesData.length > 0) {
      const batcheList = this.batchesData.map(({ fk_batch_id }) => fk_batch_id);
      this.batches = this.batchesData.filter(({ fk_batch_id }, index) =>
        !batcheList.includes(fk_batch_id, index + 1));
    }
    if (!this.isEmptyObject(this.params) && this.batches.length > 0) {
      this.mainList = [];
      this.batches = this.batches.sort((a, b) => parseInt(b.batch_name) - parseInt(a.batch_name))
      this.staffForm.get('batchId').setValue(+this.params.batchId);
      this.selectedBatch(this.staffForm.value.batchId)
    } else if (this.batches && this.batches.length > 0) {
      this.batches = this.batches.sort((a, b) => parseInt(b.batch_name) - parseInt(a.batch_name))
      this.staffForm.get('batchId').setValue(this.batches[0].fk_batch_id);
      this.selectedBatch(this.staffForm.value.batchId);
    }
  }
  selectedBatch(batchId) {
    this.flag = true;
    this.feeStructures = [];
  this.examSubjectStats = [];
    this.examRegisteredStudents = [];
    this.mainList = [];
    this.courseCodes = [];

    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;

  }
  selectedCollege(collegeId): void {
    this.batches = [];
    this.Logo = [];
    this.flag = false;
    this.feeStructures = [];
    this.examSubjectStats = [];
    this.examRegisteredStudents = [];
    this.mainList = [];
    this.courseCodes = [];
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


  }


  // tslint:disable-next-line:typedef
  applyFilter(filterValue: string) {
    this.dataSource.filter = filterValue.trim().toLowerCase();

    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
  }


  //print functions(excel,print)

  exportAsExcel(): void {
    if (!this.excelTable || !this.excelTable.nativeElement) {
      console.error('Excel table not found or not rendered yet.');
      return;
    }

    // Add heading manually before table
    const heading = `
      <tr>
        <th colspan="6" style="text-align:center; font-size:21px; font-weight:bold; background:#f2f2f2;">
          Student Backlog Data
        </th>
      </tr>
    `;

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
        <body><table>{table}</table></body>
      </html>`;

    const base64 = (s: string) => window.btoa(unescape(encodeURIComponent(s)));
    const format = (s: string, c: any) => s.replace(/{(\w+)}/g, (m, p) => c[p]);

    // inject heading before table rows
    const tableHTML = heading + this.excelTable.nativeElement.innerHTML;
    const ctx = { worksheet: 'StudentBacklog', table: tableHTML };

    const link = document.createElement('a');
    link.download = `${this.trafoItem}.xls`;
    link.href = uri + base64(format(template, ctx));
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
