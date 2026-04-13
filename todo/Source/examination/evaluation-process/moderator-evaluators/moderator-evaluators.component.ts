import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { FormGroup, FormControl, FormBuilder, Validators } from '@angular/forms';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { Router } from '@angular/router';
import { CONSTANTS } from 'app/main/common/constants';
import { GenericFunctions } from 'app/main/common/generic-functions';
import { ExamMaster } from 'app/main/models/examMaster';
import { CrudService } from 'app/main/services/crud.service';
import { SnotifyService } from 'ng-snotify';
import { NgxSpinnerService } from 'ngx-spinner';
import { ReplaySubject, Subject } from 'rxjs';
import * as _ from 'lodash';

@Component({
  selector: 'app-moderator-evaluators',
  templateUrl: './moderator-evaluators.component.html',
  styleUrls: ['./moderator-evaluators.component.scss']
})
export class ModeratorEvaluatorsComponent implements OnInit {

  displayedColumns: string[] = ['mark', 'id', 'evaluatorName', 'email'];
  dataSource: MatTableDataSource<any>;
  dataSource1: MatTableDataSource<any>;

  displayedColumns1 = ['id', 'evaluatorName', 'email', 'is_active'];

  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild(MatSort) sort: MatSort;
  @ViewChild('uploadXl') uploadXl: ElementRef;

  private examFiltersByCodeUrl = CONSTANTS.examFiltersByCodeUrl;
  private getExamEvaluationSubjectCodes = CONSTANTS.getExamEvaluationCodesUrl;
  private addMultipleEvaluatorsUrl = CONSTANTS.addMultipleEvaluatorsUrl;
  private ModeratorRole = CONSTANTS.ModeratorRole;
  private ExamEvaluationProfileUrl = CONSTANTS.ExamEvaluatorsProfileUrl;


  public employeeFilterCtrl: FormControl = new FormControl();
  public examFilterCtrl: FormControl = new FormControl();
  public filteredExam: ReplaySubject<any[]> = new ReplaySubject<any[]>(1);
  public filteredEmployees: ReplaySubject<any[]> = new ReplaySubject<any[]>(1);
  private _onDestroy = new Subject<void>();

  evaluatorForm: FormGroup;
  Formdata: FormGroup;
  examTimetableList: any[] = []
  monthYearDuplicateList = [];
  examEvaluationList1 = []
  selectedSubjects = []
  step = 0;
  flag: boolean
  examSubjects: any;
  monthYear = [];
  courseCode: any;
  courseyearcode: any;
  subjectcode: any;
  getevaluatorList: any;
  ListExamSubjects: any;
  monthYear1 = [];
  collegeCode = [];
  evaluatorName = [];
  configuredData = [];
  NotconfiguredData = [];
  timetable_det_ids: any;
  assignEvaluator = [];
  courseyearcode1 = [];
  subjectcode1 = [];
  searchExams = [];
  examEvaluationList: any[];
  Barcode: any;
  data: any;
  duplicateCourseGroups: any = [];
  examDetails: ExamMaster;
  examAnswerPapaerList: any = [];
  PaperCount: any;
  check = false;
  examStudentList: any = [];
  examStudentList1: any = [];
  examStudentListdata: any[];
  selectedCount: number;
  StudentEvaluationAssignment = [];
  UnAssinged: any;
  totalStudents: any;
  omrSerail: any = [];
  assignzero: number;
  UnAssingedList: any = [];
  assigndata: any = [];
  checksubject: boolean;
  searchNameData: any = [];
  examModeratorList: any[];
  evaluatorProfile: any;
  AvailableList = [];
  MappedEvaluatorList = []
  examevaluatorListdata = [];
  examModeratorList1: any[];
  examList = [];
  examDataList = [];
  examDuplicateList = [];
  filtersDetailsList = [];
  academicYearsList = [];
  academicYears = [];
  courseYearDetails = [];
  regulationsList = [];
  regulations = [];
  subjectListDetails = [];

  examDate = this.genericFunctions.momentWithDateFormatYMD(this.genericFunctions.moment());

