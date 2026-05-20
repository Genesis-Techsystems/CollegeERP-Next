import {Component, OnInit, ViewChild, ViewEncapsulation} from '@angular/core';
import { SnotifyService } from 'ng-snotify';
import { NgxSpinnerService } from 'ngx-spinner';
import { Router } from '@angular/router';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatDialog } from '@angular/material/dialog';
import { fuseAnimations } from '@fuse/animations';
import { CONSTANTS } from 'app/main/common/constants';
import { CrudService } from 'app/main/services/crud.service';
import { GenericFunctions } from 'app/main/common/generic-functions';
import { ExamBagTrasportationModalComponent } from './exam-bag-trasportation-modal/exam-bag-trasportation-modal.component';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
@Component({
  selector: 'app-univ-exam-bag-transportation',
  templateUrl: './univ-exam-bag-transportation.component.html',
  styleUrls: ['./univ-exam-bag-transportation.component.scss']
})
export class UnivExamBagTransportationComponent implements OnInit {
  displayedColumns: string[] = ['id', 'vehicleNumber', 'vehicleDetails', 'driverName','driverPhoneNumber','receiveDate','dispatchDate', 'isActive',  'actions'];
  dataSource: MatTableDataSource<any>;
  // matColumns: string[] = ['orgCode', 'campusCode', 'campusName', 'districtName'];

  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild(MatSort) sort: MatSort;

