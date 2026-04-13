import { Component, ElementRef, Inject, OnInit, ViewChild } from '@angular/core';
import { FormGroup, FormControl, FormBuilder, Validators } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { Router, ActivatedRoute } from '@angular/router';
import { CONSTANTS } from 'app/main/common/constants';
import { GenericFunctions } from 'app/main/common/generic-functions';
import { CrudService } from 'app/main/services/crud.service';
import { SnotifyService } from 'ng-snotify';
import { NgxSpinnerService } from 'ngx-spinner';
import * as _ from 'lodash';


@Component({
  selector: 'app-view-evaluator-subjects',
  templateUrl: './view-evaluator-subjects.component.html',
  styleUrls: ['./view-evaluator-subjects.component.scss']
})
export class ViewEvaluatorSubjectsComponent implements OnInit {
 
 // dataSource:  MatTableDataSource<storeMaster>;; 
 displayedColumns: string[] = ['id', 'Name', 'SubjectName', 'SubjectCode','profileFromDate','profileToDate','status','actions'];
 dataSource:any;

 @ViewChild(MatPaginator) paginator: MatPaginator;
 @ViewChild(MatSort) sort: MatSort;

private EvaluatorProfileById = CONSTANTS.EvaluatorDetailsUrl


evaluatordetails=[]

 constructor(private formBuilder: FormBuilder, private snotifyService: SnotifyService,
  private crudService: CrudService, private spinner: NgxSpinnerService, private router: Router, 
             private dialog: MatDialog, private genericFunctions: GenericFunctions, private route: ActivatedRoute,) {        
     
 }

       ngOnInit(): void {
      this.getEvaluatorDetails();
 this.dataSource = new MatTableDataSource<any>(this.evaluatordetails);
 this.dataSource.paginator = this.paginator;
 this.dataSource.sort = this.sort;
 }


 applyFilter(filterValue: string) {
   this.dataSource.filter = filterValue.trim().toLowerCase();

   if (this.dataSource.paginator) {
       this.dataSource.paginator.firstPage();
   }
}
getEvaluatorDetails(){

  }
}
