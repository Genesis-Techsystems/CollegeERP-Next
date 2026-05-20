import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { FormGroup, FormControl, FormBuilder, Validators } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { Router, ActivatedRoute } from '@angular/router';
import { CONSTANTS } from 'app/main/common/constants';
import { GenericFunctions } from 'app/main/common/generic-functions';
import { ExamMaster } from 'app/main/models/examMaster';
import { CrudService } from 'app/main/services/crud.service';
import { SnotifyService } from 'ng-snotify';
import { NgxSpinnerService } from 'ngx-spinner';
import { ReplaySubject } from 'rxjs';
import * as _ from 'lodash';

@Component({
  selector: 'app-re-assign-evaluavator',
  templateUrl: './re-assign-evaluavator.component.html',
  styleUrls: ['./re-assign-evaluavator.component.scss']
})
export class ReAssignEvaluavatorComponent implements OnInit {

  displayedColumns: string[] = ['mark', 'id', 'evaluatorName', 'email', 'examEvaluatorsId', 'NumberOfAssignEvaluators', 'NumberOfDueEvaluators', 'Actions'];
  dataSource: MatTableDataSource<any>;

  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild(MatSort) sort: MatSort;
  @ViewChild('uploadXl') uploadXl: ElementRef;

  private examFiltersByCodeUrl = CONSTANTS.examFiltersByCodeUrl;
  private evaluatorassignmentUrl = CONSTANTS.evaluatorassignmentUrl;
  private getExamEvaluationSubjectCodes = CONSTANTS.getExamEvaluationCodesUrl;

  public employeeFilterCtrl: FormControl = new FormControl();
  public examFilterCtrl: FormControl = new FormControl();
  public filteredExam: ReplaySubject<any[]> = new ReplaySubject<any[]>(1);
  public filteredEmployees: ReplaySubject<any[]> = new ReplaySubject<any[]>(1);

  selectedSubjects = [];
  step = 0;
  flag: boolean
  examSubjects: any;
  monthYear = [];
  courseCode: any;
  courseyearcode: any;
  evaluatorForm: FormGroup;
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
  examEvaluationList: any[];
  Barcode: any;
  data: any;
  duplicateCourseGroups: any = [];
  examDetails: ExamMaster;
  examAnswerPapaerList: any = [];
  PaperCount: any;
  check = false;
  examStudentList: any = [];
  duplicateExamStudentList: any = [];
  Formdata: FormGroup;
  examStudentListdata: any[];
  selectedOmrSerialNos: any[];
  selectedCount: number;
  StudentEvaluationAssignment = [];
  UnAssinged: any;
  totalStudents: any;
  omrSerail: any = [];
  assignzero: number;
  UnAssingedList: any = [];
  AssingedList: any = [];
  omrSerailNoList: any = [];
  assigndata: any = [];
  checksubject: boolean;
  searchNameData = [];
  searchAssignNameData = [];
  duplicateomrSerailNoList = [];
  timeTableIds: any;
  examList: any[];
  examDataList: any[];
  examDuplicateList: any[];
  filtersDetailsList = [];
  academicYearsList = [];
  academicYears = [];
  courseYearDetails = [];
  regulationsList = [];
  regulations = [];
  subjectListDetails = [];
  evalutorsStudents = [];

  examDate = this.genericFunctions.momentWithDateFormatYMD(this.genericFunctions.moment());

