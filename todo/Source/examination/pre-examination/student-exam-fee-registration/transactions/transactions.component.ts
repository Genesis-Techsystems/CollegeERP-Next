import { Component, OnInit, Inject } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { ExamFeePayDialogComponent } from '../../regular-exam-fee-collection/exam-fee-pay-dialog/exam-fee-pay-dialog.component';
import { GenericFunctions } from 'app/main/common/generic-functions';
import { NgxSpinnerService } from 'ngx-spinner';
import { SnotifyService } from 'ng-snotify';
import { CrudService } from 'app/main/services/crud.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-transactions',
  templateUrl: './transactions.component.html',
  styleUrls: ['./transactions.component.scss']
})

export class TransactionsComponent implements OnInit {

  totalAmount = 0;

  constructor(private formBuilder: FormBuilder, private dialogRef: MatDialogRef<ExamFeePayDialogComponent>, private genericFunctions: GenericFunctions,
              @Inject(MAT_DIALOG_DATA) public data, private spinner: NgxSpinnerService, 
              private snotifyService: SnotifyService, private crudService: CrudService, public router: Router) {
      
  }

  // tslint:disable-next-line:typedef
  ngOnInit() {
    if (!this.isEmptyObject(this.data)){
      // tslint:disable-next-line: prefer-for-of
      for (let i = 0; i < this.data.examStdRegTxnDTOs.length; i++){
        if (this.data.examStdRegTxnDTOs[i].isTransactionVerified === null){
            this.data.examStdRegTxnDTOs[i].isTransactionVerified = false;
        }
        this.totalAmount = this.totalAmount + this.data.examStdRegTxnDTOs[i].transactionAmount;
      }
    }
  }

  // tslint:disable-next-line:typedef
  isEmptyObject(obj) {
    return (obj && (Object.keys(obj).length === 0));
  }

  submit(): void{
    const Obj = 'PAY';
    // tslint:disable-next-line: prefer-for-of
    for (let i = 0; i < this.data.examStdRegTxnDTOs.length; i++){
         if (this.data.examStdRegTxnDTOs[i].isTransactionVerified){
            this.data.examStdRegTxnDTOs[i].employeeId = localStorage.getItem('employeeId');
         }
    }
    this.dialogRef.close(this.data);
  }

}
