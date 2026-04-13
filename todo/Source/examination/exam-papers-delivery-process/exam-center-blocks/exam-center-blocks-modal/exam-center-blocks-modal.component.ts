import { Component, OnInit, Inject } from '@angular/core';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { CONSTANTS } from '../../../../../common/constants';
import { SnotifyService } from 'ng-snotify';
import { CrudService } from '../../../../../services/crud.service';
import { Building } from '../../../../../models/building';
import { Router } from '@angular/router';
import { GenericFunctions } from 'app/main/common/generic-functions';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

@Component({
  selector: 'app-exam-center-blocks-modal',
  templateUrl: './exam-center-blocks-modal.component.html',
  styleUrls: ['./exam-center-blocks-modal.component.scss']
})
export class ExamCenterBlocksModalComponent implements OnInit {

  blockForm: FormGroup;
  buildings: Building[] = [];
  dialogTitle;

  private buildingCrudUrl = CONSTANTS.buildingCrudUrl;
  private isActive = CONSTANTS.isActive;

  constructor(private genericFunctions: GenericFunctions, private formBuilder: FormBuilder, private dialogRef: MatDialogRef<ExamCenterBlocksModalComponent>,
              @Inject(MAT_DIALOG_DATA) private data, private snotifyService: SnotifyService,
              private crudService: CrudService, public router: Router) {       

             this.getData();
  }

  getData(): void{
    /*---------- GET BUILDINGS --------------*/            
    this.crudService.listDetailsById(this.buildingCrudUrl, 'true', this.isActive)
    .subscribe(result => {
          if (result.statusCode === 200){
              if (result.data.resultList && result.data.resultList !== '') {
                  this.buildings = result.data.resultList;
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
  ngOnInit() {
    this.dialogTitle = 'Add Block';
    this.blockForm = this.formBuilder.group({
            buildingId: ['', Validators.required],
            blockName: ['', Validators.required],
            blockCode: ['', Validators.required],
            noOfFloors: [],
            isActive: [],
            reason: []
        });

    this.blockForm.get('isActive').setValue(true);
    this.blockForm.get('reason').setValue('active');

    if (!this.isEmptyObject(this.data)){
            this.blockForm.get('buildingId').setValue(this.data.buildingId);
            this.blockForm.get('blockName').setValue(this.data.blockName);
            this.blockForm.get('blockCode').setValue(this.data.blockCode);
            this.blockForm.get('noOfFloors').setValue(this.data.noOfFloors);
            this.blockForm.get('isActive').setValue(this.data.isActive);
            this.blockForm.get('reason').setValue('active');
            this.dialogTitle = 'Edit Block';
        }
  }

  // tslint:disable-next-line:typedef
  isEmptyObject(obj) {
    return (obj && (Object.keys(obj).length === 0));
  }

  submit(): void{
      const Obj = this.blockForm.value;
      if (this.blockForm.invalid) {
              return;
          }else{
            this.dialogRef.close(Obj);
          }
  }
}