  private UnivExamBagTransportationUrl = CONSTANTS.UnivExamBagTransportationUrl;
  private UnivExamCentersUrl = CONSTANTS.UnivExamCentersUrl;
  private UnivExamRegionalCentersUrl = CONSTANTS.UnivExamRegionalCentersUrl;
  private UnivExamBagsUrl = CONSTANTS.UnivExamBagsUrl;
  private isActive = CONSTANTS.isActive;
    univExamRegionalCenters=[];
    UnivExamBags=[];
  examBagTransportationList= [];
    univExamCenters=[];
    transportationForm: FormGroup;
    examCenterName: any;
    regionalcenterName: any;
    examAnswerpaperBagName: any;
    panelOpenState = true;
    step = 0;
    flag: boolean=false;

constructor(private dialog: MatDialog, private snotifyService: SnotifyService,private formBuilder: FormBuilder, private genericFunctions: GenericFunctions,
          private crudService: CrudService, private spinner: NgxSpinnerService, public router: Router) {

            this.getData();
}

// tslint:disable-next-line:typedef
ngOnInit() {
    this.transportationForm = this.formBuilder.group({
        univExamReionalCenterId: ['', Validators.required],
          univExamcenterId: ['', Validators.required],
          univExamBagId: ['', Validators.required],
      });
  this.dataSource = new MatTableDataSource(this.examBagTransportationList); 
  this.dataSource.paginator = this.paginator;
  this.dataSource.sort = this.sort;
}

// tslint:disable-next-line: typedef
dashboardUrl(){
   this.genericFunctions.dashboardHome(localStorage.getItem('userTypeCode'));
}

// tslint:disable-next-line: typedef
exportTable() {
 // TableUtil.exportTableToExcel('ExampleMaterialTable');
}

exportArray(): void {
  const onlyNameAndSymbolArr: Partial<any>[] =
  this.examBagTransportationList.map(x => ({
      orgCode: x.orgCode,
      campusCode: x.campusCode,
      campusName: x.campusName,
      districtName: x.districtName,
  }));
  // TableUtil.exportArrayToExcel(onlyNameAndSymbolArr, 'ExampleArray');
}

/*--------- GET CAMPUSES ----------*/

getData(): void {
    this.examBagTransportationList=[]
    this.univExamRegionalCenters=[]
    this.univExamCenters=[]
    this.UnivExamBags=[]
    /*---------- GET ORGANIZATIONS --------------*/
    this.crudService.listDetailsById(this.UnivExamRegionalCentersUrl, 'true', this.isActive )
    .subscribe(result => {
        if (result.statusCode === 200) {
            if (result.data.resultList && result.data.resultList !== '') {
                this.univExamRegionalCenters = result.data.resultList;
                if (this.univExamRegionalCenters.length > 0) {
                    this.transportationForm.get('univExamReionalCenterId').setValue(this.univExamRegionalCenters[0].univExamReionalCenterId);
                  }
            } else {
                this.snotifyService.success(result.message, 'Success!');
            }
        } else {
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

    this.crudService.listDetailsById(this.UnivExamCentersUrl, 'true', this.isActive )
        .subscribe(result => {
            if (result.statusCode === 200) {
                if (result.data.resultList && result.data.resultList !== '') {
                    this.univExamCenters = result.data.resultList;
                    if (this.univExamCenters.length > 0) {
                        this.transportationForm.get('univExamcenterId').setValue(this.univExamCenters[0].univExamcenterId);
                      }
                } else {
                    this.snotifyService.success(result.message, 'Success!');
                }
            } else {
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

        this.crudService.listDetailsById(this.UnivExamBagsUrl, 'true', this.isActive )
        .subscribe(result => {
            if (result.statusCode === 200) {
                if (result.data.resultList && result.data.resultList !== '') {
                    this.UnivExamBags = result.data.resultList;
                    if (this.UnivExamBags.length > 0) {
                        this.transportationForm.get('univExamBagId').setValue(this.UnivExamBags[0].univExamBagId);
                      }
                } else {
                    this.snotifyService.success(result.message, 'Success!');
                }
            } else {
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

      headerData(){
        this.regionalcenterName = this.univExamRegionalCenters.filter(x => (x.univExamReionalCenterId == this.transportationForm.value.univExamReionalCenterId))[0]?.examReionalCenterCode
        this.examCenterName =  this.univExamCenters.filter(x=>(x.univExamcenterId ==this.transportationForm.value.univExamcenterId))[0]?.examcenterName
        this.examAnswerpaperBagName = this.UnivExamBags.filter(x => (x.univExamBagId == this.transportationForm.value.univExamBagId))[0]?.bagSerialNo
      }

getExamBagTransportation(): void{
    this.headerData();
    this.examBagTransportationList=[]
    this.flag=true
  this.spinner.show();    
  this.crudService.listDetailsByFourIds(this.UnivExamBagTransportationUrl,this.transportationForm.value.univExamReionalCenterId,this.transportationForm.value.univExamcenterId,this.transportationForm.value.univExamBagId ,'true','examRegionalCenters.univExamReionalCenterId','univExamCenters.univExamcenterId','univExamBags.univExamBagId',this.isActive )
//   this.crudService.listAllDetails(this.UnivExamBagTransportationUrl)
  .subscribe(result => {
     this.spinner.hide();
     if (result.statusCode === 200){
          if (result.data.resultList && result.data.resultList !== '') {
              this.examBagTransportationList = result.data.resultList;
              this.dataSource = new MatTableDataSource(this.examBagTransportationList);
              this.dataSource.paginator = this.paginator;
              this.dataSource.sort = this.sort;
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
  applyFilter(filterValue: string) {
  this.dataSource.filter = filterValue.trim().toLowerCase();

  if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
  }
}

openDialog(): void {
    const data =  this.transportationForm.value;
  data.type = 'new'
  const dialogRef = this.dialog.open(ExamBagTrasportationModalComponent, {
      width: '900px',
      data: data
  });

  dialogRef.afterClosed().subscribe(details => {
      if (details != null && details !== ''){
          this.spinner.show();

          /*---------- ADD CAMPUS ----------*/
          this.crudService.addDetails(this.UnivExamBagTransportationUrl, details)
              .subscribe(result => {
                  this.spinner.hide();
                  if (result.statusCode === 200){
                      if (result.data && result.data !== '') {
                          this.snotifyService.success(result.message, 'Success!');
                          this.getExamBagTransportation();
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
  });
}

/*---------- EDIT CAMPUS -----------*/
editDialog(data): void {
  const dialogRef = this.dialog.open(ExamBagTrasportationModalComponent, {
  width: '900px',
  data: data
  });

  dialogRef.afterClosed().subscribe(details => {
      if (details != null && details !== ''){
          details.univExamBagTransportationId = data.univExamBagTransportationId;
          this.updateExamBagTransportation(details);
          console.log(details);
          
      }
  });
}

/*------------ UPDATE CAMPUS -----------*/
updateExamBagTransportation(details): void{
      this.spinner.show();
      this.crudService.updateDetailsById(this.UnivExamBagTransportationUrl, details, details.univEcQuestionPaperConfigId, 'univEcQuestionPaperConfigId')
      .subscribe(result => {
          this.spinner.hide();
          if (result.statusCode === 200){
              if (result.data && result.data !== '') {
                  this.snotifyService.success(result.message, 'Success!');
                  this.getExamBagTransportation();
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

