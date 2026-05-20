import { Component, OnInit, ViewChild } from '@angular/core';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { Router } from '@angular/router';
import { CONSTANTS } from 'app/main/common/constants';
import { GenericFunctions } from 'app/main/common/generic-functions';
import { College } from 'app/main/models/college';
import { Course } from 'app/main/models/course';
import { MarksSetup } from 'app/main/models/marksSetup';
import { CrudService } from 'app/main/services/crud.service';
import { SnotifyService } from 'ng-snotify';
import { NgxSpinnerService } from 'ngx-spinner';
import { AddSetupComponent } from '../../exam-masters/setup-master/add-setup/add-setup.component';
import { AddSetupDetailsComponent } from './add-setup-details/add-setup-details.component';

@Component({
  selector: 'app-exam-setup-details',
  templateUrl: './exam-setup-details.component.html',
  styleUrls: ['./exam-setup-details.component.scss']
})
export class ExamSetupDetailsComponent implements OnInit {

  displayedColumns: string[] = ['id', 'question', 'optionName', 'markSetupName', 'detailCode', 'internalpatternCatCode', 'marks',  'isActive', 'actions'];
    dataSource: MatTableDataSource<any>;
  
    @ViewChild(MatPaginator) paginator: MatPaginator;
    @ViewChild(MatSort) sort: MatSort;
    panelOpenState = true;
  
    private collegeCrudUrl = CONSTANTS.collegeCrudUrl;
    private examGradesIdUrl = CONSTANTS.examGradesIdUrl;
    private getDetailsByCollegeIdUrl = CONSTANTS.getDetailsByCollegeIdUrl;   
    private examFCARSetupDetailCrudUrl = CONSTANTS.examFCARSetupDetailCrudUrl;
    private isActive = CONSTANTS.isActive;
  
    examGradesForm: FormGroup;
    colleges: College[] = [];
    courses: Course[] = [];
    step = 0;  
    examsMarksSteupList: MarksSetup[] = [];
    examGrades: any = {};
    item: any = {};
    
    constructor(private formBuilder: FormBuilder, private snotifyService: SnotifyService,
                private crudService: CrudService, private spinner: NgxSpinnerService, private router: Router, 
                private dialog: MatDialog, private genericFunctions: GenericFunctions) {        
        this.getData();
    }
  
    // tslint:disable-next-line:typedef
    ngOnInit() {       
      this.examGradesForm = this.formBuilder.group({
          collegeId: ['', Validators.required],      
        }); 
      this.dataSource = new MatTableDataSource<any>(this.examsMarksSteupList);
      this.dataSource.paginator = this.paginator;
      this.dataSource.sort = this.sort;
    }
  
