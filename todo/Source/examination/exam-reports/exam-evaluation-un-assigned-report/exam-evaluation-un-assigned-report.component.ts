import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { Router } from '@angular/router';
import { CONSTANTS } from 'app/main/common/constants';
import { GenericFunctions } from 'app/main/common/generic-functions';
import { CrudService } from 'app/main/services/crud.service';
import { ParametersService } from 'app/main/services/parameters.service';
import { SnotifyService } from 'ng-snotify';
import { NgxSpinnerService } from 'ngx-spinner';
import { ReplaySubject } from 'rxjs';
import { Location } from '@angular/common';


@Component({
  selector: 'app-exam-evaluation-un-assigned-report',
  templateUrl: './exam-evaluation-un-assigned-report.component.html',
  styleUrls: ['./exam-evaluation-un-assigned-report.component.scss']
})
export class ExamEvaluationUnAssignedReportComponent implements OnInit {

  displayedColumns: string[] = ['id','courseYear', 'Regulation','Subject', 'unAssignedOmrserailnoCount'];
    dataSource: MatTableDataSource<any>;
  
    @ViewChild(MatPaginator) paginator: MatPaginator;
    @ViewChild(MatSort) sort: MatSort;
    @ViewChild('excelTable', { static: false }) excelTable: ElementRef;
  
    trafoexternalItem = "Exam Evaluation UnAssigned Report";
  
    private getExamEvaluationSubjectCodes = CONSTANTS.getExamEvaluationCodesUrl;
    private getEvaluatorsBankCopyUrl = CONSTANTS.getEvaluatorsBankCopy;
    private getExamUnassnListUrl = CONSTANTS.getExamUnassnListUrl;
    private collegeCrudUrl = CONSTANTS.collegeCrudUrl;
    private isActive = CONSTANTS.isActive;
    private getExamFiltersBycodeUrl = CONSTANTS.getExamFiltersBycodeUrl
  
    evaluatorsubjectform: FormGroup;
    evaluatorForm: FormGroup;
    SemisterList = [
      { id: 'ISEM', value: '1' },
      { id: 'IISEM', value: '2' },
      { id: 'IIISEM', value: '3' },
      { id: 'IVSEM', value: '4' },
      { id: 'VSEM', value: '5' },
      { id: 'VISEM', value: '6' },
      { id: 'VIISEM', value: '7' },
      { id: 'VIIISEM', value: '8' },
  
    ]
  
    examSubjects = [];
    subjects = [];
    subjectsData = [];
    evaluatorsList = [];
    evaluators = [];
    evaluatorsData = [];
    startDate;
    endDate;
    step = 0;
    evaluatedReport = [];
    subjectCode = '';
    Evaluatorname = '';
    userName = '';
    collegesLogoList = [];
    Logo;
    orgCode = '';
    studentsList = [];
    subjectname = '';
    AssignStudentDataList = []
    bulk: boolean = false;
    evaluatedDuplicateReport = [];
    examYear = [];
    examMonthYear = [];
    evaluatorSubjects = [];
    courseCode = [];
    evaluatorMonthYear = [];
    AssignedList = [];
    examStudentList: any[];
    params: any;
    backbutton: boolean;
    filtersDetailsList: any[];
    subjectData: any[];
    subjectsDetailList: any[];
    examsList: any[];
    examData: any[];
    subjectsList: any[];
    regulationFilterList: any[];
    regulationList: any[];
    CollegesListDetails: any[];
    courseYearsList: any[];
    courseYears: any[];
    courseGroupList: any[];
    courseGroups: any[];
    colleges: any[];
    examsLists: any;
    CollegesListFilterDetails: any[];
    academicYears: any[];
    academicYearsList: any[];
    courses: any[];
    academicyear: any[];
    regulationSubjectsList = [];
  
    constructor(private formBuilder: FormBuilder, private snotifyService: SnotifyService,
      private crudService: CrudService, private spinner: NgxSpinnerService, private router: Router,
      private genericFunctions: GenericFunctions, private dialog: MatDialog, private parameterservice: ParametersService, private location: Location) {
      this.startDate = new Date();
      this.orgCode = localStorage.getItem('orgCode');
      if (this.parameterservice.back) {
        this.backbutton = true
      }
      else {
        this.backbutton = false
  
      }
    }
  
