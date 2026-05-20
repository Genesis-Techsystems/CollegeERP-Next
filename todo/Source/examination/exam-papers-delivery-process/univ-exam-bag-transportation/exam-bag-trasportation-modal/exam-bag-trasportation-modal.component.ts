import { Component, OnInit, Inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { SnotifyService } from 'ng-snotify';
import { Router } from '@angular/router';
import { GenericFunctions } from 'app/main/common/generic-functions';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { CONSTANTS } from 'app/main/common/constants';
import { CrudService } from 'app/main/services/crud.service';
import * as moment from 'moment';

@Component({
  selector: 'app-exam-bag-trasportation-modal',
  templateUrl: './exam-bag-trasportation-modal.component.html',
  styleUrls: ['./exam-bag-trasportation-modal.component.scss']
})
export class ExamBagTrasportationModalComponent implements OnInit {

  configForm: FormGroup;
  univExamCenters = [];
  dialogTitle;

  private UnivExamCentersUrl = CONSTANTS.UnivExamCentersUrl;
  private UnivExamRegionalCentersUrl = CONSTANTS.UnivExamRegionalCentersUrl;
  private UnivExamBagsUrl = CONSTANTS.UnivExamBagsUrl;
 
  private isActive = CONSTANTS.isActive;
    univExamRegionalCenters=[];
    univExamAnswerPaperBags=[];
    examBagDispatchStatusList: any;

  constructor( private genericFunctions: GenericFunctions, private formBuilder: FormBuilder, private dialogRef: MatDialogRef<ExamBagTrasportationModalComponent>,
               @Inject(MAT_DIALOG_DATA) private data, private snotifyService: SnotifyService,
               private crudService: CrudService, public router: Router) {

      this.getData();
  }
  // tslint:disable-next-line:typedef
  
  ngOnInit() {
      this.dialogTitle = 'Add Exam Bag Transportation';
      this.configForm = this.formBuilder.group({
        univExamReionalCenterId: ['', Validators.required],
          univExamcenterId: ['', Validators.required],
          univExamBagId: ['', Validators.required],
          vehicleNumber: ['', Validators.required],
          vehicleDetails: ['', Validators.required],
          driverName: ['', Validators.required],
          driverPhoneNumber:['', [Validators.required, Validators.pattern('[0-9]{10}')]],
          receiveDate: ['', Validators.required],
          dispatchDate: ['', Validators.required],
          isActive: [],
          reason: []
      });

      this.configForm.get('isActive').setValue(true);
      this.configForm.get('reason').setValue('active');

      if (!this.isEmptyObject(this.data) && this.data.type == 'new') {
        
        this.configForm.get('univExamReionalCenterId').setValue(this.data.univExamReionalCenterId);
        this.configForm.get('univExamcenterId').setValue(this.data.univExamcenterId);
        this.configForm.get('univExamBagId').setValue(this.data.univExamBagId);
        this.configForm.get('univExamReionalCenterId').disable();
        this.configForm.get('univExamcenterId').disable();
        this.configForm.get('univExamBagId').disable();
      }else{ 
        
          this.configForm.get('univExamReionalCenterId').setValue(this.data.univExamReionalCenterId);
          this.configForm.get('univExamcenterId').setValue(this.data.univExamcenterId);
          this.configForm.get('univExamBagId').setValue(this.data.univExamBagId);
          this.configForm.get('vehicleNumber').setValue(this.data.vehicleNumber);
          this.configForm.get('vehicleDetails').setValue(this.data.vehicleDetails);
          this.configForm.get('driverName').setValue(this.data.driverName);
          this.configForm.get('driverPhoneNumber').setValue(this.data.driverPhoneNumber);
          (new Date(moment(this.data.receiveDate).format()))
          this.configForm.get('receiveDate').setValue  (new Date(moment(this.data.receiveDate).format()));
          this.configForm.get('dispatchDate').setValue  (new Date(moment(this.data.dispatchDate).format()));
          this.configForm.get('isActive').setValue(this.data.isActive);
          this.configForm.get('reason').setValue(this.data.reason);
          this.dialogTitle = 'Edit  Exam Bag Transportation';
      }
  }
  getData(): void {
      /*---------- GET ORGANIZATIONS --------------*/
      this.crudService.listDetailsById(this.UnivExamRegionalCentersUrl, 'true', this.isActive )
      .subscribe(result => {
          if (result.statusCode === 200) {
              if (result.data.resultList && result.data.resultList !== '') {
                  this.univExamRegionalCenters = result.data.resultList;
                  if (!this.isEmptyObject(this.data)) {
                    this.configForm.get('univExamReionalCenterId').setValue(this.data.univExamReionalCenterId);
                   
                }
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

      this.crudService.listDetailsById(this.UnivExamCentersUrl, 'true', this.isActive )
          .subscribe(result => {
              if (result.statusCode === 200) {
                  if (result.data.resultList && result.data.resultList !== '') {
                      this.univExamCenters = result.data.resultList;
                      if (!this.isEmptyObject(this.data)) {
                        this.configForm.get('univExamcenterId').setValue(this.data.univExamcenterId);
                       
                    }
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

          this.crudService.listDetailsById(this.UnivExamBagsUrl, 'true', this.isActive )
          .subscribe(result => {
              if (result.statusCode === 200) {
                  if (result.data.resultList && result.data.resultList !== '') {
                      this.univExamAnswerPaperBags = result.data.resultList;
                      console.log(this.data,'this.data');
                      
                      if (!this.isEmptyObject(this.data)) {
                        this.configForm.get('univExamBagId').setValue(this.data.univExamBagId);
                       
                    }
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

  // tslint:disable-next-line:typedef
  isEmptyObject(obj) {
      return (obj && (Object.keys(obj).length === 0));
  }

  submit(): void {

      const Obj = this.configForm.value;
      Obj.univExamReionalCenterId = this.data.univExamReionalCenterId;
      Obj.univExamcenterId = this.data.univExamcenterId;
      Obj.univExamBagsId = this.data.univExamBagId;
      console.log(Obj);
      if (this.configForm.invalid) {
          return;
      } else {
          this.dialogRef.close(Obj);
      }
  }
}

