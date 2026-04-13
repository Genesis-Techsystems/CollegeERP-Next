import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { CONSTANTS } from 'app/main/common/constants';
import { GenericFunctions } from 'app/main/common/generic-functions';
import { CrudService } from 'app/main/services/crud.service';
import { SnotifyService } from 'ng-snotify';
import { NgxSpinnerService } from 'ngx-spinner';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { MatDialog } from '@angular/material/dialog';
import { ParametersService } from 'app/main/services/parameters.service';
import { Location } from '@angular/common';


@Component({
  selector: 'app-exam-evaluation-report',
  templateUrl: './exam-evaluation-report.component.html',
  styleUrls: ['./exam-evaluation-report.component.scss']
})
export class ExamEvaluationReportComponent implements OnInit {

  displayedColumns: string[] = ['id', 'semester', 'subjectcode','subjectname' ,'totalUploaded', 'evaluationAssigned', 'evaluationUnAssigned', 'evaluationCompleted', 'evaluatorType', 'evaluatorName', 'email', 'mobile', 'examEvaluatorsId', 'NumberOfAssignEvaluators', 'NumberOfDueEvaluators'];
  dataSource: MatTableDataSource<any>;

  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild(MatSort) sort: MatSort;
  @ViewChild('excelTable', { static: false }) excelTable: ElementRef;

  trafoexternalItem = "Exam Evaluation Report";

