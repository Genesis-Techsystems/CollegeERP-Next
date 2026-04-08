import { Component, OnInit, ViewChild } from '@angular/core';
import { CONSTANTS } from '../../../../common/constants';
import { Floors } from '../../../../models/floors';
import { NgxSpinnerService } from 'ngx-spinner';
import { CrudService } from '../../../../services/crud.service';
import { SnotifyService } from 'ng-snotify';
import { Router } from '@angular/router';
import { GenericFunctions } from 'app/main/common/generic-functions';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatDialog } from '@angular/material/dialog';
import { ExamCenterFloorsModalComponent } from './exam-center-floors-modal/exam-center-floors-modal.component';

@Component({
  selector: 'app-exam-center-floors',
  templateUrl: './exam-center-floors.component.html',
  styleUrls: ['./exam-center-floors.component.scss']
})
export class ExamCenterFloorsComponent implements OnInit {

      displayedColumns: string[] = ['id', 'blockname', 'floorName', 'floorNo', 'noOfRooms', 'isActive', 'actions'];
      dataSource: MatTableDataSource<Floors>;

      @ViewChild(MatPaginator) paginator: MatPaginator;
      @ViewChild(MatSort) sort: MatSort;

      private floorCrudUrl = CONSTANTS.floorCrudUrl;
      private floorByIdUrl = CONSTANTS.floorByIdUrl;

      floors: Floors[] = [];
      floor: any = {};

      constructor(private genericFunctions: GenericFunctions, private dialog: MatDialog, private spinner: NgxSpinnerService,
                  private crudService: CrudService, private snotifyService: SnotifyService, public router: Router) {

     this.getFloors();

      }

      // tslint:disable-next-line:typedef
      ngOnInit() {
        this.dataSource = new MatTableDataSource(this.floors);
        this.dataSource.paginator = this.paginator;
        this.dataSource.sort = this.sort;
      }

        /*--------- GET Floors ----------*/
        getFloors(): void{
            this.spinner.show();
            this.crudService.listAllDetails(this.floorCrudUrl)
            .subscribe(result => {
               this.spinner.hide();
               if (result.statusCode === 200){
                    if (result.data && result.data !== '') {
                        this.floors = result.data.resultList;
                        // Assign the data to the data source for the API
                        this.dataSource = new MatTableDataSource(this.floors);
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
          const dialogRef = this.dialog.open(ExamCenterFloorsModalComponent, {
            width: '750px',
            data: {}
          });

          dialogRef.afterClosed().subscribe(details => {
            if (details != null && details !== ''){
                this.spinner.show();

                /*---------- ADD Floor ----------*/
                this.crudService.addDetails(this.floorCrudUrl, details)
                .subscribe(result => {
                    this.spinner.hide();
                    if (result.statusCode === 200){
                        if (result.data && result.data !== '') {
                            this.snotifyService.success(result.message, 'Success!');
                            this.getFloors();
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

        /*---------- EDIT Floor -----------*/
        editDialog(data): void {
            this.floor = data;
            const dialogRef = this.dialog.open(ExamCenterFloorsModalComponent, {
            width: '750px',
            data: this.floor
            });

            dialogRef.afterClosed().subscribe(details => {
                if (details != null && details !== ''){
                    details.floorId = data.floorId;
                    this.updateFloor(details);
                }
            });
        }

          /*------------ UPDATE Floor -----------*/
          updateFloor(details): void{
            this.spinner.show();
            this.crudService.updateDetails(this.floorCrudUrl, details, details.floorId, this.floorByIdUrl)
            .subscribe(result => {
                this.spinner.hide();
                if (result.statusCode === 200){
                    if (result.data && result.data !== '') {
                        this.snotifyService.success(result.message, 'Success!');
                        this.getFloors();
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
