import { Component, OnInit, Inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { SnotifyService } from 'ng-snotify';
import { Country } from 'app/main/models/country';
import { State } from 'app/main/models/state';
import { District } from 'app/main/models/district';
import { Organization } from 'app/main/models/organization';
import { Router } from '@angular/router';
import { GenericFunctions } from 'app/main/common/generic-functions';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { CONSTANTS } from 'app/main/common/constants';
import { CrudService } from 'app/main/services/crud.service';
@Component({
  selector: 'app-config-modal',
  templateUrl: './config-modal.component.html',
  styleUrls: ['./config-modal.component.scss']
})
export class ConfigModalComponent implements OnInit {

 
  configForm: FormGroup;
  univExamCenters = [];
  countries: Country[] = [];
  states: State[] = [];
  districts: District[] = [];
  dialogTitle;

  private UnivExamCentersUrl = CONSTANTS.UnivExamCentersUrl;
  private isActive = CONSTANTS.isActive;

  constructor( private genericFunctions: GenericFunctions, private formBuilder: FormBuilder, private dialogRef: MatDialogRef<ConfigModalComponent>,
               @Inject(MAT_DIALOG_DATA) public data, private snotifyService: SnotifyService,
               private crudService: CrudService, public router: Router) {

      this.getData();
  }
  // tslint:disable-next-line:typedef
  
  ngOnInit() {
      this.dialogTitle = 'Add Question Paper Configs';
      this.configForm = this.formBuilder.group({
        univExamCentersId: ['', Validators.required],
        systemIpAddress: ['', Validators.required],
        macAddress: ['', Validators.required],
          isActive: [],
          reason: []
      });

      this.configForm.get('isActive').setValue(true);
      this.configForm.get('reason').setValue('active');

      if (!this.isEmptyObject(this.data)) {
        console.log(this.data,'data');
        
          this.configForm.get('univExamCentersId').setValue(this.data.univExamCentersaId);
          this.configForm.get('systemIpAddress').setValue(this.data.systemIpAddress);
          this.configForm.get('macAddress').setValue(this.data.macAddress);
          this.configForm.get('isActive').setValue(this.data.isActive);
          this.configForm.get('reason').setValue(this.data.reason);
          this.dialogTitle = 'Edit  Question Paper Configs';
      }
  }
  getData(): void {
      /*---------- GET ORGANIZATIONS --------------*/
      this.crudService.listDetailsById(this.UnivExamCentersUrl, 'true', this.isActive )
          .subscribe(result => {
              if (result.statusCode === 200) {
                  if (result.data.resultList && result.data.resultList !== '') {
                      this.univExamCenters = result.data.resultList;
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
      if (this.configForm.invalid) {
          return;
      } else {
          this.dialogRef.close(Obj);
      }
  }
}

