import { Component, OnInit, ViewChild } from '@angular/core';
import { CONSTANTS } from 'app/main/common/constants';
import { FormGroup, FormControl, FormBuilder, Validators } from '@angular/forms';
import { ExamMaster } from 'app/main/models/examMaster';
import { Subject, ReplaySubject } from 'rxjs';
import { SnotifyService } from 'ng-snotify';
import { CrudService } from 'app/main/services/crud.service';
import { NgxSpinnerService } from 'ngx-spinner';
import { Router, ActivatedRoute } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { GenericFunctions } from 'app/main/common/generic-functions';
import { takeUntil } from 'rxjs/operators';
import { fuseAnimations } from '@fuse/animations';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';

@Component({
  selector: 'app-exam-student-barcode-generation',
  templateUrl: './exam-student-barcode-generation.component.html',
  styleUrls: ['./exam-student-barcode-generation.component.scss'],
  animations : fuseAnimations
})

export class ExamStudentBarcodeGenerationComponent implements OnInit {

  displayedColumns: string[] = ['id', 'examDate', 'sessionStartTime','subjectCode', 'subjectName', 'barCode'];
  dataSource: MatTableDataSource<any>;

  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild(MatSort) sort: MatSort;

  private getDetailsByCollegeIdUrl = CONSTANTS.getDetailsByCollegeIdUrl;
  private examMasterUrl = CONSTANTS.examMasterUrl;
  private getDetailsByCourseIdUrl = CONSTANTS.getDetailsByCourseIdUrl;
  private studentSearchUrl = CONSTANTS.studentSearchUrl;
  private studentHallTicketUrl = CONSTANTS.studentHallTicketUrl;
  private isActive = CONSTANTS.isActive;
  private examHallTicketUrl = CONSTANTS.examHallTicketUrl;
  private endURL = CONSTANTS.MAINAPI;
  private generateBarCodeUrl = CONSTANTS.generateBarCodeUrl;


  examFeeCollectionForm: FormGroup;
  examsList: ExamMaster[] = [];
  searchStudents = [];
  selectedStd = [];
  student: any = {};
  examFeeReceipt: any[] = [];
  feeReceipts: any[] = [];
  studentFirstName;
  flag = false;
  exam: any = {};
  pending: boolean;
  blob;
  imagePath: string = null;
  
  public studentFilterCtrl: FormControl = new FormControl();
  private _onDestroy = new Subject<void>();
  public filteredStudents: ReplaySubject<any[]> = new ReplaySubject<any[]>(1);
  studentdata: any=[];
  studentId: any=[];
  GenerateBarCodeData:any[] = [];

  constructor(private formBuilder: FormBuilder, private snotifyService: SnotifyService,
              private crudService: CrudService, private spinner: NgxSpinnerService, private router: Router, 
              private dialog: MatDialog, private genericFunctions: GenericFunctions, private route: ActivatedRoute) {   
  }

  ngOnInit(): void {
    this.imagePath = 'iVBORw0KGgoAAAANSUhEUgAAAMYAAAASCAMAAAA36lFWAAADAFBMVEUAAAAAADMAAGYAAJkAAMwAAP8AMwAAMzMAM2YAM5kAM8wAM/8AZgAAZjMAZmYAZpkAZswAZv8AmQAAmTMAmWYAmZkAmcwAmf8AzAAAzDMAzGYAzJkAzMwAzP8A/wAA/zMA/2YA/5kA/8wA//8zAAAzADMzAGYzAJkzAMwzAP8zMwAzMzMzM2YzM5kzM8wzM/8zZgAzZjMzZmYzZpkzZswzZv8zmQAzmTMzmWYzmZkzmcwzmf8zzAAzzDMzzGYzzJkzzMwzzP8z/wAz/zMz/2Yz/5kz/8wz//9mAABmADNmAGZmAJlmAMxmAP9mMwBmMzNmM2ZmM5lmM8xmM/9mZgBmZjNmZmZmZplmZsxmZv9mmQBmmTNmmWZmmZlmmcxmmf9mzABmzDNmzGZmzJlmzMxmzP9m/wBm/zNm/2Zm/5lm/8xm//+ZAACZADOZAGaZAJmZAMyZAP+ZMwCZMzOZM2aZM5mZM8yZM/+ZZgCZZjOZZmaZZpmZZsyZZv+ZmQCZmTOZmWaZmZmZmcyZmf+ZzACZzDOZzGaZzJmZzMyZzP+Z/wCZ/zOZ/2aZ/5mZ/8yZ///MAADMADPMAGbMAJnMAMzMAP/MMwDMMzPMM2bMM5nMM8zMM//MZgDMZjPMZmbMZpnMZszMZv/MmQDMmTPMmWbMmZnMmczMmf/MzADMzDPMzGbMzJnMzMzMzP/M/wDM/zPM/2bM/5nM/8zM////AAD/ADP/AGb/AJn/AMz/AP//MwD/MzP/M2b/M5n/M8z/M///ZgD/ZjP/Zmb/Zpn/Zsz/Zv//mQD/mTP/mWb/mZn/mcz/mf//zAD/zDP/zGb/zJn/zMz/zP///wD//zP//2b//5n//8z///8SEhIYGBgeHh4kJCQqKiowMDA2NjY8PDxCQkJISEhOTk5UVFRaWlpgYGBmZmZsbGxycnJ4eHh+fn6EhISKioqQkJCWlpacnJyioqKoqKiurq60tLS6urrAwMDGxsbMzMzS0tLY2Nje3t7k5OTq6urw8PD29vb8/PwgKWLDAAAAVElEQVR42u3PUQoAIQhF0Tezm9n/Yt52ikCpnN9+4gqpmBTnsWp8/bhnj9459bhR1ugia6v/07rlfL/uaPrT03SNV1cEDBgwYMCAAQMGDBgwYJyKBgMRFvtadUXsAAAAAElFTkSuQmCC';
    this.examFeeCollectionForm = this.formBuilder.group({
      examId: ['', Validators.required],
      studentId: ['', Validators.required],
    });

    this.studentFilterCtrl.valueChanges
    .pipe(takeUntil(this._onDestroy))
    .subscribe(() => {
      this.filterStd();
    });

    this.dataSource = new MatTableDataSource<any>(this.feeReceipts);
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;

    this.searchStudents.push({firstName: 'Search by student name or rollno.'});
    this.filteredStudents.next(this.searchStudents.slice());

  }

