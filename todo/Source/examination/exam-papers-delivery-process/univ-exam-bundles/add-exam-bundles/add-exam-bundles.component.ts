import { Component, OnInit, Inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { SnotifyService } from 'ng-snotify';
import { Country } from 'app/main/models/country';
import { State } from 'app/main/models/state';
import { District } from 'app/main/models/district';
import { Organization } from 'app/main/models/organization';
import { Router } from '@angular/router';
import { GenericFunctions } from 'app/main/common/generic-functions';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialog } from '@angular/material/dialog';
import { CONSTANTS } from 'app/main/common/constants';
import { CrudService } from 'app/main/services/crud.service';
import { NgxSpinnerService } from 'ngx-spinner';

@Component({
  selector: 'app-add-exam-bundles',
  templateUrl: './add-exam-bundles.component.html',
  styleUrls: ['./add-exam-bundles.component.scss']
})
export class AddExamBundlesComponent implements OnInit {
  staffForm: FormGroup;
  univExamCenters = [];
  countries: Country[] = [];
  states: State[] = [];
  districts: District[] = [];
  dialogTitle;
  QuestionPaperConfigList= [];
  campus: any = {};
  filtersDetailsList: any;
  CollegesListDetails: any;
  courses: any;
  academicYearsList: any;
  searchExams: any[];
  examsList: any[];
  academicYears: any[];
  examData: any[];
  examsLists: any[];
  panelOpenState = true;
  step = 0;
 
