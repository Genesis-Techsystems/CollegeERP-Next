import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormControl } from '@angular/forms';
import { Router } from '@angular/router';
import { CONSTANTS } from 'app/main/common/constants';
import { GenericFunctions } from 'app/main/common/generic-functions';
import { CrudService } from 'app/main/services/crud.service';
import { ParametersService } from 'app/main/services/parameters.service';
import { SnotifyService } from 'ng-snotify';
import { NgxSpinnerService } from 'ngx-spinner';

@Component({
  selector: 'app-exam-master-details',
  templateUrl: './exam-master-details.component.html',
  styleUrls: ['./exam-master-details.component.scss']
})
export class ExamMasterDetailsComponent implements OnInit {

  private generalDetailsUrl = CONSTANTS.generalDetailsUrl;
  private examFeeType = CONSTANTS.examFeeType;
  private generalDetailsByCodeUrl = CONSTANTS.generalDetailsByCodeUrl;
  private isActive = CONSTANTS.isActive;
  private batchCrudUrl = CONSTANTS.batchCrudUrl;
  private getDetailsByCourseIdUrl = CONSTANTS.getDetailsByCourseIdUrl;
  private regulationCrudUrl = CONSTANTS.regulationCrudUrl;
  private courseGroupCrudUrl = CONSTANTS.courseGroupCrudUrl;
  private courseYearCrudUrl = CONSTANTS.courseYearCrudUrl;
  private sortOrder = CONSTANTS.sortOrder;
  private ExamMasterDetailsUrl = CONSTANTS.ExamMasterDetailsUrl;
  private getExamMasterDetailsUrl = CONSTANTS.getExamMasterDetailsUrl;
  private addExamMasterDetailsUrl = CONSTANTS.addExamMasterDetailsUrl;

  step = 0;
  examMasterDetailsForm: FormGroup;
  openPanel = false;
   updateBtn = false;
  addBtn = true;
  params: any;
  examFeeTypesList = [];
  myControl = new FormControl();
    myControl1 = new FormControl();
  examFeeTypes = [];
  batches = [];
  regulations = [];
  editingIndex: number | null = null;

  courseGroups = [];
  courseYears = [];
  examMasterDetails = [];
  filteredDetails: any[] = [];
  selectedGeneralDetailId: any = null;
  editingId: any = null;

  constructor(private formBuilder: FormBuilder, private snotifyService: SnotifyService,
    private crudService: CrudService, private spinner: NgxSpinnerService, private router: Router,
    private genericFunctions: GenericFunctions, public parameterService: ParametersService) { }

  ngOnInit(): void {
    this.examMasterDetailsForm = this.formBuilder.group({
      batchId: [],
      regulationId: ['', Validators.required],
      courseGroupId: ['', Validators.required],
      courseYearId: ['', Validators.required],
      examLabel: ['', Validators.required],
      isBridgeCourse: [false]
    })
    if (this.parameterService.examMasterDetails) {
      this.params = this.parameterService.examMasterDetails;
      this.getExamDetails();
      this.getExamTypes();
    } else {
      this.goBack();
    }
    this.examMasterDetailsForm.get('isBridgeCourse').setValue(false);
  }

