import { Component, ElementRef, OnInit, ViewChild, ViewEncapsulation } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatDialog } from '@angular/material/dialog';
import { fuseAnimations } from '@fuse/animations';
import { MatRadioChange } from '@angular/material/radio';
import { Book, BookDetail, omrDetail } from 'app/main/models/books';
import { Observable, ReplaySubject, Subject } from 'rxjs';
import { FormControl, FormGroup, FormBuilder, Validators } from '@angular/forms';
import { CONSTANTS } from 'app/main/common/constants';
import { SnotifyService } from 'ng-snotify';
import { CrudService } from 'app/main/services/crud.service';
import { NgxSpinnerService } from 'ngx-spinner';
import { GenericFunctions } from 'app/main/common/generic-functions';
import { Router } from '@angular/router';
import { map, startWith, takeUntil } from 'rxjs/operators';
import { $ } from 'protractor';
import { isNumber } from 'lodash';
import { ConfirmModalComponent } from './confirm-modal/confirm-modal.component';
import { EditUnivExamAnswerPaperBagsComponent } from './edit-univ-exam-answer-paper-bags/edit-univ-exam-answer-paper-bags.component';

@Component({
  selector: 'app-univ-exam-answer-paper-bags',
  templateUrl: './univ-exam-answer-paper-bags.component.html',
  styleUrls: ['./univ-exam-answer-paper-bags.component.scss']
})
export class UnivExamAnswerPaperBagsComponent implements OnInit {

  // displayedColumns: string[] = ['id','bagName','OmrSeialNo','actions'];
  displayedColumns: string[] = ['id', 'bagName', 'stdFirstName','subjectName', 'actions'];
  dataSource: MatTableDataSource<any>;
  // matColumns: string[] = ['orgCode', 'campusCode', 'campusName', 'districtName'];
  DuplicatedataSource: MatTableDataSource<any>
  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild(MatSort) sort: MatSort;
  myControl1 = new FormControl();

  public filteredOmrs: ReplaySubject<any[]> = new ReplaySubject<any[]>(1);
  public bookFilterCtrl: FormControl = new FormControl();
  private _onDestroy = new Subject<void>();
  books: any[] = [];
  @ViewChild('barcode') barcode: ElementRef;
  subjectCodeOptions: Observable<BookDetail[]>;

  private UnivExamBagsUrl = CONSTANTS.UnivExamBagsUrl;
  private addListUnivExamAnswerPaperBagsUrl = CONSTANTS.addListUnivExamAnswerPaperBagsUrl;
  private univExamAnswerPaperBagsUrl = CONSTANTS.univExamAnswerPaperBagsUrl;
  private searchByExamOmrSerialNoUrl = CONSTANTS.searchByExamOmrSerialNoUrl;
  private isActive = CONSTANTS.isActive;

  examBagsList = [];
  campus: any = {};
  filtersDetailsList: any;
  CollegesListDetails: any;
  courses: any;
  staffForm: FormGroup;
  academicYearsList: any;
  searchExams: any[];
  examsList: any[];
  academicYears: any[];
  examData: any[];
  examsLists: any[];
  panelOpenState = true;
  step = 0;
  univExamBags = [];
  examsName: any;
  academicYearName: any;
  courseName: any;
  bagSerialNo: any;
  examTimetableId: any;
  searchExamOmrs = [];
  searchExamOmrsList = [];
  selectedOmrDetails = [];
  check = 1;
  flag: boolean = false;
  searchOmr = [];
  searchOmrList = [];
  examlCenterListData=[];

  constructor(private dialog: MatDialog, private snotifyService: SnotifyService, private genericFunctions: GenericFunctions,
    private crudService: CrudService, private spinner: NgxSpinnerService, public router: Router, private formBuilder: FormBuilder,) {

    // this.getFiltersList();
    this.getExamBags();
  }

