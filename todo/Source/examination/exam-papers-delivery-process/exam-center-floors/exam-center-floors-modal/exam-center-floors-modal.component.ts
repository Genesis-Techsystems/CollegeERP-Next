import { Component, OnInit, Inject } from '@angular/core';
import { CrudService } from '../../../../../services/crud.service';
import { CONSTANTS } from '../../../../../common/constants';
import { Block } from '../../../../../models/block';
import { SnotifyService } from 'ng-snotify';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { GenericFunctions } from 'app/main/common/generic-functions';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

@Component({
  selector: 'app-exam-center-floors-modal',
  templateUrl: './exam-center-floors-modal.component.html',
  styleUrls: ['./exam-center-floors-modal.component.scss']
})
export class ExamCenterFloorsModalComponent implements OnInit {

  private blockCrudUrl = CONSTANTS.blockCrudUrl;
  private isActive = CONSTANTS.isActive;

  blocks: Block[] = [];
  dialogTitle;
  floorForm: FormGroup;

  constructor(private genericFunctions: GenericFunctions , private formBuilder: FormBuilder, private dialogRef: MatDialogRef<ExamCenterFloorsModalComponent>,
              @Inject(MAT_DIALOG_DATA) private data, private snotifyService: SnotifyService,
              private crudService: CrudService, public router: Router) {  
      this.getBlocks();
     }

  ngOnInit(): void {

    
    this.dialogTitle = 'Add Floor';
    this.floorForm = this.formBuilder.group({
      blockId: ['', Validators.required],
      floorName: ['', Validators.required],
      floorNo: ['', Validators.required],
      noOfRooms: [],
      isActive: [],
      reason: []
  });

    this.floorForm.get('isActive').setValue(true);
    this.floorForm.get('reason').setValue('active');

    if (!this.isEmptyObject(this.data)){
    this.floorForm.get('blockId').setValue(this.data.blockId);
    this.floorForm.get('floorName').setValue(this.data.floorName);
    this.floorForm.get('floorNo').setValue(this.data.floorNo);
    this.floorForm.get('noOfRooms').setValue(this.data.noOfRooms);
    this.floorForm.get('isActive').setValue(this.data.isActive);
    this.floorForm.get('reason').setValue(this.data.reason);
    this.dialogTitle = 'Edit Floor';
}


  }

    /*--------- GET BLOCKS ----------*/
    getBlocks(): void{

      this.crudService.listDetailsById(this.blockCrudUrl, 'true', this.isActive)
      .subscribe(result => {
      if (result.statusCode === 200){
          if (result.data.resultList && result.data.resultList !== '') {
              this.blocks = result.data.resultList;
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
    const Obj = this.floorForm.value;
    if (this.floorForm.invalid) {
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
