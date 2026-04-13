import { Component, Inject, OnInit, ViewChild } from '@angular/core';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { Router } from '@angular/router';
import { CONSTANTS } from 'app/main/common/constants';
import { GenericFunctions } from 'app/main/common/generic-functions';
import { CrudService } from 'app/main/services/crud.service';
import * as moment from 'moment';
import { SnotifyService } from 'ng-snotify';

@Component({
  selector: 'app-add-univ-exam-centers',
  templateUrl: './add-univ-exam-centers.component.html',
  styleUrls: ['./add-univ-exam-centers.component.scss']
})
export class AddUnivExamCentersComponent implements OnInit {

  private UnivExamRegionalCentersUrl = CONSTANTS.UnivExamRegionalCentersUrl;
  private citiesCrudUrl = CONSTANTS.citiesCrudUrl;
  private UnivExamCentersUrl = CONSTANTS.UnivExamCentersUrl;
  private isActive = CONSTANTS.isActive;
  courses = [];
  courseYears=[];
  courseGroups=[];
  courseTypes=[];
  allCourses=[]
  courseId: any;
  dialogTitle;
  courseGrpCode: any;
  courseCode: any;
  examCenterForm: FormGroup;
  dataSource: MatTableDataSource<any>;
  @ViewChild(MatSort) sort: MatSort;
  displayedColumns: string[] = ['courseCode', 'courseGrpCode','courseYearCode','isActive', 'actions'];
  courseYearCode: any;
  coursesList=[];
  cities=[];
  examlRegionalCenterList =[];
  examlCenterList: any;
  examlCenterListData: any[];
  constructor(private formBuilder: FormBuilder, private dialogRef: MatDialogRef<AddUnivExamCentersComponent>,
              @Inject(MAT_DIALOG_DATA) public data, private snotifyService: SnotifyService, private router: Router,
              private crudService: CrudService, private genericFunctions: GenericFunctions) {
               this.getData();

    }

  // tslint:disable-next-line:typedef
  ngOnInit() {
    this.examCenterForm = this.formBuilder.group({
      examcenterName: ['', Validators.required],
      examcenterCode: ['',],
      longitude:[null,],
      latitude:[null,],
      addressLine1:['',],
      addressLine2:['',],
      cityId:['',Validators.required],
      pincode:['',],
      isActive: [true],
      isQpScanningCenter:[true],
      univExamReionalCenterId:[],
      qpScanningCenterId:[],
      reason:[]
     
    });
    this.dialogTitle = 'Add Exam Centers';

    if (!this.isEmptyObject(this.data) && this.data.type!='new'){
    this.examCenterForm.get('isActive').setValue(this.data?.isActive);
    this.examCenterForm.get('reason').setValue(this.data?.reason);
    this.examCenterForm.get('examcenterName').setValue(this.data?.examcenterName);
    this.examCenterForm.get('examcenterCode').setValue(this.data?.examcenterCode);
    this.examCenterForm.get('longitude').setValue(this.data?.longitude);
    this.examCenterForm.get('latitude').setValue(this.data?.latitude);
    this.examCenterForm.get('addressLine1').setValue(this.data?.addressLine1);  
    this.examCenterForm.get('addressLine2').setValue(this.data?.addressLine2);
    this.examCenterForm.get('cityId').setValue(this.data?.cityId);
    this.examCenterForm.get('pincode').setValue(this.data?.pincode);
    this.examCenterForm.get('isQpScanningCenter').setValue(this.data?.isQpScanningCenter);
    this.examCenterForm.get('qpScanningCenterId').setValue(this.data?.qpScanningCenterId);
    this.examCenterForm.get('univExamReionalCenterId').setValue(this.data?.univExamReionalCenterId);
    this.dialogTitle = 'Edit Exam Centers';


  }
}

getData(){
  this.cities =[]
  this.examlRegionalCenterList 
  this.crudService.listDetailsById(this.citiesCrudUrl, 'true', this.isActive)
  .subscribe(result => {
          if (result.statusCode === 200){
                  if (result.data.resultList && result.data.resultList !== '') {
                      this.cities = result.data.resultList; 
                                    
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
      this.crudService.listDetailsByTwoIds(this.UnivExamRegionalCentersUrl, this.data.universityId, 'true', 'Universities.universityId', this.isActive)
            .subscribe(result => {
              if (result.statusCode === 200){
                      if (result.data && result.data !== '') {
                        this.examlRegionalCenterList =result.data.resultList
                        this.snotifyService.success(result.message, 'Success!');
                                        
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
          this.examlCenterList =[]
          this.crudService.listDetailsByTwoIds(this.UnivExamCentersUrl, this.data.universityId, 'true', 'Universities.universityId', this.isActive)
              .subscribe(result => {
                  if (result.statusCode === 200) {
                      if (result.data.resultList && result.data.resultList !== '') {

                          this.examlCenterList = result.data.resultList.filter(x=>(x.isQpScanningCenter));
                          this.examlCenterListData=this.examlCenterList 
  
                      } else {
                          this.snotifyService.success(result.message, 'Success!');
                      }
                  } else {
                      this.snotifyService.error(result.message, 'Error!');
                  }
  
              }, error => {
                  if (error.error.statusCode === 401) {
  
                      this.snotifyService.error(error.error.message, 'Error!');
                      this.genericFunctions.logOut(this.router.url + '&loadForm=true');
                  } else {
                      this.snotifyService.error(CONSTANTS.message.CON_ERROR, 'Error!');
                  }
              });
}
serachExamCenter(value){
  this.examlCenterListData=[]
  this.serachExamCenterData(value)
}

serachExamCenterData(value: string){
let filter = value.toLowerCase();
for ( let i = 0 ; i < this.examlCenterList.length; i++ ) {
    let option = this.examlCenterList[i];
    if (option.examcenterCode.toLowerCase().indexOf(filter) >= 0) {
        this.examlCenterListData.push( option );
    }
}
}
   // tslint:disable-next-line:typedef
   isEmptyObject(obj) {
    return (obj && (Object.keys(obj).length === 0));
}
submit(): void {
    // const Obj = this.examCenterForm.value;
    if (this.examCenterForm.invalid) {
        return;
    } else {
        this.dialogRef.close(this.examCenterForm.value);
    }
}

}

