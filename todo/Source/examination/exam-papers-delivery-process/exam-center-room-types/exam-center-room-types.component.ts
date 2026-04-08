import {Component, OnInit, ViewChild} from '@angular/core';
import { CONSTANTS } from '../../../../common/constants';
import { SnotifyService } from 'ng-snotify';
import { CrudService } from '../../../../services/crud.service';
import { NgxSpinnerService } from 'ngx-spinner';
import { RoomType } from '../../../../models/roomType';
import { Router } from '@angular/router';
import { GenericFunctions } from 'app/main/common/generic-functions';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatDialog } from '@angular/material/dialog';
import { ExamCenterRoomTypesModalComponent } from './exam-center-room-types-modal/exam-center-room-types-modal.component';

@Component({
  selector: 'app-exam-center-room-types',
  templateUrl: './exam-center-room-types.component.html',
  styleUrls: ['./exam-center-room-types.component.scss']
})
export class ExamCenterRoomTypesComponent implements OnInit {

    displayedColumns: string[] = ['id', 'orgCode', 'roomType', 'isActive',  'actions'];
    dataSource: MatTableDataSource<RoomType>;
    
  
    @ViewChild(MatPaginator) paginator: MatPaginator;
    @ViewChild(MatSort) sort: MatSort;

    private roomTypeCrudUrl = CONSTANTS.roomTypeCrudUrl;
    private roomTypeByIdUrl = CONSTANTS.roomTypeByIdUrl;

    roomTypes: RoomType[] = [];
    roomType: any = {};

    constructor(private genericFunctions: GenericFunctions , private dialog: MatDialog, private snotifyService: SnotifyService,
                private crudService: CrudService, private spinner: NgxSpinnerService, public router: Router) {

                this.getRoomTypes();
    }

    // tslint:disable-next-line:typedef
    ngOnInit() {
        this.dataSource = new MatTableDataSource(this.roomTypes); 
        this.dataSource.paginator = this.paginator;
        this.dataSource.sort = this.sort;
    }

    /*--------- GET ROOM TYPES ----------*/
    getRoomTypes(): void{
        this.spinner.show();

        this.crudService.listAllDetails(this.roomTypeCrudUrl)
        .subscribe(result => {
        this.spinner.hide();
        if (result.statusCode === 200){
            if (result.data.resultList && result.data.resultList !== '') {
                this.roomTypes = result.data.resultList;
                this.dataSource = new MatTableDataSource(this.roomTypes);
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
        const dialogRef = this.dialog.open(ExamCenterRoomTypesModalComponent, {
          width: '750px',
          data: {}
        });

        dialogRef.afterClosed().subscribe(details => {
            if (details != null && details !== ''){  
                this.spinner.show();

                /*---------- ADD ROOM TYPE ----------*/
                this.crudService.addDetails(this.roomTypeCrudUrl, details)
                .subscribe(result => {
                    this.spinner.hide();
                    if (result.statusCode === 200){
                        if (result.data && result.data !== '') {
                            this.snotifyService.success(result.message, 'Success!');
                            this.getRoomTypes();
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

    /*---------- EDIT ROOM TYPE -----------*/
    editDialog(data): void {
        this.roomType = data;
        const dialogRef = this.dialog.open(ExamCenterRoomTypesModalComponent, {
          width: '750px',
          data: this.roomType
        });

        dialogRef.afterClosed().subscribe(details => {
            if (details != null && details !== ''){
                details.roomTypeId = data.roomTypeId;
                this.updateData(details);
                
            }
        });
    }

    /*------------ UPDATE ROOM TYPE -----------*/
    updateData(details): void{
        this.spinner.show();
        this.crudService.updateDetails(this.roomTypeCrudUrl, details, details.roomTypeId, this.roomTypeByIdUrl)
        .subscribe(result => {
            this.spinner.hide();
            if (result.statusCode === 200){
                if (result.data && result.data !== '') {
                    this.snotifyService.success(result.message, 'Success!');
                    this.getRoomTypes();
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