    ngOnInit(): void {
      this.evaluatorForm = this.formBuilder.group({
        collegeId: [''],
        academicYearId: ['', Validators.required],
        examId: ['', Validators.required],
        courseId: ['', Validators.required],
        courseGroupId: [''],
        courseYearId: [''],
        regulationId: ['', Validators.required],
        subjectId: ['', Validators.required],
        inevalutorprofileid: ['', Validators.required],
        isReevaluation: [false]
      })
  
      this.evaluatorsubjectform = this.formBuilder.group({
        in_orgid: 1,
        in_fdate: ['1990-01-01'],
        in_tdate: ['1990-01-01'],
        in_exam_month_yr: [''],
        in_course_code: [''],
        in_course_year_code: [''],
        in_subject_code: [''],
        inevalutorprofileid: [0],
        in_exam_date: '1990-01-01',
        in_regulation_code: ''
      });
      if (this.parameterservice.paramsList) {
        this.params = this.parameterservice.paramsList
      }
      this.getFiltersList();
    }
    /* -------- FILTERS DATA SP -------*/
    getFiltersList(): void {
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
                this.evaluatorForm.get('courseId').setValue(this.courses[0].fk_course_id);
                this.selectedCourse(this.evaluatorForm.value.courseId)
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
      this.evaluatorForm.get('academicYearId').setValue('')
      this.evaluatorForm.get('examId').setValue('');
      this.evaluatorForm.get('collegeId').setValue('');
      this.evaluatorForm.get('courseGroupId').setValue('');
      this.evaluatorForm.get('courseYearId').setValue('');
      this.evaluatorForm.get('regulationId').setValue(0);
      this.evaluatorForm.get('subjectId').setValue(0);
      this.evaluatorForm.get('inevalutorprofileid').setValue(0);
      this.regulationSubjectsList = [];
      this.regulationFilterList = [];
      this.regulationList = [];
      this.subjectsDetailList = [];
      this.subjectsList = [];
      this.subjectData = [];
      this.academicYears = []
      this.academicYearsList = []
      this.examData = []
      this.colleges = []
      this.courseGroups = []
      this.courseYears = []
      this.regulationList = []
      this.subjectData = []
      this.evaluatedReport = [];
      this.dataSource = new MatTableDataSource<any>([]);
      this.evaluatorsList = [];
      this.evaluatedDuplicateReport = [];
      this.evaluators = [];
      this.evaluatorsData = [];
      if (courseId != null) {
        this.courseCode = this.courses.filter(x => x.fk_course_id == this.evaluatorForm.value.courseId)[0]?.course_code;
        this.academicYearsList = this.CollegesListFilterDetails.filter(x => (x.fk_course_id == this.evaluatorForm.value.courseId))
        if (this.academicYearsList.length > 0) {
          const academicYears = this.academicYearsList.map(({ fk_academic_year_id }) => fk_academic_year_id);
          this.academicYears = this.academicYearsList.filter(({ fk_academic_year_id }, index) => !academicYears.includes(fk_academic_year_id, index + 1));
        }
  
        if (this.academicYears.length > 0) {
          this.evaluatorForm.get('academicYearId').setValue(this.academicYears[0].fk_academic_year_id);
          this.selectedAcademicYear(this.evaluatorForm.value.academicYearId)
        }
  
      }
    }
  
    selectedAcademicYear(academicYearId): void {
      this.evaluatorForm.get('examId').setValue('');
      this.evaluatorForm.get('collegeId').setValue('');
      this.evaluatorForm.get('courseGroupId').setValue('');
      this.evaluatorForm.get('courseYearId').setValue('');
      this.evaluatorForm.get('regulationId').setValue(0);
      this.evaluatorForm.get('subjectId').setValue(0);
      this.evaluatorForm.get('inevalutorprofileid').setValue(0);
      this.examsLists = []
      this.examsList = [];
      this.examData = []
      this.regulationSubjectsList = [];
      this.regulationFilterList = [];
      this.regulationList = [];
      this.subjectsDetailList = [];
      this.subjectsList = [];
      this.subjectData = [];
      this.evaluatedReport = [];
      this.dataSource = new MatTableDataSource<any>([]);
      this.evaluatorsList = [];
      this.evaluatedDuplicateReport = [];
      this.evaluators = [];
      this.evaluatorsData = [];
      if (academicYearId) {
        this.academicyear = this.academicYears.filter(x => x.fk_academic_year_id == this.evaluatorForm.value.academicYearId)[0]?.academic_year;
        this.examsLists = this.CollegesListFilterDetails.filter(x => (x.fk_course_id === this.evaluatorForm.value.courseId && x.fk_academic_year_id == this.evaluatorForm.value.academicYearId))
        if (this.examsLists.length > 0) {
          const examsLists = this.examsLists.map(({ fk_exam_id }) => fk_exam_id);
          this.examsList = this.examsLists.filter(({ fk_exam_id }, index) => !examsLists.includes(fk_exam_id, index + 1));
          this.examData = this.examsList;
        }
  
        if (this.examsList.length > 0) {
          this.evaluatorForm.get('examId').setValue(this.examsList[0].fk_exam_id);
          this.selectedExam(this.evaluatorForm.value.examId);
        }
      }
    }
  
