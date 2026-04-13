import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
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
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import * as XLSX from 'xlsx';

@Component({
  selector: 'app-examcenter-rooms-report',
  templateUrl: './examcenter-rooms-report.component.html',
  styleUrls: ['./examcenter-rooms-report.component.scss']
})
export class ExamcenterRoomsReportComponent implements OnInit {

  dataSource: MatTableDataSource<any>;
  displayedColumns: string[] = ['id', 'examCenterName', 'Building', 'RoomName', 'RoomCode'];
  open: boolean;
  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild(MatSort) sort: MatSort;
  @ViewChild('TABLE') excelTable: ElementRef;


  private isActive = CONSTANTS.isActive;
  private generalDetailsUrl = CONSTANTS.generalDetailsUrl;
  private generalDetailsByCodeUrl = CONSTANTS.generalDetailsByCodeUrl;
  private examSeatStatus = CONSTANTS.examSeatStatus;
  private buildingCrudUrl = CONSTANTS.buildingCrudUrl;
  private blockCrudUrl = CONSTANTS.blockCrudUrl;
  private getDetailsByBuildingIdUrl = CONSTANTS.getDetailsByBuildingIdUrl;
  private floorCrudUrl = CONSTANTS.floorCrudUrl;
  private getDetailsByBlockIdUrl = CONSTANTS.getDetailsByBlockIdUrl;
  private collegewisedetailsUrl = CONSTANTS.collegewisedetailsUrl;
  private UnivExamCentersUrl = CONSTANTS.UnivExamCentersUrl;
  private UnivExamCenterRoomsUrl = CONSTANTS.UnivExamCenterRoomsUrl;
  MINIO = CONSTANTS.MINIO;


  staffForm: FormGroup;
  panelOpenState = true;
  step = 0;
  examsList: any = {};
  rooms: any[] = [];
  room: any = {};
  examSeatStatuses: GeneralDetail[] = [];
  examSeatStatusId;
  examRoomAllot: any[] = [];
  examRoomAllotment = [];
  event: any = {};
  examRoomStdAllotId;
  examRoomAllotmentId;
  check = 1;
  buildings: any[] = [];
  blocks = [];
  floors = [];
  vacancyRoomList = [];
  isAllrooms: boolean;
  CollegesListDetails: any;
  courses: any;
  filtersDetailsList: any;
  examsLists: any;
  searchExams: any[];
  academicYearsList: any;
  academicYears: any[];
  examData: any[];
  examTimetableId: any;
  univExamCenters = [];
  requestPayload = [];
  collegeId: any;
  examCenterRoomsList = [];
  resultData = [];
  selectedRooms = [];
  examCenterName: any;
  buildingName: any[];
  blockName: any[];
  floorName: any[];
  block: any;
  floor: any;
  orgCode;
  Logo: any;

  constructor(private formBuilder: FormBuilder, private snotifyService: SnotifyService,
    private crudService: CrudService, private spinner: NgxSpinnerService, private router: Router,
    private dialog: MatDialog, private genericFunctions: GenericFunctions, private route: ActivatedRoute) {
    this.getFiltersList();
    this.orgCode = localStorage.getItem('orgCode');
  }

  // tslint:disable-next-line:typedef
  ngOnInit() {
    this.staffForm = this.formBuilder.group({
      courseId: ['', Validators.required],
      academicYearId: ['', Validators.required],
      examId: ['', Validators.required],
      univExamcenterId: ['', Validators.required],
      roomId: [],
      buildingId: [],
      blockId: [],
      floorId: [],
    });

    this.dataSource = new MatTableDataSource(this.examCenterRoomsList);
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }


