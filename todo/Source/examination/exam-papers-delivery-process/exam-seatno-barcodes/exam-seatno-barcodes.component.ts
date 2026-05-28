import { Component, OnInit, ViewChild } from '@angular/core';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { CONSTANTS } from 'app/main/common/constants';
import { GenericFunctions } from 'app/main/common/generic-functions';
import { SnotifyService } from 'ng-snotify';
import { CrudService } from 'app/main/services/crud.service';
import { Router } from '@angular/router';
import { NgxSpinnerService } from 'ngx-spinner';
import { MatTableDataSource } from '@angular/material/table';
import { MatSort } from '@angular/material/sort';
import { MatPaginator } from '@angular/material/paginator';

@Component({
  selector: 'app-exam-seatno-barcodes',
  templateUrl: './exam-seatno-barcodes.component.html',
  styleUrls: ['./exam-seatno-barcodes.component.scss']
})
export class ExamSeatnoBarcodesComponent implements OnInit {

  displayedColumns: string[] = ['id', 'hallTicketNo', 'omrSerialNo', 'ecSeatNo', 'ExamDate', 'subject', 'actions'];
  dataSource: MatTableDataSource<any>;

  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild(MatSort) sort: MatSort;
  panelOpenState = true;

  examSeatBarcodeForm: FormGroup;
  step = 0;
  examGroupList = [];
  examGroups: any = {};
  item: any = {};
  universities = [];
  filtersDetailsList =[]
  filtersdata=[]
  regulationData=[]
  courseData=[];
  regData = [];
  flag = false;
  selectedData = [];
  examDates = [];
  subjectsList = [];
  subjects = [];
  subjectsData = [];

  private getBarcodeDetailsUrl = CONSTANTS.getBarcodeDetailsUrl;

  constructor(private formBuilder: FormBuilder, private snotifyService: SnotifyService,
              private crudService: CrudService, private spinner: NgxSpinnerService, private router: Router,private genericFunctions: GenericFunctions) {

  }

  // tslint:disable-next-line:typedef
  ngOnInit() {
    this.examSeatBarcodeForm = this.formBuilder.group({
        ecStdSeatNo: ['', Validators.required],
        examDate: ['', Validators.required],
        subjectId: ['', Validators.required]
      }); 
    this.dataSource = new MatTableDataSource<any>(this.selectedData);
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }
  getfilterDetails(){
    this.examSeatBarcodeForm.get('examDate').setValue('');
    this.examSeatBarcodeForm.get('subjectId').setValue('');
    this.filtersDetailsList = [];
    this.examDates = [];
    this.subjectsList = [];
    this.subjects = [];
    this.subjectsData = [];
    if(this.examSeatBarcodeForm.value.ecStdSeatNo?.length > 4){
    this.spinner.show()
    let request = [
      {paramName: 'in_ec_seat_no', paramValue: this.examSeatBarcodeForm.value.ecStdSeatNo},
    ];
    this.crudService.getDetailsByRequest(this.getBarcodeDetailsUrl, '', request, '&')
  .subscribe(result =>  {
      if (result.statusCode === 200) {
        this.spinner.hide()
        if (result.data && result.data !== '' && result.data.result.length > 0) {
           this.filtersDetailsList = result.data.result[0];
            const examDates = this.filtersDetailsList.map(({ exam_date }) => exam_date);
        this.examDates = this.filtersDetailsList.filter(({ exam_date }, index) =>
        !examDates.includes(exam_date, index + 1));
        } else {
          this.snotifyService.success(result.message, 'Success!');
        }
      } else {
        this.spinner.hide()
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
}

selectedExamDate(examDate){
  this.examSeatBarcodeForm.get('subjectId').setValue('');
  this.subjectsList = [];
  this.subjects = [];
  this.subjectsData = [];
  this.subjectsList = this.filtersDetailsList.filter(x => (x.exam_date === this.examSeatBarcodeForm.value.examDate));
  const subjectsData = this.subjectsList.map(({ pk_subject_id }) => pk_subject_id);
        this.subjects = this.subjectsList.filter(({ pk_subject_id }, index) =>
        !subjectsData.includes(pk_subject_id, index + 1));
  this.subjectsData = this.subjects;
}

selectedSubject(){

}

  // tslint:disable-next-line:typedef
  applyFilter(filterValue: string) {
      this.dataSource.filter = filterValue.trim().toLowerCase();

      if (this.dataSource.paginator) {
          this.dataSource.paginator.firstPage();
      }
  }

addToTable() {
  const formValue = this.examSeatBarcodeForm.value;

  const matchedData = this.filtersDetailsList.filter((x: any) =>
    x.exam_date == formValue.examDate &&
    x.pk_subject_id == formValue.subjectId
  );
  if (matchedData.length > 0) {
    this.selectedData.push(...matchedData);
    this.selectedData = [...this.selectedData];
  }
  this.dataSource = new MatTableDataSource<any>(this.selectedData);
  this.dataSource.paginator = this.paginator;
  this.dataSource.sort = this.sort;

  this.examSeatBarcodeForm.reset();
}

deleteRow(index: number) {
  this.selectedData.splice(index, 1);
  this.selectedData = [...this.selectedData];
  this.dataSource = new MatTableDataSource<any>(this.selectedData);
  this.dataSource.paginator = this.paginator;
  this.dataSource.sort = this.sort;
}
printStickers(){
        JSON.stringify(this.selectedData)
        this.router.navigate(['admin-examination-management/exam-papers-delivery-process/exam-seatno-barcodes/print-exam-seatno-stickers'],
        {
            queryParams: {
            data: JSON.stringify(this.selectedData)
            }
        });
    }
printStickersNew(){
        JSON.stringify(this.selectedData)
        this.router.navigate(['admin-examination-management/exam-papers-delivery-process/exam-seatno-barcodes/print-exam-seatno-stickers-gu'],
        {
            queryParams: {
            data: JSON.stringify(this.selectedData)
            }
        });
}
}
