import { Component, OnInit, Inject, ViewChild } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { GenericFunctions } from 'app/main/common/generic-functions';
import { NgxSpinnerService } from 'ngx-spinner';
import { SnotifyService } from 'ng-snotify';
import { CrudService } from 'app/main/services/crud.service';
import { Router } from '@angular/router';
import { CONSTANTS } from 'app/main/common/constants';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';

@Component({
  selector: 'app-not-registered-students',
  templateUrl: './not-registered-students.component.html',
  styleUrls: ['./not-registered-students.component.scss']
})
export class NotRegisteredStudentsComponent implements OnInit {

  subjects = [];
  subjectTypes = [];
  subjectCategorys = [];

  displayedColumns: string[] = [ 'id', 'subject_code', 'subject_name', 'type', 'category', 'credits', 'sub_credit_hrs'];
  dataSource: MatTableDataSource<any>;

  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild(MatSort) sort: MatSort;

  private generalDetailsUrl = CONSTANTS.generalDetailsUrl;
  private subjectType = CONSTANTS.subjectType;
  private generalDetailsByCodeUrl = CONSTANTS.generalDetailsByCodeUrl;
  private isActive = CONSTANTS.isActive;
  private subjectCategory = CONSTANTS.subjectCategory;

  constructor(private formBuilder: FormBuilder, private dialogRef: MatDialogRef<NotRegisteredStudentsComponent>, private genericFunctions: GenericFunctions,
              @Inject(MAT_DIALOG_DATA) public data, private spinner: NgxSpinnerService,
              private snotifyService: SnotifyService, private crudService: CrudService, public router: Router) {
      this.getAllData();
  }

  // tslint:disable-next-line:typedef
  ngOnInit() {
    this.subjects = this.data;
    // tslint:disable-next-line: prefer-for-of
    for (let i = 0; i < this.subjects.length; i++){
      this.subjects[i].subjectTypeId = null;
      this.subjects[i].subjectCategoryId = null;
      this.subjects[i].subjectCode = this.subjects[i].subject_code;
      this.subjects[i].subjectName = this.subjects[i].subject_name;
      this.subjects[i].collegeId = this.subjects[i].fk_college_id;
      this.subjects[i].courseId = this.subjects[i].fk_course_id;
      this.subjects[i].subCredits = this.subjects[i].credits;
      this.subjects[i].subCreditHrs = this.subjects[i].sub_credit_hrs;
      this.subjects[i].isActive = true;
      this.subjects[i].shortName = this.subjects[i].subject_code;
    }
    this.dataSource = new MatTableDataSource<any>(this.subjects);
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  getAllData(): void{
    /*----------- SUBJECT TYPE -----------*/
    this.crudService.listDetailsByTwoIds(this.generalDetailsUrl, this.subjectType, 'true', this.generalDetailsByCodeUrl, this.isActive)
    .subscribe(result => {
        if (result.statusCode === 200){
                  if (result.data.resultList && result.data.resultList !== '') {
                      this.subjectTypes = result.data.resultList;
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

      /*----------- SUBJECT CATEGORIES -----------*/
    this.crudService.listDetailsByTwoIds(this.generalDetailsUrl, this.subjectCategory, 'true', this.generalDetailsByCodeUrl, this.isActive)
  .subscribe(result => {
      if (result.statusCode === 200){
                if (result.data.resultList && result.data.resultList !== '') {
                    this.subjectCategorys = result.data.resultList;
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

  submit(): void {
    if (this.subjects.length === 0) {
        return;
    } else {
        this.dialogRef.close(this.subjects);
    }
  }

}
