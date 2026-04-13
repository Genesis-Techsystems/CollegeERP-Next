import { Component, OnInit, ViewChild, Input } from '@angular/core';
import { CONSTANTS } from 'app/main/common/constants';
import { FormGroup, FormBuilder, Validators, FormControl } from '@angular/forms';
import { College } from 'app/main/models/college';
import { AcademicYear } from 'app/main/models/academicYear';
import { Course } from 'app/main/models/course';
import { ExamMaster } from 'app/main/models/examMaster';
import { CourseGroup } from 'app/main/models/courseGroup';
import { SnotifyService } from 'ng-snotify';
import { CrudService } from 'app/main/services/crud.service';
import { NgxSpinnerService } from 'ngx-spinner';
import { Router, ActivatedRoute } from '@angular/router';
import { GenericFunctions } from 'app/main/common/generic-functions';
import { GeneralDetail } from 'app/main/models/generalDetail';
import { LocalStorage } from '@ngx-pwa/local-storage';
import { MatDialog } from '@angular/material/dialog';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { Subject, ReplaySubject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-student-room-allotment',
  templateUrl: './student-room-allotment.component.html',
  styleUrls: ['./student-room-allotment.component.scss']
})

export class StudentRoomAllotmentComponent implements OnInit {

    displayedColumns: string[] = ['id', 'course', 'year', 'subject'];
    dataSource: MatTableDataSource<any>;

    @ViewChild(MatPaginator) paginator: MatPaginator;
    @ViewChild(MatSort) sort: MatSort;

    private collegeCrudUrl = CONSTANTS.collegeCrudUrl;
    private academicYearCrudUrl = CONSTANTS.academicYearCrudUrl;
    private getDetailsByCollegeIdUrl = CONSTANTS.getDetailsByCollegeIdUrl;
    private courseCrudUrl = CONSTANTS.courseCrudUrl;
    private examMasterUrl = CONSTANTS.examMasterUrl;
    private getDetailsByCourseIdUrl = CONSTANTS.getDetailsByCourseIdUrl;
    private courseGroupCrudUrl = CONSTANTS.courseGroupCrudUrl;
    private buildingDetailSearchUrl = CONSTANTS.buildingdetailsSearchurl;
    private isActive = CONSTANTS.isActive;
    private examTimetableUrl = CONSTANTS.examTimetableUrl;
    private getExamMasterDetailsUrl = CONSTANTS.getExamMasterDetailsUrl;
    private collegeByIdUrl = CONSTANTS.collegeByIdUrl;
    private courseByIdUrl = CONSTANTS.courseByIdUrl;
    private examIdUrl = CONSTANTS.examIdUrl;
    private examStudentDetailsUrl = CONSTANTS.examStudentDetailsUrl;
    private blockCrudUrl = CONSTANTS.blockCrudUrl;
    private getDetailsByBuildingIdUrl = CONSTANTS.getDetailsByBuildingIdUrl;
    private floorCrudUrl = CONSTANTS.floorCrudUrl;
    private getDetailsByBlockIdUrl = CONSTANTS.getDetailsByBlockIdUrl;
    private generalDetailsUrl = CONSTANTS.generalDetailsUrl;
    private examFeeType = CONSTANTS.examFeeType;
    private generalDetailsByCodeUrl = CONSTANTS.generalDetailsByCodeUrl;
    private examroomallotmentUrl = CONSTANTS.examroomallotmentUrl;
    private seatingSolutionSolveUrl = CONSTANTS.seatingSolutionSolveUrl;
    private seatingSolutionUrl = CONSTANTS.seatingSolutionUrl;
    private examSeatStatus = CONSTANTS.examSeatStatus;

