import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { CONSTANTS } from 'app/main/common/constants';
import { Router, ActivatedRoute } from '@angular/router';
import { SnotifyService } from 'ng-snotify';
import { CrudService } from 'app/main/services/crud.service';
import {FormControl } from '@angular/forms';
import { NgxSpinnerService } from 'ngx-spinner';
import { takeUntil } from 'rxjs/operators';
import { GenericFunctions } from 'app/main/common/generic-functions';
import { ApplicationForm } from 'app/main/models/applicationForm';
import { GeneralDetail } from 'app/main/models/generalDetail';
import { GlobalService } from 'app/main/services/global.service';
import { GridComponent, PdfExportProperties } from '@syncfusion/ej2-angular-grids';
import { ClickEventArgs } from '@syncfusion/ej2-navigations';
import { HttpClient } from '@angular/common/http';
import { Subject, ReplaySubject } from 'rxjs';


@Component({
  selector: 'app-consolidated-exam-report',
  templateUrl: './consolidated-exam-report.component.html',
  styleUrls: ['./consolidated-exam-report.component.scss']
})
export class ConsolidatedExamReportComponent implements OnInit {

  feeFormGroup: FormGroup;

  @ViewChild('excelTable', { static: false }) excelTable: ElementRef;
  trafoItem = "Consolidated Exam Report";

  private collegeWiseDetails = CONSTANTS.collegeWiseDetailsUrl;
  private collegeCrudUrl = CONSTANTS.collegeCrudUrl;
  private getConsolidatedExamReportUrl = CONSTANTS.getConsolidatedExamReportUrl;
  private examReportPdfUrl = CONSTANTS.examReportPdfUrl;
  private _onDestroy = new Subject<void>();
  public examFilterCtrl: FormControl = new FormControl();
  private studentSearchUrl = CONSTANTS.studentSearchUrl;
  MINIO = CONSTANTS.MINIO;
  private endURL = CONSTANTS.MAINAPI;

  collegeId = localStorage.getItem('collegeId');
  colleges: any[] = [];
  academicYears: any[] = [];
  courseGroups: any[] = [];
  courseYears: any[] = [];
  courses: any[] = [];
  
  collegeCode;
  // fromDate;
  toDate;
  step = 0;
  

  keys: any[] = [];
  empId;
  quotas: GeneralDetail[] = [];
  panelOpenState = true;
  workflowStages: any[] = [];
  pageParams: any = {};
  empSecurity = [];
  dataSecStaff;
  searchStudents = [];
  searchExams = [];
  dataSECPrincipal;
  data;
  check = 1;
  filtersDetailsList = [];
  filtersdata = [];
  academicyears = [];
  courseData = [];
  coursegroup = [];
  courseYearData = [];
  public studentFilterCtrl: FormControl = new FormControl();
  public filteredStudents: ReplaySubject<any[]> = new ReplaySubject<any[]>(1);
  orgCode = '';

  public gridData: any[];
  public toolbar: string[];
  // tslint:disable-next-line: ban-types
  public pageSettings: Object;
  @ViewChild('grid')
  public grid: GridComponent;
  // tslint:disable-next-line: ban-types
  public initialPage: Object;
  dataDetails = ' ';
  collegeLogo: any[];
  Logo: any[];
  collegeName: any;
  academicData = [];
  examResults = [];
  universityCode: string;
  pending: boolean;

  constructor(private route: ActivatedRoute, private router: Router, private formBuilder: FormBuilder, private snotifyService: SnotifyService,
    private crudService: CrudService, private spinner: NgxSpinnerService, private genericFunctions: GenericFunctions,private http: HttpClient
  ) {
    this.dataSecStaff = this.genericFunctions.dataSecurityLevel();
    this.dataSECPrincipal = this.genericFunctions.dataSecurityLevelPrincipal();
    this.orgCode = localStorage.getItem('orgCode');
  }

  // tslint:disable-next-line:typedef
  ngOnInit() {
    this.feeFormGroup = this.formBuilder.group({
      collegeId: ['', Validators.required],
      academicYearId: ['', Validators.required],
      courseId: ['', Validators.required],
      courseYearId: ['', Validators.required],
      courseGroupId: ['', Validators.required],
      studentId: ['']
    });
     this.searchStudents.push({ firstName: 'Search by student name or rollNo.' });
        this.filteredStudents.next(this.searchStudents.slice());
          this.studentFilterCtrl.valueChanges
      .pipe(takeUntil(this._onDestroy))
      .subscribe(() => {
        this.filterStd();
      });
    this.getfilterDetails();

  }

