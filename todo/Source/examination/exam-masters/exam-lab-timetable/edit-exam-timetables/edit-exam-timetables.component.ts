import { Component, OnInit, Inject } from '@angular/core';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { CONSTANTS } from 'app/main/common/constants';
import { GenericFunctions } from 'app/main/common/generic-functions';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { CampusModalComponent } from 'app/main/apps/admin/campus/campus-modal/campus-modal.component';
import { SnotifyService } from 'ng-snotify';
import { CrudService } from 'app/main/services/crud.service';
import { Router } from '@angular/router';
import { NgxSpinnerService } from 'ngx-spinner';

@Component({
  selector: 'app-edit-exam-timetables',
  templateUrl: './edit-exam-timetables.component.html',
  styleUrls: ['./edit-exam-timetables.component.scss']
})
export class EditExamTimetablesComponent implements OnInit {

  examTimetableForm: FormGroup;
  dialogTitle;

  examSessions: any[] = [];
  regulations: any[] = [];
  subRegulations: any[] = [];
  subjects: any[] = [];
  courseGroupYears: any[] = [];
  examFeeTypes: any[] = [];
  public dateFormate = CONSTANTS.dateFormate;
  minDate = this.genericFunctions.moment();
  maxDate = this.genericFunctions.moment();
  private collegewisedetailsUrl = CONSTANTS.collegewisedetailsUrl;
  private isActive = CONSTANTS.isActive;
  private generalDetailsUrl = CONSTANTS.generalDetailsUrl;
  private generalDetailsByCodeUrl = CONSTANTS.generalDetailsByCodeUrl;
  private examFeeType = CONSTANTS.examFeeType;
  private collegeWiseLabDetailsUrl=CONSTANTS.collegeWiseLabDetailsUrl;
  filtersDetailsList: any[] = [];
  dataList: any[] = [];
  examLabBatches: any[] = [];
  groupList: any[] = [];
  sessionsList=[];

  constructor( private genericFunctions: GenericFunctions, private formBuilder: FormBuilder, private dialogRef: MatDialogRef<CampusModalComponent>,
               @Inject(MAT_DIALOG_DATA) public data, private snotifyService: SnotifyService,
               private crudService: CrudService, public router: Router, private spinner: NgxSpinnerService) {
      
  }

  // tslint:disable-next-line:typedef
  ngOnInit() {
      this.dialogTitle = 'Edit Exam College Timetable';
      this.examTimetableForm = this.formBuilder.group({
          examSessionId: ['', Validators.required],
          examDate: [],
          // regulationId: ['', Validators.required],
          // subjectId: ['', Validators.required],
          isActive: [],
          id: [],
          reason: []
      });

      if (!this.isEmptyObject(this.data)) {
           this.examTimetableForm.get('examSessionId').setValue(this.data.examSessionId);
           this.examTimetableForm.get('examDate').setValue(this.data.examDate);
          //  this.examTimetableForm.get('regulationId').setValue(this.data.regulationId);
          //  this.examTimetableForm.get('subjectId').setValue(this.data.subjectId);
           this.examTimetableForm.get('isActive').setValue(this.data.is_active);
           this.examTimetableForm.get('reason').setValue(this.data.reason);
           this.minDate = this.genericFunctions.momentWithDate(this.data.fromDate);
           this.maxDate = this.genericFunctions.momentWithTime(this.data.toDate);
           this.getData();

      }
  }

