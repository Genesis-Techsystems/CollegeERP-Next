import { Component, Inject, OnInit, ViewChild } from '@angular/core';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { Router } from '@angular/router';
import { CONSTANTS } from 'app/main/common/constants';
import { GenericFunctions } from 'app/main/common/generic-functions';
import { CrudService } from 'app/main/services/crud.service';
import { SnotifyService } from 'ng-snotify';

@Component({
  selector: 'app-update-exam-profiles',
  templateUrl: './update-exam-profiles.component.html',
  styleUrls: ['./update-exam-profiles.component.scss']
})
export class UpdateExamProfilesComponent implements OnInit {

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
  UnivExamCenterList=[];
  examlCenterList=[];
  examlCenterListData=[];
  constructor(private formBuilder: FormBuilder, private dialogRef: MatDialogRef<UpdateExamProfilesComponent>,
              @Inject(MAT_DIALOG_DATA) public data, private snotifyService: SnotifyService, private router: Router,
              private crudService: CrudService, private genericFunctions: GenericFunctions) {
               this.getData();

    }

  // tslint:disable-next-line:typedef
  ngOnInit() {
    this.examCenterForm = this.formBuilder.group({
      univExamCentersId: ['', Validators.required],
      isActive: [true],
      reason:[]
     
    });

    if (!this.isEmptyObject(this.data)){
    this.examCenterForm.get('isActive').setValue(this.data?.isActive);
    this.examCenterForm.get('reason').setValue(this.data?.reason);
    this.examCenterForm.get('univExamCentersId').setValue(this.data?.univExamCentersId);
    this.dialogTitle = 'Edit Exam Centers Profiles';


  }
}

getData(){
  this.examlCenterList =[]
      this.crudService.listDetailsById(this.UnivExamCentersUrl, 'true',  this.isActive)
          .subscribe(result => {
              if (result.statusCode === 200) {
                  if (result.data.resultList && result.data.resultList !== '') {
                      this.examlCenterList = result.data.resultList;
                      this.examlCenterListData= this.examlCenterList 
                      // this.dataSource = new MatTableDataSource(this.examlCenterList);
                      // this.dataSource.paginator = this.paginator;
                      // this.dataSource.sort = this.sort;

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
    if (this.examCenterForm.invalid) {
        return;
    } else {
        this.dialogRef.close(this.examCenterForm.value);
    }
}

}

