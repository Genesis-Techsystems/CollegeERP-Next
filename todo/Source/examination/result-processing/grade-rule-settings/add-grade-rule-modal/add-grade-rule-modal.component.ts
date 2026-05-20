import { Component, Inject, OnInit } from '@angular/core';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { CONSTANTS } from 'app/main/common/constants';
import { GenericFunctions } from 'app/main/common/generic-functions';
import *  as moment from 'moment';
import { Moment } from 'moment';
import { SnotifyService } from 'ng-snotify';

@Component({
  selector: 'app-add-grade-rule-modal',
  templateUrl: './add-grade-rule-modal.component.html',
  styleUrls: ['./add-grade-rule-modal.component.scss']
})
export class AddGradeRuleModalComponent implements OnInit {

  private isActive = CONSTANTS.isActive;
  dialogTitle='';
  gradeRuleSettingForm: FormGroup;
  minDate;
  maxDate;

  constructor(private formBuilder: FormBuilder, private dialogRef: MatDialogRef<AddGradeRuleModalComponent>,
              @Inject(MAT_DIALOG_DATA) public data, public router: Router, private snotifyService: SnotifyService,
              private genericFunctions: GenericFunctions) {  
  }

  ngOnInit(): void {

    this.dialogTitle = 'Add Grade Rule Setting';
    this.gradeRuleSettingForm = this.formBuilder.group({
      firstmodmarkstobeAdded: [0],
      firstmodpassPercentage: [0],
      secmodmarksPercentage: [0],
      secmodstdPercentage: [0],
      secmodmarkstobeAdded: [0],
      graftingPercentage: [0],
      evaluationGraceMarks: [0],
      moderationGraceMarks: [0],
      fromDate: [],
      toDate: [],
      isActive: [true],
      reason: []
  });

    this.gradeRuleSettingForm.get('isActive').setValue(true);
    this.gradeRuleSettingForm.get('reason').setValue('active');
    this.gradeRuleSettingForm.get('fromDate').setValue(this.genericFunctions.moment());
    this.gradeRuleSettingForm.get('toDate').setValue(this.genericFunctions.moment());

    if(this.data.edit == 'edit'){
    this.dialogTitle = 'Edit Grade Rule Setting';
    this.gradeRuleSettingForm.get('firstmodmarkstobeAdded').setValue(this.data.firstmodmarkstobeAdded);
    this.gradeRuleSettingForm.get('firstmodpassPercentage').setValue(this.data.firstmodpassPercentage);
    this.gradeRuleSettingForm.get('secmodmarksPercentage').setValue(this.data.secmodmarksPercentage      );
    this.gradeRuleSettingForm.get('secmodstdPercentage').setValue(this.data.secmodstdPercentage);
    this.gradeRuleSettingForm.get('secmodmarkstobeAdded').setValue(this.data.secmodmarkstobeAdded);
    this.gradeRuleSettingForm.get('graftingPercentage').setValue(this.data.graftingPercentage);
    this.gradeRuleSettingForm.get('evaluationGraceMarks').setValue(this.data?.evaluationGraceMarks);
    this.gradeRuleSettingForm.get('moderationGraceMarks').setValue(this.data?.moderationGraceMarks);
    this.gradeRuleSettingForm.get('fromDate').setValue(this.data.fromDate);
    this.gradeRuleSettingForm.get('toDate').setValue(this.data.fromDate);
    this.gradeRuleSettingForm.get('isActive').setValue(this.data.isActive);
    this.gradeRuleSettingForm.get('reason').setValue(this.data.reason);
   }
}

  submit(): void{
    const Obj = this.gradeRuleSettingForm.value;
    if (this.gradeRuleSettingForm.invalid) {
            return;
        }else{
          this.dialogRef.close(Obj);
        }
  }

  calDay(): void{
    const date1 = new Date(moment(this.gradeRuleSettingForm.value.fromDate).format()); // new Date(this.data.issueTodate);
    const date2 = new Date(moment(this.gradeRuleSettingForm.value.toDate).format()); // new Date(returnDate);
    if (date1.getTime() > date2.getTime()){
      this.snotifyService.info('From date should be less then To date.', 'Info!');
      this.gradeRuleSettingForm.get('toDate').setValue(this.gradeRuleSettingForm.value.fromDate);
    }
  }
  
  // tslint:disable-next-line:typedef
  isEmptyObject(obj) {
    return (obj && (Object.keys(obj).length === 0));
  }
}
