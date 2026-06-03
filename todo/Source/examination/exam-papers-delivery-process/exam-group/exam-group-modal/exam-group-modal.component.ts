import { Component, OnInit, Inject } from '@angular/core';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { CONSTANTS } from 'app/main/common/constants';
import { CrudService } from 'app/main/services/crud.service';
import { SnotifyService } from 'ng-snotify';
import { GenericFunctions } from 'app/main/common/generic-functions';
import *  as moment from 'moment';
import { Moment } from 'moment';
import { MatDatepicker } from '@angular/material/datepicker';

@Component({
  selector: 'app-exam-group-modal',
  templateUrl: './exam-group-modal.component.html',
  styleUrls: ['./exam-group-modal.component.scss']
})
export class ExamGroupModalComponent implements OnInit {

  dialogTitle;
  examGroupModalForm: FormGroup;

  academicYears = [];
  date = new Date();

    private academicYearCrudUrl = CONSTANTS.academicYearCrudUrl;
    private getDetailsByUniversityIdUrl = CONSTANTS.getDetailsByUniversityIdUrl;
    private isActive = CONSTANTS.isActive;

  constructor(private formBuilder: FormBuilder, private dialogRef: MatDialogRef<ExamGroupModalComponent>,
              private crudService: CrudService, @Inject(MAT_DIALOG_DATA) public data, public router: Router,
              private snotifyService: SnotifyService,private genericFunctions: GenericFunctions) {

     }

  ngOnInit(): void {
    this.dialogTitle = 'Add Exam Group';
    this.examGroupModalForm = this.formBuilder.group({
      academicYearId: ['', Validators.required],
      examGroupCode: ['', Validators.required],
      examGroupName: ['', Validators.required],
      isActive: [],
      reason: []
  });

    this.examGroupModalForm.get('isActive').setValue(true);
    this.examGroupModalForm.get('reason').setValue('active');
    this.getAcademicYears();
    if (!this.isEmptyObject(this.data)){
      if(this.data.univExamGroupId){
         this.examGroupModalForm.get('academicYearId').setValue(this.data.academicYearId);
         this.date = this.data.examMonthYr;
         this.examGroupModalForm.get('examGroupCode').setValue(this.data.examGroupCode);
         this.examGroupModalForm.get('examGroupName').setValue(this.data.examGroupName);
         this.examGroupModalForm.get('isActive').setValue(this.data.isActive);
         this.examGroupModalForm.get('reason').setValue(this.data.reason);
         this.dialogTitle = 'Edit Exam Group';
      }
}
  }

  getAcademicYears(): void{
      if (this.data.universityId){
        /*----------- ACADEMIC YEARS -----------*/
        this.crudService.listDetailsByTwoIds(this.academicYearCrudUrl, this.data.universityId, 'true', this.getDetailsByUniversityIdUrl, this.isActive)
        .subscribe(result => {
            if (result.statusCode === 200) {
                if (result.data.resultList && result.data.resultList !== '') {
                    this.academicYears = result.data.resultList;
                    if(this.academicYears && this.academicYears.length > 0){
                       this.academicYears = this.academicYears.sort((a,b)=>parseInt(b?.academicYear) - parseInt(a?.academicYear));
                    }
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
    }

    // tslint:disable-next-line: typedef
    chosenMonthHandler(normalizedMonth: Moment, datepicker: MatDatepicker<Moment>) {
    // tslint:disable-next-line: prefer-const tslint:disable-next-line: no-var-keyword tslint:disable-next-line: quotemark
        var tempDate = JSON.stringify(normalizedMonth).replace("\"", '').split('-');
        // tslint:disable-next-line: radix tslint:disable-next-line: no-var-keyword
        var month = parseInt(tempDate[1]);
        // tslint:disable-next-line: radix tslint:disable-next-line: no-var-keyword
        var year = month === 12 ? parseInt(tempDate[0]) + 1 : parseInt(tempDate[0]);
        // tslint:disable-next-line: radix tslint:disable-next-line: no-var-keyword tslint:disable-next-line: prefer-const
        var year = month === 12 ? parseInt(tempDate[0]) + 1 : parseInt(tempDate[0]);
        month = month === 12 ? 1 : month + 1;
        this.date = new Date(year + '-' + month);
        datepicker.close();
  
    }

  submit(): void{
    const Obj = this.examGroupModalForm.value;
    Obj.examMonthYr = this.genericFunctions.momentFormatYMD1(this.date);
    if (this.examGroupModalForm.invalid) {
            return;
        }else{
          this.dialogRef.close(Obj);
        }
  }
  
  // tslint:disable-next-line:typedef
  isEmptyObject(obj) {
    return (obj && (Object.keys(obj).length === 0));
  }
}
