import { Component, OnInit, ViewChild } from '@angular/core';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { CONSTANTS } from 'app/main/common/constants';
import { SnotifyService } from 'ng-snotify';
import { GenericFunctions } from 'app/main/common/generic-functions';
import { CrudService } from 'app/main/services/crud.service';
import { NgxSpinnerService } from 'ngx-spinner';
import { Router } from '@angular/router';
import { FormBuilder, Validators, FormGroup } from '@angular/forms';

@Component({
  selector: 'app-evaluator-subjects',
  templateUrl: './evaluator-subjects.component.html',
  styleUrls: ['./evaluator-subjects.component.scss']
})
export class EvaluatorSubjectsComponent implements OnInit {

  displayedColumns: string[] = ['Id', 'College', 'EvaluatorName', 'Subject', 'ExamMonthYear'];
  dataSource: MatTableDataSource<any>;

  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild(MatSort) sort: MatSort;

  private examFiltersByCodeUrl = CONSTANTS.examFiltersByCodeUrl;
  private getExamEvaluationSubjectCodes = CONSTANTS.getExamEvaluationCodesUrl;
  private addexamevaluatorsUrl = CONSTANTS.addexamevaluatorsUrl;

  selectedSubjects = []
  evaluatorsubjectform: FormGroup;
  step = 0;
  flag: boolean
  examSubjects: any;
  monthYear = [];
  courseCode: any;
  courseyearcode: any;
  exmstdanswerpaperpages: FormGroup;
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
  tabledata: boolean;
  checksubject = false;
  monthYearDuplicateList = [];
  flagName: string;
  isReEvaluation: boolean = false;
  examDuplicateList: any[];
  examList: any;
  examDataList: any[];
  filtersDetailsList = [];
  academicYearsList = [];
  academicYears = [];
  courseYearDetails = [];
  regulationsList = [];
  regulations = [];
  subjectListDetails = [];
  collegearry1 = [];
  details = [];
  evaluarry1 = [];

  constructor(private snotifyService: SnotifyService, private formBuilder: FormBuilder, private crudService: CrudService,
    private spinner: NgxSpinnerService, private genericFunctions: GenericFunctions, public router: Router) {

  }