  constructor(private formBuilder: FormBuilder, private snotifyService: SnotifyService,
    private crudService: CrudService, private spinner: NgxSpinnerService, private router: Router,
    private genericFunctions: GenericFunctions) {
  }
  ngOnInit(): void {
    this.Formdata = this.formBuilder.group({
      examEvaluatorProfileId: [''],
      reAssignEvaluatorProfileId: ['']
    });
    this.evaluatorForm = this.formBuilder.group({
      courseId: ['', Validators.required],
      academicYearId: ['', Validators.required],
      examId: ['', Validators.required],
      regulationId: ['', Validators.required],
      courseYearId: ['', Validators.required],
      subjectId: ['', Validators.required],
      isReevaluation: [false]
    });
    this.getFiltersData();
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
    this.evaluatorForm.get('regulationId').setValue('')
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
  searchSubject(value) {
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
  }
  selectedFlag(){
    this.omrSerailNoList = [];
    this.duplicateomrSerailNoList = [];
    this.UnAssingedList = []
    this.AssingedList = []
    this.omrSerailNoList = []
    this.searchAssignNameData = []
    this.examStudentList = []
    this.duplicateExamStudentList = []
    this.examStudentListdata = []
    this.selectedOmrSerialNos = [];
    this.searchNameData = []
    this.evalutorsStudents = []
    this.Formdata.get('examEvaluatorProfileId').setValue('')
    this.Formdata.get('reAssignEvaluatorProfileId').setValue('')
    this.selectedCount = 0
  }
  getEvaluationList() {
    this.omrSerailNoList = [];
    this.duplicateomrSerailNoList = [];
    this.spinner.show()
    this.UnAssingedList = []
    this.AssingedList = []
    this.omrSerailNoList = []
    this.searchAssignNameData = []
    this.examStudentList = []
    this.duplicateExamStudentList = []
    this.examStudentListdata = []
    this.selectedOmrSerialNos = [];
    this.searchNameData = []
    this.evalutorsStudents = []
    this.Formdata.get('examEvaluatorProfileId').setValue('')
    this.Formdata.get('reAssignEvaluatorProfileId').setValue('')
    this.selectedCount = 0
    if (this.evaluatorForm.valid) {
      this.flag = true;
      let flag;
      if(this.evaluatorForm.value.isReevaluation === true){
          flag = 'list_evaluatorassignment_list_reevaluation';
      }else{
          flag = 'list_evaluatorassignment_list';
      }
      let request = [
        { paramName: 'in_flag', paramValue: flag },
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
      this.crudService.getDetailsByRequest(this.getExamEvaluationSubjectCodes, '', request, '&')
        .subscribe(result => {
          this.spinner.hide();
          if (result.statusCode === 200) {
            if (result.data && result.data !== '' && result.data.result.length > 0) {
              this.examEvaluationList = result.data.result[0];
              this.evalutorsStudents = result.data.result[2];
              for (let i = 0; i < this.examEvaluationList.length; i++) {
                this.assignzero = this.examEvaluationList[i].no_of_students_assigned - this.examEvaluationList[i].no_of_evaluations_completed
                if (this.assignzero == 0) {
                  this.UnAssingedList.push(this.examEvaluationList[i])
                  this.searchNameData.push(this.examEvaluationList[i])
                }
                else {
                  this.AssingedList.push(this.examEvaluationList[i])
                  this.searchAssignNameData.push(this.examEvaluationList[i])
                }
              }
              this.StudentEvaluationAssignment = result.data.result[1];
              this.UnAssinged = this.StudentEvaluationAssignment[0]?.UnAssinged;
              this.totalStudents = this.StudentEvaluationAssignment[0]?.totalStudents;

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
  getstudentList() {
    this.examStudentList = []
    this.duplicateExamStudentList = []
    this.spinner.show();
    this.flag = true;
    if (this.evaluatorForm.valid) {
      let request = [
        { paramName: 'in_flag', paramValue: 'list_evaluationstudent_list' },
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
      this.crudService.getDetailsByRequest(this.getExamEvaluationSubjectCodes, '', request, '&')
        .subscribe(result => {
          this.spinner.hide();
          if (result.statusCode === 200) {
            if (result.data && result.data !== '' && result.data.result.length > 0) {
              this.examStudentList = result.data.result[0];
              for (let i = 0; i < this.examStudentList.length; i++) {
                if (this.examStudentList[i].is_mapped == 1) {
                  this.duplicateExamStudentList.push(this.examStudentList[i])
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
  }
  selectedEvalutor(ProfileId) {
    this.omrSerailNoList = [];
    this.duplicateomrSerailNoList = [];
    this.selectedCount = 0;
    this.examStudentListdata = [];
    this.selectedOmrSerialNos = [];
    this.searchNameData = [];
    this.UnAssingedList = [];
    this.omrSerailNoList = this.evalutorsStudents.filter(e => (e.pk_exam_evaluator_profile_id === ProfileId));
    this.duplicateomrSerailNoList = this.omrSerailNoList;
  }
  searchOmrNo(value) {
    this.duplicateomrSerailNoList = []
    this.searchOmrNos(value);
  }
  searchOmrNos(value: string) {
    let filter = value.toLowerCase();
    for (let i = 0; i < this.omrSerailNoList.length; i++) {
      let option = this.omrSerailNoList[i];
      if (option.omr_serial_no.toLowerCase().indexOf(filter) >= 0) {
        this.duplicateomrSerailNoList.push(option);
      }
    }
  }
  checkedserialNo(check, item) {
    item.isSelected = check;
    this.selectedCount = 0;
    this.examStudentListdata = [];
    this.selectedOmrSerialNos = [];
    for (let i = 0; i < this.omrSerailNoList.length; i++) {
      if (this.omrSerailNoList[i].isSelected) {
        this.examStudentListdata.push(this.omrSerailNoList[i]);
        this.selectedOmrSerialNos.push(this.omrSerailNoList[i].omr_serial_no);
        this.selectedCount++;
      }
    }
    this.updateSecondEvaluatorList();
  }
  markItems(): void {
    this.selectedCount = 0;
    this.examStudentListdata = [];
    this.selectedOmrSerialNos = [];
    for (let i = 0; i < this.omrSerailNoList.length; i++) {
      if (this.checksubject) {
        this.omrSerailNoList[i].checked = true;
        this.omrSerailNoList[i].isSelected = true
        this.examStudentListdata.push(this.omrSerailNoList[i]);
        this.selectedOmrSerialNos.push(this.omrSerailNoList[i].omr_serial_no);
        this.selectedCount++;
      } else {
        this.omrSerailNoList[i].checked = false;
        this.omrSerailNoList[i].isSelected = false
        this.checksubject = false
        this.examStudentListdata = [];
        this.selectedOmrSerialNos = [];
      }
    }
    this.updateSecondEvaluatorList();
  }
  updateSecondEvaluatorList() {
    this.searchNameData = [];
    this.UnAssingedList = [];
    let evaluatorsWithSelectedSerialNos = new Set(
      this.evalutorsStudents
        .filter(item => this.selectedOmrSerialNos.includes(item.omr_serial_no))
        .map(item => item.evaluator_name)
    );
    let filteredEvaluators = this.evalutorsStudents.filter(item =>
      !evaluatorsWithSelectedSerialNos.has(item.evaluator_name)
    );
    this.UnAssingedList = Array.from(
      new Map(filteredEvaluators.map(item => [item.evaluator_name, item])).values()
    );

    this.searchNameData = [...this.UnAssingedList]; // Copy UnAssignedList to searchNameData

  }
  searchName(value) {
    this.searchAssignNameData = []
    this.searchNames(value);
  }
  searchNames(value: string) {
    let filter = value.toLowerCase();
    for (let i = 0; i < this.UnAssingedList.length; i++) {
      let option = this.UnAssingedList[i];
      if (option.evaluator_name.toLowerCase().indexOf(filter) >= 0) {
        this.searchAssignNameData.push(option);
      }
    }
  }
  searchUnAssignName(value) {
    this.searchNameData = []
    this.searchUnAssignNames(value);
  }
  searchUnAssignNames(value: string) {
    let filter = value.toLowerCase();
    for (let i = 0; i < this.UnAssingedList.length; i++) {
      let option = this.UnAssingedList[i];
      if (option.evaluator_name.toLowerCase().indexOf(filter) >= 0) {
        this.searchNameData.push(option);
      }
    }
  }
  Assign() {
    this.assigndata = [];
    this.assignEvaluator = [];
    if (this.Formdata.value.reAssignEvaluatorProfileId !== 0) {
      for (let j = 0; j < this.UnAssingedList.length; j++) {
        if (this.UnAssingedList[j].pk_exam_evaluator_profile_id == this.Formdata.value.reAssignEvaluatorProfileId) {
          this.assigndata.push(this.UnAssingedList[j])
        }
      }
      this.timeTableIds = this.assigndata[0].pk_exam_timetable_det_ids
    }
    else {
      this.timeTableIds = ''
    }
    for (let i = 0; i < this.examStudentListdata.length; i++) {
      this.assignEvaluator.push(this.examStudentListdata[i].pk_exam_evaluationassignment_id)

    }
    //   this.crudService.listByNineIds(this.evaluatorassignmentUrl, 
    //     'UpdateEvaluationAssignment',
    //     this.Formdata.value.reAssignEvaluatorProfileId,
    //   this.evaluatorForm.value.subjectCode,
    //   this.evaluatorForm.value.ExamMonthYear, 
    //   this.evaluatorForm.value.CourseCode,
    //   '',
    //   this.evaluatorForm.value.CourseYear, 
    //   this.assignEvaluator.join(','),
    //   this.timeTableIds,
    //   'in_flag', 'in_profileids' ,'in_subject_code', 'in_exam_month_yr','in_coursecode', 'in_coursegroup', 'in_courseyear', 'in_exam_evaluationassignment_ids','in_timetable_det_ids',
    //    )
    // .subscribe(result => {
    let request = [
      // { paramName: 'in_flag', paramValue: 'UpdateEvaluationAssignment' },
      { paramName: 'in_flag', paramValue: 'reassignEvaluationAssignment' },
      { paramName: 'in_profileids', paramValue: this.Formdata.value.reAssignEvaluatorProfileId },
      { paramName: 'in_exam_evaluationassignment_ids', paramValue: this.assignEvaluator.join(','), },
      { paramName: 'in_omr_serial_nos', paramValue: '', },
      { paramName: 'in_timetable_det_ids', paramValue: this.timeTableIds },
      { paramName: 'in_exam_id', paramValue: this.evaluatorForm.value.examId },
      { paramName: 'in_subject_id', paramValue: this.evaluatorForm.value.subjectId },
      { paramName: 'in_course_year_id', paramValue: this.evaluatorForm.value.courseYearId }
    ];
    this.crudService.getDetailsByRequest(this.evaluatorassignmentUrl, '', request, '&')
      .subscribe(result => {
        this.spinner.hide();
        if (result.statusCode === 200) {
          this.flag = false;
          if (result.data && result.data !== '' && result.data.result.length > 0) {
            this.snotifyService.success(result.message, 'Success!');
            if(this.evaluatorForm.value.isReevaluation === true){
              this.updateCount();
            }
            this.getEvaluationList();

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
updateCount() {
    let request = [
      { paramName: 'in_flag', paramValue: 'reevaluation_count_update' },
      { paramName: 'in_profileids', paramValue: '' },
      { paramName: 'in_exam_evaluationassignment_ids', paramValue: '', },
      { paramName: 'in_omr_serial_nos', paramValue: '', },
      { paramName: 'in_timetable_det_ids', paramValue: '' },
      { paramName: 'in_exam_id', paramValue: this.evaluatorForm.value.examId },
      { paramName: 'in_subject_id', paramValue: this.evaluatorForm.value.subjectId },
      { paramName: 'in_course_year_id', paramValue: this.evaluatorForm.value.courseYearId }
    ];
    this.crudService.getDetailsByRequest(this.evaluatorassignmentUrl, '', request, '&')
      .subscribe(result => {
        this.spinner.hide();
        if (result.statusCode === 200) {
          this.flag = false;
          if (result.data && result.data !== '' && result.data.result.length > 0) {
            this.snotifyService.success(result.message, 'Success!');

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