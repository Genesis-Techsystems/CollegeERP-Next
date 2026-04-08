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
  selector: 'app-edit-univ-exam-answer-paper-bags',
  templateUrl: './edit-univ-exam-answer-paper-bags.component.html',
  styleUrls: ['./edit-univ-exam-answer-paper-bags.component.scss']
})
export class EditUnivExamAnswerPaperBagsComponent implements OnInit {

  private UnivExamBagsUrl = CONSTANTS.UnivExamBagsUrl;

  private UnivExamCentersUrl = CONSTANTS.UnivExamCentersUrl;
  private isActive = CONSTANTS.isActive;
  dialogTitle;
  examCenterForm: FormGroup;
  UnivExamCenterList=[];
  univExamBags=[];
  examlCenterListData=[];
  constructor(private formBuilder: FormBuilder, private dialogRef: MatDialogRef<EditUnivExamAnswerPaperBagsComponent>,
              @Inject(MAT_DIALOG_DATA) public data, private snotifyService: SnotifyService, private router: Router,
              private crudService: CrudService, private genericFunctions: GenericFunctions) {
               this.getData();

    }

  // tslint:disable-next-line:typedef
  ngOnInit() {
    this.examCenterForm = this.formBuilder.group({
      univExamBagId: [{value: '', disabled: true }],
      isActive: [true],
      reason:[]
     
    });

    if (!this.isEmptyObject(this.data)){
    this.examCenterForm.get('isActive').setValue(this.data?.isActive);
    this.examCenterForm.get('reason').setValue(this.data?.reason);
    this.examCenterForm.get('univExamBagId').setValue(this.data?.univExamBagId);
    // this.dialogTitle = 'Edit Exam Centers Profiles';


  }
}

getData(){
  this.univExamBags =[]
      this.crudService.listDetailsById(this.UnivExamBagsUrl, 'true',  this.isActive)
          .subscribe(result => {
              if (result.statusCode === 200) {
                  if (result.data.resultList && result.data.resultList !== '') {
                      this.univExamBags = result.data.resultList;
                      this.examlCenterListData= this.univExamBags 
                      // this.dataSource = new MatTableDataSource(this.univExamBags);
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
serachExamBag(value){
  this.examlCenterListData=[]
  this.serachExamBagData(value)
}

serachExamBagData(value: string){
let filter = value.toLowerCase();
for ( let i = 0 ; i < this.univExamBags.length; i++ ) {
    let option = this.univExamBags[i];
    if (option.bagSerialNo.toLowerCase().indexOf(filter) >= 0) {
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

