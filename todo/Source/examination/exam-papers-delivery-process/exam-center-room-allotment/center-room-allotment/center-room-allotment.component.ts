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
import * as _ from 'lodash';

@Component({
  selector: 'app-center-room-allotment',
  templateUrl: './center-room-allotment.component.html',
  styleUrls: ['./center-room-allotment.component.scss']
})
export class CenterRoomAllotmentComponent implements OnInit {

  panelOpenState = true;
    private isActive = CONSTANTS.isActive;
    private examMasterUrl = CONSTANTS.examMasterUrl;
    private examTimetableUrl = CONSTANTS.examTimetableUrl;
    private generalDetailsUrl = CONSTANTS.generalDetailsUrl;
    private generalDetailsByCodeUrl = CONSTANTS.generalDetailsByCodeUrl;
    private examSeatStatus = CONSTANTS.examSeatStatus;
    private examRoomAllotmentPostUrl = CONSTANTS.examRoomAllotmentPostUrl;
    private examRoomAllotmentCrudUrl = CONSTANTS.examRoomAllotmentCrudUrl;
    private examIdUrl = CONSTANTS.examIdUrl;
    public dateFormate = CONSTANTS.dateFormate;
    private buildingCrudUrl = CONSTANTS.buildingCrudUrl;
    private blockCrudUrl = CONSTANTS.blockCrudUrl;
    private getDetailsByBuildingIdUrl = CONSTANTS.getDetailsByBuildingIdUrl;
    private floorCrudUrl = CONSTANTS.floorCrudUrl;
    private getDetailsByBlockIdUrl = CONSTANTS.getDetailsByBlockIdUrl;
    private getExamRoomDetailsUrl = CONSTANTS.getExamRoomDetailsUrl;

    staffForm: FormGroup;
    step = 0;
    examsList: any = {};
    pageParams: any = {};
    examTimetables: any[] = [];
    rooms: any[] = [];
    room: any = {};
    array = [];
    array1 = [];
    examSeatStatuses: GeneralDetail[] = [];
    examSeatStatusId;
    examSeatStatusCode;
    examDisplaySeatStatusCode;
    examStdRoomAllots: any[] = [];
    blocked = 0;
    booked = 0;
    available = 0;
    examRoomAllot: any[] = [];
    examRoomAllotment = [];
    event: any = {};
    examRoomStdAllotId;
    examRoomAllotmentId;
    createdDt1;
    createdDt;
    roomDetails;
    minDate;
    maxDate;
    selectedExamDate;
    dateFlag = false;
    studentId;
    stdName;
    stdRollNumber;
    shortName;
    // comments;
    subjectId;
    check = 1;
    courseGroups = [];
    courseYears = [];
    students = [];
    selectedStudents = [];
    buildings: any[] = [];
    blocks: any[] = [];
    floors: any[] = [];
    checksubject = true;
    public searchText: string;
    public searchText1: string;
    public searchText2: string;
    vacancyRoomList = [];
    selectAll = false;

    constructor(private formBuilder: FormBuilder, private snotifyService: SnotifyService,
                private crudService: CrudService, private spinner: NgxSpinnerService, private router: Router,
                private dialog: MatDialog, private genericFunctions: GenericFunctions, private route: ActivatedRoute) {

    }

    // tslint:disable-next-line:typedef
    ngOnInit() {
        this.staffForm = this.formBuilder.group({
            examId: ['', Validators.required],
            examTimetableId: ['', Validators.required],
            roomId: [],
            totalRows: [0, Validators.required],
            totalColumns: [0, Validators.required],
            roomStrength: [0],
            availableSeats: [0],
            blockedSeats: [0],
            courseGroupId: [],
            courseYearId: [],
            bookedSeats: [0],
            buildingId: [0],
            blockId: [0],
            floorId: [0],
            examDate: [this.genericFunctions.moment(), Validators.required],
        });

        this.staffForm.get('roomStrength').disable();

        this.route.queryParams
            .subscribe(params => {
                if (!this.isEmptyObject(params)) {
                    this.pageParams.examRoomAllotmentId = params.examRoomAllotmentId;
                    this.pageParams.collegeId = +params.collegeId;
                    this.pageParams.examId = +params.examId;
                    this.pageParams.subjectId = +params.subjectId;
                    this.pageParams.academicYearId = +params.academicYearId;
                    this.pageParams.courseId = +params.courseId;
                    this.pageParams.examDate = params.examDate;
                    this.pageParams.courseCode = params.courseCode;
                    this.pageParams.academicYear = params.academicYear;
                    this.pageParams.examTimetableId = +params.examTimetableId;
                    this.pageParams.univExamcenterId = +params.univExamcenterId;
                    this.staffForm.get('examId').setValue( this.pageParams.examId);
                    this.getData(this.pageParams.collegeId);
                }
            });
    }

