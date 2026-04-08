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
import { MatDialog } from '@angular/material/dialog';

@Component({
  selector: 'app-evaluators-bank-copy-report',
  templateUrl: './evaluators-bank-copy-report.component.html',
  styleUrls: ['./evaluators-bank-copy-report.component.scss']
})
export class EvaluatorsBankCopyReportComponent implements OnInit {

  displayedColumns: string[] = ['id', 'evaluatorName', 'subjectcode', 'examEvaluatorsId', 'NumberOfAssignEvaluators', 'Amount', 'TotalAmount', 'AccNo', 'IfscCode'];
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
  evaluatedReportsByProfile = [];
  subjectCode = '';
  Evaluatorname = '';
  userName = '';
  collegesLogoList = [];
  Logo;
  universityCode = '';
  studentsList = [];
  subjectname = '';
  CollegesListDetails = [];
  courses = [];
  academicYearsList = [];
  examsList = [];
  examData = [];
  academicYears = [];
  examsLists = [];
  filtersDetailsList: any;
  CollegesListFilterDetails: any;
  courseCode: any;
  academicyear: any;
  regulationFilterList: any;
  colleges: any[];
  courseGroups: any[];
  courseGroupList: any[];
  courseYears: any[];
  courseYearsList: any[];
  regulationList: any[];
  subjectsDetailList: any[];
  subjectData: any[];
  subjectsList: any[];
  examName = '';
  collegeName = '';

  constructor(private formBuilder: FormBuilder, private snotifyService: SnotifyService,
    private crudService: CrudService, private spinner: NgxSpinnerService, private router: Router,
    private genericFunctions: GenericFunctions, private dialog: MatDialog,) {
    this.startDate = new Date();
  }

