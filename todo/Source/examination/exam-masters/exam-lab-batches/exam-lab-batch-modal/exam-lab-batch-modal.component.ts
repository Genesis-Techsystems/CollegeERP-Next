import { Component, OnInit, Inject } from '@angular/core';
import { GenericFunctions } from 'app/main/common/generic-functions';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { SnotifyService } from 'ng-snotify';
import { CrudService } from 'app/main/services/crud.service';
import { Router } from '@angular/router';
import { CONSTANTS } from 'app/main/common/constants';
import { College } from 'app/main/models/college';
import { Course } from 'app/main/models/course';
import { GeneralDetail } from 'app/main/models/generalDetail';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

@Component({
  selector: 'app-exam-lab-batch-modal',
  templateUrl: './exam-lab-batch-modal.component.html',
  styleUrls: ['./exam-lab-batch-modal.component.scss']
})
export class ExamLabBatchModalComponent implements OnInit {

  private collegeCrudUrl = CONSTANTS.collegeCrudUrl;
  private getDetailsByCollegeIdUrl = CONSTANTS.getDetailsByCollegeIdUrl;
  private courseCrudUrl = CONSTANTS.courseCrudUrl;
  private generalDetailsUrl = CONSTANTS.generalDetailsUrl;
  private generalDetailsByCodeUrl = CONSTANTS.generalDetailsByCodeUrl;
  private isActive = CONSTANTS.isActive;
  private subjectType = CONSTANTS.subjectType;
  private examFeeType = CONSTANTS.examFeeType;
  studentBatchForm: FormGroup;
  colleges: College[] = [];
  courses: Course[] = [];
  subjectTypeDetails: GeneralDetail[] = [];
  dialogTitle;
  examFeeTypes=[];
  examTypes=[];
  examList:any
  newData:any;
  disble:boolean=false
  constructor(private genericFunctions: GenericFunctions , private formBuilder: FormBuilder, private dialogRef: MatDialogRef<any>,
              @Inject(MAT_DIALOG_DATA) private data, private snotifyService: SnotifyService,
              private crudService: CrudService, public router: Router) {   
    this.getExamTypes();
    this.getColleges();
}

