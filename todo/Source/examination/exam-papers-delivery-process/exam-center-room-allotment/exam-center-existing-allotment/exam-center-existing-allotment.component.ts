import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute, Router } from '@angular/router';
import { CONSTANTS } from 'app/main/common/constants';
import { GenericFunctions } from 'app/main/common/generic-functions';
import { GeneralDetail } from 'app/main/models/generalDetail';
import { CrudService } from 'app/main/services/crud.service';
import { SnotifyService } from 'ng-snotify';
import { NgxSpinnerService } from 'ngx-spinner';
import { ReplaySubject, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import * as _ from 'lodash';
import { element } from 'protractor';

@Component({
  selector: 'app-exam-center-existing-allotment',
  templateUrl: './exam-center-existing-allotment.component.html',
  styleUrls: ['./exam-center-existing-allotment.component.scss']
})
export class ExamCenterExistingAllotmentComponent implements OnInit {

  panelOpenState = true;
  private isActive = CONSTANTS.isActive;
  private examMasterUrl = CONSTANTS.examMasterUrl;
  private examTimetableUrl = CONSTANTS.examTimetableUrl;
  private examRoomAllotmentPostUrl = CONSTANTS.examRoomAllotmentPostUrl;
  private getDetailsByCollegeIdUrl = CONSTANTS.getDetailsByCollegeIdUrl;
  private examIdUrl = CONSTANTS.examIdUrl;
  public  dateFormate = CONSTANTS.dateFormate;
  private getDetailsByCourseIdUrl = CONSTANTS.getDetailsByCourseIdUrl;
  private getDetailsByAcademicYearIdUrl = CONSTANTS.getDetailsByAcademicYearIdUrl;
  private getExamRoomDetailsUrl = CONSTANTS.getExamRoomDetailsUrl;
  private popExamRoomPlanUrl = CONSTANTS.popExamRoomPlanUrl;

  staffForm: FormGroup;
  step = 0;
  examsList: any = {};
  pageParams: any = {};
  examTimetables: any[] = [];
  examTargetTimetables: any[] = [];
  examRoomAllot = [];
  minDate;
  maxDate;
  selectedExamDate;
  subjectId;
  vacancyRoomList = [];
  selectAll = false;
  targetExam: any = {};
  sourceExam: any = {};

  constructor(private formBuilder: FormBuilder, private snotifyService: SnotifyService,
              private crudService: CrudService, private spinner: NgxSpinnerService, private router: Router,
              private dialog: MatDialog, private genericFunctions: GenericFunctions, private route: ActivatedRoute) {

  }

  // tslint:disable-next-line:typedef
  ngOnInit() {
      this.staffForm = this.formBuilder.group({
          examId: ['', Validators.required],
          targetExamId: [''],
          examTimetableId: ['', Validators.required],
          examDate: [this.genericFunctions.moment(), Validators.required],
          targetExamDate: [this.genericFunctions.moment()],
      });

      this.route.queryParams
          .subscribe(params => {
              if (!this.isEmptyObject(params)) {
                  this.pageParams.examRoomAllotmentId = params.examRoomAllotmentId;
                  this.pageParams.collegeId = +params.collegeId;
                  this.pageParams.targetExamId = +params.examId;
                  this.pageParams.subjectId = +params.subjectId;
                  this.pageParams.academicYearId = +params.academicYearId;
                  this.pageParams.courseId = +params.courseId;
                  this.pageParams.targetExamDate = params.examDate;
                  this.pageParams.courseCode = params.courseCode;
                  this.pageParams.academicYear = params.academicYear;
                  this.pageParams.examTimetableId = +params.examTimetableId;
                  this.staffForm.get('targetExamId').setValue( this.pageParams.targetExamId);
                  this.staffForm.get('targetExamId').disable();
                  this.getData(this.pageParams.collegeId);
              }
          });
  }

  getData(collegeId): void {
      if (collegeId !== null && collegeId !== undefined) {
        this.crudService.listDetailsByThreeIdsWithSort(this.examMasterUrl, this.pageParams.courseId, this.pageParams.academicYearId, 'true',
                'DESC', this.getDetailsByCourseIdUrl, this.getDetailsByAcademicYearIdUrl, this.isActive , 'createdDt')
            .subscribe(result => {
              this.spinner.hide();
              if (result.statusCode === 200){
                    if (result.data.resultList && result.data.resultList.length > 0) {
                      this.examsList = result.data.resultList;
                    } else {
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

          /*----------- EXAMS -----------*/
          this.crudService.listDetailsByTwoIds(this.examMasterUrl, this.pageParams.targetExamId, 'true', this.examIdUrl, this.isActive)
              .subscribe(result => {
                  if (result.statusCode === 200) {
                      if (result.data.resultList && result.data.resultList !== '') {
                          this.targetExam = result.data.resultList[0];
                          this.selectedtargetExam(this.targetExam.examId);
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

selectedSourceExam(examId){
  if (examId !== null) {
    this.sourceExam = this.examsList.filter(x=>(x.examId === examId))[0];
        this.minDate = this.genericFunctions.momentWithDateFormatYMD(this.sourceExam.fromDate);
        // this.staffForm.get('examDate').setValue(this.minDate);
  this.maxDate = this.genericFunctions.momentWithDateFormatYMD(this.sourceExam.toDate);
  this.selectedExamDate = this.genericFunctions.momentFormatYMD(this.staffForm.value.examDate); // new Date(this.data.issueTodate);
  /*----------- EXAM TIMETABLES -----------*/
  this.crudService.listDetailsByThreeIds(this.examTimetableUrl, examId, 'true', this.selectedExamDate, 'ExamMaster.examId', this.isActive, 'examDate')
      .subscribe(result => {
          if (result.statusCode === 200) {
              if (result.data.resultList && result.data.resultList !== '' && result.data.resultList.length > 0) {
                  this.examTimetables = result.data.resultList;
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

selectedtargetExam(targetExamId): void {
    if (targetExamId !== null) {
        /*----------- EXAM TIMETABLES -----------*/
        this.crudService.listDetailsByTwoIds(this.examTimetableUrl, targetExamId, 'true', 'ExamMaster.examId', this.isActive)
            .subscribe(result => {
                if (result.statusCode === 200) {
                    if (result.data.resultList && result.data.resultList !== '' && result.data.resultList.length > 0) {
                        this.examTargetTimetables = result.data.resultList;
                        this.examTargetTimetables.forEach(ele => {
                          ele.checked = false;
                        });
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

getRooms(){
  this.vacancyRoomList = [];
  this.crudService.listByElevenIds(this.getExamRoomDetailsUrl, 
    // tslint:disable-next-line:max-line-length
    'exam_room_allotment', 1, 0, 0, 0,0,this.staffForm.value.examTimetableId,0,0,0,0,
     'in_flag', 'in_org_id', 'in_building_id', 'in_block_id', 'in_floor_id', 'in_room_id','in_exam_timetable_id', 'in_exam_id','in_academicYearId', 'in_group_sectionId', 'in_emp_id')
     .subscribe(result => {
          this.spinner.hide();
          if (result.statusCode === 200){
               if (result.success) {
                   result.data.result[0].forEach(element => {
                    if (element.pk_exam_room_allotment_id != null){
                        this.vacancyRoomList.push(element);
                    }
                   });
               } else {
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

  // tslint:disable-next-line:typedef
  isEmptyObject(obj) {
      return (obj && (Object.keys(obj).length === 0));
  }

  singleCheck(item){
    let is_checked = false;
    item.checked = !item.checked;
    this.examTargetTimetables.forEach(ele => {
       if (!ele.checked){
        is_checked = true;
       }
    })
    if(is_checked)
     this.selectAll = false;
    else 
     this.selectAll = true;
  }

  checkAll(selectAll){
    if (!selectAll)
        this.selectAll = true;
    else if(selectAll)
        this.selectAll = false;
         this.examTargetTimetables.forEach(ele => {
             if (selectAll === false){
                ele.checked = true;
             }else{
                ele.checked = false;
             }
         })
  }

  SelectedSession(examTimetableId){
     if (this.examTimetables.filter(x=>(x.examTimetableId === examTimetableId)).length > 0){
          this.subjectId = this.examTimetables.filter(x=>(x.examTimetableId === examTimetableId))[0].examTimetableDetail[0].subjectId;
     }
     this.getRooms();
  } 

  calDays(): void {
    this.examTimetables = [];
    this.selectedSourceExam(this.staffForm.value.examId);
}

  addExamTable(): void {
     this.examRoomAllot = [];
     this.spinner.show();
     let targetExamTimetableIds = '';
     this.examTargetTimetables.forEach(ele => {
      if (ele.checked){
         if(targetExamTimetableIds == ''){
           targetExamTimetableIds = ele.examTimetableId;
         }else{
           targetExamTimetableIds = targetExamTimetableIds + ',' + ele.examTimetableId;
         }
      }
     });

     console.log(targetExamTimetableIds);
     
      if (this.staffForm.valid) {
          /*---------- POP EXAM ROOM ALLOTMENT ----------*/
          this.crudService.listByTwelveIds(this.popExamRoomPlanUrl,
            'exam_room_allotment_session_copy', 1, 0, 0, 0,0,this.staffForm.value.examTimetableId,0,0,0,0,targetExamTimetableIds,
             'in_flag', 'in_org_id', 'in_building_id', 'in_block_id', 'in_floor_id', 'in_room_id','in_exam_timetable_id', 'in_exam_id','in_academicYearId', 'in_group_sectionId', 'in_emp_id', 'in_target_exam_timetable_id')
             .subscribe(result => {
                  this.spinner.hide();
                  if (result.statusCode === 200){
                       if (result.success) {
                          this.router.navigate(['admin-examination-management/exam-papers-delivery-process/exam-center-seating-plan'], {
                            queryParams: {
                                collegeId: this.pageParams.collegeId,
                                academicYearId: this.pageParams.academicYearId,
                                courseId: this.pageParams.courseId,
                                examId: this.pageParams.targetExamId
                            }
                          });
                       } else {
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

          // this.crudService.add(this.examRoomAllotmentPostUrl, this.examRoomAllot)
          //     .subscribe(result => {
          //         this.spinner.hide();
          //         if (result.statusCode === 200) {
          //             if (result.success) {
          //                 this.snotifyService.success(result.message, 'Success!');
          //                     this.router.navigate(['admin-examination-management/admin-exam-masters/seating-plan-setup'], {
          //                         queryParams: {
          //                              collegeId: this.pageParams.collegeId,
          //                              academicYearId: this.pageParams.academicYearId,
          //                              courseId: this.pageParams.courseId,
          //                              examId: this.pageParams.targetExamId
          //                         }
          //                     });
          //             } else {
          //                 this.snotifyService.info(result.message, 'Info!');
          //             }
          //         } else {
          //             this.snotifyService.error(result.message, 'Error!');
          //         }
          //     }, error => {
          //         this.spinner.hide();
          //         if (error.error.statusCode === 401) {
          //             this.snotifyService.error(error.error.message, 'Error!');
          //             this.genericFunctions.logOut(this.router.url);
          //         } else {
          //             this.snotifyService.error(CONSTANTS.message.CON_ERROR, 'Error!');
          //         }
          //     });
      }
  }

  goBack(): void {
      this.router.navigate(['admin-examination-management/exam-papers-delivery-process/exam-center-seating-plan'], {
          queryParams: {
              collegeId: this.pageParams.collegeId,
              examId: this.pageParams.targetExamId,
              academicYearId: this.pageParams.academicYearId,
              courseId: this.pageParams.courseId,
              examTimetableId: this.pageParams.examTimetableId
          }
      });
  }
}
