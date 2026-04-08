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
  selector: 'app-add-exam-bag-collection',
  templateUrl: './add-exam-bag-collection.component.html',
  styleUrls: ['./add-exam-bag-collection.component.scss']
})
export class AddExamBagCollectionComponent implements OnInit {

  private univCollegeWiseCoursesUrl = CONSTANTS.univCollegeWiseCoursesUrl;
  private courseYearCrudUrl = CONSTANTS.courseYearCrudUrl;
  private courseGroupCrudUrl = CONSTANTS.courseGroupCrudUrl;
  private UnivExamAnswerPaperBagsUrl = CONSTANTS.UnivExamAnswerPaperBagsUrl;
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
  examBagCollectionForm: FormGroup;
  dataSource: MatTableDataSource<any>;
  @ViewChild(MatSort) sort: MatSort;
  displayedColumns: string[] = ['courseCode', 'courseGrpCode','courseYearCode','isActive', 'actions'];
  courseYearCode: any;
  coursesList=[];
  examAnswerPaperBagsList=[];
  constructor(private formBuilder: FormBuilder, private dialogRef: MatDialogRef<AddExamBagCollectionComponent>,
              @Inject(MAT_DIALOG_DATA) public data, private snotifyService: SnotifyService, private router: Router,
              private crudService: CrudService, private genericFunctions: GenericFunctions) {
               this.getData();

    }

  // tslint:disable-next-line:typedef
  ngOnInit() {
    this.examBagCollectionForm = this.formBuilder.group({
      univExamAnswerPaperBagsId: ['', Validators.required],
      collectedBy: ['',],
      collectedDate:[new Date(),],
      receivedBy:[],
      receivedDate:[new Date(),],
      isVerifiedFlag:[true],
      isActive: [true],
      reason:[]
     
    });
    this.dialogTitle = 'Add Exam Bag Collection';

    if (!this.isEmptyObject(this.data) && this.data.type!='new'){
    this.examBagCollectionForm.get('isActive').setValue(this.data?.isActive);
    this.examBagCollectionForm.get('reason').setValue(this.data?.reason);
    this.examBagCollectionForm.get('univExamAnswerPaperBagsId').setValue(this.data?.univExamAnswerPaperBagsId);
    this.examBagCollectionForm.get('collectedBy').setValue(this.data?.collectedBy);
    this.examBagCollectionForm.get('collectedDate').setValue(new Date(moment(this.data.collectedDate).format()));
    this.examBagCollectionForm.get('receivedBy').setValue(this.data?.receivedBy);
    this.examBagCollectionForm.get('receivedDate').setValue(new Date(moment(this.data.receivedDate).format()));  
    this.examBagCollectionForm.get('isVerifiedFlag').setValue(this.data?.isVerifiedFlag);
 
    this.dialogTitle = 'Edit Exam Bag Collection';

  }
}

getData(){
  this.examAnswerPaperBagsList =[]
  this.crudService.listDetailsById(this.UnivExamAnswerPaperBagsUrl, 'true', this.isActive)
  .subscribe(result => {
          if (result.statusCode === 200){
                  if (result.data.resultList && result.data.resultList !== '') {
                      this.examAnswerPaperBagsList = result.data.resultList; 
                                    
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
    // const Obj = this.examBagCollectionForm.value;
    if (this.examBagCollectionForm.invalid) {
        return;
    } else {
        this.dialogRef.close(this.examBagCollectionForm.value);
    }
}

}
