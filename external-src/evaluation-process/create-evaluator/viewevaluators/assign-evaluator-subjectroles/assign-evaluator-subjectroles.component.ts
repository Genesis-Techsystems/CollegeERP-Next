import { Component, OnInit, ViewChild, ChangeDetectorRef } from '@angular/core';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { CONSTANTS } from 'app/main/common/constants';
import { GenericFunctions } from 'app/main/common/generic-functions';
import { SnotifyService } from 'ng-snotify';
import { CrudService } from 'app/main/services/crud.service';
import { Router } from '@angular/router';
import { NgxSpinnerService } from 'ngx-spinner';
import { MatTableDataSource } from '@angular/material/table';
import { MatSort } from '@angular/material/sort';
import { MatPaginator } from '@angular/material/paginator';
import { ParametersService } from 'app/main/services/parameters.service';

@Component({
  selector: 'app-assign-evaluator-subjectroles',
  templateUrl: './assign-evaluator-subjectroles.component.html',
  styleUrls: ['./assign-evaluator-subjectroles.component.scss']
})
export class AssignEvaluatorSubjectrolesComponent implements OnInit {

  addevaluatorform: FormGroup;

  step = 0;

  filtersData = [];
  colleges = [];
  examFilter = [];
  examsList = [];
  examData = [];
  exams = [];
  subjects = [];
  subjectsList = [];
  subjectsData = [];
  selectedExamId = '';
  selectedRoleId = '';
  selectedSubjects = [];
  selectedData = [];
  examEvaluatorProfileDetailsDTOS = [];
  dialogTitle = 'Add Evaluator Details';

  private updateExamEvaluatorProfiles = CONSTANTS.updateExamEvaluatorProfiles;
  private examFiltersByCodeUrl = CONSTANTS.examFiltersByCodeUrl;
  private getViewDataUrl = CONSTANTS.getViewDataUrl;
  private popProfileEmployeesUrl = CONSTANTS.popProfileEmployeesUrl;
  private examCommittesUrl = CONSTANTS.examCommittesUrl;
  private getExamEvaluatorProfileDetailsUrl = CONSTANTS.getExamEvaluatorProfileDetailsUrl;
  private examLabBatchesCrudUrl = CONSTANTS.examLabBatchesCrudUrl;

  displayedColumns: string[] = ['exam', 'role', 'regulation', 'subjects', 'isReEvaluation', 'maxNoOfEvaluationsAssign', 'maxNoOfReevaluationsAssign', 'actions'];
  displayedColumns2: string[] = ['exam', 'role', 'regulation', 'subjects', 'collegeCode', 'courseGroup', 'courseYear', 'examLabBatchName', 'isReEvaluation', 'maxNoOfEvaluationsAssign', 'maxNoOfReevaluationsAssign', 'actions'];

  dataSource: MatTableDataSource<any>;
  @ViewChild(MatSort) sort: MatSort;
  @ViewChild(MatPaginator) paginator: MatPaginator;

  roles = [];
  filtersDetailsList = [];
  examListDetails = [];
  courses = [];
  academicYears = [];
  academicYearsList = [];
  regulationDetails = [];
  regulationList = [];
  regulations = [];
  subjectListDetails = [];
  data: any;

  displayFilters: boolean = false;
  collegesListDetails = [];
  groupList = [];
  courseGroups = [];
  courseYearsList = [];
  courseYears = [];
  examLabBatches = [];

  constructor(public parameterService: ParametersService,
    private genericFunctions: GenericFunctions, private formBuilder: FormBuilder,
    private snotifyService: SnotifyService, private spinner: NgxSpinnerService, private cd: ChangeDetectorRef,
    private crudService: CrudService, public router: Router) {

  }

