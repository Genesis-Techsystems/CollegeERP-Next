import { Component, OnInit, Inject, ViewChild, ElementRef } from '@angular/core';
import { FormGroup, FormBuilder, FormControl, Validators } from '@angular/forms';
import { CrudService } from 'app/main/services/crud.service';
import { CONSTANTS } from 'app/main/common/constants';
import { GenericFunctions } from 'app/main/common/generic-functions';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { SnotifyService } from 'ng-snotify';
import { Router } from '@angular/router';
import { NgxSpinnerService } from 'ngx-spinner';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { Observable, forkJoin, from } from 'rxjs';
import { concatMap, map, tap } from 'rxjs/operators';
// import { lastValueFrom } from 'rxjs';
@Component({
  selector: 'app-scan-upload-papers',
  templateUrl: './scan-upload-papers.component.html',
  styleUrls: ['./scan-upload-papers.component.scss']
})
export class ScanUploadPapersComponent implements OnInit {

  dataSource: MatTableDataSource<any>;
  dataSource1: MatTableDataSource<any>;

  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild('paginator1') paginator1: MatPaginator;

  @ViewChild(MatSort) sort: MatSort;
  @ViewChild(MatSort) sort1: MatSort;

  @ViewChild('fileInput') fileInput: ElementRef;

  displayedColumns: string[] = ['id', 'filename', 'status', 'view'];

  private getCollegeExamDetails = CONSTANTS.getCollegeExamDetails;

  examDate = this.genericFunctions.momentWithDateFormatYMD(this.genericFunctions.moment());
 private uploadExamOmrUrl = CONSTANTS.uploadExamOmrUrl;
  miniopath = CONSTANTS.MINIO

  step = 0;
  scanPapersForm: FormGroup;
  filtersDetailsList = [];
  examList = [];
  filterExam = [];
  minDate;
  filtersData = [];
  subjectsData = [];
  subjects = [];
  filterSubjects = []
  flag = false;
  examTimetableId: any;
  summaryDetailsList = [];
  file;
  uploadedFilesData = [];
  uploadedFiles = [];
  examName;
  subjectCode;
  dataDetails = '';
  public formData1;
  fileNamePdf:any;
  scanneddata = [
    { id: 1, serial_no: 'LK40H4PE', status: 'Uploaded' },
    { id: 1, serial_no: 'KQOJLPCQ', status: 'Not Uploaded' },
    { id: 1, serial_no: 'OKVROHN8', status: 'Uploaded' }
  ]
  notUploadAnswerPaper: number;
  dateConvert: any;
  colleges=[];
  filtersDataList=[];
  monthYearData=[];
  monthYear=[];
  monthYearDuplicateList=[];