  ngOnInit(): void {
    this.evaluatorForm = this.formBuilder.group({
      courseId: ['', Validators.required],
      courseGroupId: ['', Validators.required],
      courseYearId: ['', Validators.required],
      regulationId: ['', Validators.required],
      examId: ['', Validators.required],
      academicYearId: ['', Validators.required],
      collegeId: ['', Validators.required],
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
      in_evalutor_profileid: 0,
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
    this.evaluatorForm.get('regulationId').setValue('');
    this.evaluatorForm.get('subjectId').setValue('');
    this.academicYears = []
    this.examsList = [];
    this.colleges = []
    this.courseGroups = []
    this.courseYears = []
    this.regulationList = []
    this.subjectData = []
    this.academicYearsList = []
    this.evaluatedReport = [];
    this.evaluatedReportsByProfile = [];
    this.dataSource = new MatTableDataSource<any>([]);
    if (courseId != null) {
      this.courseCode = this.courses.filter(x => x.fk_course_id == this.evaluatorForm.value.courseId)[0]?.course_code;
      this.universityCode = this.courses.filter(x => x.fk_course_id == this.evaluatorForm.value.courseId)[0]?.university_code;
      this.academicYearsList = this.CollegesListFilterDetails.filter(x => (x.fk_course_id == this.evaluatorForm.value.courseId))
      if (this.academicYearsList.length > 0) {
        const academicYears = this.academicYearsList.map(({ fk_academic_year_id }) => fk_academic_year_id);
        this.academicYears = this.academicYearsList.filter(({ fk_academic_year_id }, index) => !academicYears.includes(fk_academic_year_id, index + 1));
      }
      if (this.academicYears.length > 0) {
        this.academicYears = this.academicYears.sort((a, b) => parseInt(b.academic_year) - parseInt(a.academic_year));
        this.evaluatorForm.get('academicYearId').setValue(this.academicYears[0].fk_academic_year_id);
        this.selectedAcademicYear(this.evaluatorForm.value.academicYearId)
      }

    }
  }
  selectedAcademicYear(academicYearId): void {
    this.academicyear = this.academicYears.filter(x => x.fk_academic_year_id == this.evaluatorForm.value.academicYearId)[0]?.academic_year;
    this.evaluatorForm.get('examId').setValue('');
    this.evaluatorForm.get('collegeId').setValue('');
    this.evaluatorForm.get('courseGroupId').setValue('');
    this.evaluatorForm.get('courseYearId').setValue('');
    this.evaluatorForm.get('regulationId').setValue('');
    this.evaluatorForm.get('subjectId').setValue('');
    this.examsList = [];
    this.colleges = []
    this.courseGroups = []
    this.courseYears = []
    this.regulationList = []
    this.subjectData = []
    this.examsLists = []
    this.examData = []
    this.evaluatedReport = [];
    this.evaluatedReportsByProfile = [];
    this.dataSource = new MatTableDataSource<any>([]);
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
    this.evaluatorForm.get('collegeId').setValue('');
    this.evaluatorForm.get('courseGroupId').setValue('');
    this.evaluatorForm.get('courseYearId').setValue('');
    this.evaluatorForm.get('regulationId').setValue('');
    this.evaluatorForm.get('subjectId').setValue('');
    this.filtersDetailsList = []
    this.colleges = []
    this.courseGroups = []
    this.courseYears = []
    this.regulationList = []
    this.subjectData = []
    this.evaluatedReport = [];
    this.evaluatedReportsByProfile = [];
    this.dataSource = new MatTableDataSource<any>([]);
    this.examName = this.examsList.filter(x => (x.fk_exam_id === this.evaluatorForm.value.examId))[0]?.exam_name;
    let request = [
      { paramName: 'in_flag', paramValue: 'univ_exam_rest_no_tt' },
      { paramName: 'in_flag_type', paramValue: 'ALL' },
      { paramName: 'in_university_id', paramValue: 0 },
      { paramName: 'in_college_id', paramValue: 0 },
      { paramName: 'in_course_id', paramValue: this.evaluatorForm.value.courseId },
      { paramName: 'in_course_group_id', paramValue: 0 },
      { paramName: 'in_course_year_id', paramValue: 0 },
      { paramName: 'in_exam_id', paramValue: this.evaluatorForm.value.examId },
      { paramName: 'in_academic_year_id', paramValue: this.evaluatorForm.value.academicYearId },
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

              this.colleges = this.CollegesListDetails
              const CollegeIdData = this.colleges.map(({ fk_college_id }) => fk_college_id);
              this.colleges = this.colleges.filter(({ fk_college_id }, index) => !CollegeIdData.includes(fk_college_id, index + 1));

              if (this.colleges.length > 0) {
                this.evaluatorForm.get('collegeId').setValue(this.colleges[0].fk_college_id);
                this.selectedCollege(this.evaluatorForm.value.collegeId);
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
  selectedCollege(collegeId): void {
    this.evaluatorForm.get('courseGroupId').setValue('');
    this.evaluatorForm.get('courseYearId').setValue('');
    this.evaluatorForm.get('regulationId').setValue('');
    this.evaluatorForm.get('subjectId').setValue('');
    this.courseGroups = []
    this.courseGroupList = []
    this.courseGroups = []
    this.courseYears = []
    this.regulationList = []
    this.subjectData = []
    this.evaluatedReport = [];
    this.evaluatedReportsByProfile = [];
    this.dataSource = new MatTableDataSource<any>([]);
    if (collegeId != null) {
      this.collegeName = this.colleges.filter(x => (x.fk_college_id == this.evaluatorForm.value.collegeId))[0]?.college_name;
      this.courseGroupList = this.CollegesListDetails.filter(x => (x.fk_college_id == this.evaluatorForm.value.collegeId))
      if (this.courseGroupList.length > 0) {
        const courseGroups = this.courseGroupList.map(({ fk_course_group_id }) => fk_course_group_id);
        this.courseGroups = this.courseGroupList.filter(({ fk_course_group_id }, index) => !courseGroups.includes(fk_course_group_id, index + 1));
      }
      if (this.courseGroups.length > 0) {
        this.evaluatorForm.get('courseGroupId').setValue(this.courseGroups[0].fk_course_group_id);
        this.selectedGroup(this.evaluatorForm.value.courseGroupId)
      }
    }
  }
  selectedGroup(courseGroupId): void {
    this.evaluatorForm.get('courseYearId').setValue('');
    this.evaluatorForm.get('regulationId').setValue('');
    this.evaluatorForm.get('subjectId').setValue('');
    this.courseYearsList = []
    this.courseYears = []
    this.regulationList = []
    this.subjectData = []
    this.evaluatedReport = [];
    this.evaluatedReportsByProfile = [];
    this.dataSource = new MatTableDataSource<any>([]);
    /*----------- COURSES Years -----------*/
    if (courseGroupId === 0) {
      this.courseYearsList = this.CollegesListDetails.filter(x => (x.fk_college_id == this.evaluatorForm.value.collegeId));
    } else {
      this.courseYearsList = this.CollegesListDetails.filter(x => (x.fk_college_id == this.evaluatorForm.value.collegeId && x.fk_course_group_id == courseGroupId));
    }
    if (this.courseYearsList.length > 0) {
      const courseYearsList = this.courseYearsList.map(({ fk_course_year_id }) => fk_course_year_id);
      this.courseYears = this.courseYearsList.filter(({ fk_course_year_id }, index) => !courseYearsList.includes(fk_course_year_id, index + 1));
    }
    if (this.courseYears.length > 0) {
      this.evaluatorForm.get('courseYearId').setValue(this.courseYears[0].fk_course_year_id);
      this.selectedYear(this.evaluatorForm.value.courseYearId);
    }
  }
  selectedYear(courseYearId) {
    this.evaluatorForm.get('subjectId').setValue('');
    this.evaluatorForm.get('regulationId').setValue('');
    this.regulationList = []
    this.subjectData = []
    this.evaluatedReport = [];
    this.evaluatedReportsByProfile = [];
    this.dataSource = new MatTableDataSource<any>([]);
    if (this.regulationFilterList.length > 0) {
      const regulationDetailList = this.regulationFilterList.map(({ fk_regulation_id }) => fk_regulation_id);
      this.regulationList = this.regulationFilterList.filter(({ fk_regulation_id }, index) => !regulationDetailList.includes(fk_regulation_id, index + 1));
    }
    if (this.regulationList.length > 0) {
      this.evaluatorForm.get('regulationId').setValue(this.regulationList[0].fk_regulation_id);
      this.selectedRegulation(this.evaluatorForm.value.regulationId)
    }
  }

  selectedRegulation(regulationId): void {
    this.evaluatorForm.get('subjectId').setValue('');
    this.subjectsDetailList = []
    this.subjectData = []
    this.subjectsList = []
    this.evaluatedReport = [];
    this.evaluatedReportsByProfile = [];
    this.dataSource = new MatTableDataSource<any>([]);
    let request = [
      { paramName: 'in_flag', paramValue: 'univ_exam_subject_uc' },
      { paramName: 'in_flag_type', paramValue: 'ALL' },
      { paramName: 'in_university_id', paramValue: 0 },
      { paramName: 'in_college_id', paramValue: this.evaluatorForm.value.collegeId },
      { paramName: 'in_course_id', paramValue: this.evaluatorForm.value.courseId },
      { paramName: 'in_course_group_id', paramValue: this.evaluatorForm.value.courseGroupId },
      { paramName: 'in_course_year_id', paramValue: this.evaluatorForm.value.courseYearId },
      { paramName: 'in_exam_id', paramValue: this.evaluatorForm.value.examId },
      { paramName: 'in_academic_year_id', paramValue: this.evaluatorForm.value.academicYearId },
      { paramName: 'in_regulation_id', paramValue: this.evaluatorForm.value.regulationId },
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
              if (this.filtersDetailsList[i].length > 0 && this.filtersDetailsList[i][0].flag === 'univ_exam_sub_uc') {
                this.subjectsDetailList = this.filtersDetailsList[i];
              }
            }
            if (this.subjectsDetailList) {
              if (this.subjectsDetailList.length > 0) {
                const subjectsDetailList = this.subjectsDetailList.map(({ fk_subject_id }) => fk_subject_id);
                this.subjectsList = this.subjectsDetailList.filter(({ fk_subject_id }, index) => !subjectsDetailList.includes(fk_subject_id, index + 1));
                this.subjectData = this.subjectsList;
              }
              if (this.subjectsList.length > 0) {
                this.evaluatorForm.get('subjectId').setValue(this.subjectsList[0].fk_subject_id);
                this.selectedsubject(this.evaluatorForm.value.subjectId)
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
  selectedsubject(subjectCode) {
    this.evaluatorForm.get('inevalutorprofileid').setValue('');
    this.evaluatedReport = [];
    this.evaluatedReportsByProfile = [];
    this.dataSource = new MatTableDataSource<any>([]);
    this.evaluatorsList = [];
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
            if (this.evaluatorsData.length > 0) {
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
  dateChange() {
    this.evaluatedReport = [];
    this.evaluatedReportsByProfile = [];
    this.dataSource = new MatTableDataSource<any>([]);
  }
  selectedEvaluator() {
    this.evaluatedReport = [];
    this.evaluatedReportsByProfile = [];
    this.dataSource = new MatTableDataSource<any>([]);
    this.subjectCode = this.subjects.filter(x => (x.evaluator_subject_code === this.evaluatorForm.value.subjectCode))[0]?.evaluator_subject_code;
    this.subjectname = this.subjects.filter(x => (x.evaluator_subject_code === this.evaluatorForm.value.subjectCode))[0]?.subject_name;
    this.Evaluatorname = this.evaluators.filter(x => (x.pk_exam_evaluator_profile_id === this.evaluatorForm.value.inevalutorprofileid))[0]?.evaluator_name;
    this.userName = this.evaluators.filter(x => (x.pk_exam_evaluator_profile_id === this.evaluatorForm.value.inevalutorprofileid))[0]?.user_name
  }
  getList() {
    this.evaluatedReport = [];
    this.evaluatedReportsByProfile = [];
    this.dataSource = new MatTableDataSource<any>([]);
    if (this.evaluatorForm.valid) {
      this.spinner.show();
      let flag;
      if (this.evaluatorForm.value.isReevaluation === true) {
        flag = 're_evaluator_remuneration';
      } else {
        flag = 'evaluator_remuneration';
      }
      let request = [
        { paramName: 'in_flag', paramValue: flag },
        { paramName: 'in_fdate', paramValue: '1990-01-01' },
        { paramName: 'in_tdate', paramValue: '1990-01-01' },
        { paramName: 'in_exam_month_yr', paramValue: '1990-01-01' },
        { paramName: 'in_exam_id', paramValue: this.evaluatorForm.value.examId },
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
              this.evaluatedReport = result.data.result[0];
              this.dataSource = new MatTableDataSource<any>(this.evaluatedReport);
              this.dataSource.paginator = this.paginator;
              this.dataSource.sort = this.sort;
              if (this.evaluatedReport && this.evaluatedReport.length > 0) {
                this.evaluatedReportsByProfile = Object.values(
                  this.evaluatedReport.reduce((acc, item) => {
                    // unique key per group_id + evaluator profile
                    const key = `${item.fk_exam_evaluator_profile_id}`;

                    if (!acc[key]) {
                      acc[key] = {
                        ...item, // copy full evaluator details
                        subjects: [],
                        assigned_scripts: 0,
                        total_scripts: 0,
                        total_amount: 0,
                        final_amount: 0,
                        total_final_amount: 0,
                      };
                    }

                    // push subject data
                    acc[key].subjects.push({
                      subject_code: item.subject_code,
                      subject_name: item.subject_name,
                      no_of_evaluations_completed: item.no_of_evaluations_completed,
                      amount: item.amount,
                      final_amount: item.final_amount,
                    });

                    // update totals
                    acc[key].assigned_scripts += item.no_of_students_assigned;
                    acc[key].total_scripts += item.no_of_evaluations_completed;
                    acc[key].total_amount += item.amount;
                    acc[key].total_final_amount += item.final_amount;

                    return acc;
                  }, {} as { [key: string]: any })
                );
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
    } else {
      this.snotifyService.info('Please Select Required Filters', 'Info!');
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
            this.Logo = this.collegesLogoList[0].logo;
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
  // exportAsExcel() {
  //   const ws: XLSX.WorkSheet = XLSX.utils.table_to_sheet(this.excelTable.nativeElement);
  //   const wb: XLSX.WorkBook = XLSX.utils.book_new();
  //   XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');

  //   /* save to file */
  //   XLSX.writeFile(wb, 'Evaluator Remuneration Report.xlsx');

  // }
  exportAsExcel() {
    // Prepare your data for export
    const data = this.evaluatedReportsByProfile.map(report => ({
      'Exam Name': String(report.exam_name || ''),
      'Evaluator Name': String(report.evaluator_name || ''),
      'Mobile': String(report.phonenumber || ''),
      'Bank Name': String(report.bank_name || ''),
      'Bank Address': String(report.bank_address || ''),
      'Account Number': String(report.account_number || ''),
      'IFSC Code': String(report.ifsc_code || ''),
      'Total Scripts Assigned': report.assigned_scripts,
      'Total Evaluations Completed': report.total_scripts,
      'Total Subjects': report.subjects?.length || 0,
      'Amount Per Evaluation': report.amount,
      'Final Amount': report.total_final_amount > 500 ? report.total_final_amount : 500
    }));

    // Convert JSON → worksheet
    const ws: XLSX.WorkSheet = XLSX.utils.json_to_sheet(data);
    // Force "Exam Name" column (A) to be text so Excel doesn't auto-convert it
    const range = XLSX.utils.decode_range(ws['!ref'] || '');
    for (let R = range.s.r + 1; R <= range.e.r; ++R) {
      const cellAddress = XLSX.utils.encode_cell({ r: R, c: 0 }); // column A
      const cell = ws[cellAddress];
      if (cell) {
        cell.t = 's'; // force type: string
      }
    }

    // Create workbook and append sheet
    const wb: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Evaluator Remuneration Report');

    // Export file
    XLSX.writeFile(wb, 'Evaluator_Remuneration_Report.xlsx');
  }

  printPage() {
    window.print()
  }
}