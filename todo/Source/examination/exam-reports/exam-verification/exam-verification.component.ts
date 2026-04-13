import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ParametersService } from 'app/main/services/parameters.service';

@Component({
  selector: 'app-exam-verification',
  templateUrl: './exam-verification.component.html',
  styleUrls: ['./exam-verification.component.scss']
})
export class ExamVerificationComponent implements OnInit {
  step = 0;  

  constructor(private router: Router,private parameterservice:ParametersService) { 
    this.parameterservice.back=''
  }

  ngOnInit(): void {
  }

  subjectWiseEvaluators(){
    this.router.navigate(['admin-examination-management/admin-exam-reports/subject-wise-evaluators-report'])
    this.parameterservice.back = 'back';

  }
  ExamAnswerSheet(){
    this.router.navigate(['admin-examination-management/admin-exam-reports/exam-answer-sheets-report'])
    this.parameterservice.back = 'back';


  }
  DailyEvaluatedReport(){
    this.router.navigate(['admin-examination-management/admin-exam-reports/daily-evaluated-report'])
    this.parameterservice.back = 'back';


  }
 
  ExamEvaluationReport(){
    this.router.navigate(['admin-examination-management/admin-exam-reports/exam-evaluation-report'])
    this.parameterservice.back = 'back';


  }
  // VerifyExamStatus(){
  //   this.router.navigate(['admin-examination-management/admin-exam-reports/exam-evaluation-report'])

  // }
  // VerifyExamMarks(){
    
  // }
  VerifyExamStatus(){
    this.router.navigate(['admin-examination-management/admin-post-examination/verify-exam-status'])
    this.parameterservice.back = 'back';

  
  }
  VerifyExamMarks(){
    this.router.navigate(['admin-examination-management/admin-post-examination/verify-exam-marks'])
    this.parameterservice.back = 'back';

    
  }
}
