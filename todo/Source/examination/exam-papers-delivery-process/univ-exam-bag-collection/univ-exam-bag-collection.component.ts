import { Component, OnInit, ViewChild } from '@angular/core';
import { SnotifyService } from 'ng-snotify';
import { NgxSpinnerService } from 'ngx-spinner';
import { Router } from '@angular/router';
import { CONSTANTS } from 'app/main/common/constants';
import { CrudService } from 'app/main/services/crud.service';
import { GenericFunctions } from 'app/main/common/generic-functions';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { College } from 'app/main/models/college';
import { Course } from 'app/main/models/course';
import { MatDialog } from '@angular/material/dialog';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { AddExamBagCollectionComponent } from './add-exam-bag-collection/add-exam-bag-collection.component';


@Component({
  selector: 'app-univ-exam-bag-collection',
  templateUrl: './univ-exam-bag-collection.component.html',
  styleUrls: ['./univ-exam-bag-collection.component.scss']
})
export class UnivExamBagCollectionComponent implements OnInit {

    // 'univExamAnswerPaperBag',
  displayedColumns: string[] = ['id', 'collectedBy', 'collectedDate', 'receivedBy', 'receivedDate', 'isActive', 'actions'];
    dataSource: MatTableDataSource<any>;
    open: boolean;
    @ViewChild(MatPaginator) paginator: MatPaginator;
    @ViewChild(MatSort) sort: MatSort;
    panelOpenState = true;

    private UnivExamBagCollectionUrl = CONSTANTS.UnivExamBagCollectionUrl;
    private isActive = CONSTANTS.isActive;
    universites = [];
    courses: Course[] = [];
    colleges: College[] = [];
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
  examBagCollection: any[];
    //   collegeCode = localStorage.getItem('collegeCode');

    constructor(private dialog: MatDialog,
        private formBuilder: FormBuilder,
        private snotifyService: SnotifyService,
        private router: Router,
        private crudService: CrudService, private spinner: NgxSpinnerService, private genericFunctions: GenericFunctions) {
        this.getData();
    }
    ngOnInit() {
        // this.examCenterForm = this.formBuilder.group({
        //     universityId: ['', Validators.required],
        // });
        this.dataSource = new MatTableDataSource(this.examBagCollection);
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
      this.examBagCollection =[]
      this.crudService.listDetailsById(this.UnivExamBagCollectionUrl,  'true',  this.isActive)
          .subscribe(result => {
              if (result.statusCode === 200) {
                  if (result.data.resultList && result.data.resultList !== '') {
                      this.examBagCollection = result.data.resultList;
                      this.dataSource = new MatTableDataSource(this.examBagCollection);
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
  
      openDialog(): void {
        const data: any = {};
        data.type = 'new';
        const dialogRef = this.dialog.open(AddExamBagCollectionComponent, {
            width: '750px',
            data: data
        });
        dialogRef.afterClosed().subscribe(details => {
            if (details != null && details !== '') {
                this.spinner.show();
                /*---------- ADD CourseType ----------*/
                this.crudService.addDetails(this.UnivExamBagCollectionUrl, details)
                    .subscribe(result => {
                        this.spinner.hide();
                        if (result.statusCode === 200) {
                           if (result.data && result.data !== '') {
                               this.snotifyService.success(result.message, 'Success!');
                                this.getData();

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
        const dialogRef = this.dialog.open(AddExamBagCollectionComponent, {
            width: '750px',
            data: row
        });

        dialogRef.afterClosed().subscribe(details => {
            if (details != null && details !== '') {
                details.univExamBagCollectionId=row.univExamBagCollectionId
                this.updateData(details)
            }
        });
    }
    updateData(updateList) {
      this.spinner.show();
        this.crudService.updateDetails(this.UnivExamBagCollectionUrl,updateList,updateList.univExamBagCollectionId, 'univExamBagCollectionId')
            .subscribe(result => {
                this.spinner.hide();
                if (result.statusCode === 200) {
                    if (result.success) {
                        this.snotifyService.success(result.message, 'Success!');
                        this.getData();
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

