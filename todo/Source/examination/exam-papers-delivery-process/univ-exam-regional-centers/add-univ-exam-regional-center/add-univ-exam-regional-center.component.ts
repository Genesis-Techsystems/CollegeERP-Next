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
  selector: 'app-add-univ-exam-regional-center',
  templateUrl: './add-univ-exam-regional-center.component.html',
  styleUrls: ['./add-univ-exam-regional-center.component.scss']
})
export class AddUnivExamRegionalCenterComponent implements OnInit {

  private univCollegeWiseCoursesUrl = CONSTANTS.univCollegeWiseCoursesUrl;
  private courseYearCrudUrl = CONSTANTS.courseYearCrudUrl;
  private courseGroupCrudUrl = CONSTANTS.courseGroupCrudUrl;
  private citiesCrudUrl = CONSTANTS.citiesCrudUrl;
  private generalDetailsUrl = CONSTANTS.generalDetailsUrl;
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
  constructor(private formBuilder: FormBuilder, private dialogRef: MatDialogRef<AddUnivExamRegionalCenterComponent>,
              @Inject(MAT_DIALOG_DATA) public data, private snotifyService: SnotifyService, private router: Router,
              private crudService: CrudService, private genericFunctions: GenericFunctions) {
               this.getData();

    }

  // tslint:disable-next-line:typedef
  ngOnInit() {
    this.examCenterForm = this.formBuilder.group({
      examReionalCenterName: ['', Validators.required],
      examReionalCenterCode: ['',],
      longitude:['',],
      latitude:['',],
      addressLine1:['',],
      addressLine2:['',],
      cityId:['',Validators.required],
      pincode:['',],
      isActive: [true],
      reason:[]
     
    });
    this.dialogTitle = ' Add Exam Regional Centers ';

    if (!this.isEmptyObject(this.data) && this.data.type!='new'){
    this.examCenterForm.get('isActive').setValue(this.data?.isActive);
    this.examCenterForm.get('reason').setValue(this.data?.reason);
    this.examCenterForm.get('examReionalCenterName').setValue(this.data?.examReionalCenterName);
    this.examCenterForm.get('examReionalCenterCode').setValue(this.data?.examReionalCenterCode);
    this.examCenterForm.get('longitude').setValue(this.data.longitude);
    this.examCenterForm.get('latitude').setValue(this.data?.latitude);
    this.examCenterForm.get('addressLine1').setValue(this.data?.addressLine1);  
    this.examCenterForm.get('addressLine2').setValue(this.data?.addressLine2);
    this.examCenterForm.get('cityId').setValue(this.data?.cityId);
    this.examCenterForm.get('pincode').setValue(this.data?.pincode);
    this.dialogTitle = ' Edit Exam Regional Centers ';


  }
}

getData(){
  this.cities =[]
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
