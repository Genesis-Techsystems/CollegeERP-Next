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
import { CrudService } from 'app/main/services/crud.service';
import { SnotifyService } from 'ng-snotify';
import { NgxSpinnerService } from 'ngx-spinner';
import { AddGradeRuleModalComponent } from './add-grade-rule-modal/add-grade-rule-modal.component';

@Component({
  selector: 'app-grade-rule-settings',
  templateUrl: './grade-rule-settings.component.html',
  styleUrls: ['./grade-rule-settings.component.scss']
})

export class GradeRuleSettingsComponent implements OnInit {

  displayedColumns: string[] = ['id','firstmodmarkstobeAdded', 'firstmodpassPercentage', 'secmodmarkstobeAdded', 'secmodmarksPercentage', 'secmodstdPercentage', 'graftingPercentage','evaluationGraceMarks','moderationGraceMarks', 'isActive', 'actions'];
  dataSource: MatTableDataSource<any>;

  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild(MatSort) sort: MatSort;
  panelOpenState = true;

  private collegeCrudUrl = CONSTANTS.collegeCrudUrl;
  private getDetailsByUniversityIdUrl = CONSTANTS.getDetailsByUniversityIdUrl;
  private courseCrudUrl = CONSTANTS.courseCrudUrl;
  private examResultProcessingSettingsCrudUrl = CONSTANTS.examResultProcessingSettingsCrudUrl;
  private examGradesIdUrl = CONSTANTS.examGradesIdUrl;
  private getDetailsByCollegeIdUrl = CONSTANTS.getDetailsByCollegeIdUrl;   
  private getDetailsByCourseIdUrl = CONSTANTS.getDetailsByCourseIdUrl;
  private regulationCrudUrl = CONSTANTS.regulationCrudUrl;
  private isActive = CONSTANTS.isActive;

