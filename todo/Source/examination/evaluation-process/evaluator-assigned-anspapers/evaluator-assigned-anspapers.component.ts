import { Component, OnInit, ViewChild } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { ActivatedRoute, Router } from '@angular/router';
import { CONSTANTS } from 'app/main/common/constants';
import { SnotifyService } from 'ng-snotify';
import { GenericFunctions } from 'app/main/common/generic-functions';
import { CrudService } from 'app/main/services/crud.service';
import { NgxSpinnerService } from 'ngx-spinner';

@Component({
  selector: 'app-evaluator-assigned-anspapers',
  templateUrl: './evaluator-assigned-anspapers.component.html',
  styleUrls: ['./evaluator-assigned-anspapers.component.scss']
})
export class EvaluatorAssignedAnspapersComponent implements OnInit {

  dataSource: MatTableDataSource<any>;generalSettings: any;
  settingValue: any;

  displayedColumns: string[] = ['id', 'SerialNumber', 'CheckAnswerheet', 'EvaluatorMarks', 'AnswerSheetCheckDate'];

  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild(MatSort) sort: MatSort;

  private AnswerPapaerUrl = CONSTANTS.getstudentanswerpapersUrl
  private ExamEvaluatorProfileId = CONSTANTS.examEvaluatorProfileIdUrl;
  private ExamTimetableDetId = CONSTANTS.ExamTimetableDetIdUrl;
  private examEvaluatorProfileDetIdUrl = CONSTANTS.examEvaluatorProfileDetId;
  evaluationUrl = CONSTANTS.evaluationUrl;
  private generalSettingsUrl = CONSTANTS.generalSettingsUrl;
  private getevaluatorassignmentUrl = CONSTANTS.getevaluatorassignmentUrl;
  private ExamEvaluationSettingsUrl = CONSTANTS.ExamEvaluationSettingsUrl;
  private isActive = CONSTANTS.isActive;

  NewPaper = CONSTANTS.NewPaper;
  Assigned = CONSTANTS.Assigned;
  InProgress = CONSTANTS.InProgress;
  Evaluated = CONSTANTS.Evaluated;
  Approved = CONSTANTS.Approved;
  FinishPaper = CONSTANTS.FinishPaper;
  RejectPaper = CONSTANTS.RejectPaper;

  examEvaluatorProfileId!: number;
  examTimetableDetId!: number;
  examEvaluatorProfileDetId!: number;
  stdAnswerPaper: any = [];
  email!: string;
  subjectName!: string;
  session!: string;
  universityId!: number;
  universityCode = '';
  noOfStudentsAssigned;
  noOfEvaluationsCompleted;
  examId;
  maxNoOfEvaluationsAssign;
  maxNoOfReevaluationsAssign;
  isReEvaluation;

  constructor(private dialog: MatDialog, private snotifyService: SnotifyService, private route: ActivatedRoute,
    private crudService: CrudService, private spinner: NgxSpinnerService, private genericFunctions: GenericFunctions,
    public router: Router) {

  }

