import { Component, EventEmitter, ElementRef, OnInit, ViewChild, ViewEncapsulation, Output } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { GenericFunctions } from 'app/main/common/generic-functions';
import { CrudService } from 'app/main/services/crud.service';
import { SnotifyService } from 'ng-snotify';
import { Location } from '@angular/common';
import { NgxSpinnerService } from 'ngx-spinner';
import { CONSTANTS } from 'app/main/common/constants';
import { MatDialog } from '@angular/material/dialog';
import { MatRipple } from '@angular/material/core';
import { FormBuilder } from '@angular/forms';
import { ParametersService } from 'app/main/services/parameters.service';
@Component({
  selector: 'app-view-template',
  templateUrl: './view-template.component.html',
  styleUrls: ['./view-template.component.scss']
})
export class ViewTemplateComponent implements OnInit {

  displayedColumns: string[] = ['id', 'QuestionNumber', 'QuestionCode', 'Question', 'QuestionMarks', 'ModelAnswer', 'isActive', 'edit'];
  dataSource: MatTableDataSource<any>;
  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild(MatSort) sort: MatSort;
  @ViewChild(MatRipple) ripple: MatRipple;
  @ViewChild('excelAvatar') excelAvatar: ElementRef;
  @Output() print = new EventEmitter<string>();

  public formData;
  questions = [];
  marks: [];
  examQuestionpapersmarks: any[] = [];
  private examQuestionPaperDetailsUrl = CONSTANTS.examQuestionPaperDetailsUrl;
  private examQpTemplateUrl = CONSTANTS.ExamQpTemplateUrl;
  private examQpQuestionsCrudUrl = CONSTANTS.examQpQuestionsCrudUrl;
  params: any = {};
  examQuestionpapermarks: any[];
  templateDetails = [];
  templateDetails1 = [];
  collegeName: string;

    temlateListDetails = []
  totalMarks = 0;
  orderedQuestions = [];
  qpList = [];
  finalformatedList = [];

  constructor(private route: ActivatedRoute, private router: Router, private formBuilder: FormBuilder, private crudService: CrudService, private dialog: MatDialog,
    private snotifyService: SnotifyService, private _location: Location, private spinner: NgxSpinnerService, private genericFunctions: GenericFunctions,  private parameters: ParametersService) { }


  ngOnInit(): void {
    if (this.parameters.viewTemplate) {
      this.params = this.parameters.viewTemplate[0];
      
      
    }
    else{
      this.router.navigate(['admin-examination-management/evaluation-process/exam-question-paper-marks']);
    }
    // this.route.queryParams
    //   .subscribe(params => {
    //     this.params = params;
    //   });
    this.collegeName = localStorage.getItem('currentCollege')
    
      if (this.params.from){
     this.getTemplateDetails()
    }else{
   this.getExamQuestionpapermarks();
    }
  }

  getTemplateDetails(): void {
          this.temlateListDetails = []
          this.spinner.show();
  
          this.crudService.listDetailsByTwoIds(this.examQpTemplateUrl, this.params.pkEQPTid, 'true', 'examQpTemplateId', 'isActive')
              .subscribe(result => {
                  this.spinner.hide();
                  if (result.statusCode === 200) {
                      if (result.data && result.data !== '') {
                          if (result.data.resultList.length > 0) {
                              this.temlateListDetails = result.data.resultList[0].examQpTemplateDetailsDTO;
                              this.totalMarks = result.data.resultList[0].totalmarks
                              this.getQuestionList();
                          }
                          // Assign the data to the data source for the API
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
  
      getQuestionList() {
          this.orderedQuestions = [];
          this.crudService.listDetailsByTwoIds(this.examQpQuestionsCrudUrl, this.params.questionPaperId, 'true', 'ExamQp.examQpId', 'isActive')
              .subscribe(result => {
                  this.spinner.hide();
                  if (result.statusCode === 200) {
                      if (result.data && result.data !== '') {
                          this.qpList = result.data.resultList;
                       
                          const structured = this.clubTemplateWithQuestions(this.temlateListDetails, this.qpList);
                          this.finalformatedList = structured;
                          console.log(structured);
                          // Assign the data to the data source for the API
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
  
      clubTemplateWithQuestions(template: any[], questions: any[]): any[] {
          template.map(y => {
              if (questions.filter(x => (x.levelOrderNo === y.levelOrderNo && x.parentBlockId === y.parentBlockId)).length > 0) {
                  y.questions = questions.filter(x => (x.levelOrderNo === y.levelOrderNo && x.parentBlockId === y.parentBlockId));
              }
          })
          return template;
      }

  getExamQuestionpapermarks(): void {
   
    this.examQuestionpapersmarks = []
    /*----------- ExamQuestionpapers -----------*/
    this.crudService.listBySixteenIds(this.examQuestionPaperDetailsUrl,
      'list_exam_questionpaper_details' ,
      1, 
      '1990-01-01', 
      '1990-01-01', 
      this.params.pkEQPTid,
     this.params.questionPaperId,
    0, 
    0, 
    0, 
    0, 
    '1990-01-01', 
    0,
   0,
   0,
   0,
   0,
    'in_flag', 'in_orgid' ,'in_fdate', 'in_tdate','in_exam_questionpaper_template_id','in_exam_questionpaper_id', 'in_exam_id', 'in_course_year_id','in_subject_id', 'in_evalutor_profileid','in_exam_date','in_regulation_id','in_emp_id','in_questionpaper_id','in_evaluator_role_id','in_exam_evaluationassignment_id'
     )
      .subscribe(result => {
        this.spinner.hide();
        if (result.statusCode === 200) {
          if (result.data.result && result.data.result !== '') {
            this.templateDetails = result.data.result[0];
            for (let i = 0; i < this.templateDetails.length; i++) {
              this.templateDetails1[i] = this.templateDetails[i];
            }
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
        } else {
          this.snotifyService.error(CONSTANTS.message.CON_ERROR, 'Error!');
        }
      });
  }
  public printPage(_printsection: any) {
    window.print();
  }
  printBack() {
    this.router.navigate(['admin-examination-management/evaluation-process/exam-question-paper-marks']);
    let queryParams = [{
      questionPaperId: this.params.questionPaperId,
      examName:this.params.exam_name,
          questionpaper_title: this.params.questionpaper_title,
          courseId: this.params.courseId,
          academicYearId:this.params.academicYearId,
          subjectId: this.params.subjectId,
          examId: this.params.examId,
          regulationId: this.params.regulationId,
          subjectName: this.params.subjectName,
          subjectCode : this.params.subjectCode
    }]
    this.parameters.questionPaper = queryParams;
  }

}
