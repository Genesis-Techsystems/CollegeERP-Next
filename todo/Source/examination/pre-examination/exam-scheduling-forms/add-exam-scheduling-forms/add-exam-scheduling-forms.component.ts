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
import { Observable, ReplaySubject, Subject, timer } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import * as _ from 'lodash';

@Component({
  selector: 'app-add-exam-scheduling-forms',
  templateUrl: './add-exam-scheduling-forms.component.html',
  styleUrls: ['./add-exam-scheduling-forms.component.scss']
})
export class AddExamSchedulingFormsComponent implements OnInit {

    panelOpenState = true;
    private isActive = CONSTANTS.isActive;
    private examMasterUrl = CONSTANTS.examMasterUrl;
    private courseGroupCrudUrl = CONSTANTS.courseGroupCrudUrl;
    private examTimetableUrl = CONSTANTS.examTimetableUrl;
    private buildingDetailSearchUrl = CONSTANTS.buildingdetailsSearchurl;
    private generalDetailsUrl = CONSTANTS.generalDetailsUrl;
    private generalDetailsByCodeUrl = CONSTANTS.generalDetailsByCodeUrl;
    private examSeatStatus = CONSTANTS.examSeatStatus;
    private examRoomAllotmentPostUrl = CONSTANTS.examRoomAllotmentPostUrl;
    private examRoomAllotmentCrudUrl = CONSTANTS.examRoomAllotmentCrudUrl;
    private examIdUrl = CONSTANTS.examIdUrl;
    public dateFormate = CONSTANTS.dateFormate;
    private getDetailsByCourseIdUrl = CONSTANTS.getDetailsByCourseIdUrl;
    private courseYearCrudUrl = CONSTANTS.courseYearCrudUrl;
    private sortOrder = CONSTANTS.sortOrder;
    private examMarksEntryStudentsUrl = CONSTANTS.examMarksEntryStudentsUrl;
    private collegeByIdUrl = CONSTANTS.collegeByIdUrl;
    private courseByIdUrl = CONSTANTS.courseByIdUrl;
    private courseGroupByIdUrl = CONSTANTS.courseGroupByIdUrl;
    private courseYearByIdUrl = CONSTANTS.courseYearByIdUrl;
    private getExamAllotmentDetailsUrl = CONSTANTS.getExamAllotmentDetailsUrl;

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
    hallticketNumber;
    subjectCode;
    // comments;
    subjectId;
    check = 1;
    courseGroups = [];
    courseYears = [];
    students = [];
    selectedStudents = [];
    checksubject = true;
    public searchText: string;
    public searchText1: string;
    public searchText2: string;
    public roomFilterCtrl: FormControl = new FormControl();
    private _onDestroy = new Subject < void > ();
    public filteredRooms: ReplaySubject < any[] > = new ReplaySubject < any[] > (1);
    examStdRoomAllotment: any;
    view=true;
    summaryview=true;
    printAttendance = false;
    everyFiveSeconds: Observable<number> = timer(0, 2000);
    examTime: any;
    sessionEndTime: any;
    sessionStartTime: any;
    studentAllotmentDetails = [];
    groupedData: any[] = [];

    constructor(private formBuilder: FormBuilder, private snotifyService: SnotifyService,
                private crudService: CrudService, private spinner: NgxSpinnerService, private router: Router,
                private dialog: MatDialog, private genericFunctions: GenericFunctions, private route: ActivatedRoute) {

    }

    // tslint:disable-next-line:typedef
    ngOnInit() {
        this.staffForm = this.formBuilder.group({
            examId: ['', Validators.required],
            examTimetableId: ['', Validators.required],
            roomId: ['', Validators.required],
            totalRows: [0, Validators.required],
            totalColumns: [0, Validators.required],
            roomStrength: [0],
            priority: [0],
            availableSeats: [0],
            blockedSeats: [0],
            courseGroupId: [],
            courseYearId: [],
            bookedSeats: [0],
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
                    this.pageParams.examTimetableId = +params.examTimetableId,
                    this.staffForm.get('examId').setValue( this.pageParams.examId);
                    this.getData(this.pageParams.collegeId);
                    this.getExamRoomAllotment(this.pageParams.examRoomAllotmentId);
                    console.log(this.pageParams.subjectId,'this.pageParams.subjectId');
                }
            });