  private getExamEvaluationSubjectCodes = CONSTANTS.getExamEvaluationCodesUrl;
  private getEvaluatorsBankCopyUrl = CONSTANTS.getEvaluatorsBankCopy;
  private evaluationDetailReportUrl = CONSTANTS.evaluationDetailReportUrl
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
        this.academicYears = this.academicYears.sort((a, b) => parseInt(b.academic_year) - parseInt(a.academic_year))
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
    if (this.evaluatorForm.value.regulationId === 0) {
      this.subjectsDetailList = this.regulationFilterList;
    } else {
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
  //       if (this.courseGroups.length > 0) {
  //         this.evaluatorForm.get('courseGroupId').setValue(this.courseGroups[0].fk_course_group_id);
  //         this.selectedGroup(this.evaluatorForm.value.courseGroupId)
  //       }
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
  //   /*----------- COURSES Years -----------*/
  //   this.courseYearsList = this.CollegesListDetails.filter(x => (x.fk_college_id == this.evaluatorForm.value.collegeId && x.fk_course_group_id == courseGroupId))
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
  //       if (this.regulationList.length > 0) {
  //         // this.bulkHallticketDetails =[]
  //         this.evaluatorForm.get('regulationId').setValue(this.regulationList[0].fk_regulation_id);
  //         this.selectedRegulation(this.evaluatorForm.value.regulationId)
  //       }
  //   }
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
  selectedsubject(subjectId) {
    this.evaluatorForm.get('inevalutorprofileid').setValue(0);
    this.evaluatedReport = [];
    this.dataSource = new MatTableDataSource<any>([]);
    this.evaluatorsList = [];
    this.evaluatedDuplicateReport = [];
    this.evaluators = [];
    this.evaluatorsData = [];
    let request = [
      { paramName: 'in_flag', paramValue: 'univ_exam_subject_inep' },
      { paramName: 'in_flag_type', paramValue: 'ONL_EVAL' },
      { paramName: 'in_university_id', paramValue: 0 },
      { paramName: 'in_college_id', paramValue: 0 },
      { paramName: 'in_course_id', paramValue: this.evaluatorForm.value.courseId },
      { paramName: 'in_course_group_id', paramValue: 0 },
      { paramName: 'in_course_year_id', paramValue: 0 },
      { paramName: 'in_exam_id', paramValue: this.evaluatorForm.value.examId },
      { paramName: 'in_academic_year_id', paramValue: this.evaluatorForm.value.academicYearId },
      { paramName: 'in_regulation_id', paramValue: this.evaluatorForm.value.regulationId },
      { paramName: 'in_subject_id', paramValue: this.evaluatorForm.value.subjectId },
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
              if (this.filtersDetailsList[i].length > 0 && this.filtersDetailsList[i][0].flag === 'univ_exam_subject_inep') {
                this.evaluatorsList = this.filtersDetailsList[i];
              }
            }
            const evaluators_data = this.evaluatorsList.map(({ fk_exam_evaluator_profile_id }) => fk_exam_evaluator_profile_id);
            this.evaluators = this.evaluatorsList.filter(({ fk_exam_evaluator_profile_id }, index) =>
              !evaluators_data.includes(fk_exam_evaluator_profile_id, index + 1));
            this.evaluatorsData = this.evaluatorsList.filter(({ fk_exam_evaluator_profile_id }, index) =>
              !evaluators_data.includes(fk_exam_evaluator_profile_id, index + 1));
            if (this.evaluatorsData.length > 0) {
              this.evaluatorForm.get('inevalutorprofileid').setValue(this.evaluatorsData[0].fk_exam_evaluator_profile_id)
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
    if (this.evaluatorForm.value.subjectCode != 0) {
      this.subjectCode = this.subjects.filter(x => (x.evaluator_subject_code === this.evaluatorForm.value.subjectCode))[0]?.evaluator_subject_code;
      this.subjectname = this.subjects.filter(x => (x.evaluator_subject_code === this.evaluatorForm.value.subjectCode))[0]?.subject_name;
    }
    else {
      this.subjectCode = '';
      this.subjectname = '';
    }
    if (this.evaluatorForm.value.fk_exam_evaluator_profile_id != 0) {
      this.Evaluatorname = this.evaluators.filter(x => (x.fk_exam_evaluator_profile_id === this.evaluatorForm.value.fk_exam_evaluator_profile_id))[0]?.evaluator_name;
      this.userName = this.evaluators.filter(x => (x.fk_exam_evaluator_profile_id === this.evaluatorForm.value.fk_exam_evaluator_profile_id))[0]?.user_name
    }
    else {
      this.Evaluatorname = '';
      this.userName = '';
    }
    if (this.params) {
      this.getList();
    }
  }
  getList() {
    this.evaluatedReport = [];
    this.evaluatedDuplicateReport = [];
    this.dataSource = new MatTableDataSource<any>([]);
    if (this.evaluatorForm.valid) {
      this.spinner.show();
      let flag;
      if (this.evaluatorForm.value.isReevaluation === true) {
        flag = 're_evaluation_report';
      } else {
        flag = 'evaluation_report';
      }
      let request = [
        { paramName: 'in_flag', paramValue: flag },
        { paramName: 'in_fdate', paramValue: '1900-01-01' },
        { paramName: 'in_tdate', paramValue: '1900-01-01' },
        { paramName: 'in_course_id', paramValue: this.evaluatorForm.value.courseId },
        { paramName: 'in_exam_id', paramValue: this.evaluatorForm.value.examId },
        { paramName: 'in_regulation_id', paramValue: this.evaluatorForm.value.regulationId },
        { paramName: 'in_subject_id', paramValue: this.evaluatorForm.value.subjectId },
        { paramName: 'in_evalutor_profileid', paramValue: this.evaluatorForm.value.inevalutorprofileid },
      ];
      this.crudService.getDetailsByRequest(this.evaluationDetailReportUrl, '', request, '&')
        .subscribe(result => {
          this.spinner.hide();
          if (result.statusCode === 200) {
            if (result.data && result.data !== '' && result.data.result.length > 0) {
              if (result.data.result[0].length > 0) {
                this.evaluatedReport = result.data.result[0];
                // this.snotifyService.success(result.message, 'Success!');
                // this.getStudentsList();
                this.evaluatedReport = this.evaluatedReport.filter(x => x.no_of_students_assigned !== 0)
                this.dataSource = new MatTableDataSource<any>(this.evaluatedReport);
                this.dataSource.paginator = this.paginator;
                this.dataSource.sort = this.sort;
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

  getstudentList(row, list) {
    this.examStudentList = []
    this.studentsList = []
    this.AssignedList = []
    if(row.fk_exam_evaluator_profile_id !== undefined || row.fk_exam_evaluator_profile_id !== null){
    let request = [
      { paramName: 'in_flag', paramValue: 'list_evaluationstudent_list' },
      { paramName: 'in_orgid', paramValue: +localStorage.getItem('organizationId') },
      { paramName: 'in_fdate', paramValue: '1990-01-01' },
      { paramName: 'in_tdate', paramValue: '1990-01-01' },
      { paramName: 'in_evalutor_profileid', paramValue: row.fk_exam_evaluator_profile_id },
      { paramName: 'in_exam_date', paramValue: '1990-01-01' },
      { paramName: 'in_emp_id', paramValue: 0 },
      { paramName: 'in_questionpaper_id', paramValue: 0 },
      { paramName: 'in_evaluator_role_id', paramValue: 0 },
      { paramName: 'in_academic_year', paramValue: '' },
      { paramName: 'in_exam_short_name', paramValue: '' },
      { paramName: 'in_affiliatedto_catdet_id', paramValue: 0 },
      { paramName: 'in_exam_id', paramValue: row.fk_exam_id },
      { paramName: 'in_course_year_id', paramValue: 0 },
      { paramName: 'in_subject_id', paramValue: row.fk_subject_id },
      { paramName: 'in_regulation_id', paramValue: row.fk_regulation_id },
      { paramName: 'in_course_id', paramValue: this.evaluatorForm.value.courseId },
      { paramName: 'in_academic_year_id', paramValue: this.evaluatorForm.value.academicYearId },
      { paramName: 'in_loginuser_empid', paramValue: +localStorage.getItem('employeeId') }
    ];
    this.crudService.getDetailsByRequest(this.getExamEvaluationSubjectCodes, '', request, '&')
      // let empId = +localStorage.getItem('employeeId');
      // // this.flag = false;
      // /* -------- EXAM SESSIONS -------*/
      // this.crudService.listByEighteenIds(this.getExamEvaluationSubjectCodes,
      //   'list_evaluationstudent_list',
      //   this.evaluatorsubjectform.value.in_orgid,
      //   this.evaluatorsubjectform.value.in_fdate,
      //   this.evaluatorsubjectform.value.in_tdate,
      //   this.evaluatorForm.value.examMnthYear,
      //   this.evaluatorForm.value.CourseCode,
      //   row.course_year_code,
      //   row.subject_code  ,
      //   this.evaluatorsubjectform.value.inevalutorprofileid,
      //   this.evaluatorsubjectform.value.in_exam_date,
      //   this.evaluatorsubjectform.value.in_regulation_code,
      //   0, 0, 0, '', '', 1,empId,

      //   //  this.evaluatorsubjectform.value.in_exam_date,
      //   //  this.evaluatorsubjectform.value.in_regulation_code,
      //   'in_flag', 'in_orgid', 'in_fdate', 'in_tdate', 'in_exam_month_yr', 'in_course_code', 'in_course_year_code', 'in_subject_code', 'in_evalutor_profileid', 'in_exam_date', 'in_regulation_code', 'in_emp_id', 'in_questionpaper_id', 'in_evaluator_role_id', 'in_academic_year', 'in_exam_short_name', 'in_affiliatedto_catdet_id',
      //   'in_loginuser_empid'
      // )
      .subscribe(result => {
        this.spinner.hide();
        if (result.statusCode === 200) {
          if (result.data && result.data !== '' && result.data.result.length > 0) {
            this.examStudentList = result.data.result[0];
            for (let i = 0; i < this.examStudentList.length; i++) {
              // if(this.examStudentList[i].rnk==1 && this.examStudentList[i].is_answerpaper_uploaded==1){
              if (this.examStudentList[i].is_answerpaper_uploaded == 1) {
                this.studentsList.push(this.examStudentList[i])
              }
            }
            if (list === 'Assign') {
              this.studentsList = this.studentsList.filter(x => (x.fk_exam_evaluator_profile_id === row.fk_exam_evaluator_profile_id));

            }
            else if (list == 'Evaluated') {
              this.studentsList = this.studentsList.filter(x => (x.fk_exam_evaluator_profile_id === row.fk_exam_evaluator_profile_id && x.evaluated_totalmarks != null));
            }
            else if (list == 'Due') {
              this.studentsList = this.studentsList.filter(x => (x.fk_exam_evaluator_profile_id === row.fk_exam_evaluator_profile_id && x.evaluated_totalmarks == null));
            } else {
            }
            const AssignedList = this.studentsList.map(({ omr_serial_no }) => omr_serial_no);
            this.AssignedList = this.studentsList.filter(({ omr_serial_no }, index) =>
              !AssignedList.includes(omr_serial_no, index + 1));
            // console.log( this.AssignedList);
            for (let j = 0; j < this.AssignedList.length; j++) {
              this.AssignedList[j].Evaluatorlist = []
              for (let index = 0; index < this.studentsList.length; index++) {
                if (this.AssignedList[j].omr_serial_no == this.studentsList[index].omr_serial_no) {
                  this.AssignedList[j].Evaluatorlist.push({
                    evaluatorName: this.studentsList[index].evaluator_name,
                    marks: this.studentsList[index].evaluated_totalmarks
                  })
                }
              }
            }
            // const dialogRef = this.dialog.open(ViewAnswerSheetsComponent, {
            //   width: '1000px',
            //   data:this.AssignedList
            // });
            // dialogRef.afterClosed().subscribe(details => {
            // });
            if (this.AssignedList.length > 0) {
              this.router.navigate(['admin-examination-management/admin-exam-reports/exam-evaluation-report/view-answer-sheets'])
              this.parameterservice.evlauationStudentData = this.AssignedList;
              this.parameterservice.paramsList = [{
                examMnthYear: this.evaluatorForm.value.examMnthYear,
                CourseCode: this.evaluatorForm.value.CourseCode,
                subjectCode: this.evaluatorForm.value.subjectCode,
                inevalutorprofileid: this.evaluatorForm.value.inevalutorprofileid
              }];
            } else {
              this.snotifyService.success('No Records Found', 'Success!');
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
  getStudentsList(row) {
    this.AssignedList = []
    this.spinner.show();
    this.studentsList = [];
    let request = [
      { paramName: 'in_flag', paramValue: 'student_list' },
      { paramName: 'in_fdate', paramValue: '1900-01-01' },
      { paramName: 'in_tdate', paramValue: '1900-01-01' },
      { paramName: 'in_exam_month_yr', paramValue: '' },
      { paramName: 'in_exam_id', paramValue: this.evaluatorForm.value.examId },
      { paramName: 'in_subject_id', paramValue: this.evaluatorForm.value.subjectId },
      { paramName: 'in_evalutor_profileid', paramValue: 0 },
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
            const AssignedList = this.studentsList.map(({ omr_serial_no }) => omr_serial_no);
            this.AssignedList = this.studentsList.filter(({ omr_serial_no }, index) =>
              !AssignedList.includes(omr_serial_no, index + 1));
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
    // this.getstudentList(row, list);
    // this.AssignStudentDataList = []
    // if (list === 'CompletedList') {
    //   this.AssignStudentDataList = this.studentsList.filter(x => (x.fk_exam_evaluator_profile_id === row.fk_exam_evaluator_profile_id && x.evaluated_totalmarks != null));
    // }
    // else {
    //   this.AssignStudentDataList = this.studentsList.filter(x => (x.fk_exam_evaluator_profile_id === row.fk_exam_evaluator_profile_id));
    // }
    // this.Barcode = row;
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