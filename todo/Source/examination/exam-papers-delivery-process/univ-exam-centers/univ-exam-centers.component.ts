import { Component, Inject, OnInit, ViewChild } from '@angular/core';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialog } from '@angular/material/dialog';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { Router } from '@angular/router';
import { CONSTANTS } from 'app/main/common/constants';
import { GenericFunctions } from 'app/main/common/generic-functions';
import { CrudService } from 'app/main/services/crud.service';
import * as moment from 'moment';
import { SnotifyService } from 'ng-snotify';
import { NgxSpinnerService } from 'ngx-spinner';
import { AddUnivExamCentersComponent } from './add-univ-exam-centers/add-univ-exam-centers.component';

@Component({
  selector: 'app-univ-exam-centers',
  templateUrl: './univ-exam-centers.component.html',
  styleUrls: ['./univ-exam-centers.component.scss']
})
export class UnivExamCentersComponent implements OnInit {

  displayedColumns: string[] = ['id','examReionalCenterCode', 'examcenterCode', 'longitude', 'latitude', 'addressLine1', 'addressLine2','city','pincode', 'isActive', 'actions'];
    dataSource: MatTableDataSource<any>;
    open: boolean;
    @ViewChild(MatPaginator) paginator: MatPaginator;
    @ViewChild(MatSort) sort: MatSort;
    panelOpenState = true;

    private isActive = CONSTANTS.isActive;
    private UnivExamCentersUrl = CONSTANTS.UnivExamCentersUrl;
    private universitiesUrl = CONSTANTS.universitiesUrl;
    private updateUnivCollegeWiseCoursesAndGroupsUrl=CONSTANTS.updateUnivCollegeWiseCoursesAndGroupsUrl
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
    //   collegeCode = localStorage.getItem('collegeCode');

    constructor(private dialog: MatDialog,
        private formBuilder: FormBuilder,
        private snotifyService: SnotifyService,
        private router: Router,
        private crudService: CrudService, private spinner: NgxSpinnerService, private genericFunctions: GenericFunctions) {
        this.getData();
    }
    ngOnInit() {
        this.examCenterForm = this.formBuilder.group({
            universityId: ['', Validators.required],
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
        this.universitiesList=[]
        this.universites =[]
        /*----------- COLLEGES -----------*/
        this.crudService.listDetailsById(this.universitiesUrl, 'true', this.isActive)
            .subscribe(result => {
                if (result.statusCode === 200) {
                    if (result.data.resultList && result.data.resultList !== '') {
                        this.universites = result.data.resultList;
                       this.universitiesList=this.universites 
                        if (this.universites.length > 0) {
                            this.examCenterForm.get('universityId').setValue(this.universites[0]?.universityId);
                            this.selectedUniversity(this.examCenterForm.value.universityId);
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
    selectedUniversity(universityId) {
      this.universityCode = this.universites.filter(x => (x.universityId === this.examCenterForm.value.universityId))[0].universityCode;
      this.examlCenterList =[]
        this.crudService.listDetailsByTwoIds(this.UnivExamCentersUrl, universityId, 'true', 'Universities.universityId', this.isActive)
            .subscribe(result => {
                if (result.statusCode === 200) {
                    if (result.data.resultList && result.data.resultList !== '') {
                        this.examlCenterList = result.data.resultList;
                        this.dataSource = new MatTableDataSource(this.examlCenterList);
                        this.dataSource.paginator = this.paginator;
                        this.dataSource.sort = this.sort;

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
    serachUniversity(value){
        this.universites=[]
        this.serachUniversityData(value)
      }
      
      serachUniversityData(value: string){
      let filter = value.toLowerCase();
      for ( let i = 0 ; i < this.universitiesList.length; i++ ) {
          let option = this.universitiesList[i];
          if (option.universityCode.toLowerCase().indexOf(filter) >= 0) {
              this.universites.push( option );
          }
      }
      }
  
      openDialog(): void {
        const data: any = {};
        data.universityId = this.examCenterForm.value.universityId;
        data.universityCode = this.universites.filter(x => (x.universityId === this.examCenterForm.value.universityId))[0].universityCode;
        data.type = 'new';
        const dialogRef = this.dialog.open(AddUnivExamCentersComponent, {
            width: '750px',
            data: data
        });
        dialogRef.afterClosed().subscribe(details => {
            if (details != null && details !== '') {
              details.universityId=this.examCenterForm.value.universityId
                this.spinner.show();
                /*---------- ADD CourseType ----------*/
                this.crudService.addDetails(this.UnivExamCentersUrl, details)
                    .subscribe(result => {
                        this.spinner.hide();
                        if (result.statusCode === 200) {
                           if (result.data && result.data !== '') {
                               this.snotifyService.success(result.message, 'Success!');
                                this.selectedUniversity(this.examCenterForm.value.universityId);

                            }
                            else{
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
        });
    }
 

    editDialog(row) {
        const dialogRef = this.dialog.open(AddUnivExamCentersComponent, {
            width: '750px',
            data: row
        });

        dialogRef.afterClosed().subscribe(details => {
            if (details != null && details !== '') {
                details.univExamcenterId=row.univExamcenterId
                this.updateData(details)
            }
        });
    }
    updateData(updateList) {
      this.spinner.show();
        this.crudService.updateDetails(this.UnivExamCentersUrl, updateList,updateList.univExamcenterId,'univExamcenterId')
            .subscribe(result => {
                this.spinner.hide();
                if (result.statusCode === 200) {
                    if (result.success) {
                        this.snotifyService.success(result.message, 'Success!');
                        this.selectedUniversity(this.examCenterForm.value.universityId);
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
