import { Component, OnInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { CONSTANTS } from 'app/main/common/constants';
import { SnotifyService } from 'ng-snotify';
import { GenericFunctions } from 'app/main/common/generic-functions';
import { CrudService } from 'app/main/services/crud.service';
import { NgxSpinnerService } from 'ngx-spinner';

@Component({
  selector: 'app-evaluation-subjects-list',
  templateUrl: './evaluation-subjects-list.component.html',
  styleUrls: ['./evaluation-subjects-list.component.scss']
})
export class EvaluationSubjectsListComponent implements OnInit {

  private EvaluatorDetail = CONSTANTS.EvaluatorDetailsUrl;
  private UserIdUrl = CONSTANTS.userByIdUrl;


  evaluatorDetails: any = [];
  email!: string;


  constructor(private dialog: MatDialog, private snotifyService: SnotifyService,
    private crudService: CrudService, private spinner: NgxSpinnerService, private genericFunctions: GenericFunctions, public router: Router) {

  }

  ngOnInit(): void {
    this.EvaluatorDetails();
  }

  EvaluatorDetails(): void {
    let userId = +localStorage.getItem('userId');
    this.crudService.ListsDetails(this.EvaluatorDetail, this.UserIdUrl, userId)
      .subscribe(result => {
        this.spinner.hide();
        if (result.statusCode === 200) {
          if (result.success) {
            this.snotifyService.success(result.message, 'Success!');
            const evaluatorsDetails1 = result.data.exam_evaluator_profileDetails;
            const subjectDetails = result.data.subject_details;
            const evaluatorProfilesDetails = result.data.exam_evaluatorProfiles_details;
            this.email = evaluatorProfilesDetails.email;
            result.data.exam_evaluator_profileDetails = result.data.exam_evaluator_profileDetails.map(ev => {
            const subject = result.data.subject_details.find(s => s.subjectId === ev.subjectId);

            return {
              ...ev,
              courseName: subject?.courseName || '-'
            };
          });
            this.evaluatorDetails = result.data.exam_evaluator_profileDetails.filter(x => (x.noOfStudentsAssigned !== null));
            // for (let i = 0; i < subjectDetails.length; i++) {
            //   const evaluatorsDetails = evaluatorsDetails1.filter(x => (x.subjectCode === subjectDetails[i].subjectCode))
            //   let ettdID = '';
            //   let sa = 0;
            //   let ec = 0;
            //   let ep = 0;
            //   let vsd;
            //   let ved;
            //   for (let j = 0; j < evaluatorsDetails.length; j++) {
            //     const sa1 = (evaluatorsDetails[j]?.noOfStudentsAssigned) == null ? 0 : evaluatorsDetails[j]?.noOfStudentsAssigned;
            //     const ec1 = (evaluatorsDetails[j]?.noOfEvaluationsCompleted) == null ? 0 : evaluatorsDetails[j]?.noOfEvaluationsCompleted;
            //     if(ettdID == '')
            //       // ettdID = evaluatorsDetails[j]?.examTimetableDetId;
            //       ettdID = evaluatorsDetails[j]?.examEvaluatorProfileDetId;
            //     else
            //       // ettdID = ettdID+','+evaluatorsDetails[j]?.examTimetableDetId;
            //       ettdID = ettdID+','+evaluatorsDetails[j]?.examEvaluatorProfileDetId;
            //     sa = sa + sa1;
            //     ec = ec + ec1;
            //     ep = sa - ec;
            //     vsd = evaluatorsDetails[j]?.validityStartDate;
            //     ved = evaluatorsDetails[j]?.validityEndDate;
            //   }
            //   if (sa != 0) {
            //     const row = {
            //       // "examTimetableDetId": ettdID,
            //       "examEvaluatorProfileDetId": ettdID,
            //       "validityStartDate": vsd,
            //       "validityEndDate": ved,
            //       "noOfStudentsAssigned": sa,
            //       "noOfEvaluationsCompleted": ec,
            //       "evaluationsPending": ep,
            //       "courseName": subjectDetails[i]?.courseName,
            //       "subjectName": subjectDetails[i]?.subjectName,
            //       "subjectCode": subjectDetails[i]?.subjectCode,
            //       "examEvaluatorProfileId": evaluatorProfilesDetails.examEvaluatorProfileId
            //     };
            //   }
            // }
            console.log(this.evaluatorDetails,'this.evaluatorDetails');
            
            localStorage.setItem('email', this.email);
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


  checkpaper(evaluator: any) {
    localStorage.setItem('subjectName', evaluator.subjectName);

    this.router.navigate(['/admin-examination-management/evaluation-process/evaluator-assigned-answer-papers'],
      {
      queryParams: {
        examEvaluatorProfileId: evaluator.examEvaluatorProfileId,
        examEvaluatorProfileDetId: evaluator.examEvaluatorProfileDetId,
        noOfStudentsAssigned: evaluator?.noOfStudentsAssigned ?? 0,
        noOfEvaluationsCompleted: evaluator?.noOfEvaluationsCompleted ?? 0,
        examId: evaluator?.examId,
        maxNoOfEvaluationsAssign: evaluator?.maxNoOfEvaluationsAssign,
        maxNoOfReevaluationsAssign: evaluator?.maxNoOfReevaluationsAssign,
        isReEvaluation: evaluator?.isReEvaluation
          // examTimetableDetId: evaluator.examTimetableDetId
        }
      }
    );

  }
}
