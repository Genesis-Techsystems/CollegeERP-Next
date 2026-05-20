import { Component, OnInit, Inject } from '@angular/core';
import { CONSTANTS } from 'app/main/common/constants';
import { FormBuilder, Validators, FormGroup } from '@angular/forms';
import { SnotifyService } from 'ng-snotify';
import { CrudService } from 'app/main/services/crud.service';
import { NgxSpinnerService } from 'ngx-spinner';
import { Router } from '@angular/router';
import { GenericFunctions } from 'app/main/common/generic-functions';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatTableDataSource } from '@angular/material/table';

@Component({
  selector: 'app-add-additional-fee',
  templateUrl: './add-additional-fee.component.html',
  styleUrls: ['./add-additional-fee.component.scss']
})

export class AddAdditionalFeeComponent implements OnInit {

  displayedColumns: string[] = ['id', 'adtExamfeetypeCatDisplayName', 'fee', 'actions'];
  dataSource: MatTableDataSource<any>;

  private isActive = CONSTANTS.isActive;
  invStaffForm: FormGroup;
  private examFeeStructureCrudUrl = CONSTANTS.examFeeStructureCrudUrl;
  private examFeeRevisionMasterCrudUrl = CONSTANTS.examFeeRevisionMasterCrudUrl;

  examFeeStructurelist: any[] = [];
  addFeeStructures: any[] = [];
  addExamFeeList: any[] = [];
  examRevisionMaster: any[] = [];
  examStudentDetails = [];
  selectedSubjects: any[] = [];
  revisedSubjects: any[] = [];
  addFeeType;
  selectedCount = 0;
  checksubject = false;
  flag = false;
  revisedAmt;

  constructor(private formBuilder: FormBuilder, private snotifyService: SnotifyService,
              private crudService: CrudService, private spinner: NgxSpinnerService, private router: Router,
              private dialog: MatDialog, private genericFunctions: GenericFunctions, private dialogRef: MatDialogRef<any>,
              @Inject(MAT_DIALOG_DATA) public data) {

  }

  // tslint:disable-next-line:typedef
  ngOnInit() {
    this.invStaffForm = this.formBuilder.group({
      feeAddtId: ['', Validators.required],
      examRevisionTypeId: [''],
      fee: [0, Validators.required],
      isActive: [true],    
    });  

    if (!this.isEmptyObject(this.data)){
      this.addExamFeeList = this.data.examAdditionalFeeReceiptDTOs;
      this.examStudentDetails = [];
      if (this.data.examStudentDTOs.length > 0){
        // tslint:disable-next-line: prefer-for-of
        for (let i = 0; i < this.data.examStudentDTOs[0].examStudentDetailDTOs.length; i++){
           if (this.data.examStudentDTOs[0].examStudentDetailDTOs[i].isPresent){
            this.data.examStudentDTOs[0].examStudentDetailDTOs[i].isSelected = false;
            this.data.examStudentDTOs[0].examStudentDetailDTOs[i].studentId = this.data.examStudentDTOs[0].studentId;
            this.data.examStudentDTOs[0].examStudentDetailDTOs[i].checked = false;
            if (this.data.examStudentDTOs[0].examStudentDetailDTOs[i].subjecttypeCode !== 'LAB'){
              this.examStudentDetails.push(this.data.examStudentDTOs[0].examStudentDetailDTOs[i]);
            }
           }
        }
      }
      this.getExamFeeStructure(this.data.examFeeStructureId);
    }

    this.dataSource = new MatTableDataSource<any>(this.addExamFeeList);
  }

