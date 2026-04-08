import { Component, OnInit, Inject, ViewChild } from '@angular/core';
import { FormGroup, FormBuilder, Validators, FormControl } from '@angular/forms';
import { CONSTANTS } from 'app/main/common/constants';
import { GenericFunctions } from 'app/main/common/generic-functions';
import { SnotifyService } from 'ng-snotify';
import { CrudService } from 'app/main/services/crud.service';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, ReplaySubject } from 'rxjs';
import { takeUntil, take } from 'rxjs/operators';
import { Organization } from 'app/main/models/organization';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSelect } from '@angular/material/select';
import { NgxSpinnerService } from 'ngx-spinner';
import { MatTableDataSource } from '@angular/material/table';
import * as _ from 'lodash';
import { AcademicYear } from 'app/main/models/academicYear';
import { College } from 'app/main/models/college';
import { Course } from 'app/main/models/course';
import { CourseGroup } from 'app/main/models/courseGroup';
import { ExamMaster } from 'app/main/models/examMaster';
import { GeneralDetail } from 'app/main/models/generalDetail';
import { Section } from 'app/main/models/section';
import *  as moment from 'moment';
@Component({
  selector: 'app-add-evaluator-bank-details',
  templateUrl: './add-evaluator-bank-details.component.html',
  styleUrls: ['./add-evaluator-bank-details.component.scss']
})
export class AddEvaluatorBankDetailsComponent implements OnInit {
addevaluatorform: FormGroup;
dialogTitle;
minDate;
step = 0;
maxDate;
examTypeId;
regulationId;
subjectTypeId;
checkUploadType = 1;
public searchText: string;
duplicateexamStudentList = [];
private isActive = CONSTANTS.isActive;
private generalDetailsByCodeUrl = CONSTANTS.generalDetailsByCodeUrl;
private generalDetailsUrl = CONSTANTS.generalDetailsUrl;
public formData;
dataSource: MatTableDataSource<any>;
@ViewChild('singleSelect') singleSelect: MatSelect;
Obj: any={};
constructor(private genericFunctions: GenericFunctions, private formBuilder: FormBuilder, private dialogRef: MatDialogRef<AddEvaluatorBankDetailsComponent>,
  @Inject(MAT_DIALOG_DATA) public data, private snotifyService: SnotifyService, private spinner: NgxSpinnerService,
  private crudService: CrudService, public router: Router) {

}

ngOnInit(): void {
 
  this.dialogTitle = 'Add Bank Details';
  this.addevaluatorform = this.formBuilder.group({
    bankName: [''],
    branchName: [''],
    bankAddress: [''],
    phone: ['', [Validators.required, Validators.pattern('^[0-9]{10}$')]],
    ifscCode: ['',Validators.required],
    accountNumber: ['',Validators.required],
    ddPayableAddress: [''],
    upi: [''],
    isActive: [true,Validators.required],
    reason: [''],
  });

  if (!this.isEmptyObject(this.data)) {
    if(this.data[0]){
    this.dialogTitle = 'Edit Bank Details';
    this.addevaluatorform.get('phone').setValue(this.data[0]?.phone);
    }
    else{
    this.addevaluatorform.get('phone').setValue(this.data?.phoneNumber);
    this.addevaluatorform.get('isActive').setValue(true);

    }
    this.addevaluatorform.get('bankName').setValue(this.data[0]?.bankName);
    this.addevaluatorform.get('branchName').setValue(this.data[0]?.branchName);
    this.addevaluatorform.get('bankAddress').setValue(this.data[0]?.bankAddress);
    this.addevaluatorform.get('ifscCode').setValue(this.data[0]?.ifscCode);
    this.addevaluatorform.get('accountNumber').setValue(this.data[0]?.accountNumber);
    this.addevaluatorform.get('ddPayableAddress').setValue(this.data[0]?.ddPayableAddress);
    this.addevaluatorform.get('upi').setValue(this.data[0]?.upi);
    this.addevaluatorform.get('isActive').setValue(this.data[0]?.isActive);
}
 
}

isEmptyObject(obj) {
return (obj && (Object.keys(obj).length === 0));
}

submit(): void {
if(this.addevaluatorform.valid){
this.Obj=this.addevaluatorform.value;
// this.Obj.examEvaluatorProfilesId = this.data.examEvaluatorProfileId;
this.dialogRef.close(this.Obj);
}else{
return;
}
}

}
