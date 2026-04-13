import { Component, Inject, OnInit, ViewChild } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
@Component({
  selector: 'app-subjects-modal',
  templateUrl: './subjects-modal.component.html',
  styleUrls: ['./subjects-modal.component.scss']
})
export class SubjectsModalComponent implements OnInit {

  displayedColumns: string[] = [ 'id', 'subjectName', 'subjectTypeCode', 'subCredits', 'regulationName'];
  dataSource: MatTableDataSource<any>;
 
  @ViewChild(MatSort) sort: MatSort;
  panelOpenState = false;

  subjectsList: any[] = [];

  constructor(private dialogRef: MatDialogRef<any>,
              @Inject(MAT_DIALOG_DATA) public data) {
  }

  // tslint:disable-next-line:typedef
  ngOnInit() {  
    if (!this.isEmptyObject(this.data)) {
      this.subjectsList = this.data;
    }
    this.dataSource = new MatTableDataSource(this.subjectsList);
    this.dataSource.sort = this.sort;    
      
  }

    // tslint:disable-next-line:typedef
    isEmptyObject(obj) {
      return (obj && (Object.keys(obj).length === 0));
  }

  // tslint:disable-next-line:typedef
  applyFilter(filterValue: string) {
      this.dataSource.filter = filterValue.trim().toLowerCase();

      if (this.dataSource.paginator) {
          this.dataSource.paginator.firstPage();
      }
  }


   
}
