import { Component, Inject, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { Router } from '@angular/router';
import { CONSTANTS } from 'app/main/common/constants';
import { GenericFunctions } from 'app/main/common/generic-functions';
import { Block } from 'app/main/models/block';
import { Building } from 'app/main/models/building';
import { College } from 'app/main/models/college';
import { Course } from 'app/main/models/course';
import { CourseGroup } from 'app/main/models/courseGroup';
import { CourseYear } from 'app/main/models/courseYearRegulation';
import { ExamMaster } from 'app/main/models/examMaster';
import { Floors } from 'app/main/models/floors';
import { GeneralDetail } from 'app/main/models/generalDetail';
import { Room } from 'app/main/models/room';
import { CrudService } from 'app/main/services/crud.service';
import { SnotifyService } from 'ng-snotify';
import { NgxSpinnerService } from 'ngx-spinner';
import { ReplaySubject, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-invigilator-allotment-modal',
  templateUrl: './invigilator-allotment-modal.component.html',
  styleUrls: ['./invigilator-allotment-modal.component.scss']
})
export class InvigilatorAllotmentModalComponent implements OnInit {




  // colors: any[] = [
  //   {}
  // ];

  displayedColumns: string[] = ['id', 'invigilatorEmpName', 'invgdesignationCatCode', 'isActive', 'actions'];
  dataSource: MatTableDataSource<any>;

  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild(MatSort) sort: MatSort;
  panelOpenState = true;


  private isActive = CONSTANTS.isActive;

  private employeeSearchUrl = CONSTANTS.employeeSearchUrl;
  private generalDetailsUrl = CONSTANTS.generalDetailsUrl;
  private generalDetailsByCodeUrl = CONSTANTS.generalDetailsByCodeUrl;
  private invlatrDisgTypesUrl = CONSTANTS.invlatrDisgTypesUrl;
  private examinvigilationallotmentUrl = CONSTANTS.examinvigilationallotmentUrl;
  private buildingCrudUrl = CONSTANTS.buildingCrudUrl;
  private blockCrudUrl = CONSTANTS.blockCrudUrl;
  private getDetailsByBuildingIdUrl = CONSTANTS.getDetailsByBuildingIdUrl;
  private floorCrudUrl = CONSTANTS.floorCrudUrl;
  private getDetailsByBlockIdUrl = CONSTANTS.getDetailsByBlockIdUrl;
  private buildingdetailsSearchurl = CONSTANTS.buildingdetailsSearchurl;



  private _onDestroy = new Subject<void>();
  public employeeFilterCtrl: FormControl = new FormControl();
  public employeeSingleCtrl: FormControl = new FormControl();
  public filteredEmployees: ReplaySubject<any[]> = new ReplaySubject<any[]>(1);

  public roomFilterCtrl: FormControl = new FormControl();
  public filteredRooms: ReplaySubject<any[]> = new ReplaySubject<any[]>(1);




  staffForm: FormGroup;
  invStaffForm: FormGroup;
  colleges: College[] = [];
  examTimetables: any[] = [];
  courses: Course[] = [];
  examMasterList: ExamMaster[] = [];
  courseGroups: CourseGroup[] = [];
  courseYears: CourseYear[] = [];
  rooms: Room[] = [];



  examInvigilationAllotmentsList: any[] = [];
  searchEmployees: any[] = [];
  invigilatorDisg: GeneralDetail[] = [];
  step = 0;
  orgId: number;
  detailsList = [];
  exam: any = {};
  settingValues: any = [];
  searchRooms = [];
  selectedRoom = [];
  check = 1;
  roomName;
  buildings: Building[] = [];
  blocks: Block[] = [];
  floors: Floors[] = [];
  flag = 'newRoom';
  indexValue;
  examInvgAllotmentId = null;

  constructor(private formBuilder: FormBuilder, private snotifyService: SnotifyService,
              private crudService: CrudService, private spinner: NgxSpinnerService, private router: Router,
              private dialog: MatDialog, private genericFunctions: GenericFunctions, private dialogRef: MatDialogRef<any>,
              @Inject(MAT_DIALOG_DATA) public data) {
    this.orgId = +localStorage.getItem('organizationId');

  }

