import { Component, OnInit, ViewChild } from '@angular/core';
import { CONSTANTS } from 'app/main/common/constants';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { College } from 'app/main/models/college';
import { Course } from 'app/main/models/course';
import { SnotifyService } from 'ng-snotify';
import { CrudService } from 'app/main/services/crud.service';
import { NgxSpinnerService } from 'ngx-spinner';
import { Router, ActivatedRoute } from '@angular/router';
import { GenericFunctions } from 'app/main/common/generic-functions';
import {Location} from '@angular/common';
import { ViewExamFeeStructureComponent } from './view-exam-fee-structure/view-exam-fee-structure.component';
import { MatDialog } from '@angular/material/dialog';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';

@Component({
  selector: 'app-exam-fee-structure',
  templateUrl: './exam-fee-structure.component.html',
  styleUrls: ['./exam-fee-structure.component.scss']
})

export class ExamFeeStructureComponent implements OnInit {

  displayedColumns: string[] = ['id', 'examFeeStructureName', 'examName', 'ApplicableFor', 'isActive', 'actions'];
  dataSource: MatTableDataSource<any>;

  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild(MatSort) sort: MatSort;
  panelOpenState = true;

  private collegeCrudUrl = CONSTANTS.collegeCrudUrl;
  private courseCrudUrl = CONSTANTS.courseCrudUrl;
  private getDetailsByCollegeIdUrl = CONSTANTS.getDetailsByCollegeIdUrl;   
  private examFeeStructureCrudUrl = CONSTANTS.examFeeStructureCrudUrl;
  private isActive = CONSTANTS.isActive;

  staffForm: FormGroup;
  colleges: College[] = [];
  courses: Course[] = [];
  step = 0;  
  examsList: any[] = [];
  pageParams: any = {};

  constructor(private formBuilder: FormBuilder, private snotifyService: SnotifyService,
              private crudService: CrudService, private spinner: NgxSpinnerService, private router: Router, 
              private _location: Location, private dialog: MatDialog, private route: ActivatedRoute, private genericFunctions: GenericFunctions) {         
      
  }

  // tslint:disable-next-line:typedef
  ngOnInit() {  
      
    this.dataSource = new MatTableDataSource(this.examsList);  
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;

    this.staffForm = this.formBuilder.group({
        collegeId: ['', Validators.required],
        courseId: [],        
    });

    this.route.queryParams
    .subscribe(params => {
        if (!this.isEmptyObject(params)){
            this.pageParams.collegeId = params.collegeId;
            this.staffForm.get('collegeId').setValue(+this.pageParams.collegeId);
            this.selectedCollege(this.pageParams.collegeId);
            this.getExamFeestructures(this.pageParams.collegeId);
        }
    });

    this.getData();
  }

  // tslint:disable-next-line:typedef
  isEmptyObject(obj) {
    return (obj && (Object.keys(obj).length === 0));
  }

  getData(): void{
    /*----------- COLLEGES -----------*/
    this.crudService.listDetailsById(this.collegeCrudUrl, 'true', this.isActive)
         .subscribe(result => {
             if (result.statusCode === 200){
                     if (result.data.resultList.length > 0) {
                         this.colleges = result.data.resultList;               
                         if (!this.isEmptyObject(this.pageParams)){
                            this.staffForm.get('collegeId').setValue(+this.pageParams.collegeId);
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
    this.examsList = [];
    this.dataSource = new MatTableDataSource(this.examsList);  
    this.staffForm.get('courseId').setValue('');
    this.courses = [];
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

  getExamFeestructures(collegeId): void{
      if (this.staffForm.valid){
             this.spinner.show();
             /*----------- EXAM FEE STRUCTURES -----------*/
             this.crudService.listDetailsByTwoIds(this.examFeeStructureCrudUrl, collegeId, 'true', 
             this.getDetailsByCollegeIdUrl, this.isActive)
             .subscribe(result => {
                this.spinner.hide();
                if (result.statusCode === 200){
                         if (result.data.resultList && result.data.resultList !== '') {
                             this.examsList = result.data.resultList;  
                             this.dataSource = new MatTableDataSource(this.examsList);  
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

  addExamFeestructure(): void{
     this.router.navigate(['admin-examination-management/pre-examination/exam-fee-structure/add-exam-fee-structure'], 
     { queryParams: { collegeId: this.staffForm.value.collegeId } });
  }

  editExamFeestructure(data): void{
    this.router.navigate(['admin-examination-management/pre-examination/exam-fee-structure/add-exam-fee-structure'], 
    { queryParams: { examFeeStructureId: data.examFeeStructureId, collegeId: this.staffForm.value.collegeId } });
  }

  viewExamFeeStructure(data): void{
    const dialogRef = this.dialog.open(ViewExamFeeStructureComponent, {
        width: '700px',
        data: data
    });
  }

}
