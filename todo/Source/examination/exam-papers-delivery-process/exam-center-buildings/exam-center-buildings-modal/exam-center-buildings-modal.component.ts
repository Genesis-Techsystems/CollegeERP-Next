import { Component, OnInit, Inject } from '@angular/core';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { CONSTANTS } from '../../../../../common/constants';
import { SnotifyService } from 'ng-snotify';
import { CrudService } from '../../../../../services/crud.service';
import { Campus } from '../../../../../models/campus';
import { Router } from '@angular/router';
import { GenericFunctions } from 'app/main/common/generic-functions';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

@Component({
  selector: 'app-exam-center-buildings-modal',
  templateUrl: './exam-center-buildings-modal.component.html',
  styleUrls: ['./exam-center-buildings-modal.component.scss']
})
export class ExamCenterBuildingsModalComponent implements OnInit {

  buildingForm: FormGroup;
  campuses: Campus[] = [];
  dialogTitle;

  /*..... Validations...........*/
  alphanumericValidation = CONSTANTS.validations.alphanumaeric;
  phNoValidation = CONSTANTS.validations.phNo;
  emailValidation = CONSTANTS.validations.email;

   /*.......... URL'S  ..........*/
  private UnivExamCenters = CONSTANTS.UnivExamCentersUrl;
  private isActive = CONSTANTS.isActive;

  constructor( private genericFunctions: GenericFunctions , private formBuilder: FormBuilder, private dialogRef: MatDialogRef<ExamCenterBuildingsModalComponent>,
               @Inject(MAT_DIALOG_DATA) private data, private snotifyService: SnotifyService,
               private crudService: CrudService, public router: Router) {       

             this.getData();
  }

    // tslint:disable-next-line:typedef
    ngOnInit() {
        this.dialogTitle = 'Add Building';
        this.buildingForm = this.formBuilder.group({
                campusId: [],
                univExamCenterId: [],
                buildingName: ['', Validators.required],
                buildingCode: ['', Validators.required],
                landmark: [],
                noOfFloors: [],
                isActive: [],
                reason: []
            });
    
        this.buildingForm.get('isActive').setValue(true);
        this.buildingForm.get('reason').setValue('active');
    
        if (!this.isEmptyObject(this.data)){
                this.buildingForm.get('campusId').setValue(this.data.campusId);
                this.buildingForm.get('univExamCenterId').setValue(this.data.univExamCenterId);
                this.buildingForm.get('buildingName').setValue(this.data.buildingName);
                this.buildingForm.get('buildingCode').setValue(this.data.buildingCode);
                this.buildingForm.get('landmark').setValue(this.data.landmark);
                this.buildingForm.get('noOfFloors').setValue(this.data.noOfFloors);
                this.buildingForm.get('isActive').setValue(this.data.isActive);
                this.buildingForm.get('reason').setValue(this.data.reason);
                this.dialogTitle = 'Edit Building';
            }
      }

  getData(): void{
    /*---------- GET CAMPUSES --------------*/            
    this.crudService.listDetailsById(this.UnivExamCenters, 'true', this.isActive)
    .subscribe(result => {
          if (result.statusCode === 200){
              if (result.data.resultList && result.data.resultList !== '') {
                  this.campuses = result.data.resultList;
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

  changedStatus(status): void{
    if (!status){
        this.buildingForm.controls['reason'].setValidators(Validators.required);
    }else{
        this.buildingForm.controls['reason'].setValidators([]);
    }
  }

  submit(): void{
      const Obj = this.buildingForm.value;
      if (this.buildingForm.invalid) {
              return;
          }else{
            this.dialogRef.close(Obj);
          }
  }
}
