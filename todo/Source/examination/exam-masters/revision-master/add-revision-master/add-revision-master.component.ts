import { Component, OnInit, Inject } from '@angular/core';
import { CONSTANTS } from 'app/main/common/constants';
import { GeneralDetail } from 'app/main/models/generalDetail';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { GenericFunctions } from 'app/main/common/generic-functions';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { FloorsModalComponent } from 'app/main/apps/admin/institution-masters/floors/floors-modal/floors-modal.component';
import { SnotifyService } from 'ng-snotify';
import { CrudService } from 'app/main/services/crud.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-add-revision-master',
  templateUrl: './add-revision-master.component.html',
  styleUrls: ['./add-revision-master.component.scss']
})

export class AddRevisionMasterComponent implements OnInit {

  private isActive = CONSTANTS.isActive;
  private generalDetailsUrl = CONSTANTS.generalDetailsUrl;
  private revisionType = CONSTANTS.revisionType;
  private generalDetailsByCodeUrl = CONSTANTS.generalDetailsByCodeUrl;

  revisionTypes: GeneralDetail[] = [];
  dialogTitle;
  revisionForm: FormGroup;

  constructor(private genericFunctions: GenericFunctions , private formBuilder: FormBuilder, private dialogRef: MatDialogRef<FloorsModalComponent>,
              @Inject(MAT_DIALOG_DATA) private data, private snotifyService: SnotifyService,
              private crudService: CrudService, public router: Router) {  
      this.getRevisionType();
  }

  ngOnInit(): void {
    this.dialogTitle = 'Add Exam Revision Master';
    this.revisionForm = this.formBuilder.group({
      examRevisionTypeId: ['', Validators.required],
      fromDate: [this.genericFunctions.moment()],
      toDate: [this.genericFunctions.moment()],
      amount: [0],
      isActive: [],
      reason: []
    });

    this.revisionForm.get('isActive').setValue(true);
    this.revisionForm.get('reason').setValue('active');

    if (!this.isEmptyObject(this.data)){
      this.revisionForm.get('examRevisionTypeId').setValue(this.data.examRevisionTypeId);
      this.revisionForm.get('fromDate').setValue(this.genericFunctions.momentWithDate(this.data.fromDate));
      this.revisionForm.get('toDate').setValue(this.genericFunctions.momentWithDate(this.data.toDate));
      this.revisionForm.get('amount').setValue(this.data.amount);
      this.revisionForm.get('isActive').setValue(this.data.isActive);
      this.revisionForm.get('reason').setValue(this.data.reason);
      this.dialogTitle = 'Edit Exam Revision Master';
    }
  }
   
  /*----------- REVISION TYPE -----------*/
  getRevisionType(): void{
   this.crudService.listDetailsByTwoIds(this.generalDetailsUrl, this.revisionType, 'true', this.generalDetailsByCodeUrl, this.isActive)
   .subscribe(result => {
       if (result.statusCode === 200){
                   if (result.data.resultList && result.data.resultList !== '') {
                       this.revisionTypes = result.data.resultList;
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
    const Obj = this.revisionForm.value;
    Obj.fromDate = this.genericFunctions.momentWithDateFormatYMD(Obj.fromDate);
    Obj.toDate = this.genericFunctions.momentWithDateFormatYMD(Obj.toDate);
    if (this.revisionForm.invalid) {
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
