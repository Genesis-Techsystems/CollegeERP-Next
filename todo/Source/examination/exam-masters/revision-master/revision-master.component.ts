import { Component, OnInit, ViewChild } from '@angular/core';
import { AddRevisionMasterComponent } from './add-revision-master/add-revision-master.component';
import { MatDialog } from '@angular/material/dialog';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { CONSTANTS } from 'app/main/common/constants';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { College } from 'app/main/models/college';
import { Course } from 'app/main/models/course';
import { SnotifyService } from 'ng-snotify';
import { CrudService } from 'app/main/services/crud.service';
import { NgxSpinnerService } from 'ngx-spinner';
import { Router } from '@angular/router';
import { GenericFunctions } from 'app/main/common/generic-functions';

@Component({
  selector: 'app-revision-master',
  templateUrl: './revision-master.component.html',
  styleUrls: ['./revision-master.component.scss']
})

export class RevisionMasterComponent implements OnInit {

  displayedColumns: string[] = ['id', 'examRevisionTypeName', 'fromDate', 'toDate', 'amount', 'isActive', 'actions'];
  dataSource: MatTableDataSource<any>;

  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild(MatSort) sort: MatSort;
  panelOpenState = true;

  private collegeCrudUrl = CONSTANTS.collegeCrudUrl;
  private courseCrudUrl = CONSTANTS.courseCrudUrl;
  private getDetailsByCollegeIdUrl = CONSTANTS.getDetailsByCollegeIdUrl;  
  private getDetailsByUniversityIdUrl = CONSTANTS.getDetailsByUniversityIdUrl; 
  private examFeeRevisionMasterCrudUrl = CONSTANTS.examFeeRevisionMasterCrudUrl;
  private isActive = CONSTANTS.isActive;

  examRevisionForm: FormGroup;
  colleges: College[] = [];
  courses: Course[] = [];
  step = 0;  
  examRevisionMaster: any[] = [];
  examRevision: any = {};
  universityId;
  
  constructor(private formBuilder: FormBuilder, private snotifyService: SnotifyService,
              private crudService: CrudService, private spinner: NgxSpinnerService, private router: Router, 
              private dialog: MatDialog, private genericFunctions: GenericFunctions) {        
    this.getData();
  }

  // tslint:disable-next-line:typedef
  ngOnInit() {       
      
    this.examRevisionForm = this.formBuilder.group({
        collegeId: ['', Validators.required],
        courseId: ['', Validators.required],            
      }); 
    this.dataSource = new MatTableDataSource<any>(this.examRevisionMaster);
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
                          this.examRevisionForm.get('collegeId').setValue(this.colleges[0].collegeId);
                          this.selectedCollege(this.examRevisionForm.value.collegeId); 
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
      this.examRevisionForm.get('courseId').setValue('');
      this.examRevisionMaster = [];
      this.courses = [];
      this.dataSource = new MatTableDataSource<any>(this.examRevisionMaster);
      if (collegeId !== null && collegeId !== ''){
    /*----------- COURSES -----------*/
    this.universityId = this.colleges.filter(x=>(x.collegeId === collegeId))[0]?.universityId;
    this.crudService.listDetailsByTwoIds(this.courseCrudUrl, this.universityId, 'true', this.getDetailsByUniversityIdUrl, this.isActive)
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
    this.examRevisionMaster = [];
    this.dataSource = new MatTableDataSource<any>(this.examRevisionMaster);
    if (courseId !== null && courseId !== undefined && this.examRevisionForm.value.courseId !== null && this.examRevisionForm.value.courseId !== undefined){
  /*-----------Exams -----------*/      
  this.spinner.show();          
  this.crudService.listDetailsByTwoIds(this.examFeeRevisionMasterCrudUrl, courseId, 'true', 'course.courseId', 'isActive')
  .subscribe(result => {
       this.spinner.hide();
       if (result.statusCode === 200){
            if (result.data && result.data !== '') {
                this.examRevisionMaster = result.data.resultList;
                // Assign the data to the data source for the API
                this.dataSource = new MatTableDataSource(this.examRevisionMaster);
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
  const dialogRef = this.dialog.open(AddRevisionMasterComponent, {
    width: '750px',
    data: {}
  });

  dialogRef.afterClosed().subscribe(details => {
    if (details != null && details !== ''){  
        this.spinner.show();
        details.collegeId = this.examRevisionForm.value.collegeId;
        details.courseId = this.examRevisionForm.value.courseId;
        /*---------- ADD EXAM GRADE ----------*/
        this.crudService.addDetails(this.examFeeRevisionMasterCrudUrl, details)
        .subscribe(result => {
            this.spinner.hide();
            if (result.statusCode === 200){
                if (result.data && result.data !== '') {
                    this.snotifyService.success(result.message, 'Success!');
                    this.selectedCourse(this.examRevisionForm.value.courseId);
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

/*---------- EDIT EXAM REVISION MASTER -----------*/
editDialog(row): void {
    const dialogRef = this.dialog.open(AddRevisionMasterComponent, {
    width: '750px',
    data: row
    });

    dialogRef.afterClosed().subscribe(details => {
        if (details != null && details !== ''){
            details.revisionMasterId = row.revisionMasterId;
            details.createdDt = row.createdDt;
            this.UpdateExamRevisionMaster(details);
        }
    });
}

  /*------------ UPDATE EXAM REVISION MASTER -----------*/
  UpdateExamRevisionMaster(details): void{
    this.spinner.show();
    this.crudService.updateDetails(this.examFeeRevisionMasterCrudUrl, details, details.revisionMasterId, 'revisionMasterId')
    .subscribe(result => {
        this.spinner.hide();
        if (result.statusCode === 200){
            if (result.data && result.data !== '') {
                this.snotifyService.success(result.message, 'Success!');
                this.selectedCourse(this.examRevisionForm.value.courseId);
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
