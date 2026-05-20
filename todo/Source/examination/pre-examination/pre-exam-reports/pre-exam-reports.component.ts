import { Component, OnInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { CONSTANTS } from 'app/main/common/constants';
import { SnotifyService } from 'ng-snotify';
import { GenericFunctions } from 'app/main/common/generic-functions';
import { CrudService } from 'app/main/services/crud.service';
import { NgxSpinnerService } from 'ngx-spinner';
import { fuseAnimations } from '@fuse/animations';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { FormBuilder, FormGroup, FormControl, Validators } from '@angular/forms';
@Component({
  selector: 'app-pre-exam-reports',
  templateUrl: './pre-exam-reports.component.html',
  styleUrls: ['./pre-exam-reports.component.scss'],
  animations: fuseAnimations
})
export class PreExamReportsComponent implements OnInit {
  collegeWiseStudents: any[] = [];
  collegeWiseFee: any[] = [];
  TotalStudentsRegistered: any[] = [];
  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild(MatSort) sort: MatSort;
  displayedColumns = [];
  displayedColumns1 = [];
  displayedColumns2 = [];
  tabledataSource = new MatTableDataSource<Element>(ELEMENT_DATA);
  tabledataSource1 = new MatTableDataSource<Element>(ELEMENT_DATA);
  tabledataSource2 = new MatTableDataSource<Element>(ELEMENT_DATA);
  filters: string;
  filters1: string;
  filters2: string;
  
  private PreExamreports = CONSTANTS.preExamReportsUrl;
  private getExamEvaluationSubjectCodes = CONSTANTS.getExamEvaluationCodesUrl;

  evaluatorsubjectform: FormGroup;
  preexaminationReports: FormGroup;
  collegeWiseStudentsTitle: any;
  collegeWiseFeeTitle: any;
  StudentsRegisteredTitle: any;
  examSubjects: any[];
  courseCode: any[];
  academicYear: any[];
  academicYear1: any[];
  monthYear: any[];
  monthYear1: any[];
  step = 0;
  constructor(private dialog: MatDialog, private snotifyService: SnotifyService, private formbuilder: FormBuilder,
    private crudService: CrudService, private spinner: NgxSpinnerService, private genericFunctions: GenericFunctions, public router: Router) {
  }
  ngOnInit(): void {
    this.evaluatorsubjectform = this.formbuilder.group({
      in_orgid: 1,
      in_fdate: ['1990-01-01'],
      in_tdate: ['1990-01-01'],
      in_exam_month_yr: [''],
      in_course_code: [''],
      in_course_year_code: [''],
      in_subject_code: [''],
      in_evalutor_profileid: 0,
      in_exam_date: '1990-01-01',
      in_regulation_code: ''
    });
    this.getList();
    this.preexaminationReports = this.formbuilder.group({
      CourseCode: ['', Validators.required],
      academicYear: ['', Validators.required],
      ExamMonthYear: ['', Validators.required]
    })
    this.getdashboardReports();
  }
  getList(): void {
    let empId = +localStorage.getItem('employeeId');
      /* -------- EXAM SESSIONS -------*/
      this.crudService.listByEighteenIds(this.getExamEvaluationSubjectCodes,
        'list_exam_subjects',
        this.evaluatorsubjectform.value.in_orgid,
        this.evaluatorsubjectform.value.in_fdate,
        this.evaluatorsubjectform.value.in_tdate,
        this.evaluatorsubjectform.value.in_exam_month_yr,
        this.evaluatorsubjectform.value.in_course_code,
        this.evaluatorsubjectform.value.in_course_year_code,
        this.evaluatorsubjectform.value.in_subject_code,
        this.evaluatorsubjectform.value.in_evalutor_profileid,
        this.evaluatorsubjectform.value.in_exam_date,
        this.evaluatorsubjectform.value.in_regulation_code,
        0, 0,0,'','',1,empId,
        'in_flag', 'in_orgid', 'in_fdate', 'in_tdate', 'in_exam_month_yr',
         'in_course_code', 'in_course_year_code', 'in_subject_code', 'in_evalutor_profileid',
          'in_exam_date', 'in_regulation_code', 'in_emp_id', 'in_questionpaper_id','in_evaluator_role_id'
          ,'in_academic_year','in_exam_short_name','in_affiliatedto_catdet_id','in_loginuser_empid'
      )
        .subscribe(result => {
          this.spinner.hide();
          if (result.statusCode === 200) {
            if (result.data && result.data !== '' && result.data.result.length > 0) {
              this.examSubjects = result.data.result[0];
              // this.monthYear=this.examSubjects
              this.snotifyService.success(result.message, 'Success!');
              const courseCodeData = this.examSubjects.map(({ course_code }) => course_code);
              this.courseCode = this.examSubjects.filter(({ course_code }, index) =>
                !courseCodeData.includes(course_code, index + 1));
                this.preexaminationReports.get('CourseCode').setValue(this.courseCode[0].course_code);
                this.selectedCourse(this.preexaminationReports.get('CourseCode')?.value);
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
  selectedCourse(courseCodeId) {
    this.academicYear1 = []
    this.academicYear = []
    this.preexaminationReports.get('academicYear').setValue('')
    for (let i = 0; i < this.examSubjects.length; i++) {
      if (this.examSubjects[i].course_code == courseCodeId) {
        this.academicYear1.push(this.examSubjects[i])
        const academicYearData = this.academicYear1.map(({ academic_year }) => academic_year);
        this.academicYear = this.academicYear1.filter(({ academic_year }, index) =>
          !academicYearData.includes(academic_year, index + 1));
          this.selectedacademicYear(this.preexaminationReports.get('academicYear').value);
          this.preexaminationReports.get('academicYear').setValue(this.academicYear[0].academic_year);

        }
    }
  }
  selectedacademicYear(academicYear) {
    this.monthYear = [];
    this.monthYear1 = [];
    this.preexaminationReports.get('ExamMonthYear').setValue('');
    for (let i = 0; i < this.examSubjects.length; i++) {
      if (this.examSubjects[i].course_code == this.preexaminationReports.value.CourseCode) {
        this.monthYear1.push(this.examSubjects[i])
        const exam_month_yrData = this.monthYear1.map(({ exam_month_yr }) => exam_month_yr);
        this.monthYear = this.monthYear1.filter(({ exam_month_yr }, index) =>
          !exam_month_yrData.includes(exam_month_yr, index + 1));
        this.monthYear = this.monthYear.sort((a, b) => a.exam_month_yr - b.exam_month_yr);
        this.preexaminationReports.get('ExamMonthYear').setValue(this.monthYear[0].exam_month_yr);
       
      }
    }
  //  this.getPreExamreports(this.preexaminationReports.get('ExamMonthYear')?.value)
  }
  getdashboardReports() {
    this.spinner.show();
    this.crudService.listByFiveIds(this.PreExamreports,
      0, 1, '2023-2024', '2023-10-01', 'DEGREE',
      'in_flag', 'in_orgid', 'in_academic_year', 'in_exam_month_yr', 'in_course_code')
      .subscribe(result => {
        this.spinner.hide();
        if (result.statusCode === 200) {
          if (result.success) {
            if (result.data.result.length > 0) {
              /*------ PRE-EXAM REPORTS ----*/
              this.collegeWiseStudents = result.data.result[0];
              this.collegeWiseStudentsTitle = result.data.result[0][0].ReportTitle;
              this.filters = result.data.result[0][0].Filters;
              this.tabledataSource = new MatTableDataSource<any>(this.collegeWiseStudents);
              this.displayedColumns = Object.keys(this.collegeWiseStudents[0]);
              this.displayedColumns.splice(0, 3);
              this.displayedColumns.splice(1, 1);
              this.displayedColumns.splice(2, 1);
              this.collegeWiseFee = result.data.result[1];
              this.collegeWiseFeeTitle = result.data.result[1][0].ReportTitle;
              this.filters1 = result.data.result[1][0].Filters;
              this.tabledataSource1 = new MatTableDataSource<any>(this.collegeWiseFee);
              this.displayedColumns1 = Object.keys(this.collegeWiseFee[0]);
              this.displayedColumns1.splice(0, 3);
              this.displayedColumns1.splice(1, 1);
              this.displayedColumns1.splice(2, 1);
              this.TotalStudentsRegistered = result.data.result[2];
              this.StudentsRegisteredTitle = result.data.result[2][0].ReportTitle;
              this.filters2 = result.data.result[2][0].Filters;
              this.tabledataSource2 = new MatTableDataSource<any>(this.TotalStudentsRegistered);
              this.displayedColumns2 = Object.keys(this.TotalStudentsRegistered[0]);
              this.displayedColumns2.splice(0, 3);
              this.displayedColumns2.splice(1, 1);
              this.displayedColumns2.splice(2, 1);
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

 getPreExamreports(ExamMonthYear){
  this.spinner.show();
  this.crudService.listByFiveIds(this.PreExamreports,
    0, 1, 
    this.preexaminationReports.get('academicYear').value, 
    this.preexaminationReports.get('ExamMonthYear').value, 
    this.preexaminationReports.get('CourseCode').value,
    'in_flag', 'in_orgid', 'in_academic_year', 'in_exam_month_yr', 'in_course_code')
    .subscribe(result => {
      this.spinner.hide();
      if (result.statusCode === 200) {
        if (result.success) {
          if (result.data.result.length > 0) {
            /*------ PRE-EXAM REPORTS ----*/
            this.collegeWiseStudents = result.data.result[0];
            this.collegeWiseStudentsTitle = result.data.result[0][0].ReportTitle;
            this.filters = result.data.result[0][0].Filters;
            this.tabledataSource = new MatTableDataSource<any>(this.collegeWiseStudents);
            this.displayedColumns = Object.keys(this.collegeWiseStudents[0]);
            this.displayedColumns.splice(0, 3);
            this.displayedColumns.splice(1, 1);
            this.displayedColumns.splice(2, 1);
            this.collegeWiseFee = result.data.result[1];
            this.collegeWiseFeeTitle = result.data.result[1][0].ReportTitle;
            this.filters1 = result.data.result[1][0].Filters;
            this.tabledataSource1 = new MatTableDataSource<any>(this.collegeWiseFee);
            this.displayedColumns1 = Object.keys(this.collegeWiseFee[0]);
            this.displayedColumns1.splice(0, 3);
            this.displayedColumns1.splice(1, 1);
            this.displayedColumns1.splice(2, 1);
            this.TotalStudentsRegistered = result.data.result[2];
            this.StudentsRegisteredTitle = result.data.result[2][0].ReportTitle;
            this.filters2 = result.data.result[2][0].Filters;
            this.tabledataSource2 = new MatTableDataSource<any>(this.TotalStudentsRegistered);
            this.displayedColumns2 = Object.keys(this.TotalStudentsRegistered[0]);
            this.displayedColumns2.splice(0, 3);
            this.displayedColumns2.splice(1, 1);
            this.displayedColumns2.splice(2, 1);
           
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
const ELEMENT_DATA: Element[] = []