  // tslint:disable-next-line:typedef
  ngOnInit() {
    this.invStaffForm = this.formBuilder.group({
      invgdesignationCatId: ['', Validators.required],
      invigilatorEmpId: ['', Validators.required],
      isActive: [true],
      buildingId: [''],
      courseId: [''],
      floorId: [''],
      roomId: [''],
      blockId: [''],
    });
    if (!this.isEmptyObject(this.data)) {
      this.invStaffForm.get('roomId').setValue(this.data.roomId);
      if (this.data.dataDetails === 'oldRoom') {
        this.flag = 'oldRoom';
        this.examInvigilationAllotmentsList = this.data.examInvigilationAllotmentsList;
        if (this.examInvigilationAllotmentsList.length > 0) {
          // tslint:disable-next-line: prefer-for-of
          for (let i = 0; i < this.examInvigilationAllotmentsList.length; i++){
            this.examInvigilationAllotmentsList[i].dataDetails = 'oldRoom';
          }
        }
        

        this.dataSource = new MatTableDataSource<any>(this.examInvigilationAllotmentsList);
      }
      else {
        if (this.data.dataDetails === 'newRoom') {
          this.SelectedCampuses();
          this.examInvigilationAllotmentsList = [];
          this.dataSource = new MatTableDataSource<any>(this.examInvigilationAllotmentsList);
         
         
        }
      }
    }
    this.searchEmployees.push({ firstName: 'Search by Employee name or Id.' });
    this.filteredEmployees.next(this.searchEmployees.slice());

    this.searchRooms.push({ roomName: 'Search by Room name or Number.' });
    this.filteredRooms.next(this.searchRooms.slice());


    this.employeeFilterCtrl.valueChanges
      .pipe(takeUntil(this._onDestroy))
      .subscribe(() => {
        this.filterEmp();
      });

    // this.roomFilterCtrl.valueChanges
    // .pipe(takeUntil(this._onDestroy))
    // .subscribe(() => {
    //   this.filterStd();
    // });

  }

  // tslint:disable-next-line: typedef
  OnDestroy() {
    this._onDestroy.next();
    this._onDestroy.complete();
  }

  // tslint:disable-next-line:typedef
  isEmptyObject(obj) {
    return (obj && (Object.keys(obj).length === 0));
  }




  filterStd(): void {
    if (!this.searchRooms) {
      return;
    }
    // get the search keyword
    let search = this.roomFilterCtrl.value;
    if (!search) {
      this.filteredRooms.next(this.searchRooms.slice());
      return;
    } else {
      search = search.toLowerCase();
    }
    // filter the banks
    this.filteredRooms.next(
      this.searchRooms.filter(x => x.firstName.toLowerCase().indexOf(search) > -1)
    );
  }



  filterEmp(): void {
    if (!this.searchEmployees) {
      return;
    }
    // get the search keyword
    let search = this.employeeFilterCtrl.value;
    if (!search) {
      this.filteredEmployees.next(this.searchEmployees.slice());
      return;
    } else {
      search = search.toLowerCase();
    }
    // filter the banks
    this.filteredEmployees.next(
      this.searchEmployees.filter(x => x.firstName.toLowerCase().indexOf(search) > -1)
    );
  }