  getExamFeeStructure(examFeeStructureId): void {
    if (examFeeStructureId != null) {
        this.crudService.listDetailsById(this.examFeeStructureCrudUrl, examFeeStructureId, 'examFeeStructureId')
            .subscribe(result => {
                if (result.statusCode === 200) {
                    if (result.data.resultList && result.data.resultList !== '') {
                        this.examFeeStructurelist = result.data.resultList;
                        this.addFeeStructures = [];
                        if (this.examFeeStructurelist.length > 0){
                            // tslint:disable-next-line: prefer-for-of
                            for (let i = 0; i < this.examFeeStructurelist[0].examFeeAdditionalStructure.length; i++){
                              // if (this.data.courseYearId === this.data.studentCourseYearId){
                                  if (this.examFeeStructurelist[0].examFeeAdditionalStructure[i].examTypeCatDisplayCode === this.data.examtypeCatCode){
                                      this.addFeeStructures.push(this.examFeeStructurelist[0].examFeeAdditionalStructure[i]);
                                  }
                              //  }else{
                              //      if (this.examFeeStructurelist[0].examFeeAdditionalStructure[i].examTypeCatDisplayCode === 'Supple'){
                              //         this.addFeeStructures.push(this.examFeeStructurelist[0].examFeeAdditionalStructure[i]);
                              //       }
                              //  }
                            }
                           // this.addFeeStructures = this.examFeeStructurelist[0].examFeeAdditionalStructure;
                        }
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
  }

  SelectedFeeType(feeAddtId): void{
     if (this.addFeeStructures.filter(x => (x.feeAddtId === feeAddtId)).length > 0){
        this.invStaffForm.get('fee').enable();
        this.addFeeType = this.addFeeStructures.filter(x => (x.feeAddtId === feeAddtId))[0].adtExamfeetypeCatCode;
        if (this.addFeeType === 'REVISEDSUBJECTS'){
           this.data.type = 'REVISION';
           this.getRevisionMaster();
        }else{
          this.data.type = 'NOTREVISION';
        }
        this.invStaffForm.get('fee').setValue(this.addFeeStructures.filter(x => (x.feeAddtId === feeAddtId))[0].fee);
        if (this.addFeeStructures.filter(x => (x.feeAddtId === feeAddtId))[0].fee > 0){
            this.invStaffForm.get('fee').disable();
        }
     }  
  } 

  SelectedRevisionType(examRevisionTypeId): void{
      if (examRevisionTypeId != null){
        this.flag = true;
        if (this.examRevisionMaster.filter(x => (x.examRevisionTypeId === examRevisionTypeId)).length > 0){
           this.revisedAmt = this.examRevisionMaster.filter(x => (x.examRevisionTypeId === examRevisionTypeId))[0].amount;
           this.invStaffForm.get('fee').setValue(this.examRevisionMaster.filter(x => (x.examRevisionTypeId === examRevisionTypeId))[0].amount);
           this.invStaffForm.get('fee').disable();
        }
      }
  }

  getRevisionMaster(): void{
    this.crudService.listDetailsByTwoIds(this.examFeeRevisionMasterCrudUrl, this.data.courseId, 'true', 'course.courseId', 'isActive')
    .subscribe(result => {
        if (result.statusCode === 200) {
            if (result.data.resultList && result.data.resultList !== '') {
                this.examRevisionMaster = result.data.resultList;
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

  addDetails(): void{
    if (this.addFeeStructures.filter(x => (x.feeAddtId === this.invStaffForm.value.feeAddtId)).length > 0){
       if (this.addFeeStructures.filter(x => (x.feeAddtId === this.invStaffForm.value.feeAddtId))[0].fee > 0){
          this.addExamFeeList.push({
            addtExamFeeTypeName: this.addFeeStructures.filter(x => (x.feeAddtId === this.invStaffForm.value.feeAddtId))[0].adtExamfeetypeCatDisplayName,
            addtFeeAmount: this.addFeeStructures.filter(x => (x.feeAddtId === this.invStaffForm.value.feeAddtId))[0].fee,
            isActive: true,
            collegeId: this.data.collegeId,
            addtExamFeeTypeCatId: this.addFeeStructures.filter(x => (x.feeAddtId === this.invStaffForm.value.feeAddtId))[0].adtExamfeetypeCatId,
            collectedEmpId: +localStorage.getItem('employeeId'),
            addtReceiptDate: this.genericFunctions.moment(),
            examFeeReceiptId: this.data.examFeeReceiptId
          });
       }else{
          this.addExamFeeList.push({
            addtExamFeeTypeName: this.addFeeStructures.filter(x => (x.feeAddtId === this.invStaffForm.value.feeAddtId))[0].adtExamfeetypeCatDisplayName,
            addtFeeAmount: this.invStaffForm.value.fee,
            isActive: true,
            collegeId: this.data.collegeId,
            addtExamFeeTypeCatId: this.addFeeStructures.filter(x => (x.feeAddtId === this.invStaffForm.value.feeAddtId))[0].adtExamfeetypeCatId,
            collectedEmpId: +localStorage.getItem('employeeId'),
            addtReceiptDate: this.genericFunctions.moment(),
            examFeeReceiptId: this.data.examFeeReceiptId
          });
       }
    }
    this.dataSource = new MatTableDataSource<any>(this.addExamFeeList);
    this.clear();
  }

  deleteAddExamFee(item, index): void{
    if (index > -1) {
      this.addExamFeeList.splice(index, 1);
    }
    this.dataSource = new MatTableDataSource<any>(this.addExamFeeList);
  }

  clear(): void{
    this.invStaffForm.get('feeAddtId').setValue('');
    this.invStaffForm.get('fee').setValue(0);
  }

  // tslint:disable-next-line:typedef
  isEmptyObject(obj) {
    return (obj && (Object.keys(obj).length === 0));
  }

  checkedSubjects(check, item): void{
    item.isSelected = check;
    this.selectedCount = 0;
    this.selectedSubjects = [];
    // tslint:disable-next-line: prefer-for-of
    for (let i = 0; i < this.examStudentDetails.length; i++){
        if (this.examStudentDetails[i].isSelected){
           this.selectedSubjects.push(this.examStudentDetails[i]);
           this.selectedCount++;
        }
    }
    this.getMarkStatus();
  }

  getMarkStatus(): void{
    // tslint:disable-next-line: prefer-for-of
    for (let i = 0; i < this.examStudentDetails.length; i++){
        if (!this.examStudentDetails[i].isSelected){
            this.checksubject = false;
            break;
        }else{
            this.checksubject = true;
        }
    }
  }

  markAll(): void{
    this.selectedCount = 0;
    this.selectedSubjects = [];
    // tslint:disable-next-line: prefer-for-of
    for (let i = 0; i < this.examStudentDetails.length; i++){
         if (!this.checksubject){
            this.examStudentDetails[i].checked = false;
            this.examStudentDetails[i].isSelected = false;
         }else{
          this.examStudentDetails[i].checked = true;
          this.examStudentDetails[i].isSelected = true;
          this.selectedSubjects.push(this.examStudentDetails[i]);
          this.selectedCount++;
         }
      }
  }

  submit(): void {
    this.revisedSubjects = [];
   // if (this.addExamFeeList.length === 0) {
   //     return;
   // } else {
    let addFee = 0;
    // tslint:disable-next-line: prefer-for-of
    for (let i = 0; i < this.addExamFeeList.length; i++){
            addFee = addFee + this.addExamFeeList[i].addtFeeAmount;
        }
    if (this.data.type === 'NOTREVISION'){
            this.data.examAddtFee = addFee;
            this.data.examTotalAmount = this.data.examFeeAmount + this.data.examFineAmount + this.data.examAddtFee;
            this.data.examAdditionalFeeReceiptDTOs = this.addExamFeeList;
        }else{
            this.data.examAdditionalFeeReceiptDTOs = [];
            // tslint:disable-next-line: prefer-for-of
            for (let i = 0; i < this.examStudentDetails.length; i++){
                 if (this.examStudentDetails[i].checked){
                     this.examStudentDetails[i].examRevisionTypeCatId = this.invStaffForm.value.examRevisionTypeId;
                     this.examStudentDetails[i].previousMarks = this.examStudentDetails[i].marks;
                     this.revisedSubjects.push(this.examStudentDetails[i]);
                 } 
            }
            const revisedAmt = this.revisedSubjects.length * this.examRevisionMaster.filter(x => (x.examRevisionTypeId === this.invStaffForm.value.examRevisionTypeId))[0].amount;
            this.data.examAdditionalFeeReceiptDTOs.push({
              collegeId: this.data.collegeId,
              examFeeReceiptId: this.data.examFeeReceiptId,
              feeAddtId: this.invStaffForm.value.feeAddtId,
              addtFeeAmount: revisedAmt,
              isActive: true,
              addtExamFeeTypeCatId: this.addFeeStructures.filter(x => (x.feeAddtId === this.invStaffForm.value.feeAddtId))[0].adtExamfeetypeCatId,
              collectedEmpId: +localStorage.getItem('employeeId'),
              addtReceiptDate: this.genericFunctions.moment(),
              examRevisionSubjectDTOs: this.revisedSubjects
            });
            if (this.data.examAddtFee != null){
               this.data.examAddtFee = this.data.examAddtFee + revisedAmt;
            }
            this.data.examTotalAmount = this.data.examFeeAmount + this.data.examFineAmount + this.data.examAddtFee;
        }
    this.dialogRef.close(this.data);
   // }
  }
}