    getData(collegeId): void {
        if (collegeId !== null && collegeId !== undefined) {
            /*----------- EXAMS -----------*/
            this.crudService.listDetailsByTwoIds(this.examMasterUrl, this.pageParams.examId, 'true', this.examIdUrl, this.isActive)
                .subscribe(result => {
                    if (result.statusCode === 200) {
                        if (result.data.resultList && result.data.resultList !== '') {
                            this.examsList = result.data.resultList[0];
                            this.selectedExam(this.examsList.examId);
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
            /*----------- EXAM SEATING STATUSES -----------*/
            this.crudService.listDetailsByTwoIds(this.generalDetailsUrl, this.examSeatStatus, 'true', this.generalDetailsByCodeUrl, this.isActive)
                .subscribe(result => {
                    if (result.statusCode === 200) {
                        if (result.data.resultList && result.data.resultList !== '') {
                            this.examSeatStatuses = result.data.resultList;
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

                this.crudService.listDetailsById(this.buildingCrudUrl, 'true', this.isActive)
            .subscribe(result => {
                this.spinner.hide();
                if (result.statusCode === 200) {
                    if (result.data.resultList && result.data.resultList !== '') {
                        this.buildings = result.data.resultList.filter(x => (x.univExamCenterId === this.pageParams.univExamcenterId));

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

    }

    /*--------- GET Blocks ----------*/
    SelectedBuilding(buildingId): void {
      if (buildingId !== null && buildingId !== undefined) {
        this.blocks = [];
        this.floors = [];
        this.getRooms();
        this.staffForm.get('floorId').setValue(0);
        this.staffForm.get('blockId').setValue(0);
        this.crudService.listDetailsByTwoIds(this.blockCrudUrl, buildingId, 'true', this.getDetailsByBuildingIdUrl, this.isActive)
              .subscribe(result => {
                  this.spinner.hide();
                  if (result.statusCode === 200) {
                      if (result.data.resultList && result.data.resultList !== '') {
                          this.blocks = result.data.resultList;
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
  }

  /*--------- GET Floors ----------*/
  // tslint:disable-next-line:typedef
  SelectedBlock(blockId) {
    this.staffForm.get('floorId').setValue(0);
    this.floors = [];
    this.getRooms();
    if (blockId !== null && blockId !== undefined) {
          this.crudService.listDetailsByTwoIds(this.floorCrudUrl, blockId, 'true', this.getDetailsByBlockIdUrl, this.isActive)
              .subscribe(result => {
                 this.spinner.hide();
                  if (result.statusCode === 200) {
                      if (result.data && result.data !== '') {
                          this.floors = result.data.resultList;
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
  SelectedFloors(floorId): void{
    this.getRooms();
  }

  getRooms(){
    this.vacancyRoomList = [];
    this.examSeatStatusId = this.examSeatStatuses.filter(x => (x.generalDetailCode === 'Available'))[0].generalDetailId;
    this.crudService.listByElevenIds(this.getExamRoomDetailsUrl, 
      // tslint:disable-next-line:max-line-length
      'exam_room_allotment', 1, this.staffForm.value.buildingId, this.staffForm.value.blockId, this.staffForm.value.floorId,0,this.staffForm.value.examTimetableId,0,0,0,0,
       'in_flag', 'in_org_id', 'in_building_id', 'in_block_id', 'in_floor_id', 'in_room_id','in_exam_timetable_id', 'in_exam_id','in_academicYearId', 'in_group_sectionId', 'in_emp_id')
       .subscribe(result => {
            this.spinner.hide();
            if (result.statusCode === 200){
                 if (result.success) {
                     this.vacancyRoomList = result.data.result[0];
                     this.vacancyRoomList.forEach(element => {
                      element.checked = false;
                      element.disabled = false;
                      if (element.pk_exam_room_allotment_id != null){
                          element.disabled = true;
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

    checkAll(selectAll){
      if (!selectAll)
          this.selectAll = true;
      else if(selectAll)
          this.selectAll = false;
           this.vacancyRoomList.forEach(ele => {
            if (!ele.disabled){
               if (selectAll === false){
                  ele.checked = true;
               }else{
                  ele.checked = false;
               }
               ele.total_rows = 0;
               ele.total_columns = 0;
               ele.room_strength = 0;
            }
           })
        this.staffForm.get('totalRows').setValue(0);
        this.staffForm.get('totalColumns').setValue(0);
        this.staffForm.get('roomStrength').setValue(0);
    }

    selectSingleRoom(checked, item){
       if (!checked){
        item.total_rows = this.staffForm.value.totalRows;
        item.total_columns = this.staffForm.value.totalColumns;
        item.room_strength = item.total_rows * item.total_columns;
       }else{
        item.total_rows = 0;
        item.total_columns = 0;
        item.room_strength = 0;
       }
        let is_checked = false;
        item.checked = !item.checked;
        this.vacancyRoomList.forEach(ele => {
           if (!ele.checked){
            is_checked = true;
           }
        })
        if(is_checked)
         this.selectAll = false;
        else 
         this.selectAll = true;
    }

    calStrength(event, name): void {
        for (let i = 0; i < this.vacancyRoomList.length; i++){
          if (!this.vacancyRoomList[i].disabled){
             if (name === 'rows' && this.vacancyRoomList[i].checked){
                 this.vacancyRoomList[i].total_rows = event.target.value;
             }
             if (name === 'cols'  && this.vacancyRoomList[i].checked){
              this.vacancyRoomList[i].total_columns = event.target.value;
             }
             if (this.vacancyRoomList[i].checked)
             this.vacancyRoomList[i].room_strength = this.vacancyRoomList[i].total_rows * this.vacancyRoomList[i].total_columns;
        }
      }
        this.staffForm.get('roomStrength').setValue(this.staffForm.value.totalRows * this.staffForm.value.totalColumns);
    }

    rowCol(e, item){
      item.room_strength = item.total_rows * item.total_columns;
    }

    selectedExam(examId): void {
        if (examId !== null) {
            if (this.examRoomAllotment.length > 0 && this.dateFlag === false) {
                this.minDate = this.genericFunctions.momentWithDateFormatYMD(this.examsList.fromDate);
            } else if (!this.dateFlag) {
                this.minDate = this.genericFunctions.momentWithDateFormatYMD(this.examsList.fromDate);
                if(this.pageParams.examDate !== null || this.pageParams.examDate !== undefined ){
                    this.staffForm.get('examDate').setValue(this.pageParams.examDate);
                }else{
                this.staffForm.get('examDate').setValue(this.minDate);
                }
            }
            //  else if (this.dateFlag) {
            //     this.minDate = this.staffForm.value.examDate;
            // }

            this.maxDate = this.genericFunctions.momentWithDateFormatYMD(this.examsList.toDate);
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

    SelectedSession(examTimetableId){
       if (this.examTimetables.filter(x=>(x.examTimetableId === examTimetableId)).length > 0){
            this.subjectId = this.examTimetables.filter(x=>(x.examTimetableId === examTimetableId))[0].examTimetableDetail[0].subjectId;
       }
       this.getRooms();
    } 

    calDays(): void {
      this.examTimetables = [];
     // this.minDate = this.staffForm.value.examDate; // new Date(this.data.issueTodate);
      this.dateFlag = true;
      this.selectedExam(this.staffForm.value.examId);
  }

    seatingmatrix(item){
      let seatingList = [];
      for (let i = 1; i <= item.total_rows; i++){
        for (let j = 1; j <= item.total_columns; j++){
          seatingList.push({
            value: i + 1,
            collegeId: this.pageParams.collegeId,
            examId: this.staffForm.value.examId,
            examTimetableId: this.staffForm.value.examTimetableId,
            roomId: item.pk_room_id,
            rowNo: i,
            columnNo: j,
            examseatstatusCatId: this.examSeatStatusId,
            studentId: null,
            subjectId: this.subjectId,
            isActive: true
          })
        }
      }
      return seatingList;
    }

    addExamTable(name): void {
       this.examRoomAllot = [];
       this.spinner.show();
       
       for (let i = 0; i < this.vacancyRoomList.length; i++){
        if (this.vacancyRoomList[i].checked){
            this.examRoomAllot.push({
              collegeId: this.pageParams.collegeId,
              examId: this.staffForm.value.examId,
              createdDt: null,
              examTimetableId: this.staffForm.value.examTimetableId,
              roomId: this.vacancyRoomList[i].pk_room_id,
              examDate: this.genericFunctions.momentFormatYMD1(this.staffForm.value.examDate),
              priority: this.vacancyRoomList[i].priority,
              totalRows:  this.vacancyRoomList[i].total_rows,
              totalColumns:  this.vacancyRoomList[i].total_columns,
              roomStrength: this.vacancyRoomList[i].total_rows * this.vacancyRoomList[i].total_columns,
              availableSeats: this.vacancyRoomList[i].total_rows * this.vacancyRoomList[i].total_columns,
              blockedSeats: 0,
              bookedSeats: 0,
              isActive: true,
              examRoomStudentAllotmentDTO: this.seatingmatrix(this.vacancyRoomList[i])
            });
          }
       }
       
        if (this.staffForm.valid) {
            /*---------- ADD EXAM ROOM ALLOTMENT ----------*/
            this.crudService.add(this.examRoomAllotmentPostUrl, this.examRoomAllot)
                .subscribe(result => {
                    this.spinner.hide();
                    if (result.statusCode === 200) {
                        if (result.success) {
                            this.snotifyService.success(result.message, 'Success!');
                            if (name === 'update'){
                                this.router.navigate(['admin-examination-management/exam-papers-delivery-process/exam-center-seating-plan'], {
                                    queryParams: {
                                         collegeId: this.pageParams.collegeId,
                                         academicYearId: this.pageParams.academicYearId,
                                         courseId: this.pageParams.courseId,
                                         examId: this.pageParams.examId
                                    }
                                });
                            }
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
    }

    goBack(): void {
        this.router.navigate(['admin-examination-management/exam-papers-delivery-process/exam-center-seating-plan'], {
            queryParams: {
                collegeId: this.pageParams.collegeId,
                examId: this.pageParams.examId,
                academicYearId: this.pageParams.academicYearId,
                courseId: this.pageParams.courseId,
                examTimetableId: this.pageParams.examTimetableId,
            }
        });
    }
}