    studentAllotmentForm: FormGroup;
    colleges: College[] = [];
    academicYears: AcademicYear[] = [];
    courses: Course[] = [];
    examsList: ExamMaster[] = [];
    courseGroups: CourseGroup[] = [];
    student: any = {};
    courseYears: any[] = [];
    examStudentsList: any[] = [];
    selectedExamslist: any[] = [];
    examTimetables: any[] = [];
    roomAllotments = [];
    panelOpenState = true;
    step = 0;
    flag = false;
    isRoom = false;
    rooms: any[] = [];
    roomDetails;
    room: any = {};
    buildings: any[] = [];
    blocks: any[] = [];
    floors: any[] = [];
    details = [];
    filteredRoomsList  = [];
    examFeeTypes: GeneralDetail[] = [];
    selectedRooms = [];
    check = false;
    checkCourse = false;
    examTimetableDetails: any[] = [];
    item: any = {};
    students = [];
    examSeatStatuses = [];
    selectedCourses: any[] = [];
    roomAllot = [];
    public roomFilterCtrl: FormControl = new FormControl();
    private _onDestroy = new Subject < void > ();
    public filteredRooms: ReplaySubject < any[] > = new ReplaySubject < any[] > (1);

    constructor(private formBuilder: FormBuilder, private snotifyService: SnotifyService,
                private crudService: CrudService, private spinner: NgxSpinnerService, private router: Router, 
                private dialog: MatDialog, private genericFunctions: GenericFunctions, private route: ActivatedRoute,
                private storage: LocalStorage) {        
        this.getData();
    }

