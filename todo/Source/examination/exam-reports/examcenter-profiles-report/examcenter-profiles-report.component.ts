import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { Router } from '@angular/router';
import { CONSTANTS } from 'app/main/common/constants';
import { GenericFunctions } from 'app/main/common/generic-functions';
import { CrudService } from 'app/main/services/crud.service';
import { SnotifyService } from 'ng-snotify';
import { NgxSpinnerService } from 'ngx-spinner';
import * as XLSX from 'xlsx';

@Component({
  selector: 'app-examcenter-profiles-report',
  templateUrl: './examcenter-profiles-report.component.html',
  styleUrls: ['./examcenter-profiles-report.component.scss']
})
export class ExamcenterProfilesReportComponent implements OnInit {

  displayedColumns: string[] = ['id', 'examcenter', 'roleName', 'evaluatorName'];
  dataSource: MatTableDataSource<any>;
  open: boolean;

  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild(MatSort) sort: MatSort;
  @ViewChild('TABLE') excelTable: ElementRef;


  private isActive = CONSTANTS.isActive;
  private UnivExamCentersUrl = CONSTANTS.UnivExamCentersUrl;
  private UnivEcProfilesUrl = CONSTANTS.UnivEcProfilesUrl;
  private ExamEvaluatorsProfileUrl=CONSTANTS.ExamEvaluatorsProfileUrl;
  MINIO = CONSTANTS.MINIO;
  
  panelOpenState = true;
  flag=false
  universites = [];
  subject: any = {};
  examCenterForm: FormGroup;
  step = 0;
  courseGroupList = [];
  universityCode: any;
  collegecode: string;
  mainList = [];
  updateList: any[];
  universitiesList=[];
  collegesList=[];
  examlCenterList: any[];
  evaluatorProfile=[];
  univExamevaluatorProfileList=[];

  roles = [
      { roleId: 64, roleName: 'Evaluator' },
      { roleId: 67, roleName: 'Moderator' },
      { roleId: 70, roleName: 'QuestionPapersetter' },
      { roleId: 96, roleName: 'External Evaluator' },
      { roleId: 97, roleName: 'Internal Evaluator' },
    ];

  rolesData=[];
  examlCenterListData=[];
  selectedCount: number;
  checksubject: any;
  examProfileListdata: any[];
  examcenterCode: any;
  evaluatorProfileList=[];
  roleName: string;
  orgCode;
  Logo:any;

  constructor(private dialog: MatDialog,
      private formBuilder: FormBuilder,
      private snotifyService: SnotifyService,
      private router: Router,
      private crudService: CrudService, private spinner: NgxSpinnerService, private genericFunctions: GenericFunctions) {
      this.getData();
      this.orgCode = localStorage.getItem('orgCode');
  }
  ngOnInit() {
      this.examCenterForm = this.formBuilder.group({
        univExamCentersId: ['', Validators.required],
        profileRoleId: ['', Validators.required],

      });
      this.dataSource = new MatTableDataSource(this.examlCenterList);
      this.dataSource.paginator = this.paginator;
      this.dataSource.sort = this.sort;
  }

  // tslint:disable-next-line:typedef
  applyFilter(filterValue: string) {
      this.dataSource.filter = filterValue.trim().toLowerCase();
      if (this.dataSource.paginator) {
          this.dataSource.paginator.firstPage();
      }
  }

  getData(): void {
    this.examlCenterList =[]
    this.crudService.listDetailsById(this.UnivExamCentersUrl, 'true',  this.isActive)
        .subscribe(result => {
            if (result.statusCode === 200) {
                if (result.data.resultList && result.data.resultList !== '') {
                    this.examlCenterList = result.data.resultList;
                    if(this.examlCenterList && this.examlCenterList.length > 0){
                      this.examlCenterListData = this.examlCenterList;
                      this.examCenterForm.get('univExamCentersId').setValue(this.examlCenterListData[0]?.univExamcenterId);
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
                this.genericFunctions.logOut(this.router.url + '&loadForm=true');
            } else {
                this.snotifyService.error(CONSTANTS.message.CON_ERROR, 'Error!');
            }
        });
  }
  serachExamCenter(value){
    this.examlCenterListData=[]
    this.serachExamCenterData(value)
  }
  
  serachExamCenterData(value: string){
  let filter = value.toLowerCase();
  for ( let i = 0 ; i < this.examlCenterList.length; i++ ) {
      let option = this.examlCenterList[i];
      if (option.examcenterCode.toLowerCase().indexOf(filter) >= 0) {
          this.examlCenterListData.push( option );
      }
  }
  }
  selectedRole() {
    this.examProfileListdata = [];
    this.univExamevaluatorProfileList = [];
    this.flag = false;
  }
  getEvaluationList(){
      this.examProfileListdata = [];
      this.univExamevaluatorProfileList = [];
      this.examcenterCode =  this.examlCenterList.filter(x=>(x.univExamcenterId ==this.examCenterForm.value.univExamCentersId))[0]?.examcenterCode
      this.Logo = this.examlCenterList.filter(x=>(x.univExamcenterId ==this.examCenterForm.value.univExamCentersId))[0]?.universityLogoFileName
      this.roleName =  this.roles.filter(x=>(x.roleId ==this.examCenterForm.value.profileRoleId))[0]?.roleName
      this.flag=false;
      this.spinner.show()
    this.crudService.listDetailsByThreeIds(this.UnivEcProfilesUrl,this.examCenterForm.value.univExamCentersId,this.examCenterForm.value.profileRoleId,'true','univExamCenters.univExamcenterId','profileRole.roleId',this.isActive)
    .subscribe(result => {
        this.spinner.hide();
        if (result.statusCode === 200){
            if (result.data && result.data !== '') {
                this.univExamevaluatorProfileList = result.data.resultList;
                this.dataSource = new MatTableDataSource(this.univExamevaluatorProfileList);
                      this.dataSource.paginator = this.paginator;
                      this.dataSource.sort = this.sort;
                this.flag = true;
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

exportAsExcel() {
  const ws: XLSX.WorkSheet = XLSX.utils.table_to_sheet(this.excelTable.nativeElement);
  const wb: XLSX.WorkBook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
  /* save to file */
  XLSX.writeFile(wb, 'Exam Center Profiles Report.xlsx');

}
printPage() {
  window.print()
}
}
