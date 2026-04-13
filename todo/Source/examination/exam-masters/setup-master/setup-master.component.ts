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
import { AddSetupComponent } from './add-setup/add-setup.component';

@Component({
  selector: 'app-setup-master',
  templateUrl: './setup-master.component.html',
  styleUrls: ['./setup-master.component.scss']
})
export class SetupMasterComponent implements OnInit {

    displayedColumns: string[] = ['id', 'markSetupName', 'regulationIds', 'resultvalidationCatCode', 
    'isHavingoptions', 'isActive', 'actions'];
    dataSource: MatTableDataSource<any>;
  
    @ViewChild(MatPaginator) paginator: MatPaginator;
    @ViewChild(MatSort) sort: MatSort;
    panelOpenState = true;
  
    private collegeCrudUrl = CONSTANTS.collegeCrudUrl;
    private courseCrudUrl = CONSTANTS.courseCrudUrl;
    private examFCARSetupMasterCrudUrl = CONSTANTS.examFCARSetupMasterCrudUrl;
    private getDetailsByCollegeIdUrl = CONSTANTS.getDetailsByCollegeIdUrl;   
    private getDetailsByCourseIdUrl = CONSTANTS.getDetailsByCourseIdUrl;
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
          courseId: ['', Validators.required],       
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
  
        this.examGradesForm.get('courseId').setValue('');
        this.examsMarksSteupList = [];
        this.courses = [];
        this.dataSource = new MatTableDataSource<any>(this.examsMarksSteupList);
        if (collegeId !== null && collegeId !== ''){
      /*----------- COURSES -----------*/
      this.crudService.listDetailsByTwoIds(this.courseCrudUrl, collegeId, 'true', this.getDetailsByCollegeIdUrl, this.isActive)
      .subscribe(result => {
          if (result.statusCode === 200){
                  if (result.data.resultList && result.data.resultList !== '') {
                      this.courses = result.data.resultList; 
                                         
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
    }
  
    selectedCourse(courseId): void{
        this.examsMarksSteupList = [];
        this.dataSource = new MatTableDataSource<any>(this.examsMarksSteupList);
        if (courseId !== null && courseId !== undefined && this.examGradesForm.value.courseId !== null && this.examGradesForm.value.courseId !== undefined){
      /*----------- SETUPS -----------*/
          // tslint:disable-next-line:max-line-length
          this.spinner.show();          
    this.crudService.listDetailsByTwoIds(this.examFCARSetupMasterCrudUrl, this.examGradesForm.value.collegeId, this.examGradesForm.value.courseId,
          this.getDetailsByCollegeIdUrl , this.getDetailsByCourseIdUrl)
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
    this.item.courseId = this.examGradesForm.value.courseId;
    this.item.collegeCode = this.colleges.filter(x => (x.collegeId === this.examGradesForm.value.collegeId))[0].collegeCode;
    this.item.courseCode = this.courses.filter(x => (x.courseId === this.examGradesForm.value.courseId))[0].courseCode;  
    const dialogRef = this.dialog.open(AddSetupComponent, {
      width: '750px',
      data: this.item
    });
  
    dialogRef.afterClosed().subscribe(details => {
      if (details != null && details !== ''){  
          this.spinner.show();
          details.collegeId = this.examGradesForm.value.collegeId;
          details.courseId = this.examGradesForm.value.courseId;
          /*---------- ADD EXAM SETUP ----------*/
          this.crudService.addDetails(this.examFCARSetupMasterCrudUrl, details)
          .subscribe(result => {
              this.spinner.hide();
              if (result.statusCode === 200){
                  if (result.data && result.data !== '') {
                      this.snotifyService.success(result.message, 'Success!');
                      this.selectedCourse(this.examGradesForm.value.courseId);
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
  
  /*---------- EDIT EXAM SETUP -----------*/
  editDialog(item): void {
      const dialogRef = this.dialog.open(AddSetupComponent, {
      width: '750px',
      data: item
      });
  
      dialogRef.afterClosed().subscribe(details => {
          if (details != null && details !== ''){
              details.examFCARSetMasterId = item.examFCARSetMasterId;
              details.createdDt = item.createdDt;
              details.createdUser = item.createdUser;
              this.UpdateExamSetup(details);
              
          }
      });
  }
  
    /*------------ UPDATE EXAM SETUP -----------*/
    UpdateExamSetup(details): void{
      this.spinner.show();
      this.crudService.updateDetails(this.examFCARSetupMasterCrudUrl, details, details.examFCARSetMasterId, 'examFCARSetMasterId')
      .subscribe(result => {
          this.spinner.hide();
          if (result.statusCode === 200){
              if (result.data && result.data !== '') {
                  this.snotifyService.success(result.message, 'Success!');
                  this.selectedCourse(this.examGradesForm.value.courseId);
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
