import { Component, OnInit, ViewChild } from '@angular/core';
import { Room } from '../../../../models/room';
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
import { AddExamCenterRoomsComponent } from './add-exam-center-rooms/add-exam-center-rooms.component';

@Component({
  selector: 'app-exam-center-rooms',
  templateUrl: './exam-center-rooms.component.html',
  styleUrls: ['./exam-center-rooms.component.scss']
})
export class ExamCenterRoomsComponent implements OnInit {

    displayedColumns: string[] = ['id', 'blockName', 'floorName', 'roomType', 'roomCode', 'roomName',  'isActive', 'actions'];
    dataSource: MatTableDataSource<Room>;

    @ViewChild(MatPaginator) paginator: MatPaginator;
    @ViewChild(MatSort) sort: MatSort;

    private roomCrudUrl = CONSTANTS.roomCrudUrl;
    private roomByIdUrl = CONSTANTS.roomByIdUrl;

    rooms: Room[] = [];
    room: any = {};

    constructor( private genericFunctions: GenericFunctions , private dialog: MatDialog, private snotifyService: SnotifyService,
                 private crudService: CrudService, private spinner: NgxSpinnerService, public router: Router) {

        this.getRooms();
    }

    // tslint:disable-next-line:typedef
    ngOnInit() {
        this.dataSource = new MatTableDataSource(this.rooms);
        this.dataSource.paginator = this.paginator;
        this.dataSource.sort = this.sort;
    }

    /*--------- GET ROOMS ----------*/
    getRooms(): void {
        this.spinner.show();

        this.crudService.listAllDetails(this.roomCrudUrl)
            .subscribe(result => {
                this.spinner.hide();
                if (result.statusCode === 200) {
                    if (result.data.resultList && result.data.resultList !== '') {
                        this.rooms = result.data.resultList;
                        this.dataSource = new MatTableDataSource(this.rooms);
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
        const dialogRef = this.dialog.open(AddExamCenterRoomsComponent, {
            width: '750px',
            data: {}
        });

        dialogRef.afterClosed().subscribe(details => {
            if (details != null && details !== '') {
                this.spinner.show();

                /*---------- ADD ROOM ----------*/
                this.crudService.addDetails(this.roomCrudUrl, details)
                    .subscribe(result => {
                        this.spinner.hide();
                        if (result.statusCode === 200) {
                            if (result.data && result.data !== '') {
                                this.snotifyService.success(result.message, 'Success!');
                                this.getRooms();
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

    /*---------- EDIT ROOM -----------*/
    editDialog(data): void {
        this.room = data;
        const dialogRef = this.dialog.open(AddExamCenterRoomsComponent, {
            width: '750px',
            data: this.room
        });

        dialogRef.afterClosed().subscribe(details => {
            if (details != null && details !== '') {
                details.roomId = data.roomId;
                this.updateData(details);
            }
        });
    }

    /*------------ UPDATE ROOM -----------*/
    updateData(details): void {
        this.spinner.show();
        this.crudService.updateDetails(this.roomCrudUrl, details, details.roomId, this.roomByIdUrl)
            .subscribe(result => {
                this.spinner.hide();
                if (result.statusCode === 200) {
                    if (result.data && result.data !== '') {
                        this.snotifyService.success(result.message, 'Success!');
                        this.getRooms();
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
