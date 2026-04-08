import { Component, ElementRef, Inject, OnInit, ViewChild } from '@angular/core';
import { FormGroup, FormControl, FormBuilder, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { Router, ActivatedRoute } from '@angular/router';
import { CONSTANTS } from 'app/main/common/constants';
import { GenericFunctions } from 'app/main/common/generic-functions';
import { CrudService } from 'app/main/services/crud.service';
import { SnotifyService } from 'ng-snotify';
import { NgxSpinnerService } from 'ngx-spinner';
import { ReplaySubject, Subject } from 'rxjs';
import * as _ from 'lodash';
import { takeUntil } from 'rxjs/operators';
import *  as moment from 'moment';
@Component({
  selector: 'app-question-type-modal',
  templateUrl: './question-type-modal.component.html',
  styleUrls: ['./question-type-modal.component.scss']
})
export class QuestionTypeModalComponent implements OnInit {

  constructor(private formBuilder: FormBuilder, @Inject(MAT_DIALOG_DATA) private data, private snotifyService: SnotifyService, private dialogRef: MatDialogRef<QuestionTypeModalComponent>,
  private crudService: CrudService, private spinner: NgxSpinnerService, private router: Router,
  private dialog: MatDialog, private genericFunctions: GenericFunctions, private route: ActivatedRoute,) {
    this.getGeneralDetails();
}

private generalDetailsUrl = CONSTANTS.generalDetailsUrl;
private generalDetailsByCodeUrl = CONSTANTS.generalDetailsByCodeUrl;
private isActive = CONSTANTS.isActive;
private QuestionTaxonomyLevel = CONSTANTS.QuestionTaxonomyLevel;
private QuestionDifficulty = CONSTANTS.QuestionDifficulty;

questiondifficultysList = [];
questionTaxonomyLevelList = [] ;
dialogTitle: string;
newForm: FormGroup;


  ngOnInit(): void {
    this.dialogTitle = 'Add Question'
    this.newForm = this.formBuilder.group({
      questionDifficultyCatDetId: [],
      taxonomyLevelCatDetId: [],
    });
  }

  getGeneralDetails(): void{
    /*----------- EVENT STATUSES -----------*/
    this.crudService.listDetailsByTwoIds(this.generalDetailsUrl, this.QuestionDifficulty , 'true', this.generalDetailsByCodeUrl, this.isActive)
    .subscribe(result => {
        if (result.statusCode === 200){
                  if (result.data.resultList && result.data.resultList !== '') {
                      this.questiondifficultysList = result.data.resultList;
                      this.newForm.get('questionDifficultyCatDetId').setValue(this.questiondifficultysList[0].generalDetailId) 

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

      /*----------- AUDIENCE TYPES -----------*/
    this.crudService.listDetailsByTwoIdsWithSort(this.generalDetailsUrl, this.QuestionTaxonomyLevel , 'true', 'ASC', this.generalDetailsByCodeUrl, this.isActive, 'generalDetailSortOrder')
    .subscribe(result => {
        if (result.statusCode === 200){
                  if (result.data.resultList && result.data.resultList !== '') {
                      this.questionTaxonomyLevelList = result.data.resultList;
                      this.newForm.get('taxonomyLevelCatDetId').setValue(this.questionTaxonomyLevelList[0].generalDetailId) 

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

  submit(){
   let Obj = this.data[0]
   Obj.questionDifficultyCatDetId = this.newForm.value.questionDifficultyCatDetId
   Obj.taxonomyLevelCatDetId = this.newForm.value.taxonomyLevelCatDetId
      this.dialogRef.close(Obj);
  }

}
