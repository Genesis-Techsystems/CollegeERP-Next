import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { GenericFunctions } from 'app/main/common/generic-functions';
import { SnotifyService } from 'ng-snotify';
import { CONSTANTS } from '../../../../../common/constants';
import { Block } from '../../../../../models/block';
import { Floors } from '../../../../../models/floors';
import { RoomType } from '../../../../../models/roomType';
import { CrudService } from '../../../../../services/crud.service';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

@Component({
  selector: 'app-add-exam-center-rooms',
  templateUrl: './add-exam-center-rooms.component.html',
  styleUrls: ['./add-exam-center-rooms.component.scss']
})
export class AddExamCenterRoomsComponent implements OnInit {

  private blockCrudUrl = CONSTANTS.blockCrudUrl;
  private floorCrudUrl = CONSTANTS.floorCrudUrl;
  private getDetailsByBlockIdUrl = CONSTANTS.getDetailsByBlockIdUrl;
  private roomTypeCrudUrl = CONSTANTS.roomTypeCrudUrl;
  private isActive = CONSTANTS.isActive;

  roomForm: FormGroup;
  blocks: Block[] = [];
  floors: Floors[] = [];
  roomTypes: RoomType[] = [];

  dialogTitle;


  constructor( private genericFunctions: GenericFunctions ,  private formBuilder: FormBuilder, private dialogRef: MatDialogRef<AddExamCenterRoomsComponent>,
               @Inject(MAT_DIALOG_DATA) private data, private snotifyService: SnotifyService,
               private crudService: CrudService, public router: Router) {  

    // Calling function of required Details 
    this.getData();
  }

  ngOnInit(): void {

    this.dialogTitle = 'Add Room';
    this.roomForm = this.formBuilder.group({
      blockId: ['', Validators.required],
      floorId: ['', Validators.required],
      roomTypeId: ['', Validators.required],
      roomName: ['', Validators.required],
      roomCode: ['', Validators.required],
      occupancy: [0, Validators.required],
      examrows: [0],
      examcolumns: [0],
      reason: [],
      isActive: []
  });

    this.roomForm.get('isActive').setValue(true);
    this.roomForm.get('reason').setValue('active');

    if (!this.isEmptyObject(this.data)){
    this.roomForm.get('blockId').setValue(this.data.blockId);
    this.roomForm.get('floorId').setValue(this.data.floorId);
    this.roomForm.get('roomTypeId').setValue(this.data.roomTypeId);
    this.roomForm.get('roomName').setValue(this.data.roomName);
    this.roomForm.get('roomCode').setValue(this.data.roomCode);
    this.roomForm.get('occupancy').setValue(this.data.occupancy);
    this.roomForm.get('examrows').setValue(this.data.examrows);
    this.roomForm.get('examcolumns').setValue(this.data.examcolumns);
    this.roomForm.get('isActive').setValue(this.data.isActive);
    this.roomForm.get('reason').setValue(this.data.reason);
    this.SelectedBlock(this.data.blockId);
    this.dialogTitle = 'Edit Rooms';
}

  }

  // tslint:disable-next-line:typedef
  getData() {

    /*--------- GET BLOCKS ----------*/
    this.crudService.listDetailsById(this.blockCrudUrl, 'true', this.isActive)
      .subscribe(result => {
        if (result.statusCode === 200) {
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

       /*--------- GET Room Types ----------*/

    this.crudService.listDetailsById(this.roomTypeCrudUrl, 'true', this.isActive)
    .subscribe(result => {
    if (result.statusCode === 200){
        if (result.data.resultList && result.data.resultList !== '') {
            this.roomTypes = result.data.resultList;
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
 
  
 /*--------- GET Floors ----------*/
  // tslint:disable-next-line:typedef
  SelectedBlock(blockId){
    this.floors = [];
    if (blockId !== null && blockId !== undefined){
    this.crudService.listDetailsByTwoIds(this.floorCrudUrl, blockId, 'true', this.getDetailsByBlockIdUrl, this.isActive)
     .subscribe(result => {
       if (result.statusCode === 200) {
         if (result.data && result.data !== '') {
           this.floors = result.data.resultList;
         } else {
           this.snotifyService.success(result.message, 'Success!');
         }
       } else {
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
}
   
 
  submit(): void{
    const Obj = this.roomForm.value;
    if (this.roomForm.invalid) {
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
