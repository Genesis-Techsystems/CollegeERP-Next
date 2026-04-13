import { Component, OnInit, Inject } from '@angular/core';
import { FormGroup, FormBuilder, Validators, FormControl } from '@angular/forms';
import { Organization } from 'app/main/models/organization';
import { Country } from 'app/main/models/country';
import { State } from 'app/main/models/state';
import { District } from 'app/main/models/district';
import { CONSTANTS } from 'app/main/common/constants';
import { GenericFunctions } from 'app/main/common/generic-functions';
import { SnotifyService } from 'ng-snotify';
import { CrudService } from 'app/main/services/crud.service';
import { Router } from '@angular/router';
import { Subject, ReplaySubject } from 'rxjs';
import { GeneralDetail } from 'app/main/models/generalDetail';
import { NgxSpinnerService } from 'ngx-spinner';
import { takeUntil } from 'rxjs/operators';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

@Component({
  selector: 'app-allocate-room-modal',
  templateUrl: './allocate-room-modal.component.html',
  styleUrls: ['./allocate-room-modal.component.scss']
})
export class AllocateRoomModalComponent implements OnInit {


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


  invStaffForm: FormGroup;
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
  
  flag = 'newRoom';
  indexValue;

  constructor(private formBuilder: FormBuilder, private snotifyService: SnotifyService,
              private crudService: CrudService, private spinner: NgxSpinnerService, private router: Router,
              private dialog: MatDialog, private genericFunctions: GenericFunctions, private dialogRef: MatDialogRef<any>,
              @Inject(MAT_DIALOG_DATA) public data) {
    this.orgId = +localStorage.getItem('organizationId');

  }

  // tslint:disable-next-line:typedef
  ngOnInit() {
    this.invStaffForm = this.formBuilder.group({
      invigilatorEmpId: ['', Validators.required],
      invgdesignationCatId: ['', Validators.required],
      isActive: [true],    
    });  
    this.searchEmployees.push({ firstName: 'Search by Employee name or Id.' });
    this.filteredEmployees.next(this.searchEmployees.slice());

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

     /*----------- INVIGILATOR DESGNINATION -----------*/
     this.crudService.listDetailsByTwoIds(this.generalDetailsUrl, this.invlatrDisgTypesUrl , 'true', this.generalDetailsByCodeUrl, this.isActive)
     .subscribe(result => {
         if (result.statusCode === 200){
                   if (result.data.resultList && result.data.resultList !== '') {
                       this.invigilatorDisg = result.data.resultList;
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

  // tslint:disable-next-line: typedef
  OnDestroy() {
    this._onDestroy.next();
    this._onDestroy.complete();
  }

  // tslint:disable-next-line:typedef
  isEmptyObject(obj) {
    return (obj && (Object.keys(obj).length === 0));
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



  // http://localhost:9090/cms/employeesearch?q=VEC-475&empStatus=ACTV

  enteredEmployee(event): void {
    if (event.target.value.length > 4) {
      /*----------- EMPLOYEE -----------*/
      this.crudService.listByTwoIds(this.employeeSearchUrl, event.target.value, 'ACTV', 'q', 'empStatus')
        .subscribe(result => {
          if (result.statusCode === 200) {
            if (result.data && result.data !== '') {
              this.searchEmployees = result.data;
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


  submit(): void {
      this.invStaffForm.get('invigilatorEmpId').setValue(this.employeeSingleCtrl.value);
      const Obj = this.invStaffForm.value;
      if(this.data.observerList.length>0 && this.data.observerList[0].invgdesignationCatId === Obj.invgdesignationCatId){
        this.snotifyService.info('Only one observer can assign.', 'info');
         return;
      }
      
      if (this.invStaffForm.invalid) {
        return;
    } else {
        this.dialogRef.close(Obj);
    }

  }
  

}

