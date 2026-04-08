import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { CONSTANTS } from 'app/main/common/constants';
import { GenericFunctions } from 'app/main/common/generic-functions';
import { SnotifyService } from 'ng-snotify';
import { CrudService } from 'app/main/services/crud.service';
import { NgxSpinnerService } from 'ngx-spinner';
import { Router } from '@angular/router';

@Component({
  selector: 'app-notify-modal',
  templateUrl: './notify-modal.component.html',
  styleUrls: ['./notify-modal.component.scss']
})
export class NotifyModalComponent implements OnInit {

  addevaluatorform: FormGroup;
  evauatordata: any;
  objData=[];
  evauatorSingleData:any;
  filtersDetailsList = [];
  examListDetails = [];
  courses = [];
  academicYears = [];
  academicYearsList = [];
  examFilter = [];
  examsList = [];
  examData = [];
  exams = [];

  private examFiltersByCodeUrl = CONSTANTS.examFiltersByCodeUrl;

  constructor(public dialogRef: MatDialogRef<NotifyModalComponent>,@Inject(MAT_DIALOG_DATA) public data: any,
    private genericFunctions: GenericFunctions, private formBuilder: FormBuilder,
    private snotifyService: SnotifyService, private spinner: NgxSpinnerService,
    private crudService: CrudService, public router: Router) {
  }

  ngOnInit(): void {
    console.log(this.data);
    this.addevaluatorform = this.formBuilder.group({
      courseId: ['', Validators.required],
      academicYearId: ['', Validators.required],
      examId: ['', Validators.required]
    });
    this.getExamFiltersList();
    if(this.data.condition == 'single'){ 
      this.evauatordata =[]
      this.evauatorSingleData = this.data.data;
  }else if(this.data.condition == 'bulk'){
    console.log(this.data.condition);
    this.evauatorSingleData=[]
    this.evauatordata = this.data.data;
  }
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
    this.examFilter = [];
    this.exams = [];
    this.academicYears = [];
    this.academicYearsList = [];
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
    this.addevaluatorform.get('examId').setValue('');
    this.examFilter = [];
    this.exams = [];
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

  onSave(): void {
    if(this.addevaluatorform.valid){
     if(this.data.condition == 'single'){ 
      this.evauatordata =[]
      this.evauatorSingleData = this.data.data
      console.log(this.data.condition);
      this.objData = [{
        examEvaluatorProfileId : this.evauatorSingleData.examEvaluatorProfileId,
        examId : this.addevaluatorform.value.examId
      }]
  }else if(this.data.condition == 'bulk'){
    console.log(this.data.condition);
    this.evauatorSingleData=[]
    this.evauatordata = this.data.data
    this.evauatordata = this.data.data.map(evaluator => ({
      examEvaluatorProfileId : evaluator.examEvaluatorProfileId,
      examId : this.addevaluatorform.value.examId
    }));
    this.objData =  this.evauatordata
  }
    console.log(this.objData,'this.objData');
      this.dialogRef.close(this.objData);
    }else{
        this.snotifyService.info('Please Select Exam', 'Info!');
    }
  }
  onCancel(): void {
    this.data = []
    this.dialogRef.close();
  }
}
