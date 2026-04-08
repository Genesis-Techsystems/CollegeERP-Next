import { Component, OnInit } from '@angular/core';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { CONSTANTS } from 'app/main/common/constants';
import { GenericFunctions } from 'app/main/common/generic-functions';
import { SnotifyService } from 'ng-snotify';
import { CrudService } from 'app/main/services/crud.service';
import { Router } from '@angular/router';
import { NgxSpinnerService } from 'ngx-spinner';

@Component({
  selector: 'app-assign-evaluator-exam',
  templateUrl: './assign-evaluator-exam.component.html',
  styleUrls: ['./assign-evaluator-exam.component.scss']
})
export class AssignEvaluatorExamComponent implements OnInit {

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
  
  private examFiltersByCodeUrl = CONSTANTS.examFiltersByCodeUrl;
  private getExamEvaluationCodesUrl = CONSTANTS.getExamEvaluationCodesUrl;
  private addExamEvaluatorProfileDetails = CONSTANTS.addExamEvaluatorProfileDetails;

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
  evaluatorsList = [];
  checksubject: boolean = false; 
  selectedCount: number = 0;
  selectedEvaluators: any[] = [];
  examProfileListdata: any[] = [];
  flag: boolean = false;

  constructor(
    private genericFunctions: GenericFunctions, private formBuilder: FormBuilder,
    private snotifyService: SnotifyService, private spinner: NgxSpinnerService,
    private crudService: CrudService, public router: Router) {

  }

  ngOnInit(): void {
    this.addevaluatorform = this.formBuilder.group({
      courseId: ['', Validators.required],
      academicYearId: ['', Validators.required],
      examId: ['', Validators.required],
      regulationId: ['', Validators.required],
      subjectId: ['', Validators.required]
    });
    this.getExamFiltersList();
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
    this.colleges = [];
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
    this.evaluatorsList = [];
    this.flag = false;
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
    this.subjectListDetails = [];
    this.subjectsList = [];
    this.subjects = [];
    this.subjectsData = [];
    this.examFilter = [];
    this.exams = [];
    this.regulationDetails = [];
    this.regulationList = [];
    this.regulations = [];
    this.evaluatorsList = [];
    this.flag = false;
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
    this.subjectListDetails = [];
    this.subjectsList = [];
    this.subjects = [];
    this.subjectsData = [];
    this.regulationDetails = [];
    this.regulationList = [];
    this.regulations = [];
    this.evaluatorsList = [];
    this.flag = false;
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
    this.subjectListDetails = [];
    this.subjectsList = [];
    this.subjects = [];
    this.subjectsData = [];
    this.evaluatorsList = [];
    this.flag = false;
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
        { paramName: 'in_sub_flag_type', paramValue: 'NOLAB' },
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
  getEvaluators(){
    this.evaluatorsList = [];
    this.flag = false;
    if (this.addevaluatorform.valid) {
      /*----------- SUBJECTS -----------*/
      let request = [
      { paramName: 'in_flag', paramValue: 'exam_evaluator_list' },
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
      { paramName: 'in_course_id', paramValue: this.addevaluatorform.value.courseId },
      { paramName: 'in_academic_year_id', paramValue: this.addevaluatorform.value.academicYearId },
      { paramName: 'in_exam_id', paramValue: this.addevaluatorform.value.examId },
      { paramName: 'in_course_year_id', paramValue: 0 },
      { paramName: 'in_regulation_id', paramValue: this.addevaluatorform.value.regulationId },
      { paramName: 'in_subject_id', paramValue: this.addevaluatorform.value.subjectId },
      { paramName: 'in_loginuser_empid', paramValue: +localStorage.getItem('employeeId') }
    ];
      this.crudService.getDetailsByRequest(this.getExamEvaluationCodesUrl, '', request, '&')
        .subscribe(result => {
          this.spinner.hide();
          if (result.statusCode === 200) {
            if (result.data && result.data !== '' && result.data.result.length > 0) {
              this.evaluatorsList = result.data.result[0];
              if(this.evaluatorsList && this.evaluatorsList.length > 0){
                this.evaluatorsList = this.evaluatorsList.map(it => ({ ...it, checked: false }));
              }
              this.flag = true;
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
    }else{
            this.snotifyService.info('Please Select Required Filters', 'Info!');
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
  isEmptyObject(obj) {
    return (obj && (Object.keys(obj).length === 0));
  }
  markItems(checked: boolean): void {
    this.checksubject = checked;
    this.evaluatorsList.forEach(e => (e.checked = this.checksubject));
    this.updateSelectedEvaluators();
  }

  // Toggle a single evaluator
  checkedProfile(isChecked: boolean, objct: any): void {
    objct.checked = !!isChecked;
    // keep master checkbox state in sync
    this.checksubject = this.evaluatorsList.every(ev => ev.checked);
    this.updateSelectedEvaluators();
  }

  updateSelectedEvaluators(): void {
    this.selectedEvaluators = this.evaluatorsList.filter(e => e.checked);
    this.selectedCount = this.selectedEvaluators.length;
    // copy to display list (safe copy)
    this.examProfileListdata = this.selectedEvaluators.map(s => ({ ...s }));
  }


  // Assign button
  Assign(): void {
    if (this.selectedEvaluators.length === 0) {
      this.snotifyService.info('Please select at least one evaluator.', 'Info!');
      return;
    }
    const payload = this.selectedEvaluators.map(selected => ({
      examEvaluatorProfileId: selected.fk_exam_evaluator_profile_id,
      examId: this.addevaluatorform.value.examId,
      regulationId: this.addevaluatorform.value.regulationId,
      subjectId: this.addevaluatorform.value.subjectId
    }));
    this.spinner.show();
      this.crudService.updateMasterDetails(this.addExamEvaluatorProfileDetails, payload)
        .subscribe(result => {
          this.spinner.hide();
          if (result.statusCode === 200) {
            if (result.data && result.data !== '') {
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

  // Search filter (if needed)
  searchProfile(searchTerm: string): void {
    // You can implement your filtering logic here
    console.log("Searching for:", searchTerm);
  }
}