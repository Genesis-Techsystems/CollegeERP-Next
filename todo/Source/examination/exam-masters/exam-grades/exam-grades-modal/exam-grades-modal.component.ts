import { Component, OnInit, Inject } from '@angular/core';
import { CONSTANTS } from 'app/main/common/constants';
import { GeneralDetail } from 'app/main/models/generalDetail';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { GenericFunctions } from 'app/main/common/generic-functions';
import { FloorsModalComponent } from 'app/main/apps/admin/institution-masters/floors/floors-modal/floors-modal.component';
import { SnotifyService } from 'ng-snotify';
import { CrudService } from 'app/main/services/crud.service';
import { Router } from '@angular/router';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

@Component({
  selector: 'app-exam-grades-modal',
  templateUrl: './exam-grades-modal.component.html',
  styleUrls: ['./exam-grades-modal.component.scss']
})
export class ExamGradesModalComponent implements OnInit {

 
  private isActive = CONSTANTS.isActive;
  private generalDetailsUrl = CONSTANTS.generalDetailsUrl;
  private subjectType = CONSTANTS.subjectType;
  private generalDetailsByCodeUrl = CONSTANTS.generalDetailsByCodeUrl;

  subjectTypes: GeneralDetail[] = [];
  dialogTitle;
  marksSetupForm: FormGroup;

  constructor(private genericFunctions: GenericFunctions , private formBuilder: FormBuilder, private dialogRef: MatDialogRef<FloorsModalComponent>,
              @Inject(MAT_DIALOG_DATA) public data, private snotifyService: SnotifyService,
              private crudService: CrudService, public router: Router) {  
      // this.getSubjectType();
     }

  ngOnInit(): void {

    
    this.dialogTitle = 'Add Exam Grade';
    this.marksSetupForm = this.formBuilder.group({
      gradeName: ['', Validators.required],
      gradeCode: ['', Validators.required],
      minPoints: [0],
      maxPoints: [0],
      minScorePercent: [0],
      maxScorePercent: [0],
      creditPoints: [0],
      description: [],
      isActive: [],
      reason: []
  });

    this.marksSetupForm.get('isActive').setValue(true);
    this.marksSetupForm.get('reason').setValue('active');

    if (!this.isEmptyObject(this.data)){
    this.marksSetupForm.get('gradeName').setValue(this.data.gradeName);
    this.marksSetupForm.get('gradeCode').setValue(this.data.gradeCode);
    this.marksSetupForm.get('minPoints').setValue(this.data.minPoints);
    this.marksSetupForm.get('maxPoints').setValue(this.data.maxPoints);
    this.marksSetupForm.get('minScorePercent').setValue(this.data.minScorePercent);
    this.marksSetupForm.get('maxScorePercent').setValue(this.data.maxScorePercent);
    this.marksSetupForm.get('creditPoints').setValue(this.data.creditPoints);
    this.marksSetupForm.get('description').setValue(this.data.description);
    this.marksSetupForm.get('isActive').setValue(this.data.isActive);
    this.marksSetupForm.get('reason').setValue(this.data.reason);
    this.dialogTitle = 'Edit Exam Grade';
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
