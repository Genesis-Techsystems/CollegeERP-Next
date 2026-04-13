import { Component, OnInit, ViewChild } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { CONSTANTS } from 'app/main/common/constants';
import { SnotifyService } from 'ng-snotify';
import { GenericFunctions } from 'app/main/common/generic-functions';
import { CrudService } from 'app/main/services/crud.service';
import { NgxSpinnerService } from 'ngx-spinner';
import { Router } from '@angular/router';
import { CreateEvaluatorComponent } from '../create-evaluator.component';
import { AssignEvaluatorSubjectComponent } from '../assign-evaluator-subject/assign-evaluator-subject.component';
import { EvaluatorProfile } from 'app/main/models/evaluator-profile';
import { NotifyModalComponent } from './notify-modal/notify-modal.component';
import { AddEvaluatorBankDetailsComponent } from './add-evaluator-bank-details/add-evaluator-bank-details.component';
import { ParametersService } from 'app/main/services/parameters.service';
import { EvaluatorSubjectsModalComponent } from './evaluator-subjects-modal/evaluator-subjects-modal.component';
import { EvaluatorPreferencesModalComponent } from './evaluator-preferences-modal/evaluator-preferences-modal.component';

@Component({
  selector: 'app-viewevaluators',
  templateUrl: './viewevaluators.component.html',
  styleUrls: ['./viewevaluators.component.scss']
})
export class ViewevaluatorsComponent implements OnInit {

  dataSource: MatTableDataSource<EvaluatorProfile>;
  displayedColumns: string[] = ['id', 'collegeCode', 'Name', 'Phone', 'Email', 'AadharCard', 'SubjectCode', 'Status', 'actions'];

  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild(MatSort) sort: MatSort;

  private ExamEvaluationProfileUrl = CONSTANTS.ExamEvaluatorsProfileUrl;
  private addExamEvaluatorProfiles = CONSTANTS.addExamEvaluatorProfiles;
  private updateExamEvaluatorProfiles = CONSTANTS.updateExamEvaluatorProfiles;
  private ExamEvaluatorsUrl = CONSTANTS.ExamEvaluatorUrl;
  private popProfileEmployeesUrl = CONSTANTS.popProfileEmployeesUrl;
  private sendUserIdAndPasswordToEvaluatorUrl = CONSTANTS.sendUserIdAndPasswordToEvaluatorUrl;
  private ExamEvaluatorBankDetails = CONSTANTS.ExamEvaluatorBankDetailsUrl;
  private updateexamevaluatorereferencesUrl = CONSTANTS.updateexamevaluatorereferencesUrl;

  bankDetails: any;
  evaluatorProfile: EvaluatorProfile[] = [];
  Evaluators: { examEvaluatorProfileId: number; }[];

  constructor(private dialog: MatDialog, private snotifyService: SnotifyService, public parameterService: ParametersService,
    private crudService: CrudService, private spinner: NgxSpinnerService, private genericFunctions: GenericFunctions, public router: Router) {
    this.getEvaluationList();
  }

