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
  selector: 'app-univ-exam-bags-modal',
  templateUrl: './univ-exam-bags-modal.component.html',
  styleUrls: ['./univ-exam-bags-modal.component.scss']
})
export class UnivExamBagsModalComponent implements OnInit {

 
  staffForm: FormGroup;
  univExamCenters = [];
  countries: Country[] = [];
  states: State[] = [];
  districts: District[] = [];
  dialogTitle;
  QuestionPaperConfigList= [];
  campus: any = {};
  filtersDetailsList: any;
  CollegesListDetails=[];
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
  private generalDetailsUrl = CONSTANTS.generalDetailsUrl;
  private generalDetailsByCodeUrl = CONSTANTS.generalDetailsByCodeUrl;
  private examBagDispatchStatus = CONSTANTS.examBagDispatchStatus;
  examBagDispatchStatusList: any;

  constructor(private dialog: MatDialog, private snotifyService: SnotifyService, private genericFunctions: GenericFunctions, private dialogRef: MatDialogRef<UnivExamBagsModalComponent>,
    private crudService: CrudService, private spinner: NgxSpinnerService, public router: Router, private formBuilder: FormBuilder,  @Inject(MAT_DIALOG_DATA) private data,) {

   
  //  this.getQuestionPaperConfig();
   this.getFiltersList();
}
  // tslint:disable-next-line:typedef
  ngOnInit() {
      this.dialogTitle = 'Add Exam Bag';
      this.staffForm = this.formBuilder.group({
        courseId: ['', Validators.required],
        academicYearId: ['', Validators.required],
        examId: ['', Validators.required],
        univExamcenterId: ['', Validators.required],
        bagSerialNo: ['', Validators.required],
        totalAnswerBooks: ['', Validators.required],
        dispatchStatusCatdetId: ['', Validators.required],
        trackerId: ['', Validators.required],
        isSealed: ['', Validators.required],
        sealedbyUserId: ['', Validators.required],
        sealedbyName: ['', Validators.required],
          isActive: [],
          reason: []
      });

      this.staffForm.get('isActive').setValue(true);
      this.staffForm.get('reason').setValue('active');

      if (!this.isEmptyObject(this.data) && this.data.type == 'new') {
        
          this.staffForm.get('univExamcenterId').setValue(this.data?.univExamcenterId);
          this.staffForm.get('courseId').disable();
          this.staffForm.get('academicYearId').disable();
          this.staffForm.get('examId').disable();
          this.staffForm.get('univExamcenterId').disable();

          this.dialogTitle = 'Add Exam Bag';
      }else {
        this.staffForm.get('univExamcenterId').setValue(this.data?.univExamcenterId);
        this.staffForm.get('courseId').disable();
        this.staffForm.get('academicYearId').disable();
        this.staffForm.get('examId').disable();
        this.staffForm.get('univExamcenterId').disable();
        this.dialogTitle = 'Edit Exam Bag';
        this.staffForm.get('bagSerialNo').setValue(this.data?.bagSerialNo);
        this.staffForm.get('totalAnswerBooks').setValue(this.data?.totalAnswerBooks);
        this.staffForm.get('dispatchStatusCatdetId').setValue(this.data?.dispatchStatusCatdetId);
        this.staffForm.get('trackerId').setValue(this.data?.trackerId);
        this.staffForm.get('isSealed').setValue(this.data?.isSealed);
        this.staffForm.get('sealedbyUserId').setValue(this.data?.sealedbyUserId);
        this.staffForm.get('sealedbyName').setValue(this.data?.sealedbyName);
        this.staffForm.get('isActive').setValue(this.data?.isActive);
        this.staffForm.get('reason').setValue(this.data?.reason);



      }
  }
  getData(): void {
      /*---------- GET ORGANIZATIONS --------------*/
      this.crudService.listDetailsById(this.UnivExamCentersUrl, 'true', this.isActive )
          .subscribe(result => {
              if (result.statusCode === 200) {
                  if (result.data.resultList && result.data.resultList !== '') {
                      this.univExamCenters = result.data.resultList;
                  } else {
                      this.snotifyService.success(result.message, 'Success!');
                  }
              } else {
                  this.snotifyService.error(result.message, 'Error!');
              }
          }, error => {
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
          if (!this.isEmptyObject(this.data)) {
              this.staffForm.get('courseId').setValue(this.data.courseId);
              this.selectedCourse(this.data?.courseId);
             
          }
          // if (!this.isEmptyObject(this.data)) {
          //   this.staffForm.get('courseId').setValue(this.data.univExamcenterId);
          //   this.staffForm.get('academicYearId').setValue(this.data.academicYearId);
          //   this.staffForm.get('examId').setValue(this.data.examId);
          //   this.staffForm.get('univExamcenterId').setValue(this.data.univExamCenterId);
          //   this.selectedCourse(this.data?.courseId);
          //   this.selectedAcademicYear(this.data?.academicYearId);
          //   // this.selectedExam(this.data?.examId);
          // }
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
    this.academicYearsList = this.CollegesListDetails.filter(x => (x.fk_course_id == courseId))
    if (this.academicYearsList.length > 0) {
      const academicYearsList = this.academicYearsList.map(({ fk_academic_year_id }) => fk_academic_year_id);
      this.academicYears = this.academicYearsList.filter(({ fk_academic_year_id }, index) => !academicYearsList.includes(fk_academic_year_id, index + 1));
   
    }
    if (!this.isEmptyObject(this.data)) {
        this.staffForm.get('academicYearId').setValue(this.data.academicYearId);
        this.selectedAcademicYear(this.data?.academicYearId);
    }
    else{
      this.staffForm.get('academicYearId').setValue(this.data.academicYearId);
      this.selectedAcademicYear(this.data?.academicYearId);
    }
    // if (this.academicYears.length > 0) {
     
    // }
  }
  selectedAcademicYear(academicYearId){
    this.staffForm.get('examId').setValue(0);
    this.searchExams = [];
    this.examsList = [];
    this.searchExams = [];
    this.examsLists = [];
    this.examData = [];
    this.examsLists = this.CollegesListDetails.filter(x => (x.fk_course_id == this.data?.courseId && x.fk_academic_year_id == academicYearId))
    if (this.examsLists.length > 0) {
      const examsLists = this.examsLists.map(({ fk_exam_id }) => fk_exam_id);
      this.examsList = this.examsLists.filter(({ fk_exam_id }, index) => !examsLists.includes(fk_exam_id, index + 1));
      this.examsList = this.examsList.filter(x => !x.is_internal_exam)
      this.examData = this.examsList;
    }
    // if (this.examsList.length > 0) {
      this.staffForm.get('examId').setValue(this.data.examId);
      this.selectedExam(this.data?.examId);
    // }
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
  
  selectedExam(examId): void {
   
    /*---------- GET ORGANIZATIONS --------------*/
    this.crudService.listDetailsById(this.UnivExamCentersUrl, 'true', this.isActive )
        .subscribe(result => {
            if (result.statusCode === 200) {
                if (result.data.resultList && result.data.resultList !== '') {
                    this.univExamCenters = result.data.resultList;
                    console.log(this.univExamCenters ,'bef');
                    console.log(this.data,'data');
                    
                    this.univExamCenters=  this.univExamCenters.filter(x=>x.univExamcenterId == this.data.univExamcenterId)
                    console.log(this.univExamCenters);

                    this.staffForm.get('univExamcenterId').setValue( this.univExamCenters[0].univExamcenterId);
                } else {
                    this.snotifyService.success(result.message, 'Success!');
                }
            } else {
                this.snotifyService.error(result.message, 'Error!');
            }
        }, error => {
            if (error.error.statusCode === 401){
                this.snotifyService.error(error.error.message, 'Error!');
                this.genericFunctions.logOut(this.router.url);
            }else{
                this.snotifyService.error(CONSTANTS.message.CON_ERROR, 'Error!');
            }
        });
        this.crudService.listDetailsByTwoIds(this.generalDetailsUrl, this.examBagDispatchStatus, 'true', this.generalDetailsByCodeUrl, this.isActive)
        .subscribe(result => {
            if (result.statusCode === 200) {
                if (result.data.resultList && result.data.resultList !== '') {
                    this.examBagDispatchStatusList = result.data.resultList;
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

  submit(): void {
    let payLoad = {
        univExamcenterId: this.data.univExamcenterId,
        examTimetableId: this.data.examTimetableId,
        bagSerialNo: this.staffForm.value.bagSerialNo,
        totalAnswerBooks: this.staffForm.value.totalAnswerBooks,
        trackerId: this.staffForm.value.trackerId,
        dispatchStatusCatdetId: this.staffForm.value.dispatchStatusCatdetId,
        isSealed: this.staffForm.value.isSealed,
        sealedbyUserId: this.staffForm.value.sealedbyUserId,
        sealedbyName: this.staffForm.value.sealedbyName,
        isActive: this.staffForm.value.isActive,
        reason: this.staffForm.value.reason
    }
      const Obj = payLoad;
      if (!Obj) {
          return;
      } else {
          this.dialogRef.close(Obj);
      }
  }
}


