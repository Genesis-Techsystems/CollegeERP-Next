import { Component, OnInit, ViewChild } from '@angular/core';
import { Block } from '../../../../models/block';
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
import { ExamCenterBlocksModalComponent } from './exam-center-blocks-modal/exam-center-blocks-modal.component';

@Component({
  selector: 'app-exam-center-blocks',
  templateUrl: './exam-center-blocks.component.html',
  styleUrls: ['./exam-center-blocks.component.scss']
})
export class ExamCenterBlocksComponent implements OnInit {

    displayedColumns: string[] = ['id', 'buildingName', 'blockCode', 'blockName', 'noOfFloors', 'isActive', 'actions'];
    dataSource: MatTableDataSource<Block>;
  
    @ViewChild(MatPaginator) paginator: MatPaginator;
    @ViewChild(MatSort) sort: MatSort;

    private blockCrudUrl = CONSTANTS.blockCrudUrl;
    private blockByIdUrl = CONSTANTS.blockByIdUrl;
   

    blocks: Block[] = [];
    block: any = {};

    constructor(private genericFunctions: GenericFunctions, private dialog: MatDialog, private snotifyService: SnotifyService,
                private crudService: CrudService, private spinner: NgxSpinnerService, public router: Router) {

                this.getBlocks();
    }

    // tslint:disable-next-line:typedef
    ngOnInit() {
        this.dataSource = new MatTableDataSource(this.blocks); 
        this.dataSource.paginator = this.paginator;
        this.dataSource.sort = this.sort;
    }

    /*--------- GET BLOCKS ----------*/
    getBlocks(): void{
        this.spinner.show();

        this.crudService.listAllDetails(this.blockCrudUrl)
        .subscribe(result => {
        this.spinner.hide();
        if (result.statusCode === 200){
            if (result.data.resultList && result.data.resultList !== '') {
                this.blocks = result.data.resultList;
                this.dataSource = new MatTableDataSource(this.blocks);
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
        const dialogRef = this.dialog.open(ExamCenterBlocksModalComponent, {
          width: '750px',
          data: {}
        });

        dialogRef.afterClosed().subscribe(details => {
            if (details != null && details !== ''){  
                this.spinner.show();

                /*---------- ADD BLOCK ----------*/
                this.crudService.addDetails(this.blockCrudUrl, details)
                .subscribe(result => {
                    this.spinner.hide();
                    if (result.statusCode === 200){
                        if (result.data && result.data !== '') {
                            this.snotifyService.success(result.message, 'Success!');
                            this.getBlocks();
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

    /*---------- EDIT BLOCK -----------*/
    editDialog(data): void {
        this.block = data;
        const dialogRef = this.dialog.open(ExamCenterBlocksModalComponent, {
          width: '750px',
          data: this.block
        });

        dialogRef.afterClosed().subscribe(details => {
            if (details != null && details !== ''){
                details.blockId = data.blockId;
                this.updateData(details);
                
            }
        });
    }

    /*------------ UPDATE BLOCK -----------*/
    updateData(details): void{
        this.spinner.show();
        this.crudService.updateDetails(this.blockCrudUrl, details, details.blockId, this.blockByIdUrl)
        .subscribe(result => {
            this.spinner.hide();
            if (result.statusCode === 200){
                if (result.data && result.data !== '') {
                    this.snotifyService.success(result.message, 'Success!');
                    this.getBlocks();
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
