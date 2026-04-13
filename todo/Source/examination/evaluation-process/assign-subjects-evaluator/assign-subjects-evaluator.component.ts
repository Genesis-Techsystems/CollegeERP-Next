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
  selector: 'app-assign-subjects-evaluator',
  templateUrl: './assign-subjects-evaluator.component.html',
  styleUrls: ['./assign-subjects-evaluator.component.scss']
})
export class AssignSubjectsEvaluatorComponent implements OnInit {

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

  private updateExamEvaluatorProfiles = CONSTANTS.updateExamEvaluatorProfiles;
  private examFiltersByCodeUrl = CONSTANTS.examFiltersByCodeUrl;
  private univExamDetailsUrl = CONSTANTS.univExamDetailsUrl;
  private getViewDataUrl = CONSTANTS.getViewDataUrl;
  private popProfileEmployeesUrl = CONSTANTS.popProfileEmployeesUrl;
  private examCommittesUrl = CONSTANTS.examCommittesUrl;

  displayedColumns: string[] = ['exam', 'role', 'regulation', 'subjects', 'isReEvaluation', 'actions'];
  displayedColumns2: string[] = ['exam', 'role', 'regulation', 'subjects', 'collegeCode', 'courseGroup', 'courseYear', 'isReEvaluation', 'actions'];

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
  selectedEvaluatorsJson = [];

  evaluatorsList = [
  {
    evaluatorName: 'John Doe',
    courseId: 1,
    courseName: 'B.Tech',
    examId: 2,
    examName: 'Midterm',
    regulationId: 11,
    profileId: 101,
    profileName: 'Internal',
    subjectId: 501,
    subjectName: 'Mathematics',
    examEvaluatorId: 9001,
    examEvaluatorProfileDetId: 3001,
    selected:false,
    isActive:true,

  },
  {
    evaluatorName: 'Jane Smith',
    courseId: 2,
    courseName: 'MBA',
    examId: 3,
    examName: 'Finals',
    regulationId: 12,
    profileId: 102,
    profileName: 'External',
    subjectId: 502,
    subjectName: 'Finance',
    examEvaluatorId: 9002,
    examEvaluatorProfileDetId: 3002,
    selected:true,
    isActive:true,
  }
];

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
      isReEvaluation:[],
      reason: ['']
    });
    this.dataSource = new MatTableDataSource([]);
    this.dataSource.sort = this.sort;
    this.addevaluatorform.get('isReEvaluation').setValue(false);
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
      { paramName: 'in_flag_type', paramValue: 'ALL' },
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
      { paramName: 'in_sub_flag_type', paramValue: 'ALL' },
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
    this.addevaluatorform.get('regulationId');
    this.addevaluatorform.get('subjectId').setValue('');
    this.addevaluatorform.get('collegeId').setValue('');
    this.addevaluatorform.get('courseGroupId').setValue('');
    this.addevaluatorform.get('courseYearId').setValue('');
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
    let request = [
      { paramName: 'in_flag', paramValue: 'clg_exam_subject_filters' },
      { paramName: 'in_flag_type', paramValue: '' },
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
    this.crudService.getDetailsByRequest(this.univExamDetailsUrl, '', request, '&')
      .subscribe(result => {
        this.spinner.hide();
        if (result.statusCode === 200) {
          if (result.data && result.data !== '' && result.data.result.length > 0) {
            this.regulationDetails = result.data.result;
            for (const list of this.regulationDetails) {
              if (list?.length > 0 && list[0].flag === '') {
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
    this.getExamRoles();
    if (this.addevaluatorform.value.regulationId != null && regulationId != null) {
      /*----------- SUBJECTS -----------*/
      this.subjectsList = this.regulationList.filter(x => (x.fk_regulation_id === regulationId))
      if (this.subjectsList && this.subjectsList.length > 0) {
        const courseCodeData = this.subjectsList.map(({ fk_subject_id }) => fk_subject_id);
        this.subjects = this.subjectsList.filter(({ fk_subject_id }, index) =>
          !courseCodeData.includes(fk_subject_id, index + 1));
        this.subjectsData = this.subjects;
      }
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
    this.collegesListDetails = [];
    this.colleges = [];
    this.groupList = [];
    this.courseGroups = [];
    this.courseYearsList = [];
    this.courseYears = [];
    this.displayFilters = false;
    if (roleId === 96 || roleId === 97) {
      this.displayFilters = true;
      if (this.regulationList && this.regulationList.length > 0) {
        this.collegesListDetails = this.regulationList.filter(r => (r.fk_regulation_id === this.addevaluatorform.value.regulationId))
        const CollegeIdData = this.collegesListDetails.map(({ fk_college_id }) => fk_college_id);
        this.colleges = this.collegesListDetails.filter(({ fk_college_id }, index) =>
          !CollegeIdData.includes(fk_college_id, index + 1));
      }
    }
  }
  selectedCollege(collegeId): void {
    this.addevaluatorform.get('courseGroupId').setValue('');
    this.addevaluatorform.get('courseYearId').setValue('');
    this.groupList = [];
    this.courseGroups = [];
    this.courseYearsList = [];
    this.courseYears = [];
    this.groupList = this.collegesListDetails.filter(x => (x.fk_college_id === this.addevaluatorform.value.collegeId))
    if (this.groupList.length > 0) {
      const groupList = this.groupList.map(({ fk_course_group_id }) => fk_course_group_id);
      this.courseGroups = this.groupList.filter(({ fk_course_group_id }, index) =>
        !groupList.includes(fk_course_group_id, index + 1));
    }
  }
  selectedCourseGroup(courseGroupId): void {
    this.addevaluatorform.get('courseYearId').setValue('');
    this.courseYearsList = [];
    this.courseYears = [];
    if (this.addevaluatorform.value.courseGroupId != null && courseGroupId != null) {
      /*----------- COURSES Years -----------*/
      this.courseYearsList = this.collegesListDetails.filter(x => (x.fk_college_id === this.addevaluatorform.value.collegeId && x.fk_course_group_id === this.addevaluatorform.value.courseGroupId))
      if (this.courseYearsList.length > 0) {
        const courseYearsList = this.courseYearsList.map(({ fk_course_year_id }) => fk_course_year_id);
        this.courseYears = this.courseYearsList.filter(({ fk_course_year_id }, index) =>
          !courseYearsList.includes(fk_course_year_id, index + 1));
      }
    }
  }
  isEmptyObject(obj) {
    return (obj && (Object.keys(obj).length === 0));
  }

  toggleAll(event: any): void {
  const isChecked = event.target.checked;
  this.evaluatorsList.forEach(row => row.selected = isChecked);
  this.onSelectionChange();
}
onSelectionChange(): void {
  // Update isActive based on selected checkbox
  this.evaluatorsList.forEach(row => {
    row.isActive = !!row.selected; // true if checked, false if unchecked
  });

  // Build JSON for ALL rows (selected or not)
  this.selectedEvaluatorsJson = this.evaluatorsList.map(row => ({
    courseId: row.courseId,
    examId: row.examId,
    regulationId: row.regulationId,
    profileId: row.profileId,
    subjectId: row.subjectId,
    examEvaluatorId: row.examEvaluatorId,
    examEvaluatorProfileDetId: row.examEvaluatorProfileDetId,
    isActive: row.isActive
  }));
}
// Check if all visible rows are selected
isAllSelected(): boolean {
  return this.evaluatorsList.length > 0 && this.evaluatorsList.every(row => row.selected);
}
  submit() {
    console.log(this.selectedEvaluatorsJson,'this.selectedEvaluatorsJson');
  }
}