  ngOnInit(): void {
    this.session = localStorage.getItem('token');
    this.universityId = +localStorage.getItem('universityId');
    this.universityCode = localStorage.getItem('universityCode');
    this.route.queryParams.subscribe(params => {
      this.examEvaluatorProfileId = params['examEvaluatorProfileId'];
      this.examEvaluatorProfileDetId = params['examEvaluatorProfileDetId'];
      this.examId = params['examId'];
      this.maxNoOfEvaluationsAssign = +params['maxNoOfEvaluationsAssign'];
      this.maxNoOfReevaluationsAssign = +params['maxNoOfReevaluationsAssign'];
      this.isReEvaluation = params['isReEvaluation'];
    });
    const subjectName1 = localStorage.getItem('subjectName');
    this.subjectName = subjectName1 ? subjectName1 : '';    
    const email1 = localStorage.getItem('email');
    this.email = email1 ? email1 : '';
    this.getAnswerPaper();
    this.getGeneralSettings();
    this.dataSource = new MatTableDataSource(this.stdAnswerPaper);
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
    console.log(this.maxNoOfReevaluationsAssign,"this.maxNoOfReevaluationsAssign",
                this.maxNoOfEvaluationsAssign,"this.maxNoOfEvaluationsAssign",
                this.isReEvaluation,"this.isReEvaluation"
    )
    if(this.isReEvaluation === 'true'){
      if(this.maxNoOfReevaluationsAssign <= 0){
         this.getEvaluationSettingList();
      }
    }else{
      if(this.maxNoOfEvaluationsAssign <= 0){
         this.getEvaluationSettingList();
      }
    }
  }
  applyFilter(event: string) {

    this.dataSource.filter = event.trim().toLowerCase();
    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
  }

  
  getGeneralSettings(){
    localStorage.setItem('settingValue', '');
    this.crudService.listDetailsById(this.generalSettingsUrl, 'EVALPDFSTARTEND', 'settingCode')
    .subscribe(result => {
       if (result.statusCode === 200){
            if (result.data.resultList && result.data.resultList.length > 0) {
                this.generalSettings = result.data.resultList;
                if (this.generalSettings.length > 0){
                  this.settingValue = this.generalSettings[0].settingValue
                }else{
                  this.snotifyService.error("Evaluation settings are missing, please contact your admin.", 'Error!');

                }
                
            }
       }
    });
  }
  getAnswerPaper(): void {
    this.stdAnswerPaper = [];
    this.dataSource = new MatTableDataSource([]);
    let examprofileid = this.examEvaluatorProfileId;
    let examEvaluatorProfileDetId = this.examEvaluatorProfileDetId;
    this.crudService.ListDetailsByTwo(this.AnswerPapaerUrl, this.ExamEvaluatorProfileId, this.examEvaluatorProfileDetIdUrl, examprofileid, examEvaluatorProfileDetId)
      .subscribe(result => {
        this.spinner.hide();
        if (result.statusCode === 200) {
          if (result.data && result.data !== '') {
            this.snotifyService.success(result.message, 'Success!');
            this.noOfStudentsAssigned = result.data[0].exam_evauation_assignment_details?.noOfStudentsAssigned;
            this.noOfEvaluationsCompleted = result.data[0].exam_evauation_assignment_details?.noOfEvaluationsCompleted;
            for (let i = 0; i < result.data.length; i++) {
              let evaluationStatusCatDetId = result.data[i]?.exam_evauation_assignment_details.evaluationStatusCatDetId;
              if(result.data[i]?.exam_std_answer_paper_details.studentAnswerPath == null){
                evaluationStatusCatDetId = 'Path';
                const row = {
                  "examEvaluationAssignmentId": result.data[i]?.exam_evauation_assignment_details.examEvaluationAssignmentId,
                  "studentAnswerPaperId": result.data[i]?.exam_evauation_assignment_details.studentAnswerPaperId,
                  "studentAnswerPath": result.data[i]?.exam_std_answer_paper_details.studentAnswerPath,
                  "omrSerialNo": result.data[i]?.exam_std_answer_paper_details.omrSerialNo,
                  "evaluatedTotalMarks": result.data[i]?.exam_evauation_assignment_details.evaluatedTotalMarks,
                  "answerSheetCheckDate": result.data[i]?.exam_evauation_assignment_details.answerSheetCheckDate,
                  "evaluatedAnswerPaperPath": result.data[i]?.exam_evauation_assignment_details.evaluatedAnswerPaperPath,
                  "evaluationStatusCatDetId": evaluationStatusCatDetId,
                  "settingValue": this.settingValue 
                }
                this.stdAnswerPaper.push(row);
              }
              // else if (evaluationStatusCatDetId === null || evaluationStatusCatDetId === this.InProgress || evaluationStatusCatDetId === this.Assigned || evaluationStatusCatDetId === this.RejectPaper || evaluationStatusCatDetId === this.Evaluated) {
                else{
                const row = {
                  "examEvaluationAssignmentId": result.data[i]?.exam_evauation_assignment_details.examEvaluationAssignmentId,
                  "studentAnswerPaperId": result.data[i]?.exam_evauation_assignment_details.studentAnswerPaperId,
                  "studentAnswerPath": result.data[i]?.exam_std_answer_paper_details.studentAnswerPath,
                  "omrSerialNo": result.data[i]?.exam_std_answer_paper_details.omrSerialNo,
                  "evaluatedTotalMarks": result.data[i]?.exam_evauation_assignment_details.evaluatedTotalMarks,
                  "answerSheetCheckDate": result.data[i]?.exam_evauation_assignment_details.answerSheetCheckDate,
                  "evaluatedAnswerPaperPath": result.data[i]?.exam_evauation_assignment_details.evaluatedAnswerPaperPath,
                  "evaluationStatusCatDetId": evaluationStatusCatDetId,
                  "settingValue": this.settingValue 
                }
                this.stdAnswerPaper.push(row);
                
              }
            
            }
            const sortWithWord = (words: any, firstWord: any) => words.sort((a: any, b: any) => {
              //   if (a.evaluationStatusCatDetId === firstWord) return -1;
                 return a.evaluationStatusCatDetId - b.evaluationStatusCatDetId;
               });
     
            this.stdAnswerPaper = sortWithWord(this.stdAnswerPaper, this.Evaluated);
            
            this.dataSource = new MatTableDataSource(this.stdAnswerPaper);
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

  getEvaluationSettingList() {
    this.spinner.show();
      this.crudService.listDetailsByTwoIds(this.ExamEvaluationSettingsUrl, this.examId, 'true', 'ExamMaster.examId', this.isActive)
        .subscribe(result => {
          this.spinner.hide();
          if (result.statusCode === 200) {
            if (result.data && result.data !== '') {
              if(result.data.resultList && result.data.resultList.length > 0){
                 this.maxNoOfEvaluationsAssign = result.data.resultList[0]?.maxNoOfEvaluationsAssign;
                 this.maxNoOfReevaluationsAssign = result.data.resultList[0]?.maxNoOfReevaluationsAssign;
              }
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

  subjectList() {
    this.router.navigate(['/admin-examination-management/evaluation-process/evaluator-subjects'],
    )
  };
  assignNext(){
    if(this.isReEvaluation === 'true'){
       if(this.noOfStudentsAssigned >= this.maxNoOfReevaluationsAssign){
          this.snotifyService.info('You have been assigned the maximum number of papers.', 'Success!');
          return;
       }
    }else{
      if(this.noOfStudentsAssigned >= this.maxNoOfEvaluationsAssign){
          this.snotifyService.info('You have been assigned the maximum number of papers.', 'Success!');
          return;
       }
    }
    this.spinner.show();
    let request = [
      { paramName: 'in_flag', paramValue: 'assign_next_eval' },
      { paramName: 'in_profileids', paramValue: this.examEvaluatorProfileDetId },
      { paramName: 'in_exam_evaluationassignment_ids', paramValue: '' },
      { paramName: 'in_omr_serial_nos', paramValue: '' },
      { paramName: 'in_timetable_det_ids', paramValue: '' },
      { paramName: 'in_exam_id', paramValue: 0 },
      { paramName: 'in_subject_id', paramValue: 0 },
      { paramName: 'in_course_year_id', paramValue: 0 }
    ];
    this.crudService.getDetailsByRequest(this.getevaluatorassignmentUrl, '', request, '&')
      .subscribe(result => {
        this.spinner.hide();
        if (result.statusCode === 200) {
          if (result.data && result.data !== '' && result.data.result.length > 0) {
            this.getAnswerPaper();
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
}