  ngOnInit(): void {
    this.dataSource = new MatTableDataSource(this.evaluatorProfile);
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  applyFilter(event: string) {
    this.dataSource.filter = event.trim().toLowerCase();
    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
  }
  getEvaluationList() {
    this.spinner.show()
    this.crudService.listAllDetails(this.ExamEvaluationProfileUrl)
      .subscribe(result => {
        this.spinner.hide();
        if (result.statusCode === 200) {
          if (result.data && result.data !== '') {
            if (this.evaluatorProfile.length === 0) {
              this.snotifyService.success(result.message, 'Success!');
            }
            this.evaluatorProfile = result.data.resultList;
            this.dataSource = new MatTableDataSource(this.evaluatorProfile);
            this.dataSource.paginator = this.paginator;
            this.dataSource.sort = this.sort;
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
  openDialog(): void {
    const dialogRef = this.dialog.open(CreateEvaluatorComponent, {
      width: '850px',
      data: {}
    });
    dialogRef.afterClosed().subscribe(details => {
      if (details != null && details !== '') {
        this.spinner.show();
        /*---------- ADD EXAM EVALUATOR ----------*/
        this.crudService.add(this.addExamEvaluatorProfiles, details)
          .subscribe(result => {
            this.spinner.hide();
            if (result.statusCode === 200) {
              this.snotifyService.success(result.message, 'Success!');
              this.getEvaluationList();
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
  editDialog(data): void {
    this.evaluatorProfile = data;
    const dialogRef = this.dialog.open(CreateEvaluatorComponent, {
      width: '850px',
      data: this.evaluatorProfile
    });
    dialogRef.afterClosed().subscribe(details => {
      if (details != null && details !== '') {
        details.examEvaluatorProfileId = data.examEvaluatorProfileId
        this.updateEvaluatorProfile(details);
      }
    });
  }
  updateEvaluatorProfile(details) {
    this.spinner.show();
    this.crudService.updateMasterDetails(this.updateExamEvaluatorProfiles, details)
      .subscribe(result => {
        this.spinner.hide();
        if (result.statusCode === 200) {
          if (result.data && result.data !== '') {
            this.snotifyService.success(result.message, 'Success!');
            this.getEvaluationList();
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
  assignSubject(evaluatorProfile: any) {
    const dialogRef = this.dialog.open(AssignEvaluatorSubjectComponent, {
      width: '850px',
      data: evaluatorProfile,
    });
    dialogRef.afterClosed().subscribe(details => {
      if (details != null && details !== '') {
        this.spinner.show();
        /*---------- ADD EXAM GRADE ----------*/
        this.crudService.addDetails(this.ExamEvaluatorsUrl, details)
          .subscribe(result => {
            this.spinner.hide();
            if (result.statusCode === 200) {
              if (result.data && result.data !== '') {
                this.snotifyService.success(result.message, 'Success!');
                this.getEvaluationList();
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
  profileDetails(examEvaluatorProfileId) {
    let request = [
      { paramName: 'in_profile_id', paramValue: examEvaluatorProfileId },
    ];
    this.crudService.getDetailsByRequest(this.popProfileEmployeesUrl, '', request, '&')
      .subscribe(result => {
        this.spinner.hide();
        if (result.statusCode === 200) {
          if (result.data && result.data !== '' && result.data.result.length > 0) {

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
  SendUserIdPasswordBulk() {
    this.Evaluators = [];
    this.Evaluators = this.evaluatorProfile.map(evaluator => ({
      examEvaluatorProfileId: evaluator.examEvaluatorProfileId
    }));
    const dialogRef = this.dialog.open(NotifyModalComponent, {
      width: '45%',
      data: { data: this.Evaluators, condition: 'bulk' },
    });
    dialogRef.afterClosed().subscribe(details => {
      if (details != null && details !== '') {
        this.spinner.show();
        /*---------- ADD EXAM GRADE ----------*/
        this.crudService.add(this.sendUserIdAndPasswordToEvaluatorUrl, details)
          .subscribe(result => {
            this.spinner.hide();
            if (result.statusCode === 200) {
              if (result.data && result.data !== '') {
                this.snotifyService.success(result.message, 'Success!');
                this.getEvaluationList();
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
  SendUserIdPassword(row) {
    const dialogRef = this.dialog.open(NotifyModalComponent, {
      width: '45%',
      data: { data: row, condition: 'single' },
    });
    dialogRef.afterClosed().subscribe(details => {
      if (details != null && details !== '') {
        this.spinner.show();
        /*---------- ADD EXAM GRADE ----------*/
        this.crudService.add(this.sendUserIdAndPasswordToEvaluatorUrl, details)
          .subscribe(result => {
            this.spinner.hide();
            if (result.statusCode === 200) {
              if (result.data && result.data !== '') {
                this.snotifyService.success(result.message, 'Success!');
                this.getEvaluationList();
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
  AddBankDetails(row) {
    this.bankDetails = []
    this.spinner.show()
    this.crudService.listDetailsById(this.ExamEvaluatorBankDetails, row.examEvaluatorProfileId, 'examEvaluatorProfiles.examEvaluatorProfileId')
      .subscribe(result => {
        this.spinner.hide();
        if (result.statusCode === 200) {
          if (result.data && result.data !== '' && result.data.resultList.length > 0) {
            this.bankDetails = result.data.resultList
            if (this.bankDetails) {
              this.bankDetails.evaluatorName = row.evaluatorName;
              this.bankDetails.roleName = row.roleName;
            }
            this.UpdateBankDetails(this.bankDetails);
          } else {
            this.postBankDetails(row);
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
  postBankDetails(examEvaluatorProfileId) {
    const dialogRef = this.dialog.open(AddEvaluatorBankDetailsComponent, {
      width: '850px',
      data: examEvaluatorProfileId
    });
    dialogRef.afterClosed().subscribe(details => {
      if (details != null && details !== '') {
        this.spinner.show();
        details.examEvaluatorProfilesId = examEvaluatorProfileId.examEvaluatorProfileId
        /*---------- ADD EXAM EVALUATOR BANK DETAILS ----------*/
        this.crudService.addDetails(this.ExamEvaluatorBankDetails, details)
          .subscribe(result => {
            this.spinner.hide();
            if (result.statusCode === 200) {
              if (result.data && result.data !== '') {
                this.snotifyService.success(result.message, 'Success!');
                this.getEvaluationList();
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
  UpdateBankDetails(bankDetails) {
    const dialogRef = this.dialog.open(AddEvaluatorBankDetailsComponent, {
      width: '850px',
      data: bankDetails
    });
    dialogRef.afterClosed().subscribe(details => {
      if (details != null && details !== '') {
        this.spinner.show();
        details.evaluatorBankDetailId = bankDetails[0].evaluatorBankDetailId
        /*---------- ADD EXAM EVALUATOR BANK DETAILS ----------*/
        this.crudService.updateDetailsById(this.ExamEvaluatorBankDetails, details, details.evaluatorBankDetailId, 'evaluatorBankDetailId')
          .subscribe(result => {
            this.spinner.hide();
            if (result.statusCode === 200) {
              if (result.data && result.data !== '' && result.data.result.length > 0) {
                this.snotifyService.success(result.message, 'Success!');
                this.getEvaluationList();
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
    });
  }
  viewSubjects(row) {
    this.router.navigate(['admin-examination-management/evaluation-process/create-evaluators/evaluator-subject-roles']);
    this.parameterService.evaluatorSubjectrole = row;
  }
  preferencesModal(row){
    const dialogRef = this.dialog.open(EvaluatorPreferencesModalComponent, {
      width: '850px',
      data: row
    });
    dialogRef.afterClosed().subscribe(details => {
      if (details != null && details !== '') {
          this.spinner.show();
        /*---------- ADD EXAM EVALUATOR PREFERENCE'S ----------*/
        this.crudService.updateMasterDetails(this.updateexamevaluatorereferencesUrl, details)
          .subscribe(result => {
            this.spinner.hide();
            if (result.statusCode === 200) {
              if (result.data && result.data !== '' && result.data.result.length > 0) {
                this.snotifyService.success(result.message, 'Success!');                
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
    });
  }
}