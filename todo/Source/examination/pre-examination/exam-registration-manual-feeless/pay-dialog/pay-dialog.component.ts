import { Component, OnInit, Inject, ViewChild, ElementRef } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { GenericFunctions } from 'app/main/common/generic-functions';
import { NgxSpinnerService } from 'ngx-spinner';
import { SnotifyService } from 'ng-snotify';
import { CrudService } from 'app/main/services/crud.service';
import { Router } from '@angular/router';
import { CONSTANTS } from 'app/main/common/constants';

@Component({
  selector: 'app-pay-dialog',
  templateUrl: './pay-dialog.component.html',
  styleUrls: ['./pay-dialog.component.scss']
})
export class PayDialogComponent implements OnInit {

  totalAmount = 0;
  formData: FormData;
  @ViewChild('empPhoto') studentAvatar: ElementRef;
  private uploadExamRegFormsUrl=CONSTANTS.uploadExamRegFormsUrl;

  constructor(private formBuilder: FormBuilder, private dialogRef: MatDialogRef<PayDialogComponent>, private genericFunctions: GenericFunctions,
              @Inject(MAT_DIALOG_DATA) public data, private spinner: NgxSpinnerService, 
              private snotifyService: SnotifyService, private crudService: CrudService, public router: Router) {
   console.log(this.data,'data');
      
   }
   

  // tslint:disable-next-line:typedef
  ngOnInit() {
     // tslint:disable-next-line: prefer-for-of
 
  }
  upload(event: any): void {
    this.formData = new FormData();

    for (let i = 0; i < this.studentAvatar.nativeElement.files.length; i++) {
      this.formData.append('file',
      this.studentAvatar.nativeElement.files[i],
      this.studentAvatar.nativeElement.files[i].name);
         // Convert file to base64
       }
      this.formData.append('collegeCode',this.data[0].collegeCode)
      this.formData.append('courseId',this.data[0].courseId)
      this.formData.append('examId',this.data[0].examId)
       this.formData.append('collegeId',this.data[0].collegeId)
     
     }
  submit(): void{
    if(this.studentAvatar.nativeElement.files.length ){
    this.crudService.upload(this.uploadExamRegFormsUrl, this.formData)
    .subscribe(result1 => {
        this.spinner.hide();
        if (result1.statusCode === 200){
            if (result1.success) {
             this.snotifyService.success(result1.message, 'Success');
            
             
             }
        }else {
            this.snotifyService.error(result1.message, 'Error!');
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
    const Obj = 'PAY';
    this.dialogRef.close(Obj);
  }

}
