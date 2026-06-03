import { Component, Inject, OnInit, ViewChild } from '@angular/core';
import { FormGroup, FormControl, FormBuilder, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSelect } from '@angular/material/select';
import { MatTableDataSource } from '@angular/material/table';
import { Router } from '@angular/router';
import { CONSTANTS } from 'app/main/common/constants';
import { GenericFunctions } from 'app/main/common/generic-functions';
import { GeneralDetail } from 'app/main/models/generalDetail';
import { CrudService } from 'app/main/services/crud.service';
import * as _ from 'lodash';
import * as moment from 'moment';
import { SnotifyService } from 'ng-snotify';
import { NgxSpinnerService } from 'ngx-spinner';
import { ReplaySubject } from 'rxjs';

@Component({
  selector: 'app-create-exam-scan-profile',
  templateUrl: './create-exam-scan-profile.component.html',
  styleUrls: ['./create-exam-scan-profile.component.scss']
})
export class CreateExamScanProfileComponent implements OnInit {

  addevaluatorform: FormGroup;
   colleges = [];
   employees: any[] = [];
   dialogTitle;
   searchEmployees: any[] = [];
   flag: boolean;
   universityColleges = [];
 
   private collegeCrudUrl = CONSTANTS.collegeCrudUrl;
   private employeeSearchUrl = CONSTANTS.employeeSearchUrl;
   private isActive = CONSTANTS.isActive;
   private generalDetailsByCodeUrl = CONSTANTS.generalDetailsByCodeUrl;
   private generalDetailsUrl = CONSTANTS.generalDetailsUrl;
   public formData;
   private title = CONSTANTS.title;
 
   public collegeFilterCtrl: FormControl = new FormControl();
   public collegeMultiCtrl: FormControl = new FormControl();
   public filteredColleges: ReplaySubject<any[]> = new ReplaySubject<any[]>(1);
   public examFilterCtrl: FormControl = new FormControl();
 
   public employeeFilterCtrl: FormControl = new FormControl();
   public subjectFilterCtrl: FormControl = new FormControl();
   public employeeSingleCtrl: FormControl = new FormControl();
   public filteredEmployees: ReplaySubject<any[]> = new ReplaySubject<any[]>(1);
   public filteredExam: ReplaySubject<any[]> = new ReplaySubject<any[]>(1);
   public dateFormate = CONSTANTS.dateFormate;
 
   dataSource: MatTableDataSource<any>;
   @ViewChild('singleSelect') singleSelect: MatSelect;
 
   Obj: any = {};
   titles: GeneralDetail[] = [];
   examEvaluatorProfileDetailsDTOS = [];
   /*............. Validation ...............*/
   alphanumericValidation = CONSTANTS.validations.alphanumaeric;
   phNoValidation = CONSTANTS.validations.phNo;
   emailValidation = CONSTANTS.validations.email;
   aadharNoValidation = CONSTANTS.validations.aadharNo;
 
   constructor(private genericFunctions: GenericFunctions, private formBuilder: FormBuilder, private dialogRef: MatDialogRef<CreateExamScanProfileComponent>,
     @Inject(MAT_DIALOG_DATA) private data, private snotifyService: SnotifyService, private spinner: NgxSpinnerService,
     private crudService: CrudService, public router: Router) {
 
   }
 
   ngOnInit(): void {
     this.dialogTitle = 'Create Exam Scan Profile';
     this.addevaluatorform = this.formBuilder.group({
       courseId: [''],
       examId: [''],
       evaluatorEmpId: [],
       EmpuserId: [],
       roleId: [],
       titleId: ['', Validators.required],
       evaluatorName: ['', Validators.required],
       phoneNumber: ['', Validators.compose([Validators.required, Validators.pattern(CONSTANTS.patterns.phNo)])],
       alternatephoneNumber: ['', Validators.compose([Validators.required, Validators.pattern(CONSTANTS.patterns.phNo)])],
       email: ['', Validators.compose([Validators.pattern(CONSTANTS.patterns.email)])],
       aadhar: ['', Validators.compose([Validators.required, Validators.pattern(CONSTANTS.patterns.aadharNo)])],
       panCardNo: ['', Validators.compose([Validators.pattern(CONSTANTS.patterns.panNo)])],
       subjectIds: [''],
       profileValidFromDate: [new Date(), Validators.required],
       profileValidToDate: ['', Validators.required],
       isEmp: [],
       isActive: ['', Validators.required],
       reason: [''],
     });
 
    if (!this.isEmptyObject(this.data)) {
  this.getTitle();
  this.dialogTitle = 'Edit Exam Scan Profile';

  this.addevaluatorform.get('titleId').setValue(this.data.titleCatdetId);
  this.addevaluatorform.get('evaluatorName').setValue(this.data.scanProfileName);
  this.addevaluatorform.get('phoneNumber').setValue(this.data.phoneNumber);

  if (this.data.alternatePhoneNumber != null) {
    this.addevaluatorform.get('alternatephoneNumber').setValue(this.data.alternatePhoneNumber);
  }

  this.addevaluatorform.get('email').setValue(this.data.email);
  this.addevaluatorform.get('aadhar').setValue(this.data.aadhaarNo);
  this.addevaluatorform.get('panCardNo').setValue(this.data.panCardNo);

  this.addevaluatorform.get('profileValidFromDate').setValue(
    this.data.createdDt ? new Date(moment(this.data.createdDt).format()) : null
  );

  this.addevaluatorform.get('profileValidToDate').setValue(
    this.data.updatedDt ? new Date(moment(this.data.updatedDt).format()) : null
  );

  this.addevaluatorform.get('isActive').setValue(this.data.isActive);
  this.addevaluatorform.get('reason').setValue(this.data.reason);
  this.addevaluatorform.get('EmpuserId').setValue(this.data.userId);
}
     this.addevaluatorform.get('isEmp').setValue(false);
     this.addevaluatorform.get('isActive').setValue(true);
     this.employees.push({ firstName: 'Search by employee name or empNo.' });
     this.filteredEmployees.next(this.employees.slice());
     this.getData();
   }
 