  ngOnInit(): void {
    this.studentAllotmentForm = this.formBuilder.group({
      courseId: ['', Validators.required],  
      collegeId: ['', Validators.required],  
      academicYearId: ['', Validators.required],  
      courseGroupId: ['', Validators.required],  
      examId: ['', Validators.required],
      courseYearId: ['', Validators.required],
      examTimetableId: ['', Validators.required],
      buildingId: [0],
      roomId: [],
      blockId: [0],
      floorId: [0],
      examTypeId: [],
      orderBy: ['H']
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

selectedRoom(roomId): void {
    this.room = {};
    if (roomId != null) {
        if (this.rooms.filter(x => (x.roomId === roomId)).length > 0) {
            this.room = this.rooms.filter(x => (x.roomId === roomId))[0];
            this.roomDetails = this.room.roomName + '(' + this.room.roomType + ')';
        }
    }
}

  getData(): void{
     /*----------- COLLEGES -----------*/
     this.crudService.listDetailsById(this.collegeCrudUrl, 'true', this.isActive)
     .subscribe(result => {
         this.spinner.hide();
         this.generalDetails();
         if (result.statusCode === 200){
             if (result.data.resultList && result.data.resultList !== '') {
                 this.colleges = result.data.resultList;
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

  generalDetails(): void{
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

  selectedCollege(collegeId): void{
    this.studentAllotmentForm.get('academicYearId').setValue('');
    this.studentAllotmentForm.get('courseId').setValue('');
    this.studentAllotmentForm.get('examId').setValue('');
    this.studentAllotmentForm.get('courseGroupId').setValue('');
    this.studentAllotmentForm.get('courseYearId').setValue('');
    this.courses = [];
    this.examsList = [];
    this.courseYears = [];
    this.courseGroups = [];
    this.academicYears = []; 
    this.filteredRoomsList = []; 
    this.examTimetableDetails = [];
    this.dataSource = new MatTableDataSource(this.examTimetableDetails); 
      /*----------- COURSES -----------*/
    if (collegeId != null && collegeId !== undefined ){
      this.crudService.listDetailsByTwoIds(this.courseCrudUrl, this.studentAllotmentForm.value.collegeId, 'true', this.getDetailsByCollegeIdUrl, this.isActive)
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
    }
  }

  selectedCourse(courseId): void{
    this.studentAllotmentForm.get('courseGroupId').setValue('');
    this.studentAllotmentForm.get('courseYearId').setValue('');
    this.studentAllotmentForm.get('examId').setValue('');
    this.courseYears = [];
    this.courseGroups = [];
    this.filteredRoomsList = []; 
    this.examTimetableDetails = [];
    this.dataSource = new MatTableDataSource(this.examTimetableDetails); 
    if (courseId !== null && courseId !== undefined){
      this.crudService.listDetailsByTwoIds(this.courseGroupCrudUrl, this.studentAllotmentForm.value.courseId, 'true', this.getDetailsByCourseIdUrl, this.isActive)
    .subscribe(result => {
        if (result.statusCode === 200) {
            if (result.data.resultList && result.data.resultList !== '') {
                this.courseGroups = result.data.resultList;
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

   // this.crudService.listDetailsByTwoIds(this.academicYearCrudUrl, this.studentAllotmentForm.value.collegeId, 'true', this.getDetailsByCollegeIdUrl, this.isActive)
   // tslint:disable-next-line: max-line-length
      this.crudService.listDetailsByTwoIdsWithSort(this.academicYearCrudUrl, this.studentAllotmentForm.value.collegeId, 'true', 'DESC', this.getDetailsByCollegeIdUrl, this.isActive, 'fromDate')
    .subscribe(result => {
        if (result.statusCode === 200) {
            if (result.data.resultList && result.data.resultList !== '') {
                this.academicYears = result.data.resultList;
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

       /*----------- EXAMS TYPES -----------*/
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
  }

  // tslint:disable-next-line:typedef
  selectedAcademicYear(academicYearId){
    this.studentAllotmentForm.get('examId').setValue('');
    this.examsList = [];
    this.filteredRoomsList = []; 
    this.examTimetableDetails = [];
    this.dataSource = new MatTableDataSource(this.examTimetableDetails); 
    if (academicYearId != null){
       /*----------- Exams List -----------*/      
      this.crudService.listDetailsByFourIds(this.examMasterUrl, this.studentAllotmentForm.value.collegeId, this.studentAllotmentForm.value.courseId, academicYearId, 'true',
      this.getDetailsByCollegeIdUrl , this.getDetailsByCourseIdUrl, 'academicYear.academicYearId', 'isActive')
      .subscribe(result => {
      this.spinner.hide();
      if (result.statusCode === 200){
          if (result.success && result.data.resultList.length > 0) {
            this.examsList = result.data.resultList;
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
  }

  selectedExamsList(examId): void{
    if (examId != null){
        this.filteredRoomsList = []; 
        this.examTimetableDetails = [];
        this.dataSource = new MatTableDataSource(this.examTimetableDetails); 
      /*----------- Timetables -----------*/
        this.crudService.listDetailsByTwoIds(this.examTimetableUrl, examId, 'true', this.getExamMasterDetailsUrl, this.isActive)
      .subscribe(result => {
          if (result.statusCode === 200) {
              if (result.data.resultList && result.data.resultList !== '') {
                  this.details = result.data.resultList;
                 
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

  /*--------- GET Blocks ----------*/
  SelectedBuilding(buildingId): void {
    if (buildingId !== null && buildingId !== undefined) {
      this.spinner.show();
      this.filteredRoomsList = [];
      if (buildingId === 0) {
            this.filteredRoomsList = this.roomAllotments;
        } else {
            // tslint:disable-next-line: prefer-for-of
            for (let i = 0; i < this.roomAllotments.length; i++) {
                if (this.roomAllotments[i].buildingId === buildingId) {
                    this.filteredRoomsList.push(this.roomAllotments[i]);
                }
            }
        }
      this.spinner.hide();
      this.blocks = [];
      this.floors = [];
      this.studentAllotmentForm.get('floorId').setValue(0);
      this.studentAllotmentForm.get('blockId').setValue(0);
      this.spinner.show();
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
    this.spinner.show();
    this.filteredRoomsList = [];
    if (blockId === 0) {

      // tslint:disable-next-line: prefer-for-of
      for (let i = 0; i < this.roomAllotments.length; i++) {
        if (this.roomAllotments[i].buildingId === this.studentAllotmentForm.value.buildingId) {
            //  this.filteredRoomsList.push(this.roomAllotments[i]);
            this.filteredRoomsList.push(this.roomAllotments[i]);
        }
    }
    } else {
      
        // tslint:disable-next-line: prefer-for-of
        for (let i = 0; i < this.roomAllotments.length; i++) {
            if (this.roomAllotments[i].blockId === blockId) {
                //  this.filteredRoomsList.push(this.roomAllotments[i]);
                this.filteredRoomsList.push(this.roomAllotments[i]);
            }
        }
    }
    this.spinner.hide();

    this.studentAllotmentForm.get('floorId').setValue(0);
    this.floors = [];
    if (blockId !== null && blockId !== undefined) {
          this.crudService.listDetailsByTwoIds(this.floorCrudUrl, blockId, 'true', this.getDetailsByBlockIdUrl, this.isActive)
              .subscribe(result => {
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
    this.spinner.show();
    this.filteredRoomsList = [];
    if (floorId === 0) {

      // tslint:disable-next-line: prefer-for-of
      for (let i = 0; i < this.roomAllotments.length; i++) {
        if (this.roomAllotments[i].buildingId === this.studentAllotmentForm.value.buildingId && this.roomAllotments[i].buildingId === this.studentAllotmentForm.value.blockId) {
            //  this.filteredRoomsList.push(this.roomAllotments[i]);
            this.filteredRoomsList.push(this.roomAllotments[i]);
        }
    }
    } else {
      
        // tslint:disable-next-line: prefer-for-of
        for (let i = 0; i < this.roomAllotments.length; i++) {
            if (this.roomAllotments[i].floorId === floorId) {
                //  this.filteredRoomsList.push(this.roomAllotments[i]);
                this.filteredRoomsList.push(this.roomAllotments[i]);
            }
        }
    }
    this.spinner.hide();
  }

  // tslint:disable-next-line:typedef
  isEmptyObject(obj) {
    return (obj && (Object.keys(obj).length === 0));
  }

  getlist(): void{
      if (!this.isEmptyObject(this.room)){
        this.spinner.show();
        this.students = [];
        this.flag = true;
        this.isRoom = true;
        const dateConvert = this.genericFunctions.momentFormatYMD(this.details.filter(x => (x.examTimetableId === this.studentAllotmentForm.value.examTimetableId))[0].examDate);
        this.crudService.listByFourIds(this.examStudentDetailsUrl, this.studentAllotmentForm.value.collegeId, 
            this.studentAllotmentForm.value.courseId, 
            this.studentAllotmentForm.value.examId, 
            dateConvert,
            this.collegeByIdUrl, this.courseByIdUrl, this.examIdUrl, 'examDate')
            .subscribe(result => {
            this.spinner.hide();
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
        // this.crudService.listByThreeIds(this.examRoomAllotmentPostUrl, this.studentAllotmentForm.value.collegeId, this.studentAllotmentForm.value.examId, 
        //   this.studentAllotmentForm.value.examTimeTableId, 'collegeId', 'examMasterId', 'examTimetableId')
        // .subscribe(result => {
        //     this.spinner.hide();
        //     if (result.statusCode === 200) {
        //         if (result.data && result.data.length > 0) {
        //             this.roomAllotments = result.data;
        //             this.filteredRoomsList = result.data;

        //             for (let index = 0; index < this.roomAllotments.length; index++) {
        //                 this.roomAllotments[index].isSelected = false;
        //                 this.roomAllotments[index].checked = false;
        //                 this.roomAllotments[index].roomdata = this.roomAllotments[index].blockCode + ' / ' + this.roomAllotments[index].buildingCode + ' / ' 
        //                 +  this.roomAllotments[index].floorNo +  ' / ' + this.roomAllotments[index].roomCode;
        //                 this.filteredRoomsList[index].roomdata = this.roomAllotments[index].blockCode + ' / ' + this.roomAllotments[index].buildingCode + ' / ' 
        //                 +  this.roomAllotments[index].floorNo +  ' / ' + this.roomAllotments[index].roomCode;
        //             }
                   
        //         } else {
        //             this.snotifyService.success(result.message, 'Success!');
        //         }
        //     } else {
        //         this.snotifyService.error(result.message, 'Error!');
        //     }
        // }, error => {
        //     this.spinner.hide();
        //     if (error.error.statusCode === 401) {
        //         this.snotifyService.error(error.error.message, 'Error!');
        //         this.genericFunctions.logOut(this.router.url);
        //     } else {
        //         this.snotifyService.error(CONSTANTS.message.CON_ERROR, 'Error!');
        //     }
        // });
      }
  }

  checkedCourses(check, item): void{
    this.selectedCourses = [];
    item.isSelected = check;
    // tslint:disable-next-line: prefer-for-of
    for (let i = 0; i < this.students.length; i++){
        if (this.students[i].isSelected){
            this.selectedCourses.push(this.students[i]);
        }
    }
    this.getCourseMark();
  }

  getCourseMark(): void{
    // tslint:disable-next-line: prefer-for-of
    for (let i = 0; i < this.students.length; i++){
        if (!this.students[i].isSelected){
            this.checkCourse = false;
            break;
        }else{
            this.checkCourse = true;
        }
    }
  }

  markAllCourse(): void{
    this.selectedCourses = [];
    // tslint:disable-next-line: prefer-for-of
    for (let i = 0; i < this.students.length; i++){
       if (!this.checkCourse){
          this.students[i].checked = true;
          this.students[i].isSelected = true;
          this.selectedCourses.push(this.students[i]);
       }else{
        this.students[i].checked = false;
        this.students[i].isSelected = false;
       }
    }  
  }

  checkedRooms(check, item): void{
    this.selectedRooms = [];
    item.isSelected = check;
    // tslint:disable-next-line: prefer-for-of
    for (let i = 0; i < this.filteredRoomsList.length; i++){
        if (this.filteredRoomsList[i].isSelected){
            this.selectedRooms.push(this.filteredRoomsList[i]);
        }
    }
    this.getMarkStatus();
  }

  getMarkStatus(): void{
    // tslint:disable-next-line: prefer-for-of
    for (let i = 0; i < this.filteredRoomsList.length; i++){
        if (!this.filteredRoomsList[i].isSelected){
            this.check = false;
            break;
        }else{
            this.check = true;
        }
    }
  }

  markAll(): void{
    this.selectedRooms = [];
    // tslint:disable-next-line: prefer-for-of
    for (let i = 0; i < this.filteredRoomsList.length; i++){
       if (!this.check){
          this.filteredRoomsList[i].checked = true;
          this.filteredRoomsList[i].isSelected = true;
          this.selectedRooms.push(this.filteredRoomsList[i]);
       }else{
        this.filteredRoomsList[i].checked = false;
        this.filteredRoomsList[i].isSelected = false;
       }
    }  
  }

  createStudentAllotment(): void{
      if ((this.room.examRows * this.room.examColumns) >= this.selectedCourses.length){
          this.spinner.show();
        this.roomAllot = [];
        this.roomAllot.push({
            "collegeId": this.studentAllotmentForm.value.collegeId,
            "examId": this.studentAllotmentForm.value.examId,
            "examTimetableId": this.studentAllotmentForm.value.examTimetableId,
            "roomId": this.studentAllotmentForm.value.roomId,
            "examDate": this.details.filter(x => (x.examTimetableId === this.studentAllotmentForm.value.examTimetableId))[0].examDate,
            "totalRows": this.room.examRows,
            "totalColumns": this.room.examColumns,
            "roomStrength": this.room.examRows * this.room.examColumns,
            "availableSeats": ((this.room.examRows * this.room.examColumns) - this.selectedCourses.length),
            "blockedSeats": 0,
            "bookedSeats": this.selectedCourses.length,
            "isActive": true,
            examRoomStudentAllotmentDTO: []
        });

        for (let i = 0; i < this.selectedCourses.length; i++){
            this.roomAllot[0].examRoomStudentAllotmentDTO.push({
                "collegeId": this.studentAllotmentForm.value.collegeId,
                "examId": this.studentAllotmentForm.value.examId,
                "examTimetableId": this.studentAllotmentForm.value.examTimetableId,
                "roomId": this.studentAllotmentForm.value.roomId,
                "examseatstatusCatId": this.examSeatStatuses.filter(x => (x.generalDetailCode === 'Booked'))[0].generalDetailId,
                "studentId": this.selectedCourses[i].studentId,
                "subjectId": this.selectedCourses[i].subjectId,
                "isActive": true
            })
        }
    
         /*---------- ADD EXAM ROOM ALLOTMENT ----------*/
         this.crudService.add(this.examroomallotmentUrl, this.roomAllot)
         .subscribe(result => {
             this.spinner.hide();
             if (result.statusCode === 200) {
                 if (result.success) {
                     this.snotifyService.success(result.message, 'Success!');
                     this.alotSlot();
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
      }else{ 
        this.snotifyService.info('Selected students are exceeding than room vacancy.', 'Info!');
      }
  }

  alotSlot(): void{
    this.crudService.seatSolve(this.seatingSolutionSolveUrl, 
        this.studentAllotmentForm.value.roomId, this.studentAllotmentForm.value.examTimetableId)
    .subscribe(result => {
        this.spinner.hide();
        if (result.statusCode === 200) {
            if (result.success) {
                this.snotifyService.success(result.message, 'Success!');
                this.getlist();
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

  printStudentAllotment(): void{
  }

}