  constructor(
    private formbuilder: FormBuilder, private crudService: CrudService, private genericFunctions: GenericFunctions,
    private snotifyService: SnotifyService, private spinner: NgxSpinnerService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.scanPapersForm = this.formbuilder.group({
      examId: ['', Validators.required],
      examDate: [this.genericFunctions.moment(), Validators.required],
      subjectId: ['', Validators.required],
      ExamMonthYear:[''],
      collegeId:['']
    })
    this.getFiltersList();
    this.dataSource = new MatTableDataSource(this.scanneddata);
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }
  uploadFiles(files) {
    this.uploadedFilesData = []
    this.uploadedFiles = []
    if (this.fileInput.nativeElement.files.length > 0) {
      for (let i = 0; i < this.fileInput.nativeElement.files.length; i++) {
        // this.formData.append('file',
        //   this.fileInput.nativeElement.files[i],
        //   this.fileInput.nativeElement.files[i].name);
        const path: string = this.fileInput.nativeElement.files[i].webkitRelativePath;
        const pathPieces = path.split('/');
        const currentFolder = pathPieces[1];
        pathPieces.pop();
        this.uploadedFiles.push({
          fileName: currentFolder,
          folder: pathPieces[0],
          status: 'Pending',
          view: '',
          file: this.fileInput.nativeElement.files[i]
        });
      }
    }

  }
  getFiltersList(): void {
    this.spinner.show();
    let request = [
      { paramName: 'in_flag', paramValue: 'exam_timetable_details' },
      { paramName: 'in_org_id', paramValue: +localStorage.getItem('organizationId') },
      { paramName: 'in_college_id', paramValue: 0 },
      { paramName: 'in_academic_year_id', paramValue: 0 },
      { paramName: 'in_isadmin', paramValue: '' },
      { paramName: 'in_exam_id', paramValue: 0 },
      { paramName: 'in_timetable_id', paramValue: 0 },
      { paramName: 'in_exam_date', paramValue: '1990-01-01' },
      { paramName: 'in_subject_id', paramValue: 0 },
      { paramName: 'in_loginuser_empid', paramValue: 0 },
      { paramName: 'in_loginuser_roleid', paramValue: 0 }

    ];
    this.crudService.getDetailsByRequest(this.getCollegeExamDetails, '', request, '&')
      .subscribe(result => {
        this.spinner.hide();
        if (result.statusCode === 200) {
          if (result.data && result.data !== '' && result.data.result.length > 0) {
            this.filtersDetailsList = result.data.result;
            if(this.filtersDetailsList && this.filtersDetailsList.length > 0){
              for (let i = 0; i < this.filtersDetailsList.length; i++) {
                if (this.filtersDetailsList[i].length > 0 && this.filtersDetailsList[i][0].flag === 'exam_timetable_details') {
                  this.filtersData = this.filtersDetailsList[i];
                }
              }
            }
            /*..............DISTINCT EXAM......... */
            if (this.filtersData && this.filtersData.length > 0) {

              const CollegeIdData = this.filtersData.map(({ fk_college_id }) => fk_college_id);
              this.colleges = this.filtersData.filter(({ fk_college_id }, index) => 
              !CollegeIdData.includes(fk_college_id, index + 1));
              if(this.colleges.length>0){
                // this.colleges = this.colleges.sort((a,b)=>a.clg_sort_order-b.clg_sort_order);
                this.scanPapersForm.get('collegeId').setValue(this.colleges[0].fk_college_id);
                this.selectedCollege(this.scanPapersForm.value.collegeId)
              }
            }
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
 selectedCollege(collegeId){
  this.monthYearData=[]
  this.monthYear=[]
  this.monthYearDuplicateList=[]
  this.monthYearData= this.filtersData.filter(x=>(x.fk_college_id==collegeId))
          const exam_month_yrData = this.monthYearData.map(({ exam_month_yr }) => exam_month_yr);
          this.monthYear = this.monthYearData.filter(({ exam_month_yr }, index) =>
          !exam_month_yrData.includes(exam_month_yr, index + 1));
          this.monthYear=this.monthYear.sort((a, b) => new Date(b.exam_month_yr).getTime() - new Date(a.exam_month_yr).getTime());
          this.monthYearDuplicateList=this.monthYear.sort((a, b) => new Date(b.exam_month_yr).getTime() - new Date(a.exam_month_yr).getTime());
         
    this.scanPapersForm.get('ExamMonthYear').setValue(this.monthYearDuplicateList[0]?.exam_month_yr)
      this.selectedMonthyr(this.scanPapersForm.value.ExamMonthYear)
 
  }
selectedMonthyr(ExamMonthYear){
  this.filtersDataList=[]
  this.filtersDataList=this.filtersData.filter(x=>(x.fk_college_id==this.scanPapersForm.value.collegeId && x.exam_month_yr==ExamMonthYear))
  const ExamListData = this.filtersDataList.map(({ fk_exam_id }) => fk_exam_id);
  this.examList = this.filtersDataList.filter(({ fk_exam_id }, index) =>
    !ExamListData.includes(fk_exam_id, index + 1));

if (this.examList && this.examList.length > 0) {
  this.filterExam =  this.examList;
  this.scanPapersForm.get('examId').setValue(this.examList[0].fk_exam_id);
  this.selectedExam(this.scanPapersForm.value.examId)
}
}

  searchExam(value) {
    this.filterExam = [];
    this.examSearch(value);
  }
  examSearch(value: string) {
    let filter = value.toLowerCase()
    for (let i = 0; i < this.examList.length; i++) {
        let option = this.examList[i];
        if (option.exam_name.toLowerCase().indexOf(filter) >= 0) {
            this.filterExam.push(option);
        }
    }
  }
  selectedExam(examId) {
    this.flag = false;
    this.subjectsData = [];
    this.subjects = [];
    this.filterSubjects = [];
    this.minDate = this.genericFunctions.momentWithDateFormatYMD(this.examList.filter(x => (x.fk_exam_id === examId))[0]?.exam_date);
    this.scanPapersForm.get('examDate').setValue(this.minDate);
    this.examDate = this.genericFunctions.momentWithDateFormatYMD(this.scanPapersForm.value.examDate);
    this.examTimetableId = this.examList.filter(x => (x.fk_exam_id == examId))[0].fk_exam_timetable_id;
    this.subjectsData = this.filtersData.filter(x => (x.fk_exam_id == this.scanPapersForm.value.examId));
    if (this.subjectsData && this.subjectsData.length > 0) {
      const subject_Data = this.subjectsData.map(({ fk_subject_id }) => fk_subject_id);
      this.subjects = this.subjectsData.filter(({ fk_subject_id }, index) =>
        !subject_Data.includes(fk_subject_id, index + 1));
      this.filterSubjects = this.subjects;
  if(this.filterSubjects.length>0){
    this.scanPapersForm.get('subjectId').setValue(this.filterSubjects[0].fk_subject_id);

      }
    }
  }
 
  // calDays(): void {
  //   this.flag = false;
 
  //   this.examDate = this.genericFunctions.momentWithDateFormatYMD(this.scanPapersForm.value.examDate); // new Date(this.data.issueTodate);
  //             /*..............DISTINCT SUBJECT......... */
   
  // }
  searchdata(value) {
    this.filterSubjects = []
    this.search(value);
  }
  search(value: string) {
    let filter = value.toLowerCase();
    for (let i = 0; i < this.subjects.length; i++) {
      let option = this.subjects[i];
      if (option.subject_name.toLowerCase().indexOf(filter) >= 0) {
        this.filterSubjects.push(option);
      }
      else if (option.subject_code.toLowerCase().indexOf(filter) >= 0) {
        this.filterSubjects.push(option);
      }
    }
  }
  selectedSubject(){
  this.scanPapersForm.get('examDate').setValue(this.filterSubjects.filter(x => (x.fk_subject_id === this.scanPapersForm.value.subjectId))[0]?.exam_date);
  this.dateConvert = this.genericFunctions.momentFormatYMD1(this.scanPapersForm.value.examDate);
   
  this.flag = false;
    this.summaryDetailsList = [];
    this.selectedDetails();
  }
  selectedDetails(){
    this.examName = this.examList.filter(x => (x.fk_exam_id === this.scanPapersForm.value.examId))[0]?.exam_name;
    this.subjectCode = this.subjects.filter(x => (x.fk_subject_id === this.scanPapersForm.value.subjectId))[0]?.subject_code;
    if(this.examName){
      this.dataDetails = this.examName;
    }
     this.dataDetails = this.dataDetails + ' ' + '/' + + ' ' + this.scanPapersForm.value.examDate;
    if(this.subjectCode){
      this.dataDetails = this.examName + ' '  + '/' + + ' ' + this.subjectCode;
    }
  }
  getList(){
    this.spinner.show();
    this.summaryDetailsList = [];
    this.flag = true;

    let request = [
      {paramName: 'in_flag', paramValue: 'exam_timetable_answerpaper_details'},
      {paramName: 'in_org_id', paramValue: +localStorage.getItem('organizationId')},
      {paramName: 'in_college_id', paramValue: 0},
      {paramName: 'in_academic_year_id', paramValue: 0},
      {paramName: 'in_isadmin', paramValue: 0},
      {paramName: 'in_exam_id', paramValue:0},
      // {paramName: 'in_exam_id', paramValue:this.scanPapersForm.value.examId},
      {paramName: 'in_timetable_id', paramValue: this.examTimetableId},
      {paramName: 'in_exam_date', paramValue:this.dateConvert},
      // {paramName: 'in_exam_date', paramValue:'1990-01-01'},
      { paramName: 'in_subject_id', paramValue: this.scanPapersForm.value.subjectId},
      {paramName: 'in_loginuser_empid', paramValue: 0},
      // {paramName: 'in_loginuser_empid', paramValue: +localStorage.getItem('employeeId')},
      {paramName: 'in_loginuser_roleid', paramValue: 0}
    ];
    this.crudService.getDetailsByRequest(this.getCollegeExamDetails, '', request, '&')
  .subscribe(result =>  {
          this.spinner.hide();
          if (result.statusCode === 200) {
            if (result.data && result.data !== '' && result.data.result.length > 0) {
              this.summaryDetailsList = result.data.result[0];
              this.notUploadAnswerPaper=this.summaryDetailsList[0]?.total_students - this.summaryDetailsList[0]?.no_oof_answerpaper_uploaded
              // this.dataSource1 = new MatTableDataSource(this.summaryDetailsList);
              // setTimeout(()=>this.dataSource1.paginator = this.paginator1);
              // this.dataSource1.sort = this.sort;
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
  // getTotalStudents() {
  //   return this.dataSource1.filteredData.map(t => t.total_students).reduce((acc, value) => acc + value, 0);
    
  // }
  // getTotalAttendancetMarked() {
  //   return this.dataSource1.filteredData.map(t => t.attendance_marked).reduce((acc, value) => acc + value, 0);
    
  // }
  applyFilter(filterValue) {
    this.dataSource.filter = filterValue.trim().toLowerCase();
    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
  }
  onFileSelected(event: any) {
    const file: File = event.target.files[0];
    this.file = file.name;
    console.log(file);
    console.log(this.file,"File");
    // Do something with the selected file
  }
  async submit() {

    let filesArray = [];
    for (let i = 0; i < this.fileInput.nativeElement.files.length; i++) {
      if (this.uploadedFiles.filter(x => (x.fileName === this.fileInput.nativeElement.files[i].name)).length > 0){
        this.uploadedFiles.filter(x => (x.fileName === this.fileInput.nativeElement.files[i].name))[0].status = 'Progress';
      }
      this.formData1 = new FormData();
      this.formData1.append("file", this.fileInput.nativeElement.files[i], this.fileInput.nativeElement.files[i].name);
      filesArray.push(this.crudService.upload(this.uploadExamOmrUrl, this.formData1))
    }

    forkJoin(filesArray)
      .pipe(map(data => data.reduce((result: any,arr: any)=>[...result,arr],[])))
      .subscribe((data: any) =>{
        // this.snotifyService.success('Successfully uploaded files', 'Success!');
        data.forEach(element => {
          let fileName = element[0].split('/');
          if(fileName[5]!=undefined){
            if (this.uploadedFiles.filter(x => (x.fileName === fileName[5])).length > 0){
              this.uploadedFiles.filter(x => (x.fileName === fileName[5]))[0].status = 'Success';
              this.uploadedFiles.filter(x => (x.fileName === fileName[5]))[0].view = element[0];
            }
          }
          else if(fileName[5]==undefined) {
          let fileName = element[0].split(' ');
             this.fileNamePdf=fileName[0]+'.pdf';
            if (this.uploadedFiles.filter(x => (x.fileName === this.fileNamePdf)).length > 0){
            this.uploadedFiles.filter(x => (x.fileName === this.fileNamePdf))[0].status = 'File not found';
            this.uploadedFiles.filter(x => (x.fileName ===this.fileNamePdf))[0].view=''
          }
        }
        });
         this.snotifyService.success('Files uploaded', 'Success!');
         this.getList()
        this.fileInput.nativeElement.value = '';
    });
    
  }
}
