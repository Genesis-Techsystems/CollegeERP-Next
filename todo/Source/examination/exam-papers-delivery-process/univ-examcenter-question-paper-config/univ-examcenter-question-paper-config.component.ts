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
import { ConfigModalComponent } from './config-modal/config-modal.component';
@Component({
  selector: 'app-univ-examcenter-question-paper-config',
  templateUrl: './univ-examcenter-question-paper-config.component.html',
  styleUrls: ['./univ-examcenter-question-paper-config.component.scss']
})
export class UnivExamcenterQuestionPaperConfigComponent implements OnInit {

  displayedColumns: string[] = ['id', 'centerCode', 'systemIpAddress', 'macAddress', 'isActive',  'actions'];
  dataSource: MatTableDataSource<any>;
  // matColumns: string[] = ['orgCode', 'campusCode', 'campusName', 'districtName'];

  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild(MatSort) sort: MatSort;

  private UnivEcQuestionPaperConfigUrl = CONSTANTS.UnivEcQuestionPaperConfigUrl;

  questionPaperConfigList= [];
  campus: any = {};

constructor(private dialog: MatDialog, private snotifyService: SnotifyService, private genericFunctions: GenericFunctions,
          private crudService: CrudService, private spinner: NgxSpinnerService, public router: Router) {

         
         this.getQuestionPaperConfig();
}

// tslint:disable-next-line:typedef
ngOnInit() {
  this.dataSource = new MatTableDataSource(this.questionPaperConfigList); 
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
  this.questionPaperConfigList.map(x => ({
      orgCode: x.orgCode,
      campusCode: x.campusCode,
      campusName: x.campusName,
      districtName: x.districtName,
  }));
  // TableUtil.exportArrayToExcel(onlyNameAndSymbolArr, 'ExampleArray');
}

/*--------- GET CAMPUSES ----------*/
getQuestionPaperConfig(): void{
  this.spinner.show();          
  this.crudService.listAllDetails(this.UnivEcQuestionPaperConfigUrl)
  .subscribe(result => {
     this.spinner.hide();
     if (result.statusCode === 200){
          if (result.data.resultList && result.data.resultList !== '') {
              this.questionPaperConfigList = result.data.resultList;
              this.dataSource = new MatTableDataSource(this.questionPaperConfigList);
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
  const dialogRef = this.dialog.open(ConfigModalComponent, {
      width: '750px',
      data: {}
  });

  dialogRef.afterClosed().subscribe(details => {
      if (details != null && details !== ''){
          this.spinner.show();

          /*---------- ADD CAMPUS ----------*/
          this.crudService.addDetails(this.UnivEcQuestionPaperConfigUrl, details)
              .subscribe(result => {
                  this.spinner.hide();
                  if (result.statusCode === 200){
                      if (result.data && result.data !== '') {
                          this.snotifyService.success(result.message, 'Success!');
                          this.getQuestionPaperConfig();
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
  this.campus = data;
  const dialogRef = this.dialog.open(ConfigModalComponent, {
  width: '750px',
  data: this.campus
  });

  dialogRef.afterClosed().subscribe(details => {
      if (details != null && details !== ''){
          details.univEcQuestionPaperConfigId = data.univEcQuestionPaperConfigId;
          this.updateCampus(details);
          console.log(details);
          
      }
  });
}

/*------------ UPDATE CAMPUS -----------*/
updateCampus(details): void{
      this.spinner.show();
      this.crudService.updateDetailsById(this.UnivEcQuestionPaperConfigUrl, details, details.univEcQuestionPaperConfigId, 'univEcQuestionPaperConfigId')
      .subscribe(result => {
          this.spinner.hide();
          if (result.statusCode === 200){
              if (result.data && result.data !== '') {
                  this.snotifyService.success(result.message, 'Success!');
                  this.getQuestionPaperConfig();
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
