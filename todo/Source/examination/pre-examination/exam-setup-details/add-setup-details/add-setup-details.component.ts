import { Component, Inject, OnInit } from '@angular/core';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { FloorsModalComponent } from 'app/main/apps/admin/institution-masters/floors/floors-modal/floors-modal.component';
import { CONSTANTS } from 'app/main/common/constants';
import { GenericFunctions } from 'app/main/common/generic-functions';
import { GeneralDetail } from 'app/main/models/generalDetail';
import { CrudService } from 'app/main/services/crud.service';
import { SnotifyService } from 'ng-snotify';
import { NgxSpinnerService } from 'ngx-spinner';

@Component({
  selector: 'app-add-setup-details',
  templateUrl: './add-setup-details.component.html',
  styleUrls: ['./add-setup-details.component.scss']
})
export class AddSetupDetailsComponent implements OnInit {

  private isActive = CONSTANTS.isActive;
  private generalDetailsUrl = CONSTANTS.generalDetailsUrl;
  private internalPattern = CONSTANTS.internalPattern;
  private generalDetailsByCodeUrl = CONSTANTS.generalDetailsByCodeUrl;
  private examFCARSetupMasterCrudUrl = CONSTANTS.examFCARSetupMasterCrudUrl;
  private getDetailsByCollegeIdUrl = CONSTANTS.getDetailsByCollegeIdUrl;

  details: GeneralDetail[] = [];
  dialogTitle;
  marksSetupForm: FormGroup;
  examsMarksSetups = [];

  constructor(private genericFunctions: GenericFunctions , private formBuilder: FormBuilder, private dialogRef: MatDialogRef<FloorsModalComponent>,
              @Inject(MAT_DIALOG_DATA) public data, private snotifyService: SnotifyService,
              private crudService: CrudService, public router: Router, private spinner: NgxSpinnerService) {  
      this.generalDetails();
     }

  ngOnInit(): void {

    
    this.dialogTitle = 'Add Exam Setup Details';
    this.marksSetupForm = this.formBuilder.group({
      question: ['', Validators.required],
      optionName: [],
      detailCode: [],
      internalpatternCatId: [],
      marks: [0],
      examFCARSetMasterId: [],
      isActive: [],
      reason: []
  });

    this.marksSetupForm.get('isActive').setValue(true);
    this.marksSetupForm.get('reason').setValue('active');

    if (!this.isEmptyObject(this.data)){  
        this.getDetails();
    }

    if (!this.isEmptyObject(this.data) && this.data.examFCARSetDetId){  
    this.marksSetupForm.get('question').setValue(this.data.question);
    this.marksSetupForm.get('optionName').setValue(this.data.optionName);
    this.marksSetupForm.get('detailCode').setValue(this.data.detailCode);
    this.marksSetupForm.get('internalpatternCatId').setValue(this.data.internalpatternCatId);
    this.marksSetupForm.get('marks').setValue(this.data.marks);
    this.marksSetupForm.get('examFCARSetMasterId').setValue(this.data.examFCARSetMasterId);
    this.marksSetupForm.get('isActive').setValue(this.data.isActive);
    this.marksSetupForm.get('reason').setValue(this.data.reason);
    this.dialogTitle = 'Edit Exam Setup Details';
    }


  }

  getDetails(): void{
    this.crudService.listDetailsById(this.examFCARSetupMasterCrudUrl, this.data.collegeId,
      this.getDetailsByCollegeIdUrl)
  .subscribe(result => {
     this.spinner.hide();
     if (result.statusCode === 200){
          if (result.success) {
              this.examsMarksSetups = result.data.resultList;
          } else {
              this.snotifyService.success(result.message, 'Success!');
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

   /*----------- GENERAL DETAILS -----------*/
   generalDetails(): void{

   this.crudService.listDetailsByTwoIds(this.generalDetailsUrl, this.internalPattern, 'true', this.generalDetailsByCodeUrl, this.isActive)
   .subscribe(result => {
       if (result.statusCode === 200){
                   if (result.data.resultList && result.data.resultList !== '') {
                       this.details = result.data.resultList;
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

  submit(): void{
    const Obj = this.marksSetupForm.value;
    if (this.marksSetupForm.invalid) {
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
