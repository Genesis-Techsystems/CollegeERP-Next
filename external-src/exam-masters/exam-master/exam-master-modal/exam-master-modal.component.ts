
import { Component, ElementRef, Inject, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDatepicker } from '@angular/material/datepicker';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { FloorsModalComponent } from 'app/main/apps/admin/institution-masters/floors/floors-modal/floors-modal.component';
import { GenericFunctions } from 'app/main/common/generic-functions';
import { CrudService } from 'app/main/services/crud.service';
import *  as moment from 'moment';
import { Moment } from 'moment';

import { SnotifyService } from 'ng-snotify';

export const MY_FORMATS = {
  parse: {
    dateInput: 'MM/YYYY',
  },
  display: {
    dateInput: 'MM/YYYY',
    monthYearLabel: 'MMM YYYY',
    dateA11yLabel: 'LL',
    monthYearA11yLabel: 'MMMM YYYY',
  },
};

@Component({
  selector: 'app-exam-master-modal',
  templateUrl: './exam-master-modal.component.html',
  styleUrls: ['./exam-master-modal.component.scss'],
  // providers: [
  //   {provide: DateAdapter, useClass: MomentDateAdapter, deps: [MAT_DATE_LOCALE]},

  //   {provide: MAT_DATE_FORMATS, useValue: ''},
  // ],
})

export class ExamMasterModalComponent implements OnInit {

  date = new Date();
  year;
  month;
  flag = 0;
minDate;
maxDate;
  dialogTitle;
  examMastersForm: FormGroup;
  
  @ViewChild('examNtfcAvatar') examNtfcAvatar: ElementRef;
  @ViewChild('examFeeNtfcAvatar') examFeeNtfcAvatar: ElementRef;
  
  constructor(private genericFunctions: GenericFunctions , private formBuilder: FormBuilder, private dialogRef: MatDialogRef<FloorsModalComponent>,
              @Inject(MAT_DIALOG_DATA) public data, private snotifyService: SnotifyService,
              private crudService: CrudService, public router: Router) {  
      // this.year = this.date.value.year();
      // this.month = this.date.value.month() + 1;
  }