  /*--------- GET BUILDING ----------*/
  SelectedCampuses(): void {
    this.invStaffForm.get('buildingId').setValue('');
    this.invStaffForm.get('blockId').setValue('');
    this.invStaffForm.get('floorId').setValue('');
    this.invStaffForm.get('roomId').setValue('');
    this.spinner.show();
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


  /*--------- GET Blocks ----------*/
  SelectedBuilding(buildingId): void {
    if (buildingId !== null && buildingId !== undefined) {
      this.blocks = [];
      this.floors = [];
      this.rooms = [];
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
    this.floors = [];
    this.rooms = [];
    this.examInvigilationAllotmentsList = [];
    this.dataSource = new MatTableDataSource<any>(this.examInvigilationAllotmentsList);
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



  enteredRoom(event): void {
    if (event.target.value.length > 2) {
      /*----------- STUDENTS -----------*/
      this.crudService.listByFourIds(this.buildingdetailsSearchurl, event.target.value, this.invStaffForm.value.buildingId,
        this.invStaffForm.value.blockId, this.invStaffForm.value.floorId, 'q', 'buildingId', 'blockId', 'floorId')
        .subscribe(result => {
          if (result.statusCode === 200) {
            if (result.data && result.data !== '') {
              this.searchRooms = result.data;
              this.filteredRooms.next(this.searchRooms.slice());
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
    // else{
    //   this.snotifyService.info(' Please search room after selecting the exam timetabel', 'info');
    // }
  }


  enteredEmployee(event): void {
    if (event.target.value.length > 4) {
      /*----------- EMPLOYEE -----------*/
      this.crudService.listByTwoIds(this.employeeSearchUrl, event.target.value, 'ACTV', 'q', 'empStatus')
        .subscribe(result => {
          if (result.statusCode === 200) {
            if (result.data && result.data !== '') {
              let j =0;
              for(let i =0; i<result.data.length;i++){
                if(this.data.collegeId == result.data[i].collegeId){
                  this.searchEmployees[j] = result.data[i];
                  j++;
                }
              }
              this.filteredEmployees.next(this.searchEmployees.slice());
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

  selectedEmp(): void {
    if (this.employeeSingleCtrl.value !== undefined && this.employeeSingleCtrl.value !== '' &&  this.employeeSingleCtrl.value !== null) {
      this.crudService.listDetailsByTwoIds(this.generalDetailsUrl, this.invlatrDisgTypesUrl, 'true', this.generalDetailsByCodeUrl, this.isActive)
        .subscribe(result => {
          if (result.statusCode === 200) {
            if (result.data.resultList && result.data.resultList !== '') {
              this.invigilatorDisg = result.data.resultList;
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

  addDetails(): void {
    this.invStaffForm.get('invigilatorEmpId').setValue(this.employeeSingleCtrl.value);
    if (this.invStaffForm.valid && this.flag === 'newRoom') {
      this.detailsList.push({
        invigilatorEmpId: this.invStaffForm.value.invigilatorEmpId,
        examTimeTableId: this.data.examTimeTableId,
        collegeId: this.data.collegeId,
        roomId: this.invStaffForm.value.roomId,
        invgdesignationCatId: this.invStaffForm.value.invgdesignationCatId,
        invigilatorEmpName: this.searchEmployees.filter(x => (x.employeeId === this.invStaffForm.value.invigilatorEmpId))[0].firstName,
        invigilatorEmpNumber: this.searchEmployees.filter(x => (x.employeeId === this.invStaffForm.value.invigilatorEmpId))[0].empNumber,
        invgdesignationCatCode: this.invigilatorDisg.filter(x => (x.generalDetailId === this.invStaffForm.value.invgdesignationCatId))[0].generalDetailCode,
        isActive: this.invStaffForm.value.isActive,
      });
      if (this.detailsList.length > 0) {
        if ( this.examInvigilationAllotmentsList.filter(x => (x.invigilatorEmpId === this.detailsList[0].invigilatorEmpId)).length === 0){
        this.examInvigilationAllotmentsList.push(this.detailsList[0]);
        
        this.dataSource = new MatTableDataSource<any>(this.examInvigilationAllotmentsList);
        this.clear();
      }
      else{
        this.snotifyService.info('Same employee already allocated to the same day', 'info');
      }
    }
    }
    else
    if (this.flag === 'oldRoom'){
      if ( this.examInvigilationAllotmentsList.filter(x => (x.invigilatorEmpId === this.invStaffForm.value.invigilatorEmpId)).length === 0){
        this.examInvigilationAllotmentsList.push({
          invigilatorEmpId: this.invStaffForm.value.invigilatorEmpId,
          examTimeTableId: this.data.examTimetableId,
          collegeId: this.data.collegeId,
          roomId: this.data.roomId,
          invgdesignationCatId: this.invStaffForm.value.invgdesignationCatId,
          invigilatorEmpName: this.searchEmployees.filter(x => (x.employeeId === this.invStaffForm.value.invigilatorEmpId))[0].firstName,
          invigilatorEmpNumber: this.searchEmployees.filter(x => (x.employeeId === this.invStaffForm.value.invigilatorEmpId))[0].empNumber,
          invgdesignationCatCode: this.invigilatorDisg.filter(x => (x.generalDetailId === this.invStaffForm.value.invgdesignationCatId))[0].generalDetailCode,
          isActive: this.invStaffForm.value.isActive,
        });
        this.dataSource = new MatTableDataSource<any>(this.examInvigilationAllotmentsList);
        this.clear();

      }
      else
      if (this.examInvgAllotmentId != null) {
        // tslint:disable-next-line: prefer-for-of
        for (let i = 0; i < this.examInvigilationAllotmentsList.length; i++){
             if (this.examInvigilationAllotmentsList[i].examInvgAllotmentId === this.examInvgAllotmentId){
                this.examInvigilationAllotmentsList[i].isActive = this.invStaffForm.value.isActive;
                this.examInvigilationAllotmentsList[i].invigilatorEmpId = this.invStaffForm.value.invigilatorEmpId;
                this.examInvigilationAllotmentsList[i].invgdesignationCatId = this.invStaffForm.value.invgdesignationCatId;
             }
        }
        this.clear();
        //  if (this.examInvigilationAllotmentsList.filter(x => (x.examInvgAllotmentId = 6)).length > 0){
        //    console.log('came');
        //     this.examInvigilationAllotmentsList.filter(x => (x.examInvgAllotmentId = 6))[0].isActive = this.invStaffForm.value.isActive;
        //     this.examInvigilationAllotmentsList.filter(x => (x.examInvgAllotmentId = 6))[0].invigilatorEmpId = this.invStaffForm.value.invigilatorEmpId;
        //     // tslint:disable-next-line:max-line-length
        //     this.examInvigilationAllotmentsList.filter(x => (x.examInvgAllotmentId = 6))[0].invgdesignationCatId = this.invStaffForm.value.invgdesignationCatId;
           
        //  }
      }
      else{
        this.snotifyService.info('Same employee already allocated to the same day', 'info');
      }
      // this.detailsList.push({
      //   invigilatorEmpId: this.invStaffForm.value.invigilatorEmpId,
      //   examTimeTableId: this.data.examTimetableId,
      //   collegeId: this.data.collegeId,
      //   roomId: this.data.roomId,
      //   invgdesignationCatId: this.invStaffForm.value.invgdesignationCatId,
      //   invigilatorEmpName: this.searchEmployees.filter(x => (x.employeeId === this.invStaffForm.value.invigilatorEmpId))[0].firstName,
      //   invigilatorEmpNumber: this.searchEmployees.filter(x => (x.employeeId === this.invStaffForm.value.invigilatorEmpId))[0].empNumber,
      //   invgdesignationCatCode: this.invigilatorDisg.filter(x => (x.generalDetailId === this.invStaffForm.value.invgdesignationCatId))[0].generalDetailCode,
      //   isActive: this.invStaffForm.value.isActive,
      // });

    //   if (this.detailsList.length > 0) {
    //     if ( this.examInvigilationAllotmentsList.filter(x => (x.invigilatorEmpId === this.detailsList[0].invigilatorEmpId)).length === 0){
    //     this.examInvigilationAllotmentsList.push(this.detailsList[0]);
        
    //     this.dataSource = new MatTableDataSource<any>(this.examInvigilationAllotmentsList);
    //     this.clear();
    //   }
    //   else{
    //     this.snotifyService.info('Same employee already allocated to the same day', 'info');
    //   }
    // }
    }

    this.examInvgAllotmentId = null;
  }

  clear(): void {
    this.detailsList = [];
    this.searchEmployees = [];
    this.invStaffForm.get('invgdesignationCatId').setValue('');
    this.invStaffForm.get('isActive').setValue(true);
    this.searchEmployees.push({ firstName: 'Search by Employee name or Id.' });
    this.filteredEmployees.next(this.searchEmployees.slice());
  }


  deleteInvigilator(item, index): void {
    if (index > - 1) {
      if (item.examInvgAllotmentId) {
        item.isActive = false;
        this.examInvigilationAllotmentsList.splice(index, 1);
        this.examInvigilationAllotmentsList.push(item);
      }
      else {
        this.examInvigilationAllotmentsList.splice(index, 1);
      }
    }
    this.dataSource = new MatTableDataSource(this.examInvigilationAllotmentsList);
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;

  }

  editEmployee(data, i): void{
    this.flag = 'oldRoom';
    this.indexValue = i;
    const event = {
      target: {
          value: data.invigilatorEmpNumber
      }
  };
    if (data.examInvgAllotmentId){
    this.examInvgAllotmentId = data.examInvgAllotmentId;
  }
    this.enteredEmployee(event);
    this.employeeSingleCtrl.setValue(data.invigilatorEmpId);
    this.selectedEmp();
    this.invStaffForm.get('invgdesignationCatId').setValue(data.invgdesignationCatId);
    this.invStaffForm.get('isActive').setValue(data.isActive);
  }

  submit(): void {
    if (this.examInvigilationAllotmentsList.length > 0){
   this.dialogRef.close(this.examInvigilationAllotmentsList);
  }
  else{
    this.snotifyService.info('No staff allocated to room', 'info');
  }
  }

}