  ngOnInit(): void {
    this.exmstdanswerpaperpages = this.formBuilder.group({
      courseId: ['', Validators.required],
      academicYearId: ['', Validators.required],
      examId: ['', Validators.required],
      courseYearId: ['', Validators.required],
      regulationId: ['', Validators.required],
      subjectId: ['', Validators.required],
      isReEvaluation: []
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
      in_regulation_code: 0
    })
    this.getFiltersData()
  }
  getFiltersData(): void {
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
              this.exmstdanswerpaperpages.get('courseId').setValue(this.courseCode[0].fk_course_id)
              this.selectedCourse(this.exmstdanswerpaperpages.value.courseId);
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
    this.regulationsList = [];
    this.regulations = [];
    this.subjectListDetails = [];
    this.exmstdanswerpaperpages.get('academicYearId').setValue('')
    this.exmstdanswerpaperpages.get('examId').setValue('')
    this.exmstdanswerpaperpages.get('courseYearId').setValue('')
    this.exmstdanswerpaperpages.get('regulationId').setValue('');
    this.exmstdanswerpaperpages.get('subjectId').setValue('')
    /*----------- ACADEMIC YEARS -----------*/
    if (courseId != null && courseId !== undefined) {
      this.academicYearsList = this.examSubjects.filter(x => (x.fk_course_id === this.exmstdanswerpaperpages.value.courseId))
      if (this.academicYearsList.length > 0) {
        const academicYears = this.academicYearsList.map(({ fk_academic_year_id }) => fk_academic_year_id);
        this.academicYears = this.academicYearsList.filter(({ fk_academic_year_id }, index) => !academicYears.includes(fk_academic_year_id, index + 1));
      }
      if (this.academicYears.length > 0) {
        this.academicYears = this.academicYears.sort((a,b)=>parseInt(b.academic_year) - parseInt(a.academic_year)) 
        this.exmstdanswerpaperpages.get('academicYearId').setValue(this.academicYears[0].fk_academic_year_id);
        this.selectedAcademicYear(this.exmstdanswerpaperpages.value.academicYearId)
      }
    }
  }
  selectedAcademicYear(academicYearId) {
    this.flag = false;
    this.examList = [];
    this.examDataList = []
    this.examDuplicateList = []
    this.courseYearDetails = [];
    this.regulationsList = [];
    this.regulations = [];
    this.subjectListDetails = [];
    this.exmstdanswerpaperpages.get('examId').setValue('')
    this.exmstdanswerpaperpages.get('courseYearId').setValue('')
    this.exmstdanswerpaperpages.get('subjectId').setValue('')
    this.exmstdanswerpaperpages.get('regulationId').setValue('');
    /*----------- Exams List -----------*/
    if (academicYearId !== null && academicYearId !== undefined) {
      this.examDataList = this.examSubjects.filter(x => (x.fk_course_id === this.exmstdanswerpaperpages.value.courseId && x.fk_academic_year_id === this.exmstdanswerpaperpages.value.academicYearId))
      if (this.examDataList.length > 0) {
        const examsLists = this.examDataList.map(({ fk_exam_id }) => fk_exam_id);
        this.examList = this.examDataList.filter(({ fk_exam_id }, index) =>
          !examsLists.includes(fk_exam_id, index + 1));
        this.examDuplicateList = this.examList;
      }
      if (this.examDuplicateList && this.examDuplicateList.length > 0) {
        this.exmstdanswerpaperpages.get('examId').setValue(this.examList[0].fk_exam_id)
        this.selectedExam(this.exmstdanswerpaperpages.value.examId)
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
    this.exmstdanswerpaperpages.get('courseYearId').setValue('');
    this.exmstdanswerpaperpages.get('regulationId').setValue('');
    this.exmstdanswerpaperpages.get('subjectId').setValue('');
    if (examId != null && examId !== undefined) {
      let request = [
        { paramName: 'in_flag', paramValue: 'univ_exam_rest_in_regexamstd' },
        { paramName: 'in_flag_type', paramValue: 'REGSUP' },
        { paramName: 'in_university_id', paramValue: 0 },
        { paramName: 'in_univ_examcenter_id', paramValue: 0 },
        { paramName: 'in_college_id', paramValue: 0 },
        { paramName: 'in_course_id', paramValue: this.exmstdanswerpaperpages.value.courseId },
        { paramName: 'in_course_group_id', paramValue: 0 },
        { paramName: 'in_course_year_id', paramValue: 0 },
        { paramName: 'in_exam_id', paramValue: this.exmstdanswerpaperpages.value.examId },
        { paramName: 'in_academic_year_id', paramValue: this.exmstdanswerpaperpages.value.academicYearId },
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
                this.exmstdanswerpaperpages.get('courseYearId').setValue(this.courseyearcode[0].fk_course_year_id)
                this.selectedCourseYr(this.exmstdanswerpaperpages.value.courseYearId);
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
    this.subjectcode1 = [];
    this.subjectcode = [];
    this.subjectListDetails = [];
    this.exmstdanswerpaperpages.get('regulationId').setValue('');
    this.exmstdanswerpaperpages.get('subjectId').setValue('');
    /*----------- REGULATION -----------*/
    this.regulationsList = this.courseyearcode1.filter(x => (x.fk_course_year_id === this.exmstdanswerpaperpages.value.courseYearId))
    if (this.regulationsList && this.regulationsList.length > 0) {
      const regulationsList = this.regulationsList.map(({ fk_regulation_id }) => fk_regulation_id);
      this.regulations = this.regulationsList.filter(({ fk_regulation_id }, index) => !regulationsList.includes(fk_regulation_id, index + 1));
    }
    if (this.regulations && this.regulations.length > 0) {
      this.exmstdanswerpaperpages.get('regulationId').setValue(this.regulations[0].fk_regulation_id);
      this.selectedRegulation(this.exmstdanswerpaperpages.value.regulationId);
    }
  }
  selectedRegulation(regulationId) {
    this.subjectListDetails = [];
    this.subjectcode1 = [];
    this.subjectcode = [];
    this.exmstdanswerpaperpages.get('subjectId').setValue('');
    if (this.exmstdanswerpaperpages.value.regulationId != null && regulationId != null) {
      /*----------- SUBJECTS -----------*/
      let request = [
        { paramName: 'in_flag', paramValue: 'univ_exam_subject_regexamstd' },
        { paramName: 'in_flag_type', paramValue: 'REGSUP' },
        { paramName: 'in_university_id', paramValue: 0 },
        { paramName: 'in_univ_examcenter_id', paramValue: 0 },
        { paramName: 'in_college_id', paramValue: 0 },
        { paramName: 'in_course_id', paramValue: this.exmstdanswerpaperpages.value.courseId },
        { paramName: 'in_course_group_id', paramValue: 0 },
        { paramName: 'in_course_year_id', paramValue: this.exmstdanswerpaperpages.value.courseYearId },
        { paramName: 'in_exam_id', paramValue: this.exmstdanswerpaperpages.value.examId },
        { paramName: 'in_academic_year_id', paramValue: this.exmstdanswerpaperpages.value.academicYearId },
        { paramName: 'in_regulation_id', paramValue: this.exmstdanswerpaperpages.value.regulationId },
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
    this.tabledata = false
    this.evaluarry1 = []
    this.collegearry1 = []
    this.configuredData = [];
    this.NotconfiguredData = [];
  }
  getanswerpages(): void {
    this.spinner.show();
    this.evaluarry1 = []
    this.collegearry1 = []
    this.configuredData = [];
    this.NotconfiguredData = [];
    this.flag = true;
    if (this.exmstdanswerpaperpages.value.isReEvaluation == true) {
      this.isReEvaluation = true
      this.flagName = 'list_re_evaluator_subjects'
    }
    else {
      this.isReEvaluation = false
      this.flagName = 'list_evaluator_subjects'
    }
    this.tabledata = false
    if (this.evaluatorsubjectform.valid) {
      let request = [
        { paramName: 'in_flag', paramValue: this.flagName },
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
        { paramName: 'in_exam_id', paramValue: this.exmstdanswerpaperpages.value.examId },
        { paramName: 'in_course_year_id', paramValue: this.exmstdanswerpaperpages.value.courseYearId },
        { paramName: 'in_subject_id', paramValue: this.exmstdanswerpaperpages.value.subjectId },
        { paramName: 'in_regulation_id', paramValue: this.exmstdanswerpaperpages.value.regulationId },
        { paramName: 'in_course_id', paramValue: this.exmstdanswerpaperpages.value.courseId },
        { paramName: 'in_academic_year_id', paramValue: this.exmstdanswerpaperpages.value.academicYearId },
        { paramName: 'in_loginuser_empid', paramValue: +localStorage.getItem('employeeId') }
      ];
      this.crudService.getDetailsByRequest(this.getExamEvaluationSubjectCodes, '', request, '&')
        .subscribe(result => {
          this.spinner.hide();
          if (result.statusCode === 200) {
            this.spinner.hide();
            if (result.data && result.data !== '' && result.data.result.length > 0) {
              this.ListExamSubjects = result.data.result[0];
              this.configuredData = [];
              this.NotconfiguredData = [];
              for (let i = 0; i < this.ListExamSubjects.length; i++) {
                if (this.ListExamSubjects[i].is_configured == 1) {
                  this.configuredData.push(this.ListExamSubjects[i])
                  this.tabledata = true;
                }
                else {
                  this.NotconfiguredData.push(this.ListExamSubjects[i])
                  this.flag = true;
                }
              }
              this.dataSource = new MatTableDataSource<any>(this.configuredData);
              this.dataSource.paginator = this.paginator;
              this.dataSource.sort = this.sort;
              const collegeCode = this.NotconfiguredData.map(({ college_code }) => college_code);
              this.collegeCode = this.NotconfiguredData.filter(({ college_code }, index) =>
                !collegeCode.includes(college_code, index + 1));

              const evaluatorName = this.NotconfiguredData.map(({ evaluator_name }) => evaluator_name);
              this.evaluatorName = this.NotconfiguredData.filter(({ evaluator_name }, index) =>
                !evaluatorName.includes(evaluator_name, index + 1));
            } else {
              this.snotifyService.success(result.message, 'Success!');
            }
          } else {
            this.spinner.hide();
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
  checkedEvaluvatorsList(event, i, row) {
    if (event.checked == true) {
      this.evaluarry1.push(row)
    }
    if (event.checked == false) {
      for (i = 0; i < this.evaluarry1.length; i++) {
        // this.evaluarry1[i].checked=event
        if (this.evaluarry1[i].pk_exam_evaluator_profile_id == row.pk_exam_evaluator_profile_id) {
          this.evaluarry1.splice(i, 1)
        }
      }
    }
  }

  checkedItemsCollege(event, i, row) {
    if (event.checked == true) {
      this.collegearry1.push(row)
    }
    if (event.checked == false) {
      for (i = 0; i < this.collegearry1.length; i++) {
        if (this.collegearry1[i].fk_college_id == row.fk_college_id) {
          this.collegearry1.splice(i, 1)
        }
      }
    }
  }

  markItems(): void {
    this.evaluarry1 = []
    for (let i = 0; i < this.evaluatorName.length; i++) {
      if (this.checksubject) {
        this.evaluatorName[i].checked = true;
        this.evaluarry1.push(this.evaluatorName[i]);
      } else {
        this.evaluatorName[i].checked = false;
        this.checksubject = false
        this.evaluarry1 = []
      }
    }
  }

  checkedItemsL(event, i, row) {
    this.details.push(row)
    for (i = 0; i < this.details.length; i++) {
      this.timetable_det_ids = this.details[i].pk_exam_timetable_det_ids.split(',')
      this.details[i].checked = event.checked
      if (this.details[i].checked === false) {
        for (let k = 0; k < this.assignEvaluator.length; k++) {
          if (this.timetable_det_ids.filter(x => x == this.assignEvaluator[k].examTimetableDetId)) {
            this.assignEvaluator.splice(k, 1);
            k--;
            this.details.splice(i, 1);
            i--;
          }
        }

      }
      else {
        // this.timetable_det_ids=this.details[i].pk_exam_timetable_det_ids.split(',')
        for (let j = 0; j < this.timetable_det_ids.length; j++) {
          this.assignEvaluator.push({
            examEvaluatorProfileId: this.details[i].pk_exam_evaluator_profile_id,
            examTimetableDetId: this.timetable_det_ids[j],
            subjectCode: this.details[i].subject_code,
            subjectId: this.details[i].fk_subject_id,
            studentsAssigned: '',
            evaluationsCompleted: '',
            validityStartDate: this.genericFunctions.moment(),
            validityEndDate: this.genericFunctions.moment(),
            isActive: true,
            reason: '',

          })
        }
      }

    }
  }
  AssignSubject() {
    this.assignEvaluator = [];
    for (let i = 0; i < this.evaluarry1.length; i++) {
      for (let j = 0; j < this.collegearry1.length; j++) {
        this.timetable_det_ids = this.collegearry1[j].pk_exam_timetable_det_ids.split(',')
        for (let k = 0; k < this.timetable_det_ids.length; k++) {
          this.assignEvaluator.push({
            examEvaluatorProfileId: this.evaluarry1[i].pk_exam_evaluator_profile_id,
            examTimetableDetId: this.timetable_det_ids[k],
            subjectCode: this.collegearry1[j].subject_code,
            subjectId: this.collegearry1[j].fk_subject_id,
            studentsAssigned: '',
            evaluationsCompleted: '',
            validityStartDate: this.genericFunctions.moment(),
            validityEndDate: this.genericFunctions.moment(),
            isActive: true,
            reason: '',
            isReevaluation: this.isReEvaluation

          })
        }
      }
    }
    this.crudService.add(this.addexamevaluatorsUrl, this.assignEvaluator)
      .subscribe(result => {
        if (result) {
          if (result.statusCode === 200) {
            if (result.success == true) {
              this.snotifyService.success(result.message, 'Success!');
              this.flag = false
              this.tabledata = true
              this.getanswerpages();
              this.spinner.hide();
            }
          } else {
            this.snotifyService.error(result.message, 'Error!');
          }
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