  // tslint:disable-next-line:typede
  ngOnInit() {
    this.dialogTitle = 'Add Exam Lab Batch';
    this.studentBatchForm = this.formBuilder.group({
      batchName: ['', Validators.required],
      capacity: [''],
      sortOrder: [],
      isActive: [true],
      reason: [],
      examtypeCatdetId: []
    });
    this.newData=this.data
    console.log(this.newData);

    if (!this.isEmptyObject(this.data[0])){
        if(this.data[0].batchName != null){
            this.getExamTypes();
            this.studentBatchForm.get('batchName').setValue(this.data[0].batchName);
            this.studentBatchForm.get('capacity').setValue(this.data[0].capacity);
            this.studentBatchForm.get('sortOrder').setValue(this.data[0].sortOrder);
            this.studentBatchForm.get('isActive').setValue(this.data[0].isActive);
            this.studentBatchForm.get('reason').setValue(this.data[0].reason);
            this.studentBatchForm.get('examtypeCatdetId').setValue(this.data[0]?.examtypeCatdetId);
            this.dialogTitle = 'Edit Exam Lab Batch';
            this.disble=true
        }
        else{
            this.studentBatchForm.get('isActive').setValue(true);
            this.studentBatchForm.get('reason').setValue('active');
        }
       
    }

  }
  getExamTypes(){
    this.examTypes=[]
    this.crudService.listDetailsByTwoIds(this.generalDetailsUrl, this.examFeeType, 'true', this.generalDetailsByCodeUrl, this.isActive)
    .subscribe(result => {
        if (result.statusCode === 200){
                    if (result.data.resultList && result.data.resultList !== '') {
                      this.examTypes=result.data.resultList
                      this.examFeeTypes = [];
                      this.examList=this.data[1]
                      console.log( this.examList);
                      if(this.data[0].batchName != null && this.examTypes.length>0){
                        for (let i = 0; i < this.examTypes.length; i++){
                            if(this.examList.filter(x => (x.fk_exam_id == this.data[0].examMasterId))[0]?.is_regular_exam){
                              if (this.examTypes[i].generalDetailCode === 'Regular'){
                                this.examFeeTypes.push(this.examTypes[i]);
                             }
                            }
                            if(this.examList.filter(x => (x.fk_exam_id == this.data[0].examMasterId))[0]?.is_supply_exam){
                              if (this.examTypes[i].generalDetailCode === 'Supple'){
                                this.examFeeTypes.push(this.examTypes[i]);
                             }
                            }
                            if(this.examList.filter(x => (x.fk_exam_id == this.data[0].examMasterId))[0]?.is_internal_exam){
                              if (this.examTypes[i].generalDetailCode === 'Internal'){
                                this.examFeeTypes.push(this.examTypes[i]);
                             }
                            }
                              
                          }
                        this.studentBatchForm.get('examtypeCatdetId').setValue(this.data[0]?.examtypeCatdetId);
                      }
                      else{
                        for (let i = 0; i < this.examTypes.length; i++){
                            if(this.examList.filter(x => (x.fk_exam_id == this.data[0].examId))[0]?.is_regular_exam){
                              if (this.examTypes[i].generalDetailCode === 'Regular'){
                                this.examFeeTypes.push(this.examTypes[i]);
                             }
                            }
                            if(this.examList.filter(x => (x.fk_exam_id == this.data[0].examId))[0]?.is_supply_exam){
                                if (this.examTypes[i].generalDetailCode === 'Supple'){
                                  this.examFeeTypes.push(this.examTypes[i]);
                               }
                              }
                              if(this.examList.filter(x => (x.fk_exam_id == this.data[0].examId))[0]?.is_internal_exam){
                                if (this.examTypes[i].generalDetailCode === 'Internal'){
                                  this.examFeeTypes.push(this.examTypes[i]);
                               }
                              }
                      }
                    }
  
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
  /*---------- GET COLLEGES ----------*/
  getColleges(): void{       
    this.crudService.listDetailsById(this.collegeCrudUrl, 'true', this.isActive)
    .subscribe(result => {
          if (result.statusCode === 200){
              if (result.data.resultList && result.data.resultList !== '') {
                  this.colleges = result.data.resultList;
                 // this.selectedCollege(this.studentBatchForm.value.collegeId);
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

  // tslint:disable-next-line:typedef
  selectedCollege(collegeId){
     /*---------- GET COURSES --------------*/            
     this.crudService.listDetailsByTwoIds(this.courseCrudUrl, collegeId, 'true',  this.getDetailsByCollegeIdUrl, this.isActive)
     .subscribe(result => {
           if (result.statusCode === 200){
               if (result.data.resultList && result.data.resultList !== '') {
                   this.courses = result.data.resultList;
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

     /*----------- DOC TYPE -----------*/
     this.crudService.listDetailsByTwoIds(this.generalDetailsUrl, this.subjectType, 'true', this.generalDetailsByCodeUrl, this.isActive)
    .subscribe(result => {
        if (result.statusCode === 200){
                  if (result.data.resultList && result.data.resultList !== '') {
                      this.subjectTypeDetails = result.data.resultList;
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

  // tslint:disable-next-line:typedef
  isEmptyObject(obj) {
    return (obj && (Object.keys(obj).length === 0));
}

submit(): void{
  let request = {
    collegeId :this.data[0]?.collegeId,
    examMasterId :this.data[0]?.examId,
    subjectId :this.data[0]?.subjectId,
    courseGroupId:this.data[0]?.courseGroupId,
    courseYearId:this.data[0]?.courseYearId,
    regulationId:this.data[0]?.regulationId,
    batchName :this.studentBatchForm.value.batchName,
    sortOrder :this.studentBatchForm.value.sortOrder,
     capacity :this.studentBatchForm.value.capacity,
     isActive:this.studentBatchForm.value.isActive,
     examtypeCatdetId:this.studentBatchForm.value.examtypeCatdetId
  }
    const Obj = request;
    console.log(Obj,'Obj');
    
    if (this.studentBatchForm.invalid) {
            return;
        }else{
          this.dialogRef.close(Obj);
        }
}

}
