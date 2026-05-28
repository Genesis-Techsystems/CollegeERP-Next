import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatDialog } from '@angular/material/dialog';
import { FormGroup, FormBuilder, Validators, FormControl } from '@angular/forms';
import { CONSTANTS } from 'app/main/common/constants';
import { SnotifyService } from 'ng-snotify';
import { CrudService } from 'app/main/services/crud.service';
import { NgxSpinnerService } from 'ngx-spinner';
import { GenericFunctions } from 'app/main/common/generic-functions';
import { Router } from '@angular/router';
import { ParametersService } from 'app/main/services/parameters.service';
import { MatRadioChange } from '@angular/material/radio';
import { ReplaySubject } from 'rxjs';
import { ScanBundleDetailsModalComponent } from '../../scan-bundles/scan-bundle-details/scan-bundle-details-modal/scan-bundle-details-modal.component';

@Component({
  selector: 'app-scan-bundle-details-new',
  templateUrl: './scan-bundle-details-new.component.html',
  styleUrls: ['./scan-bundle-details-new.component.scss']
})
export class ScanBundleDetailsNewComponent implements OnInit {

  private getCollegeExamCenters = CONSTANTS.getCollegeExamCenters;
  private getScanBundleOmrDetails=CONSTANTS.getScanBundleOmrDetails
  private getDetailsByCourseYearIdUrl = CONSTANTS.getDetailsByCourseYearIdUrl;
  private getDetailsByRegulationIdUrl = CONSTANTS.getDetailsByRegulationIdUrl;
  private getSubjectByIdUrl = CONSTANTS.getSubjectByIdUrl;
  private UnivExamScanbundleUrl = CONSTANTS.UnivExamScanbundleUrl;
  private getExamCenterStudentDetailsUrl = CONSTANTS.getExamCenterStudentDetailsUrl;
  private UnivExamScanbundleDetailsUrl = CONSTANTS.UnivExamScanbundleDetailsUrl;
  private getExamMasterDetailsUrl = CONSTANTS.getExamMasterDetailsUrl;
  private getScanBundleDetailsUrl = CONSTANTS.getScanBundleDetailsUrl;
  private saveUnivExamScanbundleDetailsUrl = CONSTANTS.saveUnivExamScanbundleDetailsUrl;
  private searchExamOmrSerialNoUrl = CONSTANTS.searchExamOmrSerialNoUrl;

  filtersDetailsList = [];
  CollegesListDetails = [];
  courses = [];
  academicYears = [];
  searchExams = [];
  examsList = [];
  academicYearsList = [];
  examData = [];
  examsLists = [];
  univExamCenters = [];
  examCenterColleges = [];
  examsubjectStudents = [];
  subjectsList = [];
  subjects = [];
  subjectsData = [];
  examSubjectstd = [];
  examCenterStudents = [];

  panelOpenState = true;
  step = 0;
  staffForm: FormGroup;
  flag = false;
  checksubject: boolean;
  selectedCount: number;
  selectedStudents: any[];
  courseYearsList = [];
  courseYears = [];
  regulationFilterList = [];
  regulationList = [];
  examCenterFilters = [];
  examCenterDetails = [];
  ExamCentersColleges = [];
  ExamCentersCollegesList = [];
  regulationSubjects = [];
  regulationDetailsList = [];
  examGroupList = [];
  examGroups = [];
  dataDetails = '';
  examCenterName: any;
  examCenterCollege: any;
  examGroup: any;
  courseYear: any;
  regulationCode: any;
  subjectCode: any;
  subjectName: any;
  bundleName: any;
  scanBundlesList = [];
  filtersSetArray = [];
  check = 1;
  searchOmr = [];
  searchOmrList = [];
  selectedOmrDetails = [];
  examCourseFiltersList = [];
  courseYearsDetails = [];
  regulations = [];

  displayedColumns: string[] = ['id', 'bundleNumber','omrSerialNo', 'student',  'Actions'];
  scannedDisplayedColoumns: string[] = ['id', 'ecSeatNo', 'omrSerialNo', 'stdFirstName', 'actions'];
  dataSource: MatTableDataSource<any>;

  DuplicatedataSource: MatTableDataSource<any>
  // @ViewChild(MatPaginator) paginator2: MatPaginator;
  @ViewChild(MatSort) sort2: MatSort;
  // @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild('paginator1') paginator!: MatPaginator;
  @ViewChild('paginator2') paginator2!: MatPaginator;
  @ViewChild(MatSort) sort: MatSort;
  public filteredOmrs: ReplaySubject<any[]> = new ReplaySubject<any[]>(1);
  @ViewChild('barcode') barcode: ElementRef;
  myControl1 = new FormControl();
  @ViewChild('barcode', { static: false }) barcodeInput!: ElementRef;