  // tslint:disable-next-line:typedef
  ngOnInit() {
    this.staffForm = this.formBuilder.group({
      academicYearId: ['',],
      courseId: ['',],
      examId: ['',],
      univExamBagId: ['', Validators.required],
      examOmrId: ['']

    });
    this.dataSource = new MatTableDataSource(this.examBagsList);
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
    this.searchOmr.push({ bookTitle: 'Search by Omr Serail No' });
    this.filteredOmrs.next(this.searchOmr.slice());
    this.searchOmr = [];
    this.filteredOmrs.next(this.searchOmr.slice());
    this.subjectCodeOptions = this.myControl1.valueChanges
      .pipe(
        startWith<string | omrDetail>(''),
        map(value => typeof value === 'string' ? value : value.examOmrId),
        map(name => name ? this._filter(name, 'code') : this.searchOmr.slice())
      );

  }
  private _filter(name: any, arg1: string): any {
    throw new Error('Method not implemented.');
  }
  getExamBags() {
    this.examlCenterListData=[]
    this.univExamBags=[]
    this.crudService.listDetailsById(this.UnivExamBagsUrl, 'true', this.isActive)
      .subscribe(result => {
        if (result.statusCode === 200) {
          if (result.data.resultList && result.data.resultList !== '') {
            this.univExamBags = result.data.resultList;
            this.examlCenterListData=this.univExamBags
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
        if (error.error.statusCode === 401) {
          this.snotifyService.error(error.error.message, 'Error!');
          this.genericFunctions.logOut(this.router.url);
        } else {
          this.snotifyService.error(CONSTANTS.message.CON_ERROR, 'Error!');
        }
      });
  }
  onKey(event: any) {
    this.searchOmr = [];
    this.filteredOmrs.next(this.searchOmr.slice());
    // if (this.barcode.nativeElement.value.includes('NaN')){
    //   this.barcode.nativeElement.value = this.barcode.nativeElement.value.split('NaN')[1];
    // }
  }

  // tslint:disable-next-line:typedef
  OnDestroy() {
    this._onDestroy.next();
    this._onDestroy.complete();
  }
  filterBook(): void {
    if (!this.searchOmr) {
      return;
    }
    // get the search keyword
    let search = this.bookFilterCtrl.value;
    if (!search) {
      this.filteredOmrs.next(this.searchOmr.slice());
      return;
    } else {
      search = search.toLowerCase();
    }
    // filter the banks
    this.filteredOmrs.next(
      this.searchOmr.filter(x => x.bookTitle.toLowerCase().indexOf(search) > -1)
    );
  }
  myBookSearch(): void {
    this.searchOmr = [];
    this.searchOmr.push({ bookTitle: 'Search by Book Title or with Accession No' });
    this.filteredOmrs.next(this.searchOmr.slice());
  }

  enteredOmr(event): void {
    
    this.searchOmr = [];
    this.searchOmrList = []
    this.filteredOmrs.next(this.searchOmr.slice());
    if (event.target.value.length > 2) {
      /*----------- Books Search -----------*/
      this.crudService.listByIds(this.searchByExamOmrSerialNoUrl, event.target.value, 'query')
        .subscribe(result => {
          if (result.statusCode === 200) {
            if (result.data && result.data !== '') {
              this.searchOmr = result.data;
              this.filteredOmrs.next(this.searchOmr.slice());
              this.searchOmrList = this.searchOmr.filter(x => (x.omrSerialNo == event.target.value))
              if (this.searchOmrList.length > 0) {
                this.filteredOmrs.next([].slice());
                this.filteredOmrs.next(this.searchOmrList.slice());
                // this.selectedOmrDetails.push(this.searchOmrList)

                for (let i = 0; i < this.searchOmrList.length; i++) {
                  this.selectedOmrDetails.push({
                    univExamBagId: this.staffForm.value.univExamBagId,
                    bagSerialNo: this.bagSerialNo,
                    omrSerialNo: this.searchOmrList[i].omrSerialNo,
                    //  filter(x => (x.omrSerialNo === this.searchOmrList[0].omrSerialNo))[0].omrSerialNo,
                    examOmrId: this.searchOmrList[i].examOmrId,
                    subjectCode:this.searchOmrList[i].subjectCode,
                    stdFirstName:this.searchOmrList[i].stdFirstName,
                    subjectName:this.searchOmrList[i].subjectName,
                    hallticketNumber:this.searchOmrList[i].hallticketNumber
                  });
                }

                // if (this.selectedOmrDetails.length > 0) {
                //   this.selectedOmrDetails = this.selectedOmrDetails.filter(selectedOmr =>
                //     !this.searchOmrList.find(searchOmr => searchOmr.omrSerialNo === selectedOmr.omrSerialNo)
                //   );
                //   //  for (let index = 0; index < this.selectedOmrDetails.length; index++) {
                //   //  for (let i = 0; i < this.searchOmrList.length; i++) {
                //   // if(this.searchOmrList[i].omrSerialNo==this.selectedOmrDetails[index].omrSerialNo){
                //   //   index--
                //   //   this.selectedOmrDetails.splice(index, 1);
                //   // }
                //   //  }

                //   //  }

                // }
              }
              // else {
              //   this.filteredOmrs.next([].slice());
              //   this.filteredOmrs.next(this.searchOmr.slice());

              // }
             this.selectedOmrDetails = this.selectedOmrDetails.filter((item, index, self) =>
                index === self.findIndex((t) => (
                  t.omrSerialNo === item.omrSerialNo && t.examOmrId === item.examOmrId
                ))
              );
              this.DuplicatedataSource = new MatTableDataSource(this.selectedOmrDetails);
              this.DuplicatedataSource.paginator = this.paginator;
              this.DuplicatedataSource.sort = this.sort;
              this.barcode.nativeElement.value =''
              this.myControl1.setValue('');

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
  }
  /*-------------- SELECTED BOOK DETAILS-------------*/
  displayCode(user?: omrDetail): string | undefined {
    return user ? user.omrSerialNo : undefined;

  }
  // selectedOmr(examOmrId): void{

  // this.staffForm.get('examOmrId').setValue(examOmrId)
  // // book
  // if (examOmrId != null && examOmrId !== '' && examOmrId !== 'undefined'){
  // // this.selectedOmrDetails = [];
  // if (this.searchOmr.filter(x => (x.omrSerialNo === examOmrId.omrSerialNo)).length > 0){
  // this.selectedOmrDetails.push({
  //   univExamBagId:this.staffForm.value.univExamBagId,
  //   bagSerialNo :  this.univExamBags.filter(x=>(x.univExamBagId ==this.staffForm.value.univExamBagId))[0]?.bagSerialNo,
  //   omrSerialNo: this.searchOmr.filter(x => (x.omrSerialNo === examOmrId.omrSerialNo))[0].omrSerialNo,
  //   examOmrId: this.searchOmr.filter(x => (x.omrSerialNo === examOmrId.omrSerialNo))[0].examOmrId,

  // });

  // }
  // this.DuplicatedataSource = new MatTableDataSource(this.selectedOmrDetails);
  // this.DuplicatedataSource.paginator = this.paginator;
  // this.DuplicatedataSource.sort = this.sort;
  // } 
  // this.staffForm.get('examOmrId').setValue('')
  // }
  selectedExamBag(univExamBagId) {
    this.getDetails();
    this.crudService.listDetailsByTwoIds(this.univExamAnswerPaperBagsUrl, univExamBagId, 'true', 'univExamBags.univExamBagId', this.isActive)
      .subscribe(result => {
        if (result.statusCode === 200) {
          if (result.data.resultList && result.data.resultList !== '') {
            this.snotifyService.success(result.message, 'Success!');
            this.examBagsList = result.data.resultList;
            this.dataSource = new MatTableDataSource(this.examBagsList);
            this.dataSource.paginator = this.paginator;
            this.dataSource.sort = this.sort;

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

  deleteOmr(item, index): void {
    if (index > - 1) {
      this.selectedOmrDetails.splice(index, 1);
    }
    this.DuplicatedataSource = new MatTableDataSource(this.selectedOmrDetails);
    this.DuplicatedataSource.sort = this.sort;
  }
  getDetails() {
    this.searchOmr = [];
    this.searchOmrList = []
    this.selectedOmrDetails=[]
    this.filteredOmrs.next(this.searchOmr.slice());
    this.flag = true
    this.headerData();

  }
  headerData() {
    // this.examsName = this.examsList.filter(x => (x.fk_exam_id == this.staffForm.value.examId))[0]?.exam_name
    // this.academicYearName = this.academicYears.filter(x => (x.fk_academic_year_id == this.staffForm.value.academicYearId))[0]?.academic_year
    // this.courseName = this.courses.filter(x => (x.fk_course_id == this.staffForm.value.courseId))[0]?.course_code
    this.bagSerialNo = this.univExamBags.filter(x => (x.univExamBagId == this.staffForm.value.univExamBagId))[0]?.bagSerialNo
  }


  openDialog(event:Event) {
    if (event instanceof MouseEvent) {
    const dialogRef = this.dialog.open(ConfirmModalComponent, {
      width: '650px',
      data: this.selectedOmrDetails
    });

    dialogRef.afterClosed().subscribe(details => {
      if (details != null && details !== '') {
      this.spinner.show();
      this.crudService.add(this.addListUnivExamAnswerPaperBagsUrl, this.selectedOmrDetails)
        .subscribe(result => {
          this.spinner.hide();
          if (result.statusCode === 200) {
            if (result.data && result.data !== '') {
              console.log(result.data);
              if(result.data.existingOmrIds){
                this.snotifyService.info("OMR Serial Number Already Exists", 'Success!');
                this.selectedExamBag(this.staffForm.value.univExamBagId);
              }
              else{
                this.snotifyService.success(result.message, 'Success!');
                this.selectedExamBag(this.staffForm.value.univExamBagId);
              }
              
            }
          } else {
            this.snotifyService.error(result.message, 'Error!');
          }
        }, error => {
          this.spinner.hide();
          if (error.error.statusCode === 401) {
            this.snotifyService.error(error.error.message, 'Error!');
            this.genericFunctions.logOut(this.router.url);
          } else {
            this.snotifyService.error(CONSTANTS.message.CON_ERROR, 'Error!');
          }
        });
      }
    });
    }
    else{

    }
  }
  editDialog(row) {
    const dialogRef = this.dialog.open(EditUnivExamAnswerPaperBagsComponent, {
        width: '750px',
        data: row
    });

    dialogRef.afterClosed().subscribe(details => {
        if (details != null && details !== '') {
            details.univExamAnswerPaperBagId=row.univExamAnswerPaperBagId
            details.examOmrId=row.examOmrId
            details.univExamBagId=row.univExamBagId

            this.updateData(details)
        }
    });
}
updateData(updateList) {
  this.spinner.show();
    this.crudService.updateDetails(this.univExamAnswerPaperBagsUrl, updateList,updateList.univExamAnswerPaperBagId,'univExamAnswerPaperBagId')
        .subscribe(result => {
            this.spinner.hide();
            if (result.statusCode === 200) {
                if (result.success) {
                    this.snotifyService.success(result.message, 'Success!');
                    this.selectedExamBag(this.staffForm.value.univExamBagId);
                } else {
                    this.snotifyService.info(result.message, 'Info!');
                }
            } else {
                this.snotifyService.error(result.message, 'Error!');
            }
        }, error => {
            this.spinner.hide();
            if (error.error.statusCode === 401) {
                this.snotifyService.error(error.error.message, 'Error!');
                this.genericFunctions.logOut(this.router.url);
            } else {
                this.snotifyService.error(CONSTANTS.message.CON_ERROR, 'Error!');
            }
        });
}
serachExamBag(value){
  this.examlCenterListData=[]
  this.serachExamBagData(value)
}

serachExamBagData(value: string){
let filter = value.toLowerCase();
for ( let i = 0 ; i < this.univExamBags.length; i++ ) {
    let option = this.univExamBags[i];
    if (option.bagSerialNo.toLowerCase().indexOf(filter) >= 0) {
        this.examlCenterListData.push( option );
    }
}
}

  applyFilter(filterValue: string) {
    this.dataSource.filter = filterValue.trim().toLowerCase();

    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
  }
  clear($event: MatRadioChange) {

  }
}