   // tslint:disable-next-line: use-lifecycle-interface
   ngOnDestroy(): void {
    this._onDestroy.next();
    this._onDestroy.complete();
  }

  filterStd(): void {
    if (!this.searchStudents) {
      return;
    }
    // get the search keyword
    let search = this.studentFilterCtrl.value;
    if (!search) {
      this.filteredStudents.next(this.searchStudents.slice());
      return;
    } else {
      search = search.toLowerCase();
    }
    // filter the banks
    this.filteredStudents.next(
      this.searchStudents.filter(x => x.firstName.toLowerCase().indexOf(search) > -1)
    );
  }

selectedExternalExam(examId): void{
  this.feeReceipts = [];
  this.flag = true;
  this.GenerateBarCodeData=[];
  if (this.selectedStd.length > 0){
    this.getExamFeeReceipts(this.student.studentId);
  }
  if (this.examsList.filter(x => (x.examId === examId)).length > 0){
     this.exam = this.examsList.filter(x => (x.examId === examId))[0];
  }
}

enteredStudent(event): void{
  if (event.target.value.length > 4){
      /*----------- STUDENTS -----------*/
      this.crudService.listByTwoIds(this.studentSearchUrl, 'true', event.target.value, 
       'isActive', 'q')
          .subscribe(result => {
              if (result.statusCode === 200){
                      if (result.data && result.data !== '') {  
                          this.searchStudents = result.data;
                          this.filteredStudents.next(this.searchStudents.slice());                
                      }
                  }else{
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
}

selectedStudent(studentId): void{
  this.feeReceipts = [];
  this.GenerateBarCodeData=[]
  if (studentId != null && studentId !== '' && studentId !== 'undefined'){
    this.selectedStd = [];
    if (this.searchStudents.filter(x => (x.studentId === studentId)).length > 0){
        this.selectedStd.push(this.searchStudents.filter(x => (x.studentId === studentId))[0]);
        this.student = this.selectedStd[0];
        this.studentId.push(this.student.hallticketNumber);
        
        if (this.student.studentPhotoPath === null){
          this.student.studentPhotoPath = 'assets/images/avatars/default_Student.png';
        }
        this.student.studentPhotoPath = this.student.studentPhotoPath + '?' + new Date().getTime();
        this.studentFirstName = this.student.firstName + ' ( ' + this.student.rollNumber + ' )';
        this.getExamsList();
     }
  }  
}

getExamsList(): void{
  this.examFeeCollectionForm.get('examId').setValue('');
  this.examsList = [];
  this.feeReceipts = [];
  this.GenerateBarCodeData = [];
/*----------- Exams List -----------*/      
  this.crudService.listDetailsByThreeIdsWithSort(this.examMasterUrl, this.student.collegeId, this.student.courseId, 'true', 'DESC',
  this.getDetailsByCollegeIdUrl , this.getDetailsByCourseIdUrl, this.isActive, 'createdDt')
.subscribe(result => {
this.spinner.hide();
if (result.statusCode === 200){
      if (result.success) {
          this.examsList = [];
          // tslint:disable-next-line: prefer-for-of
          for (let i = 0; i < result.data.resultList.length; i++){
            if (!result.data.resultList[i].isInternalExam){
                this.examsList.push(result.data.resultList[i]);
            }
          }
      }else{
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

getExamFeeReceipts(studentId): void{
  this.flag = true;

  /*------------- FEE RECEIPTS ------------*/  
  this.crudService.listByTwoIds(this.examHallTicketUrl, this.examFeeCollectionForm.value.examId, 
      studentId, 'examId', 'studentId')
  .subscribe(result => {
     this.spinner.hide();
     if (result.statusCode === 200){
          if (result.success) {
              this.feeReceipts = this.sortDataAss(result.data);
              if(this.GenerateBarCodeData.length>0){
              for(let i=0;i<this.GenerateBarCodeData.length;i++){
                if (this.feeReceipts.filter(x => (x.examStdDetId === parseInt(this.GenerateBarCodeData[i]?.id))).length > 0){
                  this.feeReceipts[i].barCode =this.GenerateBarCodeData[i]?.barCode;
               }
              }
            }
              else{
                for(let i=0;i<this.feeReceipts.length;i++){
                  this.feeReceipts[i].barCode ='-';
                }

              }
             
              this.dataSource = new MatTableDataSource<any>(this.feeReceipts);
               this.dataSource.paginator = this.paginator
               this.dataSource.sort = this.sort;
          } else {
             // this.snotifyService.success(result.message, 'Success!');
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

getMonth(month): any{
   if (CONSTANTS.monthColors.filter(x => (x.id === month)).length > 0){
      return CONSTANTS.monthColors.filter(x => (x.id === month))[0].fullName;
   }else{
    return 0;
   }
}

  tConvert(time): void{
    time = time.toString ().match (/^([01]\d|2[0-3])(:)([0-5]\d)(:[0-5]\d)?$/) || [time];

    if (time.length > 1) { // If time format correct
      time = time.slice (1);  // Remove full string match value
      time[5] = +time[0] < 12 ? 'AM' : 'PM'; // Set AM/PM
      time[0] = +time[0] % 12 || 12; // Adjust hours
    }
    time = time[0] + time[1] + time[2] + ' ' + time[5];
    return time; 
  }

  print(details): void{
    if (this.examFeeCollectionForm.valid){

      // this.crudService.getPdf(this.studentHallTicketUrl, details.examId, details.studentId).subscribe((data) => {

      //   console.log(data);

      //   this.blob = new Blob([data], {type: 'application/pdf'});
      
      //   const downloadURL = window.URL.createObjectURL(data);
      //   const link = document.createElement('a');
      //   link.href = downloadURL;
      //   link.download = 'help.pdf';
      //   link.click();
      
      // });
        /*---------- Print call  ----------*/
        // Xhr creates new context so we need to create reference to this
        const self = this;

        // Status flag used in the template.
        this.pending = true;

        // Create the Xhr request object
        const xhr = new XMLHttpRequest();
        xhr.open('GET', this.endURL + this.studentHallTicketUrl + '?examId=' + details.examId + '&studentId=' + details.studentId, true);
        xhr.setRequestHeader('Authorization', 'Bearer ' + localStorage.getItem('token'));
        xhr.responseType = 'blob';
       // console.log(xhr);
       // tslint:disable-next-line:typedef
    //    xhr.onload = function ( ) {
    //     if (xhr.readyState === xhr.DONE) {
    //         if (xhr.status === 200) {
    //             console.log(xhr.response);
    //             console.log(xhr.responseText);
    //         }
    //     }
    // };
    
        // Xhr callback when we get a result back
        // We are not using arrow function because we need the 'this' context
        // tslint:disable-next-line:typedef
        xhr.onreadystatechange = function() {

            // We use setTimeout to trigger change detection in Zones
            setTimeout( () => { self.pending = false; }, 0);
            if (xhr.readyState === 4 && xhr.status === 200) {
                
                if (this.response.type === 'application/pdf'){
                  const blob = new Blob([this.response], {type: 'application/pdf'});
                  // FileSaver.saveAs(blob, 'Report.pdf');
                  
                  const blobUrl = URL.createObjectURL(blob);
                  const iframe = document.createElement('iframe');
                  iframe.style.display = 'none';
                  iframe.src = blobUrl;
                  document.body.appendChild(iframe);
                  iframe.contentWindow.print();
                }else{
                  alert('Student is not registered for selected exam');
                }
            }
        };
        // Start the Ajax request
        xhr.send();
       
    }
  }
  notification(): void{
    this.snotifyService.info('Student is not registered for selected exam', 'Info!');
  }

 // tslint:disable-next-line:typedef
 isEmptyObject(obj) {
  return (obj && (Object.keys(obj).length === 0));
 }

 sortDataAss(data): any {
  return data.sort((a, b) => {
    return ( new Date(a.examDate) as any) - ( new Date(b.examDate) as any);
  });
}

generateBarcode(): void{
  this.GenerateBarCodeData=[];
  this.studentdata=[]
  for(let i=0;i<this.feeReceipts.length;i++){
    this.studentdata.push(this.feeReceipts[i].examStdDetId)
  }
    this.crudService.generateBarCode(this.generateBarCodeUrl,this.studentdata)
    .subscribe(result => {
       this.spinner.hide();
       if (result){
              this.GenerateBarCodeData=result;
              this.snotifyService.success("Barcode Generated", 'Success!');
              this.getExamFeeReceipts(this.student.studentId)

            } 
            else{
              this.snotifyService.success("Subject data Mismatch", 'Error!');
            } 
      
    }, error => {
        this.spinner.hide();
        if (error.error.statusCode === 401){
            this.snotifyService.error(error.error.message, 'Error!');
        }else{
            this.snotifyService.error(CONSTANTS.message.CON_ERROR, 'Error!');
        }
    });
  }
}


