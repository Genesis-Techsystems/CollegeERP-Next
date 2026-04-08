import { Component, OnInit, ViewChild } from '@angular/core';
import { CONSTANTS } from 'app/main/common/constants';
import { SnotifyService } from 'ng-snotify';
import { CrudService } from 'app/main/services/crud.service';
import { NgxSpinnerService } from 'ngx-spinner';
import { Router } from '@angular/router';
import { GenericFunctions } from 'app/main/common/generic-functions';
import { MatDialog } from '@angular/material/dialog';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import * as _ from 'lodash';

@Component({
  selector: 'app-exam-checklist',
  templateUrl: './exam-checklist.component.html',
  styleUrls: ['./exam-checklist.component.scss']
})
export class ExamChecklistComponent implements OnInit {

  displayedColumns: string[] = ['sno', 'module', 'submodule', 'page', 'status'];
  dataSource: MatTableDataSource<any>;

  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild(MatSort) sort: MatSort;
  panelOpenState = true;
  step = 0;
checklistform:FormGroup;
staticdata=[
  {module:'Examination-Management',submodule:'Evaluation-Process',page:'Evaluator-Subjects'},
  
];

private collegeCrudUrl = CONSTANTS.collegeCrudUrl;
private isActive = CONSTANTS.isActive;

colleges:any[]=[];

public text='No';
  constructor(private formBuilder: FormBuilder, private snotifyService: SnotifyService,
              private crudService: CrudService, private spinner: NgxSpinnerService, private router: Router, 
              private dialog: MatDialog, private genericFunctions: GenericFunctions) {        
  }
  ngOnInit() {       

this.checklistform = this.formBuilder.group({
  collegeId:['',Validators.required]
});
    this.dataSource = new MatTableDataSource<any>(this.staticdata);
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;

    this.getData();
  }
  applyFilter(filterValue: string) {
      this.dataSource.filter = filterValue.trim().toLowerCase();

      if (this.dataSource.paginator) {
          this.dataSource.paginator.firstPage();
      }
  }
  getData(): void{
    /*----------- COLLEGES -----------*/
    this.crudService.listDetailsById(this.collegeCrudUrl, 'true', this.isActive)
    .subscribe(result => {
        this.spinner.hide();
        if (result.statusCode === 200){
            if (result.data.resultList && !_.isEmpty(result.data.resultList)) {
                this.colleges = result.data.resultList;
                
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