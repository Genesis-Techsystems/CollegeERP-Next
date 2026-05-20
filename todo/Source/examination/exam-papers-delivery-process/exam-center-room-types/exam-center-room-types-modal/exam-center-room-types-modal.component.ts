import { Component, OnInit, Inject } from '@angular/core';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { CONSTANTS } from '../../../../../common/constants';
import { SnotifyService } from 'ng-snotify';
import { CrudService } from '../../../../../services/crud.service';
import { Router } from '@angular/router';
import { GenericFunctions } from 'app/main/common/generic-functions';
import { Organization } from 'app/main/models/organization';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

@Component({
  selector: 'app-exam-center-room-types-modal',
  templateUrl: './exam-center-room-types-modal.component.html',
  styleUrls: ['./exam-center-room-types-modal.component.scss']
})
export class ExamCenterRoomTypesModalComponent implements OnInit {

  roomTypeForm: FormGroup;
  organizations: Organization[] = [];
  dialogTitle;

  private organizationsCrudUrl = CONSTANTS.organizationsCrudUrl;
  private isActive = CONSTANTS.isActive;

  constructor(private genericFunctions: GenericFunctions , private formBuilder: FormBuilder, private dialogRef: MatDialogRef<ExamCenterRoomTypesModalComponent>,
              @Inject(MAT_DIALOG_DATA) private data, private snotifyService: SnotifyService,
              private crudService: CrudService, public router: Router) {       

             this.getData();
  }
// tslint:disable-next-line:typedef
ngOnInit() {
    this.dialogTitle = 'Add Room Type';
    this.roomTypeForm = this.formBuilder.group({
            organizationId: ['', Validators.required],
            roomType: ['', Validators.required],
            isActive: [],
            reason: []
        });

    this.roomTypeForm.get('isActive').setValue(true);
    this.roomTypeForm.get('reason').setValue('active');

    if (!this.isEmptyObject(this.data)){
            this.roomTypeForm.get('organizationId').setValue(this.data.organizationId);
            this.roomTypeForm.get('roomType').setValue(this.data.roomType);
            this.roomTypeForm.get('isActive').setValue(this.data.isActive);
            this.roomTypeForm.get('reason').setValue(this.data.reason);
            this.dialogTitle = 'Edit Room Type';
        }
  }
  getData(): void{
    /*---------- GET ORGANIZATIONS --------------*/            
    this.crudService.listDetailsById(this.organizationsCrudUrl, 'true', this.isActive)
    .subscribe(result => {
          if (result.statusCode === 200){
              if (result.data.resultList && result.data.resultList !== '') {
                  this.organizations = result.data.resultList;
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

  

  // tslint:disable-next-line:typedef
  isEmptyObject(obj) {
    return (obj && (Object.keys(obj).length === 0));
  }

  submit(): void{
      const Obj = this.roomTypeForm.value;
      if (this.roomTypeForm.invalid) {
              return;
          }else{
            this.dialogRef.close(Obj);
          }
  }

}
