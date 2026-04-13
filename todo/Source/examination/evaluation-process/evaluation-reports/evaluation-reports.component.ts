import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { FormBuilder, FormControl ,FormGroup, Validators } from '@angular/forms';
import { MatTableDataSource } from '@angular/material/table';
import { Router } from '@angular/router';
import { fuseAnimations } from '@fuse/animations';
import { CONSTANTS } from 'app/main/common/constants';
import { GenericFunctions } from 'app/main/common/generic-functions';
import { CrudService } from 'app/main/services/crud.service';
import { SnotifyService } from 'ng-snotify';
import { NgxSpinnerService } from 'ngx-spinner';
@Component({
  selector: 'app-evaluation-reports',
  templateUrl: './evaluation-reports.component.html',
  styleUrls: ['./evaluation-reports.component.scss'],
  encapsulation: ViewEncapsulation.None,
  animations: fuseAnimations,
})
export class EvaluationReportsComponent implements OnInit {
  coursedataFormat = "json";
  width = 550;
  height = 300;
  displayedColumns = [];
  displayedColumns1 = [];
  displayedColumns2 = [];
  displayedColumns3 = [];
  displayedColumns4 = [];
  tabledataSource = new MatTableDataSource<Element>(ELEMENT_DATA);
  tabledataSource1 = new MatTableDataSource<Element>(ELEMENT_DATA);
  tabledataSource2 = new MatTableDataSource<Element>(ELEMENT_DATA);
  tabledataSource3 = new MatTableDataSource<Element>(ELEMENT_DATA);
  tabledataSource4 = new MatTableDataSource<Element>(ELEMENT_DATA);
  filters: string;
  filters1: string;
  filters2: string;
  filters3: string;
  filters4: string;
  private examEvalReportsUrl = CONSTANTS.examEvalReportsUrl;
  private getExamEvaluationSubjectCodes = CONSTANTS.getExamEvaluationCodesUrl
  evaluationreportForm: FormGroup;
  evaluatorsubjectform: FormGroup;
  academicGroupwiseSubjects: any[] = [];
  examSubjectWiseStudents: any[] = [];
  clgWiseFeeCollectionReport: any[] = [];
  scannedanswerpapers: any[] = [];
  examquestionpaper: any[] = [];
  examSubjects: any[] = [];
  courseCode: any[] = [];
  academicYear: any[];
  academicYear1: any[];
  monthYear: any[];
  monthYear1: any[];
  academicGroupTitle: any;
  examsubjectTitle: any;
  clgwiseTitle: any;
  examquestionTitle: any;
  scannedanserTitle: any;
  step = 0;
  constructor(private crudService: CrudService, private spinner: NgxSpinnerService, public formbuilder: FormBuilder,
    private snotifyService: SnotifyService, private genericFunctions: GenericFunctions, public router: Router) { }
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
    this.evaluationreportForm = this.formbuilder.group({
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
        0, 0, 0,'','',1,empId,
        'in_flag', 'in_orgid', 'in_fdate', 'in_tdate', 'in_exam_month_yr', 'in_course_code', 'in_course_year_code', 
        'in_subject_code', 'in_evalutor_profileid', 'in_exam_date', 'in_regulation_code', 'in_emp_id', 'in_questionpaper_id',
        'in_evaluator_role_id','in_academic_year','in_exam_short_name','in_affiliatedto_catdet_id','in_loginuser_empid'
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
                this.evaluationreportForm.get('CourseCode').setValue(this.courseCode[0].course_code);
                this.selectedCourse(this.evaluationreportForm.get('CourseCode')?.value)
                
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
    this.evaluationreportForm.get('academicYear').setValue('')
    for (let i = 0; i < this.examSubjects.length; i++) {
      if (this.examSubjects[i].course_code == courseCodeId) {
        this.academicYear1.push(this.examSubjects[i])
        
        const academicYearData = this.academicYear1.map(({ academic_year }) => academic_year);
        this.academicYear = this.academicYear1.filter(({ academic_year }, index) =>
          !academicYearData.includes(academic_year, index + 1));
          this.selectedacademicYear(this.evaluationreportForm.get('academicYear').value);
          this.evaluationreportForm.get('academicYear').setValue(this.academicYear[0].academic_year);

      }
    }
  }
  selectedacademicYear(academicYear) {
    this.monthYear = [];
    this.monthYear1 = [];
    this.evaluationreportForm.get('ExamMonthYear').setValue('');
    for (let i = 0; i < this.examSubjects.length; i++) {
      if (this.examSubjects[i].course_code == this.evaluationreportForm.value.CourseCode) {
        this.monthYear1.push(this.examSubjects[i])
        const exam_month_yrData = this.monthYear1.map(({ exam_month_yr }) => exam_month_yr);
        this.monthYear = this.monthYear1.filter(({ exam_month_yr }, index) =>
          !exam_month_yrData.includes(exam_month_yr, index + 1));
        this.monthYear = this.monthYear.sort((a, b) => a.exam_month_yr - b.exam_month_yr);
        this.monthYear = this.monthYear.sort((a, b) => a.exam_month_yr - b.exam_month_yr);
        this.evaluationreportForm.get('ExamMonthYear').setValue(this.monthYear[0].exam_month_yr);
       
      }
    }
    //this.getevaluationreports(this.evaluationreportForm.get('ExamMonthYear')?.value);
  }
  getdashboardReports() {
    this.spinner.show();
    this.crudService.listByTwelveIds(this.examEvalReportsUrl,
      'EvaluationDashboard', 1, '2023-2024', '2023-10-01', 'DEGREE', '', '', 0, '1990-01-01', '', 0, 0,
      'in_flag', 'in_orgid', 'in_academic_year', 'in_exam_month_yr', 'in_course_code', 'in_course_year_code',
      'in_subject_code', 'in_evalutor_profileid', 'in_exam_date', 'in_regulation_code', 'in_emp_id', 'in_questionpaper_id')
      .subscribe(result => {
        this.spinner.hide();
        if (result.statusCode === 200) {
          if (result.success) {
            if (result.data.result.length > 0) {
              /*------ EVAL REPORTS ----*/
              this.academicGroupwiseSubjects = result.data.result[0];
              this.academicGroupTitle = result.data.result[0][0].ReportTitle
              this.filters = result.data.result[0][0].Filters;
              this.tabledataSource = new MatTableDataSource<any>(this.academicGroupwiseSubjects);
              this.displayedColumns = Object.keys(this.academicGroupwiseSubjects[0]);
              this.displayedColumns.splice(0, 3);
              this.displayedColumns.splice(1, 1);
              this.displayedColumns.splice(2, 1);
              this.examSubjectWiseStudents = result.data.result[1];
              this.examsubjectTitle = result.data.result[1][0].ReportTitle
              this.filters1 = result.data.result[1][0].Filters;
              this.tabledataSource1 = new MatTableDataSource<any>(this.examSubjectWiseStudents);
              this.displayedColumns1 = Object.keys(this.examSubjectWiseStudents[0]);
              this.displayedColumns1.splice(0, 3);
              this.displayedColumns1.splice(1, 1);
              this.displayedColumns1.splice(2, 1);
              this.clgWiseFeeCollectionReport = result.data.result[2];
              this.clgwiseTitle = result.data.result[2][0].ReportTitle
              this.filters2 = result.data.result[2][0].Filters;
              this.tabledataSource2 = new MatTableDataSource<any>(this.clgWiseFeeCollectionReport);
              this.displayedColumns2 = Object.keys(this.clgWiseFeeCollectionReport[0]);
              this.displayedColumns2.splice(0, 3);
              this.examquestionpaper = result.data.result[3];
              this.examquestionTitle = result.data.result[3][0].ReportTitle
              this.filters3 = result.data.result[3][0].Filters;
              this.tabledataSource3 = new MatTableDataSource<any>(this.examquestionpaper);
              this.displayedColumns3 = Object.keys(this.examquestionpaper[0]);
              this.displayedColumns3.splice(0, 3);
              this.scannedanswerpapers = result.data.result[4];
              this.scannedanserTitle = result.data.result[4][0].ReportTitle
              this.filters4 = result.data.result[4][0].Filters;
              this.tabledataSource4 = new MatTableDataSource<any>(this.scannedanswerpapers);
              this.displayedColumns4 = Object.keys(this.scannedanswerpapers[0]);
              this.displayedColumns4.splice(0, 3);
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
  
 getevaluationreports(ExamMonthYear){
  this.spinner.show();
  this.crudService.listByTwelveIds(this.examEvalReportsUrl,
    'EvaluationDashboard', 1, 
    this.evaluationreportForm.get('academicYear').value, 
    this.evaluationreportForm.get('ExamMonthYear').value, 
    this.evaluationreportForm.get('CourseCode').value, 
    '', '', 0, '1990-01-01', '', 0, 0,
    'in_flag', 'in_orgid', 'in_academic_year', 'in_exam_month_yr', 'in_course_code', 'in_course_year_code',
    'in_subject_code', 'in_evalutor_profileid', 'in_exam_date', 'in_regulation_code', 'in_emp_id', 'in_questionpaper_id')
    .subscribe(result => {
      this.spinner.hide();
      if (result.statusCode === 200) {
        if (result.success) {
          if (result.data.result.length > 0) {
            /*------ EVAL REPORTS ----*/
            this.academicGroupwiseSubjects = result.data.result[0];
            this.academicGroupTitle = result.data.result[0][0].ReportTitle
            this.filters = result.data.result[0][0].Filters;
            this.tabledataSource = new MatTableDataSource<any>(this.academicGroupwiseSubjects);
            this.displayedColumns = Object.keys(this.academicGroupwiseSubjects[0]);
            this.displayedColumns.splice(0, 3);
            this.displayedColumns.splice(1, 1);
            this.displayedColumns.splice(2, 1);
            this.examSubjectWiseStudents = result.data.result[1];
            this.examsubjectTitle = result.data.result[1][0].ReportTitle
            this.filters1 = result.data.result[1][0].Filters;
            this.tabledataSource1 = new MatTableDataSource<any>(this.examSubjectWiseStudents);
            this.displayedColumns1 = Object.keys(this.examSubjectWiseStudents[0]);
            this.displayedColumns1.splice(0, 3);
            this.displayedColumns1.splice(1, 1);
            this.displayedColumns1.splice(2, 1);
            this.clgWiseFeeCollectionReport = result.data.result[2];
            this.clgwiseTitle = result.data.result[2][0].ReportTitle
            this.filters2 = result.data.result[2][0].Filters;
            this.tabledataSource2 = new MatTableDataSource<any>(this.clgWiseFeeCollectionReport);
            this.displayedColumns2 = Object.keys(this.clgWiseFeeCollectionReport[0]);
            this.displayedColumns2.splice(0, 3);
            this.examquestionpaper = result.data.result[3];
            this.examquestionTitle = result.data.result[3][0].ReportTitle
            this.filters3 = result.data.result[3][0].Filters;
            this.tabledataSource3 = new MatTableDataSource<any>(this.examquestionpaper);
            this.displayedColumns3 = Object.keys(this.examquestionpaper[0]);
            this.displayedColumns3.splice(0, 3);
            this.scannedanswerpapers = result.data.result[4];
            this.scannedanserTitle = result.data.result[4][0].ReportTitle
            this.filters4 = result.data.result[4][0].Filters;
            this.tabledataSource4 = new MatTableDataSource<any>(this.scannedanswerpapers);
            this.displayedColumns4 = Object.keys(this.scannedanswerpapers[0]);
            this.displayedColumns4.splice(0, 3);
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