  getFiltersList(): void {
    this.spinner.show();
    let request = [
      { paramName: 'in_flag', paramValue: 'clg_exam_timetable_filters' },
      { paramName: 'in_org_id', paramValue: +localStorage.getItem('organizationId') },
      { paramName: 'in_college_id', paramValue: 0 },
      { paramName: 'in_course_id', paramValue: 0 },
      { paramName: 'in_course_group_id', paramValue: 0 },
      { paramName: 'in_course_year_id', paramValue: 0 },
      { paramName: 'in_group_section_id', paramValue: 0 },
      { paramName: 'in_academic_year_id', paramValue: 0 },
      { paramName: 'in_dept_id', paramValue: 0 },
      { paramName: 'in_isadmin', paramValue: 0 },
      { paramName: 'in_loginuser_empid', paramValue: +localStorage.getItem('employeeId') },
      { paramName: 'in_loginuser_roleid', paramValue: 0 },
      { paramName: 'in_employee', paramValue: '' },
      { paramName: 'in_subject', paramValue: '' },
      { paramName: 'in_gm_codes', paramValue: '' },
    ];
    this.crudService.getDetailsByRequest(this.collegewisedetailsUrl, '', request, '&')
      .subscribe(result => {
        this.spinner.hide();
        if (result.statusCode === 200) {
          if (result.data && result.data !== '' && result.data.result.length > 0) {
            this.filtersDetailsList = result.data.result;
            for (let i = 0; i < this.filtersDetailsList.length; i++) {
              if (this.filtersDetailsList[i].length > 0 && this.filtersDetailsList[i][0].flag === 'clg_exam_timetable_filters') {
                this.CollegesListDetails = this.filtersDetailsList[i];
              }
            }

            const courseList = this.CollegesListDetails.map(({ fk_course_id }) => fk_course_id);
            this.courses = this.CollegesListDetails.filter(({ fk_course_id }, index) =>
              !courseList.includes(fk_course_id, index + 1));
          }
          if (this.courses.length > 0) {
            this.staffForm.get('courseId').setValue(this.courses[0].fk_course_id);
            this.selectedCourse(this.staffForm.value.courseId);
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

  selectedCourse(courseId) {
    this.staffForm.get('examId').setValue(0);
    this.staffForm.get('academicYearId').setValue(0);
    this.academicYears = []
    this.searchExams = [];
    this.examsList = [];
    this.searchExams = [];
    this.academicYearsList = [];
    this.examData = [];
    this.academicYearsList = this.CollegesListDetails.filter(x => (x.fk_course_id == this.staffForm.value.courseId))
    if (this.academicYearsList.length > 0) {
      const academicYearsList = this.academicYearsList.map(({ fk_academic_year_id }) => fk_academic_year_id);
      this.academicYears = this.academicYearsList.filter(({ fk_academic_year_id }, index) => !academicYearsList.includes(fk_academic_year_id, index + 1));
    }
    if (this.academicYears.length > 0) {
      this.staffForm.get('academicYearId').setValue(this.academicYears[0].fk_academic_year_id);
      this.selectedAcademicYear(this.staffForm.value.academicYearId)
    }
  }
  selectedAcademicYear(academicYearId) {
    this.staffForm.get('examId').setValue(0);
    this.searchExams = [];
    this.examsList = [];
    this.searchExams = [];
    this.examsLists = [];
    this.examData = [];
    this.examsLists = this.CollegesListDetails.filter(x => (x.fk_course_id == this.staffForm.value.courseId && x.fk_academic_year_id == this.staffForm.value.academicYearId))
    if (this.examsLists.length > 0) {
      const examsLists = this.examsLists.map(({ fk_exam_id }) => fk_exam_id);
      this.examsList = this.examsLists.filter(({ fk_exam_id }, index) => !examsLists.includes(fk_exam_id, index + 1));
      this.examsList = this.examsList.filter(x => !x.is_internal_exam)
      this.examData = this.examsList;
    }
    if (this.examsList.length > 0) {
      this.staffForm.get('examId').setValue(this.examsList[0].fk_exam_id);
      this.selectedExam(this.examsList[0].fk_exam_id)
    }
  }
  searchExam(value) {
    this.examData = [];
    this.examSearch(value);
  }
  examSearch(value: string) {
    let filter = value.toLowerCase()
    for (let i = 0; i < this.examsList.length; i++) {
      let option = this.examsList[i];
      if (option.exam_name.toLowerCase().indexOf(filter) >= 0) {
        this.examData.push(option);
      }
    }
  }
  selectedExam(examId): void {
    this.univExamCenters = [];
    this.examSeatStatuses = [];
    this.buildings = [];
    this.examCenterRoomsList = [];
    this.collegeId = this.examsList.filter(x => (x.fk_exam_id == this.staffForm.value.examId))[0]?.fk_college_id
    this.examTimetableId = this.examsList.filter(x => (x.fk_exam_id == this.staffForm.value.examId))[0]?.fk_exam_timetable_id
    /*---------- GET EXAM CENTERS --------------*/
    this.crudService.listDetailsById(this.UnivExamCentersUrl, 'true', this.isActive)
      .subscribe(result => {
        if (result.statusCode === 200) {
          if (result.data.resultList && result.data.resultList !== '') {
            this.univExamCenters = result.data.resultList;
            if (this.univExamCenters.length > 0) {
              this.staffForm.get('univExamcenterId').setValue(this.univExamCenters[0].univExamcenterId);
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
    /*---------- GET SEAT STATUS --------------*/
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
    /*---------- GET BUILDINGS --------------*/
    this.crudService.listDetailsById(this.buildingCrudUrl, 'true', this.isActive)
      .subscribe(result => {
        this.spinner.hide();
        if (result.statusCode === 200) {
          if (result.data.resultList && result.data.resultList !== '') {
            this.buildings = result.data.resultList;
            if (this.buildings.length > 0) {
              this.staffForm.get('buildingId').setValue(this.buildings[0].buildingId);
              this.SelectedBuilding(this.staffForm.value.buildingId)
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
  /*--------- GET Blocks ----------*/
  SelectedBuilding(buildingId): void {
    this.examCenterName = this.univExamCenters.filter(x => (x.univExamcenterId == this.staffForm.value.univExamcenterId))[0]?.examcenterName;
    this.Logo = this.univExamCenters.filter(x => (x.univExamcenterId == this.staffForm.value.univExamcenterId))[0]?.universityLogoFileName
    this.buildingName = this.buildings.filter(x => (x.buildingId == this.staffForm.value.buildingId))[0]?.buildingCode
    if (buildingId !== null && buildingId !== undefined) {
      this.blocks = [];
      this.floors = [];
      this.examCenterRoomsList = [];
      this.staffForm.get('floorId').setValue('');
      this.staffForm.get('blockId').setValue('');
      this.crudService.listDetailsByTwoIds(this.blockCrudUrl, buildingId, 'true', this.getDetailsByBuildingIdUrl, this.isActive)
        .subscribe(result => {
          this.spinner.hide();
          if (result.statusCode === 200) {
            if (result.data.resultList && result.data.resultList !== '') {
              this.blocks = result.data.resultList;
              if (this.blocks.length > 0) {
                this.staffForm.get('blockId').setValue(this.blocks[0].blockId);
                this.SelectedBlock(this.staffForm.value.blockId)
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

  /*--------- GET Floors ----------*/
  // tslint:disable-next-line:typedef
  SelectedBlock(blockId) {
    this.block = this.blocks.filter(x => (x.blockId == this.staffForm.value.blockId))[0]?.blockCode
    this.staffForm.get('floorId').setValue('');
    this.floors = [];
    this.examCenterRoomsList = [];
    if (blockId !== null && blockId !== undefined) {
      this.crudService.listDetailsByTwoIds(this.floorCrudUrl, blockId, 'true', this.getDetailsByBlockIdUrl, this.isActive)
        .subscribe(result => {
          this.spinner.hide();
          if (result.statusCode === 200) {
            if (result.data && result.data !== '') {
              this.floors = result.data.resultList;
              if (this.floors.length > 0) {
                this.staffForm.get('floorId').setValue(this.floors[0].floorId);
                this.floor = this.floors.filter(x => (x.floorId == this.staffForm.value.floorId))[0]?.floorNo
                this.floorName = this.floors.filter(x => (x.floorId == this.staffForm.value.floorId))[0]?.floorName
                this.SelectedFloor(this.staffForm.value.floorId)
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
  SelectedFloor(floorId) {
    this.vacancyRoomList = []
    this.examCenterRoomsList = []
  }
  getExamCenterRooms() {
    this.spinner.show();
    this.examCenterRoomsList = []
    this.crudService.listDetailsByFourIds(this.UnivExamCenterRoomsUrl, this.staffForm.value.examId, this.staffForm.value.univExamcenterId, this.staffForm.value.buildingId, 'true', 'examMaster.examId', 'univExamcenters.univExamcenterId', 'building.buildingId', this.isActive)
      .subscribe(result => {
        this.spinner.hide();
        if (result.statusCode === 200) {
          if (result.data.resultList && result.data.resultList !== '') {
            this.examCenterRoomsList = result.data.resultList;
            this.dataSource = new MatTableDataSource(this.examCenterRoomsList);
            this.dataSource.paginator = this.paginator;
            this.dataSource.sort = this.sort;
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
  getList() {
    this.selectedRooms = []
    this.getExamCenterRooms();
  }
  // tslint:disable-next-line:typedef
  isEmptyObject(obj) {
    return (obj && (Object.keys(obj).length === 0));
  }
  // tslint:disable-next-line:typedef
  applyFilter(filterValue: string) {
    this.dataSource.filter = filterValue.trim().toLowerCase();
    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
  }
  exportAsExcel() {
    const ws: XLSX.WorkSheet = XLSX.utils.table_to_sheet(this.excelTable.nativeElement);
    const wb: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');

    /* save to file */
    XLSX.writeFile(wb, 'Exam Center Students Report.xlsx');

  }
  printPage() {
    window.print()
  }
}
