import {
    Component,
    OnInit,
    ViewChild
} from '@angular/core';
import {
    FormBuilder,
    FormControl,
    FormGroup,
    Validators
} from '@angular/forms';
import {
    Router
} from '@angular/router';
import {
    CONSTANTS
} from 'app/main/common/constants';
import {
    GenericFunctions
} from 'app/main/common/generic-functions';
import {
    College
} from 'app/main/models/college';
import {
    Course
} from 'app/main/models/course';
import {
    CourseGroup
} from 'app/main/models/courseGroup';
import {
    CourseYear
} from 'app/main/models/courseYearRegulation';
import {
    ExamMaster
} from 'app/main/models/examMaster';
import {
    GeneralDetail
} from 'app/main/models/generalDetail';
import {
    InvigilatorAllotment
} from 'app/main/models/invigilatorAllotment';
import {
    Room
} from 'app/main/models/room';
import {
    CrudService
} from 'app/main/services/crud.service';
import {
    SnotifyService
} from 'ng-snotify';
import {
    NgxSpinnerService
} from 'ngx-spinner';
import {
    ReplaySubject,
    Subject
} from 'rxjs';
import {
    AllocateRoomModalComponent
} from './allocate-room-modal/allocate-room-modal.component';
import {
    InvigilatorAllotmentModalComponent
} from './invigilator-allotment-modal/invigilator-allotment-modal.component';
import {
    Building
} from 'app/main/models/building';
import {
    Floors
} from 'app/main/models/floors';
import {
    Block
} from 'app/main/models/block';
import { ViewExistInvigilatorComponent } from './view-exist-invigilator/view-exist-invigilator.component';
import { MatDialog } from '@angular/material/dialog';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';


@Component({
    selector: 'app-invigilator-allotment',
    templateUrl: './invigilator-allotment.component.html',
    styleUrls: ['./invigilator-allotment.component.scss']
})
export class InvigilatorAllotmentComponent implements OnInit {

    displayedColumns: string[] = ['id', 'invigilatorEmpName', 'roomCode', 'invgdesignationCatCode', 'isActive', 'actions'];
    dataSource: MatTableDataSource < any > ;

    @ViewChild(MatPaginator) paginator: MatPaginator;
    @ViewChild(MatSort) sort: MatSort;
    panelOpenState = true;

    private collegeCrudUrl = CONSTANTS.collegeCrudUrl;
    private getDetailsByUniversityIdUrl = CONSTANTS.getDetailsByUniversityIdUrl;
    private examTimetableUrl = CONSTANTS.examTimetableUrl;
    private examMasterUrl = CONSTANTS.examMasterUrl;
    private getDetailsByCollegeIdUrl = CONSTANTS.getDetailsByCollegeIdUrl;
    private isActive = CONSTANTS.isActive;
    private examInvigilationAllotmentUrl = CONSTANTS.examInvigilationAllotmentUrl;
    private getDetailsByExamTimetableIdUrl = CONSTANTS.getDetailsByExamTimetableIdUrl;
    private examRoomAllotmentPostUrl = CONSTANTS.examRoomAllotmentPostUrl;
    private examinvigilationallotmentUrl = CONSTANTS.examinvigilationallotmentUrl;
    private courseCrudUrl = CONSTANTS.courseCrudUrl;
    private getDetailsByCourseIdUrl = CONSTANTS.getDetailsByCourseIdUrl;
    private getExamMasterDetailsUrl = CONSTANTS.getExamMasterDetailsUrl;
    private generalDetailsUrl = CONSTANTS.generalDetailsUrl;
    private invlatrDisgTypesUrl = CONSTANTS.invlatrDisgTypesUrl;
    private generalDetailsByCodeUrl = CONSTANTS.generalDetailsByCodeUrl;
    private buildingCrudUrl = CONSTANTS.buildingCrudUrl;
    private blockCrudUrl = CONSTANTS.blockCrudUrl;
    private getDetailsByBuildingIdUrl = CONSTANTS.getDetailsByBuildingIdUrl;
    private floorCrudUrl = CONSTANTS.floorCrudUrl;
    private getDetailsByBlockIdUrl = CONSTANTS.getDetailsByBlockIdUrl;
    private academicYearCrudUrl = CONSTANTS.academicYearCrudUrl;
    private getDetailsByAcademicYearIdUrl = CONSTANTS.getDetailsByAcademicYearIdUrl;
    private courseYearCrudUrl = CONSTANTS.courseYearCrudUrl;
    private sortOrder = CONSTANTS.sortOrder;
    private getDetailsByCourseYearIdUrl = CONSTANTS.getDetailsByCourseYearIdUrl;
    private popExamInvigilatorUrl = CONSTANTS.popExamInvigilatorUrl;


