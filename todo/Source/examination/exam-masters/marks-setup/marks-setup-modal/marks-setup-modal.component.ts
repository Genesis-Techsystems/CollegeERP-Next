import { Component, OnInit, Inject } from '@angular/core';
import { CONSTANTS } from 'app/main/common/constants';
import { Block } from 'app/main/models/block';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { GenericFunctions } from 'app/main/common/generic-functions';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { FloorsModalComponent } from 'app/main/apps/admin/institution-masters/floors/floors-modal/floors-modal.component';
import { SnotifyService } from 'ng-snotify';
import { CrudService } from 'app/main/services/crud.service';
import { Router } from '@angular/router';
import { GeneralDetail } from 'app/main/models/generalDetail';

@Component({
  selector: 'app-marks-setup-modal',
  templateUrl: './marks-setup-modal.component.html',
  styleUrls: ['./marks-setup-modal.component.scss']
})
export class MarksSetupModalComponent implements OnInit {

  private isActive = CONSTANTS.isActive;
  private generalDetailsUrl = CONSTANTS.generalDetailsUrl;
  private subjectType = CONSTANTS.subjectType;
  private generalDetailsByCodeUrl = CONSTANTS.generalDetailsByCodeUrl;

  subjectTypes: GeneralDetail[] = [];
  dialogTitle;
  marksSetupForm: FormGroup;

  constructor(private genericFunctions: GenericFunctions , private formBuilder: FormBuilder, private dialogRef: MatDialogRef<FloorsModalComponent>,
              @Inject(MAT_DIALOG_DATA) private data, private snotifyService: SnotifyService,
              private crudService: CrudService, public router: Router) {  
      this.getSubjectType();
     }

  ngOnInit(): void {

    
    this.dialogTitle = 'Add Marks Setup';
    this.marksSetupForm = this.formBuilder.group({
      marksSetupName: ['', Validators.required],
      subjectTypeCatId: ['', Validators.required],
      internalMarks: [0],
      externalMarks: [0],
      externalPassPercentage: [0],
      passPercentage: [0],
      isActive: [],
      reason: []
  });

    this.marksSetupForm.get('isActive').setValue(true);
    this.marksSetupForm.get('reason').setValue('active');

    if (!this.isEmptyObject(this.data)){
    this.marksSetupForm.get('marksSetupName').setValue(this.data.marksSetupName);
    this.marksSetupForm.get('subjectTypeCatId').setValue(this.data.subjectTypeCatId);
    this.marksSetupForm.get('internalMarks').setValue(this.data.internalMarks);
    this.marksSetupForm.get('externalMarks').setValue(this.data.externalMarks);
    this.marksSetupForm.get('externalPassPercentage').setValue(this.data.externalPassPercentage);
    this.marksSetupForm.get('passPercentage').setValue(this.data.passPercentage);
    this.marksSetupForm.get('isActive').setValue(this.data.isActive);
    this.marksSetupForm.get('reason').setValue(this.data.reason);
    this.dialogTitle = 'Edit Marks Setup';
}


  }

   
   /*----------- SUBJECT TYPE -----------*/
    getSubjectType(): void{

   this.crudService.listDetailsByTwoIds(this.generalDetailsUrl, this.subjectType, 'true', this.generalDetailsByCodeUrl, this.isActive)
   .subscribe(result => {
       if (result.statusCode === 200){
                   if (result.data.resultList && result.data.resultList !== '') {
                       this.subjectTypes = result.data.resultList;
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
