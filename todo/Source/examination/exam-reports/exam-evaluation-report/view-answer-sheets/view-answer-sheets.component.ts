import { Location } from '@angular/common';
import { Component, ElementRef, Inject, OnInit, ViewChild } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { Router } from '@angular/router';
import { CONSTANTS } from 'app/main/common/constants';
import { GenericFunctions } from 'app/main/common/generic-functions';
import { CrudService } from 'app/main/services/crud.service';
import { ParametersService } from 'app/main/services/parameters.service';
import { SnotifyService } from 'ng-snotify';
import { NgxSpinnerService } from 'ngx-spinner';

@Component({
  selector: 'app-view-answer-sheets',
  templateUrl: './view-answer-sheets.component.html',
  styleUrls: ['./view-answer-sheets.component.scss']
})
export class ViewAnswerSheetsComponent implements OnInit {
  displayedColumns: string[] = ['omrSerialNo','evaluatedTotalMarks'];
  dataSource: MatTableDataSource<any>;
  searchText=''
  @ViewChild('excelTable', { static: false }) excelTable: ElementRef;
  trafoexternalItem="Student AnswerPaper Report";
 private getstudentanswerpapersUrl = CONSTANTS.getstudentanswerpapersUrl;  
 private collegeCrudUrl = CONSTANTS.collegeCrudUrl;
 private isActive = CONSTANTS.isActive;
 @ViewChild(MatPaginator) paginator: MatPaginator;
 @ViewChild(MatSort) sort: MatSort;
  List=[];
  data:any
  orgCode = '';
  collegesLogoList=[];
  Logo;
  constructor(private formBuilder: FormBuilder, private snotifyService: SnotifyService,
    private crudService: CrudService, private spinner: NgxSpinnerService, private router: Router,
    private genericFunctions: GenericFunctions, private parameterservice:ParametersService,private location:Location) { }

  ngOnInit(): void {
    this.orgCode = localStorage.getItem('orgCode');
    if (this.parameterservice.evlauationStudentData) {
       this.data=this.parameterservice.evlauationStudentData 
    }
    else{
    this.location.back();
    }
    this.dataSource = new MatTableDataSource(this.data);
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
    // this.getList()
    this.getCollegeLogo()
  }
  goBack(){
    this.router.navigate(['admin-examination-management/admin-exam-reports/exam-evaluation-report'])
    this.parameterservice.paramsList = this.parameterservice.paramsList;

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
  getCollegeLogo(): void {
    this.collegesLogoList = [];
    /*----------- COLLEGES -----------*/
    this.crudService.listDetailsById(this.collegeCrudUrl, 'true', this.isActive)
      .subscribe(result => {
        if (result.statusCode === 200) {
          if (result.data.resultList && result.data.resultList !== '') {
            this.collegesLogoList = result.data.resultList;
            //  for(let i=0; i<this.colleges.length; i++){
            this.Logo = this.collegesLogoList[0].logo
            //  }    

          } else {
            this.snotifyService.success(result.message, 'Success!');
          }
        } else {
          this.snotifyService.error(result.message, 'Error!');
        }
      }, error => {
        if (error.error.statusCode === 401) {
          this.snotifyService.error(error.error.message, 'Error!');
          this.genericFunctions.logOut(this.router.url);
        } else {
          this.snotifyService.error(CONSTANTS.message.CON_ERROR, 'Error!');
        }
      });
  }
  exportAsExcel() 
  {
      const uri = 'data:application/vnd.ms-excel;base64,';
      const template = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40"><head><!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>{worksheet}</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]--></head><body><table>{table}</table></body></html>`;
      const base64 = function(s) { return window.btoa(unescape(encodeURIComponent(s))) };
      const format = function(s, c) { return s.replace(/{(\w+)}/g, function(m, p) { return c[p]; }) };
      const table = this.excelTable.nativeElement;
      const ctx = { worksheet: 'Worksheet', table: table.innerHTML };
      const link = document.createElement('a');
          link.download = `${this.trafoexternalItem}.xls`;
          link.href = uri + base64(format(template, ctx));
          link.click();
  
}
printPage() {
  setTimeout(() => {
    window.print();
  }, 500);

}
  }
  