  getExamTypes() {
    this.examFeeTypesList = [];
    this.examFeeTypes = [];
    if (this.params.examId != null && this.params.examId !== undefined) {
      this.crudService.listDetailsByTwoIds(this.generalDetailsUrl, this.examFeeType, 'true', this.generalDetailsByCodeUrl, this.isActive)
        .subscribe(result => {
          if (result.statusCode === 200) {
            if (result.data.resultList && result.data.resultList !== '') {
              this.examFeeTypesList = result.data.resultList;
              if (this.examFeeTypesList && this.examFeeTypesList.length > 0) {
                // this.getBatches();
                this.getRegulations();
                for (let i = 0; i < this.examFeeTypesList.length; i++) {
                  if (this.params.isRegularExam) {
                    if (this.examFeeTypesList[i].generalDetailCode === 'Regular') {
                      this.examFeeTypes.push(this.examFeeTypesList[i]);
                    }
                  }
                  if (this.params.isSupplyExam) {
                    if (this.examFeeTypesList[i].generalDetailCode === 'Supple') {
                      this.examFeeTypes.push(this.examFeeTypesList[i]);
                    }
                  }
                  if (this.params.isInternalExam) {
                    if (this.examFeeTypesList[i].generalDetailCode === 'Internal') {
                      this.examFeeTypes.push(this.examFeeTypesList[i]);
                    }
                  }
                }
                this.selectedGeneralDetailId = this.examFeeTypes[0]?.generalDetailId;
              }
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
  }
  // getBatches(): void {
  //   if (this.params.courseId != null) {
  //     /*----------- Batches --------------*/
  //     this.crudService.listDetailsByTwoIds(this.batchCrudUrl, this.params.courseId, 'true', this.getDetailsByCourseIdUrl, this.isActive)
  //       .subscribe(result => {
  //         if (result.statusCode === 200) {
  //           if (result.data.resultList && result.data.resultList !== '') {
  //             this.batches = result.data.resultList;
  //             this.getRegulations();
  //           } else {
  //             this.snotifyService.success(result.message, 'Success!');
  //           }
  //         } else {
  //           this.snotifyService.error(result.message, 'Error!');
  //         }
  //       }, error => {
  //         if (error.error.statusCode === 401) {
  //           this.snotifyService.error(error.error.message, 'Error!');
  //           this.genericFunctions.logOut(this.router.url);
  //         } else {
  //           this.snotifyService.error(CONSTANTS.message.CON_ERROR, 'Error!');
  //         }
  //       });
  //   }
  // }


edit(row, any) {
  if (!row) return;
  this.addBtn = false;
  this.updateBtn = true;
  this.editingIndex =this.examMasterDetails.findIndex(
    x => x === row || x.examDetailsId === row.examDetailsId
  );;

  this.examMasterDetailsForm.patchValue({
    batchId: row.batchId,
    regulationId: row.regulationId,
    courseGroupId: row.courseGroupId,
    courseYearId: row.courseYearId,
    examLabel: row.examLabel,
    isBridgeCourse: !!row.isBridgeCourse
  });
}



  getRegulations() {
    if (this.params.courseId != null) {
      this.regulations = [];
      /*----------- Regulations -----------*/
      this.crudService.listDetailsByTwoIds(this.regulationCrudUrl, this.params.courseId, 'true', this.getDetailsByCourseIdUrl, this.isActive)
        .subscribe(result => {
          if (result.statusCode === 200) {
            if (result.data.resultList && result.data.resultList !== '') {
              this.regulations = result.data.resultList;
              this.getCourseGroup();
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
  }
  getCourseGroup() {
    this.courseGroups = [];
    if (this.params.courseId != null) {
      this.crudService.listDetailsByTwoIds(this.courseGroupCrudUrl, this.params.courseId, 'true', this.getDetailsByCourseIdUrl, this.isActive)
        .subscribe(result => {
          if (result.statusCode === 200) {
            if (result.data.resultList && result.data.resultList !== '') {
              this.courseGroups = result.data.resultList;
              this.getCourseYear();
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
  }
  getCourseYear() {
    this.courseYears = [];
    if (this.params.courseId != null) {
      this.crudService.listDetailsByTwoIdsWithSortLtd(this.courseYearCrudUrl, this.params.courseId, 'true', 'ASC',
        this.getDetailsByCourseIdUrl, this.isActive, this.sortOrder)
        .subscribe(result => {
          this.spinner.hide();
          if (result.statusCode === 200) {
            if (result.data.resultList && result.data.resultList !== '') {
              this.courseYears = result.data.resultList;
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
  getExamDetails() {
    this.examMasterDetails = [];
    if (this.params.examId !== null) {
      this.crudService.listDetailsByTwoIds(this.ExamMasterDetailsUrl, this.params.examId, 'true',
        this.getExamMasterDetailsUrl, 'isActive')
        .subscribe(result => {
          this.spinner.hide();
          if (result.statusCode === 200) {
            if (result.success) {
              this.examMasterDetails = result.data.resultList;
              this.filterByTab(this.selectedGeneralDetailId);
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
  onTabChange(event: any) {
    const tabIndex = event.index;
    this.selectedGeneralDetailId = this.examFeeTypes[tabIndex].generalDetailId;
    this.filterByTab(this.selectedGeneralDetailId);
    this.clearForm();
  }
  filterByTab(id: any) {
    this.filteredDetails = this.examMasterDetails.filter(x => x.examTypeCatId === id && x.isActive === true);
  }

addOrUpdate() {
  if (!this.examMasterDetailsForm.valid) return;

  if (this.updateBtn) {
    this.updateDetails();
    return;
  }

  const payload = {
    ...this.examMasterDetailsForm.value,
    examTypeCatId: this.selectedGeneralDetailId,
    isActive: true,
    examMasterId: this.params.examId,
    regulationCode: this.regulations.find(
      r => r.regulationId === this.examMasterDetailsForm.value.regulationId
    )?.regulationName,
    courseGroupCode: this.courseGroups.find(
      c => c.courseGroupId === this.examMasterDetailsForm.value.courseGroupId
    )?.groupCode,
    courseYearName: this.courseYears.find(
      y => y.courseYearId === this.examMasterDetailsForm.value.courseYearId
    )?.courseYearName
  };

  this.examMasterDetails.push(payload);
  this.filterByTab(this.selectedGeneralDetailId);
  this.clearForm();
}


updateDetails() {
  if (this.editingIndex === null) return;

  this.examMasterDetails[this.editingIndex] = {
    ...this.examMasterDetails[this.editingIndex],
    ...this.examMasterDetailsForm.value,

    examTypeCatId: this.selectedGeneralDetailId,
    isActive: true,

    regulationCode: this.regulations.find(
      r => r.regulationId === this.examMasterDetailsForm.value.regulationId
    )?.regulationName,

    courseGroupCode: this.courseGroups.find(
      c => c.courseGroupId === this.examMasterDetailsForm.value.courseGroupId
    )?.groupCode,

    courseYearName: this.courseYears.find(
      y => y.courseYearId === this.examMasterDetailsForm.value.courseYearId
    )?.courseYearName
  };

  this.filterByTab(this.selectedGeneralDetailId);
  this.clearForm();
}


  deleteRow(row: any) {
    const index = this.examMasterDetails.findIndex(x => x.examDetailsId === row.examDetailsId);

    if (index !== -1) {
      this.examMasterDetails[index].isActive = false;
    }

    // Refresh filtered list
    this.filterByTab(this.selectedGeneralDetailId);
  }

clearForm() {
  this.examMasterDetailsForm.reset({
    batchId: null,
    regulationId: null,
    courseGroupId: null,
    courseYearId: null,
    examLabel: null,
    isBridgeCourse: false
  });

  this.editingIndex = null;
  this.addBtn = true;
  this.updateBtn = false;
}


  goBack() {
    this.router.navigate(['admin-examination-management/admin-exam-masters/exam-master']);
  }

  submit() {
    this.spinner.show();
    this.crudService.addMasterDetails(this.addExamMasterDetailsUrl, this.examMasterDetails)
      .subscribe(result => {
        this.spinner.hide();
        if (result.statusCode === 200) {
            this.snotifyService.success(result.message, 'Success!');
            this.router.navigate(['admin-examination-management/admin-exam-masters/exam-master']);
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
