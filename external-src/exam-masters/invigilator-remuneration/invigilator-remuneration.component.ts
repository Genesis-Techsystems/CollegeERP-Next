import { Component, OnInit, ViewChild } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { ExamInvgRemuneration } from 'app/main/models/invigilatorRemuneration';
import { CONSTANTS } from 'app/main/common/constants';
import { GenericFunctions } from 'app/main/common/generic-functions';
import { NgxSpinnerService } from 'ngx-spinner';
import { CrudService } from 'app/main/services/crud.service';
import { SnotifyService } from 'ng-snotify';
import { Router } from '@angular/router';
import { InvigilatorRemunerationModalComponent } from './invigilator-remuneration-modal/invigilator-remuneration-modal.component';

@Component({
  selector: 'app-invigilator-remuneration',
  templateUrl: './invigilator-remuneration.component.html',
  styleUrls: ['./invigilator-remuneration.component.scss']
})
export class InvigilatorRemunerationComponent implements OnInit {
  displayedColumns: string[] = ['id', 'collegeCode', 'invgdesignationCatCode',  'amount', 'fromDate', 'toDate' , 'isActive', 'actions'];
  dataSource: MatTableDataSource<ExamInvgRemuneration>;
 
  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild(MatSort) sort: MatSort;

  private examInvigilationRemunerationUrl = CONSTANTS.examInvigilationRemunerationUrl;
  private examInvgRemunerationIdUrl = CONSTANTS.examInvgRemunerationIdUrl;
  dateFormate = CONSTANTS.dateFormate;

  examInvigilationRemunerations: ExamInvgRemuneration[] = [];
  floor: any = {};
  
  constructor(private genericFunctions: GenericFunctions, private dialog: MatDialog, private spinner: NgxSpinnerService,
              private crudService: CrudService, private snotifyService: SnotifyService, public router: Router) {
    
 this.getExamInvigilationRemunerations();
   
  }

  // tslint:disable-next-line:typedef
  ngOnInit() {
    this.dataSource = new MatTableDataSource(this.examInvigilationRemunerations); 
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

    /*--------- GET ExamInvgRemuneration ----------*/
    getExamInvigilationRemunerations(): void{
        this.spinner.show();          
        this.crudService.listAllDetails(this.examInvigilationRemunerationUrl)
        .subscribe(result => {
           this.spinner.hide();
           if (result.statusCode === 200){
                if (result.data && result.data !== '') {
                    this.examInvigilationRemunerations = result.data.resultList;
                    // Assign the data to the data source for the API
                    this.dataSource = new MatTableDataSource(this.examInvigilationRemunerations);
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
      const dialogRef = this.dialog.open(InvigilatorRemunerationModalComponent, {
        width: '750px',
        data: {}
      });

      dialogRef.afterClosed().subscribe(details => {
        if (details != null && details !== ''){  
            this.spinner.show();
    
            /*---------- ADD Floor ----------*/
            this.crudService.addDetails(this.examInvigilationRemunerationUrl, details)
            .subscribe(result => {
                this.spinner.hide();
                if (result.statusCode === 200){
                    if (result.data && result.data !== '') {
                        this.snotifyService.success(result.message, 'Success!');
                        this.getExamInvigilationRemunerations();
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
        const dialogRef = this.dialog.open(InvigilatorRemunerationModalComponent, {
        width: '750px',
        data: this.floor
        });

        dialogRef.afterClosed().subscribe(details => {
            if (details != null && details !== ''){
                details.examInvgRemunerationId = data.examInvgRemunerationId;
                this.updateFloor(details);
                
            }
        });
    }

      /*------------ UPDATE Floor -----------*/
      updateFloor(details): void{
        this.spinner.show();
        this.crudService.updateDetails(this.examInvigilationRemunerationUrl, details, details.examInvgRemunerationId, this.examInvgRemunerationIdUrl)
        .subscribe(result => {
            this.spinner.hide();
            if (result.statusCode === 200){
                if (result.data && result.data !== '') {
                    this.snotifyService.success(result.message, 'Success!');
                    this.getExamInvigilationRemunerations();
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
