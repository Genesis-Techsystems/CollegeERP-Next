import { Component, OnInit, ViewChild } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { Router } from '@angular/router';
import { CONSTANTS } from 'app/main/common/constants';
import { GenericFunctions } from 'app/main/common/generic-functions';
import { EvaluatorProfile } from 'app/main/models/evaluator-profile';
import { CrudService } from 'app/main/services/crud.service';
import { ParametersService } from 'app/main/services/parameters.service';
import { SnotifyService } from 'ng-snotify';
import { NgxSpinnerService } from 'ngx-spinner';
import { AssignEvaluatorSubjectComponent } from '../../evaluation-process/create-evaluator/assign-evaluator-subject/assign-evaluator-subject.component';
import { CreateEvaluatorComponent } from '../../evaluation-process/create-evaluator/create-evaluator.component';
import { AddEvaluatorBankDetailsComponent } from '../../evaluation-process/create-evaluator/viewevaluators/add-evaluator-bank-details/add-evaluator-bank-details.component';
import { EvaluatorPreferencesModalComponent } from '../../evaluation-process/create-evaluator/viewevaluators/evaluator-preferences-modal/evaluator-preferences-modal.component';
import { NotifyModalComponent } from '../../evaluation-process/create-evaluator/viewevaluators/notify-modal/notify-modal.component';
import { CreateExamScanProfileComponent } from './create-exam-scan-profile/create-exam-scan-profile.component';

@Component({
  selector: 'app-exam-scan-profile',
  templateUrl: './exam-scan-profile.component.html',
  styleUrls: ['./exam-scan-profile.component.scss']
})
export class ExamScanProfileComponent implements OnInit {

 dataSource: MatTableDataSource<EvaluatorProfile>;
   displayedColumns: string[] = ['id', 'Name', 'Phone','Email', 'AadharCard','PanCard', 'SubjectCode','Status', 'actions'];
 
   @ViewChild(MatPaginator) paginator: MatPaginator;
   @ViewChild(MatSort) sort: MatSort;
 
   //private ExamEvaluationProfileUrl = CONSTANTS.ExamEvaluatorsProfileUrl;
   private ExamScanProfileUrl = CONSTANTS.ExamScanProfileUrl;
   private addExamEvaluatorProfiles = CONSTANTS.addExamEvaluatorProfiles;
   private updateExamEvaluatorProfiles = CONSTANTS.updateExamEvaluatorProfiles;
   private ExamEvaluatorsUrl = CONSTANTS.ExamEvaluatorUrl;
   private popProfileEmployeesUrl = CONSTANTS.popProfileEmployeesUrl;
   private sendUserIdAndPasswordToEvaluatorUrl = CONSTANTS.sendUserIdAndPasswordToEvaluatorUrl;
   private ExamEvaluatorBankDetails = CONSTANTS.ExamEvaluatorBankDetailsUrl;
   private updateexamevaluatorereferencesUrl = CONSTANTS.updateexamevaluatorereferencesUrl;
   private getPoPScanProfileEmployeesUrl = CONSTANTS.getPoPScanProfileEmployeesUrl;
 
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
     this.crudService.listActiveRecords(this.ExamScanProfileUrl)
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
     const dialogRef = this.dialog.open(CreateExamScanProfileComponent, {
       width: '850px',
       data: {}
     });
     dialogRef.afterClosed().subscribe(details => {
       if (details != null && details !== '') {
         this.spinner.show();
         /*---------- ADD EXAM EVALUATOR ----------*/
         this.crudService.addDetails(this.ExamScanProfileUrl, details)
           .subscribe(result => {
             this.spinner.hide();
             if (result.statusCode === 200) {
               this.snotifyService.success(result.message, 'Success!');
               this.createUser(result.data.examScanProfileId)
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

  const dialogRef = this.dialog.open(CreateExamScanProfileComponent, {
    width: '850px',
    data: this.evaluatorProfile
  });

  dialogRef.afterClosed().subscribe(details => {
    if (details != null && details !== '') {

      // ✅ FIX HERE
      details.examScanProfileId = data.examScanProfileId;

      this.updateEvaluatorProfile(details);
    }
  });
}
   updateEvaluatorProfile(details) {
  this.spinner.show();
 const id = details.examScanProfileId 
  this.crudService.updateDetailsById(
    this.ExamScanProfileUrl,         
    details,
    id,                 
    'examScanProfileId'                        
  ).subscribe(result => {

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
     this.router.navigate(['admin-examination-management/exam-papers-delivery-process/exam-scan-profile/profile-details']);
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
createUser(examScanProfileId) {
    let request = [
      { paramName: 'in_scan_profile_id', paramValue: examScanProfileId },
    ];
    this.crudService.getDetailsByRequest(this.getPoPScanProfileEmployeesUrl, '', request, '&')
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
}