  getData(): void {
          this.filtersDetailsList =[]
          this.examSessions=[]
          this.regulations=[]
          this.dataList = [];
          this.subjects = [];
          this.spinner.show()
          let request = [
          
            {paramName: 'in_flag', paramValue: 'clg_exam_labsubject_filters'},
            {paramName: 'in_org_id', paramValue:+localStorage.getItem('organizationId')},
            {paramName: 'in_college_id', paramValue: this.data.collegeId?this.data.collegeId:0},
            {paramName: 'in_course_id', paramValue: this.data.courseId?this.data.courseId:0},
            {paramName: 'in_course_group_id', paramValue: 0},
            {paramName: 'in_course_year_id', paramValue: this.data.courseYearId?this.data.courseYearId:0},
            {paramName: 'in_group_section_id', paramValue: 0},
            {paramName: 'in_academic_year_id', paramValue: this.data.academicYearId?this.data.academicYearId:0},
            // {paramName: 'in_regulation_id', paramValue: 0},
            {paramName: 'in_dept_id', paramValue: 0},
            {paramName: 'in_isadmin', paramValue: 0},
            {paramName: 'in_exam_id', paramValue: this.data.examId?this.data.examId:0},
            {paramName: 'in_loginuser_empid', paramValue: +localStorage.getItem('employeeId')},
            {paramName: 'in_loginuser_roleid', paramValue: 0},
            {paramName: 'in_employee', paramValue: ''},
            {paramName: 'in_subject', paramValue: ''},
            {paramName: 'in_gm_codes', paramValue:''},
          ];
          this.crudService.getDetailsByRequest(this.collegeWiseLabDetailsUrl, '', request, '&')
        .subscribe(result =>  {
                this.spinner.hide();
                if (result.statusCode === 200) {
                  if (result.data && result.data !== '' && result.data.result.length > 0) {
                    this.filtersDetailsList = result.data.result[0];
                    this.sessionsList = result.data.result[1];
                    if (this.filtersDetailsList.filter(x => (x.fk_college_id == this.data.collegeId && x.fk_course_id == this.data.courseId 
                      && x.fk_course_year_id == this.data.courseYearId && x.fk_exam_id == this.data.examId)).length > 0){
                          this.dataList = this.filtersDetailsList.filter(x => (x.fk_college_id == this.data.collegeId && x.fk_course_id == this.data.courseId 
                          && x.fk_course_year_id == this.data.courseYearId && x.fk_exam_id == this.data.examId)); 
                          
                          // for (let i = 0; i < this.dataList.length; i++){
                          //     if (this.examSessions.filter(x => (x.examSessionId === this.dataList[i].fk_exam_session_id)).length === 0){
                          //         this.examSessions.push({
                          //             examSessionName: this.dataList[i].exam_display_session_name,
                          //             examSessionId: this.dataList[i].fk_exam_session_id,
                          //             sessionStartTime: this.dataList[i].session_start_time,
                          //             sessionEndTime: this.dataList[i].session_end_time
                          //         });
                          //     }
                          // }
                          for (let i = 0; i < this.sessionsList.length; i++){
                            if (this.examSessions.filter(x => (x.examSessionId === this.sessionsList[i].fk_exam_session_id)).length === 0){
                                this.examSessions.push({
                                    examSessionName: this.sessionsList[i].exam_display_session_name,
                                    examSessionId: this.sessionsList[i].fk_exam_session_id,
                                    sessionStartTime: this.sessionsList[i].session_start_time,
                                    sessionEndTime: this.sessionsList[i].session_end_time
                                });
                            }
                        }
                          if (this.data.examSessionId != null){
                              this.selectedSession(this.data.examSessionId);
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
      
              this.crudService.listDetailsByTwoIds(this.generalDetailsUrl, this.examFeeType, 'true', this.generalDetailsByCodeUrl, this.isActive)
                  .subscribe(result => {
                      if (result.statusCode === 200){
                                  if (result.data.resultList && result.data.resultList !== '') {
                                      this.examFeeTypes = result.data.resultList;
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

  selectedSession(examSessionId): void{
      // if (examSessionId != null){
      //     for (let i = 0; i < this.dataList.length; i++){
      //         // if (this.dataList[i].fk_exam_session_id === examSessionId){
      //             if (this.regulations.filter(x=>(x.regulationId === this.dataList[i].fk_regulation_id)).length === 0){
      //                 this.regulations.push({
      //                     regulationId: this.dataList[i].fk_regulation_id,
      //                     regulationName: this.dataList[i].regulation_code
      //                 });
      //             }
      //         // }
      //     }
      // }
      // this.selectedRegulation(this.data.regulationId);

      this.getExamLabBatches(this.data?.subjectId, this.data?.subjectCode);

  }
  
    selectedRegulation(regulationId): void{
        if (regulationId != null){
            this.subjects = [];
          for (let i = 0; i < this.dataList.length; i++){
              if (this.dataList[i].fk_regulation_id === regulationId){
              if (this.subjects.filter(x => (x.subjectCode === this.dataList[i].subject_code)).length === 0){
                  this.subjects.push({
                      subjectId: this.dataList[i].fk_subject_id,
                      subjectName: this.dataList[i].subject_name,
                      subjectCode: this.dataList[i].subject_code,
                      subject_type: this.dataList[i].subject_type,
                      collegeId: this.dataList[i].fk_college_id,
                  });
              }
              }
          }
        }
        this.selectedSubject(this.data.subjectId);
    }

    selectedSubject(subjectId): void{
      if (subjectId != null){
         let subjectCode = this.subjects.filter(x=>(x.subjectId === subjectId))[0].subjectCode;
         this.courseGroupYears = [];
         this.getExamLabBatches(subjectId, subjectCode);
      }
   }
 
   getExamLabBatches(subjectId, subjectCode): void{
    this.examLabBatches = this.dataList.filter(x=>(x.subject_code === subjectCode && x.fk_eaxm_labbatch_id != null));
    let subjectObj = this.dataList.filter(x => (x.fk_subject_id === subjectId))[0];
    if (this.examLabBatches.length > 0 && subjectObj.subject_type === 'LAB'){
      let z = 1;
      for(let n = 0; n < this.examLabBatches.length; n++){
        this.courseGroupYears.push({
          id: z,
          courseGroupId: this.examLabBatches[n].fk_course_group_id,
          groupName: this.examLabBatches[n].group_code,
          subjectName: this.examLabBatches[n].subject_name,
          subjecttypeName: this.examLabBatches[n].subject_type,
          courseYearName:  this.data.courseYearName,
          regulationName: this.examLabBatches[n].regulation_code,
          examLabBatchesId: this.examLabBatches[n].fk_eaxm_labbatch_id,
          reg: this.examLabBatches[n].examTypeCatCode,
          c: false,
          batch: this.examLabBatches[n].labbatch_name,
          examTimetableDetId: this.examLabBatches[n].fk_exam_timetable_det_id,
          checked: false,
          examTypeCatId: this.examLabBatches[n].fk_examtype_catdet_id,
          examDate: this.genericFunctions.momentFormatYMD1(this.examTimetableForm.value.examDate),
          collegeId: this.data.collegeId,
          courseYearId: this.data.courseYearId,
          regulationId: this.data?.regulationId,
          subjectId: this.data?.subjectId,
          isActive: true
      });
      z++;
      }

  }

  if (this.courseGroupYears.filter(x => (x.regulationId === this.data.regulationId && x.subjectId === this.data.subjectId && x.subjectId === this.data.subjectId && x.examTypeCatId === this.data.examTypeCatId && x.courseGroupId === this.data.courseGroupId)).length > 0){
    this.examTimetableForm.get('id').setValue(this.courseGroupYears.filter(x => (x.examLabBatchesId == this.data.examLabBatchesId))[0]?.id)
    // tslint:disable-next-line: max-line-length
    // this.examTimetableForm.get('id').setValue(this.courseGroupYears.filter(x => (x.regulationId === this.data.regulationId && x.subjectId === this.data.subjectId && x.subjectId === this.data.subjectId  && x.examTypeCatId === this.data.examTypeCatId && x.courseGroupId === this.data.courseGroupId))[0].id);
 }

      //  this.examLabBatches = this.dataList.filter(x=>(x.subject_code === subjectCode && x.fk_eaxm_labbatch_id != null));
             
      //                        let subjectObj = this.dataList.filter(x => (x.fk_subject_id === subjectId))[0];
      //                        let isFlag = false;
      //                           //  for (let i = 0; i < this.subRegulations.filter(x => (x.subjectId === subjectId)).length; i++){
      //                                 // tslint:disable-next-line: prefer-for-of
      //                                 let generalDetailCode;
      //                                 let generalDetailId;
      //                                 for (let j = 0; j < this.examFeeTypes.length; j++){
      //                                       if (this.examFeeTypes[j].generalDetailCode === 'Internal' && subjectObj.is_internal_exam === true) {
      //                                          generalDetailId = this.examFeeTypes[j].generalDetailId;
      //                                          generalDetailCode = this.examFeeTypes[j].generalDetailCode;
      //                                          this.createGroup(subjectObj,generalDetailId,generalDetailCode,subjectCode, subjectObj.subject_type);
      //                                       }else if (this.examFeeTypes[j].generalDetailCode === 'Regular' && subjectObj.is_regular_exam === true) {
      //                                          generalDetailId = this.examFeeTypes[j].generalDetailId;
      //                                          generalDetailCode = this.examFeeTypes[j].generalDetailCode;
      //                                          this.createGroup(subjectObj,generalDetailId,generalDetailCode,subjectCode, subjectObj.subject_type);
      //                                       }else if (this.examFeeTypes[j].generalDetailCode === 'Supple' && subjectObj.is_supply_exam === true) {
      //                                          generalDetailId = this.examFeeTypes[j].generalDetailId;
      //                                          generalDetailCode = this.examFeeTypes[j].generalDetailCode;
      //                                          this.createGroup(subjectObj,generalDetailId,generalDetailCode,subjectCode, subjectObj.subject_type);
      //                                       }
      //                                      // tslint:disable-next-line: max-line-length
                                        
      //                             }
  
   }
 
   createGroup(subjectObj,generalDetailId,generalDetailCode, subjectCode, subjectType){
         this.groupList = [];
         
           this.groupList = this.dataList.filter(x=> (x.subject_code === subjectCode));
         
           if (this.examLabBatches.length > 0 && subjectType === 'LAB'){
              let z = 1;
                 for(let n = 0; n < this.examLabBatches.length; n++){
                   this.groupList.map(grp=>{
                      if (this.examLabBatches[n].fk_subject_id  === grp.fk_subject_id){
                 
                       if (this.courseGroupYears.filter(x => (x.courseGroupId === grp.fk_course_group_id 
                           && x.examTypeCatId === generalDetailId && x.examLabBatchesId === this.examLabBatches[n].fk_eaxm_labbatch_id)).length === 0){
                          
                           this.courseGroupYears.push({
                               id: z,
                               courseGroupId: grp.fk_course_group_id,
                               groupName: grp.group_code,
                               subjectName: grp.subject_name,
                               subjecttypeName: grp.subject_type,
                               courseYearName:  this.data.courseYearName,
                               regulationName: grp.regulation_code,
                               examLabBatchesId: this.examLabBatches[n].fk_eaxm_labbatch_id,
                               reg: generalDetailCode,
                               c: false,
                               batch: this.examLabBatches[n].labbatch_name,
                               examTimetableDetId: this.examLabBatches[n].fk_exam_timetable_det_id,
                               checked: false,
                               examTypeCatId: generalDetailId,
                               examDate: this.genericFunctions.momentFormatYMD1(this.examTimetableForm.value.examDate),
                               collegeId: this.data.collegeId,
                               courseYearId: this.data.courseYearId,
                               regulationId: this.examTimetableForm.value.regulationId,
                               subjectId: this.examTimetableForm.value.subjectId,
                               isActive: true
                           });
                       }
                      } 
                      z++;
                   })
                   
                 }
             }else if (subjectType != 'LAB'){
               let z = 1;
               this.groupList.map(grp=>{
                   if (this.courseGroupYears.filter(x => (x.courseGroupId === grp.fk_course_group_id && x.examTypeCatId === generalDetailId
                   )).length === 0){
                 this.courseGroupYears.push({
                  id: z,
                   courseGroupId: grp.fk_course_group_id,
                   groupName: grp.group_code,
                   subjectName: grp.subject_name,
                   subjecttypeName: grp.subject_type,
                   courseYearName:  this.data.courseYearName,
                   regulationName: grp.regulation_code,
                     reg: generalDetailCode,
                     c: false,
                     batch: null,
                     examLabBatchesId: null,
                     checked: false,
                     examTypeCatId: generalDetailId,
                     examDate: this.genericFunctions.momentFormatYMD1(this.examTimetableForm.value.examDate),
                     collegeId: this.data.collegeId,
                     courseYearId: this.data.courseYearId,
                     regulationId: this.examTimetableForm.value.regulationId,
                     subjectId: this.examTimetableForm.value.subjectId,
                     isActive: true
                 });
               }
               z++;
               });
        }
        if (this.courseGroupYears.filter(x => (x.regulationId === this.data.regulationId && x.subjectId === this.data.subjectId && x.subjectId === this.data.subjectId && x.examTypeCatId === this.data.examTypeCatId && x.courseGroupId === this.data.courseGroupId)).length > 0){
          this.examTimetableForm.get('id').setValue(this.courseGroupYears.filter(x => (x.examLabBatchesId == this.data.examLabBatchesId))[0]?.id)
          // tslint:disable-next-line: max-line-length
          // this.examTimetableForm.get('id').setValue(this.courseGroupYears.filter(x => (x.regulationId === this.data.regulationId && x.subjectId === this.data.subjectId && x.subjectId === this.data.subjectId  && x.examTypeCatId === this.data.examTypeCatId && x.courseGroupId === this.data.courseGroupId))[0].id);
       }
   }

tConvert(time): any{
  if (time !== null && time !== undefined){
     time = time.toString ().match (/^([01]\d|2[0-3])(:)([0-5]\d)(:[0-5]\d)?$/) || [time];
     if (time.length > 1) { // If time format correct
       time = time.slice (1);  // Remove full string match value
       time[5] = +time[0] < 12 ? 'AM' : 'PM'; // Set AM/PM
       time[0] = +time[0] % 12 || 12; // Adjust hours
     }
     time = time[0] + time[1] + time[2] + ' ' + time[5];
     return time; 
  }
}

// tslint:disable-next-line:typedef
isEmptyObject(obj) {
  return (obj && (Object.keys(obj).length === 0));
}

submit(): void {
  const Obj = this.examTimetableForm.value;
  Obj.regulationId=this.data?.regulationId
  Obj.subjectId=this.data?.subjectId
  Obj.examLabBatchesId = this.courseGroupYears.filter(x => (x.id === this.examTimetableForm.value.id))[0].examLabBatchesId;
  Obj.examTimetableDetId = this.courseGroupYears.filter(x => (x.id === this.examTimetableForm.value.id))[0].examTimetableDetId;
  if (this.courseGroupYears.filter(x => (x.id === this.examTimetableForm.value.id)).length > 0){
     Obj.examTypeCatId = this.courseGroupYears.filter(x => (x.id === this.examTimetableForm.value.id))[0].examTypeCatId;
     Obj.courseGroupId = this.courseGroupYears.filter(x => (x.id === this.examTimetableForm.value.id))[0].courseGroupId;
     Obj.examLabBatchesId = this.courseGroupYears.filter(x => (x.id === this.examTimetableForm.value.id))[0].examLabBatchesId;
  }
  console.log(Obj);
  
  if (this.examTimetableForm.invalid) {
      return;
  } else {
      this.dialogRef.close(Obj);
  }
}

}
