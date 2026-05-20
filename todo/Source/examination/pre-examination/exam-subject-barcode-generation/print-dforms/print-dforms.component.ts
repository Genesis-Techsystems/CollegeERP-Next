import { Component, OnInit, ViewChild } from '@angular/core';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { ActivatedRoute, Router } from '@angular/router';
import { ParametersService } from 'app/main/services/parameters.service';
import {Location} from '@angular/common';

@Component({
  selector: 'app-print-dforms',
  templateUrl: './print-dforms.component.html',
  styleUrls: ['./print-dforms.component.scss']
})
export class PrintDformsComponent implements OnInit {
  displayedColumns: string[] = ['id', 'admissionNumber', 'firstName', 'subjectCode','barcode','signature'];
  dataSource: MatTableDataSource<any>;
  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild(MatSort) sort: MatSort;
  data: any;
  collegeName: any;
  details: any;
  groupName: any;
  orgCode = '';
  Logo;


  constructor(
    private router: Router,private paramaters:ParametersService,
    private _location: Location,
    private route: ActivatedRoute) {
      this.orgCode = localStorage.getItem('orgCode')
}

ngOnInit(): void {
  if(this.paramaters.dFormData != null){
    this.data = this.paramaters.dFormData;
    this.details=this.data[0].data;
    this.groupName =this.data[0].groupName;
    this.Logo = this.data[0].Logo;
  }else{
    this.goBack();
  }

//  this.collegeName:localStorage.getItem('')
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
    this.router.navigate(['admin-examination-management/admin-pre-examinations/subject-barcode'],
    )
    let queryparams = [
      {
        collegeId:this.data.collegeId,
        academicYearId:this.data.academicYearId,
        courseId:this.data.courseId,
        courseGroupId:this.data.courseGroupId,
        courseYearId:this.data.courseYearId,
        examId:this.data.examId,
        studentId:this.data.studentId,
        subjectId:this.data.subjectId,
        regulationId:this.data[0]?.regulationId
      }
    ]
    this.paramaters.dFormData = queryparams;
  }
  // goBack(): void{
  //   let queryparams = [
  //     {
  //       collegeId:this.data.collegeId,
  //       academicYearId:this.data.academicYearId,
  //       courseId:this.data.courseId,
  //       courseGroupId:this.data.courseGroupId,
  //       courseYearId:this.data.courseYearId,
  //       examId:this.data.examId,
  //       studentId:this.data.studentId,
  //       subjectId:this.data.subjectId,
  //     }
  //   ]
  //   this.paramaters.dFormData = queryparams;
  //   this._location.back();
  // }
  goBack(): void{
    this.router.navigate(['admin-examination-management/admin-pre-examinations/exam-forms'],)
    let queryparams = [
      {
        collegeId:this.data[0]?.collegeId,
        academicYearId:this.data[0]?.academicYearId,
        courseId:this.data[0]?.courseId,
        courseGroupId:this.data[0]?.courseGroupId,
        courseYearId:this.data[0]?.courseYearId,
        examId:this.data[0]?.examId,
        studentId:this.data[0]?.studentId,
        subjectId:this.data[0]?.subjectId,
        regulationId:this.data[0]?.regulationId
      }
    ];
    this.paramaters.dFormData = queryparams;
    // this._location.back();
  }
}