        this.roomFilterCtrl.valueChanges
            .pipe(takeUntil(this._onDestroy))
            .subscribe(() => {
                this.filterRoom();
            });

        this.rooms.push({
            roomName: 'Search by Room name.'
        });
        this.filteredRooms.next(this.rooms.slice());
    }

    getExamRoomAllotment(examRoomAllotmentId): void {
        if (examRoomAllotmentId != null) {
            this.spinner.show();
            this.crudService.getDetailsByIdWithSortOrder(this.examRoomAllotmentCrudUrl, examRoomAllotmentId, 'examRoomAllotmentId')
                .subscribe(result => {
                    this.spinner.hide();
                    if (result.statusCode === 200) {
                        if (result.data.resultList && result.data.resultList !== '') {
                            this.examRoomAllotment = result.data.resultList;
                            this.examStdRoomAllotment = result.data.resultList[0].examRoomStudentAllotmentDTO;
                            if (this.examRoomAllotment.length > 0) {
                                this.staffForm.get('examId').setValue(this.examRoomAllotment[0].examId);
                                this.staffForm.get('examTimetableId').setValue(this.examRoomAllotment[0].examTimetableId);
                                this.staffForm.get('roomId').setValue(this.examRoomAllotment[0].roomId);
                                this.staffForm.get('totalRows').setValue(this.examRoomAllotment[0].totalRows);
                                this.staffForm.get('totalColumns').setValue(this.examRoomAllotment[0].totalColumns);
                                this.staffForm.get('priority').setValue(this.examRoomAllotment[0].priority);
                                this.staffForm.get('availableSeats').setValue(this.examRoomAllotment[0].availableSeats);
                                this.staffForm.get('blockedSeats').setValue(this.examRoomAllotment[0].blockedSeats);
                                this.staffForm.get('bookedSeats').setValue(this.examRoomAllotment[0].bookedSeats);
                                this.staffForm.get('examDate').setValue(this.pageParams.examDate);
                                this.enteredRoom(this.examRoomAllotment[0].roomName, 'update');
                                this.selectedExam(this.examRoomAllotment[0].examId);
                                this.dateFlag = false;
                                this.calStrength('', 'update');
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
    }

    filterRoom(): void {
        if (!this.rooms) {
            return;
        }
        // get the search keyword
        let search = this.roomFilterCtrl.value;
        if (!search) {
            this.filteredRooms.next(this.rooms.slice());
            return;
        } else {
            search = search.toLowerCase();
        }
        // filter the banks
        this.filteredRooms.next(
            this.rooms.filter(x => x.roomName.toLowerCase().indexOf(search) > -1)
        );
    }

    enteredRoom(event, name): void {
        /*----------- ROOMS -----------*/
        if (name === 'update') {
            this.crudService.listByIds(this.buildingDetailSearchUrl, event, 'q')
                .subscribe(result => {
                    if (result.statusCode === 200) {
                        if (result.success) {
                            this.rooms = result.data;
                            if (this.rooms.length > 0) {
                                this.selectedRoom(this.rooms[0].roomId);
                            }
                            this.filteredRooms.next(this.rooms.slice());
                        } else {
                            this.snotifyService.info(result.message, 'Info!');
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
        } else {
            if (event.target.value.length > 2) {
                this.crudService.listByIds(this.buildingDetailSearchUrl, event.target.value, 'q')
                    .subscribe(result => {
                        if (result.statusCode === 200) {
                            if (result.success) {
                                this.rooms = result.data;
                                this.filteredRooms.next(this.rooms.slice());
                            } else {
                                this.snotifyService.info(result.message, 'Info!');
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
    }

    getData(collegeId): void {
        if (collegeId !== null && collegeId !== undefined) {
            this.getCourseGroups(this.pageParams.courseId);
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
        }

    }

    getCourseGroups(courseId): void{
        this.crudService.listDetailsByTwoIds(this.courseGroupCrudUrl, courseId, 'true', this.getDetailsByCourseIdUrl, this.isActive)
                .subscribe(result => {
                    if (result.statusCode === 200) {
                        if (result.data.resultList && result.data.resultList !== '') {
                            this.courseGroups = result.data.resultList;
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

    selectedCourseGroup(courseGroupId): void {
        this.courseYears = [];
        if (courseGroupId !== '') {
            this.spinner.show();
            /*----------- COURSES Years -----------*/

            this.crudService.listDetailsByTwoIdsWithSortLtd(this.courseYearCrudUrl, this.pageParams.courseId, 'true', 'ASC',
             this.getDetailsByCourseIdUrl, this.isActive, this.sortOrder)
                .subscribe(result => {
                    this.spinner.hide();
                    if (result.statusCode === 200) {
                        if (result.data.resultList && result.data.resultList !== '') {
                            this.courseYears = result.data.resultList;
           
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

    selectedCourseYear(courseYearId): void{
        this.students = [];
        if (courseYearId) {
            
            if (this.examTimetables.filter(x => (x.examTimetableId === this.staffForm.value.examTimetableId)).length > 0) {
                this.selectedExamDate = this.examTimetables.filter(x => (x.examTimetableId === this.staffForm.value.examTimetableId))[0].examDate;
                this.pageParams.subjectId = this.examTimetables.filter(x => (x.examTimetableId === this.staffForm.value.examTimetableId))[0].subjectIds;
            }
            const dateConvert = this.genericFunctions.momentFormatYMD(this.selectedExamDate);
                  /*----------- Exams List -----------*/
        // this.crudService.listDetailsByTwoIds(this.examMasterUrl, this.examFeeCollectionForm.value.collegeId, this.examFeeCollectionForm.value.courseId,
        //         this.getDetailsByCollegeIdUrl, this.getDetailsByCourseIdUrl)              
        //    
            // tslint:disable-next-line: max-line-length
            this.crudService.listBySevenIds(this.examMarksEntryStudentsUrl, this.pageParams.collegeId, 
                this.pageParams.courseId, 
                this.pageParams.examId, 
                dateConvert, 
                this.staffForm.value.courseGroupId, 
                this.staffForm.value.courseYearId, 
                this.pageParams.subjectId,
                this.collegeByIdUrl, this.courseByIdUrl, this.examIdUrl, 'examDate', this.courseGroupByIdUrl, this.courseYearByIdUrl, 'subjectId')
                .subscribe(result => {
                this.spinner.hide();
                if (result.statusCode === 200) {
                    if (result.data && !_.isEmpty(result.data) && result.data.length > 0) {
                        this.students = [...new Map(result.data.map(item =>
                            [item['rollNumber'],item])).values()]
                       //this.students = result.data;
                        // for (let i = 0; i < result.data.length; i++){
                        //      if (this.examRoomAllotment.length > 0 && this.examRoomAllotment[0].examRoomStudentAllotmentDTO.filter(x => (x.studentId === result.data[i].studentId)).length === 0){
                        //        this.students.push(result.data[i]);
                        //      }
                        // }
                this.markAll();
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

    markAll(): void{
        this.selectedStudents = [] ;
        if (this.checksubject === true){
           // tslint:disable-next-line: prefer-for-of
           for (let i = 0; i < this.students.length; i++){
              this.students[i].checked = true;
              this.students[i].c = true;
              this.selectedStudents.push(this.students[i]);
           } 
           
          // this.selectedStudents = this.students;     
        }else{
          // tslint:disable-next-line: prefer-for-of
          for (let i = 0; i < this.students.length; i++){
            this.students[i].checked = false;
            this.students[i].c = false;
         }     
        }
    }

    checkedStudent(check, item): void{
        item.c = check;
        this.selectedStudents = [];
        // tslint:disable-next-line: prefer-for-of
        for (let i = 0; i < this.students.length; i++){          
            if (this.students[i].c){
                this.selectedStudents.push(this.students[i]);
            }
        }
     }

    // tslint:disable-next-line:typedef
    isEmptyObject(obj) {
        return (obj && (Object.keys(obj).length === 0));
    }

    calStrength(event, name): void {
        if (name === 'rows') {
            this.staffForm.get('roomStrength').setValue(event.target.value * this.staffForm.value.totalColumns);
            this.counter(event.target.value, this.staffForm.value.totalColumns);
            // tslint:disable-next-line: max-line-length
            this.staffForm.get('availableSeats').setValue((event.target.value * this.staffForm.value.totalColumns) - (this.staffForm.value.blockedSeats + this.staffForm.value.bookedSeats));
        } else if (name === 'cols') {
            this.staffForm.get('roomStrength').setValue(event.target.value * this.staffForm.value.totalRows);
            // tslint:disable-next-line: max-line-length
            this.staffForm.get('availableSeats').setValue((event.target.value * this.staffForm.value.totalRows) - (this.staffForm.value.blockedSeats + this.staffForm.value.bookedSeats));
            this.counter(this.staffForm.value.totalRows, event.target.value);
        } else {
            this.staffForm.get('roomStrength').setValue(this.staffForm.value.totalRows * this.staffForm.value.totalColumns);
            this.counter(this.staffForm.value.totalRows, this.staffForm.value.totalColumns);
        }
    }

    selectedRoom(roomId): void {
        this.studentAllotmentDetails = [];
        this.groupedData = [];
        this.room = {};
        if (roomId != null) {
            if (this.rooms.filter(x => (x.roomId === roomId)).length > 0) {
                this.room = this.rooms.filter(x => (x.roomId === roomId))[0];
                this.roomDetails = this.room.roomName + '(' + this.room.roomType + ')';
            }
        }
    }

    selectedExam(examId): void {
        if (examId !== null) {
            if (this.examRoomAllotment.length > 0 && this.dateFlag === false) {
                this.minDate = this.genericFunctions.momentWithDateFormatYMD(this.examsList.fromDate);
            } else if (!this.dateFlag) {
                this.minDate = this.genericFunctions.momentWithDateFormatYMD(this.examsList.fromDate);
                // this.staffForm.get('examDate').setValue(this.minDate);
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
                            this.sessionEndTime=this.examTimetables[0].examTimetableDetail[0].sessionEndTime
                            this.sessionStartTime=this.examTimetables[0].examTimetableDetail[0].sessionStartTime
                            if (this.examTimetables.length > 0){
                                if (this.examTimetables[0].examTimetableDetail.length > 0){
                                    this.examTimetables[0].subjectId = this.examTimetables[0].examTimetableDetail[0].subjectId;
                                    this.examTimetables[0].subjectCode = this.examTimetables[0].examTimetableDetail[0].subjectCode;
                                    this.examTimetables[0].subjectName = this.examTimetables[0].examTimetableDetail[0].subjectName;
                                    this.examTimetables[0].courseYear = this.examTimetables[0].examTimetableDetail[0].courseYearName;
                                    this.examTimetables[0].courseYearId = this.examTimetables[0].examTimetableDetail[0].courseYearId;
                                    this.examTimetables[0].examTypeCatCode = this.examTimetables[0].examTimetableDetail[0].examTypeCatCode;
                                } 
                            }
                            if(this.examTimetables && this.examTimetables.length > 0){
                            this.getstudentBarcode();
                            }
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
//     selectedTimetable(id){
// this.examTime=this.examTimetables.filter(x=>x.)examTimetableDetail
//     }
selectedTimetable(examTimetableId){
    this.studentAllotmentDetails = [];
    this.groupedData = [];
}
    calDays(): void {
        this.examTimetables = [];
       // this.minDate = this.staffForm.value.examDate; // new Date(this.data.issueTodate);
        this.dateFlag = true;
        this.selectedExam(this.staffForm.value.examId);
    }

    counter(rows, cols): void {
        if (this.staffForm.valid) {
            this.array = [];
            for (let i = 0; i < rows; i++) {
                this.array1 = [];
                this.array.push({
                    value: i + 1,
                    cols: this.count(cols, i + 1),
                });
            }
            this.generateZigZagSerials(this.array);
        }
    }

    count(cols, n): any {
        if (this.examSeatStatuses.filter(x => (x.generalDetailCode === 'Available')).length > 0) {
            this.examSeatStatusId = this.examSeatStatuses.filter(x => (x.generalDetailCode === 'Available'))[0].generalDetailId;
            this.examSeatStatusCode = 'Available';
            this.examDisplaySeatStatusCode = 'Available';
        }
        for (let i = 0; i < cols; i++) {
            this.studentId = null;
            this.stdName = null;
            this.hallticketNumber = null;
            this.subjectCode = null;
            if (this.examRoomAllotment.length > 0) {
                if (this.examRoomAllotment[0].examRoomStudentAllotmentDTO.filter(x => (x.columnNo === (i + 1) && x.rowNo === n)).length > 0) {
                    this.examRoomStdAllotId = this.examRoomAllotment[0].examRoomStudentAllotmentDTO.filter(x => (x.columnNo === (i + 1) && x.rowNo === n))[0].examRoomStdAllotId;
                    this.examSeatStatusId = this.examRoomAllotment[0].examRoomStudentAllotmentDTO.filter(x => (x.columnNo === (i + 1) && x.rowNo === n))[0].examseatstatusCatId;
                    this.studentId = this.examRoomAllotment[0].examRoomStudentAllotmentDTO.filter(x => (x.columnNo === (i + 1) && x.rowNo === n))[0].studentId;
                    this.stdName = this.examRoomAllotment[0].examRoomStudentAllotmentDTO.filter(x => (x.columnNo === (i + 1) && x.rowNo === n))[0].stdName;
                    this.hallticketNumber = this.examRoomAllotment[0].examRoomStudentAllotmentDTO.filter(x => (x.columnNo === (i + 1) && x.rowNo === n))[0].hallticketNumber;
                    this.subjectCode = this.examRoomAllotment[0].examRoomStudentAllotmentDTO.filter(x => (x.columnNo === (i + 1) && x.rowNo === n))[0].subjectCode;
                    if (this.subjectCode === '' || this.subjectCode === null){
                        this.subjectCode = this.examRoomAllotment[0].examRoomStudentAllotmentDTO.filter(x => (x.columnNo === (i + 1) && x.rowNo === n))[0].subjectCode;

                    }
                    this.subjectId = this.examRoomAllotment[0].examRoomStudentAllotmentDTO.filter(x => (x.columnNo === (i + 1) && x.rowNo === n))[0].subjectId;
                    // this.comments = this.examRoomAllotment[0].examRoomStudentAllotmentDTO.filter(x => (x.columnNo === (i + 1) && x.rowNo === n))[0].comments;
                    this.examSeatStatusCode = this.examRoomAllotment[0].examRoomStudentAllotmentDTO.filter(x => (x.columnNo === (i + 1) && x.rowNo === n))[0].examseatstatusCatCode;
                    // tslint:disable-next-line: max-line-length
                    this.examDisplaySeatStatusCode = this.examRoomAllotment[0].examRoomStudentAllotmentDTO.filter(x => (x.columnNo === (i + 1) && x.rowNo === n))[0].examseatstatusCatDisplayName;
                    this.createdDt1 = this.examRoomAllotment[0].examRoomStudentAllotmentDTO.filter(x => (x.columnNo === (i + 1) && x.rowNo === n))[0].createdDt;
                } else {
                    this.examRoomStdAllotId = null;
                    this.createdDt1 = null;
                }
            }
            this.array1.push({
                value: i + 1,
                examRoomStdAllotId: this.examRoomStdAllotId,
                collegeId: this.pageParams.collegeId,
                examId: this.staffForm.value.examId,
                examTimetableId: this.staffForm.value.examTimetableId,
                roomId: this.staffForm.value.roomId,
                rowNo: n,
                columnNo: i + 1,
                createdDt: this.createdDt1,
                examseatstatusCatId: this.examSeatStatusId,
                studentId: this.studentId,
                subjectId: this.subjectId,
                stdName: this.stdName,
                hallticketNumber: this.hallticketNumber,
                subjectCode: this.subjectCode,
                examSeatStatusCode: this.examSeatStatusCode,
                examDisplaySeatStatusCode: this.examDisplaySeatStatusCode,
                // comments: this.comments,
                isActive: true
            });
        }
        return this.array1;
    }

    addSeat(col): void {
      
    }

    calAvailableSeats(): void {
        this.blocked = 0;
        this.booked = 0;
        this.available = 0;
        // tslint:disable-next-line: prefer-for-of
        for (let i = 0; i < this.array.length; i++) {
            // tslint:disable-next-line: prefer-for-of
            for (let j = 0; j < this.array[i].cols.length; j++) {
                this.examStdRoomAllots.push(this.array[i].cols[j]);
                if (this.array[i].cols[j].examSeatStatusCode === 'Available') {
                    this.available = this.available + 1;
                } else if (this.array[i].cols[j].examSeatStatusCode === 'Booked') {
                    this.booked = this.booked + 1;
                } else {
                    this.blocked = this.blocked + 1;
                }
            }
        }
        this.staffForm.get('availableSeats').setValue(this.available);
        this.staffForm.get('blockedSeats').setValue(this.blocked);
        this.staffForm.get('bookedSeats').setValue(this.booked);
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
    
    
    print(_printSeatingOrder){
       this.summaryview=false
       this.printAttendance = false;
       this.view=true
    setTimeout(() => {
        window.print()
       }, 500);

    }
    printSummaryView(_printSummaryView){
       this.view=false
        this.printAttendance = false;
        this.summaryview=true
    setTimeout(() => {
        window.print()
       }, 500);

    }

    printAttendanceSheet(_printAttendanceSheet){
        this.view = false;
        this.summaryview = false;
        this.printAttendance = true;
        setTimeout(() => {
        window.print()
       }, 1000);
    }


    getstudentBarcode(): void {
        this.studentAllotmentDetails = [];
        this.groupedData = [];
        console.log(this.examTimetables,'this.examTimetables');
        console.log(this.staffForm.value.examTimetableId,'examTimetableId');
        let examSessionId = this.examTimetables.filter(x => (x.examTimetableId === this.staffForm.value.examTimetableId))[0]?.examSessionId;
          this.spinner.show();
          /*----------- STUDENTS -----------*/
          // tslint:disable-next-line:max-line-length
          this.crudService.listByFourteenIds(this.getExamAllotmentDetailsUrl, 'roomwise_OMR_students',
            +this.pageParams.examId,
            +this.pageParams.collegeId,
            0,
            0,
            0,
            this.staffForm.value.roomId,
            0,
            0,
            0,
            this.pageParams.examDate,
            this.pageParams.examDate,
            0, examSessionId,
            'in_flag', 'in_exam_id', 'in_college_id', 'in_course_id', 'in_course_group_id', 'in_course_year_id', 'in_room_id', 'in_std_id', 'in_invgilator_emp_id',
            'in_regulation_id', 'from_exam_date', 'to_exam_date', 'in_subject_id', 'in_session_id')
            .subscribe(result => {
              this.spinner.hide();
              if (result.statusCode === 200) {
                if (result.success) {
                  if (result.data.result[0].length > 0) {
                    this.studentAllotmentDetails = result.data.result[0];
                    if (this.studentAllotmentDetails && this.studentAllotmentDetails.length > 0) {
                                    const grouped = this.groupByMultipleKeys(this.studentAllotmentDetails, [
                                    'fk_course_group_id',
                                    'fk_subject_id',
                                    'room_id',
                                    'fk_examtype_catdet_id'
                                    ]);

                                    this.groupedData = Object.keys(grouped).map(key => {
                                    const [fk_course_group_id, fk_subject_id, room_id, fk_examtype_catdet_id] = key.split('|');

                                    // Sort halltickets numerically
                                    const sortedStudents = grouped[key].sort((a, b) => {
                                        return a.hallticket_number.localeCompare(b.hallticket_number, undefined, { numeric: true });
                                    });

                                    return {
                                        fk_course_group_id,
                                        fk_subject_id,
                                        room_id,
                                        fk_examtype_catdet_id,
                                        students: sortedStudents
                                    };
                                    });
                                }
                  } else {
                    this.snotifyService.success('No Records Found.', 'Success!');
                  }
    
                } else {
                  this.snotifyService.success(result.message, 'Success!');
                }
              } else {
                // this.snotifyService.error(result.message, 'Error!');
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
      groupByMultipleKeys(array: any[], keys: string[]) {
    return array.reduce((result, currentValue) => {
        const compositeKey = keys.map(key => currentValue[key]).join('|'); // use a delimiter
        (result[compositeKey] = result[compositeKey] || []).push(currentValue);
        return result;
    }, {});
}
    groupBy(array: any[], key: string) {
    return array.reduce((result, currentValue) => {
        (result[currentValue[key]] = result[currentValue[key]] || []).push(currentValue);
        return result;
    }, {});
    }
    printStickers(){
        JSON.stringify(this.studentAllotmentDetails)
        this.router.navigate(['admin-examination-management/admin-pre-examinations/exam-scheduling-forms/add-exam-scheduling-forms/print-scheduling-seating-stickers'],
        {
            queryParams: {
            data: JSON.stringify(this.studentAllotmentDetails),
            collegeCode: this.studentAllotmentDetails[0]?.college_code,
            academicyear: this.pageParams.academicYear,
            courseCode: this.pageParams.courseCode,
            courseGroupCode: this.studentAllotmentDetails[0]?.group_code,
            courseYear: this.studentAllotmentDetails[0]?.course_year_code,
            CollegeName: this.studentAllotmentDetails[0]?.college_name,
            ExamName: this.studentAllotmentDetails[0]?.exam_name,
            collegeId: this.pageParams.collegeId,
            academicYearId: this.pageParams.academicYearId,
            courseId: this.pageParams.courseId,
            courseGroupId: this.studentAllotmentDetails[0]?.fk_course_group_id,
            courseYearId: this.studentAllotmentDetails[0]?.fk_course_year_id,
            examId: this.pageParams.examId,
            examRoomAllotmentId:this.pageParams.examRoomAllotmentId,
            examDate:this.pageParams.examDate,
            printHn: true,
            barcodeNo: false
            }
        });
    }
    printGroupStickers(){
        JSON.stringify(this.studentAllotmentDetails)
        this.router.navigate(['admin-examination-management/admin-pre-examinations/exam-scheduling-forms/add-exam-scheduling-forms/print-scheduling-group-seating-stickers'],
        {
            queryParams: {
            data: JSON.stringify(this.studentAllotmentDetails),
            collegeCode: this.studentAllotmentDetails[0]?.college_code,
            academicyear: this.pageParams.academicYear,
            courseCode: this.pageParams.courseCode,
            courseGroupCode: this.studentAllotmentDetails[0]?.group_code,
            courseYear: this.studentAllotmentDetails[0]?.course_year_code,
            CollegeName: this.studentAllotmentDetails[0]?.college_name,
            ExamName: this.studentAllotmentDetails[0]?.exam_name,
            collegeId: this.pageParams.collegeId,
            academicYearId: this.pageParams.academicYearId,
            courseId: this.pageParams.courseId,
            courseGroupId: this.studentAllotmentDetails[0]?.fk_course_group_id,
            courseYearId: this.studentAllotmentDetails[0]?.fk_course_year_id,
            examId: this.pageParams.examId,
            examRoomAllotmentId:this.pageParams.examRoomAllotmentId,
            examDate:this.pageParams.examDate,
            printHn: true,
            barcodeNo: false
            }
        });
    }
    goBack(): void {
        this.router.navigate(['admin-examination-management/admin-pre-examinations/exam-scheduling-forms'], {
            queryParams: {
                collegeId: this.pageParams.collegeId,
                examId: this.pageParams.examId,
                academicYearId: this.pageParams.academicYearId,
                courseId: this.pageParams.courseId,
                examTimetableId: this.pageParams.examTimetableId,
            }
        });
    }
generateZigZagSerials(array: { cols: any[] }[]): void {
  const totalRows = array.length;
  const totalCols = array[0]?.cols.length || 0;
  let serial = 1;

  for (let col = 0; col < totalCols; col++) {
    const rows = [...Array(totalRows).keys()];
    const rowOrder = col % 2 === 0 ? rows : rows.reverse(); // zig-zag order

    for (const row of rowOrder) {
      const cell = array[row].cols[col];
      if (cell) {
        cell.serial = `S${serial++}`;
      }
    }
  }
}
}