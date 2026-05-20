import { Component, OnInit, ViewChild } from '@angular/core';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { ActivatedRoute, Router } from '@angular/router';
import { ParametersService } from 'app/main/services/parameters.service';

@Component({
  selector: 'app-print-attendence-marking-sheet',
  templateUrl: './print-attendence-marking-sheet.component.html',
  styleUrls: ['./print-attendence-marking-sheet.component.scss']
})
export class PrintAttendenceMarkingSheetComponent implements OnInit {
  displayedColumns: string[] = ['id', 'admissionNumber', 'firstName', 'subjectCode','barcode','signature'];
  dataSource: MatTableDataSource<any>;
  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild(MatSort) sort: MatSort;
  params: any;
  data: any;

  constructor(
    private router: Router,private paramaters:ParametersService,
    private route: ActivatedRoute) {
}

ngOnInit(): void {
  this.route.queryParams
  .subscribe(params => {
    this.params=params
    this.data = JSON.parse(params.data) 
    this.dataSource = new MatTableDataSource<any>(this.data);
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
 });
}
tConvert(time): any{
  if (time !== null && time !== undefined){
     time = time.toString ().match (/^([01]\d|2[0-3])(:)([0-5]\d)(:[0-5]\d)?$/) || [time];
     if (time.length > 1) { // If time format correct
       time = time.slice (1);  // Remove full string match value
       time[5] = +time[0] < 12 ? 'AM' : 'PM'; // Set AM/PM
       time[0] = +time[0] % 12 || 12; // Adjust hours
     }
     time = time[0] + time[1] + time[2] + ' ' + time[5];
     return time; 
  }
}
printPage(_printsection:any){
    window.print()
  }
  printBack(){
    this.router.navigate(['admin-examination-management/admin-post-examination/exam-attendance-marking'],
    )
    let queryparams = [
      {
        courseId: this.params.value.courseId,
        collegeId: this.params.value.collegeId,
        academicYearId: this.params.value.academicYearId,
        roomId: this.params.value.roomId,
        employeeId: this.params.value.employeeId,
        courseGroupId: this.params.value.courseGroupId,
        courseYearId: this.params.value.courseYearId,
        examId: this.params.value.examId,
        examSessionId: this.params.value.examSessionId,
        examDate: this.params.value.examDate,
      }
    ]
    this.paramaters.examAttendanceMarking = queryparams;
  }
}