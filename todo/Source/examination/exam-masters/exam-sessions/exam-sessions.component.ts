import { Component, OnInit, ViewChild } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { CONSTANTS } from 'app/main/common/constants';
import { GenericFunctions } from 'app/main/common/generic-functions';
import { NgxSpinnerService } from 'ngx-spinner';
import { CrudService } from 'app/main/services/crud.service';
import { SnotifyService } from 'ng-snotify';
import { Router } from '@angular/router';
import { ExamSessionsModalComponent } from './exam-sessions-modal/exam-sessions-modal.component';
import { ExamSessions } from 'app/main/models/examSessions';

@Component({
    selector: 'app-exam-sessions',
    templateUrl: './exam-sessions.component.html',
    styleUrls: ['./exam-sessions.component.scss']
})
export class ExamSessionsComponent implements OnInit {

    displayedColumns: string[] = ['id', 'universityCode', 'examSessionName', 'examsessioninCatCode', 'sessionStartTime', 'isActive', 'actions'];
    dataSource: MatTableDataSource<ExamSessions>;

    @ViewChild(MatPaginator) paginator: MatPaginator;
    @ViewChild(MatSort) sort: MatSort;

    private examSessionUrl = CONSTANTS.examSessionUrl;
    private examSessionIdUrl = CONSTANTS.examSessionIdUrl;

    examSessions: ExamSessions[] = [];
    examSession: any = {};

    constructor(private genericFunctions: GenericFunctions, private dialog: MatDialog, private spinner: NgxSpinnerService,
        private crudService: CrudService, private snotifyService: SnotifyService, public router: Router) {
        this.getExamSessions();
    }

    // tslint:disable-next-line:typedef
    ngOnInit() {
        this.dataSource = new MatTableDataSource(this.examSessions);
        this.dataSource.paginator = this.paginator;
        this.dataSource.sort = this.sort;
    }

    /*--------- GET Exam Sessions ----------*/
    getExamSessions(): void {
        this.spinner.show();
        this.crudService.listAllDetails(this.examSessionUrl)
            .subscribe(result => {
                this.spinner.hide();
                if (result.statusCode === 200) {
                    if (result.data && result.data !== '') {
                        this.examSessions = result.data.resultList;
                        // Assign the data to the data source for the API
                        this.dataSource = new MatTableDataSource(this.examSessions);
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
                if (error.error.statusCode === 401) {
                    this.snotifyService.error(error.error.message, 'Error!');
                    this.genericFunctions.logOut(this.router.url);
                } else {
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
        const dialogRef = this.dialog.open(ExamSessionsModalComponent, {
            width: '750px',
            data: {}
        });
        dialogRef.afterClosed().subscribe(details => {
            if (details != null && details !== '') {
                this.spinner.show();
                /*---------- ADD Exam Sessions ----------*/
                this.crudService.addDetails(this.examSessionUrl, details)
                    .subscribe(result => {
                        this.spinner.hide();
                        if (result.statusCode === 200) {
                            if (result.data && result.data !== '') {
                                this.snotifyService.success(result.message, 'Success!');
                                this.getExamSessions();
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

    /*---------- EDIT Exam Sessions -----------*/
    editDialog(data): void {
        this.examSession = data;
        const dialogRef = this.dialog.open(ExamSessionsModalComponent, {
            width: '750px',
            data: this.examSession
        });

        dialogRef.afterClosed().subscribe(details => {
            if (details != null && details !== '') {
                details.examSessionId = data.examSessionId;
                this.updateExamSession(details);

            }
        });
    }

    /*------------ UPDATE Exam Sessions -----------*/
    updateExamSession(details): void {
        this.spinner.show();
        this.crudService.updateDetails(this.examSessionUrl, details, details.examSessionId, this.examSessionIdUrl)
            .subscribe(result => {
                this.spinner.hide();
                if (result.statusCode === 200) {
                    if (result.data && result.data !== '') {
                        this.snotifyService.success(result.message, 'Success!');
                        this.getExamSessions();
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

    tConvert(time): any {
        if (time !== null && time !== undefined) {
            time = time.toString().match(/^([01]\d|2[0-3])(:)([0-5]\d)(:[0-5]\d)?$/) || [time];
            if (time.length > 1) { // If time format correct
                time = time.slice(1);  // Remove full string match value
                time[5] = +time[0] < 12 ? 'AM' : 'PM'; // Set AM/PM
                time[0] = +time[0] % 12 || 12; // Adjust hours
            }
            time = time[0] + time[1] + time[2] + ' ' + time[5];
            return time;
        }
    }
}