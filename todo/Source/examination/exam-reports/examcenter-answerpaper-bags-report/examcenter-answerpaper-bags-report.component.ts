import {Component, OnInit, ViewChild, ElementRef} from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatDialog } from '@angular/material/dialog';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { CONSTANTS } from 'app/main/common/constants';
import { SnotifyService } from 'ng-snotify';
import { CrudService } from 'app/main/services/crud.service';
import { NgxSpinnerService } from 'ngx-spinner';
import { GenericFunctions } from 'app/main/common/generic-functions';
import { Router } from '@angular/router';
import * as XLSX from 'xlsx';

@Component({
  selector: 'app-examcenter-answerpaper-bags-report',
  templateUrl: './examcenter-answerpaper-bags-report.component.html',
  styleUrls: ['./examcenter-answerpaper-bags-report.component.scss']
})
export class ExamcenterAnswerpaperBagsReportComponent implements OnInit {

 
  displayedColumns: string[] = ['id','bagName','stdFirstName', 'subjectName'];
  dataSource: MatTableDataSource<any>;
  // matColumns: string[] = ['orgCode', 'campusCode', 'campusName', 'districtName'];
 
  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild(MatSort) sort: MatSort;
  @ViewChild('TABLE') excelTable: ElementRef;
  
  private UnivExamBagsUrl = CONSTANTS.UnivExamBagsUrl;
  private univExamAnswerPaperBagsUrl = CONSTANTS.univExamAnswerPaperBagsUrl;
  private isActive = CONSTANTS.isActive;
  MINIO = CONSTANTS.MINIO;
 
  examBagsList= [];
  staffForm: FormGroup;
  panelOpenState = true;
  step = 0;
  univExamBags=[];
  bagSerialNo: any;
  flag: boolean = false;
  selectedBookDetails = [];
  bookDetails = [];
  Logo: any;
  orgCode;
 
constructor(private dialog: MatDialog, private snotifyService: SnotifyService, private genericFunctions: GenericFunctions,
          private crudService: CrudService, private spinner: NgxSpinnerService, public router: Router, private formBuilder: FormBuilder,) {
 
        this.getExamBags();
        this.orgCode = localStorage.getItem('orgCode');
}
 
// tslint:disable-next-line:typedef
ngOnInit() {
  this.staffForm = this.formBuilder.group({
    academicYearId:['',],
    courseId: ['', ],
    examId: ['', ],
    univExamBagId:['', Validators.required],
    examOmrId:['']
   
  });
  this.dataSource = new MatTableDataSource(this.examBagsList);
  this.dataSource.paginator = this.paginator;
  this.dataSource.sort = this.sort;
 
}

getExamBags(){
  this.crudService.listDetailsById(this.UnivExamBagsUrl, 'true', this.isActive )
  .subscribe(result => {
      if (result.statusCode === 200) {
          if (result.data.resultList && result.data.resultList !== '') {
              this.univExamBags = result.data.resultList;
              // if (this.univExamBags.length > 0) {
              //   this.staffForm.get('univExamBagId').setValue(this.univExamBags[0].univExamBagId);
              //   this.headerData();
              // }
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
selectedExamBag(){
  this.flag=false;
  this.examBagsList = [];
  this.dataSource = new MatTableDataSource([]);
}
getList(){
 this.flag=false;
 this.examBagsList = [];
 this.dataSource = new MatTableDataSource([]);
  this.crudService.listDetailsByTwoIds(this.univExamAnswerPaperBagsUrl,this.staffForm.value.univExamBagId,'true','univExamBags.univExamBagId',this.isActive)
  .subscribe(result => {
      if (result.statusCode === 200) {
          if (result.data.resultList && result.data.resultList !== '') {
              this.examBagsList = result.data.resultList;
              this.dataSource = new MatTableDataSource(this.examBagsList);
              this.dataSource.paginator = this.paginator;
              this.dataSource.sort = this.sort;
              this.flag=true;
              this.getDetails();
              this.snotifyService.success(result.message, 'Success!');             
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
 
 
  getDetails(){
 this.headerData();
  }
    headerData(){
      this.bagSerialNo =  this.univExamBags.filter(x=>(x.univExamBagId ==this.staffForm.value.univExamBagId))[0]?.bagSerialNo
    }
// tslint:disable-next-line:typedef
  applyFilter(filterValue: string) {
  this.dataSource.filter = filterValue.trim().toLowerCase();
 
  if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
  }
}
exportAsExcel() {
  const ws: XLSX.WorkSheet = XLSX.utils.table_to_sheet(this.excelTable.nativeElement);
  const wb: XLSX.WorkBook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');

  /* save to file */
  XLSX.writeFile(wb, 'Answer Paper Bags Report.xlsx');

}
printPage() {
  window.print()
}
}
