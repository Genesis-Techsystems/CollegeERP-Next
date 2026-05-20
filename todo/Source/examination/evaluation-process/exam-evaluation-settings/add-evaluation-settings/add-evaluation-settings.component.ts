import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { GenericFunctions } from 'app/main/common/generic-functions';
import * as _ from 'lodash';
import *  as moment from 'moment';
import { SnotifyService } from 'ng-snotify';

@Component({
  selector: 'app-add-evaluation-settings',
  templateUrl: './add-evaluation-settings.component.html',
  styleUrls: ['./add-evaluation-settings.component.scss']
})
export class AddEvaluationSettingsComponent implements OnInit {

  public formData;

  examEvaluationSetting: FormGroup;

  dialogTitle: string;

  examDate = this.genericFunctions.momentWithDateFormatYMD(this.genericFunctions.moment());

  constructor(private formBuilder: FormBuilder, private snotifyService: SnotifyService, private dialogRef: MatDialogRef<AddEvaluationSettingsComponent>,
    @Inject(MAT_DIALOG_DATA) public data, private genericFunctions: GenericFunctions) {
  }

  ngOnInit(): void {
    this.dialogTitle = 'Add Evaluation Settings';
    this.examEvaluationSetting = this.formBuilder.group({
      maxNoOfEvaluationsAssign: [''],
      maxNoOfReevaluationsAssign: [''],
      minEvaluationTIme: [''],
      evaluationStartDate: [new Date(), Validators.required],
      evaluationEndDate: [''],
      noOfEvaluations: ['', Validators.required],
      noOfReEvaluations: ['', Validators.required],
      marksDiffForModEvaluatoin: ['', Validators.required],
      noOfChiefEvaluations: ['', Validators.required],
      noOfChiefReevaluations: ['', Validators.required],
      isActive: ['', Validators.required],
      reason: [],
    });
    this.examEvaluationSetting.get('isActive').setValue(true);
    this.examEvaluationSetting.get('evaluationStartDate').setValue(this.genericFunctions.moment());
    this.examEvaluationSetting.get('evaluationEndDate').setValue(this.genericFunctions.moment());
    if (!this.isEmptyObject(this.data) && this.data.type != 'new') {
      this.dialogTitle = 'Edit Evaluation Settings';
      this.examEvaluationSetting.get('minEvaluationTIme').setValue(this.data.minEvaluationTIme);
      this.examEvaluationSetting.get('evaluationStartDate').setValue(new Date(moment(this.data.evaluationStartDate).format()));
      this.examEvaluationSetting.get('evaluationEndDate').setValue(new Date(moment(this.data.evaluationEndDate).format()));
      this.examEvaluationSetting.get('maxNoOfEvaluationsAssign').setValue(this.data.maxNoOfEvaluationsAssign);
      this.examEvaluationSetting.get('maxNoOfReevaluationsAssign').setValue(this.data.maxNoOfReevaluationsAssign);
      this.examEvaluationSetting.get('noOfEvaluations').setValue(this.data.noOfEvaluations);
      this.examEvaluationSetting.get('noOfReEvaluations').setValue(this.data.noOfReEvaluations);
      this.examEvaluationSetting.get('marksDiffForModEvaluatoin').setValue(this.data.marksDiffForModEvaluatoin);
      this.examEvaluationSetting.get('noOfChiefEvaluations').setValue(this.data.noOfChiefEvaluations);
      this.examEvaluationSetting.get('noOfChiefReevaluations').setValue(this.data.noOfChiefReevaluations);
      this.examEvaluationSetting.get('isActive').setValue(this.data.isActive);
    }
  }
  calDay(): void {
    const date1 = new Date(moment(this.examEvaluationSetting.value.evaluationStartDate).format()); // new Date(this.data.issueTodate);
    const date2 = new Date(moment(this.examEvaluationSetting.value.evaluationStartDate).format()); // new Date(returnDate);
    if (date1.getTime() > date2.getTime()) {
      this.snotifyService.info('From date should be less then To date.', 'Info!');
      this.examEvaluationSetting.get('toDate').setValue(this.examEvaluationSetting.value.evaluationStartDate);
    }
  }
  // tslint:disable-next-line:typedef
  isEmptyObject(obj) {
    return (obj && (Object.keys(obj).length === 0));
  }
  submit(): void {
    const Obj = this.examEvaluationSetting.value;
    if (this.examEvaluationSetting.invalid) {
      return;
    } else {
      this.dialogRef.close(Obj);
    }
  }
}