    private _onDestroy = new Subject < void > ();
    public employeeFilterCtrl: FormControl = new FormControl();
    public employeeSingleCtrl: FormControl = new FormControl();
    public filteredEmployees: ReplaySubject < any[] > = new ReplaySubject < any[] > (1);

    public roomFilterCtrl: FormControl = new FormControl();
    public filteredRooms: ReplaySubject < any[] > = new ReplaySubject < any[] > (1);


    staffForm: FormGroup;
    invStaffForm: FormGroup;
    colleges: College[] = [];
    examTimetables: any[] = [];
    courses: Course[] = [];
    examMasterList: ExamMaster[] = [];
    courseGroups: CourseGroup[] = [];
    courseYears: CourseYear[] = [];
    rooms: Room[] = [];
    roomAllotments: any[] = [];
    buildings: Building[] = [];
    blocks: Block[] = [];
    floors: Floors[] = [];


    examInvigilationAllotmentsList: any[] = [];
    filteredRoomsList: any[] = [];
    examAllotment: any[] = [];
    searchEmployees: any[] = [];
    invigilatorDisg: any[] = [];
    academicYears: any[] = [];
    step = 0;
    orgId: number;
    roomDetail: any = {};
    exam: any = {};
    settingValues: any = [];
    searchRooms = [];
    selectedRoom = [];
    check = 1;
    roomName;
    flag = false;
    examDetails;
    collegeCode;
    courseCode;
    examTimetable;
    data;
    dataSecStaff;
    dataSECPrincipal;
    obersersList = [];
    examData = [];
    timetabledata = [];
    universityId;

    constructor(private formBuilder: FormBuilder, private snotifyService: SnotifyService,
                private crudService: CrudService, private spinner: NgxSpinnerService, private router: Router,
                private dialog: MatDialog, private genericFunctions: GenericFunctions) {
        this.orgId = +localStorage.getItem('organizationId');
        this.dataSecStaff = this.genericFunctions.dataSecurityLevel();
        this.dataSECPrincipal = this.genericFunctions.dataSecurityLevelPrincipal();
        this.getData();
    }

    // tslint:disable-next-line:typedef
    ngOnInit() {

        this.staffForm = this.formBuilder.group({
            collegeId: ['', Validators.required],
            examTimeTableId: ['', Validators.required],
            academicYearId: ['', Validators.required],
            roomId: ['', Validators.required],
            examId: ['', Validators.required],
            courseId: ['', Validators.required],
            courseYearId: ['', Validators.required],
            buildingId: [0],
            blockId: [0],
            floorId: [0],
        });
    }