  constructor(private formBuilder: FormBuilder, private snotifyService: SnotifyService,
    private crudService: CrudService, private spinner: NgxSpinnerService, private router: Router,
    private genericFunctions: GenericFunctions) {
  }
  ngOnInit(): void {
    this.Formdata = this.formBuilder.group({
      examModeratorId: [''],
    });
    this.evaluatorForm = this.formBuilder.group({
      courseId: ['', Validators.required],
      academicYearId: ['', Validators.required],
      examId: ['', Validators.required],
      courseYearId: ['', Validators.required],
      regulationId: ['', Validators.required],
      subjectId: ['', Validators.required],
      examModeratorId: ['']
    })
    this.getFiltersData();
    this.dataSource1 = new MatTableDataSource(this.MappedEvaluatorList);
    setTimeout(() => {
      this.dataSource1.paginator = this.paginator;
    },);
    this.dataSource1.sort = this.sort;
  }
  getFiltersData(): void {
    this.flag = false;
    this.spinner.show();
    let request = [
      { paramName: 'in_flag', paramValue: 'univ_exam_filters' },
      { paramName: 'in_flag_type', paramValue: 'REGSUP' },
      { paramName: 'in_university_id', paramValue: 0 },
      { paramName: 'in_univ_examcenter_id', paramValue: 0 },
      { paramName: 'in_college_id', paramValue: 0 },
      { paramName: 'in_course_id', paramValue: 0 },
      { paramName: 'in_course_group_id', paramValue: 0 },
      { paramName: 'in_course_year_id', paramValue: 0 },
      { paramName: 'in_exam_id', paramValue: 0 },
      { paramName: 'in_academic_year_id', paramValue: 0 },
      { paramName: 'in_regulation_id', paramValue: 0 },
      { paramName: 'in_subject_id', paramValue: 0 },
      { paramName: 'in_sub_flag_type', paramValue: '' },
      { paramName: 'in_param1', paramValue: 0 },
      { paramName: 'in_param2', paramValue: 0 },
      { paramName: 'in_loginuser_roleid', paramValue: 0 },
      { paramName: 'in_loginuser_empid', paramValue: +localStorage.getItem('employeeId') },
    ];
    this.crudService.getDetailsByRequest(this.examFiltersByCodeUrl, '', request, '&')
      .subscribe(result => {
        this.spinner.hide();
        if (result.statusCode === 200) {
          if (result.data && result.data !== '' && result.data.result.length > 0) {
            this.filtersDetailsList = result.data.result;
            for (const list of this.filtersDetailsList) {
              if (list?.length > 0 && list[0].flag === 'univ_exam_filters') {
                this.examSubjects = list;
                break;
              }
            }
            /*----------- COURSE -----------*/
            if (this.examSubjects && this.examSubjects.length > 0) {
              const courseCodeData = this.examSubjects.map(({ fk_course_id }) => fk_course_id);
              this.courseCode = this.examSubjects.filter(({ fk_course_id }, index) =>
                !courseCodeData.includes(fk_course_id, index + 1));
            }
            if (this.courseCode && this.courseCode.length > 0) {
              this.evaluatorForm.get('courseId').setValue(this.courseCode[0].fk_course_id);
              this.selectedCourse(this.evaluatorForm.value.courseId);
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
  selectedCourse(courseId) {
    this.flag = false;
    this.academicYearsList = [];
    this.academicYears = [];
    this.examList = [];
    this.examDataList = []
    this.examDuplicateList = []
    this.courseYearDetails = [];
    this.courseyearcode1 = [];
    this.courseyearcode = [];
    this.regulationsList = [];
    this.regulations = [];
    this.subjectListDetails = [];
    this.evaluatorForm.get('academicYearId').setValue('')
    this.evaluatorForm.get('examId').setValue('')
    this.evaluatorForm.get('courseYearId').setValue('')
    this.evaluatorForm.get('regulationId').setValue('')
    this.evaluatorForm.get('subjectId').setValue('')
    /*----------- ACADEMIC YEARS -----------*/
    if (courseId != null && courseId !== undefined) {
      this.academicYearsList = this.examSubjects.filter(x => (x.fk_course_id === this.evaluatorForm.value.courseId))
      if (this.academicYearsList.length > 0) {
        const academicYears = this.academicYearsList.map(({ fk_academic_year_id }) => fk_academic_year_id);
        this.academicYears = this.academicYearsList.filter(({ fk_academic_year_id }, index) => !academicYears.includes(fk_academic_year_id, index + 1));
      }
      if (this.academicYears.length > 0) {
        this.academicYears = this.academicYears.sort((a, b) => parseInt(b.academic_year) - parseInt(a.academic_year))
        this.evaluatorForm.get('academicYearId').setValue(this.academicYears[0].fk_academic_year_id);
        this.selectedAcademicYear(this.evaluatorForm.value.academicYearId)
      }
    }
  }
  selectedAcademicYear(academicYearId) {
    this.flag = false;
    this.examList = [];
    this.examDataList = [];
    this.examDuplicateList = [];
    this.courseYearDetails = [];
    this.courseyearcode1 = [];
    this.courseyearcode = [];
    this.regulationsList = [];
    this.regulations = [];
    this.subjectListDetails = [];
    this.evaluatorForm.get('examId').setValue('')
    this.evaluatorForm.get('courseYearId').setValue('')
    this.evaluatorForm.get('subjectId').setValue('')
    this.evaluatorForm.get('regulationId').setValue('');
    /*----------- Exams List -----------*/
    if (academicYearId !== null && academicYearId !== undefined) {
      this.examDataList = this.examSubjects.filter(x => (x.fk_course_id === this.evaluatorForm.value.courseId && x.fk_academic_year_id === this.evaluatorForm.value.academicYearId))
      if (this.examDataList.length > 0) {
        const examsLists = this.examDataList.map(({ fk_exam_id }) => fk_exam_id);
        this.examList = this.examDataList.filter(({ fk_exam_id }, index) =>
          !examsLists.includes(fk_exam_id, index + 1));
        this.examDuplicateList = this.examList;
      }
      if (this.examDuplicateList && this.examDuplicateList.length > 0) {
        this.evaluatorForm.get('examId').setValue(this.examList[0].fk_exam_id)
        this.selectedExam(this.evaluatorForm.value.examId)
      }
    }
  }
  searchExam(value) {
    this.examDuplicateList = []
    this.searchExamData(value);
  }
  searchExamData(value: string) {
    let filter = value.toLowerCase();
    for (let i = 0; i < this.examList.length; i++) {
      let option = this.examList[i];
      if (option.exam_name.toLowerCase().indexOf(filter) >= 0) {
        this.examDuplicateList.push(option);
      }
    }
  }
  selectedExam(examId) {
    this.flag = false;
    this.courseYearDetails = [];
    this.courseyearcode1 = [];
    this.courseyearcode = [];
    this.regulationsList = [];
    this.regulations = [];
    this.subjectListDetails = [];
    this.evaluatorForm.get('courseYearId').setValue('')
    this.evaluatorForm.get('regulationId').setValue('')
    this.evaluatorForm.get('subjectId').setValue('')
    if (examId != null && examId !== undefined) {
      let request = [
        { paramName: 'in_flag', paramValue: 'univ_exam_rest_in_regexamstd' },
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
        { paramName: 'in_subject_id', paramValue: 0 },
        { paramName: 'in_sub_flag_type', paramValue: '' },
        { paramName: 'in_param1', paramValue: 0 },
        { paramName: 'in_param2', paramValue: 0 },
        { paramName: 'in_loginuser_roleid', paramValue: 0 },
        { paramName: 'in_loginuser_empid', paramValue: +localStorage.getItem('employeeId') },
      ];
      this.crudService.getDetailsByRequest(this.examFiltersByCodeUrl, '', request, '&')
        .subscribe(result => {
          this.spinner.hide();
          if (result.statusCode === 200) {
            if (result.data && result.data !== '' && result.data.result.length > 0) {
              this.courseYearDetails = result.data.result;
              for (const list of this.courseYearDetails) {
                if (list?.length > 0 && list[0].flag === 'univ_exam_rest_filters') {
                  this.courseyearcode1 = list;
                  break;  // Stop looping once we find the first match
                }
              }
              /*----------- COURSE YEAR -----------*/
              if (this.courseyearcode1.length > 0) {
                const courseYearsList = this.courseyearcode1.map(({ fk_course_year_id }) => fk_course_year_id);
                this.courseyearcode = this.courseyearcode1.filter(({ fk_course_year_id }, index) =>
                  !courseYearsList.includes(fk_course_year_id, index + 1));
              }
              if (this.courseyearcode && this.courseyearcode.length > 0) {
                this.evaluatorForm.get('courseYearId').setValue(this.courseyearcode[0].fk_course_year_id)
                this.selectedCourseYr(this.evaluatorForm.value.courseYearId);
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
  selectedCourseYr(courseYrId) {
    this.flag = false;
    this.regulationsList = [];
    this.regulations = [];
    this.subjectListDetails = [];
    this.subjectcode1 = [];
    this.subjectcode = [];
    this.evaluatorForm.get('regulationId').setValue('')
    this.evaluatorForm.get('subjectId').setValue('')
    /*----------- REGULATION -----------*/
    this.regulationsList = this.courseyearcode1.filter(x => (x.fk_course_year_id === this.evaluatorForm.value.courseYearId))
    if (this.regulationsList && this.regulationsList.length > 0) {
      const regulationsList = this.regulationsList.map(({ fk_regulation_id }) => fk_regulation_id);
      this.regulations = this.regulationsList.filter(({ fk_regulation_id }, index) => !regulationsList.includes(fk_regulation_id, index + 1));
    }
    if (this.regulations && this.regulations.length > 0) {
      this.evaluatorForm.get('regulationId').setValue(this.regulations[0].fk_regulation_id);
      this.selectedRegulation(this.evaluatorForm.value.regulationId);
    }
  }
  selectedRegulation(regulationId) {
    this.subjectListDetails = [];
    this.subjectcode1 = [];
    this.subjectcode = [];
    this.evaluatorForm.get('subjectId').setValue('');
    if (this.evaluatorForm.value.regulationId != null && regulationId != null) {
      /*----------- SUBJECTS -----------*/
      let request = [
        { paramName: 'in_flag', paramValue: 'univ_exam_subject_regexamstd' },
        { paramName: 'in_flag_type', paramValue: 'REGSUP' },
        { paramName: 'in_university_id', paramValue: 0 },
        { paramName: 'in_univ_examcenter_id', paramValue: 0 },
        { paramName: 'in_college_id', paramValue: 0 },
        { paramName: 'in_course_id', paramValue: this.evaluatorForm.value.courseId },
        { paramName: 'in_course_group_id', paramValue: 0 },
        { paramName: 'in_course_year_id', paramValue: this.evaluatorForm.value.courseYearId },
        { paramName: 'in_exam_id', paramValue: this.evaluatorForm.value.examId },
        { paramName: 'in_academic_year_id', paramValue: this.evaluatorForm.value.academicYearId },
        { paramName: 'in_regulation_id', paramValue: this.evaluatorForm.value.regulationId },
        { paramName: 'in_sub_flag_type', paramValue: 'NoLAB' },
        { paramName: 'in_subject_id', paramValue: 0 },
        { paramName: 'in_param1', paramValue: 0 },
        { paramName: 'in_param2', paramValue: 0 },
        { paramName: 'in_loginuser_roleid', paramValue: 0 },
        { paramName: 'in_loginuser_empid', paramValue: +localStorage.getItem('employeeId') },
      ];
      this.crudService.getDetailsByRequest(this.examFiltersByCodeUrl, '', request, '&')
        .subscribe(result => {
          this.spinner.hide();
          if (result.statusCode === 200) {
            if (result.data && result.data !== '' && result.data.result.length > 0) {
              this.subjectListDetails = result.data.result;
              for (const list of this.subjectListDetails) {
                if (list?.length > 0 && list[0].flag === 'univ_exam_sub_regexamstd') {
                  this.subjectcode1 = list;
                  break;
                }
              }
              if (this.subjectcode1 && this.subjectcode1.length > 0) {
                const subjectList = this.subjectcode1.map(({ fk_subject_id }) => fk_subject_id);
                this.subjectcode = this.subjectcode1.filter(({ fk_subject_id }, index) =>
                  !subjectList.includes(fk_subject_id, index + 1));
                this.selectedSubjects = this.subjectcode;
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
  searchdata(value) {
    this.selectedSubjects = []
    this.search(value);
  }
  search(value: string) {
    let filter = value.toLowerCase();
    for (let i = 0; i < this.subjectcode.length; i++) {
      let option = this.subjectcode[i];
      if (option.subject_name.toLowerCase().indexOf(filter) >= 0) {
        this.selectedSubjects.push(option);
      }
      else if (option.subject_code.toLowerCase().indexOf(filter) >= 0) {
        this.selectedSubjects.push(option);
      }
    }
  }
  selectedsubject() {
    this.flag = false;
    this.evaluatorForm.get('examModeratorId').setValue('')
    this.getModeratorList();
  }
  getModeratorList() {
    this.crudService.listDetailsById(this.ExamEvaluationProfileUrl, this.ModeratorRole, 'role.roleId')
      .subscribe(result => {
        this.spinner.hide();
        if (result.statusCode === 200) {
          if (result.data && result.data !== '') {
            // this.snotifyService.success(result.message, 'Success!');
            this.examModeratorList = result.data.resultList;
            this.examModeratorList1 = result.data.resultList;
            if (this.examModeratorList && this.examModeratorList.length > 0) {
              this.evaluatorForm.get('examModeratorId').setValue(this.examModeratorList[0].examEvaluatorProfileId)
            }
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
  searchName(value) {
    this.examModeratorList1 = []
    this.searchNames(value);
  }
  searchNames(value: string) {
    let filter = value.toLowerCase();
    for (let i = 0; i < this.examModeratorList.length; i++) {
      let option = this.examModeratorList[i];
      if (option.evaluatorName.toLowerCase().indexOf(filter) >= 0) {
        this.examModeratorList1.push(option);
      }
    }
  }
  applyFilter(filterValue) {
    this.dataSource.filter = filterValue.trim().toLowerCase();
    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
  }
  selectedName(selectedName) {
    this.MappedEvaluatorList = []
    this.examEvaluationList = []
    this.AvailableList = []
    this.searchNameData = []
    this.StudentEvaluationAssignment = []
    this.flag = false;
    this.selectedCount = 0
  }
  getEvaluationList() {
    this.spinner.show()
    this.MappedEvaluatorList = []
    this.examEvaluationList = []
    this.AvailableList = []
    this.searchNameData = []
    this.StudentEvaluationAssignment = []
    this.selectedCount = 0
    if (this.evaluatorForm.valid) {
      this.spinner.show();
      this.flag = true;
      let request = [
        { paramName: 'in_flag', paramValue: 'list_moderator_evaluation_mapping' },
        { paramName: 'in_orgid', paramValue: +localStorage.getItem('organizationId') },
        { paramName: 'in_fdate', paramValue: '1990-01-01' },
        { paramName: 'in_tdate', paramValue: '1990-01-01' },
        { paramName: 'in_evalutor_profileid', paramValue: this.evaluatorForm.value.examModeratorId },
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
      this.crudService.getDetailsByRequest(this.getExamEvaluationSubjectCodes, '', request, '&')
        .subscribe(result => {
          this.spinner.hide();
          if (result.statusCode === 200) {
            this.flag = true;
            if (result.data && result.data !== '' && result.data.result.length > 0) {
              this.examEvaluationList = result.data.result[0];
              for (let i = 0; i < this.examEvaluationList.length; i++) {
                if (this.examEvaluationList[i].is_mapped == 0) {
                  this.AvailableList.push(this.examEvaluationList[i])
                }
                if (this.examEvaluationList[i].is_mapped == 1) {
                  this.MappedEvaluatorList.push(this.examEvaluationList[i])
                }
              }
              this.dataSource = new MatTableDataSource(this.AvailableList);
              this.dataSource.paginator = this.paginator;
              this.dataSource.sort = this.sort;
              this.dataSource1 = new MatTableDataSource(this.MappedEvaluatorList);
              setTimeout(() => {
                this.dataSource1.paginator = this.paginator;
              },);
              this.dataSource1.sort = this.sort;
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
  Assign() {
    this.assignEvaluator = []
    for (let i = 0; i < this.examevaluatorListdata.length; i++) {
      this.assignEvaluator.push({
        examId: this.evaluatorForm.value.examId,
        // courseCode: this.evaluatorForm.value.courseId,
        subjectId: this.evaluatorForm.value.subjectId,
        moderatorProfileId: this.evaluatorForm.value.examModeratorId,
        evaluatorProfileId: this.examevaluatorListdata[i].pk_exam_evaluator_profile_id,
        isActive: true,
        reason: null,
      });
    }
    this.crudService.add(this.addMultipleEvaluatorsUrl, this.assignEvaluator)
      .subscribe(result => {
        this.spinner.hide();
        if (result.statusCode === 200 && result.success == true) {
          this.flag = false;
          this.snotifyService.success(result.message, 'Success!');
          this.getEvaluationList();
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
  checkedItems(check, index, item): void {
    if (check == true) {
      this.examevaluatorListdata.push(item)
    }
    for (let i = 0; i < this.examevaluatorListdata.length; i++) {
      if (check == false) {
        if (this.examevaluatorListdata[i].pk_exam_evaluator_profile_id == item.pk_exam_evaluator_profile_id) {
          this.examevaluatorListdata.splice(i, 1);
        }
      }
      else {
        // this.uploadedFilesData1.push(this.uploadedFilesData)
      }
    }
  }
  markItems(): void {
    this.examevaluatorListdata = []
    for (let i = 0; i < this.AvailableList.length; i++) {
      if (this.checksubject) {
        this.AvailableList[i].checked = true;
        this.examevaluatorListdata.push(this.AvailableList[i]);

      } else {
        this.AvailableList[i].checked = false;
        this.checksubject = false
        this.examevaluatorListdata = []
      }
    }
  }
}