  getColleges(): void {
    /*----------- COLLEGES -----------*/
    this.crudService.listDetailsById(this.collegeCrudUrl, 'true', 'isActive')
      .subscribe(result => {
        if (result.statusCode === 200) {
          if (result.data.resultList && result.data.resultList !== '') {
            this.collegeLogo = result.data.resultList;
            this.Logo = this.collegeLogo.filter(x => (x.collegeId == this.feeFormGroup.value.collegeId))[0].logo
            this.collegeName = this.collegeLogo.filter(x => (x.collegeId == this.feeFormGroup.value.collegeId))[0].collegeName
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
  getfilterDetails() {
    this.spinner.show()
    let request = [
      { paramName: 'in_flag', paramValue: 'clg_filters,gm_codes' },
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
      { paramName: 'in_gm_codes', paramValue: 'QUOTA' },
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
              } else if (this.filtersDetailsList[i].length > 0 && this.filtersDetailsList[i][0].flag === 'gm_codes') {
                this.quotas = this.filtersDetailsList[i];
              } else if (this.filtersDetailsList[i].length > 0 && this.filtersDetailsList[i][0].clg_filters_ay === 'clg_filters_ay') {
                this.academicData = this.filtersDetailsList[i];
              }
            }
            /*----------- DISTINCT COLLEGE-----------*/
            const collegeList = this.filtersdata.map(({ fk_college_id }) => fk_college_id);
            this.colleges = this.filtersdata.filter(({ fk_college_id }, index) =>
              !collegeList.includes(fk_college_id, index + 1));
            if (this.colleges && this.colleges.length > 0) {
              this.colleges = this.colleges.sort((a, b) => a.clg_sort_order - b.clg_sort_order);
              this.feeFormGroup.get('collegeId').setValue(this.colleges[0].fk_college_id);
              this.selectedCollege(this.feeFormGroup.value.collegeId);
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

  selectedCollege(collegeId): void {
    this.feeFormGroup.get('academicYearId').setValue('');
    this.courseGroups = [];
    this.gridData = [];
    this.academicyears = [];
    this.courseYears = [];
    this.courses = [];
    this.examResults = [];
    /*----------- ACADEMIC YEARS -----------*/
    let universityId = this.colleges.filter(x => (x.fk_college_id === this.feeFormGroup.value.collegeId))[0]?.fk_university_id;
    this.universityCode = this.colleges.filter(x => (x.fk_college_id === this.feeFormGroup.value.collegeId))[0]?.university_code;
    this.academicyears = this.academicData.filter(x => (x.fk_university_id === universityId))
    if (this.academicyears.length > 0) {
      const Academic_yrData = this.academicyears.map(({ fk_academic_year_id }) => fk_academic_year_id);
      this.academicYears = this.academicyears.filter(({ fk_academic_year_id }, index) =>
        !Academic_yrData.includes(fk_academic_year_id, index + 1));
      // this.academicYears = this.academicYears.sort((a,b)=>parseInt(b.academic_year)-parseInt(a.academic_year))
      // this.feeFormGroup.get('academicYearId').setValue(this.academicYears[0].fk_academic_year_id);
      const currentAY = this.academicYears?.sort((a, b) => (b.is_curr_ay ?? 0) - (a.is_curr_ay ?? 0))[0];
      if (currentAY?.fk_academic_year_id) {
        this.feeFormGroup.get('academicYearId')?.setValue(currentAY.fk_academic_year_id);
      }
      this.academicYears = this.academicYears.sort((a, b) => parseInt(b?.academic_year) - parseInt(a?.academic_year));
      this.selectedAcademicYear(this.feeFormGroup.value.academicYearId)
    }
  }
clear(e): void {
    this.reset();
  }


selectedStd(): void {
  // When student is selected, just clear old report data
  this.examResults = [];
    if (this.check === 2) {
      this.feeFormGroup.get('collegeId').setValue(this.searchStudents.filter(x => (x.studentId === this.feeFormGroup.value.studentId))[0].collegeId);
      this.feeFormGroup.get('courseId').setValue(this.searchStudents.filter(x => (x.studentId === this.feeFormGroup.value.studentId))[0].courseId);
      this.feeFormGroup.get('academicYearId').setValue(this.searchStudents.filter(x => (x.studentId === this.feeFormGroup.value.studentId))[0].academicYearId);
      this.selectedAcademicYear(this.searchStudents.filter(x => (x.studentId === this.feeFormGroup.value.studentId))[0].academicYearId);
    }
}

downloadStudentWise(): void {

  // 1️⃣ Validation
  if (!this.feeFormGroup.value.studentId) {
    this.snotifyService.error('Please select a student', 'Error!');
    return;
  }

  // 2️⃣ Payload for SINGLE STUDENT
  const payload = [
    {
      flag: 'exam_final_std_result_detail',
      examId: 0,
      collegeId: this.feeFormGroup.value.collegeId,
      courseId: this.feeFormGroup.value.courseId,
      courseGroupId: 0,
      courseYearId: 0,
      academicYearId: this.feeFormGroup.value.academicYearId,
      studentId: this.feeFormGroup.value.studentId,
      regulationId: 0,
      subjectId: 0
    }
  ];

  // 3️⃣ API call
  this.spinner.show();

  this.crudService.downloadExamResultPDF(this.examReportPdfUrl, payload)
    .subscribe({
      next: (blob: Blob) => {
        this.spinner.hide();

        const fileURL = window.URL.createObjectURL(blob);
        window.open(fileURL, '_blank');

        this.snotifyService.success('Student PDF Generated', 'Success!');
      },
      error: () => {
        this.spinner.hide();
        this.snotifyService.error('Failed to generate student PDF', 'Error!');
      }
    });
}

downloadByStudent(){

}

  // tslint:disable-next-line:typedef
  selectedAcademicYear(academicYearId) {
    this.courses = [];
    this.courseData = [];
    this.examResults = [];
    this.courseData = this.filtersdata.filter(x => (x.fk_college_id == this.feeFormGroup.value.collegeId));
    if (this.courseData.length > 0) {
      const Course_Id = this.courseData.map(({ fk_course_id }) => fk_course_id);
      this.courses = this.courseData.filter(({ fk_course_id }, index) =>
        !Course_Id.includes(fk_course_id, index + 1));
      this.feeFormGroup.get('courseId').setValue(this.courses[0].fk_course_id);
      this.selectedCourse(this.feeFormGroup.value.courseId)
    }
  }

  selectedCourse(courseId): void {
    /*........ Clean Default Selected ......... */
    this.feeFormGroup.get('courseYearId').setValue('');
    this.feeFormGroup.get('courseGroupId').setValue('');
    this.coursegroup = [];
    this.courseGroups = [];
    this.courseYears = [];
    this.examResults = [];
    if (this.courseGroups.length === 0) {
      /*----------- COURSES GROUPS -----------*/
      this.coursegroup = this.filtersdata.filter(x => (x.fk_college_id == this.feeFormGroup.value.collegeId &&
        x.fk_course_id == courseId));
      if (this.coursegroup.length > 0) {
        const GroupCode = this.coursegroup.map(({ fk_course_group_id }) => fk_course_group_id);
        this.courseGroups = this.coursegroup.filter(({ fk_course_group_id }, index) =>
          !GroupCode.includes(fk_course_group_id, index + 1));
        this.feeFormGroup.get('courseGroupId').setValue(this.courseGroups[0].fk_course_group_id);
        this.selectedGroup(this.feeFormGroup.value.courseGroupId)
      }
    }
  }

  selectedGroup(courseGroupId): void {
    /*........ Clean Default Selected ......... */
    this.feeFormGroup.get('courseYearId').setValue('');
    this.courseYearData = [];
    this.courseYears = [];
    this.examResults = [];
    if (this.feeFormGroup.value.collegeId != null && courseGroupId != null) {
      /*----------- COURSES YEARS -----------*/
      if (this.courseYears.length === 0) {
        this.courseYearData = this.filtersdata.filter(x => (x.fk_college_id == this.feeFormGroup.value.collegeId && x.fk_course_id == this.feeFormGroup.value.courseId && x.fk_course_group_id == courseGroupId));
        if (this.courseYearData.length > 0) {
          const Course_Yr_Name = this.courseYearData.map(({ fk_course_year_id }) => fk_course_year_id);
          this.courseYears = this.courseYearData.filter(({ fk_course_year_id }, index) =>
            !Course_Yr_Name.includes(fk_course_year_id, index + 1));
          this.courseYears = this.courseYears.sort((a, b) => a.year_order - b.year_order)
          this.feeFormGroup.get('courseYearId').setValue(this.courseYears[0].fk_course_year_id);
        }
      }
    }
  }

 getReport(): void {

  this.examResults = [];

  if (!this.feeFormGroup.valid) {
    return;
  }

  this.spinner.show();

  const payload = [
    {
      flag: 'exam_final_std_result_detail',
      examId: 0,
      collegeId: this.feeFormGroup.value.collegeId,
      courseId: this.feeFormGroup.value.courseId,
      courseGroupId: this.feeFormGroup.value.courseGroupId,
      courseYearId: this.feeFormGroup.value.courseYearId,
      academicYearId: this.feeFormGroup.value.academicYearId,
      studentId: 0,
      regulationId: 0,
      subjectId: 0
    }
  ];

  /*---------- ADD TEST ----------*/
              this.crudService.zipadd(this.examReportPdfUrl, payload)
                  .subscribe(result => {
                      this.spinner.hide();
                      if (result.statusCode === 200){
                          if (result.data && result.data !== '') {
                            console.log(result.data,"result.data");
                              this.snotifyService.success(result.message, 'Success!');
                          }
                      }else {
                          this.snotifyService.error(result.message, 'Error!');
                      }
                  }, error => {
                      this.spinner.hide();
                      if (error.error.statusCode === 401){
                          this.snotifyService.error(error.error.message, 'Error!');
                          this.genericFunctions.logOut(this.router.url);
                      }else{
                          this.snotifyService.error(CONSTANTS.message.CON_ERROR, 'Error!');
                      }
                  });
}

 reset(): void {
  this.examResults = [];
}


download(): void {

   if (this.check === 1) {
    this.downloadCourseWise();   // existing logic
  } else if (this.check === 2) {
    this.downloadStudentWise();  // 👈 THIS
  }
}

downloadCourseWise():void{
 if (!this.feeFormGroup.valid) {
    this.snotifyService.error('Please select all required fields', 'Error!');
    return;
  }

  const payload = [
    {
      flag: 'exam_final_std_result_detail',
      examId: 0,
      collegeId: this.feeFormGroup.value.collegeId,
      courseId: this.feeFormGroup.value.courseId,
      courseGroupId: this.feeFormGroup.value.courseGroupId,
      courseYearId: 0,
      academicYearId: this.feeFormGroup.value.academicYearId,
      studentId: 0,
      regulationId: 0,
      subjectId: 0
    }
  ];

  this.spinner.show();

  this.crudService.downloadExamResultPDF(this.examReportPdfUrl, payload)
    .subscribe({
      next: (blob: Blob) => {
        this.spinner.hide();

        const fileURL = window.URL.createObjectURL(blob);
        window.open(fileURL, '_blank');

        this.snotifyService.success('PDF Generated Successfully', 'Success!');
      },
      error: (err) => {
        this.spinner.hide();
        console.error(err);
        this.snotifyService.error('Failed to generate PDF', 'Error!');
      }
    });
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
  PrintData() {
    window.print()
  }

  // download(): void {
  //   const payload = [
  //   {
  //     flag: 'exam_final_std_result_detail',
  //     examId: 0,
  //     collegeId: this.feeFormGroup.value.collegeId,
  //     courseId: this.feeFormGroup.value.courseId,
  //     courseGroupId: this.feeFormGroup.value.courseGroupId,
  //     courseYearId: this.feeFormGroup.value.courseYearId,
  //     academicYearId: this.feeFormGroup.value.academicYearId,
  //     studentId: 0,
  //     regulationId: 0,
  //     subjectId: 0
  //   }
  // ];
  //     // Xhr creates new context so we need to create reference to this
  //     const self = this;
 
  //     // Status flag used in the template.
  //     this.pending = true;
 
  //     // Create the Xhr request object
  //     const xhr = new XMLHttpRequest();
  //     xhr.open('POST', this.endURL + this.examReportPdfUrl , payload);
  //     xhr.setRequestHeader('Authorization', 'Bearer ' + localStorage.getItem('token'));
  //     xhr.responseType = 'blob';
  //     // Xhr callback when we get a result back
  //     // We are not using arrow function because we need the 'this' context
  //     // tslint:disable-next-line:typedef
  //     xhr.onreadystatechange = function () {
 
  //       // We use setTimeout to trigger change detection in Zones
  //       setTimeout(() => { self.pending = false; }, 0);
 
  //       if (xhr.readyState === 4 && xhr.status === 200) {
  //         const blob = new Blob([this.response], { type: 'application/pdf' });
  //         // FileSaver.saveAs(blob, 'Report.pdf');
 
  //         const blobUrl = URL.createObjectURL(blob);
  //         const iframe = document.createElement('iframe');
  //         iframe.style.display = 'none';
  //         iframe.src = blobUrl;
  //         document.body.appendChild(iframe);
  //         iframe.contentWindow.print();
  //       }
  //     };
 
  //     // Start the Ajax request
  //     xhr.send();
  // }

}
