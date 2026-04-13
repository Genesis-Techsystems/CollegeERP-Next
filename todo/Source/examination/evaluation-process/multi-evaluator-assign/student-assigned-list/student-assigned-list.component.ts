import { Component, Inject, OnInit, ViewChild } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { Router } from '@angular/router';
import { CONSTANTS } from 'app/main/common/constants';
import { GenericFunctions } from 'app/main/common/generic-functions';
import { CrudService } from 'app/main/services/crud.service';
import { SnotifyService } from 'ng-snotify';
import { NgxSpinnerService } from 'ngx-spinner';

@Component({
  selector: 'app-student-assigned-list',
  templateUrl: './student-assigned-list.component.html',
  styleUrls: ['./student-assigned-list.component.scss']
})
export class StudentAssignedListComponent implements OnInit {
  displayedColumns: string[] = ['omrSerialNo','evaluatedTotalMarks'];
  dataSource: MatTableDataSource<any>;
  searchText=''
 private getstudentanswerpapersUrl = CONSTANTS.getstudentanswerpapersUrl;
 @ViewChild(MatPaginator) paginator: MatPaginator;
 @ViewChild(MatSort) sort: MatSort;
  List=[];
  constructor( private dialogRef: MatDialogRef<StudentAssignedListComponent>,private formBuilder: FormBuilder, private snotifyService: SnotifyService,
    private crudService: CrudService, private spinner: NgxSpinnerService, private router: Router,
    @Inject(MAT_DIALOG_DATA) public data, private genericFunctions: GenericFunctions,) { }

  ngOnInit(): void {
    this.dataSource = new MatTableDataSource(this.data);
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
    // this.getList()
  }
  getList(): void{
           
    this.crudService.listByTwoIds(this.getstudentanswerpapersUrl,
      this.data.pk_exam_evaluator_profile_id, this.data.pk_exam_timetable_det_ids , 'examEvaluatorProfileId', 'examTimetableDetId')
        .subscribe(result => {
       this.spinner.hide();
       if (result.statusCode === 200){
            if (result.data && result.data !== '') {
                this.List = result.data;             
                this.dataSource = new MatTableDataSource(this.List);
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
