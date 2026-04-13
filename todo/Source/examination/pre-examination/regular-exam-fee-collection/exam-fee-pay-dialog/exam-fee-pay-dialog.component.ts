import { Component, OnInit, Inject } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { GenericFunctions } from 'app/main/common/generic-functions';
import { NgxSpinnerService } from 'ngx-spinner';
import { SnotifyService } from 'ng-snotify';
import { CrudService } from 'app/main/services/crud.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-exam-fee-pay-dialog',
  templateUrl: './exam-fee-pay-dialog.component.html',
  styleUrls: ['./exam-fee-pay-dialog.component.scss']
})

export class ExamFeePayDialogComponent implements OnInit {

  totalAmount = 0;

  constructor(private formBuilder: FormBuilder, private dialogRef: MatDialogRef<ExamFeePayDialogComponent>, private genericFunctions: GenericFunctions,
              @Inject(MAT_DIALOG_DATA) public data, private spinner: NgxSpinnerService, 
              private snotifyService: SnotifyService, private crudService: CrudService, public router: Router) {
      
   }

  // tslint:disable-next-line:typedef
  ngOnInit() {
     // tslint:disable-next-line: prefer-for-of
     for (let i = 0; i < this.data.length; i++){
       this.totalAmount = this.totalAmount + this.data[i].examFeeAmount + this.data[i].examFineAmount + this.data[i].examAddtFee;
     }
  }

  submit(): void{
    const Obj = 'PAY';
    this.dialogRef.close(Obj);
  }

}