  ngOnInit(): void {

    this.dialogTitle = 'Add Exam';
    this.examMastersForm = this.formBuilder.group({     
      examName: ['', Validators.required],
      examShortName: ['', Validators.required],
     // examMonthYr: [],
      isRegularExam: [''],
      isSupplyExam: [''],
      isInternalExam: [''],
      isPublished: [''],
      isResultprocessStarted: [''],
      fromDate: [],
      toDate: [],
      feeNotificationPublishedOn: [],
      notificationPublishedOn: [],
      isActive: [],
      feeNotificationFilePath: [],
      notificationFilePath: [],
      reason: []
    });

    this.examMastersForm.get('isActive').setValue(true);
    this.examMastersForm.get('isRegularExam').setValue(false);
    this.examMastersForm.get('isInternalExam').setValue(false);
    this.examMastersForm.get('fromDate').setValue(this.genericFunctions.moment());
    this.examMastersForm.get('toDate').setValue(this.genericFunctions.moment());
    this.examMastersForm.get('feeNotificationPublishedOn').setValue(this.genericFunctions.moment());
    this.examMastersForm.get('notificationPublishedOn').setValue(this.genericFunctions.moment());
    this.examMastersForm.get('isSupplyExam').setValue(false);
    this.examMastersForm.get('isPublished').setValue(false);
    this.examMastersForm.get('isResultprocessStarted').setValue(false);    
    this.examMastersForm.get('reason').setValue('active');

    if (!this.isEmptyObject(this.data)){
      if (this.data.dataDetails === 'ediExam'){
      this.examMastersForm.get('examName').setValue(this.data.examName);
      this.examMastersForm.get('examShortName').setValue(this.data.examShortName);
      this.examMastersForm.get('isInternalExam').setValue(this.data.isInternalExam);
      this.examMastersForm.get('fromDate').setValue(new Date(this.data.fromDate));
      this.examMastersForm.get('toDate').setValue(new Date(this.data.toDate));
      this.examMastersForm.get('feeNotificationPublishedOn').setValue(new Date(this.data.feeNotificationPublishedOn));
      this.examMastersForm.get('notificationPublishedOn').setValue(new Date(this.data.notificationPublishedOn));
      this.examMastersForm.get('isSupplyExam').setValue(this.data.isSupplyExam);
      this.examMastersForm.get('isPublished').setValue(this.data.isPublished);
      this.examMastersForm.get('isResultprocessStarted').setValue(this.data.isResultprocessStarted);
      this.examMastersForm.get('isRegularExam').setValue(this.data.isRegularExam);
      if (this.data.notificationFilePath !== null){
        this.examMastersForm.get('notificationFilePath').setValue(this.data.notificationFilePath.split('cms/')[1]);
      }
      if (this.data.feeNotificationFilePath !== null){
        this.examMastersForm.get('feeNotificationFilePath').setValue(this.data.feeNotificationFilePath.split('cms/')[1]);
      }
     // this.examMastersForm.get('notificationFilePath').setValue(this.data.notificationFilePath);
      this.examMastersForm.get('isActive').setValue(this.data.isActive);
      this.examMastersForm.get('reason').setValue(this.data.reason);
      this.date = this.data.examMonthYr;
      this.minDate =  this.genericFunctions.momentWithDate(this.date);
      this.checkboxValidation();
      this.dialogTitle = 'Edit Exam';
    }
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
      this.minDate = this.date;
      this.maxDate = this.date;
      this.examMastersForm.get('fromDate').setValue(this.date);
      this.examMastersForm.get('toDate').setValue(this.date);
      datepicker.close();

  }

      // EXAM TYPE VALIDATION
      checkboxValidation(): void{
        if (this.examMastersForm.value.isRegularExam === true ||  this.examMastersForm.value.isSupplyExam === true ){
          this.flag = 1;
        }else
        if (this.examMastersForm.value.isInternalExam === true){
          this.flag = 2;
        }
        else
        if (this.examMastersForm.value.isInternalExam === false ){
          this.flag = 0;
        
        }else{
          if (this.examMastersForm.value.isRegularExam === false ||  this.examMastersForm.value.isSupplyExam === false ){
            this.flag = 0;
          
          }
        }
          }

  submit(): void{
    const Obj = this.examMastersForm.value;
    Obj.examMonthYr = this.genericFunctions.momentFormatYMD1(this.date);
    Obj.notificationPublishedOn = this.genericFunctions.momentFormatYMD1(Obj.notificationPublishedOn);
    Obj.feeNotificationPublishedOn = this.genericFunctions.momentFormatYMD1(Obj.feeNotificationPublishedOn);
    Obj.fromDate = this.genericFunctions.momentWithoutUTC(Obj.fromDate);
    Obj.toDate = this.genericFunctions.momentWithDateFormatYMD(Obj.toDate);
    if (this.examNtfcAvatar.nativeElement.files.length > 0){
      Obj.notificationFile = this.examNtfcAvatar;
  }else{
      Obj.notificationFile = null;
  }
    if (this.examFeeNtfcAvatar.nativeElement.files.length > 0){
      Obj.feeNotificationFile = this.examFeeNtfcAvatar;
  }else{
      Obj.feeNotificationFile = null;
  }

    if (this.examMastersForm.invalid) {
      return;
    }else{
      this.dialogRef.close(Obj);
    }
  }
  
  // tslint:disable-next-line:typedef
  isEmptyObject(obj) {
    return (obj && (Object.keys(obj).length === 0));
  }
 
  /*================= DATE VALIDATION ================*/ 
calDay(): void{
  const date1 = new Date(moment(this.examMastersForm.value.fromDate).format()); // new Date(this.data.issueTodate);
  const date2 = new Date(moment(this.examMastersForm.value.toDate).format()); // new Date(returnDate);
  if (date1.getTime() > date2.getTime()){
    this.snotifyService.info('From date should be less then To date.', 'Info!');
    this.examMastersForm.get('toDate').setValue(this.examMastersForm.value.fromDate);
  }
}

}
