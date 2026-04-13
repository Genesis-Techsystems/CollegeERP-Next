import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { ActivatedRoute, Router } from '@angular/router';
import { GenericFunctions } from 'app/main/common/generic-functions';
import { CrudService } from 'app/main/services/crud.service';
import { SnotifyService } from 'ng-snotify';
import { NgxSpinnerService } from 'ngx-spinner';
import { AddEvaluationSettingsComponent } from '../../exam-evaluation-settings/add-evaluation-settings/add-evaluation-settings.component';
import { CONSTANTS } from 'app/main/common/constants';

@Component({
  selector: 'app-update-status',
  templateUrl: './update-status.component.html',
  styleUrls: ['./update-status.component.scss']
})
export class UpdateStatusComponent implements OnInit {
  statusForm: any;
  evaluationStatusData: any=[];
  private generalDetailsUrl = CONSTANTS.generalDetailsUrl;
  private evaluationStatus = CONSTANTS.evaluationStatus;
  generalDetailsByCodeUrl=CONSTANTS.generalDetailsByCodeUrl
  isActive=CONSTANTS.isActive;
  constructor(private formBuilder: FormBuilder, private snotifyService: SnotifyService, private dialogRef: MatDialogRef<UpdateStatusComponent>,
     @Inject(MAT_DIALOG_DATA) public data,
    private crudService: CrudService, private spinner: NgxSpinnerService, private router: Router, 
    private dialog: MatDialog, private genericFunctions: GenericFunctions, private route: ActivatedRoute,) {        
// this.getData();
}

  ngOnInit(): void {
    this.statusForm = this.formBuilder.group({
     
      evaluationStatus: ['',Validators.required],
    isActive: [true,Validators.required],
    // reason: [],
    });
    // this.getEvaluationStatus()
   
  }
  getEvaluationStatus(){
    this.crudService.listDetailsByTwoIds(this.generalDetailsUrl, this.evaluationStatus , 'true', this.generalDetailsByCodeUrl, this.isActive)
    .subscribe(result => {
        if (result.statusCode === 200){
                  if (result.data.resultList && result.data.resultList !== '') {
                      this.evaluationStatusData = result.data.resultList;
                      
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
  submit(){
    // const Obj=this.statusForm.value

    // this.dialogRef.close(Obj);
    // if (this.statusForm.invalid) {
    //     return;
    // } else {
    //     this.dialogRef.close(Obj);
    // }
    this.dialogRef.close("Yes");
  }

}
