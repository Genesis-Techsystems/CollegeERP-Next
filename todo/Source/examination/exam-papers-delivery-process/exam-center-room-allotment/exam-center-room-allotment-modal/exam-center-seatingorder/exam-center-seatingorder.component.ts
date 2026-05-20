import { Component, OnInit, Inject } from '@angular/core';
import { FormGroup, FormBuilder, Validators, FormControl } from '@angular/forms';
import { GenericFunctions } from 'app/main/common/generic-functions';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { SnotifyService } from 'ng-snotify';
import { CrudService } from 'app/main/services/crud.service';
import { Router } from '@angular/router';
import { publish, takeUntil } from 'rxjs/operators';
import { Subject, ReplaySubject } from 'rxjs';
import { CONSTANTS } from 'app/main/common/constants';
import { NgxSpinnerService } from 'ngx-spinner';

@Component({
  selector: 'app-exam-center-seatingorder',
  templateUrl: './exam-center-seatingorder.component.html',
  styleUrls: ['./exam-center-seatingorder.component.scss']
})
export class ExamCenterSeatingorderComponent implements OnInit {

  seatForm: FormGroup;
  dialogTitle;
  flag;
  students: any[] = [];
  student: any = {};
  examStudentDetails: any[] = [];

  public studentFilterCtrl: FormControl = new FormControl();
  private _onDestroy = new Subject<void>();
  public filteredStudents: ReplaySubject<any[]> = new ReplaySubject<any[]>(1);

  private examStudentDetailsUrl = CONSTANTS.examStudentDetailsUrl;
  private collegeByIdUrl = CONSTANTS.collegeByIdUrl;
  private courseByIdUrl = CONSTANTS.courseByIdUrl;
  private examIdUrl = CONSTANTS.examIdUrl;

  constructor( private genericFunctions: GenericFunctions, private spinner: NgxSpinnerService, private formBuilder: FormBuilder, 
               private dialogRef: MatDialogRef<any>, @Inject(MAT_DIALOG_DATA) public data, private snotifyService: SnotifyService,
               private crudService: CrudService, public router: Router) {

  }

  // tslint:disable-next-line:typedef
  ngOnInit() {
      this.dialogTitle = 'Seat Allotment';
      this.seatForm = this.formBuilder.group({
          examseatstatusCatId: ['', Validators.required],
          studentId: [],
        //  comments: ['', Validators.required],
      });

      this.students.push({firstName: 'Search by Student Name or No.'});
      this.filteredStudents.next(this.students.slice());

      this.getExamStudents();

      this.studentFilterCtrl.valueChanges
      .pipe(takeUntil(this._onDestroy))
      // tslint:disable-next-line: deprecation
      .subscribe(() => {
        this.filterStd();
      });

      if (!this.isEmptyObject(this.data)) {
          this.seatForm.get('examseatstatusCatId').setValue(this.data.examseatstatusCatId);
          // this.seatForm.get('comments').setValue(this.data.comments);
          this.seatForm.get('studentId').setValue(this.data.studentId);
      }
      this.flag = false;
  }

  filterStd(): void {
    if (!this.students) {
      return;
    }
    // get the search keyword
    let search = this.studentFilterCtrl.value;
    if (!search) {
      this.filteredStudents.next(this.students.slice());
      return;
    } else {
      search = search.toLowerCase();
    }
    // filter the banks
    this.filteredStudents.next(
      this.students.filter(x => x.firstName.toLowerCase().indexOf(search) > -1 || x.rollNumber != null && x.rollNumber.toLowerCase().indexOf(search) > -1)
    );
  }

  getExamStudents(): void{
    const dateConvert = this.genericFunctions.momentFormatYMD(this.data.examDate);
    this.crudService.listByFourIds(this.examStudentDetailsUrl, this.data.collegeId, 
        this.data.courseId, 
        this.data.examId, 
        dateConvert,
        this.collegeByIdUrl, this.courseByIdUrl, this.examIdUrl, 'examDate')
        .subscribe(result => {
          if (result.statusCode === 200){
                  if (result.data && result.data !== '' && result.data.length > 0) {
                   // this.students = result.data;
                    // tslint:disable-next-line: prefer-for-of
                    for (let i = 0; i < result.data.length; i++){
                       // if (result.data[i].subjectId === this.data.subjectId){
                           if (result.data[i].shortName === null || result.data[i].shortName === ''){
                               result.data[i].shortName = result.data[i].subjectCode;
                           }
                           if (this.students.filter(x => (x.examStdDetId === result.data[i].examStdDetId)).length === 0){
                               this.students.push(result.data[i]);
                           }
                       // } 
                    }
                    this.filteredStudents.next(this.students.slice());  
                  } else {
                      this.snotifyService.success(result.message, 'Success!');
                  }
          }else {
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

  selectedStudent(studentId): void{
   // console.log(studentId);
  }

  // tslint:disable-next-line:typedef
  isEmptyObject(obj) {
      return (obj && (Object.keys(obj).length === 0));
  }

  submit(): void {
      this.flag = true;
      const Obj = this.seatForm.value;
      if (this.data.generalDetails.filter(x => (x.generalDetailId === this.seatForm.value.examseatstatusCatId)).length > 0){
        Obj.examSeatStatusCode = this.data.generalDetails.filter(x => (x.generalDetailId === this.seatForm.value.examseatstatusCatId))[0].generalDetailCode;
      }
      if (this.students.filter(x => (x.studentId === Obj.studentId)).length > 0){
          Obj.subjectId =  this.students.filter(x => (x.studentId === Obj.studentId))[0].subjectId;

          Obj.stdRollNumber =  this.students.filter(x => (x.studentId === Obj.studentId))[0].rollNumber;

          if (this.students.filter(x => (x.studentId === Obj.studentId))[0].shortName != null){
              Obj.shortName =  this.students.filter(x => (x.studentId === Obj.studentId))[0].shortName;
          }else{
              Obj.shortName =  this.students.filter(x => (x.studentId === Obj.studentId))[0].subjectCode;
          }
      }
      if (Obj.examSeatStatusCode !== 'Booked'){
          Obj.studentId = null;
          Obj.subjectId = null;
      }
      if (this.seatForm.invalid) {
          return;
      } else {
          this.dialogRef.close(Obj);
      }
  }
}
