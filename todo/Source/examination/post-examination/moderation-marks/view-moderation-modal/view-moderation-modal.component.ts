import { Component, Inject, OnInit, ViewChild } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { CrudService } from 'app/main/services/crud.service';


@Component({
  selector: 'app-view-moderation-modal',
  templateUrl: './view-moderation-modal.component.html',
  styleUrls: ['./view-moderation-modal.component.scss']
})
export class ViewModerationModalComponent implements OnInit {
  displayedColumns: string[] = ['id','omrSerialNo','student_internalmarks','student_externalmarks','student_total_marks',
  // 'exam_pass_percentage','exam_external_pass_percentage',
  'is_student_Pass','is_student_pass_with_Moderation_marks'];
  dataSource: MatTableDataSource<any>;
 @ViewChild(MatPaginator) paginator: MatPaginator;
 @ViewChild(MatSort) sort: MatSort;
  selecteddata='';
  ListData: any;
  academicYear='';
  constructor( private dialogRef: MatDialogRef<ViewModerationModalComponent>,
    private crudService: CrudService,
    @Inject(MAT_DIALOG_DATA) public data) { }

  ngOnInit(): void {
    this.ListData=this.data[0]
    this.academicYear=this.data[1]
    this.selecteddata=this.ListData[0]?.course_code+' / ' +this.academicYear+' / '+this.ListData[0]?.course_year_code+' / '+this.ListData[0]?.subject_name
    this.dataSource = new MatTableDataSource(this.ListData);
    setTimeout(()=>
    this.dataSource.paginator = this.paginator)
    this.dataSource.sort = this.sort;
  }
  applyFilter(filterValue){
    this.dataSource.filter = filterValue.trim().toLowerCase();
    if (this.dataSource.paginator) {
        this.dataSource.paginator.firstPage();
    }
  }
  }
  