    selectedExam(examId) {
      this.evaluatorForm.get('regulationId').setValue(0);
      this.evaluatorForm.get('subjectId').setValue(0);
      this.evaluatorForm.get('inevalutorprofileid').setValue(0);
      this.regulationSubjectsList = [];
      this.regulationFilterList = [];
      this.regulationList = [];
      this.subjectsDetailList = [];
      this.subjectsList = [];
      this.subjectData = [];
      this.evaluatedReport = [];
      this.dataSource = new MatTableDataSource<any>([]);
      this.evaluatorsList = [];
      this.evaluatedDuplicateReport = [];
      this.evaluators = [];
      this.evaluatorsData = [];
    }
    dateChange(){
      this.evaluatedReport = [];
      this.dataSource = new MatTableDataSource<any>(this.evaluatedReport);
      this.dataSource.paginator = this.paginator;
      this.dataSource.sort = this.sort;
    }
    getList() {
      this.evaluatedReport = [];
      this.evaluatedDuplicateReport = [];
      this.dataSource = new MatTableDataSource<any>([]);
      if (this.evaluatorForm.valid) {
        this.spinner.show();
        let flag;
        if (this.evaluatorForm.value.isReevaluation === true) {
          flag = 'REG_SUP_REVAL';
        } else {
          flag = 'REG_SUP';
        }
        let request = [
          { paramName: 'in_flag', paramValue: flag },
        { paramName: 'in_course_year_id', paramValue: this.evaluatorForm.value.courseYearId },
         
          { paramName: 'in_course_id', paramValue: this.evaluatorForm.value.courseId },
          { paramName: 'in_exam_id', paramValue: this.evaluatorForm.value.examId },
        ];
        this.crudService.getDetailsByRequest(this.getExamUnassnListUrl, '', request, '&')
          .subscribe(result => {
            this.spinner.hide();
            if (result.statusCode === 200) {
              if (result.data && result.data !== '' && result.data.result.length > 0) {
                if (result.data.result[0].length > 0) {
                  this.evaluatedReport = result.data.result[0];
                  console.log(this.evaluatedReport,"EvaluatedReport");
                  this.snotifyService.success(result.message, 'Success!');
                  this.dataSource = new MatTableDataSource<any>(this.evaluatedReport);
                  this.dataSource.paginator = this.paginator;
                  this.dataSource.sort = this.sort;
                  this.getCollegeLogo();
                }
                else {
                  this.snotifyService.success("No Records Found", 'Success!');
                }
              } else {
                this.snotifyService.success("No Records Found", 'Success!');
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
      } else {
        this.snotifyService.info("Please Select Valid Filters", 'Info!');
      }
    }
  
    applyFilter(filterValue) {
      this.dataSource.filter = filterValue.trim().toLowerCase();
  
      if (this.dataSource.paginator) {
        this.dataSource.paginator.firstPage();
      }
    }
    getCollegeLogo(): void {
      this.collegesLogoList = [];
      /*----------- COLLEGES -----------*/
      this.crudService.listDetailsById(this.collegeCrudUrl, 'true', this.isActive)
        .subscribe(result => {
          if (result.statusCode === 200) {
            if (result.data.resultList && result.data.resultList !== '') {
              this.collegesLogoList = result.data.resultList;
              //  for(let i=0; i<this.colleges.length; i++){
              this.Logo = this.collegesLogoList[0].logo
              //  }    
  
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
    exportAsExcel() {
      const uri = 'data:application/vnd.ms-excel;base64,';
      const template = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40"><head><!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>{worksheet}</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]--></head><body><table>{table}</table></body></html>`;
      const base64 = function (s) { return window.btoa(unescape(encodeURIComponent(s))) };
      const format = function (s, c) { return s.replace(/{(\w+)}/g, function (m, p) { return c[p]; }) };
      const table = this.excelTable.nativeElement;
      const ctx = { worksheet: 'Worksheet', table: table.innerHTML };
      const link = document.createElement('a');
      link.download = `${this.trafoexternalItem}.xls`;
      link.href = uri + base64(format(template, ctx));
      link.click();
  
    }
    printPage() {
      this.bulk = false
      setTimeout(() => {
        window.print();
      }, 500);
  
    }
    printBulk() {
      this.bulk = true
      setTimeout(() => {
        window.print();
      }, 500);
  
    }
    goBack() {
      this.router.navigate(['admin-examination-management/admin-exam-reports/exam-verification'])
      // this.location.back();
    }

}
