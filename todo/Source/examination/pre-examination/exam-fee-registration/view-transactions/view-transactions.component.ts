import { Component, OnInit, Inject, ViewChild, ElementRef } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { ExamFeePayDialogComponent } from '../../regular-exam-fee-collection/exam-fee-pay-dialog/exam-fee-pay-dialog.component';
import { GenericFunctions } from 'app/main/common/generic-functions';
import { NgxSpinnerService } from 'ngx-spinner';
import { SnotifyService } from 'ng-snotify';
import { CrudService } from 'app/main/services/crud.service';
import { Router } from '@angular/router';
import { CONSTANTS } from 'app/main/common/constants';
import { GeneralDetail } from 'app/main/models/generalDetail';

@Component({
  selector: 'app-view-transactions',
  templateUrl: './view-transactions.component.html',
  styleUrls: ['./view-transactions.component.scss']
})

export class ViewTransactionsComponent implements OnInit {

  @ViewChild('examFeeReRecptAvatar') examFeeReRecptAvatar: ElementRef;

  private examStudentRegistrationPaymentCrudUrl = CONSTANTS.examStudentRegistrationPaymentCrudUrl;
  private generalDetailsUrl = CONSTANTS.generalDetailsUrl;
  private generalDetailsByCodeUrl = CONSTANTS.generalDetailsByCodeUrl;
  private transactionType = CONSTANTS.transactionType;
  private isActive = CONSTANTS.isActive;

  totalAmount = 0;
  feeRegistrationPayments: any = {};
  transactionTypes: GeneralDetail[] = [];

  constructor(private formBuilder: FormBuilder, private dialogRef: MatDialogRef<ExamFeePayDialogComponent>, private genericFunctions: GenericFunctions,
              @Inject(MAT_DIALOG_DATA) public data, private spinner: NgxSpinnerService,
              private snotifyService: SnotifyService, private crudService: CrudService, public router: Router) {
      
   }

  // tslint:disable-next-line:typedef
  ngOnInit() {
     this.getExamPaymentDetails(); 
  }

  getExamPaymentDetails(): void{
      /*------------- EXAM FEE REGISTRATION PAYNENTS ------------*/  
      this.crudService.listDetailsByFourIds(this.examStudentRegistrationPaymentCrudUrl, this.data.collegeId, this.data.examId,
        this.data.studentId, 'true', 'college.collegeId', 'examMaster.examId', 'studentDetail.studentId', 'isActive')
      .subscribe(result => {
        this.spinner.hide();
        this.getGeneralDetails();
        if (result.statusCode === 200){
              if (result.success) {
                 // this.feeRegistrationPayments = result.data.resultList;
                  // tslint:disable-next-line: prefer-for-of
                  for (let i = 0; i < result.data.resultList.length; i++){
                      if (result.data.resultList[i].examStdRegIds.split(',').filter(x => (+x === this.data.examStdRegId)).length > 0){
                          this.feeRegistrationPayments = result.data.resultList[i];
                      }
                  }
                  if (!this.isEmptyObject(this.feeRegistrationPayments)){
                    // tslint:disable-next-line: prefer-for-of
                    for (let i = 0; i < this.feeRegistrationPayments.examStdRegTxnDTOs.length; i++){
                      this.totalAmount = this.totalAmount + this.feeRegistrationPayments.examStdRegTxnDTOs[i].transactionAmount;
                    }
                  }
                  
              } else {
                // this.snotifyService.success(result.message, 'Success!');
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

  getGeneralDetails(): void{
    /*----------- PAYMENT MODE -----------*/
    this.crudService.listDetailsByTwoIds(this.generalDetailsUrl, this.transactionType , 'true', this.generalDetailsByCodeUrl, this.isActive)
    .subscribe(result => {
        if (result.statusCode === 200){
                  if (result.data.resultList && result.data.resultList !== '') {
                      this.transactionTypes = result.data.resultList;
                  } else {
                      this.snotifyService.success(result.message, 'Success!');
                  }
              }else {
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

  addTrans(): void{
    this.feeRegistrationPayments.examStdRegTxnDTOs.push({
        collegeId: this.feeRegistrationPayments[0].collegeId,
        examId: this.feeRegistrationPayments[0].examId,
        studentId: this.feeRegistrationPayments[0].studentId,
        transactionAppCatId: '',
        isActive: true,
        transactionPath: '',
        transactionFile: '',
        transactionTypeName: '',
        transactionAmount: 0,
        transactionDate: this.genericFunctions.moment(),
        transactionRefno: '',
      });
      // for (let i = 0; i < this.transactions.length; i++){
      //     this.totalTransAmt = this.totalTransAmt + this.transactions[i].transactionAmount;
      // }
  }

  uploadReceipt(event, data): void {
    if (event.target.files && event.target.files[0]) {
        const input = event.target;
        const reader = new FileReader();
        data.path = event.target.files[0]; 
        reader.readAsDataURL(input.files[0]);
    }
  }

  // tslint:disable-next-line:typedef
 isEmptyObject(obj) {
  return (obj && (Object.keys(obj).length === 0));
 }

 uploadDocument(event, data): void {
  if (event.target.files && event.target.files[0]) {
      const input = event.target;
      const reader = new FileReader();
  
      data.path = event.target.files[0]; 
      reader.readAsDataURL(input.files[0]);
  }
}

  submit(): void{
    this.dialogRef.close(this.feeRegistrationPayments);
  }

}
