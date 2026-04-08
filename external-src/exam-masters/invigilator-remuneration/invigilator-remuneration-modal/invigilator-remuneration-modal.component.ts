import { Component, OnInit, Inject } from '@angular/core';
import { CONSTANTS } from 'app/main/common/constants';
import { GeneralDetail } from 'app/main/models/generalDetail';
import { College } from 'app/main/models/college';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { GenericFunctions } from 'app/main/common/generic-functions';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { FloorsModalComponent } from 'app/main/apps/admin/institution-masters/floors/floors-modal/floors-modal.component';
import { SnotifyService } from 'ng-snotify';
import { CrudService } from 'app/main/services/crud.service';
import { Router } from '@angular/router';
import *  as moment from 'moment';


@Component({
  selector: 'app-invigilator-remuneration-modal',
  templateUrl: './invigilator-remuneration-modal.component.html',
  styleUrls: ['./invigilator-remuneration-modal.component.scss']
})
export class InvigilatorRemunerationModalComponent implements OnInit {

  private generalDetailsUrl = CONSTANTS.generalDetailsUrl;
  private generalDetailsByCodeUrl = CONSTANTS.generalDetailsByCodeUrl;
  private isActive = CONSTANTS.isActive;
  private invlatrDisgTypesUrl = CONSTANTS.invlatrDisgTypesUrl;
  private collegeCrudUrl = CONSTANTS.collegeCrudUrl;

  invigilatorDisg: GeneralDetail[] = [];
  colleges: College[] = [];
  dialogTitle;
  invugilatorForm: FormGroup;
  min;

  dataSecStaff;
  dataSECPrincipal;

  constructor(private genericFunctions: GenericFunctions , private formBuilder: FormBuilder, private dialogRef: MatDialogRef<FloorsModalComponent>,
              @Inject(MAT_DIALOG_DATA) private data, private snotifyService: SnotifyService,
              private crudService: CrudService, public router: Router) {  
                this.dataSecStaff = this.genericFunctions.dataSecurityLevel();
      this.dataSECPrincipal = this.genericFunctions.dataSecurityLevelPrincipal();
      this.getData();
     }

  ngOnInit(): void {

    
    this.dialogTitle = 'Add Invigilator Remuneration';
    this.invugilatorForm = this.formBuilder.group({
      collegeId: ['', Validators.required],
      invgdesignationCatId: ['', Validators.required],
      amount: ['', Validators.required],
      fromDate: [],
      toDate: [],
      isActive: [],
      reason: []
  });

    this.invugilatorForm.get('isActive').setValue(true);
    this.invugilatorForm.get('fromDate').setValue(this.genericFunctions.moment());
    this.invugilatorForm.get('toDate').setValue(this.genericFunctions.moment());
    this.invugilatorForm.get('reason').setValue('active');
    this.min = this.genericFunctions.moment();
    if (!this.isEmptyObject(this.data)){
    this.invugilatorForm.get('collegeId').setValue(this.data.collegeId);
    this.invugilatorForm.get('invgdesignationCatId').setValue(this.data.invgdesignationCatId);
    this.invugilatorForm.get('amount').setValue(this.data.amount);
    this.invugilatorForm.get('fromDate').setValue(this.genericFunctions.momentWithDateFormatYMD(this.data.fromDate));
    this.invugilatorForm.get('toDate').setValue(this.genericFunctions.momentWithDateFormatYMD(this.data.toDate));
 //   this.invugilatorForm.get('toDate').setValue(this.data.toDate);
    this.invugilatorForm.get('isActive').setValue(this.data.isActive);
    this.invugilatorForm.get('reason').setValue(this.data.reason);
    this.dialogTitle = 'Edit Invigilator Remuneration';
}


  }

  
    getData(): void{

        /*---------- GET Colleges --------------*/            
    this.crudService.listDetailsById(this.collegeCrudUrl, 'true', this.isActive)
    .subscribe(result => {
          if (result.statusCode === 200){
              if (result.data.resultList && result.data.resultList !== '') {
                  this.colleges = result.data.resultList;
                  if (this.dataSECPrincipal && this.colleges.length > 0){
                    this.invugilatorForm.get('collegeId').setValue(+localStorage.getItem('collegeId'));
                    // this.data = this.colleges.filter(x => (x.collegeId === this.invugilatorForm.value.collegeId))[0].collegeCode;
                    // this.selectedCollege(this.invugilatorForm.value.collegeId); 
                 }
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

    this.crudService.listDetailsByTwoIds(this.generalDetailsUrl, this.invlatrDisgTypesUrl, 'true', this.generalDetailsByCodeUrl, this.isActive)
      .subscribe(result => {
          if (result.statusCode === 200){
                      if (result.data.resultList && result.data.resultList !== '') {
                          this.invigilatorDisg = result.data.resultList;
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

  calDays(): void{
    const date1 = new Date(moment(this.invugilatorForm.value.fromDate).format()); // new Date(this.data.issueTodate);
    const date2 = new Date(moment(this.invugilatorForm.value.toDate).format()); // new Date(returnDate);
    if (date1.getTime() > date2.getTime()){
      this.snotifyService.info('From date should be less then To date.', 'Info!');
      this.invugilatorForm.get('toDate').setValue(this.genericFunctions.momentWithDate(this.invugilatorForm.value.fromDate));
    }
  }

  submit(): void{
    const Obj = this.invugilatorForm.value;
    Obj.fromDate = this.genericFunctions.momentWithDateFormatYMD(Obj.fromDate);
    Obj.toDate = this.genericFunctions.momentWithDateFormatYMD(Obj.toDate);
    if (this.invugilatorForm.invalid) {
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
