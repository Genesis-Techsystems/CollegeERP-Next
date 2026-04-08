import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { FormGroup, FormControl, FormBuilder, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { CONSTANTS } from 'app/main/common/constants';
import { GenericFunctions } from 'app/main/common/generic-functions';
import { CrudService } from 'app/main/services/crud.service';
import { SnotifyService } from 'ng-snotify';
import { NgxSpinnerService } from 'ngx-spinner';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import * as XLSX from 'xlsx';
import { EvaluatorAnswerSheetsComponent } from './evaluator-answer-sheets/evaluator-answer-sheets.component';
import { MatDialog } from '@angular/material/dialog';
import { Location } from '@angular/common';
import { ParametersService } from 'app/main/services/parameters.service';


@Component({
  selector: 'app-daily-evaluated-report',
  templateUrl: './daily-evaluated-report.component.html',
  styleUrls: ['./daily-evaluated-report.component.scss']
})
export class DailyEvaluatedReportComponent implements OnInit {

  displayedColumns: string[] = ['id', 'evaluatorName', 'subjectcode', 'email', 'examEvaluatorsId', 'NumberOfAssignEvaluators'];
  dataSource: MatTableDataSource<any>;

  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild(MatSort) sort: MatSort;
  @ViewChild('TABLE') excelTable: ElementRef;

  private getExamFiltersBycodeUrl = CONSTANTS.getExamFiltersBycodeUrl;
  private getExamEvaluationCodesUrl = CONSTANTS.getExamEvaluationCodesUrl;
  private getEvaluatorsBankCopyUrl = CONSTANTS.getEvaluatorsBankCopy;
  private collegeCrudUrl = CONSTANTS.collegeCrudUrl;
  private isActive = CONSTANTS.isActive;

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
  backbutton: boolean;
  filtersDetailsList: any;
  subjectsDetailList: any;
  subjectData: any;
  examData: any;
  examsList: any;
  subjectsList: any;
  regulationList: any[];
  regulationFilterList: any;
  courseYearsList: any[];
  courseYears: any[];
  CollegesListDetails: any;
  courseGroupList: any;
  courseGroups: any[];
  CollegesListFilterDetails: any;
  examsLists: any[];
  academicYears: any;
  academicyear: any;
  academicYearsList: any;
  courses: any;
  courseCode: any;
  colleges: any[];
  regulationSubjectsList = [];

  constructor(private formBuilder: FormBuilder, private snotifyService: SnotifyService,
    private crudService: CrudService, private spinner: NgxSpinnerService, private router: Router,
    private genericFunctions: GenericFunctions, private dialog: MatDialog, private location: Location, private parameterservice: ParametersService) {
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
      fDate: [this.genericFunctions.moment()],
      tDate: [this.genericFunctions.moment()],
      isReevaluation: [false],
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
    this.academicyear = this.academicYears.filter(x => x.fk_academic_year_id == this.evaluatorForm.value.academicYearId)[0]?.academic_year
    this.evaluatorForm.get('examId').setValue('');
    this.evaluatorForm.get('collegeId').setValue('');
    this.evaluatorForm.get('courseGroupId').setValue('');
    this.evaluatorForm.get('courseYearId').setValue('');
    this.evaluatorForm.get('regulationId').setValue(0);
    this.evaluatorForm.get('subjectId').setValue(0);
    this.evaluatorForm.get('inevalutorprofileid').setValue(0);
    this.examsLists = [];
    this.examsList = [];
    this.examData = [];
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
  selectedExam(examId): void {
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
    if (this.evaluatorForm.value.examId != null && examId != null) {
          /*----------- SUBJECTS -----------*/
          let request = [
            { paramName: 'in_flag', paramValue: 'univ_exam_subject_regexamstd' },
            { paramName: 'in_flag_type', paramValue: 'REGSUP' },
            { paramName: 'in_university_id', paramValue: 0 },
            { paramName: 'in_univ_examcenter_id', paramValue: 0 },
            { paramName: 'in_college_id', paramValue: 0 },
            { paramName: 'in_course_id', paramValue: this.evaluatorForm.value.courseId },
            { paramName: 'in_course_group_id', paramValue: 0 },
            { paramName: 'in_course_year_id', paramValue: 0 },
            { paramName: 'in_exam_id', paramValue: this.evaluatorForm.value.examId },
            { paramName: 'in_academic_year_id', paramValue: this.evaluatorForm.value.academicYearId },
            { paramName: 'in_regulation_id', paramValue: 0 },
            { paramName: 'in_sub_flag_type', paramValue: 'NoLAB' },
            { paramName: 'in_subject_id', paramValue: 0 },
            { paramName: 'in_param1', paramValue: 0 },
            { paramName: 'in_param2', paramValue: 0 },
            { paramName: 'in_loginuser_roleid', paramValue: 0 },
            { paramName: 'in_loginuser_empid', paramValue: +localStorage.getItem('employeeId') },
          ];
          this.crudService.getDetailsByRequest(this.getExamFiltersBycodeUrl, '', request, '&')
            .subscribe(result => {
              this.spinner.hide();
              if (result.statusCode === 200) {
                if (result.data && result.data !== '' && result.data.result.length > 0) {
                  this.regulationSubjectsList = result.data.result;
                  for (const list of this.regulationSubjectsList) {
                    if (list?.length > 0 && list[0].flag === 'univ_exam_sub_regexamstd') {
                      this.regulationFilterList = list;
                      break;
                    }
                  }
                  if (this.regulationFilterList.length > 0) {
                          const regulationDetailList = this.regulationFilterList.map(({ fk_regulation_id }) => fk_regulation_id);
                          this.regulationList = this.regulationFilterList.filter(({ fk_regulation_id }, index) => !regulationDetailList.includes(fk_regulation_id, index + 1));
                        }
                        if (this.regulationList.length > 0) {
                          // this.bulkHallticketDetails =[]
                          this.evaluatorForm.get('regulationId').setValue(this.regulationList[0].fk_regulation_id);
                          this.selectedRegulation(this.evaluatorForm.value.regulationId)
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
  selectedRegulation(regulationId): void {
    this.evaluatorForm.get('subjectId').setValue(0);
    this.evaluatorForm.get('inevalutorprofileid').setValue(0);
    this.subjectsDetailList = [];
    this.subjectsList = [];
    this.subjectData = [];
    this.evaluatedReport = [];
    this.dataSource = new MatTableDataSource<any>([]);
    this.evaluatorsList = [];
    this.evaluatedDuplicateReport = [];
    this.evaluators = [];
    this.evaluatorsData = [];
    if(this.evaluatorForm.value.regulationId === 0){
      this.subjectsDetailList = this.regulationFilterList;
    }else{
      this.subjectsDetailList = this.regulationFilterList.filter(x => (x.fk_regulation_id === this.evaluatorForm.value.regulationId));
    }
              if (this.subjectsDetailList && this.subjectsDetailList.length > 0) {
                const subjectsDetailList = this.subjectsDetailList.map(({ fk_subject_id }) => fk_subject_id);
                this.subjectsList = this.subjectsDetailList.filter(({ fk_subject_id }, index) => !subjectsDetailList.includes(fk_subject_id, index + 1));
                this.subjectData = this.subjectsList;
              }
                if (this.subjectsList.length > 0) {
                  this.evaluatorForm.get('subjectId').setValue(this.subjectsList[0].fk_subject_id);
                  this.selectedsubject(this.evaluatorForm.value.subjectId)
                }
  }
selectedsubject(subjectId){
  this.evaluatorForm.get('inevalutorprofileid').setValue('');
  this.evaluatedReport = [];
  this.dataSource = new MatTableDataSource<any>([]);
  this.evaluatorsList = [];
  this.evaluatedDuplicateReport = [];
  this.evaluators = [];
  this.evaluatorsData = [];
  let request = [
    { paramName: 'in_flag', paramValue: 'filter_univexam_evaluator_moderator' },
    { paramName: 'in_orgid', paramValue: +localStorage.getItem('organizationId') },
    { paramName: 'in_fdate', paramValue: '1990-01-01' },
    { paramName: 'in_tdate', paramValue: '1990-01-01' },
    { paramName: 'in_evalutor_profileid', paramValue: 0 },
    { paramName: 'in_exam_date', paramValue: '1990-01-01' },
    { paramName: 'in_emp_id', paramValue: 0 },
    { paramName: 'in_questionpaper_id', paramValue: 0 },
    { paramName: 'in_evaluator_role_id', paramValue: 0 },
    { paramName: 'in_academic_year', paramValue: '' },
    { paramName: 'in_exam_short_name', paramValue: '' },
    { paramName: 'in_affiliatedto_catdet_id', paramValue: 0 },
    { paramName: 'in_exam_id', paramValue: this.evaluatorForm.value.examId },
    { paramName: 'in_course_year_id', paramValue: this.evaluatorForm.value.courseYearId },
    { paramName: 'in_subject_id', paramValue: this.evaluatorForm.value.subjectId },
    { paramName: 'in_regulation_id', paramValue: this.evaluatorForm.value.regulationId },
    { paramName: 'in_course_id', paramValue: this.evaluatorForm.value.courseId },
    { paramName: 'in_academic_year_id', paramValue: this.evaluatorForm.value.academicYearId },
    { paramName: 'in_loginuser_empid', paramValue: +localStorage.getItem('employeeId') }
  ];
  this.crudService.getDetailsByRequest(this.getExamEvaluationCodesUrl, '', request, '&')
    .subscribe(result => {
      this.spinner.hide();
      if (result.statusCode === 200) {
        if (result.data && result.data !== '' && result.data.result.length > 0) {
          this.filtersDetailsList = result.data.result;
          for (let i = 0; i < this.filtersDetailsList.length; i++) {
            if (this.filtersDetailsList[i].length > 0 && this.filtersDetailsList[i][0].flag === 'evaluator_list') {
              this.evaluatorsList = this.filtersDetailsList[i];
            }
          }
          const evaluators_data = this.evaluatorsList.map(({ pk_exam_evaluator_profile_id }) => pk_exam_evaluator_profile_id);
          this.evaluators = this.evaluatorsList.filter(({ pk_exam_evaluator_profile_id }, index) =>
          !evaluators_data.includes(pk_exam_evaluator_profile_id, index + 1));
          this.evaluatorsData = this.evaluatorsList.filter(({ pk_exam_evaluator_profile_id }, index) =>
            !evaluators_data.includes(pk_exam_evaluator_profile_id, index + 1));
          if( this.evaluatorsData.length>0){
            this.evaluatorForm.get('inevalutorprofileid').setValue(this.evaluatorsData[0].pk_exam_evaluator_profile_id)
          }
          this.dateChange();
          this.getCollegeLogo();
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
  // selectedCollege(collegeId): void {
  //   this.courseGroups = []
  //   this.evaluatorForm.get('courseGroupId').setValue('');
  //   this.evaluatorForm.get('courseYearId').setValue('');
  //   this.evaluatorForm.get('regulationId').setValue('');
  //   this.evaluatorForm.get('subjectId').setValue('');
  //   if (collegeId != null) {
  //     this.courseGroupList = []
  //     this.courseGroups = []
  //     this.courseYears = []
  //     this.regulationList = []
  //     this.subjectData = []
  //     this.courseGroupList = this.CollegesListDetails.filter(x => (x.fk_college_id == this.evaluatorForm.value.collegeId))
  //     if (this.courseGroupList.length > 0) {
  //       const courseGroups = this.courseGroupList.map(({ fk_course_group_id }) => fk_course_group_id);
  //       this.courseGroups = this.courseGroupList.filter(({ fk_course_group_id }, index) => !courseGroups.includes(fk_course_group_id, index + 1));
  //     }

  //     if (this.courseGroups.length > 0) {
  //       this.evaluatorForm.get('courseGroupId').setValue(this.courseGroups[0].fk_course_group_id);
  //       this.selectedGroup(this.evaluatorForm.value.courseGroupId)
  //     }
  //   }
  // }

  // selectedGroup(courseGroupId): void {
  //   this.evaluatorForm.get('courseYearId').setValue('');
  //   this.evaluatorForm.get('regulationId').setValue('');
  //   this.evaluatorForm.get('subjectId').setValue('');
  //   this.courseYearsList = []
  //   this.courseYears = []
  //   this.regulationList = []
  //   this.subjectData = []
  //   if(courseGroupId !== 0){
  //       this.courseYearsList = this.CollegesListDetails.filter(x => (x.fk_college_id == this.evaluatorForm.value.collegeId && x.fk_course_group_id == courseGroupId));
  //   }else{
  //       this.courseYearsList = this.CollegesListDetails.filter(x => (x.fk_college_id == this.evaluatorForm.value.collegeId));
  //   }
  //   /*----------- COURSES Years -----------*/
  //   if (this.courseYearsList.length > 0) {
  //     const courseYearsList = this.courseYearsList.map(({ fk_course_year_id }) => fk_course_year_id);
  //     this.courseYears = this.courseYearsList.filter(({ fk_course_year_id }, index) => !courseYearsList.includes(fk_course_year_id, index + 1));
  //   }
  //   //      if (!this.isEmptyObject(this.pageParams) && this.courseYears.length > 0){
  //   //       this.evaluatorForm.get('courseYearId').setValue(+this.pageParams.courseYearId);
  //   //       this.selectedYear( this.evaluatorForm.value.courseYearId);
  //   // } 
  //   //    else 
  //   if (this.courseYears.length > 0) {
  //     this.evaluatorForm.get('courseYearId').setValue(this.courseYears[0].fk_course_year_id);
  //     this.selectedYear(this.evaluatorForm.value.courseYearId);
  //   }
  // }
  // selectedYear(courseYearId) {
  //   this.evaluatorForm.get('subjectId').setValue('');
  //   this.evaluatorForm.get('regulationId').setValue('');
  //   this.regulationList = []
  //   this.subjectData = []
  //   if (courseYearId) {
  //     if (this.regulationFilterList.length > 0) {
  //       const regulationDetailList = this.regulationFilterList.map(({ fk_regulation_id }) => fk_regulation_id);
  //       this.regulationList = this.regulationFilterList.filter(({ fk_regulation_id }, index) => !regulationDetailList.includes(fk_regulation_id, index + 1));
  //     }
  //     if (this.regulationList.length > 0) {
  //       // this.bulkHallticketDetails =[]
  //       this.evaluatorForm.get('regulationId').setValue(this.regulationList[0].fk_regulation_id);
  //       this.selectedRegulation(this.evaluatorForm.value.regulationId)
  //     }

  //   }
  // }

  // selectedRegulation(regulationId): void {
  //   this.evaluatorForm.get('subjectId').setValue('');
  //   this.subjectsDetailList = []
  //   this.subjectData = []
  //   this.subjectsList = []
  //   let request = [
  //     { paramName: 'in_flag', paramValue: 'univ_exam_subject_uc' },
  //     { paramName: 'in_flag_type', paramValue: 'ALL' },
  //     { paramName: 'in_university_id', paramValue: 0 },
  //     { paramName: 'in_college_id', paramValue: this.evaluatorForm.value.collegeId },
  //     { paramName: 'in_course_id', paramValue: this.evaluatorForm.value.courseId },
  //     { paramName: 'in_course_group_id', paramValue: this.evaluatorForm.value.courseGroupId },
  //     { paramName: 'in_course_year_id', paramValue: this.evaluatorForm.value.courseYearId },
  //     { paramName: 'in_exam_id', paramValue: this.evaluatorForm.value.examId },
  //     { paramName: 'in_academic_year_id', paramValue: this.evaluatorForm.value.academicYearId },
  //     { paramName: 'in_regulation_id', paramValue: this.evaluatorForm.value.regulationId },
  //     { paramName: 'in_subject_id', paramValue: 0 },
  //     { paramName: 'in_loginuser_empid', paramValue: +localStorage.getItem('employeeId') },
  //     { paramName: 'in_loginuser_roleid', paramValue: 0 },
  //     { paramName: 'in_sub_flag_type', paramValue: 'ALL' },
  //     { paramName: 'in_param1', paramValue: 0 },
  //     { paramName: 'in_param2', paramValue: 0 },
  //   ];
  //   this.crudService.getDetailsByRequest(this.getExamFiltersBycodeUrl, '', request, '&')
  //     .subscribe(result => {
  //       this.spinner.hide();
  //       if (result.statusCode === 200) {
  //         if (result.data && result.data !== '' && result.data.result.length > 0) {
  //           this.filtersDetailsList = result.data.result;
  //           for (let i = 0; i < this.filtersDetailsList.length; i++) {
  //             if (this.filtersDetailsList[i].length > 0 && this.filtersDetailsList[i][0].flag === 'univ_exam_sub_uc') {
  //               this.subjectsDetailList = this.filtersDetailsList[i];
  //             }
  //           }
  //           if (this.subjectsDetailList) {
  //             if (this.subjectsDetailList.length > 0) {
  //               const subjectsDetailList = this.subjectsDetailList.map(({ fk_subject_id }) => fk_subject_id);
  //               this.subjectsList = this.subjectsDetailList.filter(({ fk_subject_id }, index) => !subjectsDetailList.includes(fk_subject_id, index + 1));
  //               this.subjectData = this.subjectsList;
  //             }
  //             if (this.subjectsList.length > 0) {
  //               this.evaluatorForm.get('subjectId').setValue(this.subjectsList[0].fk_subject_id);
  //               this.selectedsubject(this.evaluatorForm.value.subjectId)
  //             }
  //           }
  //         } else {
  //           this.snotifyService.success(result.message, 'Success!');
  //         }
  //       } else {
  //         this.snotifyService.error(result.message, 'Error!');
  //       }
  //     }, error => {
  //       this.spinner.hide();
  //       if (error.error.statusCode === 401) {
  //         this.snotifyService.error(error.error.message, 'Error!');
  //         this.genericFunctions.logOut(this.router.url);
  //       } else {
  //         this.snotifyService.error(CONSTANTS.message.CON_ERROR, 'Error!');
  //       }
  //     });
  // }

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

  searchSubject(value) {
    this.subjectData = [];
    this.searchsubject(value)
  }

  searchsubject(value: string) {
    let filter = value.toLowerCase();
    for (let i = 0; i < this.subjectsDetailList.length; i++) {
      let option = this.subjectsDetailList[i];
      if (option.subject_name.toLowerCase().indexOf(filter) >= 0) {
        this.subjectData.push(option);
      } else
        if (option.subject_code.toLowerCase().indexOf(filter) >= 0) {
          this.subjectData.push(option);
        }
    }
  }
  dateChange() {
    this.evaluatedReport = [];
    this.dataSource = new MatTableDataSource<any>([]);
    this.endDate = this.evaluatorForm.value.tDate;
  }
  searchEvaluator(value) {
    this.evaluatorsData = [];
    this.evaluatorsFiltr(value);
  }
  evaluatorsFiltr(value: string) {
    let filter = value.toLowerCase();
    for (let i = 0; i < this.evaluators.length; i++) {
      let option = this.evaluators[i];
      if (option.evaluator_name.toLowerCase().indexOf(filter) >= 0) {
        this.evaluatorsData.push(option);
      } else if (option.user_name.toLowerCase().indexOf(filter) >= 0) {
        this.evaluatorsData.push(option);
      }
    }
  }
  selectedEvaluator() {
    this.evaluatedReport = [];
    this.dataSource = new MatTableDataSource<any>([]);
    this.subjectCode = this.subjects.filter(x => (x.evaluator_subject_code === this.evaluatorForm.value.subjectCode))[0]?.evaluator_subject_code;
    this.subjectname = this.subjects.filter(x => (x.evaluator_subject_code === this.evaluatorForm.value.subjectCode))[0]?.subject_name;
    this.Evaluatorname = this.evaluators.filter(x => (x.pk_exam_evaluator_profile_id === this.evaluatorForm.value.inevalutorprofileid))[0]?.evaluator_name;
    this.userName = this.evaluators.filter(x => (x.pk_exam_evaluator_profile_id === this.evaluatorForm.value.inevalutorprofileid))[0]?.user_name
  }
  getList() {
    this.evaluatedReport = [];
    this.evaluatedDuplicateReport = [];
    this.dataSource = new MatTableDataSource<any>([]);
    if (this.evaluatorForm.valid) {
      this.spinner.show();
      let flag;
      if (this.evaluatorForm.value.isReevaluation === true) {
        flag = 'day_wise_report_re_evaluation';
      } else {
        flag = 'day_wise_report';
      }
      this.evaluatedReport = [];
      this.evaluatedDuplicateReport = [];
      this.dataSource = new MatTableDataSource<any>([]);
      this.evaluatorForm.get('fDate').setValue(this.genericFunctions.momentWithDateFormatYMD(this.evaluatorForm.value.fDate));
      this.evaluatorForm.get('tDate').setValue(this.genericFunctions.momentWithDateFormatYMD(this.evaluatorForm.value.tDate));
      let request = [
        { paramName: 'in_flag', paramValue: flag },
        { paramName: 'in_exam_id', paramValue:  this.evaluatorForm.value.examId },
        { paramName: 'in_fdate', paramValue: this.evaluatorForm.value.fDate },
        { paramName: 'in_tdate', paramValue: this.evaluatorForm.value.tDate },
        { paramName: 'in_exam_month_yr', paramValue: '' },
        { paramName: 'in_subject_id', paramValue: this.evaluatorForm.value.subjectId },
        { paramName: 'in_evalutor_profileid', paramValue: this.evaluatorForm.value.inevalutorprofileid },
        { paramName: 'in_exam_date', paramValue: '1990-01-01' },
        { paramName: 'in_emp_id', paramValue: 0 },
        // { paramName: 'in_exam_month_yr', paramValue: this.evaluatorForm.value.examMnthYear },
        { paramName: 'in_questionpaper_id', paramValue: 0 },
        { paramName: 'in_evaluator_role_id', paramValue: 0 },
        { paramName: 'in_academic_year', paramValue: '' },
        { paramName: 'in_exam_short_name', paramValue: '' },
        { paramName: 'in_affiliatedto_catdet_id', paramValue: 1 },
      ];
      this.crudService.getDetailsByRequest(this.getEvaluatorsBankCopyUrl, '', request, '&')
        .subscribe(result => {
          this.spinner.hide();
          if (result.statusCode === 200) {
            if (result.data && result.data !== '' && result.data.result.length > 0) {
              this.evaluatedReport = result.data.result[0];
              this.getStudentsList();
              this.dataSource = new MatTableDataSource<any>(this.evaluatedReport);
              this.dataSource.paginator = this.paginator;
              this.dataSource.sort = this.sort;

              this.evaluatedDuplicateReport = this.evaluatedReport.filter(x => x.no_of_students_assigned > 0);
              // this.examStudentResult = result.data.result[0];
              // if(this.evaluatorForm.value.resultstatus != 'All'){
              // }
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
    else{
        this.snotifyService.info("Please Select Valid Filters", 'Info!');
    }
  }
  getStudentsList() {
    if (this.evaluatorForm.valid) {
      this.spinner.show();
      this.studentsList = [];
      let flag;
      if (this.evaluatorForm.value.isReevaluation === true) {
        flag = 'student_list_re_evaluation';
      } else {
        flag = 'student_list';
      }
      let request = [
        { paramName: 'in_flag', paramValue: flag },
        { paramName: 'in_fdate', paramValue: this.evaluatorForm.value.fDate },
        { paramName: 'in_tdate', paramValue: this.evaluatorForm.value.tDate },
        { paramName: 'in_exam_month_yr', paramValue: '' },
        { paramName: 'in_exam_id', paramValue:  this.evaluatorForm.value.examId },
        { paramName: 'in_subject_id', paramValue: this.evaluatorForm.value.subjectId },
        { paramName: 'in_evalutor_profileid', paramValue: this.evaluatorForm.value.inevalutorprofileid },
        { paramName: 'in_exam_date', paramValue: '1990-01-01' },
        { paramName: 'in_emp_id', paramValue: 0 },
        { paramName: 'in_questionpaper_id', paramValue: 0 },
        { paramName: 'in_evaluator_role_id', paramValue: 0 },
        { paramName: 'in_academic_year', paramValue: '' },
        { paramName: 'in_exam_short_name', paramValue: '' },
        { paramName: 'in_affiliatedto_catdet_id', paramValue: 1 },
      ];
      this.crudService.getDetailsByRequest(this.getEvaluatorsBankCopyUrl, '', request, '&')
        .subscribe(result => {
          this.spinner.hide();
          if (result.statusCode === 200) {
            if (result.data && result.data !== '' && result.data.result.length > 0) {
              this.studentsList = result.data.result[0];
              // this.examStudentResult = result.data.result[0];
              // if(this.evaluatorForm.value.resultstatus != 'All'){
              // }
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
  clickEvent(row, list) {
    this.AssignStudentDataList = []
    if (list === 'CompletedList') {
      this.AssignStudentDataList = this.studentsList.filter(x => (x.fk_exam_evaluator_profile_id === row.fk_exam_evaluator_profile_id && x.evaluated_totalmarks != null));
    }
    else {
      this.AssignStudentDataList = this.studentsList.filter(x => (x.fk_exam_evaluator_profile_id === row.fk_exam_evaluator_profile_id));
    }
    // this.Barcode = row;
    const dialogRef = this.dialog.open(EvaluatorAnswerSheetsComponent, {
      width: '750px',
      data: {
        details: row,
        studentList: this.AssignStudentDataList
      }
    });

    dialogRef.afterClosed().subscribe(details => {
    });
  }
  exportAsExcel() {
    const ws: XLSX.WorkSheet = XLSX.utils.table_to_sheet(this.excelTable.nativeElement);
    const wb: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');

    /* save to file */
    XLSX.writeFile(wb, 'Daily Evaluated Report.xlsx');

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
    this.location.back()
  }
}