  examGradesForm: FormGroup;
  colleges: College[] = [];
  courses: Course[] = [];
  step = 0;  
  examGradeSettingsList: any[] = [];
  examGrades: any = {};
  item: any = {};
  regulations = [];
  universityId;

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
        regulationId: ['', Validators.required],        
      }); 
    this.dataSource = new MatTableDataSource<any>(this.examGradeSettingsList);
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
      this.examGradesForm.get('regulationId').setValue('');
      this.examGradeSettingsList = [];
      this.courses = [];
      this.regulations = [];
      this.dataSource = new MatTableDataSource<any>(this.examGradeSettingsList);
      if (collegeId !== null && collegeId !== ''){
        this.universityId = this.colleges.filter(x=>(x.collegeId === collegeId))[0]?.universityId;
    /*----------- COURSES -----------*/
    this.crudService.listDetailsByTwoIds(this.courseCrudUrl, this.universityId, 'true', this.getDetailsByUniversityIdUrl, this.isActive)
    .subscribe(result => {
        if (result.statusCode === 200){
                if (result.data.resultList && result.data.resultList !== '') {
                    this.courses = result.data.resultList; 
                    if(this.courses && this.courses.length > 0){
                        this.examGradesForm.get('courseId').setValue(this.courses[0].courseId);
                        this.selectedCourse(this.examGradesForm.value.courseId);
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
  }
  selectedCourse(courseId): void{
    this.examGradeSettingsList = [];
    this.regulations = [];
    this.examGradesForm.get('regulationId').setValue('');
    this.dataSource = new MatTableDataSource<any>(this.examGradeSettingsList);
    if (courseId !== null && courseId !== undefined && this.examGradesForm.value.courseId !== null && this.examGradesForm.value.courseId !== undefined){
  /*----------- Regulations -----------*/
      // tslint:disable-next-line:max-line-length
      this.crudService.listDetailsByTwoIdsWithSort(this.regulationCrudUrl, this.examGradesForm.value.courseId, 'true', 'desc',
      this.getDetailsByCourseIdUrl, this.isActive, 'regulationCode')
      .subscribe(result => {
          if (result.statusCode === 200) {
              if (result.data.resultList && result.data.resultList !== '') {
                  this.regulations = result.data.resultList;
                 
              } else {
                  this.snotifyService.success(result.message, 'Success!');
              }
          } else {
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
selectedRegulation(regulationId): void{
    this.examGradeSettingsList = [];
    this.dataSource = new MatTableDataSource<any>(this.examGradeSettingsList);
    if (regulationId !== null && regulationId !== undefined){
  /*-----------Exams -----------*/      
  this.spinner.show();          
//   this.crudService.listDetailsByTwoIds(this.examResultProcessingSettingsCrudUrl, this.examGradesForm.value.collegeId, this.examGradesForm.value.courseId,
//         this.getDetailsByCollegeIdUrl , this.getDetailsByCourseIdUrl)
  this.crudService.listDetailsByTwoIds(this.examResultProcessingSettingsCrudUrl, this.examGradesForm.value.courseId,this.examGradesForm.value.regulationId,
  this.getDetailsByCourseIdUrl,'regulation.regulationId')
    .subscribe(result => {
       this.spinner.hide();
       if (result.statusCode === 200){
            if (result.data && result.data !== '') {
                this.examGradeSettingsList = result.data.resultList;
                // Assign the data to the data source for the API
                this.dataSource = new MatTableDataSource(this.examGradeSettingsList);
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
  this.item.collegeCode = this.colleges.filter(x => (x.collegeId === this.examGradesForm.value.collegeId))[0].collegeCode;
  this.item.courseCode = this.courses.filter(x => (x.courseId === this.examGradesForm.value.courseId))[0].courseCode;
  const dialogRef = this.dialog.open(AddGradeRuleModalComponent, {
    width: '750px',
    data: this.item
  });

  dialogRef.afterClosed().subscribe(details => {
    if (details != null && details !== ''){  
        this.spinner.show();
        details.collegeId = this.examGradesForm.value.collegeId;
        details.courseId = this.examGradesForm.value.courseId;
        details.regulationId = this.examGradesForm.value.regulationId;
        details.universityId = this.universityId;
        /*---------- ADD EXAM GRADE ----------*/
        this.crudService.addDetails(this.examResultProcessingSettingsCrudUrl, details)
        .subscribe(result => {
            this.spinner.hide();
            if (result.statusCode === 200){
                if (result.data && result.data !== '') {
                    this.snotifyService.success(result.message, 'Success!');
                    this.selectedRegulation(this.examGradesForm.value.regulationId);
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

/*---------- EDIT EXAM GRADE -----------*/
editDialog(data): void {
    this.examGrades = data;
    console.log(data);
    
    this.examGrades.collegeCode = this.colleges.filter(x => (x.collegeId === this.examGradesForm.value.collegeId))[0].collegeCode;
    this.examGrades.courseCode = this.courses.filter(x => (x.courseId === this.examGradesForm.value.courseId))[0].courseCode; 
    this.examGrades.edit = 'edit';
    const dialogRef = this.dialog.open(AddGradeRuleModalComponent, {
    width: '750px',
    data: this.examGrades
    });

    dialogRef.afterClosed().subscribe(details => {
        if (details != null && details !== ''){
            details.examrpsettingId = this.examGrades.examrpsettingId;
            details.universityId = this.universityId;
            this.UpdateExamGradeRule(details);
        }
    });

}

/*------------ UPDATE EXAM GRADE -----------*/
UpdateExamGradeRule(details): void{
  this.spinner.show();
  this.crudService.updateDetails(this.examResultProcessingSettingsCrudUrl, details, details.examrpsettingId, 'examrpsettingId')
  .subscribe(result => {
      this.spinner.hide();
      if (result.statusCode === 200){
          if (result.data && result.data !== '') {
              this.snotifyService.success(result.message, 'Success!');
              this.selectedRegulation(this.examGradesForm.value.regulationId);
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