    getData(): void{
      /*----------- COLLEGES -----------*/
      this.crudService.listDetailsById(this.collegeCrudUrl, 'true', this.isActive)
           .subscribe(result => {
               if (result.statusCode === 200){
                       if (result.data.resultList && result.data.resultList !== '') {
                           this.colleges = result.data.resultList;   
                           if (this.colleges.length > 0){
                            this.examGradesForm.get('collegeId').setValue(this.colleges[0].collegeId);
                            this.selectedCollege(this.examGradesForm.value.collegeId); 
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
    }
  
    // tslint:disable-next-line:typedef
    selectedCollege(collegeId){
        this.examsMarksSteupList = [];
        this.dataSource = new MatTableDataSource<any>(this.examsMarksSteupList);
        if (collegeId !== null && collegeId !== ''){
      /*----------- COURSES -----------*/
      this.spinner.show();          
      this.crudService.listDetailsById(this.examFCARSetupDetailCrudUrl, this.examGradesForm.value.collegeId,
            this.getDetailsByCollegeIdUrl)
        .subscribe(result => {
           this.spinner.hide();
           if (result.statusCode === 200){
                if (result.data && result.data !== '') {
                    this.examsMarksSteupList = result.data.resultList;
                    // Assign the data to the data source for the API
                    this.dataSource = new MatTableDataSource(this.examsMarksSteupList);
                    this.dataSource.paginator = this.paginator;
                    this.dataSource.sort = this.sort;
                } else {
                    this.snotifyService.success(result.message, 'Success!');
                }
           }else {
            this.snotifyService.error(result.message, 'Error!');
        }
        }, error => {
            this.spinner.hide();
            if (error.error.statusCode === 401){
                this.snotifyService.error(error.error.message, 'Error!');
                this.genericFunctions.logOut(this.router.url);
           }else{
               this.snotifyService.error(CONSTANTS.message.CON_ERROR, 'Error!');
           }
        });
  }
    }
    
  openDialog(): void {
    this.item = {};
    this.item.collegeId = this.examGradesForm.value.collegeId;
    this.item.collegeCode = this.colleges.filter(x => (x.collegeId === this.examGradesForm.value.collegeId))[0].collegeCode;
    const dialogRef = this.dialog.open(AddSetupDetailsComponent, {
      width: '750px',
      data: this.item
    });
  
    dialogRef.afterClosed().subscribe(details => {
      if (details != null && details !== ''){  
          this.spinner.show();
          details.collegeId = this.examGradesForm.value.collegeId;
          /*---------- ADD EXAM SETUP DETAILS ----------*/
          this.crudService.addDetails(this.examFCARSetupDetailCrudUrl, details)
          .subscribe(result => {
              this.spinner.hide();
              if (result.statusCode === 200){
                  if (result.data && result.data !== '') {
                      this.snotifyService.success(result.message, 'Success!');
                      this.selectedCollege(this.examGradesForm.value.collegeId);
                  }
              }else {
                  this.snotifyService.error(result.message, 'Error!');
              }
          }, error => {
              this.spinner.hide();
              if (error.error.statusCode === 401){
                  this.snotifyService.error(error.error.message, 'Error!');
                  this.genericFunctions.logOut(this.router.url);
             }else{
                 this.snotifyService.error(CONSTANTS.message.CON_ERROR, 'Error!');
             }
          });
  
      }  
  });
  
  }
  
  /*---------- EDIT EXAM SETUP DETAILS -----------*/
  editDialog(item: any): void {
      const dialogRef = this.dialog.open(AddSetupDetailsComponent, {
      width: '750px',
      data: item
      });
  
      dialogRef.afterClosed().subscribe(details => {
          if (details != null && details !== ''){
              details.examFCARSetDetId = item.examFCARSetDetId;
              details.createdDt = item.createdDt;
              details.createdUser = item.createdUser;
              this.UpdateExamSetupDetails(details);
              
          }
      });
  }
  
    /*------------ UPDATE EXAM SETUP DETAILS -----------*/
    UpdateExamSetupDetails(details): void{
      this.spinner.show();
      this.crudService.updateDetails(this.examFCARSetupDetailCrudUrl, details, details.examFCARSetDetId, 'examFCARSetDetId')
      .subscribe(result => {
          this.spinner.hide();
          if (result.statusCode === 200){
              if (result.data && result.data !== '') {
                  this.snotifyService.success(result.message, 'Success!');
                  this.selectedCollege(this.examGradesForm.value.collegeId);
              }
          }else {
              this.snotifyService.error(result.message, 'Error!');
          }
      }, error => {
          this.spinner.hide();
          if (error.error.statusCode === 401){
              this.snotifyService.error(error.error.message, 'Error!');
              this.genericFunctions.logOut(this.router.url);
         }else{
             this.snotifyService.error(CONSTANTS.message.CON_ERROR, 'Error!');
         }
      });
  }
  
  
    // tslint:disable-next-line:typedef
    applyFilter(filterValue: string) {
        this.dataSource.filter = filterValue.trim().toLowerCase();
  
        if (this.dataSource.paginator) {
            this.dataSource.paginator.firstPage();
        }
    }
}