  constructor(private snotifyService: SnotifyService, private genericFunctions: GenericFunctions, private dialog: MatDialog,
    private crudService: CrudService, private spinner: NgxSpinnerService, public router: Router, private formBuilder: FormBuilder,
    private parameterService: ParametersService) {

  }

  ngOnInit(): void {
    // this.staffForm = this.formBuilder.group({
    //   academicYearId: ['', Validators.required],
    //   examGroupId: ['', Validators.required],
    //   // courseId: ['', Validators.required],
    //   univExamcenterId: [''],
    //   courseYearId: ['', Validators.required],
    //   regulationId: ['', Validators.required],
    //   subjectId: ['', Validators.required],
    //   examId: [''],
    //   univExamScanbundleId: ['', Validators.required],
    // });
      this.staffForm = this.formBuilder.group({
    academicYearId:['', Validators.required],
    examGroupId:['', Validators.required],
    examCenterId: ['', Validators.required],
    examDate: ['', Validators.required],
    questionPaperCode: ['', Validators.required]
  });
    this.dataSource = new MatTableDataSource(this.examCenterStudents);
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
    if(this.parameterService.examScanBundleDetails && this.parameterService.examScanBundleDetails.length > 0){
       this.filtersSetArray = this.parameterService.examScanBundleDetails;
               this.getexamScanDetails();

    }
    else{
    this.router.navigate(['admin-examination-management/exam-papers-delivery-process/exam-scan-bundle-print'])

    }
  }
  goBack(){
    this.parameterService.examScanBundlesFiltersData = this.filtersSetArray;
    this.router.navigate(['admin-examination-management/exam-papers-delivery-process/exam-scan-bundle-print'])
  }
  ngAfterViewInit() {
  this.dataSource.paginator = this.paginator;
  this.DuplicatedataSource.paginator = this.paginator2;
  }
  getexamScanDetails(){
     this.selectedCount = 0;
    this.examsubjectStudents = [];
    this.examSubjectstd = [];
    this.flag = false;
    this.selectedOmrDetails = [];
    this.DuplicatedataSource = new MatTableDataSource(this.selectedOmrDetails);
    this.DuplicatedataSource.paginator = this.paginator2;
    this.DuplicatedataSource.sort = this.sort2;
    this.headerData();
    this.selectedData();
    this.examCenterStudents = [];
    this.selectedStudents = [];
    this.dataSource = new MatTableDataSource([]);
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
    // if(this.staffForm.valid){
  this.spinner.show();
  let request = [
    { paramName: 'in_flag', paramValue: 'scan_bundle_omr_details' },
    { paramName: 'in_univ_examcenter_id', paramValue: this.filtersSetArray[0]?.examCenterId },
    { paramName: 'in_exam_group_id', paramValue: this.filtersSetArray[0]?.examGroupId},
    { paramName: 'in_college_id', paramValue: 0 },
    { paramName: 'in_course_id', paramValue: 0 },
    { paramName: 'in_course_group_id', paramValue: 0 },
    { paramName: 'in_course_year_id', paramValue: 0 },
    { paramName: 'in_academic_year_id', paramValue: this.filtersSetArray[0]?.academicYearId },
    { paramName: 'in_regulation_id', paramValue: 0 },
    { paramName: 'in_subject_id', paramValue: 0 },
    { paramName: 'in_bundle_number', paramValue: this.filtersSetArray[0]?.bundle_number },
    { paramName: 'in_scan_bundle_id', paramValue: this.filtersSetArray[0]?.pk_univ_exam_scan_bundle_id },
    { paramName: 'in_start_ec_seatno', paramValue: 0 },
    { paramName: 'in_end_ec_seatno', paramValue: 0 },
    { paramName: 'in_exam_date', paramValue: this.filtersSetArray[0]?.examDate },
    { paramName: 'in_questionpaper_code', paramValue: this.filtersSetArray[0]?.questionPaperCode },
    ];
    this.crudService.getDetailsByRequest(this.getScanBundleOmrDetails, '', request, '&')
    .subscribe(result => {
      this.spinner.hide();
      if (result.statusCode === 200) {
        if (result.data && result.data !== '' && result.data.result.length > 0) {
              // this.examCenterStudents = result.data.result[0].filter(x => (x.row_exists === 1));
            this.examCenterStudents = result.data.result[0]
            // this.examSubjectstd = this.examsubjectStudents;
            this.dataSource = new MatTableDataSource(this.examCenterStudents);
            this.dataSource.paginator = this.paginator;
            this.dataSource.sort = this.sort;
            
            } else {
            this.snotifyService.success(result.message, 'Success!');
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
  
 selectedData() {
    this.dataDetails = '';

    if (this.filtersSetArray[0]?.examGroupCode) {
      this.dataDetails = this.filtersSetArray[0]?.examGroupCode;
    }
    if (this.filtersSetArray[0]?.examCenterCode) {
      this.dataDetails = this.dataDetails + ' / ' + this.filtersSetArray[0]?.examCenterCode;
    }
    if (this.filtersSetArray[0]?.examDate) {
      this.dataDetails = this.dataDetails + ' / ' + this.filtersSetArray[0]?.examDate;
    }
    if (this.filtersSetArray[0]?.questionPaperCode) {
      this.dataDetails = this.dataDetails + ' / ' + this.filtersSetArray[0]?.questionPaperCode;
    }
       if (this.filtersSetArray[0]?.scan_bundle_name) {
      this.dataDetails = this.dataDetails + ' / ' + this.filtersSetArray[0]?.scan_bundle_name;
    }
  }
clear($event: MatRadioChange){
        if ($event.value === 2) {
            this.check = 2;
            this.selectedCount = 0;
            this.examsubjectStudents = [];
            this.examSubjectstd = [];
            this.selectedStudents = [];
            this.flag = false;
            this.examCenterStudents = [];
            this.dataSource = new MatTableDataSource([]);
            this.dataSource.paginator = this.paginator;
            this.dataSource.sort = this.sort;
        }
        else{
            this.check = 1;
            this.selectedCount = 0;
            this.examsubjectStudents = [];
            this.examSubjectstd = [];
            this.selectedStudents = [];
            this.flag = false;
            this.examCenterStudents = [];
            this.dataSource = new MatTableDataSource([]);
            this.dataSource.paginator = this.paginator;
            this.dataSource.sort = this.sort;
        }
        
    }
  headerData() {
    this.examsubjectStudents = [];
    this.examSubjectstd = [];
    this.selectedOmrDetails = [];
    this.DuplicatedataSource = new MatTableDataSource(this.selectedOmrDetails);
    this.DuplicatedataSource.paginator = this.paginator2;
    this.DuplicatedataSource.sort = this.sort2;
    this.examGroup = this.examGroups.filter(x => (x.fk_univ_exam_group_id === this.staffForm.value.examGroupId))[0]?.exam_group_code;
    this.courseYear = this.courseYears.filter(x => (x.fk_course_year_id === this.staffForm.value.courseYearId))[0]?.course_year_code;
    this.regulationCode = this.regulations.filter(x => (x.fk_regulation_id === this.staffForm.value.regulationId))[0]?.regulation_code;
    this.subjectCode = this.subjects.filter(x => (x.fk_subject_id === this.staffForm.value.subjectId))[0]?.subject_code;
    this.bundleName = this.scanBundlesList.filter(x => (x.univExamScanbundleId === this.staffForm.value.univExamScanbundleId))[0]?.bundleNumber;
  }
  // tslint:disable-next-line:typedef
  applyFilter(filterValue: string) {
    this.dataSource.filter = filterValue.trim().toLowerCase();

    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
  }
  editDialog(row) {
    const dialogRef = this.dialog.open(ScanBundleDetailsModalComponent, {
      width: '800px',
      data: row
    });
    dialogRef.afterClosed().subscribe(details => {
      if (details != null && details !== '') {
        this.updateDetails(details)
      }
    });
  }
  updateDetails(details) {
    let payload = {
    univExamScanbundleDetId : details.pk_univ_exam_scan_bundle_detail_id,
    isActive : details.isActive,
    reason : details.reason,
    omrSerialNo : details.omr_serial_no,
    examStdDetId : details.fk_exam_std_det_id
    }
    this.spinner.show();
    this.crudService.updateDetails(this.UnivExamScanbundleDetailsUrl, payload, details.pk_univ_exam_scan_bundle_detail_id, 'univExamScanbundleDetId')
      .subscribe(result => {
        this.spinner.hide();
        if (result.statusCode === 200) {
          if (result.success) {
            this.getexamScanDetails();
            this.snotifyService.success(result.message, 'Success!');
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
  // goBack(){
  //   const row = [{
  //         academicYearId : this.staffForm.value.academicYearId,
  //         examGroupId : this.staffForm.value.examGroupId,
  //         courseId : this.staffForm.value.courseId,
  //         courseYearId : this.staffForm.value.courseYearId,
  //         regulationId : this.staffForm.value.regulationId,
  //         subjectId : this.staffForm.value.subjectId,
  //   }]
  //   this.parameterService.examScanBundlesFiltersData = row;
  //   this.router.navigate(['admin-examination-management/exam-papers-delivery-process/scan-bundles']);
  // }
  enteredOmr(event): void {
    this.searchOmr = [];
    this.searchOmrList = []
    this.filteredOmrs.next(this.searchOmr.slice());
    if (event.target.value.length > 3) {
      /*----------- Books Search -----------*/
      this.crudService.listByIds(this.searchExamOmrSerialNoUrl, event.target.value, 'query')
        .subscribe(result => {
          if (result.statusCode === 200) {
            if (result.data && result.data !== '') {
              this.searchOmr = result.data;
              this.filteredOmrs.next(this.searchOmr.slice());
              this.searchOmrList = this.searchOmr.filter(x => (x.omrSerialNo == event.target.value))
              if (this.searchOmrList.length > 0) { 
                  this.filteredOmrs.next([].slice());
                  this.filteredOmrs.next(this.searchOmrList.slice());

                  for (let i = 0; i < this.searchOmrList.length; i++) {

                  const currentOmr = this.searchOmrList[i].omrSerialNo;
                  // Check in selectedOmrDetails
                  const existsInSelected = this.selectedOmrDetails.some(
                  item => item.omrSerialNo === currentOmr
                  );

                  // Check in examCenterStudents
                  const existsInStudents = this.examCenterStudents?.some(
                  item => item.omr_serial_no === currentOmr
                  );
                  if (existsInSelected || existsInStudents) {
                    this.snotifyService.info(`OMR Serial No ${currentOmr} already exists`, 'Info!');
                    this.barcode.nativeElement.value =''
                    this.myControl1.setValue('');
                    return; // skip adding duplicate
                  }

                  // If not exists, push
                  this.selectedOmrDetails.push({
                  univExamScanbundleId: this.staffForm.value.univExamScanbundleId,
                  omrSerialNo: currentOmr,
                  examStdDetId: this.searchOmrList[i].examStdDetId,
                  hallticketNumber: this.searchOmrList[i].hallticketNumber,
                  ecSeatNo: this.searchOmrList[i].ecSeatNo,
                  });
                  }
                  }
              // if (this.searchOmrList.length > 0) {
              //   this.filteredOmrs.next([].slice());
              //   this.filteredOmrs.next(this.searchOmrList.slice());
              //   for (let i = 0; i < this.searchOmrList.length; i++) {
              //     this.selectedOmrDetails.push({
              //       univExamScanbundleId: this.staffForm.value.univExamScanbundleId,
              //       omrSerialNo: this.searchOmrList[i].omrSerialNo,
              //       examStdDetId:this.searchOmrList[i].examStdDetId,
              //       hallticketNumber:this.searchOmrList[i].hallticketNumber
              //     });
              //   }
              // }
             this.selectedOmrDetails = this.selectedOmrDetails.filter((item, index, self) =>
                index === self.findIndex((t) => (
                  t.omrSerialNo === item.omrSerialNo
                ))
              );
              this.DuplicatedataSource = new MatTableDataSource(this.selectedOmrDetails);
              this.DuplicatedataSource.paginator = this.paginator2;
              this.DuplicatedataSource.sort = this.sort2;
              this.barcode.nativeElement.value =''
              this.myControl1.setValue('');
            } 
            
            else {
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
  }
    onKey(event: any) {
    this.searchOmr = [];
    this.filteredOmrs.next(this.searchOmr.slice());
  }
  focusInput() {
    setTimeout(() => {
      this.barcodeInput.nativeElement.focus();
    }, 0);
  }
    deleteOmr(item, index): void {
    if (index > - 1) {
      this.selectedOmrDetails.splice(index, 1);
    }
    this.DuplicatedataSource = new MatTableDataSource(this.selectedOmrDetails);
    this.DuplicatedataSource.sort = this.sort2;
  }
  AssignScanBundles(){
    if (this.selectedOmrDetails && this.selectedOmrDetails.length > 0) {
      let details = [];
      this.spinner.show();
      for (let i = 0; i < this.selectedOmrDetails.length; i++) {
        details.push({
          univExamScanbundleId: this.filtersSetArray[0]?.pk_univ_exam_scan_bundle_id,
          examStdDetId: this.selectedOmrDetails[i].examStdDetId,
          omrSerialNo: this.selectedOmrDetails[i].omrSerialNo,
          ecSeatNo: this.selectedOmrDetails[i].ecSeatNo,
          scannerProfileDetailId: this.filtersSetArray[0]?.fk_scanner_profiledet_id,
          isActive: true,
          createdUser: +localStorage.getItem('employeeId')
        })
      }
      /*---------- ADD EXAM CENTER STUDENTS ----------*/
      this.crudService.add(this.saveUnivExamScanbundleDetailsUrl, details)
        .subscribe(result => {
          this.spinner.hide();
          if (result.statusCode === 200) {
            this.getexamScanDetails();
            this.selectedOmrDetails = [];
            this.DuplicatedataSource = new MatTableDataSource(this.selectedOmrDetails);
            this.DuplicatedataSource.paginator = this.paginator2;
            this.DuplicatedataSource.sort = this.sort2;
            this.snotifyService.success(result.message, 'Success!');
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
    } else {
      this.snotifyService.info('No Answer Papers Scanned...!', 'Info!');
    }
  }
}