  private UnivExamCentersUrl = CONSTANTS.UnivExamCentersUrl;
  private isActive = CONSTANTS.isActive;
  private collegewisedetailsUrl = CONSTANTS.collegewisedetailsUrl;
 private UnivExamBagsUrl =CONSTANTS.UnivExamBagsUrl;
  examBagsList=[];
  constructor(private dialog: MatDialog, private snotifyService: SnotifyService, private genericFunctions: GenericFunctions, private dialogRef: MatDialogRef<AddExamBundlesComponent>,
    private crudService: CrudService, private spinner: NgxSpinnerService, public router: Router, private formBuilder: FormBuilder,  @Inject(MAT_DIALOG_DATA) private data,) {
 
   
  //  this.getFiltersList();
   this.getData();
}
  // tslint:disable-next-line:typedef
  ngOnInit() {
      this.dialogTitle = 'Add  Exam Bundles';
      this.staffForm = this.formBuilder.group({
        courseId: [''],
        academicYearId: [''],
        examId: [''],
        bundleNumber: ['', Validators.required],
        startSerialNo: ['', Validators.required],
        endSerialNo: ['', Validators.required],
        univExamBagId: ['', Validators.required],
        totalAnswerBooks: ['', Validators.required],
        isActive: [true],
        reason: []
      });
 
 
      if (!this.isEmptyObject(this.data) && this.data.type!='new') {
          this.staffForm.get('bundleNumber').setValue(this.data?.bundleNumber);
          this.staffForm.get('startSerialNo').setValue(this.data?.startSerialNo);
          this.staffForm.get('endSerialNo').setValue(this.data?.endSerialNo);
          this.staffForm.get('univExamBagId').setValue(this.data?.univExamBagId);
          this.staffForm.get('univExamBagId').disable();
          this.staffForm.get('totalAnswerBooks').setValue(this.data?.totalAnswerBooks);
          this.staffForm.get('isActive').setValue(this.data.isActive);
          this.staffForm.get('reason').setValue(this.data.reason);
          this.dialogTitle = 'Edit Exam Bundles';
      }else if(this.isEmptyObject(this.data) && this.data.univExamBagId !== 0){
          this.staffForm.get('univExamBagId').setValue(this.data?.univExamBagId);
          this.staffForm.get('univExamBagId').disable();
      }
  }
  getData(): void {
      /*---------- GET ORGANIZATIONS --------------*/
    
  this.crudService.listDetailsById(this.UnivExamBagsUrl, 'true', this.isActive)
  .subscribe(result => {
     this.spinner.hide();
     if (result.statusCode === 200){
          if (result.data.resultList && result.data.resultList !== '') {
              this.examBagsList = result.data.resultList;
             
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

  // tslint:disable-next-line:typedef
  isEmptyObject(obj) {
      return (obj && (Object.keys(obj).length === 0));
  }

  getFiltersList(): void {
    this.spinner.show();
    let request = [
      { paramName: 'in_flag', paramValue: 'clg_exam_timetable_filters' },
      { paramName: 'in_org_id', paramValue: +localStorage.getItem('organizationId') },
      { paramName: 'in_college_id', paramValue: 0 },
      { paramName: 'in_course_id', paramValue: 0 },
      { paramName: 'in_course_group_id', paramValue: 0 },
      { paramName: 'in_course_year_id', paramValue: 0 },
      { paramName: 'in_group_section_id', paramValue: 0 },
      { paramName: 'in_academic_year_id', paramValue: 0 },
      { paramName: 'in_dept_id', paramValue: 0 },
      { paramName: 'in_isadmin', paramValue: 0 },
      { paramName: 'in_loginuser_empid', paramValue: +localStorage.getItem('employeeId') },
      { paramName: 'in_loginuser_roleid', paramValue: 0 },
      { paramName: 'in_employee', paramValue: '' },
      { paramName: 'in_subject', paramValue: '' },
      { paramName: 'in_gm_codes', paramValue: '' },
    ];
    this.crudService.getDetailsByRequest(this.collegewisedetailsUrl, '', request, '&')
      .subscribe(result => {
        this.spinner.hide();
        if (result.statusCode === 200) {
          if (result.data && result.data !== '' && result.data.result.length > 0) {
            this.filtersDetailsList = result.data.result;
            for (let i = 0; i < this.filtersDetailsList.length; i++) {
              if (this.filtersDetailsList[i].length > 0 && this.filtersDetailsList[i][0].flag === 'clg_exam_timetable_filters') {
                this.CollegesListDetails = this.filtersDetailsList[i];
              }
            }
 
            const courseList = this.CollegesListDetails.map(({ fk_course_id }) => fk_course_id);
            this.courses = this.CollegesListDetails.filter(({ fk_course_id }, index) =>
              !courseList.includes(fk_course_id, index + 1));
          }
          if(!this.isEmptyObject(this.data)){
            this.staffForm.get('courseId').setValue(this.data?.courseId);
            this.selectedCourse(this.staffForm.value.courseId);
          }
        else  if (this.courses.length > 0) {
            this.staffForm.get('courseId').setValue(this.courses[0].fk_course_id);
            this.selectedCourse(this.staffForm.value.courseId);
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

  // tslint:disable-next-line:typedef
  selectedCourse(courseId) {
    this.staffForm.get('examId').setValue(0);
    this.staffForm.get('academicYearId').setValue(0);
    this.academicYears=[]
    this.searchExams = [];
    this.examsList = [];
    this.searchExams = [];
    this.academicYearsList = [];
    this.examData = [];
    this.academicYearsList = this.CollegesListDetails.filter(x => (x.fk_course_id == this.staffForm.value.courseId))
    if (this.academicYearsList.length > 0) {
      const academicYearsList = this.academicYearsList.map(({ fk_academic_year_id }) => fk_academic_year_id);
      this.academicYears = this.academicYearsList.filter(({ fk_academic_year_id }, index) => !academicYearsList.includes(fk_academic_year_id, index + 1));
   
    }
    if(!this.isEmptyObject(this.data)){
      this.staffForm.get('academicYearId').setValue(this.data.academicYearId);
      this.selectedAcademicYear(this.staffForm.value.academicYearId);
    }
   else if (this.academicYears.length > 0) {
      this.staffForm.get('academicYearId').setValue(this.academicYears[0].fk_academic_year_id);
      this.selectedAcademicYear(this.staffForm.value.academicYearId)
    }
  }
  selectedAcademicYear(academicYearId){
    this.staffForm.get('examId').setValue(0);
    this.searchExams = [];
    this.examsList = [];
    this.searchExams = [];
    this.examsLists = [];
    this.examData = [];
    this.examsLists = this.CollegesListDetails.filter(x => (x.fk_course_id == this.staffForm.value.courseId && x.fk_academic_year_id == this.staffForm.value.academicYearId))
    if (this.examsLists.length > 0) {
      const examsLists = this.examsLists.map(({ fk_exam_id }) => fk_exam_id);
      this.examsList = this.examsLists.filter(({ fk_exam_id }, index) => !examsLists.includes(fk_exam_id, index + 1));
      this.examsList = this.examsList.filter(x => !x.is_internal_exam)
      this.examData = this.examsList;
    }
    if(!this.isEmptyObject(this.data)){
      this.staffForm.get('examId').setValue(this.data?.examId);
      this.selectedExam();
    }
   else if (this.examsList.length > 0) {
      this.staffForm.get('examId').setValue(this.examsList[0].fk_exam_id);
      this.selectedExam();
    }
  }
  searchExam(value) {
    this.examData = [];
    this.examSearch(value);
  }
  examSearch(value: string) {
    let filter = value.toLowerCase()
    for (let i = 0; i < this.examsList.length; i++) {
      let option = this.examsList[i];
      if (option.exam_name.toLowerCase().indexOf(filter) >= 0) {
        this.examData.push(option);
      }
    }
  }
 
  selectedExam(): void {

      }
 
  submit(): void {
      const Obj = this.staffForm.value;
      if (this.staffForm.invalid) {
          return;
      } else {
          this.dialogRef.close(Obj);
      }
  }
}
 