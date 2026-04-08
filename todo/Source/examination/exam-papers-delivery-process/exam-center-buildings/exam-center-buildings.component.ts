import { Component, OnInit, ViewChild } from '@angular/core';
import { Building } from '../../../../models/building';
import { CONSTANTS } from '../../../../common/constants';
import { SnotifyService } from 'ng-snotify';
import { CrudService } from '../../../../services/crud.service';
import { NgxSpinnerService } from 'ngx-spinner';
import { Router } from '@angular/router';
import { GenericFunctions } from 'app/main/common/generic-functions';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatDialog } from '@angular/material/dialog';
import { ExamCenterBuildingsModalComponent } from './exam-center-buildings-modal/exam-center-buildings-modal.component';

@Component({
  selector: 'app-exam-center-buildings',
  templateUrl: './exam-center-buildings.component.html',
  styleUrls: ['./exam-center-buildings.component.scss']
})
export class ExamCenterBuildingsComponent implements OnInit {

    displayedColumns: string[] = ['id', 'campusName', 'buildingCode', 'buildingName', 'landmark', 'noOfFloors', 'isActive', 'actions'];
    dataSource: MatTableDataSource<Building>;

    @ViewChild(MatPaginator) paginator: MatPaginator;
    @ViewChild(MatSort) sort: MatSort;

    private buildingCrudUrl = CONSTANTS.buildingCrudUrl;
    private buildingByIdUrl = CONSTANTS.buildingByIdUrl;
   

    buildings: Building[] = [];
    building: any = {};

    constructor(private genericFunctions: GenericFunctions , private dialog: MatDialog, private snotifyService: SnotifyService,
                private crudService: CrudService, private spinner: NgxSpinnerService, public router: Router) {

        this.getBuildings();
    }

    // tslint:disable-next-line:typedef
    ngOnInit() {
        this.dataSource = new MatTableDataSource(this.buildings);
        this.dataSource.paginator = this.paginator;
        this.dataSource.sort = this.sort;
    }

    /*--------- GET BUILDING ----------*/
    getBuildings(): void {
        this.spinner.show();

        this.crudService.listAllDetails(this.buildingCrudUrl)
            .subscribe(result => {
                this.spinner.hide();
                if (result.statusCode === 200) {
                    if (result.data.resultList && result.data.resultList !== '') {
                        this.buildings = result.data.resultList.filter(x => (x.univExamCenterId !== null));
                        this.dataSource = new MatTableDataSource(this.buildings);
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
        const dialogRef = this.dialog.open(ExamCenterBuildingsModalComponent, {
            width: '750px',
            data: {}
        });

        dialogRef.afterClosed().subscribe(details => {
            if (details != null && details !== '') {
                this.spinner.show();

                /*---------- ADD BUILDING ----------*/
                this.crudService.addDetails(this.buildingCrudUrl, details)
                    .subscribe(result => {
                        this.spinner.hide();
                        if (result.statusCode === 200) {
                            if (result.data && result.data !== '') {
                                this.snotifyService.success(result.message, 'Success!');
                                this.getBuildings();
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

    /*---------- EDIT BUILDING -----------*/
    editDialog(data): void {
        this.building = data;
        const dialogRef = this.dialog.open(ExamCenterBuildingsModalComponent, {
            width: '750px',
            data: this.building
        });

        dialogRef.afterClosed().subscribe(details => {
            if (details != null && details !== '') {
                details.buildingId = data.buildingId;
                this.updateData(details);
            }
        });
    }

    /*------------ UPDATE BUILDING -----------*/
    updateData(details): void {
        this.spinner.show();
        this.crudService.updateDetails(this.buildingCrudUrl, details, details.buildingId, this.buildingByIdUrl)
            .subscribe(result => {
                this.spinner.hide();
                if (result.statusCode === 200) {
                    if (result.data && result.data !== '') {
                        this.snotifyService.success(result.message, 'Success!');
                        this.getBuildings();
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