    getData(): void {

        /*----------- COLLEGES -----------*/
        this.crudService.listDetailsById(this.collegeCrudUrl, 'true', this.isActive)
            .subscribe(result => {
                if (result.statusCode === 200) {
                    if (result.data.resultList && result.data.resultList !== '') {
                        this.colleges = result.data.resultList;
                        if (this.dataSECPrincipal && this.colleges.length > 0){
                            this.staffForm.get('collegeId').setValue(+localStorage.getItem('collegeId'));
                            this.data = this.colleges.filter(x => (x.collegeId === this.staffForm.value.collegeId))[0].collegeCode;
                            this.selectedCollege(this.staffForm.value.collegeId); 
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


    selectedCollege(collegeId): void {
        this.flag = false;
        this.examTimetables = [];
        this.examInvigilationAllotmentsList = [];
        this.rooms = [];
        this.courses = [];
        this.roomAllotments = [];
        this.academicYears = [];
        this.filteredRoomsList = [];
        this.examMasterList = [];
        this.staffForm.get('examTimeTableId').setValue('');
        this.staffForm.get('roomId').setValue('');
        this.staffForm.get('courseId').setValue('');
        this.staffForm.get('academicYearId').setValue('');
        this.staffForm.get('examId').setValue('');
        this.dataSource = new MatTableDataSource < any > (this.examInvigilationAllotmentsList);
        this.universityId = this.colleges.filter(x => (x.collegeId === this.staffForm.value.collegeId))[0].universityId;
        
      //   this.crudService.listDetailsByTwoIdsWithSort(this.academicYearCrudUrl, collegeId, 'true', 'DESC', this.getDetailsByCollegeIdUrl, this.isActive, 'fromDate')
        this.crudService.listDetailsByTwoIdsWithSort(this.academicYearCrudUrl, this.universityId, 'true', 'DESC', this.getDetailsByUniversityIdUrl, this.isActive, 'fromDate')
       .subscribe(result => {
            if (result.statusCode === 200){
                    if (result.data.resultList && result.data.resultList !== '') {
                        this.academicYears = result.data.resultList;
                        if (this.academicYears.length > 0){
                            this.staffForm.get('academicYearId').setValue(+localStorage.getItem('academicYearId'));
                            this.data =  this.data + ' / ' + this.academicYears.filter(x => (x.academicYearId === this.staffForm.value.academicYearId))[0].academicYear;
                            this.selectedAcademicYear(this.staffForm.value.academicYearId); 
                         }
                        // if (!this.isEmptyObject(this.pageParams) && this.academicYears.length > 0){
                        //   if (this.academicYears.filter(x => (x.academicYearId === this.pageParams.academicYearId)).length > 0){
                        //     this.staffForm.get('academicYearId').setValue(+this.pageParams.academicYearId);  
                        //     this.selectedAcademicYear(this.staffForm.value.academicYearId);  
                        //   }
                       // } 
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


    
    
  selectedAcademicYear(academicYearId): void{
    this.staffForm.get('courseId').setValue('');
    this.staffForm.get('examId').setValue('');
    this.courses = [];
    this.courses = [];
    this.dataSource = new MatTableDataSource<any>(this.examInvigilationAllotmentsList);
    if (academicYearId !== null && academicYearId !== ''){
        /*----------- COURSES -----------*/
        this.crudService.listDetailsByTwoIds(this.courseCrudUrl, this.universityId, 'true', this.getDetailsByUniversityIdUrl, this.isActive)
        .subscribe(result => {
            if (result.statusCode === 200){
                    if (result.data.resultList && result.data.resultList !== '') {
                        this.courses = result.data.resultList;
                        if ( this.courses.length > 0){
                            this.staffForm.get('courseId').setValue(+localStorage.getItem('courseId'));
                            this.data =  this.data + ' / ' + this.courses.filter(x => (x.courseId === this.staffForm.value.courseId))[0].courseCode;
                            this.selectedCourse(this.staffForm.value.courseId); 
                         }
                        // if (!this.isEmptyObject(this.pageParams) && this.courses.length > 0){
                        //   if (this.courses.filter(x => (x.courseId === this.pageParams.courseId)).length > 0){
                        //     this.staffForm.get('courseId').setValue(+this.pageParams.courseId); 
                          
                        //     this.selectedCourse(this.staffForm.value.courseId);  
                        //   }
                        // }              
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
    selectedCourse(courseId) {
        this.flag = false;
        this.examTimetables = [];
        this.examInvigilationAllotmentsList = [];
        this.roomAllotments = [];
        this.filteredRoomsList = [];
        this.rooms = [];
        this.examMasterList = [];
        this.staffForm.get('examTimeTableId').setValue('');
        this.staffForm.get('courseYearId').setValue('');
        this.courseYears = [];
        this.staffForm.get('roomId').setValue('');
        this.staffForm.get('examId').setValue('');
        if (courseId !== null && courseId !== '') {
            /*----------- Exam Master -----------*/
            // tslint:disable-next-line: max-line-length
            this.crudService.listDetailsByThreeIdsWithSort(this.examMasterUrl, this.staffForm.value.courseId, this.staffForm.value.academicYearId, 'true', 'DESC',
                this.getDetailsByCourseIdUrl , this.getDetailsByAcademicYearIdUrl, this.isActive, 'createdDt')
            // this.crudService.listDetailsByFourIds(this.examMasterUrl, this.staffForm.value.courseId, this.staffForm.value.academicYearId, 'true',
            //     'DESC', this.getDetailsByCourseIdUrl, this.getDetailsByAcademicYearIdUrl, this.isActive , 'createdDt')
    .subscribe(result => {
                    if (result.statusCode === 200) {
                        if (result.data.resultList && result.data.resultList !== '') {
                            this.examMasterList = result.data.resultList;
                            this.examData = result.data.resultList;
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
                   /*----------- COURSE YEARS -----------*/
        //     this.crudService.listDetailsByTwoIdsWithSortLtd(this.courseYearCrudUrl, courseId, 'true', 'ASC',
        //     this.getDetailsByCourseIdUrl, this.isActive, this.sortOrder)
        //    .subscribe(result => {
        //        if (result.statusCode === 200){
        //                if (result.data.resultList && result.data.resultList !== '') {
        //                    this.courseYears = result.data.resultList;
                            
        //                } else {
        //                    this.snotifyService.success(result.message, 'Success!');
        //                }
        //            }else {
        //              this.snotifyService.error(result.message, 'Error!');
        //          }
               
        //    }, error => {
        //      if (error.error.statusCode === 401){
        //          this.snotifyService.error(error.error.message, 'Error!');
        //          this.genericFunctions.logOut(this.router.url);
        //      }else{
        //          this.snotifyService.error(CONSTANTS.message.CON_ERROR, 'Error!');
        //      }
        //    });

        }
    }
    searchExam(value){
        this.examData = [];
        this.search(value)
    }
    search(value:string){
        
        let filter = value.toLowerCase()
        for(let i =0;i<this.examMasterList.length;i++){
            let option = this.examMasterList[i];
            if (option.examName.toLowerCase().indexOf(filter) >= 0) {
                this.examData.push(option);
              }
        }
    }
    // tslint:disable-next-line:typedef
    selectedExam(examId) {
        this.flag = false;
        this.examTimetables = [];
        this.examInvigilationAllotmentsList = [];
        this.rooms = [];
        this.roomAllotments = [];
        this.filteredRoomsList = [];
        this.staffForm.get('examTimeTableId').setValue('');
        this.staffForm.get('roomId').setValue('');
        if (examId !== null && examId !== '') {
            /*----------- Timetables -----------*/
            this.crudService.listDetailsByTwoIds(this.examTimetableUrl, examId, 'true',
                                                   this.getExamMasterDetailsUrl, this.isActive)
                .subscribe(result => {
                    if (result.statusCode === 200) {
                        if (result.data.resultList && result.data.resultList !== '') {
                            this.examTimetables = result.data.resultList;
                            this.examTimetables=this.examTimetables.sort
                            ((a, b) => new Date(a.examDate).getTime() - new Date(b.examDate).getTime());
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

    /*--------- GET ROOM ALLOTMENTS ----------*/
    selectedExamTimetable(examTimetableId): void {
        this.flag = false;
        this.examDetails = this.examTimetables.filter(x => (x.examTimetableId === examTimetableId))[0];
        this.roomAllotments = [];
        this.filteredRoomsList = [];
        if (this.colleges.filter(x => (x.collegeId === this.staffForm.value.collegeId)).length > 0){
            this.collegeCode = this.colleges.filter(x => (x.collegeId === this.staffForm.value.collegeId))[0].collegeCode;
        }
        if (this.courses.filter(x => (x.courseId === this.staffForm.value.courseId)).length > 0){
            this.courseCode = this.courses.filter(x => (x.courseId === this.staffForm.value.courseId))[0].courseCode;
        }
        if (this.examMasterList.filter(x => (x.examId === this.staffForm.value.examId)).length > 0){
            this.exam = this.examMasterList.filter(x => (x.examId === this.staffForm.value.examId))[0].examName;
        }
        if (this.examTimetables.filter(x => (x.examTimetableId === this.staffForm.value.examTimeTableId)).length > 0){
            this.examTimetable = this.examTimetables.filter(x => (x.examTimetableId === this.staffForm.value.examTimeTableId))[0].examDate;
        }
        
        this.examInvigilationAllotmentsList = [];
        if (examTimetableId != null && examTimetableId !== undefined) {
            this.spinner.show();
            this.crudService.listByThreeIds(this.examRoomAllotmentPostUrl, this.staffForm.value.collegeId, this.staffForm.value.examId, examTimetableId,
                    'collegeId', 'examMasterId', 'examTimetableId')
                .subscribe(result => {
                    this.spinner.hide();
                    if (result.statusCode === 200) {
                        if (result.data && result.data.length > 0) {
                            this.roomAllotments = result.data;
                            // tslint:disable-next-line: prefer-for-of
                            for (let index = 0; index < this.roomAllotments .length; index++) {
                                this.roomAllotments[index].examInvigilationAllotmentsList = [];
                                
                            }
                            this.SelectedTimetabelEmployees(examTimetableId);
                        } else {
                            this.SelectedTimetabelEmployees(examTimetableId);
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

            this.crudService.listDetailsByTwoIds(this.generalDetailsUrl, this.invlatrDisgTypesUrl, 'true', this.generalDetailsByCodeUrl, this.isActive)
                .subscribe(result => {
                    if (result.statusCode === 200) {
                        if (result.data.resultList && result.data.resultList !== '') {
                            this.invigilatorDisg = result.data.resultList;
                            for (let i = 0; i < this.invigilatorDisg.length; i++) {
                                this.invigilatorDisg[i].colorValue = i + 1;
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
    
    // tslint:disable-next-line:typedef
    SelectedTimetabelEmployees(examTimetableId) {
        this.examInvigilationAllotmentsList = [];
        this.filteredRoomsList = [];
        this.obersersList = [];
        /*----------- Timetables -----------*/
        this.crudService.listDetailsByThreeIds(this.examInvigilationAllotmentUrl,
                examTimetableId, this.staffForm.value.collegeId, 'true',
                this.getDetailsByExamTimetableIdUrl, this.getDetailsByCollegeIdUrl, 'isActive')
            .subscribe(result => {
                if (result.statusCode === 200) {
                    this.flag = true;
                    if (result.data.resultList && result.data.resultList !== '') {
                        this.examInvigilationAllotmentsList = result.data.resultList;
                        if (this.examInvigilationAllotmentsList.length > 0) {
                           // for (let i = 0; i < this.roomAllotments.length; i++) {
                              //  this.roomAllotments[i].examInvigilationAllotmentsList = [];
                                // tslint:disable-next-line: prefer-for-of
                                for (let j = 0; j < this.examInvigilationAllotmentsList.length; j++) {
                                   // this.roomAllotments[j].examInvigilationAllotmentsList = [];
                                    if (this.roomAllotments.filter(x => (x.roomId === this.examInvigilationAllotmentsList[j].roomId)).length > 0){
                                        if (!this.roomAllotments.filter(x => (x.roomId === this.examInvigilationAllotmentsList[j].roomId))[0].examInvigilationAllotmentsList){
                                            this.roomAllotments.filter(x => (x.roomId === this.examInvigilationAllotmentsList[j].roomId))[0].examInvigilationAllotmentsList = [];
                                        }
                                       // console.log(this.examInvigilationAllotmentsList[j].roomId);
                                        // tslint:disable-next-line: max-line-length
                                        this.roomAllotments.filter(x => (x.roomId === this.examInvigilationAllotmentsList[j].roomId))[0].examInvigilationAllotmentsList.push(this.examInvigilationAllotmentsList[j]);
                                    }else{
                                        this.roomAllotments.push(
                                            {
                                                roomId: this.examInvigilationAllotmentsList[j].roomId,
                                                roomName: this.examInvigilationAllotmentsList[j].roomName,
                                                buildingCode: this.examInvigilationAllotmentsList[j].buildingCode,
                                                blockCode: this.examInvigilationAllotmentsList[j].blockCode,
                                                floorNo: this.examInvigilationAllotmentsList[j].floorNo,
                                                examRoomAllotmentId: null,
                                                examInvigilationAllotmentsList: [this.examInvigilationAllotmentsList[j]]
                                            }
                                        );
                                    }
                                    // if (this.roomAllotments[i].roomId === this.examInvigilationAllotmentsList[j].roomId) {
                                    //     this.roomAllotments[i].examInvigilationAllotmentsList.push(this.examInvigilationAllotmentsList[j]);
                                    // }
                                }
                           // }
                         
                          
                                this.filteredRoomsList = this.roomAllotments;
                                this.getObservers(this.filteredRoomsList);
                           // console.log(this.filteredRoomsList);
                        }else
                        if (this.examInvigilationAllotmentsList.length === 0) {
                            // tslint:disable-next-line: prefer-for-of
                            for (let index = 0; index < this.roomAllotments.length; index++) {
                                this.roomAllotments[index].examInvigilationAllotmentsList = [];
                               // this.roomAllotments = this.roomAllotments[index];
                                
                            }
                            this.filteredRoomsList = this.roomAllotments;
                            this.getObservers(this.filteredRoomsList);
                           // console.log(this.filteredRoomsList);
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


        this.crudService.listDetailsById(this.buildingCrudUrl, 'true', this.isActive)
            .subscribe(result => {
                this.spinner.hide();
                if (result.statusCode === 200) {
                    if (result.data.resultList && result.data.resultList !== '') {
                        this.buildings = result.data.resultList;

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

    getObservers(arr){
        console.log(arr[0].examInvigilationAllotmentsList);
        this.obersersList = [];
        if (arr[0].examInvigilationAllotmentsList
            .filter(x => (x.invgdesignationCatCode === 'OBSERVER')).length > 0){
            this.obersersList = arr[0].examInvigilationAllotmentsList.filter(x => (x.invgdesignationCatCode === 'OBSERVER'));
        }
    }

    getColorValue(item): any {
        if (item != null) {
            if (this.invigilatorDisg.filter(x => (x.generalDetailId === item.invgdesignationCatId)).length > 0) {
                return this.invigilatorDisg.filter(x => (x.generalDetailId === item.invgdesignationCatId))[0].colorValue;
            } else {
                return 0;
            }
        }
    }

    selectedRoomDetails(data, a): void {
        if (data === 'update' && a === 'List') {
            this.roomDetail = {
                collegeId: this.staffForm.value.collegeId,
                examTimeTableId: this.staffForm.value.examTimeTableId,
                collegeCode: this.colleges.filter(x => (x.collegeId === this.staffForm.value.collegeId))[0].collegeCode,
                courseCode: this.courses.filter(x => (x.courseId === this.staffForm.value.courseId))[0].courseCode,
                academicYear: this.academicYears.filter(x => (x.academicYearId === this.staffForm.value.academicYearId))[0].academicYear,
                exam: this.examMasterList.filter(x => (x.examId === this.staffForm.value.examId))[0].examName,
                examTimetable: this.examTimetables.filter(x => (x.examTimetableId === this.staffForm.value.examTimeTableId))[0].examDate,
                dataDetails: 'newRoom',
                examDate: this.examDetails.examDate
            };
        } else {
            this.roomDetail = data;
            this.roomDetail.examDate = this.examDetails.examDate;
            this.roomDetail['dataDetails'] = 'oldRoom';
        }
        if (a === 'List') {
            this.roomDetail.collegeCode = this.colleges.filter(x => (x.collegeId === this.staffForm.value.collegeId))[0].collegeCode;
            this.roomDetail.courseCode = this.courses.filter(x => (x.courseId === this.staffForm.value.courseId))[0].courseCode;
            this.roomDetail.academicYear = this.academicYears.filter(x => (x.academicYearId === this.staffForm.value.academicYearId))[0].academicYear;
            this.roomDetail.examName = this.examMasterList.filter(x => (x.examId === this.staffForm.value.examId))[0].examName;
            this.roomDetail.examDate = this.examDetails.examDate;
           
            const dialogRef = this.dialog.open(InvigilatorAllotmentModalComponent, {
                width: '950px',
                data: this.roomDetail
            });

            dialogRef.afterClosed().subscribe(details => {
                if (details != null && details !== '') {
                    this.invigilatorAllotment(details);
                }else{
                    this.selectedExamTimetable(this.staffForm.value.examTimeTableId);
                }
            });
        }

    }
    addRoomDetails(): void {
        const dialogRef = this.dialog.open(AllocateRoomModalComponent, {
            width: '950px',
            data: {
                collegeCode: this.colleges.filter(x => (x.collegeId === this.staffForm.value.collegeId))[0].collegeCode,
                courseCode: this.courses.filter(x => (x.courseId === this.staffForm.value.courseId))[0].courseCode,
                exam: this.examMasterList.filter(x => (x.examId === this.staffForm.value.examId))[0].examName,
                examTimetable: this.examTimetables.filter(x => (x.examTimetableId === this.staffForm.value.examTimeTableId))[0].examDate
            }
        });

    }
    invigilatorAllotment(details): void {
        this.spinner.show();
        if (this.roomDetail.dataDetails === 'oldRoom') {
            /*-------- ADD NEW EXAM INVIGILATION ALLOTMENT  ---------*/
            this.crudService.add(this.examinvigilationallotmentUrl, details)
                .subscribe(result => {
                    this.spinner.hide();
                    if (result.success) {
                        this.snotifyService.success(result.message, 'Success!');
                        this.selectedExamTimetable(this.staffForm.value.examTimeTableId);
                    } else {
                        if (result.data.length > 0){
                            const dialogRef = this.dialog.open(ViewExistInvigilatorComponent, {
                                width: '650px',
                                data: result.data
                            });
                            this.snotifyService.info(result.message, 'Info!');
                        }
                        this.selectedExamTimetable(this.staffForm.value.examTimeTableId);
                    }
                }, error => {
                    this.spinner.hide();
                    if (error.error.statusCode === 401) {
                        this.snotifyService.error(error.error.message, 'Error!');
                        // this.genericFunctions.logOutWithParams(this.pageParams);
                    } else {
                        this.snotifyService.error(CONSTANTS.message.CON_ERROR, 'Error!');
                    }
                });
        } else
        if (this.roomAllotments) {
            /*-------- ADD EXAM INVIGILATOR AND ROOM ALLOTMENT  ---------*/
            this.crudService.add(this.examinvigilationallotmentUrl, details)
                .subscribe(result => {
                    this.spinner.hide();
                    if (result.success === true) {
                        if (result.success) {
                            this.snotifyService.success(result.message, 'Success!');
                            this.selectedExamTimetable(this.staffForm.value.examTimeTableId);
                        } else {
                            if (result.data.length > 0){
                                const dialogRef = this.dialog.open(ViewExistInvigilatorComponent, {
                                    width: '650px',
                                    data: result.data
                                });
                                this.snotifyService.info(result.message, 'Info!');
                            }
                            this.selectedExamTimetable(this.staffForm.value.examTimeTableId);
                        }
                        
                    } else {
                        this.snotifyService.error(result.message, 'Error!');
                    }
                }, error => {
                    this.spinner.hide();
                    if (error.error.statusCode === 401) {
                        this.snotifyService.error(error.error.message, 'Error!');
                        // this.genericFunctions.logOutWithParams(this.pageParams);
                    } else {
                        this.snotifyService.error(CONSTANTS.message.CON_ERROR, 'Error!');
                    }
                });
        }
    }

    allocateNewStaff(data, tile, b): void {
        this.examAllotment = [];
        tile.generalDetailCode = data.generalDetailDisplayName;
        tile.observerList = this.obersersList;
        if (b === 'single') {
            const dialogRef = this.dialog.open(AllocateRoomModalComponent, {
                //   position: {top: '50px', left: '50px'},
                width: '750px',
                data: tile,
            });

            dialogRef.afterClosed().subscribe(details => {
                if (details != null && details !== '') {
                    if (tile.examInvigilationAllotmentsList.filter(x => (x.invigilatorEmpId === details.invigilatorEmpId)).length === 0) {
                        details.collegeId = this.staffForm.value.collegeId;
                        details.examTimeTableId = this.staffForm.value.examTimeTableId;
                        details.examId = this.staffForm.value.examId;
                      //  details.invgdesignationCatId = data.generalDetailId;
                        details.roomId = tile.roomId;
                        this.examAllotment.push(details);
                        this.spinner.show();
                        /*-------- ADD EXAM INVIGILATOR AND ROOM ALLOTMENT  ---------*/
                        this.crudService.add(this.examinvigilationallotmentUrl, this.examAllotment)
                            .subscribe(result => {
                                this.spinner.hide();
                                if (result.success) {
                                    this.selectedExamTimetable(this.staffForm.value.examTimeTableId);
                                   // this.SelectedTimetabelEmployees(this.staffForm.value.examTimeTableId);
                                    this.snotifyService.success(result.message, 'Success!');
                                } else {
                                    this.snotifyService.error(result.message, 'Error!');
                                }
                            }, error => {
                                this.spinner.hide();
                                if (error.error.statusCode === 401) {
                                    this.snotifyService.error(error.error.message, 'Error!');
                                    // this.genericFunctions.logOutWithParams(this.pageParams);
                                } else {
                                    this.snotifyService.error(CONSTANTS.message.CON_ERROR, 'Error!');
                                }
                            });
                    } else {
                        this.snotifyService.info('This employee already allocated to the exam', 'info');
                    }

                }else{
                    this.selectedExamTimetable(this.staffForm.value.examTimeTableId);
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
                        //  this.filteredRoomsList.push(this.roomAllotments[i]);
                        this.filteredRoomsList.push(this.roomAllotments[i]);
                    }
                }
            }
          this.spinner.hide();
          this.blocks = [];
          this.floors = [];
          this.staffForm.get('floorId').setValue(0);
          this.staffForm.get('blockId').setValue(0);
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
          if (this.roomAllotments[i].buildingId === this.staffForm.value.buildingId) {
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
      this.staffForm.get('floorId').setValue(0);
      this.floors = [];
      this.examInvigilationAllotmentsList = [];
      this.dataSource = new MatTableDataSource < any > (this.examInvigilationAllotmentsList);
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
          if (this.roomAllotments[i].buildingId === this.staffForm.value.buildingId && this.roomAllotments[i].buildingId === this.staffForm.value.blockId) {
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


    // tslint:disable-next-line: typedef
    getColor(item) {
        switch (item) {
            case 1:
                return '#03A9F4';
            case 2:
                return '#E91E63';
            case 3:
                return '#1ee939';
            case 4:
                return '#e9d51e';
            case 5:
                return '#b47d15';
            case 6:
                return '#e97c23';
        }
    }
autoAssign(){
  this.spinner.show();
  let request = [
    {paramName: 'in_flag', paramValue: 'popexaminvigilator'},
    {paramName: 'in_timetable_det_id', paramValue: this.staffForm.value.examTimeTableId},
  ];
  this.crudService.getDetailsByRequest(this.popExamInvigilatorUrl,'', request,'&')
  .subscribe(result => {
  this.spinner.hide();
  if (result.statusCode === 200){
       if (result.success) {
        this.snotifyService.success(result.message, 'Success!');
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
}