   getData(): void {
     /*----------- COLLEGES -----------*/
     this.crudService.listDetailsById(this.collegeCrudUrl, 'true', this.isActive)
       .subscribe(result => {
         this.spinner.hide();
         if (result.statusCode === 200) {
           if (result.data.resultList && !_.isEmpty(result.data.resultList)) {
             this.colleges = result.data.resultList;
             this.universityColleges = this.colleges.filter(c => (c.isUniversity === true))
             this.getTitle();
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
   enteredEmployee(event): void {
     if (event.target.value.length > 4) {
       /*----------- Employees -----------*/
       this.crudService.listByIds(this.employeeSearchUrl, event.target.value, 'q')
         .subscribe(result => {
           if (result.statusCode === 200) {
             if (result.data && result.data !== '') {
               this.employees = result.data;
               this.filteredEmployees.next(this.employees.slice());
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
   setEmployee(event) {
     for (let i = 0; i < this.employees.length; i++) {
       if (event.value == this.employees[i].employeeId) {
         this.addevaluatorform.get('collegeId').setValue(this.employees[i].collegeId);
         this.addevaluatorform.get('email').setValue(this.employees[i].email);
         this.addevaluatorform.get('evaluatorName').setValue(this.employees[i].firstName);
         this.addevaluatorform.get('phoneNumber').setValue(this.employees[i].mobile);
         this.addevaluatorform.get('EmpuserId').setValue(this.employees[i].userId);
       }
     };
   }
   getTitle() {
     this.crudService.listDetailsById(this.generalDetailsUrl, this.title, this.generalDetailsByCodeUrl)
       .subscribe(result => {
         if (result.statusCode === 200) {
           if (result.data.resultList && result.data.resultList !== '') {
             this.titles = result.data.resultList;
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
   isEmptyObject(obj) {
     return (obj && (Object.keys(obj).length === 0));
   }
  submit(): void {
  if (this.addevaluatorform.valid) {
    this.Obj.titleCatdetId = this.addevaluatorform.value.titleId;
    this.Obj.userId = this.addevaluatorform.value.EmpuserId;
    this.Obj.scanProfileName = this.addevaluatorform.value.evaluatorName;
    this.Obj.phoneNumber = this.addevaluatorform.value.phoneNumber ? String(this.addevaluatorform.value.phoneNumber) : null;
    this.Obj.alternatePhoneNumber = this.addevaluatorform.value.alternatephoneNumber ? String(this.addevaluatorform.value.alternatephoneNumber) : null;
    this.Obj.email = this.addevaluatorform.value.email;
    this.Obj.aadhaarNo = this.addevaluatorform.value.aadhar ? String(this.addevaluatorform.value.aadhar) : null;
    this.Obj.panCardNo = this.addevaluatorform.value.panCardNo;
    this.Obj.isActive = this.addevaluatorform.value.isActive;
    this.Obj.reason = this.addevaluatorform.value.reason;
    this.Obj.createdDt = this.addevaluatorform.value.profileValidFromDate;
    this.Obj.updatedDt = this.addevaluatorform.value.profileValidToDate;
    this.Obj.createdUser = +localStorage.getItem('employeeId');
    this.Obj.updatedUser = +localStorage.getItem('employeeId');
    this.dialogRef.close(this.Obj);
  }
}

}