  ngOnInit(): void {
    this.addevaluatorform = this.formBuilder.group({
      courseId: ['', Validators.required],
      academicYearId: ['', Validators.required],
      examId: ['', Validators.required],
      regulationId: ['', Validators.required],
      roleId: ['', Validators.required],
      subjectId: ['', Validators.required],
      collegeId: [''],
      courseGroupId: [''],
      courseYearId: [''],
      examLabBatchesId: [''],
      isReEvaluation:[],
      maxNoOfEvaluationsAssign: [],
      maxNoOfReevaluationsAssign: [],
      reason: ['']
    });
    this.dataSource = new MatTableDataSource([]);
    this.dataSource.sort = this.sort;
    this.addevaluatorform.get('isReEvaluation').setValue(false);
    if (this.parameterService.evaluatorSubjectrole) {
      this.data = this.parameterService.evaluatorSubjectrole;
      /*----------- EVALUATORPROFILEDETAILS -----------*/
      this.crudService.listByIds(this.getExamEvaluatorProfileDetailsUrl, this.data.examEvaluatorProfileId, 'examEvaluatorProfileId')
        .subscribe(result => {
          if (result.statusCode === 200) {
            if (result.data && result.data !== '') {
                this.examEvaluatorProfileDetailsDTOS = result.data;
                  if (this.examEvaluatorProfileDetailsDTOS &&
                    this.examEvaluatorProfileDetailsDTOS.length > 0) {
                    this.dialogTitle = 'Edit Evaluator Details';
                    this.displayFilters = this.examEvaluatorProfileDetailsDTOS.some(
                      item => item.evaluatorRoleId === 64 || item.evaluatorRoleId === 70 || item.evaluatorRoleId === 96 || item.evaluatorRoleId === 97 || item.evaluatorRoleId === 116
                    );
                    this.selectedData = this.examEvaluatorProfileDetailsDTOS;
                    this.dataSource = new MatTableDataSource(this.selectedData);
                    this.dataSource.sort = this.sort;
                  }
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
    } else {
      this.goBack();
    }
    this.getExamFiltersList();
  }
  getExamRoles() {
    this.roles = [];
    let request = [
      { paramName: 'in_viewname', paramValue: 'v_get_exam_eval_roles' },
      { paramName: 'in_select', paramValue: '' },
      { paramName: 'in_whereclause', paramValue: '' },
    ];
    this.crudService.getDetailsByRequest(this.getViewDataUrl, '', request, '&')
      .subscribe(result => {
        this.spinner.hide();
        if (result.statusCode === 200) {
          if (result.data && result.data !== '' && result.data.result.length > 0) {
            this.roles = result.data.result[0];
          }
          else {
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
  getExamFiltersList(): void {
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
                this.examListDetails = list;
                break;
              }
            }
            if (this.examListDetails && this.examListDetails.length > 0) {
              const courseList = this.examListDetails.map(({ fk_course_id }) => fk_course_id);
              this.courses = this.examListDetails.filter(({ fk_course_id }, index) =>
                !courseList.includes(fk_course_id, index + 1));
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
    this.addevaluatorform.get('academicYearId').setValue('');
    this.addevaluatorform.get('examId').setValue('');
    this.addevaluatorform.get('regulationId').setValue('');
    this.addevaluatorform.get('subjectId').setValue('');
    this.addevaluatorform.get('collegeId').setValue('');
    this.addevaluatorform.get('courseGroupId').setValue('');
    this.addevaluatorform.get('courseYearId').setValue('');
    this.addevaluatorform.get('examLabBatchesId').setValue('');
    this.collegesListDetails = [];
    this.colleges = [];
    this.groupList = [];
    this.courseGroups = [];
    this.courseYearsList = [];
    this.courseYears = [];
    this.collegesListDetails = [];
    this.examFilter = [];
    this.exams = [];
    this.academicYears = [];
    this.academicYearsList = [];
    this.regulationDetails = [];
    this.regulationList = [];
    this.regulations = [];
    this.subjectListDetails = [];
    this.subjectsList = [];
    this.subjects = [];
    this.subjectsData = [];
    this.roles = [];
    this.examLabBatches = [];
    /*----------- ACADEMIC YEARS -----------*/
    if (courseId != null && courseId !== undefined) {
      this.academicYearsList = this.examListDetails.filter(x => (x.fk_course_id === this.addevaluatorform.value.courseId))
      if (this.academicYearsList.length > 0) {
        const academicYears = this.academicYearsList.map(({ fk_academic_year_id }) => fk_academic_year_id);
        this.academicYears = this.academicYearsList.filter(({ fk_academic_year_id }, index) => !academicYears.includes(fk_academic_year_id, index + 1));
      }
      if (this.academicYears.length > 0) {
        this.academicYears = this.academicYears.sort((a, b) => parseInt(b.academic_year) - parseInt(a.academic_year))
      }
    }
  }
  selectedAcademicYear(academicYearId): void {
    this.addevaluatorform.get('regulationId').setValue('');
    this.addevaluatorform.get('examId').setValue('');
    this.addevaluatorform.get('subjectId').setValue('');
    this.addevaluatorform.get('collegeId').setValue('');
    this.addevaluatorform.get('courseGroupId').setValue('');
    this.addevaluatorform.get('courseYearId').setValue('');
    this.addevaluatorform.get('examLabBatchesId').setValue('');
    this.collegesListDetails = [];
    this.colleges = [];
    this.groupList = [];
    this.courseGroups = [];
    this.courseYearsList = [];
    this.courseYears = [];
    this.subjectListDetails = [];
    this.subjectsList = [];
    this.subjects = [];
    this.subjectsData = [];
    this.examFilter = [];
    this.exams = [];
    this.regulationDetails = [];
    this.regulationList = [];
    this.regulations = [];
    this.roles = [];
    this.examLabBatches = [];
    if (academicYearId !== null && academicYearId !== undefined) {
      /*----------- Exams List -----------*/
      this.examFilter = this.examListDetails.filter(x => (x.fk_course_id === this.addevaluatorform.value.courseId && x.fk_academic_year_id === this.addevaluatorform.value.academicYearId))
      if (this.examFilter && this.examFilter.length > 0) {
        const examsLists = this.examFilter.map(({ fk_exam_id }) => fk_exam_id);
        this.exams = this.examFilter.filter(({ fk_exam_id }, index) =>
          !examsLists.includes(fk_exam_id, index + 1));
        this.examData = this.exams;
      }
    }
  }
  searchexam(value) {
    this.examData = [];
    this.filterExams(value)
  }
  filterExams(value: string) {
    let filter = value.toLowerCase();
    for (let i = 0; i < this.examsList.length; i++) {
      let option = this.examsList[i];
      if (option.exam_name.toLowerCase().indexOf(filter) >= 0) {
        this.examData.push(option);
      }
    }
  }
  selectedExam(examId): void {
    this.addevaluatorform.get('regulationId').setValue('');
    this.addevaluatorform.get('subjectId').setValue('');
    this.addevaluatorform.get('collegeId').setValue('');
    this.addevaluatorform.get('courseGroupId').setValue('');
    this.addevaluatorform.get('courseYearId').setValue('');
    this.addevaluatorform.get('examLabBatchesId').setValue('');
    this.collegesListDetails = [];
    this.colleges = [];
    this.groupList = [];
    this.courseGroups = [];
    this.courseYearsList = [];
    this.courseYears = [];
    this.subjectListDetails = [];
    this.subjectsList = [];
    this.subjects = [];
    this.subjectsData = [];
    this.regulationDetails = [];
    this.regulationList = [];
    this.regulations = [];
    this.roles = [];
    this.examLabBatches = [];
    let request = [
      { paramName: 'in_flag', paramValue: 'univ_exam_rest_in_regexamstd' },
      { paramName: 'in_flag_type', paramValue: 'REGSUP' },
      { paramName: 'in_university_id', paramValue: 0 },
      { paramName: 'in_univ_examcenter_id', paramValue: 0 },
      { paramName: 'in_college_id', paramValue: 0 },
      { paramName: 'in_course_id', paramValue: this.addevaluatorform.value.courseId },
      { paramName: 'in_course_group_id', paramValue: 0 },
      { paramName: 'in_course_year_id', paramValue: 0 },
      { paramName: 'in_exam_id', paramValue: this.addevaluatorform.value.examId },
      { paramName: 'in_academic_year_id', paramValue: this.addevaluatorform.value.academicYearId },
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
            this.regulationDetails = result.data.result;
            for (const list of this.regulationDetails) {
              if (list?.length > 0 && list[0].flag === 'univ_exam_rest_filters') {
                this.regulationList = list;
                break;
              }
            }
            const regulationIdData = this.regulationList.map(({ fk_regulation_id }) => fk_regulation_id);
            this.regulations = this.regulationList.filter(({ fk_regulation_id }, index) =>
              !regulationIdData.includes(fk_regulation_id, index + 1));
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
  selectedRegulation(regulationId) {
    this.addevaluatorform.get('subjectId').setValue('');
    this.addevaluatorform.get('collegeId').setValue('');
    this.addevaluatorform.get('courseGroupId').setValue('');
    this.addevaluatorform.get('courseYearId').setValue('');
    this.addevaluatorform.get('examLabBatchesId').setValue('');
    this.collegesListDetails = [];
    this.colleges = [];
    this.groupList = [];
    this.courseGroups = [];
    this.courseYearsList = [];
    this.courseYears = [];
    this.subjectListDetails = [];
    this.subjectsList = [];
    this.subjects = [];
    this.subjectsData = [];
    this.roles = [];
    this.examLabBatches = [];
    this.getExamRoles();
    if (this.addevaluatorform.value.regulationId != null && regulationId != null) {
      /*----------- SUBJECTS -----------*/
      let request = [
        { paramName: 'in_flag', paramValue: 'univ_exam_subject_regexamstd' },
        { paramName: 'in_flag_type', paramValue: 'REGSUP' },
        { paramName: 'in_university_id', paramValue: 0 },
        { paramName: 'in_univ_examcenter_id', paramValue: 0 },
        { paramName: 'in_college_id', paramValue: 0 },
        { paramName: 'in_course_id', paramValue: this.addevaluatorform.value.courseId },
        { paramName: 'in_course_group_id', paramValue: 0 },
        { paramName: 'in_course_year_id', paramValue: 0 },
        { paramName: 'in_exam_id', paramValue: this.addevaluatorform.value.examId },
        { paramName: 'in_academic_year_id', paramValue: this.addevaluatorform.value.academicYearId },
        { paramName: 'in_regulation_id', paramValue: this.addevaluatorform.value.regulationId },
        { paramName: 'in_sub_flag_type', paramValue: 'ALL' },
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
                  this.subjectsList = list;
                  break;
                }
              }
              if (this.subjectsList && this.subjectsList.length > 0) {
                const courseCodeData = this.subjectsList.map(({ fk_subject_id }) => fk_subject_id);
                this.subjects = this.subjectsList.filter(({ fk_subject_id }, index) =>
                  !courseCodeData.includes(fk_subject_id, index + 1));
                this.subjectsData = this.subjects;
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
    this.subjectsData = [];
    this.search(value);
  }
  search(value: string) {
    let filter = value.toLowerCase();
    for (let i = 0; i < this.subjects.length; i++) {
      let option = this.subjects[i];
      if (option.subject_name.toLowerCase().indexOf(filter) >= 0) {
        this.subjectsData.push(option);
      }
      else if (option.subject_code.toLowerCase().indexOf(filter) >= 0) {
        this.subjectsData.push(option);
      }
    }
  }
  selectedRole(roleId) {
    this.addevaluatorform.get('collegeId').setValue('');
    this.addevaluatorform.get('courseGroupId').setValue('');
    this.addevaluatorform.get('courseYearId').setValue('');
    this.addevaluatorform.get('examLabBatchesId').setValue('');
    this.collegesListDetails = [];
    this.colleges = [];
    this.groupList = [];
    this.courseGroups = [];
    this.courseYearsList = [];
    this.courseYears = [];
    this.examLabBatches = [];
    this.displayFilters = false;
    if (roleId === 64 || roleId === 70 || roleId === 96 || roleId === 97 || roleId === 116 ) {
      this.displayFilters = true;
      this.getCourseYears();
      if (this.regulationList && this.regulationList.length > 0) {
        this.collegesListDetails = this.regulationList.filter(r => (r.fk_regulation_id === this.addevaluatorform.value.regulationId))
        const CollegeIdData = this.collegesListDetails.map(({ fk_college_id }) => fk_college_id);
        this.colleges = this.collegesListDetails.filter(({ fk_college_id }, index) =>
          !CollegeIdData.includes(fk_college_id, index + 1));
      }
    }
  }
  getCourseYears(){
    this.addevaluatorform.get('courseYearId').setValue('');
    this.addevaluatorform.get('examLabBatchesId').setValue('');
    this.courseYearsList = [];
    this.courseYears = [];
    this.examLabBatches = [];
      /*----------- COURSES Years -----------*/
      this.courseYearsList = this.regulationList;
      if (this.courseYearsList.length > 0) {
        const courseYearsList = this.courseYearsList.map(({ fk_course_year_id }) => fk_course_year_id);
        this.courseYears = this.courseYearsList.filter(({ fk_course_year_id }, index) =>
          !courseYearsList.includes(fk_course_year_id, index + 1));
          this.courseYears = this.courseYears.sort((a,b)=> a.cy_sort_order - b.cy_sort_order);
      }
  }
  selectedCollege(collegeId): void {
    this.addevaluatorform.get('courseGroupId').setValue('');
    this.addevaluatorform.get('examLabBatchesId').setValue('');
    this.groupList = [];
    this.courseGroups = [];
    this.examLabBatches = [];
    this.groupList = this.collegesListDetails.filter(x => (x.fk_college_id === this.addevaluatorform.value.collegeId))
    if (this.groupList.length > 0) {
      const groupList = this.groupList.map(({ fk_course_group_id }) => fk_course_group_id);
      this.courseGroups = this.groupList.filter(({ fk_course_group_id }, index) =>
        !groupList.includes(fk_course_group_id, index + 1));
    }
  }
  selectedCourseGroup(courseGroupId){
    this.addevaluatorform.get('examLabBatchesId').setValue('');
    this.examLabBatches = [];
        this.spinner.show();
        // tslint:disable-next-line:max-line-length
        this.crudService.listDetailsBySixIds(this.examLabBatchesCrudUrl,
          this.addevaluatorform.value.collegeId, this.addevaluatorform.value.examId, this.addevaluatorform.value.courseYearId, this.addevaluatorform.value.courseGroupId, 
          this.addevaluatorform.value.regulationId, this.addevaluatorform.value.subjectId,
          'college.collegeId', 'examMaster.examId', 'courseYear.courseYearId', 'courseGroup.courseGroupId', 'Regulation.regulationId', 'subject.subjectId')
          .subscribe(result => {
            this.spinner.hide();
            if (result.statusCode === 200) {
              if (result.data.resultList && result.data.resultList !== '') {
                this.examLabBatches = result.data.resultList;
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
  isEmptyObject(obj) {
    return (obj && (Object.keys(obj).length === 0));
  }
  addToTable() {
    const formValues = this.addevaluatorform.value;
    if (this.addevaluatorform.valid) {
      if (this.dialogTitle === 'Add Evaluator Details') {
          const profileDetail = {
            examId: formValues.examId,
            evaluatorRoleId: formValues.roleId,
            regulationId: formValues.regulationId,
            subjectId: formValues.subjectId,
            collegeId: formValues.collegeId,
            courseGroupId: formValues.courseGroupId,
            courseYearId: formValues.courseYearId,
            examLabBatchesId: formValues.examLabBatchesId,
            isReEvaluation: formValues.isReEvaluation,
            maxNoOfEvaluationsAssign: formValues.maxNoOfEvaluationsAssign,
            maxNoOfReevaluationsAssign: formValues.maxNoOfReevaluationsAssign,
            isActive: true,
            reason: formValues.reason,
            createdUser: +localStorage.getItem('employeeId')
          };
          this.examEvaluatorProfileDetailsDTOS.push(profileDetail);
          this.selectedData.push({
            examId: formValues.examId,
            regulationId: formValues.regulationId,
            evaluatorRoleId: formValues.roleId,
            subjectId: this.getSubjectById(formValues.subjectId),
            collegeId: formValues.collegeId,
            courseGroupId: formValues.courseGroupId,
            courseYearId: formValues.courseYearId,
            examLabBatchesId: formValues.examLabBatchesId,
            examName: this.getExamNameById(formValues.examId),
            regulationCode: this.getregulationById(formValues.regulationId),
            roleName: this.getRoleNameById(formValues.roleId),
            subjectCode: this.getSubjectNameById(formValues.subjectId),
            collegeCode: this.getCollegeById(formValues.collegeId),
            courseGroupCode: this.getGroupById(formValues.courseGroupId),
            courseYearCode: this.getcourseYearById(formValues.courseYearId),
            examLabBatchName: this.getBatchByNameById(formValues.examLabBatchesId),
            isReEvaluation: this.addevaluatorform.value.isReEvaluation,
            maxNoOfEvaluationsAssign: this.addevaluatorform.value.maxNoOfEvaluationsAssign,
            maxNoOfReevaluationsAssign: this.addevaluatorform.value.maxNoOfReevaluationsAssign,
            isActive: true,
            reason: formValues.reason,
            createdUser: +localStorage.getItem('employeeId')
        });
      } else {
          const editprofileDetail = {
            examEvaluatorProfileId: this.data.examEvaluatorProfileId,
            examId: formValues.examId,
            regulationId: formValues.regulationId,
            examName: this.getExamNameById(formValues.examId),
            regulationCode: this.getregulationById(formValues.regulationId),
            evaluatorRoleId: formValues.roleId,
            subjectCode: this.getSubjectNameById(formValues.subjectId),
            collegeCode: this.getCollegeById(formValues.collegeId),
            courseGroupCode: this.getGroupById(formValues.courseGroupId),
            courseYearCode: this.getcourseYearById(formValues.courseYearId),
            examLabBatchName: this.getBatchByNameById(formValues.examLabBatchesId),
            subjectId: formValues.subjectId,
            collegeId: formValues.collegeId,
            courseGroupId: formValues.courseGroupId,
            courseYearId: formValues.courseYearId,
            examLabBatchesId: formValues.examLabBatchesId,
            isReEvaluation: this.addevaluatorform.value.isReEvaluation,
            maxNoOfEvaluationsAssign: this.addevaluatorform.value.maxNoOfEvaluationsAssign,
            maxNoOfReevaluationsAssign: this.addevaluatorform.value.maxNoOfReevaluationsAssign,
            isActive: true,
            reason: formValues.reason,
            updatedUser: +localStorage.getItem('employeeId')
          };
          this.examEvaluatorProfileDetailsDTOS.push(editprofileDetail);
      }
      this.dataSource = new MatTableDataSource(this.selectedData);
      this.dataSource.sort = this.sort;
      this.addevaluatorform.reset();
      this.addevaluatorform.get('isReEvaluation').setValue(false);
    } else {
      this.snotifyService.info('Please select exam, role, regulation, and at least one subject.', 'Info!');
    }
  }
  // Helper function to get exam name by examId
  getExamNameById(examId: string) {
    const exam = this.examData.find(e => e.fk_exam_id === examId);
    return exam ? exam.exam_name : '';
  }
  // Helper function to get role name by roleId
  getRoleNameById(roleId: number) {
    const role = this.roles.find(r => r.pk_role_id === roleId);
    return role ? role.role_name : '';
  }
  // Helper function to get role name by regulationId
  getregulationById(regulationId) {
    const regulation = this.regulations.find(r => r.fk_regulation_id === regulationId);
    return regulation ? regulation.regulation_code : '';
  }
  // Helper function to get role name by SubjectCode
  getSubjectNameById(subjectId: any) {
    const subject = this.subjectsData.find(s => s.fk_subject_id === subjectId);
    return subject ? subject.subject_code : '';
  }
  // Helper function to get role name by subjectId
  getSubjectById(subjectId: any) {
    const subject = this.subjectsData.find(s => s.fk_subject_id === subjectId);
    return subject ? subject.fk_subject_id : '';
  }
  // Helper function to get role name by collegeCode
  getCollegeById(collegeId) {
    const college = this.colleges.find(c => c.fk_college_id === collegeId);
    return college ? college.college_code : '';
  }
  // Helper function to get role name by groupCode
  getGroupById(courseGroupId) {
    const courseGroup = this.courseGroups.find(c => c.fk_course_group_id === courseGroupId);
    return courseGroup ? courseGroup.group_code : '';
  }
  // Helper function to get role name by courseYear
  getcourseYearById(courseYearId) {
    const courseYear = this.courseYears.find(c => c.fk_course_year_id === courseYearId);
    return courseYear ? courseYear.course_year_code : '';
  }
  // Helper function to get role name by examBatchName
  getBatchByNameById(examLabBatchesId) {
    const batchName = this.examLabBatches.find(c => c.eaxmLabBatchId === examLabBatchesId);
    return batchName ? batchName.batchName : '';
  }
  deleteRow(subjectId: any) {
    const id = +subjectId;
    if (this.dialogTitle === 'Add Evaluator Details') {
      const index = this.selectedData.findIndex((item) => item.subjectId === id);
      if (index > -1) {
        this.examEvaluatorProfileDetailsDTOS.splice(index, 1);
        this.selectedData.splice(index, 1);
        this.dataSource = new MatTableDataSource(this.selectedData);
        this.dataSource.sort = this.sort;
      }
    } else {
      const index = this.selectedData.findIndex((item) => item.subjectId === id);
      const index2 = this.examEvaluatorProfileDetailsDTOS.findIndex((item) => item.subjectId === id);

      if (index2 > -1) {
        this.examEvaluatorProfileDetailsDTOS[index2].isActive = false;
        this.examEvaluatorProfileDetailsDTOS = [...this.examEvaluatorProfileDetailsDTOS];
        this.cd.detectChanges();
      }
      if (index > -1) {
        this.selectedData.splice(index, 1);
        this.dataSource = new MatTableDataSource(this.selectedData);
        this.dataSource.sort = this.sort;
      }
    }
  }
  submit() {
    this.data.examEvaluatorProfileDetailsDTOS = this.examEvaluatorProfileDetailsDTOS;
    this.spinner.show();
    this.crudService.updateMasterDetails(this.updateExamEvaluatorProfiles, this.data)
      .subscribe(result => {
        this.spinner.hide();
        if (result.statusCode === 200) {
          if (result.data && result.data !== '') {
            this.snotifyService.success(result.message, 'Success!');
            this.profileDetails(this.data.examEvaluatorProfileId);
            this.setupCommittes();
            this.router.navigate(['admin-examination-management/evaluation-process/create-evaluators']);
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
  profileDetails(examEvaluatorProfileId) {
    let request = [
      { paramName: 'in_profile_id', paramValue: examEvaluatorProfileId },
    ];
    this.crudService.getDetailsByRequest(this.popProfileEmployeesUrl, '', request, '&')
      .subscribe(result => {
        this.spinner.hide();
        if (result.statusCode === 200) {
          if (result.data && result.data !== '' && result.data.result.length > 0) {

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
  goBack() {
    this.router.navigate(['admin-examination-management/evaluation-process/create-evaluators']);
  }
  setupCommittes(){
    this.spinner.show();
    let request = [
      {paramName: 'in_flag', paramValue: 'exam_committees'},
    ];
    this.crudService.getDetailsByRequest(this.examCommittesUrl,'', request,'&')
    .subscribe(result => {
    this.spinner.hide();
    if (result.statusCode === 200){
         if (result.success) {
          this.snotifyService.success(result.message, 'Success!');
         } else {
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
}